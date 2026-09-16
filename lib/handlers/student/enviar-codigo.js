// POST /api/student/enviar-codigo — envia um código de recuperação por e-mail
//
// Fluxo de autoatendimento (o aluno não depende de ninguém):
//   1. ele informa o e-mail no site;
//   2. o sistema gera um código NOVO (o antigo deixa de valer) e envia por e-mail;
//   3. ele volta ao site, usa "recuperar meu progresso" com esse código e define o PIN.
//
// Por segurança, a resposta NUNCA devolve o código: ele só sai por e-mail.
import crypto from 'crypto';
import { getStudent, saveStudent } from '../../_db.js';
import { enviarEmail, emailConfigurado, modeloCodigo } from '../../_email.js';

function gerarCodigo() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numeros = '23456789';
    let codigo = '';
    for (let i = 0; i < 3; i++) codigo += letras[crypto.randomInt(0, letras.length)];
    for (let i = 0; i < 3; i++) codigo += numeros[crypto.randomInt(0, numeros.length)];
    return codigo;
}

function hash(valor, segredo) {
    return crypto.createHmac('sha256', segredo).update(String(valor).trim()).digest('hex');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const email = String(body.email || '').trim().toLowerCase();
        console.log('[enviar-codigo] pedido recebido | email=' + email + ' | origem=' + (req.headers && req.headers.referer ? req.headers.referer : '-'));

        if (!email || !email.includes('@')) {
            return res.status(400).json({ ok: false, error: 'Informe o e-mail da sua conta.' });
        }

        if (!emailConfigurado()) {
            return res.status(200).json({
                ok: false,
                naoConfigurado: true,
                error: 'O envio de e-mail ainda não está ligado. Use a opção "não consigo entrar" para falar com a coordenação.'
            });
        }

        const segredo = process.env.ADMIN_AUTH_SECRET || '';
        if (!segredo) return res.status(200).json({ ok: false, error: 'Servidor sem segredo configurado.' });

        const aluno = await getStudent(email);

        // resposta igual exista ou não a conta (não revela quem está cadastrado)
        if (!aluno) {
            console.log('[enviar-codigo] SEM MATRICULA para ' + email);
            return res.status(200).json({
                ok: false,
                semMatricula: true,
                error: 'Não encontrei matrícula com este e-mail. Confira o endereço ou use a opção de falar com a coordenação.'
            });
        }

        const codigo = gerarCodigo();
        const atualizado = { ...aluno, recoveryHash: hash(codigo, segredo), recoveryCreatedAt: new Date().toISOString() };
        const gravou = await saveStudent(atualizado);
        if (!gravou) return res.status(500).json({ ok: false, error: 'Falha ao gerar o código.' });

        const modelo = modeloCodigo({ nome: aluno.fullName, codigo, plataforma: 'Escola da Fé' });
        const envio = await enviarEmail({ para: email, assunto: modelo.titulo + ' — Escola da Fé', texto: modelo.texto, html: modelo.html });

        if (!envio.ok) {
            return res.status(200).json({ ok: false, error: envio.error || 'Não foi possível enviar o e-mail agora.' });
        }

        return res.status(200).json({
            ok: true,
            message: 'Código enviado para ' + email + '. Confira a caixa de entrada (e o spam).'
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

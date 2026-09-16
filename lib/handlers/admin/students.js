// GET  /api/admin/students  — lista de alunos para o painel administrativo
// POST /api/admin/students  — { email, action: 'resetar-acesso' }
//        tira o PIN do aluno (ele volta a entrar só com o e-mail) e devolve um
//        NOVO código de recuperação para a coordenação entregar a ele.
import crypto from 'crypto';
import { getStudents, getStudent, saveStudent } from '../../_db.js';

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
        if (req.method === 'GET') {
            const alunos = await getStudents();

            const students = alunos.map(s => ({
                fullName: s.fullName || '—',
                email: s.email || '—',
                registeredAt: s.registeredAt || null,
                lastActiveAt: s.lastActiveAt || null,
                completedCount: (s.progress && s.progress.completedModules ? s.progress.completedModules.length : 0),
                xp: (s.progress && s.progress.xp) || 0,
                hasSupported: !!s.hasSupported,
                temPin: !!s.pinHash
            })).sort((a, b) => String(b.registeredAt || '').localeCompare(String(a.registeredAt || '')));

            return res.status(200).json({ ok: true, total: students.length, students });
        }

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
            const email = String(body.email || '').trim().toLowerCase();
            const acao = String(body.action || '').trim();

            if (!email) return res.status(400).json({ ok: false, error: 'E-mail do aluno não informado.' });
            if (acao !== 'resetar-acesso') return res.status(400).json({ ok: false, error: 'Ação inválida: ' + acao });

            const segredo = process.env.ADMIN_AUTH_SECRET || '';
            if (!segredo) return res.status(200).json({ ok: false, error: 'Servidor sem segredo configurado.' });

            const aluno = await getStudent(email);
            if (!aluno) return res.status(404).json({ ok: false, error: 'Aluno não encontrado.' });

            const codigo = gerarCodigo();
            const atualizado = { ...aluno, lastActiveAt: aluno.lastActiveAt || new Date().toISOString() };
            delete atualizado.pinHash;           // aluno volta a entrar só com o e-mail
            atualizado.recoveryHash = hash(codigo, segredo);
            atualizado.recoveryCreatedAt = new Date().toISOString();
            atualizado.acessoRedefinidoEm = new Date().toISOString();

            const gravou = await saveStudent(atualizado);
            if (!gravou) return res.status(500).json({ ok: false, error: 'Falha ao redefinir o acesso.' });

            return res.status(200).json({
                ok: true,
                email,
                fullName: atualizado.fullName || '—',
                recoveryCode: codigo,
                message: 'Acesso redefinido. O aluno entra só com o e-mail. Entregue o novo código a ele.'
            });
        }

        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

// POST /api/student/register — matrícula ou atualização do aluno
//
// Agora guarda tambem o PIN (opcional, para proteger o progresso) e gera um CODIGO DE
// RECUPERACAO, devolvido UMA vez para o aluno guardar. O codigo permite recuperar o
// progresso em outro aparelho mesmo esquecendo o e-mail usado.
import crypto from 'crypto';
import { getStudent, saveStudent } from '../../_db.js';

function segredo() {
    return process.env.ADMIN_AUTH_SECRET || '';
}

function hash(valor) {
    return crypto.createHmac('sha256', segredo()).update(String(valor).trim()).digest('hex');
}

// codigo legivel: 3 letras + 3 numeros, sem caracteres que confundem (I, O, 0, 1)
function gerarCodigo() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numeros = '23456789';
    let codigo = '';
    for (let i = 0; i < 3; i++) codigo += letras[crypto.randomInt(0, letras.length)];
    for (let i = 0; i < 3; i++) codigo += numeros[crypto.randomInt(0, numeros.length)];
    return codigo;
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
        const { fullName, email, progress, pin } = body;

        if (!fullName || !email) {
            return res.status(400).json({ ok: false, error: 'Nome completo e e-mail são obrigatórios.' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await getStudent(normalizedEmail);
        const isNew = !existing;

        // PIN e obrigatorio apenas na primeira matricula; depois, so troca se informado
        const pinInformado = String(pin || '').trim();
        if (isNew && pinInformado && !/^\d{4,6}$/.test(pinInformado)) {
            return res.status(400).json({ ok: false, error: 'O PIN deve ter de 4 a 6 dígitos.' });
        }

        const registro = {
            fullName: String(fullName).trim(),
            email: normalizedEmail,
            registeredAt: (existing && existing.registeredAt) || new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            progress: progress || (existing && existing.progress) || {
                completedModules: [],
                xp: 0,
                streak: 1,
                level: 1
            }
        };

        // preserva o status de benfeitor ao atualizar o perfil
        if (existing && existing.hasSupported) {
            registro.hasSupported = true;
            registro.supportedAt = existing.supportedAt;
        }

        // preserva PIN e codigo ja existentes
        if (existing && existing.pinHash) registro.pinHash = existing.pinHash;
        if (existing && existing.recoveryHash) registro.recoveryHash = existing.recoveryHash;

        let codigoNovo = null;
        if (pinInformado && segredo()) {
            registro.pinHash = hash(pinInformado);
        }
        if (!registro.recoveryHash && segredo()) {
            codigoNovo = gerarCodigo();
            registro.recoveryHash = hash(codigoNovo);
            registro.recoveryCreatedAt = new Date().toISOString();
        }

        const ok = await saveStudent(registro);
        if (!ok) return res.status(500).json({ ok: false, error: 'Falha ao gravar a matrícula na nuvem.' });

        const resposta = {
            ok: true,
            isNew,
            message: isNew ? 'Matrícula realizada com sucesso!' : 'Perfil atualizado com sucesso!',
            temPin: !!registro.pinHash,
            student: { fullName: registro.fullName, email: registro.email }
        };
        // o codigo so aparece agora, uma unica vez
        if (codigoNovo) {
            resposta.recoveryCode = codigoNovo;
            resposta.avisoCodigo = 'Guarde este código: é com ele que você recupera seu progresso em outro aparelho.';
        }

        return res.status(200).json(resposta);
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

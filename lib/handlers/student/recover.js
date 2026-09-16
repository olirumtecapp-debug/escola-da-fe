// POST /api/student/recover — recupera o progresso pelo CODIGO de recuperacao
//
// Serve para quando o aluno esquece o e-mail usado ou troca de aparelho:
//   { email, code }              -> devolve o progresso
//   { email, code, newPin }      -> devolve o progresso e troca o PIN
import crypto from 'crypto';
import { getStudent, saveStudent } from '../../_db.js';

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
        const code = String(body.code || '').trim().toUpperCase().replace(/[\s-]/g, '');
        const novoPin = String(body.newPin || '').trim();

        if (!email) return res.status(400).json({ ok: false, error: 'Informe o e-mail da conta.' });
        if (!code) return res.status(400).json({ ok: false, error: 'Informe o código de recuperação.' });
        if (novoPin && !/^\d{4,6}$/.test(novoPin)) {
            return res.status(400).json({ ok: false, error: 'O novo PIN deve ter de 4 a 6 dígitos.' });
        }

        const segredo = process.env.ADMIN_AUTH_SECRET || '';
        if (!segredo) return res.status(200).json({ ok: false, error: 'Servidor sem segredo configurado.' });

        const student = await getStudent(email);
        if (!student) return res.status(200).json({ ok: false, error: 'Conta não encontrada com este e-mail. Confira o endereço ou use o e-mail correto.' });
        if (!student.recoveryHash) {
            return res.status(200).json({ ok: false, error: 'Esta conta ainda não tem código de recuperação. Entre pelo e-mail para gerar um.' });
        }
        if (hash(code, segredo) !== student.recoveryHash) {
            return res.status(200).json({ ok: false, error: 'Código de recuperação incorreto.' });
        }

        const atualizado = { ...student, lastActiveAt: new Date().toISOString() };
        if (novoPin) atualizado.pinHash = hash(novoPin, segredo);
        await saveStudent(atualizado);

        return res.status(200).json({
            ok: true,
            message: novoPin ? 'Progresso recuperado e PIN atualizado!' : 'Progresso recuperado!',
            fullName: atualizado.fullName,
            email: atualizado.email,
            progress: atualizado.progress || {},
            temPin: !!atualizado.pinHash
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

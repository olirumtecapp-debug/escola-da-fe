// POST /api/inbox/send — envia dúvida/mensagem do aluno para a coordenação
import { addMessage } from '../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { studentName, studentEmail, subject, category, message } = body;

        if (!studentEmail || !message) {
            return res.status(400).json({ ok: false, error: 'E-mail e mensagem são obrigatórios.' });
        }

        const novo = {
            id: 'msg_' + Date.now(),
            studentName: studentName || 'Estudante',
            studentEmail: String(studentEmail).trim().toLowerCase(),
            subject: subject || 'Dúvida Teológica / Mensagem',
            category: category || 'Dúvida Teológica',
            message: String(message).trim(),
            createdAt: new Date().toISOString(),
            status: 'recebida'
        };

        const ok = await addMessage(novo);
        if (!ok) return res.status(500).json({ ok: false, error: 'Falha ao gravar a mensagem.' });

        return res.status(200).json({
            ok: true,
            message: 'Mensagem enviada à Coordenação da Escola da Fé!',
            item: novo
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

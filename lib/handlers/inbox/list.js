// GET /api/inbox/list?email= — mural de comunicados e mensagens do aluno
import { listBroadcasts, listMessages } from '../../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const userEmail = String(req.query.email || '').trim().toLowerCase();

        const broadcasts = await listBroadcasts();
        const todas = await listMessages();
        const userMessages = todas.filter(m => String(m.studentEmail || '').toLowerCase() === userEmail);

        return res.status(200).json({
            ok: true,
            broadcasts,
            userMessages
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

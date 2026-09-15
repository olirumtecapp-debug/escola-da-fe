// GET /api/inbox/list?email= — mural de comunicados e mensagens do aluno
//
// O aluno recebe os comunicados, as mensagens ativas e (separadamente) as arquivadas.
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
        const incluirArquivadas = String(req.query.arquivadas || '') === '1';

        const broadcasts = await listBroadcasts();
        const todas = await listMessages();
        const minhas = todas.filter(m => String(m.studentEmail || '').toLowerCase() === userEmail);

        const arquivadas = minhas.filter(m => m.status === 'arquivada');
        const ativas = minhas.filter(m => m.status !== 'arquivada');

        return res.status(200).json({
            ok: true,
            broadcasts,
            userMessages: incluirArquivadas ? minhas : ativas,
            arquivadas,
            naoLidas: minhas.filter(m => !m.status || m.status === 'nova').length,
            respondidas: minhas.filter(m => m.status === 'respondida').length
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

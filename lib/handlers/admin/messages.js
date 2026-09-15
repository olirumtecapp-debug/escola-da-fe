// GET /api/admin/messages — mensagens da caixa postal para o painel administrativo
import { listMessages } from '../../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const encontradas = await listMessages();

        const messages = encontradas.map(m => ({
            id: m.id,
            studentName: m.studentName || '—',
            studentEmail: m.studentEmail || '—',
            subject: m.subject || '(sem assunto)',
            category: m.category || 'Geral',
            message: m.message || '',
            status: m.status || 'recebida',
            createdAt: m.createdAt || null
        })).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

        const unreadCount = messages.filter(m => m.status !== 'respondida').length;

        return res.status(200).json({ ok: true, total: messages.length, unreadCount, messages });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

// GET /api/admin/messages — mensagens da caixa postal para o painel administrativo
import { listMessages } from '../../_db.js';

const ROTULO = { nova: 'Nova', lida: 'Lida', respondida: 'Respondida', arquivada: 'Arquivada', recebida: 'Nova' };

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
            reply: m.reply || '',
            repliedAt: m.repliedAt || null,
            archivedAt: m.archivedAt || null,
            status: m.status || 'nova',
            statusLabel: ROTULO[m.status] || 'Nova',
            createdAt: m.createdAt || null
        })).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

        const byStatus = { nova: 0, lida: 0, respondida: 0, arquivada: 0 };
        messages.forEach(m => {
            const chave = m.status === 'recebida' ? 'nova' : m.status;
            if (byStatus[chave] !== undefined) byStatus[chave]++;
            else byStatus.nova++;
        });

        const unreadCount = byStatus.nova;

        return res.status(200).json({ ok: true, total: messages.length, unreadCount, byStatus, messages });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

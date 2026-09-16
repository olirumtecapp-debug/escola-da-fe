// GET  /api/admin/broadcasts — lista os comunicados publicados no mural
// POST /api/admin/broadcasts — { id, action: 'delete' } remove um comunicado
import { listBroadcasts, deleteBroadcast } from '../../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
        if (req.method === 'GET') {
            const encontrados = await listBroadcasts();
            const broadcasts = encontrados.map(b => ({
                id: b.id,
                title: b.title || '(sem título)',
                tag: b.tag || 'Comunicado',
                date: b.date || null,
                content: b.content || '',
                sender: b.sender || ''
            })).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

            return res.status(200).json({ ok: true, total: broadcasts.length, broadcasts });
        }

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
            const id = String(body.id || '').trim();
            const acao = String(body.action || 'delete');

            if (!id) return res.status(400).json({ ok: false, error: 'Comunicado não informado.' });
            if (acao !== 'delete') return res.status(400).json({ ok: false, error: 'Ação inválida: ' + acao });

            const apagou = await deleteBroadcast(id);
            if (!apagou) return res.status(404).json({ ok: false, error: 'Comunicado não encontrado.' });

            return res.status(200).json({ ok: true, deleted: true, message: 'Comunicado excluído.' });
        }

        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

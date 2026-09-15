// POST /api/admin/broadcast — publica um comunicado no mural da coordenação
import { addBroadcast } from '../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { title, content, tag, sender } = body;

        if (!title || !content) {
            return res.status(400).json({ ok: false, error: 'Título e conteúdo são obrigatórios.' });
        }

        const comunicado = {
            id: 'b_' + Date.now(),
            sender: sender || 'Coordenação Pedagógica — Escola da Fé',
            tag: tag || 'Comunicado',
            title: String(title).trim(),
            date: new Date().toISOString().split('T')[0],
            content: String(content).trim()
        };

        const ok = await addBroadcast(comunicado);
        if (!ok) return res.status(500).json({ ok: false, error: 'Falha ao publicar o comunicado.' });

        return res.status(200).json({ ok: true, message: 'Comunicado publicado com sucesso!', broadcast: comunicado });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

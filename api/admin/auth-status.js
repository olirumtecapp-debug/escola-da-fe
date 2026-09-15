// GET /api/admin/auth-status — informa se o dono ja criou uma senha propria
import { getAdminAuth } from '../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const auth = await getAdminAuth();
        return res.status(200).json({
            ok: true,
            usuario: 'admplus',
            hasCustomPassword: !!(auth && auth.hash),
            updatedAt: (auth && auth.updatedAt) || null
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

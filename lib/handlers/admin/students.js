// GET /api/admin/students — lista de alunos para o painel administrativo
import { getStudents } from '../../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const alunos = await getStudents();

        const students = alunos.map(s => ({
            fullName: s.fullName || '—',
            email: s.email || '—',
            registeredAt: s.registeredAt || null,
            lastActiveAt: s.lastActiveAt || null,
            completedCount: (s.progress && s.progress.completedModules ? s.progress.completedModules.length : 0),
            xp: (s.progress && s.progress.xp) || 0,
            hasSupported: !!s.hasSupported
        })).sort((a, b) => String(b.registeredAt || '').localeCompare(String(a.registeredAt || '')));

        return res.status(200).json({ ok: true, total: students.length, students });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

// GET /api/student/stats — estatísticas gerais da turma
import { getStudents } from '../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const studentsList = await getStudents();

        const totalStudents = studentsList.length;
        let totalCompletedModules = 0;
        let certifiedStudents = 0;
        const modulePopularity = {};

        studentsList.forEach(st => {
            const completed = (st.progress && st.progress.completedModules) ? st.progress.completedModules : [];
            totalCompletedModules += completed.length;
            if (completed.length >= 50) certifiedStudents++;
            completed.forEach(modId => {
                modulePopularity[modId] = (modulePopularity[modId] || 0) + 1;
            });
        });

        return res.status(200).json({
            ok: true,
            totalStudents,
            totalCompletedModules,
            certifiedStudents,
            modulePopularity,
            avgCompletedPerStudent: totalStudents ? +(totalCompletedModules / totalStudents).toFixed(1) : 0,
            recentStudents: studentsList.slice(-10).reverse().map(s => ({
                fullName: s.fullName,
                email: s.email,
                registeredAt: s.registeredAt,
                lastActiveAt: s.lastActiveAt,
                completedCount: (s.progress && s.progress.completedModules ? s.progress.completedModules.length : 0),
                xp: (s.progress && s.progress.xp) || 0
            }))
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

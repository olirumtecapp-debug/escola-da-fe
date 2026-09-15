// GET /api/student/stats — estatísticas gerais da turma
import { getStudents } from '../../_db.js';

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

        // metricas extras para o painel: XP, ofensiva, atividade e nivel
        const agora = Date.now();
        const hoje = new Date().toISOString().slice(0, 10);
        let totalXp = 0;
        let totalStreak = 0;
        let activeToday = 0;
        let activeLast7Days = 0;
        const porNivel = {};

        studentsList.forEach(st => {
            const p = st.progress || {};
            totalXp += (p.xp || 0);
            totalStreak += (p.streak || 0);
            if (st.lastActiveAt && String(st.lastActiveAt).slice(0, 10) === hoje) activeToday++;
            if (st.lastActiveAt && (agora - new Date(st.lastActiveAt).getTime()) < 7 * 24 * 60 * 60 * 1000) activeLast7Days++;
            const nivel = p.level || 1;
            porNivel[nivel] = (porNivel[nivel] || 0) + 1;
        });

        const rankingModulos = Object.entries(modulePopularity)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([id, count]) => ({ id, count }));

        return res.status(200).json({
            ok: true,
            totalStudents,
            totalXp,
            avgXp: totalStudents ? Math.round(totalXp / totalStudents) : 0,
            avgStreak: totalStudents ? +(totalStreak / totalStudents).toFixed(1) : 0,
            activeToday,
            activeLast7Days,
            totalCompletedModules,
            certifiedStudents,
            modulePopularity,
            rankingModulos,
            porNivel,
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

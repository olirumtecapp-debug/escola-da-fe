// GET /api/student/load?email= — carrega o progresso do aluno (sync cross-device)
import { getStudent, saveStudent } from '../../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const email = String(req.query.email || '').trim().toLowerCase();
        if (!email) return res.status(400).json({ ok: false, error: 'E-mail não informado.' });

        const student = await getStudent(email);
        if (!student) return res.status(200).json({ ok: false, message: 'Aluno não encontrado.' });

        // atualiza o último acesso (sem bloquear a resposta)
        const lastActiveAt = new Date().toISOString();
        saveStudent({ ...student, lastActiveAt }).catch(() => {});

        return res.status(200).json({
            ok: true,
            fullName: student.fullName,
            email: student.email,
            progress: student.progress || {},
            registeredAt: student.registeredAt,
            lastActiveAt
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

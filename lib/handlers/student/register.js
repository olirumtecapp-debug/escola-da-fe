// POST /api/student/register — matrícula ou atualização do aluno
import { getStudent, saveStudent } from '../../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { fullName, email, progress } = body;

        if (!fullName || !email) {
            return res.status(400).json({ ok: false, error: 'Nome completo e e-mail são obrigatórios.' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await getStudent(normalizedEmail);
        const isNew = !existing;

        const registro = {
            fullName: String(fullName).trim(),
            email: normalizedEmail,
            registeredAt: (existing && existing.registeredAt) || new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            progress: progress || (existing && existing.progress) || {
                completedModules: [],
                xp: 0,
                streak: 1,
                level: 1
            }
        };

        // preserva o status de benfeitor ao atualizar o perfil
        if (existing && existing.hasSupported) {
            registro.hasSupported = true;
            registro.supportedAt = existing.supportedAt;
        }

        const ok = await saveStudent(registro);
        if (!ok) return res.status(500).json({ ok: false, error: 'Falha ao gravar a matrícula na nuvem.' });

        return res.status(200).json({
            ok: true,
            isNew,
            message: isNew ? 'Matrícula realizada com sucesso!' : 'Perfil atualizado com sucesso!',
            student: registro
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

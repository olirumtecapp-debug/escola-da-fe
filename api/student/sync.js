// POST /api/student/sync — sincroniza o progresso do aluno
import { getStudent, saveStudent } from '../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { email, progress } = body;

        if (!email) return res.status(400).json({ ok: false, error: 'E-mail não informado.' });

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await getStudent(normalizedEmail);

        if (!existing) {
            return res.status(404).json({ ok: false, error: 'Aluno não encontrado para sincronização.' });
        }

        const atualizado = {
            ...existing,
            email: normalizedEmail,
            progress: progress || existing.progress || {},
            lastActiveAt: new Date().toISOString()
        };

        const ok = await saveStudent(atualizado);
        if (!ok) return res.status(500).json({ ok: false, error: 'Falha ao sincronizar o progresso.' });

        return res.status(200).json({ ok: true, synced: true });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

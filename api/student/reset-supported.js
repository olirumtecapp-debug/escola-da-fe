// POST /api/student/reset-supported — reseta o status de benfeitor (uso em testes)
import { getStudent, saveStudent, clearApprovals } from '../_db.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { email } = body;

        if (email) {
            const normalizedEmail = String(email).trim().toLowerCase();
            const student = await getStudent(normalizedEmail);
            if (student) {
                const limpo = { ...student, email: normalizedEmail };
                delete limpo.hasSupported;
                delete limpo.supportedAt;
                await saveStudent(limpo);
            }
        }

        await clearApprovals();

        return res.status(200).json({ ok: true, message: 'Status resetado com sucesso!' });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

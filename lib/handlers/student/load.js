// GET /api/student/load?email= — carrega o progresso do aluno (sync cross-device)
//
// Se a conta tiver PIN, ele passa a ser exigido: sem o PIN o progresso nao e entregue.
import crypto from 'crypto';
import { getStudent, saveStudent } from '../../_db.js';

function hash(valor, segredo) {
    return crypto.createHmac('sha256', segredo).update(String(valor).trim()).digest('hex');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const email = String(req.query.email || '').trim().toLowerCase();
        const pin = String(req.query.pin || '').trim();
        if (!email) return res.status(400).json({ ok: false, error: 'E-mail não informado.' });

        const student = await getStudent(email);
        if (!student) return res.status(200).json({ ok: false, message: 'Aluno não encontrado.' });

        // conta com PIN: exige o PIN antes de entregar o progresso
        if (student.pinHash) {
            const segredo = process.env.ADMIN_AUTH_SECRET || '';
            if (!segredo) return res.status(200).json({ ok: false, error: 'Servidor sem segredo configurado.' });
            if (!pin) {
                return res.status(200).json({ ok: false, precisaPin: true, message: 'Esta conta tem PIN. Informe o PIN para carregar o progresso.' });
            }
            if (hash(pin, segredo) !== student.pinHash) {
                return res.status(200).json({ ok: false, pinInvalido: true, message: 'PIN incorreto.' });
            }
        }

        // atualiza o último acesso (sem bloquear a resposta)
        const lastActiveAt = new Date().toISOString();
        const atualizado = { ...student, lastActiveAt };
        saveStudent(atualizado).catch(() => {});

        return res.status(200).json({
            ok: true,
            fullName: student.fullName,
            email: student.email,
            progress: student.progress || {},
            registeredAt: student.registeredAt,
            temPin: !!student.pinHash,
            lastActiveAt
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

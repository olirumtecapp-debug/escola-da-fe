// POST /api/admin/login — valida usuario e senha do painel administrativo
//
// A senha propria (se existir) fica no Firestore como HMAC-SHA256, comparada aqui no servidor.
// Enquanto o dono nao criar a senha dele, vale a senha padrao que ja era usada.
import crypto from 'crypto';
import { getAdminAuth } from '../../_db.js';

const USUARIO = 'admplus';
const SENHA_PADRAO = '16Bl33@p';

function hashSenha(senha, segredo) {
    return crypto.createHmac('sha256', segredo).update(String(senha)).digest('hex');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const usuario = String(body.user || '').trim().toLowerCase();
        const senha = String(body.password || '');

        const auth = await getAdminAuth();
        const temSenhaPropria = !!(auth && auth.hash);
        const usuarioOk = usuario === USUARIO;

        let senhaOk = false;
        if (temSenhaPropria) {
            const segredo = process.env.ADMIN_AUTH_SECRET || '';
            if (!segredo) {
                return res.status(200).json({ ok: false, hasCustomPassword: true, error: 'Servidor sem segredo configurado. Avise o suporte tecnico.' });
            }
            senhaOk = hashSenha(senha, segredo) === auth.hash;
        } else {
            senhaOk = senha === SENHA_PADRAO;
        }

        return res.status(200).json({
            ok: usuarioOk && senhaOk,
            hasCustomPassword: temSenhaPropria,
            message: usuarioOk && senhaOk ? 'Acesso liberado.' : 'Usuário ou senha incorretos.'
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

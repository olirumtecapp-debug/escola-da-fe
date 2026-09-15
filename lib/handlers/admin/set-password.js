// POST /api/admin/set-password — cria ou altera a senha do painel
//
// Exige a senha atual (a propria, se ja existir; senao a padrao) para autorizar a troca.
// A nova senha e gravada no Firestore como HMAC-SHA256 com o segredo do servidor.
import crypto from 'crypto';
import { getAdminAuth, saveAdminAuth } from '../../_db.js';

const SENHA_PADRAO = '16Bl33@p';
const MIN_CARACTERES = 6;

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
        const senhaAtual = String(body.currentPassword || '');
        const senhaNova = String(body.newPassword || '');

        if (senhaNova.length < MIN_CARACTERES) {
            return res.status(200).json({ ok: false, error: 'A nova senha precisa ter pelo menos ' + MIN_CARACTERES + ' caracteres.' });
        }

        const auth = await getAdminAuth();
        const temSenhaPropria = !!(auth && auth.hash);
        const segredo = process.env.ADMIN_AUTH_SECRET || '';

        if (!segredo) {
            return res.status(200).json({ ok: false, error: 'Servidor sem segredo configurado. Avise o suporte tecnico.' });
        }

        const atualOk = temSenhaPropria
            ? hashSenha(senhaAtual, segredo) === auth.hash
            : senhaAtual === SENHA_PADRAO;

        if (!atualOk) {
            return res.status(200).json({ ok: false, error: 'Senha atual incorreta.' });
        }

        const gravou = await saveAdminAuth({
            hash: hashSenha(senhaNova, segredo),
            updatedAt: new Date().toISOString()
        });

        if (!gravou) return res.status(200).json({ ok: false, error: 'Falha ao gravar a nova senha.' });

        return res.status(200).json({ ok: true, hasCustomPassword: true, message: 'Senha atualizada com sucesso!' });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

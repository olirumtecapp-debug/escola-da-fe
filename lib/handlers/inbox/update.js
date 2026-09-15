// POST /api/inbox/update — ciclo de vida da mensagem na caixa postal
//
// Acoes:
//   read      -> marca como lida
//   reply     -> registra a resposta da coordenacao (status respondida)
//   archive   -> arquiva (sai da lista principal, continua no historico)
//   unarchive -> devolve para a lista (status lida)
//   delete    -> remove definitivamente
import { updateMessage, deleteMessage } from '../../_db.js';

const ACOES = ['read', 'reply', 'archive', 'unarchive', 'delete'];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const id = String(body.id || '').trim();
        const acao = String(body.action || '').trim();
        const resposta = String(body.reply || '').trim();

        if (!id) return res.status(400).json({ ok: false, error: 'Mensagem nao informada.' });
        if (!ACOES.includes(acao)) return res.status(400).json({ ok: false, error: 'Acao invalida: ' + acao });

        if (acao === 'delete') {
            const apagou = await deleteMessage(id);
            if (!apagou) return res.status(404).json({ ok: false, error: 'Mensagem nao encontrada.' });
            return res.status(200).json({ ok: true, deleted: true, message: 'Mensagem excluída.' });
        }

        let mudancas = {};
        if (acao === 'read') mudancas = { status: 'lida', readAt: new Date().toISOString() };
        if (acao === 'archive') mudancas = { status: 'arquivada', archivedAt: new Date().toISOString() };
        if (acao === 'unarchive') mudancas = { status: 'lida' };
        if (acao === 'reply') {
            if (!resposta) return res.status(400).json({ ok: false, error: 'Escreva a resposta antes de enviar.' });
            mudancas = { status: 'respondida', reply: resposta, repliedAt: new Date().toISOString() };
        }

        const atualizado = await updateMessage(id, mudancas);
        if (!atualizado) return res.status(404).json({ ok: false, error: 'Mensagem nao encontrada.' });

        const mensagens = {
            read: 'Mensagem marcada como lida.',
            archive: 'Mensagem arquivada.',
            unarchive: 'Mensagem devolvida para a caixa de entrada.',
            reply: 'Resposta registrada.'
        };

        return res.status(200).json({ ok: true, message: mensagens[acao], item: atualizado });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'Erro no servidor: ' + err.message });
    }
}

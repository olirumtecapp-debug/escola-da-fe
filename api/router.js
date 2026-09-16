// api/router.js â€” funcao unica que atende TODAS as rotas /api/*
//
// Motivo: o plano gratuito da Vercel permite no maximo 12 funcoes por deploy, e o projeto
// chegou a 15. Concentrando tudo aqui, o limite deixa de existir: este e o unico arquivo
// dentro de /api, e os atendentes ficam em /lib/handlers (que nao contam como funcao).
//
// O vercel.json manda todo /api/* para ca, passando o caminho em ?rota=:
//   { "source": "/api/(.*)", "destination": "/api/router?rota=$1" }
//
// As rotas publicas continuam exatamente as mesmas: /api/student/stats, /api/inbox/send,
// /api/asaas-webhook, /api/admin/login, etc.

import register from '../lib/handlers/student/register.js';
import sync from '../lib/handlers/student/sync.js';
import load from '../lib/handlers/student/load.js';
import stats from '../lib/handlers/student/stats.js';
import recover from '../lib/handlers/student/recover.js';
import enviarCodigo from '../lib/handlers/student/enviar-codigo.js';
import markSupported from '../lib/handlers/student/mark-supported.js';
import resetSupported from '../lib/handlers/student/reset-supported.js';
import inboxList from '../lib/handlers/inbox/list.js';
import inboxSend from '../lib/handlers/inbox/send.js';
import inboxUpdate from '../lib/handlers/inbox/update.js';
import asaasWebhook from '../lib/handlers/asaas-webhook.js';
import adminStudents from '../lib/handlers/admin/students.js';
import adminMessages from '../lib/handlers/admin/messages.js';
import adminBroadcast from '../lib/handlers/admin/broadcast.js';
import adminBroadcasts from '../lib/handlers/admin/broadcasts.js';
import adminLogin from '../lib/handlers/admin/login.js';
import adminSetPassword from '../lib/handlers/admin/set-password.js';
import adminAuthStatus from '../lib/handlers/admin/auth-status.js';

const ROTAS = {
    'student/register': register,
    'student/sync': sync,
    'student/load': load,
    'student/stats': stats,
    'student/recover': recover,
    'student/enviar-codigo': enviarCodigo,
    'student/mark-supported': markSupported,
    'student/reset-supported': resetSupported,
    'inbox/list': inboxList,
    'inbox/send': inboxSend,
    'inbox/update': inboxUpdate,
    'asaas-webhook': asaasWebhook,
    'admin/students': adminStudents,
    'admin/messages': adminMessages,
    'admin/broadcast': adminBroadcast,
    'admin/broadcasts': adminBroadcasts,
    'admin/login': adminLogin,
    'admin/set-password': adminSetPassword,
    'admin/auth-status': adminAuthStatus
};

export default async function handler(req, res) {
    const capturado = req.query ? req.query.rota : null;
    const rota = Array.isArray(capturado) ? capturado.join('/') : String(capturado || '');
    const atende = ROTAS[rota];

    if (!atende) {
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
        }
        return res.status(404).json({ ok: false, error: 'Rota de API nao encontrada: /api/' + rota });
    }

    return atende(req, res);
}

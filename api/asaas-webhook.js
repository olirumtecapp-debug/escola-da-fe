// /api/asaas-webhook — confirmação de pagamento PIX/Boleto do Asaas
//
// Diferente das APIs locais, a aprovação fica no Firestore: em serverless a memoria do
// processo nao persiste entre chamadas, e o polling do frontend pode cair em outra instancia.
import { listApprovals, addApproval, pruneApprovals } from './_db.js';

const EVENTOS_APROVADOS = [
    'PAYMENT_RECEIVED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_RECEIVED_IN_CASH'
];

const JANELA_MS = 15 * 60 * 1000;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, asaas-access-token');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(204).end();

    // Consulta do frontend enquanto o modal do PIX esta aberto
    if (req.method === 'GET') {
        try {
            const valParam = req.query.value;
            const sinceParam = parseInt(req.query.since || '0', 10);
            const agora = Date.now();

            const aprovacoes = (await listApprovals())
                .slice()
                .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));

            const match = aprovacoes.find(item => {
                if (sinceParam && Number(item.timestamp) < sinceParam) return false;
                if ((agora - Number(item.timestamp)) >= JANELA_MS) return false;
                if (valParam) return Math.abs(parseFloat(item.value) - parseFloat(valParam)) < 0.1;
                return true;
            });

            if (match) {
                return res.status(200).json({
                    approved: true,
                    event: match.event,
                    paymentId: match.paymentId,
                    value: match.value,
                    timestamp: match.timestamp
                });
            }

            return res.status(200).json({ approved: false, message: 'Aguardando confirmação via PIX Asaas' });
        } catch (err) {
            return res.status(200).json({ approved: false, message: 'Consulta temporariamente indisponível.' });
        }
    }

    // Notificação enviada pelo Asaas
    if (req.method === 'POST') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
            const event = body.event;
            const payment = body.payment || {};

            if (EVENTOS_APROVADOS.includes(event)) {
                await addApproval({
                    paymentId: payment.id,
                    event: event,
                    value: payment.value,
                    billingType: payment.billingType,
                    customerEmail: (payment.customer && payment.customer.email) || null,
                    timestamp: Date.now()
                });
                await pruneApprovals();
            }

            return res.status(200).json({ received: true });
        } catch (err) {
            return res.status(200).json({ received: true, error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

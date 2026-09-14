import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const INBOX_FILE = path.join(DATA_DIR, 'inbox.json');

// Memória de aprovações em tempo real do Webhook Asaas
let recentApprovals = [];

// Garante existência da pasta data e arquivos base
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(STUDENTS_FILE)) {
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify({
        _meta: {
            title: 'Escola da Fé — Registro Oficial de Estudantes e Matrículas',
            created: new Date().toISOString()
        },
        students: {}
    }, null, 2), 'utf8');
}

if (!fs.existsSync(INBOX_FILE)) {
    fs.writeFileSync(INBOX_FILE, JSON.stringify({
        _meta: {
            title: 'Escola da Fé — Caixa Postal & Mural Pastoral',
            created: new Date().toISOString()
        },
        broadcasts: [
            {
                id: 'b1',
                sender: 'Coordenação Pedagógica da Escola da Fé',
                tag: 'Acolhida Solene',
                title: 'Seja bem-vindo(a) à sua Jornada Canônica de Fé!',
                date: new Date().toISOString().split('T')[0],
                content: 'Louvado seja Nosso Senhor Jesus Cristo! É com imensa alegria fraterna que acolhemos você nesta jornada de formação. Ao longo destes 50 módulos canônicos, você beberá da Sagrada Escritura, da Tradição Apostólica, do Sagrado Magistério e dos Santos Doutores da Igreja. Que o Espírito Santo ilumine sua inteligência e inflame seu coração. Bons estudos e que Santa Teresinha interceda por seu caminho!'
            },
            {
                id: 'b2',
                sender: 'Direção Espiritual',
                tag: 'Orientação de Estudo',
                title: 'Como aproveitar ao máximo cada Módulo e as Narrações em Áudio',
                date: new Date().toISOString().split('T')[0],
                content: 'Recomendamos que cada módulo seja iniciado com uma breve oração ao Espírito Santo. Aproveite a narração em áudio de estúdio para acompanhar o texto com atenção contemplativa. Ao final de cada módulo, fixe o conhecimento respondendo ao Quiz Teológico com serenidade. Avance com perseverança!'
            }
        ],
        messages: []
    }, null, 2), 'utf8');
}

function readJson(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        return fallback;
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}'));
            } catch (e) {
                resolve({});
            }
        });
    });
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    const urlParts = req.url.split('?');
    const pathname = urlParts[0];
    const searchParams = new URLSearchParams(urlParts[1] || '');

    // 1. Matrícula ou Atualização do Aluno
    if (pathname === '/api/student/register' && req.method === 'POST') {
        const body = await parseBody(req);
        const { fullName, email, progress } = body;

        if (!fullName || !email) {
            return sendJson(res, 400, { ok: false, error: 'Nome completo e e-mail são obrigatórios.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const db = readJson(STUDENTS_FILE, { _meta: {}, students: {} });

        const isNew = !db.students[normalizedEmail];
        const existing = db.students[normalizedEmail] || {};

        db.students[normalizedEmail] = {
            fullName: fullName.trim(),
            email: normalizedEmail,
            registeredAt: existing.registeredAt || new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            progress: progress || existing.progress || {
                completedModules: [],
                xp: 0,
                streak: 1,
                level: 1
            }
        };

        writeJson(STUDENTS_FILE, db);

        return sendJson(res, 200, {
            ok: true,
            isNew,
            message: isNew ? 'Matrícula realizada com sucesso!' : 'Perfil atualizado com sucesso!',
            student: db.students[normalizedEmail]
        });
    }

    // 2. Sincronização de Progresso do Aluno
    if (pathname === '/api/student/sync' && req.method === 'POST') {
        const body = await parseBody(req);
        const { email, progress } = body;

        if (!email) {
            return sendJson(res, 400, { ok: false, error: 'E-mail não informado.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const db = readJson(STUDENTS_FILE, { _meta: {}, students: {} });

        if (db.students[normalizedEmail]) {
            db.students[normalizedEmail].progress = progress;
            db.students[normalizedEmail].lastActiveAt = new Date().toISOString();
            writeJson(STUDENTS_FILE, db);
            return sendJson(res, 200, { ok: true, synced: true });
        } else {
            return sendJson(res, 404, { ok: false, error: 'Aluno não encontrado para sincronização.' });
        }
    }

    // 3. Estatísticas Gerais (Painel de Alunos)
    if (pathname === '/api/student/stats' && req.method === 'GET') {
        const db = readJson(STUDENTS_FILE, { _meta: {}, students: {} });
        const studentsList = Object.values(db.students || {});

        const totalStudents = studentsList.length;
        let totalCompletedModules = 0;
        let certifiedStudents = 0;
        const modulePopularity = {};

        studentsList.forEach(st => {
            const completed = (st.progress && st.progress.completedModules) ? st.progress.completedModules : [];
            totalCompletedModules += completed.length;
            if (completed.length >= 50) certifiedStudents++;

            completed.forEach(modId => {
                modulePopularity[modId] = (modulePopularity[modId] || 0) + 1;
            });
        });

        return sendJson(res, 200, {
            ok: true,
            totalStudents,
            totalCompletedModules,
            certifiedStudents,
            avgCompletedPerStudent: totalStudents ? +(totalCompletedModules / totalStudents).toFixed(1) : 0,
            recentStudents: studentsList.slice(-10).reverse().map(s => ({
                fullName: s.fullName,
                email: s.email,
                registeredAt: s.registeredAt,
                lastActiveAt: s.lastActiveAt,
                completedCount: (s.progress?.completedModules || []).length,
                xp: s.progress?.xp || 0
            }))
        });
    }

    // 4. Caixa Postal / Inbox (Listar Avisos e Mensagens)
    if (pathname === '/api/inbox/list' && req.method === 'GET') {
        const userEmail = (searchParams.get('email') || '').trim().toLowerCase();
        const inboxDb = readJson(INBOX_FILE, { broadcasts: [], messages: [] });

        const userMessages = inboxDb.messages.filter(m => m.studentEmail === userEmail);

        return sendJson(res, 200, {
            ok: true,
            broadcasts: inboxDb.broadcasts || [],
            userMessages
        });
    }

    // 5. Envio de Mensagem/Dúvida do Aluno para a Coordenação
    if (pathname === '/api/inbox/send' && req.method === 'POST') {
        const body = await parseBody(req);
        const { studentName, studentEmail, subject, category, message } = body;

        if (!studentEmail || !message) {
            return sendJson(res, 400, { ok: false, error: 'E-mail e mensagem são obrigatórios.' });
        }

        const inboxDb = readJson(INBOX_FILE, { broadcasts: [], messages: [] });

        const newMessage = {
            id: 'msg_' + Date.now(),
            studentName: studentName || 'Estudante',
            studentEmail: studentEmail.trim().toLowerCase(),
            subject: subject || 'Dúvida Teológica / Mensagem',
            category: category || 'Dúvida Teológica',
            message: message.trim(),
            createdAt: new Date().toISOString(),
            status: 'recebida'
        };

        inboxDb.messages.push(newMessage);
        writeJson(INBOX_FILE, inboxDb);

        return sendJson(res, 200, {
            ok: true,
            message: 'Mensagem enviada à Coordenação da Escola da Fé!',
            item: newMessage
        });
    }

    
    // 6. Webhook Oficial do Asaas (Consulta GET e Recebimento POST)
    if (pathname === '/api/asaas-webhook') {
        if (req.method === 'GET') {
            const valParam = searchParams.get('value');
            const sinceParam = parseInt(searchParams.get('since') || '0', 10);
            const now = Date.now();

            const match = recentApprovals.find(item => {
                // Deve ter ocorrido após a abertura do modal pelo usuário
                if (sinceParam && item.timestamp < sinceParam) return false;
                const isFresh = (now - item.timestamp) < 15 * 60 * 1000;
                if (!isFresh) return false;
                if (valParam && Math.abs(parseFloat(item.value) - parseFloat(valParam)) < 0.1) return true;
                if (valParam) return false;
                return true;
            });

            if (match) {
                return sendJson(res, 200, {
                    approved: true,
                    event: match.event,
                    paymentId: match.paymentId,
                    value: match.value,
                    timestamp: match.timestamp
                });
            }

            return sendJson(res, 200, { approved: false, message: 'Aguardando confirmação via PIX Asaas' });
        }

        if (req.method === 'POST') {
            const body = await parseBody(req);
            const event = body.event;
            const payment = body.payment || {};

            console.log(`[Asaas Escola da Fé Webhook] Evento: ${event}, ID: ${payment.id}, Valor: ${payment.value}`);

            const isApproved = [
                'PAYMENT_RECEIVED',
                'PAYMENT_CONFIRMED',
                'PAYMENT_RECEIVED_IN_CASH'
            ].includes(event);

            if (isApproved) {
                recentApprovals.unshift({
                    paymentId: payment.id,
                    event: event,
                    value: payment.value,
                    billingType: payment.billingType,
                    timestamp: Date.now()
                });
                if (recentApprovals.length > 50) recentApprovals.pop();
            }

            return sendJson(res, 200, { received: true });
        }
    }

    // 7. Marcar Aluno como Benfeitor / Apoiador
    if (pathname === '/api/student/mark-supported' && req.method === 'POST') {
        const body = await parseBody(req);
        const { email } = body;

        if (email) {
            const normalizedEmail = email.trim().toLowerCase();
            const db = readJson(STUDENTS_FILE, { _meta: {}, students: {} });
            if (db.students[normalizedEmail]) {
                db.students[normalizedEmail].hasSupported = true;
                db.students[normalizedEmail].supportedAt = new Date().toISOString();
                writeJson(STUDENTS_FILE, db);
            }
        }
        return sendJson(res, 200, { ok: true, message: 'Status de benfeitor registrado com sucesso!' });
    }

    // 8. Resetar Status de Benfeitor (para testes)
    if (pathname === '/api/student/reset-supported' && req.method === 'POST') {
        const body = await parseBody(req);
        const { email } = body;
        if (email) {
            const normalizedEmail = email.trim().toLowerCase();
            const db = readJson(STUDENTS_FILE, { _meta: {}, students: {} });
            if (db.students[normalizedEmail]) {
                delete db.students[normalizedEmail].hasSupported;
                delete db.students[normalizedEmail].supportedAt;
                writeJson(STUDENTS_FILE, db);
            }
        }
        recentApprovals = [];
        return sendJson(res, 200, { ok: true, message: 'Status resetado com sucesso!' });
    }

    // Arquivos Estáticos & Áudio MP3
    let safePath = pathname;
    if (safePath === '/' || safePath === '') safePath = '/escola_da_f.html';

    const filePath = path.join(__dirname, safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const stat = fs.statSync(filePath);

        const range = req.headers.range;
        if (ext === '.mp3' && range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mpeg'
            });
            file.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': stat.size,
                'Accept-Ranges': 'bytes',
                'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
            });
            fs.createReadStream(filePath).pipe(res);
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Arquivo não encontrado: ' + safePath);
    }
});

server.listen(PORT, () => {
    console.log(`[Escola da Fé] Servidor e APIs ativos na porta ${PORT}`);
});

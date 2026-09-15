// api/_db.js — camada de dados da Escola da Fé
//
// Padrão do ecossistema (mesmo modelo do Catecismo e do CodeLogic): Firestore pelo
// navegador, sem nenhum segredo embutido. A chave abaixo e a configuracao publica do
// projeto e pode ser sobrescrita por variavel de ambiente.
//
// As APIs locais (server.mjs) continuam usando arquivos JSON em /data para desenvolvimento.

import crypto from 'crypto';

const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyBUHGXoUMg0bV3EdmfpfmVAEYMLQceqkQc';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'expedicao-brasil';

export const COL_STUDENTS = 'escola_students';
export const COL_BROADCASTS = 'escola_broadcasts';
export const COL_MESSAGES = 'escola_messages';
export const COL_APPROVALS = 'escola_approvals';

const TIMEOUT_MS = 8000;
const CACHE_MS = 3000;
const RESERVADOS = /[.\[\]\/~*]/;

const cache = new Map();

function basePath(col) {
    return '/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + col;
}

export function docId(valor) {
    return crypto.createHash('sha256').update(String(valor)).digest('hex').slice(0, 32);
}

// ---------- conversao de tipos ----------

function toValue(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
    if (typeof v === 'object') {
        const fields = {};
        for (const [k, x] of Object.entries(v)) {
            if (RESERVADOS.test(k)) continue; // Firestore recusa estes caracteres no nome do campo
            fields[k] = toValue(x);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(v) };
}

function fromValue(v) {
    if (!v) return null;
    if ('nullValue' in v) return null;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return v.booleanValue;
    if ('stringValue' in v) return v.stringValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
    if ('mapValue' in v) {
        const o = {};
        for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = fromValue(x);
        return o;
    }
    return null;
}

export function toFields(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj || {})) {
        if (RESERVADOS.test(k)) continue;
        fields[k] = toValue(v);
    }
    return fields;
}

function docToObject(doc) {
    const o = {};
    for (const [k, v] of Object.entries(doc.fields || {})) o[k] = fromValue(v);
    return o;
}

// ---------- acesso REST ao Firestore ----------

async function fsRequest(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch('https://firestore.googleapis.com' + path + (path.includes('?') ? '&' : '?') + 'key=' + API_KEY, {
            ...options,
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
        });
        const texto = await res.text();
        let json = null;
        try { json = texto ? JSON.parse(texto) : null; } catch (e) { json = null; }
        return { ok: res.ok, status: res.status, body: json, raw: texto };
    } catch (err) {
        return { ok: false, status: 0, body: null, raw: String(err && err.message) };
    } finally {
        clearTimeout(timer);
    }
}

export async function listDocs(col, pageSize = 400) {
    const res = await fsRequest(basePath(col) + '?pageSize=' + pageSize);
    if (!res.ok || !res.body) {
        console.error('[db] falha ao listar ' + col + ':', res.status, res.raw && res.raw.slice(0, 200));
        return [];
    }
    return (res.body.documents || []).map(docToObject);
}

// igual ao anterior, mas devolvendo tambem o id do documento (necessario para apagar)
export async function listDocsRaw(col, pageSize = 400) {
    const res = await fsRequest(basePath(col) + '?pageSize=' + pageSize);
    if (!res.ok || !res.body) {
        console.error('[db] falha ao listar ' + col + ':', res.status, res.raw && res.raw.slice(0, 200));
        return [];
    }
    return (res.body.documents || []).map(d => ({
        _id: String(d.name || '').split('/').pop(),
        data: docToObject(d)
    }));
}

export async function upsertDoc(col, id, obj) {
    const res = await fsRequest(basePath(col) + '/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ fields: toFields(obj) })
    });
    if (!res.ok) console.error('[db] falha ao gravar em ' + col + ':', res.status, res.raw && res.raw.slice(0, 200));
    return res.ok;
}

export async function deleteDoc(col, id) {
    const res = await fsRequest(basePath(col) + '/' + id, { method: 'DELETE' });
    return res.ok;
}

function cacheGet(key) {
    const hit = cache.get(key);
    if (hit && (Date.now() - hit.time) < CACHE_MS) return hit.data;
    return null;
}

export function cacheSet(key, data) {
    cache.set(key, { data, time: Date.now() });
}

export function cacheClear() {
    cache.clear();
}

// ================= ALUNOS =================

export async function getStudents() {
    const emCache = cacheGet('students');
    if (emCache) return emCache;

    const docs = await listDocs(COL_STUDENTS);
    const lista = docs
        .filter(s => s && s.email)
        .sort((a, b) => String(a.registeredAt || '').localeCompare(String(b.registeredAt || '')));

    cacheSet('students', lista);
    return lista;
}

export async function getStudent(email) {
    const alvo = String(email || '').trim().toLowerCase();
    if (!alvo) return null;
    const res = await fsRequest(basePath(COL_STUDENTS) + '/' + docId(alvo));
    if (res.ok && res.body && res.body.fields) return docToObject(res.body);
    if (res.status === 404) return null;
    // fallback: procura na listagem (caso a leitura direta falhe)
    const lista = await getStudents();
    return lista.find(s => String(s.email).toLowerCase() === alvo) || null;
}

export async function saveStudent(registro) {
    const email = String(registro.email || '').trim().toLowerCase();
    if (!email) return false;
    const ok = await upsertDoc(COL_STUDENTS, docId(email), { ...registro, email });
    cacheClear();
    return ok;
}

export async function deleteStudent(email) {
    const ok = await deleteDoc(COL_STUDENTS, docId(email));
    cacheClear();
    return ok;
}

// ================= MURAL (COMUNICADOS) =================

export async function listBroadcasts() {
    const emCache = cacheGet('broadcasts');
    if (emCache) return emCache;
    const docs = await listDocs(COL_BROADCASTS);
    const lista = docs
        .filter(b => b && b.id)
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    cacheSet('broadcasts', lista);
    return lista;
}

export async function addBroadcast(comunicado) {
    if (!comunicado || !comunicado.id) return false;
    const ok = await upsertDoc(COL_BROADCASTS, docId(comunicado.id), comunicado);
    cacheClear();
    return ok;
}

// ================= CAIXA POSTAL (MENSAGENS DO ALUNO) =================

export async function listMessages() {
    const emCache = cacheGet('messages');
    if (emCache) return emCache;
    const docs = await listDocs(COL_MESSAGES);
    const lista = docs
        .filter(m => m && m.id)
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    cacheSet('messages', lista);
    return lista;
}

export async function addMessage(mensagem) {
    if (!mensagem || !mensagem.id) return false;
    const ok = await upsertDoc(COL_MESSAGES, docId(mensagem.id), mensagem);
    cacheClear();
    return ok;
}

// ================= APROVACOES DO ASAAS =================
// Antes era memoria do processo: em serverless cada chamada pode cair em outra
// instancia e o polling nunca via a aprovacao. Agora fica no Firestore.

export async function listApprovals() {
    const docs = await listDocsRaw(COL_APPROVALS, 100);
    return docs.map(d => d.data).filter(a => a && a.timestamp);
}

export async function addApproval(aprovacao) {
    const id = 'ap_' + aprovacao.timestamp + '_' + Math.random().toString(36).slice(2, 7);
    return upsertDoc(COL_APPROVALS, id, aprovacao);
}

export async function pruneApprovals(maxAgeMs = 60 * 60 * 1000) {
    const docs = await listDocsRaw(COL_APPROVALS, 100);
    const limite = Date.now() - maxAgeMs;
    let removidos = 0;
    for (const d of docs) {
        if (!d.data || !d.data.timestamp) continue;
        if (Number(d.data.timestamp) < limite && await deleteDoc(COL_APPROVALS, d._id)) removidos++;
    }
    return removidos;
}

export async function clearApprovals() {
    const docs = await listDocsRaw(COL_APPROVALS, 100);
    let removidos = 0;
    for (const d of docs) {
        if (await deleteDoc(COL_APPROVALS, d._id)) removidos++;
    }
    return removidos;
}

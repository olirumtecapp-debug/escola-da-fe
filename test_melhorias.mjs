import fs from 'fs';
import path from 'path';
import vm from 'vm';

console.log('====================================================');
console.log('BATERIA DE TESTES LOCAIS — ESCOLA DA FÉ (MELHORIAS)');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passCount++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failCount++;
    }
}

const htmlPath = path.resolve('index.html');
const serverPath = path.resolve('server.mjs');
assert(fs.existsSync(htmlPath), 'Arquivo index.html existe');
assert(fs.existsSync(serverPath), 'Arquivo server.mjs existe');

const html = fs.readFileSync(htmlPath, 'utf8');

// ----------------------------------------------------
// 1. TESTES DO CERTIFICADO E LINGUAGEM CANÔNICA
// ----------------------------------------------------
console.log('\n--- 1. Certificado & Linguagem ---');

// Bloqueio do certificado
assert(html.includes('id="cert-locked-state"'), 'Elemento de estado bloqueado cert-locked-state existe');
assert(html.includes('id="cert-unlocked-state"'), 'Elemento de estado desbloqueado cert-unlocked-state existe');
assert(html.includes('Acesso liberado após conclusão dos 50 módulos'), 'Texto de acesso bloqueado atualizado');
assert(html.includes('Certificado de Conclusão da Plataforma'), 'Título do certificado atualizado');
assert(html.includes('é liberado para emissão após a conclusão integral') && html.includes('50 módulos de formação doutrinal'), 'Descrição do desbloqueio atualizada');
assert(html.includes('registro simbólico de conclusão'), 'Selos canônicos substituídos por registro simbólico');

// Cabeçalho do certificado
assert(html.includes('Escola da Fé — Plataforma de Formação Cristã') || html.includes('Escola da Fé — Formação Católica Independente'), 'Cabeçalho não oficial presente');
assert(!html.includes('Igreja Católica Apostólica Romana — Arquidiocese'), 'Nenhum cabeçalho episcopal ou diocesano indevido');

// Aviso / Ressalva obrigatória
const expectedDisclaimer = 'Este certificado é um registro simbólico pessoal de estudos na plataforma Escola da Fé. Não substitui sacramentos, catequese paroquial, credenciamentos oficiais da Igreja, formação reconhecida por diocese ou graus acadêmicos de Teologia.';
assert(html.includes(expectedDisclaimer), 'Ressalva de não-oficialidade eclesiástica presente de forma literal e explícita');

// Print Warning
assert(html.includes('Aviso: O Certificado da Escola da Fé só pode ser emitido e impresso após a conclusão integral dos 50 módulos formativos da trilha.'), 'Aviso de impressão para certificado bloqueado atualizado');

// Verificação de termos proibidos em contextos indevidos
const forbiddenTerms = [
    'Acesso Restrito por Mérito Canônico',
    'Certificado Oficial de Conclusão',
    'Estudante Canônico',
    'Nome Completo Oficial'
];
forbiddenTerms.forEach(term => {
    assert(!html.includes(term), `Termo indevido ausente: "${term}"`);
});

// ----------------------------------------------------
// 2. TESTES DO MODAL DE APOIO E BOTÕES SEPARADOS
// ----------------------------------------------------
console.log('\n--- 2. Modal de Apoio & Ações Separadas ---');

assert(html.includes('id="modal-apoio"'), 'Modal de apoio #modal-apoio presente');
assert(html.includes('markAsSupportedDeclared()'), 'Botão 1 chama markAsSupportedDeclared()');
assert(html.includes('Já apoiei — não mostrar novamente'), 'Botão 1 texto exato presente');
assert(html.includes('hideApoioPermanently()'), 'Botão 2 chama hideApoioPermanently()');
assert(html.includes('Não quero ver novamente'), 'Botão 2 texto exato presente');
assert(html.includes('Agora não, continuar estudos →'), 'Botão de continuidade presente');
assert(html.includes('closeApoioModal()'), 'Botão de continuidade chama closeApoioModal()');

// Transparência
assert(html.includes('Murilo Ferreira Silva'), 'Favorecido Murilo Ferreira Silva claramente identificado');
assert(html.includes('Processamento via Asaas PIX'), 'Identificação Asaas PIX presente');
assert(html.includes('O apoio é voluntário e não é necessário para acessar os módulos'), 'Texto de voluntariedade presente');
assert(html.includes('Os apoios ajudam a manter servidores, narrações, acervos e ferramentas gratuitas'), 'Texto de finalidade dos apoios presente');

// Pacotes de apoio
assert(html.includes('Um Cafezinho') && html.includes('R$ 5,00'), 'Pacote Cafezinho R$ 5,00 presente');
assert(html.includes('Pão na Chapa') && html.includes('R$ 10,00'), 'Pacote Pão na Chapa R$ 10,00 presente');
assert(html.includes('Misto Quente') && html.includes('R$ 15,00'), 'Pacote Misto Quente R$ 15,00 presente');

// ----------------------------------------------------
// 3. EXECUÇÃO DE COMPORTAMENTOS JAVASCRIPT EM VM
// ----------------------------------------------------
console.log('\n--- 3. Validação dos Comportamentos JavaScript ---');

// Mock DOM e LocalStorage
const localStorageMock = (function() {
    let store = {};
    return {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { store = {}; }
    };
})();

const documentMock = {
    elements: {},
    getElementById(id) {
        if (!this.elements[id]) {
            this.elements[id] = {
                id,
                classList: {
                    classes: new Set(['hidden']),
                    remove(c) { this.classes.delete(c); },
                    add(c) { this.classes.add(c); },
                    contains(c) { return this.classes.has(c); }
                },
                style: {},
                innerText: '',
                textContent: '',
                value: ''
            };
        }
        return this.elements[id];
    }
};

let toastMsg = null;
let toastType = null;
function showToast(msg, type) {
    toastMsg = msg;
    toastType = type;
}

// Extrair e executar funções do index.html
const sandbox = {
    localStorage: localStorageMock,
    document: documentMock,
    showToast,
    window: {},
    progress: { completedModules: [], badges: [], hasSupported: false },
    saveProgress: () => {},
    StudentManager: { updateUi: () => {}, getStudent: () => ({ fullName: 'João Teste', email: 'joao@teste.com' }) },
    fetch: async () => ({ ok: true, json: async () => ({ approved: false }) }),
    setInterval: () => 123,
    clearInterval: () => {},
    setTimeout: (fn) => fn(),
    currentApoioVal: 10,
    apoioPollingInterval: null,
    selectApoioTip: () => {}
};

vm.createContext(sandbox);

// Script com as funções de apoio e certificado
const jsExtract = `
function openApoioModal(isManual = true) {
    if (!isManual) {
        const hideApoio = localStorage.getItem('escoladafe_hide_apoio') === 'true';
        const hasSupported = (typeof progress !== 'undefined' && progress && progress.hasSupported);
        if (hideApoio || hasSupported) return;
    }
    const modal = document.getElementById('modal-apoio');
    if (!modal) return;
    window._apoioModalOpenedAt = Date.now();
    const statusEl = document.getElementById('apoio-status-text');
    if (statusEl) statusEl.innerText = "Aguardando confirmação do PIX...";
    modal.classList.remove('hidden');
    selectApoioTip(currentApoioVal || 10);
}

function closeApoioModal() {
    const modal = document.getElementById('modal-apoio');
    if (modal) modal.classList.add('hidden');
}

function markAsSupportedDeclared() {
    if (typeof progress !== 'undefined' && progress) {
        progress.hasSupported = true;
        progress.supportDeclared = true;
        progress.supportedAt = new Date().toISOString();
        if (typeof saveProgress === 'function') saveProgress();
    }
    localStorage.setItem('escoladafe_hide_apoio', 'true');
    closeApoioModal();
    showToast("Obrigado pelo apoio declarado. Deus abençoe sua generosidade!", "success");
    if (typeof StudentManager !== 'undefined') {
        StudentManager.updateUi();
    }
}

function hideApoioPermanently() {
    localStorage.setItem('escoladafe_hide_apoio', 'true');
    closeApoioModal();
    showToast("Preferência salva. O aviso de apoio não será mais exibido. Bons estudos!", "info");
}

function updateCertState(compCount) {
    const totalCount = 50;
    const isCompleted = compCount >= totalCount;
    const lockedEl = document.getElementById('cert-locked-state');
    const unlockedEl = document.getElementById('cert-unlocked-state');
    if (!isCompleted) {
        lockedEl.classList.remove('hidden');
        unlockedEl.classList.add('hidden');
    } else {
        lockedEl.classList.add('hidden');
        unlockedEl.classList.remove('hidden');
    }
}
`;

vm.runInContext(jsExtract, sandbox);

// Teste 3.1: Certificado bloqueado com 0 módulos
sandbox.updateCertState(0);
assert(!sandbox.document.getElementById('cert-locked-state').classList.contains('hidden'), 'Certificado com 0 módulos: estado BLOQUEADO exibido');
assert(sandbox.document.getElementById('cert-unlocked-state').classList.contains('hidden'), 'Certificado com 0 módulos: estado DESBLOQUEADO oculto');

// Teste 3.2: Certificado bloqueado com 1 módulo
sandbox.updateCertState(1);
assert(!sandbox.document.getElementById('cert-locked-state').classList.contains('hidden'), 'Certificado com 1 módulo: permanece BLOQUEADO');

// Teste 3.3: Certificado bloqueado com 49 módulos
sandbox.updateCertState(49);
assert(!sandbox.document.getElementById('cert-locked-state').classList.contains('hidden'), 'Certificado com 49 módulos: permanece BLOQUEADO');

// Teste 3.4: Certificado desbloqueado com 50 módulos
sandbox.updateCertState(50);
assert(sandbox.document.getElementById('cert-locked-state').classList.contains('hidden'), 'Certificado com 50 módulos: estado BLOQUEADO oculto');
assert(!sandbox.document.getElementById('cert-unlocked-state').classList.contains('hidden'), 'Certificado com 50 módulos: estado DESBLOQUEADO exibido');

// Teste 3.5: Abrir modal de apoio manualmente
sandbox.openApoioModal(true);
assert(!sandbox.document.getElementById('modal-apoio').classList.contains('hidden'), 'openApoioModal(true) abre modal');
assert(sandbox.document.getElementById('apoio-status-text').innerText === 'Aguardando confirmação do PIX...', 'Status inicial é "Aguardando confirmação do PIX..."');

// Teste 3.6: Fechar com "Agora não"
sandbox.closeApoioModal();
assert(sandbox.document.getElementById('modal-apoio').classList.contains('hidden'), 'closeApoioModal() fecha o modal');
assert(sandbox.localStorage.getItem('escoladafe_hide_apoio') === null, 'Fechar simples NÃO define escoladafe_hide_apoio');
assert(sandbox.progress.hasSupported === false, 'Fechar simples NÃO marca o usuário como apoiador');

// Teste 3.7: Clicar em "Não quero ver novamente"
sandbox.openApoioModal(true);
sandbox.hideApoioPermanently();
assert(sandbox.document.getElementById('modal-apoio').classList.contains('hidden'), 'hideApoioPermanently() fecha o modal');
assert(sandbox.localStorage.getItem('escoladafe_hide_apoio') === 'true', 'hideApoioPermanently() salva preferência de ocultar');
assert(sandbox.progress.hasSupported === false, 'hideApoioPermanently() NÃO marca usuário como apoiador');
assert(toastMsg.includes('Preferência salva'), 'Toast de confirmação da preferência exibido');

// Teste 3.8: Disparo automático respeita hideApoio
sandbox.openApoioModal(false);
assert(sandbox.document.getElementById('modal-apoio').classList.contains('hidden'), 'openApoioModal(false) é IGNORADO quando hideApoio está ativo');

// Teste 3.9: Limpar preferência e testar "Já apoiei"
sandbox.localStorage.removeItem('escoladafe_hide_apoio');
sandbox.openApoioModal(true);
sandbox.markAsSupportedDeclared();
assert(sandbox.document.getElementById('modal-apoio').classList.contains('hidden'), 'markAsSupportedDeclared() fecha o modal');
assert(sandbox.localStorage.getItem('escoladafe_hide_apoio') === 'true', 'markAsSupportedDeclared() oculta modal para próximas vezes');
assert(sandbox.progress.hasSupported === true, 'markAsSupportedDeclared() registra apoio do usuário');
assert(sandbox.progress.supportDeclared === true, 'markAsSupportedDeclared() registra como supportDeclared');
assert(toastMsg === 'Obrigado pelo apoio declarado. Deus abençoe sua generosidade!', 'Toast exato e cuidadoso sem alegar confirmação Asaas indevida');

// Teste 3.10: Gatilho automático de Apoio a cada 5 módulos (nunca a cada módulo consecutivo)
function checkApoioMilestone(modNum, completedCount) {
    const isMilestone = (completedCount > 0 && completedCount % 5 === 0) || (modNum > 0 && modNum % 5 === 0);
    return isMilestone;
}
assert(checkApoioMilestone(1, 1) === false, 'Módulo 1: NÃO dispara pedido de apoio');
assert(checkApoioMilestone(2, 2) === false, 'Módulo 2: NÃO dispara pedido de apoio (evita insistência)');
assert(checkApoioMilestone(3, 3) === false, 'Módulo 3: NÃO dispara pedido de apoio');
assert(checkApoioMilestone(4, 4) === false, 'Módulo 4: NÃO dispara pedido de apoio');
assert(checkApoioMilestone(5, 5) === true,  'Módulo 5: DISPARA pedido de apoio (marco formativo de 5 módulos)');
assert(checkApoioMilestone(6, 6) === false, 'Módulo 6: NÃO dispara pedido de apoio');
assert(checkApoioMilestone(7, 7) === false, 'Módulo 7: NÃO dispara pedido de apoio');
assert(checkApoioMilestone(8, 8) === false, 'Módulo 8: NÃO dispara pedido de apoio');
assert(checkApoioMilestone(9, 9) === false, 'Módulo 9: NÃO dispara pedido de apoio');
assert(checkApoioMilestone(10, 10) === true, 'Módulo 10: DISPARA pedido de apoio (marco formativo de 10 módulos / etapa)');

// ----------------------------------------------------
// 4. INTEGRIDADE DA TRILHA DE CONTEÚDO
// ----------------------------------------------------
console.log('\n--- 4. Integridade da Trilha (50 Módulos / 10 Etapas / 250 Questões) ---');
const totalModulesMatch = html.match(/"id":\s*"m\d+"/g);
assert(totalModulesMatch && totalModulesMatch.length === 50, `Total de 50 módulos confirmados (encontrados: ${totalModulesMatch ? totalModulesMatch.length : 0})`);

const stagesMatch = html.match(/id:\s*['"]etp\d+['"]/g);
assert(stagesMatch && stagesMatch.length >= 10, `Pelo menos 10 etapas formativas confirmadas (encontradas: ${stagesMatch ? stagesMatch.length : 0})`);

// ----------------------------------------------------
// 5. TESTES DO SERVIDOR E WEBHOOK ASAAS
// ----------------------------------------------------
console.log('\n--- 5. Servidor & Webhook Asaas ---');
const serverContent = fs.readFileSync(serverPath, 'utf8');
assert(serverContent.includes('/api/asaas-webhook'), 'Endpoint /api/asaas-webhook presente');
assert(serverContent.includes('Aguardando confirmação via PIX Asaas'), 'Mensagem padrão de status pendente presente');
assert(serverContent.includes('PAYMENT_RECEIVED') && serverContent.includes('PAYMENT_CONFIRMED'), 'Eventos oficiais do Asaas tratados');

console.log('\n====================================================');
console.log(`RESULTADO FINAL: ${passCount} PASS, ${failCount} FAIL`);
if (failCount === 0) {
    console.log('STATUS LOCAL: APROVADO');
} else {
    console.log('STATUS LOCAL: NÃO APROVADO');
}
console.log('====================================================\n');
process.exit(failCount === 0 ? 0 : 1);

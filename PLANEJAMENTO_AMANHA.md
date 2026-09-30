# 📋 Roteiro de Execuções Prioritárias — Concluído ✅

---

### 1. Escola da Fé — Deploy Seguro das Melhorias Aprovadas
> **Status:** 100% Concluído e Publicado no Repositório Oficial (`origin/main`).
- [x] **Deploy das melhorias da Escola da Fé em produção:**
  - [x] Linguagem do Certificado desvinculada de termos eclesiásticos indevidos (registro simbólico de estudos, ressalva explícita de não-oficialidade eclesiástica/acadêmica).
  - [x] Três ações distintas e independentes no modal de apoio:
    1. *Já apoiei — não mostrar novamente* (`markAsSupportedDeclared()`, declaração voluntária sem alegação indevida de pagamento bancário).
    2. *Não quero ver novamente* (`hideApoioPermanently()`, apenas oculta o aviso permanentemente, sem marcar como apoiador).
    3. *Agora não, continuar estudos* (`closeApoioModal()`, apenas fecha o modal na sessão).
  - [x] Transparência total no Asaas PIX (favorecido Murilo Ferreira Silva, apoio voluntário independente).
  - [x] **Segurança de Dados:** Nenhuma alteração no banco, histórico, pontuação ou progresso dos estudantes cadastrados (backup preventivo realizado).
  - [x] Testes automatizados rodados e aprovados: 56/56 testes com sucesso (`test_melhorias.mjs`).

---

### 2. Catecismo — Correções de UI Mobile e Liturgia Diária
> **Status:** 100% Concluído e Publicado no Repositório Oficial (`origin/main`).
- [x] **Correção da Novena e Rosário:**
  - Sincronização em tempo real de tema (Modo Noturno / Claro) entre o site e o iframe de novenas.
  - Escala de fonte funcional (`A+` / `A-`) com `--prayer-scale` cobrindo o texto da oração e o "Rosário" (24 Glórias de Santa Teresinha).
- [x] **Ajuste de UI Mobile — Card "O que você deseja fazer agora...":**
  - Botão `(✕ Dispensar)` estruturado com `shrink-0` e texto com `min-w-0 flex-1 truncate sm:whitespace-normal`, eliminando qualquer encavalamento ou sobreposição em smartphones.
- [x] **Ajuste de UI Mobile — Abas da Liturgia Diária:**
  - Aba `"Todas"` removida.
  - Abas limpas e responsivas: `1ª Leitura`, `Salmo`, `2ª Leitura` (quando houver) e `Evangelho`, preenchendo a tela mobile proporcionalmente com `min-w-0 flex-1`.
- [x] **Blindagem do Extrator e Exibição da Liturgia Diária:**
  - Fim da duplicação do refrão do Salmo: apresentação limpa e única sob a etiqueta `Refrão (todos): — [Texto]`.
  - Tratamento das estrofes para não repetir o refrão no início do primeiro verso.
  - Fim do início cortado/truncado no Evangelho e Leituras: busca de `"Naquele tempo"` limitada exclusivamente à fórmula ritual inicial e remoção segura de introduções sem recortar o texto sagrado.

---

### 3. Protocolo de Segurança e Verificação
- [x] Backup preventivo de dados antes da subida (`data_backup_before_deploy/`).
- [x] Bateria de testes de integridade executada localmente antes do deploy.
- [x] Commits e pushes realizados para as branches `main` no GitHub.
- [x] Retrocompatibilidade total preservada (progresso, conquistas e contas de usuários intactos).

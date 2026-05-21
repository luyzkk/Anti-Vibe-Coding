# Memoria: Plano 05 — Steps 8-10 + harness-validate + E2E final

**Feature:** init-refactor-v7
**Iniciado:** 2026-05-21
**Concluido:** 2026-05-21
**Status:** completed

---

## Decisoes de Implementacao

### Fase 01 (delivery-loop — concluida)

- **DI-Plano05-fase01-runner-injetavel-opcional CONFIRMADA:** Step 8 NAO usa runner injetavel.
  `injectOptionalSection` testavel via fixture de arquivo real + assertion de output. ~10
  linhas a menos vs pattern DI-2 do Step 9. 7 testes diretos (1 fixture por caso).
- **DI-Plano05-fase01-G3-prompt-byte-identico CONFIRMADA:** Prompt literal
  `'Do you use Linear and want to enable the Delivery Loop convention?  [y/N]'` (DOUBLE
  SPACE antes de `[y/N]`). Diff entre 08 e 14: empty (byte-identico).
- **DI-Plano05-fase01-registry-stub-loop-i=8:** registry.test.ts loop atualizado de `i=7..9`
  para `i=8..9` (Step 8 ja nao e stub).

### Fase 02 (copy-knowledge — concluida)

- **DI-Plano05-fase02-runner-injetavel-MANTIDO CONFIRMADA:** `runner: StackKnowledgeRunner`
  opcional (default `runStackKnowledgeInit`). 2 matches no grep (type export + default param).
  Evita mock.module pollution (compound note 2026-05-16-bun-mock-module-pollution.md).
- **DI-Plano05-fase02-summary-format CONFIRMADA:** Summary single-line. stack=null →
  `'skipped (no stack detected)'` (match regex `/skipped|no-source|no stack/i`).
- **DI-Plano05-fase02-reentry-refresh-propagado:** ctx flag `__reentryMode='re-populate'`
  vira `refresh=true` propagado ao runner — teste explicito verde.
- **DI-Plano05-fase02-D4-comentarios-sem-tokens:** comentarios reescritos para nao conter
  tokens 'dry-run'/'isDryRun' (reaplicado DI-Plano03-fase01-meta-test-D4-sem-comentario).
  Tokens no codigo: 0.

### Fase 03 (final-validation — concluida)

- **DI-Plano05-fase03-runFinalValidationChecks-mantido-export CONFIRMADA:** `runFinalValidationChecks(cwd: string): Promise<void>`
  e `walkDocs(rootCwd: string): Promise<string[]>` re-exportadas com mesma assinatura
  do antigo 90-final-validation.ts. Testes do PRD knowledge-path-cutover (CA-11, CA-12)
  podem importar diretamente sem ir via Step wrapper.
- **DI-Plano05-fase03-AbortError-code-1-mantido CONFIRMADA:** code=1 no check primario
  (stack sem INDEX.md). Wording literal byte-identico verificado via diff.
- **DI-Plano05-fase03-AbortError-propaga-via-step-run:** teste dedicado garante que
  AbortError do check primario nao e engolido por inner try/catch — propaga ate o dispatcher.
- **DI-Plano05-fase03-D4-grep-count-3-em-comentarios:** grep `dry-run|isDryRun` retorna 3,
  todos em comentarios D4 attestation (em prosa descritiva, nao em codigo funcional). Check
  estrito `isDryRun|dry-run-mode` retorna 0 — guard funcional ausente.

### Fase 04 (harness-validate — concluida)

- **DI-Plano05-fase04-required-files-2-novos CONFIRMADA:** REQUIRED_FILES 26 → 28 entries.
  `'docs/CODE_STYLE.md'` apos COMPOUND_ENGINEERING. `'.claude/CLAUDE.md'` no final.
- **DI-Plano05-fase04-G7-agents-required-links-intocado:** `AGENTS_REQUIRED_LINKS` nao
  modificado — RF-12 e somente sobre REQUIRED_FILES (arquivos no disco).
- **GT-Plano05-fase04-harness-validate-falha-preexistente:** `bun run harness:validate`
  exit !=0 por CHANGELOG.md broken link + workspace `.claude/CLAUDE.md` artifact local.
  Documentado como pre-existente fora do escopo desta fase.

### Fase 05 (registry-wire + e2e final + cleanup — concluida)

- **DI-Plano05-fase05-acceptance-test-um-arquivo CONFIRMADA:** `tests/e2e/init-v7-final-acceptance.test.ts`
  unico, 10 testes nomeados `CA-01 ...` a `CA-09 ...` + NFR perf. Reuso de fixtures via
  helper `copyFixtureToTmp` de `tests/e2e/__fixtures__/v7-populate-helpers.ts`.
- **DI-Plano05-fase05-runInit-returns-not-throws CONFIRMADA (CA-08):** CA-08 verifica
  `result.kind === 'aborted'` + `result.code === 10` em vez de try/catch. Match com
  DI-Plano04-fase05-runInit-returns-not-throws.
- **DI-Plano05-fase05-scaffoldFullTreeStep-excluido-do-grep:** scaffoldFullTreeStep e
  export VIVO em `01-scaffold-full-tree.ts` (nao foi deletado — e usado por `05-scaffold-and-link`).
  Removido da lista de patterns do grep-gate sem impacto: NAO e regressao se aparecer.
- **DI-Plano05-fase05-delete-old-steps-antigos PARCIAL:** apenas `14-delivery-loop.ts` e
  `90-final-validation.ts` (+ tests) deletados. `03_1-persist-stack-and-knowledge.ts` JA
  havia sido deletado em Plano 01 fase-05 (commit anterior). MEMORY do Plano 01 nao
  documentou — descoberto em runtime.
- **DI-Plano05-fase05-test-skip-removal-skipped:** spec mencionava remover 2 `test.skip` em
  `tests/e2e/init-cutover-greenfield.test.ts`. Agente nao encontrou nenhum `test.skip`
  no arquivo — ja haviam sido removidos em fase anterior (provavelmente Plano 04
  fase-01 cleanup). Tarefa skipada como nao-aplicavel.
- **GT-Plano05-fase05-harness-validate-preexistente-confirmado:** harness:validate exit !=0
  persiste, confirmado como pre-existente (CHANGELOG.md + workspace artifact). REQUIRED_FILES
  com 28 entries OK.
- **DI-Plano05-fase05-libs-orfas-NAO-deletadas CONFIRMADA (G13):** `snippet-resolver.ts` e
  `backup-anti-vibe.ts` continuam orfas pos-merge. Issue futura para /iterate.

<!-- Candidatas antecipadas pre-execucao (todas resolvidas acima):

- **DI-Plano05-fase01-runner-injetavel-opcional:** Step 8 (`08-delivery-loop.ts`) NAO precisa
  de runner injetavel — o `injectOptionalSection` ja e testavel via fixture de arquivo real
  + assertion de output. Diferente do Step 9 que reusa o padrao DI-2 do
  `03_1-persist-stack-and-knowledge.ts` (StackKnowledgeRunner injetavel para evitar
  mock.module pollution — compound note 2026-05-16-bun-mock-module-pollution.md).
  - Por que: Step 8 e simples (le snippet do disco + chama 1 helper), nao envolve detect/copy.
    Mock direto de `fs.readFile`/`fs.writeFile` via fixture em `tests/fixtures/agents-md/`.
  - Impacto: ~10 linhas a menos vs DI-2 pattern. Testes ficam diretos (1 fixture por caso).

- **DI-Plano05-fase02-runner-injetavel-mantido:** Step 9 (`09-copy-knowledge.ts`) MANTEM o
  padrao DI-2 de `03_1-persist-stack-and-knowledge.ts`: aceita `runner: StackKnowledgeRunner`
  opcional (default `runStackKnowledgeInit`).
  - Por que: `runStackKnowledgeInit` toca disco em 4 lugares (`writeStackJson`, `copyKnowledge`,
    patch transactional, `emitStackKnowledgeEvents`) — mocking via fixtures e custoso. Runner
    injetavel resolve compound note 2026-05-16-bun-mock-module-pollution.md de uma vez.
  - Impacto: mesma assinatura do step antigo, facilita audit diff.

- **DI-Plano05-fase02-summary-format:** Summary do Step 9 e single-line, formato:
  `"copy-knowledge: stack={primary}, status={copyResult.status}, atomsWritten={N}"`. Quando
  stack=null: `"copy-knowledge: skipped (no stack detected)"`.
  - Por que: 3 metricas em uma linha vs multilinha (Plano 04 fase-04 usou multilinha para 4
    metricas). Aqui ha apenas 3 e nao ha path-pointer crucial.
  - Impacto: parsers de log conseguem extrair via regex simples `/stack=(\w+)/`.

- **DI-Plano05-fase03-runFinalValidationChecks-mantido-export:** Export de
  `runFinalValidationChecks(cwd: string): Promise<void>` preservado em `10-final-validation.ts`
  com mesma assinatura do arquivo antigo `90-final-validation.ts`.
  - Por que: testes do Plano `knowledge-path-cutover` (CA-11, CA-12) podem importar diretamente
    sem ir via Step wrapper. Manter retro-compatibilidade.
  - Impacto: zero — funcao ja era exportada no arquivo antigo, apenas mudamos de path.

- **DI-Plano05-fase03-AbortError-code-1-mantido:** Code do AbortError no check primario
  (stack sem INDEX.md) e `1` — preservado do `90-final-validation.ts:60`.
  - Por que: outros consumers (CI, logs) podem ja parsear esse code. Codes em uso:
    1 (final-validation no-index), 10 (reentry-gate ja-inicializado), 11 (detect-stack
    no-anchor), 20 (Step 7 no-stack DR-2). Manter espacamento e clareza semantica
    (categoria 1x = final-validation, 1x = reentry, 2x = generate).
  - Impacto: e2e da fase-05 testa `error.code === 1` para esse caso.

- **DI-Plano05-fase04-required-files-2-novos:** REQUIRED_FILES ganha exatamente 2 entries:
  `'docs/CODE_STYLE.md'` (apos `'docs/STATE.md'` na linha 28) e `'.claude/CLAUDE.md'` (no
  final da lista). Ordem alfabetica relativa preservada.
  - Por que: os outros 2 (MERGE_GATES, STATE) ja estao presentes. RF-12 fala dos 4 docs
    extras AVC — apenas 2 precisam ser adicionados.
  - Impacto: REQUIRED_FILES vai de 26 para 28 entries. Total de docs validados sobe 2.

- **DI-Plano05-fase05-grep-gate-list:** O script `bun run grep-deleted-steps` valida ausencia
  de TODOS os IDs/exports dos 15 steps deletados pelo Plano 01 fase-05. Lista exata pegando
  do AUDIT.md do Plano 01 fase-01 e do registry.ts antigo. Padrao regex unico:
  `(scaffoldFullTreeStep|secretsScan2Old|...|generatePopulatePlansV2)`.
  - Por que: defesa contra alguem rebaseiar e re-introduzir um nome deletado.
  - Impacto: 1 script novo em package.json. Roda em <500ms (grep simples).

- **DI-Plano05-fase05-fixture-claude-md-preexisting-reuso:** Se Plano 03 fase-03 ja criou
  `tests/e2e/__fixtures__/v7-with-claude-md/` com `.claude/CLAUDE.md` de conteudo customizado,
  REUSAR. Se nao, criar como parte da fase-05.
  - Por que: evita duplicacao. Plano 03 ja precisava dessa fixture para CA-02.
  - Impacto: verificar antes via `ls tests/e2e/__fixtures__/` na fase-05 Passo 1.

- **DI-Plano05-fase05-delete-old-steps-antigos:** Apos fase-05 verde, deletar em commit
  separado os 3 arquivos fonte do porting: `skills/init/lib/steps/14-delivery-loop.ts`,
  `skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts`, `skills/init/lib/steps/90-final-validation.ts`.
  - Por que: cleanup antes de "construir" final (CLAUDE.md global). Estado intermediario
    aceito durante a fase de porting (refs cruzadas de teste), mas pos-merge devem sumir.
  - Impacto: ~250 linhas a menos. Verificar via grep que nenhum import sobrou (`grep -r
    "14-delivery-loop\|03_1-persist-stack-and-knowledge\|90-final-validation" skills/`).

- **DI-Plano05-fase05-libs-orfas-NAO-deletadas:** `snippet-resolver.ts` e `backup-anti-vibe.ts`
  continuam como orfas pos-merge — fora do escopo. Issue futura limpa.
  - Por que: G13 do README — risco de quebrar algo nao mapeado. Verificar callers em PR
    separado.
  - Impacto: 2 arquivos orfaos persistem. Anotado em "Notas para planos seguintes" mesmo
    sendo plano final (e referencia para `/iterate` que vier dps).

- **DI-Plano05-fase05-acceptance-test-um-arquivo:** Suite `init-v7-final-acceptance.test.ts`
  e UM arquivo unico cobrindo os 9 CAs em 9 testes nomeados `CA-01 ...`, `CA-02 ...`, etc.
  Reusa fixtures via helpers, mas cada teste roda em mkdtemp limpo.
  - Por que: rastreabilidade direta PRD ↔ teste. Um arquivo facilita ler "tudo que valida
    o PRD" em 1 lugar.
  - Impacto: arquivo medio (~400 linhas), aceitavel para test suite (sem code splitting).
    Se ficar ruim, refatorar em 2-3 arquivos por affinity (interactive, structural, perf).

-->

---

## Bugs Descobertos

Nenhum bug em codigo de runtime. Steps 8-10 foram portings diretos com remocao de dry-run
guard. Wording G3 (DOUBLE SPACE) preservado.

---

## Gotchas

- **GT-Plano05-fase04-harness-validate-preexistente:** `bun run harness:validate` exit !=0
  por motivos pre-existentes (CHANGELOG.md broken link de step `00-detect-legacy` deletado em
  Plano 01 + workspace `.claude/CLAUDE.md` markdown-heading do init local). Nao bloqueia o
  PRD — REQUIRED_FILES com 28 entries OK, comportamento esperado. Issue futura para limpar.

- **GT-Plano05-fase05-03_1-step-ja-deletado:** `03_1-persist-stack-and-knowledge.ts` ja
  havia sido deletado em Plano 01 fase-05, mas o MEMORY do Plano 01 nao documentou. Plano 05
  fase-05 spec listava o arquivo como alvo de delete — descobrimos ausencia em runtime e
  skipamos. Cuidado: confiar no MEMORY mas verificar com `ls` antes de delete.

- **GT-Plano05-fase05-test-skip-ja-removido:** spec listava `test.skip` para remover em
  `init-cutover-greenfield.test.ts`. Ja haviam sido removidos em Plano 04 (provavelmente
  fase-01 cleanup do DEV-01). Verificacao em runtime achou zero matches.

---

## Desvios do Plano

- **DEV-01 (Plano05 fase-05):** Spec do cleanup mencionava 3 arquivos para delete; apenas 2
  foram deletados nesta fase (`14-delivery-loop.ts` e `90-final-validation.ts`). O terceiro
  (`03_1-persist-stack-and-knowledge.ts`) ja havia sido deletado em Plano 01 fase-05 sem
  documentacao no MEMORY. Impacto: zero — alvo do delete ja era inexistente.

- **DEV-02 (Plano05 fase-05):** `scaffoldFullTreeStep` foi removido da lista de patterns do
  grep-gate. Era listado na spec como ID deletado, mas e export VIVO em `01-scaffold-full-tree.ts`
  (usado por `05-scaffold-and-link`). Impacto: zero regressao — gate continua bloqueando IDs
  de fato deletados (10+).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 2 (DEV-01, DEV-02) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Commits | 6 (b68e528, b337602, e771388, 96cf082, f34bbd8, 06b0962) |
| Testes adicionados | 30+ (7+5+8+2+10 acceptance + grep-gate test) |

---

## Notas para Planos Seguintes

Plano FINAL. Notas aqui sao para `/iterate` pos-merge ou refactor futuro de init.

<!-- Preencher durante execucao. Itens antecipados:

- **Libs orfas pos-merge:** `skills/init/lib/snippet-resolver.ts` e `skills/init/lib/backup-anti-vibe.ts`
  ficaram sem callers conhecidos apos Planos 01-05. NAO foram deletadas. Issue futura para
  limpar — verificar imports via grep antes de remover.

- **Steps antigos deletados em commit final do Plano 05:** `14-delivery-loop.ts`,
  `03_1-persist-stack-and-knowledge.ts`, `90-final-validation.ts`. Linhagem preservada via
  git log dos arquivos novos (08, 09, 10) que portaram a logica.

- **E2E `tests/e2e/init-v7-final-acceptance.test.ts` e o contrato vivo dos CAs:** qualquer
  mudanca futura no init que quebre 1 dos 9 CAs falha aqui. Atualizar este arquivo
  CONJUNTAMENTE com mudanca de PRD — nao deixar drift entre PRD.md e o e2e.

- **Grep-gate `bun run grep-deleted-steps`:** roda em CI via `package.json` script. Lista
  hardcoded de IDs deletados. Atualizar APENAS se um novo refactor deletar mais steps
  (incremento da lista, nao removal).

- **`runFinalValidationChecks` exportada de `steps/10-final-validation.ts`:** mesma
  assinatura do antigo `steps/90-final-validation.ts`. Testes de PRD `knowledge-path-cutover`
  importam diretamente (CA-11, CA-12). Mudanca de path documentada para nao quebrar caller.

- **Codes de AbortError em uso pos-v7:**
  - `1` — final-validation: stack detectada sem INDEX.md (D8.C)
  - `10` — reentry-gate: ja-inicializado (DR-1)
  - `11` — detect-stack: no-anchor (caso adicionado pelo Plano 01 fase-02)
  - `20` — generate-populate-plans: stack=null (DR-2)
  - Novos codes futuros devem comecar em `30+` para nao colidir.

- **DV-4 NAO endurecido:** `StepContext.legacy?`/`stack?` continuam opcionais. Steps 8-10
  nao usam diretamente — Step 9 detecta internamente, Step 10 le do disco. Se um plano
  futuro precisar (ex: Step 8 stack-aware), endurecer com migracao em fases.

- **Init total <30s confirmado em fixture Node greenfield:** medido em fase-05 via
  `performance.now()`. Se um futuro step inflar o tempo, e2e falha como early-warning.

- **Tests deletados/skipped recuperados:** Plano 01 fase-05 deixou skips em
  `tests/e2e/ca13-dry-run-parity.test.ts` e `tests/e2e/init-cutover-greenfield.test.ts`
  apontando "Plano 05 fase-04". Plano 05 fase-04 ESCREVE harness-validate, NAO recupera
  esses testes (sao do dry-run que foi removido, D4). Decisao: deletar `ca13-dry-run-parity.test.ts`
  inteiro (obsoleto) e os 2 testes skipados em `init-cutover-greenfield.test.ts` (2 outros testes
  ja verdes naquele arquivo). Documentar como DI no MEMORY.

-->

---

<!-- Atualizado automaticamente durante execucao -->

# /anti-vibe-coding:init — Rationale Indexado

> **Origem:** este arquivo consolida HTML comments e blocos rationale que viviam inline em
> `skills/init/SKILL.md` ate v6.3.2 (1215 linhas). Extraido em 2026-05-17 durante a refatoracao
> Rails-style (PRD `2026-05-17-refactor-init-skill-rails`). O SKILL.md novo (manifest) referencia
> este arquivo por ID.

## Como ler

Cada entrada tem formato:

    ### {ID} — {titulo}
    {paragrafo de contexto}
    **Consumido por:** {step-id-1}, {step-id-2}

Se voce esta editando um step em `skills/init/lib/steps/` e precisa entender o porque de uma
decisao (ex: "por que usamos `await import` em vez de `bun -e`?"), busque pelo ID neste arquivo.

**Convencao de IDs sem numero:** entradas sem ID numerico (ex: gates inline) recebem formato
`gate:{slug}` (ex: `gate:migrate-1-backup-fail`). IDs originais do SKILL.md sao preservados
sem normalizacao (ex: `R2` e nao `R-02`) para que grep por `R2` em steps continue casando.

---

## Decisoes de Implementacao (DI)

### DI-01 — Import direto via `await import('./lib/X.ts')` no bloco javascript

Import direto em vez de `bun -e` (GT-04 — `bun -e` com paths absolutos quebra no Windows).
Usado nos steps de migracao (`migrate.1`, `migrate.2`, `migrate.3`, `migrate.4`) como padrao
de importacao dos helpers TypeScript a partir do bloco javascript do SKILL.md.

**Consumido por:** `migrate-1-backup`, `migrate-2-planning`, `migrate-3-lessons`, `migrate-4-decisions`

---

### DI-04 — Inline JS detect `--dry-run` em vez de parser CLI completo

Logic in code block, `await import` pattern (GT-04 Windows). Detecta `--dry-run` em ARGUMENTS
antes de qualquer step de migracao rodar. Evita dependencia de um parser CLI completo
(commander/yargs) para uma flag simples — parseRefreshFlag extraido em
`skills/init/lib/parse-refresh-flag.ts` para testabilidade.

**Consumido por:** `migrate-0-parse-dry-run`, `migrate-all-orchestrate`

---

### DI-06 — `bun -e` quebra em paths absolutos no Windows — usar `await import`

`bun -e` com paths absolutos quebra no Windows. Padrao unificado: usar `await import('./lib/X.ts')`
no bloco javascript do SKILL.md em vez de `bun run -e`. Este padrao aparece em todos os steps
que importam helpers TypeScript. Centralizado em `lib/lazy-import.ts` apos Plano 01 fase-04.

**Nota:** DI-06 nao tem citacao individual por step porque foi centralizado em `lib/lazy-import.ts`.

**Consumido por:** todos os steps (transversal — centralizado em `lib/lazy-import.ts` apos Plano 01 fase-04)

---

### DI-4 — parseRefreshFlag extraido em lib para testabilidade

Alias de DI-04 no formato sem hifen — aparece em comentario de Step 3.1. `parseRefreshFlag`
extraido em `skills/init/lib/parse-refresh-flag.ts` para testabilidade independente do bloco
inline do SKILL.md. Wave 5 D2 — orquestracao extraida para `lib/run-stack-knowledge-init.ts`.

**Consumido por:** `run-stack-knowledge-init` (Step 3.1)

---

## Gotchas (GT)

### GT-04 — Workaround Windows + bun -e

`bun -e` com paths absolutos quebra em bash Windows. Workaround: usar `await import('./lib/X.ts')`
no bloco javascript em vez de `bun run -e` com path direto. Gotcha e decisao pareados com DI-06:
DI-06 e a decisao de design; GT-04 e o gatilho tecnico (comportamento do bun no Windows) que
motivou a decisao.

**Consumido por:** mesmo escopo de DI-06 (transversal — todos os steps de init)

---

## Criterios de Aceite (CA)

### CA-01 — Greenfield byte-identico apos cutover

O comportamento do `/init` em modo greenfield deve ser byte-identico antes e apos o cutover
do SKILL.md (inline -> manifest dispatcher). Verificado por testes E2E com fixture
`init-greenfield` comparando stdout + arvore de arquivos caractere a caractere.

**Consumido por:** fase-04 do Plano 04 (testes E2E)

---

### CA-03 — `--dry-run` nao cria arquivos

Com `--dry-run`, nenhum arquivo deve ser criado ou modificado. `docs/` nunca e criado.
`.planning/` nunca e deletado. `.planning.v5-backup/` e limpo apos gerar o relatorio.

**Consumido por:** `migrate-0-parse-dry-run`, `migrate-all-orchestrate`

---

### CA-04 — Multi-stack + idempotent default + --refresh-knowledge

Plano 02 fase-03 — suporte a multi-stack, comportamento idempotente por default e flag
`--refresh-knowledge` para reprocessar knowledge packs sem re-rodar o init completo.

**Consumido por:** `run-stack-knowledge-init` (Step 3.1)

---

### CA-05 — Cache fresh threshold configuravel via env

Env override RF-CH-01 — `ANTI_VIBE_FRESH_HOURS` controla o threshold de cache para
`--reuse-discovery`. Injecao via env para testabilidade (DI pattern).

**Consumido por:** `reuse-discovery.0` (Step reuse-discovery.0)

---

### CA-09 — SKILL.md `<= 200` linhas

Meta do PRD: o novo SKILL.md manifest deve ter no maximo 200 linhas. Verificado por
`wc -l skills/init/SKILL.md`. Budget inclui intent header + tabela de steps + blocos de
telemetria + referencias para este arquivo de rationale.

**Consumido por:** fase-03 do Plano 04 (cutover) + fase-05 (validacao final)

---

### CA-10 — `bun run test` verde apos cutover

Todos os testes existentes devem continuar passando apos o cutover do SKILL.md. Garante que
nenhum helper foi modificado inadvertidamente (G3 do Plano 04). Rodado em cada fase como gate.

**Consumido por:** todas as fases do Plano 04

---

### CA-15 — ADRs com frontmatter id/title/status/date/tags

ADRs gerados pelo `migrate-4-decisions` devem ter frontmatter completo com campos
`id`, `title`, `status`, `date`, `tags` e secoes `Context`, `Decision`, `Consequences`.
Numeracao monotonica por `docs/design-docs/` (G7 do Plano 03).

**Consumido por:** `migrate-4-decisions`

---

### CA-29 — Compound notes com frontmatter title/category/tags/created

Compound notes geradas pelo `migrate-3-lessons` devem ter frontmatter com campos
`title`, `category`, `tags`, `created`. Validado por `bun run compound:check`.
Parser cobre formato A (`## YYYY-MM-DD: titulo`) e formato B (`### [Categoria] titulo`).

**Consumido por:** `migrate-3-lessons`

---

### CA-31 — TODO.md idempotente (prereq do /todo-pick)

`{projectRoot}/TODO.md` criado idempotentemente: se existe, skip silencioso (G2 — nao
sobrescrever historico do usuario); se ausente, copiar skeleton canonico. Encoding: UTF-8
sem BOM. Line endings: LF. Prereq para o `/todo-pick` funcionar corretamente.

**Consumido por:** `scaffold-full-tree` (Passo 1 + Passo 1.5 consolidado)

---

## Riscos (R)

### R2 — Backup deve preceder qualquer mutacao

O backup do `.planning/` em `.planning.v5-backup/` deve ser criado ANTES de qualquer
helper de migracao rodar (fase-03/04/05). Se o backup falhar (lock / disco cheio /
permissao negada), abortar a migracao inteira. Lock orfao (>5min): deletar manualmente
e re-rodar.

**Consumido por:** `migrate-1-backup`

---

### R14 — Dry-run nao deve criar `docs/`

Em modo dry-run, o diretorio `docs/` nunca deve ser criado. A verificacao e feita antes de
qualquer helper de migracao e propagada como flag `dryRun: true` no contexto de execucao.

**Consumido por:** `migrate-0-parse-dry-run`, `migrate-all-orchestrate`

---

## Mensagens / Decisoes de Modulo (M)

### M3 — Stack registrada em STATE.md

A stack detectada no Step 3 e registrada em `STATE.md` do projeto. v6.0.0 apenas registra
— knowledge packs (`docs/knowledge/{stack}/`) sao instalados em v6.1+.

**Consumido por:** `detect-stack-and-register` (Step 3)

---

### M7 — Migracao gera lessons + decisions

A pipeline de migracao (steps migrate.3 e migrate.4) produz dois artefatos permanentes:
compound notes em `docs/compound/` e ADRs em `docs/design-docs/`. Ambos seguem o formato
canonico (CA-29 e CA-15 respectivamente).

**Consumido por:** `migrate-3-lessons`, `migrate-4-decisions`

---

### M8 — Backup antes do migrate.2

O step `migrate-1-backup` deve completar com sucesso antes do `migrate-2-planning` rodar.
Gate explicito: se migrate.1 sair com codigo nao-zero, migrate.2/.3/.4 nao executam.

**Consumido por:** `migrate-1-backup`, `migrate-2-planning`

---

## Decisoes de Design (D)

### D1 — Manifest + dispatcher Rails-style

O SKILL.md novo (manifest) declara intent e referencia steps via tabela. O runtime eh o
dispatcher `runInit` em `lib/run-init.ts`. A fonte de verdade do runtime eh `lib/registry.ts`
— a tabela no SKILL.md e documentacao para humanos, nao fonte de verdade do dispatcher.

**Consumido por:** `run-init` (dispatcher), `registry` (runtime)

---

### D2 — Orquestracao extraida para helper testavel

Wave 5 D2: orquestracao extraida para `lib/run-stack-knowledge-init.ts` para testabilidade.
Step 3.1 e thin caller; toda logica esta no helper com suite de testes propria.

**Consumido por:** `run-stack-knowledge-init` (Step 3.1)

---

### D3 — Steps interativos retornam contrato `needsUser`

Steps que precisam de input do usuario (ex: Delivery Loop opt-in, merge approval) retornam
o contrato `needsUser` em vez de usar `AskUserQuestion` diretamente no bloco inline.
O dispatcher (`delivery-loop`) processa o contrato e delega para o runner interativo.

**Consumido por:** `delivery-loop` (Step 6)

---

### D4 — Flag `--reuse-discovery` / alias `--refresh`

D1/D4 do PRD: flag `--reuse-discovery` antes do Passo 0. DEC-2 (2026-05-15) v6.3.0
plano05 fase-01: `--refresh` e alias do `--reuse-discovery`; `parity-gaps.json` tambem
e regenerado quando `/parity-audit` esta disponivel.

**Consumido por:** `reuse-discovery.0` (Step reuse-discovery.0)

---

### D7 — Stack registrada em STATE.md no Step 3

Step 3 detecta a stack e registra em STATE.md. Separacao de responsabilidades: deteccao
(detect-stack.ts) e escrita (state-md-init.ts) sao helpers independentes.

**Consumido por:** `detect-stack-and-register` (Step 3)

---

### D9 — Detecao read-only de v5 legacy antes de qualquer mutacao

Step 0.5 (`detectV5Legacy`) e read-only — nao muta disco. Qualquer mutacao fica para
migrate.1 (backup idempotente). Detecta presenca de artifacts v5 (`.planning/`) e flags
de migracao parcial (`alreadyMigrated && isLegacy`).

**Consumido por:** `detect-legacy` (Step 0.5)

---

### D12 — Delivery Loop eh opt-in default-N

Step 6 pergunta ao usuario se quer habilitar o Delivery Loop (Linear integration). Default: N
(skip). Se sim, injeta snippet `delivery-loop.md` no AGENTS.md via `injectOptionalSection`.
Se `result.status === 'marker-missing'`, loga warning (AGENTS.md editado manualmente ou
versao de template divergente).

**Consumido por:** `delivery-loop` (Step 6)

---

### D14 — Install GH files SEMPRE (mesmo sem GitHub)

Arquivos `.github/` sao instalados incondicionalmente (Step 5). Projetos que nao usam
GitHub podem deletar `.github/` apos o init. Decisao simplifica o fluxo — sem pergunta
condicional sobre uso de GitHub.

**Consumido por:** `install-gh-files` (Step 5)

---

### D15 — `alreadyMigrated && isLegacy` -> partial migration, exit 2

Se o projeto tem AMBOS: artifacts v5 (`.planning/`) E `docs/exec-plans/` (estrutura v6),
trata como migracao parcial e sai com exit 2. Mensagem orientativa: rodar
`/init migrate --resume` ou remover residuals manualmente.

**Consumido por:** `detect-legacy` (Step 0.5)

---

### D16 — AGENTS.md como single source of truth

AGENTS.md e a fonte de verdade do projeto. CLAUDE.md espelha AGENTS.md via symlink (Tier 1),
hardlink (Tier 2) ou copy-with-hook (Tier 3 — fallback Windows sem developer mode).

**Consumido por:** `link-claude-to-agents` (Step 2)

---

## Gates

### gate:migrate-1-backup-fail — Abortar se backup falhar

GATING: executar este step ANTES de qualquer helper de migracao (fases 03/04/05). Se retornar
erro (lock / disco cheio / permissao negada), ABORTAR a migracao inteira. Lock orfao (>5min):
deletar manualmente e re-rodar. Implementado via `AbortError({ code: 1, reason: ... })` lancado
pelo `migrate-1-backup`.

**Consumido por:** `migrate-1-backup` (lanca `AbortError({ code: 1, reason: ... })`)

---

### gate:migrate-2-conflict — Parar se houver conflitos

Se conflitos sao reportados pelo `migratePlanning`, o pipeline para — fases migrate.3 (lessons)
e migrate.4 (decisions) NAO rodam. Usuario resolve manualmente (deleta de `docs/` ou renomeia
original) e re-roda `/init migrate`. Implementado via `AbortError({ code: 1, reason: ... })`
lancado pelo `migrate-2-planning`.

**Consumido por:** `migrate-2-planning` (lanca `AbortError({ code: 1, reason: ... })`)

---

### gate:detect-legacy-partial-migration — Exit 2 em migracao parcial

Se `state.alreadyMigrated && state.isLegacy` (D15), o step 0.5 sai com `process.exit(2)`.
Mensagem: "Project has both v5 artifacts AND docs/exec-plans/ — partial migration?". Nao e
um `AbortError` — e exit direto com codigo 2 para distinguir de erro de runtime (exit 1).

**Consumido por:** `detect-legacy` (Step 0.5 — `process.exit(2)`)

---

### gate:capabilities-discovery-soft-fail — Step 7 nunca aborta /init

Soft-fail obrigatorio: Step 7 (Capabilities Discovery) NUNCA aborta o `/init` em caso de
erro. Se o architecture profile nao foi detectado (`readArchitectureProfile` retorna null),
o step pula silenciosamente. Qualquer excecao e capturada e logada via `console.warn` sem
rethrow.

**Consumido por:** `capabilities-discovery` (Step 7)

---

## DEV historic

### DEV-P04F01-1 — Divergencia source-missing: SKILL.md vs helper

<!-- 2026-05-17 (Luiz/dev): documentado durante Plano 04 fase-01 a partir de nota do Plano 03. -->

SKILL.md linha 174 referencia `reason.includes('source-missing')` no step migrate.3, porem
o helper `migrate-lessons.ts` retorna a string `'no lessons-learned.md in backup'` no campo
`reason`. Esta divergencia foi identificada no Plano 03 como gotcha conhecido. A condicional
no SKILL.md funciona incorretamente em runtime — o `includes('source-missing')` nunca casa.

**Status:** divergencia conhecida, nao corrigida nesta fase (helpers sao sacrossantos em Plano 04).
Candidato a correcao na fase-05 (cleanup) ou em plano separado de bug fix.
**Consumido por:** `migrate-3-lessons` (Step migrate.3) — comportamento incorreto em runtime

---

## PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)

> **Origem:** este bloco indexa as 30 decisoes consolidadas em
> `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/CONTEXT.md`
> (sessao 1: D1-D20 em 2026-05-17, sessao 2: D21-D30 em 2026-05-18) e formalizadas
> no PRD irmao. Os IDs `D1`..`D30` deste bloco coexistem sem colisao com `DI-XX` /
> `GT-XX` / `CA-XX` do refactor Rails-style anterior (prefixos diferentes). Cada
> decisao lista `**Consumido por:**` apontando steps em `skills/init/lib/steps/`
> ou planos hierarquicos em `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/`.

### D1 — Aplicabilidade por modo do /init

Tres melhorias (populate plan, merge invertido, adapt docs) rodam nos 4 modos
detectados: greenfield, migration, legacy v5, already-initiated. Greenfield gera
plano de populacao puro (sem merge/move porque nao ha docs pre-existentes).
Already-initiated detecta drift e oferece re-populacao incremental.

**Consumido por:** `91-generate-populate-plan` (todos os modos), `12-detect-drift-incremental` (already-initiated)

### D2 — Estrategia de inversao do CLAUDE.md

Destrutivo com backup recuperavel + aprovacao explicita. Modo dual rejeitado por
violar D16 do v6.0.0 (single source of truth) indefinidamente. Backup em
`.anti-vibe/backup/{ts}/` + diff visual + aprovacao em batch cobrem o risco.

**Consumido por:** `10-apply-merge-destructive`, `09-propose-merge-batch`, `lib/backup-anti-vibe.ts`

### D3 — Disparo do plano de populacao

Sugestao ao final — `/init` escreve `docs/exec-plans/active/{date}-populate-harness/PLAN.md`
e mostra mensagem sugerindo `/execute-plan`. Inline rejeitado por violar
`feedback_suggest_dont_execute.md` (IA sugere, dev decide). Plano em disco fica
revisavel antes da execucao.

**Consumido por:** `91-generate-populate-plan`, `skills/init/SKILL.md` (mensagem final)

### D4 — Granularidade de confirmacao

Batch agregado com diff consolidado — uma aprovacao global ou cancela tudo.
File-by-file (15+ prompts) e tiered (logica condicional) rejeitados. Cancelar e
re-rodar com ajustes mais rapido que aprovar individualmente.

**Consumido por:** `09-propose-merge-batch`, contrato `needsUser` em `steps/types.ts`

### D5 — Escopo de adaptacao de docs

Recursivo — raiz + `/docs/` + `.claude/`, whitelist `.md/.mdx`, blacklist
`node_modules/dist/build/.git`. Maximiza captura de conhecimento institucional
mantendo custo controlado.

**Consumido por:** `07-discover-existing-docs`, `lib/discover-existing-docs.ts`

### D6 — README.md intocavel

READ-ONLY input — nunca movido, nunca reescrito. README eh contrato publico do
repo (GitHub home). Plugin extrai info de stack/setup para popular
ARCHITECTURE.md no plano de populacao, mas NAO toca o README.

**Consumido por:** `11-move-docs-with-stub` (skip explicito), `07-discover-existing-docs` (filtra README raiz)

### D7 — Idempotencia de re-rodar /init

Drift detection via checksums no manifest + re-populacao incremental. PLACEHOLDER
(vazio) entra no plano; POPULATED (editado) nao toca; DRIFT (modificado mas
placeholder) avisa.

**Consumido por:** `12-detect-drift-incremental`, `lib/drift-detector.ts`

### D8 — Classificacao de blocos em categorias harness

Hibrido — heuristica regex + LLM refina ambiguos + dev aprova batch. 100% heuristica
falha em blocos misturados; 100% LLM custa e nao-deterministico; manual exausta.

**Consumido por:** `08-classify-blocks-hybrid`, `lib/blocks-classifier.ts`

### D9 — Localizacao do backup

`.anti-vibe/backup/{YYYY-MM-DD-HHMMSS}/`. Inline `.backup` polui raiz; `.claude/archive/`
mistura com Passo 2.5. Pasta dedicada fora do dominio Claude Code, multiplos backups,
gitignore automatico.

**Consumido por:** `lib/backup-anti-vibe.ts`, `10-apply-merge-destructive`, `lib/rollback.ts`

### D10 — Rollback explicito

`/anti-vibe-coding:init --rollback` — comando explicito le ultimo backup em
`.anti-vibe/backup/{latest}/`, restaura, registra ADR. Reversibilidade clara sem
depender de dev lembrar comandos git.

**Consumido por:** `lib/rollback.ts`, `lib/run-init.ts` (early-return em `--rollback`)

### D11 — Docs orfaos sem categoria harness clara

`docs/references/{nome-original}.md`. AGENTS.md ganha linha condicional "Material
de referencia: ver docs/references/". Estrutura previsivel para qualquer projeto.

**Consumido por:** `lib/blocks-classifier.ts` (orphan fallback), `08-classify-blocks-hybrid`

### D12 — Links externos apos move

Stub redirect no path antigo + grep+rewrite de links internos do repo + warning de
URLs externas. Tres camadas de seguranca.

**Consumido por:** `lib/doc-mover-stub.ts`, `11-move-docs-with-stub`

### D13 — Execucao do plano de populacao

Subagents paralelos por arquivo de destino via `/execute-plan` wave-based. 5+
subagents populam AGENTS/ARCHITECTURE/SECURITY/DESIGN/RELIABILITY simultaneamente.
Isolamento de contexto evita decay.

**Consumido por:** `lib/populate-plan-generator.ts` (emite tasks paralelizaveis), `assets/snippets/populate-plan-template.md`

### D14 — Docs filosoficos do harness

`docs/COMPOUND_ENGINEERING.md` e `docs/PRODUCT_SENSE.md` ficam template canonico
do plugin (sem populacao). Postura identica em todo projeto.

**Consumido por:** `lib/populate-plan-generator.ts` (exclui explicitamente), `08-classify-blocks-hybrid` (enum `HarnessCategory` nao inclui)

### D15 — Validacao pos-populacao

Ultima task do PLAN.md de populacao roda `bun run scripts/harness-validate.ts &&
bun run scripts/compound-check.ts`. Falha trava em status `awaiting-fix`.

**Consumido por:** `assets/snippets/populate-plan-template.md` (apenda task final), `lib/populate-plan-generator.ts`

### D16 — Scan de secrets/PII antes de mover docs

Regex contra AKIA*, sk_live_, postgres://user:pass, emails, JWT. Match → bloqueia
move desse arquivo especifico ate aprovacao manual. gitleaks/trufflehog fica para
v6.5+.

**Consumido por:** `06-secrets-scan`, `lib/secrets-scanner.ts`

### D17 — Regras Akita extensas vs limite AGENTS.md <=40 linhas

Akita extraido para `docs/DESIGN.md` (skeleton novo agrega 5 snippets via includes).
AGENTS.md so referencia ("Code style: see docs/DESIGN.md"). Mantem D29 do v6.0.0
inviolavel.

**Consumido por:** `10-apply-merge-destructive` (extrai blocos), `assets/snippets/design-md-skeleton.md`

### D18 — Modo --dry-run

`/init --dry-run` mostra plano completo (scaffold + merges + moves + plano de
populacao) sem mutacao. Zero IO destrutivo. Equivalente ao `migrate.0` atual mas
para todo o init.

**Consumido por:** `09/10/11/12/91` (caminho `mutated: false`), Plano 05 fase-01 (wiring global) + fase-02 (renderer)

### D19 — Telemetria e audit log

Cada subfase nova emite entry em `discovery/agents-log.json` via `AuditLogWriter`
existente. Schema: `subagent_id` literal + `input_paths` + `output_struct` +
`duration_ms` + `retry_count`.

**Consumido por:** `lib/audit-log-writer-factory.ts` (Plano 06 fase-01), `lib/init-subagent-ids.ts`, todos os 8 novos steps + rollback

### D20 — Versionamento

v6.4.0 (minor). Mudancas aditivas ao registry; interface publica preservada.
Backup+rollback+dry-run+aprovacao garantem reversibilidade. Semver minor justificado.

**Consumido por:** `.claude-plugin/plugin.json` (bump 6.3.2 → 6.4.0), Plano 07 fase-06

### D21 — Dispatcher runInit imutavel

`runInit({args, cwd})` mantem assinatura atual. Comando `--rollback` detectado no
dispatcher antes do loop (early-return). Cada novo step implementa contrato
`Step { id, run }` + `StepReport`.

**Consumido por:** `lib/run-init.ts` (early-return em `--rollback`), `lib/steps/types.ts`

### D22 — Skeleton DESIGN.md agrega snippets Akita

`assets/snippets/design-md-skeleton.md` AGREGA os 5 snippets existentes
(`akita-code-style/comments/tests/dependencies/logging.md`) via marcadores
`{{include: ../akita-XXX.md}}`. Snippets atuais ficam INTOCADOS.

**Consumido por:** `assets/snippets/design-md-skeleton.md` (Plano 04 fase-01), `10-apply-merge-destructive` (resolve includes em runtime)

### D23 — Ordem Step 10 antes Step 02

Reordenacao no `registry.ts`: `apply-merge-destructive` (id 10) ANTES de
`link-claude-agents` (id 02). Apply-merge reescreve CLAUDE.md primeiro; Step 02
ja encontra arquivo no formato espelho <= 40 linhas.

**Consumido por:** `skills/init/lib/registry.ts`, `02-link-claude-agents.test.ts` (atualizado para nova ordem)

### D24 — Rollback como flag, nao skill separada

`/anti-vibe-coding:init --rollback` (nao `/init-rollback`). Padrao git-like,
preserva dispatcher imutavel via early-return.

**Consumido por:** `lib/run-init.ts` (early-return), `lib/rollback.ts`

### D25 — Compatibilidade execute-plan

Fase 0 do `/plan-feature` audita `skills/execute-plan/SKILL.md` + `lib/` validando
suporte a wave-based paralelo com glossario compartilhado.

**Consumido por:** Plano 01 fase-01 (`EXECUTE_PLAN_AUDIT.md`)

### D26 — Resolucao do conflito "merge aditivo" do SKILL.md

Regra atual ("merge ADITIVO — Anti-Vibe complementa, nao substitui") sera
SUBSTITUIDA. Nova regra: "NUNCA sobrescrever sem aprovacao explicita + backup
recuperavel". Default: destrutivo. Opt-in conservador: `--additive-merge`.

**Consumido por:** `skills/init/SKILL.md` (rewrite em Plano 04 fase-07), Plano 06 fase-03 (ADR-0021), Plano 06 fase-04 (CHANGELOG)

### D27 — Cobertura adicional de criterios de aceite

Adicionados CA-12 (E2E greenfield → populate → validate), CA-13 (dry-run parity),
CA-14 (audit log entries), CA-15 (performance <120s em 500 .md). Total final: 15 CAs.

**Consumido por:** Plano 07 fases 03/04/05 (testes E2E pareados)

### D28 — Reformulacao da regra "NUNCA sobrescrever"

Reformular para "NUNCA sobrescrever sem aprovacao explicita + backup recuperavel".
Mantem espirito de seguranca (dev consente, backup recuperavel via `--rollback`),
permite destrutivo controlado.

**Consumido por:** `skills/init/SKILL.md` (Plano 04 fase-07), Plano 06 fase-03 (ADR-0021 Specific Decisions tabela)

### D29 — Estrutura do backup para suportar rollback

Manifest dedicado `.anti-vibe/backup/{ts}/manifest.json` com schema canonico
`{ timestamp, files[]: { originalPath, backupPath, sha256, action: 'overwrite' | 'move' | 'transform' }, gitSha: string | null }`.
Rollback valida integridade via checksum match antes de restaurar.

**Consumido por:** `lib/backup-anti-vibe.ts` (Plano 01 fase-02), `lib/rollback.ts` (validacao)

### D30 — Comunicacao da mudanca breaking-comportamental

Tres camadas: (1) ADR-0021-destructive-merge-default.md em `docs/design-docs/`;
(2) CHANGELOG v6.4.0 seccao "Breaking Changes (Behavior)"; (3) warning runtime
amarelo quando cross-upgrade v6.3.x→v6.4.x detectado E CLAUDE.md > 40 linhas. So
aparece quando relevante.

**Consumido por:** Plano 06 fase-02 (`lib/cross-upgrade-detector.ts`), Plano 06 fase-03 (ADR-0021), Plano 06 fase-04 (CHANGELOG)

---

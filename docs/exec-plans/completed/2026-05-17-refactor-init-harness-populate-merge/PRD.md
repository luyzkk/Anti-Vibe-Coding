---
slug: refactor-init-harness-populate-merge
date: 2026-05-18
status: approved
requires: []
target-version: v6.4.0
context-sessions: 2
context-decisions: 30
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): default destrutivo — PRD D2 + backup recuperável D9`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# PRD: Refatoracao /init — Populate Plan + Invert CLAUDE.md Merge + Adapt Existing Docs

**Status:** Approved (2 sessoes de grill-me, 30 decisoes resolvidas)
**Author:** Luiz Felipe (dev) + AI
**Date:** 2026-05-18
**Context:** ./CONTEXT.md (D1-D20 sessao 1, D21-D30 sessao 2)
**Target version:** v6.4.0 (minor — adiciona steps ao registry sem mudar dispatcher)

---

## Problema

O `/anti-vibe-coding:init` atual (v6.3.2) entrega **scaffold sem populacao**: cria 27 arquivos placeholder do harness (AGENTS.md, ARCHITECTURE.md, SECURITY.md, DESIGN.md, etc.) e termina. O agente nunca olha para o repo do dev e nunca preenche esses arquivos com o conteudo real do projeto. Resultado: dev fica com um esqueleto vazio que **nao guia a IA**, contradizendo o proposito do harness.

Adicionalmente, em repositorios que ja tem CLAUDE.md trabalhado (regras Akita/Senio, padroes de stack, env vars), o init atual eh **conservador demais**: preserva o CLAUDE.md original intacto e adiciona Anti-Vibe ao redor. Isso **viola D16 do v6.0.0** (AGENTS.md como single source of truth, CLAUDE.md como espelho ≤40 linhas) e deixa o agente lendo dois documentos divergentes.

O terceiro impacto: docs existentes do repo (README.md, CONTRIBUTING.md, ARQUITETURA.md, `/docs/*.md`) sao **ignorados pelo init**. O conhecimento institucional ja escrito pelo dev nao migra para o formato harness, e a IA continua sem contexto estruturado.

**Por que importa:** o plugin se vende como "guia para IA". Sem populacao do harness + sem merge correto + sem adaptacao de docs existentes, o init entrega um sistema que **parece instalado mas nao funciona**. O dev ainda precisa preencher manualmente cada placeholder, e o agente continua consultando o CLAUDE.md antigo em vez do harness.

---

## Solucao

### Outcomes (declarativo — o QUE)

Apos a refatoracao, ao rodar `/anti-vibe-coding:init` em qualquer um dos 4 modos (greenfield, migration, legacy v5, already-initiated), o dev observa:

- O `/init` continua entregando scaffold + migracao v5→v6 + symlink CLAUDE↔AGENTS como hoje (comportamento atual preservado nos 17 steps existentes).
- **Apos o scaffold**, o init gera automaticamente em disco um plano de execucao `docs/exec-plans/active/{date}-populate-harness/PLAN.md` com tasks para popular cada arquivo do harness. O init **nao executa** o plano — apenas o registra e sugere ao dev rodar `/anti-vibe-coding:execute-plan` quando quiser.
- Em repositorios com CLAUDE.md pre-existente: o init **propoe** um merge invertido (extrair blocos → distribuir em docs/ harness → reduzir CLAUDE.md a espelho ≤40 linhas). Antes de aplicar, mostra diff agregado e exige aprovacao explicita. Se aprovado, **substitui** o CLAUDE.md por versao espelhada. Backup automatico em `.anti-vibe/backup/{timestamp}/`.
- Em repositorios com docs estruturais existentes (`/docs/*.md`, CONTRIBUTING.md, ARQUITETURA.md, etc.): o init **classifica** cada arquivo em categoria harness (Security/Design/Frontend/Reliability/References) via heuristica + LLM e propoe mapeamento em batch. Apos aprovacao, move arquivos para os paths harness corretos, deixa stub redirect no path antigo e reescreve links internos no repo. README.md eh **intocavel** (read-only input).
- Em re-runs do `/init`: o dispatcher detecta drift via checksums no manifest e oferece **re-populacao incremental** apenas dos arquivos ainda placeholder, sem tocar nos que o dev ja editou.
- O dev pode usar `/anti-vibe-coding:init --dry-run` para ver o plano completo (scaffold + merges + moves + plano de populacao) sem qualquer mutacao em disco.
- O dev pode rodar `/anti-vibe-coding:init --rollback` para restaurar o ultimo backup em `.anti-vibe/backup/{latest}/` quando algo nao saiu como esperado.
- Cada subfase nova emite entry no audit log (`discovery/agents-log.json`) para rastreabilidade pos-mortem.

### Mecanismo (algoritmico — o COMO)

Baseado na arquitetura atual do init (dispatcher `lib/run-init.ts` consumindo registry de 17 steps), esta refatoracao **adiciona 7 novos steps** ao registry, **substitui 1 step** (link-claude-agents passa a fazer merge invertido) e **adiciona 1 comando paralelo** (`--rollback`).

Novos steps (ordem proposta no registry):

```
06 secrets-scan                — varre docs existentes por secrets/PII antes de qualquer move (D16)
07 discover-existing-docs       — Glob recursivo raiz + docs/ + .claude/ (whitelist .md/.mdx) (D5, D6)
08 classify-blocks-hybrid       — heuristica regex + LLM refina ambiguos → categoria harness (D8)
09 propose-merge-batch          — needsUser: AskUserQuestion com diff agregado (D4)
10 apply-merge-destructive      — backup .anti-vibe/backup/{ts}/ + transforma CLAUDE.md + extrai Akita para DESIGN.md (D2, D9, D17)
11 move-docs-with-stub          — move classified → stub redirect + grep+rewrite links internos (D11, D12)
12 detect-drift-incremental     — somente em re-run: checksums no manifest → re-populacao seletiva (D7)
91 generate-populate-plan       — APOS final-validation: gera PLAN.md de populacao (D1, D3, D13, D14, D15)
```

Comando paralelo:

```
/anti-vibe-coding:init --rollback
  → le .anti-vibe/backup/{latest}/manifest.json
  → restaura cada arquivo listado para seu path original
  → registra ADR de rollback em docs/design-docs/
  → atualiza .claude/.anti-vibe-manifest.json
```

Helpers novos em `lib/`:

```
lib/backup-anti-vibe.ts        — write/read backup em .anti-vibe/backup/{ts}/ + manifest
lib/secrets-scanner.ts         — regex (AKIA*, sk_live_, postgres://, emails, JWT)
lib/blocks-classifier.ts       — heuristica + delegacao a LLM via prompt template
lib/doc-mover-stub.ts          — move + escreve stub + reescreve links internos
lib/drift-detector.ts          — checksum diff vs manifest existente
lib/populate-plan-generator.ts — emite PLAN.md com tasks por arquivo + glossario compartilhado
lib/rollback.ts                — comando --rollback
```

Snippets de conteudo (apos extracao do Akita para DESIGN.md, D17):

```
assets/snippets/akita-code-style.md      — ja existe
assets/snippets/akita-comments.md        — ja existe
assets/snippets/akita-tests.md           — ja existe
assets/snippets/akita-dependencies.md    — ja existe
assets/snippets/akita-logging.md         — ja existe
assets/snippets/design-md-skeleton.md    — NOVO: estrutura de docs/DESIGN.md com slots para os 5 Akita acima
assets/snippets/populate-plan-template.md — NOVO: template do PLAN.md de populacao
assets/snippets/rollback-adr-template.md  — NOVO: template do ADR de rollback
```

Contratos preservados (nao mudam):
- `Step` (id + run async) e `StepReport` (mutated, summary, skipRemaining?, needsUser?) — todos os novos steps implementam o contrato existente.
- Dispatcher `runInit` em `lib/run-init.ts` — nao precisa mudar.
- Contract `needs-user` (D3 do PRD anterior) — usado por `propose-merge-batch` (Step 09) para coletar aprovacao em batch.

Regra atual do SKILL.md ("merge **aditivo** — Anti-Vibe complementa, nao substitui") sera **atualizada** para refletir D2: merge invertido eh comportamento default em projetos com CLAUDE.md existente; "aditivo" continua disponivel via flag `--additive-merge` (opt-in conservador).

---

## Fluxos UX por Ator

### Dev rodando `/anti-vibe-coding:init` em repo com CLAUDE.md existente (cenario principal)

1. Dev roda `/anti-vibe-coding:init` no terminal.
2. Dispatcher executa steps 1-5 (detect-legacy → reuse-discovery → migrate → scaffold-full-tree). Tudo conforme hoje.
3. Step 06 (`secrets-scan`) varre raiz + `/docs/` + `.claude/`. Encontra secrets? Marca arquivos como bloqueados.
4. Step 07 (`discover-existing-docs`) lista todos os .md elegiveis. Resumo: "Encontrei 12 arquivos: CLAUDE.md, docs/ARQUITETURA.md, docs/STRIPE_INTEGRATION.md, CONTRIBUTING.md, .claude/memory/session-notes.md, ..."
5. Step 08 (`classify-blocks-hybrid`) classifica cada arquivo em categoria harness. Heuristica resolve maioria; LLM refina os ambiguos.
6. Step 09 (`propose-merge-batch`) interrompe com `needsUser`: apresenta diff agregado:

   ```
   PROPOSTA DE TRANSFORMACAO (revise antes de aprovar)

   CLAUDE.md (existente, 287 linhas):
     [Bloco 1: instrucoes Fabio Akita] → docs/DESIGN.md (secao Code Style)
     [Bloco 2: regras de seguranca]    → docs/SECURITY.md
     [Bloco 3: padroes de teste]       → docs/DESIGN.md (secao Tests)
     [Bloco 4: env vars]               → ARCHITECTURE.md (secao Environment)
   CLAUDE.md final: indice 36 linhas espelhado de AGENTS.md
   Backup: .anti-vibe/backup/2026-05-18-1430/CLAUDE.md

   Docs existentes (4 arquivos):
     docs/ARQUITETURA.md         → docs/ARCHITECTURE.md (merge + stub redirect)
     docs/STRIPE_INTEGRATION.md  → docs/references/STRIPE_INTEGRATION.md
     CONTRIBUTING.md             → docs/references/CONTRIBUTING.md
     .claude/memory/notes.md     → docs/compound/2026-05-18-notes-import.md

   README.md: intocavel (read-only)

   Secrets detectados:
     ⚠️ docs/STRIPE_INTEGRATION.md contem 'sk_live_*' — move bloqueado ate aprovacao manual.

   Aprovar tudo? [Aprovar] [Cancelar] [Ver diff por arquivo] [Aprovar exceto secrets]
   ```

7. Dev aprova. Dispatcher reentra no Step 09 com resposta, depois prossegue.
8. Step 10 (`apply-merge-destructive`): cria backup em `.anti-vibe/backup/2026-05-18-1430/`, transforma CLAUDE.md, escreve novos blocos em docs/.
9. Step 11 (`move-docs-with-stub`): move arquivos, escreve stubs redirect, grep+rewrite links internos. Loga URLs externas nao tocaveis.
10. Steps 12-17 continuam normalmente (detect-stack → persist-knowledge → customize-architecture → install-gh → delivery-loop opt-in → capabilities-discovery → final-validation).
11. Step 91 (`generate-populate-plan`): gera `docs/exec-plans/active/2026-05-18-populate-harness/PLAN.md` com tasks paralelizaveis por arquivo do harness.
12. Mensagem final:

    > **Plugin v6.4.0 inicializado.**
    >
    > - 4 arquivos movidos, 1 bloqueado por secrets (revise `docs/STRIPE_INTEGRATION.md`).
    > - Backup em `.anti-vibe/backup/2026-05-18-1430/` — rollback via `/anti-vibe-coding:init --rollback`.
    > - Plano de populacao gerado: `docs/exec-plans/active/2026-05-18-populate-harness/PLAN.md`.
    > - Para popular o harness com analise do repo: `/anti-vibe-coding:execute-plan`.
    > - Para classificar perfil arquitetural: `/anti-vibe-coding:detect-architecture`.

### Dev rodando `/anti-vibe-coding:init --dry-run`

1. Mesmos steps de discovery (01-08) rodam read-only.
2. Step 09 NAO chama `needsUser` — apenas emite o diff agregado para o terminal.
3. Steps 10-91 emitem `summary` previsto mas `mutated: false`. Nada vai pra disco.
4. Mensagem final: "Dry-run completo. Re-rode sem `--dry-run` para aplicar."

### Dev rodando `/anti-vibe-coding:init --rollback`

1. Dispatcher detecta flag, **pula registry inteiro**, invoca `lib/rollback.ts`.
2. `rollback.ts` le `.anti-vibe/backup/{latest}/manifest.json`, valida que todos os arquivos listados existem no backup.
3. Apresenta diff "vai restaurar X arquivos para estado de YYYY-MM-DD-HHMMSS. Confirmar?" via `AskUserQuestion`.
4. Apos confirmacao: restaura cada arquivo, registra ADR `docs/design-docs/ADR-NNNN-rollback-init-{date}.md`, atualiza manifest.

### Dev em re-run `/init` (already-initiated)

1. Step 01 (`detect-legacy`) ja existe. Adicionar logica: se manifest existe e nao eh v5, modo = `already-initiated`.
2. Steps 06-11 sao **pulados** (sem CLAUDE.md/docs novos para classificar — projeto ja foi processado).
3. Step 12 (`detect-drift-incremental`) le `.claude/.anti-vibe-manifest.json`, compara checksums. Para cada arquivo: PLACEHOLDER (vazio) → entra no plano de populacao; POPULATED (mudou desde install) → nao toca; DRIFT (modificado mas placeholder ainda vazio) → avisa.
4. Step 91 gera PLAN.md so com tasks dos arquivos PLACEHOLDER.

---

## Requisitos Funcionais

### Must Have (8/22 = 36%)

- [ ] **MH-01** — Novo step `generate-populate-plan` (id 91) gera `docs/exec-plans/active/{date}-populate-harness/PLAN.md` apos `final-validation` em todos os 4 modos (D1, D3).
- [ ] **MH-02** — PLAN.md de populacao deve ter tasks paralelizaveis por arquivo de destino com prompts para subagent (D13, D14).
- [ ] **MH-03** — Novo step `apply-merge-destructive` (id 10) transforma CLAUDE.md existente em espelho ≤40 linhas, extrai blocos para docs/ harness e cria backup em `.anti-vibe/backup/{timestamp}/` (D2, D9, D17).
- [ ] **MH-04** — Novo step `propose-merge-batch` (id 09) usa contract `needsUser` para apresentar diff agregado de todas as transformacoes e exige aprovacao explicita antes de qualquer mutacao destrutiva (D4).
- [ ] **MH-05** — Novo step `move-docs-with-stub` (id 11) move arquivos classificados, escreve stub redirect no path antigo e reescreve links internos em todos os .md do repo (D12).
- [ ] **MH-06** — Flag `--dry-run` global cobre TODOS os novos steps com `mutated: false` e renderiza preview agregado sem chamar `needsUser` (D18).
- [ ] **MH-07** — Comando `/anti-vibe-coding:init --rollback` restaura ultimo backup em `.anti-vibe/backup/{latest}/` e registra ADR (D10).
- [ ] **MH-08** — README.md eh read-only — Step 11 nunca move, copia ou reescreve README (D6).

### Should Have (8/22)

- [ ] **SH-01** — Novo step `secrets-scan` (id 06) varre regex (AKIA*, sk_live_, postgres://, emails, JWT) antes de qualquer move; encontra match → bloqueia o arquivo especifico, prossegue com os outros (D16).
- [ ] **SH-02** — Novo step `discover-existing-docs` (id 07) varre raiz + `/docs/` + `.claude/` recursivamente com whitelist .md/.mdx e blacklist node_modules/dist/build (D5).
- [ ] **SH-03** — Novo step `classify-blocks-hybrid` (id 08) combina heuristica regex/keyword com refinement via LLM para blocos ambiguos (D8).
- [ ] **SH-04** — Docs orfaos sem categoria harness clara vao para `docs/references/{nome-original}.md` automaticamente (D11).
- [ ] **SH-05** — Novo step `detect-drift-incremental` (id 12) roda apenas em modo `already-initiated`, compara checksums do manifest e marca arquivos como PLACEHOLDER/POPULATED/DRIFT (D7).
- [ ] **SH-06** — PLAN.md de populacao tem como ultima task `bun run scripts/harness-validate.ts && bun run scripts/compound-check.ts`; falha trava o plano em status `awaiting-fix` (D15).
- [ ] **SH-07** — Cada subfase nova (Steps 06-12, 91 + comando rollback) emite entry no `discovery/agents-log.json` via `AuditLogWriter` existente com subagent_id padronizado (D19).
- [ ] **SH-08** — Regras Akita extensas extraidas do CLAUDE.md vao para `docs/DESIGN.md` (skeleton novo em `assets/snippets/design-md-skeleton.md`); AGENTS.md ganha linha "Code style: see docs/DESIGN.md" sem inflar (D17).

### Should Have (continuacao — promovido na sessao 2)

- [ ] **SH-09** — Flag `--additive-merge` opt-in preserva comportamento v6.3.x (merge aditivo, sem reescrever CLAUDE.md). Promovido de Could → Should na sessao 2 (D26): contraparte do destrutivo default, necessaria como escape hatch para users que ainda nao querem migrar para o novo formato.
- [ ] **SH-10** — Warning runtime no `/init` quando detecta cross-upgrade v6.3.x → v6.4.x E presenca de CLAUDE.md > 40 linhas. Mensagem amarela: "v6.4.0 mudou comportamento default. Use --additive-merge se preferir v6.3.x". So aparece quando relevante (D30).
- [ ] **SH-11** — ADR-NNNN-destructive-merge-default.md em `docs/design-docs/` documentando o racional da mudanca breaking-comportamental + CHANGELOG.md v6.4.0 secao "Breaking Changes (Behavior)" (D30).
- [ ] **SH-12** — Backup manifest dedicado `.anti-vibe/backup/{ts}/manifest.json` com schema `{ timestamp, files[], gitSha }`. Rollback valida checksums antes de restaurar (D29).

### Could Have (3 itens)

- [ ] **CH-01** — Comando `/anti-vibe-coding:init --re-populate=AGENTS.md,docs/SECURITY.md` permite re-populacao seletiva por path (alternativa granular ao drift detection). (era CH-02 no draft)
- [ ] **CH-02** — Step 10 oferece preview interativo "ver diff por arquivo" antes da aprovacao em batch (extensao do MH-04). (era CH-03 no draft)
- [ ] **CH-03** — Step 91 injeta glossario compartilhado (terminologia do projeto extraida de classify-blocks) em todos os subagent prompts para evitar divergencia terminologica (mitiga risco do D13). (era CH-04 no draft)

### Won't Have (desta versao)

- **WH-01** — Integracao com `gitleaks` ou `trufflehog` como fallback do scan regex (SH-01). Fica para v6.5+. Razao: dependencia externa nao justifica complexidade na v1.
- **WH-02** — Auto-fix de violacoes do `harness:validate` durante o plano de populacao. Falha bloqueia, dev resolve. Razao: auto-fix arrisca esconder problemas estruturais (AGENTS.md >40 linhas merece atencao humana).
- **WH-03** — Suporte a modo "dual" (manter CLAUDE.md original E criar AGENTS.md/docs novos). D2 rejeitou explicitamente. Razao: viola D16 indefinidamente.
- **WH-04** — Categoria harness custom por projeto (ex: criar `docs/integrations/`). D11 escolheu colocar tudo em `docs/references/`. Razao: fragmentacao da estrutura harness padrao prejudica portabilidade do conhecimento.
- **WH-05** — Reescrita automatica do README.md como indice publico (D6 rejeitou). Razao: README eh contrato publico do repo, fora do escopo do plugin.
- **WH-06** — Comando `/anti-vibe-coding:undo` generico. D10 escolheu rollback dedicado ao init. Razao: escopo maior nao se encaixa nesta versao.

---

## Requisitos Nao-Funcionais

- **Performance:**
  - `/init` em projeto greenfield (sem CLAUDE.md, sem docs pre-existentes) executa em <30s (sem subagents — apenas scaffold + Step 91 generate-populate-plan).
  - `/init --dry-run` em repo medio (50-100 .md) executa em <60s.
  - Plano de populacao com 5+ subagents paralelos (D13) completa em <5min para repos medios.
  - Backup nao deve duplicar arquivos cross-runs: se `.anti-vibe/backup/{latest}/` tem checksum identico ao estado atual, no-op.

- **Seguranca:**
  - Scan regex (SH-01) bloqueia move de arquivos com secrets antes de qualquer mutacao em disco. Aborta o move desse arquivo especifico (nao o init inteiro).
  - Backup `.anti-vibe/backup/{timestamp}/` herda permissoes 0700 (dev only) onde possivel (POSIX); no Windows nao aplica — registra warning em init log.
  - `--rollback` valida integridade do backup (checksum manifest) antes de restaurar — aborta se arquivo do backup foi modificado externamente.

- **Acessibilidade:**
  - N/A — operacoes CLI sem UI grafica.

- **Observabilidade:**
  - Cada novo step emite entry no audit log com schema canonico: `subagent_id` (init-secrets-scan | init-classify-blocks | init-propose-merge | init-apply-merge | init-move-docs | init-drift-detect | init-populate-plan-gen | init-rollback), `input_paths`, `output_struct`, `duration_ms`, `retry_count`.
  - Mensagens user-facing em PT-BR (alinhado com `user_profile.md`).
  - Mensagens internas (logs) em EN (consistente com codebase atual).

- **Compatibilidade Windows:**
  - Helpers usam `await import()` (DI-06 do v6.3.2), nao `bun -e` (GT-04).
  - Path joins via `path.join`, nao concatenacao de strings.

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Estrategia de inversao do CLAUDE.md | Destrutivo com backup recuperavel (D2) | Modo dual (mantem ambos durante transicao) | Modo dual viola D16 (single source of truth) indefinidamente. Backup + rollback cobrem o risco. |
| 2 | Disparo do plano de populacao | Sugestao ao final, dev decide quando rodar `/execute-plan` (D3) | Inline (init invoca plan-feature + execute-plan automaticamente) | Inline viola `feedback_suggest_dont_execute.md` (IA sugere, dev decide). Plano em disco fica revisavel antes da execucao. |
| 3 | Classificacao de blocos em categorias harness | Hibrido: heuristica regex + LLM refina ambiguos + dev aprova batch (D8) | 100% heuristica (perde nuance) ou 100% LLM (custo, nao-deterministico) | Heuristica cobre 70% dos casos com sinais claros; LLM resolve 25% ambiguos; 5% dev classifica manual via "Ver diff por arquivo". |
| 4 | Granularidade de confirmacao | Batch agregado com diff consolidado (D4) | File-by-file (15+ prompts) ou tiered (logica condicional complexa) | Diff agregado em uma tela com link para detalhe por arquivo. Cancelar e re-rodar com ajustes mais rapido que aprovar individualmente. |
| 5 | Localizacao do backup | `.anti-vibe/backup/{YYYY-MM-DD-HHMMSS}/` (D9) | `.claude/archive/` (mistura com Passo 2.5 atual) ou inline `.backup` ao lado do original | Pasta dedicada fora do `.claude/` (dominio Claude Code). Multiplos backups por timestamp, gitignore automatico, espelha estrutura original. |
| 6 | Rollback | Comando `/anti-vibe-coding:init --rollback` (D10) | Doc estatica com instrucoes manuais ou skill generica `/undo` | Comando dedicado le ultimo backup, restaura, registra ADR. Reversibilidade clara sem depender de dev lembrar comandos git. |
| 7 | Execucao do plano de populacao | Subagents paralelos por arquivo de destino via `/execute-plan` wave-based (D13) | Serial ou hibrido (analise paralela + escrita serial) | Isolamento de contexto evita decay. Custo de tokens compensa velocidade. Mitigacao da divergencia terminologica via CH-04 (glossario compartilhado). |
| 8 | Limite ≤40 linhas do AGENTS.md vs regras Akita extensas | Extrair regras Akita para `docs/DESIGN.md`; AGENTS.md so referencia (D17) | Relaxar limite para ≤80 linhas (viola D29 do v6.0.0) ou decidir caso a caso | D29 do v6.0.0 (AGENTS.md como indice condicional) eh inviolavel. Indireção via DESIGN.md preserva contrato e permite carregar regras sob demanda. |
| 9 | Drift detection em re-runs | Incremental via checksums no manifest (D7) | Full re-run destrutivo ou idempotent strict (no-op) | Granular: PLACEHOLDER → repopula, POPULATED → nao toca, DRIFT → avisa. Respeita edits manuais sem perder o que ja foi feito. |
| 10 | Links externos apos move | Stub redirect no path antigo + grep+rewrite de links internos (D12) | So stub (mantem fragilidade interna) ou so rewrite (quebra links externos) | Tres camadas: stub atende links externos (GitHub issues), rewrite atende links internos, warning lista URLs externas nao tocaveis. |
| 11 | Versao do plugin | v6.4.0 (minor) (D20) | v7.0.0 (major breaking) ou v6.4.0-rc.1 (release candidate) | Mudancas aditivas ao /init; interface publica preservada. Backup + rollback + dry-run + aprovacao garantem reversibilidade. Semver minor justificado. |

---

## Criterios de Aceite

- [ ] **CA-01**: Dado um repo greenfield (sem CLAUDE.md, sem docs/), quando dev roda `/anti-vibe-coding:init`, entao apos 30s existe `docs/exec-plans/active/{date}-populate-harness/PLAN.md` com no minimo 1 task por arquivo do harness, e a mensagem final sugere `/execute-plan` sem invoca-lo. (MH-01, MH-02)
- [ ] **CA-02**: Dado um repo com CLAUDE.md de 287 linhas contendo regras Akita, quando dev roda `/anti-vibe-coding:init` e aprova o diff agregado, entao CLAUDE.md final tem ≤40 linhas, `docs/DESIGN.md` contem as 5 secoes Akita extraidas, e backup do CLAUDE.md original existe em `.anti-vibe/backup/{timestamp}/CLAUDE.md`. (MH-03, MH-04, SH-08)
- [ ] **CA-03**: Dado um repo com `docs/ARQUITETURA.md`, quando init aprova o move para `docs/ARCHITECTURE.md`, entao `docs/ARQUITETURA.md` existe como stub com conteudo `# Moved to: docs/ARCHITECTURE.md` e todos os outros .md do repo que linkavam `docs/ARQUITETURA.md` foram reescritos para `docs/ARCHITECTURE.md`. (MH-05)
- [ ] **CA-04**: Dado que init detectou `sk_live_*` em `docs/STRIPE_INTEGRATION.md`, quando init prossegue, entao o move desse arquivo eh bloqueado e mensagem final lista "1 arquivo bloqueado por secrets — revise manualmente"; outros arquivos sao movidos normalmente. (SH-01)
- [ ] **CA-05**: Dado um repo onde init ja rodou e `docs/SECURITY.md` continua sendo o placeholder original (checksum identico ao manifest), quando dev roda `/anti-vibe-coding:init` novamente, entao Step 12 reporta `SECURITY.md: PLACEHOLDER` e o novo PLAN.md inclui task para popula-lo; arquivos POPULATED nao aparecem no PLAN. (SH-05)
- [ ] **CA-06**: Dado que init aplicou merge destrutivo do CLAUDE.md, quando dev roda `/anti-vibe-coding:init --rollback`, entao apos confirmacao o CLAUDE.md original eh restaurado byte-a-byte (checksum match) e um ADR `docs/design-docs/ADR-NNNN-rollback-init-{date}.md` foi criado. (MH-07)
- [ ] **CA-07**: Dado um repo com CLAUDE.md existente, quando dev roda `/anti-vibe-coding:init --dry-run`, entao nenhum arquivo eh criado/modificado em disco (verificavel por git status apos), o terminal mostra o diff agregado completo, e exit code eh 0. (MH-06)
- [ ] **CA-08** (edge): Dado um repo onde README.md contem regras de stack relevantes, quando init roda, entao README.md fica byte-identico ao original (checksum) e nada novo eh escrito sobre ele; informacoes uteis sao apenas LIDAS para popular ARCHITECTURE.md no plano de populacao. (MH-08)
- [ ] **CA-09** (edge): Dado um plano de populacao executado, quando a ultima task roda `bun run scripts/harness-validate.ts`, se AGENTS.md tem >40 linhas o plano fica em status `awaiting-fix` com mensagem indicando qual regra foi violada; outros arquivos populados nao sao revertidos. (SH-06)
- [ ] **CA-10** (edge): Dado que init detecta backup `.anti-vibe/backup/{latest}/` cujo manifest foi modificado externamente (checksum invalido), quando dev roda `--rollback`, entao rollback aborta com mensagem clara "Backup integrity check failed" e nao toca em arquivos do projeto.
- [ ] **CA-11**: Dado que registry.ts foi atualizado para os 7 novos steps na ordem 06-12 + 91, quando `bun test skills/init/lib/registry.test.ts` roda, entao todos os steps tem id unico, ordem documentada na tabela do SKILL.md bate com a do registry, e `runInit` consegue executar registry em ordem sem AbortError em modo greenfield.
- [ ] **CA-12** (E2E): Dado um fixture greenfield em `tests/fixtures/greenfield-v6.4/`, quando dev roda `/anti-vibe-coding:init` + `/anti-vibe-coding:execute-plan` consumindo o PLAN.md de populacao gerado + `bun run scripts/harness-validate.ts`, entao todos os 3 passos retornam exit 0 e `docs/AGENTS.md` final tem ≤40 linhas com conteudo populado (nao placeholder). (D27)
- [ ] **CA-13** (dry-run parity): Dado um fixture com CLAUDE.md de 287 linhas e 4 docs estruturais, quando init roda em `--dry-run` mode E depois em modo real (com rollback intermediario), entao a lista de arquivos previstos no dry-run (output do Step 09) bate byte-a-byte com a lista realmente modificada (consultada via manifest de backup). Detecta divergencia entre simulacao e execucao. (D27)
- [ ] **CA-14** (audit log): Dado init completo com merge destrutivo, quando inspeciona `discovery/agents-log.json` apos execucao, entao existem entries com subagent_id na ordem: `init-secrets-scan` → `init-discover-existing-docs` → `init-classify-blocks` → `init-propose-merge` → `init-apply-merge` → `init-move-docs` → `init-populate-plan-gen`. Cada entry tem `input_paths`, `output_struct`, `duration_ms`. (D27)
- [ ] **CA-15** (performance): Dado um repo com 500 arquivos .md distribuidos em raiz + /docs/ + .claude/, quando dev roda `/anti-vibe-coding:init --dry-run`, entao total elapsed time eh < 120s (medido via `performance.now()` no dispatcher). Detecta regressao no Step 07 (discover-existing-docs) recursivo. (D27)

---

## Out of Scope

- Reescrita do README.md (ver WH-05). README continua read-only input.
- Integracao com `gitleaks`/`trufflehog` (ver WH-01). Fica para v6.5+.
- Auto-fix de violacoes `harness:validate` (ver WH-02). Falha bloqueia, dev resolve.
- Modo "dual" mantendo CLAUDE.md original + AGENTS.md (ver WH-03). Viola D16.
- Categoria harness custom por projeto (ver WH-04). Tudo em `docs/references/`.
- Comando `/anti-vibe-coding:undo` generico (ver WH-06). Fica para v7.x se houver demanda.
- Migracao automatica de docs em outras linguagens (ex: traducao de PT-BR → EN durante move). Apenas move + stub + rewrite de links.

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Helper existente | `lib/run-init.ts` (dispatcher) | disponivel |
| Helper existente | `lib/registry.ts` (registro de steps) | disponivel — adicionar 7 entries novas + 1 entry no manifest paralelo `--rollback` |
| Helper existente | `lib/audit-log.ts` (AuditLogWriter) | disponivel |
| Helper existente | `lib/idempotency.ts` | disponivel — pode ser estendido para drift detection (Step 12) |
| Helper existente | `lib/symlink-fallback.ts` (Step 02 link-claude-agents) | disponivel — comportamento muda em projetos com CLAUDE.md existente: passa a integrar com Step 10 apply-merge |
| Helper existente | `scripts/harness-validate.ts` + `scripts/compound-check.ts` | disponivel — chamados pela ultima task do PLAN.md de populacao |
| Helper NOVO | `lib/backup-anti-vibe.ts` | a criar |
| Helper NOVO | `lib/secrets-scanner.ts` | a criar |
| Helper NOVO | `lib/blocks-classifier.ts` | a criar — depende de prompt template para LLM refinement |
| Helper NOVO | `lib/doc-mover-stub.ts` | a criar |
| Helper NOVO | `lib/drift-detector.ts` | a criar |
| Helper NOVO | `lib/populate-plan-generator.ts` | a criar |
| Helper NOVO | `lib/rollback.ts` | a criar |
| Snippet NOVO | `assets/snippets/design-md-skeleton.md` | a criar |
| Snippet NOVO | `assets/snippets/populate-plan-template.md` | a criar |
| Snippet NOVO | `assets/snippets/rollback-adr-template.md` | a criar |
| Skill externa | `/anti-vibe-coding:execute-plan` | disponivel — sera invocada pelo dev apos init (D3) |
| Doc externo | `docs/design-docs/init-rationale.md` | atualizar com novas decisoes D1-D20 deste PRD |
| Lib externa | Nenhuma nova — tudo via Node.js builtin (`fs/promises`, `crypto`, `path`) |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Classificacao hibrida (D8) categoriza um bloco critico errado | Media | Medio | Dev aprova em batch (D4) com diff visual; rollback (D10); CH-03 "Ver diff por arquivo" antes de batch approval. |
| Plano de populacao gera AGENTS.md >40 linhas | Media | Alto | SH-06 valida automatico no fim; SH-08 extrai Akita para DESIGN.md; SH-07 audit log permite debug. |
| Backup `.anti-vibe/backup/` cresce indefinidamente | Alta | Baixo | Documentar limpeza manual no README do init; backlog para `--prune-backups` em v6.5+. |
| Stub redirect (D12) duplica arquivos no git history | Alta | Baixo | Aceitavel — historico fica claro, dev pode `git rm` o stub depois. Documentar no resumo final. |
| Scan regex (SH-01) gera falso positivo em strings legitimas (ex: 'sk_live_' aparece em fixture de teste) | Media | Baixo | Bloqueia apenas move desse arquivo (nao init inteiro); dev aprova override por arquivo via "Aprovar exceto secrets". |
| `--dry-run` (MH-06) divergir do comportamento real | Baixa | Alto | Testes E2E comparando dry-run output vs real output em fixtures; gate de CI. |
| Subagents paralelos (D13) produzem docs com terminologia divergente | Media | Medio | CH-04: glossario compartilhado injetado no prompt de cada subagent. Pode ser deferido se complexidade aumentar. |
| Re-run incremental (D7) deixa projeto em estado misto (drift parcial) | Baixa | Medio | Manifest registra timestamp por arquivo; warnings claros para DRIFT; rollback (D10) restaura snapshot completo. |
| Quebra do contrato `Step` ao adicionar `needsUser` nos novos steps | Baixa | Alto | Contrato ja suporta `needsUser` (introduzido no PRD anterior, ver `steps/types.ts`); cada novo step tem teste pareado. |
| Regra atual "merge aditivo" do SKILL.md eh removida sem aviso para usuarios existentes | Baixa | Medio | CH-01 flag `--additive-merge` opt-in conservador; CHANGELOG v6.4.0 destaca mudanca; release notes em ADR. |

---

## Notas de Implementacao (resolvidas na sessao 2 do grill-me)

**Dispatcher imutavel (D21):** `runInit({args, cwd})` mantem assinatura atual. Cada novo step implementa `Step { id, run }` + `StepReport`. Comando `--rollback` (D24) eh detectado no dispatcher antes do loop do registry (early-return), invocando `lib/rollback.ts` sem mudar assinatura.

**Skeleton Akita (D22):** Novo `assets/snippets/design-md-skeleton.md` AGREGA os 5 snippets Akita existentes (`akita-code-style.md`, `akita-comments.md`, `akita-tests.md`, `akita-dependencies.md`, `akita-logging.md`) via includes. Snippets atuais ficam intocados — continuam servindo o caminho "sem CLAUDE.md existente" do init original. Step 10 escolhe o snippet correspondente como base e mescla customizacoes do projeto.

**Ordem Step 10 → Step 02 (D23):** Reordenacao no `registry.ts`: `apply-merge-destructive` (id 10) vai ANTES de `link-claude-agents` (id 02 reposicionado). Apply-merge reescreve CLAUDE.md primeiro; Step 02 ja encontra arquivo no formato espelho ≤40 linhas. Symlink/hardlink/copy 3-tier criado sobre arquivo correto, sem recriacao.

**Rollback como flag (D24):** `/anti-vibe-coding:init --rollback` (nao skill separada). Padrao git-like, mantem dispatcher imutavel via early-return.

**Compatibilidade execute-plan (D25):** Fase 0 do `/plan-feature` (proximo passo do pipeline) inclui sub-task: ler `skills/execute-plan/SKILL.md` + `lib/`, validar suporte a wave-based paralelo com glossario compartilhado. Se sim, segue. Se nao, abre PRD paralelo de extensao do execute-plan. Reduz risco de assumir capacidade inexistente.

**Resolucao do conflito "merge aditivo" (D26, D28):**
- Regra atual do SKILL.md ("merge ADITIVO — Anti-Vibe complementa, nao substitui") sera SUBSTITUIDA.
- Nova regra: "NUNCA sobrescrever **sem aprovacao explicita** + backup recuperavel". Aprovacao via Step 09 (propose-merge-batch), backup via Step 10 (apply-merge-destructive).
- Default: destrutivo. Opt-in conservador: `--additive-merge` (CH-01) preserva comportamento v6.3.x.
- Comunicacao da mudanca (D30): ADR-NNNN-destructive-merge-default.md + CHANGELOG v6.4.0 "Breaking Changes (Behavior)" + warning runtime quando init detecta cross-upgrade v6.3.x → v6.4.x E presenca de CLAUDE.md > 40 linhas. Warning so aparece quando relevante.

**Backup manifest dedicado (D29):** `.anti-vibe/backup/{ts}/manifest.json` com schema canonico:
```json
{
  "timestamp": "2026-05-18T14:30:00Z",
  "files": [
    { "originalPath": "CLAUDE.md", "backupPath": "CLAUDE.md", "sha256": "...", "action": "transform" },
    { "originalPath": "docs/ARQUITETURA.md", "backupPath": "docs/ARQUITETURA.md", "sha256": "...", "action": "move" }
  ],
  "gitSha": "abc123" | null
}
```
Rollback (D24) valida integridade via checksum match antes de restaurar; aborta se manifest corrompido (CA-10).

---

## Distribuicao MoSCoW

- **Must Have:** 8 / 25 = **32%** ✅ (dentro do limite de 40%)
- **Should Have:** 12 / 25 = 48% (SH-09 a SH-12 promovidos na sessao 2 de grill-me)
- **Could Have:** 3 / 25 = 12%
- **Won't Have:** 6 itens excluidos explicitamente desta versao
- **Criterios de Aceite:** 15 (CA-01 a CA-15, sendo CA-12 a CA-15 adicionados na sessao 2 — D27)

Validacao do teste do Must Have: cada MH-01..08 testado com "Se mover para Should, a feature ainda resolve o problema core?"
- MH-01/02 (plano de populacao): NAO — sem isso o init continua entregando esqueleto vazio. Must.
- MH-03 (apply-merge-destructive): NAO — sem isso CLAUDE.md continua violando D16. Must.
- MH-04 (propose-merge-batch): NAO — sem isso destrutivo seria inaceitavel. Must.
- MH-05 (move-docs-with-stub): NAO — sem isso docs estruturais ficam orfaos. Must.
- MH-06 (--dry-run): SIM, MAS — dry-run eh proteção mandatoria contra mudanca destrutiva. Must.
- MH-07 (--rollback): SIM, MAS — rollback eh contraparte do destrutivo. Must.
- MH-08 (README intocavel): NAO — sem isso plugin quebraria contrato publico do repo. Must.

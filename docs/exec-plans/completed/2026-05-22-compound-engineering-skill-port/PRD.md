---
slug: compound-engineering-skill-port
date: 2026-05-22
status: completed
completedAt: 2026-05-24
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Comentários inline devem ter linhagem: quem decidiu, quando, por que (link para PRD/CONTEXT).
-->

# PRD: Compound Engineering Skill Port (Opção C — Híbrida)

**Status:** Draft
**Author:** Luiz Felipe + AI
**Date:** 2026-05-22
**Context:** ./CONTEXT.md

---

<!-- Guia MoSCoW:
  Must Have: Sem isso a feature nao tem valor. Maximo 40% dos requisitos.
  Should Have: Importante mas nao bloqueia a primeira entrega.
  Could Have: Nice-to-have. Apenas se sobrar tempo.
  Won't Have: Explicitamente excluido DESTA versao. Evita scope creep.
-->

## Problema

Há três problemas convergentes no plugin Anti-Vibe-Coding:

1. **Bug de schema mismatch (bloqueante)**: `skills/init/assets/templates/docs/compound/README.md.tpl` documenta frontmatter `date / author / decision`, mas `scripts/compound-check.ts` valida `title / category / tags / created`. Todo projeto inicializado por `init` gera notas que **falham** no validator do próprio scaffold. Carreirarte v3 (projeto real) já está nesse estado.

2. **Ownership confuso de templates compound**: 10 templates compound vivem em `skills/init/assets/templates/` apesar de pertencerem semanticamente à abstração "compound engineering". Init é dono de scaffold genérico; compound é uma disciplina específica com regras próprias (decision gate, install/check, migrate brownfield).

3. **Falta de ritual de captura pós-feature**: A skill `lessons-learned` cobre CRUD de notas (add/review/prune), mas não há **gate** invocável após uma feature ser entregue ("o que isso ensinou ao repo?"). André Prado tem essa skill validada em produção — paridade explícita ("copy-then-improve") está pedida pelo dev.

**Impacto se não resolver:**
- Projetos inicializados por `init` continuam gerando notas inválidas (bug latente).
- Ritual de compound capture continua dependendo de memória/disciplina do dev — perdido em ~80% das features.
- Dívida de ownership cresce com cada feature compound nova.

---

## Solucao

### Outcomes (declarativo — o QUE)

- Dev consegue invocar `/anti-vibe-coding:compound-engineering gate` ao fim de uma feature e o sistema delega captura ao `lessons-learned add` quando aplicável.
- Dev consegue invocar `/anti-vibe-coding:compound-engineering install` em qualquer projeto (greenfield novo, brownfield existente, ou dogfood deste próprio repo) com semântica skip-by-default + `--force` opt-in (literal do André).
- Projetos inicializados por `init` em greenfield geram `compound/README.md` com schema correto (`title/category/tags/created`) — bug fechado.
- Templates compound moram em `skills/compound-engineering/assets/` com linhagem git preservada (`git mv`); init consome via função pura `getCompoundManifest()`.
- `compound:check` mantém comportamento atual; `compound:check --strict` ativa 3 regras novas do André (AGENTS link, plan-generator sections, active-plan hygiene). Backward compat preservado.
- Projetos brownfield com schema antigo recebem migração não-destrutiva: README fix + relatório auditável de notas inconsistentes (sem reescrita silenciosa).
- AGENTS.md e `scripts/new-plan.ts.tpl` recebem patches idempotentes (P1, P2) para integração com o Harness.
- Cross-skill invocation entre `compound-engineering` e `lessons-learned` ocorre via Skill tool nativa — boundary preservada.

### Mecanismo (algorítmico — o COMO)

Baseado em **Opção C (Híbrida)** do CONTEXT.md (D1).

**Arquitetura:**

```
skills/
├── init/                                  # Bainit (mantém ownership de scaffold genérico)
│   ├── assets/templates/docs/             # SEM os 10 templates compound (movidos)
│   └── lib/
│       ├── compound-writer.ts             # FICA (Migration Mode subagent)
│       ├── compound-imported-*.ts         # FICA (importer legacy)
│       └── prompts/compound.md            # FICA (prompt Migration Mode)
│
└── compound-engineering/                  # NOVA skill (Opção C)
    ├── SKILL.md                           # user-invocable, 4 subcomandos
    ├── assets/                            # 10 templates compound (git mv de init)
    │   ├── docs/COMPOUND_ENGINEERING.md.tpl
    │   ├── docs/compound/README.md.tpl    # schema corrigido
    │   ├── docs/review-checklists/*.tpl   # 5 + README
    │   ├── docs/smoke-flows/README.md.tpl
    │   └── scripts/compound-check.ts.tpl  # com P3 inlinado
    ├── lib/
    │   ├── manifest.ts                    # getCompoundManifest()
    │   ├── compound-files-collector.ts    # git mv de init/lib (D19)
    │   ├── compound-frontmatter.ts        # git mv de init/lib (D19)
    │   ├── installer.ts                   # skip-by-default + --force
    │   ├── patch-agents.ts                # P1 idempotente
    │   ├── patch-new-plan.ts              # P2 idempotente
    │   ├── gate.ts                        # ritual + delega lessons-learned
    │   └── migrate.ts                     # README fix + relatório
    └── references/
        └── capture-guide.md               # knowledge interno (D13)
```

**Fluxos principais:**

1. **Init em greenfield (inalterado conceitualmente):** Step de scaffold do init importa `getCompoundManifest()` da skill compound-engineering, recebe array `{src, dst}`, copia direto. NÃO invoca subskill (D25).

2. **`compound-engineering install` (brownfield/refresh):** Lê manifest, para cada destino: se existe → skip e adiciona a "Skipped existing files"; senão → copia. Aplica patches P1 (AGENTS.md), P2 (new-plan.tpl), P3 (já inlinado no check.tpl). Flag `--force` sobrescreve. Compound notes (`docs/compound/*.md`) NUNCA são alvo.

3. **`compound-engineering check [--strict]`:** Invoca `scripts/compound-check.ts` do target. Modo default valida frontmatter + sections. Modo `--strict` ativa: (a) link AGENTS, (b) sections de new-plan, (c) hygiene de plano ativo.

4. **`compound-engineering gate`:** Detecta plano ativo único em `docs/exec-plans/active/`. Faz 3 perguntas (bug/review/production). Se sim, invoca via Skill tool `anti-vibe-coding:lessons-learned add "<title>"`. Atualiza `## Lessons Captured` do plano com link ou "no compound capture needed because X".

5. **`compound-engineering migrate`:** Detecta presença de `date/author/decision` em `docs/compound/README.md`. Se sim, reescreve README com schema canônico (não-destrutivo: troca só o bloco de exemplo). Escaneia `*.md`, gera `migration-report.md` listando notas com frontmatter inconsistente. Nunca reescreve notas.

**Stack atual detectada:** Bun + TypeScript; skills com SKILL.md (YAML frontmatter); libs em `skills/{skill}/lib/`; tests `.test.ts` colocated; templates em `assets/templates/`. Tudo alinhado com padrões existentes.

---

## Fluxos UX por Ator

### Dev (mantenedor de projeto)

**Cenário A — projeto novo (greenfield):**

1. Dev roda `/anti-vibe-coding:init` em projeto vazio.
2. Init scaffolds estrutura — incluindo 10 templates compound copiados via `getCompoundManifest()` (transparente).
3. Dev abre `docs/compound/README.md` — schema canônico correto desde o dia 1.

**Cenário B — projeto existente sem compound (brownfield):**

1. Dev roda `/anti-vibe-coding:compound-engineering install`.
2. Console: `Created: docs/COMPOUND_ENGINEERING.md, docs/compound/README.md, ...`
3. Patches aplicados: `Patched AGENTS.md (added compound link)`, `Patched scripts/new-plan.ts.tpl (4 sections)`.

**Cenário C — projeto com compound antigo (schema buggy):**

1. Dev roda `/anti-vibe-coding:compound-engineering install`.
2. Console: `Skipped existing files: docs/COMPOUND_ENGINEERING.md, docs/compound/README.md (use --force to overwrite)`.
3. Dev percebe schema antigo e roda `/anti-vibe-coding:compound-engineering migrate`.
4. Console: `Fixed schema in docs/compound/README.md. Inconsistencies report saved to docs/compound/migration-report.md (3 notes need manual review).`
5. Dev revisa report, edita notas manualmente, opcionalmente roda `compound-engineering install --force` para sincronizar templates.

**Cenário D — fim de feature (decision gate):**

1. Dev terminou feature, plano ativo em `docs/exec-plans/active/2026-05-22-X/`.
2. Roda `/anti-vibe-coding:compound-engineering gate`.
3. Skill pergunta sequencialmente:
   - _"Algum bug aprendido aqui que outro dev/agente futuro poderia ter evitado se soubesse?"_
   - _"Algum review/checklist falhou de forma que indica padrão repetível?"_
   - _"Algum issue de produção/operacional revelado durante esta feature?"_
4. Se sim em qualquer: skill invoca `Skill({ skill: 'anti-vibe-coding:lessons-learned', args: 'add "<título>"' })` — `lessons-learned` aplica filtro senior + escreve nota.
5. Skill atualiza `## Lessons Captured` do plano com link pra nota nova.
6. Se não em todas: skill atualiza `## Lessons Captured` com `no compound capture needed because: <razão dada>`.

**Copy relevante:**
- Skipped: _"Skipped existing files (use --force to overwrite): {lista}"_
- Force overwrite: _"Overwritten: {lista}"_
- Patch ausente: _"Patched AGENTS.md: added link to docs/COMPOUND_ENGINEERING.md under '## Read Before Major Changes'"_
- Patch já presente: _"AGENTS.md already has compound link — no patch needed"_
- Gate skip: _"Logged 'no compound capture needed' in plan's Lessons Captured section"_
- Gate captura: _"Lesson captured: {path}. Linked in plan's Lessons Captured section."_

---

## Requisitos Funcionais

### Must Have (40% dos requisitos — bloqueia entrega da v1)

- [ ] **MH-01 (RF-03)**: Schema de `compound/README.md.tpl` corrigido para `title/category/tags/created`. Fonte única alinhada com validator. _[Fechamento do bug crítico]_
- [ ] **MH-02 (RF-01)**: Skill `compound-engineering` user-invocable existe com subcomandos `install`, `check`, `gate`, `migrate` parseáveis (D22).
- [ ] **MH-03 (RF-02)**: 10 templates compound movidos via `git mv` de `skills/init/assets/templates/` para `skills/compound-engineering/assets/`. Conteúdo substituído pela versão literal do André + fix de schema + P3 inlinado.
- [ ] **MH-04 (RF-08)**: Função pura `getCompoundManifest(): Array<{src: string, dst: string}>` exportada por `skills/compound-engineering/lib/manifest.ts`. `src` absoluto via `import.meta.dir`; `dst` relativo ao target root (D21).
- [ ] **MH-05 (RF-04)**: `compound-engineering install` implementado com skip-by-default + `--force` opt-in (D17-A literal André). Compound notes (`docs/compound/*.md`) nunca são alvo.
- [ ] **MH-06 (RF-06)**: `compound-engineering gate` implementado: detecta plano ativo, 3 perguntas, delega `lessons-learned add` via Skill tool (D20), atualiza `## Lessons Captured`.

### Should Have (importante, mas v1 entrega sem)

- [ ] **SH-01 (RF-05)**: `compound-engineering check` com flag `--strict` ativa 3 regras novas (AGENTS link, plan-generator sections, active-plan hygiene). `compound:check` sem flag mantém comportamento atual (RNF-01).
- [ ] **SH-02 (RF-09)**: Libs `compound-files-collector.ts` e `compound-frontmatter.ts` movidas via `git mv` de `skills/init/lib/` para `skills/compound-engineering/lib/`. Init Migration Mode importa cross-skill (D19, R8).
- [ ] **SH-03 (P1 — D8)**: Patch idempotente em `AGENTS.md` adicionando link para `docs/COMPOUND_ENGINEERING.md` sob `## Read Before Major Changes`. Detecção via regex multi-padrão (D23).
- [ ] **SH-04 (P2 — D8)**: Patch idempotente em `scripts/new-plan.ts.tpl` injetando 4 seções (`## Compound Opportunity | ## Review Checklist | ## Validation Log | ## Lessons Captured`) antes de `## Exit Criteria`.
- [ ] **SH-05 (RF-07)**: `compound-engineering migrate` implementado: detecta schema antigo em README, reescreve não-destrutivamente, gera relatório de notas inconsistentes sem reescrevê-las.
- [ ] **SH-06 (RNF-05)**: Goldens de E2E do init regenerados refletindo nova origem dos templates. Diff visível no PR (D16).
- [ ] **SH-07**: Completion signal YAML machine-readable no output do `gate` (padrão D33 lessons-learned). Permite orquestradores encadearem `gate` na pipeline detectando `status: complete`. Reusa `renderCompletionSignal()` existente — custo ~5 linhas.

### Could Have (nice-to-have, v1.x)

- [ ] **CH-01**: Comando `compound-engineering fix-category` opcional para sugerir migração de categorias livres para enum recomendado (sem forçar). _Não bloqueia v1._
- [ ] **CH-02**: Flag `--dry-run` em `install` e `migrate` para preview sem mudanças.

### Won't Have (desta versão)

- **WH-01**: Enum fechado para `category` no frontmatter — `category` permanece string livre (D9-C). Quebrar 30+ notas existentes não vale o ganho.
- **WH-02**: Hash-match sweep para auto-upgrade seletivo de templates — descartado (D17-A revisado). Auditabilidade > magia.
- **WH-03**: Reescrita automática de notas compound brownfield com schema antigo (mantém apenas relatório — RNF-04). Mapping `decision → title` sem contexto humano corrompe intenção.
- **WH-04**: Migração de outros templates do init (`SECURITY.md.tpl`, `RELIABILITY.md.tpl`, etc.) — fora do escopo (D18, RT-05).
- **WH-05**: Refactor de `lessons-learned` — fica intacta (RT-02).
- **WH-06**: Versionamento de skill com manifest checksum / update strategy — adiado pra release major.
- **WH-07**: Cross-skill imports via pacotes npm separados — adiado (path relativo cobre v1).

---

## Requisitos Nao-Funcionais

- **Performance:** `compound:check` validando 100 notas em <2s (G1 do plano atual). `getCompoundManifest()` é função pura — <1ms.
- **Seguranca:** Sem novos vetores. Skill não executa código user-supplied; só lê/copia/edita arquivos do plugin e do target. Patches em AGENTS.md/new-plan usam regex restritos (D23).
- **Acessibilidade:** N/A (skill CLI, sem UI).
- **Observabilidade:** Telemetria passiva já existente nas skills (writeTelemetryStart/End). `gate` emite completion signal opcional (CH-03).
- **Idempotência (RNF-02):** `install` re-runnable sem efeitos colaterais. Patches AGENTS.md/new-plan detectam estado e skipam se já presentes. `migrate` re-runnable: re-gera relatório atualizado, mas README não é reescrito se já está com schema correto.
- **Stack-agnostic (RNF-03):** Skill funciona em projetos Python/Go/Ruby sem `package.json` (D11). Bun é runtime do `compound-check.ts` standalone — não exige npm.
- **Estabilidade backward (RNF-01):** `compound:check` sem flag mantém comportamento atual. Projetos CI atuais não quebram.
- **Migração não-destrutiva (RNF-04):** `migrate` jamais reescreve notas existentes.
- **Test coverage (RNF-05):** ≥80% nas novas libs; golden E2E do init regenerado na mesma fase do `git mv` (D16).

---

## Decisoes Tecnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Localização dos templates | `skills/compound-engineering/assets/` (D2-B) | Manter em `skills/init/assets/` ou em `_shared/templates/` | Ownership explícito; espelha André; init vira consumidor via manifest. |
| 2 | Schema canônico | `title/category/tags/created` literal André (D3-D) | Esquema atual (date/author/decision) ou híbrido | `copy-then-improve`; extensões futuras (`updated`) só com demanda. |
| 3 | Invocação do gate | Subcomando `compound-engineering gate` (D4-A) | Skill separada ou hook automático | Consistência com `lessons-learned add|review|prune`; hook automático violaria `feedback_suggest_dont_execute`. |
| 4 | Boundary com lessons-learned | Gate delega via Skill tool (D5-A + D20-A) | Duplicar lógica, fundir skills, deprecar lessons-learned | Reuso > duplicação; mantém boundary; Skill tool é interface oficial; stack-agnostic. |
| 5 | Brownfield install policy | Skip-by-default + `--force` (D17-A literal André) | Hash-match sweep ou auto-upgrade seletivo | Auditável; dev sempre consciente; magia contradiz `copy-then-improve`. |
| 6 | `getCompoundManifest()` signature | `src` absoluto + `dst` relativo (D21-A) | Ambos relativos ou ambos absolutos | Separa concerns; `import.meta.dir` resolve em runtime independente de cwd. |
| 7 | Compatibilidade backward do check | Flag `--strict` opt-in (D12-A) | Quebrar direto ou config opt-in | Estabilidade; CI atual não quebra na release. |
| 8 | Compound notes no install | Nunca alvo do installer (D17-A + RF-11) | Incluir notas no install | Notas são conteúdo do dev; installer só toca templates de scaffold. |
| 9 | Split de libs compound-*.ts | Schema/abstração move; Migration Mode fica (D19-B) | Mover tudo ou manter tudo | Schema canônico pertence à skill compound; Migration Mode tem categorias próprias do flow v5→v6. |
| 10 | Linhagem dos arquivos | `git mv` (D15-A) | Deletar + recriar | Preserva blame; commit único registra move + content change. |
| 11 | Outros docs do init | Fora do escopo (D18-A + RT-05) | Migrar todos ou PRD separado | "Não Super-Engenheirar"; SECURITY/RELIABILITY não são templates compound. |
| 12 | Init invoca install? | Não — init usa manifest direto (D25-A) | Init invoca subskill install em greenfield | Boundary clara: init = scaffold direto; skill install = brownfield/refresh. |
| 13 | argument-hint format | `install\|check\|gate\|migrate [--strict] [--force]` (D22-A) | commander/yargs ou modo padrão sem args | Espelha lessons-learned; familiar; sem deps. |
| 14 | Dogfooding deste repo | Tratamento normal (D24-A) | Exclude blocklist ou auto-force | Consistência; mantenedor é dev consciente — usa `--force` quando sincronizar. |
| 15 | `category` enum vs livre | String livre (D9-C) | Enum fechado do André | Não quebra 30+ notas existentes; padronização futura via comando opt-in. |
| 16 | Detecção P1 idempotência | Regex multi-padrão (D23-B) | Substring simples ou parse markdown AST | Cobre paths relativos/absolutos; sem dep de parser. |
| 17 | Migração de templates | Conteúdo substituído pelo do André + fixes (D14-A) | Manter conteúdo atual ou híbrido | Instrução explícita "literal"; estado atual tem anti-pattern "Replace this scaffold". |
| 18 | Goldens E2E init | Regeneram na fase do `git mv` (D16-A) | Fase separada ou só validar presença | Golden detecta regressão; regenerar junto do código é prática padrão. |
| 19 | `capture-guide.md` | Skill knowledge interno (D13-B) | Instalar no target | É knowledge do agente, não conteúdo pra dev humano ler. |
| 20 | Sem package.json no target | Standalone script (D11-C) | Recusar ou só docs | Init é stack-agnostic; bun roda script direto. |

---

## Criterios de Aceite

- [ ] **CA-01 (MH-01)**: Dado um projeto novo, quando rodar `/anti-vibe-coding:init`, então `docs/compound/README.md` é gerado com frontmatter de exemplo no schema `title/category/tags/created` e `bun run compound:check` passa.

- [ ] **CA-02 (MH-02 + MH-03)**: Dado o plugin, quando listar `skills/compound-engineering/assets/`, então existem os 10 templates compound (`docs/COMPOUND_ENGINEERING.md.tpl`, `docs/compound/README.md.tpl`, `docs/review-checklists/README.md.tpl` + 5 checklists, `docs/smoke-flows/README.md.tpl`, `scripts/compound-check.ts.tpl`) e `git log --follow` mostra linhagem desde `skills/init/assets/templates/`.

- [ ] **CA-03 (MH-04)**: Dado o módulo `skills/compound-engineering/lib/manifest.ts`, quando importar `getCompoundManifest()` e chamar, então retorna array com pelo menos 10 entradas `{src, dst}` onde `src` é absoluto e `dst` é relativo (ex: `docs/compound/README.md`).

- [ ] **CA-04 (MH-05 — skip default)**: Dado um target com `docs/COMPOUND_ENGINEERING.md` pré-existente, quando rodar `/anti-vibe-coding:compound-engineering install`, então arquivo NÃO é sobrescrito e console reporta `Skipped existing files: docs/COMPOUND_ENGINEERING.md`.

- [ ] **CA-05 (MH-05 — force opt-in)**: Dado o mesmo target de CA-04, quando rodar `install --force`, então arquivo é sobrescrito e console reporta `Overwritten: docs/COMPOUND_ENGINEERING.md`.

- [ ] **CA-06 (MH-05 — notas intactas)**: Dado um target com `docs/compound/2024-05-foo.md` (nota do dev), quando rodar `install` ou `install --force`, então o arquivo `2024-05-foo.md` é INALTERADO em ambos os casos.

- [ ] **CA-07 (MH-06 — captura)**: Dado um plano ativo único em `docs/exec-plans/active/{date}-{slug}/PLAN.md`, quando rodar `/compound-engineering gate` e responder "sim" a uma das 3 perguntas, então `lessons-learned add` é invocado via Skill tool e a seção `## Lessons Captured` do PLAN.md é atualizada com link para a nota nova.

- [ ] **CA-08 (MH-06 — no capture)**: Dado um plano ativo, quando rodar gate e responder "não" às 3 perguntas + razão "feature trivial sem padrão repetível", então PLAN.md `## Lessons Captured` recebe `no compound capture needed because: feature trivial sem padrão repetível`.

- [ ] **CA-09 (SH-01 — backward compat — RNF-01)**: Dado um projeto com hook `pre-commit: bun run compound:check`, quando rodar o hook em projeto válido pelas regras atuais, então passa (sem `--strict` ativado por default).

- [ ] **CA-10 (SH-01 — strict)**: Dado o mesmo projeto sem link compound no AGENTS.md, quando rodar `compound:check --strict`, então falha com mensagem `[agents-link] AGENTS.md: missing link to docs/COMPOUND_ENGINEERING.md`.

- [ ] **CA-11 (SH-03 — idempotência P1)**: Dado um AGENTS.md sem link compound, quando rodar `install`, então link é adicionado sob `## Read Before Major Changes`. Quando rodar `install` de novo, então AGENTS.md não muda (no-op).

- [ ] **CA-12 (SH-03 — P1 path relativo)**: Dado um AGENTS.md com link `[Compound](./docs/COMPOUND_ENGINEERING.md)`, quando rodar `install`, então NÃO duplica o link (regex D23 detecta presença).

- [ ] **CA-13 (SH-05 — migrate README)**: Dado um target brownfield com `docs/compound/README.md` documentando schema `date/author/decision`, quando rodar `migrate`, então README é reescrito com schema `title/category/tags/created` e o conteúdo prosa (texto fora do bloco de exemplo) é preservado.

- [ ] **CA-14 (SH-05 — migrate notes não-destrutivo — RNF-04)**: Dado 5 notas com frontmatter inconsistente, quando rodar `migrate`, então notas NÃO são alteradas e `docs/compound/migration-report.md` lista as 5 com tipo de erro de cada uma.

- [ ] **CA-15 (D19 — split libs)**: Dado o plugin após v1, quando importar `parseFrontmatter` em `skills/init/lib/compound-writer.ts`, então o import é cross-skill (`from '../../compound-engineering/lib/compound-frontmatter'`) e build typescript passa.

- [ ] **CA-16 (D20 — invocação via Skill tool)**: Dado o gate detectando captura necessária, quando o código de `gate` invoca `lessons-learned`, então usa a Skill tool (`Skill({ skill: 'anti-vibe-coding:lessons-learned', args: '...' })`) e NÃO usa subprocess `bun` ou import direto de lib da outra skill.

- [ ] **CA-17 (R8 — one-way dependency)**: Dado o lint/grep de imports, quando verificar `skills/compound-engineering/**/*.ts`, então nenhum import de `skills/init/**` existe (dependência one-way; init importa compound, nunca o inverso).

- [ ] **CA-18 (edge case — nenhum plano ativo)**: Dado um target sem nenhum plano em `docs/exec-plans/active/`, quando rodar `gate`, então skill reporta `No active plan found. Run /plan-feature first or specify --plan path.` e exit sem erro.

- [ ] **CA-19 (edge case — múltiplos planos ativos)**: Dado 2+ planos em `docs/exec-plans/active/`, quando rodar `gate`, então skill pergunta qual plano associar (R4 — AskUserQuestion).

- [ ] **CA-20 (edge case — sem package.json — D11)**: Dado um target Python sem package.json, quando rodar `install`, então skill copia `scripts/compound-check.ts` e NÃO tenta patch em scripts npm. Console: `No package.json detected — installed compound-check.ts as standalone (run via 'bun scripts/compound-check.ts')`.

---

## Out of Scope

- Refactor de `lessons-learned` (skill intacta — RT-02).
- Templates não-compound do init (SECURITY/RELIABILITY/CODE_STYLE/MERGE_GATES/etc — RT-05).
- Libs init Migration Mode (`compound-writer.ts`, `compound-imported-*.ts`, `prompts/compound.md` — RT-06).
- Enum fechado para `category` (WH-01).
- Hash-match sweep e auto-upgrade seletivo (WH-02).
- Reescrita automática de notas brownfield (WH-03).
- Versionamento de skill / manifest checksum (WH-06).
- Pacotes npm separados para skills (WH-07).

---

## Dependencias

| Tipo | Dependência | Status |
|------|------------|--------|
| Skill interna | `anti-vibe-coding:lessons-learned` (Skill tool target — D20) | Disponível (estável) |
| Lib interna | `skills/lib/telemetry-utils` (writeTelemetryStart/End) | Disponível |
| Lib interna | `skills/lib/preface-context` (profile-aware preface) | Disponível |
| Runtime | Bun ≥1.0 (script `compound-check.ts.tpl`) | Disponível (plugin requirement) |
| Runtime | Claude Code Skill tool (cross-skill invocation) | Disponível (plugin runtime) |
| Padrão | Estrutura `docs/exec-plans/active/{date}-{slug}/` (v6 layout) | Disponível |
| Lib npm | `js-yaml` (parse frontmatter) | Já no projeto |

---

## Riscos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| R1 | Brownfield Carreirarte v3 com muitas notas inconsistentes — relatório longo | Média | Baixo | Relatório agrupa por tipo; opcional `--fix-readme-only` skip de scan de notas. |
| R2 | Refactor de `init` pra usar `getCompoundManifest()` afeta `01-scaffold-full-tree.ts` e goldens | Alta | Médio | Fase isolada com golden update explícito (D16); rodar `bun test` E2E init antes do merge. |
| R3 | Patches em AGENTS.md duplicam link em edge cases | Baixa | Baixo | Regex multi-padrão (D23); test com fixtures cobrindo paths absolutos/relativos. |
| R4 | `gate` em projeto com múltiplos planos ativos — ambiguidade | Média | Baixo | CA-19: AskUserQuestion seleciona plano. |
| R5 | ~~Cross-skill invocation contrato não documentado~~ | — | — | Fechado por D20: Skill tool nativa. |
| R6 | ~~Hash-match magic~~ | — | — | Descartado (D17-A). |
| R7 | `git mv` quebra refs internos em tests/scripts que apontam paths antigos | Alta | Médio | Grep prévio por `skills/init/assets/templates/(docs/compound|review-checklists|smoke-flows|COMPOUND_ENGINEERING|scripts/compound-check)`; atualizar tudo no mesmo commit. |
| R8 | Cross-skill import circular dependency (compound-engineering importa init) | Baixa | Alto | Regra one-way dependency; CA-17 valida via grep antes do merge. |
| R9 | Skill tool de Claude muda interface em release futura | Baixa | Médio | Encapsular invocação em helper `lib/invoke-lessons-learned.ts`; troca pontual se necessário. |
| R10 | Telemetria do plugin (writeTelemetryStart/End) requer template padrão no SKILL.md — esquecer = bloco incompleto | Média | Baixo | Copiar bloco literal de `lessons-learned/SKILL.md` como base ao criar `compound-engineering/SKILL.md`. |

---

## Anexos

- **CONTEXT.md**: 25 decisões resolvidas (D1-D25), confidence 99%. Veja `./CONTEXT.md` na mesma pasta.
- **André reference**: `Infos/package/skills/compound-engineering/` — fonte literal a copiar.
- **Bug evidence**: `C:\Users\luizf\Videos\Carreirarte - Novo Design - v3\docs\compound\README.md` (schema buggy) vs `scripts/compound-check.ts` (validator esperando schema diferente).


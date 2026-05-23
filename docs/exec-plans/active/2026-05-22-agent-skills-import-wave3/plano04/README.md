# Plano 04: Refactor Skills + Flowchart AGENTS.md + Manifest Final

**Feature:** agent-skills-import-wave3 ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~3h
**Depende de:** Plano 01 (deprecation notice de `/anti-vibe-review` — flowchart cita "(DEPRECADO)"), Plano 02 (Prove-It Mode merged em `tdd-verifier`), Plano 03 (Pipeline Compound → Reference fechado — referenced-by frontmatter, criterio em `compound/README.md`)
**Desbloqueia:** Wave 3 fechada (Exit Criteria atingido) — proximo passo `/verify-work` + `/iterate`

---

## O que este plano entrega

Refactor por **adicao** (DT-5) em duas skills criticas — `tdd-workflow/SKILL.md` ganha 3 secoes
(`## Test Sizes`, `## DAMP vs DRY em Testes`, `## Test-Doubles Reference`) e `plan-feature/SKILL.md`
ganha 2 secoes (`## Task Sizing`, `## Dependency Graph (ASCII)`). Conteudo existente preservado intacto.

Flowchart canonico `Define → Plan → Build → Verify → Review → Ship` adicionado em `AGENTS.md` como
PRIMEIRA secao apos titulo principal (DT-4), com cada fase mapeada para skills publicas. Tras
clareza ao novato sobre por onde comecar.

Fecha a Wave 3: manifest regenerado (checksums SHA-256 atualizados para todos os arquivos tocados
nas Waves), STATE.md global movido para `ready-for-iterate`, e gate `bun run harness:validate &&
bun run test && bun run typecheck` retorna exit code 0 — atende CA-11 e SH-05.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Deprecation notice em `skills/anti-vibe-review/SKILL.md` | Plano 01 fase-02 | pendente (flowchart da fase-03 cita "(DEPRECADO → use /verify-work)") |
| Prove-It Mode em `agents/tdd-verifier.md` | Plano 02 | pendente (manifest final cobre o checksum atualizado) |
| `compound/README.md` com criterio + 3 references novos + referenced-by frontmatter | Plano 03 | pendente (manifest final cobre checksums dos compounds editados) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Wave 3 fechada (Exit Criteria) | `/verify-work` + `/iterate` (proximo ciclo) |
| Manifest regenerado | Sync futura via `/anti-vibe-coding:sync` |
| Flowchart em AGENTS.md | Onboarding de novos contribuintes |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-refatorar-tdd-workflow.md | 3 secoes novas em `tdd-workflow/SKILL.md` (CA-07 + SH-01) | 1h | — |
| 02 | fase-02-refatorar-plan-feature.md | 2 secoes novas em `plan-feature/SKILL.md` (CA-08 + SH-02) | 1h | — |
| 03 | fase-03-flowchart-pipeline-agents-md.md | `## Pipeline de Trabalho` em `AGENTS.md` com flowchart (CA-09 + SH-03 + DT-4) | 0.5h | Plano 01 fase-02 |
| 04 | fase-04-regenerar-manifest-final.md | Manifest + harness verde fechando Wave 3 (CA-11 + SH-05) | 0.5h | fase-01, fase-02, fase-03 + Planos 01, 02, 03 |

---

## Grafo de Fases

```
fase-01 (tdd-workflow)     fase-02 (plan-feature)     fase-03 (AGENTS.md flowchart)
       |                          |                            |
       +--------------------------+----------------------------+
                                  |
                                  v
                       fase-04 (manifest final + harness verde)
```

**Paralelismo possivel:** fase-01, fase-02 e fase-03 sao 100% paralelizaveis (arquivos
disjuntos). fase-04 e gate final — depende das tres anteriores E dos Planos 01/02/03.

---

## TDD Strategy

Refactor markdown-only — RED/GREEN via `grep` em vez de `bun run test`.

```
Ciclo por fase:
1. RED: grep da secao esperada retorna 0 (ou contagem antiga)
2. GREEN: Edit/Write aplica a mudanca; grep retorna contagem esperada
3. REFACTOR: garantir conteudo nao-placeholder (revisao humana de leitura)
4. VERIFY: bun run harness:validate (estrutura de docs intacta)
```

**Tracer Bullet deste plano:** N/A (este nao e o primeiro plano da Wave 3).

---

## CAs cobertos por este plano

- **CA-07** — `tdd-workflow/SKILL.md` tem secoes `## Test Sizes`, `## DAMP vs DRY em Testes`, `## Test-Doubles Reference` (fase-01)
- **CA-08** — `plan-feature/SKILL.md` tem secoes `## Task Sizing`, `## Dependency Graph (ASCII)` (fase-02)
- **CA-09** — `AGENTS.md` tem `## Pipeline de Trabalho` com flowchart `Define → Plan → Build → Verify → Review → Ship` (fase-03)
- **CA-11** — `bun run harness:validate && bun run test && bun run typecheck` retorna exit code 0 (fase-04)

## SHs cobertos

- **SH-01** — Test Sizes + Test-Doubles em tdd-workflow (fase-01)
- **SH-02** — Task Sizing + Dependency Graph em plan-feature (fase-02)
- **SH-03** — Flowchart em AGENTS.md (fase-03)
- **SH-05** — Manifest final consistente com arquivos (fase-04)

---

## Gotchas Conhecidos

- **G1:** `plan-feature/SKILL.md` tem blocos `typescript` de telemetria nas linhas 10-33, 35-56,
  86-98 (topo) e 855-876 (fundo). NAO TOCAR. Refactor da fase-02 deve adicionar conteudo APENAS
  em zona markdown pura (sugestao: apos `## Regras`, antes de `## Completion Signal`). Validar
  com `grep -c "^\`\`\`typescript" skills/plan-feature/SKILL.md` antes e depois — contagem deve
  permanecer constante (5). Mitiga R-NEW-03.
- **G2:** Refactor por **ADICAO**, nao substituicao (DT-5). Nenhum texto existente em
  `tdd-workflow` ou `plan-feature` deve ser reescrito — apenas novas secoes anexadas em pontos
  estrategicos.
- **G3:** Flowchart usa slugs canonicos das skills (R-05). Cada `/skill-name` citado deve
  corresponder a uma pasta real em `skills/`. Validar com `ls skills/` apos editar AGENTS.md. Se
  o slug de uma skill mudar futuramente, a contagem de checksums do manifest expira primeiro —
  isso e o guardrail natural.
- **G4:** Fase-03 cita `/anti-vibe-review (DEPRECADO → use /verify-work)`. Depende de o notice
  do Plano 01 fase-02 existir em `skills/anti-vibe-review/SKILL.md`. Verificar com
  `grep "Deprecation" skills/anti-vibe-review/SKILL.md` antes de prosseguir.
- **G5:** NAO ha script `bun run generate:manifest` em `package.json`. Para regenerar manifest,
  chamar `bun scripts/generate-manifest.js` direto. Registrado no MEMORY como GT-1.
- **G6:** NAO ha script `bun run lint` em `package.json`. Substituir por `bun run typecheck` no
  checklist e gate final da fase-04. Registrado no MEMORY como GT-2.
- **G7:** `AGENTS.md` e curto (39 linhas). Inserir `## Pipeline de Trabalho` logo apos titulo
  principal e ANTES de `## Core Beliefs` — fica como primeira secao operacional (conforme PRD:
  "antes da listagem de agentes").
- **G8:** `bun run harness:validate` valida estrutura de docs e checksums do manifest. Mudancas
  em skills/agents/AGENTS.md afetam — rodar harness apos cada fase relevante (especialmente fase-04
  final). Se falhar antes da fase-04, e esperado: o checksum estara stale ate regen.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

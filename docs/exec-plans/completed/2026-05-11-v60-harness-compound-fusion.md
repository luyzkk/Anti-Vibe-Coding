---
title: "Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion"
status: completed
date-start: 2026-05-11
date-end: 2026-05-12
slug: v60-harness-compound-fusion
---

# Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion

## Goal

O plugin v5.x cobria decisao (consultant, grill-me, plan-feature) e educacao (lessons-learned), mas tinha tres lacunas estruturais:

1. **Sem camada de documentacao durável institucional.** Licoes viviam em `lessons-learned.md` (arquivo unico), planos em `.planning/CONTEXT-*.md` (transitorios). Agente nao tinha indice (`AGENTS.md`) para carregar contexto certo na janela.
2. **Sem validacao mecanica.** Convencoes confiavam que LLM seguia; nao havia `harness:validate` / `compound:check` rejeitando `AGENTS.md` inchado, planos orfaos, ou licoes sem frontmatter.
3. **Sem transferencia de conhecimento senior por stack.** Cada projeto novo re-aprendia do zero (alvo para v6.1+ via knowledge packs).

A v6.0.0 absorve o **harness + compound engineering** (workshop Andre Prado, fev/2026) integralmente: `AGENTS.md` ≤40 linhas como indice condicional, `docs/exec-plans/{active,completed}/`, `docs/compound/*.md` com YAML frontmatter, validadores em TS+bun.

## Scope

**Entregues (Must Have + Should Have + dog-food):**
- `AGENTS.md` ≤40 linhas + `CLAUDE.md` espelhado (3-tier symlink fallback: `ln -s` → `mklink /H` → copy+hook)
- 9 docs institucionais em `docs/` (`DESIGN`, `FRONTEND`, `PLANS`, `PRODUCT_SENSE`, `QUALITY_SCORE`, `RELIABILITY`, `SECURITY`, `COMPOUND_ENGINEERING`, `ARCHITECTURE`)
- `docs/exec-plans/{active,completed}/`, `docs/compound/`, `docs/design-docs/`, `docs/review-checklists/`, `docs/smoke-flows/`, `docs/product-specs/`, `docs/references/`, `docs/generated/`
- Validadores em TS+bun: `scripts/harness-validate.ts`, `scripts/compound-check.ts` (< 2s em projeto com 100 docs)
- Hook `pre-mutation-gate.cjs` (UserPromptSubmit) sugere skill quando detecta prompt substancial sem plano ativo (sem bloquear)
- 6 skills migradas para novos paths preservando interface publica: `/lessons-learned`, `/decision-registry`, `/iterate`, `/plan-feature`, `/quick-plan`, `/execute-plan`
- CRUD completo (D31): `--update`/`--delete` em licoes, `--revoke` em ADRs (cria superseded), `--skip`/`--remove` em TODO
- `docs/STATE.md` dinamico mantido por hook PostToolUse (D32)
- Bloco YAML machine-readable de completion signal no fim de cada skill (D33)
- Skill `/todo-pick` separada de `/iterate` (D27) — puxa 1 item de `TODO.md` na raiz
- Migracao idempotente v5.x → v6.0.0 com backup `.planning.v5-backup/` e dry-run
- `.github/workflows/harness.yml` + `.github/pull_request_template.md` por default (D14)
- Dog-food (D20): plugin recebe propria estrutura harness, `.planning/plano01..04/` → `docs/exec-plans/completed/`, `lessons-learned.md` dividido em `docs/compound/*.md`
- Versao **5.3.0 → 6.0.0** (semver major) tag anotado `v6.0.0` em commit `4c18844`

**Won't Have desta versao:**
- Knowledge packs com conteudo (deferido por stack: v6.1.0=Node.js, v6.2.0=Rails, v6.3.0=Next.js, v6.4.0=PHP). Estrutura/contrato (D6, D19) permanecem definidos
- Atomic primitives layer abaixo das skills (P1/D30) — v6.1+
- Dynamic capability discovery para knowledge packs (P5/D34) — v6.1+
- `docs/AGENT_LOG.md` append-only por sessao (P6/D35) — v6.1+
- Bloqueio (hook bloqueante) por ausencia de plano ativo — D4 escolheu sugestao
- Mudanca de interface das skills (`/lessons-learned` → `/capture-lesson` etc.) — D10 obriga preservar comandos
- Suporte oficial a Codex/Cursor/OpenCode — AGENTS.md generico funciona, testes so contra Claude Code

## Assumptions

- Plugin Anti-Vibe Coding v5.3.0 ja instalado e funcional
- Estrutura nova é breaking estrutural (paths mudam) mas zero breaking de interface publica (comandos preservados — D10)
- Plugin é uso pessoal — sem usuarios externos para alpha, sem pre-releases necessarios (D21)
- Rollback via backup `.planning.v5-backup/` + commit de migracao separado + `git revert HEAD` (D22)
- `telemetry-utils` existente extende eventos (S5) — sem sistema novo
- NTFS hard link (`mklink /H`) nao exige admin no Windows (D25)
- Fixtures sandbox sob `tests/fixtures/{rails-new,nextjs-new,node-ts-new,legacy-v5}` são mais confiaveis que mocks (D24)

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Dog-food em paralelo com desenvolvimento quebra plugin durante release | Alta | Alto | R4 — Dog-food (Plano 08) é serial e POR ULTIMO, depois de 03,04,05,06,07 estarem done |
| Migracao v5.x deixa projeto em estado parcial se interrompida | Media | Alto | Backup atomico `.planning.v5-backup/` + dry-run + idempotencia |
| AGENTS.md ≤40 linhas nao acomoda 346 linhas atuais de CLAUDE.md | Alta | Medio | D29 — arquitetura de 5 camadas (hooks, plugin docs, SKILL.md, project AGENTS.md, docs condicionais) |
| Symlink quebra no Windows | Media | Medio | D25 — 3-tier fallback `ln -s` → `mklink /H` → copy + hook PostToolUse |
| Validadores TS+bun > 2s degrada UX em CI | Baixa | Medio | Perf bench em Plano 04; cache de globs; fixture de 100 docs no test |
| Hook pre-mutation-gate gera falso positivo (sugere skill para "explique como X") | Media | Baixo | D26 — heuristica verbos + paths + negative-list explanatoria |
| CRUD em ADRs com revoke deleta historico | Media | Alto | D10 + D31 — `--revoke` cria novo ADR `superseded-by`, nunca deleta |

## Execution Steps

9 planos sequenciais com paralelismo controlado:

| # | Plano | Fases | Sizing | Status |
|---|-------|-------|--------|--------|
| 01 | Tracer Bullet — Minimal `/init` + Validator E2E | 5 | ~7h | done |
| 02 | Full Scaffold (14+ docs + GH Actions + Delivery Loop + Stack Detection) | 6 | ~10h | done |
| 03 | Migration v5→v6 (.planning/ → docs/, backup, dry-run) | 7 | ~12.5h | done |
| 04 | Validators Full (compound-check + advanced rules + perf bench) | 5 | ~7h | done |
| 05 | Skill Migration + Hooks (6 skills + pre-mutation-gate + Compound Gate) | 8 | ~13.5h | done |
| 06 | Agent-Native (D31 CRUD + D32 STATE.md hook + D33 completion signal) | 7 | ~12h | done |
| 07 | TODO.md + /todo-pick | 4 | ~5h | done |
| 08 | Dog-Fooding (POR ULTIMO — R4) | 8 | ~14.5h | done |
| 09 | Versioning & Release (5.3.0 → 6.0.0) | 5 | ~6h | done |

**Paralelismo aplicado:** Apos Plano 02 done, Planos 03+04+05 rodaram via subagentes paralelos (sem conflito de paths em docs/). Plano 06 → 07 serial. Plano 08 serial e POR ULTIMO (mitigacao R4). Plano 09 serial valida dog-food.

**Tracer bullet:** Plano 01 fase 05 — fixture vazia → `/init` cria `AGENTS.md` (≤40 linhas em EN) + `ARCHITECTURE.md` + symlink `CLAUDE.md` (3-tier fallback) → `bun run harness:validate` retorna exit 0. Prova D2 (idioma), D13 (TS+bun), D16 (symlink) end-to-end antes de trabalho de volume.

## Review Checklist

- [x] `AGENTS.md` ≤40 linhas (validado mecanicamente em CI)
- [x] Symlink fallback 3-tier funciona em Windows + macOS + Linux
- [x] `bun run harness:validate` < 2s em projeto com 100 docs
- [x] `bun run compound:check` < 2s na mesma escala
- [x] Skills mantem interface publica (D10) — testado contra fixtures sandbox
- [x] Migracao v5.x idempotente + dry-run + backup atomico
- [x] Plugin dog-food: estrutura harness instalada em si mesmo
- [x] Tag anotado `v6.0.0` criado em commit `4c18844`
- [x] Rollback test PASS contra fixture `legacy-v5`
- [x] Telemetria estende eventos existentes (sem sistema novo)

## Validation Log

- 2026-05-11: Plano criado via `/plan-feature` (9 planos, 55 fases). Aprovação aprovada pelo dev.
- 2026-05-11 → 2026-05-12: Planos 01 → 09 executados sequencialmente com paralelismo em 03+04+05.
- 2026-05-12: Plano 08 (Dog-Fooding) 8/8 fases done — plugin recebeu propria estrutura harness.
- 2026-05-12: Plano 09 (Release) 5/5 fases done — versão 5.3.0 → 6.0.0, tag anotado `v6.0.0` em `4c18844`, rollback test PASS, push para origin pendente de autorização manual.
- 2026-05-13: Folder flatten executado — plugin virou raiz do repositorio (matrix-wrapper removido).
- 2026-05-13: Fase A pos-flatten — validators alinhados, `harness:validate` exit 0, `compound:check` 10/10, `typecheck` clean, `test` 687 pass / 3 fail (3 pre-existentes nao relacionados).

## Compound Opportunity

Multiplos compound notes capturados durante execucao:
- `docs/compound/2026-05-12-dog-food-reveals-strict-validators.md` — Plano 08 revelou validadores muito estritos; relaxados para serem uteis em projetos reais
- `docs/compound/2026-05-12-skip-dirs-fixture-isolation.md` — fixtures dentro de `tests/` precisam ficar fora do scope do validator
- `docs/compound/2026-05-12-3-lessons-from-v6-release-engineering.md` — 3 licoes consolidadas do ciclo de release v6.0.0

Lessons subsequentes esperadas: knowledge packs (v6.1+), atomic primitives (v6.1+), dynamic capability discovery (v6.1+).

## Lessons Captured

- **Dog-food por ultimo é regra estrutural, nao preferencia** (R4 valido empiricamente). Plano 08 quebrou suposicoes que so foram visiveis quando o plugin recebeu propria estrutura — se tivesse sido feito antes, teria bloqueado planos 03–07.
- **Validadores estritos por default subestimam variancia de projetos reais.** Ajuste pos-dog-food: `SKIP_DIRS` permite fixtures, archives, e `.planning/` legados sem desligar validacao em docs principais.
- **CRUD completo em entidades de plugin (D31) elimina deriva.** Antes de v6, licoes/ADRs antigos viravam "fossil" — sem update/revoke. Cherry-pick do artigo agent-native fechou esse gap.
- **Symlink fallback 3-tier (D25) é mais resiliente que symlink unico.** NTFS hard link via `mklink /H` resolve Windows sem admin, copy+hook é fallback final.

## Exit Criteria

- [x] Tag anotado `v6.0.0` em `4c18844` criado e validado
- [x] Rollback test PASS contra fixture `legacy-v5`
- [x] `harness:validate` + `compound:check` exit 0 em projeto recem-init
- [x] Dog-food completo no plugin: `AGENTS.md`, `ARCHITECTURE.md`, `docs/*` completo
- [x] CHANGELOG.md descreve migracao 5.x → 6.0.0 com exemplos
- [ ] Push para `origin` (pendente — requer autorizacao manual do dev)

## Detail

Working notes (PRD detalhado, PLAN, STATE, plano01..09/fase-XX.md) preservados em [_legacy-detail/v60-harness-compound-fusion/](_legacy-detail/v60-harness-compound-fusion/) para referencia historica. Resumo executivo acima é o documento canonico.

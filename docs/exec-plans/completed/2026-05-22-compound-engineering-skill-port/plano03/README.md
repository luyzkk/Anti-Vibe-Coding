# Plano 03: Subcomandos + Patches

**Feature:** compound-engineering-skill-port ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~9h
**Depende de:** Plano 02 (templates e libs fisicamente em `skills/compound-engineering/` + goldens regenerados)
**Desbloqueia:** Feature pronta para merge final (Exit Criteria do PLAN.md)

---

## O que este plano entrega

Implementa a funcionalidade exposta pela skill `compound-engineering`: 4 subcomandos user-invocaveis (`install`, `check`, `gate`, `migrate`), 2 patches idempotentes em arquivos do target (`AGENTS.md` via P1, `scripts/new-plan.ts.tpl` via P2), completion signal YAML no `gate` e cobertura de edge cases (CA-18/19/20). Estado final: dev consegue rodar todos os 4 subcomandos em greenfield, brownfield e neste proprio repo (dogfooding D24).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `skills/compound-engineering/SKILL.md` user-invocable com `argument-hint` | Plano 01 fase-01 | Pendente (Plano 01/02) |
| `skills/compound-engineering/lib/manifest.ts` com `getCompoundManifest()` retornando paths apontando para `skills/compound-engineering/assets/` | Plano 02 fase-01 | Pendente (Plano 02) |
| `skills/compound-engineering/assets/` com 10 templates (versao literal Andre) | Plano 02 fase-01 | Pendente (Plano 02) |
| `skills/compound-engineering/lib/compound-frontmatter.ts` + `compound-files-collector.ts` | Plano 02 fase-02 | Pendente (Plano 02) |
| `skills/lessons-learned` v6.x estavel (RT-02) | Estado atual do repo | Pronto |
| `skills/lib/telemetry-utils.ts` (`writeTelemetryStart/End`) | Estado atual do repo | Pronto |
| `skills/lib/completion-signal.ts` (`renderCompletionSignal()`) | Estado atual do repo (skill `lessons-learned` usa) | Pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Feature merge-ready | Exit Criteria do PLAN.md |
| `lib/invoke-lessons-learned.ts` helper isolado | Mitigacao R9 (refactor pontual se Skill tool API mudar) |
| Completion signal `status: complete` emitido por `gate` | Orquestradores futuros (CH-03) podem encadear gate em pipeline |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-subcommand-install.md | `compound-engineering install [--force]` em `lib/installer.ts`; skip-by-default; nunca toca `docs/compound/*.md`; stack-agnostic (D11/CA-20) | 1.5h | Plano 02 completo |
| 02 | fase-02-subcommand-check-strict.md | `compound-engineering check [--strict]`; backward compat default (CA-09); 3 regras P3 sob `--strict` (CA-10) | 1.5h | fase-01 |
| 03 | fase-03-subcommand-gate-skill-tool.md | `compound-engineering gate` em `lib/gate.ts`; detecta plano ativo; 3 perguntas; delega `lessons-learned add` via Skill tool (D20); atualiza `## Lessons Captured` (CA-07/08) | 2h | fase-01 |
| 04 | fase-04-subcommand-migrate-nao-destrutivo.md | `compound-engineering migrate` em `lib/migrate.ts`; reescreve README brownfield com schema canonico (CA-13); gera `migration-report.md` sem reescrever notas (CA-14) | 1.5h | fase-01 |
| 05 | fase-05-patches-p1-p2-idempotentes.md | `lib/patch-agents.ts` (P1 regex D23 — CA-11/12) e `lib/patch-new-plan.ts` (P2 — 4 secoes antes de `## Exit Criteria`); ambos idempotentes | 1.5h | fase-01 |
| 06 | fase-06-completion-signal-edge-cases.md | `renderCompletionSignal()` no output do `gate` (SH-07); edge cases CA-18/19/20 cobertos com testes; `bun test && bun run lint` verde | 1h | fase-01..fase-05 |

---

## Grafo de Fases

```
fase-01 (install)
    |
    +-----> fase-02 (check --strict)
    |
    +-----> fase-03 (gate via Skill tool)
    |
    +-----> fase-04 (migrate nao-destrutivo)
    |
    +-----> fase-05 (patches P1/P2)
              |
              v
        fase-06 (completion signal + edge cases consolidados)
```

**Paralelismo possivel:** fase-02, fase-03, fase-04 e fase-05 dependem todas apenas de fase-01 e podem ir em paralelo se executadas por subagentes independentes (sequencial recomendado para reduzir contexto). fase-06 e o gate consolidador — depende de todas as anteriores.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A (Tracer Bullet da feature vive no Plano 01 fase-02 — manifest roundtrip via init).

Para cada fase deste plano: RED valida assertion failure no teste do subcomando antes da implementacao; GREEN valida pass apos `lib/{subcomando}.ts` implementado. fase-06 nao tem RED tradicional — agrega testes de edge case ja escritos nas fases anteriores e adiciona o completion signal como ultimo passo verificavel via grep do output YAML.

---

## Gotchas Conhecidos

Indexados para referencia nas fases. R-prefix vem do PRD/CONTEXT (riscos), D-prefix sao decisoes aplicaveis.

- **G1 (R3 + D23):** Patch P1 (AGENTS.md) precisa detectar link em paths absolutos E relativos. Regex multi-padrao `/\[.*?\]\(\.?\/?docs\/COMPOUND_ENGINEERING\.md\)/` cobre `[text](docs/...)`, `[text](./docs/...)`, `[text](../docs/...)`. Aplicar em fase-05. CA-11 valida idempotencia; CA-12 valida path relativo.
- **G2 (R4 + CA-19):** `gate` em projeto com multiplos planos ativos precisa pedir desambiguacao via `AskUserQuestion`. Aplicar em fase-03. Edge case re-testado em fase-06.
- **G3 (R8 + CA-17):** Cross-skill — `gate` invoca `lessons-learned` SOMENTE via Skill tool (`Skill({ skill: 'anti-vibe-coding:lessons-learned', args: 'add "..."' })`). NUNCA via subprocess `bun ...` ou import direto de lib da skill irma. Aplicar em fase-03. CA-16 valida.
- **G4 (R9 + D20):** Skill tool de Claude pode mudar interface. Encapsular invocacao em `skills/compound-engineering/lib/invoke-lessons-learned.ts` (helper substituivel — 1 arquivo de troca pontual). Aplicar em fase-03.
- **G5 (D11 + CA-20):** Target sem `package.json` (projeto Python/Go/Ruby) precisa receber `scripts/compound-check.ts` standalone e NAO pode tentar patch em scripts npm. Aplicar em fase-01. Console: `No package.json detected — installed compound-check.ts as standalone (run via 'bun scripts/compound-check.ts')`.
- **G6 (D17-A + CA-04/05/06):** `install` default SKIPA arquivos existentes no target. `--force` opt-in sobrescreve. Notas compound (`docs/compound/*.md`) NUNCA sao alvo do installer — mesmo com `--force`. Aplicar em fase-01.
- **G7 (D24):** Dogfooding deste proprio repo Anti-Vibe-Coding e tratamento normal — sem blocklist. `install` aqui skipa pq scaffolds ja existem; `--force` sobrescreve consciente. Aplicar em fase-01 (sem excecao em codigo).
- **G8 (SH-07 + D33 da lessons-learned):** Completion signal YAML segue padrao do `renderCompletionSignal()` ja usado por `lessons-learned`. Custo ~5 linhas no fim do `gate`. Permite orquestradores parsearem `status: complete`. Aplicar em fase-06.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

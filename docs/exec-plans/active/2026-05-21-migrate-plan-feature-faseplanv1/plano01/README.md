# Plano 01: Renderer Cross-Skill + Builder

**Feature:** migrate-plan-feature-faseplanv1 ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02

---

## O que este plano entrega

Move o renderer `renderFasePlan` de `skills/init/lib/` para `skills/lib/` (cross-skill),
cria um builder TypeScript `buildFaseFromContext` em `skills/plan-feature/lib/`, e instala
uma suite de snapshot tests com golden file. Ao final, `/plan-feature` pode emitir fases
sob `FasePlanInput v1` sem depender do template Markdown legado.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `skills/init/lib/render-fase-plan.ts` e `render-fase-plan.test.ts` | Feature A (`refactor-populate-plan-faseplanv1`) | pronto (commitado) |
| `FasePlanInput`, `Wave`, `RiskEntry`, `renderFasePlan`, `extractH2Sections` exportados | Feature A Plano 01 | pronto |
| Suite de testes de `render-fase-plan.test.ts` verde | Feature A Plano 01 fase-01 | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/lib/render-fase-plan.ts` (renderer cross-skill) | Plano 02 (integrar plan-feature/index.ts ao renderer) |
| `skills/plan-feature/lib/fase-builder.ts` + `PlanFaseContext` | Plano 02 (Step 9 do SKILL.md) |
| `skills/plan-feature/__golden__/fase-output.md` + suite snapshot | Plano 02 (drift test CA-B-04) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-mover-renderer-cross-skill.md | `skills/lib/render-fase-plan.ts` existe; `skills/init/lib/render-fase-plan.ts` deletado; import em `populate-plan-generator.ts` atualizado; suite verde | ~1h | — |
| 02 | fase-02-criar-fase-builder.md | `skills/plan-feature/lib/fase-builder.ts` com `PlanFaseContext` + `buildFaseFromContext()` testado | ~1h | fase-01 |
| 03 | fase-03-snapshot-golden-suite.md | `skills/plan-feature/__golden__/fase-output.md` + testes de H2 + CA-B-06 edge case | ~1h | fase-02 |

---

## Grafo de Fases

```
fase-01 (mover renderer cross-skill)
    |
    v
fase-02 (criar fase-builder)
    |
    v
fase-03 (snapshot golden suite)
```

**Paralelismo possivel:** Nenhum — cada fase depende da anterior. fase-02 depende do renderer
em `skills/lib/` (fase-01). fase-03 depende do builder (fase-02).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run typecheck
```

**Tracer Bullet deste plano:** fase-01 — mover renderer, atualizar 1 import, `bun test` verde.
Prova que a arquitetura cross-skill funciona antes de construir qualquer abstração nova.

---

## Gotchas Conhecidos

- **G1 (git mv obrigatorio):** Usar `git mv` para mover `render-fase-plan.ts` e
  `render-fase-plan.test.ts` — preserva linhagem no `git log`. Write+Delete perde historia.
- **G2 (golden path no teste):** O teste atual usa `import.meta.dir` para localizar o golden.
  Apos mover para `skills/lib/`, o golden deve mover para `skills/lib/__golden__/fase-plan-sample.md`
  OU o path no import.meta deve ser ajustado. Verificar antes de mover.
- **G3 (grep de importers):** Antes de deletar `skills/init/lib/render-fase-plan.ts`, rodar
  `grep -r "render-fase-plan" skills/` para confirmar que `populate-plan-generator.ts` e o
  unico importador. Se houver outros, sinalizar como blocker.
- **G4 (cross-skill import path):** O builder em `skills/plan-feature/lib/fase-builder.ts`
  deve importar de `../../lib/render-fase-plan` (relativo) — nao de `skills/lib/render-fase-plan`
  (path absoluto que nao funciona em runtime).
- **G5 (CA-B-06 — campos vazios):** O renderer ja omite `detectionSignals` quando array vazio
  (linha 71: `if (input.detectionSignals.length > 0)`). Verificar comportamento real do renderer
  para `mustCover = {}` e `linkTargets = []` antes de codificar o builder. Codigo e fonte da
  verdade — nao assuma.

<!-- Gerado por subagente de planejamento em 2026-05-22 -->

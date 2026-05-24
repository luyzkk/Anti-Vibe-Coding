# Plano 01: Fundação + Bug Fix

**Feature:** compound-engineering-skill-port ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (git mv físico + goldens), Plano 03 (subcomandos + patches)

---

## O que este plano entrega

Infraestrutura mínima da skill `compound-engineering` (SKILL.md user-invocable + `getCompoundManifest()` puro), prova arquitetural via Tracer Bullet (init consome manifest sem mexer em paths físicos) e o bug fix MH-01 do schema do `compound/README.md.tpl` — entregue como commit isolado deployável standalone.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD + CONTEXT + PLAN aprovados | Sessão `/grill-me` + `/write-prd` + `/plan-feature` | Pronto |
| `skills/lessons-learned/SKILL.md` estável (referência R10) | `lessons-learned` v6.x | Pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/compound-engineering/SKILL.md` stub (user-invocable) | Plano 03 (todos os subcomandos plugam aqui) |
| `getCompoundManifest()` exportado por `skills/compound-engineering/lib/manifest.ts` | Plano 02 fase-01 (atualiza paths absolutos após `git mv`) |
| Refactor do `template-manifest.ts` consumindo manifest da skill | Plano 02 fase-01 (mantém contrato; só troca origem dos paths) |
| Bug MH-01 fechado (schema `title/category/tags/created`) | Independente — vai pra produção isolado |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-skill-stub-e-manifest.md | Skill SKILL.md + `manifest.ts` puro com 10 entradas + telemetria literal de lessons-learned | 1h | — |
| 02 | fase-02-tracer-bullet-manifest-roundtrip.md | `template-manifest.ts` consome `getCompoundManifest()` mantendo ordem/paths idênticos; goldens E2E permanecem verdes | 1.5h | fase-01 |
| 03 | fase-03-fix-schema-readme.md | `compound/README.md.tpl` corrigido para schema canônico (bug MH-01) | 0.5h | — (independente, deployável isolado) |

---

## Grafo de Fases

```
fase-01 (skill stub + manifest)
    |
    v
fase-02 (Tracer Bullet: roundtrip via init)

fase-03 (bug fix README schema)  -- INDEPENDENTE, pode mergear antes
```

**Paralelismo possivel:** fase-03 é independente das outras duas — pode ser executada/mergeada em paralelo. fase-02 depende estritamente de fase-01.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** fase-02 (manifest roundtrip via init sem mexer em paths físicos — prova arquitetura D7/D21 com risco zero a goldens).

---

## Gotchas Conhecidos

Indexados para referência nas fases. R-prefix vêm do PRD/CONTEXT (riscos), D-prefix são decisões aplicáveis.

- **G1 (R10 do PRD):** Telemetria do plugin requer bloco padrão (`profile-aware-preface` + `stale-capabilities-check`) no SKILL.md. Esquecer = bloco incompleto. **Mitigação:** copiar literal de `skills/lessons-learned/SKILL.md` (linhas 10-59) como base ao criar `skills/compound-engineering/SKILL.md`. Aplicar em fase-01.
- **G2 (R11 do PLAN):** fase-02 refatora `skills/init/lib/template-manifest.ts` sem mudar paths físicos; risco de bug sutil na ordem das 10 entradas compound afetando golden de scaffold. **Mitigação:** test de invariante (ordem + ids + dst preservados antes/depois) na própria fase. Goldens E2E rodam no fim.
- **G3 (D21):** `getCompoundManifest()` retorna `src` absoluto via `path.resolve(import.meta.dir, '../../init/assets/templates', name)` na fase-01 — paths AINDA apontam para `skills/init/assets/templates/` (resolução transitória até o `git mv` do Plano 02 fase-01). `dst` relativo ao target root (ex: `docs/compound/README.md`).
- **G4 (D22):** SKILL.md da `compound-engineering` deve ter `argument-hint: "install|check|gate|migrate [--strict] [--force]"` desde fase-01, mesmo que os subcomandos só sejam implementados no Plano 03. O hint documenta o contrato user-facing.
- **G5 (D13):** `references/capture-guide.md` é skill knowledge interno (consultado pelo agente durante o gate, NÃO instalado no target). Criar como placeholder em fase-01 (`# Capture Guide\n\n_TBD — Plano 03 fase-03 implementa._`) — Plano 03 fase-03 (gate) preenche.
- **G6 (D25):** Init em greenfield NUNCA invoca subskill `compound-engineering install`. Copia direto via `getCompoundManifest()`. fase-02 enforce essa boundary: a refatoração troca hardcode por chamada à função pura, sem subprocess/Skill tool.
- **G7 (MH-01 + CA-01):** fase-03 corrige `skills/init/assets/templates/docs/compound/README.md.tpl` (NÃO o `Infos/...` do André, NÃO o README do plugin em `docs/compound/`). Substitui APENAS o bloco frontmatter de exemplo `date/author/tags/decision` por `title/category/tags/created`. Conteúdo prosa fora do bloco fica intacto.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

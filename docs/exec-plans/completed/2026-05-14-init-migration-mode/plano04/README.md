# Plano 04: Manifest + Harness Validate — Fase 4

**Feature:** /init Migration Mode ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~4h
**Depende de:** Plano 02 (InventoryResult / `run_id` / `audit-log.ts`), Plano 03 (`semantic-inventory.json` / migration plans em `active/` / compound notes em `compound/`)
**Desbloqueia:** Plano 05 (idempotência lê checksums do manifest; harness-validate migration mode permite rodar suite sem strict mode durante dev do plugin)

---

## O que este plano entrega

Implementa a Fase 4 TS determinística do pipeline de migration mode: o manifest writer que produz `.claude/.anti-vibe-manifest.json` com `initMode: "migration"`, catalogando todos os migration plans gerados pelas Fases 1-3 (Plano 03). Cria `docs/exec-plans/active/_INIT_ORCHESTRATOR.md` com a ordem topológica de execução dos plans (design-docs → docs-layer → raiz → AGENTS.md). Estende `harness-validate.ts` para funcionar em dois modos: strict (`fresh`/`completed`) e permissivo (`migration`) — neste último, ausência dos 26 slots vira warning em vez de error, mas exige consistência (slot ausente = plan ativo correspondente obrigatório). Implementa o auto-flip de `initMode: "migration" → "completed"` quando o último plan de migração é movido para `completed/`.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| Dependência | O que usa |
|-------------|-----------|
| Plano 02 — fase-01 (`InventoryResult`) | `run_id` do InventoryResult correlaciona manifest com discovery para auditoria cruzada |
| Plano 02 — fase-03 (`audit-log.ts` / `AuditLogger`) | Manifest writer registra entrada da Fase 4 no audit log antes de encerrar |
| Plano 03 — fase-02 (`migration-planner.ts` / `MigrationPlannerResult`) | `planPaths: string[]` do resultado do planner popula `migrationPlans[]` no manifest |
| Plano 03 — fase-03 (`plan-writer.ts` / shape 10-seções) | Plans com shape valid devem existir em `active/` para o orchestrator catalogar |
| Plano 03 — fase-04 (`compound-writer.ts`) | Compound notes em `docs/compound/` confirmam que Fase 3 completou antes de gravar manifest |

### Produz para (outros planos que dependem deste)

| Plano | O que usa deste plano |
|-------|----------------------|
| Plano 05 | `AntiVibeManifest.files` com checksums — idempotência de re-run compara checksums antes de decidir skip/regenerar |
| Plano 05 | `harness-validate` em migration mode permite rodar suite sem strict mode (evita falsos positivos ao desenvolver o plugin com migration plans ativos) |
| Plano 05 | `autoFlipIfComplete()` usada em testes de idempotência para confirmar que re-run não flippa `initMode` prematuramente |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-fase4-manifest-orchestrator.md` | `manifest-writer.ts` + `orchestrator-writer.ts` — manifest JSON + `_INIT_ORCHESTRATOR.md` | ~1.5h | Plano 02 completo + Plano 03 completo |
| 02 | `fase-02-harness-validate-migration.md` | `harness-validate.ts` — migration mode (warnings vs errors, consistency check) | ~1.5h | fase-01 |
| 03 | `fase-03-auto-flip-initmode.md` | `autoFlipIfComplete()` em `manifest-writer.ts` + integração com SKILL.md routing | ~1h | fase-01 |

---

## Grafo de Fases

```
fase-01 (manifest-writer.ts + orchestrator-writer.ts)
    │
    ├──────────────────────────┐
    ▼                          ▼
fase-02 (harness-validate   fase-03 (auto-flip
         migration mode)             initMode)
```

fase-02 e fase-03 são independentes entre si — ambas dependem apenas de fase-01.
Podem ser executadas em paralelo se desejado.

---

## TDD Strategy

Ciclo RED → GREEN por fase:

- **fase-01:** escreve `manifest-writer.test.ts` com `import { writeManifest, readManifest }` antes de criar o módulo → RED (ModuleNotFoundError) → implementa → GREEN; idem para `orchestrator-writer.test.ts`
- **fase-02:** escreve `harness-validate-migration.test.ts` com fixture temporária de repo mock (sem arquivos obrigatórios + manifest `initMode: "migration"`) → invoca validator → verifica exit code 0 com warnings → RED (harness falha sem conhecer migration mode) → implementa modificação → GREEN
- **fase-03:** escreve `auto-flip.test.ts` com mock filesystem (todos plans em `completed/`) → RED por assertion de `flipped: false` (função não existe) → implementa `autoFlipIfComplete()` → GREEN

Estratégia global: mocks de `fs` (via `bun:test` mock ou diretórios temporários) garantem que os testes não dependem de estado do repo. `readManifest` e `writeManifest` usam `targetDir` parametrizado — fácil mockar.

---

## Gotchas Conhecidos

**G1 — `harness-validate.ts` é script standalone:** Deve continuar funcionando sem imports externos. Adicionar `readInitManifest` inline no script, **sem importar** de `skills/init/lib/manifest-writer.ts`. Manter sincronia manual — documentada via comentário com `CANONICAL:` e testada em `tests/harness-validate-migration.test.ts`.

**G2 — Topological order não é alfabética:** `_INIT_ORCHESTRATOR.md` ordena plans por slot-layer: Tier 1 (design-docs/, ARCHITECTURE.md, CLAUDE.md) → Tier 2 (docs/*.md genéricos) → Tier 3 (exec-plans, compound, review-checklists) → Tier 4 (infra: scripts/, README.md, .github/) → Tier 5 (AGENTS.md, sempre last). Plans sem slot mapeável vão para Tier 4 antes de AGENTS.md.

**G3 — `files` checksums são polimórficos por `initMode`:** Em `fresh`, `files` contém checksums dos 26 arquivos scaffolded. Em `migration`, `files` contém checksums dos migration plans + `_INIT_ORCHESTRATOR.md` + `discovery/*.json`. O campo é o mesmo mas o conjunto difere. Documentar via JSDoc com `@remarks`.

**G4 — Auto-flip não roda dentro da Fase 4:** A Fase 4 grava manifest com `initMode: "migration"` (primeira execução sempre tem plans ativos). O auto-flip é função separada chamada no routing de `/init` **quando** `initMode === "migration"` e todos plans estão em `completed/`. Não confundir os dois momentos de invocação.

**G5 — Slot inference dos plan files:** `buildMigrationPlanCatalog()` lê cada `*-migration.md` e procura `<!-- migration-slot: {slot} -->` na primeira linha após o frontmatter. Se ausente, fallback: regex que extrai path em backticks da seção `## Goal` cruzado contra `TEMPLATE_MANIFEST`. Se ainda não encontrar: registra como `slot: "unknown"` e posiciona em Tier 4.

**G6 — Consistency check exige plano por slot ausente:** Em migration mode, `checkRequiredFiles` no harness-validate emite warning (não error) para arquivo ausente, **mas** `checkMigrationConsistency` emite error se não houver plan ativo correspondente ao slot. "Permissivo" não significa "sem cobertura".

<!-- Gerado por /plan-feature em 2026-05-14 -->

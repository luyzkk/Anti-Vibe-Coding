# Memoria: Plano 01 — Foundation + Tracer + Cleanup

**Feature:** init-refactor-v7
**Iniciado:** 2026-05-21
**Status:** em andamento (fase-01 concluida)

---

## Decisoes de Implementacao

### DI-Plano01-fase01-detect-legacy-classificacao

`00-detect-legacy.ts` estava ausente do AUDIT.md preliminar (17 linhas). Adicionado como linha 1 (linha 18 final).
Todos os 5 behaviors do step sao **obsoletos** (D3): o step atual ABORTA ao detectar legacy v5.
Em v7, Step 2 detecta legacy mas NAO aborta — apenas popula `ctx.legacy`. O abort de re-entrada
fica em Step 1 (`01-reentry-gate`) via `legacy-manifest.json` existente.
- Por que: mecanismo muda completamente; nenhuma linha de teste do step atual e portavel.
- Impacto: zero gap de cobertura — Step 2 fase-02 e Step 1 fase-03 cobrem os conceitos equivalentes.

### DI-Plano01-fase01-reentry-guard-partial

`00_2-reentry-guard.ts` — 2 de 5 behaviors sao validos:
(a) "manifest ausente → pass silencioso / greenfield"
(b) "segundo run com manifest presente → aborta"
Mecanismo muda: v7 detecta `.claude/legacy-manifest.json` (nao `.anti-vibe-manifest.json`);
AbortError code=10 com mensagem apontando `/init:refresh` (nao `/sync`);
sem modos `re-populate` ou `__reentryMode`.
- Por que: PRD DR-1 + DV-3 exigem gate de re-entrada, mas implementacao e nova.
- Impacto: Plano 01 fase-03 cria novos testes RED para `01-reentry-gate.ts` cobrindo esses 2 behaviors.

### DI-Plano01-fase01-secrets-scan-port

`06-secrets-scan.ts` — 3 de 6 behaviors sao validos (DV-1):
- "scan vazio retorna 0 sem blocked"
- "match registrado em blockedFiles; arquivos limpos passam"
- "node_modules ignorada"
Behaviors obsoletos: "id contratual 06-secrets-scan" (muda para novo id), "registry position" (muda), "dry-run" (D4).
- Por que: DV-1 mantem secrets-scan como step proprio; logica real vai para Plano 02.
- Impacto: Plano 02 porta esses 3 tests para `03-secrets-scan.test.ts`.

### DI-Plano01-fase01-migrate-planning-partial

`11-migrate-2-planning.ts` — 2 de 4 behaviors validos:
- "planning/ presente → move com summary de entries/written/skipped, mutated=true"
- "conflito de destino → AbortError com mensagem clara"
Behavior "no-op" e parcialmente valido (criterio muda: ausencia do diretorio, nao ausencia de args['migrate']).
Behavior dry-run: obsoleto (D4).
Fonte/destino mudam: `.planning.v5-backup/` → `.claude/planning/`; `docs/exec-plans/active/` → `docs/specs/`.
- Por que: Plano 02 Step 2 faz o move mas caminho diferente.
- Impacto: Plano 02 cria novos testes cobrindo os 2 behaviors validos com novos caminhos.

### DI-Plano01-fase01-progress-txt-gap

`13-import-progress-txt.ts` — nenhum behavior e diretamente portavel:
- Step atual IMPORTA entries de progress.txt para docs/compound/_imported/
- V7 apenas REGISTRA o path no manifest como `type: compound`
O behavior "detectar arquivo e registrar no manifest" NAO tem teste existente.
Classificado como GAP-01 (nova cobertura necessaria em Plano 02, nao perda).
- Por que: comportamento muda de "importar" para "referenciar" (D8 analogia para progress.txt).
- Impacto: Plano 02 precisa escrever teste novo para "progress.txt detectado → entry no manifest".

### DI-Plano01-fase03-abort-code-10

`AbortError.code = 10` reservado para re-entry blocks. Codes em uso:
- `1`, `2` — legacy-scanner v6.7 (sera deletado em fase-05)
- `10` — re-entry (NOVO, esta fase — `01-reentry-gate.ts`)
Step e puro (read-only via `fs.stat`): sem imports de detect-stack, sem writes.
Mensagem aponta `/init:refresh when available (D13, post-v7)` — sem prometer a flag hoje.

---

## Bugs Descobertos

Nenhum bug encontrado durante fase-01 (auditoria de documentacao).

---

## Gotchas

### G-fase01-01: `00-detect-legacy` ausente do AUDIT.md preliminar

O AUDIT.md preliminar tinha 17 linhas. O step `00-detect-legacy.ts` (e seu `.test.ts`) estava ausente.
A instrucao da fase-01 alertava para adicionar esse step. Todos os behaviors sao obsoletos (D3).
Plano futuro (fase-05): incluir `00-detect-legacy.ts` e `00-detect-legacy.test.ts` no `git rm`.

### G-fase01-02: `06-secrets-scan.test.ts` importa `registry` para teste de posicao

O teste `registry: secretsScanStep apos reuseDiscoveryStep, antes de migrate0ParseDryRunStep` importa
`registry` de `../registry`. Apos fase-04 (reescrita do registry) e fase-05 (delete do step), este
import quebraria se o teste ainda existisse. Classificado como obsoleto (posicao no registry muda).
Ao deletar `06-secrets-scan.test.ts` em fase-05, o import morto some junto.

---

## Desvios do Plano

### DV-fase01-01: Contagem de behaviors

A instrucao mencionava "15+ steps" e depois "18 steps". Contagem final: 18 steps auditados.
Sem desvio material — a contagem 18 estava correta apos adicionar `00-detect-legacy`.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 1 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Behaviors auditados total | ~59 |
| Behaviors validos/parciais | 21 (14 validos + 7 parciais) |
| Behaviors obsoletos | ~38 |
| Steps 100% obsoletos | 10 |
| Steps com behaviors a portar | 8 |
| Gaps de cobertura nova | 2 (GAP-01, GAP-02 — nao bloqueantes) |

---

## Notas para Planos Seguintes

### Para Plano 01 fase-02 (`02-detect-legacy-and-stack.ts`)

- Behaviors validos a cobrir: "detecta stack nextjs via package.json", "detecta stack node-ts", "unknown quando sem signal"
- NAO escrever STATE.md — apenas popular `ctx.legacy` e `ctx.stack`
- `ctx.legacy` e `ctx.stack` sao campos opcionais em `StepContext` (DV-4); fase-02 estende o tipo

### Para Plano 01 fase-03 (`01-reentry-gate.ts`)

- Behaviors validos a cobrir: (a) "sem `.claude/legacy-manifest.json` → pass silencioso"; (b) "`.claude/legacy-manifest.json` existente → AbortError code=10 com mensagem apontando `/init:refresh`"
- Mecanismo: detectar presenca do arquivo (nao ler conteudo) — simples e robusto
- NAO usar `.anti-vibe-manifest.json` nem `__reentryMode` — esses artefatos sao v6.x

### Para Plano 02 (Step 2 + Manifest Schema)

- Behaviors validos de `11-migrate-2-planning` a portar: "planning/ presente → move + summary"; "conflito de destino → AbortError"
- Fonte/destino novos: `.claude/planning/` → `docs/specs/` (nao `.planning.v5-backup/` → `docs/exec-plans/active/`)
- Behaviors de `06-secrets-scan` a portar para `03-secrets-scan.ts`: "scan vazio 0", "match registrado", "node_modules ignorada"
- Nova cobertura a criar (GAP-01): "detectar `.claude/progress.txt` → entry `type: compound` no manifest"

### Para Plano 05 (Step 9 `copy-knowledge`)

- Behaviors validos de `03_1-persist-stack-and-knowledge` a portar: "runner recebe args corretos"; "summary vazia quando orchestrator emite logs, mutated=true"
- Sem refresh/dry-run — apenas o caminho greenfield

### Lista canonica de 18 steps a deletar em fase-05

```
00-detect-legacy.ts + .test.ts
00_1-reuse-discovery.ts + .test.ts
00_2-reentry-guard.ts + .test.ts
00_3-backup-pre-6_5_0.ts + .test.ts
06-secrets-scan.ts + .test.ts
09-migrate-0-parse-dry-run.ts + .test.ts
09_1-migrate-all-orchestrate.ts + .test.ts
10-backup-pre-mutation.ts + .test.ts
10-migrate-1-backup.ts + .test.ts
11-migrate-2-planning.ts + .test.ts
12-migrate-3-lessons.ts + .test.ts
13-import-progress-txt.ts + .test.ts
13-migrate-4-decisions.ts + .test.ts
13_1-migrate-knowledge-path.ts + .test.ts
03-detect-stack-and-register.ts + .test.ts
03_1-persist-stack-and-knowledge.ts + .test.ts
04-customize-architecture.ts + .test.ts
15-capabilities-discovery.ts + .test.ts
```

---

<!-- Atualizado automaticamente durante fase-01 em 2026-05-21 -->

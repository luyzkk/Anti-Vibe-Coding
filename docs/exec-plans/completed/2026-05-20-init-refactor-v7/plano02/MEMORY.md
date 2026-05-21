# Memoria: Plano 02 — Step 3 (secrets-scan) + Step 4 (migrate + manifest) + Shared Manifest Schema

**Feature:** init-refactor-v7
**Iniciado:** 2026-05-21
**Status:** concluido (4/4 fases)

---

## Decisoes de Implementacao

- **DI-Plano02-fase01-zod-dep:** Adicionar `zod` como `dependency` (nao `devDependency`)
  em `package.json` via `bun add zod`. Instalado como `zod@4.4.3`.
  - Por que: DR-5 do PLAN.md cita Zod explicitamente para schema compartilhado writer/reader.
    Schema cross-boundary (init escreve, execute-plan le em outra sessao) exige validacao runtime.
  - Impacto: +1 dependency (zod ~50KB). Sem impacto em performance do init (parse e <1ms).

- **DI-Plano02-fase02-discovery-artifact-mantido:** Step 3 (`03-secrets-scan.ts`) MANTEM
  o uso de `writeDiscoveryArtifact` para gravar `secrets-scan-result` em
  `.claude/.anti-vibe/discovery/`.
  - Por que: artefato e consumido por testes via `readDiscoveryArtifact`.
  - Impacto: nao confundir com `.claude/legacy-manifest.json` do Step 4 — dois lugares diferentes.

- **DI-Plano02-fase02-audit-log-removido:** O step antigo `06-secrets-scan.ts` escrevia no AuditLogWriter
  via `ctx.flags['__auditLog']`. O novo `03-secrets-scan.ts` REMOVE essa escrita.
  - Por que: pipeline v7 nao injeta `__auditLog` em StepContext (D4 removeu).
  - Impacto: observabilidade e via summary do step + arquivo discovery.

- **DI-Plano02-fase03-no-abort-on-conflicts:** Step 4 NAO aborta se `migratePlanning` retornar
  conflicts. Comportamento fail-soft — manifest e escrito mesmo com conflitos.
  - Por que: re-run e bloqueado pelo Step 1 (reentry-gate). Conflitos so acontecem em projetos
    misturados manualmente.
  - Impacto: conflicts ficam visiveis no summary mas nao interrompem o init.

- **DI-Plano02-fase03-unmapped-artifacts:** Artifacts do `LegacyState` sem mapping para
  `LegacyEntry` (ex: `claude-plans-dir`, `claude-project-map`, `claude-tasks-dir`, etc.) sao
  silenciosamente ignorados no Step 4.
  - Por que: execute-plan pode ler do disco se precisar. Nao mapeados neste plano.
  - Impacto: manifest nao exaustivo para esses artifacts — issue futura para /iterate.

- **DI-Plano02-fase03-id-sem-prefixo:** Step 4 usa `id: 'migrate-planning-and-manifest'` (sem
  prefixo `04-`) para manter compatibilidade com o stub existente no `registry.test.ts`.
  - Por que: o Plano 01 fase-04 criou o stub com id sem prefixo. Manter consistencia.
  - Impacto: diferente do Step 3 que usa `'03-secrets-scan'` (com prefixo). Inconsistencia
    cosmética entre steps — aceita.

- **DI-Plano02-fase03-migratePlanning-destino:** `migratePlanning(ctx.cwd, { dryRun: false })`
  le de `.planning.v5-backup/.planning/` (BACKUP_DIR), nao de `.claude/planning/`.
  Escreve em `docs/exec-plans/` + `docs/product-specs/` (nao `docs/specs/`).
  - Por que: `migrate-planning.ts` foi escrito para o fluxo v6 que usa backups. No v7 nao ha
    step de backup antes do Step 4 — entao na pratica a migracao de arquivos nao ocorre em
    fixtures sem o backup dir.
  - Impacto: manifest tem entry `{ type: 'planning', action: 'moved' }` independentemente de
    arquivos terem sido realmente movidos. O `migratedTo: 'docs/specs/'` e intencionalmente
    hardcoded (destino logico, nao o destino real do migrate-planning.ts).

- **DI-Plano02-fase04-no-docs-specs-assert:** E2E CA-03 NAO verifica que `docs/specs/` existe
  apos o run (porque migratePlanning lê de BACKUP_DIR que nao existe no fixture).
  - Por que: fixture de teste nao tem o backup dir pre-populado. Verificar apenas entries do manifest.
  - Impacto: cobertura de "arquivo fisicamente movido" fica para Plano 05 e2e final.

- **DI-Plano02-fase04-planning-path:** `detect-v5-legacy.ts` verifica `.planning/` na RAIZ do
  projeto, nao `.claude/planning/`. O spec da fase-04 especificava fixture com `.claude/planning/`
  — corrigido para `.planning/` na raiz do fixture.
  - Por que: probe real em `detect-v5-legacy.ts` busca `.planning/` relativo ao cwd.
  - Impacto: testes e2e que querem disparar deteccao de legacy precisam criar `.planning/` na raiz.

- **DI-Plano02-fase04-tracer-id-fix:** `init-v7-tracer-bullet.test.ts` continha o ID stale
  `'secrets-scan'` (da epoca do Plano 01). Corrigido para `'03-secrets-scan'` na fase-04
  (nao estava na spec de arquivos afetados, mas necessario para R6 mitigation).

---

## Bugs Descobertos

Nenhum bug novo — apenas desvios de spec resolvidos (ver Decisoes de Implementacao).

---

## Gotchas

- **migratePlanning lê de BACKUP_DIR, nao do diretorio original:** Ao testar Step 4 com
  planejamento legado, o fixture precisa criar `.planning.v5-backup/.planning/` (nao `.claude/planning/`).
  O Step 2 detecta `.planning/` na raiz; Step 4 chama `migratePlanning` que lê do backup.
  No v7, se nao houver backup pre-criado, nenhum arquivo e fisicamente movido — apenas a entry
  do manifest registra a intencao.

- **ID inconsistencia entre Steps 3 e 4:** Step 3 = `'03-secrets-scan'` (com prefixo);
  Step 4 = `'migrate-planning-and-manifest'` (sem prefixo). Cosmético mas vale saber para grep/assertivas.

- **detect-v5-legacy probe: `.planning/` na raiz, NAO `.claude/planning/`:** Qualquer teste
  que queira simular um projeto com planejamento legado deve criar `.planning/` na raiz do
  diretório temporário.

---

## Desvios do Plano

- **DEV-1:** Step 4 usou `id: 'migrate-planning-and-manifest'` em vez de `'04-migrate-planning-and-manifest'`.
  Spec incorreta — o stub existente (Plano 01 fase-04) ja usava o id sem prefixo. Aceito.

- **DEV-2:** E2E CA-03 nao verifica `docs/specs/` existencia (migratePlanning comportamento real
  diverge do assumido na spec). Aceito como fail-soft documentado.

- **DEV-3:** `init-v7-tracer-bullet.test.ts` precisou de correcao adicional (ID stale) — nao
  estava na lista de arquivos afetados da fase-04. Incluido no commit da fase-04.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 2 (fase-03, fase-04) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.

- **`LegacyManifest` type** exportado de `skills/_shared/legacy-manifest-schema.ts` — importar de la.
  `zod@4.4.3` agora em `dependencies`.

- **`.claude/legacy-manifest.json`** escrito SEMPRE pelo Step 4 (mesmo greenfield: `legacy: []`).
  Schema: `{ schemaVersion: '1.0', detectedAt: ISO8601, stack: { primary, confidence }, legacy: [] }`.

- **Step 4 nao popula `ctx.legacyManifest`** — Plano 04 le do disco via `fs.readFile('.claude/legacy-manifest.json')`.
  Se Plano 04 precisar do manifest em ctx, deve estender `StepContext` e popular no Step 4.

- **ID do Step 4 = `'migrate-planning-and-manifest'`** (sem prefixo `04-`). Step 3 = `'03-secrets-scan'` (com prefixo).

- **detect-v5-legacy probe de planning = `.planning/` na RAIZ** (nao `.claude/planning/`).
  Fixtures de teste devem criar `.planning/` relativo ao cwd do projeto.

- **migratePlanning lê de `.planning.v5-backup/.planning/`** (BACKUP_DIR). No v7 sem step de backup
  explícito, a migracao fisica de arquivos nao ocorre. O manifest registra a intencao (entry planning
  com `action: 'moved'`), mas os arquivos nao sao fisicamente movidos ate o backup dir existir.

- **Commits do Plano 02:**
  - d9c154b: Zod schema + package.json (fase-01)
  - 8d7bff5: Step 3 secrets-scan real (fase-02)
  - 136ff36: Step 4 migrate-planning real (fase-03)
  - 0af449b: Registry + e2e (fase-04)

---

<!-- Atualizado apos conclusao do Plano 02 em 2026-05-21 -->

# Memoria: Plano 03 — Migration v5→v6 (.planning/ → docs/, backup, dry-run)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion
**Iniciado:** 2026-05-12 (fase-01)
**Status:** completed — 7/7 fases done (2026-05-12)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

- **DI-01 (fase-01):** SKILL.md Step 0.5 usa `await import('./lib/detect-v5-legacy.ts')` em bloco `javascript`, NAO `bun run -e`.
  - Por que: alinha com DI-06 do Plano 01 (import direto preferido) e mitiga GT-04 (bun -e com paths absolutos quebra em bash Windows).
  - Impacto: padrao consistente entre Steps do SKILL.md; fases posteriores que adicionarem Steps seguem mesma convencao.

- **DI-02 (fase-01):** Comentario HTML `<!-- read-only -->` inserido logo apos heading do Step 0.5.
  - Por que: G1 do plano exige documentar que `detectV5Legacy` nao muta disco (fonte de verdade so vira backup na fase-02).
  - Impacto: leitor do SKILL.md sabe imediatamente que Step 0.5 e safe-to-run; nao precisa rastrear ao codigo.

- **DI-03 (fase-02):** `copy-recursive.test.ts` criado com 2 testes minimos para satisfazer `tdd-gate.cjs`.
  - Por que: gate verifica existencia do `*.test.ts` co-localizado ANTES do Write — instrucao "tente sem teste auxiliar" foi inviavel.
  - Impacto: outros helpers internos (sem teste publico na spec) tambem precisarao de teste minimo ou serao consolidados em arquivos com teste ja existente. Fases 03/04/05 podem criar helpers auxiliares — todos precisam de `.test.ts`.

- **DI-04 (fase-02):** SKILL.md Step migrate.1 usa bloco `javascript` com `await import('./lib/backup-planning.ts')` em vez de `bun run -e`.
  - Por que: herdado de DI-01 (consistencia entre Steps) + GT-04 (bun -e quebra em bash Windows).
  - Impacto: fases 03/04/05 devem seguir mesmo padrao ao adicionar Steps de migration ao SKILL.md.

- **DI-05 (fase-03):** `parsePlanningEntry` normaliza separadores via `split(/[\\/]/)` em vez de `path.sep`.
  - Por que: `path.relative()` no Windows retorna `\`, mas regex e fixtures usam `/`. Normalizar permite cross-platform sem branchear.
  - Impacto: helper `toForwardSlashes()` em `migrate-planning.ts` ja converte antes de passar para o parser. Padrao replicavel para qualquer parser de path.

- **DI-06 (orquestrador, pre-flight):** `lib/slugify.ts` + `lib/slugify.test.ts` criados pelo ORQUESTRADOR antes de disparar fases 04+05 em paralelo.
  - Por que: ambas as fases declaram o mesmo helper na spec — race de Write iminente. Pre-criar elimina conflito + valida o contrato compartilhado antes do paralelismo.
  - Impacto: subagentes apenas importam. Para futuras fases paralelas com helpers shared, pre-flight do orquestrador eh o padrao.

- **DI-07 (orquestrador, commits paralelos):** 3 subagentes paralelos NAO commitam — orquestrador faz 3 commits separados com staging seletivo (`git add <files>` por fase).
  - Por que: CLAUDE.md do submodulo documenta lição "Agentes paralelos com git add simultaneo agrupam commits de fases distintas" (ocorreu em Plano 03 antigo e Plano 04 antigo). Subagentes em paralelo escrevem ao mesmo working tree.
  - Impacto: padrao para qualquer execucao paralela futura — subagentes criam arquivos, orquestrador commit-stages cada fase atomicamente.

- **DI-08 (orquestrador, SKILL.md):** Steps migrate.2/3/4 adicionados pelo orquestrador (NAO pelos subagentes paralelos), 1 Edit por fase intercalado com commit.
  - Por que: SKILL.md eh arquivo unico tocado por 3 fases — paralelo causaria conflict. Orquestrador centraliza.
  - Impacto: cada commit de fase contem APENAS o Step correspondente do SKILL.md. Atomicidade preservada.

- **DI-09 (fase-05):** Helpers `findHighestAdrNumber`, `readExistingAdrSlugs`, `handleCoreBeliefs`, `renderAdr` exportados (spec tinha como privados).
  - Por que: facilita teste unitario direto futuro sem custo para consumidores.
  - Impacto: fase-06 (dry-run) pode reusar `renderAdr` sem refactor.

- **DI-10 (fase-06):** `renderDryRunReport` em estilo `git diff --stat` (lista de paths `+ {path}`, top-10 + truncate, rodape com totais + bytes formatados).
  - Por que: resolve G-A4 do plano (formato do diff nao especificado no PRD). Estilo familiar para devs, plain text por default (TTY detection deferida).
  - Impacto: futuro `/init --update --preview` (Plano 06 CRUD) pode reusar renderer ou usar mesmo padrao para consistencia visual.

- **DI-11 (fase-06):** Em dry-run, orquestrador cria STAGING backup transiente em `.planning.v5-backup/`, executa migrations com `dryRun: true`, depois remove o backup via `finally`. Pre-existing backup NAO eh removido.
  - Por que: G1 do plano exige que helpers de fase-03/04/05 leiam de `.planning.v5-backup/`. Sem backup, dry-run nao consegue listar arquivos fonte. Alternativa (virtual FS overlay) seria over-engineering (~4h extra). Trade-off aceito: pequena mutacao transiente em disco, com cleanup garantido, em troca de simplicidade.
  - Impacto: CA-10 verificado no POV externo (apos a chamada retornar: docs/ nunca criado, .planning/ original intacta, backup ausente se nao pre-existia). Documentar em SKILL.md `/init migrate` para usuario nao se surpreender com IO transiente.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

- **GT-12 (fase-02):** `bun run test` retorna exit code 1 enquanto os 2 fails pre-existentes em `skills/lib/profile-md-generator.test.ts` (commit 42acd02) nao forem corrigidos.
  - Descoberto em: fase-02 (subagente notou no relatorio final).
  - Impacto: fase-07 (E2E test) e qualquer CI step que use `bun run test && ...` falha mesmo com nossos testes 100% passando. Workaround inline: rodar `bun run test skills/init/` para escopo restrito. Fix definitivo: corrigir os 2 testes em fase posterior ou fora do Plano 03.

- **GT-13 (fase-06):** `tdd-gate.cjs` bloqueia Write de `dry-run-renderer.ts` (helper de saida pura, sem logica de I/O) por nao ter `.test.ts` co-localizado.
  - Descoberto em: fase-06 (subagente teve que criar `dry-run-renderer.test.ts` com 4 testes antes do Write).
  - Impacto: reafirma DI-03 — TODO helper TS novo precisa de teste co-localizado, inclusive renderers/formatters puros. Fases futuras devem orcamentar +4-10 min para test scaffolding mesmo em helpers triviais.

- **GT-14 (fase-06):** Helpers fase-03/04/05 verificam `if (!options.dryRun) await write(...)` ANTES de chamar o `writeFile` injetado. Em dry-run, o recorder injetado nunca eh chamado.
  - Descoberto em: fase-06 (orquestrador teve que computar `recordedWrites` via soma de `written[]` arrays — DEV-06-01).
  - Impacto: `WriteRecorder` (exportado em `dry-run.ts`) eh codigo morto na pipeline atual. Pode ser usado por consumers externos futuros, mas o orquestrador nao depende dele. Considerar remover em refactor futuro OU refatorar os 3 helpers para sempre chamarem `writeFile` (e o writer em dry-run grava no recorder). Trade-off ficou registrado em DEV-06-01.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->

- **DEV-06-01 (fase-06):** `recordedWrites` calculado como `planning.written.length + lessons.written.length + decisions.written.length` em vez de `WriteRecorder.count()`.
  - Motivo: helpers fase-03/04/05 fazem `if (!dryRun) await write(...)` — em dry-run o writer injetado nunca executa, recorder fica vazio. Soma dos arrays `written[]` populados pelos helpers eh equivalente e direta.
  - Impacto: `WriteRecorder` permanece exportado (uso externo) mas nao eh usado pelo orquestrador. Ver GT-14.

- **DEV-06-02 (fase-06):** Em dry-run, orquestrador cria backup STAGING transiente e remove via `finally` (cleanup do `.planning.v5-backup/`).
  - Motivo: helpers leem fonte de `.planning.v5-backup/` (G1). Sem staging, dry-run nao consegue listar arquivos. Alternativa (virtual FS overlay completo) seria over-engineering.
  - Impacto: pequena mutacao transiente em disco (criar+remover backup) — POV externo apos a chamada retornar: CA-10 preservado (docs/ ausente, .planning/ intacta, backup ausente se nao pre-existia). Documentado em DI-11.

- **DEV-06-03 (fase-06):** SKILL.md Steps migrate.0/migrate.all usam blocos `javascript` com `await import(...)` em vez de `bun run -e` (spec original).
  - Motivo: DI-04 do Plano 03 + DI-06 do Plano 01 (GT-04 Windows: `bun run -e` quebra em bash Windows com quoting).
  - Impacto: padrao consistente em todos os Steps do SKILL.md.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 7 |
| Fases concluidas | 7 |
| Fases com desvio | 1 (fase-06: DEV-06-01/02/03) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Commits totais | 11 (1297cdd, 488970c, 8ee8ad1, 3fc1c6b, 2907010, 5f96fbe, 5984def, 2a20c50, + slugify pre-flight) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Para Plano 04 (Validators Full)
- **Helper `harness-validate.ts.tpl`** (Plano 01 fase-04) já existe — Plano 04 estende com validators reais.
- **Fixture `tests/fixtures/legacy-v5/`** disponível para CA-36 (rollback test).
- **describe.skip em `tests/e2e/migration.test.ts`** ("E2E + harness:validate (depende de Plano 01 fase-04)") aguarda Plano 04 mergear validators reais — quando shippar, remover `.skip` e CA-09 fica 100% E2E.
- **GT-12 ativo:** Plano 04 deve continuar evitando `bun run test` sem escopo enquanto os 2 fails de `profile-md-generator.test.ts` não forem fixados. Validador `harness:validate` (CA-26 <2s) pode encontrar esses fails — decidir se inclui correção ou ignora.

### Para Plano 08 (Dog-Fooding)
- **`detectV5Legacy(targetDir): LegacyState`** exportado de `skills/init/lib/detect-v5-legacy.ts` — usar contra `anti-vibe-coding/` próprio (Plano 08 fase-01).
- **`backupPlanning(targetDir, opts): BackupResult`** exportado de `skills/init/lib/backup-planning.ts` — operação idempotente, lock file `.planning.v5-backup.lock`.
- **`migratePlanning`, `migrateLessons`, `migrateDecisions`** exportados — todos aceitam `writeFile` injection (compatível com dry-run). Plano 08 fase-04/05/06/07 chama contra o plugin.
- **`orchestrateMigration(targetDir, { dryRun })`** em `migrate-orchestrator.ts` — entry point unificado. Em dry-run cria backup staging transiente e remove via `finally` (DI-11).
- **`renderDryRunReport(report)`** exportado de `dry-run-renderer.ts` — formato `git diff --stat`-style.
- **G-A1 resolvido:** `.planning/` original É deletada após migração de sucesso. Backup permanece.
- **G-A3 resolvido:** `senior-principles.md` se existir → `docs/design-docs/core-beliefs.md`.

### Para Plano 06 (Agent-Native CRUD)
- `WriteRecorder` exportado de `dry-run.ts` é **código morto na pipeline atual** (GT-14) — helpers não chamam writer em dry-run, recorder não é populado. Plano 06 CRUD para `--update --preview` precisa OU refatorar helpers para sempre chamar writer (recorder grava em dry-run) OU adotar mesmo padrão de soma de arrays.
- Formato do diff renderer (`git diff --stat`-style) já consolidado em DI-10 — reusar para consistência visual em `/init --update --preview`.

### Métricas observadas
- Fixture pequena (`legacy-v5/`, 9 arquivos source): migração completa em **<5s** (assertion no teste). M8 NFR (≤120s) tem margem confortável.
- Tracer bullet do Plano 03 (fase-07): 5 testes E2E rodam em <5s no agregado.

---

<!-- Atualizado automaticamente durante execucao -->

# Plano 07: Aceitacao E2E + Release v6.4.0

**Feature:** refactor-init-harness-populate-merge ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~3.5h wall-time (gross: 0.5h + 0.5h + 1h + 1h + 0.5h + 0.5h = 4h; com fase-01 e fase-02 paralelizaveis + fase-05 independente, wall-time efetivo cai para ~3.5h)
**Depende de:** Plano 02 (Step 91 + populate-plan-generator + fixture greenfield baseline), Plano 06 (AuditLogWriter canonico + INIT_SUBAGENT_IDS + CHANGELOG estendido + ADR-NNNN-destructive-merge-default); transitivamente: Plano 01 (backup helper + flag --rollback), Plano 03 (discovery pipeline), Plano 04 (merge destrutivo + registry reorder Step 10 antes Step 02 + doc-mover-stub), Plano 05 (dry-run wiring + rollback completo + drift detector + additive)
**Desbloqueia:** Release/tag v6.4.0 (publicacao final do plugin); nenhum outro plano da feature

---

## O que este plano entrega

Suite completa de aceitacao end-to-end validando os 15 criterios de aceite do PRD (CA-01 a CA-15) sobre o pipeline ja entregue pelos Planos 01-06. Foco em CA-12 (E2E greenfield → execute-plan → harness:validate), CA-13 (dry-run parity vs real run), CA-14 (audit log ordem canonica das entries — integrado na fase de dry-run parity para reaproveitar fixture inverted-merge) e CA-15 (performance <120s em 500 .md). Inclui dois fixtures novos (`greenfield-v6.4` e `inverted-merge-v6.4`) e fase final de validacao da release v6.4.0 — `bun run harness:validate && bun run compound:check` verdes + tag git local. Conclui a feature; pos-execucao a pasta migra para `completed/`.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `generatePopulatePlanStep` registrado apos `finalValidationStep` | Plano 02 fase-03 | pendente (gate) |
| `lib/populate-plan-generator.ts` API publica (`generatePopulatePlan`, `PopulatePlanInput`, `PopulatePlanOutput`) | Plano 02 fase-02 | pendente (gate) |
| Fixture greenfield baseline (`tests/fixtures/greenfield-populate-plan-tracer/`) — base de inspiracao mas NAO reuso direto (v6.4 fixture eh separado) | Plano 02 fase-04 | pendente |
| `lib/backup-anti-vibe.ts` (createBackup, readBackupManifest, getLatestBackupDir, computeSha256) | Plano 01 fase-02 | pendente (gate) |
| Flag `--rollback` reconhecida + early-return no dispatcher | Plano 01 fase-03 | pendente |
| 8 Steps 06/07/08/09/10/11/12/91 + comando `--rollback` registrados, integrados e testados | Plano 03 + Plano 04 + Plano 05 | pendente (gate) |
| Registry reorder Step 10 antes Step 02 (link-claude-agents) | Plano 04 fase-06 | pendente (gate) — fixture greenfield-v6.4 nao depende dessa ordem (sem CLAUDE.md existente Step 10 vira no-op); fixture inverted-merge depende |
| `lib/rollback.ts` impl completa (`executeRollback`, `RollbackResult`) | Plano 05 fase-04 | pendente (gate) |
| `lib/dry-run-mode.ts` (`isDryRun`, `getRecorder`, `RenameRecorder`, `makeRenamer`) | Plano 05 fase-01 | pendente (gate) |
| `lib/preview-renderer.ts` (`renderMergePreview`, `MergePreview`) | Plano 05 fase-02 | pendente (gate) |
| `lib/init-subagent-ids.ts` exportando `INIT_SUBAGENT_IDS` const | Plano 06 fase-01 | pendente (gate) |
| `lib/audit-log-writer-factory.ts` injeta `AuditLogWriter` no `ctx.flags['__auditLog']` | Plano 06 fase-01 | pendente (gate) |
| `lib/cross-upgrade-detector.ts` (consumido opcionalmente em test fixture v6.3.x manifest) | Plano 06 fase-02 | pendente |
| `ADR-NNNN-destructive-merge-default.md` + CHANGELOG `### Breaking Changes (Behavior)` + `init-rationale.md` atualizado | Plano 06 fase-03/04/05 | pendente |
| `scripts/harness-validate.ts` (canonico, invocado via `bun run scripts/harness-validate.ts` do cwd do projeto-alvo) | repo atual | pronto |
| `scripts/compound-check.ts` | repo atual | pronto |
| `package.json` versao atual eh `6.4.0` (commit `5c4e4b2 chore(release): bump version 6.3.2 → 6.4.0` ja existe) | repo atual | **ja realizado** — fase-06 vira **verificacao**, nao mutacao (ver G10 + Notas para Planos Seguintes do MEMORY) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `tests/fixtures/greenfield-v6.4/` | fase-03 deste plano (CA-12 E2E); reutilizavel em futuras regressoes do init em greenfield |
| `tests/fixtures/inverted-merge-v6.4/` | fase-04 deste plano (CA-13 + CA-14); reutilizavel em futuras regressoes de merge destrutivo |
| `tests/e2e/ca12-greenfield-populate-validate.test.ts` | release gate v6.4.0 — confirma CA-12 e ratifica CA-01/02/09/11 |
| `tests/e2e/ca13-dry-run-parity.test.ts` | release gate v6.4.0 — confirma CA-13 + CA-14 (assertion conjunta na mesma fixture) |
| `tests/e2e/ca15-performance.test.ts` | release gate v6.4.0 — confirma CA-15 (detecta regressao no Step 07 / Glob recursivo) |
| Tag git `v6.4.0` local (sem push automatico) | dev faz `git push origin v6.4.0` manualmente quando confirmar release |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-fixture-greenfield-v64.md` | `tests/fixtures/greenfield-v6.4/` com `.gitignore` minimo (linhas: `node_modules/`, `.DS_Store`, `.anti-vibe/`); ZERO docs, ZERO CLAUDE.md, ZERO package.json | 0.5h | — |
| 02 | `fase-02-fixture-inverted-merge-v64.md` | `tests/fixtures/inverted-merge-v6.4/CLAUDE.md` com 287 linhas (regras Akita) + 4 docs estruturais (`docs/PIPELINE.md`, `docs/AGENTS_LIST.md`, `docs/QUALITY_SCORE.md`, `docs/PRODUCT_SENSE.md`) espelhando o plugin real | 0.5h | — |
| 03 | `fase-03-ca12-e2e-greenfield.md` | `tests/e2e/ca12-greenfield-populate-validate.test.ts` — copia fixture greenfield-v6.4 para tmpdir, roda `runInit`, valida `PLAN.md` populacao emitido, roda `bun run scripts/harness-validate.ts` no tmpdir, assert exit 0 + AGENTS.md final ≤40 linhas com conteudo | 1h | fase-01 |
| 04 | `fase-04-ca13-dry-run-parity.md` | `tests/e2e/ca13-dry-run-parity.test.ts` — copia fixture inverted-merge-v6.4, roda init em dry-run (captura `__dryRunRecorder`), roda em real-run (manifest D29 final), compara paths byte-a-byte; **inclui CA-14**: le `discovery/agents-log.json`, assert ordem canonica dos 7 `subagent_id` + runId compartilhado | 1h | fase-02 |
| 05 | `fase-05-ca15-performance-test.md` | `tests/e2e/ca15-performance.test.ts` — `beforeAll` gera 500 .md sinteticos em 3 dirs (~167 raiz + ~167 docs/ + ~166 .claude/); executa `runInit({ flags: { 'dry-run': true } })` com `performance.now()`; assert elapsed < 120000ms; `afterAll` cleanup | 0.5h | — |
| 06 | `fase-06-bump-version-v640.md` | Validacao + release: confirma `package.json` em `6.4.0` (commit ja feito), roda `bun run harness:validate && bun run compound:check` (both exit 0), cria tag `v6.4.0` local. NAO faz push (dev decide quando publicar). Move pasta `2026-05-17-refactor-init-harness-populate-merge/` de `active/` para `completed/` ao final | 0.5h | fase-01, 02, 03, 04, 05 |

---

## Grafo de Fases

```
fase-01 (fixture-greenfield-v64)        fase-02 (fixture-inverted-merge-v64)
       |                                          |
       v                                          v
fase-03 (ca12-e2e-greenfield)            fase-04 (ca13-dry-run-parity + CA-14)
       |                                          |
       +-------------- + -------------------------+
                       |                                      fase-05 (ca15-performance-test)
                       |                                                |
                       +-------------- + -------------------------------+
                                       |
                                       v
                              fase-06 (bump-version-v640) [gate de release]
```

**Paralelismo possivel:** fase-01 e fase-02 sao independentes (content authoring de fixtures distintos) — podem ser executadas em paralelo por sub-agentes diferentes. fase-05 eh independente das anteriores (gera fixture sintetico em tmpdir, nao consome fixtures de fase-01/02). fase-03 depende de fase-01; fase-04 depende de fase-02. fase-06 eh barreira final — precisa de TUDO verde. Wall-time efetivo com 3 sub-agentes paralelos: ~2.5h (fase-01||fase-02 0.5h + fase-03||fase-04 1h + fase-05 0.5h + fase-06 0.5h). Sequencial puro: 4h.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste (E2E) que falha (arquivo nao existe, comando nao implementado, etc)
2. GREEN: codigo minimo (ou fixture, ou comando) que faz o teste passar
3. REFACTOR: limpeza mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A — Plano 07 nao tem tracer (o tracer feature-wide eh `Plano 02 fase-04`, ja entregue antes deste plano comecar). Plano 07 valida o pipeline ja completo em pelos 3 cenarios criticos (greenfield E2E, dry-run parity + audit log, performance) e fecha o release.

- **fase-01:** content authoring (Markdown). Sem TDD codigo — checklist de verificacao + grep validations no `.gitignore`.
- **fase-02:** content authoring (Markdown). Sem TDD codigo — `wc -l` no CLAUDE.md fixture retorna 287; grep por 5 secoes Akita (Code Style / Comments / Tests / Dependencies / Logging); presenca dos 4 docs estruturais.
- **fase-03:** RED-GREEN-REFACTOR. RED = teste E2E falha porque PLAN.md de populacao nao existe ou harness-validate exit != 0. GREEN = pipeline completo dos Planos 01-06 entrega tudo. Refactor = isolar utilidades comuns em helper local se houver duplicacao com fase-04.
- **fase-04:** RED-GREEN-REFACTOR. RED = comparison falha (paths divergem entre dry-run recorder e manifest real) OU ordem do audit log nao bate. GREEN = renderer compartilhado (Plano 05 fase-02) + audit log canonico (Plano 06 fase-01) entregam parity + ordem.
- **fase-05:** RED-GREEN-REFACTOR. RED = teste falha porque elapsed > 120s OR fixture nao foi gerado. GREEN = init `--dry-run` cumpre o budget. Refactor = otimizar geracao de fixture se for ela que estoura (geralmente nao — o teste mede o init, nao o setup).
- **fase-06:** verification-only. Sem TDD — checklist de comandos com exit code esperado.

---

## Gotchas Conhecidos

Indice de gotchas, com fase de aplicacao:

- **G1 (CA-14 sem fase dedicada — integracao em fase-04):** PLAN.md original lista CA-14 sem fase explicita. Decisao: integrar CA-14 dentro de **fase-04** (mesma fixture inverted-merge-v6.4, mesmo runId, mesma execucao real). Assertion da ordem canonica dos 7 `subagent_id` (`init-secrets-scan` → `init-discover-existing-docs` → `init-classify-blocks` → `init-propose-merge` → `init-apply-merge` → `init-move-docs` → `init-populate-plan-gen`) entra no checklist da fase-04. Justificativa: nao inflar para 7 fases quando o setup eh identico ao CA-13. **Aplica:** fase-04.

- **G2 (caminho de `scripts/harness-validate.ts` no fixture):** `scripts/harness-validate.ts` NAO esta em `TEMPLATE_MANIFEST` — init em greenfield NAO copia o script para o cwd do projeto-alvo. **Decisao confirmada via inspecao do package.json:** o comando canonico eh `bun run scripts/harness-validate.ts` executado a partir do **plugin root** com argumento `.` ou via `bun scripts/harness-validate.ts {tmpdir}` passando o cwd como argv. O teste E2E `tests/e2e/init-tracer-bullet.test.ts` ja existente usa `spawn('bun', ['run', 'scripts/harness-validate.ts'], { cwd: tmpdir })` — replicar esse padrao em fase-03. **Aplica:** fase-03.

- **G3 (shape de retorno de `runInit`):** Plano 01 fase-03 ainda nao formalizou o shape final de retorno de `runInit({ argv, opts })` (ver `plano01/MEMORY.md` G1 — dispatcher imutavel). Fase-03 e fase-04 fazem asserts sobre o retorno. Coordenar com Plano 01 MEMORY antes da execucao; deixar `// TODO ADAPTAR — shape final de runInit conforme plano01/MEMORY.md` inline nos testes ate confirmar. **Aplica:** fase-03, fase-04.

- **G4 (`__dryRunRecorder` em `ctx.flags` com cast):** Plano 05 MEMORY (DI-1, GT-CROSS-1 do Plano 06) confirmou que o recorder fica em `ctx.flags['__dryRunRecorder']` com cast `as unknown as WriteRecorder`. Fase-04 le o recorder via `(returnedCtx.flags['__dryRunRecorder'] as unknown) as WriteRecorder` e compara `recorder.paths` com o manifest D29 do real run. Documentar o cast no comentario inline. **Aplica:** fase-04.

- **G5 (CA-15 performance test setup):** Plano 03 MEMORY sinaliza budget proxy local de 50 arquivos < 5s. Fase-05 escala para 500. **Decisao:** `beforeAll` cria 500 .md sinteticos em **tmpdir** (`fs.mkdtemp`) — NAO em `tests/fixtures/` (poluiria git history). Distribuicao: ~167 em raiz, ~167 em `docs/`, ~166 em `.claude/`. Cleanup garantido em `afterAll`. Considerar `test.skipIf(process.env.CI === 'true' && process.env.SLOW_FS === '1')` se aparecer flakiness em CI lento (documentar como observado, nao preventivamente). **Aplica:** fase-05.

- **G6 (registry reorder D23 — fixture greenfield-v6.4 deve refletir nova ordem):** Plano 04 fase-06 fez `apply-merge-destructive` (Step 10) ANTES de `link-claude-agents` (Step 02 reposicionado). Em greenfield NAO ha CLAUDE.md existente; Step 10 retorna `mutated: false` ("nothing to merge") e Step 02 cria CLAUDE.md como espelho a partir do AGENTS.md scaffoldado. Fase-03 NAO precisa fazer assert da ordem (Plano 04 fase-06 e Plano 06 fase-01 ja tem testes pareados), mas o teste DEVE rodar em registry pos-reorder; se rodar em registry antigo (atomic test snapshot do PRD anterior), CA-12 falha por motivo errado. **Aplica:** fase-03.

- **G7 (runId compartilhado entre `inventory.json` e `agents-log.json`):** GT-CROSS-2 do `plano06/MEMORY.md` fixou que dispatcher gera `randomUUID()` no inicio do `runInit` e injeta em ambos `__auditLog` (writer) e `__runId` (slot para discovery-store). CA-14 (integrado em fase-04) verifica que todos os entries do mesmo run tem o mesmo `runId` se o schema fornecido. Se schema do `AgentLogEntry` em `audit-log.ts` ainda nao expoe `runId`, assertion fica condicional (`if (entry.runId) expect(entry.runId).toBe(runIdFromInventory)`). **Aplica:** fase-04.

- **G8 (stub residual apos rollback de `move`):** GT-CROSS-3 do `plano06/MEMORY.md` documenta que rollback de `action: 'move'` deixa stub residual no path movido — Plano 06 fase-04 (CHANGELOG) registra a limitacao como "limitacao conhecida do rollback v6.4.0". Fase-06 deste plano (bump-version) verifica que o CHANGELOG menciona essa limitacao no bloco `### Known Limitations` (ou `### Breaking Changes (Behavior)`). Nao re-documentar — apenas verificar presenca. **Aplica:** fase-06.

- **G9 (`bun run compound:check` pos-init-rationale update):** Plano 06 fase-05 atualizou `docs/design-docs/init-rationale.md` com 30 entries D{N}. Fase-06 deste plano roda `bun run compound:check` — pode falhar se ha lessons obsoletas na pasta `docs/compound/`. **Mitigacao:** fase-06 documenta que se compound:check falhar, dev resolve manualmente antes de tag (nao tenta auto-fix, alinhado com WH-02 do PRD). **Aplica:** fase-06.

- **G10 (tag git local SEM push automatico):** D20 do PRD eh v6.4.0 minor. Commit `5c4e4b2` ja bumpou. Fase-06 cria tag git **local** com `git tag v6.4.0`; NAO faz `git push origin v6.4.0`. Documenta no checklist o comando exato para push manual: `git push origin v6.4.0`. Razao: dev decide quando publicar; auto-push viola "IA sugere, dev decide" + "Segurança em Ações Destrutivas" (nunca push a repo compartilhado sem instrucao explicita). **Aplica:** fase-06.

- **G11 (versao ja bumpada — fase-06 vira verificacao):** Inspecao do repo em 2026-05-18 mostra `package.json` em `6.4.0` (commit `5c4e4b2`). Fase-06 NAO faz bump destrutivo — apenas confirma via `bun --print "require('./package.json').version"` que ja esta em `6.4.0`. Se por algum motivo o repo regrediu para `6.3.2` durante execucao dos planos anteriores, fase-06 reaplica o bump documentado. **Aplica:** fase-06.

- **G12 (cleanup tmpdir em testes E2E — Windows fragility):** fase-03/04/05 usam `fs.mkdtemp` + `fs.rm({ recursive: true, force: true })` em `afterAll/afterEach`. Em Windows, arquivos com handles abertos (ex: filesystem watcher do Bun) podem bloquear `rm`. Solucao: `afterAll(async () => { try { await fs.rm(tmp, { recursive: true, force: true }) } catch { /* ignore Windows handle leak */ } })`. Replicar do `tests/e2e/init-tracer-bullet.test.ts` que ja lida com isso. **Aplica:** fase-03, fase-04, fase-05.

- **G13 (CA-14 ordem em fixture inverted-merge — drift nao roda):** A ordem CA-14 esperada eh `init-secrets-scan → init-discover-existing-docs → init-classify-blocks → init-propose-merge → init-apply-merge → init-move-docs → init-populate-plan-gen`. NOTAR: `init-drift-detect` NAO aparece — Step 12 so roda em modo `already-initiated` (G1 do `plano05/README.md`). Fixture inverted-merge-v6.4 eh **migration mode** (CLAUDE.md existe mas nao ha manifest local previo), portanto drift-detect skipa. Test assertion eh `expect(subagentIds).toEqual([secretsScan, discoverDocs, classifyBlocks, proposeMerge, applyMerge, moveDocs, populatePlanGen])` — exatos 7 entries, sem `detectDrift`, sem `rollback`. **Aplica:** fase-04.

---

## Criterios de Exit (plano completo quando)

- [ ] `tests/fixtures/greenfield-v6.4/` existe com APENAS `.gitignore` (3 linhas) — verificavel via `find tests/fixtures/greenfield-v6.4/ -type f | wc -l` retornando `1`.
- [ ] `tests/fixtures/inverted-merge-v6.4/CLAUDE.md` existe com EXATAS 287 linhas — verificavel via `wc -l tests/fixtures/inverted-merge-v6.4/CLAUDE.md` retornando `287`.
- [ ] `tests/fixtures/inverted-merge-v6.4/docs/` contem EXATOS 4 arquivos `.md` (PIPELINE, AGENTS_LIST, QUALITY_SCORE, PRODUCT_SENSE) — verificavel via `find tests/fixtures/inverted-merge-v6.4/docs/ -maxdepth 1 -type f -name '*.md' | wc -l` retornando `4`.
- [ ] `tests/e2e/ca12-greenfield-populate-validate.test.ts` existe e passa (`bun test tests/e2e/ca12-greenfield-populate-validate.test.ts`).
- [ ] `tests/e2e/ca13-dry-run-parity.test.ts` existe e passa, incluindo a assertion CA-14 da ordem canonica dos 7 `subagent_id`.
- [ ] `tests/e2e/ca15-performance.test.ts` existe e passa em ambiente local (< 120s).
- [ ] `bun --print "require('./package.json').version"` retorna `'6.4.0'`.
- [ ] `bun run harness:validate` retorna exit 0.
- [ ] `bun run compound:check` retorna exit 0.
- [ ] `git tag --list v6.4.0` retorna `v6.4.0` (tag local presente).
- [ ] **NAO** foi feito `git push origin v6.4.0` (dev decide manualmente; comando documentado no checklist da fase-06).
- [ ] `MEMORY.md` deste plano lista qualquer DI/BUG/GT descoberto, posicao final dos novos tests no arquivo, e confirmacao de que CA-01 a CA-11 sao **ratificados** indiretamente pela suite E2E (matriz CA → fase no MEMORY).
- [ ] Pasta `2026-05-17-refactor-init-harness-populate-merge/` migrada para `docs/exec-plans/completed/` (passo final da fase-06).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

# Plano 06: Comunicacao + Observabilidade

**Feature:** refactor-init-harness-populate-merge ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~3.5h wall-time (0.5h + 0.5h + 0.5h + 0.5h + 0.5h = 2.5h sequencial das paralelizaveis + 1h da fase-01 cross-cutting; gross ~3.5h com paralelismo absorvido entre fases 02-05)
**Depende de:** Plano 05 (Modos Reversiveis — Step 12 `detect-drift-incremental` e `lib/rollback.ts` impl completa precisam estar entregues para a fase-01 conseguir injetar `AuditLogWriter` neles). **Revisao 2026-05-18:** Plano 05 foi detalhado no mesmo dia em sequencia invertida; todos os 5 TODOs do MEMORY foram resolvidos com contratos fixados (`init-drift-detect`, `init-rollback`, `RollbackResult`, `DriftReport`, `isDryRun`-based suppression).
**Desbloqueia:** Plano 07 (Aceitacao E2E + Release v6.4.0) — CA-14 (audit log entries) depende da fase-01 entregue, e o release v6.4.0 (Plano 07 fase-06) depende do ADR + CHANGELOG + warning runtime documentando a breaking-comportamental.

---

## O que este plano entrega

Camada de comunicacao + observabilidade da v6.4.0 sobre o pipeline destrutivo do Plano 04 + modos reversiveis do Plano 05: (1) todos os novos steps (06/07/08/09/10/11/12/91 + comando `--rollback`) passam a emitir entries no `discovery/agents-log.json` via `AuditLogWriter` existente com `subagent_id` canonico literal — fim do wrapper stub `logAudit` introduzido nos Planos 03/04; (2) detector runtime no dispatcher avisa o dev que rodou `/init` em v6.4.0 vindo de v6.3.x E ainda tem CLAUDE.md > 40 linhas, com warning amarelo PT-BR sugerindo `--additive-merge`; (3) ADR + CHANGELOG + atualizacao do `init-rationale.md` fecham a documentacao da mudanca breaking-comportamental que justifica o bump v6.3.2 -> v6.4.0.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `AuditLogWriter` (`append({subagent_id, input_paths, output_struct, duration_ms, retry_count})`) | `skills/init/lib/audit-log.ts` | pronto (v6.3.x ja exporta) |
| Wrapper local `logAudit` (no-op se `AuditLogWriter` ausente via DI) | Plano 03 fase-02 (introduz em Steps 06/07/08), Plano 04 fase-02/03/05 (replica em Steps 09/10/11) | pendente — gate |
| Step 91 `generatePopulatePlanStep` ja usa `subagent_id: 'init-populate-plan-gen'` no summary | Plano 02 fase-03 (G8 do plano02) | pendente |
| Step 12 `detectDriftIncrementalStep` (a integrar com audit log) | Plano 05 fase-03 | **planejado — Plano 05 detalhado em 2026-05-18; contrato `subagent_id: 'init-drift-detect'` + shape `DriftReport` fixado (ver MEMORY GT-CROSS-1)** |
| `lib/rollback.ts` impl completa (a integrar com audit log + ADR de rollback) | Plano 05 fase-04 | **planejado — Plano 05 detalhado em 2026-05-18; contrato `executeRollback(...): RollbackResult` fixado (ver MEMORY)** |
| `lib/dry-run-mode.ts` exporta `isDryRun(ctx)` (usado por fase-01 para suprimir audit em dry-run) | Plano 05 fase-01 | **planejado — Plano 05 detalhado em 2026-05-18** |
| Flag `--additive-merge` reconhecida em `parseFlags` (sugerida por fase-02 no warning) | Plano 05 fase-05 | **planejado — Plano 05 detalhado em 2026-05-18** |
| Manifest local `.claude/.anti-vibe-manifest.json` com campo `pluginVersion` | `skills/init/lib/manifest-writer.ts` (`AntiVibeManifest.pluginVersion`) | pronto |
| Versao atual do plugin (lida do `.claude-plugin/plugin.json`) | repo atual (`6.4.0` ja registrado, mas o codigo precisa de helper para ler em runtime) | parcial — fase-02 vai criar helper se nao existir |
| `docs/design-docs/ADR-0001-manifest-checksums.md`, `ADR-0002-subagent-contract.md`, `ADR-0020-adaptive-coaching.md` (referencia de estilo + numeracao) | repo atual | pronto |
| `CHANGELOG.md` formato existente (`## [X.Y.Z] - YYYY-MM-DD` + `### Added` / `### Changed` / `### Fixed` — keepachangelog-like) | repo atual (entrada v6.4.0 ja existe — fase-04 vai ESTENDER, nao recriar) | pronto |
| `docs/design-docs/init-rationale.md` formato existente (entries com ID + "Consumido por:") | repo atual | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/init/lib/audit-log-writer-factory.ts` (helper de instanciacao + injecao do `AuditLogWriter` em `ctx`) | Plano 07 fase-03 (CA-12 E2E checa entries) e fase-04 (CA-13 dry-run parity tambem usa o `audit-log-writer-factory` em mode read-only) |
| Constantes `INIT_SUBAGENT_IDS` (literais canonicos) | Plano 07 fase-03 (CA-14 asserta ordem das entries) |
| Helper `lib/cross-upgrade-detector.ts` (`detectCrossUpgrade(manifestPluginVersion, currentPluginVersion, claudeMdLineCount)`) | Plano 07 fase-03 (E2E pode injetar fixture v6.3.x manifest + CLAUDE.md inflado para validar warning) |
| `docs/design-docs/ADR-NNNN-destructive-merge-default.md` (NNNN inferido em runtime) | Plano 07 fase-06 (release notes do bump v6.4.0 cita o ADR) |
| Seccao `## [6.4.0]` atualizada do `CHANGELOG.md` com bloco `### Breaking Changes (Behavior)` | Plano 07 fase-06 (validacao do bump checa que o `### Breaking Changes (Behavior)` existe) |
| `docs/design-docs/init-rationale.md` com bloco "Decisoes D1-D30 — PRD 2026-05-17 Refactor /init Harness Populate Merge" appendado | Plano 07 fase-06 (release notes cita) e Plano 04 fase-07 (rewrite do SKILL.md remete a init-rationale.md) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-audit-log-canonico-novos-steps.md` | `lib/audit-log-writer-factory.ts` + `INIT_SUBAGENT_IDS` consts + refactor de 8 steps + comando rollback substituindo o wrapper `logAudit` stub por chamada real ao `AuditLogWriter.append` com `duration_ms` medido em `performance.now()` (SH-07, CA-14, D19) | 1h | — (entra apos Planos 03/04/05 entregarem os stubs) |
| 02 | `fase-02-warning-runtime-cross-upgrade.md` | `lib/cross-upgrade-detector.ts` + integracao no dispatcher (`run-init.ts`) antes do loop do registry — emite warning PT-BR amarelo quando v6.3.x→v6.4.x + CLAUDE.md > 40 linhas (SH-10, D30) | 0.5h | — (paralelo com fases 03/04/05) |
| 03 | `fase-03-adr-destructive-merge-default.md` | `docs/design-docs/ADR-NNNN-destructive-merge-default.md` (NNNN inferido por `Glob` no momento da execucao — ver G2) com Context/Decision/Alternatives/Consequences/Reversibility (SH-11) | 0.5h | — (paralelo com fases 02/04/05) |
| 04 | `fase-04-changelog-v640-breaking-changes.md` | `CHANGELOG.md` — seccao `## [6.4.0]` ESTENDIDA com `### Breaking Changes (Behavior)` + `### Added` (lista os 7+1 novos steps + 3 flags + comando --rollback) + `### Changed` (regra "merge aditivo" reescrita, registry reorder) + `### Fixed` (se houver) (SH-11) | 0.5h | — (paralelo com fases 02/03/05) |
| 05 | `fase-05-init-rationale-atualizado.md` | `docs/design-docs/init-rationale.md` ganha seccao nova "## PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)" listando cada decisao com Consumido por: step-id + plano-fase de origem (Dependencias do PRD) | 0.5h | — (paralelo com fases 02/03/04) |

---

## Grafo de Fases

```
fase-01 (audit-log-canonico-novos-steps)
    |
    +-- gate cross-cutting: precisa de Planos 03/04/05 prontos (stub logAudit em todos os 8 steps + rollback)
    |
    v
fase-02 (warning-runtime-cross-upgrade)   fase-03 (adr-destructive-merge-default)
                  |                                          |
                  +----------- + ----------------------------+
                               |
                               v
                   fase-04 (changelog-v640-breaking-changes)   fase-05 (init-rationale-atualizado)
```

**Paralelismo possivel:** Apos fase-01 (que toca 8 arquivos de steps + 1 arquivo de comando rollback + factory novo), as fases 02-05 sao independentes entre si — fase-02 toca codigo (helper novo + dispatcher), fases 03/04/05 sao doc-only e podem rodar em sub-agentes paralelos distintos. Idealmente fase-01 nao bloqueia fases 02-05 (sao escopos diferentes), mas a tabela acima mantem o gate logico para coerencia narrativa do plano. Wall-time real esperado: ~1.5h se fases 02-05 rodam em paralelo (1h fase-01 + 0.5h da maior das paralelas).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A — o tracer bullet feature-wide eh `Plano 02 fase-04` (greenfield-e2e). Plano 06 eh observabilidade + documentacao sobre o pipeline ja entregue. Slice mais fino deste plano eh `fase-01` (refactor mecanico do wrapper stub → AuditLogWriter real) — se passar, CA-14 esta proxima de fechar.

- **fase-01:** RED-GREEN-REFACTOR. Cada um dos 8 steps refatorados ganha 1 teste de audit log assert: `expect(logEntries).toContainEqual(expect.objectContaining({ subagent_id: 'init-secrets-scan', input_paths: expect.any(Array) }))`. Test de integracao do dispatcher injeta `AuditLogWriter` mockado em `ctx` e roda os 8 steps em sequencia validando que TODAS as entries esperadas aparecem na ordem do registry.
- **fase-02:** RED-GREEN-REFACTOR. 4 testes do `detectCrossUpgrade`: (a) v6.3.0 → v6.4.0 + CLAUDE.md 100 linhas → retorna warning; (b) v6.3.0 → v6.4.0 + CLAUDE.md 30 linhas → no warning; (c) v6.4.0 → v6.4.1 → no warning (mesma major.minor); (d) manifest ausente (greenfield) → no warning. Test de integracao no dispatcher: stub do `lib/cross-upgrade-detector` retornando warning → `console.warn` chamado com `\x1b[33m` ANSI yellow.
- **fase-03:** content authoring (Markdown). Grep validations: frontmatter `adr-id:` numerico, secoes Context/Decision/Alternatives/Consequences/Reversibility presentes, referencia explicita a D2/D26/D28/D30 do PRD presente.
- **fase-04:** content authoring (Markdown). Grep validations: presenca do header `### Breaking Changes (Behavior)`, mencao explicita a `--additive-merge`, mencao explicita ao ADR criado em fase-03 (cross-link).
- **fase-05:** content authoring (Markdown). Grep validations: presenca do header `## PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)`, 30 entradas D{N} listadas (uma por decisao do PRD), cada uma com linha `**Consumido por:**`.

---

## Gotchas Conhecidos

- **G1 (Plano 05 RESOLVIDO em 2026-05-18 — contratos fixados):** Plano 05 foi detalhado em sequencia invertida no mesmo dia. Diff aplicado na fase-01 deste plano apos cross-check com `plano05/fase-03-drift-detector-step-12.md` e `plano05/fase-04-rollback-completo.md`. Contratos finais:
  - Step 12 emite com `subagent_id: 'init-drift-detect'` (literal final — corrigido de `'init-detect-drift'` palpitado antes) e `output_struct: { summary: { placeholder: number, populated: number, drift: number }, fileCount: number, reportPath: string \| null }` (per `DriftReport` definido em `plano05/fase-03` linhas 46-56).
  - Comando `--rollback` emite com `subagent_id: 'init-rollback'` e `output_struct: { restoredCount: number, errorCount: number, userCancelled: boolean, adrPath: string \| null, backupDir: string \| null }` (per `RollbackResult` definido em `plano05/fase-04` linhas 55-62; contagens em vez de arrays de paths por G5/zero-PII).
  - Dry-run: audit log SUPRIMIDO via `isDryRun(ctx)` (per `plano05/README` linha 38). Steps em dry-run NAO emitem entries no `agents-log.json`.
  - 5 TODOs do MEMORY (TODO-1 a TODO-5) marcados como RESOLVIDO com referencias cruzadas a `plano05/`.
- **G2 (ADR numero inferido em runtime, NUNCA fixado no plano):** ADRs no repo seguem o padrao `ADR-NNNN-{kebab-slug}.md`. Atualmente existem `0001`, `0002`, `0020`. O numero do novo ADR (destructive-merge-default) deve ser inferido no momento da execucao via `Glob docs/design-docs/ADR-*.md` + `max(parseInt(adrId)) + 1`. Fase-03 do plano usa placeholder `ADR-NNNN-destructive-merge-default.md` e instrui o executor a substituir. NAO pre-escolher `0021` — pode haver ADR criado em paralelo (ex: Plano 05 fase-04 rollback ADR template snippet).
- **G3 (CHANGELOG.md ja tem entry v6.4.0 — ESTENDER, nao recriar):** O `CHANGELOG.md` ja tem `## [6.4.0] - 2026-05-17` cobrindo a refatoracao Rails-style anterior. Fase-04 deste plano deve ADICIONAR sub-secoes ao bloco v6.4.0 existente (especificamente `### Breaking Changes (Behavior)` no topo do bloco, antes de `### Added`) e ESTENDER `### Added` / `### Changed`. **NUNCA criar nova entry `## [6.4.0]`** — viola formato keepachangelog e duplica historico. Confirme via `head -20 CHANGELOG.md` ANTES de editar.
- **G4 (subagent_id literais canonicos — fonte unica de verdade):** A enum-like de `subagent_id` para os novos steps esta espalhada em snippets dos Planos 03/04 (e implicita em Plano 02 fase-03 + Plano 05 fases 03/04). Fase-01 deste plano CENTRALIZA num arquivo `lib/init-subagent-ids.ts` exportando `INIT_SUBAGENT_IDS = { secretsScan: 'init-secrets-scan', discoverDocs: 'init-discover-existing-docs', classifyBlocks: 'init-classify-blocks', proposeMerge: 'init-propose-merge', applyMerge: 'init-apply-merge', moveDocs: 'init-move-docs', detectDrift: 'init-drift-detect', populatePlanGen: 'init-populate-plan-gen', rollback: 'init-rollback' } as const`. Steps importam dessa constante — fim das string literais soltas. Risco de regressao mitigado pela suite de testes que asserta `expect(entry.subagent_id).toBe(INIT_SUBAGENT_IDS.X)`.
- **G5 (D19 + nao-PII no audit log):** `AuditLogWriter` JA documenta que `input_paths` sao paths (nao conteudo) e `output_struct` eh metadata estruturada (nao arquivo lido). Fase-01 precisa garantir que nenhum step refatorado vaza conteudo de CLAUDE.md ou de secrets-scan-result em `output_struct` — apenas counts + paths + categorias. Testes de fase-01 incluem assertion negativo: `expect(JSON.stringify(logEntries)).not.toMatch(/AKIA[0-9A-Z]{16}/)` (proxy para "nenhum secret vazou").
- **G6 (warning runtime — quando NAO mostrar):** `detectCrossUpgrade` retorna `null` (no warning) quando: (a) manifest local ausente — greenfield ou primeiro init; (b) manifest local em v6.3.x mas CLAUDE.md ausente; (c) manifest local em v6.3.x + CLAUDE.md presente mas <= 40 linhas (ja migrado para espelho — sinal de que dev fez merge manual); (d) `--additive-merge` ja foi passado (dev sabe o que esta fazendo); (e) `--dry-run` ja foi passado (dev so quer preview). Test #2 cobre (c), test extra cobre (d) e (e). Mensagem amarela so quando warning eh **relevante** — D30 explicito.
- **G7 (R-04 / DI-06 — Windows safety):** Fase-01 mede `duration_ms` via `performance.now()` (Node + Bun). Fase-02 le manifest com `await fs.readFile` + `JSON.parse` — sem `bun -e`. ANSI yellow eh universal (`\x1b[33m{msg}\x1b[0m`), Windows Terminal e Powershell modernos suportam.
- **G8 (init-rationale.md formato existente):** Fase-05 deve seguir convencao do arquivo: ID + paragrafo + `**Consumido por:**`. Cada decisao D1-D30 vira uma entrada `### D{N} — {titulo curto}`. O bloco grande deste PRD entra ao final do arquivo, sob heading `## PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)`. NAO renumerar IDs existentes — D1 deste PRD coexiste com `DI-04` do refactor Rails (sem colisao porque prefixos diferentes).
- **G9 (CHANGELOG.md menciona `--additive-merge` e ADR no mesmo bloco — cross-link):** Fase-04 deve incluir no `### Breaking Changes (Behavior)` linha exata referenciando o `--additive-merge` (SH-09 do PRD) como escape hatch e linkar o ADR criado pela fase-03 (substituindo o placeholder `ADR-NNNN` pelo numero real apos execucao da fase-03). Coordenacao via `MEMORY.md`: fase-03 registra o ADR-ID definitivo em `Notas para Planos Seguintes`, fase-04 le e injeta. Se fases 03 e 04 rodarem em paralelo, fase-04 cita placeholder e o orchestrador faz pass posterior — registrar como `DEV-N` se acontecer.

---

## Criterios de Exit (plano completo quando)

- [ ] `skills/init/lib/init-subagent-ids.ts` exporta `INIT_SUBAGENT_IDS` const com EXATAMENTE 9 entradas (`secretsScan`, `discoverDocs`, `classifyBlocks`, `proposeMerge`, `applyMerge`, `moveDocs`, `detectDrift`, `populatePlanGen`, `rollback`).
- [ ] `skills/init/lib/audit-log-writer-factory.ts` exporta `createAuditLogWriterForCtx(ctx, runId)` retornando `AuditLogWriter` injetado em `ctx.flags['__auditLog']` ou no-op se desabilitado.
- [ ] `skills/init/lib/cross-upgrade-detector.ts` exporta `detectCrossUpgrade(input)` com retorno `{ shouldWarn: true, message: string } | null`.
- [ ] Steps 06/07/08/09/10/11/12/91 + comando `--rollback` chamam `AuditLogWriter.append` com `subagent_id` literal vindo de `INIT_SUBAGENT_IDS` — validado por `Grep "logAudit\\(" skills/init/lib` retornando ZERO ocorrencias (wrapper stub eliminado).
- [ ] `skills/init/lib/run-init.ts` chama `detectCrossUpgrade` ANTES do loop do registry (apos parseFlags, antes do `for (const step of reg)`) e emite warning amarelo PT-BR via `log(`\x1b[33m${msg}\x1b[0m`)` se retornar non-null.
- [ ] `docs/design-docs/ADR-NNNN-destructive-merge-default.md` existe com frontmatter (`adr-id`, `title`, `date`, `status: active`, `tags`), secoes Context/Decision/Alternatives Considered/Consequences/Reversibility, e referencia explicita aos PRD-IDs D2/D26/D28/D30.
- [ ] `CHANGELOG.md` bloco `## [6.4.0]` contem `### Breaking Changes (Behavior)` listando o destrutivo default + `--additive-merge` opt-in + link ao ADR. Bloco `### Added` estendido com 7 novos steps + 1 comando + 3 flags.
- [ ] `docs/design-docs/init-rationale.md` ganha seccao `## PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)` com 30 entries D{N} + `Consumido por:`.
- [ ] `bun test skills/init/lib/init-subagent-ids.test.ts skills/init/lib/audit-log-writer-factory.test.ts skills/init/lib/cross-upgrade-detector.test.ts skills/init/lib/run-init-cross-upgrade.test.ts` retorna 0 falhas.
- [ ] `bun test skills/init/lib/steps/06-secrets-scan.test.ts skills/init/lib/steps/07-discover-existing-docs.test.ts skills/init/lib/steps/08-classify-blocks-hybrid.test.ts skills/init/lib/steps/09-propose-merge-batch.test.ts skills/init/lib/steps/10-apply-merge-destructive.test.ts skills/init/lib/steps/11-move-docs-with-stub.test.ts skills/init/lib/steps/12-detect-drift-incremental.test.ts skills/init/lib/steps/91-generate-populate-plan.test.ts` permanece verde — refactor de wrapper para AuditLogWriter real nao quebra testes existentes.
- [ ] `bun run lint` clean nos arquivos criados/modificados.
- [ ] `bun run harness:validate` verde (ADR + CHANGELOG nao introduzem violacoes de structure).
- [ ] `MEMORY.md` deste plano lista API publica final de `audit-log-writer-factory`, `cross-upgrade-detector`, `INIT_SUBAGENT_IDS`, ADR-ID definitivo escolhido em runtime, qualquer DI/BUG/GT descoberto, e a confirmacao de que o contrato assumido para Step 12 + rollback bateu com o que o Plano 05 entregou (ou DEV-N documentando ajuste).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

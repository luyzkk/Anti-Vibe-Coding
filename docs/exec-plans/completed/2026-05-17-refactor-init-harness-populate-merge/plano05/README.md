# Plano 05: Modos Reversiveis (dry-run + rollback + drift + additive)

**Feature:** refactor-init-harness-populate-merge ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~4h wall-time (gross: fase-01 1h + fase-02 1h + fase-03 1h + fase-04 1h + fase-05 0.5h + fase-06 0.5h = 5h; com fase-02, fase-03, fase-05 e fase-06 paralelizaveis em sub-agentes distintos, wall-time efetivo cai para ~4h)
**Depende de:** Plano 04 (`applyMergeDestructiveStep` + `moveDocsWithStubStep` + backup manifest schema D29 confirmado em uso real; `proposeMergeBatchStep` exporta `MergeProposal` consumido pelo renderer compartilhado)
**Desbloqueia:** Plano 06 (audit log canonico precisa do `subagent_id: init-drift-detect | init-rollback` ja fixado neste plano), Plano 07 (CA-13 dry-run parity test consome o WriteRecorder estendido da fase-01; CA-12 E2E consome `--rollback` real implementado na fase-04)

---

## O que este plano entrega

Envelope completo de reversibilidade ao redor das operacoes destrutivas do Plano 04. Tres modos opt-in (`--dry-run`, `--rollback`, `--additive-merge`) + Step 12 (`detect-drift-incremental`) garantem que toda mutacao do init seja simulavel antes, revertivel depois e re-executavel sem repetir trabalho ja feito. Renderer compartilhado entre dry-run e `needsUser` elimina a divergencia de codepath (raiz historica de incidentes em pipelines com modo simulado). Substituidos: `lib/rollback.ts` stub do Plano 01 fase-03 vira impl completa; Step 09/10 ganham branch `--dry-run` (preview via console.log) + `--additive-merge` (early-skip); novo Step 12 entra entre Step 11 e Step 91 em modo `already-initiated`.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `lib/backup-anti-vibe.ts` exportando `createBackup`, `getLatestBackupDir`, `readBackupManifest`, `computeSha256` com schema D29 | Plano 01 fase-02 | pendente (gate) — ADAPTAR assinaturas conforme `plano01/MEMORY.md` "API publica final" apos execucao |
| Flag `--rollback` reconhecida em `parseFlags` + early-return em `runInit` chamando `lib/rollback.ts` (stub) | Plano 01 fase-03 | pendente (gate) |
| `lib/rollback.ts` stub existe e eh invocado pelo dispatcher | Plano 01 fase-03 | pendente (gate) — fase-04 deste plano preenche o stub |
| `lib/steps/09-propose-merge-batch.ts` exporta `MergeProposal` (shape do diff agregado: claudeMd transform + docMoves + blockedBySecrets) | Plano 04 fase-02 | pendente (gate) — ADAPTAR conforme `plano04/MEMORY.md` "API publica final do Step 09" |
| `lib/steps/10-apply-merge-destructive.ts` ja early-skipa quando `ctx.flags['--additive-merge'] === true` (G9 do Plano 04) | Plano 04 fase-03 | pendente (gate) |
| `lib/steps/11-move-docs-with-stub.ts` registra entries no backup manifest com `action: 'move'` (compartilha pasta `{ts}/` iniciada pelo Step 10) | Plano 04 fase-05 | pendente (gate) — ADAPTAR conforme convencao append do G10 do Plano 04 |
| `lib/discovery-store.ts` (`readDiscoveryArtifact`, `writeDiscoveryArtifact`, `discoveryArtifactPath`) | Plano 03 fase-02 | pendente (gate) — Step 12 (drift detector) escreve `drift-report.json` neste store |
| Step 02 `linkClaudeAgentsStep` em sua posicao reposicionada (depois de Step 10) | Plano 04 fase-06 | pendente (gate) — fase-05 deste plano precisa saber a posicao para wiring do `--additive-merge` (Step 02 ganha branch legacy) |
| `lib/dry-run.ts` (`WriteRecorder`, `makeWriter`, `DryRunMode`) ja existente do v6.3.x | repo atual (Plano 03 fase-06 do PRD anterior) | pronto |
| `lib/dry-run-renderer.ts` (`renderDryRunReport` para migracoes v5) ja existente do v6.3.x | repo atual | pronto — coexiste com novo `preview-renderer.ts` desta plano (escopo distinto: migration vs merge) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/init/lib/dry-run-mode.ts` (`isDryRun(ctx): boolean`, `getRecorder(ctx): WriteRecorder \| undefined`) | Plano 06 fase-01 (audit log usa `isDryRun` para suprimir entries em simulacao); Plano 07 fase-04 (CA-13 dry-run parity test consome `getRecorder` para comparar paths previstos vs reais) |
| `skills/init/lib/preview-renderer.ts` (`renderMergePreview(input: MergePreview): string`) | Plano 04 fase-02 (Step 09 ja consome via DI durante implementacao — se fase-02 do Plano 05 entregar primeiro, Step 09 importa direto; caso contrario, fase-02 deste plano refatora Step 09 para usar o renderer compartilhado); Plano 07 fase-04 (CA-13 parity test renderiza preview em fixture conhecido e snapshota) |
| `skills/init/lib/drift-detector.ts` (`detectDrift`, `DriftReport`, `DriftStatus`) + Step 12 (`detectDriftIncrementalStep`) | Plano 02 fase-03 (Step 91 `generatePopulatePlanStep` ja le `.anti-vibe/discovery/drift-report.json` opcionalmente para gerar tasks seletivas em modo `already-initiated`); Plano 06 fase-01 (audit log `subagent_id: init-drift-detect`); Plano 07 fase-03 (CA-12 E2E em modo `already-initiated` valida que drift report aparece) |
| `skills/init/lib/rollback.ts` (impl completa: `executeRollback`, `RollbackResult`) | Plano 06 fase-01 (audit log `subagent_id: init-rollback`); Plano 07 fase-03 (CA-12 E2E intermediario faz init + rollback + verifica restore byte-identico) |
| `skills/init/assets/snippets/rollback-adr-template.md` | fase-04 deste plano (consome durante restore); Plano 06 fase-03 (ADR-destructive-merge-default referencia indiretamente o template como parte da estrategia de comunicacao) |
| Flag `--additive-merge` totalmente cabeada (parseFlags reconhece + Steps 02/09/10 com branches; Step 11 nao afetado) | Plano 06 fase-02 (warning runtime cross-upgrade sugere `--additive-merge` quando relevante); Plano 07 fase-03 (CA-12 E2E pode usar `--additive-merge` para validar caminho conservador) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-dry-run-global-wiring.md` | `lib/dry-run-mode.ts` (helpers `isDryRun`, `getRecorder`) + extensao do `parseFlags`/`runInit` para propagar `WriteRecorder` + Steps 06-11/91 short-circuit `mutated: false` quando dry-run (com `summary` previsto) | 1h | fase-02 (renderer existe para Step 09 consumir em dry-run) |
| 02 | `fase-02-dry-run-renderer-preview.md` | `lib/preview-renderer.ts` (`renderMergePreview(input: MergePreview): string`) + golden snapshot test; Step 09 refatorado para consumir o renderer em AMBOS branches (dry-run console.log + needsUser prompt body) | 1h | — (independente fase-03/04/05/06; gate apenas para fase-01) |
| 03 | `fase-03-drift-detector-step-12.md` | `lib/drift-detector.ts` (`detectDrift`, `DriftReport`, `DriftStatus`) + `lib/steps/12-detect-drift-incremental.ts` + registry insert apos Step 11, antes de Step 91 | 1h | — (independente; consome manifest existente do v6.3.x + Plano 04 backup schema apenas como referencia) |
| 04 | `fase-04-rollback-completo.md` | `lib/rollback.ts` impl completa (`executeRollback`, `RollbackResult`) + integracao em `runInit` (early-return chama impl real) + ADR writer consumindo template da fase-06 | 1h | fase-06 (template existe para ADR writer consumir) |
| 05 | `fase-05-additive-merge-opt-in.md` | `parseFlags` reconhece `--additive-merge` (caso Plano 01 nao tenha feito) + `runInit` propaga `ctx.additiveMerge` + Step 02 ganha branch legacy v6.3.x (NAO transforma CLAUDE.md, faz merge aditivo) + terminal warning ao final | 0.5h | — (independente; depende apenas dos early-skips de Step 09/10 ja entregues no Plano 04) |
| 06 | `fase-06-rollback-adr-template-snippet.md` | `assets/snippets/rollback-adr-template.md` com 6 marcadores de substituicao (`{NUMBER}`, `{date}`, `{backup_ts}`, `{git_sha}`, `{N}`, `{restored_files_list}`) | 0.5h | — (independente; content-only) |

---

## Grafo de Fases

```
fase-06 (rollback-adr-template-snippet)   fase-02 (dry-run-renderer-preview)
       |                                          |
       v                                          v
fase-04 (rollback-completo)              fase-01 (dry-run-global-wiring)

fase-03 (drift-detector-step-12)   <-- independente (consome manifest existente)
fase-05 (additive-merge-opt-in)    <-- independente (toca dispatcher + Step 02; nao depende de fase-01/02/03/04/06)
```

**Paralelismo possivel:**
- fase-02, fase-03, fase-05 e fase-06 podem rodar em paralelo (4 sub-agentes distintos) — sem deps cruzadas.
- fase-01 entra apos fase-02 (precisa do renderer para Step 09 chamar em dry-run).
- fase-04 entra apos fase-06 (precisa do template ADR para escrever).
- Wall-time efetivo: max(fase-02 + fase-01, fase-06 + fase-04, fase-03, fase-05) = max(2h, 1.5h, 1h, 0.5h) = 2h se 4 sub-agentes paralelos; 4h sequencial.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** `fase-04-rollback-completo` — eh o slice que prova reversibilidade END-TO-END do envelope inteiro. Cobre: leitura do manifest D29 escrito pelo Plano 04 + validacao de checksum (CA-10) + restore byte-identico (CA-06) + ADR writer consumindo template da fase-06. Se este slice passa, o "destrutivo controlado" do Plano 04 vira "destrutivo reversivel" — que eh a tese central deste plano. Demais fases (dry-run, drift, additive) refinam o envelope mas nao validam o loop completo.

- **fase-01:** RED-GREEN-REFACTOR. 5 testes minimos: (a) `isDryRun(ctx)` retorna true quando flag presente; (b) `isDryRun(ctx)` retorna false quando flag ausente; (c) `getRecorder(ctx)` retorna `WriteRecorder` instancia em dry-run; (d) Step generico que normalmente mutaria, em dry-run retorna `mutated: false` e grava no recorder; (e) E2E `runInit(['--dry-run'])` em fixture com CLAUDE.md de 287 linhas → `git status` clean apos.
- **fase-02:** RED-GREEN-REFACTOR. Golden snapshot test: input `MergePreview` representativo (CLAUDE.md 287→36 linhas, 4 doc moves, 1 blockedBySecret) → output string canonica. Snapshot file em `__golden__/preview-renderer/aggregated-diff.txt`. Diff detectado entre dry-run path e needsUser path = mesmo snapshot.
- **fase-03:** RED-GREEN-REFACTOR. 5 testes: (a) skip quando `ctx.mode !== 'already-initiated'`; (b) PLACEHOLDER quando manifest sha match e arquivo eh template-only; (c) POPULATED quando arquivo foi editado pelo dev; (d) DRIFT quando arquivo modificado mas conteudo nao bate o esperado; (e) manifest ausente → empty report + warning.
- **fase-04:** RED-GREEN-REFACTOR. 6 testes: (a) no backup found; (b) corrupted manifest aborts; (c) sha mismatch aborts (CA-10); (d) user cancela; (e) successful restore byte-identico + ADR escrito (CA-06); (f) `action: 'move'` reversal (restaura + remove stub).
- **fase-05:** RED-GREEN-REFACTOR. 4 testes: (a) sem flag: caminho destrutivo (Plano 04) inalterado; (b) com flag: Step 09/10 early-skip + Step 02 aplica legacy aditivo; (c) Step 11 ainda roda (orfaos → references/); (d) terminal warning emitido.
- **fase-06:** content-only. Grep no snippet por 6 marcadores literais retorna exatos 6 matches; arquivo ≤30 linhas (assertable via `wc -l`).

---

## Gotchas Conhecidos

- **G1 (D7 + SH-05 — drift somente em already-initiated):** Step 12 (`detect-drift-incremental`) NAO eh idempotent globalmente — eh **modo-condicional**. Em greenfield/migration/legacy-v5 retorna `{ mutated: false, summary: 'skipped (only runs in already-initiated mode)' }` sem ler manifest. So roda quando `ctx.flags['__initMode'] === 'already-initiated'` (modo ja detectado por `detect-legacy` Step 00 — verificar como o modo eh propagado em `plano01/MEMORY.md` apos execucao). **ADAPTAR conforme convencao real apos fase-01 do Plano 01 estar implementada.** Tracer fica em `fase-03` deste plano com TODO inline se a convencao ainda nao estiver definida no momento do planejamento.

- **G2 (D29 + CA-10 — manifest integrity check):** Rollback (fase-04) valida `sha256` de CADA arquivo no backup contra o manifest ANTES de qualquer restore. UM mismatch aborta todo o rollback com `RollbackResult.errors[]` populado e mensagem "Backup integrity check failed: {path} sha256 mismatch". NAO restaura parcialmente. Schema do manifest vem de `plano01/MEMORY.md` "API publica final de `lib/backup-anti-vibe.ts`" — ADAPTAR se o schema final divergir de D29.

- **G3 (D18 + CA-13 — dry-run parity):** O risco "dry-run divergir do comportamento real" eh real e materializa-se quando dry-run e real-run usam codepaths separados. Mitigacao DESTE plano: (a) Step 09 chama `renderMergePreview` em ambos branches (fase-02 garante); (b) Steps 06-11/91 usam `WriteRecorder` via `makeWriter(getDryRunMode(ctx))` — o MESMO `fs.writeFile` simulado registra os paths que seriam mutados. Parity test propriamente dito eh CA-13 do Plano 07 fase-04; fase-01 deste plano apenas LAYS THE FOUNDATION (foundation = recorder captura os mesmos paths que `apply-merge-destructive` realmente mutaria em modo real).

- **G4 (Windows path safety — R-04 / DI-06):** Path joins via `path.join` em rollback.ts (D6 do Plano 01) — nunca concatenacao com `/`. Em fase-04, ao escrever `docs/design-docs/ADR-NNNN-rollback-init-{date}.md`, calcular `NNNN` via `glob('docs/design-docs/ADR-*.md').length + 1` (zero-padded 4 digits) — testar fixture com 0 ADRs, 1 ADR e 9999 ADRs (overflow check). Em fase-03, ao computar sha256 de arquivos do projeto-alvo, ler como Buffer (`fs.readFile(path)` sem encoding) — texto UTF-8 com BOM ou EOL CRLF dao hash diferente do que o manifest gravou se a leitura for normalizada.

- **G5 (manifest append convention — G10 do Plano 04):** Step 10 inicia o backup (cria pasta `{ts}/` + manifest com entries `action: 'transform'`); Step 11 faz APPEND ao mesmo manifest com entries `action: 'move'`. Fase-04 deste plano consome o manifest **resultante** (final, com TODAS as entries). Se Plano 04 fase-05 documentar um helper local `appendToLatestBackup` em vez de extensao do helper canonico do Plano 01, fase-04 deste plano nao se importa — apenas le o manifest finalizado via `readBackupManifest`. ADAPTAR conforme `plano04/MEMORY.md` "Schema do backup manifest apos uso real" registrar.

- **G6 (additive-merge interaction com Plano 04 early-skips):** Step 09 e Step 10 do Plano 04 ja tem o early-skip `if (ctx.flags['--additive-merge'] === true) return { mutated: false, summary: 'skipped (additive-merge opt-in)' }` declarado (G9 do Plano 04). Fase-05 deste plano NAO toca Steps 09/10 — apenas adiciona o branch legacy em Step 02 (link-claude-agents). Step 11 (`move-docs-with-stub`) NAO eh pulado — orfaos → `docs/references/` continua aditivo-friendly. Atencao: a posicao do Step 02 no registry mudou em Plano 04 fase-06 (Step 10 antes Step 02) — fase-05 deste plano precisa assertar a posicao via teste de integracao (`registry.indexOf(linkClaudeAgentsStep)` apos `applyMergeDestructiveStep`).

- **G7 (drift artifact schema):** `lib/drift-detector.ts` (fase-03) escreve `.anti-vibe/discovery/drift-report.json` via `discovery-store.ts` (Plano 03 fase-02). Schema canonico: `{ generatedAt: ISO 8601, summary: { placeholder: number, populated: number, drift: number }, byFile: Record<string, 'PLACEHOLDER' | 'POPULATED' | 'DRIFT'> }`. Plano 02 fase-02 (`populate-plan-generator`) em modo `already-initiated` le esse arquivo e filtra tasks apenas para PLACEHOLDER. Se artifact nao existe (greenfield), generator emite tasks para todos os arquivos populaveis. **NAO** mudar este schema sem atualizar Plano 02 fase-02.

- **G8 (D29 confirmation point — backup schema):** O schema D29 do manifest eh **contrato** entre Plano 01 (escreve schema), Plano 04 (usa schema com `action: 'transform' | 'move' | 'overwrite'`) e Plano 05 (le schema para rollback). Fase-04 deste plano consome o schema **canonico** definido em `plano01/MEMORY.md`. Se durante execucao do Plano 01/04 o schema divergir (ex: adiciona campo `originalBytes` ou renomeia `backupPath` → `relativePath`), fase-04 deste plano DEVE ser revisada antes de implementar. ADAPTAR via `// TODO ADAPTAR — schema final de plano01/MEMORY.md` comentado nos snippets.

- **G9 (rollback ADR numbering — fase-04 + fase-06):** Numero do ADR (`{NUMBER}` no template) eh calculado em runtime durante o restore: `const adrFiles = await glob('docs/design-docs/ADR-*.md'); const next = String(adrFiles.length + 1).padStart(4, '0')`. Em caso de gap no historico (ex: ADR-0001 e ADR-0003 existem, falta ADR-0002), o codigo USA o proximo apos o MAIOR numero existente, nao o primeiro gap — para evitar colisao com convencao Git de cherry-pick que pode ter assumido o gap. Test pareado cobre fixture com gap.

- **G10 (terminal warning em additive-merge — fase-05):** Apos `runInit` completar com `ctx.additiveMerge === true`, o dispatcher emite um log final amarelo "Running in --additive-merge mode (v6.3.x behavior). Destructive merge skipped. To migrate later: re-run /init without --additive-merge". Esse log eh capturado em test via `log` sink do `RunInitOptions` (ja existe em `run-init.ts`). NAO usar `console.warn` direto — usar o `log` injetado para que testes possam capturar.

- **G11 (Step 02 legacy branch — fase-05):** Quando `ctx.additiveMerge === true`, Step 02 `linkClaudeAgentsStep` precisa rodar a logica do v6.3.x (NAO transforma CLAUDE.md, faz merge aditivo). Esse codigo legado ja existe no proprio Step 02 atual (`02-link-claude-agents.ts`) — antes do Plano 04 fase-06 reposicionar, Step 02 era responsavel pelo merge. Fase-05 deste plano restaura o branch legado COMO OPCAO via `if (ctx.additiveMerge) { /* legacy v6.3.x */ } else { /* assume CLAUDE.md ja espelho */ }`. ADAPTAR conforme o exato comportamento legado documentado em `plano04/MEMORY.md` "Lista de testes do Step 02 atualizados em fase-06".

---

## Criterios de Exit (plano completo quando)

- [ ] `skills/init/lib/dry-run-mode.ts` existe e exporta EXATAMENTE 2 simbolos publicos: `isDryRun`, `getRecorder` (verificavel via `grep -E '^export (function|const)' dry-run-mode.ts | wc -l` → `2`).
- [ ] `skills/init/lib/preview-renderer.ts` existe e exporta EXATAMENTE 2 simbolos publicos: `renderMergePreview`, `MergePreview` (verificavel via grep).
- [ ] `skills/init/lib/drift-detector.ts` existe e exporta EXATAMENTE 4 simbolos publicos: `detectDrift`, `DriftReport`, `DriftStatus`, `DRIFT_REPORT_FILENAME` (verificavel via grep).
- [ ] `skills/init/lib/steps/12-detect-drift-incremental.ts` exporta `detectDriftIncrementalStep: Step` com `id === '12-detect-drift-incremental'`.
- [ ] `skills/init/lib/registry.ts` posiciona `detectDriftIncrementalStep` IMEDIATAMENTE APOS `moveDocsWithStubStep` (Step 11 do Plano 04) e ANTES de `generatePopulatePlanStep` (Step 91 do Plano 02).
- [ ] `skills/init/lib/rollback.ts` exporta `executeRollback` (assinatura real, nao mais stub) + tipo `RollbackResult`. Verificavel via `grep -c "throw new Error('not implemented'" rollback.ts` retorna `0`.
- [ ] `skills/init/assets/snippets/rollback-adr-template.md` existe com EXATAMENTE 6 marcadores literais `{NUMBER}`, `{date}`, `{backup_ts}`, `{git_sha}`, `{N}`, `{restored_files_list}` (verificavel via `grep -o '{[A-Za-z_]*}' rollback-adr-template.md | sort -u | wc -l` retorna `6`).
- [ ] `skills/init/lib/parse-flags.ts` reconhece `--additive-merge` como flag boolean (verificavel via `parseFlags(['--additive-merge']).flags['--additive-merge'] === true`).
- [ ] `skills/init/lib/steps/02-link-claude-agents.ts` tem branch `if (ctx.flags['--additive-merge'] === true) { /* legacy v6.3.x */ }` antes do branch novo (assume CLAUDE.md ja espelho).
- [ ] `bun test skills/init/lib/dry-run-mode.test.ts skills/init/lib/preview-renderer.test.ts skills/init/lib/drift-detector.test.ts skills/init/lib/steps/12-detect-drift-incremental.test.ts skills/init/lib/rollback.test.ts` retorna 0 falhas.
- [ ] `bun run lint` clean nos arquivos criados/modificados.
- [ ] `MEMORY.md` deste plano lista API publica final dos 4 modulos novos + decisao final sobre como `ctx.mode` eh propagado (G1) + schema final do `drift-report.json` (G7) + texto exato do warning amarelo emitido em additive-merge (G10) + assinatura final do `executeRollback` apos integracao com `lib/backup-anti-vibe.ts` real (G8).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

# Plano 04: Merge Invertido Destrutivo

**Feature:** refactor-init-harness-populate-merge ([PLAN overview](../PLAN.md))
**Fases:** 7
**Sizing total:** ~4.5h (0.5h + 1h + 1.5h + 1h + 1h + 0.5h + 0.5h = 6h gross, com 1.5h de paralelismo absorvido — wall-time ~4.5h)
**Depende de:** Plano 03 (artefatos `.anti-vibe/discovery/{secrets-scan-result.json, discovered-docs.json, classification-result.json}` ja existem em disco apos init em repo non-greenfield)
**Desbloqueia:** Plano 05 (modos reversiveis — dry-run wiring + rollback completo + drift detection + additive opt-in consomem os steps destrutivos deste plano)

---

## O que este plano entrega

Pipeline destrutivo controlado por aprovacao explicita em batch: Step 09 (`propose-merge-batch`) interrompe via `needsUser` com diff agregado de TODAS as transformacoes propostas; Step 10 (`apply-merge-destructive`) cria backup canonico em `.anti-vibe/backup/{ts}/` e transforma CLAUDE.md de >40 linhas em espelho ≤40 linhas extraindo Akita para `docs/DESIGN.md`; Step 11 (`move-docs-with-stub`) move docs classificados, escreve stub redirect e reescreve links internos em todos os `.md` do repo. Inclui criacao do skeleton `docs/DESIGN.md` (agrega 5 snippets Akita via includes — D22), reorder do registry colocando Step 10 ANTES de `linkClaudeAgentsStep` (D23 — symlink ja encontra arquivo no formato espelho) e reescrita da regra "merge aditivo" no SKILL.md para "NUNCA sobrescrever sem aprovacao explicita + backup recuperavel" (D26, D28). README.md raiz eh intocavel por design (MH-08, CA-08).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Contrato `Step { id, run }` + `StepReport { mutated, summary, needsUser?, skipRemaining? }` | `skills/init/lib/steps/types.ts` | pronto |
| Dispatcher `runInit` com contrato `needs-user` (re-entrada apos askUser) | `skills/init/lib/run-init.ts` | pronto |
| `lib/backup-anti-vibe.ts` (createBackup, readBackupManifest, getLatestBackupDir, computeSha256) com schema manifest D29 | Plano 01 fase-02 | pendente (gate) |
| `lib/discovery-store.ts` (readDiscoveryArtifact, writeDiscoveryArtifact, discoveryArtifactPath) | Plano 03 fase-02 | pendente (gate) |
| `lib/secrets-scanner.ts` (`scanSecrets`, `SecretMatch`) + artefato `.anti-vibe/discovery/secrets-scan-result.json` | Plano 03 fase-01/02 | pendente (gate) |
| `lib/discover-existing-docs.ts` (`discoverExistingDocs`, `DiscoveredDoc`) + artefato `.anti-vibe/discovery/discovered-docs.json` | Plano 03 fase-03/04 | pendente (gate) |
| `lib/blocks-classifier.ts` (`classifyDocs`, `ClassifyOutput`, `DocMapping`, `OrphanMapping`, `HarnessCategory`) + artefato `.anti-vibe/discovery/classification-result.json` | Plano 03 fase-05/06 | pendente (gate) |
| 5 snippets Akita em `assets/snippets/akita-*.md` | repo atual | pronto |
| `linkClaudeAgentsStep` (id 02) atualmente posicionado APOS `scaffoldFullTreeStep` | `skills/init/lib/registry.ts` linha 44 | pronto |
| Flag `--dry-run` e `--rollback` reconhecidas em `parseFlags` (wiring completo do dry-run em Plano 05) | Plano 01 fase-03 | pendente |
| Flag `--additive-merge` reconhecida em `parseFlags` (wiring final do behavior em Plano 05 fase-05) | Plano 01 fase-03 (recomendado adicionar a flag ao parser ja na fundacao) | pendente — fase-02/03 deste plano declaram a flag como contrato e tratam como skip se nao houver suporte ainda |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/init/assets/snippets/design-md-skeleton.md` (skeleton de `docs/DESIGN.md` com `{{include: ../akita-XXX.md}}` para os 5 snippets) | Step 10 deste plano (fase-03); Plano 02 fase-02 (se populate-plan-generator referenciar a estrutura DESIGN.md em modo non-greenfield); Plano 05 fase-05 (additive-merge modo legado pode referenciar a estrutura para consistencia) |
| `skills/init/lib/doc-mover-stub.ts` (`moveDocWithStub`, `rewriteInternalLinks`, `MoveResult`) | Step 11 deste plano (fase-05); Plano 05 fase-04 (rollback inverso — reverter stub eh inverso do create-stub) |
| `skills/init/lib/steps/09-propose-merge-batch.ts` (`proposeMergeBatchStep`) | Plano 05 fase-01/02 (`--dry-run` wiring: emite preview via console.log sem `needsUser`); Plano 06 fase-01 (audit log `subagent_id: init-propose-merge`) |
| `skills/init/lib/steps/10-apply-merge-destructive.ts` (`applyMergeDestructiveStep`) | Plano 05 fase-04 (rollback completo le os manifests escritos por este step); Plano 06 fase-01 (audit log `subagent_id: init-apply-merge`); Plano 05 fase-05 (`--additive-merge` faz early-skip antes deste step) |
| `skills/init/lib/steps/11-move-docs-with-stub.ts` (`moveDocsWithStubStep`) | Plano 05 fase-04 (rollback restaura paths originais a partir do manifest); Plano 06 fase-01 (audit log `subagent_id: init-move-docs`) |
| Registry reorder (Step 10 imediatamente antes de Step 02 reposicionado) | Plano 05 fase-05 (`--additive-merge` precisa saber a posicao para skip cirurgico); Plano 07 fase-03 (E2E CA-12 assume reorder em vigor) |
| `skills/init/SKILL.md` regra "NUNCA sobrescrever sem aprovacao explicita + backup" | Plano 06 fase-03 (ADR-destructive-merge-default referencia o texto novo); Plano 06 fase-04 (CHANGELOG cita a regra reescrita); Plano 05 fase-05 (additive opt-in eh contraparte explicita da nova regra) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-design-md-skeleton-snippet.md` | `assets/snippets/design-md-skeleton.md` agregando 5 snippets Akita via marcadores `{{include: ../akita-XXX.md}}` (D22, SH-08); snippets atuais INTOCADOS | 0.5h | — |
| 02 | `fase-02-step-09-propose-merge-batch.md` | `lib/steps/09-propose-merge-batch.ts` + testes; emite UM unico `needsUser` com diff agregado de transformacoes (MH-04, D4); CH-02 "ver diff por arquivo" registrado como TODO inline | 1h | — (independente fase-01) |
| 03 | `fase-03-step-10-apply-merge-destructive.ts` | `lib/steps/10-apply-merge-destructive.ts` + testes; cria backup `.anti-vibe/backup/{ts}/`, transforma CLAUDE.md em espelho ≤40 linhas, gera `docs/DESIGN.md` a partir do skeleton + 5 includes (MH-03, CA-02, D17) | 1.5h | fase-01, fase-02 |
| 04 | `fase-04-doc-mover-stub-lib.md` | `lib/doc-mover-stub.ts` (3 simbolos publicos: `moveDocWithStub`, `rewriteInternalLinks`, `MoveResult`) + testes; faz move + stub + rewrite atomico (D12) | 1h | — (independente fase-01/02) |
| 05 | `fase-05-step-11-move-docs-with-stub.md` | `lib/steps/11-move-docs-with-stub.ts` + testes; integra `doc-mover-stub` no registry; README.md raiz com guard explicito (MH-05, MH-08, CA-03, CA-08) | 1h | fase-02, fase-04 |
| 06 | `fase-06-registry-reorder-10-antes-02.md` | `lib/registry.ts` posiciona `applyMergeDestructiveStep` imediatamente antes de `linkClaudeAgentsStep`; ajusta testes do Step 02 que dependem dessa ordem (D23) | 0.5h | fase-03, fase-05 |
| 07 | `fase-07-skill-md-rule-rewrite.md` | `skills/init/SKILL.md` linha 70: substitui "O merge deve ser aditivo" por regra ancorada em D26/D28 "NUNCA sobrescrever sem aprovacao explicita + backup recuperavel"; documenta `--additive-merge` opt-in | 0.5h | — (independente; doc-only) |

---

## Grafo de Fases

```
fase-01 (design-md-skeleton-snippet)
    |
    +--> fase-03 (step-10-apply-merge-destructive)
              |
fase-02 (step-09-propose-merge-batch) ---+
              |                          |
              +--------------------------+--> fase-05 (step-11-move-docs-with-stub)
                                              ^
fase-04 (doc-mover-stub-lib) ------------------+

fase-06 (registry-reorder-10-antes-02)  <-- depende de fase-03 e fase-05 prontas (reorder so faz sentido com Step 10 + Step 11 implementados e com testes verdes)

fase-07 (skill-md-rule-rewrite)         <-- independente (doc-only); pode rodar paralelo com qualquer fase
```

**Paralelismo possivel:** fase-01, fase-02, fase-04 e fase-07 nao tem deps cruzadas — sub-agentes distintos podem executar em paralelo. fase-03 depende de fase-01 (skeleton existe) + fase-02 (tipos do `MergeProposal` consumidos). fase-05 depende de fase-02 (tipos compartilhados de `MergeProposal`) + fase-04 (`moveDocWithStub`). fase-06 eh barreira: precisa de fase-03 e fase-05 prontas para que o reorder seja testavel.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A — o tracer bullet feature-wide eh `Plano 02 fase-04` (greenfield-e2e). Este plano cobre o caminho non-greenfield (repo com CLAUDE.md + docs estruturais existentes). O slice mais fino DESTE plano eh `fase-02-step-09-propose-merge-batch`: prova end-to-end que o registry aceita um step que emite `needsUser` agregado consumindo os 3 JSONs de discovery do Plano 03 — sem ainda mutar nada (Step 09 retorna `mutated: false`).

- **fase-01:** content authoring (snippet Markdown). Sem TDD codigo — checklist de qualidade de conteudo + grep validations contra o snippet (5 marcadores `{{include: ../akita-XXX.md}}` esperados).
- **fase-02:** RED-GREEN-REFACTOR. Step com 4 testes: (a) sem nada para propor → skip com `mutated: false`; (b) com transformacoes propostas E NAO em dry-run → `needsUser` com prompt contendo cabecalho "PROPOSTA DE TRANSFORMACAO"; (c) em `--dry-run` → console.log do diff agregado SEM `needsUser`; (d) integracao registry (assert posicao apos `classifyBlocksHybridStep`).
- **fase-03:** RED-GREEN-REFACTOR. Step com 5 testes: (a) backup escrito antes de transformacao; (b) CLAUDE.md final ≤40 linhas com estrutura espelho; (c) `docs/DESIGN.md` criado com 5 secoes Akita extraidas; (d) `--additive-merge` → early-skip com `mutated: false`; (e) erro no backup → step retorna `mutated: false` + summary com erro (nao corrompe).
- **fase-04:** RED-GREEN-REFACTOR. Lib com 5 testes: (a) move basico funciona + stub escrito; (b) link interno reescrito; (c) URL externa apenas logada em warn; (d) destino ja existe → erro tipado (nao sobrescreve); (e) origem nao existe → erro tipado.
- **fase-05:** RED-GREEN-REFACTOR. Step com 4 testes: (a) move executado para arquivos non-orphan; (b) orfaos → `docs/references/`; (c) README.md raiz SKIPADO com log explicito + assert no fixture com 2 READMEs (raiz e `/docs/`); (d) arquivos com `blockedBySecret: true` no manifest do Step 06 → skipados com summary listando bloqueios.
- **fase-06:** RED-GREEN-REFACTOR. Test de integracao do registry: (a) `registry.indexOf(applyMergeDestructiveStep) === registry.indexOf(linkClaudeAgentsStep) - 1`; (b) testes existentes de `link-claude-agents` que assumiam ordem antiga foram atualizados (lista paths exatos em fase-06.md).
- **fase-07:** doc-only. Grep no SKILL.md: (a) `grep -i "aditivo"` retorna 0 matches; (b) presenca da nova string canonica "NUNCA sobrescrever sem aprovacao explicita".

---

## Gotchas Conhecidos

- **G1 (D2 + MH-03 — destrutivo com backup):** Step 10 SEMPRE escreve em `.anti-vibe/backup/{timestamp}/CLAUDE.md` (mais qualquer doc transformado) ANTES de qualquer mutacao destrutiva. Manifest schema vem do Plano 01 fase-02 (`lib/backup-anti-vibe.ts` exporta `createBackup({timestamp, files, gitSha})` — assinatura exata a confirmar via `plano01/MEMORY.md` apos execucao do Plano 01; ate la a fase-03 referencia o contrato D29 e marca "adaptar conforme MEMORY do Plano 01 apos execucao"). Se backup falha (erro de IO, permissao 0700 inviavel, etc), step retorna `mutated: false` + summary com erro — nao tenta transformacao parcial.
- **G2 (D4 + MH-04 — needsUser batch):** Step 09 emite UM unico `needsUser` com diff agregado de todas as transformacoes propostas (CLAUDE.md merge + classified docs move + secrets bloqueados). NAO emite multiplos `needsUser` por arquivo. CH-02 "ver detalhe por arquivo" eh follow-up — registrar como TODO inline na fase-02 (comentario `// TODO CH-02 — ver detalhe por arquivo`), nao implementar nesta versao.
- **G3 (D6 + MH-08 + CA-08 — README intocavel):** Step 11 verifica `basename(relpath) === 'README.md' && dirname(relpath) === '.'` (ou seja, README.md no nivel raiz do cwd) ANTES de qualquer move/stub/rewrite. Skip explicito com log "skipped (root README is read-only per D6)". Test pareado cria fixture com README na raiz + README em `/docs/` (este ultimo eh harness target valido) e asserta que apenas o segundo eh tocado. README.md fora da raiz (ex: `subprojeto/README.md`) tambem eh skipado nesta versao — D6 nao distingue, conservador por seguranca.
- **G4 (D12 — stub + rewrite atomico):** `doc-mover-stub.ts` (fase-04) faz 3 coisas atomicas em sequencia, sem rollback parcial: (a) `fs.rename(source, target)` move o arquivo; (b) escreve em `source` (path original) um stub minimo `# Moved\n\nThis document moved to [{target}]({target relativo}).\n`; (c) `glob('**/*.md', {ignore: ['node_modules/**','dist/**','build/**','.git/**','.anti-vibe/**']})` no repo e para cada match, regex `\[([^\]]+)\]\(({source-path-relativo-ao-arquivo-atual})\)` reescreve para `[$1]({target-path-relativo-ao-arquivo-atual})`. URLs absolutas externas (http/https) sao apenas LOGADAS em warn como "external link in {file}:{line} not rewritten — verify manually". Se a etapa (a) falha, (b) e (c) nao rodam. Se (b) ou (c) falham apos (a), erro propaga com `MoveResult.errors[]` populado — Step 11 entra em `mutated: true` parcial documentado no summary.
- **G5 (D17 + SH-08 — Akita → DESIGN.md via skeleton):** Step 10 (fase-03) extrai blocos Akita do CLAUDE.md existente (heuristica: cabecalhos contendo "Code Style", "Comments", "Tests", "Dependencies", "Logging" — alinhado com nomes dos 5 snippets) e mescla com `assets/snippets/design-md-skeleton.md` (criado em fase-01) para gerar `docs/DESIGN.md`. Os marcadores `{{include: ../akita-XXX.md}}` do skeleton sao resolvidos em runtime pelo Step 10 (le snippet, substitui). AGENTS.md ganha apenas a linha "Code style: see docs/DESIGN.md" sem inflar. Limite ≤40 linhas do AGENTS.md eh validado pelo `harness:validate` no final do init.
- **G6 (D22 — skeleton agrega snippets, snippets NAO mudam):** `assets/snippets/design-md-skeleton.md` AGREGA os 5 snippets existentes via marcadores literais `{{include: ../akita-code-style.md}}` (e analogos). Os snippets atuais ficam INTOCADOS — continuam servindo o caminho "sem CLAUDE.md existente" do init original (mesclam em CLAUDE.md greenfield), e o caminho "com CLAUDE.md existente" passa pelo skeleton (mescla em `docs/DESIGN.md`). Test da fase-01 grepa pelos 5 marcadores no skeleton e assertara que cada arquivo `akita-*.md` referenciado existe.
- **G7 (D23 — reorder Step 10 antes Step 02):** Em `lib/registry.ts`, `applyMergeDestructiveStep` (id `10-apply-merge-destructive`) deve vir IMEDIATAMENTE antes de `linkClaudeAgentsStep` (id `02-link-claude-agents` — repositioned). Razao: apply-merge reescreve CLAUDE.md primeiro; link-claude-agents (symlink/hardlink/copy 3-tier) ja encontra arquivo no formato espelho ≤40 linhas, evitando recriacao. Testes existentes em `skills/init/lib/steps/02-link-claude-agents.test.ts` (e `tests/e2e/*` que dependam dessa ordem) PRECISAM ser atualizados em fase-06 — listar paths exatos via `Grep "linkClaudeAgentsStep|02-link-claude-agents"` no codebase ANTES de iniciar a fase.
- **G8 (D18 + MH-06 — dry-run preview):** Em `--dry-run` (detectado via `ctx.flags['--dry-run'] === true`), Steps 09/10/11 emitem `summary` previsto mas `mutated: false`, e Step 09 NAO chama `needsUser` — apenas `console.log` do diff agregado em PT-BR. O wiring completo do dry-run (incluindo renderer compartilhado entre `--dry-run` e `needsUser`) fica no Plano 05 fase-01/02 — este plano entrega o ramo `if (ctx.flags['--dry-run']) { ... return { mutated: false, summary } }` em cada step e marca o restante (renderer compartilhado, parity test) como TODO Plano 05 com comentario inline `// TODO Plano 05 fase-02 — renderer compartilhado`.
- **G9 (D26 + D28 + SH-09 — additive opt-in):** Quando `ctx.flags['--additive-merge'] === true`, Steps 09 e 10 sao **pulados** (early-return com `{ mutated: false, summary: 'skipped (additive-merge opt-in)' }`). Step 11 (`move-docs-with-stub`) NAO eh pulado — move de docs orfaos para `docs/references/` continua sendo additive-friendly. Logica de merge aditivo legado (modo conservador que NAO transforma CLAUDE.md) fica no Plano 05 fase-05 — este plano apenas declara o early-skip de 09/10. Fase-07 do Plano 04 atualiza o SKILL.md para refletir a semantica nova com `--additive-merge` como opt-in documentado.
- **G10 (D29 — manifest schema canonico compartilhado):** Backup manifest `.anti-vibe/backup/{ts}/manifest.json` segue schema canonico do Plano 01 fase-02: `{ timestamp: ISO 8601, files: ReadonlyArray<{ originalPath, backupPath, sha256, action: 'transform' | 'move' | 'overwrite' }>, gitSha: string | null }`. Step 10 (fase-03) emite entries com `action: 'transform'` para CLAUDE.md (e para cada doc fundido em DESIGN.md). Step 11 (fase-05) compartilha o MESMO diretorio de backup (mesmo `timestamp`) e adiciona entries com `action: 'move'`. Convencao: Step 10 inicia o backup (cria pasta `{ts}/` + manifest inicial) e Step 11 faz append. Se `createBackup` do Plano 01 nao expor `append`, fase-05 documentara um helper local `appendToLatestBackup` que valida `timestamp` e re-escreve o `manifest.json` com a lista crescida. **Adaptar conforme MEMORY do Plano 01 apos execucao.**
- **G11 (R-04 / DI-06 — Windows path safety):** Path joins via `path.join`, nao concatenacao com `/`. Timestamps no nome da pasta de backup ja sao path-safe per Plano 01 G5 (`2026-05-18T14-30-00Z`). Em fase-04, o `glob('**/*.md')` deve usar `posix: false` (ou converter `\\` → `/` no path retornado antes do regex de rewrite de link). O regex de rewrite usa o path-relativo-ao-arquivo-atual com forward slashes (Markdown sempre usa `/`).
- **G12 (SH-07 — subagent_id canonico):** Cada step deste plano emite uma entry no audit log via wrapper `logAudit` (stub ate Plano 06 fase-01). Strings fixas DESDE JA: Step 09 → `init-propose-merge`; Step 10 → `init-apply-merge`; Step 11 → `init-move-docs`. Testes pareados grepa o `summary` (ou um campo de telemetria do report) por essas literais.
- **G13 (cross-plano — artefatos de Plano 03 podem nao existir):** Os 3 JSONs em `.anti-vibe/discovery/` sao escritos pelos Steps 06/07/08 do Plano 03. Em repos greenfield (sem CLAUDE.md, sem docs estruturais), `discovered-docs.json` retorna lista vazia e `classification-result.json` lista mappings/orphans vazios. Step 09 trata listas vazias como "nada a propor" → `mutated: false`, summary "no transformations needed", **sem chamar needsUser**. Step 10 nesse caso recebe estado vazio do step anterior e tambem retorna `mutated: false`. Esta eh exatamente a condicao testada pelo tracer bullet do Plano 02 (greenfield) — Plano 04 nao quebra o tracer.
- **G14 (link-claude-agents test fragility):** Testes do Step 02 (`02-link-claude-agents.test.ts`) atualmente assumem que `CLAUDE.md` ainda existe no formato original (>40 linhas) quando Step 02 roda. Apos fase-06 (reorder), Step 02 roda DEPOIS de Step 10 e encontra `CLAUDE.md` ≤40 linhas ja transformado. Testes que crieram CLAUDE.md original com 287 linhas em fixture + rodavam Step 02 isolado PRECISAM ser ajustados: ou (i) o fixture passa a fornecer CLAUDE.md ja espelho ≤40 linhas (mais realistico apos reorder), ou (ii) o teste passa a rodar Step 10 + Step 02 em sequencia. Fase-06 deve listar os paths exatos via `Grep` antes de iniciar — nao improvisar.

---

## Criterios de Exit (plano completo quando)

- [ ] `skills/init/assets/snippets/design-md-skeleton.md` existe com EXATAMENTE 5 marcadores `{{include: ../akita-XXX.md}}` (um para cada snippet Akita), verificaveis via `grep -c '{{include: ../akita-' design-md-skeleton.md` retornando `5`.
- [ ] `skills/init/lib/doc-mover-stub.ts` exporta EXATAMENTE 3 simbolos publicos: `moveDocWithStub`, `rewriteInternalLinks`, `MoveResult`.
- [ ] `skills/init/lib/steps/09-propose-merge-batch.ts` exporta `proposeMergeBatchStep: Step` com `id === '09-propose-merge-batch'`; emite `needsUser` quando ha transformacoes propostas E nao esta em `--dry-run` E nao esta em `--additive-merge`.
- [ ] `skills/init/lib/steps/10-apply-merge-destructive.ts` exporta `applyMergeDestructiveStep: Step` com `id === '10-apply-merge-destructive'`; retorna `mutated: true` SOMENTE se backup foi escrito com sucesso E transformacao do CLAUDE.md/DESIGN.md completou.
- [ ] `skills/init/lib/steps/11-move-docs-with-stub.ts` exporta `moveDocsWithStubStep: Step` com `id === '11-move-docs-with-stub'`; ja skipa `README.md` raiz por design + assert no test.
- [ ] `skills/init/lib/registry.ts` posiciona `applyMergeDestructiveStep` IMEDIATAMENTE antes de `linkClaudeAgentsStep` (`registry.indexOf(applyMergeDestructiveStep) === registry.indexOf(linkClaudeAgentsStep) - 1`). Testes do `link-claude-agents` atualizados sem regressao (todos verdes).
- [ ] `skills/init/SKILL.md` linha 70 (ou equivalente apos rewrite) NAO contem mais o token "aditivo" como regra default — substituido pela nova regra ancorada em D26/D28 ("NUNCA sobrescrever sem aprovacao explicita + backup recuperavel"); `--additive-merge` documentado como opt-in conservador na mesma secao.
- [ ] `bun test skills/init/lib/doc-mover-stub.test.ts skills/init/lib/steps/09-propose-merge-batch.test.ts skills/init/lib/steps/10-apply-merge-destructive.test.ts skills/init/lib/steps/11-move-docs-with-stub.test.ts skills/init/lib/registry.test.ts skills/init/lib/steps/02-link-claude-agents.test.ts` retorna 0 falhas.
- [ ] `bun run lint` clean nos arquivos criados/modificados.
- [ ] `MEMORY.md` deste plano lista API publica final de `doc-mover-stub`, decisao sobre CH-02 (deferido com TODO), posicao final no registry apos reorder, schema do backup manifest apos uso real (validando convencao de append do G10), e qualquer DI/BUG/GT descoberto.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

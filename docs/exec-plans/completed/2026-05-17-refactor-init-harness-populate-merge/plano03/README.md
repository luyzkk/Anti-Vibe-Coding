# Plano 03: Discovery Pipeline (secrets + docs + classifier)

**Feature:** refactor-init-harness-populate-merge ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~3.5h (0.5h + 0.5h + 0.5h + 0.5h + 1h + 1h = 4h, com 0.5h de buffer absorvido)
**Depende de:** Plano 01 (contrato `Step{id, run}` confirmado + manifest schema canonico + flag `--rollback` reconhecida no dispatcher; este plano NAO consome `lib/backup-anti-vibe.ts` mas o GO do EXECUTE_PLAN_AUDIT eh pre-requisito do PRD)
**Desbloqueia:** Plano 04 (merge invertido destrutivo consome `.anti-vibe/discovery/classification-result.json`)

---

## O que este plano entrega

Pipeline de discovery **read-only** composto por 3 novos steps no registry — Step 06 (`secrets-scan`), Step 07 (`discover-existing-docs`) e Step 08 (`classify-blocks-hybrid`). Ao final da execucao em um repo com CLAUDE.md/docs estruturais, existem em disco tres artefatos JSON em `.anti-vibe/discovery/` descrevendo (1) quais arquivos contem secrets, (2) quais arquivos `.md/.mdx` sao candidatos a re-categorizacao em paths harness, e (3) qual a categoria-alvo + confianca de classificacao para cada candidato. Nenhum arquivo do projeto-alvo eh mutado. Plano 04 consome esses 3 JSONs para propor merge em batch + mover arquivos.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Contrato `Step { id, run }` + `StepReport` | `skills/init/lib/steps/types.ts` | pronto |
| Dispatcher `runInit` iterando registry sequencial | `skills/init/lib/run-init.ts` | pronto |
| `TEMPLATE_MANIFEST` exportado (lista canonica `dst` -> categoria implicita) | `skills/init/lib/template-manifest.ts` | pronto |
| Helpers de backup canonicos (NAO consumidos aqui — Plano 03 nao escreve `.anti-vibe/backup/`) | Plano 01 fase-02 | nao bloqueia |
| `EXECUTE_PLAN_AUDIT.md` veredito GO | Plano 01 fase-01 | pendente (gate do PRD, nao do plano) |
| Flag `--dry-run` reconhecida no parse (mas wiring read-only completo so vem no Plano 05) | Plano 01 fase-03 (parse stub) | parcial — Plano 03 entrega steps que ja sao naturalmente read-only |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/init/lib/secrets-scanner.ts` (`scanSecrets`, `SecretMatch`) | Plano 04 fase-05 (Step 11 move-docs-with-stub checa flag `blockedBySecret` antes de mover) |
| `skills/init/lib/discover-existing-docs.ts` (`discoverExistingDocs`, `DiscoveredDoc`) | Plano 04 fase-02 (Step 09 propose-merge-batch renderiza lista no diff agregado) |
| `skills/init/lib/blocks-classifier.ts` (`classifyDocs`, `ClassifyOutput`, `HarnessCategory`) | Plano 04 fase-02 (Step 09 propose-merge-batch usa `mappings` + `orphans` no diff); Plano 02 fase-02 quando re-invocado em modo non-greenfield consome `sharedGlossary` |
| `skills/init/lib/discovery-store.ts` (helper read/write em `.anti-vibe/discovery/*.json`) | Plano 04 fase-03 (Step 10 le `classification-result.json` para extrair Akita), Plano 05 fase-03 (drift detector pode reusar o store) |
| `skills/init/assets/snippets/classifier-llm-prompt.md` (template do prompt para refinement) | Plano 04 fase-02 (Step 09 pode renderizar o prompt em CH-02 "ver detalhe por arquivo"), Plano 02 fase-02 (re-invocado em modo non-greenfield le o template para enriquecer tasks de populacao) |
| 3 entries no registry (`06-secrets-scan`, `07-discover-existing-docs`, `08-classify-blocks-hybrid`) posicionadas APOS `reuseDiscoveryStep` e ANTES de `migrate0ParseDryRunStep` | Plano 04 fase-06 (registry reorder Step 10 antes Step 02) — reorder diferente, sem conflito com este plano |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-secrets-scanner-lib.md` | `lib/secrets-scanner.ts` + testes (5 regex literals, tipo `SecretMatch`, `redactedSample` 4 chars + `***`) | 0.5h | — |
| 02 | `fase-02-step-06-secrets-scan.md` | `lib/steps/06-secrets-scan.ts` + entrada no registry apos `reuseDiscoveryStep` + `lib/discovery-store.ts` (novo helper) + testes pareados (CA-04) | 0.5h | fase-01 |
| 03 | `fase-03-discover-existing-docs-lib.md` | `lib/discover-existing-docs.ts` + testes (whitelist `.md/.mdx`, blacklist `node_modules\|dist\|build\|.git\|.anti-vibe/backup`, README guard D6) | 0.5h | — |
| 04 | `fase-04-step-07-discover-existing-docs.md` | `lib/steps/07-discover-existing-docs.ts` + entrada no registry apos Step 06 + cross-check com `secrets-scan-result.json` (flag `blockedBySecret`) + perf test stub | 0.5h | fase-02, fase-03 |
| 05 | `fase-05-blocks-classifier-lib.md` | `lib/blocks-classifier.ts` + `assets/snippets/classifier-llm-prompt.md` + testes (heuristica + confidence high/medium/low + orphan rule + glossario) | 1h | fase-03 |
| 06 | `fase-06-step-08-classify-blocks-hybrid.md` | `lib/steps/08-classify-blocks-hybrid.ts` + entrada no registry apos Step 07 + escrita de `classification-result.json` + flag `pendingLlmRefinement` (LLM deferido para Plano 04+) | 1h | fase-04, fase-05 |

---

## Grafo de Fases

```
fase-01 (secrets-scanner-lib)        fase-03 (discover-existing-docs-lib)
    |                                       |
    v                                       v
fase-02 (step-06-secrets-scan)       fase-04 (step-07-discover-existing-docs)
    |                                       |
    +--------------- + ---------------------+
                     |
                     v
              fase-05 (blocks-classifier-lib)
                     |
                     v
              fase-06 (step-08-classify-blocks-hybrid)
```

**Paralelismo possivel:** fase-01 e fase-03 sao independentes (libs sem deps cruzadas) — podem ser executadas em paralelo por sub-agentes distintos. fase-02 depende de fase-01; fase-04 depende de fase-02 (cross-check secrets) e fase-03. fase-05 depende apenas de fase-03 (tipos `DiscoveredDoc`). fase-06 integra fase-04 + fase-05.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A — o tracer bullet feature-wide eh `Plano 02 fase-04` (greenfield-e2e). Plano 03 NAO toca o caminho greenfield (em greenfield nao ha docs para descobrir nem secrets para escanear). O slice mais fino DESTE plano eh `fase-02-step-06-secrets-scan` integrada no registry — prova end-to-end que (1) o registry aceita 3 novos steps na posicao escolhida e (2) o `discovery-store` helper persiste corretamente sem violar `mutated: false`.

- **fase-01:** RED-GREEN-REFACTOR. Cada um dos 5 regex tem 1+ teste com fixture string (match positivo) + 1 teste negativo (string que NAO casa, ex: `sk_test_*` para nao confundir com `sk_live_*`).
- **fase-02:** RED-GREEN-REFACTOR. Step com 3 testes: scan vazio, scan com matches, integracao registry (asserta posicao apos `reuseDiscoveryStep`).
- **fase-03:** RED-GREEN-REFACTOR. Lib com 1 fixture E2E (5 arquivos, retorna 4 sorted, exclui README + node_modules).
- **fase-04:** RED-GREEN-REFACTOR. Step com 3 testes: discovery vazio, com flag `blockedBySecret`, integracao registry. Perf medido com `performance.now()` em fixture de 50 arquivos (escala completa de 500 fica em `// TODO Plano 07 fase-05`).
- **fase-05:** RED-GREEN-REFACTOR. Classifier com 4 testes: high confidence, ambiguo medium, orphan, glossary extraction.
- **fase-06:** RED-GREEN-REFACTOR. Step com 3 testes: sem ambiguos (todos high), com ambiguos (marca `pendingLlmRefinement`), integracao registry.

---

## Gotchas Conhecidos

- **G1 (D5 + SH-02 — escopo blacklist):** Discovery e secrets-scan filtram caminhos que contenham os tokens `node_modules`, `dist`, `build`, `.git`, `.anti-vibe/backup`. Whitelist eh `.md` e `.mdx` apenas. Test de cada lib assertara que arquivos com `node_modules/foo.md` no path NAO entram na saida. Por que: D5 explicita e blacklist evita custos em repos com bundles gigantes.
- **G2 (D6 + MH-08 — README intocavel):** `README.md` da raiz do projeto-alvo (somente o do nivel `cwd`, nao `cwd/docs/README.md` que faz parte do harness) eh filtrado FORA do `DiscoveredDoc[]` retornado pelo `discoverExistingDocs`. Teste #2 da fase-03 cria fixture com README na raiz + outro README em `/docs/` e asserta que so o segundo aparece (o de raiz some). Por que: README eh contrato publico do repo (CA-08 do PRD).
- **G3 (D16 + SH-01 — secrets antes de move):** Ordem no registry eh `... reuseDiscoveryStep -> Step 06 (secrets-scan) -> Step 07 (discover-existing-docs) -> Step 08 (classify-blocks-hybrid) -> migrate0ParseDryRunStep ...`. Isso garante que QUALQUER decisao subsequente de mover/transformar arquivo (Steps 09/10/11 do Plano 04) ja tem o resultado de secrets-scan. Plano 04 fase-06 (registry reorder Step 10 antes Step 02) NAO conflita com esta decisao — sao reorders independentes em regioes diferentes do registry. Test de integracao na fase-02 + fase-04 + fase-06 asserta a posicao.
- **G4 (D8 — hibrido heuristica + LLM):** No v6.4.0 inicial, o LLM refinement eh **DEFERIDO**. A heuristica do classifier eh determinista e produz `confidence: 'high' | 'medium' | 'low'`. Quando `medium` ou `low`, o classifier marca `pendingLlmRefinement: true` no resultado e devolve a categoria heuristica como fallback. O Step 09 (Plano 04) decide se renderiza o prompt LLM ou aceita a heuristica. Test #2 da fase-06 asserta que `pendingLlmRefinement` aparece para ambiguos e NAO aparece para `high`. Por que: evita acoplar v6.4.0 com infraestrutura de subagent paralelo nesta camada.
- **G5 (D11 — orfaos para references):** Quando `confidence === 'low'` E nenhuma categoria heuristica casa (zero matches em todas as regex), o classifier emite um `OrphanMapping` com destino `docs/references/{basename do source}`. Teste #3 da fase-05 cria fixture `LICENSE-NOTES.md` (sem matches em nenhuma categoria) e asserta `target === 'docs/references/LICENSE-NOTES.md'`. Por que: D11 explicito + `docs/references/` ja existe no `TEMPLATE_MANIFEST`.
- **G6 (D13 + CH-03 — glossario compartilhado):** O output do classifier inclui `sharedGlossary: GlossaryEntry[]` (termos com >=3 ocorrencias entre docs analisados, ignorando stopwords PT-BR/EN, palavras >=4 chars). O Plano 02 fase-02 (`populate-plan-generator`), quando re-invocado em modo non-greenfield, le `classification-result.json` e usa o `sharedGlossary` para enriquecer prompts dos subagentes (D13). No tracer bullet greenfield, esse arquivo nao existe e o glossary fica `undefined` — comportamento ja documentado no plano02 G6.
- **G7 (D14 — filosoficos excluidos):** O enum `HarnessCategory` do classifier **NAO** inclui `COMPOUND_ENGINEERING.md` nem `PRODUCT_SENSE.md`. Mesmo que a heuristica detecte palavras-chave como "compound" ou "product sense", a categoria nao existe como destino e o mapping nunca aponta para esses paths. Teste de exclusao na fase-05 garante que regex deliberadamente "auth + compound" mapeia para SECURITY (ou orphan), nunca para COMPOUND_ENGINEERING. Por que: D14 explicito — filosoficos sao postura canonica.
- **G8 (D18 — `--dry-run` global):** Os 3 steps deste plano sao **read-only por design** (apenas leem `cwd`, escrevem JSON em `.anti-vibe/discovery/` que conta como metadata de discovery, NAO como mutacao de harness). Em `--dry-run`, comportamento eh IDENTICO ao normal exceto que o `discovery-store` helper recebe a flag `noWrite: true` (wiring real em Plano 05 fase-01). Plano 03 entrega o helper parametrizavel para que Plano 05 ative o switch. `mutated: false` em todos os reports.
- **G9 (D19 + SH-07 — subagent_id canonico):** Cada step deste plano emite uma entry no audit log com `subagent_id` literal. Strings fixas DESDE JA (mesmo que o wiring final do `AuditLogWriter` venha no Plano 06 fase-01): `init-secrets-scan`, `init-discover-existing-docs`, `init-classify-blocks`. Plano 03 usa um wrapper local `logAudit` que delega para `AuditLogWriter` se disponivel via DI (`ctx.flags['__auditLog']` opcional) ou eh no-op caso contrario. Plano 06 fase-01 substitui o wrapper pela invocacao canonica. Test do step 06/07/08 assertara que o `summary` contem o literal exato do `subagent_id` (proxy ate Plano 06 conectar).

---

## Criterios de Exit (plano completo quando)

- [ ] `skills/init/lib/secrets-scanner.ts` exporta exatamente: `scanSecrets`, `SecretMatch`, `SecretKind` (3 simbolos publicos).
- [ ] `skills/init/lib/discover-existing-docs.ts` exporta exatamente: `discoverExistingDocs`, `DiscoveredDoc` (2 simbolos publicos).
- [ ] `skills/init/lib/blocks-classifier.ts` exporta exatamente: `classifyDocs`, `ClassifyInput`, `ClassifyOutput`, `DocMapping`, `OrphanMapping`, `HarnessCategory`, `GlossaryEntry` (7 simbolos publicos).
- [ ] `skills/init/lib/discovery-store.ts` exporta exatamente: `readDiscoveryArtifact`, `writeDiscoveryArtifact`, `discoveryArtifactPath` (3 simbolos publicos).
- [ ] `skills/init/lib/steps/06-secrets-scan.ts` exporta `secretsScanStep: Step` com `id === '06-secrets-scan'`.
- [ ] `skills/init/lib/steps/07-discover-existing-docs.ts` exporta `discoverExistingDocsStep: Step` com `id === '07-discover-existing-docs'`.
- [ ] `skills/init/lib/steps/08-classify-blocks-hybrid.ts` exporta `classifyBlocksHybridStep: Step` com `id === '08-classify-blocks-hybrid'`.
- [ ] `skills/init/lib/registry.ts` tem `secretsScanStep`, `discoverExistingDocsStep`, `classifyBlocksHybridStep` posicionados nesta ordem APOS `reuseDiscoveryStep` e ANTES de `migrate0ParseDryRunStep`.
- [ ] `skills/init/assets/snippets/classifier-llm-prompt.md` existe com 4 placeholders verificaveis via grep: `{{FILE_PATH}}`, `{{FILE_PREVIEW}}`, `{{CANDIDATE_CATEGORIES}}`, `{{GLOSSARY_TERMS}}`.
- [ ] `bun test skills/init/lib/secrets-scanner.test.ts skills/init/lib/discover-existing-docs.test.ts skills/init/lib/blocks-classifier.test.ts skills/init/lib/discovery-store.test.ts skills/init/lib/steps/06-secrets-scan.test.ts skills/init/lib/steps/07-discover-existing-docs.test.ts skills/init/lib/steps/08-classify-blocks-hybrid.test.ts skills/init/lib/registry.test.ts` retorna 0 falhas.
- [ ] `bun run lint` clean nos arquivos criados/modificados.
- [ ] Todos os 3 steps retornam `mutated: false` em todos os caminhos de execucao (test #N em cada fase asserta isso).
- [ ] `MEMORY.md` deste plano lista API publica final das 3 libs + helper `discovery-store` + qualquer DI/BUG/GT descoberto + nota explicita de que o LLM refinement esta deferido (G4) e o wrapper `logAudit` eh stub ate Plano 06 fase-01 (G9).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

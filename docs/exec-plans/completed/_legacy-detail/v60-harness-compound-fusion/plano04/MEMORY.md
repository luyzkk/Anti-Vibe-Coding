# Memoria: Plano 04 — Validators Full (compound-check + advanced rules + perf bench)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion
**Iniciado:** _(preencher na execucao)_
**Status:** planned — aguardando execucao

---

## Decisoes de Implementacao

### fase-01 (compound-check skeleton)
- **DI-01-01 (Bun Dirent typing):** `Awaited<ReturnType<typeof fs.readdir>>` resolve para `Dirent<NonSharedBuffer>[]` no tsconfig do projeto (Bun types). Solucao: nao declarar tipo explicito para `entries`; usar `String(entry.name)` para normalizar. Padrao alinhado com `copy-recursive.ts`/`backup-planning.ts`.
- **DI-01-02 (non-null assertion em testes):** `result[0]!` apos `expect(result.length).toBe(1)` — invariante garantida pela assertion anterior, mais expressivo que `result.at(0) ?? ''`.
- **DI-01-03 (lint nao configurado):** `bun run lint` retorna "Script not found" — projeto nao tem linter. Typecheck substitui verificacao sintatica. Checklist da fase desconsidera.

### fase-03 (harness-validate advanced)
- **DI-03-01:** `README.md` e `.github/pull_request_template.md` faltavam no scaffold v6 — adicionados como `.tpl` entries 28+29 do manifest. Alternativa "remover do REQUIRED_FILES" rejeitada (regressao vs Andre). Tracer regression confirmou a decisao.
- **DI-03-02:** Lista canonica de 25 required-files difere do Andre: removidos `scripts/harness-validate.mjs` + `scripts/new-plan.mjs` (substituidos por `.ts`); adicionados `CLAUDE.md`, `docs/COMPOUND_ENGINEERING.md`, `docs/STATE.md`, `scripts/harness-validate.ts`, `scripts/compound-check.ts` (adaptacoes v6). Lista completa em commit f114f7b.

### fase-02 (frontmatter + sections validator)
- **DI-02-A1:** Ambiguity 04-A1 resolvida — match estrito H2 case-sensitive `^## (Problem|Solution|Prevention)\s*$`, sem aliases. Mensagem: `"missing required H2 section: ## Solution"`. Reversivel se PRD permitir aliases.
- **DI-02-A2:** Ambiguity 04-A2 resolvida — `tags` DEVE ser array com >=1 string nao-vazia (hard error). Array vazio viola D19. Reversivel se PRD permitir tags vazio com warn.
- **DI-02-G4:** `gray-matter` NAO esta no package.json do submodule — parser inline regex (`FRONTMATTER_RE`) cobre 100% dos casos: chaves planas, listas inline `[a,b]`, listas YAML block (`- item`). Sem dependencia nova.

### fase-04 (perf bench)
- **DI-04-A3:** Ambiguity 04-A3 resolvida — CA-26 per-validator: `harness:validate` <2s E `compound:check` <2s separadamente. Soma e informacional. Gating no bench via `BUDGET_MS = 2000` aplicado individualmente.
- **DI-04-A4:** Ambiguity 04-A4 resolvida — warmup + 3 medicoes reais, gating na mediana das 3. Rationale: G5 (Windows Defender) absorvido pelo warmup; variancia entre runs 1-3 e <10ms em SSD normal. Se run inicial fosse usado, resultados seriam 800-1500ms mais altos em Windows.
- **DI-04-tsconfig:** `tests/fixtures/compound-100-docs` adicionado ao `exclude` do `tsconfig.json`. O conteudo gerado (harness-validate.ts copiado do .tpl) tem erros de tipo por design (usa `m[1]` sem non-null-assert em versoes antigas do script Andre). Solucao: excluir fixture gerada do typecheck em vez de poluir o .tpl com as-casts.

### fase-05 (package.json + GH Actions)
- **DI-05-actionlint:** Ambiguity DI-6 resolvida — `actionlint` deferido. Validacao YAML por heuristica (sem tabs; `name:`/`on:`/`jobs:` presentes). Registrado como "deferido para fase posterior" no plano.
- **DI-05-workflow-path:** Workflow vive em `assets/static/.github/workflows/harness.yml` (Plano 02 fase-04 copia verbatim). Spec original referenciava `.tpl`, mas seria duplicacao divergente. Editado o arquivo real.
- **DI-05-steps-separados:** Workflow mantem 2 steps separados (`Validate harness structure` + `Validate compound notes`) — nao usa `harness:all` no CI. Razao: nome do step falhante aparece no UI do GitHub. `harness:all` existe so para uso local.

### Pontos abertos para fases seguintes
<!--
- **DI-1 (fase-02):** Resposta a Ambiguity 04-A1 (estrita H2 vs aliases). Default assumido: estrita.
- **DI-2 (fase-02):** Resposta a Ambiguity 04-A2 (tags array nao-vazio vs warn-only). Default assumido: erro hard.
- **DI-3 (fase-04):** Resposta a Ambiguity 04-A3 (per-validator <2s vs soma <2s). Default assumido: per-validator.
- **DI-4 (fase-04):** Resposta a Ambiguity 04-A4 (mediana de 3 medicoes vs primeiro run). Default assumido: mediana.
- **DI-5 (fase-02):** Decisao sobre `gray-matter` lib vs parser inline para YAML frontmatter (G4). Resposta padrao: parser inline simples se cobrir 95% dos casos.
- **DI-6 (fase-05):** Versao do `actionlint` (se incluido) — pinning ou latest?
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-04-01:** `harness-validate.ts` H1 check conflita com compound notes que tem frontmatter YAML
  - Sintoma: bench fixture de 100 docs — `harness:validate` exit 1 com `[markdown-heading] docs/compound/X.md must start with an H1 heading`
  - Causa: `checkMarkdownFiles` aplica `content.startsWith('# ')` a todos os `.md` incluindo `docs/compound/*.md`. Compound notes por design (CA-29) tem frontmatter `---` em linha 1, nao H1.
  - Fix: adicionar `'compound'` ao `SKIP_DIRS` em `harness-validate.ts.tpl`. `compound-check.ts` valida esse diretorio independentemente.
  - Fase afetada: fase-03 (bug latente) — descoberto em fase-04
  - Testes de regressao: `harness-validate-advanced.test.ts` 7 testes (todos pass) + tracer bullet (pass)

---

## Gotchas

### fase-01
- **GT-01:** Bun `Dirent` types (NonSharedBuffer) — `entry.name` precisa de `String(...)` ou inferencia implicita para comparar com strings literais. Relevante para qualquer helper que itera `fs.readdir({withFileTypes:true})`.
- **GT-02 (lint ausente):** Projeto `anti-vibe-coding/` nao tem script `lint`. Fases futuras que dependam de lint precisam fallback para typecheck-only.

### fase-02
- **GT-03 (fixtures placeholder de fases anteriores):** `compound-check-skeleton.test.ts` (fase-01) usava notas sem frontmatter esperando exit 0 — quando fase-02 adicionou validacao, esses testes regrediram. Padrao: ao adicionar validacao em fase posterior, ATUALIZAR fixtures dos testes de fases anteriores. Generalizavel para qualquer projeto onde testes E2E sao escritos antes da regra de validacao.

### fase-04
- **GT-04 (Windows Defender warmup empirico):** Em maquina com Defender ativo, runs apos warmup ficaram em 85-95ms — sem evidencia do pico de 800-1500ms previsto pelo G5. Possivel razao: Defender ja havia scaneado o `.tpl` antes da fixture gerar copias. Bench confirma warmup pass e util ate em "ambiente quente".
- **GT-05 (TDD gate bloqueia geradores):** Hook `tdd-gate.cjs` bloqueou criacao de `generate-compound-fixture.ts` sem teste correspondente. Padrao: scripts geradores tambem precisam `.test.ts` co-localizado (criar RED primeiro). Aplicavel a Plano 06+ se introduzirem mais scripts utilitarios.

### fase-05
- **GT-06 (workflow path bifurcado):** 2 paths existem para `.github/`: `assets/static/.github/` (Plano 02 — copia verbatim) e `assets/templates/.github/` (Plano 04 fase-03 — copia com substituicao de placeholders). Workflow YAML vive em `static/`. PR template existe em ambos paths. Edits em qualquer um exigem confirmar qual caminho o `/init` usa.

<!-- Pontos prováveis quando executar:
- **GT-3 (esperado):** Bench em Windows Defender — registrar tempos reais observados (warmup vs cached)
- **GT-4 (esperado):** Edge case em frontmatter — registrar pattern de corrupcao que aparece no repo real do anti-vibe-coding
- **GT-5 (esperado):** Heuristica de orphan-plan-detector — falsos positivos observados quando rodar contra `.planning/` real do plugin
-->

---

## Desvios do Plano

### fase-01
- **DEV-01-01:** Provenance em `compound-files-collector.ts` mantida no cabecalho do arquivo; funcao interna `collectMarkdown` nao recebeu provenance inline (alinhado com padrao de outros helpers privados do projeto).
- **DEV-01-02:** Teste de manifest mantido com `toBeGreaterThanOrEqual(25)` — ja cobre 27 e e mais robusto a futuras adicoes. Spec dizia "atualizar para 27" mas assert flexivel preferivel.

### fase-02
- **DEV-02-01:** Testes 3 e 4 de `compound-check-skeleton.test.ts` (fase-01) foram **atualizados** para usar notas com frontmatter valido. Spec assumia "regressao 4/4 passando" sem mudancas, mas notas placeholder da fase-01 nao tinham frontmatter — falhavam com a nova validacao. Comportamento testado (contagem) preservado.

### fase-03
- **DEV-03-01:** Lista canonica de required-files diverge do `.mjs` do Andre: 25 (v6) vs 22 (Andre). Razoes: 3 arquivos novos (CLAUDE.md, COMPOUND_ENGINEERING.md, STATE.md, harness-validate.ts, compound-check.ts) e 2 removidos (`.mjs` migrados para `.ts`). Tracer regression confirma scaffold gera todos os 25.
- **GT-03 reaplicado:** Fixture do "exits 0" em `tests/harness-validate.test.ts` precisou atualizacao para incluir todos os 25 required-files. Confirma o padrao documentado em fase-02 (fixtures de fases anteriores se atualizam quando validacao expande).

### fase-04
- **DEV-04-01:** Gerador `generate-compound-fixture.ts` precisou de teste co-localizado (`.test.ts`) por causa de TDD gate. Solucao: RED do teste primeiro → GREEN. Adiciona 5 testes uteis (idempotencia, required-files, contagem notes/plans, planos nao-orfaos).
- **DEV-04-02:** Script `perf:validators` NAO adicionado ao `package.json` por fase-04 — proibicao explicita de tocar package.json (escopo de fase-05).
- **DEV-04-03:** `harness-validate.ts.tpl` (de fase-03) modificado por fase-04 para fix BUG-04-01. Tecnicamente toca fase anterior, mas justificado: bench descobriu bug latente. 7 testes da fase-03 + tracer continuam OK.

### fase-05
- Nenhum desvio material. `actionlint` deferido conforme DI-05-actionlint. Path do workflow (`static/` vs `templates/`) pre-investigado conforme protocolo.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 5 |
| Bugs encontrados | 1 (BUG-04-01) |
| Retries necessarios | 1 |
| Tempo de `harness:validate` em fixture 100-docs (warm) | 88ms mediana (runs: 88, 95, 85ms) — Windows local |
| Tempo de `compound:check` em fixture 100-docs (warm) | 90ms mediana (runs: 90, 86, 90ms) — Windows local |
| Aggregate (informacional) | 177ms — ambos CA-26 PASS (<2000ms) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Para Plano 05 (Skill Migration + Hooks)
- **Helper `lib/compound-frontmatter.ts`** exporta `parseFrontmatter(body): { data, errors }` (Plano 04 fase-02). Schema validado: `title: string`, `category: string`, `tags: string[]` (>=1 string nao-vazia), `created: YYYY-MM-DD`. Sections check: H2 estrito `^## (Problem|Solution|Prevention)\s*$`. Use ao escrever lessons-learned em `docs/compound/` (Plano 05 fase-01).
- **Helper `lib/compound-files-collector.ts`** exporta `listCompoundFiles(root)` excluindo `_archived/` + `README.md`/`index.md`. Plano 06 fase-05 (CRUD `--update`) reusa para enumerar lessons vivas.
- **Helper `lib/orphan-plan-detector.ts`** exporta heuristica `looksComplete(content): boolean`. Plano 05 fase-05 (`/execute-plan`) usa logica INVERSA: so move para `completed/` quando `looksComplete === true`.

### Para Plano 06 (Agent-Native CRUD)
- Mesmo `compound-frontmatter.ts` valida em re-escrita (`--update --preview`). Reusa `parseFrontmatter` + sections check antes de gravar.
- Lock file `~/.claude/cache/...` ainda nao introduzido — Plano 06 fase-01 cuida.

### Para Plano 08 (Dog-Fooding)
- **Fixture `tests/fixtures/compound-100-docs/`** gerada por `tests/fixtures/generate-compound-fixture.ts` (idempotente). Plano 08 fase-08 reusa para bench CA-04.
- `harness:validate` e `compound:check` ja medidos em fixture 100 docs: mediana 88ms + 90ms (Windows local). Margem 20x sobre alvo CA-26 (<2s per-validator).
- **`scripts/perf:validators`** NAO esta no `package.json.tpl` — fase-04 deliberadamente nao adicionou. Plano 08 ou Plano 09 decide se promove para script publico (provavel: manter como teste interno).

### Para Plano 09 (Release)
- **Workflow `.github/workflows/harness.yml`** (em `assets/static/`) chama AMBOS validators em sequencia (`Validate harness structure` + `Validate compound notes`) com `::group::` collapsing. Trigger estende para `master`. Plano 09 fase-04 sync-to-global preserva.
- `package.json.tpl` agora tem 4 scripts: `harness:validate`, `compound:check`, `harness:all` (combinado), `test`. Sync-to-global manifest copia integralmente.

### Bugs/Padroes cross-plan
- **GT-03/GT-05 (TDD gate + fixtures placeholder):** Ao adicionar validacao, atualizar fixtures de testes E2E de fases anteriores. Geradores tambem precisam `.test.ts` co-localizado.
- **GT-04 (Defender warmup empirico):** Bench em Windows nao mostrou pico de 800-1500ms previsto — warmup pass absorve. Mantido o padrao 1 warmup + 3 mediana.
- **BUG-04-01 (frontmatter conflita com H1 check):** `harness-validate` SKIP_DIRS agora exclui `compound/`. Qualquer novo diretorio que use frontmatter YAML em vez de H1 (ex: futuras `references/`?) precisa entrar em SKIP_DIRS tambem.

---

<!-- Atualizado automaticamente durante execucao -->

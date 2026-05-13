# Plano 04: Validators Full (compound-check + advanced rules + perf bench)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~7h
**Depende de:** Plano 02 (Full Scaffold — `lib/detect-stack.ts`, `.github/workflows/harness.yml`, manifest de templates 26 entradas, scaffolding completo do `docs/`)
**Desbloqueia:** Plano 08 (Dog-fooding — roda `harness:validate` + `compound:check` no proprio plugin para CA-04/CA-05), Plano 09 (Release — CI bloqueia merge se validators falharem)

---

## O que este plano entrega

Estende o validator minimal entregue pelo Plano 01 fase-04 (`scripts/harness-validate.ts` com 3 checks essenciais) e cria o **segundo validator estrutural** (`scripts/compound-check.ts`). Ao final do plano, o usuario tem **2 comandos bun** que rejeitam em CI todos os principais vetores de drift do harness:

- `bun run harness:validate` valida estrutura completa: 22+ arquivos obrigatorios, AGENTS.md ≤40 linhas (R3, CA-27), planos orfaos em `docs/exec-plans/active/` (CA-28), links relativos quebrados em todo `.md` do repo, headings H1 obrigatorios.
- `bun run compound:check` valida que cada `docs/compound/*.md` tem YAML frontmatter completo (`title`/`category`/`tags`/`created`) e secoes obrigatorias `## Problem` / `## Solution` / `## Prevention` (CA-29).

Performance alvo: **<2s em projeto com 100 docs Markdown** (CA-26), medida em fixture sintetica gerada pela fase-04. `.github/workflows/harness.yml` (do Plano 02) passa a chamar ambos os scripts no PR check (fase-05 desta plano). Atende **D13** (TS+bun), **M5+M6** (validadores rodam em CI), **R3** (line-count rejeitado), **CA-26/27/28/29**.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `scripts/harness-validate.ts` minimal (3 checks, TS+bun, ja em template do `/init`) | Plano 01 fase-04 | pendente (sera entregue por Plano 01) |
| Template manifest com paths v6 (`docs/exec-plans/active/README.md`, `docs/compound/README.md`, `docs/design-docs/index.md`, etc.) — define quais arquivos sao obrigatorios | Plano 02 fase-01 | pendente |
| Helper `lib/detect-stack.ts` + tipo `DetectedStack` — fase-04 (perf bench) podera testar em fixtures de stacks variadas | Plano 02 fase-06 | pendente |
| `.github/workflows/harness.yml` template inicial (chama `bun run harness:validate`) | Plano 02 fase-04 | pendente (fase-05 deste plano estende com `compound:check`) |
| Fixture `tests/fixtures/empty-dir/` + scaffold completo (para servir de base limpa nos testes do compound-check e harness-validate-advanced) | Plano 01 fase-05 + Plano 02 fase-02 | pendente |
| Source canonica do validator do Andre — `f:/Projetos/Claude code/V6.0.0/package/skills/harness-engineering/assets/harness-template/scripts/harness-validate.mjs` (referencia para checks avancados) | Repo (referencia) | pronto |
| PRD com CA-26, CA-27, CA-28, CA-29 confirmados | `../PRD.md` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|--------------|
| `scripts/harness-validate.ts` versao **full** (link-check + orphan-plan + line-count + heading-check + required-files-22+) | Plano 08 fase-08 (CA-04 — rodar em si proprio, exit 0); Plano 09 fase-05 (CI bloqueia release) |
| `scripts/compound-check.ts` (frontmatter + secoes Problem/Solution/Prevention) | Plano 08 fase-08 (CA-05 — compound notes do plugin sao validos), Plano 05 fase-01 (lessons-learned migrada DEVE gerar compound notes que passem nesse check) |
| Helper `lib/compound-frontmatter.ts` (parser de YAML frontmatter + validator de schema) | Plano 05 fase-01 (lessons-learned migration usa para garantir frontmatter ao escrever), Plano 06 fase-05 (CRUD `/lessons-learned --update` valida campos antes de reescrever) |
| Helper `lib/orphan-plan-detector.ts` (heuristica "plano em active/ parece completo") | Plano 05 fase-05 (`/execute-plan` ao mover para `completed/` usa logica oposta), Plano 06 fase-03 (STATE.md gera `Pending` enumerando planos ativos — filtra orfaos) |
| Fixture `tests/fixtures/compound-100-docs/` (gerador sintetico de 100 compound notes) | Plano 08 fase-08 (bench em fixture real do plugin), CA-26 (perf check em CI futuro) |
| `package.json` template atualizado com `compound:check` script | Plano 08 fase-01 (dog-food herda esses scripts no proprio plugin) |
| `.github/workflows/harness.yml` chama os 2 validators em sequencia + reporta tempo de execucao | Plano 09 fase-04 (sync-to-global preserva o workflow), Plano 08 fase-08 (CI do plugin roda esse workflow) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-compound-check-skeleton.md | `scripts/compound-check.ts.tpl` esqueleto + `lib/compound-files-collector.ts` (lista todos `docs/compound/*.md` excluindo `_archived/` e `README.md`) + teste E2E exit 0 em fixture vazia | 1.5h | Plano 02 fase-01 (estrutura `docs/compound/` existe no scaffold) |
| 02 | fase-02-compound-frontmatter-validator.md | Helper `lib/compound-frontmatter.ts` (parse YAML + valida `title`/`category`/`tags`/`created`) + check de secoes obrigatorias `## Problem` `## Solution` `## Prevention` + integracao em `compound-check.ts` (CA-29) | 1.5h | fase-01 |
| 03 | fase-03-harness-validate-advanced.md | Estende `scripts/harness-validate.ts` (Plano 01 minimal → full): 22+ required-files do harness do Andre, link-checker recursivo, `lib/orphan-plan-detector.ts` (CA-28), continua rejeitando AGENTS >40 (CA-27, R3) | 2h | Plano 01 fase-04, Plano 02 fase-01 |
| 04 | fase-04-performance-bench.md | Gerador `tests/fixtures/compound-100-docs/` (script bun cria 100 compound notes sinteticos + 20 planos ativos + 20 ADRs) + `tests/perf/validators.bench.ts` mede `harness:validate` + `compound:check` em <2s (CA-26) | 1h | fase-02, fase-03 |
| 05 | fase-05-package-json-scripts.md | `package.json.tpl` adiciona script `compound:check`; atualiza `.github/workflows/harness.yml` (Plano 02 fase-04) para chamar ambos validators em sequencia, com reporting de tempo; documenta exit codes | 1h | fase-02, fase-03 |

**Total:** 7h.

---

## Grafo de Fases

```
                Plano 02 (Full Scaffold)                    Plano 01 (Tracer Bullet)
                        |                                            |
                        v                                            v
                                 fase-03 (harness-validate-advanced)
                                 |       (estende validator minimal)
                                 |
        fase-01 (compound-check-skeleton)
                 |
                 v
        fase-02 (compound-frontmatter-validator)
                 |
                 +---------------+----------------+
                                 |                |
                                 v                v
                          fase-04 (perf)      fase-05 (package.json
                                              + GH Actions)
```

**Paralelismo possivel:** fase-01 (que cria `compound-check`) e fase-03 (que **estende** `harness-validate`) sao **independentes** — escrevem em arquivos disjuntos (`scripts/compound-check.ts` vs `scripts/harness-validate.ts`) e nao compartilham helpers ainda na fase-03. Um subagente pode rodar fase-03 em paralelo com fase-01 + fase-02. fase-04 (perf) e fase-05 (scripts + CI) so podem rodar **apos ambos validators estarem funcionando** (precisam medir/orquestrar os dois). fase-04 e fase-05 entre si tambem sao paralelizaveis (escrevem em `tests/perf/` vs `package.json`/`.github/`).

### Decisao de ordem

A numeracao natural (`01 → 02 → 03 → 04 → 05`) e a recomendada para execucao serial por subagente unico. **Quando paralelizar**: rodar `(01 → 02)` e `03` em duas worktrees separadas; depois convergir em fase-04 e fase-05 (que tambem podem ser paralelas).

Razao para fase-01 antes de fase-03 na ordem **serial**: fase-01 cria o **segundo** validator do zero (mais simples — pode ser feita de manha), enquanto fase-03 **estende** o validator minimal do Plano 01 (mais arriscada — regressao do tracer-bullet possivel). Comecar pelo greenfield builds momentum antes da extensao.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**TDD natural neste plano:**

- **fase-01 (compound-check-skeleton)** — RED: teste espera `compound-check.ts` exit 0 em fixture `docs/compound/` vazia (so README.md). Falha porque o script nao existe. GREEN: criar script que apenas itera diretorio e retorna exit 0 se nenhum erro.
- **fase-02 (frontmatter-validator)** — RED: teste cria `docs/compound/2026-05-12-foo.md` SEM frontmatter (apenas `# Title` + secoes) e espera exit 1 com mensagem `"docs/compound/2026-05-12-foo.md: missing frontmatter"`. Falha porque fase-01 nao valida frontmatter. GREEN: implementar parser YAML + validacao de schema. Segundo teste RED: arquivo com frontmatter completo MAS sem `## Solution` → exit 1 com `"missing required section: Solution"`.
- **fase-03 (harness-validate-advanced)** — RED: teste com plano `docs/exec-plans/active/2026-05-12-feat.md` contendo `## Exit Criteria\n- [x] all done\n## Validation Log\nharness:validate ✅` espera exit 1 (CA-28). Falha porque versao minimal so checa 3 arquivos. GREEN: implementar orphan-plan-detector + link-checker.
- **fase-04 (perf bench)** — RED: bench espera `harness:validate` retornar em <2000ms em fixture de 100 docs. Pode falhar inicialmente (sequencial em vez de paralelo). GREEN: paralelizar `fs.stat` / `fs.readFile` via `Promise.all`.
- **fase-05 (scripts + CI)** — Estrutural: teste de presenca verifica `package.json` tem chave `compound:check`. `actionlint` (ou inspecao manual) valida YAML do workflow.

**Tracer Bullet deste plano:** N/A (Plano 01 entregou o tracer global). **Gating end-to-end deste plano:** fase-03 — apos ela, `harness:validate` no projeto recem-init (saido do Plano 02) DEVE continuar exit 0. Se quebrar, regressao do tracer original do Plano 01 — corrigir antes de prosseguir.

---

## Gotchas Conhecidos

- **G1 (perf — herdado de Plano 01 G3):** O validator minimal usa `Promise.all` para 3 stats. Versao full tera 22+ stats + leitura de N markdown files (para link-check) + iteracao em `docs/exec-plans/active/`. **NUNCA loop sequencial** — sempre `Promise.all`. Validacao via fase-04 bench: <2s em 100 docs. Em SSD moderno cada `fs.readFile` de markdown de ~5KB e ~0.5ms; 100 arquivos paralelos = ~50ms. Loop sequencial = ~500ms — perto do limite. Margem reduz se anti-virus inspeciona arquivos (Windows Defender — ver gotcha G5).

- **G2 (cross-platform paths — herdado de Plano 01 G4, Plano 02 G2):** `path.join` em **todos** os helpers e scripts. O link-checker (`fase-03`) eh especialmente sensivel: `path.resolve(path.dirname(file), linkTarget)` resolve corretamente em Windows e POSIX, mas comparar strings depois com slash-style `/` quebra. Sempre comparar via `path.relative` apos resolve. Markdown linktargets na origem usam **forward slash** (convencao MD) — funciona porque `path.resolve` normaliza.

- **G3 (fixture limpa — herdado de Plano 02 G3):** Fixtures do Plano 04 (`tests/fixtures/compound-fixtures/`, `tests/fixtures/compound-100-docs/`) precisam de `afterEach` recursivo. **Atencao especial em fase-04**: a fixture de 100 docs e gerada por script e tem `docs/compound/` + `docs/exec-plans/active/` + `docs/design-docs/` aninhados. `fs.rm(dir, { recursive: true, force: true })` em Windows pode falhar se algum bench process ainda tem handle aberto — adicionar `force: true` e fallback retry-once.

- **G4 (YAML frontmatter — fase-02):** Frontmatter MD canonico delimitado por `---` na **primeira linha** e fechado por `---` algum lugar nas primeiras N linhas. **Edge case**: arquivo que comeca com `---\n` mas SEM fechamento (frontmatter corrompido durante edicao manual). Parser deve rejeitar com `"frontmatter never closed"` — nao engolir silenciosamente. Usar parser robusto: regex `^---\n([\s\S]*?)\n---\n` (multi-linha, lazy). Considerar lib `gray-matter` se complexidade crescer, **mas verificar se ja existe em bun nativamente** antes de adicionar dependencia (decisao DI registrada em MEMORY no momento da execucao).

- **G5 (Windows Defender + perf — fase-04):** Em Windows Defender, primeira leitura de arquivos novos passa por scan AV — `fs.readFile` de 100 arquivos recem-criados pode levar 800-1500ms. Subsequente leitura cai para <50ms (cached). Bench deve **rodar 2x** e tomar a segunda medicao como official (warm cache). Documentar isso na fase-04. CI Linux (Ubuntu runner) nao tem esse problema.

- **G6 (orphan plan heuristica — fase-03):** O `.mjs` original do Andre tem uma funcao `activePlanAppearsComplete(content)` que combina dois sinais (`signals.filter(...).length >= 2`) e nega via `hasRemainingWorkMarker` (presenca de `- [ ]` ou "in progress"). **Replicar exatamente** — mexer na heuristica vira tunning interminavel. Documentar no JSDoc: "este detector e intencionalmente conservador; falsos negativos sao OK (plano fica mais tempo em active/); falsos positivos sao caros (autor recebe erro em PR sem motivo)".

- **G7 (provenance comments — herdado de Plano 02 G8):** Toda linha TS gerada neste plano leva `// 2026-05-11 (Luiz/dev): why...`. Templates `.md` (output ao usuario final) NAO levam provenance — sao para o projeto-alvo, nao runtime.

- **G8 (gravar AGENTS.md como teste — D2 idioma):** Validator rejeita por linha count, **nao** por idioma. Mas mensagens de erro em stderr ficam em **ingles** (são para o usuario final ler em CI). Mensagens em PT-BR apenas em comentarios JSDoc internos. Erros tipo `"AGENTS.md should stay short; keep it at 40 lines or fewer"` — texto verbatim do Andre, mantido (compatibilidade visual com docs do harness).

- **G9 (compound `_archived/` exclusion — fase-01):** Plano 06 fase-05 introduz CRUD `--delete` que move compound notes para `docs/compound/_archived/`. O `compound-check` NAO deve validar arquivos arquivados (eles foram intencionalmente removidos do active set). Helper `lib/compound-files-collector.ts` (fase-01) filtra esse path. Se Plano 04 entregar antes de Plano 06, o `_archived/` ainda nao existe — filtro fica defensivo (`if (path.includes('_archived')) skip`).

- **G10 (links em `_archived/` — fase-03):** Link-checker recursivo do `harness:validate` pode encontrar referencias para arquivos em `_archived/` (links de notes antigas para notes mais antigas). **Decisao:** `_archived/` eh EXCLUIDO da iteracao de markdown files no link-checker. Documentado em JSDoc de `collectMarkdownFiles()`.

### Ambiguidades sinalizadas (precisa resposta antes de executar)

- **Ambiguity 04-A1:** PRD CA-29 diz "compound note sem `## Solution` → exit 1". Nao especifica se a validacao de secoes obrigatorias e **estritamente** `## Problem`/`## Solution`/`## Prevention` ou se permite variacoes (`## What was the problem`, `### Solution`, etc.). **Decisao assumida em fase-02:** match exato H2 `^## (Problem|Solution|Prevention)\s*$` (case-sensitive, sem trailing content). Mensagem de erro nominal: `"docs/compound/X.md: missing required H2 section: ## Solution"`. Se o PRD esclarecer permitir aliases (`## What/How/Why`), substituir matcher por lista expandida em ~5min — fica registrado em MEMORY como ponto de reverter.

- **Ambiguity 04-A2:** PRD nao especifica se `compound-check` deve validar **tags** quanto a presenca minima (ex: pelo menos 1 tag) ou apenas existencia do campo (campo pode ser array vazio `[]`). **Decisao assumida em fase-02:** campo `tags` DEVE existir no frontmatter e DEVE ser array (`Array.isArray`) com **pelo menos 1 elemento string nao-vazio**. Compound note sem tag e inutil para busca por categoria — viola D19 (navegacao por IA). Reverter se PRD permitir tags vazio com aviso (warn-only).

- **Ambiguity 04-A3:** PRD CA-26 fixa `<2s em 100 docs` como alvo. **Nao especifica** se isso eh per-validator (`harness:validate` <2s E `compound:check` <2s separadamente) ou agregado (soma <2s). **Decisao assumida em fase-04:** ambos individualmente <2s; soma pode ser ate 4s. CI step roda em sequencia: `bun run harness:validate && bun run compound:check`. Total reportado na fase-05 dentro do workflow YAML como informativo. Reverter (apertar para soma <2s) se Andre tiver baseline mais agressivo em algum doc do `V6.0.0/`.

- **Ambiguity 04-A4 (G5 acoplado):** Bench fase-04 — primeiro run pode falhar em Windows com Defender ativo (800-1500ms para abrir arquivos novos). **Decisao assumida:** bench tira 3 medicoes (warmup + 2 reais) e usa **mediana**. Falha apenas se mediana > 2s. Documentado no script de bench. Se PRD/CI quiser regra mais estrita ("primeiro run < 2s"), discutir antes de implementar — afeta CI design do Plano 09.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

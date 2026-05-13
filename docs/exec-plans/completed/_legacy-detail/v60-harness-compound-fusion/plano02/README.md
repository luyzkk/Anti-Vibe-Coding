# Plano 02: Full Scaffold (14+ docs + GH Actions + Delivery Loop + Stack Detection)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~10h
**Depende de:** Plano 01 (Tracer Bullet — templates base, init skeleton, symlink fallback, validator minimal)
**Desbloqueia:** Plano 03 (Migration v5→v6), Plano 04 (Validators Full), Plano 05 (Skill Migration + Hooks)

---

## O que este plano entrega

Expande o `/init` esqueleto do Plano 01 para o **scaffold completo do harness do Andre** absorvido na v6.0.0 (D9): 14+ docs institucionais e estruturais (DESIGN/FRONTEND/PLANS/PRODUCT_SENSE/QUALITY_SCORE/RELIABILITY/SECURITY/COMPOUND_ENGINEERING + design-docs/ + exec-plans/{active,completed} + review-checklists/ + smoke-flows/ + product-specs/ + references/ + generated/), GitHub Actions sempre instalado (D14, S1), Delivery Loop opcional injetado em AGENTS.md quando usuario usa Linear (D12, S3) e deteccao de stack heuristica (D7) que registra o framework em STATE.md + ARCHITECTURE.md (CA-07, CA-08, CA-19, CA-20, CA-21, M3). Ao final do plano, `/init` em diretorio vazio entrega um projeto pronto para harness + compound em ≤60s (CA-06).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Templates AGENTS.md.tpl + ARCHITECTURE.md.tpl em EN | Plano 01 fase-01 | pendente (sera entregue por Plano 01) |
| Helper `lib/scaffold-templates.ts` (copia + substitui placeholders) | Plano 01 fase-02 | pendente |
| Helper `lib/symlink-fallback.ts` (3-tier ln/mklink/copy+hook) | Plano 01 fase-03 | pendente |
| `scripts/harness-validate.ts` minimal (TS+bun) | Plano 01 fase-04 | pendente |
| Fixture `tests/fixtures/empty-dir/` + tracer bullet E2E | Plano 01 fase-05 | pendente |
| Source dos templates do Andre em `V6.0.0/package/skills/harness-engineering/assets/harness-template/` | Repo (referencia) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|--------------|
| Templates de **todos** os 14+ docs em EN sob `anti-vibe-coding/skills/init/assets/templates/` | Plano 03 (migration v5→v6 reusa templates ao gerar docs/ a partir de .planning/), Plano 08 (dog-food gera docs/ do plugin a partir destes) |
| Helper `lib/scaffold-full-tree.ts` (cria estrutura de diretorios completa) | Plano 03 fase-03 (gera docs/exec-plans a partir de .planning/) |
| Helper `lib/detect-stack.ts` + tipo `DetectedStack` | Plano 04 fase-03 (validator pode logar stack), Plano 08 fase-03 (dog-food usa para detectar plugin como node-ts) |
| `.github/workflows/harness.yml` template (referencia `bun run harness:validate`) | Plano 04 fase-05 (CI roda validators completos), Plano 09 (release valida via CI) |
| `lib/inject-optional-section.ts` (Delivery Loop opt-in em AGENTS.md) | Plano 05 fase-06 (Compound Decision Gate pode injetar secao similar) |
| Helper `lib/state-md-init.ts` (cria STATE.md inicial com Resources.detected_stack) | Plano 06 fase-03 e fase-04 (state-md-generator dinamico estende este) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-todos-os-docs-template.md | Templates `.tpl` EN para todos os 14+ docs do harness + esqueletos de pasta (active/completed/compound/etc) | 3h | Plano 01 fase-01 (formato de template estabelecido) |
| 02 | fase-02-init-full-scaffold.md | `/init` expande `scaffoldTemplates` para gerar arvore completa em fixture vazia | 2h | fase-01 |
| 03 | fase-03-customizacao-arquitetura.md | `/init` customiza ARCHITECTURE.md com framework detectado (Next.js / Rails / etc) e linhas reais | 1.5h | fase-02, fase-06 |
| 04 | fase-04-gh-actions-pr-template.md | Copia `.github/workflows/harness.yml` + `pull_request_template.md` (D14 sempre instalado) | 1h | fase-02 |
| 05 | fase-05-delivery-loop-opcional.md | Pergunta sobre Linear, injeta secao "Delivery Loop" em AGENTS.md se opt-in (D12) | 1h | fase-02 |
| 06 | fase-06-stack-detection.md | Heuristica package.json/Gemfile/composer.json/pyproject → registra stack em STATE.md + ARCHITECTURE.md (CA-07, CA-08, CA-19, CA-20, CA-21) | 1.5h | fase-02 |

**Total:** 10h.

---

## Grafo de Fases

```
                        Plano 01 (tracer bullet)
                                |
                                v
                   fase-01 (todos-os-docs-template)
                                |
                                v
                     fase-02 (init-full-scaffold)
                                |
            +-------+-----------+-----------+-----------+
            |       |           |           |           |
            v       v           v           v           v
        fase-04  fase-05    fase-06     (espera     (espera
       (gh      (delivery   (stack       fase-06)   fase-06)
       actions) loop)        detect)
                                |
                                v
                     fase-03 (customiza ARCHITECTURE
                              com stack detectado)
```

**Paralelismo possivel:** Apos fase-02 concluida, fases 04, 05, 06 podem rodar em paralelo (sub-agentes independentes — escrevem em arquivos disjuntos: `.github/`, `lib/inject-optional-section.ts`, `lib/detect-stack.ts`). **fase-03 espera fase-06** porque consome `DetectedStack` (decisao de ordem documentada abaixo).

### Decisao de ordem: fase-03 vs fase-06

A numeracao das fases segue agrupamento tematico (scaffold core → customizacao → integracoes → detalhes). A **ordem de execucao recomendada**, porem, e: `01 → 02 → 06 → (04 ‖ 05) → 03`.

Razao: fase-03 customiza `ARCHITECTURE.md` "com o framework detectado". Sem fase-06 (`detectStack()` + tipo `DetectedStack`), fase-03 nao tem o que customizar — cairia em hardcode ou stub. Manter fase-03 logicamente como "customizacao final" (depois de tudo) preserva a leitura tematica do plano, mas o subagente de execucao DEVE rodar fase-06 antes de fase-03. Documentado em STATE.md ao iniciar este plano.

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

- **fase-02 (init-full-scaffold)** — RED: teste espera 14+ arquivos em fixture vazia apos `scaffoldFullTree()`; falha porque so existe scaffold de 2 (Plano 01). GREEN: extender helper para iterar sobre `TEMPLATE_MANIFEST` completo.
- **fase-03 (customizacao)** — RED: teste espera `ARCHITECTURE.md` conter "Next.js" quando `DetectedStack === 'nextjs'`; falha porque template ainda tem placeholder. GREEN: implementar `customizeArchitecture(stack)`.
- **fase-06 (stack-detection)** — RED: teste fixture com `package.json`{`"next": "*"`} espera `detectStack(dir).id === 'nextjs'`. Falha porque `detectStack` nao existe. GREEN: implementar heuristica + registro em STATE.md.

Fases 01, 04, 05 sao **estruturais** (criar templates, copiar arquivos estaticos, injetar secao opcional) — TDD aplica-se via teste de presenca de arquivo + checagem de conteudo, nao ciclo RED/GREEN classico.

**Tracer Bullet deste plano:** N/A (Plano 01 entregou o tracer global). O **gating end-to-end deste plano** e a fase-02 — apos ela, `/init` em fixture vazia gera 14+ docs e o `harness:validate` continua exit 0 (regressao do tracer do Plano 01).

---

## Gotchas Conhecidos

- **G1 (D2 idioma EN — herdado de Plano 01 G2):** Todos os 14+ templates ficam em ingles. Erro classico: redator copia conteudo do Andre que ja esta em EN, mas adapta um exemplo em PT-BR e esquece. Lock: rodar grep `[ãâáàçéêíóôõú]` em `assets/templates/` antes de mergear fase-01. Comentarios provenance em PT continuam OK (sao do dev, nao do template).

- **G2 (cross-platform paths — herdado de Plano 01 G4):** `path.join` em **todos** os helpers. Em fase-01, ao iterar diretorios para criar `docs/exec-plans/active/README.md`, NUNCA `targetDir + '/docs/exec-plans/...'` — sempre `path.join(targetDir, 'docs', 'exec-plans', 'active', 'README.md')`. Quebra silenciosa em Windows.

- **G3 (fixture limpa — herdado de Plano 01 G5):** Fixture `tests/fixtures/empty-dir/` continua versionada apenas com `.gitignore + .gitkeep`. Apos fase-02 expandir o scaffold para 14+ arquivos, o `afterEach` precisa varrer **recursivamente** (`fs.rm` com `recursive: true`) — nao apenas o nivel raiz. Plano 01 versao do `afterEach` so apagava entries do nivel 1; agora ha `docs/`, `.github/`, `scripts/` aninhados.

- **G4 (GH Actions YAML schema — D14, fase-04):** O `harness.yml` do Andre referencia `npm run harness:validate`. **Nao copiar literalmente** — adaptar para `bun run harness:validate` (D13). YAML schema do GitHub Actions e estrito: indentacao de 2 espacos, sem tabs, encoding UTF-8 sem BOM. Se editor do dev meter BOM, GitHub aceita mas action falha silenciosa em alguns runners. Validar via `actionlint` ou inspecao visual.

- **G5 (Linear opt-in default = NAO — D12, fase-05):** Pergunta deve ter default "no". Caso usuario nao usa Linear, secao "Delivery Loop" **nao** entra em AGENTS.md (manteria 40 linhas; com a secao injetada, AGENTS sobe para ~46 linhas — viola CA-27). Validador rejeitaria. Documentar em SKILL.md do `/init`: "Default: skip Linear unless user opts in".

- **G6 (heuristica de stack ambigua — D7, fase-06):** Projeto pode ter `package.json` (next.js client) **e** `Gemfile` (rails backend) na mesma raiz (monorepo). Heuristica retorna **primeiro match positivo** na ordem `[nextjs, node-ts, rails, laravel-deferido, python-deferido, unknown]`. Documentar essa ordem no JSDoc de `detectStack()`. CA-21 cobre `unknown` quando nada bate.

- **G7 (M3 vs CA-19 — escopo D37):** v6.0.0 **registra** stack em STATE.md mas **NAO** copia knowledge pack (`docs/knowledge/{stack}/`). Esta na linha tenue entre "deteccao" e "knowledge pack" — fase-06 deve produzir codigo que **so escreve no STATE.md/ARCHITECTURE.md** e nao cria diretorio `docs/knowledge/`. CA-19 e explicito: "Nenhuma pasta `docs/knowledge/` e criada".

- **G8 (provenance comments — herdado de templates):** Toda linha TS gerada nesse plano leva linhagem `// 2026-05-11 (Luiz/dev): why...`. Templates `.md` (que sao output, nao codigo runtime) **nao** levam provenance — sao para o usuario final, nao parte do plugin runtime.

### Ambiguidades sinalizadas (precisa resposta antes de executar)

- **Ambiguity G-A1:** PRD M2 lista 14+ docs mas nao especifica `tech-debt-tracker.md`. O harness do Andre (`docs/exec-plans/tech-debt-tracker.md`) tem template proprio. **Decisao assumida:** incluir em fase-01 (e o 15o arquivo). Se rejeitado, remover de fase-01 e atualizar fase-02 manifest.
- **Ambiguity G-A2:** PRD nao define se `FRONTEND.md` e `generated/db-schema.md` sao **placeholders vazios "N/A"** ou **omitidos** quando projeto nao tem UI/DB. **Decisao assumida:** sempre cria como placeholder com comentario `<!-- N/A — this project has no frontend (yet). Replace when applicable. -->`. Mantem estrutura uniforme; valida CA-06 contagem de 14+. Reverter se PRD esclarecer omissao condicional.
- **Ambiguity G-A3:** Delivery Loop secao em AGENTS.md (D12) — qual o **conteudo exato** da secao injetada? PRD CA-13 menciona "instrucao de gravar video + anexar em Linear" mas nao da copy. **Decisao assumida em fase-05:** texto curto (4-6 linhas) inspirado no `Delivery Loop` do harness do Andre, em ingles. Se Andre tiver template canonico em `harness-template/` que eu nao vi, substituir.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

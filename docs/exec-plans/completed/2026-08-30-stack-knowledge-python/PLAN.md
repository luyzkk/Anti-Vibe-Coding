---
title: "Stack Knowledge Python"
mode: full
status: planned
created: 2026-08-30
---

# Exec Plan: Stack Knowledge Python

**PRD:** ./PRD.md
**CONTEXT:** ./CONTEXT.md (11 decisões — D1-D11)
**Reuses infra from:** [2026-05-16-stack-knowledge-nodejs-typescript](../../completed/2026-05-16-stack-knowledge-nodejs-typescript/) (runStackKnowledgeInit, copyKnowledge, getStackKnowledgePreface, telemetria) + [2026-05-18-stack-knowledge-rails](../../completed/2026-05-18-stack-knowledge-rails/) (schema frontmatter validado, warning de versão) + [2026-05-24-nextjs-react-stack-knowledge](../../completed/2026-05-24-nextjs-react-stack-knowledge/) (fase-00 pré-RED, NOTICES, waves paralelas)
**Planos:** 4 planos, 29 fases total
**Created:** 2026-08-30

---

## Goal

Criar `knowledge/python/` paralelo às 3 matrizes existentes, contendo 18 átomos PT-BR (D1)
destilados de ~700KB em `Infos/knowledge/Python/` (10 compass + 5 deep-research aproveitáveis +
3 skill packages — série coordenada Python 3.13 + FastAPI), corrigindo o **AbortError** que hoje
derruba `/init` em projeto Python (`copy-knowledge.ts:81` — matrix mapeada, pasta ausente).
Zero trabalho de detector (`probePython`, `PYTHON_CANDIDATES`, anchors e mapping já existem);
o delta de código é: validador `python_versions` (D3/D9), warning legado <3.11 (D7), nota
Django/Flask could-have (D8), fixture + 2 e2e. Cobertura declarada FastAPI-native (D2). Entregue
em 4 planos sequenciais (infra+piloto → T1 → T2 → T3+INDEX+audit). Skills cross-stack recebem
preface Python via `getStackKnowledgePreface()` sem mudança de código.

## Scope

- **Plugin matrix:** `knowledge/python/INDEX.md` (≤100 linhas, PT-BR, preâmbulo D2, layout
  `## Por Skill Cross-Stack` (7 skills) + `## Por Tier` + `## Por keyword`) + 18 átomos em
  `atoms/*.md` (frontmatter schema Rails 8 campos + `python_versions` opcional formato array
  semver — D3/D9; corpo ≤200 linhas hard cap; 4 seções obrigatórias: Quando consultar + Padrões
  sênior + Anti-padrões + Critérios de decisão).
- **Validador:** `skills/init/lib/atoms-frontmatter-validator.ts` reconhece `python_versions`
  (TDD; regressão CA-03 sobre átomos Rails/Node).
- **Init:** warning legado quando `requires-python` < 3.11 (RF8/D7) + nota Django/Flask
  could-have (RF14/D8). Nenhuma mudança em detector/copyKnowledge/preface.
- **Licença:** entrada MIT `python-debugpy` (Hermes Agent) no `THIRD-PARTY-NOTICES.md` (RF7);
  átomo debugging sem referências Hermes (CA-10); tentativa de rastreio ECC (RF12/D5).
- **Fixtures/E2E:** `tests/fixtures/python-fastapi-fixture/` + variante requirements-only;
  `tests/e2e/stack-knowledge-python-tracer.test.ts` (CA-02, sem AbortError) +
  `stack-knowledge-python-full.test.ts` (RF9, 18/18 + frontmatter).
- **Quality gates:** anti-drift clause + verifier refined (≥80%) regression desde o piloto
  `async-and-concurrency` (D10); audit humano Luiz em `security-fastapi-owasp`,
  `sqlalchemy-async-and-orm`, `debugging-pdb-debugpy` (D11) com assinatura em STATE.md.
- **7 skills cross-stack:** ZERO mudança de código.
- **Out of scope:** Django/Flask knowledge; data science/notebooks; netmiko; installer
  Windows/Nuitka; neutralização genérica dos átomos web; gap Laravel (task separada);
  reconciliação schema Next (débito RF17); poetry/pip-tools profundo; drift detection; update
  flow para projetos instalados.

## Assumptions

- **Infra 100% reusável:** `runStackKnowledgeInit`, `copyKnowledge` (AbortError some quando a
  matrix existir), `getStackKnowledgePreface`, telemetria, `PYTHON_CANDIDATES`,
  `SOURCE_EXT_BY_MATRIX['python']`, anchors pyproject/requirements — verificados por leitura em
  2026-08-30; prova final no tracer (Premissa 1 do PRD).
- **Material fonte disponível e congelado:** `Infos/knowledge/Python/` (gitignored) inalterado
  durante execução; `sources:` referencia paths estáveis (Premissa 2). Stub
  `deep-research-report (2).md` descartado.
- **Parser preview aceita PT-BR:** `format-knowledge-preview.ts` regex `(?:Por|By)` — verificado.
- **Compound lessons regression:**
  `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (anti-drift
  verbatim em todo prompt extrator) +
  `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` (verifier audita APENAS
  Padrões sênior + Anti-padrões + Critérios de decisão, gate ≥80%) — desde Plano 01 fase-03.
- **Divergência de versões entre fontes** (FastAPI 0.136 vs 0.141; Ruff 0.15 vs 0.16):
  normalizar para a mais recente citada; conflito real vira nota em Critérios de decisão.
- **Claims "contestado" (~21 nas fontes)** nunca viram regra dura nos átomos.
- **Versão alvo v7.7.0** (próxima minor pós-7.6.1).

## Risks

- **R1 — Nova matrix regride goldens/testes (Alta, Alto):** fase-00 pré-RED audita testes que
  enumeram `knowledge/` / `MATRIX_FOLDER_VALUES` ANTES de qualquer mudança (precedente D17 Next);
  gotcha `[knowledge-presence]` do harness:validate com `atoms/` vazia → bundle scaffold+validador+piloto
  num único commit (GT-Plano01-fase01 Next).
- **R2 — Destilação vira copy-paste ou infla claims (Média, Alto):** anti-drift + verifier
  refined desde o piloto; audit humano 3 átomos (D11); hard cap 200 (excedente → TODO.md backlog,
  precedente R8 Next).
- **R3 — Verifier false-positive "tudo OK" (Média, Alto):** protocolo refined obrigatório +
  audit humano fecha o loop (CA-08).
- **R4 — Átomos densos estouram cap (Alta, Médio):** api-design tem 39 regras-fonte, security 20
  seções — verifier rejeita >200; excedente vira backlog.
- **R5 — Licença ECC não rastreada (Média, Médio — aceito D5):** RF12 rastreio não-bloqueante no
  Plano 02; audit humano cobre átomos que citam ECC.
- **R6 — Contexto "Hermes" vaza no átomo debugging (Média, Baixo):** limpeza explícita na fase +
  CA-10 grep zero + audit humano.
- **R7 — Warning legado lê `requires-python` com formatos exóticos (Baixa, Baixo):** parse
  conservador — formato não reconhecido = sem warning (nunca falso-positivo); TDD cobre
  `>=3.9`, `^3.10`, `>=3.12`, ausente.
- **R8 — Waves paralelas esquecem anti-drift clause (Média, Médio):** bloco verbatim das 2
  compound lessons em TODOS os prompts de extrator; plan-verifier confirma presença antes de
  aceitar batch (precedente R9 Next).
- **R9 — Dev Django aplica padrão FastAPI sem perceber (Baixa, Baixo):** preâmbulo INDEX (RF1) +
  nota RF14.

## Execution Steps

### Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Infra + Validador + Piloto + Tracer Bullet | 6 | ~10-12h | — |
| 02 | Atoms T1 + verifier + rastreio ECC | 6 | ~9-11h | 01 |
| 03 | Atoms T2 (waves) + verifier | 10 | ~13-15h | 02 |
| 04 | Atoms T3 + INDEX final + audit humano + E2E full | 7 | ~10-12h | 03 |

**Total:** 29 fases, ~42-50h.

### Grafo de Dependencias

```
Plano 01 (Infra + Piloto + Tracer)
    |
    v
Plano 02 (Atoms T1)
    |
    v
Plano 03 (Atoms T2)
    |
    v
Plano 04 (T3 + INDEX + Audit + E2E full)
```

**Paralelismo possivel:** Sequencial entre planos (verifier calibrado no piloto; INDEX final e
audit dependem de todos os átomos). DENTRO dos planos 02-04, fases de átomo são independentes
(arquivos distintos — categoria "seguro paralelizar") e rodam em waves de ~3 via subagentes;
verifier batch e INDEX final são fan-in sequenciais. Nenhum contrato compartilhado entre fases de
átomo (cada uma escreve 1 arquivo próprio).

### Tracer Bullet

- **Plano:** 01
- **Fases:** fase-00 a fase-04 (slice end-to-end completo)
- **Descrição:** pré-RED audit + scaffold `knowledge/python/` + validador `python_versions` (TDD)
  + átomo piloto `async-and-concurrency` com anti-drift + verifier refined + fixture FastAPI +
  tracer e2e provando que `/init` retorna `primary='python'` e copia INDEX + piloto **sem
  AbortError**. Valida arquitetura e protocolo de qualidade ANTES de investir nos 17 átomos
  restantes.

### Resumo por Plano

#### Plano 01 — Infra + Validador + Piloto + Tracer Bullet (6 fases, ~10-12h)
> Slice end-to-end mínimo que mata o AbortError e calibra o gate de qualidade. Bundle
> scaffold+validador+piloto num commit (R1).

Fases planejadas (detalhadas pelo subagente no Step 9):
- fase-00: pré-RED audit (RF11, R1) — grep `knowledge/`, `MATRIX_FOLDER_VALUES`, goldens em
  `tests/**`; catalogar afetados; suite verde ANTES de mudar produção
- fase-01: scaffold `knowledge/python/` + INDEX.md skeleton PT-BR (cabeçalho
  `# Python Knowledge — Index`, preâmbulo D2: "Python 3.11+/3.13 geral + FastAPI para web")
- fase-02: TDD `python_versions` no `atoms-frontmatter-validator.ts` (RF3, CA-03 — aceita array
  semver, rejeita string, mantém Rails/Node verdes)
- fase-03: átomo piloto `async-and-concurrency.md` (T1, D10) — anti-drift verbatim no prompt do
  extrator; verifier refined ≥80%; fonte: compass 63884763
- fase-04: fixture `tests/fixtures/python-fastapi-fixture/` (pyproject + fastapi) + variante
  requirements-only + tracer e2e `stack-knowledge-python-tracer.test.ts` (CA-02, CA-11, sem
  AbortError; espelho do rails-tracer)
- fase-05: warning legado `requires-python` < 3.11 (RF8, CA-04, R7 — TDD) + confirmação
  telemetria `knowledge_copied` (RF10)

#### Plano 02 — Atoms T1 + verifier + rastreio ECC (6 fases, ~9-11h)
> 5 átomos T1 restantes em waves + verifier batch. Anti-drift em todos os prompts (R8).

- fase-01: `python-idioms-and-antipatterns.md` (T1) — compass 90d75ffa + python-patterns ECC
- fase-02: `typing-and-static-analysis.md` (T1) — deep-research (3) + compass c4871980 §3
- fase-03: `errors-logging-observability.md` (T1) — compass 9b12d328
- fase-04: `pytest-and-testing-strategy.md` (T1) — compass 1d7424ba + python-testing ECC
- fase-05: `security-fastapi-owasp.md` (T1, **flagged audit humano D11**) — compass 0e7023f8
- fase-06: verifier refined batch T1 (5 átomos) + tentativa de rastreio licença ECC (RF12, R5)

#### Plano 03 — Atoms T2 em waves + verifier (10 fases, ~13-15h)
> 9 átomos T2 em 3 waves de 3 + verifier batch fan-in.

- fase-01: `architecture-and-di-fastapi.md` — compass 24cad57e
- fase-02: `api-design-and-contracts.md` (R4: fonte com 39 regras — cap vigiado) — report3 + report2
- fase-03: `sqlalchemy-async-and-orm.md` (**flagged audit humano D11**) — report.md split 1/2
- fase-04: `migrations-and-schema-evolution.md` — report.md split 2/2
- fase-05: `dependencies-and-packaging-uv.md` — compass b10c35a1 + compass 0e7023f8 §18
- fase-06: `tooling-ruff-mypy-precommit.md` — compass c4871980
- fase-07: `code-smells-and-refactoring.md` — compass 7673ee63
- fase-08: `deployment-and-production.md` — compass 69fdecd5
- fase-09: `performance-and-profiling.md` — deep-research (1), IDs PERF-*
- fase-10: verifier refined batch T2 (9 átomos)

#### Plano 04 — T3 + INDEX final + audit humano + E2E full (7 fases, ~10-12h)
> Fecha a entrega: 3 T3, INDEX consolidado, audit humano assinado, e2e completo + closeout.

- fase-01: `background-jobs-and-queues.md` (T3) — compass 63884763 §4-5 + compass 9b12d328 §14 + report2
- fase-02: `debugging-pdb-debugpy.md` (T3, **flagged audit D11**) — limpeza contexto Hermes (R6,
  CA-10 grep zero) + entrada MIT no THIRD-PARTY-NOTICES.md (RF7)
- fase-03: `graphql-grpc-contracts.md` (T3, D6) — report3 seções GraphQL/gRPC/tRPC + flag revisão
  de tier (RF16)
- fase-04: INDEX.md final consolidado (RF1: 7 skills cross-stack com ≥2 átomos cada + Por Tier +
  Por keyword; CA-05) + nota Django/Flask (RF14/D8) + preview keywords check (RF15)
- fase-05: verifier refined batch T3 (3 átomos)
- fase-06: audit humano Luiz — `security-fastapi-owasp` + `sqlalchemy-async-and-orm` +
  `debugging-pdb-debugpy` vs fontes; assinatura `Aprovado por Luiz em YYYY-MM-DD` no STATE.md
  (RF5, CA-08; bloqueia closeout se reprovar)
- fase-07: e2e full `stack-knowledge-python-full.test.ts` (RF9: 18/18 + validateAtomFrontmatter)
  + regressão global (CA-09) + débito schema Next no TODO.md (RF17) + CHANGELOG + closeout

---

## Review Checklist

- [ ] 18 átomos em `knowledge/python/atoms/*.md`, frontmatter schema Rails completo + `sources:`
  apontando `Infos/knowledge/Python/...` (RF2, RF13, CA-01)
- [ ] Nenhum átomo > 200 linhas (hard cap; excedente registrado em TODO.md — R4)
- [ ] Zero placeholders `[A DEFINIR]`; 4 seções obrigatórias em 18/18
- [ ] `python_versions` formato array semver validado; string rejeitada com erro claro (CA-03)
- [ ] Átomos Rails/Node/Next continuam válidos após extensão do validador (CA-03 regressão)
- [ ] INDEX.md ≤100 linhas, PT-BR, preâmbulo D2, 7 skills com ≥2 átomos cada (CA-05)
- [ ] Tracer e2e: `/init` em fixture FastAPI **sem AbortError**, ≤100ms de cópia (CA-02)
- [ ] Fixture requirements-only: python detectado, sem warning de versão (CA-11)
- [ ] Warning legado: `>=3.9` → warning; `>=3.12` → sem warning; formato exótico → sem warning (CA-04, R7)
- [ ] NOTICES: entrada MIT python-debugpy verbatim; grep Hermes/tui_gateway/run_agent no átomo
  debugging = zero (CA-10)
- [ ] Anti-drift clause + verifier refined citados em TODOS os prompts de subagente extrator (R8)
- [ ] Verifier: ≥80% claims rastreáveis em Padrões sênior + Anti-padrões + Critérios de decisão, 18/18 (CA-08)
- [ ] Audit humano 3 átomos assinado no STATE.md (RF5, CA-08)
- [ ] Claims "contestado" das fontes não aparecem como regra dura
- [ ] Multi-stack monorepo: primary python, secondary node, só matrix python copiada (CA-07)
- [ ] E2e pré-existentes verdes: rails-tracer, rails-full, nextjs-tracer, cutover-greenfield (CA-09)
- [ ] `bun test` + `bun run typecheck` + `bun run harness:validate` + `bun run compound:check` verdes
- [ ] Provenance comments nos `.ts` modificados (`// 2026-08-30 (Luiz/dev): ... — D{N}/RF{N}`)
- [ ] Branch + PR por plano (nunca main direto)

---

## Validation Log

<!-- preencher durante execucao: comando + resultado -->

---

## Compound Opportunity

<!-- preencher ao /iterate: o que merece virar compound note? -->

Candidates a observar:
- Stack cuja infra já existia inteira (matrix mapeada sem pasta = AbortError latente) — pattern
  "registrar matrix folder só junto com a pasta" pode virar guard no harness:validate
- Fontes com campo de confiança (consenso/contestado) → primeiro wave onde o filtro "contestado
  nunca vira regra dura" é aplicável mecanicamente — medir se reduz rework do verifier
- Série de pesquisa coordenada (16 relatórios com fronteiras explícitas entre si) como formato de
  fonte — comparar rastreabilidade vs fontes heterogêneas do Next
- Decisão de licença aceita pelo dev (D5) com mitigação não-bloqueante — template para futuros
  materiais de origem incerta

---

## Lessons Captured

<!-- preencher ao /iterate: links para docs/compound/ -->

Referências entrando como regression desde Plano 01 fase-03:
- `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` → anti-drift
  clause obrigatória no prompt do extrator
- `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` → verifier audita
  APENAS Padrões sênior + Anti-padrões + Critérios de decisão
- `docs/compound/2026-05-19-crlf-breaks-frontmatter-regex.md` → normalização CRLF já embutida no
  validador (regressão a preservar no TDD da fase-02)

---

## Exit Criteria

- [x] **18 átomos + INDEX.md commitados; verifier refined 18/18; audit humano assinado.**
  18 átomos (6 T1 + 9 T2 + 3 T3) + INDEX de 99 linhas. Verifier: 18/18 em 5/5 nos quatro batches,
  zero ciclos v2, 1 única falha de conteúdo em todo o projeto (CVE pareada com fix errado, no
  Plano 02, corrigida). Audit humano 3/3 aprovado com 0 fixes, assinado no STATE.md.
- [x] **`/init` em projeto Python completa sem AbortError.** `stack-knowledge-python-tracer` 4/4
  e `stack-knowledge-python-full` 12/12. A resolução sem throw é a asserção — era em
  `copy-knowledge.ts:81` que o init morria.
- [x] **Validador estendido com `python_versions`; zero regressão.** TDD (RED com 3 assertion
  failures reais). A regra de `rails_versions` virou helper parametrizado; as mensagens do Rails
  seguem byte a byte idênticas (verificado por execução direta, não por inspeção).
- [x] **Warning legado + nota Django/Flask funcionando (CA-04).** Ambos TDD, ambos com parse
  conservador: formato não-PEP-440 (`^3.10`) não avisa, e só dependência declarada dispara a nota.
  RF14 não foi cortada.
- [x] **NOTICES com MIT python-debugpy; rastreio ECC (RF12).** Mais do que o pedido: o rastreio
  ECC teve êxito — `github.com/affaan-m/ECC`, MIT, entrada verbatim adicionada. O risco D5 passou
  de *aceito* a *resolvido*.
- [x] **Suite completa verde.** 1836 pass / 0 fail (baseline pré-feature 1787), typecheck limpo,
  harness 393 md, compound 55 notas.
- [x] **STATE.md com 4 planos completed; pasta migrada para `completed/`.**
- [x] **CHANGELOG v7.7.0 + correção do AbortError**, com instrução de `--refresh-knowledge` para
  quem já rodou `/init` antes.
- [x] **Débito RF17 registrado no TODO.md** — mais 3 débitos encontrados na execução (preface
  perdido em Rails E Next, excedentes de cap, gotcha de regex por heredoc).

---

## Decisões do PRD Aplicadas

| Decisão | Onde se aplica |
|---------|---------------|
| D1 (átomos PT-BR) | Todos os átomos (Planos 01-04) + INDEX |
| D2 (FastAPI-native declarado) | Plano 01 fase-01 (preâmbulo INDEX) + Plano 04 fase-04 |
| D3 (schema Rails validado) | Plano 01 fase-02 (validador) + frontmatter de 18/18 |
| D4 (18 átomos, 6/9/3 por tier) | Distribuição Planos 02/03/04 |
| D5 (ECC source normal, risco aceito) | Plano 02 fases 01/04 (sources) + fase-06 (rastreio RF12) |
| D6 (graphql-grpc-contracts T3) | Plano 04 fase-03 |
| D7 (warning legado <3.11) | Plano 01 fase-05 |
| D8 (nota Django/Flask could-have) | Plano 04 fase-04 |
| D9 (só python_versions, FastAPI inline) | Plano 01 fase-02 + corpo dos átomos web |
| D10 (piloto async-and-concurrency) | Plano 01 fase-03 |
| D11 (audit: security + sqlalchemy + debugpy) | Plano 04 fase-06; flags nas fases de origem |
| RF7 (NOTICES MIT debugpy) | Plano 04 fase-02 |
| RF11 (fase-00 pré-RED) | Plano 01 fase-00 |
| RF16 (flag revisão tier graphql) | Plano 04 fase-03 |
| RF17 (débito schema Next) | Plano 04 fase-07 |

---

<!-- Gerado por /anti-vibe-coding:plan-feature em 2026-08-30 a partir de PRD.md + CONTEXT.md (11 decisões) -->

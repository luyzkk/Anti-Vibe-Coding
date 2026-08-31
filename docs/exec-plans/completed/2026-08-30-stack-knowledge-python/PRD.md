---
slug: stack-knowledge-python
date: 2026-08-30
status: approved
requires: [2026-05-18-stack-knowledge-rails, 2026-05-24-nextjs-react-stack-knowledge]
---

<!--
Princípio universal #5 — Comment Provenance.
Comentários em código gerado deste PRD seguem: autor + papel, YYYY-MM-DD, razão/decisão referenciada.
Ex: `// 2026-08-30 (Luiz/dev): python_versions opcional — D9 do CONTEXT`
-->

# PRD: Stack Knowledge Layer — Python (v7.7.0)

**Status:** Approved (2026-08-30)
**Author:** Luiz Felipe + AI (grill-me + write-prd)
**Date:** 2026-08-30
**Context:** ./CONTEXT.md (11 decisões capturadas via `/grill-me`)
**Reuses infra from:** [2026-05-16-stack-knowledge-nodejs-typescript](../../completed/2026-05-16-stack-knowledge-nodejs-typescript/) (runStackKnowledgeInit, copyKnowledge, getStackKnowledgePreface, telemetria, schema stack.json) + [2026-05-18-stack-knowledge-rails](../../completed/2026-05-18-stack-knowledge-rails/) (schema frontmatter validado, atoms-frontmatter-validator, warning de versão RF11) + [2026-05-24-nextjs-react-stack-knowledge](../../completed/2026-05-24-nextjs-react-stack-knowledge/) (fase-00 pré-RED, THIRD-PARTY-NOTICES, waves paralelas)

---

## Problema

`/init` em projeto Python hoje **aborta**. O detector já classifica a stack (`probePython` em
`skills/init/lib/detect-stack.ts:147` — `pyproject.toml`/`requirements.txt`) e
`STACK_ID_TO_MATRIX_FOLDER['python'] = 'python'` está mapeado desde a v6.x, mas `knowledge/python/`
nunca foi criada. Resultado: `copyKnowledge` (`skills/init/lib/copy-knowledge.ts:81`) lança
`AbortError` bloqueante — "Matrix 'python' não encontrada em knowledge/python/" — e o init inteiro
morre. Python é a única stack com detector ativo + matrix mapeada + pasta ausente (Laravel tem o
mesmo gap, tratado em task separada).

Além do bug: mesmo que o init completasse, devs Python receberiam consultoria genérica das 7 skills
cross-stack (`/security`, `/api-design`, `/system-design`, `/design-patterns`, `/architecture`,
`/infrastructure`, `/tdd-workflow`) quando padrões Python-específicos seriam superiores — `/security`
não fala de injeção via SQLAlchemy text(), JWT com `algorithms` pinado ou slopsquatting; `/tdd-workflow`
não fala de fixtures pytest, `dependency_overrides` ou test smells de suítes geradas por IA.

Existe ~700KB de fonte triada em `Infos/knowledge/Python/` (10 compass artifacts + 5 deep-research
reports aproveitáveis + 3 skill packages úteis — série coordenada de pesquisa sobre Python 3.13 +
FastAPI, mesma data 2026-08-29, template de regra uniforme com campo de confiança
consenso/contestado) pronta para condensar em ~3.6k linhas de átomos.

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- `/init` em projeto Python (com `pyproject.toml` ou `requirements.txt`) completa sem abortar e o
  projeto recebe `.claude/knowledge/INDEX.md` + 18 átomos Python-native em < 100ms
- Skills cross-stack invocadas em projeto Python populado citam o `.claude/knowledge/INDEX.md` antes
  do corpo genérico, e o agente encontra o átomo relevante via roteamento por skill + tier
- Knowledge é **PT-BR e FastAPI-native declarado** (D1, D2): ~10 átomos de linguagem servem qualquer
  projeto Python; os web assumem FastAPI com honestidade no preâmbulo do INDEX
- Frontmatter segue o schema Rails validado por máquina + `python_versions` opcional (D3, D9) —
  100% dos átomos passam `validateAtomFrontmatter`
- Dev com projeto Python legado (`requires-python` < 3.11) vê warning explícito; dev com Django/Flask
  nas deps vê nota informativa (D7, D8)
- Rastreabilidade ≥ 80% das claims técnicas às fontes (verifier refined) + audit humano de 3 átomos
  assinado no STATE.md (D11)

### Mecanismo (algorítmico — o COMO)

**Plugin matrix (este repo) após v7.7.0:**
```
knowledge/
├── nodejs-typescript/   (v6.3.2)
├── rails/               (v6.3.3)
├── nextjs/              (v6.5.x)
└── python/              (NOVO)
    ├── INDEX.md         (≤100 linhas, PT-BR, layout: Por Skill Cross-Stack + Por Tier + Por keyword)
    └── atoms/           (18 átomos, ≤200 linhas cada, 4 seções obrigatórias)
```

**18 átomos (D4/D6):** 6 T1 (`python-idioms-and-antipatterns`, `typing-and-static-analysis`,
`async-and-concurrency`, `errors-logging-observability`, `pytest-and-testing-strategy`,
`security-fastapi-owasp`), 9 T2 (`architecture-and-di-fastapi`, `api-design-and-contracts`,
`sqlalchemy-async-and-orm`, `migrations-and-schema-evolution`, `dependencies-and-packaging-uv`,
`tooling-ruff-mypy-precommit`, `code-smells-and-refactoring`, `deployment-and-production`,
`performance-and-profiling`), 3 T3 (`background-jobs-and-queues`, `debugging-pdb-debugpy`,
`graphql-grpc-contracts`). Mapa átomo→fontes completo na tabela D4 do CONTEXT.md.
WebSockets/SSE/streaming absorvidos em async + api-design.

**Frontmatter schema (D3/D9)** — 8 campos Rails + extensão:
```yaml
topic: {slug}
stack: python
layer: backend | both
sources: [Infos/knowledge/Python/...]   # audit trail
tier: 1|2|3
triggers: [...]
related_skills: [...]
updated: 2026-08-30
python_versions: ['>=3.11']             # opcional; ['>=3.13'] p/ TypeIs, free-threading, JIT
```
`atoms-frontmatter-validator.ts` ganha validação de `python_versions` (mesmo formato array
semver-style de `rails_versions`), via TDD, sem quebrar átomos Rails/Node existentes.
Versões FastAPI ficam inline no corpo (ex: "desde 0.118") — sem segundo campo.

**Warning legado (D7)** — no fluxo do `/init`, após detecção `primary='python'`: ler
`requires-python` do `pyproject.toml`; se o range resolver abaixo de 3.11, output inclui
`"⚠️ Knowledge Python cobre 3.11+, foco 3.13. Alguns padrões podem não se aplicar."`.
`requirements.txt` sem marker de versão não gera warning.

**Nota Django/Flask (D8, could-have)** — se `django` ou `flask` aparecer nas deps:
`"ℹ️ Padrões web dos átomos são FastAPI-native. Átomos de linguagem/tooling servem qualquer Python."`

**Skill wire-up:** ZERO mudança nas 7 skills cross-stack — consomem `.claude/knowledge/INDEX.md` via
`getStackKnowledgePreface()` agnóstico. O parser de preview (`format-knowledge-preview.ts`) já aceita
`## Por keyword` (PT-BR).

**Atom skeleton** (mesmo do Rails): Quando consultar / Padrões sênior (problema → padrão → quando
usar → quando NÃO usar) / Anti-padrões / Critérios de decisão / Referências externas.

**Quality gates (regression comprovada):** anti-drift clause
(`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`) verbatim em todo
prompt de extrator; verifier refined protocol
(`docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md`) auditando APENAS Padrões
sênior + Anti-padrões + Critérios de decisão, gate ≥80%. Claims marcadas "contestado" nas fontes
(~21) nunca viram regra dura. Divergência de versões entre relatórios (FastAPI 0.136 vs 0.141)
normalizada para a mais recente citada.

---

## Fluxos UX por Ator

Feature backend-only (plugin internals). Ator único: **dev que roda `/init` em projeto Python**.

### Dev Python (uso típico — 3.11+/3.13, FastAPI)

1. Dev roda `/init` num projeto com `pyproject.toml`
2. Detector grava `.claude/stack.json` com `primary: "python"`
3. Init copia `knowledge/python/` (INDEX + 18 átomos) → `.claude/knowledge/`
4. Output: `"Stack detected: python. Knowledge copied: 18 atoms. Top keywords: asyncio, pytest, SQLAlchemy, Ruff, mypy, uv, FastAPI, Alembic..."`
5. Skills cross-stack passam a citar o INDEX antes do corpo genérico

### Edge cases visíveis ao dev

- **Projeto legado** (`requires-python = ">=3.9"`): knowledge copiado + warning
  `"⚠️ Knowledge Python cobre 3.11+, foco 3.13. Alguns padrões podem não se aplicar."` (D7)
- **Projeto Django/Flask**: knowledge copiado + nota FastAPI-native (D8, could-have)
- **Só `requirements.txt`** (sem pyproject): python detectado, knowledge copiado, sem warning de versão
- **`.claude/knowledge/` já existe**: preservado, mensagem `--refresh-knowledge` (regressão infra)
- **Monorepo Python + Node**: `primary` decidido por contagem de arquivos-fonte, secondary listado,
  só a matrix do primary copiada (regressão CA-07 Rails)

---

## Requisitos Funcionais

### Must Have (6 de 17 — 35%)

- [ ] **RF1** — `knowledge/python/INDEX.md` criado: ≤100 linhas, PT-BR, layout Por Skill Cross-Stack
  (7 skills) + Por Tier + Por keyword; preâmbulo declara cobertura "Python 3.11+/3.13 geral +
  FastAPI para web; padrões web são FastAPI-native" (D1, D2)
- [ ] **RF2** — 18 átomos em `knowledge/python/atoms/*.md` conforme lista D4/D6: frontmatter schema
  Rails completo + `python_versions` quando aplicável, corpo ≤200 linhas, 4 seções obrigatórias,
  zero placeholders `[A DEFINIR]` (D3, D4, D9)
- [ ] **RF3** — `atoms-frontmatter-validator.ts` reconhece `python_versions` opcional (formato array
  semver-style), via TDD, mantendo átomos Rails/Node válidos (regressão CA-10 Rails)
- [ ] **RF4** — Anti-drift clause + verifier refined protocol aplicados desde o átomo piloto
  `async-and-concurrency` (D10); gate ≥80% de rastreabilidade em 18/18
- [ ] **RF5** — Audit humano: Luiz revisa `security-fastapi-owasp`, `sqlalchemy-async-and-orm` e
  `debugging-pdb-debugpy` contra as fontes do frontmatter; assinatura no STATE.md; bloqueia
  aprovação do batch se reprovar (D11)
- [ ] **RF6** — Fixture `tests/fixtures/python-fastapi-fixture/` (pyproject.toml com fastapi) +
  tracer e2e `tests/e2e/stack-knowledge-python-tracer.test.ts`: `/init` completa **sem AbortError**,
  `primary='python'`, INDEX + piloto copiados
### Should Have

- [ ] **RF7** — `THIRD-PARTY-NOTICES.md` ganha entrada MIT do `python-debugpy` (Hermes Agent) com
  texto verbatim; átomo `debugging-pdb-debugpy` sem referências ao contexto proprietário Hermes.
  Não bloqueia a primeira entrega (tracer/piloto), mas bloqueia o batch que contém o átomo debugging
- [ ] **RF8** — Warning legado: `requires-python` < 3.11 no pyproject → warning no output do `/init` (D7)
- [ ] **RF9** — E2e full `tests/e2e/stack-knowledge-python-full.test.ts`: 18/18 átomos presentes
  pós-init, todos passando `validateAtomFrontmatter` (espelho do stack-knowledge-rails-full)
- [ ] **RF10** — Telemetria herdada: `stack_detected` + `knowledge_copied: { stack: "python", atom_count: 18 }`
- [ ] **RF11** — Fase-00 pré-RED audit no Plano 01: grep em testes/goldens que enumeram `knowledge/`
  ou `MATRIX_FOLDER_VALUES`; scaffold+piloto bundled num commit (gotcha [knowledge-presence] do Next)
- [ ] **RF12** — Tentativa de rastreio da origem/licença "ECC" (python-patterns, python-testing);
  se encontrada, entrada no NOTICES (mitigação não-bloqueante do risco D5)
- [ ] **RF13** — Frontmatter `sources:` com paths `Infos/knowledge/Python/...` em 18/18 (audit trail)

### Could Have

- [ ] **RF14** — Nota Django/Flask no output do `/init` (D8)
- [ ] **RF15** — Preview top keywords Python no output (regressão automática da infra RF10 Node)
- [ ] **RF16** — Flag de revisão de tier do `graphql-grpc-contracts` após escrita (T3 → T2 se o
  conteúdo render mais que o esperado; espelho do RF13 Rails/active-storage)
- [ ] **RF17** — Registrar débito "reconciliar schema frontmatter Next" no TODO.md

### Won't Have (v7.7.0)

- **Django / Flask knowledge** — sem fonte disponível; padrões web são FastAPI-native declarados (D2)
- **Data science / notebooks / ML** — fora do material e do perfil de uso
- **netmiko-ssh-automation** e **generating-python-installer** — nicho (rede Cisco; Nuitka/Windows
  em chinês); fontes ficam em Infos/ para PRD futuro se houver demanda
- **Neutralização dos átomos web para Python genérico** — contraria D2 e a lição stack-native
- **Fix do gap Laravel** — mesma bomba AbortError, chip de task separado já criado
- **Reconciliação do schema Next** — débito registrado (RF17), fora deste escopo
- **Poetry/pip-tools em profundidade** — uv-first conforme fontes; alternativas viram nota inline
- **Drift detection automática de fontes** — `sources:` é audit trail; refresh manual
- **Update flow propagando knowledge para projetos já instalados** — `--refresh-knowledge` cobre

---

## Requisitos Nao-Funcionais

- **Performance:** cópia de 18 átomos + INDEX < 100ms (herdado da infra; sem nova medição). Leitura
  de `requires-python` é O(1) sobre pyproject típico.
- **Seguranca:** markdown estático, sem execução runtime. Proteções herdadas de `copyKnowledge`
  (symlink reject, path traversal guard). Risco legal ECC registrado e aceito (D5) com mitigação RF12.
- **Acessibilidade:** N/A — arquivos consumidos por agente.
- **Observabilidade:** telemetria via `writeTelemetryDomainEvent` (herdada — RF10).
- **Manutenibilidade:** átomo ≤200 linhas (hard cap, verifier rejeita), INDEX ≤100, frontmatter
  consistente 18/18, claims "contestado" nunca como regra dura, versões normalizadas para a mais
  recente citada nas fontes.
- **Compat retroativa:** `python_versions` NÃO invalida átomos Rails/Node/Next existentes; suite
  completa verde no estado final (`bun test` + `bun run harness:validate`).

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Idioma dos átomos | PT-BR | EN (padrão Next) | ~90% das fontes já em PT-BR; destilação sem tradução reduz drift (D1) |
| 2 | Cobertura web | FastAPI-native declarado no INDEX | Neutralizar p/ genérico; cortar átomos web | Lição stack-native; 10/18 átomos servem qualquer Python (D2) |
| 3 | Schema frontmatter | Rails 8-campos validado + `python_versions` | Estilo Next leve; unificar 3 schemas agora | Único schema com gate de máquina; débito Next à parte (D3) |
| 4 | Contagem | 18 átomos (6 T1 + 9 T2 + 3 T3) | Enxugar p/ 14-15 | ~700KB de fonte + cap 200 tornam fusões contraproducentes (D4) |
| 5 | Fontes ECC (sem licença declarada) | Source normal em `sources:` | Corroboração apenas (recomendação IA); rastrear antes | Decisão do dev, risco aceito; mitigação RF12 (D5) |
| 6 | GraphQL/gRPC/tRPC | Átomo T3 dedicado `graphql-grpc-contracts` | Won't Have (recomendação IA); seção em api-design | Decisão do dev: material estruturado existe, T3 sinaliza nicho (D6) |
| 7 | Warning legado | `requires-python` < 3.11 → warning | Sem warning | Precedente RF11 Rails; TaskGroup é 3.11+, TypeIs é 3.13+ (D7) |
| 8 | Versionamento frontmatter | Só `python_versions`; FastAPI inline | + `fastapi_versions` | 1 campo por stack (precedente); 10 átomos nunca usariam o 2º (D9) |
| 9 | Átomo piloto | `async-and-concurrency` | idioms; security | Fonte já hierarquizada por impacto; BOM/RUIM denso; calibra gate ≥80% (D10) |
| 10 | Audit humano | security + sqlalchemy + debugpy | 1 por tier neutro; +graphql (4) | Onde erro custa mais + fonte menos confiável (D11) |
| 11 | Nota Django/Flask | Could-have no output | Só INDEX | Complementa D2 sem bloquear core (D8) |

---

## Premissas a Validar

| # | Premissa (o que estamos apostando ser verdade) | Tier | Como validar |
|---|---|---|---|
| 1 | Infra (`runStackKnowledgeInit`, `copyKnowledge`, preface, telemetria) funciona com `primary='python'` sem mudança de código core | Must | Tracer e2e RF6 no Plano 01 — antes de investir nos 17 átomos restantes |
| 2 | Fontes em `Infos/knowledge/Python/` permanecem inalteradas durante a execução | Must | Freeze: não editar Infos/ durante o PRD; `sources:` referencia paths estáveis |
| 3 | Material FastAPI denso é destilável dentro do cap 200 linhas/átomo | Should | Piloto `async-and-concurrency` mede; excedente vira backlog TODO.md |
| 4 | Conteúdo ECC não reproduz obra de licença restritiva reconhecível | Might | RF12 (rastreio); audit humano do que citar ECC |
| 5 | Adicionar matrix python não regride goldens/testes existentes | Must | Fase-00 pré-RED (RF11) antes de qualquer mudança |

---

## Criterios de Aceite

- [ ] **CA-01:** Dado o plugin com `knowledge/python/{INDEX.md, atoms/*.md}`, quando dev clona,
  então os 18 átomos + INDEX estão presentes, cada átomo com frontmatter completo (8 campos +
  `python_versions` quando aplicável), corpo ≤200 linhas, zero placeholders.
- [ ] **CA-02:** Dado projeto com `pyproject.toml` contendo fastapi, quando dev roda `/init`, então
  `.claude/stack.json` tem `primary: "python"`, `.claude/knowledge/` recebe INDEX + 18 átomos em
  ≤100ms, e **nenhum AbortError** ocorre.
- [ ] **CA-03 (regressão):** Dado o validador estendido, quando roda sobre átomos Node + Rails +
  Python juntos, então 100% pass; e `python_versions: "3.11"` (string, não array) é rejeitado com
  erro claro.
- [ ] **CA-04 (edge):** Dado pyproject com `requires-python = ">=3.9"`, quando dev roda `/init`,
  então knowledge é copiado E o warning de versão aparece no output; com `">=3.12"`, nenhum warning.
- [ ] **CA-05:** Dado projeto Python populado, quando agente invoca `/security`, então a resposta
  cita `.claude/knowledge/INDEX.md` antes do corpo genérico e o INDEX roteia para
  `security-fastapi-owasp` na seção "Para /security".
- [ ] **CA-06 (regressão):** Dado projeto sem `.claude/knowledge/INDEX.md`, quando skills cross-stack
  rodam, então degradação graciosa sem warnings/erros.
- [ ] **CA-07 (multi-stack):** Dado monorepo Python+Node com maioria `.py`, quando `/init` roda,
  então `primary == "python"`, `secondary` inclui `nodejs-typescript`, só matrix python copiada.
- [ ] **CA-08 (qualidade):** Dado cada átomo extraído, quando verifier refined roda (só Padrões
  sênior + Anti-padrões + Critérios de decisão), então ≥80% das claims rastreiam a passagens das
  fontes do `sources:`; audit humano dos 3 átomos D11 assinado no STATE.md antes de aprovar batch.
- [ ] **CA-09 (regressão):** `/init` em projetos Node, Rails e Next continua intacto (suites e2e
  existentes verdes).
- [ ] **CA-10:** Dado `THIRD-PARTY-NOTICES.md`, quando inspecionado, então contém entrada MIT do
  python-debugpy verbatim; e grep por "Hermes"/"tui_gateway"/"run_agent" no átomo
  `debugging-pdb-debugpy` retorna zero.
- [ ] **CA-11 (edge):** Dado projeto só com `requirements.txt`, quando `/init` roda, então python é
  detectado, knowledge copiado, e nenhum warning de versão é emitido.

---

## Out of Scope

Ver Won't Have. Resumo: Django/Flask, data science, netmiko, installer, neutralização genérica,
Laravel, schema Next, poetry/pip-tools profundo, drift detection, update flow.

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Padrão existente | `probePython` + anchors + `SOURCE_EXT_BY_MATRIX['python']` + `PYTHON_CANDIDATES` | ✅ Verificados no código nesta sessão |
| Padrão existente | `MATRIX_FOLDER_VALUES` / `STACK_ID_TO_MATRIX_FOLDER['python']` | ✅ Já mapeado |
| Lib interna | `runStackKnowledgeInit`, `copyKnowledge`, `getStackKnowledgePreface`, telemetria | ✅ Stack-agnostic (premissa 1 valida no tracer) |
| Validação | `atoms-frontmatter-validator.ts` + `harness:validate` | ✅ Disponível; RF3 estende |
| Fonte de conteúdo | `Infos/knowledge/Python/` (10 compass + 5 deep-research + 3 skills) | ✅ Triado nesta sessão; stub (2) descartado |
| Compound lesson | anti-drift 2026-05-16 + verifier refined 2026-05-16 | ✅ Disponíveis, regression obrigatória |
| Precedente | Parser `format-knowledge-preview.ts` aceita `Por\|By keyword` | ✅ Verificado |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Compressão ~700KB → ~3.6k linhas perde nuance ou infla claims | Média | Alto | Anti-drift + verifier refined desde o piloto (first-try em Rails/Next); piloto calibra |
| Átomos densos estouram cap 200 (api-design: 39 regras; security: 20 seções) | Alta | Médio | Cap hard, verifier rejeita; excedente → backlog TODO.md (precedente R8 Next) |
| Licença ECC não rastreada em conteúdo distribuído (D5, aceito pelo dev) | Média | Médio | RF12 rastreio não-bloqueante; audit humano cobre átomos que citam ECC |
| Contexto proprietário "Hermes" vaza no átomo debugging | Média | Baixo | Limpeza explícita na fase + CA-10 grep + audit humano D11 |
| Nova matrix regride goldens/testes existentes | Média | Alto | RF11 fase-00 pré-RED (precedente D17 Next); bundle scaffold+piloto |
| Verifier false-positive "tudo OK" sem checar | Média | Alto | Protocolo refined obrigatório + audit humano 3 átomos (CA-08) |
| Divergência de versões entre relatórios (FastAPI 0.136 vs 0.141; Ruff 0.15 vs 0.16) | Alta | Baixo | Normalizar p/ mais recente citada; conflito real vira nota em Critérios de decisão |
| Claims "contestado" (~21) viram regra dura | Média | Médio | Campo de confiança das fontes filtra; verifier audita |
| Dev Django aplica padrão FastAPI sem perceber | Baixa | Baixo | Preâmbulo INDEX (RF1) + nota RF14 |

<!-- Gerado por /anti-vibe-coding:write-prd em 2026-08-30 importando CONTEXT.md (11 decisões via /grill-me) -->

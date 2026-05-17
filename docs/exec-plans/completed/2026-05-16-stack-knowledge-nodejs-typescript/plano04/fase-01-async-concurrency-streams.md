<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 01: Átomo `async-concurrency-streams.md`

**Plano:** 04 — Atom Batch A
**Sizing:** 2h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 1 `docs/knowledge/nodejs-typescript/atoms/async-concurrency-streams.md` (~140 linhas), condensando event loop, structured concurrency, queues, locks, workers e streams + backpressure no idioma Node 20+/22+. Cobre o ângulo Node-specific de cada padrão (libuv, microtask queue, AbortController, `node:stream/promises`) que `/system-design` cobre apenas como princípio cross-stack de throughput.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/async-concurrency-streams.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~140 linhas) |

---

## Implementacao

### Passo 1: Frontmatter (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: async-concurrency-streams
stack: nodejs-typescript
layer: both
sources:
  - research: cbfb8720
  - skill: nodejs-core/rules/libuv-event-loop.md
  - skill: nodejs-core/rules/libuv-thread-pool.md
  - skill: nodejs-core/rules/libuv-async-io.md
  - skill: nodejs-core/rules/streams-internals.md
  - skill: nodejs-core/rules/worker-threads-internals.md
tier: 1
triggers: [event loop, promise, async, worker, stream, backpressure, AbortController]
related_skills: [/system-design]
updated: 2026-05-16
---
```

Origens (de `_catalog.md`):
- `cbfb8720` — Concurrency & Async (1511 linhas, event loop + structured concurrency + queues + locks + workers + streams)
- Rules app-relevant de `nodejs-core`: `libuv-event-loop`, `libuv-thread-pool`, `libuv-async-io`, `streams-internals`, `worker-threads-internals` (filtradas em `_catalog.md` linha 59)

### Passo 2: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem (verbatim com piloto):

1. `# Async, Concurrency e Streams — Node.js + TypeScript` (título)
2. `## Quando consultar` — 3-5 bullets de cenários
3. `## Padrões sênior` — 5-7 patterns (sub-seções `### Pattern: {nome}` com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 3-4 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skill `/system-design` + paths das fontes

### Passo 3: Patterns recomendados (guia editorial — executor expande de 1 linha em sub-seção completa)

Mínimo 5, máximo 7 — extrair de `cbfb8720` + libuv-* rules:

- **Pattern: Microtask ordering vs macrotask** — `Promise.then` vs `setImmediate` vs `process.nextTick`; entender que microtasks drenam antes do próximo tick do event loop.
- **Pattern: Structured concurrency com `Promise.all` vs `Promise.allSettled`** — `all` falha rápido (curto-circuito), `allSettled` espera todos (auditoria + reporting de falhas parciais).
- **Pattern: `AbortController` para cancelamento cooperativo** — propagar signal através de chamadas `fetch`/`setTimeout`/`stream` para evitar trabalho órfão pós-timeout.
- **Pattern: Queue + concurrency limit (`p-limit` / `p-queue`)** — proteger downstream (DB, HTTP upstream) de fan-out descontrolado.
- **Pattern: Worker threads para trabalho CPU-bound** — quando handler async bloqueia o event loop por >50ms (hash, parse pesado, transform de imagem); usar `node:worker_threads`.
- **Pattern: Streams + backpressure com `pipeline()` de `node:stream/promises`** — substitui `.pipe()` legado; propaga erros e respeita `highWaterMark`; suporta `AbortSignal`.
- **Pattern: Async iterators (`for await...of`) para grandes volumes** — leitura incremental sem materializar tudo na memória.

### Passo 4: Anti-padrões (3-4 armadilhas com correção)

- **`for...of` sequencial com `await` quando paralelismo era possível** — correção: `Promise.all(items.map(...))` se ordem não importa, ou batch + `p-limit` se ordem importa mas paralelismo é seguro.
- **Stream sem handler de `error`** — correção: usar `pipeline()` (propaga automaticamente) em vez de `.pipe()`; nunca confiar em `.on('end')` sem `.on('error')`.
- **Mistura de I/O sync em handler async** — `fs.readFileSync` dentro de Express handler bloqueia event loop; correção: `fs.promises.readFile` ou stream.
- **"Callback hell" residual (libs antigas)** — correção: `util.promisify` para envelopar callbacks node-style.

### Passo 5: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Operações independentes em paralelo, tolerância a falha parcial | `Promise.allSettled` |
| Operações independentes em paralelo, falha rápida | `Promise.all` |
| CPU-bound (>50ms bloqueando event loop) | Worker thread |
| I/O-bound paralelo descontrolado (fan-out) | `p-limit` ou `p-queue` |
| Grande volume de dados em streaming | `pipeline()` + async iterator |
| Cancelamento cooperativo de operação longa | `AbortController` + propagar signal |

### Passo 6: Referências externas

- Skill: `/system-design` para princípios cross-stack de throughput, latência, escalabilidade
- Source: `claude-code/knowledge/Nodejs/wf-cbfb8720.md`
- Source: `claude-code/knowledge/Nodejs/nodejs-core/rules/libuv-event-loop.md` (+ libuv-thread-pool, libuv-async-io, streams-internals, worker-threads-internals)

### Passo 7: Validar cap de 200 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/async-concurrency-streams.md
```

Resultado esperado: entre 100 e 200 linhas. Alvo: ~140 (per `_topic-plan.md:53`).

---

## Gotchas

- **G1 do plano:** frontmatter verbatim com piloto (8 campos na ordem `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`). Qualquer drift invalida CA-01.
- **G2 do plano:** cap de 200 linhas. Se exceder, **condensar** (cortar exemplos), não adicionar nova seção ou split em outro átomo (split exigiria revisar `_topic-plan.md` — fora do escopo do plano).
- **G5 do plano:** overlap com `/system-design`. Resistir a explicar "o que é throughput" ou "o que é fan-out" — `/system-design` cobre. Este átomo cobre **como** o libuv/event loop/streams Node implementam, não **o que** é o conceito.
- **G6 do plano:** frontmatter `sources:` lista compass-id (`cbfb8720`) e skill path para rules (`nodejs-core/rules/libuv-event-loop.md`), sem caminho absoluto. Caminho absoluto vai em "Referências externas" no corpo.
- **Local — múltiplas rules de nodejs-core como source:** este é o átomo com mais fontes (1 research + 5 rules). Manter `sources:` legível — uma entrada por linha; ordenar research primeiro, depois skills.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Como o piloto, este átomo é markdown. Checklist de validação de conteúdo:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/async-concurrency-streams.md`
- [ ] Frontmatter contém **todos** os 8 campos na ordem: `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`
- [ ] `topic: async-concurrency-streams` (literal, kebab-case, igual ao filename sem `.md`)
- [ ] `stack: nodejs-typescript` (alinha com pasta — sem `node-ts`)
- [ ] `layer: both` (este átomo aplica a backend e frontend TS)
- [ ] `tier: 1` (must-know, conforme `_topic-plan.md:142`)
- [ ] `updated: 2026-05-16`
- [ ] Corpo tem as 5 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas
- [ ] Pelo menos 5 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 3 anti-padrões com correção
- [ ] `wc -l` retorna entre 100 e 200 (alvo ~140)
- [ ] `grep -c '\[A DEFINIR\]' atoms/async-concurrency-streams.md` retorna 0
- [ ] Triggers contém pelo menos: `event loop`, `promise`, `async`, `worker`, `stream`, `backpressure`, `AbortController`
- [ ] Citações de `/system-design` em "Referências externas" para evitar duplicação cross-stack

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/async-concurrency-streams.md` exit 0
- `wc -l docs/knowledge/nodejs-typescript/atoms/async-concurrency-streams.md` retorna número entre 100 e 200
- `grep -c '\[A DEFINIR\]' docs/knowledge/nodejs-typescript/atoms/async-concurrency-streams.md` retorna 0
- Frontmatter parseável como YAML; ordem dos 8 campos idêntica ao piloto

**Por humano:**
- Leitor sênior em Node+TS reconhece os patterns como decisões de produção, não bullets genéricos de tutorial
- Nenhum pattern duplica conteúdo coberto cross-stack por `/system-design` (diferencial Node+TS-específico — libuv, microtask queue, `node:stream/promises` — é claro)
- Anti-padrões refletem armadilhas reais já vistas em PRs (sequential `await` indevido, stream sem error handler)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

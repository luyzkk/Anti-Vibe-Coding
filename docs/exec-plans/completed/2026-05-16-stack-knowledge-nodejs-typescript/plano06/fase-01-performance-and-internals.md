<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 01: Átomo `performance-and-internals.md`

**Plano:** 06 — Atom Batch C + INDEX + Polish
**Sizing:** 1.5-2h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 3 full `docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md` (~150-180 linhas), condensando o ângulo Node+TS de performance sênior + internals que afetam decisões diárias: event loop deep dive (microtasks/macrotasks, libuv phases), V8 hot paths (hidden classes, inline caching, JIT), GC tuning (gerações, --max-old-space-size, flags), memory leaks comuns (Buffer retention, AsyncLocalStorage, closures sobre request objects), worker_threads vs cluster decisão, profiling (clinic.js, 0x, V8 inspector, async hooks) e native-memory pitfalls (Buffer.allocUnsafe). `/system-design` cobre cache/scaling cross-stack; este átomo cobre o que é específico do runtime V8/libuv.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~150-180 linhas) |

---

## Implementacao

### Passo 1: Confirmar nomes exatos das rules em `nodejs-core/rules/` (Glob antes de citar)

Antes de escrever o frontmatter, rodar `ls claude-code/knowledge/Nodejs/nodejs-core/rules/` e confirmar que existem (já verificados durante o planning):

- `v8-garbage-collection.md`
- `v8-hidden-classes.md`
- `v8-jit-compilation.md`
- `native-memory.md`
- `libuv-event-loop.md`
- `libuv-thread-pool.md`
- `worker-threads-internals.md`
- `profiling-v8.md`
- `memory-debugging.md`

Se algum nome divergir, ajustar o frontmatter `sources:` antes de continuar. **Não inventar nomes** — o verifier valida que cada source existe (G3 do plano).

### Passo 2: Frontmatter completo (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: performance-and-internals
stack: nodejs-typescript
layer: backend
sources:
  - research: 55c3ca89
  - skill: nodejs-core/rules/v8-garbage-collection.md
  - skill: nodejs-core/rules/v8-hidden-classes.md
  - skill: nodejs-core/rules/v8-jit-compilation.md
  - skill: nodejs-core/rules/native-memory.md
  - skill: nodejs-core/rules/libuv-event-loop.md
  - skill: nodejs-core/rules/profiling-v8.md
tier: 3
triggers: [performance, event loop, v8, gc, garbage collection, hidden classes, inline cache, jit, memory leak, profiling, clinic, 0x, native memory, worker threads, async hooks]
related_skills: [/system-design, /api-design]
updated: 2026-05-16
---
```

Origens (de `_catalog.md`):
- `55c3ca89` — Performance KB (1149 linhas, event-loop, memory, cache, bundle, cold start, GC, serverless)
- `nodejs-core/rules/v8-*.md` + `libuv-*.md` + `native-memory.md` + `profiling-v8.md` — rules application-relevant marcadas em `_catalog.md` §2 (12 das 27 rules úteis para aplicação)

### Passo 3: Skeleton do corpo (5 seções na ordem do piloto)

Seções obrigatórias (verbatim com piloto):

1. `# Performance & Internals — Node.js + TypeScript` (título H1)
2. `## Quando consultar` — 3-5 bullets de cenários
3. `## Padrões sênior` — 5-7 patterns (sub-seções `### Pattern: {nome}` com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 2-5 armadilhas com correção
5. `## Critérios de decisão` — tabela ou bullets "se X, então Y"
6. `## Referências externas` — skills relacionadas + paths das fontes (RF11 audit-trail aqui)

### Passo 4: Conteúdo nuclear esperado (guia editorial — executor expande)

**Quando consultar (3-5 bullets):**
- Aplicação Node+TS hot path com p95/p99 latency degradando sob carga
- Memory leak suspeito (RSS crescendo monotonicamente, heap snapshots diff diverge)
- Decisão entre worker_threads, cluster module ou external queue (BullMQ/SQS) para CPU-bound work
- Tuning de GC para containers com memory limit apertado (Kubernetes, Lambda)
- Profiling pre-merge antes de release de feature crítica

**Padrões sênior (5-7 patterns — recomendação):**

- **Pattern: Event loop deep — microtasks vs macrotasks vs libuv phases** — Problema: ordem de execução não-determinística mata mental model. Padrão: `process.nextTick` > microtasks (Promise.then) > timers (setTimeout) > I/O callbacks > setImmediate > close callbacks. Quando usar conhecimento: debugar starvation (microtasks chain bloqueando timers). Quando NÃO: código de domínio comum — abstração já é suficiente.
- **Pattern: V8 hot paths — hidden classes + inline caching** — Problema: alterar shape de objeto após criação invalida hidden class, mata polymorphic inline cache. Padrão: declarar todos os campos no construtor; nunca `delete obj.x`; ordem consistente. Quando usar: classes/objetos no hot path (>1k chamadas/s).
- **Pattern: GC tuning — --max-old-space-size + flags** — Problema: containers com memory limit Kubernetes (ex: 512MB) ficam estrangulados por GC quando default V8 heap (1.7GB em 64-bit) excede. Padrão: `--max-old-space-size=384` para container 512MB; flags `--gc-interval` para batch workloads. Quando usar: containers com mem cap; quando NÃO: long-running com mem abundante.
- **Pattern: Memory leak — closures sobre request/response objects (Buffer retention, AsyncLocalStorage)** — Problema: callback assíncrono captura `req`/`res`/Buffer e mantém vivo após resposta. Padrão: nullify referências longas em callback final; usar `AsyncLocalStorage` com `.exit()` explícito; `Buffer.allocUnsafe` só em hot path com `.fill()` imediato.
- **Pattern: worker_threads vs cluster vs external queue** — Problema: CPU-bound work bloqueia event loop. Padrão de decisão: worker_threads para single-process CPU work (image resize, parsing pesado); cluster para multi-core de I/O work; external queue (BullMQ/SQS) quando precisa persistência ou retry distribuído. Quando NÃO usar worker_threads: I/O-bound (libuv já paraleliza), state shared (overhead serialização).
- **Pattern: Profiling stack — clinic.js + 0x + V8 inspector** — Problema: "está lento" sem dados é guess. Padrão: clinic.js (doctor/bubbleprof/flame) para overview; 0x para flamegraph; V8 inspector (`--inspect`) para Chrome DevTools step-through. Quando usar cada: clinic para CI baseline, 0x para análise local, inspector para debug interativo.
- **Pattern: Buffer.allocUnsafe + native-memory pitfalls** — Problema: `Buffer.allocUnsafe(n)` retorna memória não-zerada (leak risk se não preencher); `Buffer.from(arrayBuffer)` compartilha memória subjacente. Padrão: `allocUnsafe` apenas em hot path com `.fill(0)` ou overwrite imediato; preferir `Buffer.alloc` em código de domínio. Quando NÃO usar `allocUnsafe`: tudo que não é hot path provado.

**Anti-padrões (2-5 itens):**

- **Sync I/O em hot path (`readFileSync`, `JSON.parse` de payload grande)** — bloqueia event loop por dezenas/centenas de ms. Correção: `fs/promises` + streaming + `JSON.parse` com size limit; considerar `simdjson` se payload >1MB.
- **`new Function()` ou `eval` em hot path** — V8 desotimiza função circundante. Correção: pre-compilar templates (ex: Handlebars precompiled, `compile` no boot).
- **Polimorfismo excessivo (`if (typeof x === 'string') ... else if (typeof x === 'number')`)** — V8 cai em megamorphic IC. Correção: separar funções por tipo (overloads + branding) ou usar discriminated union (`switch (kind)`).
- **`process.memoryUsage()` em hot path como métrica** — chamada sincrona, custosa. Correção: amostrar via setInterval ou perf_hooks PerformanceObserver.

**Critérios de decisão (tabela):**

| Sintoma | Próximo passo |
|---|---|
| p99 > p95 * 3 | profiling com clinic.js doctor → checar GC pauses + event loop lag |
| RSS cresce mas heap estável | C++ addon leak ou Buffer não-released — usar `process.report` + heap snapshot diff |
| Throughput baixo com CPU baixo | I/O bound — paralelizar com Promise.all, ou usar libuv thread pool maior (`UV_THREADPOOL_SIZE`) |
| Throughput baixo com CPU alto | CPU bound — worker_threads ou external queue |
| Container OOM kill recorrente | `--max-old-space-size` < container limit; checar leaks de Buffer ou retainers AsyncLocalStorage |

**Referências externas (RF11 audit-trail aqui):**

- Skill `/system-design` para princípios cross-stack de caching/scaling/CDN
- Skill `/api-design` para N+1 + batching genérico
- Research: `claude-code/knowledge/Nodejs/wf-55c3ca89.md` (Performance KB, 1149 linhas)
- Skill rules:
  - `claude-code/knowledge/Nodejs/nodejs-core/rules/v8-garbage-collection.md`
  - `claude-code/knowledge/Nodejs/nodejs-core/rules/v8-hidden-classes.md`
  - `claude-code/knowledge/Nodejs/nodejs-core/rules/v8-jit-compilation.md`
  - `claude-code/knowledge/Nodejs/nodejs-core/rules/native-memory.md`
  - `claude-code/knowledge/Nodejs/nodejs-core/rules/libuv-event-loop.md`
  - `claude-code/knowledge/Nodejs/nodejs-core/rules/profiling-v8.md`

---

## Gotchas

- **G1 do plano (formato copiado do piloto, zero drift):** frontmatter com 8 campos na ordem `topic, stack, layer, sources, tier, triggers, related_skills, updated`. 5 seções do corpo na ordem do piloto. Qualquer divergência = regressão CA-01.
- **G2 do plano (cap de 200 linhas):** tier 3 deste átomo é o maior risco de inchaço — cluster Q internals foi consolidado aqui. Se passar de 200, **condensar** (não split em outro átomo — `_topic-plan.md` já definiu 14 átomos, sem espaço para 15). Faixa saudável: 150-180 linhas.
- **G3 do plano (frontmatter `sources:` é compass-id, audit-trail vai em corpo):** sources tem `- research: 55c3ca89` (sem path); o path absoluto vai em "Referências externas" no corpo. Para rules de skill, usar `- skill: nodejs-core/rules/{nome}.md`.
- **G6 do plano (overlap com /system-design):** átomo cobre o ângulo Node+TS-específico (V8 GC, libuv, hidden classes, Buffer). `/system-design` cobre princípios cross-stack (caching strategies, load balancing, CDN). Sempre que um pattern parecer cross-stack, parar e linkar `/system-design` — não duplicar.
- **Local — internals só importam se afetam decisões:** decisão da Fase Zero foi excluir internals que NÃO afetam decisões diárias (ex: detalhes de N-API, JIT pipeline). Aqui ficam apenas: hidden classes (afetam shape de objetos em hot path), GC tuning (afeta containers), libuv event loop phases (afeta ordem de callbacks), native-memory (afeta uso de Buffer). Se um pattern não muda decisão diária do dev sênior, **não escrever**.
- **Local — risco de over-citação de `nodejs-core/rules/`:** existem 12 rules application-relevant, mas o frontmatter `sources:` deve ficar curto (6-7 entradas, não 12). Listar apenas as que efetivamente sustentam claims do átomo; resto fica em "Referências externas" como leitura adicional.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é escrita de átomo, não código.

### Checklist

- [ ] Arquivo criado em `docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md`
- [ ] Frontmatter com **8 campos** na ordem do piloto (`topic, stack, layer, sources, tier, triggers, related_skills, updated`)
- [ ] `stack: nodejs-typescript` (nunca `node-ts` — herdado DI-1/DI-2)
- [ ] `layer: backend` (V8 GC e libuv são server-side; frontend tem outro modelo)
- [ ] `tier: 3`
- [ ] 5 seções do corpo na ordem certa (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas)
- [ ] Zero placeholders `[A DEFINIR]`
- [ ] `wc -l docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md` retorna entre 120 e 200 (faixa saudável 150-180)
- [ ] Links para `/system-design` e `/api-design` em "Referências externas"
- [ ] Audit-trail-paths absolutos das fontes em "Referências externas" (RF11 pré-cumprido aqui já facilita fase-05)
- [ ] Cada rule citada em `sources:` existe em `claude-code/knowledge/Nodejs/nodejs-core/rules/` (verificado via Glob no Passo 1)
- [ ] `bun run harness:validate` verde com o novo átomo

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md` exit 0
- `wc -l docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md | awk '{print $1}'` retorna valor entre 120 e 200
- `grep -c '\[A DEFINIR\]' docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md` retorna 0
- `grep -E '^topic: performance-and-internals$' docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md` retorna 1 match
- `grep -E '^tier: 3$' docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md` retorna 1 match
- `grep -E '^stack: nodejs-typescript$' docs/knowledge/nodejs-typescript/atoms/performance-and-internals.md` retorna 1 match
- `bun run harness:validate` exit 0

**Por humano (verificável em fase-06 do plano, auditoria CA-08):**
- Patterns lem como senior Node+TS (não bullets genéricos de tutorial)
- Cada pattern tem Problema + Padrão + Quando usar/NÃO — não só título
- Nenhuma claim duplica conceito cross-stack que `/system-design` cobre (caching genérico, load balancing, CDN)
- Cada claim sobre V8/libuv/native-memory é rastreável para passagem específica das rules citadas em `sources:` (≥80% per CA-08)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

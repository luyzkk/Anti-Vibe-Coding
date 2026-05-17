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
triggers: [performance, event loop, v8, gc, garbage collection, hidden classes, inline cache, jit, memory leak, profiling, clinic, 0x, native memory, worker threads, UV_THREADPOOL_SIZE]
related_skills: [/system-design, /api-design]
updated: 2026-05-17
---

# Performance & Internals — Node.js + TypeScript

## Quando consultar

- Aplicação Node+TS com p95/p99 latency degradando sob carga — suspeita de event loop bloqueado ou GC pauses excessivos.
- RSS crescendo monotonicamente após 30+ minutos em produção — diagnóstico de memory leak.
- Decisão entre `worker_threads`, `cluster` ou fila externa (BullMQ/SQS) para CPU-bound work.
- Containers com memory cap apertado (Kubernetes, Lambda 512 MB) sofrendo OOM kill recorrente.
- Profiling pre-merge antes de release de feature crítica no hot path.

## Padrões sênior

### Pattern: Event loop phases — microtasks, macrotasks e libuv

- **Problema:** código que mistura `process.nextTick`, `Promise.then` e `setImmediate` pode starvar I/O callbacks ou produzir bugs de ordem de execução difíceis de reproduzir.
- **Padrão:** a ordem prática é: `process.nextTick` drena antes das microtasks (Promise callbacks); microtasks drenam antes da próxima fase libuv; `setImmediate` só executa na fase check (após poll); `setTimeout(0)` executa na fase timers. Dentro de um I/O callback, `setImmediate` é sempre anterior a `setTimeout(0)`. Nunca use `process.nextTick` em recursão — starva completamente I/O e timers; use `setImmediate` quando precisar ceder o loop iterativamente.
- **Quando usar:** ao depurar latência intermitente ou starvation causada por chains de microtasks; ao medir event loop lag com `monitorEventLoopDelay({ resolution: 20 })` de `node:perf_hooks` (alerta quando p99 > 100 ms).
- **Quando NÃO usar:** código de domínio comum — a abstração async/await já é suficiente; internals de libuv só importam quando o profiler aponta o event loop como gargalo.

---

### Pattern: V8 hidden classes e inline caching no hot path

- **Problema:** alterar a shape de um objeto após criação (adicionando propriedades fora do construtor, usando `delete`, mudando tipo de campo, ou inicializando propriedades em ordens diferentes) invalida a hidden class (Map V8) e degrada o inline cache (IC) de monomorphic para polymorphic ou megamorphic — medições mostram até ~56× de slowdown ao passar de monomorphic para megamorphic em microbenchmarks.
- **Padrão:** inicializar todos os campos no construtor na mesma ordem; nunca usar `delete obj.x` (substitua por `obj.x = undefined` para manter fast properties); manter tipos de campo consistentes (não misturar number e string no mesmo campo). Para arrays no hot path, manter elementos do mesmo tipo (`PACKED_SMI_ELEMENTS` → `PACKED_DOUBLE_ELEMENTS` → `PACKED_ELEMENTS` é transição one-way). Use `--trace-ic` para detectar megamorphic call sites em análise de performance.
- **Quando usar:** classes/objetos criados em frequência > 1k/s no hot path — serializers, DTOs em request handling, event objects em fila interna.
- **Quando NÃO usar:** objetos de configuração one-shot ou de longa vida (criados uma vez no boot) — a micro-otimização de shape não compensa a leitura comprometida.

---

### Pattern: GC tuning — `--max-old-space-size` e containers

- **Problema:** o heap V8 default (~1.5–4 GB em 64-bit) não detecta automaticamente cgroup limits de containers Kubernetes ou Lambda. Um container de 512 MB pode ser OOM-killed sem que o GC tenha tido chance de limpar — o V8 não sabe que a memória é escassa.
- **Padrão:** definir `--max-old-space-size` como ~75–80% do RAM do container (ex: `--max-old-space-size=384` para container de 512 MB). Usar `--trace-gc` para inspecionar Scavenge vs Mark-Compact; Mark-Compact > 100 ms é sinal de tuning necessário ou de leak. Monitorar GC pauses em produção via `PerformanceObserver({ entryTypes: ['gc'] })` e alertar quando p99 > 50 ms. `--max-semi-space-size=64` pode ajudar em workloads de alta alocação (JSONs, request objects) ao reduzir promoção prematura para old space.
- **Quando usar:** sempre que o container tiver memory limit configurado; obrigatório em Lambda e Kubernetes com `resources.limits.memory`.
- **Quando NÃO usar:** tuning não resolve um leak real — se `heapUsed` cresce monotonicamente por horas, diagnostique o leak (memory.md patterns) antes de ajustar flags. `--expose-gc` + `global.gc()` nunca em produção (pausa síncrona de ~100 ms).

---

### Pattern: Memory leak — closures, AsyncLocalStorage e timers

- **Problema:** callbacks assíncronos que capturam `req`/`res`/Buffer mantêm o objeto vivo mesmo após a resposta ser enviada. `AsyncLocalStorage` com contexto grande (payload completo em vez de só IDs de correlação) retém referências em toda a cadeia de awaits. Timers com `setInterval` sem `clearInterval` mantêm closures — e tudo que elas capturam — vivos para sempre.
- **Padrão:** em callbacks long-lived, nullify referências desnecessárias após uso. Em `AsyncLocalStorage`, armazenar apenas IDs leves (string de request ID, user ID) e rehydratar quando necessário — nunca o objeto `req` inteiro. Sempre guardar handle de `setInterval`/`setTimeout` e limpar no teardown. Para detectar: `process.on('SIGUSR2', () => writeHeapSnapshot(...))` — compare dois snapshots com 1 h de distância no Chrome DevTools Memory view (sort por "Delta"). Em Node 22+, `v8.queryObjects(Constructor)` conta instâncias vivas sem snapshot completo.
- **Quando usar:** em todo serviço long-running; em queue workers onde o mesmo processo trata milhares de jobs.
- **Quando NÃO usar:** em funções serverless de curta vida onde o processo é descartado após cada invocação — o GC não tem tempo de importar.

---

### Pattern: `Buffer.allocUnsafe` e native-memory pitfalls

- **Problema:** `Buffer.allocUnsafe(n)` retorna memória não-zerada do pool interno — se o conteúdo não for imediatamente sobrescrito, pode vazar dados de heap anterior para clientes. `Buffer.from(arrayBuffer)` compartilha o `ArrayBuffer` subjacente: modificar um modifica o outro. Para monitorar leaks nativos (C++ addons), `process.memoryUsage().rss - heapTotal > 100 MB` sustained é sinal de vazamento de native memory (ArrayBuffer ou addon).
- **Padrão:** usar `Buffer.allocUnsafe(n)` apenas em hot path comprovado onde o overwrite é imediato. Para código de domínio, preferir `Buffer.alloc(n)` (zero-filled, seguro). Quando receber `Buffer` de addon, nunca guardar o ponteiro raw além do tempo de vida do Buffer — usar `Napi::Reference` ou copiar os dados.
- **Quando usar:** `allocUnsafe` apenas em hot encode/decode loops profiled onde o zero-fill representa overhead mensurável; medir antes de adotar.
- **Quando NÃO usar:** qualquer código que retorne Buffers para clientes externos ou armazene em cache — risco de information leak.

---

### Pattern: `worker_threads` vs `cluster` vs fila externa

- **Problema:** CPU-bound work (parse de XML grande, hash de senha, image resize, regex complexa) bloqueia o event loop — todo request em voo paga o custo. A escolha errada de paralelismo (worker para I/O-bound, cluster para estado compartilhado) gera overhead sem ganho.
- **Padrão de decisão:** `worker_threads` para CPU-bound single-process (JS puro > 50 ms no main thread) — usar pool via `piscina` (startup ~3–10 ms + ~1–5 MB RSS por worker; pool amortiza isso). `cluster` para multi-core de I/O-bound quando o estado não precisa ser compartilhado entre workers. Fila externa (BullMQ/SQS) quando o work precisa de persistência, retry distribuído ou processamento assíncrono desacoplado do HTTP handler. Note: `UV_THREADPOOL_SIZE` (default 4) cobre `crypto`, `fs`, `zlib` via libuv — workers adicionais apenas para JS CPU-bound.
- **Quando usar:** `worker_threads` quando o profiler mostra > 50% CPU em uma função no main thread; cluster quando replicas Kubernetes não são opção; fila externa quando a task pode falhar e precisa ser retentada independentemente do request HTTP original.
- **Quando NÃO usar:** workers para I/O-bound (await de DB, fetch) — acrescenta serialização sem ganho. Não spawnar workers por-request — pool é obrigatório.

---

### Pattern: Profiling stack — Clinic.js, 0x e V8 inspector

- **Problema:** "a API está lenta" sem dados quantitativos é palpite. Ferramentas erradas para o sintoma certo desperdiçam horas: flame graph para um problema de async bubbling, bubbleprof para um CPU bottleneck.
- **Padrão:** Clinic.js Doctor (`clinic doctor -- node app.js`) para diagnóstico inicial — detecta event loop lag, CPU usage e memory growth em uma única run, sugere qual ferramenta usar em seguida. 0x (`0x app.js`) para flame graph CPU detalhado — identifica hot functions. Clinic Bubbleprof para async bottlenecks e I/O stalls. V8 inspector (`node --inspect`) + Chrome DevTools para debug interativo com step-through. Em produção sem acesso ao DevTools: `node --prof` + `node --prof-process isolate-*.log` para tick-sampled CPU profile. `--trace-deopt` para detectar deoptimizações ativas no TurboFan.
- **Quando usar:** Clinic Doctor como primeiro passo sempre que latência regredir; 0x e bubbleprof como segundo passo após o Doctor indicar a categoria; inspector para debugging pós-identificação de função.
- **Quando NÃO usar:** não pule direto para o inspector sem o Doctor/0x — diagnóstico sem dados leva ao optimization wrong thing.

---

## Anti-padrões

- **Sync I/O em hot path (`readFileSync`, `JSON.parse` de payload grande):** bloqueia o event loop por dezenas/centenas de ms — todo request em voo aguarda. Correção: `fs/promises`, streaming, e `JSON.parse` somente com size limit definido na camada de recepção HTTP (`express.json({ limit: '1mb' })`).

- **`process.nextTick` recursivo:** starva completamente I/O e timers — o event loop nunca avança para a fase poll. Correção: substituir por `setImmediate` em loops assíncronos iterativos; `process.nextTick` é para um único defer pós-fase, não para recursão.

- **Tuning de GC como substituto de fix de leak:** usar `--max-old-space-size` maior para "resolver" OOM quando `heapUsed` cresce monotonicamente mascara o leak e adia o crash. Correção: confirmar com dois heap snapshots; se `heapUsed` crescer entre eles, corrigir o retainer antes de ajustar flags.

- **`process.memoryUsage()` em hot path como métrica inline:** a chamada é síncrona e com custo não desprezível em alta frequência. Correção: amostrar via `setInterval` a cada 30 s ou usar `PerformanceObserver` para GC entries.

---

## Critérios de decisão

| Sintoma | Próximo passo |
|---|---|
| p99 > p95 × 3 | `clinic doctor` → checar GC pauses (`--trace-gc`) e event loop lag (`monitorEventLoopDelay`) |
| RSS cresce, heap estável | Native memory leak (Buffer não-released ou C++ addon) — `process.report` + heap snapshot diff |
| Throughput baixo, CPU baixo | I/O-bound — checar `UV_THREADPOOL_SIZE`, paralelizar com `Promise.all` + `p-limit` |
| Throughput baixo, CPU alto (main thread) | CPU-bound — `worker_threads` via `piscina` ou fila externa |
| Container OOM kill recorrente | Definir `--max-old-space-size` ≤ 80% do container RAM; verificar se não é leak antes |
| Mark-Compact > 100 ms em `--trace-gc` | Checar `--max-semi-space-size`; se heap cresce = leak, não config |
| Flame graph mostra função "inocente" dominando CPU | Megamorphic IC — checar shapes de objetos com `--trace-ic`; corrigir construtor |
| Deoptimizações frequentes em `--trace-deopt` | Type instability — separar funções por tipo, evitar `delete`, consistência de shape |

---

## Referências externas

- Skill: `/system-design` — caching strategies, load balancing, CDN, backpressure como princípios cross-stack
- Skill: `/api-design` — N+1 patterns, batching genérico de requests
- Research: `55c3ca89` — `claude-code/knowledge/Nodejs/compass_artifact_wf-55c3ca89-f0de-43dc-8ffd-8b0f5856e92a_text_markdown.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/v8-garbage-collection.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/v8-hidden-classes.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/v8-jit-compilation.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/native-memory.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/libuv-event-loop.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/profiling-v8.md`

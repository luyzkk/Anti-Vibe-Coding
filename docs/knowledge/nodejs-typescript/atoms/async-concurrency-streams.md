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

# Async, Concurrency e Streams — Node.js + TypeScript

## Quando consultar

- Decidir entre `Promise.all`, `Promise.allSettled`, `Promise.race` ou `Promise.any` para fan-out.
- Processar lista grande em paralelo sem explodir o pool de DB ou saturar FDs.
- Handler HTTP ou worker de fila está com p99 alto — suspeita de bloqueio síncrono no event loop.
- Implementar streaming de dados grandes (arquivo, cursor DB, Kafka) sem OOM.
- Adicionar timeout ou cancelamento cooperativo a chamadas fetch/timer/stream.

## Padrões sênior

### Pattern: Microtask ordering vs macrotask

- **Problema:** código que depende de ordem de execução entre `Promise.then`, `process.nextTick` e `setImmediate` produz bugs intermitentes e difíceis de reproduzir.
- **Padrão:** `process.nextTick` drena antes das microtasks (Promises); microtasks drenam antes da próxima fase do event loop; `setImmediate` só executa na fase check (após poll). Ordem prática: `nextTick` → `Promise.then` → `setImmediate` → `setTimeout(0)`. Para diferir trabalho sem starvar I/O, use `setImmediate`, nunca `process.nextTick` em recursão.
- **Quando usar:** ao encadear lógica assíncrona que precisa ceder o event loop (ex: pump de itens, processamento incremental).
- **Quando NÃO usar:** não use `process.nextTick` em recursão — starva completamente I/O e timers.

---

### Pattern: Structured concurrency com `Promise.all` vs `Promise.allSettled`

- **Problema:** `Promise.all` rejeita assim que qualquer operação falha, cancelando silenciosamente o resultado das demais. Em auditorias e relatórios isso produz perda parcial de dados sem visibilidade.
- **Padrão:**
  ```ts
  // Falha rápida — tudo deve dar certo
  const [user, prefs] = await Promise.all([getUser(id), getPrefs(id)]);

  // Coleta todos os resultados — tolerância a falha parcial
  const results = await Promise.allSettled(items.map(processItem));
  const failures = results.filter(r => r.status === 'rejected');
  ```
- **Quando usar:** `Promise.all` para operações mutuamente dependentes (todas devem suceder). `Promise.allSettled` para pipelines de enriquecimento, dashboards, relatórios onde falha parcial é aceitável.
- **Quando NÃO usar:** não use `Promise.race` para timeouts — prefira `AbortSignal.timeout(ms)` (mais limpo, propaga cancelamento).

---

### Pattern: `AbortController` para cancelamento cooperativo

- **Problema:** operações longas (paginação, stream, fetch encadeado) continuam rodando mesmo após timeout ou desconexão do cliente — recursos órfãos acumulam e derrubam o processo.
- **Padrão:**
  ```ts
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(new Error('timeout')), 5_000);
  try {
    const res = await fetch(url, { signal: ac.signal });
    // pipeline também aceita AbortSignal:
    await pipeline(res.body, transformStream, outStream, { signal: ac.signal });
  } finally {
    clearTimeout(timeout);
  }
  // Em funções internas: signal?.throwIfAborted() em cada ponto de yield
  ```
- **Quando usar:** toda função que faz I/O longo ou laço com `await` deve aceitar `{ signal?: AbortSignal }`.
- **Quando NÃO usar:** não crie `AbortController` sem propagar o signal para todas as operações filhas — cancelamento parcial é pior que nenhum.

---

### Pattern: Queue + concurrency limit (`p-limit` / `p-map`)

- **Problema:** `Promise.all(thousandItems.map(fn))` cria 1000 conexões simultâneas — esgota FDs, satura pool de DB, derruba upstream.
- **Padrão:**
  ```ts
  import pLimit from 'p-limit';
  const limit = pLimit(10); // 10 HTTP; use 5 para DB
  const results = await Promise.all(
    urls.map(u => limit(() => fetch(u).then(r => r.json())))
  );
  // Alternativa com stopOnError:
  import pMap from 'p-map';
  await pMap(rows, processRow, { concurrency: 5, stopOnError: false });
  ```
  Dimensione via Little's Law: `concurrency = throughput × latency` (ex: 100 req/s × 200 ms = 20 in-flight).
- **Quando usar:** sempre que o array for unbounded ou maior que 50 itens com operação I/O.
- **Quando NÃO usar:** para arrays pequenos e fixos (ex: 3 chamadas paralelas) — `Promise.all` direto é mais legível.

---

### Pattern: Worker threads para CPU-bound (>50 ms)

- **Problema:** parse pesado de JSON/XML, hash de senha, transform de imagem, regex complexa na main thread bloqueiam o event loop — todo request em voo paga o custo.
- **Padrão:**
  ```ts
  import Piscina from 'piscina'; // pool de workers c/ fila interna
  const pool = new Piscina({ filename: new URL('./hash.worker.ts', import.meta.url).href });
  const hash = await pool.run({ payload }); // serialização via structured clone
  ```
  Worker threads têm custo de startup ~3–10 ms + ~5–15 MB RSS — use pool, não workers descartáveis.
- **Quando usar:** trabalho síncrono > 50 ms no hot path. `UV_THREADPOOL_SIZE` (default 4) cobre `crypto`, `fs`, `zlib` — use workers apenas para JS puro CPU-bound.
- **Quando NÃO usar:** I/O-bound (await de DB, fetch) — worker acrescenta overhead de serialização sem ganho.

---

### Pattern: Streams + backpressure com `pipeline()` de `node:stream/promises`

- **Problema:** `.pipe()` legado não propaga erros corretamente; sem backpressure, produtor acumula dados na memória até OOM.
- **Padrão:**
  ```ts
  import { pipeline } from 'node:stream/promises';
  import { createReadStream, createWriteStream } from 'node:fs';
  import { createGzip } from 'node:zlib';

  await pipeline(
    createReadStream('large.csv'),
    createGzip(),
    createWriteStream('large.csv.gz'),
    { signal: ac.signal } // AbortSignal integrado
  );
  ```
  `pipeline()` destrói todos os streams em caso de erro e respeita `highWaterMark` (default 16 KB bytes / 16 objetos).
- **Quando usar:** qualquer processamento de arquivo, S3 upload/download, ETL row-by-row.
- **Quando NÃO usar:** para payloads pequenos e conhecidos em memória — overhead de stream não compensa.

---

### Pattern: Async iterators (`for await...of`) para grandes volumes

- **Problema:** `const rows = await db.queryAll(...)` em tabelas grandes materializa tudo na heap — OOM garantido acima de ~1 M linhas.
- **Padrão:**
  ```ts
  for await (const row of db.queryStream('SELECT * FROM events WHERE date > $1', [since])) {
    await processRow(row); // processa incrementalmente
  }
  // Cursors de BD, respostas chunked HTTP e Node streams são async iterables nativos
  ```
- **Quando usar:** cursors de DB, leitura de arquivos grandes, consumo de Kafka/SQS, respostas HTTP chunked.
- **Quando NÃO usar:** quando o conjunto é pequeno e fixo — `for await` adiciona overhead de microtask por item.

---

## Anti-padrões

- **`for...of` serial com `await` quando paralelismo era possível:** `for (const id of ids) { await fetch(id); }` serializa operações independentes — latência total = soma de todas. Correção: `Promise.all(ids.map(id => fetch(id)))` se array é pequeno e fixo; `p-limit` + `Promise.all` se array é grande.

- **Stream sem handler de `error` (ou `.pipe()` legado):** `.pipe()` não propaga erros entre streams — um erro no meio destrói o writable mas deixa o readable vivo, vazando memória e FDs. Correção: sempre use `pipeline()` de `node:stream/promises`; nunca confie em `.on('end')` sem `.on('error')`.

- **I/O síncrono em handler async:** `fs.readFileSync`, `JSON.parse(fs.readFileSync(...))`, ou regex catastrófica dentro de Express/Fastify handler bloqueiam o event loop para todos os requests em voo. Correção: `fs.promises.readFile`, stream + `for await`, ou mover regex para worker thread.

- **`util.promisify` esquecido para callbacks node-style:** misturar callback hell com async/await numa mesma função cria code path imprevisível de error handling. Correção: `const readFile = util.promisify(fs.readFile)` ou usar direto `node:fs/promises` — nenhum callback node-style em código novo.

---

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Operações independentes em paralelo, tolerância a falha parcial | `Promise.allSettled` |
| Operações independentes em paralelo, falha rápida | `Promise.all` |
| CPU-bound (>50 ms bloqueando event loop) | Worker thread via `piscina` |
| I/O-bound paralelo descontrolado (array grande) | `p-limit(N)` + `Promise.all` |
| Grande volume de dados em streaming | `pipeline()` + async iterator |
| Cancelamento cooperativo de operação longa | `AbortController` + propagar `signal` |
| Timeout em fetch/stream | `AbortSignal.timeout(ms)` |
| Diferir trabalho sem starvar I/O | `setImmediate`, não `process.nextTick` |

---

## Referências externas

- Skill: `/system-design` — throughput, latência, fan-out, backpressure como princípios cross-stack
- Research: `cbfb8720` — `claude-code/knowledge/Nodejs/compass_artifact_wf-cbfb8720-085e-4778-b2c7-c423b3cb6ef8_text_markdown.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/libuv-event-loop.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/libuv-thread-pool.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/libuv-async-io.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/streams-internals.md`
- Skill source: `claude-code/knowledge/Nodejs/nodejs-core/rules/worker-threads-internals.md`

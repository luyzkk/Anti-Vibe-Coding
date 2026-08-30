---
topic: async-and-concurrency
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md
tier: 1
triggers: [asyncio, TaskGroup, gather, GIL, free-threading, event loop, run_in_executor, contextvars, backpressure, cancellation, semaphore, streaming]
related_skills: [/system-design, /design-patterns, /architecture]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Async e Concorrência

## Quando consultar

- Ao decidir entre `async def` e `def` num endpoint ou dependency do FastAPI
- Ao rodar corrotinas concorrentes (fan-out) ou aplicar deadline numa chamada externa
- Ao dimensionar pool de conexões de banco, threadpool ou número de workers em produção
- Ao implementar streaming (SSE, proxy de LLM), background jobs ou scheduling
- Ao revisar código que usa `create_task`, locks/semáforos ou estado compartilhado entre requisições
- Ao avaliar se vale migrar para o build free-threaded (`python3.13t`) em vez de múltiplos processos

## Padrões sênior

### Pattern: `async def` vs `def` — para onde vai o trabalho

- **Problema:** marcar `async def` mas fazer trabalho bloqueante sem `await` trava o event loop inteiro do worker — todas as outras requisições esperam.
- **Padrão:** use `async def` quando o I/O tem driver awaitável (ex.: `asyncpg`); use `def` simples quando o I/O é bloqueante e não tem versão async — Starlette despacha `def` para um threadpool automaticamente.
- **Quando usar `def`:** endpoints/dependencies que chamam SDK ou lib bloqueante sem equivalente async — roda em thread, não trava o loop.
- **Quando NÃO usar `def`:** sob alta concorrência de trabalho bloqueante — o threadpool tem teto fixo (ver próximo pattern); nesse caso migre para driver async.

### Pattern: Ajustar o limiter do threadpool (default 40 tokens)

- **Problema:** o threadpool AnyIO/Starlette tem só 40 tokens por padrão, compartilhado entre endpoints `def`, dependencies sync e `BackgroundTasks` sync — satura antes da CPU, latência cresce com CPU ociosa.
- **Padrão:** eleve `total_tokens` do limiter no `lifespan` (`anyio.to_thread.current_default_thread_limiter().total_tokens = N`) quando o app tem muitos endpoints `def`.
- **Quando usar:** 504s ou latência crescente no load balancer com CPU do worker ociosa — sinal de fila de threads saturada.
- **Quando NÃO usar sem medir:** aumentar tokens sem limite consome memória (uma thread por token) e pode saturar pools downstream (ex.: conexões de banco) — alinhe o teto ao pool de DB.

### Pattern: `TaskGroup` vs `gather` para concorrência estruturada

- **Problema:** com `asyncio.gather`, se uma corrotina falha, as demais continuam rodando em background — vazamento de recursos e comportamento inconsistente.
- **Padrão:** use `async with asyncio.TaskGroup()` para rodar corrotinas relacionadas — se uma task falha, as demais recebem `CancelledError` automaticamente e os erros chegam agrupados em `ExceptionGroup` (tratável com `except*`).
- **Quando usar `TaskGroup`:** default para corrotinas relacionadas concorrentes que devem falhar/cancelar juntas.
- **Quando NÃO usar `TaskGroup`:** coleta simples de resultados sem necessidade de cancelamento cooperativo — `gather(..., return_exceptions=True)` ainda serve para resultados parciais.

```python
async with asyncio.TaskGroup() as tg:
    t1 = tg.create_task(fetch_a())
    t2 = tg.create_task(fetch_b())
# se uma falhar, a outra é cancelada
```

### Pattern: Semáforo / `CapacityLimiter` para limitar concorrência de I/O

- **Problema:** fan-out grande sem limite (muitas tasks disputando um recurso externo) satura a API/DB alvo.
- **Padrão:** envolva o acesso em `asyncio.Semaphore(n)` ou `anyio.CapacityLimiter(n)`; `CapacityLimiter` garante que um único borrower segura apenas um token por vez, evitando liberação dupla acidental.
- **Quando usar:** rate limiting de dependência externa, fan-out de centenas/milhares de tasks.
- **Quando NÃO usar sozinho:** para exclusão entre processos/workers — locks async só protegem dentro de um único event loop/processo (ver próximo pattern).

### Pattern: Lock distribuído para exclusão entre workers/processos

- **Problema:** `asyncio.Lock`/`threading.Lock` não coordenam nada entre workers Uvicorn/Gunicorn ou réplicas — cada worker tem seu próprio event loop e memória.
- **Padrão:** para seção crítica global (ex.: job agendado que não pode rodar em duplicidade), use um lock distribuído (ex.: Redis) em vez de primitives in-process.
- **Quando usar:** múltiplos workers/réplicas, jobs agendados que não podem rodar em duplicidade.
- **Quando NÃO usar:** dentro de um único processo/loop — `asyncio.Lock`/`Semaphore` bastam e são mais simples.

### Pattern: Dimensionar o pool de conexões do SQLAlchemy

- **Problema:** default do SQLAlchemy 2.0 é `pool_size=5` + `max_overflow=10` (15 conexões por engine); com múltiplos workers isso estoura fácil o `max_connections` do Postgres.
- **Padrão:** dimensione para que `(pool_size + max_overflow) × num_workers × num_réplicas ≤ max_connections do banco`; use `pool_pre_ping=True` para evitar conexões mortas.
- **Quando usar:** todo `create_async_engine` em produção — dimensione antes de bater em `QueuePool timeout`; `pool_pre_ping` é essencial em bancos gerenciados (RDS/Aurora) que derrubam conexões ociosas.
- **Quando NÃO usar pool próprio:** atrás de PgBouncer — use `NullPool` e deixe o pooler externo gerenciar.

```python
engine = create_async_engine(
    URL, pool_size=20, max_overflow=10,
    pool_timeout=30, pool_recycle=1800, pool_pre_ping=True,
)
```

### Pattern: Dimensionar workers e `--limit-concurrency`

- **Problema:** sem limite de concorrência por worker, requisições em voo podem exceder a capacidade do pool de DB, gerando 503/504 em cascata sob picos.
- **Padrão:** comece com workers ≈ número de cores (I/O-bound pode ir além) e use `--limit-concurrency` do Uvicorn para que o teto de requisições em voo por worker não exceda a capacidade do pool downstream.
- **Quando usar:** heurística de produção — se o pool de DB é 40 e há 4 workers, `--limit-concurrency 10` por worker mantém o teto total ≈ tamanho do pool.
- **Quando NÃO usar sem medir:** copiar a heurística sem validar contra o pool real — a doc oficial do Uvicorn documenta os flags e defaults, mas não prescreve fórmula de sizing.

### Pattern: Streaming com checagem de desconexão do cliente

- **Problema:** sem checar desconexão, o servidor continua produzindo e consumindo recursos depois que o cliente já saiu (SSE, proxy de LLM, downloads longos).
- **Padrão:** retorne `StreamingResponse`/`EventSourceResponse` de um async generator e interrompa o loop quando `await request.is_disconnected()` for verdadeiro.
- **Quando usar:** qualquer resposta longa — SSE, proxy de LLM, downloads.
- **Quando NÃO usar sem revalidar:** com `BaseHTTPMiddleware` no meio do stack — há regressões documentadas quebrando a detecção de desconexão e o cancelamento do stream; teste na versão fixada.

```python
async def event_publisher(req: Request):
    while True:
        if await req.is_disconnected():
            break
        yield dict(data=...)
        await asyncio.sleep(0.2)
```

### Pattern: `contextvars` para estado por-request

- **Problema:** variável global mutável é sobrescrita entre requisições concorrentes no mesmo loop (correlation ID, usuário atual).
- **Padrão:** use `contextvars.ContextVar` para dados por-request; use `app.state` só para singletons do app (pools, clients) — `ContextVar` é propagado nativamente por asyncio e por `asyncio.to_thread`.
- **Quando usar:** logging com contexto, correlation IDs — dado que precisa "viajar" com a requisição.
- **Quando NÃO usar sem validar propagação:** contexto setado numa dependency async pode não estar visível numa função sync rodada via `ThreadPoolExecutor` customizado; mudanças de `ContextVar` no meio de uma camada de middleware Starlette podem não refletir nas camadas externas (task groups criam novos contextos).

### Pattern: `BackgroundTasks` só para trabalho leve

- **Problema:** `BackgroundTasks` roda no mesmo processo, após a resposta; se o processo cai ou reinicia, tarefas pendentes se perdem — não há durabilidade.
- **Padrão:** reserve `BackgroundTasks` para side-effects curtos e não-críticos (enviar e-mail, invalidar cache) cuja perda é tolerável; para trabalho pesado, durável ou distribuído, use fila dedicada.
- **Quando usar:** notificação leve, invalidação de cache — perda tolerável, precisa acessar variáveis/objetos do mesmo processo.
- **Quando NÃO usar:** trabalho pesado (ex.: gerar dezenas de PDFs) — uma `BackgroundTask` `async def` bloqueia o event loop, uma `def` consome um dos tokens do threadpool; use Celery/arq/TaskIQ.

### Pattern: Idempotência em jobs assíncronos

- **Problema:** filas como RabbitMQ/SQS/Kafka entregam mensagens ao menos uma vez (at-least-once); sem dedup, retries duplicam efeitos (cobrança, e-mail).
- **Padrão:** toda task que pode ser reentregue deve carregar uma chave de idempotência e checar/gravar estado de execução (ex.: em Redis/DB) antes de aplicar o efeito.
- **Quando usar:** jobs com retry automático, filas at-least-once, efeitos externos (cobrança, e-mail, chamadas a terceiros).
- **Quando NÃO usar como regra rígida de implementação:** o padrão canônico de chave/TTL não está fixado numa fonte primária única — trate o princípio (dedup antes do efeito) como sólido, mas valide a implementação concreta contra a doc do seu provedor de fila.

### Pattern: Scheduler conforme durabilidade e topologia

- **Problema:** com múltiplos workers, um scheduler in-process (ex.: APScheduler) roda em cada worker e duplica execuções do mesmo job.
- **Padrão:** para cron simples in-process, use APScheduler (`AsyncIOScheduler`) iniciado no `lifespan`; para jobs duráveis/distribuídos, use Celery beat ou arq cron — ambos centralizam o agendamento com persistência.
- **Quando usar APScheduler:** cron simples, sem infra extra, com tolerância a perder jobs num restart (sem jobstore persistente).
- **Quando NÃO usar APScheduler:** múltiplos workers sem lock/processo dedicado garantindo instância única — duplica execução; nesse caso, arq cron/Celery beat ou scheduler fora do processo (systemd timer, cron do SO).

### Pattern: Build free-threaded (`python3.13t`) — experimental

- **Problema:** importar uma extensão C não declarada thread-safe no build free-threaded reabilita o GIL silenciosamente; além disso o overhead single-thread em 3.13 é ~40% no pyperformance (desativação do interpretador especializante adaptativo).
- **Padrão:** teste seu código sob `python3.13t`, mas mantenha o build padrão (com GIL) em produção — em 3.13 o free-threading é Phase I (experimental) do PEP 703.
- **Quando usar/testar:** validar compatibilidade de extensões C e comportamento do próprio código antes de uma futura migração.
- **Quando NÃO usar:** carga de produção web — o gargalo de um servidor web raramente é CPU Python (o build padrão já libera o GIL em torno de I/O) e o overhead single-thread ainda é alto.

## Anti-padrões

### Task "fire-and-forget" sem referência forte

- **Sintoma:** `asyncio.create_task(...)` chamado sem guardar o retorno — a task some silenciosamente sob carga (sem erro, sem log) porque o event loop só mantém referência fraca; o GC pode coletá-la antes de terminar.
- **Correção:** guarde o retorno num `set` de módulo e registre `task.add_done_callback(set.discard)`; se a task tem escopo de request, prefira `TaskGroup`, que gerencia lifecycle e cancelamento automaticamente.

### Chamada bloqueante dentro de `async def`

- **Sintoma:** `time.sleep`, I/O de disco síncrono, `requests`, hashing pesado ou SDK bloqueante chamado direto dentro de uma corrotina — trava o event loop inteiro do worker, todas as demais requisições param até retornar.
- **Correção:** use a versão async da chamada, ou `loop.run_in_executor(None, fn)` / `anyio.to_thread.run_sync(fn)`; habilite `PYTHONASYNCIODEBUG=1` em staging para logar callbacks lentos (>100ms).

### Misturar `threading.Lock` com `asyncio`

- **Sintoma:** deadlock intermitente — um `threading.Lock.acquire()` bloqueante dentro do event loop trava o loop, e a corrotina que deveria liberar o lock nunca é escalonada.
- **Correção:** use `asyncio.Lock`/`asyncio.Semaphore` em código async e `threading.Lock` só dentro de threads reais; thread-safe não é o mesmo que async-safe.

### Engolir `CancelledError` sem re-lançar

- **Sintoma:** `except CancelledError` (ou `except Exception` amplo) captura o cancelamento e não re-lança — componentes de structured concurrency (`TaskGroup`, `timeout`) passam a se comportar de forma imprevisível.
- **Correção:** capture `CancelledError` só para `try/finally` de cleanup e sempre dê `raise` de novo; `CancelledError` herda de `BaseException` justamente para não cair em `except Exception`.

### Presumir atomicidade por causa do GIL

- **Sintoma:** contador ou estrutura mutável compartilhada entre threads sem lock, assumindo que o GIL torna a operação atômica — `x += 1` é vários bytecodes e pode ser interrompido no meio.
- **Correção:** proteja operações compostas (read-modify-write) com locks mesmo no build padrão; no build free-threaded (3.13t) essa proteção grossa do GIL some e races latentes viram bugs reais.

### Fila/buffer ilimitado sob carga

- **Sintoma:** produtor/consumidor sem limite de buffer — a fila cresce indefinidamente sob carga até estourar memória (OOM).
- **Correção:** use `create_memory_object_stream(max_buffer_size=N)` e `CapacityLimiter`/`Semaphore` para que o produtor desacelere quando o consumidor satura; no ingress, use `--limit-concurrency` do Uvicorn para devolver 503 controlado em vez de degradar tudo.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Trabalho CPU-bound, precisa de múltiplos cores | Múltiplos processos/workers (`--workers`) — o GIL do build padrão impede paralelismo real de threads |
| Corrotinas concorrentes onde falha de uma deve cancelar as demais | `asyncio.TaskGroup` |
| Resultados parciais aceitáveis mesmo com falha de uma corrotina | `asyncio.gather(..., return_exceptions=True)` |
| Deadline numa chamada awaitável | `async with asyncio.timeout(seconds)` — integra com `TaskGroup`/cancel scopes; preferível a `wait_for` |
| Fila para stack async-native, ativa, com DI estilo FastAPI | TaskIQ |
| Fila simples com Redis, sem exigir evolução ativa | arq — mas está em maintenance-only mode |
| Fila com ecossistema maduro, multi-linguagem, observabilidade (Flower) | Celery — não roda `async def` nativamente |
| Consumir/produzir RabbitMQ ou Kafka de forma async | `aio-pika` (`connect_robust`) ou `aiokafka`, ciclo de vida no `lifespan` |
| Testar endpoint async, streaming, WebSockets, background tasks | `httpx.AsyncClient` + `ASGITransport` |
| Testar CRUD simples síncrono | `TestClient` — mais rápido e isolado |
| Configurar testes assíncronos no pytest | `asyncio_mode = "auto"`; não sobrescrever a fixture `event_loop` (removida no pytest-asyncio 1.0) |
| Esperar ganho de performance do JIT (PEP 744) em 3.13 | Não contar com isso — desabilitado por default, ganho medido 0–5% |

## Referências externas

- Skill: `/system-design` — dimensionamento de pools, workers e filas em arquitetura de sistemas distribuídos
- Skill: `/design-patterns` — structured concurrency (`TaskGroup`) e cancelamento como padrões de controle de fluxo
- Skill: `/architecture` — separação entre request/response (event loop) e trabalho em background/filas
- Source path (audit trail): `Infos/knowledge/Python/compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md`

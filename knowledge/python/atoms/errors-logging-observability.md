---
topic: errors-logging-observability
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-9b12d328-b17f-53df-b453-6d3ba54d9f3a_text_markdown.md
tier: 1
triggers: [exception, exceção, AppError, raise from, ExceptionGroup, except*, logging, structlog, dictConfig, QueueHandler, correlation id, contextvars, retry, stamina, circuit breaker, RFC 9457, Sentry, sampling, SecretStr, model_dump_json, DLQ, sys.monitoring, observabilidade]
related_skills: [/design-patterns, /system-design, /infrastructure]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Erros, Logging e Observabilidade

## Quando consultar

- Ao desenhar a hierarquia de exceções de uma aplicação (`AppError` e derivadas)
- Ao decidir como propagar causa/contexto ao re-levantar uma exceção entre camadas
- Ao tratar falhas de múltiplas tasks concorrentes (`TaskGroup`, `except*`)
- Ao configurar logging estruturado e correlacionável em produção
- Ao proteger integrações externas com retry e circuit breaker
- Ao desenhar o formato de erro de uma API pública ou revisar sampling do Sentry
- Ao logar ou serializar modelos Pydantic que carregam segredos (`SecretStr`)
- Ao configurar filas com risco de poison messages (DLQ) ou escolher ferramenta de profiling

## Padrões sênior

### Pattern: Exceção base por aplicação (`AppError`)

- **Problema:** múltiplos `raise ValueError` genéricos espalhados pela aplicação, sem hierarquia — o boundary não consegue diferenciar erro de domínio de bug de programação.
- **Padrão:** defina `class AppError(Exception)` e derive exceções específicas dela (ex.: `class OrderError(AppError)`); capture `AppError` num handler catch-all central para mapear a respostas. FastAPI casa o handler mais específico primeiro.
- **Quando usar:** `raise UserNotFoundError(user_id)` capturado num exception handler central — sempre que precisar de uma taxonomia de erros de domínio.
- **Quando NÃO usar:** não capture `Exception` cru como substituto da hierarquia — isso engole bugs de programação junto com os erros de domínio esperados.

### Pattern: Encadear causa com `raise ... from`

- **Problema:** `try/except` que converte exceção de baixo nível numa de domínio sem preservar a causa original perde o traceback raiz.
- **Padrão:** ao re-levantar, use `raise NovoErro(...) from exc` para preservar `__cause__` e a cadeia no traceback; use `from None` só para suprimir deliberadamente contexto sensível.
- **Quando usar:** todo `except` que converte/envolve uma exceção capturada numa exceção de domínio.
- **Quando NÃO usar `from None` como padrão:** omitir a causa por default deixa o diagnóstico confuso ("During handling of the above exception...") — reserve para quando o contexto original for sensível.
- **Nota:** para anexar contexto dinâmico sem reempacotar, use `exc.add_note(f"user_id={uid}")` (PEP 678, 3.11+) antes de re-levantar — a nota aparece no traceback formatado, mas não em `repr(exc)`.

### Pattern: `ExceptionGroup`/`except*` só para falhas concorrentes

- **Problema:** `asyncio.TaskGroup` combina exceções de tasks falhas num `ExceptionGroup`; `try/except` comum não captura o conteúdo do grupo.
- **Padrão:** use `except*` para tratar as exceções internas — ex.: `try: async with asyncio.TaskGroup() as tg: ... except* HttpError as eg: ...`. Os autores da PEP 654 são explícitos: "We do not expect them to become the default mechanism for exception handling."
- **Quando usar:** código com `asyncio.TaskGroup` ou libs que levantam `BaseExceptionGroup`.
- **Quando NÃO usar:** não capture `ExceptionGroup` com `except Exception` esperando pegar as exceções internas; não converta código sequencial para grupos sem necessidade de concorrência.
- **Versões:** nativo em Python 3.11+; backport `exceptiongroup` para ≤3.10.

### Pattern: Logging estruturado via `dictConfig` + `QueueHandler`

- **Problema:** `print()`/`logging.info` sem estrutura não é filtrável por agregadores; handlers lentos (HTTP/SMTP/arquivo) no caminho do request bloqueiam o event loop; uvicorn e libs de terceiros usam stdlib logging em formato diferente do da app, duplicando/misturando linhas.
- **Padrão:** configure `structlog` com saída JSON em produção, roteado pelo stdlib via `structlog.stdlib.ProcessorFormatter` (unifica uvicorn e libs no mesmo pipeline); centralize tudo em `logging.config.dictConfig`. Desde o Python 3.12, `dictConfig` suporta `QueueHandler` nativamente para desacoplar I/O lento — mas o `QueueListener` não inicia sozinho, é preciso chamar `.listener.start()` via `logging.getHandlerByName`.
- **Quando usar:** sempre em produção (JSON estruturado); `QueueHandler` quando há handlers lentos no caminho do request.
- **Quando NÃO usar:** não use `print()` para debug em código que vai a produção; ajuste `propagate=False` nos loggers filhos para não duplicar `uvicorn.access` junto do seu próprio middleware de logging.
- **Versões:** `QueueHandler` configurável via `dictConfig` é novidade do Python 3.12.

### Pattern: Correlation ID via `contextvars` + middleware ASGI

- **Problema:** logs assíncronos intercalados de requests concorrentes, sem forma de correlacionar as linhas de um mesmo request.
- **Padrão:** use `asgi-correlation-id` (ou middleware próprio com `ContextVar`) para capturar/gerar um ID por request e vincular a todos os logs — `contextvars` propagam corretamente através de `await`. Reuse `X-Request-ID`/`traceparent` de entrada se presente; o middleware faz `bind_contextvars(correlation_id=...)` e sempre reseta o token no `finally`.
- **Quando usar:** toda aplicação assíncrona com requests concorrentes que precisa correlacionar logs.
- **Quando NÃO usar:** não passe `request_id` manualmente por todas as funções — é exatamente o problema que `contextvars` resolve sem acoplar assinaturas.

### Pattern: Retry com `stamina` (não tenacity cru)

- **Problema:** loops de retry manuais ou `@retry` do tenacity sem `wait=`/jitter causam thundering herd; retry em exceção errada (bug determinístico) só multiplica a falha.
- **Padrão:** prefira `stamina`, que aplica backoff exponencial com jitter e limites por padrão. Defaults verbatim da assinatura `stamina.retry`: `attempts=10, timeout=45.0, wait_initial=0.1, wait_max=5.0, wait_jitter=1.0, wait_exp_base=2.0`; o backoff é `min(wait_max, wait_initial * wait_exp_base^{attempt-1} + random(0, wait_jitter))`, de modo que o primeiro atraso fica "between 0.1 and 1.1 seconds". Especifique `on=` apenas com exceções transientes (timeouts, 503, erros de conexão) — nunca `on=Exception`. Instrumenta com Prometheus (`stamina_retries_total`) e structlog automaticamente.
- **Quando usar:** `@stamina.retry(on=httpx.HTTPError, attempts=3)` em operações idempotentes com falhas transientes.
- **Quando NÃO usar:** nunca em `ValueError`/`KeyError` (bug determinístico); nunca em POST não idempotente sem proteção adicional — retry duplica efeitos.
- **Versões:** stamina 24.x; suporta async e Trio.

### Pattern: Circuit breaker em cada integration point

- **Problema:** sem breaker, um downstream lento esgota o event loop/thread pool e causa falha em cascata.
- **Padrão:** use `purgatory` ou `aiobreaker` para asyncio, `pybreaker` para sync (com `run_in_threadpool` no FastAPI). Estados CLOSED→OPEN→HALF-OPEN evitam martelar um serviço morto. Parâmetros típicos: `fail_max`/`failure_threshold` (ex. 3–5), `reset_timeout` (ex. 30–60s).
- **Quando usar:** toda chamada a serviço externo/DB sem proteção prévia contra timeout em cascata.
- **Quando NÃO usar sem ajuste:** não conte "business exceptions" na contagem de falhas (`pybreaker` `exclude`) — senão o circuito abre por erro esperado, não por falha real.
- **Versões:** pybreaker (sync + asyncio), purgatory (async, backend redis opcional), aiobreaker.

### Pattern: RFC 9457 (Problem Details) para erros de API

- **Problema:** cada endpoint com formato de erro ad-hoc; stack trace vazado ao cliente expõe internals (paths, versões, SQL) — vetor de ataque.
- **Padrão:** retorne `application/problem+json` com `type`, `title`, `status`, `detail`, `instance` — RFC 9457 (jul/2023) obsoleta a RFC 7807. FastAPI não emite isso por padrão (usa `{"detail": ...}`), precisa de handler explícito. No catch-all, retorne 500 genérico ao cliente e logue o traceback internamente com correlation ID. Preserve o formato 422 nativo do Pydantic v2 (`loc`, `msg`, `type`) para erros de validação.
- **Quando usar:** toda resposta de erro de API voltada a cliente externo/machine-readable.
- **Quando NÃO usar:** nunca retorne stack trace ao cliente; não invente formato de validação incompatível com o que o FastAPI/OpenAPI já documenta.

### Pattern: Sentry — sampling de traces e PII

- **Problema:** `traces_sample_rate=1.0` em produção estoura quota e adiciona custo; `send_default_pii=True` anexa headers e IP, vazando PII.
- **Padrão:** inicialize `sentry_sdk.init(dsn=..., ...)` cedo no startup — com `fastapi` instalado, a integração Starlette+FastAPI é automática. Comece com `traces_sample_rate` ~0.1 (10%) em tráfego moderado; acima de 1000 req/s use 0.01–0.05; use `traces_sampler` para sempre amostrar rotas de erro/admin. Mantenha `send_default_pii=False` (default), use `before_send` para scrubbing adicional e associe usuários por ID, não email.
- **Quando usar:** captura de exceção com stack trace, request context e breadcrumbs — overhead documentado <1ms por request (SDK despacha eventos assíncronos em background thread) — exceto em serverless/Lambda, onde o flush síncrono adiciona latência. Esse número é específico do Sentry, não se aplica ao OpenTelemetry.
- **Quando NÃO usar `1.0`:** `traces_sample_rate=1.0` serve só para captura inicial/debug, não é valor de produção.

### Pattern: `SecretStr` — gotcha na serialização JSON

- **Problema:** senha/token tipado como `str` aparece em log de `repr(model)`.
- **Padrão:** tipe segredos como `SecretStr`/`SecretBytes` (Pydantic v2); acesse só com `.get_secret_value()`. Verbatim da doc: quando o valor não é vazio, ele "is displayed as '**********' instead of the underlying value in calls to repr() and str()".
- **Quando usar:** todo campo de senha/token/segredo em model Pydantic.
- **Gotcha crítico:** `model_dump()` mantém mascarado, mas `model_dump_json()` **revela** o valor a menos que você use um `field_serializer` — risco direto ao logar payloads serializados.
- **Versões:** Pydantic v2 (2.13.5 atual).

### Pattern: DLQ e retry resiliente em filas (Celery)

- **Problema:** tarefa perdida quando o worker morre; retries sem backoff geram thundering herd; mensagem venenosa sem DLQ é perdida ou reentregue infinitamente.
- **Padrão:** configure `task_acks_late=True` (só confirma após sucesso), `autoretry_for` e `retry_backoff=True` (backoff exponencial com jitter automático — retries em 1s, 2s, 4s, 8s...) com `max_retries`. No broker, use dead-letter exchange (RabbitMQ) ou DLQ (SQS) para mensagens que excedem o limite e monitore a fila; o RabbitMQ DLX auto-incrementa o header `x-death`, permitindo cortar após um limite.
- **Quando usar:** toda fila com entrega at-least-once e risco de poison messages.
- **Quando NÃO usar sem lógica de corte:** `task_reject_on_worker_lost=True` é opt-in — sem limite de corte, mensagem que sempre falha ao ser reentregue pode causar "high-frequency message loop taking down the system".
- **Fronteira:** aqui entra DLQ pela ótica de observabilidade/resiliência a erros; a mecânica de filas (tópicos, bindings, consumo) fica fora deste átomo.

### Pattern: `sys.monitoring` para profiling de baixo overhead

- **Problema:** `sys.settrace` chama callback a cada evento com alto custo de performance.
- **Padrão:** ferramentas de profiling/coverage devem usar `sys.monitoring` (PEP 669, 3.12+) em vez de `sys.settrace` — usa quickening e roda quase a full speed. JetBrains (verbatim): "this can lead to an up to 20 times performance increase compared to the old API." Mark Shannon quantifica (verbatim): "The overhead of PEP 669 is about 5% compared to the sys.settrace overhead of ~2000%."
- **Quando usar:** qualquer profiler, debugger ou tool de coverage novo ou em atualização.
- **Versões:** Python 3.12+; Coverage.py adota como default no 3.14.

## Anti-padrões

### `raise Exception("algo genérico")` sem hierarquia de domínio

- **Sintoma:** o handler catch-all não consegue diferenciar erro de domínio esperado de bug de programação — mensagens genéricas sem tipo específico.
- **Correção:** derive de `AppError` (ou subclasse específica) sempre que levantar um erro de domínio; reserve `Exception` cru para o realmente imprevisto.

### Capturar `ExceptionGroup` com `except Exception` esperando as internas

- **Sintoma:** `try/except Exception` ao redor de `asyncio.TaskGroup` não encontra as exceções das tasks falhas — o grupo é um objeto próprio, não se comporta como exceção simples.
- **Correção:** use `except*` para tratar cada tipo de exceção interna do `ExceptionGroup`.

### Retry manual ou tenacity sem jitter

- **Sintoma:** `while True` com `sleep` fixo, ou `@tenacity.retry` sem `wait=` — todos os clientes tentam de novo no mesmo instante após uma falha compartilhada (thundering herd).
- **Correção:** use `stamina.retry`, que aplica backoff exponencial com jitter por padrão (`wait_jitter=1.0`).

### `QueueHandler` configurado via `dictConfig` mas listener nunca iniciado

- **Sintoma:** configurar `QueueHandler`/`QueueListener` no `dictConfig` (3.12+) e assumir que ele inicia sozinho — logs enfileirados nunca são processados/emitidos.
- **Correção:** inicie o listener explicitamente com `.listener.start()`, obtido via `logging.getHandlerByName`.

### `task_reject_on_worker_lost=True` sem lógica de corte

- **Sintoma:** mensagem que falha sempre ao ser reentregue gera um "high-frequency message loop taking down the system".
- **Correção:** combine com lógica de corte (ex. limite de tentativas no pre-run hook) e DLQ no broker antes de habilitar o reject automático.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Bootstrapping observabilidade do zero (Estágio 1 — fundação) | `dictConfig` + JSON/structlog, 3 exception handlers (`AppError`, `RequestValidationError`, catch-all), `asgi-correlation-id`, `SecretStr` em segredos |
| Fundação pronta, falta resistir a falha de dependência (Estágio 2 — resiliência) | `stamina.retry` em exceções transientes + circuit breaker (`purgatory`/`pybreaker`); Celery com `acks_late` + `retry_backoff` + DLQ |
| Fundação e resiliência prontas, falta visibilidade (Estágio 3 — observabilidade e alertas) | Instrumentação de tracing + métricas + Sentry com `traces_sample_rate` ajustado ao tráfego |
| Erro transiente esperado (timeout, 503, erro de conexão) | Retry com `stamina` |
| Erro determinístico (bug, `ValueError`/`KeyError`) | Não fazer retry — corrigir a causa, não mascarar |
| Falha concorrente de múltiplas tasks relacionadas | `except*` sobre `ExceptionGroup` |
| Resposta de erro para cliente de API pública | RFC 9457 `problem+json` — nunca stack trace |
| Segredo em model Pydantic que será serializado para log | `SecretStr` + `field_serializer` explícito — nunca confiar só em `model_dump_json()` |
| Mensagem de fila excede o limite de retries | DLQ (dead-letter exchange/SQS) — nunca perder ou reentregar infinitamente |
| Profiling/coverage tool novo em 3.12+ | `sys.monitoring` (PEP 669) — não `sys.settrace` |

## Referências externas

- Skill: `/design-patterns` — hierarquia de exceções, retry e circuit breaker como padrões de resiliência
- Skill: `/system-design` — trade-offs de sampling, custo de observabilidade e DLQ em arquitetura distribuída
- Skill: `/infrastructure` — configuração de logging, filas e profiling em produção
- Source path (audit trail): Infos/knowledge/Python/compass_artifact_wf-9b12d328-b17f-53df-b453-6d3ba54d9f3a_text_markdown.md

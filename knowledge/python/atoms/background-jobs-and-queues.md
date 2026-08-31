---
topic: background-jobs-and-queues
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md
  - Infos/knowledge/Python/compass_artifact_wf-9b12d328-b17f-53df-b453-6d3ba54d9f3a_text_markdown.md
  - Infos/knowledge/Python/deep-research-report2.md
tier: 3
triggers: [background jobs, BackgroundTasks, fila, task queue, Celery, arq, TaskIQ, Dramatiq, aio-pika, aiokafka, RabbitMQ, Kafka, broker, idempotência, retry, backoff, acks_late, DLQ, dead letter, DLX, x-death, poison message, scheduling, cron, APScheduler, Celery beat]
related_skills: [/system-design, /infrastructure, /api-design]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Background Jobs e Filas

## Quando consultar

- Ao decidir entre `BackgroundTasks` do FastAPI e uma fila dedicada para um efeito colateral de request
- Ao passar dados de uma request para uma `BackgroundTask` que precisa de DB session, ORM object ou HTTP client
- Ao encadear múltiplas `add_task` na mesma resposta (pagamento, fatura, notificação)
- Ao escolher biblioteca de fila (Celery, arq, TaskIQ, Dramatiq) para uma stack async-native
- Ao configurar retry e dead-letter de uma fila para não perder nem duplicar jobs (poison messages)
- Ao revisar se um worker de fila realmente executa `async def` como o time assume

## Padrões sênior

### Pattern: Verifique o estado de manutenção e o modelo de execução antes de adotar uma fila

- **Problema:** escolher biblioteca de fila só por popularidade, sem checar se o modelo de execução é compatível com uma stack async-native ou se o projeto ainda recebe evolução ativa.
- **Padrão:** Celery (5.5.3, linha 5.6.x) não roda `async def` nativamente — modelo multiprocessing/eventlet/gevent; Dramatiq (2.2.0) usa processos × threads (8 threads/processo por padrão), e o suporte a async via middleware ainda limita a concorrência real ao número de threads do worker; arq (0.28.0) é async-native — pool de asyncio Tasks capaz de rodar centenas de jobs simultâneos — mas está em **maintenance-only mode** (issue #510); TaskIQ (0.12.4) é async-native, com integração oficial FastAPI e DI via `TaskiqDepends`, com brokers para NATS/Redis/RabbitMQ/Kafka (regra 4.2).
- **Quando usar:** antes de adicionar qualquer fila nova ao projeto — essas informações mudam com frequência e precisam ser revalidadas contra a doc atual da lib.
- **Quando NÃO usar como veredito único:** Celery custa mais infraestrutura (broker + workers + Flower) mas dá visibilidade de estado (PENDING/STARTED/SUCCESS/FAILURE/RETRY) e durabilidade; TaskIQ/arq integram melhor com async mas têm ecossistema menor — ver átomo `async-and-concurrency` para o critério de escolha por cenário.

### Pattern: `acks_late` + `retry_backoff` para não perder nem duplicar jobs (Celery)

- **Problema:** task perdida quando o worker morre no meio da execução; retry sem backoff pode virar um loop de alta frequência que derruba o próprio sistema.
- **Padrão:** configure `task_acks_late=True` (só confirma a mensagem após sucesso), `autoretry_for`, `retry_backoff=True` (backoff exponencial com jitter automático) e `max_retries`; `task_reject_on_worker_lost=True` é opt-in justamente porque uma mensagem que falha sempre ao ser reentregue pode gerar esse loop de alta frequência (regra 14.1).
- **Quando usar:** toda task Celery cujo efeito não pode ser silenciosamente perdido se o worker cair (cobrança, envio garantido, efeitos externos).
- **Quando NÃO usar `task_reject_on_worker_lost` isolado:** sem um limite de reentregas e um destino para mensagens que sempre falham — combine com dead-letter (próximo pattern).

### Pattern: Dead-letter exchange/DLQ para poison messages

- **Problema:** sem destino para mensagens que excedem o número máximo de tentativas, uma poison message é perdida ou reentregue indefinidamente.
- **Padrão:** configure uma dead-letter exchange no RabbitMQ ou uma DLQ no SQS para mensagens que estouram `max_retries`, e monitore a fila morta; no RabbitMQ, a DLX incrementa automaticamente o header `x-death` a cada dead-letter, permitindo cortar a reentrega depois de um limite — padrão observado em produção: `task_acks_late=True` + `task_acks_on_failure_or_timeout=False` + lógica de corte no pre-run hook (regra 14.2).
- **Quando usar:** qualquer fila com retry automático em produção — sem DLQ monitorada, mensagens venenosas somem sem sinal.
- **Quando NÃO usar sem checar a fonte:** essa configuração detalhada é específica de Celery/RabbitMQ/SQS nesta pesquisa — arq e Dramatiq não têm padrão de DLQ/retry detalhado citável aqui; valide contra a doc do provedor antes de replicar. Para o ângulo de log/alerta dessas falhas, ver átomo `errors-logging-observability`.

## Anti-padrões

### BackgroundTask recebendo recurso vinculado à request

- **Sintoma:** `add_task(send_receipt, session, order)` — passa uma `Session`, objeto ORM ou HTTP client presos à request para a `BackgroundTask`, supondo que o recurso segue vivo depois que a resposta foi enviada.
- **Correção:** desde FastAPI 0.106.0 esse contrato não é mais garantido — passe um dado estável (ex.: `order.id`) e abra o recurso (nova `Session`) dentro da própria função da task.

### Múltiplas ações críticas encadeadas na mesma sequência de `BackgroundTasks`

- **Sintoma:** `add_task(capture_payment)`, `add_task(issue_invoice)`, `add_task(send_email)` numa mesma resposta, presumindo execução independente — Starlette executa as tasks em ordem e, se uma falha, as seguintes da mesma sequência não são executadas.
- **Correção:** para workflows em que cada etapa precisa de retry/estado independente, enfileire um job por etapa numa fila dedicada em vez de encadear `add_task`; reserve sequências de `add_task` para tarefas best-effort de baixa criticidade.

### `BackgroundTasks` tratado como fila de jobs durável

- **Sintoma:** assumir que `BackgroundTasks` oferece retry, persistência ou distribuição entre processos/servidores.
- **Correção:** `BackgroundTasks` é execução in-process, depois da resposta, sem durabilidade; para trabalho pesado ou multi-processo/servidor, use uma fila dedicada (Celery/arq/TaskIQ/Dramatiq) — ver átomo `async-and-concurrency` (regra 4.1).

### Assumir que Celery roda `async def` nativamente

- **Sintoma:** declarar uma task Celery como `async def` esperando que ela rode no event loop, sem wrapper.
- **Correção:** Celery não tem suporte nativo a asyncio — o modelo é multiprocessing/eventlet/gevent; para worker async-native, use TaskIQ ou arq.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Efeito colateral leve, perda tolerável, mesmo processo (cache, notificação simples) | `BackgroundTasks` — ver átomo `async-and-concurrency` (regra 4.1) |
| Trabalho pesado ou que precisa rodar em múltiplos processos/servidores | Fila dedicada (Celery/arq/TaskIQ/Dramatiq) — nunca `BackgroundTasks` como substituto |
| `BackgroundTask` precisa de DB session, ORM object ou HTTP client | Passe um ID estável e abra o recurso dentro da própria task |
| Múltiplas ações críticas na mesma resposta (pagamento, fatura, e-mail) | Um job por etapa em fila dedicada — não uma sequência de `add_task` |
| Escolher "a melhor" fila entre Celery, Dramatiq, arq/RQ ou serviço gerenciado | Sem vencedor demonstrável nas fontes — decida por modelo de execução e estado de manutenção (regra 4.2); a única regra forte é não usar `BackgroundTasks` como substituto de fila durável |
| Publicar/consumir RabbitMQ ou Kafka de forma async | `aio-pika`/`aiokafka`, ciclo de vida no `lifespan` — ver átomo `async-and-concurrency` (regra 5.1) |
| Task cujo efeito não pode ser perdido se o worker cair | `task_acks_late=True` + `retry_backoff=True` + `max_retries` |
| Mensagem que excede o limite de retries (poison message) | Dead-letter exchange no RabbitMQ (via `x-death`) ou DLQ no SQS, monitorada |
| Retry/DLQ idiomático para arq ou Dramatiq | Sem padrão detalhado nas fontes desta pesquisa — não inventar, validar contra a doc do provedor |
| Idempotência de jobs com retry automático (at-least-once) | Ver átomo `async-and-concurrency` (regra 14.1) — não re-ensinado aqui |
| Scheduling/cron com múltiplos workers | Ver átomo `async-and-concurrency` (regra 15.1) — não re-ensinado aqui |

## Referências externas

- Skill: `/system-design` — topologia de filas, brokers e workers em arquitetura distribuída
- Skill: `/infrastructure` — provisionamento de broker (RabbitMQ/Redis/Kafka) e workers de fila
- Skill: `/api-design` — fronteira entre resposta síncrona da API e efeito assíncrono enfileirado
- Ver átomo `async-and-concurrency` — mecanismo de concorrência (TaskGroup, event loop, threadpool, cancellation, backpressure), critério de escolha de fila por cenário, idempotência e scheduling
- Ver átomo `errors-logging-observability` — ângulo de log/alerta de falhas em jobs; este átomo cobre a configuração do broker (acks_late, DLX/x-death)
- Source paths (audit trail):
  - Infos/knowledge/Python/compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md (§4-5)
  - Infos/knowledge/Python/compass_artifact_wf-9b12d328-b17f-53df-b453-6d3ba54d9f3a_text_markdown.md (§14)
  - Infos/knowledge/Python/deep-research-report2.md

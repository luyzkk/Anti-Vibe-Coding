---
topic: error-handling-observability
stack: nodejs-typescript
layer: both
sources:
  - research: e4ce81c8 (claude-code/knowledge/Nodejs/compass_artifact_wf-e4ce81c8-fb33-485c-a64a-0294c3fffe00_text_markdown.md)
tier: 1
triggers: [error, exception, Result, Pino, telemetry, log, correlation, OTel, LGPD]
related_skills: [/design-patterns, /system-design]
updated: 2026-05-16
---

# Error Handling e Observabilidade — Node.js + TypeScript

## Quando consultar

- Decidir entre `throw`, `Result<T, E>` ou deixar crashar o processo.
- Configurar Pino com correlation-id propagado via `AsyncLocalStorage`.
- Instrumentar tracing com OpenTelemetry (trace/span ids em todos os logs).
- Definir métricas RED (por endpoint) e USE (por recurso) com `prom-client`.
- Sanitizar logs de PII antes de enviar para agregador (obrigação LGPD).

## Padrões sênior

### Pattern: Erro operacional vs programmer error (crash-on-bug)

- **Problema:** capturar tudo com `try/catch` mantém o processo em estado parcialmente corrompido — pior que um restart limpo.
- **Padrão:** erros operacionais (`NotFoundError`, `TimeoutError`) têm `isOperational = true` e são tratados. Erros de programação (`undefined.foo`, violação de invariante) devem crashar; PM2/Kubernetes reinicia com estado limpo.
  ```ts
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException — crashing');
    void sdk.shutdown().finally(() => process.exit(1));
  });
  process.on('unhandledRejection', (reason) => { logger.fatal({ err: reason }); process.exit(1); });
  ```
- **Quando usar:** sempre — handlers globais são pré-requisito de production readiness.
- **Quando NÃO usar:** não suprima os handlers para "evitar crash" — esse é o objetivo.

---

### Pattern: `Result<T, E>` em handlers HTTP (neverthrow)

- **Problema:** `throw` não aparece na assinatura — caller não sabe de erros de domínio esperados.
- **Padrão:** domain services retornam `ResultAsync<T, DomainError>`; adapter HTTP chama `.match` e traduz para status code.
  ```ts
  import { ResultAsync } from 'neverthrow';
  type ChargeError = { kind: 'insufficient_balance' } | { kind: 'card_declined'; reason: string };
  function charge(userId: UserId, amount: Cents): ResultAsync<TxId, ChargeError> { /* ... */ }

  result.match(
    (txId) => res.json({ txId }),
    (e) => res.status(e.kind === 'insufficient_balance' ? 422 : 402).json(toProblem(e)),
  );
  ```
- **Quando usar:** domínio puro, casos de uso; erros com tratamentos distintos no caller.
- **Quando NÃO usar:** programmer errors e falhas transitórias de infra — use `throw` + handler global. Nunca misture: função ou retorna `Result` ou lança.

---

### Pattern: Pino com correlation-id via `AsyncLocalStorage`

- **Problema:** propagar `correlationId` manualmente em cada chamada gera acoplamento; `cls-hooked` está deprecated.
- **Padrão:** middleware injeta contexto no ALS; `mixin` do Pino lê automaticamente — toda linha herda os ids.
  ```ts
  // src/context.ts
  import { AsyncLocalStorage } from 'node:async_hooks';
  export const als = new AsyncLocalStorage<{ requestId: string; correlationId: string }>();

  // src/logger.ts — mixin lê ALS + OTel
  export const logger = pino({
    mixin() {
      const sc = trace.getSpan(otelCtx.active())?.spanContext();
      const store = als.getStore();
      return { traceId: sc?.traceId, spanId: sc?.spanId,
               requestId: store?.requestId, correlationId: store?.correlationId };
    },
    redact: { paths: ['req.headers.authorization', '*.password', '*.cpf', '*.email'], censor: '[REDACTED]' },
  });
  // Middleware: als.run({ requestId: randomUUID(), correlationId }, () => next());
  ```
- **Quando usar:** todo projeto com mais de um serviço ou worker concorrente.
- **Quando NÃO usar:** scripts CLI de execução única sem chamadas externas.

---

### Pattern: OpenTelemetry auto-instrumentation + trace propagation

- **Problema:** instrumentação manual por biblioteca é frágil e incompleta.
- **Padrão:** `instrumentation.ts` carregado via `--import` antes de qualquer módulo; OTel propaga `traceparent` (W3C) automaticamente.
  ```ts
  // node --import ./instrumentation.js dist/main.js
  import { NodeSDK } from '@opentelemetry/sdk-node';
  import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
  export const sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } })],
  });
  sdk.start();
  process.on('SIGTERM', () => { void sdk.shutdown(); });
  // Fastify: usar @fastify/otel (substitui plugin removido em mar/2026)
  ```
- **Quando usar:** qualquer serviço com chamadas HTTP, DB, cache ou filas.
- **Quando NÃO usar:** lambdas de curta duração — use AWS Powertools SDK.

---

### Pattern: Métricas RED por endpoint e USE por recurso

- **Problema:** alertas em valor absoluto geram falsos positivos; sem métricas por endpoint, não se sabe qual rota está lenta.
- **Padrão:** `Counter` + `Histogram` por `(method, route, status_code)` para RED; `collectDefaultMetrics` para USE.
  ```ts
  import { Counter, Histogram, collectDefaultMetrics, Registry } from 'prom-client';
  const registry = new Registry();
  collectDefaultMetrics({ register: registry }); // USE: CPU, heap, event loop lag

  export const httpTotal = new Counter({
    name: 'http_requests_total', labelNames: ['method', 'route', 'status_code'] as const, registers: [registry],
  });
  export const httpDuration = new Histogram({
    name: 'http_request_duration_seconds', labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], registers: [registry],
  });
  ```
- **Quando usar:** todo serviço HTTP e consumer de fila. Alertas baseados em SLO, não em threshold fixo.
- **Quando NÃO usar:** scripts batch de uso único.

---

### Pattern: Redação LGPD via Pino `redact:` paths

- **Problema:** logar payload completo vaza PII (CPF, CNPJ, e-mail) — viola LGPD art. 46.
- **Padrão:** `redact` configurado globalmente no setup do Pino; nunca confiar em sanitização ad-hoc no call site.
  ```ts
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie',
      '*.password', '*.passwordHash', '*.token', '*.accessToken', '*.refreshToken',
      '*.cpf', '*.cnpj', '*.rg', '*.email', '*.phone', '*.creditCard', '*.pix.key',
    ],
    censor: '[REDACTED]',
  }
  // Allowlist no call site: logger.info({ user: pick(user, ['id', 'role']) })
  ```
- **Quando usar:** sempre, em todos os ambientes — PII em log de dev é igualmente problemática.
- **Quando NÃO usar:** não há exceção para credenciais e identificadores brasileiros.

---

### Pattern: `Error.cause` chain (ES2022 / Node 16+)

- **Problema:** re-lançar sem `cause` perde o stack original — diagnóstico fica cego.
- **Padrão:** toda subclasse usa `{ cause: err }` no constructor; `pino.stdSerializers.err` serializa a chain.
  ```ts
  export abstract class BaseError extends Error {
    constructor(msg: string, opts?: ErrorOptions) {
      super(msg, opts); this.name = new.target.name;
      Object.setPrototypeOf(this, new.target.prototype);
      if ('captureStackTrace' in Error) Error.captureStackTrace(this, new.target);
    }
  }
  throw new DatabaseError('query failed', { cause: originalErr });
  ```
- **Quando usar:** sempre que re-lançar — tanto em `throw` quanto em `err()` do neverthrow.
- **Quando NÃO usar:** não concatene `'failed: ' + err.message` — descarta stack e tipo.

---

## Anti-padrões

- **`try/catch` silencioso:** captura sem log nem propagação faz o bug desaparecer. Correção: `logger.error({ err }, 'msg')` + re-throw ou `err(e)` via neverthrow.

- **`console.log` em produção:** sem nível, sem correlation-id, sem JSON parseável por agregador. Correção: Pino com `level: 'info'` e `mixin` injetando contexto do ALS.

- **Logar payload completo com PII:** viola LGPD art. 46. Correção: `redact:` paths globais no Pino + `pick(user, ['id', 'role'])` no call site.

- **Reconstruir correlation-id por serviço:** quebra trace distribuído — join em logs é impossível. Correção: propagar `X-Correlation-Id` e `traceparent` (W3C); OTel faz isso automaticamente.

- **Capturar programmer errors:** mantém processo em estado corrompido. Correção: deixar crashar + `uncaughtException`/`unhandledRejection` que flusheia logs e chama `process.exit(1)`.

---

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Erro de domínio recuperável (sem permissão, não encontrado) | `Result<T, DomainError>` via neverthrow |
| Erro inesperado (bug, invariante violada) | `throw` + deixar crashar + orquestrador reinicia |
| Erro operacional externo (timeout, DB down) | `Result<T, InfraError>` + retry com backoff |
| Logging em desenvolvimento local | Pino + `pino-pretty` transport |
| Logging em produção | Pino JSON puro em stdout → Loki / Datadog / CloudWatch |
| Trace de request cross-service | OTel auto-instrumentation + header `traceparent` |
| Métricas de saúde por endpoint HTTP | RED: `Counter` + `Histogram` por `(method, route, status_code)` |
| Métricas de saúde de recursos | USE: `collectDefaultMetrics` + `Gauge` por recurso |
| Audit de payload com PII (LGPD) | Pino `redact:` paths globais + allowlist no call site |

## Referências externas

- Skill: `/design-patterns` — Result Pattern e error handling cross-stack
- Skill: `/system-design` — observability stack (Prometheus, Grafana, alerting por SLO)
- Research: `e4ce81c8` — `claude-code/knowledge/Nodejs/compass_artifact_wf-e4ce81c8-fb33-485c-a64a-0294c3fffe00_text_markdown.md`

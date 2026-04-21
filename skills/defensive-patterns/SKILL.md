---
name: defensive-patterns
description: Menu de padrões defensivos para produção. Apresenta categorias (rate limit, circuit breaker, timeout, fallback, retry, bulkhead, config centralizada, health check, graceful degradation) e guia o dev a escolher quais aplicar ao contexto atual.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Edit, Write
argument-hint: "[nome do serviço ou módulo a defender]"
---

# Skill: /anti-vibe-coding:defensive-patterns

Selecionar e aplicar padrões defensivos para produção.

## Como Usar

```
Se $ARGUMENTS contém nome de serviço/módulo:
  Ler o código do módulo antes de apresentar as categorias.
  Identificar quais padrões já estão aplicados.
  Apresentar apenas os que estão ausentes e são relevantes para o contexto.

Se $ARGUMENTS está vazio:
  Apresentar todas as categorias.
  Perguntar: "Qual módulo ou serviço você quer defender?"
```

## Categorias de Padrões Defensivos

### 1. Rate Limit
**Quando:** endpoint público, integração com parceiro, operação cara (LLM, email, SMS).  
**Faz:** rejeita requests acima do threshold com 429. Previne abuso e runaway costs.  
**Não faz:** substitui autenticação.

```ts
// Exemplo mínimo (token bucket):
const limiter = new RateLimiter({ max: 100, window: '1m' })
if (!limiter.allow(userId)) throw new TooManyRequestsError()
```

### 2. Circuit Breaker
**Quando:** chamada a serviço externo (API, banco, fila) que pode ficar lento ou indisponível.  
**Faz:** abre o circuito após N falhas consecutivas. Para de bater no serviço doente.  
**Estados:** closed (normal) → open (rejeitando) → half-open (testando recuperação).

```ts
const breaker = new CircuitBreaker(fetchExternalData, {
  threshold: 5,        // falhas para abrir
  timeout: 30_000,     // ms em open antes de tentar half-open
})
```

### 3. Timeout
**Quando:** toda chamada de rede ou I/O sem timeout explícito.  
**Faz:** cancela a operação após N ms. Previne threads/conexões presas indefinidamente.  
**Regra:** defina timeout em TODA chamada externa, mesmo que a biblioteca tenha default.

```ts
const result = await Promise.race([
  fetchData(),
  sleep(5_000).then(() => { throw new TimeoutError('fetchData') }),
])
```

### 4. Fallback
**Quando:** existe valor degradado aceitável quando o serviço principal falha.  
**Faz:** retorna cache, dado padrão ou resposta parcial em vez de erro.  
**Não use:** quando dado desatualizado causa decisão errada (ex: saldo financeiro).

```ts
try {
  return await fetchUserPreferences(userId)
} catch {
  return DEFAULT_PREFERENCES  // fallback explícito
}
```

### 5. Retry com Backoff Exponencial
**Quando:** falhas transitórias esperadas (network blip, throttling de API).  
**Faz:** tenta novamente com espera crescente (ex: 1s, 2s, 4s, 8s) + jitter.  
**Não use:** em operações não-idempotentes sem idempotency key.

```ts
await retry(fetchData, {
  attempts: 4,
  backoff: 'exponential',
  jitter: true,
  retryOn: [503, 429],
})
```

### 6. Bulkhead
**Quando:** múltiplos consumidores de um recurso compartilhado (pool de conexões, threads).  
**Faz:** isola pools por tenant/serviço. Um consumidor travado não afeta os outros.  
**Analogia:** compartimentos estanques de um navio.

```ts
// Pool separado por tenant — falha de um tenant não drena o pool global
const pools = new Map<TenantId, ConnectionPool>()
```

### 7. Centralizar Config
**Quando:** strings de configuração espalhadas em múltiplos arquivos (model name, URLs, timeouts).  
**Faz:** uma constante/arquivo de config como fonte de verdade. O resto importa dela.  
**Ver também:** `/anti-vibe-coding:centralize-config` para fluxo completo de migração.

```ts
// config/llm.ts — uma fonte de verdade
export const LLM_MODEL = 'claude-sonnet-4-5'
export const LLM_TIMEOUT_MS = 30_000
```

### 8. Health Check
**Quando:** serviço exposto (HTTP, worker, microservice).  
**Faz:** endpoint `/health` (liveness) e `/ready` (readiness) com checks reais de dependências.  
**Diferença:** liveness = processo vivo; readiness = pode receber tráfego.

```ts
app.get('/health', (_, res) => res.json({ status: 'ok' }))
app.get('/ready', async (_, res) => {
  const db = await checkDbConnection()
  res.status(db.ok ? 200 : 503).json(db)
})
```

### 9. Graceful Degradation
**Quando:** feature não-crítica depende de serviço externo.  
**Faz:** sistema funciona com capacidade reduzida em vez de falhar completamente.  
**Decisão:** o que é "crítico" é decisão de negócio, não técnica — pergunte ao PO.

```ts
// Feature flag + fallback combinados:
const recommendations = featureEnabled('recommendations')
  ? await fetchRecommendations(userId).catch(() => [])  // degrada, não quebra
  : []
```

## Fluxo de Aplicação

```
1. Identificar o módulo/endpoint a defender
2. Para cada categoria acima:
   a. O módulo já tem este padrão? (grep pelo código)
   b. Este padrão é relevante para o contexto? (ver "Quando")
   c. Se relevante e ausente → sugerir implementação
3. Priorizar por risco:
   - Timeout em toda chamada externa: risco alto, esforço baixo
   - Circuit breaker em integrações críticas: risco alto, esforço médio
   - Rate limit em endpoints públicos: risco alto, esforço médio
4. Não aplicar todos de uma vez — escolher os 2-3 de maior impacto
```

## Ação Solicitada

$ARGUMENTS

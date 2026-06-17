---
name: defensive-patterns
description: Menu de padrões defensivos para produção. Apresenta categorias (rate limit, circuit breaker, timeout, fallback, retry, bulkhead, config centralizada, health check, graceful degradation) e guia o dev a escolher quais aplicar ao contexto atual. Cobre backoff, jitter, retry budget, token bucket, fail-open, black-hole, degraded read, stale cache e thundering herd.
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

**Aprofundamento sênior:**
- Não adote circuit breaker como resposta default a amplificação de retry. O comportamento modal (aberto/half-open/fechado) é difícil de testar e pode atrasar a recuperação; a AWS prefere **retry throttling / token bucket** (degrada suave a uma taxa fixa) — ver #5 Retry.
  > fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Novas tentativas e recuo
- O breaker é legítimo quando o corte **total** é o comportamento desejado: o downstream precisa de **zero** chamadas para respirar e o token bucket deixaria carga residual demais.
  > fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Novas tentativas e recuo
- Se já existe um breaker em produção, não troque às cegas — **cubra as transições de estado (aberto → half-open → fechado) com testes**. Esse caminho raramente é exercido e é onde ele falha por surpresa.
  > fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Novas tentativas e recuo
- Cuidado com o corte modal em health check: não deixe o LB remover servidores por check de **dependência** sem fail-open — falso-positivo correlacionado derruba a frota inteira (ver #8 Health Check).
  > fonte: David Yanacek | Implementing health checks | seção: Verificações de integridade sem disjuntores

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

**Aprofundamento sênior:**
- Calibre por **percentil de latência do downstream**, não por feeling: escolha a taxa aceitável de falsos timeouts (ex.: 0,1%) e use o percentil correspondente (p99.9). Some latência de rede para clientes na Internet; adicione padding quando p99.9 ≈ p50.
  > fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Tempos limite
- O timeout precisa cobrir a chamada **inteira** — DNS + TLS + conexão + request — e configure os DOIS (timeout de conexão E de solicitação). `SO_RCVTIMEO` não é ponta a ponta: não cobre conexão nem DNS.
  > fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Tempos limite
- Timeout baixo demais **não** deixa o sistema mais rápido — amplifica carga via cascata de retries e um pequeno pico de latência vira interrupção total. Diagnóstico: timeouts correlacionados a eventos de infra + taxa de retry subindo junto.
  > fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Tempos limite
- Após disparar, o estado é **UNKNOWN** — a operação pode ter executado no servidor ou não. Retry é seguro só em leitura; em operação com efeito colateral, exige idempotência no servidor antes do retry (ver #5 Retry).
  > fonte: Jacob Gabrielson | Challenges with distributed systems | seção: Como lidar com "desconhecidos desconhecidos"

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

**Aprofundamento sênior:**
- Fallback é **código modal não-testado**: só roda quando o primário cai, então acumula bugs latentes e a raridade do acionamento **aumenta** o risco. Caso canônico: a cascata cache→DB da Amazon (~2001) transformou interrupção parcial em total.
  > fonte: Jacob Gabrielson | Avoiding fallback in distributed systems | seção: Fallback distribuído
- Default sênior é **evitar fallback**: enrijeça o primário (banco mais robusto/replicado), ou faça **fail-fast** empurrando o erro ao caller que já tem retry. Não adicione um caminho B que falharia sob a mesma carga que derrubou o primário.
  > fonte: Jacob Gabrielson | Avoiding fallback in distributed systems | seção: Como a Amazon evita o fallback
- Se o caminho alternativo é inevitável, **converta em failover exercitado**: rode primário e alternativo continuamente em produção (ambos como fontes válidas) até a confiabilidade igualar — aí os bugs latentes somem.
  > fonte: Jacob Gabrielson | Avoiding fallback in distributed systems | seção: Como a Amazon evita o fallback
- **Tensão da leitura degradada (C3):** servir **cache stale** é legítimo quando é o caminho normal já exercitado (TTL que responde todo request) E o dado tolera desatualização — mantenha o serviço de pé e tire a dependência do health check. Vira fallback perigoso quando é modal (cache→DB direto) OU quando o dado leva a decisão errada irreversível (saldo financeiro, inventário com race).
  > fonte: David Yanacek | Implementing health checks | seção: Equilíbrio das verificações de integridade com o escopo do impacto
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Quando usar cada um

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

**Aprofundamento sênior:**
- **Idempotência é pré-requisito** para operação com efeito colateral — sem ela, retry após UNKNOWN duplica (cobra/cria duas vezes) ou perde. Reenvie sempre a MESMA chave de idempotência, nunca gere nova. Alternativa legítima: não dar retry automático e propagar o erro ao usuário.
  > fonte: Malcolm Featonby | Making retries safe with idempotent APIs | seção: Introduction
- Retry em **UMA só camada** da pilha. Multi-camada multiplica K^N: 3 tentativas × 5 camadas = **243×** de carga no banco quando ele começa a falhar. O cliente JS/mobile conta como camada.
  > fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Novas tentativas e recuo
- **4xx não se retenta** (mesma req falha igual) — exceto em sistema eventually consistent, onde um 404 pode ser estado ainda propagando. 5xx/timeout/network → retry pode resolver.
  > fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Novas tentativas e recuo
- Backoff exponencial **limitado** (com teto) + **jitter** (aleatoriedade) — sem jitter, N clientes acumulam no teto e retentam em rajada sincronizada (thundering herd); backoff sem teto cresce sem fim. Jitter vale também para cron/health checks/polling.
  > fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Jitter
- **Pare quando não ajuda:** retries são "egoístas" — em sobrecarga eles pioram a recuperação. Para conter a amplificação, prefira **retry throttling / token bucket** (degrada suave, fácil de testar, já vem no AWS SDK) ao circuit breaker (corte modal); só suba para o breaker quando precisar de zero-chamadas-no-downstream e conseguir testar as transições (C4 — ver #2 Circuit Breaker). Instrumente sempre a TAXA de retries, senão vira fallback disfarçado.
  > fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Novas tentativas e recuo
  > fonte: Jacob Gabrielson | Avoiding fallback in distributed systems | seção: Como a Amazon evita o fallback

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

**Aprofundamento sênior:**
- Quatro profundidades: **liveness** (porta/200) → **local** (disco gravável, processo de negócio — automação de remoção segura) → **dependency** (banco/API — falha correlacionada, perigosa) → **anomaly detection** (compara métricas entre pares para achar o servidor "zumbi" que passa nos checks mas está doente: versão antiga, relógio torto). Profundidade do check ∝ blast radius da reação.
  > fonte: David Yanacek | Implementing health checks | seção: Prós e contras de verificações de integridade
- **Fail-open** é a regra anti-suicídio da frota: se *todos* falham no check ao mesmo tempo, é quase certo falha correlacionada de dependência — o LB deve continuar enviando tráfego a todos em vez de zerar o serviço. Mas teste o cenário gray-failure (dependência lenta, não down) onde o fail-open pode NÃO acionar.
  > fonte: David Yanacek | Implementing health checks | seção: Modo de falha aberta
- Cuidado com o **black-hole**: servidor que rejeita rápido (sem latência) **atrai** mais tráfego em "menos conexões"/menor latência — uma falha de 1-em-10 vira impacto muito maior que 10%. Throttle as respostas de erro para a latência média de sucesso.
  > fonte: David Yanacek | Implementing health checks | seção: Prós e contras de verificações de integridade
- Em consumidor de fila não há LB pingando: cheque recursos locais ANTES de sondar — puxar mensagem ≠ processar (worker com disco cheio puxa sem processar). Sob carga, o health check é a requisição MAIS prioritária; nunca o deixe expirar (reserve workers para evitar death spiral).
  > fonte: David Yanacek | Implementing health checks | seção: Processadores assíncronos
  > fonte: David Yanacek | Implementing health checks | seção: Priorizar a integridade
- **Cross-link:** o fail-open do Route 53 / failover DNS está em `infrastructure/references/dns-hosting.md §9`; health check antes do switch em deploy (validar na porta privada) em `infrastructure/references/deployment-patterns.md`. **Resiliência de frota:** load shedding, deadline propagation e shuffle sharding estão em `system-design` §11.

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

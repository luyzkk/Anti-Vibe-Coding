---
topic: state-and-caching
stack: nodejs-typescript
layer: both
sources:
  - research: b407bc0c (claude-code/knowledge/Nodejs/compass_artifact_wf-b407bc0c-5924-44c2-b452-d5b70bd581e2_text_markdown.md)
tier: 2
triggers: [cache, Redis, AsyncLocalStorage, request-scoped, invalidation, singleflight, stampede]
related_skills: [/system-design]
updated: 2026-05-16
---

# State e Caching — Node.js + TypeScript

## Quando consultar

- Decidir onde armazenar estado entre requests: processo local vs. Redis vs. banco.
- Propagar `correlationId`, `tenantId` ou `currentUser` por chamadas async sem prop drilling.
- Implementar cache read-through ou write-behind com Redis.
- Proteger chave hot de cache stampede quando o valor expira sob carga.
- Revisar módulo com `let` ou `const` no top-level que acumula estado entre requests.

## Padrões sênior

### Pattern: In-memory process-local (`lru-cache` + TTL)

- **Quando usar:** dados read-mostly com alta frequência, cardinalidade baixa, tolerância a
  inconsistência inter-processo (ex.: tabela de configuração estática, feature flags com
  refresh periódico). Processo único ou cluster com consistência eventual aceitável.
- **Implementação:**
  ```ts
  import { LRUCache } from "lru-cache";
  const configCache = new LRUCache<string, Config>({ max: 500, ttl: 60_000 });
  // miss → carrega do DB → set → retorna
  async function getConfig(key: string): Promise<Config> {
    return configCache.get(key) ?? loadAndCache(key, configCache);
  }
  ```
- **Quando NÃO usar:** estado que precisa ser consistente entre réplicas ou sobreviver ao restart do processo.

---

### Pattern: Request-scoped state via `AsyncLocalStorage`

- **Quando usar:** propagar `correlationId`, `tenantId`, `currentUser` por toda a call stack
  sem passar como parâmetro — logger, audit trail, rate limiter.
- **Implementação:**
  ```ts
  import { AsyncLocalStorage } from "node:async_hooks";
  interface RequestCtx { correlationId: string; tenantId: string }
  export const requestCtx = new AsyncLocalStorage<RequestCtx>();

  // Middleware HTTP (Express/Fastify):
  app.use((req, _res, next) => {
    requestCtx.run({ correlationId: req.headers["x-correlation-id"] ?? ulid(), tenantId: req.tenantId }, next);
  });

  // Em qualquer profundidade (service, repo, logger):
  const ctx = requestCtx.getStore(); // RequestCtx | undefined
  ```
- **Custo:** implementação otimizada ("involves significant optimizations" — docs Node.js);
  Node 24+ adota `AsyncContextFrame` por padrão, reduzindo overhead ainda mais. Favorável
  para visibilidade; evitar em inner loops de latência crítica onde microssegundos importam.
- **Quando NÃO usar:** estado compartilhado entre requests; dados de grande volume por request.

---

### Pattern: Distributed cache Redis (read-through + invalidação event-driven)

- **Quando usar:** dados compartilhados entre réplicas ou processos; sessão, rate limits,
  idempotency keys, aggregates caros.
- **Implementação (read-through):**
  ```ts
  async function getUser(id: UserId): Promise<User> {
    const raw = await redis.get(`user:${tenantId}:${id}`);
    if (raw) return UserSchema.parse(JSON.parse(raw)); // Zod faz revive
    const user = await db.users.findByPk(id);
    await redis.set(`user:${tenantId}:${id}`, JSON.stringify(user), "EX", 300);
    return user;
  }
  ```
- **Invalidação imediata:** publicar evento no canal Redis após mutação; subscriber limpa a chave.
- **Quando NÃO usar:** dado verdadeiramente efêmero (escopo de request) — use `AsyncLocalStorage`.

---

### Pattern: Singleflight para evitar cache stampede

- **Problema:** chave hot expira; N requests simultâneos sofrem cache miss e vão todas ao DB.
- **Solução local (processo único) — padrão `Map<key, Promise<T>>`:**
  ```ts
  const inflight = new Map<string, Promise<User>>();
  async function getUser(id: string): Promise<User> {
    if (inflight.has(id)) return inflight.get(id)!;
    const promise = fetchUserFromDb(id).finally(() => inflight.delete(id));
    inflight.set(id, promise);
    return promise;
  }
  ```
  Concurrent misses compartilham uma única chamada ao DB; a chave é removida ao resolver.
  Alternativa de wrapper: `p-memoize` com `cache: false` produz o mesmo efeito com menos boilerplate.
- **Solução distribuída (multi-réplica):** Redis `SET key "" NX EX 5` como lock — apenas
  o primeiro processo carrega; os outros aguardam e re-tentam com backoff.
- **Alternativa:** stale-while-revalidate — servir valor expirado enquanto uma goroutine atualiza.

---

## Anti-padrões

- **Estado global em módulo (CJS hoist — vaza entre tenants):** `let currentUser: User` no top-level
  do módulo é compartilhado entre todas as requests do processo. Request A seta o valor;
  Request B lê o valor de A antes de setar o seu — vaza dados entre tenants em produção.
  Correção: `AsyncLocalStorage` ou injeção explícita por parâmetro/DI.

- **Cache key sem prefixo de tenant:** `redis.get(\`user:${id}\`)` compartilha namespace entre
  tenants em SaaS multi-tenant. Correção: `redis.get(\`t:${tenantId}:user:${id}\`)` — prefixo
  de tenant obrigatório em toda chave de cache compartilhado.

- **Serialização sem schema no boundary do cache:** `JSON.parse(raw) as User` — `Date` vira
  `string` ISO, `BigInt` quebra. Sem validação, shape do cache diverge silenciosamente do tipo
  TypeScript após migration. Correção: `UserSchema.parse(JSON.parse(raw))` via Zod sempre que
  lendo do Redis/memcached.

- **`Map` module-level como fonte de verdade em multi-réplica:** `const sessions = new Map()`
  no topo de um módulo compartilhado funciona em dev (processo único) e quebra em staging/prod
  (N réplicas sem memória compartilhada). Correção: Redis para sessões e contadores distribuídos.

---

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Dado read-mostly, processo único, consistência eventual OK | `lru-cache` in-memory + TTL |
| Dado request-scoped (correlationId, tenantId, currentUser) | `AsyncLocalStorage` |
| Dado compartilhado entre processos / instâncias | Redis read-through |
| Invalidação imediata após mutação | TTL + pub/sub Redis event-driven |
| Chave hot com risco de stampede — processo único | `Map<string, Promise<T>>` inflight (ou `p-memoize`) |
| Chave hot com risco de stampede — multi-réplica | Redis SETNX lock + stale-while-revalidate |
| Cache miss caro (query agregada) | Read-through + warm-up no boot |

---

## Referências externas

- Skill: `/system-design` — estratégias gerais de cache (write-through, write-back, eviction
  policies, CDN edge cache, cache hierarchies). Este átomo cobre o ângulo Node-specific
  (`AsyncLocalStorage`, armadilhas de módulo CJS/ESM) que `/system-design` não cobre.
- Research: `b407bc0c` — `claude-code/knowledge/Nodejs/compass_artifact_wf-b407bc0c-5924-44c2-b452-d5b70bd581e2_text_markdown.md`

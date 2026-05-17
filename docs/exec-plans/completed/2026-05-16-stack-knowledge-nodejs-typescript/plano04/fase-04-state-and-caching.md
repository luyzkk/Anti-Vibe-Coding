<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 04: Átomo `state-and-caching.md`

**Plano:** 04 — Atom Batch A
**Sizing:** 1.5h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 2 `docs/knowledge/nodejs-typescript/atoms/state-and-caching.md` (~120 linhas), condensando padrões de estado em Node: in-memory process-local, request-scoped via `AsyncLocalStorage`, distributed cache (Redis) com invalidation patterns e singleflight para evitar stampede. Cobre o ângulo Node-specific (AsyncLocalStorage, armadilhas de módulo CJS/ESM com estado) que `/system-design` (estratégia de cache em geral) não cobre.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/state-and-caching.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~120 linhas) |

---

## Implementacao

### Passo 1: Frontmatter (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: state-and-caching
stack: nodejs-typescript
layer: both
sources:
  - research: b407bc0c
tier: 2
triggers: [cache, Redis, AsyncLocalStorage, request-scoped, invalidation, singleflight, stampede]
related_skills: [/system-design]
updated: 2026-05-16
---
```

Origem (de `_catalog.md`):
- `b407bc0c` — State Management (2053 linhas, in-memory, request-scoped, app, distributed; cache invalidation)

### Passo 2: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem:

1. `# State e Caching — Node.js + TypeScript` (título)
2. `## Quando consultar` — 3-5 bullets
3. `## Padrões sênior` — 3-5 patterns (átomo mais enxuto — ~120 ln)
4. `## Anti-padrões` — 2-4 armadilhas com correção
5. `## Critérios de decisão` — tabela "qual layer de cache para qual cenário"
6. `## Referências externas` — skill `/system-design` + path da fonte

### Passo 3: Patterns recomendados (guia editorial — executor expande)

Mínimo 3, máximo 5 — extrair de `b407bc0c`:

- **Pattern: In-memory cache process-local (`Map` + TTL)** — adequado para dados read-mostly, baixo cardinality, tolerância a inconsistência inter-processo (cluster). Usar `lru-cache` para bound.
- **Pattern: Request-scoped state via `AsyncLocalStorage`** — `correlationId`, `tenantId`, `currentUser` viajam através de chamadas async sem prop drilling. Setar no middleware HTTP; consumir em qualquer profundidade.
- **Pattern: Distributed cache Redis (read-through, write-behind)** — read-through: cache miss → carrega do DB → grava no Redis → retorna. Write-behind: app escreve no Redis sync, persistir no DB async via worker (tolerância a perda baixa, latência baixa).
- **Pattern: Cache invalidation por TTL + event-driven** — TTL como floor (garantia de eventual consistency); event-driven (pub/sub Redis ou message broker) para invalidação imediata quando origem muda.
- **Pattern: Singleflight para evitar cache stampede** — N requests simultâneos com mesmo cache key vão all-in no DB. Singleflight (lib `p-memoize` com options, ou Redis SETNX) deixa só 1 carregar e os outros aguardarem o resultado.

### Passo 4: Anti-padrões (2-4 armadilhas)

- **Estado global em módulo (CJS hoist)** — `let counter = 0` no top-level: compartilhado entre todas as requests do processo, vaza dados entre tenants. Correção: `AsyncLocalStorage` ou injeção via parâmetro.
- **Cache key collision entre tenants** — `cache.get(\`user:${id}\`)` sem prefixo de tenant. Correção: `cache.get(\`tenant:${tenantId}:user:${id}\`)`.
- **Serialização Date/BigInt quebrando no `JSON.parse`** — Redis devolve string; `Date` vira string ISO mas tipo é `string`, não `Date`. Correção: schema validator (Zod) no boundary do cache faz revive.
- **Cache stampede sem singleflight** — invalidação simultânea de chave hot leva N hits no DB. Correção: singleflight (vide pattern acima) ou stale-while-revalidate.

### Passo 5: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Dado read-mostly, alta freq, processo único | In-memory `lru-cache` + TTL |
| Dado request-scoped (correlationId, tenantId, currentUser) | `AsyncLocalStorage` |
| Dado compartilhado entre processos / instâncias | Redis (read-through) |
| Dado eventualmente consistente, alta tolerância | TTL puro |
| Dado que precisa invalidar imediatamente em mudança | TTL + pub/sub event-driven |
| Chave hot com risco de stampede | Singleflight (lock no Redis ou `p-memoize` local) |
| Cache miss caro (query agregada) | Read-through + warm-up no boot |

### Passo 6: Referências externas

- Skill: `/system-design` para estratégias gerais de cache (write-through, write-back, eviction policies, CDN edge cache, cache hierarchies)
- Source: `claude-code/knowledge/Nodejs/wf-b407bc0c.md`

### Passo 7: Validar cap de 200 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/state-and-caching.md
```

Resultado esperado: entre 100 e 200 linhas. Alvo: ~120 (átomo mais enxuto do batch — per `_topic-plan.md:56`).

---

## Gotchas

- **G1 do plano:** frontmatter verbatim. `layer: both` (cache aplica no backend e frontend SSR/SPA).
- **G2 do plano:** cap de 200 linhas. `b407bc0c` é a fonte mais longa do batch (2053 ln); cuidar para não pular skeleton.
- **G5 do plano:** overlap com `/system-design`. Não explicar "o que é cache" ou "o que é eviction policy" — focar em `AsyncLocalStorage` (Node-specific) e armadilhas de módulo CJS/ESM com estado global.
- **G6 do plano:** `sources: [{research: b407bc0c}]`.
- **Local — alvo ~120 linhas é mais apertado:** disciplina extra. Se chegar a 130-140, ok; se chegar a 160+, condensar (`lru-cache` vs `node-cache` vs `Map` puro vira tabela, não 3 sub-seções).
- **Local — `AsyncLocalStorage` tem custo:** mencionar ~10% overhead em hot path; vale a pena para visibilidade, não para state crítico de latência.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Checklist de validação de conteúdo:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/state-and-caching.md`
- [ ] Frontmatter contém os 8 campos na ordem
- [ ] `topic: state-and-caching` (literal)
- [ ] `stack: nodejs-typescript`
- [ ] `layer: both`
- [ ] `tier: 2`
- [ ] `updated: 2026-05-16`
- [ ] Corpo tem as 5 seções na ordem
- [ ] Pelo menos 3 patterns em "Padrões sênior"
- [ ] Pelo menos 2 anti-padrões com correção
- [ ] `AsyncLocalStorage` aparece como pattern explícito (diferencial Node)
- [ ] Singleflight / stampede aparece como anti-pattern ou pattern
- [ ] `wc -l` retorna entre 100 e 200 (alvo ~120)
- [ ] `grep -c '\[A DEFINIR\]' atoms/state-and-caching.md` retorna 0
- [ ] Triggers contém pelo menos: `cache`, `Redis`, `AsyncLocalStorage`, `request-scoped`, `invalidation`, `singleflight`, `stampede`
- [ ] Citação de `/system-design` em "Referências externas"

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/state-and-caching.md` exit 0
- `wc -l` retorna entre 100 e 200 (alvo apertado 120)
- `grep -c '\[A DEFINIR\]'` retorna 0
- Frontmatter parseável como YAML; ordem dos 8 campos idêntica ao piloto

**Por humano:**
- `AsyncLocalStorage` está descrito com exemplo de uso real (middleware + child logger), não conceito vago
- Singleflight contra stampede aparece como pattern operacionalizável
- Anti-pattern de estado global em módulo CJS é descrito com exemplo do bug ("vaza entre tenants")
- Não duplica `/system-design` no conceitual de cache

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

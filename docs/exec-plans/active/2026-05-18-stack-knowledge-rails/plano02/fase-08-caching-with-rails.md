<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only. Padrões Solid Cache exigem Rails 8 — refletido no texto.
-->

# Fase 08: Átomo `caching-with-rails.md` (T2)

**Plano:** 02 — Batch A T1 + Batch B parcial T2
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup), fase-02 (schema), fase-04 (piloto)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 2 `docs/knowledge/rails/atoms/caching-with-rails.md` (~140 linhas), condensando Solid Cache (default Rails 8 — DB-backed), fragment caching (`cache @model`), Russian doll caching (nested), HTTP caching (`etag`/`last_modified`/`fresh_when`), low-level cache (`Rails.cache.fetch`), invalidation strategies. Cobre o ângulo Rails-specific (cache key auto-versioning por `updated_at`, cache stores DSL, `solid_cache_store`) que `/system-design` cobre como princípio cross-stack de cache invalidation + hit rate.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/caching-with-rails.md` | Create | Átomo completo (~140 linhas) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar dedup para `rails-stack-conventions` (fonte primária para caching idioms) |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` STATE.md global. Confirmar decisão para `rails-stack-conventions` vs `v2`. Sem decisão aprovada, **BLOQUEAR**.

### Passo 2: Frontmatter exato

```yaml
---
topic: caching-with-rails
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md
  - claude-code/knowledge/Rails/rails-stack-conventions/BACKENDS.md
  - claude-code/knowledge/Rails/rails-expert/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md
tier: 2
triggers: [cache, caching, solid cache, fragment caching, russian doll, http caching, etag, last_modified, fresh_when, Rails.cache.fetch, cache invalidation]
related_skills: [/system-design, /infrastructure, /api-design]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

`['>=7.1']` cobre fragment + Russian doll + HTTP caching (universais). Padrões **Solid Cache** específicos são marcados no texto como "Rails 8+". NÃO usar `['>=8.0']` no frontmatter — exclui o resto.

### Passo 3: Corpo seguindo skeleton fixo do piloto

**Seções (5 — sem API-only):**

1. `# Caching with Rails` (título)
2. `## Quando consultar`
3. `## Padrões sênior`
4. `## Anti-padrões`
5. `## Critérios de decisão`
6. `## Referências externas`

### Passo 4: Patterns recomendados (guia editorial)

Mínimo 5, máximo 7:

- **Pattern: Solid Cache (default Rails 8+)** — Problema: Redis/Memcached como dependência extra; Padrão: Rails 8 inclui Solid Cache (DB-backed, sharded por encryption); zero infra extra para apps com Postgres robusto. Setup: `bin/rails solid_cache:install`; Quando usar: app Rails 8 sem Redis/Memcached pré-existente; Quando NÃO usar: cache muito hot (>10k ops/s) — Redis ainda ganha em raw throughput.

- **Pattern: Memcached/Redis (Rails 7.x e edge cases)** — Problema: Solid Cache não existe em Rails 7.x; Padrão: `config.cache_store = :mem_cache_store, "cache.example.com"` ou `:redis_cache_store, { url: ENV['REDIS_URL'] }`; Quando usar: Rails 7.x ou throughput alto sustained; Quando NÃO usar: app Rails 8 greenfield (Solid Cache reduz infra).

- **Pattern: Fragment caching com `cache @model`** — Problema: re-renderização de partial caro a cada request; Padrão: `<% cache @post do %>...<% end %>` — cache key automaticamente inclui `updated_at` do model (auto-expire); Quando usar: partials caros (listagens, sidebars); Quando NÃO usar: partials volátil (countdown, real-time stats).

- **Pattern: Russian doll caching (nested)** — Problema: cache invalidation cascateia em listas (a mudança em 1 item invalida todo o cache da lista); Padrão: nested `cache` blocks — outer cache key inclui inner cache versions; mudança em 1 item só invalida seu fragment, não o container; Quando usar: listas com items independentemente atualizáveis (feed de posts); Quando NÃO usar: items que sempre mudam juntos (single transaction).

- **Pattern: HTTP caching com `fresh_when`/`stale?`** — Problema: client refaz request idêntico; Padrão: `def show; @post = Post.find(...); fresh_when(@post); end` — gera ETag automaticamente; cliente revalida com `If-None-Match`; Quando usar: GET responses cacheáveis (show, index); Quando NÃO usar: responses com dados sensíveis ou per-user — `Cache-Control: private`.

- **Pattern: Low-level cache (`Rails.cache.fetch`)** — Problema: computação cara reusada (results de API externa, query agregada); Padrão: `Rails.cache.fetch(['posts', date], expires_in: 1.hour) { compute_expensive }`; Quando usar: results determinísticos por chave; Quando NÃO usar: data com side effects (cache pode mascarar erros) — usar fetch apenas para queries puras.

- **Pattern: Cache invalidation por touch (`belongs_to :post, touch: true`)** — Problema: mudança em child não invalida cache do parent; Padrão: `belongs_to :post, touch: true` — child save atualiza `post.updated_at` → cache key muda; Quando usar: cache key do parent depende do estado dos children; Quando NÃO usar: relacionamento sem cache dependent — touch desnecessário gera write extra.

### Passo 5: Anti-padrões (3-5 armadilhas)

- **Anti-pattern: Cache key sem versionamento** — Sintoma: `Rails.cache.fetch('all_posts') { Post.all.to_a }` nunca invalida após update; Correção: `Rails.cache.fetch(['posts', Post.maximum(:updated_at)]) { Post.all.to_a }` ou usar `cache_key_with_version`.
- **Anti-pattern: Fragment cache sem touch em parent** — Sintoma: comentário novo, post cacheado mostra contagem antiga; Correção: `belongs_to :post, touch: true` no Comment ou invalidar manualmente.
- **Anti-pattern: HTTP caching sem `Vary` header em response per-user** — Sintoma: usuário A vê página do usuário B (cache CDN compartilhado); Correção: `Vary: Cookie` ou `Cache-Control: private`.
- **Anti-pattern: TTL muito longo sem invalidation strategy** — Sintoma: dados stale por horas/dias; Correção: TTL curto (5-15min) ou invalidation explícita via `Rails.cache.delete`.

### Passo 6: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Rails 8 greenfield + Postgres | Solid Cache (default) |
| Rails 7.x ou throughput hot | Redis/Memcached |
| Partial caro reutilizado | Fragment caching `cache @model` |
| Lista de items independentes | Russian doll (nested cache) |
| GET endpoint cacheável | HTTP caching `fresh_when` |
| Computação determinística cara | Low-level `Rails.cache.fetch` |
| Parent depende de child para cache key | `belongs_to ..., touch: true` |
| Response per-user via CDN | `Cache-Control: private` ou `Vary: Cookie` |

### Passo 7: Referências externas

- Skill: `/system-design` para princípios cross-stack de cache invalidation, hit rate, TTL
- Skill: `/infrastructure` para gestão de Memcached/Redis em deploy + Solid Cache scaling
- Skill: `/api-design` para HTTP caching headers + CDN
- Source: paths absolutos listados em `sources:`

### Passo 8: Comando para invocar extrator (anti-drift literal)

````
Você é um subagente extrator isolado.
Tarefa: escrever `docs/knowledge/rails/atoms/caching-with-rails.md` seguindo template piloto +
Passo 2 da fase-08.

ATENÇÃO ESPECÍFICA:
- Solid Cache é Rails 8+ default. Cite "Rails 8+" no texto dos patterns que dependem dela.
- Não tratar Redis/Memcached como inferior — é a opção sólida em ecossistemas existentes.

REGRA DE FIDELIDADE (anti-drift — copy verbatim da compound lesson
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`):

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente
> na fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
> gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo
> no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia
> o source para confirmar."

OUTPUT: arquivo gravado em `docs/knowledge/rails/atoms/caching-with-rails.md`. Cap ≤ 200 ln; alvo ~140.
````

---

## Gotchas

- **G1 (cap 200):** caching tem muitas variantes. Manter 6 patterns + 4 anti-padrões. Se exceder, cortar "Cache invalidation por touch" (sub-pattern de Russian doll) e mover como nota.
- **G2 (anti-drift):** números de throughput (Solid Cache vs Redis) DEVEM estar na fonte. Sem números, qualitativo: "Redis ganha em raw throughput" (sem porcentagem inventada).
- **G4 (rails_versions):** átomo inteiro é `['>=7.1']`. Solid Cache patterns marcados como "Rails 8+" no texto.
- **G6 (fonte canônica):** `rails-stack-conventions` vs `v2`. Confirme.
- **G8 (paths absolutos):** sources a partir de `claude-code/knowledge/Rails/`.

---

## Verificacao

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/caching-with-rails.md`
- [ ] Frontmatter 8 campos + `rails_versions: ['>=7.1']`
- [ ] `topic: caching-with-rails`, `stack: rails`, `layer: backend`, `tier: 2`
- [ ] `sources:` apontam para arquivos existentes
- [ ] 5 seções (sem API-only)
- [ ] ≥5 patterns; pelo menos 1 menciona "Solid Cache" + Rails 8 no texto
- [ ] ≥3 anti-padrões
- [ ] Triggers contém: `cache`, `solid cache`, `fragment caching`, `russian doll`, `http caching`, `etag`
- [ ] `wc -l` entre 120 e 200 (alvo ~140)
- [ ] `grep -c '\[A DEFINIR\]'` retorna 0
- [ ] `bun run harness:validate` passa

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/caching-with-rails.md` exit 0
- `wc -l` retorna entre 120 e 200
- `grep -i 'solid cache' docs/knowledge/rails/atoms/caching-with-rails.md` retorna ≥3 matches
- `grep -c '\[A DEFINIR\]'` retorna 0
- `bun run harness:validate` passa

**Por humano:**

- Não flagged CA-08 humano. Verifier refined da fase-09 valida.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

---
topic: caching-with-rails
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/compass_artifact_wf-1d48ebbc-37c7-489c-a0ac-802e2133c81c_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md
tier: 2
triggers: [cache, caching, solid cache, fragment caching, russian doll, http caching, etag, stale?, Rails.cache.fetch, cache invalidation, race_condition_ttl, memcache, redis cache store]
related_skills: [/system-design, /infrastructure, /api-design]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

# Caching with Rails

## Quando consultar

- Ao escolher o cache store para um novo app Rails 8 (Solid Cache vs Redis/Memcached)
- Ao adicionar fragment caching em views com partials caras
- Ao otimizar endpoints GET com HTTP caching (`stale?`, ETag)
- Ao usar `Rails.cache.fetch` em código concorrente (risco de thundering herd)
- Ao configurar banco de dados separado para Solid Cache em produção

## Padrões sênior

### Pattern: Solid Cache — default Rails 8+, sem dependência extra

- **Problema:** Redis/Memcached como dependência operacional extra; ops precisa gerenciar mais um serviço
- **Padrão (Rails 8+):** Solid Cache é o cache store default — DB-backed, sem Redis. Monólito Rails 8 médio (≤100 req/s) usa "Puma 2–4 workers × 3 threads, Solid Queue, Solid Cable, Solid Cache, **sem Redis**"
- **Produção comprovada:** "Solid Cache has been in production at Basecamp for well over a year where it stores 10 terabytes of data, enables a full 60-day retention window, and cut the P95 render times in half after its introduction" (Rails 8.0 Beta 1 announcement, rubyonrails.org, Sep 27 2024)
- **Configuração recomendada:** Solid Cache / Solid Cable / Solid Queue em 3 databases separadas no `database.yml` (ou ao menos `connects_to` separado) para que job locks não afetem queries do app
- **Quando usar:** app Rails 8 greenfield sem Redis pré-existente
- **Quando NÃO usar:** stack legado com Redis já em uso, ou throughput muito alto onde Redis ganha em raw throughput
- **Fonte:** wf-1d48ebbc seção 2.4 (tabela cenários) + seção 14 (checklist produção)

### Pattern: Redis/Memcached — alternativa para alta escala ou stack legado

- **Problema:** Solid Cache não existe em Rails 7.x; ou stack já tem Redis e throughput sustentado é alto
- **Padrão:** Redis como adapter para `ActiveSupport::Cache`; a tabela de cenários indica usar Sidekiq (Redis) "apenas se você já tem Redis e precisa de throughput muito alto" — mesma lógica se aplica ao cache store
- **Quando usar:** Rails 7.x sem Solid Cache disponível; ou Redis já presente no stack por Sidekiq
- **Quando NÃO usar:** app Rails 8 greenfield — Solid Cache reduz infra sem perder funcionalidade para cargas médias
- **Fonte:** wf-1d48ebbc seção TL;DR (linha Sidekiq vs Solid Queue) + seção 2.4

### Pattern: Fragment caching e Russian doll

- **Problema:** re-renderização de partials caras a cada request degrada latência
- **Padrão (full-stack Rails):** Fragment caching e Russian doll (nested fragments) são os mecanismos nativos para views; API-only usa HTTP (`stale?`, ETag) em vez de fragment cache, pois sem ActionView os fragments não se aplicam
- **Referência:** tabela Monolith vs API-only — "Caching | Fragment / Russian doll | HTTP (`stale?`, ETag) + Rack cache"
- **Quando usar:** views com partials reutilizadas e de renderização lenta; Russian doll quando items de uma lista são atualizados de forma independente
- **Quando NÃO usar:** conteúdo volátil por request (dados de sessão, contadores real-time)
- **Fonte:** wf-0deebe76 tabela seção 14 (linha Caching)

### Pattern: HTTP caching com `stale?` e ETag em APIs

- **Problema:** client repete request idêntico; servidor re-processa sem necessidade
- **Padrão (API-only Rails):** `stale?` e ETag são os mecanismos idiomáticos em controllers API; incluído como padrão em `ActionController::API` junto com `ConditionalGet`
- **Quando usar:** GET endpoints com resposta determinística por recurso; `ActionController::API` inclui `Caching` e `ConditionalGet` por default
- **Quando NÃO usar:** respostas per-user com dados sensíveis ou altamente voláteis
- **Fonte:** wf-0deebe76 linha 106 (módulos incluídos em API) + linha 510 (tabela Caching)

### Pattern: `Rails.cache.fetch` com `race_condition_ttl` — evitar thundering herd

- **Problema:** `Rails.cache.fetch(key) { expensive }` com 100 threads simultâneas — todas recalculam quando o cache expira (thundering herd)
- **Padrão:** usar `race_condition_ttl:` para que threads concorrentes que chegam durante recomputação recebam o valor expirado temporariamente; e/ou advisory lock + `read_multi`
- **Thread safety:** "`Rails.cache` é thread‑safe; **conteúdo é compartilhado entre threads** — não armazene dados sensíveis sem scope"
- **Fonte:** wf-1d48ebbc seção 6.6 (Cache compartilhado) + seção 9.4

## Anti-padrões

### Anti-pattern: `Rails.cache.fetch` sem `race_condition_ttl` em código concorrente

- **Sintoma:** múltiplos workers recalculam o mesmo valor caro simultaneamente quando o cache expira
- **Correção:** adicionar `race_condition_ttl: 10.seconds` ao fetch; ou usar advisory lock para serializar recomputação
- **Fonte:** wf-1d48ebbc seção 6.6

### Anti-pattern: Dados sensíveis em `Rails.cache` sem escopo

- **Sintoma:** dados de sessão, tokens ou informações de usuário armazenados diretamente em cache global; vazamento cross-tenant/cross-user em ambiente multi-tenant
- **Correção:** escopo da chave deve incluir `user_id` ou `tenant_id`; nunca armazenar dados sensíveis sem namespace explícito
- **Fonte:** wf-1d48ebbc seção 9.4 ("não armazene dados sensíveis sem scope")

### Anti-pattern: Redis como dependência quando Solid Cache resolve

- **Sintoma:** app Rails 8 greenfield adiciona Redis apenas para cache; aumenta custo operacional sem ganho real em cargas médias
- **Correção:** avaliar Solid Cache primeiro; migrar para Redis apenas quando benchmarks reais mostrarem gargalo
- **Fonte:** wf-1d48ebbc seção 2.4 (tabela cenários — "sem Redis" para monólito médio)

### Anti-pattern: Introduzir gem de cache externo para o que Rails 8 já entrega nativamente

- **Sintoma:** instalar `dalli` (Memcached) ou configurar Redis apenas para cache em app Rails 8 sem justificativa de escala
- **Correção:** "Solid Trifecta como defaults é recente (Rails 8.0, nov 2024). Algumas integrações de gem podem assumir Redis/Sidekiq; valide antes de remover" — avaliar gems existentes antes de migrar, mas não adicionar dependência nova sem necessidade
- **Sinal de alerta:** "Introduzindo gem para o que Rails 8 já faz nativamente (Solid Queue/Cache/Cable, auth built-in, encryption)"
- **Fonte:** wf-3e82e3be linha 1094 (anti-pattern list) + linha 1240 (nota adoção Solid Trifecta)

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Rails 8 greenfield + Postgres | Solid Cache (default, sem Redis) |
| Rails 7.x ou Redis já no stack | Redis/Memcached como cache store |
| Views com partials caras (full-stack) | Fragment caching + Russian doll |
| GET endpoint API-only cacheável | HTTP caching com `stale?` + ETag |
| Computação cara com alta concorrência | `Rails.cache.fetch` + `race_condition_ttl:` |
| Cache em ambiente multi-tenant | Escopo da chave inclui `tenant_id` |
| Solid Cache em produção | Database separada no `database.yml` |
| App Rails 7 com Memcached para uso modesto | Avaliar migração para Solid Cache em upgrade para Rails 8 |

## Referências externas

- Skill: `/system-design` para princípios cross-stack de cache invalidation, hit rate, TTL
- Skill: `/infrastructure` para gestão de Redis/Memcached em deploy + configuração Solid Cache
- Skill: `/api-design` para HTTP caching headers e CDN
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/compass_artifact_wf-1d48ebbc-37c7-489c-a0ac-802e2133c81c_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md

<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, sem comentário inline em runtime.
O prompt do extrator vive nesta fase como spec, não como código de execução.
-->

# Fase 03: Átomo `action-cable-and-realtime.md` (T3) — FLAGGED CA-08 audit humano

**Plano:** 03 — Batch C + INDEX + E2E + Hardening leve
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup decidida), fase-02 (schema `rails_versions`), fase-04 (piloto como template); Plano 02 fase-09 (verifier refined + audit humano aprovados — estabelece padrão CA-08)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 3 `docs/knowledge/rails/atoms/action-cable-and-realtime.md` (~140 linhas), condensando ActionCable channels, Solid Cable (adapter default no Rails 8), Turbo Streams broadcast (integração com Hotwire), performance gotchas (broadcast em loop, N+1 em subscribers, fan-out scaling) e quando preferir SSE ou WebSocket externo. T3 = niche/opcional — alguns apps Rails nunca usam realtime. **Átomo flagged CA-08 (D14, D19): após verifier refined da fase-07, Luiz revisa pessoalmente — assinatura em STATE.md global da feature.** T3 foi escolhido para audit humano porque ActionCable tem fontes Rails mais escassas (compass + deep-research, menos skill package estruturado) — valida que extração funciona em domínios com menor densidade de fonte (D14, justificativa originária).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/action-cable-and-realtime.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~140 linhas) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar decisão de dedup aprovada para `rails-stack-conventions` (fonte do átomo); confirmar que assinatura humana CA-08 será adicionada após verifier refined em fase-07 |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` o STATE.md global da feature e extrair a decisão aprovada para os pares duplicados. Para este átomo, importam:

- `rails-stack-conventions` vs `rails-stack-conventions v2` (channel patterns, broadcast idioms)
- `rails-expert` (sem duplicata — patterns sêniores)
- compass artifact sobre Solid Cable (Rails 8 adapter)
- deep-research-report sobre realtime patterns (fonte com menor estrutura — anti-drift extra crítico)

Se STATE.md NÃO tem bloco `## Dedup decisions (Plano 01 fase-01)` aprovado, **BLOQUEAR a fase** e escalar.

### Passo 2: Frontmatter exato (8 campos base + `rails_versions`, verbatim com piloto)

```yaml
---
topic: action-cable-and-realtime
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md
  - claude-code/knowledge/Rails/rails-expert/BACKENDS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-2026-rails8-solid-cable_text_markdown.md
  - claude-code/knowledge/Rails/deep-research-report-realtime-rails.md
tier: 3
triggers: [action cable, websocket, realtime, channels, solid cable, turbo streams, broadcast, fan-out, redis adapter]
related_skills: [/system-design, /api-design, /architecture]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

**Notas sobre o frontmatter:**

- `rails_versions: ['>=7.1']` — ActionCable existe desde Rails 5.0, mas padrões sênior modernos (Turbo Streams broadcast, Solid Cable) são 7.1+/8.0+. Padrões específicos do Solid Cable (`['>=8.0']`) ficam mencionados em sub-seção, não filtram o átomo todo.
- `sources:` inclui deep-research-report — fonte com menor estrutura. Risco de drift é maior aqui. Extrator deve ser EXTRA conservador (anti-drift literal + verifier refined + audit humano).
- Compass artifact UUID acima é placeholder — extrator confirma nome real via `ls claude-code/knowledge/Rails/compass_artifact_*` antes de escrever.
- `related_skills:` inclui `/architecture` por causa de decisões arquiteturais (channels vs SSE vs external WS — alvo de discussão senior).

### Passo 3: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem:

1. `# ActionCable & Realtime` (título H1)
2. `## Quando consultar` — 3-5 bullets de cenário
3. `## Padrões sênior` — 5-6 patterns
4. `## Anti-padrões` — 3-4 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skills relacionadas + paths das fontes

**NÃO incluir** seção API-only mode.

### Passo 4: Patterns recomendados (guia editorial)

Mínimo 5, máximo 6 — extrair do source canônico. Lista Rails-native:

- **Pattern: Channels com autorização explícita em `subscribed`** — Problema: socket aberto sem auth permite escuta cross-user; Padrão: `class ChatChannel < ApplicationCable::Channel` define `def subscribed; stream_from "chat_#{params[:room]}" if can_access?(params[:room]); end`; `ApplicationCable::Connection` autentica current_user via cookie/token em `connect`; rejeita unauthorized via `reject_unauthorized_connection`; Quando usar: 100% dos channels; Quando NÃO usar: nunca — autorização não é opcional em realtime.
- **Pattern: Solid Cable como adapter default (Rails 8)** — Problema: Redis exigido só para pub/sub adiciona infra; Padrão: Rails 8 default usa Solid Cable (DB-backed pub/sub, Postgres LISTEN/NOTIFY); `config/cable.yml` aponta para `solid_cable` em produção; sem Redis no acessório; Quando usar: Rails 8 com Postgres, escala até ~10k subscribers concorrentes (caso real de produção); Quando NÃO usar: escala alta (>50k subscribers) ou DB já saturado — voltar para Redis adapter.
- **Pattern: Turbo Streams broadcast a partir de model callbacks** — Problema: views ficam stale após mutações; Padrão: `broadcasts_to :room` (Turbo Rails helper) em model dispara `Turbo::StreamsChannel.broadcast_append_to` em `after_create_commit`/`after_update_commit`; cliente assinante recebe HTML diff via WS e DOM atualiza; Quando usar: features com atualização incremental (chat, dashboards, todos colaborativos); Quando NÃO usar: dados sensíveis cross-user sem auth granular no canal — broadcast atinge todos os subscribers do stream.
- **Pattern: Fan-out via background job (não no callback)** — Problema: broadcast direto em callback bloqueia request; Padrão: `after_commit { BroadcastJob.perform_later(self) }` extrai serialização + broadcast para job (Solid Queue); reduz latência do save e desacopla retry de broadcast do retry de DB; Quando usar: broadcasts > 50ms ou com fan-out >100 subscribers; Quando NÃO usar: broadcast leve com fan-out pequeno (<10 subs) — overhead do job não compensa.
- **Pattern: Lifecycle de conexão com cleanup em `unsubscribed`** — Problema: vazamento de recursos quando socket fecha sem aviso; Padrão: `def unsubscribed; stop_all_streams; cleanup_resources; end`; resources típicos: locks, timers, presence markers; Quando usar: channels que mantêm estado por conexão; Quando NÃO usar: channels stateless (broadcast-only) — `stop_all_streams` é automático.
- **Pattern: SSE como alternativa para fluxo server→client unidirecional** — Problema: ActionCable é overkill para notificações puras one-way; Padrão: controller responde com `response.headers['Content-Type'] = 'text/event-stream'` + `response.stream.write("data: ...\n\n")`; mais simples, menos overhead de protocolo; Quando usar: dashboards read-only, notificações; Quando NÃO usar: comunicação bidirecional (chat, colaboração) — vale ActionCable + WS.

Extrator escolhe 5 desses 6 (cap apertado para T3).

### Passo 5: Anti-padrões (3-4 armadilhas com correção)

- **Anti-pattern: broadcast em loop sem batch** — Sintoma: ao salvar 1000 messages em batch, modelo dispara 1000 broadcasts individuais; Correção: agrupar em job batch (`BatchBroadcastJob.perform_later(messages)`) que emite 1 broadcast com payload composto ou múltiplos broadcasts em transação.
- **Anti-pattern: N+1 em subscribers (cada socket consulta DB no `subscribed`)** — Sintoma: 500 sockets abertos → 500 queries em `User.find` no `subscribed`; Correção: cachear user data por session no `Connection.connect` (set `current_user` uma vez por socket) — subscribers herdam sem extra query.
- **Anti-pattern: stream_from com nome dinâmico sem prefixo de namespace** — Sintoma: collisão entre features (`stream_from "messages_#{id}"` colide com `stream_from "notifications_#{id}"` quando id é o mesmo); Correção: prefixar com nome do channel: `stream_from "chat:messages:#{id}"`.
- **Anti-pattern: ActionCable como pub/sub geral interno** — Sintoma: backend usa Cable broadcast para comunicação entre jobs (sem cliente); Correção: usar pub/sub puro (Redis publish ou Postgres NOTIFY) — Cable é orientado a cliente WS, não barramento interno.

### Passo 6: Critérios de decisão (tabela "se X então Y")

| Cenário | Escolha |
|---|---|
| Atualização incremental de UI (chat, dashboards) | ActionCable + Turbo Streams broadcast |
| Notificação puramente unidirecional server→client | SSE (mais simples que Cable) |
| Rails 8 com Postgres, <10k subscribers | Solid Cable (default) |
| Rails 8 com >50k subscribers ou DB saturado | Redis adapter |
| Broadcast >50ms ou fan-out >100 subs | Mover para background job |
| Pub/sub interno entre jobs (sem WS) | Redis publish ou Postgres NOTIFY (NÃO Cable) |
| Stream com nome dinâmico | Prefixar com namespace de channel |
| Channel com state per-connection | Cleanup em `unsubscribed` |

### Passo 7: Referências externas

- Skill: `/system-design` para pub/sub patterns, fan-out, escala de WS
- Skill: `/api-design` para WS vs SSE vs polling como design decisions
- Skill: `/architecture` para channels como boundaries entre app real-time e core domain
- Source canônica (audit trail RF14): paths absolutos listados em `sources:` no frontmatter

### Passo 8: Comando para invocar extrator (referência para /execute-plan)

`/execute-plan` spawna o subagente extrator com prompt incluindo anti-drift LITERAL (compound lesson colada verbatim). **EXTRA ATENÇÃO:** este átomo tem fontes mais escassas (deep-research-report + compass) — risco de drift máximo. Substituir nomes de pasta canônica pelos decididos no STATE.md. Output: arquivo markdown completo em `docs/knowledge/rails/atoms/action-cable-and-realtime.md`. Após extração, este átomo entra na fila de audit humano CA-08 (fase-07).

---

## Gotchas

- **G1 do plano (cap 200 ln):** ActionCable + Solid Cable + Turbo Streams + performance é tema fragmentado. Alvo 130-145. Se exceder, cortar SSE pattern (último — é "alternativa", não core) ou condensar lifecycle/cleanup.
- **G2 do plano (anti-drift literal):** prompt do extrator inclui texto da compound lesson verbatim. **Risco de drift especialmente alto** porque fontes Rails para Cable são escassas e o subagente tende a completar com conhecimento prévio. Extrator que omite > extrator que inflama com knowledge não-rastreável.
- **G4 do plano (`rails_versions`):** `['>=7.1']` no frontmatter top-level. Solid Cable (8.0+) mencionado em sub-seção do pattern correspondente, não restringe átomo todo.
- **G5 do plano (FLAGGED CA-08):** após verifier refined da fase-07, Luiz revisa pessoalmente. Notificar com link absoluto para átomo + sources citados. Cross-check de 3 claims aleatórias contra source. Se reprovar, retrabalho desta fase + re-verifier.
- **G10 do plano (fonte canônica via STATE.md):** Read STATE.md ANTES de chamar extrator.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é markdown puro. Checklist de validação:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/action-cable-and-realtime.md`
- [ ] Frontmatter contém todos os 8 campos base na ordem correta
- [ ] Campo opcional `rails_versions: ['>=7.1']` presente
- [ ] `topic: action-cable-and-realtime` (literal, kebab-case)
- [ ] `stack: rails`, `layer: backend`, `tier: 3`, `updated: 2026-05-18`
- [ ] Cada path em `sources:` aponta para arquivo existente em `claude-code/knowledge/Rails/{pasta-canonica}/...`
- [ ] Corpo tem as 5 seções na ordem correta
- [ ] Pelo menos 5 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 3 anti-padrões com correção
- [ ] `wc -l docs/knowledge/rails/atoms/action-cable-and-realtime.md` retorna entre 120 e 200 (alvo ~140)
- [ ] `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/action-cable-and-realtime.md` retorna 0
- [ ] Triggers contém pelo menos: `action cable`, `websocket`, `realtime`, `channels`, `solid cable`, `turbo streams`
- [ ] `bun run harness:validate` passa sobre o novo átomo

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/action-cable-and-realtime.md` exit 0
- `wc -l docs/knowledge/rails/atoms/action-cable-and-realtime.md` retorna número entre 120 e 200
- `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/action-cable-and-realtime.md` retorna 0
- Frontmatter parseável como YAML; ordem dos 8 campos base idêntica ao piloto
- `bun run harness:validate` passa

**Por humano (CA-08 obrigatório):**

- Subagente verifier refined (fase-07) reporta ≥80% das 5 claims auditadas das seções técnicas como rastreáveis.
- **Luiz** (audit humano flagged CA-08) lê o átomo + cross-check de 3 claims aleatórias contra paths citados em `sources:`. Assinatura em STATE.md global: bloco `## Audit Humano CA-08 (Plano 03)` com linha `action-cable-and-realtime | T3 | Aprovado por Luiz em YYYY-MM-DD | Notas: ...`.
- Leitor sênior Rails reconhece os patterns como decisões de produção (Solid Cable adoption critérios, fan-out via job, autorização em subscribed), não bullets genéricos de "use websockets!".

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->

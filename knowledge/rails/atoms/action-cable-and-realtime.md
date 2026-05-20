---
topic: action-cable-and-realtime
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-1d48ebbc-37c7-489c-a0ac-802e2133c81c_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-a0aa55c4-3acc-47fc-9d85-f573bafc27b0_text_markdown.md
  - claude-code/knowledge/Rails/deep-research-report (1).md
tier: 3
triggers: [action cable, websocket, realtime, channels, solid cable, turbo streams, broadcast, fan-out, redis adapter, sse, server-sent events, broadcast_later_to]
related_skills: [/system-design, /api-design, /architecture]
updated: 2026-05-19
rails_versions: ['>=7.1']
---

# ActionCable & Realtime

## Quando consultar

- Ao decidir entre ActionCable, SSE (`ActionController::Live`) e polling para funcionalidades de tempo real
- Ao configurar o adapter de pub/sub em Rails 8 (Solid Cable vs Redis vs AnyCable)
- Ao diagnosticar broadcasts bloqueando requests ou causando lentidão no save
- Ao detectar um channel com lógica de domínio acumulada (autorização, queries, serialização)
- Ao escalar para muitas conexões WebSocket simultâneas

## Padrões sênior

### Pattern: Solid Cable como adapter default (Rails 8)

- **Problema:** Redis exigido apenas para pub/sub adiciona infraestrutura desnecessária em apps pequenos e médios
- **Padrão:** Rails 8 usa Solid Cable como default (`adapter: solid_cable`, `polling_interval: 0.1.seconds`, `message_retention: 1.day`); escreve mensagens em `solid_cable_messages` e workers fazem polling; zero serviços externos adicionais
- **Quando usar:** apps Rails 8 com Postgres/MySQL/SQLite, escala até ~500 conexões simultâneas
- **Quando NÃO usar:** mais de 1.000 conexões simultâneas — migrar para Redis adapter ou AnyCable
- **Fonte:** wf-1d48ebbc §10.2, §4.3

### Pattern: `broadcast_later_to` para não bloquear o request

- **Problema:** broadcast direto em callback síncrono segura o request até a entrega do WebSocket
- **Padrão:** `broadcast_later_to` (Turbo Rails) encapsula o broadcast em um job — o request finaliza imediatamente e o broadcast ocorre de forma assíncrona via Active Job
- **Quando usar:** broadcasts disparados em callbacks de model ou em actions de controller onde latência importa
- **Quando NÃO usar:** channel broadcast-only em que o job overhead supera o ganho (fan-out pequeno e síncrono é aceitável)
- **Fonte:** wf-1d48ebbc §10.2, §5.1

### Pattern: Turbo Stream broadcasts só via `after_commit`

- **Problema:** broadcast disparado dentro de transação (`after_save`, `after_create`) chega ao cliente antes do dado estar visível no DB — race condition em leituras imediatas
- **Padrão:** usar `after_create_commit` / `after_update_commit` para garantir que o DB commitou antes de notificar clientes via WebSocket
- **Quando usar:** sempre que `broadcasts_to` ou `broadcast_*` forem usados no model
- **Quando NÃO usar:** broadcasts disparados explicitamente fora de callbacks, já pós-commit
- **Fonte:** wf-a0aa55c4 RAILS-HOTWIRE-001

### Pattern: Channel fino — extrair auth, broadcaster e presenter

- **Problema:** channel acumula autorização, queries, broadcast, serialização e regras de domínio — "channel gordo" (RAILS-B27)
- **Padrão:** channel fica mínimo: delega para objetos externos; extrair (1) autorização, (2) broadcaster dedicado, (3) payload presenter; channel coordena WebSocket e não vira domínio paralelo; exemplo: `Chat::PostMessage.call(...)` no channel action, channel apenas delega
- **Quando usar:** sempre que `subscribed` ou actions do channel ultrapassarem 10-15 linhas ou mixarem lógica de domínio
- **Quando NÃO usar:** canal trivial com stream simples e sem lógica condicional
- **Fonte:** deep-research-report (1).md RAILS-B27

### Pattern: SSE com `ActionController::Live` para streaming unidirecional

- **Problema:** ActionCable é overkill para notificações puramente server→client; WebSocket bidirecional com overhead de protocolo
- **Padrão:** `ActionController::Live` com `response.headers["Content-Type"] = "text/event-stream"` + `SSE.new(response.stream, retry: 300)`; **sempre** fechar com `ensure sse.close` — vazamento de thread documentado em rails#10989; uma thread Puma fica bloqueada pela duração do stream
- **Quando usar:** streaming de tokens LLM, progress feeds, exports em tempo real, notificações read-only
- **Quando NÃO usar:** comunicação bidirecional (chat, colaboração) — ActionCable + WebSocket
- **Fonte:** wf-1d48ebbc §6.3, §10.1, §3

## Anti-padrões

### Anti-pattern: Broadcasts em callbacks indiscriminados sem after_commit

- **Sintoma:** `after_save_commit { broadcast_replace_to ... }` em vários models, atualizações cruzadas em listas não relacionadas, bugs de UI "fantasma", broadcasts em excesso
- **Correção:** broadcast apenas de eventos UI necessários, preferencialmente após commit; broadcaster invocado explicitamente no caso de uso, não em callback genérico de model
- **Fonte:** deep-research-report (1).md RAILS-B18

### Anti-pattern: SSE sem `ensure sse.close`

- **Sintoma:** número de threads Puma cresce a cada conexão SSE — "When I refresh the page, the number of threads is three. If I refresh the page too much, the thread limit for Puma gets reached and the server just freezes" (rails#10989); starvation de requests normais
- **Correção:** `ensure sse&.close` em todo controller com `ActionController::Live`; dimensionar threads Puma para a soma esperada de requests rápidos + streams ativos
- **Fonte:** wf-1d48ebbc §6.3, §10.1

### Anti-pattern: ActionCable com Redis desnecessário em Rails 8

- **Sintoma:** `cable.yml` configurado com Redis adapter em app Rails 8 novo, sem carga que justifique (< 500 conexões), adicionando um serviço a operar
- **Correção:** Rails 8 default é Solid Cable (`adapter: solid_cable`) — sem Redis extra; manter Redis apenas se já está no stack por Sidekiq ou se conexões superam 1.000
- **Fonte:** wf-1d48ebbc §4.3, §2.4; wf-3e82e3be §Regra (Solid Cable justificativa)

### Anti-pattern: Channel gordo com domínio inline

- **Sintoma:** `subscribed` ou actions do channel persistem, autorizam, serializam e transmitem; `MessagesChannel#speak` faz tudo inline
- **Correção:** channel fica como coordenador de WebSocket; extrair auth, broadcaster e presenter; testes: channel spec + command/request specs
- **Fonte:** deep-research-report (1).md RAILS-B27

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Rails 8, Postgres/MySQL, até ~500 conexões | Solid Cable (default — zero Redis extra) |
| Mais de 1.000 conexões simultâneas | Redis adapter ou AnyCable |
| Stack legado com Redis já presente | Action Cable + Redis adapter |
| Streaming server→client (tokens LLM, progress, exports) | `ActionController::Live` + SSE |
| Chat, colaboração, bidirecional | ActionCable + WebSocket |
| Broadcast de model com latência de save | `broadcast_later_to` (job assíncrono) |
| Broadcast garantindo dado visível no DB | `after_create_commit` / `after_update_commit` |
| Channel com lógica acumulada | Extrair broadcaster + presenter + auth |

## Referências externas

- Skill: `/system-design` — pub/sub patterns, fan-out, escala de WebSocket
- Skill: `/api-design` — WebSocket vs SSE vs polling como decisão de design
- Skill: `/architecture` — channels como boundary entre camada realtime e domínio core
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-1d48ebbc-37c7-489c-a0ac-802e2133c81c_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-a0aa55c4-3acc-47fc-9d85-f573bafc27b0_text_markdown.md
  - claude-code/knowledge/Rails/deep-research-report (1).md
- Solid Cable README: github.com/rails/solid_cable (benchmarks k6)

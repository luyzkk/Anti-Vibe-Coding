### [WebSocket vs Socket.IO]: WebSocket nativo

**Data:** 2026-04-10
**Alternativas consideradas:** Socket.IO (com fallback polling), WebSocket nativo, SSE unidirecional
**Justificativa:** Socket.IO adiciona overhead de ~40KB e camada de fallback desnecessaria para target browsers modernos. WebSocket nativo via browser API + ws no servidor.
**Risco conhecido:** Sem fallback polling para ambientes corp com proxy bloqueando WebSocket.
**Reversibilidade:** Reversivel — adapter pattern isola a camada de transporte.

### [Multiplexing Strategy]: 1 conexao por canal

**Data:** 2026-04-12
**Alternativas consideradas:** Socket.IO rooms, MQTT topics, multiplexing manual via envelope
**Justificativa:** Multiplexing aumenta complexidade do protocolo. Reconnect rapido compensa overhead de handshake adicional.
**Risco conhecido:** Mais conexoes abertas pode saturar limits do proxy.
**Reversibilidade:** Reversivel — protocolo de envelope pode ser adicionado sem break de API.

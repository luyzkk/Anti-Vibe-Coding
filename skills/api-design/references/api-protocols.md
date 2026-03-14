# Protocolos de API — Referencia Detalhada

## Decision Tree: Qual Protocolo Usar

```
Tipo de comunicacao?

Request-Response simples (CRUD)?
├─ SIM → HTTP/REST ✓ (padrao para 90% dos casos)

Comunicacao bidirecional em tempo real?
├─ SIM → WebSockets (chat, jogos, dashboards)

Garantia de entrega com processamento assincrono?
├─ SIM → AMQP / Message Queue (RabbitMQ, SQS)

Comunicacao server-to-server de alta performance?
├─ SIM → gRPC (microservicos)

Browser como cliente?
├─ SIM → HTTP/REST ou WebSockets (gRPC requer HTTP/2, browsers limitados)
├─ NAO → gRPC e opcao viavel
```

---

## HTTP/REST

**O que e:** Protocolo request-response stateless. Cliente envia request, servidor retorna response.

**Quando usar:**
- CRUD APIs (maioria dos casos)
- APIs publicas consumidas por browsers
- Quando simplicidade e prioridade

**Anatomia de um request:**
```
GET /api/products/123 HTTP/1.1
Host: example.com
Authorization: Bearer <token>
Accept: application/json
```

**Anatomia de um response:**
```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=3600

{ "id": 123, "name": "Product" }
```

**HTTPS e OBRIGATORIO em producao.** HTTP expoe dados em transito. HTTPS adiciona TLS/SSL.

---

## WebSockets

**O que e:** Protocolo bidirecional persistente. Apos handshake inicial (HTTP upgrade), servidor e cliente enviam mensagens livremente.

**Quando usar:**
- Chat em tempo real
- Jogos multiplayer
- Dashboards com atualizacoes ao vivo
- Qualquer cenario onde o servidor precisa PUSH de dados

**HTTP Polling vs WebSocket:**

| Aspecto | HTTP Polling | WebSocket |
|---------|-------------|-----------|
| Conexao | Nova a cada 5-10s | Uma unica persistente |
| Latencia | Alta (intervalo de polling) | Minima (push imediato) |
| Bandwidth | Desperdicado (requests vazios) | Eficiente (so quando ha dados) |
| Complexidade server | Simples | Gerenciar conexoes abertas |

**Anti-patterns:**
- Usar HTTP polling para comunicacao em tempo real (latencia alta, bandwidth desperdicado)
- WebSocket para operacoes CRUD simples (overkill)
- Nao implementar reconnection logic (conexoes WebSocket caem)

---

## AMQP (Advanced Message Queuing Protocol)

**O que e:** Protocolo de mensageria com message broker. Producer publica mensagens em filas, consumer consome quando disponivel.

**Quando usar:**
- Processamento assincrono (emails, notificacoes, processamento de imagem)
- Garantia de entrega (mensagem nao se perde se consumer estiver offline)
- Desacoplamento entre servicos
- Load leveling (consumer processa no seu ritmo)

**Componentes:**
1. **Producer** — publica mensagens
2. **Message Broker** (RabbitMQ, SQS) — armazena em filas
3. **Consumer** — processa quando disponivel

**Exchange Types:**

| Tipo | Comportamento |
|------|---------------|
| Direct | 1 producer → 1 consumer (point-to-point) |
| Fan-out | 1 mensagem → N consumers (broadcast) |
| Topic | Roteamento por padrao/topico |

**Anti-patterns:**
- Comunicacao sincrona quando assincrona basta (desperdicar latencia do usuario)
- Nao implementar dead letter queue (mensagens com falha se perdem)
- Consumer sem idempotencia (mensagem pode ser entregue mais de uma vez)

---

## gRPC

**O que e:** Framework RPC do Google. Usa HTTP/2 + Protocol Buffers (serialicao binaria).

**Quando usar:**
- Comunicacao server-to-server entre microservicos
- Alta performance (payload binario, menor que JSON)
- Streaming bidirecional nativo
- Type safety com .proto files

**Quando NAO usar:**
- Browser como cliente direto (suporte HTTP/2 limitado)
- APIs publicas para terceiros (REST e mais universal)
- Equipe sem experiencia com Protocol Buffers

**gRPC vs REST:**

| Aspecto | gRPC | REST |
|---------|------|------|
| Formato | Protocol Buffers (binario) | JSON (texto) |
| Performance | Superior | Adequada |
| Browser support | Limitado (HTTP/2) | Universal |
| Streaming | Nativo | SSE ou WebSocket |
| Type safety | .proto files | OpenAPI/Swagger |
| Curva de aprendizado | Alta | Baixa |

---

## Criterios de Escolha

| Criterio | HTTP/REST | WebSocket | AMQP | gRPC |
|----------|----------|-----------|------|------|
| Request-Response | ✓ | - | - | ✓ |
| Real-time push | - | ✓ | - | ✓ (streaming) |
| Garantia entrega | - | - | ✓ | - |
| Browser support | ✓ | ✓ | - | Limitado |
| Performance | Adequada | Boa | Async | Superior |
| Simplicidade | ✓ | Media | Complexa | Complexa |

**Regra:** Em 90% dos casos, HTTP/REST + WebSocket cobre todas as necessidades. AMQP e gRPC sao para cenarios especificos com necessidade comprovada.

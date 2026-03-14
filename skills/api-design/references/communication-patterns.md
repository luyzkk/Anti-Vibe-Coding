# Padroes de Comunicacao — Referencia Completa

## Webhooks (API Invertida)

O servidor externo chama VOCE quando um evento acontece.

### Quando Usar

- Eventos assincronos e esporadicos (pagamento aprovado, email entregue, deploy concluido)
- Integracoes entre sistemas diferentes (Stripe, GitHub, Twilio)
- Quando nao se controla o emissor do evento

### Seguranca — OBRIGATORIO

Endpoint de webhook e PUBLICO — qualquer pessoa pode enviar POST para ele.

**SEMPRE validar HMAC signature do header:**

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // CRITICO: usar timingSafeEqual para evitar timing attacks
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

// No handler
app.post('/webhooks/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature']
  if (!verifyWebhookSignature(req.rawBody, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature')
  }
  // ... processar evento
})
```

**Sem validacao de signature = vulnerabilidade critica.** Qualquer atacante pode simular eventos (pagamentos aprovados, permissoes concedidas, etc.).

### Boas Praticas

| Pratica | Motivo |
|---------|--------|
| Responder 200 RAPIDO (< 5s) | Emissor faz timeout e reenvia |
| Processar em background | Evitar timeout, melhorar resilience |
| Handler idempotente | Mesmo evento PODE chegar mais de uma vez |
| Logar payload completo + headers | Debug e auditoria |
| Verificar timestamp do evento | Prevenir replay attacks |
| Fila de processamento | Garantir ordem e retry |

```typescript
// CORRETO: Resposta rapida + processamento em background
app.post('/webhooks/payment', async (req, res) => {
  // 1. Validar signature
  if (!verifySignature(req)) return res.status(401).end()

  // 2. Responder imediatamente
  res.status(200).json({ received: true })

  // 3. Processar em background
  await queue.add('process-payment-webhook', {
    payload: req.body,
    headers: req.headers,
    receivedAt: new Date().toISOString()
  })
})

// ANTI-PATTERN: Processamento sincrono
app.post('/webhooks/payment', async (req, res) => {
  const payment = await processPayment(req.body)      // 3s
  await updateUserBalance(payment)                      // 2s
  await sendConfirmationEmail(payment)                  // 5s
  res.status(200).end()  // 10s depois — emissor ja fez timeout!
})
```

### Retry e Idempotencia

Emissores reenviam webhooks quando nao recebem 2xx. Tratar duplicatas:

```typescript
async function handleWebhookEvent(event: WebhookEvent) {
  // Verificar se ja processou este evento
  const existing = await db.webhookEvents.findUnique({
    where: { eventId: event.id }
  })
  if (existing) return existing.result  // Ja processado

  // Processar e registrar
  const result = await processEvent(event)
  await db.webhookEvents.create({
    data: { eventId: event.id, result, processedAt: new Date() }
  })
  return result
}
```

---

## WebSockets (Conexao Bidirecional Persistente)

Conexao que permanece aberta para comunicacao em tempo real nos dois sentidos.

### Quando Usar

- Tempo real: chat, jogos multiplayer, dashboards ao vivo
- Frequencia alta de mensagens (multiplas por segundo)
- Comunicacao bidirecional necessaria

### Limitacoes

| Limitacao | Impacto |
|-----------|---------|
| NAO escala facilmente | 10.000 clientes = 10.000 conexoes persistentes |
| Complexidade operacional | Load balancers, sticky sessions, reconexao |
| Overhead de infraestrutura | Memoria por conexao, heartbeat management |
| Sem HTTP caching | Nao aproveita cache de CDN/proxy |

### Boas Praticas

```typescript
// Reconexao automatica no cliente
function createWebSocket(url: string) {
  let ws: WebSocket
  let reconnectAttempts = 0
  const maxReconnectDelay = 30000

  function connect() {
    ws = new WebSocket(url)

    ws.onopen = () => { reconnectAttempts = 0 }

    ws.onclose = () => {
      const delay = Math.min(1000 * 2 ** reconnectAttempts, maxReconnectDelay)
      reconnectAttempts++
      setTimeout(connect, delay)  // Backoff exponencial
    }

    // Heartbeat para detectar conexoes mortas
    const pingInterval = setInterval(() => ws.send('ping'), 30000)
    ws.onclose = () => clearInterval(pingInterval)
  }

  connect()
  return ws
}
```

### Escalabilidade

Para escalar WebSockets alem de um unico servidor:

- **Redis Pub/Sub** como message broker entre instancias
- **Sticky sessions** no load balancer (ou usar socket.io com Redis adapter)
- **Horizontal scaling** com rooms/channels particionados
- Considerar servicos gerenciados (Pusher, Ably, AWS API Gateway WebSocket)

---

## SSE (Server-Sent Events) — Alternativa Leve

Streaming unidirecional servidor → cliente sobre HTTP padrao.

### Quando Usar em vez de WebSockets

| Criterio | SSE | WebSocket |
|----------|-----|-----------|
| Direcao | Servidor → Cliente | Bidirecional |
| Protocolo | HTTP padrao | Protocolo proprio |
| Reconexao | Automatica (built-in) | Manual |
| Complexidade | Baixa | Alta |
| Cache/Proxy | Compativel | Incompativel |
| Browser support | Nativo | Nativo |

**Preferir SSE quando:** Notificacoes, feeds de atividade, progresso de tarefas, streaming de dados. Basicamente qualquer caso unidirecional.

### Implementacao

```typescript
// Servidor (Node.js/Express)
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendEvent = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // Enviar heartbeat a cada 15s
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000)

  req.on('close', () => {
    clearInterval(heartbeat)
  })
})

// Cliente (browser nativo)
const events = new EventSource('/events')
events.onmessage = (e) => {
  const data = JSON.parse(e.data)
  // Processar evento
}
// Reconexao e automatica!
```

---

## Comparativo Geral

| Aspecto | Webhook | WebSocket | SSE |
|---------|---------|-----------|-----|
| **Iniciador** | Servidor externo | Ambos | Seu servidor |
| **Direcao** | Unidirecional | Bidirecional | Unidirecional |
| **Persistencia** | Sem conexao | Conexao persistente | Conexao persistente |
| **Frequencia** | Esporadica | Alta | Media |
| **Escalabilidade** | Alta (stateless) | Complexa (stateful) | Media |
| **Complexidade** | Baixa | Alta | Baixa |
| **Seguranca** | HMAC signature | Auth no handshake | Auth via HTTP |

---

## Anti-Patterns

| Anti-Pattern | Consequencia |
|-------------|-------------|
| Webhook sem validacao de signature | Vulnerabilidade critica — qualquer um simula eventos |
| WebSocket para notificacoes simples | Over-engineering — SSE resolve com menos complexidade |
| Processar webhook sincronamente | Timeout do emissor, reenvio, duplicatas |
| Assumir que WebSocket escala sozinho | Colapso sob carga — requer infra dedicada |
| SSE sem heartbeat | Proxies/load balancers fecham conexao ociosa |
| Webhook sem idempotencia | Processamento duplicado de eventos |
| WebSocket sem reconexao automatica | Usuarios perdem atualizacoes silenciosamente |

---

## Checklists de Verificacao

### Webhooks

- [ ] HMAC signature validada em TODOS os endpoints de webhook
- [ ] Usa `timingSafeEqual` para comparacao de signatures
- [ ] Handler responde 200 rapidamente e processa em background
- [ ] Handler e idempotente (mesmo evento 2x = mesmo resultado)
- [ ] Payloads completos sao logados para debug
- [ ] Timestamp do evento verificado (anti-replay)
- [ ] Fila de processamento com retry e dead-letter

### WebSockets

- [ ] Plano de escalabilidade definido (quantas conexoes simultaneas?)
- [ ] Reconexao automatica com backoff exponencial no cliente
- [ ] Heartbeat/ping-pong para detectar conexoes mortas
- [ ] Avaliou se SSE nao resolve o caso de uso
- [ ] Message broker (Redis) configurado para multi-instancia
- [ ] Auth implementada no handshake

### SSE

- [ ] Heartbeat configurado (evitar timeout de proxies)
- [ ] Content-Type correto (`text/event-stream`)
- [ ] Cleanup de recursos no `close` do request
- [ ] Avaliou se precisa de bidirecionalidade (se sim, WebSocket)

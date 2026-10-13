# Padroes de Comunicacao — Referencia Completa

## Webhooks (API Invertida)

O servidor externo chama VOCE quando um evento acontece.

### Quando Usar

- Eventos assincronos e esporadicos (pagamento aprovado, email entregue, deploy concluido)
- Integracoes entre sistemas diferentes (Stripe, GitHub, Twilio)
- Quando nao se controla o emissor do evento

### Seguranca — OBRIGATORIO

Endpoint de webhook e PUBLICO — qualquer pessoa pode enviar POST para ele. Toda requisicao
precisa provar que veio do emissor antes de causar qualquer efeito.

**Stripe: use a verificacao do proprio SDK, sobre o corpo cru.**

O cabecalho `Stripe-Signature` tem o formato `t=<timestamp>,v1=<assinatura>`. A Stripe assina
`"<timestamp>.<corpo cru>"`, nao o corpo sozinho, entao comparar um HMAC do corpo com o cabecalho
inteiro nunca funciona. O SDK tambem recusa eventos com timestamp velho (tolerancia padrao de
5 minutos), o que bloqueia replay.

```typescript
import Stripe from 'stripe'
import express from 'express'

const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'))
const endpointSecret = requireEnv('STRIPE_WEBHOOK_SECRET') // whsec_..., um por endpoint

// O corpo precisa chegar CRU. Um express.json() antes desta rota altera os bytes e quebra a assinatura.
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string') return res.status(400).send('Missing signature')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret)
  } catch {
    return res.status(400).send('Invalid signature')
  }
  // ... gravar e enfileirar ANTES de responder (ver o exemplo CORRETO abaixo)
})
```

No Next.js (App Router), leia o corpo cru com `await request.text()` e passe essa string ao
`constructEvent`. Nao use `request.json()` antes de verificar.

**Outros emissores (HMAC generico):** siga a documentacao do emissor sobre O QUE e assinado (muitos
incluem o timestamp, como a Stripe) e se o cabecalho traz prefixo, como `sha256=` no GitHub.
Compare buffers do mesmo tamanho:

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

function verifyHmac(rawBody: Buffer, receivedHex: string, secret: string): boolean {
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'), 'hex')
  const received = Buffer.from(receivedHex, 'hex')
  // timingSafeEqual lanca erro quando os tamanhos diferem: compare o tamanho antes
  return received.length === expected.length && timingSafeEqual(received, expected)
}
```

**Sem validacao de signature = vulnerabilidade critica.** Qualquer atacante pode simular eventos (pagamentos aprovados, permissoes concedidas, etc.).

### Boas Praticas

| Pratica | Motivo |
|---------|--------|
| Gravar o evento ANTES de responder 2xx | Se responder 200 e a gravacao falhar, o emissor nao reenvia e o evento se perde |
| Responder 2xx rapido (< 5s) depois de gravar | Emissor faz timeout e reenvia |
| Processar em background | Evitar timeout, melhorar resilience |
| Idempotencia pelo id do evento, com UNIQUE no banco | Mesmo evento PODE chegar mais de uma vez |
| Logar payload e headers, nunca segredos | Debug e auditoria |
| Recusar evento com timestamp velho | Prevenir replay (o SDK da Stripe ja faz) |
| Fila de processamento | Garantir ordem e retry |

```typescript
// CORRETO: verificar, gravar, enfileirar e so entao responder
app.post('/webhooks/payment', express.raw({ type: 'application/json' }), async (req, res) => {
  // 1. Validar a assinatura (como acima)
  const event = verifyOrNull(req)
  if (!event) return res.status(400).end()

  // 2. Gravar com UNIQUE(event_id): uma duplicata nao cria segunda linha
  const inserted = await db.query(
    `INSERT INTO webhook_events (event_id, type, payload, status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [event.id, event.type, event],
  )

  // 3. Enfileirar so na primeira chegada
  if (inserted.rowCount === 1) await queue.add('process-webhook', { eventId: event.id })

  // 4. Responder: o evento ja esta salvo, entao um 200 nao perde nada
  res.status(200).json({ received: true })
})
```

Se gravar e enfileirar nao acontecem na mesma transacao, uma rotina periodica reenfileira os
eventos que ficaram em `pending` (padrao outbox). Assim uma falha da fila nao perde pagamento.

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
async function handleWebhookEvent(eventId: string) {
  // Reivindicar o evento ANTES de processar: o banco decide qual worker processa
  const claimed = await db.query(
    `UPDATE webhook_events SET status = 'processing', claimed_at = now()
     WHERE event_id = $1 AND status = 'pending'
     RETURNING payload`,
    [eventId],
  )
  if (claimed.rowCount === 0) return  // ja processado ou em processamento por outro worker

  await processEvent(claimed.rows[0].payload)  // efeitos idempotentes por event_id
  await db.query(`UPDATE webhook_events SET status = 'done' WHERE event_id = $1`, [eventId])
}
```

**Anti-pattern: consultar e depois gravar.** `findUnique` seguido de `create` deixa dois workers
passarem pela consulta ao mesmo tempo, e os dois processam o mesmo pagamento. A decisao tem de
ficar com o banco: UNIQUE na insercao ou UPDATE condicional na reivindicacao.

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

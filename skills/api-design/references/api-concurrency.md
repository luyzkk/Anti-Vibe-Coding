# Concorrencia em APIs — Referencia Completa

## Conceito

Nem toda operacao precisa ser sincrona. Repensar a sequencia de execucao e uma das formas mais eficazes de melhorar performance e experiencia do usuario.

## Pergunta-Chave

> "O usuario PRECISA esperar por esta operacao para continuar?"

Se a resposta e NAO, a operacao deve ir para background.

## Identificando Oportunidades

Para cada etapa de um endpoint, perguntar:

| Pergunta | Se NAO |
|----------|--------|
| O usuario precisa do resultado AGORA? | Mover para background |
| Esta etapa depende da anterior? | Paralelizar |
| Falha nesta etapa invalida toda a operacao? | Processar separadamente |

## Exemplo Pratico: Upload de Avatar

```
// ANTI-PATTERN: Tudo sincrono (5-10 segundos de espera)
POST /upload-avatar
  1. Recebe imagem           (sincrono - necessario)
  2. Valida formato           (sincrono - necessario)
  3. Comprime imagem          (sincrono - DESNECESSARIO)
  4. Gera thumbnails          (sincrono - DESNECESSARIO)
  5. Upload para CDN          (sincrono - DESNECESSARIO)
  6. Atualiza banco           (sincrono - DESNECESSARIO)
  7. Invalida cache           (sincrono - DESNECESSARIO)
  → Responde ao usuario       (5-10 segundos depois)

// CORRETO: Sincrono + Background (< 500ms)
POST /upload-avatar
  1. Recebe imagem           (sincrono)
  2. Valida formato           (sincrono)
  3. Salva original no storage temporario (sincrono)
  → Responde 202 Accepted    (< 500ms)

  [Background Job]
  4. Comprime imagem
  5. Gera thumbnails
  6. Upload para CDN
  7. Atualiza banco
  8. Invalida cache
  9. Notifica cliente via WebSocket/SSE (opcional)
```

## Estrategias de Concorrencia

### 1. Background Job

Operacao unica demorada executada fora do request principal.

**Quando usar:** Envio de email, processamento de imagem, geracao de relatorio, exportacao de dados.

```typescript
// Enfileirar job apos acao principal
app.post('/orders', async (req, res) => {
  const order = await createOrder(req.body)   // Sincrono — necessario
  res.status(201).json(order)                 // Responde imediatamente

  // Background — nao bloqueia o response
  await queue.add('post-order', {
    orderId: order.id,
    tasks: ['send-confirmation-email', 'update-inventory', 'notify-warehouse']
  })
})

// Worker que processa o job
queue.process('post-order', async (job) => {
  const { orderId, tasks } = job.data
  for (const task of tasks) {
    await executeTask(task, orderId)
  }
})
```

**Ferramentas comuns:** BullMQ (Node.js + Redis), Inngest, Trigger.dev, AWS SQS.

### 2. PubSub / Event Queue

Multiplos consumers independentes reagem ao mesmo evento.

**Quando usar:** Pedido criado → [notificar cliente, atualizar estoque, gerar nota fiscal, analytics]. Cada consumer e independente e pode falhar sem afetar os outros.

```typescript
// Publicar evento
await eventBus.publish('order.created', {
  orderId: order.id,
  userId: order.userId,
  total: order.total,
})

// Consumers independentes
eventBus.subscribe('order.created', async (event) => {
  await sendConfirmationEmail(event.userId, event.orderId)
})

eventBus.subscribe('order.created', async (event) => {
  await updateInventory(event.orderId)
})

eventBus.subscribe('order.created', async (event) => {
  await generateInvoice(event.orderId)
})

// Cada consumer pode:
// - Ter retry independente
// - Falhar sem afetar os outros
// - Escalar independentemente
```

**Ferramentas comuns:** Redis Streams, AWS SNS/SQS, Google Pub/Sub, RabbitMQ.

### 3. Promise.all (Paralelo no Mesmo Request)

Operacoes independentes executadas em paralelo dentro do mesmo request.

**Quando usar:** Buscar dados de fontes independentes que o usuario precisa AGORA.

```typescript
// ANTI-PATTERN: Sequencial desnecessario
async function getDashboardData(userId: string) {
  const user = await getUser(userId)          // 200ms
  const orders = await getOrders(userId)      // 300ms
  const notifications = await getNotifications(userId)  // 150ms
  const settings = await getSettings(userId)  // 100ms
  // Total: 750ms (sequencial)
  return { user, orders, notifications, settings }
}

// CORRETO: Paralelo com Promise.all
async function getDashboardData(userId: string) {
  const [user, orders, notifications, settings] = await Promise.all([
    getUser(userId),          // 200ms ─┐
    getOrders(userId),        // 300ms ─┤ Todas em paralelo
    getNotifications(userId), // 150ms ─┤
    getSettings(userId),      // 100ms ─┘
  ])
  // Total: 300ms (tempo da mais lenta)
  return { user, orders, notifications, settings }
}
```

**Cuidado com `Promise.all`:**
- Se UMA promise falhar, TODAS sao rejeitadas
- Usar `Promise.allSettled` quando falha parcial e aceitavel

```typescript
// Quando falha parcial e OK
const results = await Promise.allSettled([
  getUser(userId),
  getOrders(userId),
  getRecommendations(userId),  // Se falhar, tudo bem
])

const [userResult, ordersResult, recsResult] = results
const user = userResult.status === 'fulfilled' ? userResult.value : null
const orders = ordersResult.status === 'fulfilled' ? ordersResult.value : []
const recs = recsResult.status === 'fulfilled' ? recsResult.value : []
```

### 4. Streaming (SSE)

Resultado progressivo enviado ao cliente conforme fica disponivel.

**Quando usar:** Progresso de upload, resultados de busca que chegam em partes, processamento em etapas com feedback.

```typescript
// Progresso de processamento via SSE
app.get('/orders/:id/status', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')

  const unsubscribe = eventBus.subscribe(
    `order.${req.params.id}.progress`,
    (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`)

      if (event.status === 'completed' || event.status === 'failed') {
        unsubscribe()
        res.end()
      }
    }
  )

  req.on('close', unsubscribe)
})
```

## Padrao 202 Accepted + Status Endpoint

Para operacoes de longa duracao, retornar 202 com endpoint de status:

```typescript
// Iniciar operacao
app.post('/reports/generate', async (req, res) => {
  const jobId = await queue.add('generate-report', req.body)
  res.status(202).json({
    jobId,
    statusUrl: `/reports/status/${jobId}`,
    message: 'Report generation started'
  })
})

// Verificar status
app.get('/reports/status/:jobId', async (req, res) => {
  const job = await queue.getJob(req.params.jobId)
  res.json({
    status: job.status,       // 'waiting' | 'active' | 'completed' | 'failed'
    progress: job.progress,   // 0-100
    result: job.returnvalue,  // Disponivel quando completed
    error: job.failedReason,  // Disponivel quando failed
  })
})
```

## Anti-Patterns

| Anti-Pattern | Consequencia | Solucao |
|-------------|-------------|---------|
| Tudo sincrono "por simplicidade" | Usuario espera desnecessariamente | Identificar etapas para background |
| Tudo em background sem feedback | Usuario nao sabe se funcionou | 202 + status endpoint ou SSE |
| `await` sequencial para ops independentes | Latencia acumulada | `Promise.all` |
| Background jobs sem retry | Falhas silenciosas, dados perdidos | Retry com backoff exponencial |
| Sem dead-letter queue | Jobs falhos desaparecem | DLQ para analise e reprocessamento |
| `Promise.all` com dependencias | Race conditions, erros confusos | Separar dependentes e independentes |
| Background sem monitoramento | Falhas invisíveis em producao | Alertas, dashboards, logs |

## Checklist de Verificacao

- [ ] Endpoints com > 1s de resposta analisados para oportunidades de background
- [ ] Operacoes independentes usam execucao paralela (`Promise.all` ou equivalente)
- [ ] Background jobs tem retry com backoff exponencial
- [ ] Dead-letter queue configurada para jobs que falharam apos retries
- [ ] Usuario recebe feedback adequado (202 + status endpoint, ou SSE)
- [ ] `Promise.allSettled` usado quando falha parcial e aceitavel
- [ ] Monitoramento e alertas configurados para filas e jobs
- [ ] Jobs criticos sao idempotentes (retry seguro)
- [ ] Timeout definido para jobs de longa duracao

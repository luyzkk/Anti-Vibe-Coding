# Webhook Security — Referencia Detalhada

## HMAC Signature Validation

Todo webhook recebido DEVE ter sua assinatura HMAC validada antes de processar o payload. Sem validacao, qualquer pessoa pode enviar webhooks falsos para o endpoint.

### Fluxo de Validacao

```
1. Extrair signature do header (ex: x-hub-signature-256, stripe-signature)
2. Obter rawBody do request (ANTES de JSON.parse)
3. Recalcular HMAC do rawBody com webhook secret
4. Comparar com crypto.timingSafeEqual()
5. Rejeitar com 403 se invalido ou ausente
```

### Implementacao de Referencia

```typescript
import crypto from 'crypto';

function validateWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string
): boolean {
  // 1. Rejeitar se assinatura ausente
  if (!signature) {
    return false;
  }

  // 2. Recalcular HMAC
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // 3. Comparar com timingSafeEqual (constant-time)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    // Buffers de tamanho diferente = invalido
    return false;
  }
}

// No handler
app.post('/webhooks/provider', (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;

  if (!validateWebhookSignature(req.rawBody, signature, WEBHOOK_SECRET)) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  // Processar payload APENAS apos validacao
  const payload = JSON.parse(req.rawBody.toString());
  // ...
});
```

---

## rawBody: Preservar o Body Original

CRITICO: Validar HMAC requer o body EXATAMENTE como recebido (bytes originais). Se o framework ja parseou o JSON, o HMAC vai falhar porque `JSON.stringify(JSON.parse(body))` pode diferir do body original.

### Express

```typescript
// Preservar rawBody
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));
```

### Next.js (App Router)

```typescript
// route.ts
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  // Validar com rawBody (string)
  // ...

  const payload = JSON.parse(rawBody);
}
```

### Frameworks que Auto-Parsam

Se o framework auto-parseia o body e nao oferece acesso ao raw, configurar middleware que capture os bytes ANTES do parse.

---

## timingSafeEqual: Por Que e Obrigatorio

Comparar signatures com `===` vaza informacao de timing. Atacante mede o tempo de resposta para descobrir a signature correta byte a byte.

**Como funciona o ataque:**

```
Signature correta: "abc123def456"
Tentativa 1: "xxx..." — falha no 1o char — resposta em 0.1ms
Tentativa 2: "axx..." — falha no 2o char — resposta em 0.15ms
Tentativa 3: "abx..." — falha no 3o char — resposta em 0.2ms
...
Apos N tentativas, atacante reconstroi a signature completa.
```

**`crypto.timingSafeEqual`** compara TODOS os bytes independentemente de onde a diferenca ocorre. O tempo de execucao e CONSTANTE.

**Anti-patterns:**

```typescript
// VULNERAVEL — timing attack
if (signature === expectedSignature) { ... }

// VULNERAVEL — verificar apenas presenca
if (req.headers['x-signature']) { process() }

// VULNERAVEL — substring
if (signature.startsWith(expected.substring(0, 10))) { ... }
```

---

## Rejeitar Requests Sem Assinatura

Se o header de assinatura estiver AUSENTE, rejeitar imediatamente. NAO processar "por via das duvidas".

**Anti-patterns:**

```typescript
// VULNERAVEL — processa sem assinatura
if (!signature) {
  console.warn('No signature, processing anyway');
  processWebhook(payload); // NUNCA fazer isso
}

// VULNERAVEL — skip em dev
if (process.env.NODE_ENV === 'development') {
  processWebhook(payload); // Cria habito inseguro
}

// VULNERAVEL — confianca em IP
if (trustedIPs.includes(req.ip)) {
  processWebhook(payload); // IP pode ser spoofed
}
```

**Correto:**

```typescript
// Handler deve retornar 401/403 se:
// 1. Header de assinatura ausente
// 2. Assinatura invalida
// 3. Timestamp muito antigo (replay protection)

if (!signature) {
  return res.status(401).json({ error: 'Missing signature' });
}

if (!isValidSignature) {
  return res.status(403).json({ error: 'Invalid signature' });
}
```

---

## Replay Protection

Alguns providers incluem timestamp no header ou payload. Verificar que o webhook nao e uma replay de um request antigo.

### Implementacao

```typescript
function isReplayAttack(timestamp: number, toleranceSeconds: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);
  return age > toleranceSeconds; // Rejeitar se > 5 minutos
}
```

### Idempotencia

Webhooks podem ser enviados mais de uma vez (retry do provider). Implementar idempotencia:

```typescript
// Armazenar IDs de webhooks ja processados
async function isAlreadyProcessed(webhookId: string): Promise<boolean> {
  const exists = await redis.get(`webhook:${webhookId}`);
  if (exists) return true;

  // Marcar como processado com TTL (ex: 24h)
  await redis.set(`webhook:${webhookId}`, '1', 'EX', 86400);
  return false;
}
```

---

## Providers Comuns: Headers de Assinatura

| Provider | Header | Algoritmo |
|----------|--------|-----------|
| GitHub | `x-hub-signature-256` | HMAC-SHA256 |
| Stripe | `stripe-signature` | HMAC-SHA256 (formato proprio) |
| Shopify | `x-shopify-hmac-sha256` | HMAC-SHA256 (Base64) |
| Twilio | `x-twilio-signature` | HMAC-SHA1 (Base64) |
| PagSeguro | `x-signature` | HMAC-SHA256 |

### Stripe: Formato Especial

Stripe usa formato proprio com timestamp integrado:

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Usar a lib oficial — ela faz validacao + replay protection
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  WEBHOOK_ENDPOINT_SECRET
);
```

**Regra:** Sempre preferir a SDK oficial do provider quando disponivel. A SDK ja implementa validacao correta, replay protection e edge cases.

---

## Checklist de Webhook Security

- [ ] HMAC signature validada em TODOS os endpoints de webhook
- [ ] Comparacao de signature usa `crypto.timingSafeEqual()`
- [ ] Requests sem header de assinatura retornam 401
- [ ] Requests com assinatura invalida retornam 403
- [ ] rawBody preservado antes de JSON parse
- [ ] Webhook secret armazenado em variavel de ambiente (nao hardcoded)
- [ ] Replay protection implementada (quando provider suporta timestamp)
- [ ] Idempotencia implementada (webhooks podem ser reenviados)
- [ ] Logs de auditoria para webhooks recebidos (validos e invalidos)
- [ ] Rate limiting no endpoint de webhook (prevenir flood)
- [ ] Validacao em desenvolvimento (NAO skip em dev/staging)

---

## Auditoria de Endpoints de Webhook

Para auditar endpoints de webhook em um codebase:

```bash
# 1. Encontrar endpoints de webhook
grep -rE "webhook|/hooks/|callback|/notify" --include="*.ts" --include="*.js" -l

# 2. Para cada arquivo, verificar se usa timingSafeEqual
grep -rE "timingSafeEqual" --include="*.ts" --include="*.js" -l

# 3. Verificar se rejeita requests sem assinatura
grep -rE "401|403|Unauthorized|Forbidden" --include="*.ts" --include="*.js"

# 4. Verificar se webhook secret esta em env
grep -rE "WEBHOOK.*SECRET|WEBHOOK.*KEY" --include="*.ts" --include="*.js" --include="*.env*"
```

Se um endpoint de webhook NAO aparece nos resultados de `timingSafeEqual`, e uma vulnerabilidade que precisa de correcao imediata.

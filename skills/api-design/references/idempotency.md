# Idempotencia — Referencia Completa

## Conceito

Uma operacao e idempotente quando executa-la multiplas vezes produz o mesmo resultado que executa-la uma vez. Critico para sistemas distribuidos onde retries sao inevitaveis.

## Verbos HTTP e Idempotencia

| Verbo | Idempotente por spec? | Na pratica | Observacao |
|-------|----------------------|------------|------------|
| **GET** | Sim | Sim (se bem implementado) | Nunca deve ter side-effects |
| **PUT** | Sim | Sim (substituicao completa) | Deve substituir recurso inteiro |
| **DELETE** | Sim | Sim | Deletar algo ja deletado = mesmo estado |
| **POST** | NAO | Requer implementacao explicita | Mais critico — sempre avaliar |
| **PATCH** | Ambiguo | Depende da implementacao | `set balance = 100` (sim) vs `increment + 10` (nao) |

**ALERTA:** NAO confiar apenas na especificacao REST. Verificar a implementacao real. Um PUT que faz `UPDATE ... SET counter = counter + 1` NAO e idempotente, apesar de PUT ser "idempotente por spec".

## Estrategias de Implementacao

### Estrategia 1 — Chave de Idempotencia (UUID)

Fluxo:
1. Front-end gera UUID antes do request
2. Envia no header: `Idempotency-Key: <uuid>`
3. Back-end verifica se chave ja existe no banco
4. Se existe: retorna resultado armazenado sem re-executar
5. Se nao existe: executa, armazena resultado com a chave, retorna

```
// Middleware de idempotencia (conceitual)
async function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key']
  if (!key) return next()  // Sem chave = execucao normal

  const existing = await db.idempotencyKeys.findUnique({ where: { key } })
  if (existing) {
    // Retorna resultado armazenado
    return res.status(existing.statusCode).json(existing.responseBody)
  }

  // Executa e armazena resultado
  const originalJson = res.json.bind(res)
  res.json = async (body) => {
    await db.idempotencyKeys.create({
      data: { key, statusCode: res.statusCode, responseBody: body, expiresAt: addHours(24) }
    })
    return originalJson(body)
  }
  next()
}
```

**Quando usar:** Operacoes financeiras, criacao de recursos criticos, qualquer POST com side-effects.

### Estrategia 2 — Chave Composta

Combinar campos que tornam a operacao unica:
- `valor + moeda + usuario + destino + tipo + janela_temporal`

**Quando usar:** Webhooks, filas de mensagens, cenarios onde o front-end nao pode gerar UUID.

```
// Exemplo: prevenir pagamento duplicado via chave composta
const compositeKey = `${userId}:${amount}:${currency}:${recipientId}:${type}`
const windowStart = startOfMinute(new Date())

const existing = await db.transactions.findFirst({
  where: { compositeKey, createdAt: { gte: windowStart } }
})

if (existing) return existing  // Ja processado nesta janela
```

### Estrategia 3 — Unique Constraint no Banco

Para casos simples, uma constraint de unicidade pode ser suficiente:

```sql
-- Constraint que previne duplicatas
ALTER TABLE orders ADD CONSTRAINT unique_order_ref
  UNIQUE (user_id, external_reference);
```

Capturar o erro de unicidade e tratar como "ja processado":

```
try {
  await db.orders.create({ data: orderData })
} catch (error) {
  if (isUniqueConstraintError(error)) {
    return await db.orders.findUnique({ where: { externalRef: orderData.externalRef } })
  }
  throw error
}
```

## Decision Tree: Qual Estrategia Usar?

```
Operacao envolve dinheiro?
  SIM →
    Front-end controla o request?
      SIM → Chave UUID (header Idempotency-Key)
      NAO (webhook/fila) → Chave Composta
  NAO →
    Operacao tem side-effects irreversiveis?
      SIM → Chave UUID ou Composta
      NAO →
        Basta prevenir duplicatas?
          SIM → Unique Constraint no banco
          NAO → Implementacao custom (avaliar caso a caso)
```

## Anti-Patterns

- Confiar que "retry nao vai acontecer" (vai, especialmente com timeout de rede)
- Usar auto-increment ID como chave de idempotencia (ID so existe DEPOIS da criacao)
- Nao armazenar o resultado — apenas marcar como "ja processado" sem retornar a resposta original
- Chave de idempotencia sem TTL (tabela cresce indefinidamente)
- Idempotencia apenas no application layer sem proteção no banco (race conditions)
- Ignorar idempotencia em webhooks (o emissor VAI reenviar em caso de falha)

## Consideracoes de TTL

| Tipo de operacao | TTL recomendado |
|------------------|-----------------|
| Financeira | 24-72 horas |
| Criacao de recurso | 1-24 horas |
| Notificacao (email/SMS) | 1-6 horas |
| Idempotencia de webhook | 7 dias (ou conforme SLA do emissor) |

## Checklist de Verificacao

- [ ] Operacoes financeiras tem chave de idempotencia
- [ ] Chave e armazenada no banco com o resultado completo
- [ ] Requests duplicados retornam o resultado original (nao re-executam)
- [ ] TTL definido para limpeza de chaves antigas
- [ ] Webhooks handlers sao idempotentes
- [ ] Race conditions tratadas (lock ou unique constraint)
- [ ] Erros de unicidade tratados graciosamente (retornam recurso existente)
- [ ] Front-end gera UUID antes de enviar requests criticos

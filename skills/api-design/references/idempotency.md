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
3. Back-end RESERVA a chave no banco, com UNIQUE, antes de executar
4. Se a reserva falhou porque a chave existe: devolve o resultado guardado, ou 409 se ainda esta em processamento
5. Se a reserva venceu: executa uma unica vez e grava o resultado na linha reservada

Consultar se a chave existe e so depois gravar NAO funciona: dois requests simultaneos com a mesma
chave passam juntos pela consulta e os dois executam. Quem decide e o UNIQUE do banco.

```
// Idempotencia por chave (conceitual): reservar ANTES de executar
async function withIdempotency(key, execute) {
  // 1. Reservar. So um request vence a corrida pelo UNIQUE(key)
  const reserved = await db.query(
    `INSERT INTO idempotency_keys (key, status, expires_at)
     VALUES ($1, 'processing', now() + interval '24 hours')
     ON CONFLICT (key) DO NOTHING
     RETURNING key`,
    [key],
  )

  if (reserved.rowCount === 0) {
    const row = await db.query(
      `SELECT status, status_code, response_body FROM idempotency_keys WHERE key = $1`, [key])
    if (row.status === 'done') return { statusCode: row.status_code, body: row.response_body }
    return { statusCode: 409, body: { error: 'Request com esta chave ainda em processamento' } }
  }

  // 2. Executar uma unica vez e guardar o resultado na linha reservada
  try {
    const result = await execute()
    await db.query(
      `UPDATE idempotency_keys SET status = 'done', status_code = $2, response_body = $3 WHERE key = $1`,
      [key, result.statusCode, result.body],
    )
    return result
  } catch (error) {
    // Falhou antes de produzir efeito: libera a chave para o cliente tentar de novo
    await db.query(`DELETE FROM idempotency_keys WHERE key = $1 AND status = 'processing'`, [key])
    throw error
  }
}
```

**Quando usar:** Operacoes financeiras, criacao de recursos criticos, qualquer POST com side-effects.

### Estrategia 2 — Chave Composta

Combinar campos que tornam a operacao unica:
- `valor + moeda + usuario + destino + tipo + janela_temporal`

**Quando usar:** filas e integracoes que nao trazem id proprio, e cenarios onde o front-end nao pode
gerar UUID. Para webhook, use o id do evento do emissor (por exemplo `event.id` da Stripe) com UNIQUE:
ele e estavel entre reenvios, e uma chave composta nao e.

```
// Exemplo: prevenir pagamento duplicado via chave composta, com a janela DENTRO da chave
// e a restricao unica no banco (nunca consultar e depois gravar)
const window = format(startOfMinute(new Date()), 'yyyyMMddHHmm')
const compositeKey = `${userId}:${amount}:${currency}:${recipientId}:${type}:${window}`

const inserted = await db.query(
  `INSERT INTO transactions (composite_key, user_id, amount, currency)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (composite_key) DO NOTHING
   RETURNING id`,
  [compositeKey, userId, amount, currency],
)
if (inserted.rowCount === 0) return  // ja processado nesta janela
```

Limite da janela: dois requests que caem um de cada lado da virada do minuto geram chaves
diferentes. A janela reduz duplicatas, nao elimina. Quando o cliente puder mandar UUID, prefira.

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
      SIM → Chave UUID (header Idempotency-Key), reservada com UNIQUE
      NAO, e webhook → id do evento do emissor com UNIQUE
      NAO, e fila sem id proprio → Chave Composta com UNIQUE
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
- Consultar se a chave existe e so depois gravar: dois requests simultaneos passam juntos pela consulta
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

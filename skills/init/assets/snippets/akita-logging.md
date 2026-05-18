## Logging

**JSON estruturado para debug/observabilidade; plain text apenas para CLI output.**

```typescript
// Debug/observabilidade — JSON estruturado
logger.info({ event: 'invoice.charged', invoiceId, customerId, amountCents, attempt })
logger.error({ event: 'stripe.charge.failed', invoiceId, error: err.message, code: err.code })

// CLI output — plain text legível
console.log(`Charged ${invoiceCount} invoices in ${elapsedMs}ms`)
```

```python
# Python — structlog ou logging com extra
import structlog
log = structlog.get_logger()
log.info("invoice.charged", invoice_id=invoice_id, customer_id=customer_id, amount_cents=amount_cents)
```

```ruby
# Ruby — structured hash
Rails.logger.info({ event: 'invoice.charged', invoice_id:, customer_id:, amount_cents: }.to_json)
```

**Campos obrigatórios em eventos de negócio:** `event` (nome do evento), entidade principal (id), resultado.  
**Nunca logar:** senhas, tokens, PII sem mascaramento, stack traces completas em produção.

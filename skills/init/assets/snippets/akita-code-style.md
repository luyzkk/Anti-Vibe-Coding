## Code Style for Agents

Convenções obrigatórias para código gerado por IA:

- **Nomes grepáveis:** use nomes específicos ao domínio. NUNCA: `data`, `handler`, `process`, `item`, `info`, `result`, `value`, `temp`, `obj`
- **Funções ≤ 40 linhas:** se ultrapassar, extraia função com nome descritivo
- **Arquivos ≤ 500 linhas:** se ultrapassar, divida em módulos com responsabilidade única
- **SRP obrigatório:** uma função, uma responsabilidade. Side effects explícitos e isolados
- **Tipos explícitos:** sem `any`. Use `unknown` + type guard quando o tipo é incerto

```typescript
// TS/JS
// ERRADO
async function process(data: any) { ... }

// CERTO
async function chargeSubscriptionRenewal(invoice: InvoicePayload): Promise<ChargeResult> { ... }
```

```python
# Python
# ERRADO
def handle(data):
    ...

# CERTO
def send_overdue_payment_reminder(invoice: Invoice) -> NotificationResult:
    ...
```

```ruby
# Ruby
# ERRADO
def process(data)
  ...
end

# CERTO
def expire_unpaid_subscription(subscription:)
  ...
end
```

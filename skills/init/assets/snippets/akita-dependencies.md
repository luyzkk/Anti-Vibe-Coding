## Dependencies

**Injeção de dependência via constructor/parameter — nunca instanciar internamente.**

```typescript
// ERRADO — acoplamento direto, impossível de testar
class InvoiceService {
  private stripe = new Stripe(process.env.STRIPE_KEY!)
}

// CERTO — DI via constructor
class InvoiceService {
  constructor(private readonly stripe: StripeClient) {}
}
```

```python
# Python — DI via parâmetro
# ERRADO
class InvoiceService:
    def __init__(self):
        self.stripe = Stripe(os.environ['STRIPE_KEY'])

# CERTO
class InvoiceService:
    def __init__(self, stripe: StripeClient):
        self.stripe = stripe
```

```ruby
# Ruby — DI via keyword argument
# ERRADO
class InvoiceService
  def initialize
    @stripe = Stripe::Client.new(ENV['STRIPE_KEY'])
  end
end

# CERTO
class InvoiceService
  def initialize(stripe:)
    @stripe = stripe
  end
end
```

Serviços externos (banco, APIs, filas) são sempre injetados — nunca instanciados dentro de classes de negócio.

# CLAUDE.md

<!-- 2026-05-18 (Luiz/dev): fixture inverted-merge para CA-13 + CA-14 (Plano 07 fase-02). -->
<!-- 287 linhas para exercitar classifier, secrets-scan, propose-merge, apply-merge, move-docs. -->

## Code Style for Agents

Convencoes obrigatorias para codigo gerado por IA:

- Nomes grepaveis: use nomes especificos ao dominio. NUNCA: data, handler, process, item
- Funcoes <= 40 linhas: se ultrapassar, extraia funcao com nome descritivo
- Arquivos <= 500 linhas: se ultrapassar, divida em modulos com responsabilidade unica
- SRP obrigatorio: uma funcao, uma responsabilidade. Side effects explicitos e isolados
- Tipos explicitos: sem any. Use unknown + type guard quando o tipo e incerto

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

## Comments

Escreva o WHY. Nunca o WHAT.

Comente quando:
- Proveniencia: via Stripe docs par. 3.2 - idempotency key obrigatorio aqui
- Decisao nao obvia: usar created_at em vez de updated_at - muda em reindexacoes
- Workaround: SDK retorna 200 em falha silenciosa (issue hash4821)
- Referencia a bug: bug hash1234: race condition se chamar sem lock
- Constraint externo: limite da API: max 100 itens por batch
- Docstrings em funcoes publicas: sempre - parametros, retorno, excecoes esperadas

NUNCA comente:
- O que o codigo ja diz: i += 1 - incrementa i
- Nomes redundantes: calcula total acima de calculateTotal()
- Codigo comentado (morto): delete, o git guarda o historico

Em refactor por IA: nao podar comentarios do tipo WHY. Se um comentario explicar uma
decisao ou workaround, ele sobrevive a refatoracao mesmo que o codigo ao redor mude.

## Tests

Seguir F.I.R.S.T:
- Fast: testes unitarios em menos de 50ms cada
- Independent: sem dependencia de ordem ou estado compartilhado entre testes
- Repeatable: mesmo resultado em qualquer ambiente (sem clock real, sem rede real)
- Self-validating: passa ou falha - sem interpretacao manual
- Timely: escrito ANTES do codigo de producao (TDD)

Cobertura minima:
- Logica de negocio: >= 95%
- Global: >= 80%
- Branch (condicionais): >= 70%

Testes headless: sem UI real, sem rede real, sem banco real.
Nomes: verbo descritivo, sem should. Ex: returns 401 when token expired.

## Dependencies

Injecao de dependencia via constructor/parameter - nunca instanciar internamente.

```typescript
// ERRADO - acoplamento direto, impossivel de testar
class InvoiceService {
  private stripe = new Stripe(process.env.STRIPE_KEY)
}

// CERTO - DI via constructor
class InvoiceService {
  constructor(private readonly stripe: StripeClient) {}
}
```

```python
# Python - DI via parametro
# ERRADO
class InvoiceService:
    def __init__(self):
        self.stripe = StripeLib(os.environ.get('STRIPE_KEY'))

# CERTO
class InvoiceService:
    def __init__(self, stripe: StripeClient):
        self.stripe = stripe
```

```ruby
# Ruby - DI via keyword argument
# ERRADO
class InvoiceService
  def initialize
    @stripe = Stripe::Client.new(ENV.fetch('STRIPE_KEY'))
  end
end

# CERTO
class InvoiceService
  def initialize(stripe:)
    @stripe = stripe
  end
end
```

Servicos externos (banco, APIs, filas) sao sempre injetados.

## Logging

JSON estruturado para debug/observabilidade; plain text apenas para CLI output.

```typescript
// Debug/observabilidade - JSON estruturado
logger.info({ event: 'invoice.charged', invoiceId, customerId, amountCents, attempt })
logger.error({ event: 'stripe.charge.failed', invoiceId, error: err.message, code: err.code })

// CLI output - plain text legivel
console.log('Charged N invoices in Xms')
```

```python
import structlog
log = structlog.get_logger()
log.info('invoice.charged', invoice_id=invoice_id, customer_id=customer_id)
```

```ruby
Rails.logger.info({ event: invoice_charged, invoice_id:, customer_id: }.to_json)
```

Campos obrigatorios: event (nome do evento), entidade principal (id), resultado.
Nunca logar: senhas, tokens, PII sem mascaramento, stack traces em producao.

## Environment Variables

Configurar via .env - nunca hardcodear valores em producao.

Variaveis esperadas pelo sistema:

```env
DATABASE_URL=<<DATABASE_URL>>
REDIS_URL=<<REDIS_URL>>
JWT_SECRET=<<JWT_SECRET>>
SMTP_HOST=<<SMTP_HOST>>
SMTP_PORT=587
APP_BASE_URL=<<APP_BASE_URL>>
NODE_ENV=development
LOG_LEVEL=info
```

Regras:
- Nunca commitar .env ao repositorio - apenas .env.example
- Cada servico le apenas as variaveis que precisa

## Security Rules

Autenticacao e autorizacao:

- JWT: verificar assinatura + expiracao em TODA request autenticada
- CORS: whitelist explicita - nunca wildcard em producao
- Rate limiting: aplicar em endpoints de autenticacao e APIs publicas
- Secrets: nunca logar tokens, senhas ou chaves de API
- Inputs: validar e sanitizar TODA entrada de usuario antes de processar
- SQL: usar queries parametrizadas - nunca interpolacao de strings em SQL
- HTTPS: forcar TLS em producao via HSTS; redirecionar HTTP para HTTPS

Sessoes e tokens:

- Expirar tokens de acesso em <= 1h; refresh tokens em <= 7d
- Invalidar sessoes no logout - nao confiar apenas em expiracao
- Armazenar tokens em httpOnly cookies em browser (nao localStorage)

Auditoria: logar criacao, atualizacao e delecao com userId + timestamp
Incidentes: manter runbook em docs/SECURITY.md atualizado

## Architecture Rules

Separacao de concerns:

- Controllers: recebem request, delegam para service, retornam response
- Services: logica de negocio - sem acoplamento a framework/HTTP
- Repositories: persistencia - isolam o banco do service layer
- DTOs: contratos explicitos de input/output entre camadas

Modulos:

- Coesao alta, acoplamento baixo - cada modulo tem responsabilidade unica
- Dependencias unidirecionais: camada superior depende da inferior, nunca o contrario
- Shared kernel: tipos e interfaces em shared/ - sem logica de negocio

Design patterns:

- Repository pattern para acesso a dados
- Factory para criacao de objetos complexos
- Strategy para variacoes de algoritmo
- Observer para eventos de dominio

ADRs: cada decisao arquitetural relevante - formato padrao em docs/design-docs/
Pipeline: grill-me > write-prd > plan-feature > execute-plan > verify-work
Review: anti-vibe-review antes de qualquer merge em main

## API Design

REST - convencoes:

- Recursos no plural: /users, /invoices, /products
- Verbos HTTP corretos: GET (leitura), POST (criacao), PUT/PATCH (atualizacao), DELETE
- Status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized
- Respostas consistentes: sempre JSON com envelope data, meta, errors

Idempotencia:

- POST com Idempotency-Key header para operacoes criticas
- PUT e idempotente por definicao - garantir no service layer
- DELETE: retornar 204 mesmo se recurso ja inexiste

Rate limiting:

- Documentar limites no header X-RateLimit-Limit, X-RateLimit-Remaining
- Retornar 429 Too Many Requests com Retry-After

Versionamento: via path prefix /v1/, /v2/ - nunca query string
Paginacao: cursor-based para datasets grandes (evitar OFFSET para N > 10k)
DTOs: validar com schema explicito (Zod) antes de qualquer processamento
N+1: proibido em producao - usar eager loading ou DataLoader
Documentacao: OpenAPI spec em docs/api.yaml - manter atualizado

## Database Rules

Migrations:

- Migrations sempre reversiveis (up + down)
- Nunca mutar colunas em producao com locking; usar additive migrations
- Backfill em background job, nunca em migration sincrona
- Naming: YYYYMMDDHHMMSS_describe_change.ts

Indices:

- Indice em toda FK e campo usado em WHERE/JOIN frequente
- Indice composto: ordem importa - campo mais seletivo primeiro
- EXPLAIN ANALYZE antes de qualquer query em tabela > 100k rows

Conexoes:

- Pool de conexoes obrigatorio em producao (min: 2, max: 20 por processo)
- Health check: /health deve verificar conexao ao banco
- Read replicas: queries de leitura pesada devem usar replica

## Front-end Rules

- Acessibilidade WCAG 2.0: todos os componentes interativos precisam de aria-* corretos
- Data fetching: usar TanStack Query - nunca fetch em useEffect
- State: estado local primeiro; Zustand/Context apenas quando estado e compartilhado
- Performance: lazy load rotas e componentes pesados; sem waterfall de requests
- Testes: componentes com Testing Library; evitar selectors frageis (className, id)
- Imagens: sempre com alt descritivo; lazy load via loading=lazy
- Forms: validacao client-side com Zod; nunca confiar apenas em validacao client-side
- CSS: utility classes (Tailwind) preferidas; evitar CSS-in-JS sem necessidade real
- Bundle: tree-shaking habilitado; verificar bundle size antes de adicionar dependencia
- Error handling: boundaries de erro em componentes criticos; nunca swallow erros silenciosamente
- Internacionalizacao: usar i18n library (next-intl, react-i18next) para textos ao usuario

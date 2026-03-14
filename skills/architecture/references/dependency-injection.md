# Dependency Injection — Referencia Completa

Guia aprofundado sobre Dependency Inversion Principle (DIP) e Dependency Injection (DI). Dois conceitos distintos frequentemente confundidos.

---

## 1. DIP vs DI — Conceitos Distintos

### Dependency Inversion Principle (DIP)

**PRINCIPIO** do SOLID (o "D"). Estabelece que:

- Modulos de alto nivel (logica de negocio, core) NAO devem depender de modulos de baixo nivel (SDKs, APIs externas, banco de dados)
- Ambos devem depender de **abstracoes** (interfaces)

A "inversao" e na direcao da dependencia: em vez do core depender do servico externo, o servico externo se adapta ao core via interface.

```
SEM DIP:
  CreditService → StripeSDK (core depende do detalhe externo)

COM DIP:
  CreditService → IPaymentProvider ← StripeService
  (core depende da abstracao, detalhe externo implementa a abstracao)
```

### Dependency Injection (DI)

**TECNICA** (design pattern) que fornece dependencias externamente em vez de instancia-las internamente. E o mecanismo que operacionaliza o DIP na pratica.

```
SEM DI:
  class CreditService {
    private provider = new StripeService()  // instancia internamente
  }

COM DI:
  class CreditService {
    constructor(private provider: IPaymentProvider) {}  // recebe externamente
  }
```

### Relacao entre DIP e DI

| Conceito | Tipo | Pergunta que responde |
|----------|------|-----------------------|
| DIP | Principio | "De QUEM meu codigo deve depender?" (abstracoes, nao detalhes) |
| DI | Tecnica | "COMO fornecer essas dependencias?" (injecao externa) |

DIP sem DI: possivel, mas exige instanciacao manual. DI sem DIP: possivel, mas injeta concretos em vez de abstracoes (perde a flexibilidade).

---

## 2. Formas de Injecao

### Constructor Injection (PADRAO — usar por default)

Dependencias sao recebidas como parametros do constructor.

```typescript
class OrderService {
  constructor(
    private readonly paymentProvider: IPaymentProvider,
    private readonly emailService: IEmailService,
    private readonly logger: ILogger
  ) {}

  async placeOrder(order: Order): Promise<Result> {
    const payment = await this.paymentProvider.charge(order.total)
    await this.emailService.sendConfirmation(order)
    this.logger.info({ orderId: order.id, status: 'placed' })
    return { success: true }
  }
}
```

**Vantagens:**
- Dependencias visiveis na assinatura — impossivel criar instancia sem elas
- Objeto SEMPRE em estado valido apos construcao
- Facil de testar — passar mocks no constructor
- Imutavel — dependencias definidas na criacao, nao mudam

**Quando usar:** SEMPRE como escolha padrao. Cobrir 90%+ dos casos.

### Method Injection

Dependencia passada como parametro de um metodo especifico.

```typescript
class ReportGenerator {
  generateReport(data: ReportData, formatter: IFormatter): string {
    const processed = this.processData(data)
    return formatter.format(processed)  // formatter varia por chamada
  }
}

// Uso
generator.generateReport(data, new PDFFormatter())
generator.generateReport(data, new CSVFormatter())
```

**Quando usar:** quando a dependencia varia por CHAMADA, nao por instancia. Exemplo: diferentes formatadores para o mesmo gerador de relatorios.

### Property Injection (EVITAR)

Dependencia atribuida apos construcao via setter ou propriedade publica.

```typescript
class NotificationService {
  logger?: ILogger  // pode ser undefined!

  notify(message: string) {
    this.logger?.info(message)  // precisa checar null toda vez
  }
}

// Uso
const service = new NotificationService()
service.logger = new ConsoleLogger()  // e se esquecer?
```

**Problemas:**
- Objeto pode existir em estado INVALIDO (sem a dependencia)
- Facil de esquecer a atribuicao
- Null checks espalhados pelo codigo
- Ordem de execucao importa (acoplamento temporal)

**Quando usar:** Quase nunca. Unico caso valido: dependencias genuinamente opcionais com comportamento default sensato (ex: logger com no-op default).

---

## 3. IoC Containers

### O que e um IoC Container

Inversion of Control Container — componente que gerencia automaticamente a criacao de instancias e injecao de dependencias. O desenvolvedor registra "qual interface mapeia para qual implementacao", e o container resolve tudo automaticamente.

```
// Registro (configuracao)
container.register(IPaymentProvider, StripeService)
container.register(IEmailService, ResendService)
container.register(ILogger, PinoLogger)

// Resolucao (automatica)
// Quando OrderService e solicitado, container:
//   1. Ve que OrderService precisa de IPaymentProvider, IEmailService, ILogger
//   2. Resolve cada um para sua implementacao registrada
//   3. Cria OrderService com todas as dependencias injetadas
```

### Frameworks com IoC Container Nativo

| Framework | Linguagem | Mecanismo |
|-----------|-----------|-----------|
| NestJS | TypeScript | Decorators + Reflect metadata |
| Spring | Java | Annotations (@Autowired, @Component) |
| Angular | TypeScript | Decorators (@Injectable) |
| .NET | C# | Built-in DI container |

Nestes frameworks, o desenvolvedor NUNCA faz `new Controller()` ou `new Service()` — o container faz tudo.

### Frameworks SEM IoC Container Nativo

| Framework | Linguagem | Alternativa |
|-----------|-----------|-------------|
| Express | TypeScript/JS | Manual DI, TSyringe, InversifyJS |
| Fastify | TypeScript/JS | Manual DI, TSyringe |
| Hono | TypeScript/JS | Manual DI |
| Elysia | TypeScript/JS | Manual DI |

Para estes, DI manual (constructor injection) funciona perfeitamente para projetos de ate media complexidade.

### Arvore de Decisao — IoC Container vale a pena?

```
Quantas classes com dependencias tem o projeto?
  < 10 → DI manual (constructor injection) resolve bem
  10-50 → DI manual funciona, container e opcional
  50+ → Container comecar a fazer sentido
    Time ja usa framework com container nativo?
      SIM → Usar o container do framework (NestJS, Spring, etc.)
      NAO → Avaliar se a complexidade do container se justifica
            Projeto tem muitas variacoes de implementacao por ambiente?
              SIM → Container facilita (dev vs staging vs prod)
              NAO → DI manual provavelmente e suficiente
```

---

## 4. Arvore de Decisao — Quando Usar DI

```
A classe depende de servico externo (API, banco, email, pagamento)?
  SIM → USAR DI + DIP (interface + injecao)
        Isso e boundary arquitetural — desacoplamento e critico
  NAO → A classe precisa ser testada com mocks?
    SIM → USAR DI (injecao sem necessariamente criar interface)
          Injetar a dependencia concreta permite substituir em testes
    NAO → A dependencia pode mudar no futuro?
      SIM → USAR DI + DIP (interface + injecao)
            Prepare para troca futura sem reescrever
      NAO → Instanciacao direta (new) esta OK
            Nao adicione complexidade sem motivo
```

### Regra Pragmatica

**Aplicar DI/DIP em boundaries arquiteturais.** Nao em TUDO.

- **SIM para:** pagamento, email, storage, cache, autenticacao, logging, qualquer SDK externo
- **NAO para:** utils internas, helpers puros, value objects, tipos de dominio
- **DEPENDE:** repositorios (se o banco pode mudar, sim; se e PostgreSQL para sempre, talvez nao)

---

## 5. Anti-Patterns

### Service Locator (Anti-Pattern)

Em vez de receber dependencias, a classe BUSCA em um registro global.

```typescript
// ANTI-PATTERN: Service Locator
class OrderService {
  placeOrder(order: Order) {
    const payment = ServiceLocator.get<IPaymentProvider>('payment')  // busca global
    const email = ServiceLocator.get<IEmailService>('email')          // busca global
    // ...
  }
}
```

**Problemas:**
- Dependencias OCULTAS — olhar a assinatura do constructor nao mostra nada
- Impossivel saber o que a classe precisa sem ler o corpo inteiro
- Testes ficam frageis — precisam configurar o locator global
- Erros em runtime, nao compile-time (o registro pode nao ter a chave)

**Correcao:** Usar constructor injection. Dependencias visiveis na assinatura.

### DI para Tudo (Over-Engineering)

```typescript
// OVER-ENGINEERING: interface para funcao pura sem variacao
interface IStringFormatter {
  capitalize(value: string): string
}

class StringFormatter implements IStringFormatter {
  capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
}

// Isso NUNCA vai mudar de implementacao. Funcao direta e suficiente:
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
```

**Sintoma:** Criar interface + implementacao para funcoes puras, utils, helpers, conversores triviais. Adiciona camadas sem beneficio.

**Regra:** Se so existe UMA implementacao possivel e ela NUNCA vai mudar, nao abstraia. YAGNI.

### Injecao Circular

```
A depende de B, B depende de A → ciclo infinito
```

**Causa raiz:** SRP violado. Se duas classes dependem mutuamente, provavelmente deveriam ser uma so ou existe uma terceira classe escondida.

**Correcao:** Extrair a logica compartilhada para uma terceira classe que ambas dependem.

### Salvar Detalhes Externos no Banco

```typescript
// ANTI-PATTERN: banco acoplado ao Stripe
await db.insert({
  productId: stripe.productId,  // detalhe do Stripe
  priceId: stripe.priceId,      // detalhe do Stripe
})

// Se Stripe mudar productId + priceId → productCatalogId,
// o banco precisa migrar tambem!

// CORRETO: salvar IDs do DOMINIO
await db.insert({
  courseId: course.id,           // ID da aplicacao
  amount: payment.amount,       // valor generico
  providerId: payment.id,       // referencia opaca ao provider
})
```

---

## 6. Exemplo Completo — DIP + DI na Pratica

### Cenario: Site de cursos com gateway de pagamento

```typescript
// 1. Interface definida pelo DOMINIO da aplicacao (nao pelo Stripe/AbacatePay)
interface IPaymentProvider {
  processPayment(document: string, value: number): Promise<PaymentResult>
  getTransactionDetails(transactionId: string): Promise<TransactionDetails>
  downloadReceipt(transactionId: string): Promise<Buffer>
}

// 2. Core da aplicacao depende APENAS da interface
class CreditService {
  constructor(private readonly paymentProvider: IPaymentProvider) {}

  async rechargeCredits(courseId: string, userId: string): Promise<Result> {
    const credits = await this.getCreditsForCourse(courseId)
    const user = await this.getUser(userId)
    // Nao sabe NADA sobre Stripe, AbacatePay, ou qualquer provider
    const result = await this.paymentProvider.processPayment(user.document, credits.price)
    await this.addCreditsToUser(userId, credits.amount)
    return { success: true }
  }
}

// 3. Implementacoes se ADAPTAM a interface da aplicacao
class StripeService implements IPaymentProvider {
  async processPayment(document: string, value: number): Promise<PaymentResult> {
    // Internamente traduz para conceitos do Stripe (productId, priceId)
    const productId = this.getStripeProductId()
    const priceId = this.getStripePriceId(value)
    const charge = await stripe.charges.create({
      product: productId, price: priceId, customer_document: document
    })
    return { id: charge.id, status: charge.status }
  }
}

class AbacatePayService implements IPaymentProvider {
  async processPayment(document: string, value: number): Promise<PaymentResult> {
    // Internamente traduz para conceitos do AbacatePay (pixId)
    const pixId = this.generatePixId()
    const payment = await abacatePay.createPayment({
      pix_id: pixId, user_documents_id: document, amount: value
    })
    return { id: payment.id, status: payment.status }
  }
}

// 4. DI manual (sem IoC container)
const paymentProvider = new StripeService()
const creditService = new CreditService(paymentProvider)

// 5. Trocar provider = mudar UMA linha
const paymentProvider = new AbacatePayService()
const creditService = new CreditService(paymentProvider)
```

### Testes com DI

```typescript
// Mock que implementa a mesma interface
class MockPaymentProvider implements IPaymentProvider {
  async processPayment(document: string, value: number): Promise<PaymentResult> {
    return { id: 'mock-123', status: 'success' }
  }
}

// Teste injeta o mock — sem rede, sem Stripe, sem AbacatePay
const creditService = new CreditService(new MockPaymentProvider())
```

---

## 7. Conexao com Padroes Arquiteturais

| Padrao | Como usa DIP/DI |
|--------|-----------------|
| Clean Architecture | Camadas em "cebola". Dependencias apontam de fora para dentro. Dominio no centro, sem dependencias externas |
| Hexagonal Architecture | Ports (interfaces) e Adapters (implementacoes). Core define ports, adapters implementam |
| Onion Architecture | Variacao de Clean Architecture com enfase nas camadas |

Todos usam o MESMO principio (DIP) aplicado de formas diferentes. A interface entre core e mundo externo e sempre a mesma ideia.

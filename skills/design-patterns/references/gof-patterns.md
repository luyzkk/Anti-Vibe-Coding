# GoF Design Patterns — Referencia Completa

Os 6 patterns mais utilizados na pratica do desenvolvimento web moderno, extraidos dos 23 originais do livro "Gang of Four" (1994). Design patterns sao solucoes reutilizaveis para problemas recorrentes — como plantas de casa testadas milhoes de vezes.

**Regra de ouro:** patterns existem para resolver problemas reais. Se o problema nao existe, o pattern tambem nao precisa ser usado.

---

## 1. Observer Pattern

### Problema que Resolve

Multiplos modulos precisam reagir ao mesmo evento sem se conhecerem diretamente. Sem Observer, cada modulo precisaria chamar os outros explicitamente, criando acoplamento.

### Como Funciona

Um objeto (Subject) mantem uma lista de dependentes (Observers) e os notifica automaticamente quando seu estado muda. O Subject NAO sabe quem esta escutando nem quantos Observers existem.

```typescript
class EventEmitter {
  private listeners: Map<string, Function[]> = new Map()

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  emit(event: string, data?: unknown) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(cb => cb(data))
    }
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback))
    }
  }
}
```

### Exemplos no Mundo Real

| Tecnologia | Uso de Observer |
|------------|----------------|
| DOM | `addEventListener` / `removeEventListener` |
| Node.js | `EventEmitter` (classe nativa) |
| React | `useEffect` observando dependencias, state updates trigando re-renders |
| RxJS | Observables e Subjects |
| WebSocket | `on('message', handler)` |

### Arvore de Decisao

```
Multiplos modulos precisam reagir ao mesmo evento?
  NAO → Chamada direta de funcao resolve
  SIM → Os modulos devem ser desacoplados?
    NAO → Chamada direta com import explicito
    SIM → Observer Pattern
          Eventos sao assincronos?
            SIM → EventEmitter async ou message queue
            NAO → EventEmitter sincrono
```

### Anti-Patterns

- **Event soup:** dezenas de eventos sem documentacao. Ninguem sabe o que triga o que. Fluxo invisivel
- **Esquecer cleanup:** `addEventListener` sem `removeEventListener` = memory leak
- **Observer para tudo:** comunicacao simples entre 2 modulos nao precisa de Observer. Uma chamada direta e mais clara
- **Efeitos colaterais em observers:** observer que modifica estado global ou triga outros eventos criando cascata imprevisivel

---

## 2. Factory Pattern

### Problema que Resolve

Logica de criacao de objetos espalhada pelo codigo. Quando surge um novo tipo, multiplos lugares precisam ser alterados. A Factory centraliza a logica de criacao.

### Como Funciona

Um metodo ou classe especializada decide qual objeto concreto criar baseado em parametros. Quem solicita o objeto nao conhece os detalhes de construcao.

```typescript
// Interface comum
interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>
}

// Implementacoes concretas
class PixProcessor implements PaymentProcessor {
  async process(amount: number) { /* logica PIX */ }
}

class CardProcessor implements PaymentProcessor {
  async process(amount: number) { /* logica cartao */ }
}

class BoletoProcessor implements PaymentProcessor {
  async process(amount: number) { /* logica boleto */ }
}

// Factory centraliza a criacao
class PaymentFactory {
  private static processors: Record<string, () => PaymentProcessor> = {
    pix: () => new PixProcessor(),
    card: () => new CardProcessor(),
    boleto: () => new BoletoProcessor(),
  }

  static create(type: string): PaymentProcessor {
    const creator = this.processors[type]
    if (!creator) throw new Error(`Tipo desconhecido: ${type}`)
    return creator()
  }
}

// Uso — nao sabe qual classe concreta esta usando
const processor = PaymentFactory.create('pix')
await processor.process(100)
```

### Exemplos no Mundo Real

| Tecnologia | Uso de Factory |
|------------|----------------|
| React | `React.createElement()` |
| DOM | `document.createElement('div')` |
| Jest | `jest.fn()` criando mocks |
| Prisma | `prisma.user.create()` |

### Variantes

- **Simple Factory:** funcao ou metodo estatico que cria objetos (exemplo acima)
- **Factory Method:** classe base define o metodo de criacao, subclasses decidem o que criar
- **Abstract Factory:** fabrica que cria familias de objetos relacionados

### Arvore de Decisao

```
Criacao de objetos tem logica condicional (switch/if por tipo)?
  NAO → Instanciacao direta (new) esta OK
  SIM → A logica aparece em mais de 1 lugar?
    NAO → Um if/switch local pode ser suficiente
    SIM → Factory Pattern
          Existem familias de objetos relacionados?
            NAO → Simple Factory
            SIM → Abstract Factory
```

### Anti-Patterns

- **Factory para um unico tipo:** se so existe UMA implementacao, Factory e overengineering
- **Factory com dezenas de tipos:** se o switch tem 20+ cases, provavelmente o design do sistema precisa ser repensado
- **Factory que faz mais do que criar:** Factory deve APENAS criar objetos, nao configurar, validar ou executar logica de negocio

---

## 3. Singleton Pattern

### Problema que Resolve

Recursos que devem ter exatamente UMA instancia (pool de conexoes, configuracao, logger). Multiplas instancias desperdicariam recursos ou causariam inconsistencia.

### Como Funciona

Constructor privado + metodo estatico `getInstance()` que retorna sempre a mesma instancia.

```typescript
class Database {
  private static instance: Database

  private constructor() {
    // conexao com banco — executado apenas UMA vez
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  async query(sql: string): Promise<unknown> {
    // executa query usando a conexao unica
  }
}

// Todos os modulos recebem a MESMA instancia
const db1 = Database.getInstance()
const db2 = Database.getInstance()
// db1 === db2 → true
```

### Exemplos no Mundo Real

| Tecnologia | Uso de Singleton |
|------------|-----------------|
| Prisma | `new PrismaClient()` (recomendado criar uma vez) |
| Winston/Pino | Logger instance |
| Config | `process.env` como config global |
| Redis | Connection pool unico |

### Arvore de Decisao

```
O recurso PRECISA ser unico (conexao, config, logger)?
  NAO → Instanciacao normal, NAO usar Singleton
  SIM → O framework tem IoC Container?
    SIM → Registrar como Singleton no container (NestJS, Spring)
    NAO → Implementar Singleton manual
          CUIDADO: testes precisam resetar o estado?
            SIM → Adicionar metodo reset() para testes
            NAO → Singleton classico
```

### Anti-Patterns

- **Singleton como "variavel global elegante":** usar Singleton para compartilhar estado mutavel entre modulos e anti-pattern. E uma variavel global disfaracada
- **Singleton dificultando testes:** estado persistente entre testes causa flakiness. Sempre ter forma de resetar para testes
- **Singleton para tudo:** usar Singleton como padrao para todas as classes. Apenas recursos genuinamente unicos (DB pool, config, logger)
- **Solucao moderna:** preferir IoC Container do framework. O container gerencia a instancia unica sem os problemas do Singleton manual

---

## 4. Decorator Pattern

### Problema que Resolve

Adicionar responsabilidades a um objeto sem modificar sua classe original. Permite combinar comportamentos de forma flexivel e dinamica.

### Como Funciona

Um Decorator envolve o objeto original mantendo a MESMA interface. A entrada e saida sao do mesmo tipo, permitindo empilhar decorators.

```typescript
interface Notifier {
  send(message: string): Promise<void>
}

// Base
class EmailNotifier implements Notifier {
  async send(message: string) {
    await sendEmail(message)
  }
}

// Decorators — cada um adiciona comportamento sem alterar o original
class SlackDecorator implements Notifier {
  constructor(private readonly wrapped: Notifier) {}

  async send(message: string) {
    await this.wrapped.send(message)    // chama o original
    await sendSlackMessage(message)      // adiciona Slack
  }
}

class SMSDecorator implements Notifier {
  constructor(private readonly wrapped: Notifier) {}

  async send(message: string) {
    await this.wrapped.send(message)    // chama o anterior
    await sendSMS(message)               // adiciona SMS
  }
}

// Composicao flexivel — combinar livremente
const emailOnly = new EmailNotifier()
const emailAndSlack = new SlackDecorator(new EmailNotifier())
const emailSlackSMS = new SMSDecorator(new SlackDecorator(new EmailNotifier()))

// Todos tem a MESMA interface — Notifier
await emailSlackSMS.send('Novo pedido!')
// Envia: Email + Slack + SMS
```

### Exemplos no Mundo Real

| Tecnologia | Uso de Decorator |
|------------|-----------------|
| Express/Fastify | Middleware chain (cada middleware "decora" a request/response) |
| TypeScript | Decorators nativos (`@Injectable`, `@Component`, `@Controller`) |
| NestJS | Guards, Interceptors, Pipes (cada um decora o pipeline) |
| React | Higher-Order Components (HOCs) |
| Logging | Adicionar timing, request_id, user_id ao logger base |

### Arvore de Decisao

```
Precisa adicionar comportamento a um objeto existente?
  NAO → Nao usar Decorator
  SIM → Precisa combinar comportamentos de forma flexivel?
    NAO → Heranca simples ou composicao direta pode bastar
    SIM → Decorator Pattern
          Os comportamentos devem ser empilhaveis?
            SIM → Decorator (mesma interface entrada/saida)
            NAO → Strategy pode ser mais adequado
```

### Anti-Patterns

- **Decorator profundo:** empilhar 10+ decorators torna debug impossivel. Manter stack rasa (3-4 max)
- **Decorator que muda a interface:** se a entrada/saida mudam, nao e Decorator. A chave e manter a mesma interface
- **Decorator com estado mutavel:** decorators devem ser preferencialmente stateless. Estado mutavel cria bugs sutis

---

## 5. Strategy Pattern

### Problema que Resolve

Um objeto precisa usar diferentes algoritmos/comportamentos que podem variar. Sem Strategy, isso vira uma cadeia de if/else ou switch/case dentro da classe.

### Como Funciona

Define uma familia de algoritmos com mesma interface. A classe que usa a estrategia nao sabe qual algoritmo esta sendo executado — apenas que tem um objeto com o metodo esperado.

```typescript
// Interface da estrategia
interface SortStrategy {
  sort(data: number[]): number[]
}

// Implementacoes diferentes
class QuickSort implements SortStrategy {
  sort(data: number[]): number[] { /* quicksort */ }
}

class MergeSort implements SortStrategy {
  sort(data: number[]): number[] { /* mergesort */ }
}

class BubbleSort implements SortStrategy {
  sort(data: number[]): number[] { /* bubblesort */ }
}

// Contexto — usa a estrategia sem saber qual e
class DataProcessor {
  constructor(private strategy: SortStrategy) {}

  setStrategy(strategy: SortStrategy) {
    this.strategy = strategy
  }

  process(data: number[]): number[] {
    return this.strategy.sort(data)
  }
}

// Troca de estrategia em runtime
const processor = new DataProcessor(new QuickSort())
processor.process([3, 1, 2])        // usa QuickSort
processor.setStrategy(new MergeSort())
processor.process([3, 1, 2])        // usa MergeSort
```

### Exemplos no Mundo Real

| Tecnologia | Uso de Strategy |
|------------|----------------|
| Express | Middleware (cada middleware e uma estrategia de processamento) |
| Passport.js | Estrategias de autenticacao (Local, JWT, OAuth, Google) |
| Array.sort() | Funcao comparadora como estrategia de ordenacao |
| Payment gateways | Diferentes processadores (Stripe, AbacatePay, Boleto) |
| Validacao | Diferentes regras por campo (CPF, email, telefone) |

### Strategy vs. Funcao simples

| Cenario | Usar |
|---------|------|
| Logica e uma unica funcao sem estado | Funcao simples (callback) |
| Logica tem estado ou multiplos metodos | Classe Strategy |
| Logica pode variar em runtime | Strategy Pattern |
| Logica e fixa e nunca muda | Funcao direta, sem pattern |

### Arvore de Decisao

```
Existe logica condicional que varia por contexto?
  NAO → Nao usar Strategy
  SIM → A variacao e por tipo de dado ou por comportamento?
    Por tipo → Factory pode ser mais adequado
    Por comportamento → Strategy Pattern
      A estrategia tem estado ou multiplos metodos?
        NAO → Funcao callback pode ser suficiente
        SIM → Classe Strategy
```

### Anti-Patterns

- **Strategy com um unico algoritmo:** se nunca vai mudar, nao abstraia. YAGNI
- **Strategy God:** estrategia com 15 metodos. Provavelmente precisa ser decomposta
- **Trocar strategy no meio de operacao:** pode causar inconsistencia. Trocar apenas entre operacoes

---

## 6. Adapter Pattern

### Problema que Resolve

Duas interfaces incompativeis precisam trabalhar juntas. A API externa retorna dados num formato, o sistema interno espera outro. Ou: migrar de uma biblioteca para outra sem alterar centenas de arquivos.

### Como Funciona

O Adapter envolve um objeto e traduz sua interface para a esperada pelo sistema.

```typescript
// API externa retorna este formato
interface ExternalUser {
  first_name: string
  last_name: string
  email_address: string
}

// Sistema interno espera este formato
interface User {
  nome: string
  sobrenome: string
  email: string
}

// Adapter traduz entre os dois
class ExternalUserAdapter {
  static toInternal(external: ExternalUser): User {
    return {
      nome: external.first_name,
      sobrenome: external.last_name,
      email: external.email_address,
    }
  }

  static toExternal(internal: User): ExternalUser {
    return {
      first_name: internal.nome,
      last_name: internal.sobrenome,
      email_address: internal.email,
    }
  }
}
```

### Exemplo: Migracao de Biblioteca

```typescript
// Sistema usa Axios em 100+ arquivos
// Quer migrar para Fetch nativo sem alterar tudo

// Adapter implementa a mesma interface do Axios
class HttpAdapter {
  async get<T>(url: string): Promise<{ data: T }> {
    const response = await fetch(url)
    const data = await response.json()
    return { data }
  }

  async post<T>(url: string, body: unknown): Promise<{ data: T }> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    return { data }
  }
}

// Substituir Axios pelo adapter — zero mudancas nos 100+ arquivos
export const http = new HttpAdapter()
```

### Exemplos no Mundo Real

| Tecnologia | Uso de Adapter |
|------------|----------------|
| Prisma/TypeORM | ORM como adapter entre codigo e banco de dados |
| Axios → Fetch | Adapter para migracao transparente |
| Database drivers | Traduzem chamadas genericas para protocolos especificos |
| API wrappers | Traduzem API externa para formato interno |

### Arvore de Decisao

```
Duas interfaces sao incompativeis?
  NAO → Nao usar Adapter
  SIM → Controla o codigo de AMBOS os lados?
    SIM → Refatorar a interface diretamente (sem Adapter)
    NAO → Adapter Pattern
          E integracao com API/SDK externo?
            SIM → Adapter na camada de integracao (boundary)
            NAO → Adapter para migracao de biblioteca
```

### Anti-Patterns

- **Adapter que faz logica de negocio:** o Adapter so deve TRADUZIR formato, nao validar ou processar
- **Adapter desnecessario:** se as interfaces ja sao compativeis, o Adapter e codigo morto
- **Cadeia de adapters:** A adapta B que adapta C. Se precisar de mais de um nivel, o design precisa ser repensado

---

## 7. Combinacao de Patterns

Patterns NAO existem isolados. Em sistemas reais, eles se combinam:

| Combinacao | Exemplo |
|------------|---------|
| Factory + Singleton | Factory que garante instancia unica de DB pool |
| Observer + Strategy | Observer usa Strategy para decidir COMO notificar |
| Adapter + Factory | Factory cria o Adapter correto baseado na API externa |
| Decorator + Strategy | Decorators empilhados com comportamento configuravel via Strategy |
| Factory + Strategy | Factory cria a Strategy correta baseada no contexto |

### Principio Central

> Entender O PROBLEMA antes de aplicar O PATTERN. O pattern e ferramenta, nao objetivo.

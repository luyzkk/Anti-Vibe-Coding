# SOLID Principles — Referencia Detalhada

SOLID sao ALVOS de design, nao regras absolutas. Em projetos pequenos, aplicar tudo pode criar boilerplate desnecessario. A nota ao lado de cada principio indica a forca com que deve ser seguido em projetos do mundo real.

---

## S — Single Responsibility Principle (SRP) [7/10]

**Conceito:** Cada classe/modulo deve ter uma unica responsabilidade — um unico motivo para mudar.

### Quando Usar

- Quando uma classe comeca a fazer "coisas demais"
- Quando mudancas em uma area quebram outra nao relacionada
- Quando o nome da classe precisa de "e" ou "ou" para ser descrito

### Quando NAO Usar

- Em modulos pequenos onde a separacao criaria complexidade desnecessaria
- Quando a "responsabilidade" e tao granular que gera dezenas de arquivos triviais
- Em scripts utilitarios de uso unico

### Trade-offs

- (+) Facilita testes, reuso e compreensao
- (-) Pode fragmentar logica coesa em muitos arquivos
- A definicao de "responsabilidade" depende do contexto do DOMINIO, nao de regras genericas

### Nota Pragmatica

Definir "responsabilidade" no nivel do dominio do negocio. `UserService` que faz CRUD + envio de email tem 2 responsabilidades. `UserService` que faz CRUD de campos do usuario tem 1, mesmo com varios metodos.

### Exemplo

```typescript
// VIOLACAO: UserService com 2 responsabilidades
class UserService {
  createUser(data: UserInput) { /* CRUD */ }
  updateUser(id: string, data: UserInput) { /* CRUD */ }
  sendWelcomeEmail(user: User) { /* Email - responsabilidade diferente */ }
  sendPasswordReset(user: User) { /* Email */ }
}

// CORRECAO: separar por dominio
class UserService {
  createUser(data: UserInput) { /* CRUD */ }
  updateUser(id: string, data: UserInput) { /* CRUD */ }
}

class UserNotificationService {
  sendWelcomeEmail(user: User) { /* Email */ }
  sendPasswordReset(user: User) { /* Email */ }
}
```

### Sinais de Violacao

- Classe com mais de 200 linhas
- Classe que importa de muitos dominios diferentes
- Dificuldade em nomear a classe sem usar "e" ou "ou"
- Testes que precisam de muitos mocks nao relacionados

---

## O — Open/Closed Principle (OCP) [8/10]

**Conceito:** Aberto para extensao, fechado para modificacao. Boas abstracoes reduzem a necessidade de alterar codigo existente.

### Quando Usar

- Sistemas com regras de negocio que variam por contexto (pagamentos, notificacoes, validacoes)
- Quando `if/else` ou `switch` cresce a cada feature nova
- Quando multiplas variacoes de um comportamento sao previssiveis

### Quando NAO Usar

- Em prototipos ou MVPs onde o dominio ainda nao esta claro
- Quando a abstracao prematura esconde a logica real
- Quando so existem 1-2 variacoes e e improvavel que cresca

### Trade-offs

- (+) Novas features sem tocar em codigo testado
- (-) Abstracoes erradas sao piores que codigo duplicado
- Requer que se CONHECA o eixo de variacao antes de abstrair

### Exemplo

```typescript
// VIOLACAO: switch que cresce a cada tipo de pagamento
function processPayment(type: string, amount: number) {
  switch (type) {
    case 'credit_card': /* ... */ break
    case 'pix': /* ... */ break
    case 'boleto': /* ... */ break
    // cada novo tipo = modificacao aqui
  }
}

// CORRECAO: strategy pattern — aberto para extensao
type PaymentProcessor = {
  process(amount: number): Promise<PaymentResult>
}

const processors: Record<string, PaymentProcessor> = {
  credit_card: new CreditCardProcessor(),
  pix: new PixProcessor(),
  boleto: new BoletoProcessor(),
  // novo tipo = novo entry, sem modificar logica existente
}

function processPayment(type: string, amount: number) {
  const processor = processors[type]
  if (!processor) throw new Error(`Unsupported payment type: ${type}`)
  return processor.process(amount)
}
```

### Sinais de Violacao

- `switch` ou `if/else` que cresce a cada nova feature
- Modificacao em arquivo estavel toda vez que nova variacao e adicionada
- Testes que quebram em areas nao relacionadas

---

## L — Liskov Substitution Principle (LSP) [10/10]

**Conceito:** Subtipos DEVEM poder substituir seus tipos pai sem quebrar o programa. E pura teoria de conjuntos.

### Quando Usar

- SEMPRE. Este principio nao tem excecao pragmatica
- Qualquer hierarquia de tipos ou implementacao de interface

### Quando NAO Usar

- Nao existe cenario onde violar LSP e aceitavel

### Trade-offs

- (+) Garante que polimorfismo funciona corretamente
- (+) Previne bugs sutis em runtime
- Este e o unico principio SOLID que e uma lei matematica, nao uma guideline

### Exemplo Classico de Violacao

```typescript
class Rectangle {
  constructor(protected width: number, protected height: number) {}

  setWidth(w: number) { this.width = w }
  setHeight(h: number) { this.height = h }
  area() { return this.width * this.height }
}

class Square extends Rectangle {
  // VIOLACAO: setWidth tambem altera height
  setWidth(w: number) { this.width = w; this.height = w }
  setHeight(h: number) { this.width = h; this.height = h }
}

// Codigo que espera Rectangle quebra com Square:
function doubleWidth(rect: Rectangle) {
  const originalHeight = rect.area() / rect.width // salva height
  rect.setWidth(rect.width * 2)
  // Espera: area = width*2 * originalHeight
  // Com Square: area = (width*2)^2  ← ERRADO
}
```

### Correcao

```typescript
// Usar composicao em vez de heranca
type Shape = { area(): number }

class Rectangle implements Shape {
  constructor(readonly width: number, readonly height: number) {}
  area() { return this.width * this.height }
}

class Square implements Shape {
  constructor(readonly side: number) {}
  area() { return this.side * this.side }
}
```

### Sinais de Violacao

- Subtipo que lanca excecao para metodo herdado ("nao suportado")
- Override que muda preconditions ou postconditions
- Testes do pai que falham quando executados com o subtipo
- Necessidade de `instanceof` checks antes de chamar metodos

---

## I — Interface Segregation Principle (ISP) [5/10]

**Conceito:** Interfaces especificas sao melhores que interfaces genericas. Clientes nao devem depender de metodos que nao usam.

### Quando Usar

- Quando diferentes consumidores usam subsets distintos de uma interface
- Em bibliotecas/SDKs publicos onde a superficie de API importa
- Quando mocking em testes fica complexo por causa de interface grande

### Quando NAO Usar

- Em codigo interno onde a interface tem poucos consumidores
- Quando separar interfaces cria fragmentacao sem beneficio real
- Em projetos pequenos com interfaces compactas

### Trade-offs

- (+) Desacoplamento mais fino, facilita mocking em testes
- (-) Muitas interfaces pequenas podem ser mais confusas que uma coesa
- Cuidado com otimizacao prematura de interfaces

### Exemplo

```typescript
// VIOLACAO: interface monolitica
type Animal = {
  eat(): void
  fly(): void
  swim(): void
  walk(): void
}
// Pinguim implementa fly()? Peixe implementa walk()?

// CORRECAO: interfaces segregadas
type Eater = { eat(): void }
type Flyer = { fly(): void }
type Swimmer = { swim(): void }
type Walker = { walk(): void }

type Duck = Eater & Flyer & Swimmer & Walker
type Penguin = Eater & Swimmer & Walker
type Fish = Eater & Swimmer
```

### Sinais de Violacao

- Implementacoes com metodos vazios ou que lancam "nao suportado"
- Consumidores que so usam 2-3 metodos de uma interface com 10+
- Dificuldade em criar mocks para testes

---

## D — Dependency Inversion Principle (DIP) [6.5/10]

**Conceito:** Modulos de alto nivel nao devem depender de modulos de baixo nivel. Ambos devem depender de abstracoes.

### Quando Usar

- Quando precisa trocar implementacoes (banco de dados, servicos externos)
- Para facilitar testes com mocks/stubs
- Em boundaries arquiteturais (infra vs dominio)
- Quando o modulo de baixo nivel e instavel ou externo

### Quando NAO Usar

- Em scripts simples ou utilitarios
- Quando so existe uma implementacao e e improvavel que mude
- Em funcoes utilitarias puras sem side effects

### Trade-offs

- (+) Testabilidade, flexibilidade, boundaries claros
- (-) Boilerplate de interfaces/abstracoes
- (-) Indirecao que dificulta "Go to Definition"

### Exemplo

```typescript
// VIOLACAO: modulo de alto nivel depende diretamente de implementacao
class OrderService {
  private db = new PostgresDatabase()  // acoplamento direto
  private mailer = new SendGridMailer() // acoplamento direto

  async createOrder(data: OrderInput) {
    await this.db.insert('orders', data)
    await this.mailer.send(data.customerEmail, 'Order created')
  }
}

// CORRECAO: depender de abstracoes
type Database = {
  insert(table: string, data: unknown): Promise<void>
}

type Mailer = {
  send(to: string, subject: string): Promise<void>
}

class OrderService {
  constructor(
    private db: Database,   // abstracoes injetadas
    private mailer: Mailer,
  ) {}

  async createOrder(data: OrderInput) {
    await this.db.insert('orders', data)
    await this.mailer.send(data.customerEmail, 'Order created')
  }
}
```

### Sinais de Violacao

- `new` de dependencias externas dentro de classes de negocio
- Impossibilidade de testar sem banco/servico real
- Mudanca de infra (trocar banco) exige alteracao em logica de negocio

---

## Regra de Ouro

Ao decidir qual principio aplicar, usar esta hierarquia:

```
1. LSP (10/10) — SEMPRE. Sem excecao
2. OCP (8/10) — Quando variacao e previsivel
3. SRP (7/10) — Quando classe faz "demais"
4. DIP (6.5/10) — Em boundaries arquiteturais
5. ISP (5/10) — Em APIs publicas
```

**Pragmatismo > Purismo.** SOLID que cria boilerplate sem beneficio real e anti-pattern.

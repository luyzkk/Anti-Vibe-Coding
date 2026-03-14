# Design Principles — Referencia Detalhada

Principios de design de software do Pragmatic Programmer para reduzir acoplamento e aumentar manutenibilidade.

---

## 1. Lei de Demeter (Law of Demeter)

**Definicao:** Um metodo deve apenas conversar com: ele mesmo, seus parametros, os objetos que ele cria e variaveis globais. Um metodo NAO deve conversar com objetos retornados por outros metodos.

### O Problema

Cada `.` em uma cadeia de chamadas e um ponto de acoplamento:

```typescript
// VIOLACAO: cadeia fortemente acoplada
const zip = order.getCustomer().getAddress().getZipCode()
// Se a estrutura de Customer ou Address mudar, este codigo quebra
```

### A Solucao

Encapsular a navegacao dentro do proprio objeto:

```typescript
// CORRETO: encapsulado
const zip = order.shippingZipCode()
// Como o pedido resolve internamente e problema dele
```

### Sinais de Violacao

- Cadeias longas de `.` navegando objetos
- Mudanca em uma classe distante quebra codigo em outro modulo
- Testes que precisam mockar objetos em cadeia (mock do mock do mock)

### Regra Pratica

Contar os `.` — se ha mais de 2 niveis de navegacao, provavelmente viola a Lei de Demeter. Excecao: fluent APIs e builders (`.filter().map().sort()`) sao aceitaveis porque retornam o mesmo tipo.

---

## 2. Tell-Don't-Ask

**Definicao:** Ordenar que um objeto execute uma acao, em vez de pedir dados dele e tomar decisoes externamente.

### O Problema

Logica de negocio dispersa fora do objeto responsavel:

```typescript
// VIOLACAO: logica de saque fora da conta
if (account.getBalance() > amount) {
  account.debit(amount)
} else {
  throw new InsufficientFundsError()
}
```

### A Solucao

O objeto encapsula toda a logica:

```typescript
// CORRETO: a conta e responsavel pelo proprio saque
account.withdraw(amount)
// Se ha bug em saques, basta procurar o metodo withdraw
```

### Beneficios

- **Coesao:** Logica de negocio fica dentro do objeto dono dos dados
- **Debug:** Se ha bug em saques, procurar o metodo `withdraw` — um lugar so
- **Evolucao:** Regras de negocio mudam em um lugar, nao em N chamadores

### Sinais de Violacao

- Buscar dados de um objeto, tomar decisao, e depois agir
- Mesma verificacao de estado repetida em multiplos pontos do codigo
- Getters usados para logica de negocio (nao apenas para exibicao)

---

## 3. Composicao sobre Heranca

**Definicao:** Preferir composicao de comportamentos ao inves de hierarquias de heranca. Heranca cria "imposto" — alterar comportamento da classe pai altera TODAS as classes filhas.

### Problemas da Heranca

- Alterar pai causa bugs em filhas distantes no codigo
- Expoe metodos protegidos, criando contratos escondidos (via `super`)
- Acopla fortemente toda a hierarquia
- Hierarquias profundas (3+ niveis) tornam o codigo incompreensivel

### Alternativa 1: Protocolos/Interfaces

Definir contratos (assinaturas de metodos) sem especificar implementacao:

```typescript
// Protocolo (contrato)
type Drivable = {
  moveAt(speed: number): void
  stop(): void
}

// Classe qualifica por implementar os metodos
class Car implements Drivable {
  moveAt(speed: number) { /* ... */ }
  stop() { /* ... */ }
}

// Quem exige o contrato e o consumidor
function driveVehicle(vehicle: Drivable) {
  vehicle.moveAt(60)
}
```

Mais proximo do late binding que Alan Kay idealizou para OOP.

### Alternativa 2: Delegation

Wrapper que coordena objetos internos:

```typescript
// Account — responsavel apenas pela logica de negocio
class Account {
  deposit(amount: number) { /* ... */ }
  withdraw(amount: number) { /* ... */ }
  balance(): number { /* ... */ }
}

// AccountRecord — coordena persistencia e operacoes
class AccountRecord {
  constructor(private persistence: Persistence) {}

  deposit(accountId: string, amount: number) {
    const account = this.persistence.load(accountId)
    account.deposit(amount)
    this.persistence.save(account)
  }
}
```

### Alternativa 3: Mix-ins

Composicao de classes adicionando comportamentos de multiplas fontes. Util quando um objeto precisa de capacidades de diferentes dominios sem hierarquia.

### Quando Heranca e Aceitavel

- Hierarquia rasa (1-2 niveis no maximo)
- Relacao genuina "e um" (nao "tem um")
- Framework exige (ex: classes de excecao, componentes React de classe)

---

## 4. Acoplamento Temporal

**Definicao:** Dependencia implicita na ordem de execucao de metodos. A ordem de chamada importa, mas nada no codigo impede que a ordem seja violada.

### O Problema

```typescript
// Ordem importa mas nada impede chamada errada
socket.open()
socket.send(data)
socket.close()
// socket.close() antes de socket.open() quebra em runtime
// socket.send() em socket fechado falha silenciosamente
```

O estado interno do socket e invisivel para quem o utiliza.

### A Solucao

Delegar o gerenciamento da sequencia para dentro da propria classe:

```typescript
// CORRETO: classe gerencia seu ciclo de vida
class Connection {
  async execute(handler: (conn: ActiveConnection) => Promise<void>) {
    const conn = await this.open()
    try {
      await handler(conn)
    } finally {
      await conn.close()
    }
  }
}

// Uso: impossivel chamar fora de ordem
connection.execute(async (conn) => {
  await conn.send(data)
})
```

### Sinais de Violacao

- Metodos que so funcionam em determinada ordem
- Erros de runtime por estado inconsistente
- Documentacao que diz "chamar A antes de B"
- Testes que quebram se a ordem de setup mudar

---

## 5. Pipe Operator / Transformacoes de Dados

**Definicao:** Programas sao sobre transformacoes de dados. Cada funcao recebe dados como input e retorna dados como output. O pipe operator pega o output de uma funcao e passa como input para a proxima.

### O Problema: Estado Interno Mutavel

```typescript
// RUIM: metodos dependem de estado interno
class SignUpService {
  private user: User | null = null

  handle(request: Request) {
    this.parse(request)       // popula this.user
    this.validate()           // depende de this.user existir
    this.applyBusinessRules() // depende de this.user.age existir
    this.save()               // depende de tudo acima
  }
}
```

Cada metodo depende de `self.user` ter sido populado por um metodo anterior. Acoplamento temporal puro.

### A Solucao: Transformacoes Explicitas

```typescript
// BOM: cada funcao recebe input e retorna output
const validateEmail = (data: UserData): UserData => { /* valida, retorna */ }
const validateAge = (data: UserData): UserData => { /* valida, retorna */ }
const save = (db: Database, data: UserData): SavedUser => { /* persiste */ }

// Chaining funcional
const result = loadData()
  .filter(isValid)
  .sort(byDate)
  .map(format)
```

### Beneficios

- **Testabilidade:** Cada funcao e testavel isoladamente
- **Idempotencia:** Mesmo input → mesmo output
- **Reprodutibilidade:** Para reproduzir bug, basta ter o input
- **Reuso:** Funcoes independentes podem ser reutilizadas em qualquer contexto

### Aplicacao Pratica

Em Elixir, o pipe operator e nativo:
```
dados |> validar |> transformar |> persistir
```

Em JavaScript/TypeScript, usar chaining funcional:
```typescript
items
  .filter(isActive)
  .map(toDTO)
  .sort(byCreatedAt)
```

---

## Resumo: Hierarquia de Aplicacao

| Principio | Prioridade | Quando aplicar |
|-----------|------------|----------------|
| Tell-Don't-Ask | Alta | Sempre que logica de negocio acessa dados de outro objeto |
| Lei de Demeter | Alta | Sempre que ha cadeia de `.` navegando objetos |
| Composicao > Heranca | Alta | Quando a hierarquia tem 2+ niveis ou comportamentos sao compostos |
| Acoplamento Temporal | Media | Quando metodos dependem de ordem de execucao |
| Pipe Operator | Media | Quando servicos processam dados em etapas sequenciais |

**Principio unificador:** Todos visam reduzir acoplamento e aumentar coesao. Quem tem os dados faz o calculo. Quem conhece seu estado interno gerencia seu ciclo de vida.

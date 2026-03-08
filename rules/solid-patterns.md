# SOLID & Design Patterns — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar arquivos de arquitetura, classes e modulos.

## SOLID Principles (Pragmaticos)

### S — Single Responsibility (7/10)
- Cada classe com UMA razao para mudar
- Definir "responsabilidade" no contexto do dominio
- Classe com autenticacao + database + notificacoes = God Object → separar
- NAO criar uma classe por metodo (proliferacao vazia)

### O — Open/Closed (8/10)
- Aberto para extensao, fechado para modificacao
- Boas abstracoes reduzem necessidade de mudancas
- Usar Strategy Pattern ou composicao para extensibilidade
- Aplicar quando ha historico de mudancas no mesmo ponto

### L — Liskov Substitution (10/10 — Inviolavel)
- Subtipos DEVEM substituir tipos pai sem quebrar comportamento
- Pura teoria de conjuntos — SEMPRE valido
- Se subtipo lanca excecao que pai nao lanca → violacao
- Se subtipo ignora metodo do pai → violacao

### I — Interface Segregation (5/10)
- Nao force clientes a depender de interfaces que nao usam
- CUIDADO com otimizacao prematura de interfaces
- Criar interfaces especificas SÓ quando ha multiplas implementacoes reais
- CardProcessor + PixProcessor (separados) > PaymentMethods (generico)

### D — Dependency Inversion (6.5/10)
- Depender de abstracoes, nao de implementacoes
- Facilita testes e desacoplamento
- Adiciona boilerplate — avaliar custo-beneficio
- Troca de MySQL → PostgreSQL e rara — nao otimize para isso

## Lei de Demeter (Acoplamento Baixo)

- NUNCA navegue profundo: `order.customer.address.zipCode` (3+ niveis)
- Criar metodo encapsulado: `order.shippingZipCode()`
- Chaining profundo = fragilidade (mudanca em qualquer classe quebra tudo)
- Cada objeto so conversa com vizinhos imediatos

## Tell-Don't-Ask (Coesao Alta)

- NAO: `if account.getBalance() > amount: account.debit(amount)`
- SIM: `account.withdraw(amount)` (conta gerencia sua propria logica)
- Logica de negocio vive na classe dona dos dados
- Evitar getter/setter que dispersam logica

## Composicao sobre Heranca

- Heranca acopla fortemente (mudar pai quebra filhos)
- Preferir: Protocolos/Interfaces (contratos sem implementacao)
- Preferir: Delegation (wrapper que delega)
- Hierarquia profunda (3+ niveis) = smell → refatorar para composicao
- Duck typing: se tem metodos necessarios, qualifica (sem herdar)

## Acoplamento Temporal

- Metodo depende de outro executado antes = acoplamento temporal
- Classe deve gerenciar sua propria sequencia internamente
- Se documentacao diz "sempre chame X antes de Y" → refatorar
- WebSocket que permite close() antes de open() = acoplamento temporal

## Pipe Operator (Transformacoes de Dados)

- Programa como sequencia de transformacoes
- Cada funcao pura: recebe input, retorna output
- Chaining: `data.filter().sort().map()`
- Idempotente, testavel, sem side effects
- NAO: metodos que dependem de self.state interno mutavel

## Arquitetura

### Monolito vs Microservicos
- SEMPRE comece monolito
- Pergunta central: "Por que network requests em vez de chamadas de funcao?"
- Migre SÓ com problema comprovado: times tropeçando + observabilidade pronta

### CQRS & Event Sourcing
- Decisao de DOMINIO (auditabilidade), nao tecnica
- Eventos IMUTAVEIS como fonte de verdade
- Use quando: financeiro, saude, auditoria legal
- NAO use quando: CRUDs simples

### REST vs GraphQL
- REST padrao para maioria dos projetos
- GraphQL quando: times distribuidos, multiplos front-ends com necessidades diferentes
- NAO migre para "resolver overfetching" (endpoints especializados em REST)

## Anti-Patterns

- Aplicar SRP criando classe por metodo
- Interface Segregation como otimizacao prematura
- Dependency Injection apenas porque esta na moda
- Heranca profunda (3+ niveis)
- Logica de negocio espalhada em multiplas classes (Feature Envy)
- Getter/setter publicos sem encapsulamento
- Microservicos sem problema comprovado

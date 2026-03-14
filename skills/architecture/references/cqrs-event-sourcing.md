# CQRS & Event Sourcing — Referencia Detalhada

CQRS e Event Sourcing sao conceitos complementares. Em aplicacoes reais, quase sempre sao implementados juntos. A decisao de adota-los e de DOMINIO, nao tecnica.

---

## CQS vs CQRS

### CQS (Command Query Separation) — Nivel de funcoes

Separar funcoes em dois tipos:
- **Queries (GET):** Retornam dados sem mutar estado
- **Commands (SET):** Mutam estado sem retornar dados

### CQRS (Command Query Responsibility Segregation) — Nivel de sistema

Padrao arquitetural que usa modelos diferentes para escrita (write model) e leitura (read model), dividindo a aplicacao em dois subsistemas.

**Beneficios:**
- Escalar cada lado de forma independente
- Usar bancos de dados de naturezas diferentes para cada proposito
- Otimizar queries de leitura sem impactar escritas

---

## Event Sourcing

**Definicao:** Padrao que armazena todos os eventos (acoes) que ocorreram no sistema como fonte unica de verdade, em vez de armazenar apenas o estado atual. O estado atual e derivado da reproducao sequencial de todos os eventos.

### Exemplo Pratico — E-commerce

Em vez de armazenar uma ordem com seus produtos finais:

```
Evento 1: CreateOrder { customer_id: "123", items: [A, B] }
Evento 2: RemoveProduct { order_id: "456", product_id: "A" }
Evento 3: ConfirmOrder { order_id: "456" }
```

O estado final (ordem confirmada com apenas produto B) e a resultante desses eventos.

### Analogia Bancaria

O saldo de uma conta e a forca resultante de todas as transacoes registradas no ledger, nao um valor isolado em uma coluna:

```
Transacao 1: +R$1.000  (deposito)
Transacao 2: -R$200    (saque)
Transacao 3: +R$500    (deposito)
Saldo atual: R$1.300   (resultante)
```

---

## Principios Fundamentais

### 1. Eventos sao IMUTAVEIS
Nunca deletar ou alterar um evento. Para que o event store seja fonte unica de verdade, eventos sao sagrados.

### 2. Reversoes = Eventos Compensatorios
Para "desfazer" uma acao, criar um NOVO evento que reverta o efeito (como na contabilidade):

```
Transacao 1: +R$1.000  (erro)
Transacao 2: -R$1.000  (cancelamento — evento compensatorio)
Transacao 3: +R$100    (valor correto)
Resultado:   +R$100
```

### 3. Projecoes (Read Models)
Read models construidos a partir dos eventos para consultas rapidas. Usar mecanismo de transporte (Kafka, EventBus) para projetar eventos em bancos otimizados para leitura.

### 4. Eventual Consistency
Read model pode estar alguns ms atras do write model. Projetar a UI e os processos considerando que dados de leitura podem ter atraso.

### 5. Eventos vem do Dominio
Eventos devem refletir acoes do dominio de negocio ("criar ordem", "aprovar pagamento"), NAO operacoes de banco de dados ("INSERT INTO orders").

---

## Impedance Mismatch

Diferenca estrutural entre como dados sao representados em um evento/comando e como sao armazenados em tabelas relacionais. Um JSON de "criar ordem" com customer_id e lista de produtos se traduz em 4+ linhas em 4 tabelas diferentes no PostgreSQL.

Event Sourcing resolve isso: o write model armazena o evento como e (JSON), e as projecoes traduzem para a estrutura otimizada de leitura.

---

## Bancos Diferentes para Write e Read

| Lado | Bancos adequados | Otimizado para |
|------|-----------------|----------------|
| **Write** | DynamoDB, MongoDB, Event Store dedicado | Escritas rapidas, append-only |
| **Read** | PostgreSQL, Cassandra, Columnar DBs | Queries complexas, agregacoes |

**Trade-off:** Consistencia eventual entre write e read models.

---

## Beneficios

### Auditabilidade Completa
Trilha de auditoria imutavel de todas as acoes. Critico para financeiro, saude, compliance.

### Reproducao de Estados Anteriores
Reproduzir o estado exato do sistema em qualquer momento passado, reproduzindo eventos ate aquele timestamp. Extremamente valioso para investigar bugs.

### Migracoes de Banco Simplificadas
Com todos os eventos preservados, reconstruir qualquer read model do zero. Migrar de banco de dados se torna reprojetar os eventos.

### Debug com Time-Travel
Reproduzir a sequencia exata de eventos que levaram a um bug. Cada evento e um snapshot de uma acao do sistema.

---

## Quando NAO Usar

- CRUDs simples sem necessidade de auditabilidade
- Dominios onde o historico de mudancas nao tem valor de negocio
- MVPs e prototipos onde a complexidade nao se justifica
- Sistemas onde consistencia imediata e requisito critico

---

## Anti-patterns

### Implementar Event Sourcing sem necessidade de dominio
Complexidade desnecessaria sem beneficio real. A decisao deve ser motivada por requisito de negocio (auditabilidade, rastreabilidade), nao por decisao puramente tecnica.

### Modificar ou deletar eventos
A fonte de verdade fica corrompida, o sistema perde confiabilidade. SEMPRE criar eventos compensatorios para reversoes.

### Ignorar a consistencia eventual
Leituras retornam dados desatualizados sem tratamento adequado. A replicacao entre write e read models tem latencia — projetar UI e processos de acordo.

### CQRS sem Event Sourcing quando nao necessario
CQRS sozinho (read/write models separados sem event store) pode bastar. NAO adicionar Event Sourcing se o dominio nao exige historico completo.

---

## Checklist de Verificacao

```
[ ] O dominio EXIGE historico completo de mudancas?
[ ] Regulacao exige audit trail? (financeiro, saude, compliance)
[ ] Ha valor de negocio em "como chegamos nesse estado?"
[ ] A equipe entende consistencia eventual e sabe lidar com ela?
[ ] O custo de complexidade se justifica pelo beneficio de auditabilidade?
[ ] Eventos foram modelados a partir do dominio (nao de operacoes de banco)?
[ ] Reversoes estao planejadas como eventos compensatorios?
```

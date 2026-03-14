# Teorema CAP e PACELC — Referencia Detalhada

## Teorema CAP

O Teorema CAP afirma que um sistema distribuido so pode garantir simultaneamente **2 de 3** propriedades:

| Propriedade | Significado |
|-------------|-------------|
| **Consistency (C)** | Toda leitura retorna o dado mais recente ou um erro |
| **Availability (A)** | Toda requisicao recebe uma resposta (sem garantia de ser a mais recente) |
| **Partition Tolerance (P)** | O sistema continua operando mesmo com falha de comunicacao entre nos |

**REGRA FUNDAMENTAL:** P nao e escolha. Particoes de rede ACONTECEM em qualquer sistema distribuido. A escolha real e: **C vs A durante uma particao**.

Tratar sistema single-node como distribuido e um erro. PostgreSQL single-node e CA por definicao — CAP so se aplica quando ha distribuicao.

---

## PACELC — O Modelo Completo

O CAP so descreve comportamento DURANTE uma particao. No dia-a-dia (sem particao), a escolha real e **Latencia vs Consistencia**:

```
Se Particao (P):
  escolher entre Availability (A) ou Consistency (C)
Senao (E — Else, operacao normal):
  escolher entre Latency (L) ou Consistency (C)
```

### Posicionamento de Bancos no PACELC

| Sistema | Durante Particao | Operacao Normal | Comportamento |
|---------|-----------------|-----------------|---------------|
| PostgreSQL (single) | PC | EC | Consistente sempre |
| PostgreSQL (replicas sync) | PC | EC | Consistente, maior latencia de escrita |
| PostgreSQL (replicas async) | PC | EL | Leituras em replicas podem ser stale |
| Cassandra | PA | EL | Prioriza disponibilidade e latencia |
| MongoDB (replica set) | PC | EC | Leitura do primario e consistente |
| DynamoDB | PA | EL | Eventual consistency padrao |
| DynamoDB (consistent read) | PA | EC | Latencia maior, consistencia forte |
| CockroachDB | PC | EC | NewSQL — SQL distribuido com consistencia forte |

---

## Quando Usar CP vs AP

| Dominio | Escolha | Justificativa |
|---------|---------|---------------|
| **Financeiro** (pagamentos, saldos, transferencias) | **CP** | Dado incorreto e inaceitavel. Melhor negar operacao do que retornar saldo errado |
| **Feed social** (timeline, likes, comentarios) | **AP** | Melhor mostrar dado levemente desatualizado do que ficar indisponivel |
| **E-commerce** (catalogo de produtos) | **AP** | Preco pode ter delay de segundos; indisponibilidade perde venda |
| **E-commerce** (estoque/checkout) | **CP** | Vender produto sem estoque e prejuizo direto |
| **Sessoes de usuario** | **AP** | Sessao expirar e re-logar e melhor do que bloquear acesso |
| **Inventario de warehouse** | **CP** | Contagem incorreta causa problemas operacionais reais |
| **Metricas/Analytics** | **AP** | Dados podem ter delay; indisponibilidade perde eventos |

---

## Conceitos de Implementacao

### CP (Consistencia Forte)

Implementar via **eleicao de lider**:
- Algoritmos: Raft, Paxos, ZAB (ZooKeeper)
- Todas as escritas passam pelo lider
- Se lider cair, sistema fica indisponivel ate eleger novo lider
- Garantia: linearizabilidade — toda leitura ve a escrita mais recente

### AP (Disponibilidade)

Implementar **sem lider**:
- Qualquer no aceita escritas
- Reconciliacao posterior para resolver conflitos
- Tecnicas de reconciliacao:
  - **CRDTs (Conflict-free Replicated Data Types)** — merge automatico sem conflitos (contadores, sets)
  - **Vector Clocks** — detectam conflitos para resolucao manual
  - **Last-Write-Wins (LWW)** — timestamp mais recente vence (simples, mas pode perder dados)

---

## Split-Brain

Split-brain ocorre quando uma particao de rede divide o cluster em dois grupos, cada um acreditando ser o lider.

### Cenario

```
[No A] ←── rede particionada ──→ [No B]
 Acha que e lider                  Acha que e lider
 Aceita escritas                   Aceita escritas
 → DADOS DIVERGENTES
```

### Prevencao

1. **Quorum** — exigir maioria (N/2 + 1) para qualquer decisao:
   - Cluster de 3 nos: quorum = 2
   - Cluster de 5 nos: quorum = 3
   - Cluster de 2 nos: **NAO USAR** — nao tem quorum possivel com particao

2. **Fencing tokens** — tokens monotonicamente crescentes que invalidam lideres antigos:
   - Novo lider recebe token maior
   - Storage rejeita escritas com token menor que o ultimo aceito

3. **STONITH (Shoot The Other Node In The Head)** — no em duvida mata o outro:
   - Agressivo mas efetivo
   - Comum em clusters de banco de dados tradicionais

---

## Quorum

Quorum e o numero minimo de nos que devem concordar para uma operacao ser valida.

### Formula

```
Para consistencia forte:
  W + R > N

Onde:
  W = numero de nos que confirmam escrita
  R = numero de nos consultados na leitura
  N = numero total de nos
```

### Configuracoes Comuns

| Config | W | R | N | Comportamento |
|--------|---|---|---|---------------|
| Consistencia forte | 2 | 2 | 3 | Toda leitura ve escrita mais recente |
| Write otimizado | 1 | 3 | 3 | Escrita rapida, leitura consulta todos |
| Read otimizado | 3 | 1 | 3 | Escrita lenta, leitura rapida |
| Eventual consistency | 1 | 1 | 3 | Rapido, mas pode ler dado stale |

---

## Eleicao de Lider

Processo pelo qual nos de um cluster escolhem qual sera o lider (primario).

### Algoritmo Raft (Simplificado)

1. Todos os nos comecam como **followers**
2. Se um follower nao recebe heartbeat do lider por X tempo, vira **candidate**
3. Candidate pede votos aos outros nos
4. No com maioria de votos vira **lider**
5. Lider envia heartbeats periodicos para manter autoridade

### Regras Praticas

- Usar **numero impar de nos** (3, 5, 7) para evitar empates
- Timeout de eleicao: randomizar para evitar eleicoes simultaneas
- Em producao: **usar implementacao pronta** (etcd, Consul, ZooKeeper) em vez de implementar do zero

---

## Anti-Patterns

- **Escolher AP para tudo "porque e mais rapido"** — financeiro com eventual consistency causa dados inconsistentes e prejuizo real
- **Escolher CP para tudo "porque e mais seguro"** — overengineering que mata latencia e disponibilidade sem necessidade
- **Ignorar PACELC** — focar so no CAP e ignorar que 99.9% do tempo o sistema opera SEM particao
- **Tratar sistema single-node como distribuido** — PostgreSQL single-node e CA por definicao; CAP so se aplica quando ha distribuicao
- **Cluster de 2 nos para "alta disponibilidade"** — sem quorum possivel, split-brain e inevitavel
- **Implementar consenso do zero** — usar Raft/Paxos implementado em producao (etcd, Consul) em vez de reescrever

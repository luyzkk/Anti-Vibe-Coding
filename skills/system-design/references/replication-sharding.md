# Replicacao e Sharding — Referencia Detalhada

## Visao Geral

| Conceito | O Que Faz | Escala | Complexidade |
|----------|-----------|--------|-------------|
| **Replicacao** | Copia dados para multiplos servidores | Leitura (mais replicas = mais reads) | Media |
| **Sharding** | Divide dados entre multiplos servidores | Escrita (cada shard cuida de uma fatia) | Alta |

---

## Caminho Progressivo de Escalabilidade

NAO pular etapas. Cada etapa resolve 10x mais carga que a anterior:

```
1. Otimizar queries e indices          ← COMECAR AQUI
2. Adicionar cache (Redis)             ← 10x mais capacidade
3. Replicacao de leitura               ← 10x mais leituras
4. Particionamento de tabelas          ← organizar dados grandes
5. Sharding                            ← ULTIMO RECURSO
```

**REGRA:** Sharding e irreversivel em termos praticos. Uma vez shardado, a complexidade operacional cresce permanentemente.

---

## Replicacao

### Modelo: 1 Primario + N Replicas

```
Escritas → [Primario] → replica para → [Replica 1]
                                     → [Replica 2]
                                     → [Replica N]

Leituras → [Qualquer no]
```

### Tipos de Replicacao

| Tipo | Comportamento | Latencia de Escrita | Risco de Dado Stale |
|------|---------------|---------------------|---------------------|
| **Assincrona** | Replica recebe dados com delay | Baixa | SIM — replica pode estar atrasada |
| **Sincrona** | Escrita so confirma quando TODAS as replicas receberam | Alta | NAO — todas as replicas atualizadas |
| **Semi-sincrona** | Escrita confirma quando pelo menos 1 replica recebeu | Media | Baixo — pelo menos 1 replica atualizada |

### Quando Usar Cada Tipo

| Cenario | Tipo Recomendado | Justificativa |
|---------|-----------------|---------------|
| Alta performance de escrita | Assincrona | Primario nao espera replicas |
| Dados criticos (financeiro) | Semi-sincrona | Garantia de pelo menos 1 copia |
| Compliance/regulatorio | Sincrona | Todas as copias confirmadas |
| Leitura em alta escala | Assincrona com N replicas | Performance maxima de leitura |

### Replication Lag

Atraso entre primario e replica. E inevitavel com replicacao assincrona.

| Metrica | Alvo | Acao |
|---------|------|------|
| Lag < 1 segundo | Normal | Monitorar |
| Lag 1-10 segundos | ALERTA | Verificar carga no primario, rede, disco da replica |
| Lag > 10 segundos | CRITICO | Risco de dados stale significativo. Investigar imediatamente |
| Lag crescente | EMERGENCIA | Replica nao consegue acompanhar. Adicionar recursos ou reduzir carga |

### Causas Comuns de Lag Alto

- Primario com carga de escrita excessiva
- Replica com hardware inferior ao primario
- Rede lenta entre primario e replica
- Queries pesadas executando na replica (analytics)
- Long-running transactions no primario

---

## Read-Your-Own-Writes

Problema: usuario escreve dado, proxima leitura vai para replica atrasada, usuario nao ve o que acabou de escrever.

### Solucoes

| Solucao | Como | Trade-off |
|---------|------|-----------|
| **Ler do primario apos escrita** | Apos write, proximos N segundos leem do primario | Aumenta carga no primario |
| **Session consistency** | Guardar timestamp do ultimo write, ler de replica so se estiver atualizada | Complexidade na aplicacao |
| **Causal consistency** | Replica garante ordem causal | Suportado nativamente em poucos bancos (MongoDB) |
| **Ler sempre do primario** | Todas as leituras no primario | Elimina beneficio de replicas para leitura |

### Recomendacao Pratica

```
Apos escrita do usuario:
  → Proximos 5 segundos: ler do primario
  → Apos 5 segundos: ler de qualquer replica

Implementar via middleware que verifica timestamp do ultimo write na sessao.
```

---

## Sharding

### Quando Usar

SOMENTE quando replicacao nao resolve mais:
- Volume de escrita > 100k writes/s sustentado
- Dados > 10TB em uma unica tabela
- Replicacao nao acompanha a carga de escrita

### Estrategias de Sharding

| Tipo | Como Funciona | Distribuicao | Quando Usar |
|------|---------------|-------------|-------------|
| **Hash Sharding** | `hash(shard_key) % num_shards` | Uniforme | **PADRAO.** Distribuicao equilibrada |
| **Range Sharding** | Por faixa de valores (ex: A-M, N-Z) | Pode ser desigual | Dados com padrao de acesso por faixa (time-series) |
| **Directory Sharding** | Tabela de lookup mapeia chave → shard | Flexivel | Necessidade de controle fino sobre posicionamento |

### Hash Sharding

```
shard = hash(user_id) % 4

user_id=100 → hash=7382 → 7382 % 4 = 2 → Shard 2
user_id=101 → hash=4521 → 4521 % 4 = 1 → Shard 1
user_id=102 → hash=9133 → 9133 % 4 = 1 → Shard 1
```

Vantagem: distribuicao uniforme. Desvantagem: range queries ineficientes (precisam consultar todos os shards).

### Range Sharding

```
Shard 1: user_id 1-1000000
Shard 2: user_id 1000001-2000000
Shard 3: user_id 2000001-3000000
```

Vantagem: range queries eficientes dentro de um shard. Desvantagem: hot spots se distribuicao nao for uniforme.

### Directory Sharding

```
Tabela de lookup:
  tenant_acme   → Shard 1
  tenant_globex → Shard 2
  tenant_initech → Shard 1
```

Vantagem: flexibilidade total (mover tenant entre shards). Desvantagem: lookup table e ponto unico de falha.

---

## Selecao de Shard Key

A shard key e a decisao mais importante e mais dificil de reverter.

### Regras Obrigatorias

1. **Imutavel** — nunca muda apos criacao. Mudar shard key = mover dados entre shards
2. **Alta cardinalidade** — muitos valores distintos. Shard key com 5 valores = maximo 5 shards
3. **Distribuicao uniforme** — evitar hot spots. Shard key `status` com 90% "active" = 1 shard sobrecarregado
4. **Presente nas queries mais frequentes** — evitar scatter-gather (consulta a TODOS os shards)

### Exemplos de Boas Shard Keys

| Dominio | Shard Key | Justificativa |
|---------|-----------|---------------|
| Multi-tenant SaaS | `tenant_id` | Queries SEMPRE filtram por tenant. Isolamento natural |
| E-commerce | `user_id` | Pedidos sempre consultados por usuario |
| IoT / Metricas | `device_id + time_bucket` | Distribuicao uniforme + queries por device + janela temporal |
| Chat / Messaging | `conversation_id` | Mensagens sempre consultadas por conversa |

### Exemplos de MAS Shard Keys

| Shard Key | Problema |
|-----------|----------|
| `created_at` | Hot spot no shard mais recente (todas as escritas la) |
| `status` | Baixa cardinalidade (5-10 valores) |
| `country` | Distribuicao desigual (90% em poucos paises) |
| `auto_increment_id` | Hot spot no shard do range mais recente |

---

## Cross-Shard Queries

O maior custo do sharding: queries que precisam de dados em multiplos shards.

### Cenarios

```
Query: "todos os pedidos do usuario X"
Shard key: user_id
→ Vai para 1 shard. EFICIENTE.

Query: "todos os pedidos do produto Y"
Shard key: user_id
→ Precisa consultar TODOS os shards. INEFICIENTE (scatter-gather).
```

### Mitigacoes

- Desnormalizar dados para que queries frequentes nao cruzem shards
- Manter indice global (Elasticsearch) para queries cross-shard
- Aceitar que cross-shard queries serao lentas e planejar UX de acordo

---

## Shuffle Sharding — isolamento de blast radius

Sharding de **dados** (acima) divide registros entre servidores. Shuffle sharding e outra coisa: e *fault isolation* — usa a mesma matematica de particao para conter o raio de uma falha induzida por carga, **nao** para dividir dados exclusivos.

### O problema: fan-out-para-todos e vulneravel a poison request

No escalonamento horizontal tradicional, o trafego e distribuido por **todas** as instancias saudaveis. Se um request especifico dispara um bug que derruba a instancia, o caller pode reenviar o **mesmo** request para instancia apos instancia, causando cascata ate todas cairem. Sem nenhuma fragmentacao, o blast radius e 100%.
> fonte: Colm MacCárthaigh | Shuffle sharding: massive and magical fault isolation | seção: Traditional Horizontal Scaling

### Sharding regular reduz o impacto linearmente (1/N)

O **bulkhead** classico divide a frota em N shards disjuntos: um problema causado por um cliente afeta so o shard dele — com 4 shards, ~1/4 dos clientes e impactado. Mas o isolamento melhora **linearmente** com mais shards, e o custo de capacidade de folga tambem cresce linearmente; dois clientes no mesmo shard ainda se afetam. Sharding regular **nao** da isolamento por cliente.
> fonte: Colm MacCárthaigh | Workload isolation using shuffle sharding | seção: O que é fragmentação aleatória?

### Shuffle sharding reduz o impacto exponencialmente (1/C(n,k))

Shuffle sharding cria shards **virtuais** compostos por um subconjunto de operadores reais (ex.: 2 de 8) e da a cada cliente uma **combinacao** unica. Os shards se sobrepoem — operadores sao compartilhados — mas dois clientes raramente compartilham o conjunto inteiro, entao a falha de um cliente quase nunca atinge todos os operadores de outro.
> fonte: Colm MacCárthaigh | Workload isolation using shuffle sharding | seção: O que é fragmentação aleatória?

A intuicao vem das **cartas**: um baralho de 52 embaralhado em maos de 4 gera **mais de 300.000 maos distintas**; a probabilidade de duas maos coincidirem cai rapidamente (< 1/4 para 1 carta, < 1/40 para 2). Essa probabilidade decrescente de sobreposicao e a base matematica.
> fonte: Colm MacCárthaigh | Shuffle sharding: massive and magical fault isolation | seção: (introdução)

A matematica e binomial: com n operadores e shards de tamanho k, ha C(n,k) = n! / (k!·(n−k)!) shards possiveis; o blast radius maximo por cliente e 1/C(n,k). Com 8 operadores e shards de 2 → C(8,2) = 28 → sobre os mesmos 8 operadores, sharding regular de 4 shards da 1/4 (25%); shuffle sharding da 1/28 — **sete vezes melhor, sem adicionar nenhum operador**. (Melhoria **exponencial** no isolamento.)
> fonte: Colm MacCárthaigh | Workload isolation using shuffle sharding | seção: O que é fragmentação aleatória?

A propriedade contra-intuitiva: o isolamento **melhora com escala** (mais workers/clientes = mais shards possiveis) e o custo de infra e **geralmente nenhum** — e reorganizacao dos recursos existentes, sem servidores extras. E o bulkhead na sua forma combinatoria, com impacto 1-em-C(n,k).
> fonte: Colm MacCárthaigh | Workload isolation using shuffle sharding | seção: Conclusão

### Variantes

- **Stateless (hashing)** — o shard sai do hash do identificador, calculado **direto no cliente** sem consultar servico de mapeamento. Isolamento **probabilistico** (dois clientes podem colidir), zero estado, sem ponto unico de falha.
- **Stateful (searching)** — atribuicao que verifica cada shard novo contra os anteriores, impondo garantias auditaveis ("nenhum par compartilha > k endpoints"). Requer store confiavel dos mapeamentos. Use quando o SLA promete blast radius maximo garantido.
> fonte: Colm MacCárthaigh | Shuffle sharding: massive and magical fault isolation | seção: Infima and Shuffle Sharding
- **AZ-aware** — garante que cada shard pegue instancias de **todas** as AZs, senao a aleatoriedade pode concentrar o shard numa AZ so e anular o multi-AZ.
> fonte: Colm MacCárthaigh | Shuffle sharding: massive and magical fault isolation | seção: Infima and Shuffle Sharding
- **Recursivo** — para tenancy hierarquica (cliente que hospeda sub-clientes); cada camada multiplica combinatoriamente os shards e a complexidade.
> fonte: Colm MacCárthaigh | Workload isolation using shuffle sharding | seção: Conclusão

### Quando NÃO usar

- **Poison request que derruba QUALQUER worker** — se o request mata todo operador que o processa, shuffle sharding nao ajuda (o cliente afetado ainda precisa de mitigacao ativa; isolar ≠ resolver).
> fonte: Colm MacCárthaigh | Shuffle sharding: massive and magical fault isolation | seção: Shuffle Sharding
- **Stateful sem roteamento consistente / operadores nao intercambiaveis** — a formula C(n,k) pressupoe que qualquer operador do shard pode servir qualquer cliente do shard.
> fonte: Colm MacCárthaigh | Workload isolation using shuffle sharding | seção: O que é fragmentação aleatória?
- **Clientes sem retry sequencial** — o mecanismo depende de o cliente percorrer cada operador do shard **em ordem**; sem isso, a sobreposicao piora o isolamento em vez de melhorar.
> fonte: Colm MacCárthaigh | Shuffle sharding: massive and magical fault isolation | seção: Shuffle Sharding
- **Particionamento de DADOS** (um registro nao pode estar em multiplas particoes) — a sobreposicao de membership e especifica de fault isolation, nao se aplica a dados exclusivos.
> fonte: Colm MacCárthaigh | Shuffle sharding: massive and magical fault isolation | seção: Post-script

### Cross-refs

- **Route 53 nameservers** sao shuffle sharding aplicado a **DNS** — ver `infrastructure/references/dns-hosting.md` (Onda 2). O angulo DNS nao e re-sintetizado aqui.
- O padrao no **nivel do servico** (Bulkhead, #6) esta em `/anti-vibe-coding:defensive-patterns`; shuffle sharding e a versao combinatoria dessa mesma intuicao de isolar recursos por workload.

---

## Servicos Gerenciados

Para evitar complexidade operacional, considerar servicos gerenciados:

| Servico | Provider | O Que Resolve |
|---------|----------|---------------|
| **Amazon RDS** | AWS | PostgreSQL/MySQL gerenciado com replicas automaticas |
| **Amazon Aurora** | AWS | PostgreSQL/MySQL com replicacao otimizada e auto-scaling de leitura |
| **Cloud SQL** | GCP | PostgreSQL/MySQL gerenciado |
| **PlanetScale** | Independente | MySQL com sharding automatico (Vitess) |
| **CockroachDB Serverless** | Independente | SQL distribuido com sharding automatico |
| **Neon** | Independente | PostgreSQL serverless com branching |
| **Supabase** | Independente | PostgreSQL gerenciado com replicas |

### Quando Usar Gerenciado vs Self-Hosted

| Cenario | Recomendacao |
|---------|-------------|
| Time sem DBA dedicado | Gerenciado |
| Startup / time pequeno | Gerenciado |
| Requisito de compliance especifico | Self-hosted (ou gerenciado com VPC) |
| Volume extremo com otimizacao fina | Self-hosted |
| Custo e prioridade maxima | Avaliar (gerenciado pode ser mais barato que DBA) |

---

## Rebalancing de Shards

Quando precisar adicionar ou remover shards, dados precisam ser redistribuidos.

### Estrategias

| Estrategia | Como | Downtime |
|-----------|------|----------|
| **Consistent Hashing** | Minimiza movimentacao ao adicionar/remover shard | Minimo |
| **Double-write + migration** | Escrever em ambos os shards durante migracao | Zero (mas complexo) |
| **Dump + restore** | Exportar dados, reshardear, importar | Significativo |

### Consistent Hashing

Em vez de `hash % num_shards`, usar anel de hash:
- Cada shard ocupa uma faixa do anel
- Adicionar shard afeta apenas os vizinhos no anel
- Movimentacao de dados e minima (~1/N dos dados)

Planejar rebalancing ANTES de precisar. Durante crise nao e hora de redesenhar sharding.

---

## Failover e Surge-Replacement

Para OLTP de alta disponibilidade, **disponibilidade de escrita vem de replicas semi-sincronas que aceitam writes, nao dos "nines" de durabilidade do storage**. Durabilidade de volume (mesmo five-nines) protege contra falha de hardware de storage — nao contra perda da instancia. A meta do failover e *write-availability*, nao so durabilidade do dado.

Montagem de referencia (PlanetScale Metal): tres copias de cada shard sob replicacao semi-sincrona do MySQL, exigindo dois nos online para aceitar writes — failover em poucos segundos quando o primario cai.

**Surge-replacement** — para substituir um no sob carga sem perder tolerancia a falha, *expanda antes de contrair* (3 → 6 → 3) em vez de encolher o cluster (3 → 2). Ir de 3 para 2 remove a tolerancia exatamente quando ela mais importa; o surge nunca deixa menos de 3 nos funcionais.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: The surge pattern (preserving fault tolerance)

- **Surge e obrigatorio** quando o storage e ephemeral (NVMe local) — substituir um no passa por restore de backup, que leva tempo.
- **Surge e dispensavel** com storage detachavel (EBS detach/reattach em segundos) ou quando ja ha replicas extras alem do minimo para writes.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: The surge pattern (preserving fault tolerance)

> **Detalhe SQL-internals** (hardware/IOPS, NVMe local x EBS, e o trade-off durabilidade-de-volume != replicacao — C6): ver `sql-indexing-and-storage.md`.

---

## Anti-Patterns

- **Sharding prematuro** — complexidade brutal (cross-shard queries, rebalancing, backups). So fazer quando NAO houver alternativa
- **Shard key mutavel** — mudar shard key exige mover dados entre shards. Extremamente caro e arriscado
- **Shard key com baixa cardinalidade** — ex: `status` com 5 valores = 5 shards com distribuicao desigual
- **Ignorar replication lag** — ler de replica com 30s de lag e retornar dados incorretos para o usuario
- **Replicacao sincrona em TODAS as replicas** — mata performance de escrita. Usar semi-sincrona (1 replica sincrona, demais assincronas)
- **Nao planejar rebalancing** — quando precisar adicionar shards, como redistribuir dados? Planejar ANTES
- **Shardear antes de particionar** — particionamento de tabelas (PostgreSQL PARTITION BY) resolve muitos casos sem complexidade de sharding
- **Ignorar read-your-own-writes** — usuario escreve e nao ve a mudanca. Experiencia terrivel e bugs dificeis de reproduzir

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

## Anti-Patterns

- **Sharding prematuro** — complexidade brutal (cross-shard queries, rebalancing, backups). So fazer quando NAO houver alternativa
- **Shard key mutavel** — mudar shard key exige mover dados entre shards. Extremamente caro e arriscado
- **Shard key com baixa cardinalidade** — ex: `status` com 5 valores = 5 shards com distribuicao desigual
- **Ignorar replication lag** — ler de replica com 30s de lag e retornar dados incorretos para o usuario
- **Replicacao sincrona em TODAS as replicas** — mata performance de escrita. Usar semi-sincrona (1 replica sincrona, demais assincronas)
- **Nao planejar rebalancing** — quando precisar adicionar shards, como redistribuir dados? Planejar ANTES
- **Shardear antes de particionar** — particionamento de tabelas (PostgreSQL PARTITION BY) resolve muitos casos sem complexidade de sharding
- **Ignorar read-your-own-writes** — usuario escreve e nao ve a mudanca. Experiencia terrivel e bugs dificeis de reproduzir

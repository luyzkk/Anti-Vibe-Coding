# Estrategias de Cache — Referencia Detalhada

## Estrategias de Cache

| Estrategia | Como Funciona | Quando Usar |
|------------|---------------|-------------|
| **Cache-Aside (Lazy Loading)** | App verifica cache → miss → busca no banco → grava no cache | **PADRAO.** Usar como default |
| **Write-Through** | Toda escrita grava no cache E no banco simultaneamente | Dados que SEMPRE serao lidos logo apos escrita |
| **Write-Behind (Write-Back)** | Escrita vai pro cache, banco e atualizado assincronamente | Write-heavy com tolerancia a perda (analytics, logs) |
| **Read-Through** | Cache busca do banco automaticamente no miss | Quando cache provider suporta (ex: NCache) |

**REGRA:** Comecar com Cache-Aside. So mudar se houver problema comprovado com essa estrategia.

### Cache-Aside em Detalhe

```
Leitura:
  1. App consulta cache
  2. Cache HIT → retorna dado
  3. Cache MISS → busca no banco → grava no cache → retorna dado

Escrita:
  1. App escreve no banco
  2. App invalida (deleta) chave do cache
  3. Proxima leitura popula cache novamente
```

Vantagens: simplicidade, cache so armazena dados realmente acessados. Desvantagem: primeiro acesso sempre lento (miss).

### Write-Through em Detalhe

```
Escrita:
  1. App escreve no cache
  2. Cache escreve no banco (sincrono)
  3. Confirmacao retorna ao app

Leitura:
  1. App consulta cache (dado sempre presente apos escrita)
```

Vantagens: cache sempre atualizado, leitura rapida apos escrita. Desvantagem: latencia maior na escrita (dupla gravacao).

### Write-Behind em Detalhe

```
Escrita:
  1. App escreve no cache
  2. Cache retorna confirmacao imediatamente
  3. Cache escreve no banco em background (assincrono, batch)

RISCO: se cache cair antes de flush, dados sao PERDIDOS
```

Usar APENAS para dados onde perda e aceitavel (metricas, contadores, analytics).

---

## Invalidacao — O Problema Mais Dificil

### Metodos de Invalidacao

| Metodo | Como | Trade-off |
|--------|------|-----------|
| **TTL (Time-to-Live)** | Cache expira apos X tempo | Simples, mas dado pode ficar stale ate expirar |
| **Invalidacao Explicita** | Evento de escrita apaga a chave do cache | Consistente, mas acoplamento entre escrita e cache |
| **TTL + Invalidacao** | TTL como safety net + invalidacao no write | **RECOMENDADO.** Melhor de ambos |

### TTLs Recomendados por Tipo de Dado

| Tipo de Dado | TTL Sugerido | Justificativa |
|--------------|-------------|---------------|
| Configuracoes do sistema | 5-15 minutos | Muda raramente, impacto baixo se stale |
| Dados de perfil de usuario | 5-10 minutos | Muda pouco, usuario tolera delay |
| Feed / timeline | 1-5 minutos | Expectativa de atualizacao moderada |
| Resultado de busca | 1-5 minutos | Resultados mudam gradualmente |
| Dados financeiros (saldo) | 0 (sem cache) ou < 10s | Dado critico, stale e inaceitavel |
| Sessao de usuario | 15-30 minutos | Alinhado com timeout de sessao |
| Catalogo de produtos | 5-30 minutos | Precos mudam pouco, alta leitura |

### Invalidacao Explicita — Padroes

**Delete (recomendado):** apagar chave no write, proxima leitura repopula.

```
Escrita → banco.update(dados) → cache.delete(chave)
```

**Update (arriscado):** atualizar cache no write. Risco de race condition entre escritas concorrentes.

```
Escrita → banco.update(dados) → cache.set(chave, dados)  ← NAO RECOMENDADO
```

Preferir DELETE sobre UPDATE. DELETE e idempotente e elimina race conditions.

---

## Eviction Policies (Cache Cheio)

| Politica | Comportamento | Quando Usar |
|----------|---------------|-------------|
| **LRU (Least Recently Used)** | Remove item acessado ha mais tempo | **PADRAO.** Funciona bem para maioria dos casos |
| **LFU (Least Frequently Used)** | Remove item acessado menos vezes | Dados "quentes" que devem SEMPRE estar em cache |
| **TTL-based** | Remove itens expirados primeiro | Quando TTL e a principal estrategia |
| **Random** | Remove item aleatorio | Quase nunca. So benchmarks |
| **FIFO (First In, First Out)** | Remove item mais antigo | Simples, previsivel, mas ignora padrao de acesso |

### LRU vs LFU

- **LRU** — bom para carga geral. Item pouco acessado recentemente sai. Problema: scan de dados infrequente pode expulsar itens populares.
- **LFU** — protege itens populares. Problema: itens que FORAM populares mas nao sao mais ficam "grudados" no cache (frequency aging resolve isso).

Na duvida, usar **LRU**. E o default do Redis e funciona bem em 90% dos casos.

---

## Cache Stampede (Dog-Pile Problem)

Quando cache expira e N requests simultaneas vao todas ao banco:

```
Cache expira → 1000 requests simultaneas → 1000 queries identicas ao banco → banco sobrecarregado
```

### Solucao 1: Mutex/Lock

```
1. Primeiro request encontra miss → adquire lock
2. Demais requests esperam ou recebem dado stale
3. Primeiro request popula cache e libera lock
4. Demais requests leem do cache
```

### Solucao 2: Refresh Antecipado (Probabilistic Early Expiry)

```
Cache com TTL de 10 minutos
Apos 8 minutos, cada request tem probabilidade de disparar refresh
Primeiro request a disparar atualiza em background
Demais continuam recebendo dado do cache ate atualizar
```

### Solucao 3: Never-Expire + Background Refresh

```
Cache nunca expira (TTL infinito)
Worker em background atualiza periodicamente
Eliminacao completa de stampede
Trade-off: dado pode ficar stale ate proximo refresh
```

---

## Cold Start de Cache

Situacao: cache vazio (deploy, restart, failover). Todas as requests vao ao banco.

### Mitigacoes

1. **Pre-warming** — popular cache com dados mais acessados apos deploy
2. **Gradual rollout** — direcionar trafego gradualmente para nova instancia
3. **Cache hierarquico** — cache local (L1) + cache distribuido (L2). Se L2 tem dado, L1 miss nao vai ao banco
4. **Rate limiting no banco** — limitar queries simultaneas durante warm-up

---

## Cache Local vs Distribuido

| Aspecto | Cache Local (in-process) | Cache Distribuido (Redis/Memcached) |
|---------|-------------------------|-------------------------------------|
| Latencia | ~1 microsegundo | ~1 milissegundo |
| Capacidade | Limitada pela RAM do processo | Cluster dedicado, GBs a TBs |
| Consistencia | Cada instancia tem copia diferente | Compartilhado entre instancias |
| Invalidacao | Dificil entre instancias | Centralizada |
| Quando usar | Dados que NUNCA mudam ou TTL < 10s | **PADRAO.** Maioria dos cenarios |

### Cache Hierarquico (L1 + L2)

```
Request → L1 (local, microsegundos)
  HIT → retorna
  MISS → L2 (Redis, milissegundos)
    HIT → popula L1, retorna
    MISS → Banco (dezenas de ms)
      → popula L2 → popula L1 → retorna
```

Usar quando latencia do Redis e relevante (milhoes de requests/segundo).

---

## Redis vs Memcached

| Aspecto | Redis | Memcached |
|---------|-------|-----------|
| Estruturas de dados | Strings, hashes, sets, sorted sets, lists, streams | Apenas strings (chave-valor) |
| Persistencia | RDB snapshots, AOF log | Nao (puramente in-memory) |
| Replicacao | Nativa (primario-replica) | Nao nativa |
| Pub/Sub | Sim | Nao |
| Scripting | Lua scripts | Nao |
| Multithreaded | Single-threaded (I/O threads no Redis 6+) | Multithreaded |
| Uso de memoria | Overhead por estruturas de dados | Mais eficiente para strings simples |

### Quando Usar Cada Um

- **Redis** — padrao para maioria dos casos. Mais features, persistencia, pub/sub, replicas
- **Memcached** — cache puro de strings com alta concorrencia. Levemente mais rapido para cenario simples key-value
- Na duvida, **usar Redis**. Versatilidade compensa o overhead marginal

---

## Metricas Obrigatorias

| Metrica | Alvo | Acao se Fora |
|---------|------|-------------|
| **Hit Rate** | >= 85% | Revisar TTLs, verificar chaves, analisar padrao de acesso |
| **Latencia do Cache** | < 5ms (P99) | Verificar rede, tamanho dos valores, serializer |
| **Memoria usada** | < 80% da capacidade | Ajustar eviction, remover chaves desnecessarias |
| **Eviction Rate** | Baixa e estavel | Se alta, aumentar memoria ou reduzir TTLs |
| **Conexoes ativas** | < 80% do max | Verificar connection pooling, leaks |

### Monitorar Hit Rate

Hit rate < 50% indica que cache esta causando overhead sem beneficio. Investigar:
- Chaves com alta cardinalidade (muitos valores unicos, poucos reuses)
- TTLs muito curtos (dados expiram antes de serem reutilizados)
- Padrao de acesso aleatorio (cada request acessa dados diferentes)

---

## Anti-Patterns

- **Cachear tudo indiscriminadamente** — cache tem custo (memoria, invalidacao, complexidade). Cachear so o que e caro e frequente
- **Nao monitorar hit rate** — cache com hit rate de 20% e pior que nao ter cache (overhead sem beneficio)
- **TTL infinito sem invalidacao** — dados ficam stale para sempre
- **Cache sem redundancia em producao** — Redis single-node cai = toda aplicacao fica lenta instantaneamente
- **Serializar objetos complexos inteiros** — cache de 1MB por chave mata performance. Cachear so o necessario
- **Ignorar cache stampede** — "nao vai acontecer" ate o cache expirar e milhares de requests simultaneas irem ao banco
- **Cache como fonte de verdade** — cache e efemero. Banco e a fonte de verdade. Cache pode ser limpo a qualquer momento
- **Invalidacao por UPDATE em vez de DELETE** — race conditions entre escritas concorrentes corrompem cache

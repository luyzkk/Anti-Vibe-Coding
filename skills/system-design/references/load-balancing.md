# Load Balancing — Referencia Detalhada

## O que e Load Balancer

Componente que distribui requisicoes entre multiplos servidores, evitando sobrecarga em qualquer servidor individual. E o ponto central de scaling horizontal.

## Progressive Scaling

```
1. Single Server → toda a aplicacao em uma maquina
2. Separar Web + DB → DB em maquina dedicada
3. DNS Round Robin → DNS retorna IPs diferentes (sem health check)
4. Load Balancer → distribui trafego inteligentemente
5. Health Checks → LB detecta servidores doentes e remove do pool
6. SPOF Mitigation → redundancia do proprio LB (active-passive ou active-active)
```

## 7 Algoritmos de Load Balancing

### 1. Round Robin
Distribui requisicoes em sequencia circular: Server 1 → Server 2 → Server 3 → Server 1...

**Quando usar:** Servidores com capacidade similar, requests com custo homogeneo.
**Problema:** Ignora carga atual — um servidor lento continua recebendo requests.

### 2. Least Connections
Envia para o servidor com MENOS conexoes ativas no momento.

**Quando usar:** Quando requests tem duracao variavel (alguns rapidos, outros longos).
**Vantagem:** Se adapta a carga real, nao apenas distribuicao numerica.

### 3. Least Response Time
Envia para o servidor que esta respondendo MAIS RAPIDO no momento.

**Quando usar:** Quando latencia e critica.
**Vantagem:** Combina carga e performance. Mais inteligente que Least Connections.

### 4. IP Hash
Calcula hash do IP do cliente para determinar qual servidor atende. Mesmo IP = sempre mesmo servidor.

**Quando usar:** Session affinity necessaria (estado no servidor).
**Problema:** Se um servidor cair, TODOS os clientes desse hash sao redistribuidos.
**Alternativa melhor:** Consistent Hashing.

### 5. Weighted Round Robin / Weighted Least Connections
Servidores recebem pesos proporcionais a sua capacidade. Servidor com peso 3 recebe 3x mais requests que peso 1.

**Quando usar:** Servidores com capacidades DIFERENTES (ex: 4 cores vs 16 cores).

### 6. Geographical / DNS-based
Roteia baseado na localizacao geografica do cliente.

**Quando usar:** Usuarios em multiplas regioes. CDN. Compliance de dados por regiao.

### 7. Consistent Hashing
Hash ring onde tanto servidores quanto requests sao mapeados. Quando um servidor e adicionado/removido, apenas uma fracao dos requests e redistribuida.

**Quando usar:** Cache distribuido, sessoes, qualquer cenario onde adicionar/remover servidores nao deve invalidar TODO o mapeamento.
**Vantagem:** Minima redistribuicao ao escalar.

## Decision Tree: Qual Algoritmo

```
Servidores tem capacidade igual?
├─ NAO → Weighted Round Robin ou Weighted Least Connections
├─ SIM
│   ├─ Requests tem duracao variavel?
│   │   ├─ SIM → Least Connections ou Least Response Time
│   │   ├─ NAO → Round Robin (simples, eficiente)
│   ├─ Precisa de session affinity?
│   │   ├─ SIM → IP Hash ou Consistent Hashing
│   ├─ Usuarios em multiplas regioes?
│   │   ├─ SIM → Geographical
│   ├─ Cache distribuido?
│   │   ├─ SIM → Consistent Hashing
```

## L4 vs L7 Load Balancing

| Aspecto | L4 (Transport) | L7 (Application) |
|---------|----------------|-------------------|
| Camada | TCP/UDP | HTTP/HTTPS |
| Decisao baseada em | IP, porta | URL, headers, cookies, body |
| Performance | Mais rapido (menos processamento) | Mais lento (inspeciona conteudo) |
| Flexibilidade | Basica | Content-based routing, SSL termination |
| Exemplo | HAProxy (modo TCP) | Nginx, HAProxy (modo HTTP), ALB |

**Regra:** L7 para a maioria dos cenarios web (precisa inspecionar HTTP). L4 quando performance maxima e prioridade e nao precisa de roteamento por conteudo.

## Health Checks

Load Balancer DEVE verificar saude dos servidores continuamente:

- **Ping check:** TCP connection ao servidor
- **HTTP check:** `GET /health` retorna 200
- **Deep check:** Verifica conexao com DB, cache, dependencias

**Se servidor nao responde ao health check:**
1. Remover do pool de servidores ativos
2. Continuar verificando periodicamente
3. Re-adicionar automaticamente quando voltar a responder (self-healing)

## SPOF (Single Point of Failure) no Load Balancer

O Load Balancer resolve SPOF dos servidores, mas cria NOVO SPOF: se o LB cair, TUDO para.

**Solucao:** Redundancia de LBs:
- **Active-Passive:** LB primario recebe todo trafego. Se cair, secundario assume (failover)
- **Active-Active:** Ambos LBs recebem trafego (mais complexo, mais resiliente)

## Software vs Hardware Load Balancers

| Tipo | Exemplos | Pro | Contra |
|------|----------|-----|--------|
| Software | Nginx, HAProxy, Envoy | Barato, flexivel, open source | Compartilha recursos do host |
| Hardware | F5, Citrix | Performance dedicada | Caro, vendor lock-in |
| Cloud | AWS ALB/NLB, GCP LB | Managed, auto-scaling | Custo variavel, vendor lock-in |

**Regra:** Software LB para a maioria. Cloud LB quando ja esta no cloud provider. Hardware LB para cenarios de altissima performance.

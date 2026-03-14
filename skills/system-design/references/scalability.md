# Escalabilidade — Referencia Detalhada

## Vertical vs Horizontal

| Tipo | O Que Faz | Quando Usar | Limite |
|------|-----------|-------------|--------|
| **Vertical (Scale Up)** | Mais CPU, RAM, disco na mesma maquina | Primeiro passo. Simples, sem mudanca de codigo | Limite fisico da maior maquina disponivel |
| **Horizontal (Scale Out)** | Mais maquinas rodando a mesma aplicacao | Quando vertical atinge limite ou precisa de HA | Teoricamente ilimitado, mas complexidade cresce |

**REGRA:** Vertical primeiro. Mais simples, mais barato e nao exige mudanca arquitetural. Horizontal so quando atingir o limite ou precisar de redundancia.

### Quando Usar Cada Tipo

| Cenario | Recomendacao | Justificativa |
|---------|-------------|---------------|
| MVP / Startup inicial | Vertical | Simplicidade. Focar no produto, nao na infra |
| Trafego previsivel ate ~10k RPM | Vertical (maquina robusta) | Mais barato que gerenciar cluster |
| Trafego variavel com picos | Horizontal + auto-scaling | Pagar so pelo que usa durante picos |
| Alta disponibilidade obrigatoria | Horizontal (min 2 nos) | Redundancia contra falha de maquina |
| > 50k RPM sustentado | Horizontal | Limite fisico de uma unica maquina |

---

## Arquitetura Stateless

**Requisito obrigatorio para escalar horizontalmente.** Nenhum estado pode viver no servidor de aplicacao.

### O Que Externalizar

| Estado | Onde Colocar | Exemplo |
|--------|-------------|---------|
| Sessoes de usuario | Redis / Memcached | Token JWT ou session ID em store externo |
| Arquivos de upload | Object storage (S3, R2, GCS) | Nunca salvar em disco local do servidor |
| Cache de aplicacao | Redis / Memcached | Nao usar cache in-memory que morre com o processo |
| Filas de processamento | Message broker (SQS, RabbitMQ) | Nao processar em background no mesmo servidor |
| Estado de WebSocket | Redis Pub/Sub | Broadcast entre instancias via canal compartilhado |

### Validacao de Stateless

Testar se a aplicacao e stateless: matar qualquer instancia a qualquer momento nao pode causar perda de dados ou sessao de usuario. Se causar, ha estado local que precisa ser externalizado.

---

## Load Balancer

### L4 vs L7

| Camada | Opera Em | Capacidade | Quando Usar |
|--------|----------|------------|-------------|
| **L4 (Transporte)** | TCP/UDP | Ve IP e porta. Mais rapido, menos inteligente | Trafego generico, alta performance, protocolo nao-HTTP |
| **L7 (Aplicacao)** | HTTP/HTTPS | Ve URL, headers, cookies. Roteamento inteligente | APIs REST, roteamento por path, SSL termination |

### Algoritmos de Balanceamento

| Algoritmo | Como Funciona | Quando Usar |
|-----------|---------------|-------------|
| **Round Robin** | Distribui sequencialmente entre servidores | **PADRAO.** Servidores homogeneos, requests stateless |
| **Weighted Round Robin** | Round Robin com peso por servidor | Servidores com capacidades diferentes |
| **Least Connections** | Envia para servidor com menos conexoes ativas | Requests com tempo de processamento variavel |
| **IP Hash** | Hash do IP do cliente determina servidor | Sticky sessions (WebSockets, conexoes longas) |
| **Random** | Escolhe servidor aleatorio | Distribuicao estatisticamente uniforme em larga escala |

### Regras Praticas

- Usar **Round Robin** como default para APIs REST
- Usar **Least Connections** quando requests tem duracao variavel (ex: uploads grandes)
- Usar **IP Hash** apenas quando necessario (WebSockets). Prejudica distribuicao uniforme
- **SEMPRE** configurar health checks ativos (a cada 10-30 segundos)
- Configurar **draining** para desligar instancias graciosamente (finalizar requests em andamento)

### Health Checks

| Tipo | O Que Verifica | Quando Usar |
|------|---------------|-------------|
| **TCP** | Porta aberta | Verificacao basica, rapida |
| **HTTP** | Endpoint retorna 200 | **RECOMENDADO.** Verifica que app esta respondendo |
| **Deep** | Conectividade com banco, cache, dependencias | Verifica saude completa, mas pode ser lento |

Configurar health check HTTP em endpoint dedicado (`/health` ou `/healthz`). Deep health check em endpoint separado (`/ready`) para nao remover instancia por falha temporaria de dependencia.

---

## Auto-Scaling

### Metricas e Thresholds

| Metrica | Threshold Scale Up | Threshold Scale Down | Observacao |
|---------|-------------------|---------------------|------------|
| CPU | > 70% por 5 minutos | < 30% por 10 minutos | Metrica mais confiavel |
| Memoria | > 80% por 5 minutos | < 40% por 10 minutos | Cuidado com memory leaks (nunca escala down) |
| Request queue | > 100 pendentes | < 10 pendentes | Indica saturacao real |
| Latencia P99 | > 500ms por 5 minutos | < 100ms por 10 minutos | Reflete experiencia do usuario |

### Regras de Auto-Scaling

1. **SEMPRE definir limite maximo** — bug que gera loop pode criar 100 instancias e explodir a conta
2. **Scale up rapido, scale down lento** — subir em 1-2 minutos, descer em 10-15 minutos
3. **Cooldown period** — esperar 3-5 minutos entre acoes de scaling para evitar oscilacao
4. **Pre-warming** — agendar scale up antes de picos conhecidos (Black Friday, campanha de marketing)

### Cold Start

Novas instancias precisam de tempo para aquecer:
- JIT compilation (JVM, .NET)
- Cache local (vazio apos start)
- Connection pools (estabelecendo conexoes)
- Warmup de rotas/modulos (lazy loading)

Mitigar com:
- Readiness probe separada do liveness probe
- Pre-warming de cache apos start
- Connection pool com tamanho minimo pre-configurado

---

## CDN (Content Delivery Network)

### O Que Colocar em CDN

| Conteudo | CDN? | TTL Sugerido |
|----------|------|-------------|
| Imagens, videos | SEMPRE | 30 dias+ (versionamento por hash no filename) |
| CSS, JS bundles | SEMPRE | 1 ano (cache-busting via hash no filename) |
| Fontes | SEMPRE | 1 ano |
| HTML de paginas estaticas | Sim | 5-60 minutos |
| Respostas de API | Raramente | 0-60 segundos (varia muito por caso) |
| Conteudo autenticado | NAO | N/A |

### Cache-Busting

Usar hash no nome do arquivo para invalidar cache sem esperar TTL:

```
styles.abc123.css  → atualizar para → styles.def456.css
```

Bundlers modernos (Vite, webpack) fazem automaticamente.

---

## Arquitetura em Tres Camadas

Estrutura classica para aplicacoes escaladas horizontalmente:

```
[CDN] → [Load Balancer]
              ↓
    [App Server 1] [App Server 2] [App Server N]  ← stateless
              ↓              ↓              ↓
         [Cache Layer - Redis Cluster]
              ↓
         [Database - Primary + Replicas]
```

### Responsabilidades

| Camada | Responsabilidade | Escala Como |
|--------|-----------------|-------------|
| **CDN + LB** | Distribuir trafego, servir estaticos | Servico gerenciado (CloudFlare, AWS ALB) |
| **App Servers** | Logica de negocio, APIs | Horizontal (auto-scaling, stateless) |
| **Cache** | Dados frequentes, sessoes | Redis Cluster (horizontal com sharding) |
| **Database** | Persistencia, transacoes | Vertical + Replicacao (ver `replication-sharding.md`) |

---

## Anti-Patterns

- **Escalar horizontal com servidor stateful** — sessoes em memoria local = usuarios perdendo sessao a cada request
- **Auto-scaling sem limite maximo** — bug pode criar dezenas de instancias e explodir a conta da cloud
- **Escalar antes de otimizar** — adicionar servidores para compensar queries N+1 ou codigo ineficiente e jogar dinheiro fora
- **Load balancer sem health check** — enviar trafego para instancia morta = erros cascateados
- **Ignorar cold start** — novas instancias precisam de tempo para aquecer (JIT, cache local, conexoes de banco)
- **CDN para conteudo autenticado** — expor dados privados em cache compartilhado
- **Scale down agressivo** — instancias subindo e descendo a cada minuto causa instabilidade

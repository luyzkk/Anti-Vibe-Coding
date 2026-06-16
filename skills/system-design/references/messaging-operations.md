# Operacao de Filas e Mensageria — Referencia Detalhada

Escolher e operar a infra de filas: que broker existe, que tipo de fila usar, como rodar background jobs, quanta durabilidade a mensagem tem, e o que fazer quando o backlog acumula ou a entrada supera o consumo.

Esta reference cobre **escolha e operacao**. Para *garantias de entrega* (at-most-once / at-least-once / exactly-once) remeta a `messaging-models.md` (irma). Para *idempotencia, retry de jobs e DLQ como padroes de confiabilidade* remeta a `messaging-reliability.md` (irma).

**REGRA:** nao existe "vencedor" unico de mensageria — a escolha depende inteiramente do requisito dominante. Defina o requisito dominante PRIMEIRO; so entao selecione o sistema.
> fonte: Tyler Treat | Dissecting Message Queues | seção: Conclusion

---

## Landscape de brokers — como escolher o sistema

Comparar filas nao serve para eleger uma "melhor", mas para mapear opcoes a requisitos. Alguns casos pedem mensagens rapidas fire-and-forget, outros exigem garantia de entrega, e muitos sistemas reais pedem uma combinacao. Case a solucao ao problema — nunca um default por reputacao ou benchmark isolado.
> fonte: Tyler Treat | Dissecting Message Queues | seção: Conclusion

Pano de fundo honesto do landscape inteiro: **entrega garantida e um mito.** Nada e 100% garantido na transmissao distribuida; so at-most-once (pode perder) e at-least-once (pode duplicar) sao reais. Construa sistemas que roteiam ao redor do dano, nao escolha um broker porque ele "promete exactly-once". (Semanticas de entrega: ver `messaging-models.md`.)
> fonte: Tyler Treat | Dissecting Message Queues | seção: ZeroMQ and Nanomsg

### Os eixos de decisao

A primeira clivagem e estrutural — **brokerless (peer-to-peer)** vs **brokered (servidor intermediario)**. O broker e exatamente o lugar onde garantias de entrega, persistencia, ack, replicacao e fan-out sao implementadas; brokerless sao abstracoes de socket sem essas garantias.

| | Brokerless (P2P) | Brokered (servidor intermediario) |
|---|---|---|
| Exemplos | nanomsg, ZeroMQ | ActiveMQ, NATS, Kafka, Kestrel, NSQ, RabbitMQ, Redis |
| Throughput | dramaticamente maior (ordens de grandeza) | menor — metade dos brokered testados ficou < 25.000 msg/s |
| Deploy | nada a operar: a lib e embarcada na app | um servidor a mais para operar (parte movel extra) |
| Garantias | nenhuma de entrega/persistencia (so atomico + ordenado) | onde vivem entrega garantida, persistencia, ack, replicacao, fan-out |

> fonte: Tyler Treat | Dissecting Message Queues | seção: Throughput Benchmarks

**REGRA do eixo brokerless × brokered:** SE precisa de entrega garantida, persistencia ou desacoplamento produtor/consumidor → brokered; SE precisa de throughput maximo + deploy zero e tolera best-effort → brokerless.
> fonte: Tyler Treat | Dissecting Message Queues | seção: Throughput Benchmarks

Os demais eixos que separam os brokered:

- **Eixo persistencia × velocidade** — o trade-off mais citado. NATS e o caso-limite do lado velocidade: leve, "mais parecida com um sistema nervoso" que uma fila enterprise; nao faz persistencia nem transacoes, mas e rapida e tem latencia praticamente constante. Troca persistencia por velocidade — mensagem sem consumidor se perde. No lado oposto, brokers AMQP usam acknowledgements + persistencia em disco para sobreviver a restart, pagando **penalidade massiva de latencia**.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: NATS and Ruby-NATS
  > fonte: Tyler Treat | Dissecting Message Queues | seção: ActiveMQ and RabbitMQ
- **Eixo descarta-no-consumo × retem-para-replay (modelo log)** — filas duraveis **removem** a mensagem ao consumir; Kafka **retem** as mensagens por um periodo configurado e permite "replay" se um consumidor falhar. Habilita event sourcing, pipelines de dados e reprocessamento. Escala via ZooKeeper (mais um componente). O mesmo modelo log reaparece no RabbitMQ via Stream Queue (ver secao RabbitMQ).
  > fonte: Tyler Treat | Dissecting Message Queues | seção: Kafka
- **Eixo throughput × garantias** — cada garantia adicional (ack, fsync, replicacao) custa throughput e/ou latencia. **Throughput nao e numero unico:** ha throughput de envio (sender) e de recebimento (receiver), e quase sempre o sender e maior. Em brokerless a disparidade pode ser enorme (ZeroMQ enviou >5M/s mas recebeu ~600k/s); em brokered as razoes ficam proximas de 1. Razao sender/receiver muito acima de 1 sinaliza **gargalo no consumidor**.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: Throughput Benchmarks
- **Latencia nao e o inverso do throughput** — e medida end-to-end, varia por mensagem e cresce com enfileiramento (NATS e RabbitMQ exibiram latencia praticamente constante; ActiveMQ/Kafka, linear).
  > fonte: Tyler Treat | Dissecting Message Queues | seção: Latency Benchmarks
- **Eixo DB-backed × broker dedicado** → conflito **C5**, secao propria abaixo.

**REGRA de medicao:** o proprio autor (2020) desautoriza os numeros do survey — single-broker, single-pair, num MacBook Pro. Use os numeros como **diretriz qualitativa, nunca base de decisao** — meca na sua topologia real (cluster, mensagens representativas, carga de producao).
> fonte: Tyler Treat | Dissecting Message Queues | seção: Disclaimer

### Taxonomia dos sistemas (mapa rapido)

| Sistema | Classe | Persistencia | Garantia / ordem | Marca registrada |
|---|---|---|---|---|
| **ZeroMQ** | brokerless | nao | best-effort, atomico+ordenado | maduro (2007), battle-tested, deploy zero |
| **nanomsg** | brokerless | nao | best-effort, atomico+ordenado | API mais limpa, protocolos plugaveis, mas beta |
| **NATS** | brokered | nao (core) | fire-and-forget, perde sem consumidor | leve, "sistema nervoso", clustering p/ HA |
| **Redis pub/sub** | brokered | transiente (in-memory) | desconecta clientes lentos | footprint pequeno; nao-confiavel como backbone |
| **NSQ** | brokered | in-memory (disco opcional, sem replicacao) | at-least-once, sem ordem, duplica | deploy facil, APIs HTTP/TCP; idempotencia e do dev |
| **Kestrel** | brokered | filas duraveis | sem clustering/failover (particionamento no cliente) | pequeno e simples; robustez recai no dev |
| **Kafka** | brokered | log retido p/ replay | per-partition; escala via ZooKeeper | log duravel, replay, all-in-one clusterizado |
| **ActiveMQ / RabbitMQ** | brokered (AMQP) | disco por padrao | entrega confirmada via ack (custa latencia) | garantias ricas; AMQP admitidamente over-engineered |

> fonte: Tyler Treat | Dissecting Message Queues | seção: ZeroMQ and Nanomsg / NATS and Ruby-NATS / Redis / NSQ / Kestrel / Kafka / ActiveMQ and RabbitMQ

Notas que nao cabem na tabela:

- **AMQP custa complexidade.** Os proprios criadores admitem que e over-engineered — protocolo complexo, clientes dificeis, mais partes moveis. Nao adote AMQP pesado por default ("e o padrao de mercado") para fire-and-forget leve.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: ActiveMQ and RabbitMQ
- **NSQ → idempotencia e sua.** at-least-once, sem ordem, pode entregar mais de uma vez; consumir sem dedup leva a processamento duplicado. (Padrao: ver `messaging-reliability.md`.)
  > fonte: Tyler Treat | Dissecting Message Queues | seção: NSQ
- **Redis nao e backbone.** Otimo para mensageria leve/transiente e real-time, mas desconecta clientes lentos e falha sob volume.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: Redis
- **RabbitMQ e coringa multiprotocolo.** Alem de AMQP 0-9-1 fala MQTT (IoT/dispositivos leves) — nao descarte por achar que so fala AMQP.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Contexto do RabbitMQ

**Sistemas gerenciados / fora do survey, mas no landscape real:**

- **AWS SQS** — broker gerenciado, **at-least-once** duradouro e escalavel: produtor enfileira, consumidor pede periodicamente, processa e exclui apos concluir. Consumidor precisa ser idempotente.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Sistemas baseados em filas
- **BullMQ / Bull (Node)** — fila de jobs **sobre Redis**: sem Redis a fila nao existe; producer e workers apontam para o mesmo host:porta. Redis vira ponto unico critico. (Detalhe operacional: secao background jobs.)
  > fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: O Redis (peça crítica de infraestrutura)
- **Postgres como fila transacional** (Pixeltable) — enqueue/dequeue participam da mesma transacao ACID que grava os dados, eliminando o "dual write". Limita o throughput ao que o Postgres suporta. (Ver C5.)
  > fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)

### Arvore de decisao — escolher o sistema

```
Escolher sistema de mensageria — defina o REQUISITO DOMINANTE primeiro.
│
├── Precisa de garantia de entrega / persistencia / desacoplamento prod-consumidor?
│   │
│   ├── NAO (tolera perda, quer throughput max + deploy zero)
│   │     → BROKERLESS: ZeroMQ (maduro) ou nanomsg (API limpa, aceita beta).
│   │       (lib embarcada, sem servidor; best-effort atomico+ordenado)
│   │
│   └── SIM → BROKERED. Qual a dimensao dominante?
│         │
│         ├── Velocidade > durabilidade (fire-and-forget, HA via cluster, tolera perda)
│         │     → NATS.  (Redis pub/sub so p/ real-time leve, NUNCA backbone)
│         │
│         ├── Log duravel + REPLAY + muitos consumidores
│         │     → Kafka  (ou RabbitMQ Stream p/ cargas estilo-Kafka dentro do RabbitMQ)
│         │
│         ├── Garantias enterprise completas (ack + persistencia + fault tolerance)
│         │     → AMQP: RabbitMQ / ActiveMQ  (aceite complexidade + latencia de ack)
│         │
│         ├── Gerenciado, sem operar broker, at-least-once
│         │     → SQS  (consumidor idempotente; ver messaging-reliability.md)
│         │
│         └── E JOB QUEUE de aplicacao? → cai em C5:
│               ├── Volume alto / SLA apertado / fan-out real p/ N consumidores
│               │     → BROKER DEDICADO (Redis/BullMQ, Kafka, RabbitMQ)
│               └── Volume baixo-medio OU atomicidade fila↔estado OU minimizar moving parts
│                     → DB-BACKED:
│                        ├── enqueue+gravacao atomicos → Postgres fila transacional
│                        ├── escala baixa / self-hosted single-image → Solid Queue + SQLite
│                        └── escala media → Solid Queue + Postgres/MySQL 8+
│
└── Vai decidir por PERFORMANCE?
      → NAO confie em benchmark de blog (single-pair/single-broker, desautorizado).
        Meca na topologia real. Throughput tem 2 lados (sender≠receiver);
        latencia ≠ 1/throughput.
```
> fonte da decisao brokerless×brokered: Tyler Treat | Dissecting Message Queues | seção: Throughput Benchmarks
> fonte do ramo medicao: Tyler Treat | Dissecting Message Queues | seção: Disclaimer

---

## Tipos de fila do RabbitMQ — Classic · Quorum · Stream

Filas nao sao todas iguais no RabbitMQ. Ha tres tipos vivos hoje, tres pontos distintos na mesma curva **garantia/durabilidade × latencia/throughput**. Declarar filas sem escolher o tipo conscientemente (assumir que "toda fila e igual") e um anti-pattern que so aparece em producao — perda de mensagens, degradacao, ou o RabbitMQ virar inviavel no projeto.
> fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Por que o tipo de fila importa

| Tipo | Replicacao | Durabilidade | Throughput | Consumo | Caso de uso |
|---|---|---|---|---|---|
| **Classic** | Nenhuma — fila num unico no; no cai → nao publica/consome | Disco (lento) ou memoria (rapido, perde no restart) | Teto de um no, so escala vertical | Push (broker empurra, Prefetch) | Request-reply, migracao via Shovel, filas efemeras/em memoria onde perder e OK |
| **Quorum** | Raft — operacao valida quando o quorum (maioria) confirma | Forte: fsync em disco antes do Publisher Confirm | ~40 mil msg/s; > filas espelhadas pelo I/O do WAL | Push (broker empurra, Prefetch) | Alta confiabilidade producao/consumo; migracao de filas espelhadas |
| **Stream** | Raft herdado da Quorum — replica e confirma por maioria | Mais fraca: fsync adiado (buffer em memoria) → pequena janela de perda | ~1 milhao msg/s (~25× a Quorum) | Pull (consumidor dita o ritmo, sem ack/reindexacao) | Milhoes de msg, replay/auditoria/retencao, fan-out sem roteamento |

> fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Limitações da Classic Queue / Algoritmo Raft / Write-Ahead Log (WAL) e fsync / Streams herdam arquitetura da Quorum / Throughput das Streams / Principais características das Streams

**REGRA sobre os numeros:** ~1M (Stream) e ~40k (Quorum) sao **ordem de grandeza, nao garantia** — dependem de hardware, configuracao e padrao de uso.
> fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Throughput das Streams

### Quando usar cada tipo

- **Classic** — tipo padrao, criado ao declarar uma fila no codigo/Management. Suporta Work Queue (tarefas pesadas em background balanceadas entre consumidores — audio/video, relatorios), Pub-Sub (um produtor, multiplos consumidores via exchanges) e Request-Reply (cliente envia e espera resposta numa fila exclusiva em memoria). Hoje o uso legitimo (sem espelhamento) ficou restrito a nichos resolvidos em memoria: request-reply, migracao via Shovel, filas temporarias/exclusivas onde perder e aceitavel.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Classic Queues / Limitações da Classic Queue
- **Quorum** — desde a 3.8 (2019); o default duravel e replicado. Unica que garante durabilidade fisica: com Publisher Confirms, so confirma **apos o quorum persistir em disco com fsync**. Use quando o produtor nao pode lidar com perdas, ou ao migrar de filas espelhadas.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Quorum Queues / Write-Ahead Log (WAL) e fsync
- **Stream** — desde a 3.9 (2021), inspirada no Apache Kafka. Surgiu porque cenarios de milhoes de mensagens com alta carga simultanea ainda desafiavam a Quorum. Tres gatilhos concretos: **(1) retencao/replay/auditoria** (mensagens nao somem ao consumir; define-se retencao de 7 dias/1 mes/6 meses); **(2) roteamento ficou complexo** (fan-out via exchanges para milhares de filas degrada throughput — na Stream todos consomem do mesmo log, sem roteamento); **(3) a fila nunca esvazia** (producao supera cronicamente o consumo — Classic/Quorum visam esvaziar e perdem throughput nesse regime; a Stream sustenta o acumulo via log de retencao).
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Stream Queues / Quando usar Streams

### Quando NAO usar cada tipo

- **NAO use Classic** quando precisa de replicacao/HA/sobreviver a queda de no — nao replica; se o no cai, nao publica nem consome ate voltar. Nem espere escala horizontal: a carga concentra num no, so escala vertical.
- **NAO use Classic Mirrored Queue** (espelhamento classico) para replicacao hoje — depreciada na 3.9, **removida na 4.0**; migre para Quorum **antes** do upgrade.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Problemas das filas espelhadas
- **NAO use Quorum** como solucao de throughput maximo de milhoes msg/s — esse patamar e da Stream (~40k vs ~1M).
- **NAO use Stream** para mensagens criticas que nao podem ser perdidas em infra instavel, nem com produtores que nao toleram perdas/retentativas — o fsync adiado abre janela de perda; ai Quorum (fsync imediato) e mais segura. Nem quando a semantica e descartar ao consumir (fila de trabalho) ou ha roteamento seletivo por consumidor — na Stream as mensagens permanecem ate a retencao expirar e todos leem tudo.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Conclusão — Quorum vs Streams / Principais características das Streams

### A arquitetura por tras (o que justifica o trade-off)

- **Quorum — Raft + WAL + fsync.** Raft (o mesmo de etcd/Consul/Vault): operacao aceita quando a maioria confirma — nao exige consenso de todos, o que a torna eficiente. A luz do CAP, a Quorum **prioriza consistencia**, invertendo as filas espelhadas (que priorizavam disponibilidade e arriscavam consumir de nos obsoletos). O Write-Ahead Log append-only grava toda operacao primeiro (rapido, sequencial); em falha os dados ja estao no log e o RabbitMQ termina a gravacao depois. O WAL e o que da a Quorum throughput maior que as espelhadas, apesar do quorum.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Algoritmo Raft / Quorum à luz do teorema CAP / Write-Ahead Log (WAL) e fsync
- **Stream — herda o Raft, sacrifica o fsync imediato.** Reaproveita Raft/replicacao/confirmacao por maioria (nao abre mao da replicacao), mas grava em **log imutavel append-only** (mensagens nao apagadas ao consumir, simplificando I/O) e **adia o fsync** (buffer em memoria ate o SO sincronizar). O custo do fsync imediato existe mesmo em SSD; adia-lo e o que destrava o throughput — **o ganho vem de adiar o fsync, nao de hardware mais rapido**.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Streams herdam arquitetura da Quorum / Principais características das Streams
- **Consumo: push vs pull.** Classic e Quorum usam push (broker empurra, ritmo via Prefetch, ack por mensagem). Stream inverte para pull: o consumidor dita o ritmo, elimina ack e reindexacao, e salva periodicamente o **offset** (indice de leitura) para retomar apos falha — o controle de posicao vira responsabilidade do consumidor.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Principais características das Streams

**REGRA:** independente do tipo, RabbitMQ e at-least-once — com publisher confirms o produtor retransmite mensagens sem ack, entao o consumidor deve **deduplicar ou ser idempotente**. Confiar nos confirms como garantia exactly-once e anti-pattern. (Dedup/idempotencia: ver `messaging-reliability.md`; semanticas: ver `messaging-models.md`.)
> fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: RabbitMQ attempts to provide guarantees along these lines

### Arvore de decisao — tipo de fila RabbitMQ

```
Vou declarar uma fila no RabbitMQ. Qual tipo?
│
├── A fila pode viver num unico no e perder mensagens e aceitavel?
│   (request-reply, migracao via Shovel, fila temporaria/exclusiva em memoria)
│     → CLASSIC QUEUE. Simples, sem replicacao, escala so vertical.
│
└── Preciso de replicacao entre nos (sobreviver a queda de um no)?
      → SIM. Classic esta fora. Escolha por throughput × durabilidade:
      ├── Carga na ordem de dezenas de milhares de msg/s
      │   E o produtor NAO pode tolerar perda (infra instavel, confirms criticos)?
      │     → QUORUM QUEUE. Raft + WAL + fsync antes do Publisher Confirm.
      │       (tambem o destino de migracao de filas espelhadas — removidas na 4.0)
      └── Carga ~centenas de milhares msg/s, OU replay/auditoria/retencao,
          OU a fila nunca esvazia, OU roteamento p/ milhares de filas degradando?
            → aceita pequena janela de perda (fsync adiado)?
               ├── SIM → STREAM QUEUE. Log append-only, pull/offset, ~1M msg/s, retencao.
               └── NAO, perda zero → volte para QUORUM (fsync imediato), aceite o teto.
```
> fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Limitações da Classic Queue / Conclusão — Quorum vs Streams / Quando usar Streams

**REGRA final:** Quorum = durabilidade forte com menos velocidade; Stream = throughput maximo com pequena janela de perda. Nao existe escolha perfeita — adeque a infraestrutura ao tipo escolhido.
> fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Conclusão — Quorum vs Streams

---

## Background jobs — operar a fila (Bull/BullMQ + Redis)

Background jobs tiram tarefas demoradas (envio de e-mail, relatorio de 10s) do fluxo sincrono do request. O usuario recebe resposta imediata e o trabalho pesado roda fora. O ganho nao e so responsividade — e **desacoplamento**: producer e consumer passam a escalar e falhar de forma independente.
> fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: O que são Background Jobs e por que usá-los
> fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: O Producer

**REGRA:** remover `await` NAO e background job. Tirar o `await` deixa a resposta rapida, mas o processamento ocupa recursos do MESMO servidor, falhas dificilmente sao detectadas e nao ha retry. Background job de verdade exige isolamento de recursos, deteccao de falha e retentativa — coisas que so uma lib de fila dedicada entrega.
> fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Por que await síncrono não é background job

### As tres pecas operacionais

1. **Producer** (enfileira) e **Worker** (processa) sao processos distintos. Nao se comunicam por chamada de funcao — a unica via e a fila. Ambos conectam ao MESMO host:porta de Redis.
   > fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Estrutura do repositório: producer e worker
2. **Redis** e a peca critica de infra — sem ele a fila nao existe, porque Bull/BullMQ sao construidos sobre o Redis.
   > fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: O Redis (peça crítica de infraestrutura)
3. **A fila** atua como buffer duravel que desacopla producer e consumer no tempo.
   > fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Rodando a demo (Resiliência demonstrada)

Cada tarefa vira um job proprio (um arquivo por tipo) exportando `key` (identificador — usado para saber qual job falhou/executou) e `handle` (metodo async que recebe `{ data }`). O fluxo BullMQ: instalar → importar e iniciar uma `Queue` → adicionar jobs → criar `Worker`(s) sobre a MESMA fila → processar.
> fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Anatomia de um job (RegistrationMail.js)
> fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: O que é o BullMQ

### Worker isolado (o coracao operacional)

`Queue.add` enfileira; **NAO processa**. E preciso um worker dedicado chamando `Queue.process(...)`, rodando como processo separado do servidor web, carregando suas proprias variaveis de ambiente — pode rodar em outra maquina. A requisicao que enfileira fica rapida (~19 ms).

**REGRA:** rode o worker isolado do servidor web **para que jobs pesados nao competam por recursos do request**. Rodar o processamento dentro do mesmo processo do servidor anula metade do beneficio.
> fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Processamento da fila (queue.js worker)

- **Dev:** a dev dependency `npm-run-all` roda varios scripts de uma vez; `npm-run-all -p dev-*` (`-p` paralelo) sobe `dev-queue` e `dev-server` juntos.
- **Producao:** server e worker em processos/infraestruturas separadas e isoladas — nao num comando paralelo local. O comando unico de dev e conveniencia; o isolamento real e o objetivo de producao.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Script dev rodando os dois juntos

**Escalar workers — competing consumers.** Uma fila pode ter muitos workers (20, 50, mil), MAS cada job e processado por **apenas um** worker. Escalar consumidores horizontalmente nao significa duplicar o processamento do mesmo item. Se o efeito desejado e que TODOS reajam ao mesmo evento, isso e fan-out/Pub/Sub, nao competing consumers.
> fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Múltiplos workers na mesma fila

**Fila escalavel — uma fila por job, automatica.** Mapeia-se a pasta `jobs` inteira (`jobs/index.js` re-exporta) e `import * as jobs` + `Object.values(jobs).map(...)` cria uma fila Bull por job automaticamente. Adicionar um job novo passa a exigir so criar o arquivo e registra-lo no index.
> fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Tornando a fila escalável (uma fila por job, automática)

### Job options (`opts`) — o painel de controle do comportamento

Cada tipo de job carrega suas opcoes, perto da definicao do job (propriedade `options`).

| Opcao | O que faz | Quando usar |
|---|---|---|
| `attempts` | N de retentativas se o job falhar (ex.: ate 3) | Falha provavelmente transitoria (SMTP/API fora) E job idempotente ou protegido |
| `delay` | Executa so depois de N ms (ex.: `{ delay: 5000 }`); aparece em **delayed** no Bull Board | Job nao deve rodar ja, mas apos intervalo (follow-up, relatorio agendado) |
| `priority` | Menor numero = maior precedencia (1 antes de 2, 3...) | Alguns jobs sao mais urgentes independente da ordem de chegada |
| `repeat` | Repete a cada N segundos, no maximo X vezes | Job recorrente em intervalos fixos com limite — sem agendador externo |
| `limiter` | Limita N de processos por janela (ex.: mil em 5s) | Destino com rate limit — SMTP que bloqueia >100/min, API externa limitada |
| `lifo` | Inverte a fila para pilha (Last In First Out); padrao e FIFO | Jobs mais recentes tem prioridade sobre antigos |

> fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Opções de jobs (opts)

**REGRAS de cuidado operacional:**
- **`attempts` + efeito nao-idempotente = duplicacao.** Reexecutar um job nao-idempotente duplica efeitos (e-mail enviado duas vezes). Configure `attempts` so quando a falha tende a transitoria E o job e idempotente ou protegido. (Retry reintroduz duplicata: ver `messaging-reliability.md`.)
- **`priority` e `lifo` podem causar starvation.** Prioridade alta continua deixa jobs de baixa prioridade esperando; LIFO pode deixar jobs antigos no fim da pilha sob carga. Use `lifo` so quando a equidade/ordem temporal nao importa.
- **`limiter` reduz vazao de proposito** — e o trade-off correto contra um destino com rate limit conhecido (nao estourar o limite vale mais que throughput maximo).
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Opções de jobs (opts)

### Falhas e monitoramento

- **Capture falhas com o evento `failed`.** `queue.on('failed', (job, err) => {...})` recebe os dados do job e o erro. Sem esse handler, jobs falham silenciosamente — a aplicacao dificilmente saberia.
- **Em producao, roteie o erro para observabilidade.** Nao basta `console.log`: chame `Sentry.captureException(err)` (ou Bugsnag) dentro do `on('failed')`. Em dev, `console.log` pode bastar.
- **Painel visual — Bull Board.** Mostra versao/memoria/clientes do Redis, todas as filas com inicio/fim de cada job, retentativas, `opts`, falhas e motivo; permite retentar jobs. **Em producao, proteja a rota (`/admin/queues`) com autenticacao** — o painel revela dados das filas, memoria e clientes do Redis.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seções: Tratamento de falhas / Monitoramento em produção: Sentry / Painel das filas: Bull Board

### Infra do Redis e credenciais

- **Redis via Docker.** `docker run --name redis` mapeando `6379:6379` com `redis:alpine` (leve). Porta padrao `6379`.
- **Credenciais fora do codigo.** SMTP e Redis nao ficam hardcoded. Use `.env` (`process.env.X`), carregado com `import 'dotenv/config'` no entrypoint **E TAMBEM no worker** (esquecer disso no worker e erro comum — ele tambem precisa das variaveis). `.env` no `.gitignore`.
- **Dev de e-mail — Mailtrap.** SMTP fake (`smtp.mailtrap.io`, porta `2525`) com caixa falsa. Nunca em producao — troque por provedor real via variavel de ambiente.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seções: Config do Redis / Variáveis de ambiente (.env) / Configuração de envio de e-mail (Nodemailer + Mailtrap)

**Nuance de durabilidade (esgotada na proxima secao):** a fila nao pode ficar em memoria do processo (volatil — perde jobs ao reiniciar sem aviso); por isso aponta-se para Redis. Mas Redis tambem e in-memory: **a persistencia dos jobs depende da config de persistencia do Redis**, e ele e ponto unico critico. Nao assuma que jobs nunca se perdem sem configurar persistencia.
> fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Onde armazenar a fila: Redis
> fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: O Redis (peça crítica de infraestrutura)

**Escolha da lib:** NUNCA Kue (antigo e abandonado). **Bull** como default robusto e mantido (delay, rate-limit, retentativa, prioridade, concorrencia, pausar/resumir). **Bee** so quando performance bruta e o criterio dominante e o conjunto reduzido de features basta — Bee nao oferece prioridade entre jobs.
> fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Escolha da lib: Bull vs Kue vs Bee

---

## Durabilidade — quando a mensagem esta realmente salva (e quanto custa)

**REGRA central:** durabilidade nao e um booleano — e uma escala, definida por *onde* a mensagem esta (buffer de memoria × disco × disco replicado) no instante em que o broker confirma o envio. Cada degrau a mais custa latencia.

Durabilidade e a garantia de que uma mensagem **confirmada** sobrevive a uma falha: se o sistema disse "ok, recebi", os dados estarao la quando ele voltar de um crash/reinicio.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Durabilidade

O ponto nao-obvio: o `confirm` pode mentir por omissao — a mensagem pode estar so num buffer de RAM quando o broker respondeu "ok". A pergunta e sempre **no instante do confirm, onde a mensagem realmente esta?** As tres respostas formam tres eixos. E lembre: **durabilidade nao e entrega** — um broker pode persistir em disco (duravel) e ainda assim entregar duas vezes (at-least-once) ou fora de ordem. (Entrega: ver `messaging-models.md`; duplicatas: ver `messaging-reliability.md`.)
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Sistemas baseados em filas

### Eixo A — fsync / WAL: a mensagem esta mesmo no disco, ou so no caminho?

O mecanismo "forte" e gravar em disco **antes** de confirmar. A Quorum Queue e o caso de referencia: com Publisher Confirms, so confirma **apos o quorum persistir em disco com fsync** (a chamada do SO que forca os bytes ao disco). Mas **mesmo em SSD, fsync imediato custa latencia** — operacao sincrona por mensagem. Trocar HDD por SSD reduz, nao elimina. A peca que torna isso recuperavel e o **WAL** (append-only, I/O rapido e sequencial): em falha os dados ja estao no log e o broker termina a gravacao depois.
> fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Write-Ahead Log (WAL) e fsync / Streams herdam arquitetura da Quorum

**REGRA:** disco local (fsync) **nao e replicacao**. A Classic Queue grava em disco mas nao replica entre nos — disco protege contra reinicio do processo; replicacao (quorum/Raft) protege contra perda do no. Sao coisas diferentes. A mesma distincao no storage: EBS IO2 oferece five-nines de durabilidade **por volume**, mas isso protege contra falha de hardware de storage — nao contra falha de instancia, bug que corrompe dados ou erro humano.
> fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Limitações da Classic Queue
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: EBS durability vs PlanetScale's own redundancy

### Eixo B — in-memory × persistente: o trade-off velocidade × durabilidade

- **Stream do RabbitMQ** — caso-limite do lado velocidade: sacrifica fsync imediato para ganhar throughput (buffer em memoria ate o SO sincronizar). Em falha abrupta com reinicio, o buffer pode ser perdido — **raro, mas janela real**. O ganho: ~1M msg/s vs ~40k da Quorum (~25x).
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Streams herdam arquitetura da Quorum / Throughput das Streams
- **NATS** — trade-off ao extremo: nao faz persistencia nem transacoes; mensagem sem consumidor se perde, nada sobrevive a restart no core.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: NATS and Ruby-NATS
- **Classic Queue** — o trade-off vira botao de config: modo **disco** (sobrevive a falha/reinicio, mas gravacao lenta reduz throughput) × modo **memoria** (muito mais throughput, perde tudo em falha).
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Modos de armazenamento da Classic Queue
- **Redis in-memory** (a nuance que mais pega gente) — em filas Bull/BullMQ a fila nao pode ficar em memoria do processo (volatil). Mas Redis tambem e in-memory: **a durabilidade depende da config de persistencia do proprio Redis** — nao e duravel por padrao como um banco ACID. Trocar "memoria do processo" por "Redis" reduz a volatilidade, mas nao a elimina se o Redis nao estiver configurado para persistir. E Redis pub/sub nao e backbone duravel: desconecta clientes lentos e falha sob volume.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Onde armazenar a fila: Redis
  > fonte: Tyler Treat | Dissecting Message Queues | seção: Redis

O custo da durabilidade e generico: brokers AMQP usam ack + persistencia em disco e incorrem em **penalidade massiva de latencia**. A propria fila, vista de cima, e um trade-off durabilidade↔latencia — aumenta durabilidade reencaminhando em vez de descartar, as custas de latencia ocasional pelas retentativas.
> fonte: Tyler Treat | Dissecting Message Queues | seção: ActiveMQ and RabbitMQ
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: A natureza ambígua das filas

### Eixo C — DB-backed × broker dedicado: durabilidade ACID herdada

A terceira fonte de durabilidade e **nao ter broker**: colocar a fila no proprio banco e herdar a durabilidade ACID dele. Solid Queue (Rails) aponta o engine de jobs para um banco relacional em vez de Redis — a fila ganha de graca a durabilidade que o banco ja prove por commit. O angulo mais forte e a **atomicidade fila↔estado**: Pixeltable usa Postgres como "transactional queuing system", enqueue/dequeue na **mesma transacao ACID** que grava os dados, eliminando o "dual write". Aqui a durabilidade nao e so "sobrevive a crash" — e "a mensagem e o estado sao duraveis **juntos**, ou nenhum e". Esse eixo carrega o **C5** (secao abaixo).
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite
> fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)

### Quando aceitar MENOS durabilidade (legitimo)

Durabilidade maxima nao e o default certo. Aceite menos quando **perda e toleravel e latencia e critica**:
- **Metricas efemeras, cache de trabalho, real-time, fire-and-forget** → in-memory sem fsync (NATS troca persistencia por velocidade de proposito).
- **Throughput e prioridade e a janela de perda em falha abrupta e aceitavel** → Stream (fsync adiado, ~25x o throughput da Quorum).
- **Dados explicitamente efemeros** (cache, sessoes temporarias) onde recalcular > persistir → sacrificar durabilidade por performance (ex.: SQLite `journal_mode=MEMORY`).
  > fonte: Tyler Treat | Dissecting Message Queues | seção: NATS and Ruby-NATS
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Streams herdam arquitetura da Quorum
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Durabilidade

---

## C5 — fila no banco (DB-backed) × broker dedicado (resolvido)

Conflito real e nominal. **NUNCA achate em "depende"** — os dois lados tem razao em dominios diferentes. A pergunta de fundo: *a durabilidade do banco e suficiente para este caso, ou voce precisa da durabilidade que um broker dedicado foi projetado para dar?*

### Lado DB-backed (DHH / Solid Queue · Pixeltable)

**Solid Queue** aponta o engine de jobs para um banco relacional (SQLite, Postgres, MySQL) em vez de Redis. Vantagens: mais introspection (SQL padrao), mais espaco, **menos processos**. SQLite tem limitacoes nas estruturas de query que job engines precisam (Postgres e MySQL 8+ sao superiores), mas para escala baixa/experimentos funciona bem.
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite

Tres ganhos concretos:
- **A durabilidade ja vem do banco.** O commit *e* o ponto de durabilidade — sem configurar persistencia de um broker separado (o passo que muita gente esquece no Redis).
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite
- **Atomicidade fila↔estado** elimina o dual-write: "gravar linha E enfileirar" vira operacao unica e duravel.
  > fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)
- **Menos moving parts = menos pontos de falha.** Para produto instalado pelo cliente (ONCE/Campfire, $399 one-time), cada processo extra e um ticket de suporte; uma unica imagem Docker, sem segundo container de banco. Se quebrar, reinicia.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Eliminating moving parts

A justificativa tecnica: **os fundamentos de hardware mudaram** — a velocidade de storage hoje (SSD/NVMe) vs 10 anos atras e radicalmente diferente; muitas tecnologias nao atualizaram a premissa de que "so RAM e rapida o suficiente". O peso historico da inversao e explicito: **"cinco anos atras, dizer no Hacker News que voce usava qualquer banco como queue driver te renderia 'voce esta fazendo tudo errado'"** — a percepcao so mudou porque hardware e ferramentas evoluiram.
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Solid Queue and Solid Cache
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite

### Lado broker dedicado (a norma — Redis/BullMQ, RabbitMQ Quorum, Kafka)

A norma e o broker dedicado, e ela tem razao tecnica onde o DB-backed nao chega:
- **A fila nao pode ser volatil** — por isso BullMQ trata o Redis como peca critica obrigatoria, e nao em memoria do processo.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Onde armazenar a fila: Redis
- **Brokers dedicados projetaram a durabilidade para o caso de fila:** fsync + Publisher Confirms + replicacao por quorum (Raft) dao certeza de gravacao em disco antes do confirm — algo que um banco generico nao otimiza para a forma de acesso de fila.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Write-Ahead Log (WAL) e fsync
- **Em alta volumetria e SLA rigido, o DB-backed bate no teto:** SQLite tem limitacoes de query para job engines; Postgres-como-fila limita o throughput ao que o Postgres suporta (overhead de lock/MVCC por linha).
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite
  > fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)

### A regra pratica (resolucao de C5)

A clivagem e **volume × atomicidade fila↔estado × quem opera** — nao preferencia:

| Situacao | Escolha | Por que |
|---|---|---|
| Enqueue **e** gravacao de estado precisam ser **duraveis juntos** (atomicos) | **DB-backed transacional** (Postgres como fila) | a mesma transacao ACID torna mensagem + estado duraveis num commit — fecha o dual-write |
| Volume baixo/medio **e** objetivo e simplificar / eliminar Redis | **DB-backed** (Solid Queue: SQLite p/ escala baixa, Postgres p/ media) | a durabilidade ja vem do banco; menos moving parts; hardware atual sustenta |
| Produto instalado pelo cliente em hardware que voce nao controla | **DB-backed single-image** | cada processo a mais e um ponto de falha que voce nao consegue monitorar |
| Nao tolera **nem pequena janela de perda** na publicacao; infra instavel; produtor nao reenvia | **broker fsync sincrono** (RabbitMQ Quorum) | so fsync-antes-do-confirm + replicacao por quorum da certeza de disco; aceita a latencia como preco |
| Alto throughput / SLA apertado / fan-out real p/ N consumidores | **broker dedicado** (Kafka, RabbitMQ Stream/Quorum, Redis/BullMQ) | banco bate no teto de lock/MVCC; brokers tem WAL e replicacao projetados para o padrao de fila |

> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite
> fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)
> fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Conclusão — Quorum vs Streams

**Em uma linha:** a durabilidade do banco basta quando o volume e baixo/medio OU quando a atomicidade fila↔estado e o requisito (ai e ate superior, por fechar o dual-write); o broker dedicado e necessario quando voce nao tolera a janela de perda do fsync adiado, quando o throughput/SLA e o gargalo, ou quando precisa de fan-out real.

### Arvore de decisao — quanta durabilidade

```
Quanta durabilidade essa mensagem precisa?
│
├── Perda toleravel E latencia/throughput e o requisito duro?
│     → IN-MEMORY SEM FSYNC (legitimo):
│        ├── fire-and-forget / real-time / "sistema nervoso" → NATS
│        ├── throughput max, aceita janela de perda em crash → RabbitMQ Stream (fsync adiado)
│        └── cache/sessao efemera → modo memoria / journal_mode=MEMORY
│
└── A mensagem confirmada NAO pode se perder → onde ela mora no confirm?
      ├── Precisa de atomicidade FILA ↔ ESTADO ("grava linha E enfileira" como 1 operacao)?
      │     → DB-BACKED TRANSACIONAL (Postgres como fila): mesma transacao ACID;
      │       fecha o dual-write. (limite: throughput de Postgres / lock-MVCC)
      ├── Volume baixo/medio E quer eliminar Redis / minimizar moving parts?
      │     → DB-BACKED (Solid Queue): durabilidade vem do banco.
      │       SQLite p/ escala baixa · Postgres/MySQL 8+ p/ media.
      ├── NAO tolera NEM pequena janela de perda (infra instavel, produtor nao reenvia)?
      │     → BROKER FSYNC SINCRONO: RabbitMQ Quorum (fsync antes do confirm + Raft).
      │       Aceite a latencia do fsync como preco da certeza de disco.
      └── Alto throughput / SLA apertado / fan-out real p/ N consumidores?
            → BROKER DEDICADO: Kafka, RabbitMQ Stream/Quorum, Redis/BullMQ.
              ATENCAO: Redis/BullMQ herda a durabilidade da CONFIG de persistencia
              do Redis; configure-a, nao assuma duravel por padrao.

Sempre: disco local (fsync) ≠ replicacao; durabilidade ≠ entrega.
```
> fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Write-Ahead Log (WAL) e fsync / Limitações da Classic Queue
> fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)

---

## Backlog management — quando a fila acumula e nao se recupera

O risco central nao e a fila — e o que acontece quando a taxa de chegada passa a exceder a de processamento e ninguem percebe a tempo.
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: A natureza ambígua das filas

### Por que backlog vira irrecuperavel

- **Comportamento bimodal.** Sem backlog, latencia baixa (modo rapido). Se a chegada excede o processamento, transita abruptamente para um modo onde a latencia ponta a ponta cresce cada vez mais e leva muito tempo para drenar. A transicao e abrupta e cara de reverter.
- **A fila pode piorar a disponibilidade que deveria proteger.** Quando o processamento para mas as mensagens continuam chegando, o deficit vira backlog que aumenta o tempo de processamento e pode tornar o trabalho inutil por ser concluido tarde demais.
- **Assincrono acumula; sincrono derruba.** Assincrono acumula backlog durante interrupcoes (durabilidade, recuperacao lenta); sincrono descarta solicitacoes (perda de trabalho, recuperacao rapida). A escolha e durabilidade × velocidade de recuperacao.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seções: A natureza ambígua das filas / Falhas em sistemas assíncronos

**REGRA — efeito multiplicador: 30 min viram 300 min.** Se levar ~30 minutos para um operador intervir e nesse tempo o volume enfileirado for 10× a capacidade escalada do consumidor, levam-se **300 minutos** para drenar. Por isso **protecao automatica supera intervencao humana** — a propria janela de resposta humana multiplica o backlog.
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Backlogs

**As tres origens de backlog incontornavel:** (1) workload/cliente enfileirando a taxa inesperadamente alta; (2) workloads que ficam mais caras de processar que o previsto; (3) latencia/falhas na dependencia a jusante. O design assincrono deve antecipar os tres e combinar priorizacao, redirecionamento e backpressure.
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Conclusão

### Medir certo (deteccao precoce)

Use varios pontos de medicao — cada um cobre uma cegueira do outro:

| Metrica | O que detecta | Cuidado |
|---|---|---|
| Disponibilidade do produtor | proxy estavel da fila (= disponibilidade do SQS) | **cega para o consumidor e para backlog** — nao reporte como a do sistema |
| Disponibilidade do consumidor | falhas reais do processamento | **engana para pior** — retries transitorios que depois tem exito inflam a falha aparente |
| **Idade da mensagem na saida** (`agora − enqueue`) | sinal **precoce** de backlog | o melhor aviso antecipado de atraso |
| **AgeOfFirstAttempt** (so na 1a tentativa) | problema **sistemico** limpo | nao poluido por re-enfileiramentos nem consumidores lentos |
| Taxa de DLQ | falha **real** confirmada | **tardio** — so chega la apos esgotar retentativas; combine com idade de mensagem |

E **distinga backlog esperado de inesperado** — dispositivos offline/lentos geram backlog pequeno e esperado; isole o atraso de consumidores individuais do atraso sistemico, e alarme so no segundo.
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Como avaliar a disponibilidade e a latência

### Tecnicas de recovery (ja em backlog — tarde para priorizar a entrada)

O jogo passa a ser **drenar o que vale e desviar/descartar o que nao vale**:
- **Overflow queue** — se o processamento e caro/demorado, mova o excedente do cliente que furou a taxa para uma fila separada (excluida da primaria) e trabalhe nela quando sobrar recurso; funciona quase como fila de prioridade. **Nao use se o processamento e barato** (mover mensagens nao compensa).
- **Age-based rerouting** — ao remover uma mensagem, cheque a data; mova as antigas para uma fila de backlog drenada **depois** que a fila em tempo real for resolvida, liberando o consumidor para as recentes.
- **LIFO durante a recovery** — sob backlog, clientes preferem dados novos processados imediatamente; o acumulado drena conforme a capacidade aparece. **Nao use quando a ordem de processamento e semanticamente obrigatoria.**
- **Descartar antigas via TTL — so com anti-entropia** — se existe sincronizacao completa periodica (varredura anti-entropia), pode-se descartar mensagens pre-varredura (a reconciliacao recupera). **Sem a varredura, descartar perde dados que nao voltam.**
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seções: Abordagem da Amazon / Backlogs

**Sharding / shuffle-sharding para isolar o vizinho ruidoso** (topologia e a primeira defesa contra o efeito multiplicador):
- *Fila unica* — simples e barata de sondar, mas mistura cargas; incompativel com isolamento multilocatario.
- *Fila por cliente* — isolamento maximo, mas o custo de sondar cresce linear com o numero de clientes; so viavel com poucos.
- *Shuffle-sharding* — provisione N filas fixas, mapeie cada cliente a um subconjunto pequeno, e antes de enfileirar escolha entre elas a com menos mensagens. Cliente que surta causa backlog so nas filas mapeadas dele; "isolamento magico" estatistico (nao absoluto) com poucas filas e custo de sondagem baixo.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seções: Backlogs / Abordagem da Amazon

**REGRA:** nao exponha as filas internas — ponha uma **API leve a frente** que autentica o chamador, carimba a identidade em cada mensagem e aplica throttle antes de enfileirar. Esse ponto de controle habilita justica, isolamento e a liberdade de trocar a fila por tras.
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Backlogs

### O custo — recovery exige ~2× a capacidade

**REGRA:** recuperar-se de uma interrupcao de uma hora exige o **dobro da capacidade** por mais uma hora — e na pratica **mais que o dobro**. Com capacidade fixa do consumidor, drena ainda mais devagar. **Nao dimensione o consumidor exatamente para a taxa de chegada normal.** E **limite a taxa de drenagem a capacidade das dependencias a jusante** — drenar no maximo pode sobrecarregar downstream e alongar a recuperacao total.
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Falhas em sistemas assíncronos

---

## Backpressure & load leveling — o que fazer com o excesso de entrada

A fila e um amortecedor. Quando a entrada chega mais rapido que o consumo, alguem decide: **absorver** (deixar o backlog crescer e dar tempo ao sistema), **empurrar contra-pressao** (sinalizar "devagar" a quem produz), ou **rejeitar** (descartar carga). Tres comportamentos frequentemente confundidos.

| Estrategia | O que faz | Direcao | Quem decide | Custo |
|---|---|---|---|---|
| **Load leveling** | Fila absorve o pico; backlog cresce temporariamente; autoscaling reage | Passiva (buffer) | A fila, implicitamente | Latencia enquanto o backlog drena |
| **Backpressure** | Sinaliza upstream para desacelerar, proporcional ao backlog | Ativa, contra a corrente | Consumidor mede backlog e aperta a entrada | Reduz vazao de entrada da workload |
| **Load shedding** | Rejeita o excesso para manter latencia baixa nas requisicoes aceitas | Ativa, descarta | O servidor sobrecarregado | Rejeita trabalho; sobe taxa de erro percebida |

> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon
> fonte: David Yanacek | Using load shedding to avoid overload | seção: Impedindo que o trabalho seja desperdiçado

**REGRA mental: leveling adia, backpressure desacelera, shedding descarta.** Os tres podem coexistir em camadas (leveling absorve o transiente; backpressure controla o sustentado; shedding e a ultima linha quando os outros saturam). *Load shedding e tratado em profundidade na area de resiliencia — aqui aparece so como contraste.*

- **Load leveling** — a fila como buffer entre a entrada e os recursos a jusante absorve picos e da tempo ao autoscaling reprovisionar, em vez de propagar o pico. Bom para picos curtos onde o autoscaling alcanca a carga antes do backlog ficar grande.
- **Backpressure** — passo ativo: quando o backlog cresce, mede-se a profundidade da fila da workload e escala-se um rate-limit de entrada **inversamente proporcional** ao backlog. Backlog grande → entrada apertada; pequeno → liberada. Funciona limpo quando a workload tem fila propria.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon

### Quando backpressure NAO e adequada

**REGRA:** se rejeitar/desacelerar a entrada custa valor de negocio critico, **aceite a carga e priorize internamente** — nao aplique backpressure. Exemplo canonico: nos pedidos do amazon.com, "prefere-se aceitar pedidos mesmo havendo backlog... mas com muita priorizacao nos bastidores para atender primeiro os mais urgentes". Perder um pedido e perder receita; o backlog e o mal menor.
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon

Ha tambem obstaculo **tecnico**: **fila compartilhada**. Quando varias workloads compartilham uma SQS, ha API que devolve o numero de mensagens na fila, mas nao por atributo — medir a profundidade total e aplicar backpressure seria injusto com workloads inocentes. Saida: separar filas por workload, ou escolher broker com visibilidade por atributo (Amazon MQ).
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon

### Filas escondidas (toda fila e uma fila)

**REGRA:** antes de raciocinar sobre leveling/backpressure, saiba **onde** estao suas filas — muitas nao estao no seu codigo: buffers TCP do SO, executors de thread pool de frameworks web, connection pools de banco, clientes HTTP com filas internas. "Ao pesquisar sistemas, assuma que ha filas em algum lugar ainda nao identificado; o teste de sobrecarga informa mais que a leitura de codigo." Backpressure cega para uma fila oculta e backpressure que chega tarde.
> fonte: David Yanacek | Using load shedding to avoid overload | seção: Cuidado com as filas

### Trade-off: durabilidade × latencia

A fila **compra durabilidade pagando latencia** — reencaminha a mensagem ate ser processada em vez de descartar, as custas de latencia ocasional pelas retentativas. O load leveling adiciona sua propria parcela enquanto o backlog e absorvido. **REGRA:** assincrono nao significa "latencia gratis" — significa "latencia que voce escolheu nao medir". Use fila se o sistema precisa absorver falhas de dependencia sem perder mensagens **E** tolera latencia ocasional; senao, reconsidere.
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: A natureza ambígua das filas

(Operacoes pos-upload de longa duracao — virus scan, thumbnail, OCR — sao um caso classico de load leveling: empurradas para uma fila para nao bloquear a requisicao de upload, com worker de background consumindo e notificando ao concluir.)
> fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Async processing pipeline

### Arvore de decisao — backpressure vs leveling

```
Entrada > capacidade do consumidor?
│
├── Nao → fila opcional so para durabilidade/desacoplar trabalho longo
│         (ex: upload → fila → worker de background)
│
└── Sim → o pico e transiente (autoscaling alcanca)?
          ├── Sim → LOAD LEVELING: deixe a fila absorver; ponha-a como buffer
          │         entre entrada e recursos auto-escalaveis.
          └── Nao (sustentado) → rejeitar/desacelerar custa valor de negocio?
                    ├── Sim (ex: pedidos) → ACEITE a carga + PRIORIZE internamente,
                    │         NAO aplique backpressure.
                    └── Nao → a workload tem fila propria (backlog mensuravel)?
                              ├── Sim → BACKPRESSURE: escale o rate-limit de entrada
                              │         inversamente ao backlog dessa workload.
                              └── Nao (fila compartilhada) → separe as filas OU use
                                        broker com visibilidade por atributo (Amazon MQ);
                                        NAO aplique backpressure pela profundidade total.

  Ultima linha, quando leveling + backpressure saturam → LOAD SHEDDING (ver resiliência).
```
> fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon

---

## Anti-Patterns

**Escolha de broker / sistema**
- **Escolher brokerless por ser "mais rapido"** quando o requisito exige durabilidade/garantia — ou AMQP pesado quando so precisa de fire-and-forget veloz.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: Throughput Benchmarks
- **Adotar uma fila como "a melhor"/default universal** ignorando que velocidade e garantia sao trade-offs por caso.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: Conclusion
- **Tratar NATS como fila duravel** esperando que mensagens sobrevivam a restart — nao persiste.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: NATS and Ruby-NATS
- **Usar Redis pub/sub como nucleo** de mensageria de alto volume esperando entrega confiavel — desconecta clientes lentos.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: Redis
- **Consumir de NSQ sem idempotencia/dedup**, assumindo entrega unica e ordenada.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: NSQ
- **Decidir por benchmark de blog** single-pair/single-broker (desautorizado) — meca na topologia real; reportar throughput como numero unico ignorando que o receiver pode receber uma fracao do sender.
  > fonte: Tyler Treat | Dissecting Message Queues | seções: Disclaimer / Throughput Benchmarks

**RabbitMQ — tipos de fila**
- **Declarar filas sem escolher o tipo** (assumir que toda fila e igual) e descobrir o problema so em producao.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Por que o tipo de fila importa
- **Esperar HA/escala horizontal numa Classic Queue** — concentra num no, so escala vertical; se o no cai, a fila fica indisponivel.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Limitações da Classic Queue
- **Fazer upgrade para 4.0 mantendo filas espelhadas** — foram removidas; migre para Quorum antes.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Problemas das filas espelhadas
- **Forcar uma Quorum a sustentar ~1M msg/s** — esse patamar e da Stream (~40k vs ~1M); ou esperar throughput de Stream numa Quorum so trocando o disco por SSD (o gargalo e o fsync imediato, nao o disco).
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Throughput das Streams / Streams herdam arquitetura da Quorum
- **Usar Stream para mensagens criticas** ignorando a janela de perda do fsync adiado; ou esperar que mensagens da Stream desaparecam ao consumir (permanecem ate a retencao); ou nao salvar o offset periodicamente no consumidor de Stream (apos falha, rele tudo ou perde a posicao).
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seções: Streams herdam arquitetura da Quorum / Principais características das Streams
- **Confiar nos publisher confirms como garantia exactly-once** sem dedup/idempotencia no consumidor.
  > fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: RabbitMQ attempts to provide guarantees along these lines

**Background jobs**
- **Tratar "tirar o `await`" como processamento em background** — fica no mesmo servidor, sem retry e sem visibilidade de erros.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Por que await síncrono não é background job
- **Esperar que `Queue.add` execute o job**, ou rodar o processamento no mesmo processo do servidor web — jobs pesados competem pelos recursos do request.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Processamento da fila (queue.js worker)
- **Varios workers processando o mesmo job/evento** (trabalho duplicado) — competing consumers exige posse exclusiva de cada job por um unico worker.
  > fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Múltiplos workers na mesma fila
- **Apontar producer e workers para instancias/portas de Redis diferentes** — a fila silenciosamente nao conecta ou divide estado.
  > fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Estrutura do repositório: producer e worker
- **Processar fila sem ouvir `on('failed')`**, ou em producao so `console.log` sem rotear para Sentry/Bugsnag — falhas passam despercebidas.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seções: Tratamento de falhas / Monitoramento em produção: Sentry
- **Expor `/admin/queues` (Bull Board) publicamente sem autenticacao** — revela dados das filas, memoria e clientes do Redis.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Painel das filas: Bull Board
- **`attempts` em job com efeito nao-idempotente sem protecao** (duplicacao a cada retry); ou **`lifo` quando equidade/ordem importa** (starvation dos antigos).
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Opções de jobs (opts)
- **Hardcodar credenciais (SMTP/Redis)** no codigo, ou esquecer de carregar `dotenv/config` no worker.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Variáveis de ambiente (.env)
- **Adotar Kue** (sem manutencao), ou escolher Bee por performance sem checar se faltam features (prioridade) que o projeto vai precisar.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Escolha da lib: Bull vs Kue vs Bee

**Durabilidade**
- **Confiar que "o broker confirmou" = mensagem em disco**, sem saber se o confirm espera o fsync ou so o buffer de memoria.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Streams herdam arquitetura da Quorum
- **Manter a fila de jobs em memoria do processo** — qualquer reinicio perde os jobs pendentes sem aviso; ou **assumir que "esta no Redis" = duravel** sem configurar a persistencia do Redis.
  > fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Onde armazenar a fila: Redis
- **Confundir disco local com replicacao** (Classic Queue grava em disco mas nao replica num cluster); ou **usar storage duravel (EBS IO2) como substituto de replicacao** — durabilidade de volume nao cobre perda de instancia, bug ou erro humano.
  > fonte: Full Cycle | RabbitMQ: Stream, Quorum, Stream — qual fila é a mais poderosa? | seção: Limitações da Classic Queue
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: EBS durability vs PlanetScale's own redundancy
- **Ligar ack sincrono + persistencia em disco por default num fluxo de alta vazao tolerante a perda** — paga latencia massiva sem necessidade.
  > fonte: Tyler Treat | Dissecting Message Queues | seção: ActiveMQ and RabbitMQ

**C5 — DB-backed × broker dedicado**
- **[C5] Manter Redis/broker dedicado "por best practice"** sem reavaliar se a premissa de hardware original (so RAM e rapida) ainda vale com SSD/NVMe atuais.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite
- **[C5] Usar broker dedicado e gravar estado no banco em duas operacoes separadas** (dual write) — cria janela onde a mensagem existe mas o registro nao; quando precisa de atomicidade, prefira fila transacional no proprio banco.
  > fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)
- **[C5] Usar Solid Queue + SQLite em alta volumetria com SLA apertado** — SQLite tem limitacoes de query para job engines; prefira Postgres/MySQL 8+ ou broker dedicado.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite

**Backlog & backpressure**
- **Dimensionar so para o modo rapido** (chegada == processamento, sem folga) — mantenha processamento > chegada com folga; e **dimensionar o consumidor exatamente para a taxa normal** — provisione folga > 2× para drenar.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seções: A natureza ambígua das filas / Falhas em sistemas assíncronos
- **Confiar so no operador humano para mitigar picos** — a janela de ~30 min multiplica o backlog; automatize a protecao.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Backlogs
- **Acelerar a drenagem ao maximo sem checar downstream** — limite a drenagem a capacidade da dependencia a jusante.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Falhas em sistemas assíncronos
- **Reportar disponibilidade do produtor como a do sistema**, ou confiar so na DLQ (tardia) — complemente com idade de mensagem (deteccao precoce); separe falha transitoria reprocessada de falha terminal.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Como avaliar a disponibilidade e a latência
- **Manter FIFO estrito sob backlog grande** prendendo o cliente a dados velhos (prefira LIFO); **descartar antigas sem varredura anti-entropia**; **overflow queue quando o processamento e barato**; **fila por cliente com centenas/milhoes de clientes** (sondagem nao escala → shuffle-sharding).
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seções: Backlogs / Abordagem da Amazon
- **Deixar chamadores enfileirarem direto na fila interna** — API leve a frente: autentica, carimba identidade, throttle.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Backlogs
- **Backpressure pela profundidade de fila compartilhada** (pune workloads inocentes); ou **backpressure mecanica num fluxo onde aceitar e priorizar e o certo** (pedidos).
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon
- **Expor o autoscaling direto ao pico, sem buffer de fila** — o autoscaling nao e instantaneo; sem buffer o pico derruba os recursos antes do reprovisionamento.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon
- **"Latencia nao importa porque e assincrono"** — introduzir fila ignorando o crescimento de latencia sob backlog.
  > fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: A natureza ambígua das filas
- **Surge queue que esconde a sobrecarga** (load balancer enfileirando) — oculta o estado real e processa requisicoes cujo cliente ja desistiu; **nao mapear filas ocultas** (buffers TCP, executors de framework, connection pools) antes de definir limites.
  > fonte: David Yanacek | Using load shedding to avoid overload | seção: Cuidado com as filas

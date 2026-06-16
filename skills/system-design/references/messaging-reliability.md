# Confiabilidade em Mensageria — Referência Detalhada

Correção sob duplicata e falha. Uma fila não entrega "exatamente uma vez": o broker garante **at-least-once** — reentrega a mensagem até processá-la com êxito, em vez de descartá-la na primeira falha. Duplicatas e reordenação são esperados em sistemas event-driven; assuma-os como possíveis e tenha técnicas prontas (`fonte: desconhecido (CockroachDB) | Idempotency and Ordering | seção: The problem in event-driven systems`).

**REGRA:** at-least-once é o piso do broker real. A correção é responsabilidade do consumidor (idempotência), não do delivery. Não confunda exactly-once *delivery* (impossível) com exactly-once *processing* (alcançável) — a discussão filosófica desse ponto vive em `messaging-models.md` (irmã); aqui o foco são os PADRÕES que entregam processing correto.

---

## Por Que Duplicatas Acontecem (Dois Lados)

| Lado | Mecanismo | Resolução típica |
|------|-----------|------------------|
| **Envio (publish)** | a linha que publica falha (rede), faz retry, e a 2ª tentativa tem sucesso — a mesma mensagem vai ao broker duas vezes | maioria dos brokers deduplica no publish se você especificar um message ID único (GUID — alta probabilidade de unicidade) |
| **Consumo (ack)** | a mensagem é processada com sucesso mas o acknowledgement de volta ao broker falha; ela é desbloqueada na fila e re-entregue, executando o consumidor duas vezes | **idempotent consumer pattern** — dedup no publish NÃO cobre re-entrega por ack falho |

(`fonte: desconhecido (.NET/Azure Service Bus) | Fix Duplicate Messages with the Idempotent Consumer Pattern | seção: The problem / Example setup / Simulating the failure`)

**REGRA:** dedup no publish resolve só o lado do envio. Para o ack falho, é o consumidor que precisa ser idempotente.

---

## Idempotent Consumer Pattern

Consumir a MESMA mensagem duas (ou mais) vezes sem produzir efeito colateral duplicado. É a resposta prática ao at-least-once: brokers garantem at-least-once processing, e o padrão idempotent consumer entrega exactly-once *processing* (`fonte: desconhecido (.NET/Azure Service Bus) | Fix Duplicate Messages with the Idempotent Consumer Pattern | seção: At-least-once processing reality`).

### As Peças do Fluxo Canônico (.NET / Azure Service Bus)

| Peça | O que é | Por quê |
|------|---------|---------|
| **Propagar o message ID** | `ConsumeContext` carrega o message ID; ack só ao final do processamento | sem o message ID a checagem de dedup é impossível (`fonte: ... | seção: The message processor flow`) |
| **Dedup store** | entidade `MessageConsumer`: message ID + consumer name + timestamp | registra cada mensagem já processada (`fonte: ... | seção: The MessageConsumer entity`) |
| **Chave composta** | **message ID + consumer name** (não só message ID) | fan-out: a mesma mensagem tem múltiplos consumidores; cada um processa uma vez sem ser bloqueado pela presença de outro (`fonte: ... | seção: Why track the consumer name`) |
| **Unique index sobre a chave** | dois benefícios: lookup rápido E guard de concorrência | a unique constraint deixa só UMA transação concorrente gravar o registro; defina max length nas colunas (ex: 100 p/ ID, 200 p/ consumer name) (`fonte: ... | seção: Database configuration / Two benefits of the unique index`) |

### Os Dois Passos de Processamento

```
Step 1 — checagem de duplicata:
  query AnyAsync no dedup store: MessageId == ctx.MessageId && ConsumerName == nome
  já existe? → early-return + acknowledge ao broker, sem rodar a lógica
  (essa checagem isolada tem race condition — resolvida no Step 2)

Step 2 — transação atômica:
  BeginTransactionAsync
    → lógica de negócio + SaveChanges
    → insert do marcador MessageConsumer
  CommitAsync
  ou tudo comita, ou erro de banco causa rollback total
```

(`fonte: ... | seção: Step 1 — check for a duplicate / Step 2 — wrap business logic in a transaction`)

A escrita atômica — efeito de negócio + marca de dedup num único commit — é o objetivo. Essa exigência não é particular do .NET: no lado servidor de APIs idempotentes da AWS, gravar o token de idempotência e todas as mutações relacionadas DEVE atender ACID — uma operação "tudo ou nada" — para evitar gravar o token mas falhar ao criar recursos, ou vice-versa (`fonte: Malcolm Featonby | Making retries safe with idempotent APIs | seção: Reducing client complexity`).

**REGRA:** a checagem do Step 1 é filtro barato, NUNCA garantia de unicidade. O guard real é a unique constraint no banco — se duas transações concorrentes passam ambas no Step 1, só uma comita; a perdedora falha no commit.

### Quando Pular o Padrão Inteiro

**Lógica naturalmente idempotente** — se executar a lógica duas vezes não muda nada (efeito não-destrutivo), consuma a mensagem múltiplas vezes sem dedup store, sem transação, sem checagem (`fonte: desconhecido (.NET/Azure Service Bus) | ... | seção: Naturally idempotent logic`). Heurística — **analogia lista vs conjunto:** adicionar a um conjunto é idempotente (presença/ausência); adicionar a uma lista não é (append acumula). Semântica de conjunto → natural; semântica de lista → precisa de tratamento (`fonte: desconhecido (CockroachDB) | Idempotency and Ordering | seção: List vs. set analogy`).

### Outras Técnicas de Dedup (CockroachDB) — quando a chave composta .NET não se aplica

| Técnica | Como | Cuidado |
|---------|------|---------|
| **Unique identifiers** | grave o ID de cada evento numa tabela; compare na chegada; ignore duplicatas | purgue periodicamente quando duplicatas não forem mais esperadas (`fonte: ... | seção: Technique 3 — Unique identifiers`) |
| **Version numbers** | contador por entidade incrementado a cada update; descarte versões já vistas | atrele ao entity ID (não global) para preservar concorrência (`fonte: ... | seção: Technique 2 — Version numbers`) |
| **Timestamps** | simples | colisões em alta concorrência geram falsos positivos — combine com entity ID (`fonte: ... | seção: Technique 1 — Timestamps`) |

---

## C2 — Idempotência Basta, ou Precisa de Transação/Outbox?

Tensão real entre duas posições. **Posição praticante:** at-least-once + idempotência no consumidor = effective-once; o padrão entrega exactly-once *processing* (`fonte: desconhecido (.NET/Azure Service Bus) | Fix Duplicate Messages with the Idempotent Consumer Pattern | seção: At-least-once processing reality`). **Posição Kreps:** idempotência SOZINHA não basta para exactly-once — é preciso transações ou abstrações que deem atomicidade ao processamento, indo além da mera idempotência; foi o que motivou a feature de transações no Kafka. Confiar só na idempotência do producer e assumir exactly-once é anti-pattern (`fonte: Jay Kreps | Exactly-once, one more time | seção: Flavio Junquera: No Consensus in Exactly Once` + `seção: Tyler Treat: You Cannot Have Exactly-Once Delivery Redux`).

**REGRA (resolução C2):** as duas posições não se contradizem quando você separa o **escopo do efeito**.

| Situação | Mecanismo suficiente |
|----------|----------------------|
| **Side-effect single-system** (todo o efeito cabe numa transação de banco) | **Idempotência no consumidor basta** — a unique constraint + transação atômica já acoplam efeito + marcador num commit |
| **Atomicidade cross-system** (estado + saída/publicação precisam acontecer juntos: consumo + transformação + produção de resultado em sistemas distintos) | **Idempotência sozinha NÃO basta** — precisa de transações ou **outbox** para o acoplamento atômico |

Kreps tem razão no caso cross-system: "se o processamento precisa acoplar atomicamente consumo + transformação + produção de resultado, use transações; idempotência sozinha não cobre esse requisito" (`fonte: Jay Kreps | Exactly-once, one more time | seção: Flavio Junquera: No Consensus in Exactly Once`). O praticante tem razão no caso single-system: ali a própria transação atômica do consumidor JÁ É a transação que Kreps exige — idempotência e transação não são alternativas, são camadas do mesmo padrão. A fonte .NET mostra AMBOS no mesmo fluxo: dedup store (idempotência) E transação atômica (atomicidade) (`fonte: desconhecido (.NET/Azure Service Bus) | ... | seção: Step 2`).

Aviso operacional: a garantia não é "magic pixie dust" — só acontece se você usar explicitamente as abstrações (transações de baixo nível ou APIs de processamento), nunca automaticamente (`fonte: Jay Kreps | Exactly-once, one more time | seção: Tyler Treat: You Cannot Have Exactly-Once Delivery Redux`). A discussão filosófica completa exactly-once delivery × processing (Kreps × Treat) não é reaberta aqui — ver `messaging-models.md` (irmã).

---

## Chaves de Idempotência

A **chave de idempotência** é o identificador único que costura uma operação através de tentativas e sistemas, permitindo que quem recebe um request repetido reconheça "isto é a mesma operação que já vi" e não a reexecute (`fonte: desconhecido (system/API design) | Build a robust Payments service using Idempotency Keys | seção: What is idempotence`). A chave existe porque existe **retry** — uma transação só se repete quando há retry (double-click ou falha de API reexecutada); a causa-raiz de precisar de idempotência é o fato de você estar dando retry (`fonte: ... | seção: Why would a transaction repeat?`). O retry só é seguro sob a premissa de que repetir a chamada não acumula efeito colateral — efeito **no máximo uma vez** mesmo no loop de retry (`fonte: Malcolm Featonby | Making retries safe with idempotent APIs | seção: Introduction`).

Cenário clássico que a chave previne: o serviço envia "transferir de A para B"; o gateway processa e responde — mas a resposta se perde (partição de rede ou crash). O serviço dá retry porque "não viu" o processamento; sem chave, transferiu $40.000 em vez de $20.000. A resposta perdida é **indistinguível** de uma falha real (`fonte: desconhecido (system/API design) | ... | seção: API failure example`).

> Este bloco foca a CHAVE (emissão, propagação, ciclo de vida). A dedup do lado de quem consome mensagens de fila (dedup store, chave composta) está no Idempotent Consumer Pattern acima.

### C8 — Quem Emite a Chave: Client-Supplied × Server-Issued

Duas fontes de autoridade defendem origens opostas para a chave.

**Posição server-issued — o gateway emite (payments).** O payment ID é gerado pelo **gateway de pagamento**, não pelo cliente. O serviço pinga o gateway para gerar o ID; o gateway devolve; ele é propagado ao cliente final, persistido no banco do serviço e no banco do gateway. SE o gateway detém o status canônico do pagamento ENTÃO o payment ID deve ser server-issued. É como gateways reais funcionam — ao integrar Stripe, PayPal ou Razorpay, o ID é a primeira coisa que você obtém (`fonte: desconhecido (system/API design) | Build a robust Payments service using Idempotency Keys | seção: The flow — Generate the payment ID` + `seção: Why this works`).

**Posição client-supplied — o cliente emite (AWS).** A abordagem preferida da Amazon incorpora ao contrato da API um **identificador de request único fornecido pelo caller** (client request token / GUID). Requests do mesmo caller com o mesmo identificador são tratados como duplicatas. Isso permite ao cliente **expressar a intenção explicitamente**, torna a operação auditável (o token aparece no CloudTrail) e permite rotular o recurso criado. Na EC2 é o `ClientToken` (`fonte: Malcolm Featonby | Making retries safe with idempotent APIs | seção: Reducing client complexity`).

**Por que divergem.** A diferença não é estilística — vem de **onde está a autoridade que reconcilia a duplicata**. Só o cliente sabe se "dois requests idênticos" são um retry ou duas intenções legítimas: dois `RunInstances` EC2 idênticos podem ser exatamente o que o caller quer, então a duplicata não pode ser inferida pelo servidor — e a chave precisa existir ANTES do primeiro round-trip (`fonte: Malcolm Featonby | Making retries safe with idempotent APIs | seção: Reducing client complexity`). Já o servidor/gateway deve emitir quando ele é o dono canônico do status — faz sentido a chave nascer onde o status vive, ao custo de um round-trip inicial só para obter o ID (`fonte: desconhecido (system/API design) | ... | seção: The flow — Generate the payment ID`).

**REGRA (resolução C8):** documente os dois — não ache que um padrão é "o certo". Quem emite a chave depende de **quem detecta a duplicata**.

| Quem detém a autoridade de reconciliar a duplicata | Quem emite a chave |
|----------------------------------------------------|--------------------|
| O cliente precisa distinguir "retry" de "duas intenções idênticas legítimas" antes de qualquer contato com o servidor | **Client-supplied** (token/GUID do caller) — **AWS** (`fonte: Malcolm Featonby | Making retries safe with idempotent APIs | seção: Reducing client complexity`) |
| O servidor/gateway é o dono canônico do status e reconcilia ali | **Server-issued** (ID emitido pelo gateway, repassado ao cliente) — **payments** (`fonte: desconhecido (system/API design) | Build a robust Payments service using Idempotency Keys | seção: The flow — Generate the payment ID`) |

As duas posições convergem num ponto operacional: independente de quem **emite**, no **retry** reenvia-se exatamente a MESMA chave da tentativa original — nunca se gera uma nova (`fonte: desconhecido (system/API design) | ... | seção: The flow — Retry with the same payment ID`). O AWS SDK/CLI faz isso de forma transparente: gera um client request identifier quando o caller não fornece e o reutiliza no retry para garantir "no máximo uma vez" (`fonte: Malcolm Featonby | Making retries safe with idempotent APIs | seção: Retries and semantic equivalence`).

### Propagação e Ciclo de Vida da Chave

| Aspecto | Regra | Fonte |
|---------|-------|-------|
| **Propagação** | a chave costura N sistemas — payment ID persistido em três lugares (cliente, banco do serviço, banco do gateway); viaja **no payload** do request, não implícita | `fonte: desconhecido (system/API design) | ... | seção: The flow — Generate the payment ID / Retry with the same payment ID` |
| **Gravação atômica** | gravar o token + todas as mutações DEVE atender ACID — "tudo ou nada" server-side | `fonte: Malcolm Featonby | Making retries safe with idempotent APIs | seção: Reducing client complexity` |
| **Check-and-update** | reexecute/atualize só quando sabe que a 1ª transação DEFINITIVAMENTE falhou; cheque o status pela chave primeiro | `fonte: desconhecido (system/API design) | ... | seção: Gateway checks the status / Approach 2 — check-and-update` |
| **Resposta no retry** | devolva resposta **semanticamente equivalente** (pode evoluir: "pending" → "running"), não `ResourceAlreadyExists` — este gera efeito colateral no cliente | `fonte: Malcolm Featonby | ... | seção: Retries and semantic equivalence / Reducing client complexity` |
| **Mesma chave, params diferentes** | assuma intenção divergente → erro de validação de mismatch; armazene os params do request inicial junto ao token | `fonte: Malcolm Featonby | ... | seção: Same client request ID, different intent` |
| **Retenção** | finita (tempo de vida do recurso + intervalo), nunca infinita — identificador futuro pode colidir | `fonte: Malcolm Featonby | ... | seção: Late arriving requests` |

---

## Outbox Pattern (Mensageria Transacional)

O outbox resolve o **dual-write**: escrever no banco E publicar na fila/chamar a API externa como duas operações separadas cria uma janela onde uma acontece e a outra não — a mensagem existe mas o registro não, ou vice-versa, exigindo reconciliação. Escrever atomicamente nos dois sistemas é impossível sem transação distribuída (`fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)`).

A solução: em vez de chamar a API externa direto, **grave a intenção** (o evento/a mensagem a enviar) numa tabela outbox **dentro da mesma transação de banco** da mudança de estado. Um processo separado — o **relay/background processor** — lê a outbox depois e executa a chamada externa. Mantém atomicidade e idempotência ao custo de eventual consistency + um processador adicional (`fonte: desconhecido (.NET/Azure Service Bus) | Fix Duplicate Messages with the Idempotent Consumer Pattern | seção: Decision flow / If it doesn't support idempotency`).

```
Mudança de estado precisa disparar efeito (publicar evento / chamar API externa)?
│
├─ Efeito cabe inteiro na transação de banco (single-system)?
│   └─ SIM → idempotent consumer simples: lógica + marcador no MESMO commit. SEM outbox.
│
└─ NÃO (efeito cross-system) → a API externa suporta idempotency key?
    │
    ├─ SIM → passe o message ID como key; a API deduplica. SEM outbox.
    │        Falha → rollback+retry OU ack (requisito de negócio).
    │
    └─ NÃO → OUTBOX:
        1. Grave a intenção numa tabela (ex: EmailMessages) DENTRO da transação
           que muda o estado → marca processada → commit → ack.
        2. Relay / background processor lê a outbox e executa a chamada depois
           (eventual consistency).
        3. Consumidor downstream deduplica (rastrear IDs únicos + purga;
           unique index fecha a race) — at-least-once continua valendo.
        4. Precisa de ORDEM? Reaproveite timestamps/versões do dedup,
           mas avalie as consequências da ordem à parte.
```

(`fonte: desconhecido (.NET/Azure Service Bus) | ... | seção: Decision flow for when the work isn't transactional` + `fonte: desconhecido (CockroachDB) | Idempotency and Ordering | seção: Technique 3 — Unique identifiers`)

**Banco como fila transacional.** O caso degenerado do mesmo princípio: enfileirar e dequeue participam da mesma transação ACID que grava os dados, eliminando a janela do dual-write (`fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)`). E "banco como fila" deixou de ser heresia: "five years ago, telling someone on Hacker News you used any database as a queue driver would get 'you're doing everything wrong'" — hoje hardware e ferramentas (Solid Queue) tornaram o padrão legítimo em escala baixa/média (`fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite`).

**REGRA:** não force broker dedicado "por best practice". Mas se throughput de fila é gargalo, precisa de fan-out pub/sub real, ou a fila cresce para milhões de mensagens — Postgres-como-fila tem overhead de lock/MVCC por linha; use broker dedicado (com outbox, se preciso atomicidade) (`fonte: Aaron Francis & Marcel Kornacker | ... | seção: What Pixeltable is (technically)`).

> O outbox é o ramo "efeito cross-system / API não suporta idempotency key" do Idempotent Consumer Pattern — chega-se aqui descendo a mesma árvore de decisão.

---

## Retry, Backoff e Jitter

Retry é reenviar a MESMA requisição quando ela falha. Funciona porque sistemas distribuídos raramente falham como unidade única: sofrem falhas **parciais** ou **transitórias**, não totais (`fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Introdução`). Mas retry não é grátis — retries são **"egoístas"**: cada retry toma mais tempo de processamento do servidor; quando a falha é por sobrecarga, retries amplificam a carga exatamente quando o sistema já está no limite, podendo impedir a recuperação (`fonte: Marc Brooker | ... | seção: Novas tentativas e recuo` + `seção: Conclusão`).

O padrão seguro tem quatro peças que se reforçam:

| Peça | Regra | Fonte |
|------|-------|-------|
| **1. Retry em UMA só camada** | empilhar retry em N camadas multiplica a carga K^N (243× com 3 tentativas × 5 camadas); defina explicitamente a camada e desabilite nas demais | `fonte: Marc Brooker | ... | seção: Novas tentativas e recuo` |
| **2. Backoff exponencial limitado** | a espera cresce exponencialmente após cada tentativa, mas com **teto máximo** (*capped exponential backoff*) | `fonte: Marc Brooker | ... | seção: Novas tentativas e recuo` |
| **3. Jitter** | adiciona aleatoriedade ao backoff contra *thundering herd* (clientes que falham juntos recuam pelo mesmo tempo e retentam em rajada). Aplique a todos os timers periódicos, não só retries. Para tarefas periódicas, jitter **determinístico por host** (hash do hostname/pod) — race conditions ficam reproduzíveis; para retries, aleatoriedade pura é adequada | `fonte: Marc Brooker | ... | seção: Jitter` |
| **4. Idempotência como pré-requisito** | timeout/falha NÃO significa que os efeitos não ocorreram; APIs com efeito colateral não são seguras para retry sem idempotência (GET é natural; POST frequentemente não). No retry, reenvie a MESMA chave | `fonte: Marc Brooker | ... | seção: Introdução` + `fonte: desconhecido (system/API design) | Build a robust Payments service using Idempotency Keys | seção: The flow — Retry with the same payment ID` |

**Filtro de status:** HTTP distingue erro de cliente (**4xx** — não terá sucesso se repetido) de erro de servidor (**5xx** — pode ter sucesso). Use o status como primeiro filtro de retry. Ressalva: consistência eventual borra a linha do 4xx (esp. 404 — o estado pode estar propagando) (`fonte: Marc Brooker | ... | seção: Novas tentativas e recuo`).

**Quando dá pra não retentar:** você não precisa de idempotência se não der retry. Em muitos casos, propague o erro ao usuário (retry **explícito**) em vez de retry automático cego — dispensa idempotência por completo (`fonte: desconhecido (system/API design) | ... | seção: Approach 1 — You don't need idempotence if you don't retry`).

**Jobs assíncronos** com falha transitória: configure `attempts` na lib de fila — a retentativa automática é justamente o que distingue uma fila dedicada de simplesmente remover o `await` (`fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Opções de jobs (opts)`). Retry de jobs / operação de workers → ver `messaging-operations.md` (irmã).

### C4 — A Tensão Retry × Overload (APONTADA aqui, RESOLVIDA na Onda 3)

Existe um conflito real (C4) que esta referência **aponta mas não fecha**: lógica de retry **não monitorada** pode virar um mecanismo de **fallback disfarçado**, com os mesmos problemas de um fallback. Retries são fáceis de errar; serviços passam meses sem precisar de muitos e quando precisam é em cenários nunca testados. Por isso a Amazon mantém métricas e alarmes sobre a taxa geral de retries: retry frequente é sinal de **modo degradado não-antecipado**, não "recuperação normal" (`fonte: Jacob Gabrielson | Avoiding fallback in distributed systems | seção: Como a Amazon evita o fallback`).

Há mais de uma forma de conter isso (retry throttling via token bucket × circuit breaker × trabalho constante/hedged requests), cada uma com trade-offs próprios.

**REMETIDA À ONDA 3 (resiliência):** a resolução completa da tensão retry × overload — quando retry vira fallback disfarçado / amplifica overload; token-bucket × circuit-breaker × trabalho constante; integração com shuffle-sharding e avoiding-fallback — é tratada no enriquecimento de **resiliência (Onda 3)**, NÃO aqui. Aqui fica o sinal: **retry sem instrumentação da taxa de retries é o anti-pattern central**, e o critério de parada de Brooker (parar de retentar quando os retries não melhoram a disponibilidade) é o primeiro guard-rail (`fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Conclusão` + `fonte: Jacob Gabrielson | Avoiding fallback in distributed systems | seção: Como a Amazon evita o fallback`).

---

## Dead-Letter Queues & Poison Messages

A distinção que governa tudo: **transitório → retry/redelivery resolve; determinístico (poison) → retry só queima recurso, precisa de DLQ.** Configurar `attempts` num job cuja falha é determinística não adianta — "retry não adiantaria" (`fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Opções de jobs (opts)`).

- **Poison message** = mensagem que NÃO pode ser processada — toda tentativa falha. Tipicamente porque o conteúdo aciona um caso de borda/validação no consumidor (bug do consumidor ou payload malformado), não indisponibilidade passageira (`fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon`).
- **Dead-letter queue (DLQ)** = fila separada para onde a mensagem venenosa é desviada após esgotar as retentativas. O ponto não é jogar fora — é **preservar** fora do caminho principal para **reprocessar** depois que o bug for corrigido (`fonte: David Yanacek | ... | seção: Abordagem da Amazon`).

### Quando Rotear para DLQ — as duas condições

1. **Esgotou as retentativas.** SQS: `maxReceiveCount` na redrive policy → desvio automático. Bull/Redis: limite de `attempts` (sem DLQ nativa; o equivalente é o que sobra após esgotar `attempts`) (`fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Como avaliar disponibilidade e latência` + `fonte: Rocketseat | ... | seção: Opções de jobs (opts)`).
2. **Está envenenando o consumidor.** Falha determinística — mesmo erro, mesmo input. Reciclar na fila principal só soma à sobrecarga (`fonte: David Yanacek | ... | seção: Abordagem da Amazon`).

Risco maior que "queimar CPU": em escalonamento horizontal fan-out-para-todos, um request venenoso reenviado derruba **instância após instância** em cascata até o cluster cair. Throttling por cliente NÃO protege — o problema está no request, não no cliente (`fonte: Colm MacCárthaigh | Shuffle sharding: massive and magical fault isolation | seção: Traditional Horizontal Scaling`).

### Operacional

| Parâmetro | Regra |
|-----------|-------|
| **`visibilityTimeout` (SQS)** | **maior** que o tempo máx. de processamento esperado (mesmo sob carga), mas não tão longo que atrase a reentrega numa falha real (`fonte: David Yanacek | Implementing health checks | seção: Processadores assíncronos`) |
| **Evento `failed` (Bull)** | `queue.on('failed', ...)` — sem handler, jobs falham **silenciosamente** (`fonte: Rocketseat | ... | seção: Tratamento de falhas`) |
| **Observabilidade** | alarme quando houver mensagens na DLQ; roteie o erro para Sentry/Bugsnag via `captureException`, não só `console.log` (`fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon` + `fonte: Rocketseat | ... | seção: Monitoramento em produção`) |
| **DLQ é indicador TARDIO** | bom medidor de disponibilidade (poucos falsos positivos) mas chega tarde — a mensagem só aparece após esgotar tentativas; combine com a **idade da mensagem na fila** (`fonte: David Yanacek | ... | seção: Como avaliar disponibilidade e latência`) |

### A Fork-Bomb Interna (sob carga)

Durante sobrecarga a latência de processamento sobe. Quando ultrapassa o `visibilityTimeout`, um processador estoura o timeout, um **segundo** consumidor pega a mesma mensagem, estoura, um **terceiro** — reentregas em cascata que **amplificam** a carga de um serviço já sobrecarregado. É insidioso porque a própria sobrecarga é o gatilho. Mitigação: garantir que a latência (mesmo sob sobrecarga) fique **abaixo** do `visibilityTimeout` — via heartbeat estendendo a visibilidade, ou interrompendo o processamento que passou do orçamento (`fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon`).

### Quando NÃO usar / alternativas

- **Drop por TTL em vez de DLQ/redelivery** — se a mensagem só tem valor processada imediatamente, descartar é melhor que reentregar. **Só é seguro se existir varredura anti-entropia** (reconciliação periódica) — sem ela, descartar = perda de dados (`fonte: David Yanacek | ... | seção: Abordagem da Amazon`).
- **Corrigir o consumidor é a alternativa real para poison verdadeiro** — a DLQ não conserta nada; isola e preserva. DLQ cheia é sintoma; a correção é no código do consumidor (`fonte: David Yanacek | ... | seção: Abordagem da Amazon`).
- **Idempotência em vez de medo de retry** — a fila VAI reentregar diante de falha (fato operacional); projete o consumidor para ser idempotente sob redelivery (`fonte: David Yanacek | ... | seção: A natureza ambígua das filas` + `fonte: Rocketseat | ... | seção: Opções de jobs (opts)`).

```
Mensagem falhou ao ser processada
│
├─ Falha transitória? (dependência lenta/indisponível, timeout de rede)
│   └─ SIM → redelivery/retry resolve.
│           Consumidor é idempotente?  NÃO → torne idempotente antes de habilitar retry.
│           Configure attempts (Bull) / maxReceiveCount (SQS).
│           visibilityTimeout > tempo máx. de processamento (mesmo sob carga).
│
├─ Falha determinística? (mesmo input → mesmo erro; payload malformado, bug de borda)
│   └─ É um POISON MESSAGE.
│       Esgotou as retentativas? → desvie para DLQ (não deixe reciclar na fila principal).
│       Alarme sobre volume da DLQ → corrija o consumidor → reprocesse da DLQ.
│
└─ A mensagem perde valor se processada tarde? (só vale "agora")
    └─ Existe varredura anti-entropia / reconciliação periódica?
        ├─ SIM → drop por TTL é seguro (estado reconcilia depois).
        └─ NÃO → não descarte (perderia dados); reentregue.
```

---

## Anti-Patterns

- **Confiar só na dedup do broker no publish** e assumir que o consumidor nunca verá duplicatas — não cobre re-entrega por ack falho (`fonte: desconhecido (.NET/Azure Service Bus) | Fix Duplicate Messages with the Idempotent Consumer Pattern | seção: Simulating the failure`).
- **Checagem aplicacional sem unique constraint** (read-then-act race-prone) — duas transações concorrentes veem `false` no `AnyAsync` e ambas gravam duplicado. O guard real é a unique constraint no banco (`fonte: ... | seção: Step 1 / Concurrency case`).
- **Marcador de dedup em transação separada da lógica de negócio** — abre janela onde a lógica roda mas o marcador não grava; mesma falha do lado servidor AWS (`fonte: ... | seção: Step 2` + `fonte: Malcolm Featonby | Making retries safe with idempotent APIs | seção: Reducing client complexity`).
- **Chave de dedup só por message ID com múltiplos consumidores** — o primeiro a processar bloqueia os legítimos demais (`fonte: desconhecido (.NET/Azure Service Bus) | ... | seção: Why track the consumer name`).
- **Confiar só na idempotência (sem transação) para efeito cross-system** — Kreps: idempotência sozinha não acopla atomicamente consumo + transformação + produção (`fonte: Jay Kreps | Exactly-once, one more time | seção: Flavio Junquera: No Consensus in Exactly Once`).
- **Gerar uma nova chave a cada retry** — o receptor trata a repetição como transação nova e processa de novo (`fonte: desconhecido (system/API design) | Build a robust Payments service using Idempotency Keys | seção: The flow — Retry with the same payment ID`).
- **Chave derivada de hash dos parâmetros** — confunde "request repetido" com "intenção de criar recursos idênticos múltiplos" (dois `RunInstances` EC2 idênticos são intenção legítima). Use identificador de intenção explícito do caller (`fonte: Malcolm Featonby | Making retries safe with idempotent APIs | seção: Reducing client complexity`).
- **Tratar ausência de resposta como prova de que nada foi processado** e reprocessar cegamente — sem chave, vira cobrança dupla (`fonte: desconhecido (system/API design) | ... | seção: API failure example`).
- **Responder `ResourceAlreadyExists` num retry idempotente** — sem efeito no servidor, mas com efeito colateral no cliente. Prefira resposta semanticamente equivalente (`fonte: Malcolm Featonby | ... | seção: Reducing client complexity`).
- **Tratar token igual com parâmetros diferentes como duplicata silenciosa** — mascara intenção divergente; retorne erro de validação de mismatch (`fonte: Malcolm Featonby | ... | seção: Same client request ID, different intent`).
- **Reter o conhecimento do request idempotente indefinidamente** — risco de colisão futura de identificadores; limite a retenção (`fonte: Malcolm Featonby | ... | seção: Late arriving requests`).
- **Dual-write sem outbox** — usar Redis/RabbitMQ/SQS como fila enquanto grava o estado no Postgres em duas operações separadas, criando janela de inconsistência (`fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)`).
- **Gravar a intenção (outbox) em transação separada da lógica de negócio** — quebra a atomicidade que o padrão existe para garantir (`fonte: desconhecido (.NET/Azure Service Bus) | ... | seção: Step 2 — wrap business logic in a transaction`).
- **Manter broker dedicado "por best practice"** sem reavaliar se banco-como-fila/outbox resolve — a premissa de hardware que justificava a regra pode não valer mais; re-benchmarque (`fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite`).
- **Empilhar retry em cada camada da pilha** sem coordenação — a carga no backend cresce K^N (`fonte: Marc Brooker | Timeouts, retries and backoff with jitter | seção: Novas tentativas e recuo`).
- **Backoff exponencial puro sem jitter** com múltiplos clientes — todos convergem para o mesmo tempo de espera e retentam em rajada sincronizada (thundering herd) (`fonte: Marc Brooker | ... | seção: Jitter`).
- **Backoff exponencial sem teto máximo** — tempos de espera crescem indefinidamente (`fonte: Marc Brooker | ... | seção: Novas tentativas e recuo`).
- **`random()` por execução no jitter de tarefas periódicas** — race conditions entre hosts ficam impossíveis de reproduzir; use jitter determinístico por host (`fonte: Marc Brooker | ... | seção: Jitter`).
- **Retry em 4xx com a mesma requisição** — o problema está na requisição, o mesmo erro retorna (`fonte: Marc Brooker | ... | seção: Novas tentativas e recuo`).
- **Retry agressivo durante sobrecarga sistêmica** — mais tentativas = mais sobrecarga = recuperação impossível (`fonte: Marc Brooker | ... | seção: Conclusão`).
- **Retry sem instrumentar a taxa de retries** — mascara degradação; o retry vira fallback disfarçado (`fonte: Jacob Gabrielson | Avoiding fallback in distributed systems | seção: Como a Amazon evita o fallback`).
- **Achar que mais retransmissões convertem "provável" em "garantido"** — reenvio só aumenta probabilidade e gera duplicatas a tratar com idempotência; nunca obtém garantia de entrega (`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: sending 10 letters doesn't really provide any additional guarantees`).
- **Timeout muito baixo** — aumenta tráfego de retry e pode transformar pequeno aumento de latência em interrupção total; deve cobrir DNS + TLS (`fonte: Marc Brooker | ... | seção: Tempos limite`).
- **Deixar mensagem não processável reciclar indefinidamente** na fila principal em vez de mandar para DLQ — soma à sobrecarga sem progredir (`fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon`).
- **`visibilityTimeout` abaixo da latência de processamento sob sobrecarga** — garante reentregas em cascata (fork-bomb). Inverso (timeout < tempo normal) causa redelivery desnecessário e processamento duplicado (`fonte: David Yanacek | ... | seção: Abordagem da Amazon` + `fonte: David Yanacek | Implementing health checks | seção: Processadores assíncronos`).
- **Confiar exclusivamente em alarme de DLQ para detectar degradação** — é indicador tardio; combine com idade de mensagem na fila (`fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Como avaliar disponibilidade e latência`).
- **Processar fila sem ouvir `on('failed')`** — jobs falham silenciosamente, ninguém sabe (`fonte: Rocketseat | Background jobs (filas) no Node.js com Redis | seção: Tratamento de falhas`).
- **Configurar `attempts` em job com efeito colateral não idempotente** sem proteção — duplica efeito a cada tentativa (`fonte: Rocketseat | ... | seção: Opções de jobs (opts)`).
- **Assumir que throttling por cliente protege contra poison request** — não isola o request bugado de atingir todas as instâncias (`fonte: Colm MacCárthaigh | Shuffle sharding: massive and magical fault isolation | seção: Traditional Horizontal Scaling`).
- **Descartar mensagens antigas num sistema sem varredura anti-entropia** — perde dados que nada recupera (`fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Abordagem da Amazon`).

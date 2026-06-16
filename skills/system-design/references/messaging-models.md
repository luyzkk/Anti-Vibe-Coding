# Modelo e Garantias de Mensageria — Referência Detalhada

> "Devo usar fila, e o que ela garante?" Esta referência cobre o **modelo** (Pub/Sub × Message Queue, processamento assíncrono de arquivos) e as **garantias** (semântica de entrega, exactly-once delivery×processing, ordenação).
> Idempotência/dedup/outbox/retry/DLQ → ver `messaging-reliability.md`. Brokers/RabbitMQ/durabilidade/backlog → ver `messaging-operations.md`.

## Pub/Sub vs Message Queue — fato × trabalho

A distinção é pela **natureza do que se comunica**, não pela infraestrutura.

| Modelo | O que você publica | Quem recebe | Padrão |
|--------|--------------------|-------------|--------|
| **Pub/Sub** | Um **FATO** que já aconteceu (`payment succeeded`) | N subscribers independentes, cada um com sua cópia | **fan-out** — o produtor não espera resultado nem confirmação |
| **Message Queue** | Um **TRABALHO** a ser feito (`compress image`) | **Um** worker tira o item da fila, executa e remove | atribuição de unidade de trabalho a um consumidor |

`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: A distinção de modelo mental`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Pub/Sub: publicar um fato`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Message Queue: publicar um trabalho a ser feito`

**REGRA:** o critério de escolha é **fato × trabalho**. Anunciando algo que já aconteceu para N reatores → Pub/Sub. Despachando uma tarefa que precisa ser executada por um worker → Message Queue.

**REGRA (heurística complementar — direção de dependência):** a dependência se inverte entre os modelos. Em Message Queue quem depende é o **produtor/serviço** (precisa que o trabalho seja feito). Em Pub/Sub é o **subscriber** que depende (precisa que a mensagem chegue); o produtor não depende de ninguém. Pergunta de desenho: qual lado tem a necessidade real?
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Inversão de dependência`

### Quando usar cada um

| Use **Pub/Sub** quando | Use **Message Queue** quando |
|------------------------|------------------------------|
| Um evento de domínio precisa ser consumido por **vários sistemas independentes** que não se quer acoplar ao produtor, e está OK se zero ou muitos ouvirem | Há tarefas **pesadas/lentas/assíncronas** (compressão, e-mail, API de terceiros) que devem sair do caminho da requisição |
| O produtor deve permanecer **livre/desacoplado** — só anuncia o fato e segue | Você quer **desafogar o serviço principal** e escalar produtor e consumidor de formas diferentes |
| | Precisa de **resiliência temporal**: a fila é buffer durável — worker cai e ao voltar retoma; produtor para e o worker drena os pendentes |
| | Precisa **escalar throughput** com competing consumers: N workers ouvem a mesma fila, mas cada job é processado por **apenas um** |

`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Pub/Sub: publicar um fato`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Message Queue: publicar um trabalho a ser feito`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Inversão de dependência`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: O Producer`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Rodando a demo (Resiliência demonstrada)`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Múltiplos workers na mesma fila`

### Quando NÃO usar

**NÃO use Pub/Sub** quando precisa garantir que uma ação específica ocorra ou que **exatamente um** consumidor processe o item — fan-out entrega a TODOS, não distribui trabalho; e o produtor perde controle/confirmação de que alguém agiu.
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Pub/Sub: publicar um fato`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: A distinção de modelo mental`

**NÃO use Message Queue** quando o produtor só anuncia um fato e não depende do resultado (o certo é Pub/Sub); quando o resultado é necessário de forma **síncrona na mesma requisição**; ou quando a tarefa é **trivial e síncrona** (broker só adiciona latência e complexidade).
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: A distinção de modelo mental`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: O Producer`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Estrutura do repositório: producer e worker`

### Combinar os dois (um fato dispara um trabalho)

É comum usar os dois juntos: **Pub/Sub fan-out na entrada, Message Queue para garantir a execução.** Um serviço de e-mail OUVE (Pub/Sub) o evento "pagamento foi sucesso" e então JOGA o trabalho numa fila; a fila garante o envio com retry, e um worker faz o envio.
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Usando os dois juntos`

**REGRA:** use a combinação quando um evento de domínio precisa disparar reações em vários sistemas (fan-out) **E** ao menos uma reação é trabalho que exige garantia de execução/retry.

### Árvore de decisão — modelo

```
Você está comunicando um FATO que já aconteceu (para N reatores)?
├── SIM → Pub/Sub (fan-out; o produtor não espera resultado nem confirmação)
│         └── e uma das reações é trabalho que exige garantia/retry?
│             └── SIM → o subscriber enfileira esse trabalho numa Message Queue
└── NÃO → é uma TAREFA que precisa ser executada por um worker?
          ├── SIM → precisa do resultado SÍNCRONO na mesma requisição?
          │         ├── SIM → execute inline (não enfileire)
          │         └── NÃO → Message Queue (producer → fila → worker)
          │                   └── volume alto? → competing consumers (1 job → 1 worker, N workers)
          └── tarefa trivial e síncrona → chamada direta, sem fila
```
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: A distinção de modelo mental`

---

## Processamento assíncrono de arquivos via fila

Depois que um arquivo é recebido, há trabalho de background demorado — virus scan, thumbnail/preview, OCR, validação. A decisão central: **empurrar essas operações para uma fila e processá-las em workers de background**, em vez de bloquear a requisição de upload até o trabalho terminar. Objetivo: usuários não esperam por trabalho de background.
`fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Async processing pipeline`
`fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Functional requirements`

**REGRA (consumo):** o worker pega mensagens da fila, executa nos bastidores e então **notifica o serviço de upload ao concluir** — para o estado do arquivo ser atualizado. Sem o sinal de conclusão de volta, o estado fica desatualizado.
`fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Final design — requirement check`

### Os dois padrões de enqueue (e o trade-off)

| Padrão | Como | Trade-off |
|--------|------|-----------|
| **object-store→queue** (opção 1) | O object store enfileira direto após o upload, disparando os workers como consumidores | **PREFERÊNCIA DEFAULT** — mais escalável; a maioria dos object stores já integra nativamente com mensageria |
| **API-callback→publish** (opção 2) | O object store faz callback à API, que então publica na fila | Dá controle/lógica central na publicação, mas **reintroduz a API no caminho** |

`fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Two integration options`

**REGRA:** prefira object-store→queue (opção 1); use o callback à API (opção 2) apenas quando precisar de lógica ou controle central na publicação — autenticação, carimbar identidade do chamador, justiça/utilização. A AWS não expõe filas internas diretamente: coloca uma API leve à frente que autentica e atribui identidade antes de enfileirar.
`fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Two integration options`
`fonte: David Yanacek | Avoiding insurmountable queue backlogs | seção: Backlogs`

### Caminho de dados (ortogonal ao pipeline): pre-signed URL

Para tirar o corpo do arquivo da API, use **pre-signed URL**: um endpoint (ex.: `/files/pre-signed-upload`) devolve uma URL segura, e o cliente faz upload **direto ao object store**. Com isso a File Upload API **deixa de ser SPOF**. A segurança não se perde: o usuário precisa estar autenticado para sequer obter a pre-signed URL.
`fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Introducing an Object Store`
`fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Bottlenecks this fixes`

> Distribuição/entrega via CDN (caminho de download público e roteamento) **não é deste conceito** — é tratada na Onda 2 (DNS/infrastructure).

### Árvore de decisão — async de arquivos

```
Arquivo recebido. Há trabalho pós-upload (scan / thumbnail / OCR / validação)?
├─ NÃO, ou trivial/rápido o bastante para caber na request
│    → processe SÍNCRONO, responda na própria requisição.
│      (não introduza fila — evolua só quando um gargalo concreto aparecer)
└─ SIM, trabalho demorado / alto volume
     → ASSÍNCRONO via fila. Quem publica?
        ├─ object store integra nativamente E sem lógica central
        │    → OBJECT-STORE→QUEUE (opção 1). PREFERÊNCIA DEFAULT.
        └─ precisa de controle central (auth, identidade, justiça)
             → API-CALLBACK→PUBLISH (opção 2): ponto de controle, reintroduz a API.

     Depois: worker consome → processa → NOTIFICA o serviço → estado atualizado.
     Caminho de DADOS: pre-signed URL → upload direto (API não é SPOF);
       endpoint que emite a URL exige autenticação.
```
`fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Initial (naive) design`
`fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Two integration options`
`fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Final design — requirement check`

> Idempotência do consumidor que reprocessa o arquivo → `messaging-reliability.md`. Backlog de fila acumulando / controle de utilização → `messaging-operations.md`.

---

## Semântica de entrega — at-most-once / at-least-once / "exactly-once"

Toda comunicação que atravessa uma fronteira de rede ou de processo precisa decidir **o que acontece quando algo falha no meio do caminho**. Essa decisão é a *delivery semantic*. Existem **essencialmente três** semânticas; das três, as duas primeiras são factíveis, exactly-once **não** é factível como entrega.
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: There are essentially three types of delivery semantics`

O eixo que separa perda de duplicata é **quando o ack acontece em relação ao processamento**. Não existe ponto de ack que elimine os dois riscos ao mesmo tempo: ou você arrisca perder, ou você arrisca duplicar.

| Semântica | Quando o ack | Risco | O que exige |
|-----------|--------------|-------|-------------|
| **At-most-once** | **antes** de processar | pode **perder** (crash do receiver perde o dado irreversivelmente) | nunca duplica; aceita perda — sem proteção extra no consumidor |
| **At-least-once** | **depois** de processar | pode **duplicar** (reentrega em crash/ack perdido) | nunca perde; **exige idempotência/dedup no consumidor** |
| **"Exactly-once"** | — | seria o ideal | **não alcançável** como entrega; só *fingido* sobre at-least-once |

`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — message is acknowledged immediately before processing`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — acknowledge messages after they are processed`

**REGRA (at-most-once):** USE quando perda ocasional é aceitável e duplicata é intolerável (métricas, telemetria descartável). NÃO use quando perder uma mensagem custa caro: transações financeiras, pedidos de cliente.
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — at-most-once`

**REGRA (at-least-once):** é o **caso mais comum** e o que todo broker sério oferece. Adotá-lo **sem** dedup/idempotência é anti-pattern — duplicatas causam efeitos repetidos. Quando as mudanças de estado já são naturalmente idempotentes, at-least-once passa a ser **suficiente e mais simples** — não persiga exactly-once.
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — at-least-once`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — State changes are idempotent`

**REGRA ("pediram exactly-once"):** desconfie. Toda fila séria que dá garantia se posiciona como at-least-once; um produto que alega exactly-once *delivery* ou está mentindo ou não entende sistemas distribuídos — trate como red flag e investigue a definição usada. Implemente at-least-once + dedup/idempotência.
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — Every major message queue marketing itself as at-least-once`

> Detalhe da impossibilidade e da regra prática → próxima seção (C1). Mecânica do idempotent consumer / dedup store / outbox → `messaging-reliability.md`.

---

## Exactly-once: delivery vs processing — a tensão C1 (Treat × Kreps)

Há um debate público real entre dois engenheiros sérios. **Os dois estão certos — sobre coisas diferentes.** O conflito não tem "vencedor": Tyler Treat e Jay Kreps falam de **camadas diferentes**. A disputa real é o **rótulo "delivery"**. NÃO ache esta tensão.

### Lado ANTI — entrega exactly-once é teoricamente impossível (Tyler Treat)

Em qualquer sistema distribuído **não existe** semântica de *entrega* exactly-once. Só existem at-most-once (pode perder) e at-least-once (pode duplicar). Exactly-once é "fingido" em cima de at-least-once via idempotência/dedup — nunca obtido no nível de delivery.
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: Within the context of a distributed system, you cannot have exactly-once message delivery`

A raiz é **teórica, não de engenharia**: **Two Generals / Byzantine Generals** (dois lados não chegam a acordo garantido sobre a recepção por canal não-confiável) somado ao **FLP result** (com a possibilidade de um processo faltoso, é impossível chegar a consenso). Isto **não é "difícil", é impossível** — "a mensagem caiu? o ack caiu? o receiver crashou? está só lento?" é indistinguível. Não aloque tempo para "finalmente resolver" exactly-once delivery.
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: The answer lies in the Two Generals thought experiment or the more generalized Byzantine Generals Problem`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: We must also consider the FLP result`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: FLP and the Two Generals Problem are not design complexities, they are impossibility results`

"Guaranteed delivery is a myth" — a resposta correta é construir sistemas resilientes que roteiam ao redor do dano, não prometer exactly-once. "Delivery" é semântica de **transporte**; "exactly-once delivery" é termo ruim, palavra de marketing.
`fonte: Tyler Treat | Dissecting Message Queues | seção: ZeroMQ and Nanomsg`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery, Redux | seção: "Exactly-once delivery" is a poor term`

### Lado PRÓ — exactly-once *processing/semantics* é alcançável (Jay Kreps)

Kreps **não contesta** Treat sobre transporte. Ele afirma algo diferente: exactly-once **semantics É alcançável no Kafka**, combinando idempotent producer + transações que dão atomicidade ao processamento, ambos *piggybacking* sobre o log consistente que o Kafka já é. Argumento de redução, não de mágica: quem aceita o Kafka como viável já aceitou a base.
`fonte: Jay Kreps | Exactly-once, one more time | seção: Tyler Treat: You Cannot Have Exactly-Once Delivery Redux`
`fonte: Jay Kreps | Exactly-once, one more time | seção: Henry Robinson: Tinkerbell Consensus`

Kreps desloca o eixo: a pergunta certa não é "é teoricamente possível?", mas "atomic broadcast é uma **abstração prática e operável**?". Usar FLP para descartar exactly-once na prática é o anti-pattern.
`fonte: Jay Kreps | Exactly-once, one more time | seção: Henry Robinson: Tinkerbell Consensus`

### A convergência: os dois concordam no que importa

O ponto não-óbvio: **Treat e Kreps concordam no rótulo certo** — ambos preferem "exactly-once *processing*" a "exactly-once *delivery*". Treat está certo sobre *delivery* (impossível); Kreps está certo sobre *processing* (alcançável num sistema fechado, via commit conjunto de estado + offsets). A briga inteira era sobre uma palavra sobrecarregada — "delivery" —, distorcida para encaixar sistemas na semântica exactly-once.
`fonte: Jay Kreps | Exactly-once, one more time | seção: Tyler Treat: You Cannot Have Exactly-Once Delivery Redux`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery, Redux | seção: To achieve exactly-once processing semantics`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: People often bend the meaning of "delivery" in order to make their system fit the semantics of exactly-once`

### A regra prática (a saída de C1)

> **REGRA:** Projete para **at-least-once + idempotência no consumidor**. Use transações/outbox quando precisar de atomicidade entre mudança de estado e saída. Se pediram "exactly-once", reescreva o requisito como *processing*, não *delivery*.

`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: Design for failure and resiliency against this asynchronous nature`
`fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: A distinção de modelo mental`

> A mecânica que operacionaliza essa regra — dedup store, idempotent consumer pattern, unique index (message ID + consumer name), transação atômica e outbox para efeito cross-system — está em `messaging-reliability.md`. Aqui fica a **decisão** de mirar processing, não delivery.

### Quando "exactly-once" do vendor é real / quando é marketing

| Sinal | Leitura |
|-------|---------|
| Anuncia **"exactly-once delivery"** sem qualificar | **Red flag.** Ou mente, ou não entende sistemas distribuídos |
| Diz **"exactly-once processing"** num sistema fechado (commit de estado+offsets) | **Real.** É o que Kafka faz via transaction API + idempotent producer |
| Promete a garantia como **flag que se liga** | **Marketing.** Exige usar as abstrações (transações/Streams API), não é "pixie dust" |
| "Delivery" foi **redefinido** (ex.: atomic broadcast) | **Verifique.** Entrega confiável e ordenada ≠ exactly-once delivery genuíno — é at-least-once + idempotência rebatizado |

`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: Every major message queue in existence which provides any guarantees will market itself as at-least-once delivery`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery, Redux | seção: To achieve exactly-once processing semantics`
`fonte: Jay Kreps | Exactly-once, one more time | seção: Tyler Treat: You Cannot Have Exactly-Once Delivery Redux`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: People often bend the meaning of "delivery"`

Resumo operável: **"exactly-once *processing*" pode ser real; "exactly-once *delivery*" pura é sempre suspeito.** A palavra denuncia.

### Árvore de decisão — exactly-once

```
Pediram / o vendor prometeu "exactly-once"?
│
├── O rótulo é "exactly-once DELIVERY" (transporte/bytes na rede)?
│     → IMPOSSÍVEL (Two Generals + FLP). Red flag se for vendor.
│       Reescreva o requisito como PROCESSING. (Treat)
│
└── O requisito real é "processar com efeito exatamente uma vez" (PROCESSING)?
      → alcançável. (Kreps) Mire processing:
        at-least-once + idempotência/dedup no consumidor
        (+ transação/outbox p/ efeito cross-system → ver messaging-reliability.md)
      Precisa de ORDEM junto com a garantia? → ver seção Ordenação abaixo.
```
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: It's usually causal ordering that we're after anyway`

---

## Ordenação

Em sistemas event-driven com filas, você **frequentemente encontra eventos duplicados ou fora de ordem**. A questão de ordem **só vale a pena quando há fila/mensageria no meio** — em fluxos síncronos request/response puros, duplicação e reordenação não emergem do transporte.
`fonte: CockroachDB | Idempotency and Ordering — The problem in event-driven systems`

**REGRA (o ponto que a maioria erra):** o que você normalmente quer é ordenação **causal, não total**. **"Não existe agora" (there is no now)** em um sistema distribuído — não há instante global contra o qual ordenar tudo.
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — It's usually causal ordering that we're after anyway`

### O trade-off central: ordenação total × concorrência

**Ordenação total é a inimiga da concorrência.** Se você trata eventos concorrentemente, perde qualquer garantia de ordem.
- **Impôs ordenação total** → aceite serialização e **head-of-line blocking**: um evento lento na cabeça da fila impede todos os posteriores.
- **Quer concorrência** → relaxe a garantia de ordem onde possível.

Ter **concorrência *com* ordem** é possível, mas o custo é alto: exige **relógios estreitamente sincronizados** — alguns bancos (CockroachDB) chegam a depender de **relógios atômicos**. A mesma tensão reaparece como **"fast OR consistent"** em entrega multi-site, que exige **atomic broadcast** (Zab, base do ZooKeeper) e ainda assim se apoia em at-least-once.
`fonte: CockroachDB | Idempotency and Ordering — Ordering of events`
`fonte: CockroachDB | Idempotency and Ordering — Head-of-line blocking`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — atomic broadcast / reliable ordered needs coordination`

### Técnicas

| Técnica | Como funciona | Ganho / custo |
|---------|---------------|---------------|
| **Ordem provida pela fila (Kafka per-partition)** | Garante ordem **dentro de uma partição**; roteie eventos relacionados (ex.: por entity ID) para a mesma partição | Delega à fila, simplifica o consumidor; vale **só dentro da partição**, nunca global |
| **Supersede por timestamp / version number** | Armazena o último timestamp/versão; ao ver evento mais antigo, ignora (last-write-wins) | Ganha concorrência; mas **perde os eventos intermediários** suplantados |
| **Buffering e reordenação** | Segura eventos num buffer e só processa quando tem certeza da ordem | Garante ordem antes de processar, ao custo de **latência** |
| **Flush por sinal de segurança (resolved timestamps)** | Usa sinal confiável (ex.: Cockroach CDC resolved timestamps) para saber quando esvaziar o buffer | Flush correto em vez de chute de tempo; depende do sinal estar disponível |
| **Ordenação causal (sequencing / vector clocks)** | Ordem parcial por meios extrínsecos, sem relógio global | Barata e **suficiente na maioria dos casos** |
| **CRDTs (comutativos/convergentes)** | Modela o estado para convergir **independente de ordem ou duplicatas** | Elimina coordenação/ordem forte; mas restringe operações ao comutativo e adiciona complexidade |

`fonte: CockroachDB | Idempotency and Ordering — Queue-provided ordering`
`fonte: CockroachDB | Idempotency and Ordering — Ordering with timestamps / version numbers`
`fonte: CockroachDB | Idempotency and Ordering — Buffering and reordering`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — causal ordering via extrinsic means`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — CRDTs for order independence`

**REGRA (entity→partition):** atribuir eventos de uma entidade à mesma partição garante ordem por entity ID, mas como **muitos entity IDs compartilham uma partição**, isso pode **agravar o head-of-line blocking**. Dimensione partições/IDs para limitar o bloqueio.
`fonte: CockroachDB | Idempotency and Ordering — entity-to-partition mapping`

**Nota (ordem ≠ FIFO de chegada):** em real-time sob backlog, processar **os dados mais recentes primeiro (LIFO)** costuma trazer mais valor que respeitar a ordem de chegada — só não inverta quando a ordem é semanticamente obrigatória.
`fonte: David Yanacek | Avoiding insurmountable queue backlogs — Backlogs`

### Quando você REALMENTE precisa de ordem / quando não

**REGRA padrão de projeto: prefira eventos NÃO-ordenados sempre que possível.** Relaxe a ordem por default e só imponha onde o domínio exige.

**NÃO precisa de ordem total quando:** só o estado mais recente importa (supersede-by-timestamp); operações são comutativas/convergentes (CRDTs); ordem causal resolve (sequencing/vector clocks).
**REALMENTE precisa de ordem estrita quando:** os eventos são **não-comutativos** e cada transição importa — descartar antigos ou aplicar fora de ordem **corromperia o estado**. Aí aceite o limite de concorrência, ou pague relógios sincronizados (intra-sistema) / atomic broadcast (multi-site).
`fonte: CockroachDB | Idempotency and Ordering — Trade-offs`
`fonte: CockroachDB | supersede-by-timestamp-or-version`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — causal ordering`

### Árvore de decisão — ordenação

```
Há fila/mensageria assíncrona no caminho?
├─ NÃO (request/response síncrono puro)
│   └─ ordem não emerge do transporte — não se preocupe
└─ SIM → assuma duplicatas E desordem possíveis
    ├─ O domínio tolera processar fora de ordem?
    │   ├─ Só o estado MAIS RECENTE importa? → SUPERSEDE por timestamp/version
    │   ├─ Operações comutativas/convergentes? → CRDTs
    │   └─ Basta ordem CAUSAL? → sequencing / vector clocks (sem "now" global)
    └─ Precisa de ordem ESTRITA real (eventos não-comutativos)?
        ├─ Ordem por ENTIDADE basta? → KAFKA per-partition (roteie por entity ID)
        │     └─ dimensione partições p/ limitar head-of-line blocking entre IDs
        ├─ Garantir ordem antes de processar? → BUFFER + reordene;
        │     flush por sinal confiável (resolved timestamps), não tempo fixo
        ├─ Concorrência + ordem no mesmo sistema? → relógios sincronizados (custo alto)
        └─ Ordem entre MÚLTIPLOS sites? → ATOMIC BROADCAST (Zab) — "fast OR consistent"
```
`fonte: CockroachDB | Idempotency and Ordering — Ordering of events`
`fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — reliable ordered needs coordination`

> Dedup que reaproveita timestamps/versões/IDs → `messaging-reliability.md`. Streams/offset, backlog e FIFO de broker → `messaging-operations.md`.

---

## Anti-Patterns

- **Comando direto disfarçado de evento (ou vice-versa).** Mandar serviço A → B uma ordem quando o desenho pedia publicar um fato — acopla os sistemas e quebra o fan-out. Inverso: publicar um fato quando o produtor de fato **depende** da execução (deveria ser queue). `fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: A distinção de modelo mental` `fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Inversão de dependência`
- **Fan-out quando precisava de execução garantida.** Usar Pub/Sub esperando que UMA unidade de trabalho seja executada por um consumidor — fan-out entrega a todos, não distribui. `fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Pub/Sub: publicar um fato`
- **Workers duplicando o mesmo job.** Vários workers processando o mesmo job desperdiça recursos e repete efeitos. Escalar consumidores ≠ duplicar processamento. `fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Múltiplos workers na mesma fila`
- **Trabalho pesado inline no handler do evento.** O subscriber do Pub/Sub executar envio de e-mail / API externa inline em vez de enfileirar — perde retry e garantia de entrega. `fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: Usando os dois juntos`
- **Executar virus scan, OCR e thumbnails síncronos dentro da requisição de upload**, fazendo o usuário esperar. `fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Async processing pipeline`
- **Processar a mensagem em background mas nunca sinalizar a conclusão** de volta ao serviço, deixando o estado desatualizado. `fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Final design — requirement check`
- **Rotear o evento de upload de volta pela API só para enfileirar** quando o object store já integra nativamente (opção 2 sem necessidade de controle central). `fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Two integration options`
- **Manter todo o tráfego de arquivos passando obrigatoriamente pela API**, fazendo dela um SPOF (em vez de upload direto via pre-signed URL). `fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Bottlenecks this fixes`
- **Pular direto para a arquitetura final complexa** sem demonstrar por que cada componente (fila inclusa) é necessário. `fonte: desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer | seção: Initial (naive) design`
- **Tratar exactly-once como botão a ligar.** Apresentar exactly-once como opção de entrega selecionável ao lado de at-most/at-least leva a desenho frágil. `fonte: Augusto Galego | Pub/Sub não é Message Queue | seção: A distinção de modelo mental`
- **Projetar assumindo que o transporte garante exactly-once** e omitir tratamento de duplicatas/perdas. `fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: Within the context of a distributed system, you cannot have exactly-once message delivery`
- **Selecionar um broker porque ele anuncia "exactly-once delivery"** sem questionar a definição usada. `fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: Every major message queue in existence which provides any guarantees will market itself as at-least-once delivery`
- **Achar que mais retries convertem "provável" em "garantido"** — reenvio só aumenta probabilidade e gera duplicatas a tratar; não fecha a lacuna teórica. `fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery | seção: sending 10 letters doesn't really provide any additional guarantees`
- **Tratar exactly-once como "pixie dust mágico"** — flag que se liga sem arquitetar a aplicação (sistema fechado, commit de estado+offsets). `fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery, Redux | seção: To achieve exactly-once processing semantics`
- **Usar FLP para descartar exactly-once processing na prática** — confunde impossibilidade de delivery com inviabilidade de processing operável. `fonte: Jay Kreps | Exactly-once, one more time | seção: Henry Robinson: Tinkerbell Consensus`
- **Confiar na ordenação do Kafka entre partições distintas**, assumindo ordem global onde só existe intra-partição. `fonte: CockroachDB | Idempotency and Ordering — Queue-provided ordering`
- **Atribuir entidades a partições sem considerar** que IDs co-localizados bloqueiam uns aos outros (head-of-line blocking agravado). `fonte: CockroachDB | Idempotency and Ordering — entity-to-partition mapping`
- **Impor processamento estritamente ordenado em fila única** sem prever que um evento lento no head bloqueia todos os subsequentes. `fonte: CockroachDB | Idempotency and Ordering — Head-of-line blocking`
- **Exigir ordenação total E esperar alta concorrência** sem mecanismos especializados (relógios sincronizados). `fonte: CockroachDB | Idempotency and Ordering — Ordering of events`
- **Aplicar supersede-by-timestamp em domínios onde cada transição importa**, descartando silenciosamente eventos intermediários necessários. `fonte: CockroachDB | supersede-by-timestamp-or-version`
- **Exigir ordenação total estrita (assumindo um "agora" global)** quando ordenação causal resolveria. `fonte: Tyler Treat | You Cannot Have Exactly-Once Delivery — causal ordering via extrinsic means`
- **Manter FIFO estrito durante backlog grande** em real-time, fazendo o cliente esperar a drenagem de dados velhos antes de ver os relevantes. `fonte: David Yanacek | Avoiding insurmountable queue backlogs — Backlogs`

## Fontes

- `Augusto Galego | Pub/Sub não é Message Queue` — modelo mental fato×trabalho, fan-out, competing consumers, inversão de dependência, resiliência, combinação dos dois; contém o misconception exactly-once-como-botão (corrigido aqui).
- `Tyler Treat | You Cannot Have Exactly-Once Delivery` — lado ANTI de C1: Two Generals + FLP; três semânticas (só at-most/at-least factíveis); ordenação causal vs total.
- `Tyler Treat | You Cannot Have Exactly-Once Delivery, Redux` — delivery (transporte) vs processing (aplicação); "exactly-once delivery is a poor term".
- `Tyler Treat | Dissecting Message Queues` — "guaranteed delivery is a myth".
- `Jay Kreps | Exactly-once, one more time` — lado PRÓ de C1: exactly-once *processing* alcançável no Kafka; FLP não descarta a abstração operável.
- `CockroachDB | Idempotency and Ordering` — técnicas de ordenação, trade-off total×concorrência, head-of-line blocking, Kafka per-partition.
- `desconhecido (system design educator) | Design a File Upload Service Like a Senior Engineer` — pipeline async pós-upload, dois padrões de enqueue, pre-signed URL / SPOF.
- `David Yanacek | Avoiding insurmountable queue backlogs` (AWS) — API leve à frente da fila; preferência LIFO sob backlog.

# Fase 03: Extrair Filas (Fase 1 do Pipeline — Onda 1)

**Plano:** 01 — Fundação do Corpus
**Sizing:** 2h
**Depende de:** fase-02 (precisa dos `normalized/` das fontes de Filas)
**Visual:** false

---

## O que esta fase entrega

Extração EXAUSTIVA das fontes `primary_bucket = queues` (Onda 1) — 1 subagente ISOLADO por fonte, escrevendo átomos em disco — priorizada primeiro para deixar os átomos de Filas (a urgência máxima, cobertura ~zero) prontos cedo.

---

## Fontes de Filas a extrair (13 fontes primary-queues)

Enumeradas do `sources-manifest.md` (seção "Filas") cruzado com `triage-results.json` (`primary_bucket: queues`):

| source_id | Autor | all_buckets | Notas de extração |
|---|---|---|---|
| `pubsub-nao-e-message-queue` | Augusto Galego | [queues] | ✅ já extraída na fase-01 (tracer). Confirmar átomos presentes; **átomo delivery-semantics tem `flags: [misconception]`** (C1/D10). |
| `rabbitmq-classic-quorum-stream` | Full Cycle | [queues, resilience] | tipos de fila (Classic/Quorum-Raft-WAL-fsync/Stream-offset), throughput; átomos de resiliência (replicação) com `bucket: resilience`. |
| `background-jobs-node-redis-bull` | Rocketseat | [queues] | Bull+Redis operacional (worker isolado, retries/priority/delay/rate-limit, monitoring). Camada operacional. |
| `idempotent-consumer-pattern` | desconhecido (.NET/Azure SB) | [queues, resilience] | idempotent consumer (dedup store, chave composta + unique index, transação atômica) + outbox. **Âncora de C2** (mostra idempotência E transações). |
| `payments-idempotency-keys` | desconhecido | [queues, resilience] | idempotency keys (server-issued vs client-supplied — **C8**); rescue resilience (retry/no-retry — `flags: [rescue-nugget]` nos átomos de resiliência). |
| `idempotency-and-ordering-events` | desconhecido (CockroachDB) | [queues, resilience] | dedup (timestamps/version/unique-ID) + ordering (Kafka per-partition, supersede-by-timestamp, concorrência×ordering). |
| `treat-dissecting-message-queues` | Tyler Treat | [queues] | survey 9 brokers (brokerless×brokered); "guaranteed delivery is a myth". **C1.** |
| `kreps-exactly-once-one-more-time` | Jay Kreps | [queues] | exactly-once ALCANÇÁVEL em Kafka (idempotent producer + transações). **C1** — posição pró. Camada julgamento. |
| `treat-exactly-once-delivery-redux` | Tyler Treat | [queues] | rebuttal a Kreps: delivery impossível, só processing. **C1** — posição anti. |
| `treat-you-cannot-have-exactly-once-delivery` | Tyler Treat | [queues, resilience] | fundacional (Two Generals + FLP). **C1** — raiz do debate. |
| `yanacek-avoiding-queue-backlogs` | David Yanacek | [queues, resilience] | backlog/DLQ/poison/visibility-timeout/heartbeat/age-rerouting/TTL/LIFO-recovery. EXCEPCIONALMENTE rico em operacional. Camadas O,RO,J. |
| `aws-idempotent-apis-retries` | Malcolm Featonby | [queues, resilience] | client request token; gravar token+mutações atomicamente; EC2 ClientToken. **C8.** |
| `file-upload-service-senior-design` | desconhecido | [queues, resilience] | **RESCUE** (`rescue_flag:true`): async via fila + presigned URLs + CDN geo-routing. Extrair exaustivamente (não é nugget-only — o rescue foi do título, o conteúdo é forte). |

> **Total: 13 fontes primary-queues** (bate com manifest "Filas 13"). Inclui o rescue `file-upload-service-senior-design` e os 3 artigos exactly-once (Kreps + Treat ×2-redux/fundacional — conflito C1) + Yanacek/Featonby (AWS, primary queues mas com átomos de resiliência também).

---

## Arquivos Afetados

> `Infos/_pipeline/atoms/{source_id}/{conceito-slug}.md` (gitignored). N átomos por fonte (extração exaustiva — número não pré-fixado). 1 diretório por source_id.

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `Infos/_pipeline/atoms/{source_id}/{conceito-slug}.md` | Create | 1 átomo por conceito distinto, schema de 9 campos, `fonte:` obrigatório. Para os 13 source_ids acima (exceto `pubsub-nao-e-message-queue`, já feito). |

---

## Implementação

### Passo 1: Lançar 1 subagente isolado por fonte

12 subagentes (as 13 menos o tracer já feito), cada um com contexto isolado. **Podem rodar em paralelo** (fontes disjuntas, sem dependência entre si). Sub-agentes em paralelo é exigência do CLAUDE.md global para >5 unidades independentes.

### Passo 2: Contrato do subagente-de-extração (1/fonte)

- **Recebe:** SÓ `normalized/{source_id}.md` (isolado — não o corpus, não os átomos de outras fontes).
- **Faz:**
  1. Extrai TODO conceito distinto que a fonte ensina (**extrair, não resumir** — melhor um átomo a mais que perder um). Usar o vocabulário canônico de conceitos do `extraction-schema.md` (seção Filas) como guia de nomes para permitir o reagrupamento da Fase 2.
  2. Para cada conceito, preenche os 9 campos:
     ```yaml
     conceito:        # nome canônico (ex.: "Idempotent consumer pattern")
     afirmacao:       # regra/insight específico, 1-3 frases
     camada:          # julgamento | operacional | referencia-oficial
     quando_usar:
     quando_NAO_usar: # obrigatório (inferir do trade-off ou [A DEFINIR])
     trade_off:
     anti_pattern:
     regra_de_decisao:# "SE <condição> ENTÃO <escolha>"
     fonte:           # autor | título | âncora  ← OBRIGATÓRIO
     source_id:       # {source_id}
     bucket:          # queues  (ou resilience p/ átomos cross-bucket — ver Passo 3)
     flags:           # [] | [misconception] | [rescue-nugget] | [unverified]
     ```
  3. Grava cada átomo em `atoms/{source_id}/{conceito-slug}.md`. O `{conceito-slug}` é o nome do conceito em kebab-case (ex.: `idempotent-consumer-pattern.md`, `delivery-semantics.md`).
- **NÃO faz:** sintetizar (Fase 2), resolver conflito (Fase 2), tocar skill, ler outras fontes.

### Passo 3: Fontes cross-bucket — extrair exaustivamente, marcar `bucket` correto

Várias fontes de Filas têm `all_buckets` ⊋ `[queues]` (ex.: `yanacek-avoiding-queue-backlogs` → [queues, resilience]; `idempotent-consumer-pattern` → [queues, resilience]). **A extração é exaustiva por fonte, não limitada ao bucket primary** (G1 do plano):
- Átomo de conceito de Filas → `bucket: queues`.
- Átomo de conceito de resiliência (ex.: retry-on-failure em `payments-idempotency-keys`, redelivery-as-operational-fact em `yanacek`) → `bucket: resilience`.
- A síntese das ondas posteriores (Plano 04 para resiliência) encontra esses átomos **por conceito**, atravessando o source_id. Por isso o campo `bucket` correto é o que garante que um átomo de resiliência escondido numa fonte de Filas não se perca.

### Passo 4: Flags por fonte (do manifesto/conflict_register)

- **`flags: [misconception]`** — só `pubsub-nao-e-message-queue` (átomo delivery-semantics), já feito na fase-01. Confirmar.
- **`flags: [rescue-nugget]`** — átomos de resiliência resgatados de `payments-idempotency-keys` (o rescue_note do triage indica retry/no-retry como resgate). `file-upload-service-senior-design` é rescue por título mas extrai-se exaustivamente (não nugget-only).
- **Conflito C1** (exactly-once): os 4 átomos-âncora vivem em `kreps-exactly-once-one-more-time`, `treat-exactly-once-delivery-redux`, `treat-you-cannot-have-exactly-once-delivery`, e o `misconception` em `pubsub-nao-e-message-queue`. **Não resolver aqui** — só garantir que cada posição produz um átomo (a resolução é Plano 02 fase-01). Marcar nada além do que o schema pede; a fase-05 rastreia C1 pela presença desses átomos.
- **Conflitos C2 (idempotência basta?), C5 (DB-queue×broker), C8 (quem emite key)** — átomos-âncora em `idempotent-consumer-pattern`/`kreps` (C2), `dhh-sqlite-stoicism` extraído na fase-04 + norma (C5), `payments-idempotency-keys`/`aws-idempotent-apis-retries` (C8). Garantir que as fontes de Filas relevantes produzem o átomo da sua posição.

---

## Gotchas

- **G1 do plano (cross-bucket exhaustive):** o ponto mais fácil de errar. Não pular o átomo de resiliência de uma fonte de Filas só porque "esta é uma fonte de Filas". `bucket: resilience` no átomo, e segue.
- **G2 do plano (misconception):** já materializado no tracer; aqui só confirmar que `pubsub-nao-e-message-queue/delivery-semantics.md` carrega o flag.
- **G6 do plano (`Infos/` gitignored):** átomos não versionáveis.
- **Local — exactly-once é 4 fontes, não 1:** o conflito C1 mora em 4 fontes distintas (Kreps + 3 Treat-variantes + o misconception). Cada uma é um subagente separado e cada uma DEVE produzir seu átomo de exactly-once com a posição própria. Se uma das 4 não produzir átomo de exactly-once, a síntese da Onda 1 perde um vértice da tensão.
- **Local — `fonte:` âncora por tipo:** transcrições (`type: video-transcription`, `anchor: none`) → `seção:`/`trecho:`. Artigos Treat/Kreps (`type: blog-article`, `anchor: section-headings`) → `seção: <heading>`. AWS Builders' Library (`anchor: section-headings`) → `seção: <heading>`. Usar a âncora que o triage registra por fonte.

---

## Verificação

> **Audit de cobertura por fonte, não TDD.** Cada fonte de Filas → ≥1 átomo; todo átomo tem `fonte:`; flags aplicadas onde o manifesto indica.

### Checklist

- [ ] **Cada fonte de Filas → ≥1 átomo:** existe diretório `atoms/{source_id}/` com ≥1 `.md` para cada um dos 13 source_ids primary-queues.
  - Comando: para cada id, contar `*.md` em `atoms/{id}/` → ≥1. Lista de 13 ids deste documento.
- [ ] **Todo átomo tem `fonte:`:** nenhum átomo em `atoms/{queues-source}/` sem a linha `fonte:`. Sem citação → não persiste (CA-03).
  - Comando (Grep): em `atoms/`, contar `.md` SEM `^fonte:` → 0.
- [ ] **Misconception aplicado:** `atoms/pubsub-nao-e-message-queue/` tem ≥1 átomo com `misconception`.
  - Comando (Grep): padrão `misconception` casa em ≥1 átomo dessa fonte.
- [ ] **C1 tem os 4 vértices:** existe átomo de exactly-once (ou delivery-vs-processing) em CADA um de `kreps-exactly-once-one-more-time`, `treat-exactly-once-delivery-redux`, `treat-you-cannot-have-exactly-once-delivery`, `pubsub-nao-e-message-queue`.
  - Verificação: 4 diretórios, cada um com átomo cujo `conceito` é exactly-once/delivery-semantics.
- [ ] **Cross-bucket marcado:** fontes com `all_buckets` incluindo resilience produziram ≥1 átomo com `bucket: resilience` quando a fonte de fato ensina resiliência (ex.: `yanacek-avoiding-queue-backlogs`, `payments-idempotency-keys`).
  - Comando (Grep): padrão `bucket: resilience` casa em átomos sob fontes primary-queues cross-bucket.
- [ ] **rescue-nugget onde aplicável:** átomos de resiliência de `payments-idempotency-keys` marcados `rescue-nugget` (conforme rescue_note do triage).

---

## Critério de Aceite

**Por máquina:**
- Para cada um dos 13 source_ids primary-queues, `atoms/{id}/` existe e tem ≥1 `.md`.
- `grep -L '^fonte:'` (ou equivalente) sobre os átomos de Filas retorna lista vazia (todo átomo citado).
- `atoms/pubsub-nao-e-message-queue/` tem ≥1 átomo com `misconception`; os 4 diretórios de C1 têm átomo de exactly-once.

**Por humano:**
- Amostragem de 2 fontes ricas (ex.: `yanacek-avoiding-queue-backlogs` e `idempotent-consumer-pattern`) confirma extração exaustiva (não resumo) — os átomos cobrem os conceitos que o vocabulário canônico lista para aquela fonte, sem agrupar dois insights num só.

---

<!-- Gerado por /plan-feature em 2026-06-15 -->

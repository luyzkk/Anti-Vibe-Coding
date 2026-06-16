---
title: "Edit Manifest — System Design Coverage Gaps"
status: onda1-approved
created: 2026-06-16
---

# Edit Manifest — Conceito → Alvo (Fase 3 do pipeline)

> **O que é:** o contrato de aplicação. Para cada onda, mapeia cada conceito sintetizado ao
> arquivo-alvo que receberá a edição, com granularidade e mudanças exatas. **Este arquivo NÃO
> edita nenhuma skill** — só descreve destinos.
>
> **GATE HUMANO (CA-06):** cada seção é aprovada pelo Navegador **antes** da fase de aplicação
> correspondente. Nenhuma skill muda até você aprovar a seção. A aprovação desta seção destrava
> a **Plano 02 fase-05 (aplicação Onda 1)** — e só ela.

**Status das seções**
- [ ] **Onda 1 — Filas e Mensageria** — ⏳ AGUARDANDO SUA APROVAÇÃO ← *esta seção*
- [ ] Onda 2 — SQL-internals + DNS-routing — pendente (Plano 03 fase-04)
- [ ] Onda 3 — Resiliência (enriquecimento) — pendente (Plano 04 fase-03)

---

## SEÇÃO ONDA 1 — Filas e Mensageria

> ✅ **APROVADO PELO NAVEGADOR (2026-06-16).** Decisões travadas: **P5 = 3 references**
> (`messaging-models` / `messaging-reliability` / `messaging-operations` + seção 9 no SKILL.md);
> **`description` = lista completa de keywords** (M4); **mapa conceito→alvo aprovado como proposto**
> (sem remapeamentos). Destrava a Plano 02 fase-05 (aplicação Onda 1).

### Contexto

- **16 conceitos sintetizados** em `Infos/_pipeline/synthesis/` (~2400 linhas, 100% com `fonte:`).
- **Skill dona:** `system-design` (D2 — cada conceito mora na skill dona; filas é system design).
- **Gap atual:** `system-design` tem 8 seções (CAP, escala, cache, DB, replicação, LB, CDN, serverless)
  e **zero** cobertura de filas/mensageria. É o buraco que esta onda fecha.
- **D3:** julgamento (quando usar / NÃO / árvore) vai pro `SKILL.md`; profundidade + código vão pras references.
- **CA-07:** nada já coberto vira reference nova. Filas **não** é coberto → references **novas** são corretas
  (não é o caso de extensão/cross-link, que vale só pra tópico existente).

---

### ⚠️ DECISÃO P5 — Granularidade de references — **PRECISA DA SUA ESCOLHA**

O plano estimava "Filas 2-3 references". Com o volume real (~2400 linhas), **2 references inchariam**
(~1200 linhas cada — acima do `file-size-guard`). Recomendo **3 references novas + 1 seção no `SKILL.md`**.

**▶ RECOMENDADO — 3 references temáticas** (agrupadas pela jornada mental do dev):

| Reference (nova) | Tema | Conceitos | ~linhas-fonte |
|---|---|---|---|
| `messaging-models.md` | O modelo e as garantias: "devo usar fila, e o que ela garante?" | pub-sub-vs-message-queue · delivery-semantics · exactly-once-delivery-vs-processing · ordering · async-file-processing | ~680 |
| `messaging-reliability.md` | Correção sob duplicata/falha | idempotent-consumer-pattern · idempotency-keys · outbox-pattern · retries-backoff-jitter · dlq-poison-messages | ~670 |
| `messaging-operations.md` | Escolher e operar a infra | broker-landscape · rabbitmq-queue-types · background-jobs · durability · backlog-management · backpressure-load-leveling | ~1270 |

> **Trade-off honesto desta opção:** `messaging-operations.md` fica o mais pesado (~1270 linhas-fonte;
> a reference distilada será menor, mas ainda é a maior). Mantém **C5 inteiro junto** (broker-landscape
> + durability na mesma reference) — bom pro leitor. Se passar do guard na aplicação, split tardio.

**▷ ALTERNATIVA — 4 references** (se preferir arquivos menores e mais navegáveis):
divide operations em `messaging-brokers.md` (broker-landscape · rabbitmq-queue-types · durability — mantém C5)
+ `messaging-throughput.md` (background-jobs · backlog-management · backpressure-load-leveling). Os outros
dois (`messaging-models`, `messaging-reliability`) ficam iguais. Custo: +1 arquivo, +1 entrada na seção SKILL.md.

*Sua decisão aqui fixa quantos arquivos a fase-05 cria. Tudo abaixo assume o RECOMENDADO (3 refs); se
escolher 4, ajusto a tabela de operations e a seção SKILL.md antes de aplicar.*

---

### Mapa conceito → alvo (16/16 — zero descarte silencioso, CA-01)

| # | Conceito (`synthesis/…`) | Reference-alvo | Tratamento no SKILL.md | Conflito |
|---|---|---|---|---|
| 1 | pub-sub-vs-message-queue | `messaging-models.md` | árvore "pub/sub × fila" na seção 9 | — |
| 2 | delivery-semantics | `messaging-models.md` | regra "projete at-least-once" | — |
| 3 | exactly-once-delivery-vs-processing | `messaging-models.md` | nota "delivery × processing" | **C1** |
| 4 | ordering | `messaging-models.md` | bullet "ordem × concorrência" | — |
| 5 | async-file-processing | `messaging-models.md` | árvore "processar síncrono × via fila" | — |
| 6 | idempotent-consumer-pattern | `messaging-reliability.md` | regra central da seção 9 | **C2** |
| 7 | idempotency-keys | `messaging-reliability.md` | bullet "quem emite a chave" | **C8** |
| 8 | outbox-pattern | `messaging-reliability.md` | ramo da árvore (efeito cross-system) | — |
| 9 | retries-backoff-jitter | `messaging-reliability.md` | bullet "retry seguro"; tensão→Onda 3 | (C4→Onda 3) |
| 10 | dlq-poison-messages | `messaging-reliability.md` | bullet "DLQ obrigatória" | — |
| 11 | broker-landscape | `messaging-operations.md` | árvore "qual broker / DB-backed?" | **C5** |
| 12 | rabbitmq-queue-types | `messaging-operations.md` | tabela Classic/Quorum/Stream | — |
| 13 | background-jobs | `messaging-operations.md` | nota operacional (Bull/Redis) | — |
| 14 | durability | `messaging-operations.md` | bullet "fsync / in-memory / DB-backed" | **C5** |
| 15 | backlog-management | `messaging-operations.md` | bullet "visibility timeout / LIFO-recovery" | — |
| 16 | backpressure-load-leveling | `messaging-operations.md` | bullet "leveling × backpressure × shedding" | — |

**Cobertura:** 16/16 conceitos mapeados a um alvo. Nenhum órfão. (Os 3 OUT do triage seguem fora — registrados no `sources-manifest.md`.)

---

### Alvo A — `system-design/SKILL.md`

1. **Nova seção `## 9. Filas e Mensageria`** (após a seção 8, antes do Cheat Sheet), no padrão das
   existentes: regra-âncora + árvore de decisão + ponteiro `references/`. Conteúdo de julgamento (D3):
   - Árvore raiz: *preciso de fila? síncrono basta? pub/sub × fila × background job?*
   - Regra central: **projete para at-least-once + consumidor idempotente**; exactly-once *delivery* é red flag.
   - Ponteiros pras 3 references novas.
2. **Linha no Cheat Sheet** (tabela "Decisão | Padrão Seguro | Mude Quando"):
   `Filas | at-least-once + consumidor idempotente | exactly-once nativo prometido = desconfie`.
3. **`description` (M4 / CA-02)** — adicionar keywords de mensageria ao final da lista existente
   (antes de "or faces infrastructure…"). Mínimo obrigatório por CA-02: `'message queue'`,
   `'exactly-once'`, `'idempotent consumer'`. Proposta completa:
   > `'message queue', 'pub/sub', 'message broker', 'delivery semantics', 'exactly-once', 'idempotent consumer', 'idempotency key', 'message ordering', 'dead letter queue', 'DLQ', 'poison message', 'backpressure', 'load leveling', 'backlog', 'RabbitMQ', 'quorum queue', 'background jobs', 'BullMQ', 'outbox pattern', 'message durability'`
   - **Risco R1:** não há keyword-parity test (P1/grep confirmou); validar com `bun test` nas wire/prefaces após editar.

---

### Alvo B — references novas (`system-design/references/`)

As 3 (ou 4) references da decisão P5. Cada uma destila os átomos via os arquivos `synthesis/`,
**preservando as linhas `fonte:`** (CA-03). Profundidade + código permitido (D3). Cada reference abre
com a camada julgamento (quando usar/NÃO + árvore) e desce pro operacional.

---

### Alvo C — `hooks/hooks.json` (advisor one-liner, M3 / P3)

Linha única do advisor da system-design (`SessionStart` printf). Atual:
```
- /anti-vibe-coding:system-design - System Design: cache, scaling, CAP, replicacao
```
Proposta:
```
- /anti-vibe-coding:system-design - System Design: cache, scaling, CAP, replicacao, filas/mensageria (queue, broker, exactly-once, idempotencia)
```
- P3 confirma: `hooks/hooks.json` é a **única** superfície de advisor one-liner (revalidar grep antes de editar).

---

### Alvo D — cross-link AMQP (`api-design/references/api-protocols.md`, M3)

A seção `## AMQP` (linha ~83) já cita DLQ + idempotência nos anti-patterns — âncora natural. **Não absorver**
o conteúdo (fica na skill dona, D2); só **cross-linkar pra profundidade**. Adicionar ao fim da seção AMQP:
```
> **Profundidade (filas/mensageria):** delivery semantics, consumidor idempotente, DLQ/poison,
> outbox e escolha de broker estão em `system-design/references/messaging-*.md`.
```

---

### Conflitos resolvidos nesta onda (D4 — tensão + regra)

| Conflito | Onde | Como (já sintetizado) |
|---|---|---|
| **C1** exactly-once | `messaging-models.md` | Kreps↔Treat citados nominalmente; delivery (impossível) × processing (alcançável); regra at-least-once + idempotência |
| **C2** idempotência basta? | `messaging-reliability.md` | single-system (idempotência basta) × cross-system (transação/outbox); tabela de escopo do efeito |
| **C5** DB-queue × broker | `messaging-operations.md` | DHH/Solid Queue × norma broker; 3 eixos de durabilidade + regra volume/atomicidade/operação |
| **C8** quem emite idempotency key | `messaging-reliability.md` | client-supplied (AWS) × server-issued (payments) citados dos dois lados |
| (C4 retry×overload) | remetido | tensão apontada em `retries-backoff-jitter`; **resolução profunda fica na Onda 3** (não aqui) |

CA-04 satisfeito: Kreps **e** Treat aparecem com a regra; equívoco do `pubsub-nao-mq` corrigido (em `exactly-once-delivery-vs-processing`).

---

### Guardrails desta seção

- **CA-06:** nada acima é executado até você aprovar. Esta é a proposta, não a edição.
- **CA-07:** as 3 references são NOVAS (filas não existia) — nenhum tópico coberto (CAP/cache/LB/etc.) vira reference nova.
- **R2 (serialização):** `SKILL.md` é tocado por 3 ondas; a Onda 1 o edita primeiro; Ondas 2/3 serializam depois.
- **CA-05:** após aplicar, `bun test` nas wire/prefaces da `system-design` (e `api-design` pelo cross-link) deve ficar verde.

---

### O que sua aprovação destrava (fase-05)

Aprovar esta seção autoriza a **aplicação Onda 1** (fase-05, em worktrees, 1 subagente/arquivo-alvo):
criar as references, inserir a seção 9 + cheat-sheet + description no SKILL.md, atualizar o advisor do
hooks.json, e o cross-link AMQP. Depois, fase-06 verifica (`bun test` + audit + passe adversarial).

**Decisões que preciso de você:**
1. **Granularidade P5:** 3 references (recomendado) ou 4 (split de operations)?
2. **`description` (M4):** lista de keywords proposta OK, ou enxugar/expandir?
3. Algum mapeamento conceito→alvo que você moveria de reference?

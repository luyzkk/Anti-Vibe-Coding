---
slug: system-design-coverage-gaps
date: 2026-06-15
status: approved
requires: []
---

# PRD: System Design Coverage Gaps (Knowledge Synthesis)

**Status:** Approved
**Author:** Luiz Felipe (Navegador/dev) + AI (Piloto)
**Date:** 2026-06-15
**Context:** ./CONTEXT.md

> **Não é feature de código.** É síntese de conhecimento sênior a partir de um corpus de 35 fontes (32 in-scope), produzida por um pipeline em fases que conversam por **arquivos em disco**. Modos de falha próprios: perda de informação, conflito mal-resolvido, descarte silencioso, alucinação. As seções abaixo adaptam o template padrão a esses modos de falha.

---

## Problema

O plugin opera um "Modo Consultor" de System Design que ensina arquitetura distribuída antes de codar. Tem **3 buracos** que deixam o desenvolvedor sem orientação justamente em decisões caras e irreversíveis:

1. **Filas / Mensageria — cobertura ~zero.** O único material é um blurb AMQP protocol-level em `api-design/references/api-protocols.md` (~30 linhas: producer/broker/consumer + exchange types). **Ausente:** semântica de entrega (at-most/at-least/exactly-once), Pub/Sub vs Queue, idempotent consumer em profundidade, backlog/poison/DLQ, ordering, tipos de fila de broker, outbox. Quando o dev pergunta "como garantir que esse email não seja enviado duas vezes", o plugin não tem o que ensinar.
2. **Internals de SQL — parcial.** A progressão de escala *nomeia* "EXPLAIN ANALYZE", "otimizar índices", "particionamento" — mas nunca os *ensina*. Sem leitura de query plan, B-tree/B+tree, índices compostos/covering, mecânica de partições, WAL/VACUUM/manutenção.
3. **DNS routing policies — parcial.** `infrastructure/references/dns-hosting.md` cobre resolução, tipos de registro e SSL; `cdn-mechanics.md` tem anycast. **Ausente:** políticas de roteamento Route 53 (simple/weighted/latency/geolocation/geoproximity/failover/multivalue), integração com health check, geo-vs-latency.

**Por que importa:** essas são decisões que, erradas, custam dinheiro (pagamento duplicado), dados (mensagem perdida), ou disponibilidade (backlog irrecuperável). O plugin promete senioridade em System Design e tem furos onde a senioridade mais conta. O corpus sênior para fechá-los já está reunido (35 fontes) e foi triado por conteúdo (Fase 0.5, concluída).

---

## Solução

### Outcomes (o QUE)

- O dev que pergunta sobre **filas / exactly-once / idempotent consumer / mensageria** recebe orientação consultor (quando usar, quando NÃO, árvore de decisão, anti-patterns), e o hook de model-invocation **dispara** a skill certa (descriptions atualizadas).
- O dev que pergunta sobre **EXPLAIN / índices / partições / manutenção SQL** recebe internals reais com exemplos.
- O dev que pergunta sobre **políticas de roteamento DNS** recebe as 7 políticas Route 53 com árvore de decisão e regras de health check.
- **Resiliência** existente fica reforçada (timeouts/backoff/jitter, load shedding, health checks, fallback, shuffle sharding) sem duplicar o que já existe.
- **Toda afirmação framework-específica tem citação** (`fonte:` autor + título + âncora).
- **Cobertura auditável e sem buraco:** toda fonte in-scope → ≥1 átomo → alvo; toda fonte OUT registrada com motivo. **Zero descarte silencioso.**
- **Testes de skill verdes** — nenhuma regressão de cobertura existente; só extensão + cross-link.

### Mecanismo (o COMO) — Pipeline de 6 fases, estado em disco

Cada fase lê e escreve **arquivos**; nenhuma fase carrega o corpus inteiro em um contexto (anti-perda por truncamento/decay). Subagentes isolados, um por unidade de trabalho.

| Fase | O que faz | Input (disco) | Output (disco) | Paralelismo |
|---|---|---|---|---|
| **0 — Normalizar** | Limpa ruído de transcrição de cada fonte → `.md` legível | fontes brutas (`Infos/transcriptions/`, URLs) | `Infos/_pipeline/normalized/{source_id}.md` | 1 subagente / lote |
| **0.5 — Triagem** ✅ | Classifica, resgata mal-descartadas, metadata + conflitos | fontes brutas | `Infos/_pipeline/triage/triage-results.json` | **CONCLUÍDA** |
| **1 — Extração** | 1 subagente por fonte, contexto isolado, EXAUSTIVA; preenche o schema do átomo. **Subagentes escrevem os átomos em disco** (sem re-transcrição no contexto pai) | `normalized/{source_id}.md` | `Infos/_pipeline/atoms/{source_id}/*.md` (1 átomo/conceito) | 1 / fonte (32) |
| **2 — Síntese** | Reagrupa por **CONCEITO** (não por fonte). 1 agente por conceito recebe TODOS os átomos daquele conceito de TODAS as fontes; resolve conflito via tensão+regra (D4); supre sub-tópicos finos com doc oficial citada (D6) | `atoms/**` | `Infos/_pipeline/synthesis/{concept-slug}.md` (entrada canônica) | 1 / conceito |
| **3 — Manifesto de edição** | Mapeia cada conceito sintetizado ao alvo (reference nova / extensão / update de `description`). Define granularidade de references. **Produz o manifesto; NÃO edita.** | `synthesis/**` | `docs/exec-plans/active/.../edit-manifest.md` | sequencial |
| **— GATE HUMANO —** | Navegador aprova o manifesto. **Sem aprovação, a Fase 4 não roda.** | manifesto | aprovação | — |
| **4 — Aplicação** | 1 dono por arquivo-alvo, git worktrees; escreve references + seções SKILL.md + descriptions + advisor one-liner | `synthesis/**` + manifesto | edições nas skills (versionável) | 1 / arquivo-alvo |
| **5 — Verificação** | `bun test` nas skills tocadas + audit de cobertura (fonte→átomo→alvo) + passe adversarial doubt-driven nas 2-3 fontes mais valiosas + revisão humana | edições | relatório de verificação | paralelo |

**Esta sessão entrega:** CONTEXT.md ✅ · Fase 0.5 ✅ · PRD ✅ · schema (`extraction-schema.md`) · manifesto de fontes (`sources-manifest.md`). **Para aqui.** Fases 0/1→5 só após aprovação do PRD e do plano.

---

## Fluxo do Pipeline por Ator

Sem UI — o "fluxo" é o pipeline. Dois atores:

### Navegador (humano)
1. Aprova este PRD + schema + manifesto (gate desta sessão).
2. Aprova o plano de execução (`/plan-feature`).
3. **Gate crítico:** revisa o `edit-manifest.md` (Fase 3) antes de qualquer edição de skill.
4. Revisão final na Fase 5 (passe adversarial + leitura de olhos frescos).

### Piloto (agente + subagentes isolados)
1. Normaliza (Fase 0) → extrai (Fase 1) → sintetiza (Fase 2) → propõe manifesto (Fase 3). **Para no gate.**
2. Após aprovação: aplica (Fase 4, worktrees) → verifica (Fase 5).
3. Em cada handoff, comunica por arquivo, não por contexto único.

---

## Requisitos Funcionais

> **Nota MoSCoW:** aqui o eixo é **prioridade/onda de entrega**, não in/out — Must, Should e Could estão TODOS in-scope deste PRD, sequenciados. "Won't" é o que fica genuinamente de fora.

### Must Have (Onda 1 — Filas + integridade do pipeline)
- [ ] **M1** — Filas/Mensageria fechado em `system-design` (nova(s) reference(s) + seção no SKILL.md): delivery semantics, Pub/Sub-vs-Queue, idempotent consumer, idempotency keys, ordering, DLQ/poison, backlog, broker landscape, RabbitMQ queue types, background jobs, outbox, retries/backoff/jitter.
- [ ] **M2** — Conflito exactly-once resolvido por **tensão + regra de decisão** (Kreps vs Treat → idempotent consumer), com o equívoco do `pubsub-nao-mq` corrigido e citado (D4, D10).
- [ ] **M3** — Cross-link do blurb AMQP de `api-design` para a nova reference de Filas (sem duplicar).
- [ ] **M4** — `description` do SKILL.md alvo atualizada com as novas keywords (queue, message queue, RabbitMQ, Kafka, idempotent consumer, exactly-once, DLQ, backpressure…) para o hook disparar; advisor one-liner em `hooks/hooks.json` sincronizado.
- [ ] **M5** — Schema do átomo (9 campos) aplicado; **todo átomo com citação `fonte:`**.
- [ ] **M6** — Pipeline opera por disco (Fases 1-5); subagentes isolados; **zero descarte silencioso** (audit fonte→átomo→alvo OU OUT-com-motivo).
- [ ] **M7** — **Gate humano** antes da Fase 4; nenhuma edição de skill sem aprovação do manifesto.
- [ ] **M8** — Testes de skill existentes verdes após Fase 4 (wire tests: `stack-aware-preface-wire`, `*-prefaces`).

### Should Have (Onda 2 — SQL-internals + DNS-routing)
- [ ] **S1** — SQL-internals em `system-design`: por que índices existem, B-tree/B+tree, tipos/custo de índice, WAL/journal, ACID+BASE, storage/IOPS, SQLite em produção, recursive CTE.
- [ ] **S2** — Sub-tópicos finos (ler EXPLAIN, mecânica de partições) **supridos com doc oficial Postgres/MySQL citada** como camada `referencia-oficial` (D6).
- [ ] **S3** — DNS-routing policies em `infrastructure` (estende `dns-hosting.md`): as 7 políticas Route 53, health-check integrado, public/private hosted zones, geo-vs-latency-vs-geoproximity.
- [ ] **S4** — Cross-links: replicação semi-sync/failover (Making MySQL) → `replication-sharding`; ACID/BASE → `cap-theorem`/`database-selection`.

### Could Have (Onda 3 — enriquecimento de resiliência)
- [ ] **C1** — Reforço em `defensive-patterns`/`system-design`/`infrastructure` a partir de timeouts/backoff/jitter (Brooker), load shedding (Yanacek), health checks (Yanacek), avoiding fallback (Gabrielson), shuffle sharding (MacCárthaigh), challenges-distributed (Gabrielson), blue-green deploy.
- [ ] **C2** — Tensões de resiliência documentadas (degraded-read fallback C3, retry-safety C4) onde tocam as skills reforçadas.

### Won't Have (desta versão)
- As 3 fontes OUT (`object-calisthenics`, `restful-grpc`, `custo-dependencias`) — registradas no manifesto, não sintetizadas.
- Geração de código de feature / tutorial passo-a-passo de setup.
- Reescrita de cobertura existente (CAP, cache, LB, replicação/sharding, CQRS) — só extensão + cross-link.
- Qualquer edição de skill **nesta sessão** (só após aprovação).
- Extração completa (Fase 1) nesta sessão.

---

## Requisitos Não-Funcionais

- **Source-driven:** toda afirmação framework-específica citada (`fonte:` obrigatório no átomo; preservado na síntese).
- **Formato consultor:** conceito → quando usar → quando NÃO usar → árvore de decisão → anti-patterns (espelha as references existentes).
- **Filtro sênior** antes de persistir qualquer entrada canônica (Fase 2).
- **Não diminuir cobertura existente.** Wire tests verdes; descriptions só ganham keywords.
- **Observabilidade:** relatório de cobertura da Fase 5 (fonte→átomo→alvo) + log de OUT-com-motivo + lista de conflitos resolvidos.
- **Acessibilidade:** N/A (sem UI) — conteúdo é documentação markdown.
- **Performance/contexto:** isolamento por subagente evita degradação de contexto em 32 fontes; intermediários em disco permitem múltiplas passagens reproduzíveis.

---

## Boundaries (feature de risco: toca arquivos do plugin)

- **Sempre:** rodar `bun test` nas skills tocadas antes de qualquer commit; citar toda afirmação framework-específica; persistir intermediários em `Infos/_pipeline/` (gitignored).
- **Perguntar antes:** editar qualquer `description` de SKILL.md (gatilho do hook); aplicar a Fase 4; suprimir/mesclar qualquer conteúdo existente.
- **Nunca:** descartar fonte silenciosamente; reescrever cobertura existente; editar skills antes da aprovação do manifesto; commitar `Infos/_pipeline/` ou qualquer fonte bruta.

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---|---|---|---|
| D1 | Fontes de resiliência-overlap | Enriquecer skills existentes | Foco estrito nos 3 gaps / fora | Corpus tem material sênior de resiliência que reforça sem duplicar |
| D2 | Onde mora cada conceito | Skill dona do tópico | Concentrar tudo em system-design | Respeita ownership; DNS é da infrastructure; evita inchar uma skill |
| D3 | Profundidade | Julgamento (SKILL.md) + código nas references | Só julgamento / tutorial pesado | dns-hosting e communication-patterns já carregam código |
| D4 | Conflito entre fontes | Tensão documentada + regra de decisão | Consenso único / hierarquia SDD | A tensão Kreps-vs-Treat É a lição; ambos são blog-sênior (SDD cairia em UNVERIFIED) |
| D5 | Pixeltable | Extrair só os nuggets | Dropar / fonte cheia | ~3-4 átomos reais (ACID/fila-transacional/DAG) sem narrativa de produto |
| D6 | Sub-tópicos SQL finos | Suplementar com doc oficial citada | Escopar pelo corpus / buscar mais fontes | Fecha gap #2 completo, ancorado em fonte canônica |
| D7 | Prioridade | 3 gaps Must (Filas Onda 1, SQL+DNS Onda 2); resiliência Should/Onda 3 | Tudo co-igual | Filas é a urgência máxima (cobertura ~zero) |
| D8 | Disco/estado | Intermediários gitignored; deliverables versionáveis | Tudo no tree / tudo efêmero | Incidente Infos/ 2026-05-24 — consulta fica local |
| D9 | ACID/BASE | IN para sql-internals + cross-link | Reference nova isolada | Tem átomos reais de internals; reforça cap/database-selection |
| D10 | Fontes com equívoco | Manter pelo valor, corrigir na síntese | Dropar | pub/sub-vs-queue é válido; só a afirmação exactly-once é corrigida |

---

## Premissas a Validar

| # | Premissa | Tier | Como validar |
|---|---|---|---|
| P1 | Atualizar `description` do SKILL.md não quebra nenhum teste (não há keyword-parity test; só wire tests) | Must Be True | `bun test` nas skills tocadas após Fase 4 (grep já confirmou ausência de keyword-parity test) |
| P2 | A regra de decisão do conflito exactly-once (idempotent consumer) é a altitude certa | Must Be True | Passe adversarial doubt-driven (Fase 5) + revisão do Navegador |
| P3 | `hooks/hooks.json` é a única superfície de advisor one-liner a sincronizar | Should | grep confirmado (1 arquivo); revalidar antes da Fase 4 |
| P4 | Doc oficial supre EXPLAIN/partitioning sem conflitar com o corpus | Should | Marcar `referencia-oficial` + revisão; flag UNVERIFIED até confirmação |
| P5 | Granularidade proposta de references (Filas 2-3, SQL 1-2, DNS 1) cabe sem inchar | Might | Decidir no manifesto (Fase 3) com base no volume real de átomos |

---

## Critérios de Aceite

- [ ] **CA-01 (cobertura):** Dado o pipeline rodado, quando a Fase 5 audita, então cada uma das 32 fontes in-scope mapeia a ≥1 átomo e cada fonte OUT tem motivo registrado — **zero descarte silencioso**.
- [ ] **CA-02 (hook dispara):** Dado o dev pergunta sobre "message queue" / "exactly-once" / "idempotent consumer" / "Route 53 routing policy" / "EXPLAIN", quando o hook avalia a description, então a skill dona dispara.
- [ ] **CA-03 (citação):** Dado qualquer afirmação framework-específica nas novas references, quando revisada, então tem `fonte:` (autor + título + âncora).
- [ ] **CA-04 (conflito):** Dado o conceito exactly-once, quando sintetizado, então as posições Kreps E Treat aparecem com a regra de decisão (idempotent consumer), citadas, e o equívoco do `pubsub-nao-mq` é explicitamente corrigido.
- [ ] **CA-05 (tests verdes):** Dado as edições da Fase 4, quando `bun test` roda nas skills tocadas, então os wire tests (`stack-aware-preface-wire`, `*-prefaces`) seguem verdes.
- [ ] **CA-06 (gate):** Dado o `edit-manifest.md` pronto (Fase 3), quando o Navegador ainda não aprovou, então **nenhuma** edição de skill ocorreu.
- [ ] **CA-07 (não-duplicação):** Dado os tópicos já cobertos (CAP, cache, LB, replicação, CQRS), quando o manifesto é montado, então nenhum vira reference nova — só cross-link/extensão.

---

## Out of Scope

- 3 fontes OUT: `object-calisthenics` (code quality), `restful-grpc` (api-design), `custo-dependencias` (supply-chain) — registradas, não sintetizadas.
- Reescrita de cobertura existente de System Design.
- Código de feature / tutoriais de setup.
- Edição de skills e extração completa **nesta sessão**.

---

## Dependências

| Tipo | Dependência | Status |
|---|---|---|
| Corpus | `Infos/transcriptions/` (22 .txt) + 13 URLs | disponível (gitignored) |
| Ferramenta | WebFetch (re-fetch URLs Fase 1 + doc oficial Postgres/MySQL para D6) | disponível |
| Ferramenta | git worktrees (Fase 4) | disponível |
| Ferramenta | `bun test` (Fase 5) | disponível |
| Artefato | `triage-results.json` (Fase 0.5) | pronto |

---

## Riscos

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Mudar `description` quebra wire/parity test | baixa | médio | `bun test` por skill após Fase 4; grep confirmou ausência de keyword-parity test |
| Advisor one-liner (`hooks.json`) dessincroniza da skill | média | baixo | M4 inclui sincronizar `hooks.json` explicitamente |
| Conflito mal-resolvido → afirmação errada persistida | média | alto | D4 (tensão+regra) + passe adversarial doubt-driven (Fase 5) + revisão humana |
| Escopo grande (32 fontes) degrada contexto | média | alto | Subagentes isolados (1/fonte) + filesystem-as-state |
| Doc oficial (D6) diverge do canônico atual | baixa | médio | Marcar `referencia-oficial` + flag UNVERIFIED + revisão |
| Fontes com equívoco (D10) persistem afirmação errada | baixa | alto | `misconception-flag` no manifesto; síntese corrige + cita |
| References incham (granularidade errada) | média | baixo | Decidir granularidade no manifesto (P5) com volume real |

---

## Próximo Passo

`/plan-feature` — quebra este PRD em planos/fases de execução (vertical slices por onda). **Antes:** aprovação do Navegador deste PRD + `extraction-schema.md` + `sources-manifest.md`.

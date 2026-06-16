# Plano 01: Fundação do Corpus (Normalizar + Extrair + Audit)

**Feature:** System Design Coverage Gaps — Síntese de Conhecimento ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~9h
**Depende de:** Nenhum (primeiro plano — é a fundação do pipeline)
**Desbloqueia:** Plano 02 (Onda 1 — Filas), Plano 03 (Onda 2 — SQL + DNS), Plano 04 (Onda 3 — Resiliência)

> **Não é plano de código.** É a fundação de uma síntese de conhecimento sênior. Não há ciclos TDD RED/GREEN, nem `bun run lint`, nem migrations — Plano 01 **não escreve uma linha de código nem toca uma única skill.** Tudo que ele produz são arquivos `.md` intermediários em `Infos/_pipeline/` (gitignored, `.gitignore:38`). "Verificação" aqui = **audit de conteúdo** (contagem de arquivos, presença de `fonte:`, conformância ao schema de 9 campos, cobertura fonte→átomo, zero descarte silencioso). A aplicação em skills é Fase 4 do pipeline, gated, e vive nos Planos 02/03/04 — **nunca aqui.**

---

## O que este plano entrega

O **atom-store**: o corpus de 32 fontes sênior in-scope, normalizado e decomposto em átomos de conhecimento (schema de 9 campos, citação `fonte:` obrigatória), gravado em disco e auditado contra descarte silencioso. É o equivalente, neste pipeline-de-conhecimento, ao "schema + migrations" de uma feature de código: **toda onda de síntese (Planos 02/03/04) lê este atom-store** — nenhuma síntese pode começar antes de o audit deste plano fechar, porque conceitos atravessam ondas (uma fonte primary-queues carrega átomos de resiliência, e vice-versa).

Ao final do Plano 01 existem, em `Infos/_pipeline/`:
- `normalized/{source_id}.md` — 1 por fonte in-scope (ruído de transcrição removido, conteúdo técnico preservado).
- `atoms/{source_id}/{conceito-slug}.md` — N por fonte (extração EXAUSTIVA, 1 átomo por conceito distinto, cada um com `fonte:`).
- `atoms/_coverage-report.md` — o mapa de cobertura: 32/32 in-scope → ≥1 átomo; 3/3 OUT com motivo; 9/9 conflitos C1–C9 ancorados.

---

## Análise de Dependências

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| `triage-results.json` (source_ids, primary_bucket, conflict_register C1–C9) | Fase 0.5 — Triagem | pronto |
| Fontes brutas (`Infos/transcriptions/` 22 .txt + 13 URLs) | Corpus reunido (gitignored) | pronto |
| `extraction-schema.md` (schema de 9 campos + vocabulário de conceitos + convenção de disco) | Esta sessão de planejamento | pronto |
| `sources-manifest.md` (32 IN / 3 OUT + conflitos) | Esta sessão de planejamento | pronto |

**Resumo:** Plano 01 é a fundação — **não tem bloqueador de outro plano**. Tudo de que precisa já está em disco.

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| `atoms/**` (átomos de conceitos de Filas, incl. cross-bucket) | Plano 02 (Onda 1 — síntese por conceito) |
| `atoms/**` (átomos SQL-internals + DNS-routing, incl. cross-bucket) | Plano 03 (Onda 2 — síntese por conceito) |
| `atoms/**` (átomos de resiliência, incl. cross-bucket) | Plano 04 (Onda 3 — enriquecimento) |
| `atoms/_coverage-report.md` (precondição dura: atom-store completo) | Planos 02/03/04 — nenhum começa a Fase 2 antes do audit fechar |

> **Precondição dura (PLAN Assumptions):** Atom-store completo é pré-requisito de TODA síntese. Síntese de Filas (Plano 02) sai incompleta se uma fonte cross-bucket (ex.: `yanacek-avoiding-queue-backlogs`, primary queues mas com átomos de resiliência; ou `making-mysql-faster`, primary SQL mas com átomos de resiliência/DNS) não tiver sido extraída exaustivamente. Por isso a fase-05 (audit) é o portão que libera as ondas.

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-tracer-extracao-1-fonte.md | TRACER — `pubsub-nao-e-message-queue` percorre Normalizar → Extrair → 1 conceito sintetizado (stub) → 1 entrada-stub de manifesto. Prova disco+isolamento+schema-9-campos+citação+`misconception-flag`. | 1.5h | — |
| 02 | fase-02-normalizar-corpus.md | 32 fontes in-scope limpas → `normalized/{source_id}.md`, em ~5 lotes por subagente (≈6–8 fontes/lote). OUT registradas com motivo, sem normalizar-para-extrair. | 2h | fase-01 |
| 03 | fase-03-extrair-filas.md | Extração EXAUSTIVA das 13 fontes primary-queues (Onda 1) → `atoms/{source_id}/*.md`, 1 subagente isolado/fonte. | 2h | fase-02 |
| 04 | fase-04-extrair-sql-dns-resiliencia.md | Extração das fontes restantes (SQL-internals, DNS-routing, resiliência, + Pixeltable rescue D5) → `atoms/{source_id}/*.md`, mesmo contrato isolado. Paralela à fase-03. | 2h | fase-02 |
| 05 | fase-05-audit-cobertura.md | Audit de cobertura → `atoms/_coverage-report.md`. 32/32 in-scope → ≥1 átomo; 3/3 OUT-com-motivo; 9/9 conflitos C1–C9 ancorados via `flags`. Primeira linha de defesa contra descarte silencioso. | 1.5h | fase-03, fase-04 |

---

## Grafo de Fases

```
fase-01 (tracer: pubsub-nao-e-message-queue ponta-a-ponta)
    |
    v
fase-02 (normalizar 32 fontes → normalized/)
    |
    +---------------------------+
    |                           |
    v                           v
fase-03 (extrair Filas)   fase-04 (extrair SQL/DNS/Resiliência)
    |                           |
    +------------- + -----------+
                   |
                   v
        fase-05 (audit de cobertura → _coverage-report.md)
```

**Paralelismo possível:** fase-03 e fase-04 dependem ambas SÓ da fase-02 e operam sobre **conjuntos disjuntos de fontes** (primary-queues vs SQL/DNS/resiliência) — podem rodar em paralelo. A normalização (fase-02) já roda em lotes paralelos por subagente. A fase-05 só começa quando ambas as extrações fecharem (precisa do atom-store inteiro para auditar cobertura).

---

## Audit Strategy

> **Substitui "TDD Strategy" do template.** Não há código para testar com RED/GREEN no Plano 01 — há conteúdo para auditar. O ciclo de cada fase de extração:

```
Ciclo por fase de conteúdo:
1. EXTRAIR EXAUSTIVO: 1 subagente isolado/fonte lê normalized/{source_id}.md e
   extrai TODO conceito distinto (não resumir) → atoms/{source_id}/{conceito-slug}.md
2. AUDITAR cobertura + citação: cada fonte → ≥1 átomo; cada átomo tem `fonte:` válido
   (autor+título+âncora); flags (misconception/rescue-nugget/unverified) aplicadas onde
   o manifesto/conflict_register indica
3. CORRIGIR lacunas: fonte sem átomo → re-extrair; átomo sem `fonte:` → não persiste
   (CA-03); conflito sem átomo-âncora → revisitar a(s) fonte(s) do conflito
```

Não existe `bun run test` / `bun run lint` nesta camada. As verificações são **comandos de contagem e busca de padrão** sobre os arquivos `.md` em disco (ex.: contar diretórios em `atoms/`, buscar a linha `fonte:` em cada átomo, listar fontes sem átomo). Cada fase abaixo traz seu checklist binário com o comando exato.

**Tracer Bullet deste plano:** fase-01 (`pubsub-nao-e-message-queue` ponta-a-ponta no mínimo viável).

---

## Gotchas Conhecidos

- **G1 — Cross-bucket exhaustive extraction.** Várias fontes têm `all_buckets` maior que `primary_bucket` (ex.: `yanacek-avoiding-queue-backlogs` primary=queues mas all=[queues,resilience]; `making-mysql-faster-planetscale-metal` primary=sql-internals mas all=[sql-internals,resilience,dns-routing]; `implementing-health-checks` primary=resilience mas all=[resilience,dns-routing,queues]). A extração é **exaustiva por fonte, não por bucket** — átomos de bucket diferente do primary recebem o campo `bucket` correto no schema, para a síntese das ondas posteriores encontrá-los por conceito. Não pular um conceito só porque está fora do bucket primary da fonte.

- **G2 — Misconception-flag (`pubsub-nao-e-message-queue`).** Esta fonte trata exactly-once como opção de entrega "selecionável" (equívoco — `conflict_register.C1`). O átomo correspondente recebe `flags: [misconception]` e **NÃO é descartado** (D10): o conteúdo pub/sub-vs-queue é válido; só a afirmação exactly-once é marcada para correção. A correção em si acontece na síntese (Plano 02), não aqui.

- **G3 — Pixeltable só nuggets (D5).** `pixeltable-multimodal-ai-db` é majoritariamente narrativa de produto (primary_bucket=off-topic). Extrair APENAS os ~3–4 átomos in-scope (ACID atômico all-or-nothing no pipeline, Postgres-como-fila-transacional, DAG incremental recompute) com `flags: [rescue-nugget]`; ignorar a narrativa de produto. Não inflar com átomos de marketing.

- **G4 — D6 (docs oficiais Postgres/MySQL) NÃO entra no Plano 01.** EXPLAIN-reading e mecânica de partições estão finos no corpus; serão supridos com doc oficial citada como camada `referencia-oficial` **durante a síntese (Plano 03 fase-02)**, não na extração. Plano 01 cobre **apenas as 32 fontes do corpus** — nenhum WebFetch de doc oficial aqui. Se um extrator encontrar EXPLAIN/partições mencionado de passagem numa fonte do corpus, extrai o átomo normalmente (camada operacional/julgamento conforme a fonte) — o suplemento oficial é outra camada, adicionada depois.

- **G5 — OUT não vira átomo, mas tem motivo.** As 3 fontes OUT (`object-calisthenics-junior-senior`, `restful-nao-suficiente-grpc`, `custo-muitas-dependencias`) **não são extraídas** (zero átomos). Mas têm o motivo registrado — já está no `triage-results.json` (`in_scope:false` + `rescue_note`/motivo) e é re-afirmado no `_coverage-report.md` da fase-05. Descartar OUT é decisão registrada, não silenciosa (CA-01).

- **G6 — `Infos/` é gitignored.** Tudo que o Plano 01 grava (`normalized/`, `atoms/`, `_coverage-report.md`) é intermediário não-versionável (D8 — incidente Infos/ 2026-05-24). Não tentar commitar nada deste plano. Os deliverables versionáveis (sínteses viram references) só aparecem nas Fases 4 das ondas.

- **G7 — Rescues por título (triagem).** 3 fontes seriam descartadas por título mas o conteúdo provou IN: `file-upload-service-senior-design` (queues forte), `deploy-sem-derrubar-blue-green` (resilience), `pixeltable-multimodal-ai-db` (parcial). Elas SÃO normalizadas e extraídas (as duas primeiras exaustivamente; Pixeltable só nuggets). Não re-decidir o escopo pelo título na hora de extrair — o `in_scope` do triage é a fonte da verdade.

---

<!-- Gerado por /plan-feature em 2026-06-15 -->

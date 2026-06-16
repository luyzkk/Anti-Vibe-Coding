# Memoria: Plano 01 — Fundação do Corpus (Normalizar + Extrair + Audit)

**Feature:** System Design Coverage Gaps (Síntese de Conhecimento)
**Iniciado:** 2026-06-15 · **Concluído:** 2026-06-16
**Status:** concluído (5/5 fases) — VEREDITO 4-PASS: LIBERA ONDAS

---

## Decisoes de Implementacao

- **DI-Plano01-fase01-13-atomos:** o tracer rendeu **13 átomos** (não os "~2" do mínimo, nem os 21 `concepts_n` do triage). `concepts_n` é **teto solto, não meta** — extrair regra reutilizável, descartar ilustração pontual.
- **DI-Plano01-fase01-normalize-ASR:** corrigir grafia óbvia de ASR para o termo técnico inequívoco é **limpeza legítima**, não interpretação (BullMQ ← "BoomQL", Redis ← "Redzoo"). Inventar conteúdo, nunca.
- **DI-Plano01-fase01-misconception-dupla-marca:** equívoco marcado em `flags: [misconception]` **E** no `anti_pattern` — visível à síntese por qualquer um dos dois.
- **DI-Plano01-fase01-stub-no-orquestrador:** stubs de synthesis gerados no orquestrador (lendo o disco), não em 3º subagente. Só normalize+extract precisam ser isolados.
- **DI-Plano01-fase02-curl-vs-webfetch:** ingestão de URL = `curl` HTML cru + conversor HTML→markdown (NÃO WebFetch — condensa). AWS BL serve corpo como JSON embutido (`fields.bodyContent`); bravenewgeek = WP `entry-content`; Medium = `<article>`.
- **DI-Plano01-fase03/04-sonnet-camada:** os subagentes **Sonnet** (Ondas 3-5) escreveram `camada: vídeo` copiando texto de instrução ambíguo ("CAMADA: vídeo → julgamento/operacional"); **Opus** (Ondas 1-2) não cometeu o erro. Lição: dar a `camada` como **enum literal explícito** no prompt ("valor é EXATAMENTE UM de: julgamento|operacional|referencia-oficial; NUNCA o tipo da fonte"). 76 átomos reclassificados no conformance pass.
- **DI-Plano01-fase05-conformance-pass:** o audit precisou de um **conformance pass** além dos 4 checks core. Subagentes de extração aplicam metadados liberalmente: inventaram flags de conflito (`[C2]`, `[conflito-C1]`); usaram `[misconception]` em átomos que *corrigem* um equívoco (deveria ser só na fonte que o *sustenta*); usaram `[unverified]` (reservado p/ D6/Plano 03); e o bug `camada: vídeo`. Lição para os planos de síntese: **o audit valida flags contra o vocabulário do schema e camada contra o enum**, não confia no subagente.

---

## Bugs Descobertos

- **BUG-Plano01-fase02-webfetch-condensa:** *Sintoma:* 8 URLs normalizadas com word-count baixo vs `concepts_n` (aws-challenges 399w/cn38; load-shedding 1130w/cn50). *Causa:* o extrator interno do WebFetch retorna RESUMO, não verbatim (e às vezes recusa por copyright). *Fix:* re-normalizar via `curl` + conversor próprio (recuperou 2–12×: challenges 399→4801; health-checks 2926→5762). *Detecção reutilizável:* comparar word-count vs `concepts_n` do triage.

---

## Gotchas

- **GT-Plano01-fase01-state-flag-stale:** ao editar um deliverable, atualizar o tracking (STATE.md) na **mesma passada** — senão o flag vira falso-positivo de item aberto.
- **GT-Plano01-fase02-curl-para-corpus:** ingestão full-fidelity NÃO depende do WebFetch (condensa). Usar `curl` + extração DOM/JSON. Cheirar fidelidade comparando word-count vs `concepts_n` antes de aceitar.
- **GT-Plano01-fase03-sonnet-literal:** Sonnet interpreta instruções de prompt mais literalmente que Opus — wording ambíguo ("CAMADA: vídeo →") virou valor literal no campo. Para fan-outs em Sonnet, dar campos enumerados como lista de valores literais explícita, não como prosa condicional.

---

## Desvios do Plano

- **Nenhum desvio de escopo.** A re-normalização via curl (fase-02) e o conformance pass (fase-05) não são desvios — são o cumprimento dos critérios do próprio plano ("não amputar conteúdo técnico"; "schema/citação conformes"). Mudou o MEIO, não o fim.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 0 |
| Fontes in-scope normalizadas | 32 / 32 |
| Fontes in-scope extraidas (>=1 atomo) | 32 / 32 |
| Atomos totais gravados | 573 |
| Conflitos C1-C9 ancorados | 9 / 9 |
| Camadas | 224 julgamento / 220 operacional / 129 referencia-oficial |
| Flags | 560 `[]` / 12 `[rescue-nugget]` / 1 `[misconception]` |

---

## Notas para Planos Seguintes

Informacoes que os Planos 02/03/04 (ondas de sintese) PRECISAM saber antes de comecar. O subagente de cada onda le este campo.

- **Atom-store:** `Infos/_pipeline/atoms/{source_id}/{conceito-slug}.md` (gitignored, D8). **573 átomos / 32 fontes.**
- **Relatório de cobertura:** `Infos/_pipeline/atoms/_coverage-report.md` — **VEREDITO 4-PASS: LIBERA ONDAS** (precondição dura satisfeita; a Fase 2 pode iniciar).
- **A síntese busca por CONCEITO/BUCKET, não por source_id.** Átomos carregam `bucket:` do **conceito**, não da fonte de origem. Cross-bucket relevante:
  - `yanacek-avoiding-queue-backlogs` (primary queues) → 23 átomos `bucket: resilience`.
  - `making-mysql-faster-planetscale-metal` (primary sql) → átomos `resilience` (surge-replacement) + `dns-routing`.
  - `dhh-sqlite-stoicism` (primary sql) → átomos `bucket: queues` (Solid Queue DB-backed).
  - `file-upload-service-senior-design` (primary queues) → átomos `bucket: dns-routing` (CDN) + `resilience` (presigned URLs / SPOF).
  - shuffle-sharding (×2) e `implementing-health-checks` (primary resilience) → átomos `bucket: dns-routing` (Route 53).
- **Flags:**
  - `misconception` — **só** `pubsub-nao-e-message-queue/delivery-semantics` (exactly-once como entrega selecionável). **Onda 1 (Plano 02) corrige citando Treat E Kreps** (C1/CA-04).
  - `rescue-nugget` (12) — pixeltable ×4 (D5, só nuggets), payments ×2 (resiliência), + 6 nuggets pontuais.
  - `unverified` — **zero** no Plano 01 (os de doc oficial D6 nascem na síntese do Plano 03).
- **Conflitos C1-C9:** todos ancorados (átomos-âncora exatos na seção 3 do `_coverage-report.md`). **Resolver via D4 (tensão + regra) na Fase 2**, não antes.
- **Stub do tracer a sobrescrever:** `synthesis/pub-sub-vs-message-queue.md` e `synthesis/_manifest-stub.md` são demonstrativos do tracer — a síntese real do Plano 02 sobrescreve.
- **SOFT (a síntese reavalia):** ~40 átomos `camada: referencia-oficial` em fontes de vídeo/blog (rabbitmq 16, payments 7, idempotency-ordering 6, route53 vídeos ~9). A camada é dica de roteamento; ao montar references, reavaliar (a linha `fonte:` deixa claro que é vídeo, não doc oficial). Nenhum `referencia-oficial` vem de doc oficial Postgres/MySQL (D6 só no Plano 03).
- **Modelo dos subagentes:** Ondas 3-5 rodaram em Sonnet a pedido do Navegador. Sonnet é mais literal — ver GT-Plano01-fase03-sonnet-literal antes de fan-outs grandes.

---

<!-- Atualizado durante execucao · Gerado por /plan-feature em 2026-06-15 · Concluído 2026-06-16 -->

# Fase 02: Normalizar o Corpus (Fase 0 do Pipeline)

**Plano:** 01 — Fundação do Corpus
**Sizing:** 2h
**Depende de:** fase-01 (tracer prova o mecanismo de normalização em escala 1 antes de escalar para 32)
**Visual:** false

---

## O que esta fase entrega

As 32 fontes in-scope limpas de ruído de transcrição → `Infos/_pipeline/normalized/{source_id}.md`, processadas em LOTES por subagentes (≈6–8 fontes/subagente, ≈5 lotes) para que o corpus inteiro nunca seja carregado num único contexto.

---

## Arquivos Afetados

> Todos em `Infos/_pipeline/normalized/` (gitignored). 32 arquivos CREATE, um por fonte in-scope. Os `source_id` vêm do campo `id` de cada entrada em `triage-results.json`.

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `Infos/_pipeline/normalized/{source_id}.md` × 32 | Create | 1 markdown legível por fonte in-scope (ruído removido, técnico preservado). Lista completa dos 32 source_ids abaixo. |

**As 32 fontes in-scope a normalizar** (agrupadas por primary_bucket; o tracer `pubsub-nao-e-message-queue` já foi normalizado na fase-01 — re-normalizar não é necessário, mas confirmar que o arquivo existe):

**queues (13):** `pubsub-nao-e-message-queue` (✅ fase-01), `rabbitmq-classic-quorum-stream`, `background-jobs-node-redis-bull`, `idempotent-consumer-pattern`, `payments-idempotency-keys`, `idempotency-and-ordering-events`, `treat-dissecting-message-queues`, `kreps-exactly-once-one-more-time`, `treat-exactly-once-delivery-redux`, `treat-you-cannot-have-exactly-once-delivery`, `yanacek-avoiding-queue-backlogs`, `aws-idempotent-apis-retries`, `file-upload-service-senior-design`

**sql-internals (6) + Pixeltable rescue (1):** `acid-base-explicado`, `btree-vs-bplustree-db`, `sqlite-wal-mode-fast`, `dhh-sqlite-stoicism`, `making-mysql-faster-planetscale-metal`, `sql-recursive-cte-missing-order`, `pixeltable-multimodal-ai-db` (rescue — normalizar inteiro; só a EXTRAÇÃO é restrita a nuggets na fase-04)

**dns-routing (4):** `route53-choosing-policy-pytholic`, `route53-policies-tutorial-india`, `route53-latency-vs-geoproximity-vs-geolocation-ellerbeck`, `route53-handson-mcleod-academy`

**resilience (8):** `deploy-sem-derrubar-blue-green`, `aws-timeouts-retries-backoff-jitter`, `aws-load-shedding-overload`, `aws-challenges-distributed-systems`, `aws-shuffle-sharding-workload-isolation`, `shuffle-sharding-fault-isolation`, `implementing-health-checks`, `avoiding-fallback-distributed-systems`

Total: 13 + 7 + 4 + 8 = **32 in-scope**.

> **Nota sobre fontes URL:** 13 das 32 são URLs (Treat ×3, Kreps, as AWS Builders' Library, shuffle-sharding blog) — não estão em `Infos/transcriptions/`. O subagente de lote re-busca via WebFetch (Dependência do PRD: "WebFetch disponível") e normaliza o conteúdo HTML do mesmo jeito (remover navegação/boilerplate do site, preservar o artigo). O `ref` no triage indica se é `.txt` (transcrição) ou URL.

---

## Implementação

### Passo 1: Dividir as 32 fontes em ~5 lotes

Agrupar em lotes de ≈6–8 fontes. Sugestão de divisão (mantém fontes de um mesmo bucket próximas para o subagente ganhar contexto temático, mas não é obrigatório):

- **Lote A (queues, 7):** rabbitmq-classic-quorum-stream, background-jobs-node-redis-bull, idempotent-consumer-pattern, payments-idempotency-keys, idempotency-and-ordering-events, treat-dissecting-message-queues, file-upload-service-senior-design
- **Lote B (queues — exactly-once + AWS, 5):** kreps-exactly-once-one-more-time, treat-exactly-once-delivery-redux, treat-you-cannot-have-exactly-once-delivery, yanacek-avoiding-queue-backlogs, aws-idempotent-apis-retries
- **Lote C (sql + pixeltable, 7):** acid-base-explicado, btree-vs-bplustree-db, sqlite-wal-mode-fast, dhh-sqlite-stoicism, making-mysql-faster-planetscale-metal, sql-recursive-cte-missing-order, pixeltable-multimodal-ai-db
- **Lote D (dns, 4):** route53-choosing-policy-pytholic, route53-policies-tutorial-india, route53-latency-vs-geoproximity-vs-geolocation-ellerbeck, route53-handson-mcleod-academy
- **Lote E (resilience, 8):** deploy-sem-derrubar-blue-green, aws-timeouts-retries-backoff-jitter, aws-load-shedding-overload, aws-challenges-distributed-systems, aws-shuffle-sharding-workload-isolation, shuffle-sharding-fault-isolation, implementing-health-checks, avoiding-fallback-distributed-systems

(`pubsub-nao-e-message-queue` já normalizado na fase-01 → fora dos lotes.)

### Passo 2: Contrato do subagente-de-lote

Cada lote roda em **1 subagente isolado**. Contrato:

- **Recebe:** a lista de N source_ids do lote + para cada um, o caminho do `.txt` bruto (`Infos/transcriptions/<ref>`) OU a URL (`ref` no triage). Recebe só o lote dele — contexto isolado, sem o resto do corpus.
- **Faz, por fonte:**
  1. Lê o bruto (transcrição `.txt` OU re-fetch da URL via WebFetch).
  2. Remove ruído mantendo conteúdo técnico:
     - **Transcrições de vídeo (pt/en):** hesitações ("é…", "tipo", "né", "então…"), repetições de fala, auto-correções faladas, marcadores de legenda/timestamp, saudações/CTA de canal ("se inscreve", "deixa o like"). **Preservar:** toda afirmação técnica, exemplos, números, nomes de ferramentas/conceitos.
     - **Artigos/AWS Builders' Library:** navegação do site, rodapés, links de "leia também", banners. **Preservar:** o corpo do artigo, headings, blocos de código, tabelas.
  3. Grava `Infos/_pipeline/normalized/{source_id}.md` — markdown legível, headings por mudança de tema, conteúdo técnico 1:1.
- **NÃO faz:** resumir, interpretar, extrair átomos (isso é fase-03/04), nem decidir escopo (o `in_scope` já foi decidido na triagem).

### Passo 3: Tratamento das 3 fontes OUT

As 3 fontes OUT (`object-calisthenics-junior-senior`, `restful-nao-suficiente-grpc`, `custo-muitas-dependencias`) **NÃO são normalizadas**.

**Decisão de adaptação (registrada):** OUT não recebe `normalized/{source_id}.md` nem átomo. O motivo de exclusão de cada uma **já está persistido** no `triage-results.json` (`in_scope:false` + `rescue_note`/summary com o motivo). A fase-05 (audit) re-afirma os 3 motivos no `_coverage-report.md`. Assim "OUT tem motivo registrado, não átomo" (CA-01) sem gastar trabalho de normalização em conteúdo que não será sintetizado. **Não** normalizar-para-depois-não-extrair: seria trabalho morto.

> Racional: o PRD pede que OUT tenha **motivo registrado** (zero descarte silencioso), não que OUT seja processada. O registro já existe na triagem; a fase-05 consolida. Normalizar OUT violaria "não super-engenheirar".

---

## Gotchas

- **G1 do plano (cross-bucket):** a normalização não filtra por bucket — preserva TODO o conteúdo técnico, inclusive o que está fora do primary_bucket da fonte. Ex.: `making-mysql-faster-planetscale-metal` (primary sql) tem trechos de resiliência (surge-replacement) e DNS — o normalizado preserva tudo; a separação por bucket acontece na extração (fase-04), não aqui.
- **G6 do plano (`Infos/` gitignored):** os 32 arquivos não são versionáveis. Não commitar.
- **G7 do plano (rescues por título):** as 3 rescued (`file-upload-service-senior-design`, `deploy-sem-derrubar-blue-green`, `pixeltable-multimodal-ai-db`) SÃO normalizadas (são in_scope). Pixeltable é normalizada inteira; a restrição a nuggets é só na extração.
- **Local — URLs podem ter mudado:** se um WebFetch de URL falhar ou retornar conteúdo divergente do que a triagem viu, registrar (não inventar o conteúdo). O artigo pode ter sido editado; nesse caso normalizar o que a URL retorna hoje e anotar a discrepância no topo do `normalized/{source_id}.md`.
- **Local — caracteres especiais nos nomes de arquivo bruto:** vários `ref` no triage têm caracteres unicode de fullwidth (`：`, `？`, `⧸`, `｜`) porque vêm de títulos de vídeo. O **source_id** (campo `id`) é limpo (kebab-case ASCII) — usar SEMPRE o `id` para o nome do `normalized/`, nunca o `ref`.

---

## Verificação

> **Audit de contagem, não TDD.** A checagem central é: toda fonte in-scope tem seu normalizado; nenhuma in-scope faltando; nenhuma OUT presente.

### Checklist

- [ ] **Contagem exata:** `Infos/_pipeline/normalized/` contém exatamente **32** arquivos `.md` (31 desta fase + o tracer da fase-01).
  - Comando: contar `*.md` em `Infos/_pipeline/normalized/` → 32
- [ ] **Toda fonte in-scope presente:** para cada um dos 32 source_ids in-scope, existe `normalized/{source_id}.md`. Nenhum faltando.
  - Comando: cruzar a lista dos 32 ids in-scope (do triage, `in_scope:true`) contra os arquivos presentes → diferença vazia.
- [ ] **Nenhuma OUT presente:** `object-calisthenics-junior-senior`, `restful-nao-suficiente-grpc`, `custo-muitas-dependencias` NÃO têm arquivo em `normalized/`.
  - Comando: `Test-Path` em cada um dos 3 → `False`, `False`, `False`
- [ ] **Conteúdo técnico preservado (amostra):** abrir 3 normalizados de buckets diferentes (ex.: 1 queues, 1 sql, 1 resilience) e confirmar que afirmações técnicas, números e nomes de ferramentas sobreviveram (não viraram resumo).
- [ ] **Nomes usam source_id, não ref:** nenhum arquivo em `normalized/` tem caractere unicode fullwidth no nome (`：？⧸｜`) — todos são kebab-case ASCII.
  - Comando (Grep/Glob): listar nomes; nenhum casa `[：？⧸｜]`

---

## Critério de Aceite

**Por máquina:**
- `(Get-ChildItem "F:/Projetos/Anti-Vibe-Coding/Infos/_pipeline/normalized/*.md").Count` == 32.
- Os 3 source_ids OUT não existem em `normalized/`.
- A interseção {source_ids in_scope do triage} ∩ {arquivos em normalized/} tem cardinalidade 32 (cobertura total, sem faltante).

**Por humano:**
- Amostragem de 3 normalizados confirma que a limpeza removeu ruído sem amputar conteúdo técnico (a fonte continua extraível exaustivamente na fase seguinte).

---

<!-- Gerado por /plan-feature em 2026-06-15 -->

# Fase 05: Audit de Cobertura (M6 / CA-01)

**Plano:** 01 — Fundação do Corpus
**Sizing:** 1.5h
**Depende de:** fase-03, fase-04 (precisa do atom-store inteiro para auditar cobertura)
**Visual:** false

---

## O que esta fase entrega

O audit de cobertura — a PRIMEIRA linha de defesa contra descarte silencioso. Constrói o mapa: toda fonte in-scope → ≥1 átomo; as 3 fontes OUT registradas COM MOTIVO; os 9 conflitos C1–C9 representados/rastreáveis via `flags` e átomos-âncora. Produz um relatório de cobertura em disco.

---

## Esta fase NÃO é o gate humano

> O gate humano (aprovação do `edit-manifest.md` antes de qualquer edição de skill) vive nas ondas, antes da Fase 4 de cada onda (Planos 02/03/04). Esta fase-05 é um **portão de qualidade interno do pipeline** — verifica que o atom-store está completo e rastreável antes de liberar as ondas a sintetizar. É machine-verifiable onde possível.

---

## Decisão de adaptação: onde gravar o relatório

**O relatório de cobertura é gravado em `Infos/_pipeline/atoms/_coverage-report.md`** (gitignored, junto do atom-store que ele audita). O prefixo `_` mantém-no ordenado antes dos diretórios de source_id e sinaliza que é metadado do store, não um átomo. É um único arquivo markdown — fácil de reabrir e re-rodar o audit a cada nova extração.

> Alternativa considerada e rejeitada: gravar em `docs/exec-plans/active/.../` (versionável). Rejeitada porque o relatório referencia caminhos de `atoms/**` que são gitignored (D8) — o relatório acompanha o store que descreve, não o deliverable. Se o Navegador quiser um sumário versionável, ele entra no relatório de verificação das ondas (Fase 5 de cada onda), não aqui.

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `Infos/_pipeline/atoms/_coverage-report.md` | Create | O relatório de cobertura: matriz fonte→átomo (32/32 in-scope), 3 OUT-com-motivo, 9 conflitos C1–C9 com átomos-âncora, lista de flags aplicadas. |

---

## Implementação

### Passo 1: Matriz fonte → átomo (32 in-scope)

Varrer `Infos/_pipeline/atoms/` e, para cada um dos 32 source_ids in-scope, contar os átomos e listar os conceitos. Construir a tabela:

```
| source_id | primary_bucket | # átomos | conceitos extraídos | flags presentes |
|---|---|---|---|---|
| pubsub-nao-e-message-queue | queues | N | pub-sub-vs-message-queue, delivery-semantics, … | misconception |
| … (todas as 32) | | | | |
```

**Regra de aprovação:** toda linha tem `# átomos ≥ 1`. Qualquer fonte in-scope com 0 átomos é uma falha de cobertura → volta para fase-03/04 re-extrair. **Zero descarte silencioso** (CA-01) — nenhuma fonte in-scope pode sumir do mapa.

### Passo 2: Registro das 3 OUT com motivo

Re-afirmar as 3 fontes OUT com o motivo (puxado do `triage-results.json`, campo `rescue_note`/`summary`):

```
| source_id | motivo de exclusão (do triage) |
|---|---|
| object-calisthenics-junior-senior | Code quality/OOP — já coberto por design-patterns/architecture (OUT limpo) |
| restful-nao-suficiente-grpc | gRPC/RPC — domínio api-design (já coberto); fora dos 3 gaps + resilience |
| custo-muitas-dependencias | Supply-chain/custo de deps — tangencia security/observabilidade; fora dos gaps |
```

**Regra de aprovação:** 3/3 OUT presentes com motivo não-vazio. OUT NÃO tem átomo (`atoms/{out-id}/` não existe) — e isso é correto, é decisão registrada.

### Passo 3: Conflitos C1–C9 → átomos-âncora rastreáveis

Para cada conflito do `conflict_register`, listar os átomos-âncora (as posições) que devem existir no store. O audit confirma que cada posição produziu átomo — é o que garante que a Fase 2 das ondas terá os dois lados da tensão para resolver via D4.

```
| # | conflito | átomos-âncora esperados | presentes? |
|---|---|---|---|
| C1 | exactly-once | kreps(…), treat-redux(…), treat-fundacional(…), pubsub(misconception) | ✓/✗ |
| C2 | idempotência basta? | idempotent-consumer-pattern(…), kreps(…) | |
| C3 | degraded-read fallback | implementing-health-checks(cache-stale), avoiding-fallback(cascata-2001) | |
| C4 | retry safety | aws-timeouts-retries-backoff-jitter, avoiding-fallback, shuffle-sharding-fault-isolation | |
| C5 | DB-queue × broker | dhh-sqlite-stoicism(solid-queue), + norma broker (rabbitmq/background-jobs) | |
| C6 | storage desagregado | making-mysql-faster(contra-aurora) | |
| C7 | ACID p/ dinheiro | acid-base-explicado(nosql-pragmático) | |
| C8 | quem emite idempotency key | payments-idempotency-keys(server-issued), aws-idempotent-apis-retries(client-supplied) | |
| C9 | B+ tree absolutismo | btree-vs-bplustree-db(nuance) | |
```

**Regra de aprovação:** 9/9 conflitos têm seus átomos-âncora presentes. Se um vértice de conflito não tem átomo, a tensão não pode ser sintetizada → re-extrair a fonte faltante.

### Passo 4: Inventário de flags

Listar todos os átomos com `flags` não-vazio, para a síntese saber onde agir:
- `misconception`: `pubsub-nao-e-message-queue/delivery-semantics` (corrigir na Onda 1).
- `rescue-nugget`: átomos de `pixeltable-multimodal-ai-db` (3-4), átomos de resiliência resgatados de `payments-idempotency-keys`.
- `unverified`: **nenhum esperado no Plano 01** (os átomos `unverified` de doc oficial D6 nascem na síntese do Plano 03, não na extração do corpus). Se aparecer algum `unverified` aqui, investigar — pode ser átomo de fonte do corpus marcado por engano.

### Passo 5: Veredito do relatório

No topo do `_coverage-report.md`, um veredito binário:

```
COBERTURA: 32/32 in-scope com ≥1 átomo — [PASS/FAIL]
OUT: 3/3 com motivo — [PASS/FAIL]
CONFLITOS: 9/9 ancorados — [PASS/FAIL]
CITAÇÃO: 0 átomos sem `fonte:` — [PASS/FAIL]
VEREDITO: [LIBERA ONDAS / BLOQUEIA — re-extrair X]
```

Só com os 4 PASS o atom-store libera as ondas (Planos 02/03/04) a começar a Fase 2 (síntese). Este veredito é a precondição dura registrada no PLAN ("Atom-store completo é pré-requisito de toda síntese").

---

## Gotchas

- **G5 do plano (OUT não vira átomo mas tem motivo):** o audit é onde isso fecha. Confirmar que `atoms/{out-id}/` NÃO existe para os 3 OUT (ter átomo de OUT seria erro), E que os 3 motivos estão no relatório (não tê-los seria descarte silencioso).
- **G1 do plano (cross-bucket):** ao contar átomos por fonte, contar TODOS (inclusive os de `bucket` diferente do primary). Uma fonte primary-queues com átomos `bucket: resilience` conta esses átomos na sua linha — eles existem no store e serão achados por conceito.
- **G4 do plano (D6 não no Plano 01):** nenhum átomo `referencia-oficial` de doc oficial Postgres/MySQL deve existir ainda. Se o audit encontrar um, é prematuro (deveria nascer no Plano 03). Sinalizar.
- **G6 do plano (`Infos/` gitignored):** o relatório também é gitignored — é metadado do store local.
- **Local — re-rodável:** o audit deve ser um passe re-executável. Se a fase-03/04 re-extrair algo, re-rodar o audit e regravar o relatório. Não é um snapshot único; é o portão.

---

## Verificação

> **Machine-verifiable onde possível.** O relatório É a verificação materializada; o checklist confirma que ele bate com o estado real do disco.

### Checklist

- [ ] **Relatório existe:** `Infos/_pipeline/atoms/_coverage-report.md` foi criado.
  - Comando: `Test-Path "F:/Projetos/Anti-Vibe-Coding/Infos/_pipeline/atoms/_coverage-report.md"` → `True`
- [ ] **32/32 in-scope com ≥1 átomo:** o relatório lista as 32 fontes in-scope, cada uma com `# átomos ≥ 1`. Cruzar contra o disco: contar diretórios em `atoms/` (excluindo `_coverage-report.md`) → 32, cada um não-vazio.
  - Comando: contar subdiretórios de `atoms/` → 32; nenhum vazio.
- [ ] **3/3 OUT com motivo, sem átomo:** os 3 OUT estão no relatório com motivo não-vazio E `atoms/{out-id}/` não existe.
  - Comando: `Test-Path "atoms/object-calisthenics-junior-senior"` (e os outros 2) → `False`; os 3 motivos presentes no relatório.
- [ ] **9/9 conflitos ancorados:** cada um de C1–C9 tem seus átomos-âncora marcados presentes no relatório, e esses átomos existem no disco.
- [ ] **0 átomos sem `fonte:`:** varredura global de `atoms/**/*.md` — nenhum sem a linha `fonte:` (CA-03 global).
  - Comando (Grep): `.md` em `atoms/` SEM `^fonte:` → 0.
- [ ] **Nenhum `unverified` prematuro:** nenhum átomo do corpus marcado `unverified` (esses nascem no Plano 03). 
  - Comando (Grep): `unverified` em `atoms/` → 0 (esperado no Plano 01).
- [ ] **Veredito final é LIBERA:** o topo do relatório mostra os 4 PASS e VEREDITO = LIBERA ONDAS.

---

## Critério de Aceite

**Por máquina:**
- `(Get-ChildItem "F:/Projetos/Anti-Vibe-Coding/Infos/_pipeline/atoms" -Directory).Count` == 32 (um diretório por fonte in-scope), nenhum vazio.
- Os 3 diretórios de OUT não existem.
- `grep -rL '^fonte:'` sobre `atoms/**/*.md` → vazio.
- `_coverage-report.md` existe e contém os 4 vereditos PASS + VEREDITO LIBERA.

**Por humano:**
- O Navegador lê o `_coverage-report.md` e confirma, de relance, que (a) nenhuma fonte in-scope ficou de fora, (b) cada OUT tem um motivo que ele aceita, e (c) os dois lados de cada conflito (especialmente C1 exactly-once) têm átomo. Aprovação aqui = sinal verde para as ondas começarem a síntese. Se qualquer um dos três não fechar, o Plano 01 não está pronto e nenhuma onda deve abrir.

---

<!-- Gerado por /plan-feature em 2026-06-15 -->

# Fase 01: Tracer — Uma Fonte Ponta-a-Ponta (`pubsub-nao-e-message-queue`)

**Plano:** 01 — Fundação do Corpus
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Uma única fonte representativa percorre o pipeline inteiro no mínimo viável — Normalizar → Extrair (átomos no schema de 9 campos) → sintetizar **1** conceito → **1** entrada-stub de manifesto — provando o mecanismo NOVO e mais arriscado (handoff por disco, isolamento de subagente, schema, citação obrigatória, `misconception-flag`) **antes** de comprometer 32 fontes a ele.

---

## Por que esta fonte é o tracer

`pubsub-nao-e-message-queue` ("Pub/Sub não é Message Queue", Augusto Galego) é a escolha certa para o tracer porque exercita, em uma só fonte, **todos os mecanismos arriscados de uma vez**:
- **Alta densidade** (`density: high`, 21 conceitos no triage) → prova que a extração exaustiva de uma fonte rica cabe num subagente isolado sem degradar.
- **Carrega o `misconception-flag` central** (`conflict_register.C1`): a fonte trata exactly-once como opção de entrega "selecionável" — equívoco. Exercita o caminho `flags: [misconception]` (D10) que NENHUM tracer de código testaria.
- **É a âncora de M2/C1** (o conflito exactly-once Kreps↔Treat). Provar o flag aqui valida a mecânica que a síntese da Onda 1 (Plano 02) vai usar para corrigir.
- **Já tem demo operacional** (BullMQ sobre Redis) → exercita átomos de camada `operacional` além de `julgamento`.

---

## Arquivos Afetados

> Todos em `Infos/_pipeline/` (gitignored, `.gitignore:38`). Nenhuma skill é tocada. Os caminhos de átomo usam a convenção exata do `extraction-schema.md`: `atoms/{source_id}/{conceito-slug}.md`.

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `Infos/_pipeline/normalized/pubsub-nao-e-message-queue.md` | Create | Fonte limpa de ruído de transcrição, conteúdo técnico preservado (legível). |
| `Infos/_pipeline/atoms/pubsub-nao-e-message-queue/pub-sub-vs-message-queue.md` | Create | Átomo — conceito Pub/Sub vs Message Queue (fan-out de fatos vs jobs a workers). Camada julgamento. |
| `Infos/_pipeline/atoms/pubsub-nao-e-message-queue/delivery-semantics.md` | Create | Átomo — at-most/at-least/exactly-once. **`flags: [misconception]`** (trata EO como selecionável). |
| `Infos/_pipeline/atoms/pubsub-nao-e-message-queue/{conceito-slug}.md` | Create | Demais átomos distintos que a fonte ensina (ex.: BullMQ-sobre-Redis operacional). Extração exaustiva, não limitada a 2. |
| `Infos/_pipeline/synthesis/pub-sub-vs-message-queue.md` | Create | **Stub demonstrativo** — 1 conceito sintetizado a partir do(s) átomo(s) desta única fonte. Prova a estrutura consultor (conceito → quando usar → quando NÃO → árvore → anti-pattern). Será sobrescrito na síntese real (Plano 02) quando todas as fontes do conceito chegarem. |
| `Infos/_pipeline/synthesis/_manifest-stub.md` | Create | **1 entrada-stub de manifesto** — mapeia o conceito sintetizado ao alvo provável (`system-design`, reference nova de Filas). Demonstra o formato conceito→alvo. NÃO é o `edit-manifest.md` real (esse vem nas ondas, sob gate). |

---

## Implementação

### Passo 1: Normalizar a fonte (Fase 0 do pipeline, em escala 1)

Lançar **1 subagente isolado** que recebe a fonte bruta de `Infos/transcriptions/` (`Pub⧸Sub não é Message Queue.txt`, conforme `ref` no triage) e grava a versão limpa.

Contrato do subagente:
- **Recebe:** o `.txt` bruto da transcrição (e só ele — contexto isolado).
- **Faz:** remove ruído de transcrição (hesitações, repetições de fala, marcadores de auto-correção, "né", "tá", quebras de legenda) **preservando 100% do conteúdo técnico**. Não resumir, não interpretar — limpar.
- **Grava:** `Infos/_pipeline/normalized/pubsub-nao-e-message-queue.md`, markdown legível com headings por tema quando a fala muda de assunto.

> O `source_id` `pubsub-nao-e-message-queue` vem do `triage-results.json` (campo `id`). Usar exatamente esse id no nome do arquivo — a Fase 2 (síntese) reagrupa por conceito, mas a rastreabilidade fonte→átomo depende do id consistente.

### Passo 2: Extrair os átomos (Fase 1 do pipeline, em escala 1)

Lançar **1 subagente isolado** que recebe SÓ `normalized/pubsub-nao-e-message-queue.md` e extrai TODO conceito distinto. Para cada conceito, preencher o schema de 9 campos do `extraction-schema.md`:

```yaml
conceito:        # nome canônico do vocabulário (ex.: "Pub/Sub vs Message Queue")
afirmacao:       # a regra/insight em 1-3 frases, específica
camada:          # julgamento | operacional | referencia-oficial
quando_usar:
quando_NAO_usar: # obrigatório — se a fonte não diz, inferir do trade-off ou [A DEFINIR]
trade_off:
anti_pattern:
regra_de_decisao:# "SE <condição> ENTÃO <escolha>"
fonte:           # autor | título | âncora  ← CITAÇÃO OBRIGATÓRIA
source_id:       # pubsub-nao-e-message-queue
bucket:          # queues
flags:           # [] na maioria; [misconception] no átomo de delivery-semantics
```

Regras críticas a exercitar neste tracer (todas do `extraction-schema.md`):
- **`fonte:` obrigatório.** Formato: `Augusto Galego | Pub/Sub não é Message Queue | seção: <tema>` ou `trecho: "<5-8 palavras>"` (a fonte é `video-transcription` sem timestamps, `anchor: none` no triage → usar `seção:` ou `trecho:`). **Sem `fonte:` válido, o átomo não persiste** (CA-03).
- **`flags: [misconception]`** no átomo de delivery-semantics — a fonte apresenta exactly-once como selecionável; a síntese corrige citando Treat/Kreps. **Não descartar o átomo** (D10).
- **`quando_NAO_usar` obrigatório** em todos — metade do valor consultor.
- **Não inventar** — campo não coberto pela fonte vira `[A DEFINIR]`, nunca suposição.
- **Exaustivo** — extrair TODOS os conceitos distintos (a fonte tem ~21 no triage; nem todos viram átomo separado, mas não agrupar dois insights num só).

### Passo 3: Sintetizar 1 conceito (stub demonstrativo)

A partir do(s) átomo(s) desta única fonte, gravar `synthesis/pub-sub-vs-message-queue.md` no formato consultor (espelha as references existentes): conceito → quando usar → quando NÃO usar → árvore de decisão → anti-patterns, com `fonte:` preservado.

> **Este stub é demonstrativo, não canônico.** Na síntese real (Plano 02), o agente de conceito recebe os átomos de `pub-sub-vs-message-queue` de TODAS as fontes — aqui só temos uma. O propósito é provar que a estrutura consultor sai de átomos, que a citação sobrevive ao handoff, e que o `misconception` é visível para correção. Marcar no topo do arquivo: `<!-- STUB demonstrativo (tracer) — sobrescrito na síntese real do Plano 02 -->`.

### Passo 4: Uma entrada-stub de manifesto

Gravar `synthesis/_manifest-stub.md` com UMA linha de mapeamento conceito→alvo, demonstrando o formato que o `edit-manifest.md` real terá:

```
| Conceito | Alvo | Ação | Camada | Conflito |
|---|---|---|---|---|
| pub-sub-vs-message-queue | skills/system-design (reference nova de Filas) | extensão | julgamento | C1 (misconception a corrigir) |
```

> Marcar `<!-- STUB demonstrativo (tracer) — o edit-manifest.md real é produzido por onda, sob GATE HUMANO, nos Planos 02/03/04 -->`. **Esta fase não edita skill e não passa por gate** — o stub só prova que o formato fecha.

---

## Gotchas

- **G2 do plano (misconception-flag):** o átomo de delivery-semantics DEVE carregar `flags: [misconception]`. Este é o ponto inteiro do tracer — se o flag não aparecer, o mecanismo que a Onda 1 usa para corrigir o equívoco não foi provado. Verificar explicitamente no checklist.
- **G6 do plano (`Infos/` gitignored):** não tentar commitar nada. Confirmar que os arquivos caem dentro de `Infos/_pipeline/`.
- **Local — stub ≠ canônico:** os dois arquivos de `synthesis/` são demonstrativos e levam o comentário de stub. Não confundir o stub do tracer com a síntese real das ondas; o Plano 02 sobrescreve `synthesis/pub-sub-vs-message-queue.md`.
- **Local — isolamento real:** normalização (Passo 1) e extração (Passo 2) são **subagentes separados** — o contexto pai não re-transcreve a fonte. Isso prova o handoff por disco (o extrator lê o arquivo, não o contexto do normalizador). Se forem feitos no mesmo contexto, o tracer não prova o mecanismo.

---

## Verificação

> **Audit de conteúdo, não TDD.** Sem RED/GREEN, sem `bun test`. As checagens são binárias e verificáveis por contagem/busca-de-padrão sobre os arquivos em disco.

### Checklist

- [ ] **Normalizado existe:** `Infos/_pipeline/normalized/pubsub-nao-e-message-queue.md` foi criado e é legível (conteúdo técnico preservado, ruído de transcrição removido).
  - Comando: `Test-Path "F:/Projetos/Anti-Vibe-Coding/Infos/_pipeline/normalized/pubsub-nao-e-message-queue.md"` → `True`
- [ ] **Átomos existem:** ao menos 2 átomos em `atoms/pubsub-nao-e-message-queue/` (pub-sub-vs-message-queue + delivery-semantics, mais os demais conceitos distintos).
  - Comando: contar `*.md` em `Infos/_pipeline/atoms/pubsub-nao-e-message-queue/` → ≥ 2
- [ ] **9 campos preenchidos:** cada átomo tem os 9 campos do schema (campos não cobertos pela fonte = `[A DEFINIR]`, nunca em branco nem inventados).
  - Verificação: ler cada átomo; confirmar presença de `conceito/afirmacao/camada/quando_usar/quando_NAO_usar/trade_off/anti_pattern/regra_de_decisao/fonte`.
- [ ] **Citação `fonte:` em todo átomo:** todo átomo tem a linha `fonte:` no formato `Augusto Galego | Pub/Sub não é Message Queue | <âncora>`. Sem `fonte:` → o átomo não persiste (CA-03).
  - Comando (Grep): padrão `^fonte:` deve aparecer 1× por átomo.
- [ ] **≥1 átomo carrega `flags: [misconception]`:** o átomo de delivery-semantics está marcado (G2). 
  - Comando (Grep): padrão `misconception` aparece em ≥1 átomo desta fonte.
- [ ] **Síntese-stub demonstra estrutura consultor:** `synthesis/pub-sub-vs-message-queue.md` tem conceito → quando usar → quando NÃO → árvore → anti-pattern, com `fonte:` preservado e o comentário de stub no topo.
- [ ] **Manifesto-stub demonstra formato conceito→alvo:** `synthesis/_manifest-stub.md` tem 1 linha mapeando conceito→alvo→ação→camada→conflito, com o comentário de stub.
- [ ] **Nenhuma skill tocada:** `git status` em `F:/Projetos/Anti-Vibe-Coding` NÃO mostra nenhum arquivo modificado em `skills/` nem `hooks/` (tudo o que mudou está sob `Infos/`, que é gitignored → nem aparece).

---

## Critério de Aceite

**Por máquina:**
- `Infos/_pipeline/atoms/pubsub-nao-e-message-queue/` contém ≥2 átomos, cada um com a linha `fonte:` preenchida (grep `^fonte:` casa 1×/arquivo) e ≥1 com `flags: [misconception]`.
- `Infos/_pipeline/normalized/pubsub-nao-e-message-queue.md` + `synthesis/pub-sub-vs-message-queue.md` + `synthesis/_manifest-stub.md` existem.
- `git status` não lista mudanças em `skills/` ou `hooks/`.

**Por humano:**
- O mecanismo está provado: lendo o stub de síntese, o Navegador consegue ver (a) que a citação sobreviveu ao handoff por disco, (b) que o equívoco exactly-once aparece marcado para correção, e (c) que a estrutura consultor sai dos átomos. Se algum desses três não estiver visível, o tracer falhou e a fase-02 NÃO deve começar (re-trabalhar o mecanismo primeiro).

---

<!-- Gerado por /plan-feature em 2026-06-15 -->

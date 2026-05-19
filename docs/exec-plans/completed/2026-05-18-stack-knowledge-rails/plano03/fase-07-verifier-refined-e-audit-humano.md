<!--
Princípio universal #5 — Comment Provenance.
Esta fase combina gate de qualidade subagente (verifier refined) + audit humano síncrono (Luiz).
Sem código TS de runtime — apenas spec de prompt para o verifier e checklist humano.
-->

# Fase 07: Verifier refined sobre Batch C + audit humano CA-08 (`action-cable-and-realtime`)

**Plano:** 03 — Batch C + INDEX + E2E + Hardening leve
**Sizing:** 2h
**Depende de:** fase-01 (`performance-and-tuning`), fase-02 (`deployment-with-kamal`), fase-03 (`action-cable-and-realtime`), fase-04 (`action-mailer-and-mailbox`), fase-05 (`active-storage`) — TODOS os 5 átomos do Batch C escritos. Independe de fase-06 (INDEX) — o verifier audita os átomos, não o INDEX.
**Visual:** false

---

## O que esta fase entrega

Gate de qualidade final dos 5 átomos do Batch C: 5 invocações de **verifier refined** rodando em paralelo (uma por átomo) auditando ≥80% das claims em `## Padrões sênior` + `## Anti-padrões` + `## Critérios de decisão` contra os arquivos listados em `sources:`. Tabela de findings em `plano03/MEMORY.md` (claims falhadas + correção aplicada). Em seguida, **audit humano CA-08 D14/D19** do átomo flagged `action-cable-and-realtime` (T3) por Luiz — leitura do átomo + cross-check com fontes — com assinatura `Aprovado por Luiz em YYYY-MM-DD` no STATE.md global da feature (linha do átomo). Se Luiz reprovar, retrabalho da fase-03 + re-verifier sobre o átomo específico. Veredito global do Batch C registrado como DI-1 em `plano03/MEMORY.md`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/performance-and-tuning.md` | Read | Verifier lê para auditar claims |
| `docs/knowledge/rails/atoms/deployment-with-kamal.md` | Read | Idem |
| `docs/knowledge/rails/atoms/action-cable-and-realtime.md` | Read | Idem + audit humano Luiz |
| `docs/knowledge/rails/atoms/action-mailer-and-mailbox.md` | Read | Idem |
| `docs/knowledge/rails/atoms/active-storage.md` | Read | Idem |
| `claude-code/knowledge/Rails/{pastas-canonicas}/*.md` | Read | Fonte para cross-check de claims |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Modify | Adicionar assinatura `Aprovado por Luiz em YYYY-MM-DD` na linha de `action-cable-and-realtime` |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/plano03/MEMORY.md` | Modify | Registrar DI-1 (veredito global Batch C) + tabela de findings por átomo |
| `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` | Read | Cláusula LITERAL no prompt do verifier (regression D12) |

---

## Implementacao

### Passo 1: Preparar o prompt do verifier refined (cláusula LITERAL — G3 do plano)

O orquestrador (`/execute-plan`) spawna 5 subagentes verifier em paralelo. Cada um recebe o mesmo prompt-base, parametrizado por átomo. O prompt-base DEVE incluir o **texto LITERAL** da compound lesson `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` colado verbatim (não parafraseado, não resumido). Sem essa cláusula, o verifier audita seções editoriais (`## Quando consultar`, `## Referências externas`) e produz false-positives "claim genérica sem fonte" — esse padrão já causou rework loop no Node Plano 04 (referência: D12 + G3 do Plano 02).

Estrutura do prompt-base (template):

```
Você é um subagente verifier auditando UM átomo do matrix Rails da v6.3.3.

ÁTOMO ALVO: docs/knowledge/rails/atoms/{slug}.md
FONTES CITADAS (frontmatter sources:): {lista paths absolutos}

PROTOCOLO REFINED (LITERAL — não improvise):
{COLE AQUI O CONTEÚDO INTEGRAL DE docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md}

INSTRUÇÕES OPERACIONAIS:
1. Leia o átomo via Read.
2. Para CADA fonte listada em `sources:`, leia o arquivo via Read.
3. Audite APENAS as 3 seções técnicas: `## Padrões sênior`, `## Anti-padrões`, `## Critérios de decisão`.
4. Para cada claim técnica nessas seções (padrão sênior nomeado, anti-padrão com correção, linha de tabela "se X então Y"), responda:
   - Claim: "{texto resumido}"
   - Fonte localizada: SIM/NÃO
   - Path da fonte + trecho (ou "NÃO ENCONTRADO em nenhuma fonte listada")
5. NÃO audite `## Quando consultar` (cenário editorial), `## Referências externas` (cross-links), nem callouts opcionais (API-only mode, RF13 flag) — essas são scaffolding, não claims rastreáveis (G3 do plano e do Plano 02).
6. Output em tabela markdown com colunas: Claim | Fonte localizada | Path | Trecho
7. Veredito final: PASS se ≥80% das claims técnicas têm fonte localizada, FAIL caso contrário.
```

### Passo 2: Spawn 5 verifiers em paralelo via /execute-plan

5 subagentes simultâneos (1 por átomo do Batch C). Slugs:

1. `performance-and-tuning`
2. `deployment-with-kamal`
3. `action-cable-and-realtime` (flagged — audit humano em Passo 4)
4. `action-mailer-and-mailbox`
5. `active-storage`

Cada subagente é Fork (herda contexto, cache-otimizado — não Worktree, pois não toca git). Orçamento: ~30 min por átomo em paralelo → ~30 min wall-clock total.

### Passo 3: Consolidar findings em `plano03/MEMORY.md`

Para cada átomo, o orquestrador captura a tabela do verifier e produz um bloco em `plano03/MEMORY.md`:

```markdown
### Verifier refined — {slug} ({tier})

| Claim | Fonte localizada | Path | Trecho |
|-------|------------------|------|--------|
| {...} | SIM/NÃO | {...} | {...} |
| {...} | SIM/NÃO | {...} | {...} |

**Veredito:** PASS / FAIL ({N}/{M} claims com fonte → {pct}%)
**Ação:** {Aprovado} OU {Retrabalho da fase-NN: corrigir claims X, Y, Z}
```

Se algum átomo retornar FAIL (<80%), abrir bloco DI-N em MEMORY.md com:
- O que falhou (lista de claims sem fonte)
- Por que (extrator inflou conteúdo? fonte canônica errada? gap real na fonte?)
- Fix aplicado (re-extrair com prompt corrigido / mover claim para anti-padrão sem âncora / remover claim)
- Impacto (re-rodar verifier sobre o átomo afetado — não re-rodar o batch inteiro)

### Passo 4: Audit humano CA-08 do átomo flagged (`action-cable-and-realtime` — D14, D19)

Após verifier rodar e aprovar (ou após retrabalho), Luiz executa pessoalmente:

1. **Read** `docs/knowledge/rails/atoms/action-cable-and-realtime.md` (corpo completo, ~140 linhas).
2. Para cada path em `sources:` do frontmatter, **Read** o arquivo de fonte canônica.
3. Para cada padrão sênior + anti-padrão + linha de critério de decisão, validar:
   - Claim está rastreável para passagem específica da fonte? (não confiar no verifier — checar de novo)
   - Claim é decisão de produção sênior, não tutorial superficial?
   - Versão Rails declarada em `rails_versions` faz sentido para o padrão (Solid Cable é `>=8.0`; channels clássicos são `>=7.1`)?
   - Há claim que parece "verdade conhecida" mas não está na fonte? (drift)
4. Decisão registrada no STATE.md global da feature, linha do átomo:
   ```markdown
   - [x] action-cable-and-realtime — verifier PASS (8/10 claims, 80%); audit humano: **Aprovado por Luiz em 2026-05-NN**
   ```
   Se reprovar:
   ```markdown
   - [ ] action-cable-and-realtime — verifier PASS, audit humano REPROVADO por Luiz em 2026-05-NN. Motivo: {texto}. Retrabalho da fase-03 do Plano 03.
   ```

### Passo 5: Veredito global Batch C como DI-1 em `plano03/MEMORY.md`

```markdown
### DI-1: Veredito Batch C (verifier refined + audit humano)

- **O que:** {PASS global / FAIL global com X átomos em retrabalho}
- **Por que:** gate de qualidade obrigatório antes da fase-08 (E2E completo) e da fase-09 (hardening).
- **Detalhes:**
  - performance-and-tuning: PASS (N/M claims, pct%)
  - deployment-with-kamal: PASS (N/M claims, pct%)
  - action-cable-and-realtime: PASS verifier + Aprovado por Luiz em 2026-05-NN (audit humano CA-08)
  - action-mailer-and-mailbox: PASS (N/M claims, pct%)
  - active-storage: PASS (N/M claims, pct%)
- **Impacto:** se PASS global, libera fase-08; se FAIL, fase-08 bloqueada até retrabalho.
```

### Passo 6: Cumulativo audit humano CA-08 — verificar 3/3 dos átomos flagged

CA-08 D14 lista 3 átomos a ter audit humano de Luiz: `active-record-fundamentals` (T1, Plano 02 fase-09), `action-view-and-hotwire` (T2, Plano 02 fase-09), `action-cable-and-realtime` (T3, esta fase). Em STATE.md global, confirmar que os 3 têm assinatura `Aprovado por Luiz em YYYY-MM-DD`. Se algum falta, BLOQUEAR fase-08 e escalar.

---

## Gotchas

- **G3 do plano (verifier refined LITERAL):** o texto da compound lesson `2026-05-16-verifier-protocol-technical-sections-only.md` DEVE ser colado verbatim no prompt — não parafrasear, não resumir. Sem essa cláusula, verifier audita seções editoriais e gera false-positives. Regression-test obrigatório.
- **G5 do plano (action-cable é T3 com fontes escassas):** fonte para Action Cable é menos densa que para Active Record. Verifier pode retornar 75-80% (limítrofe). Decisão se rerun ou aceitar com audit humano cobrindo gap fica com Luiz no Passo 4.
- **G10 do plano (fontes canônicas via STATE.md):** verifier lê paths absolutos de `sources:` do frontmatter — esses paths apontam para os lados canônicos decididos no Plano 01 fase-01. Se um path aponta para `* copy` ou `v2` deletado, verifier falha de imediato (file not found) — sinal de drift no extrator, não no verifier.
- **Local — audit humano não pode ser delegado:** D19 é explícito — Luiz revisa pessoalmente. Subagente NÃO pode "auditar como se fosse Luiz" — quebra o gate.
- **Local — paralelismo dos 5 verifiers:** spawnar 5 simultâneos OK para Fork model. Se orçamento de tokens apertado, dividir em 2 sub-batches (3 + 2). NÃO sequencial — perde wall-clock.

---

## Verificacao

### Conteúdo (gate de qualidade, não TDD code)

Esta fase é gate de qualidade subagente + humano. Sem ciclo RED→GREEN. Checklist:

### Checklist

- [ ] Prompt do verifier inclui texto LITERAL da compound lesson `2026-05-16-verifier-protocol-technical-sections-only.md` (grep no log do `/execute-plan` confirma)
- [ ] 5 subagentes verifier spawnados em paralelo (1 por átomo do Batch C)
- [ ] Cada verifier produziu tabela de claims auditadas com paths absolutos para fonte
- [ ] Cada átomo tem veredito PASS (≥80% claims rastreáveis) — se FAIL, retrabalho da fase do átomo + re-verifier executado e PASS após
- [ ] `plano03/MEMORY.md` contém bloco "Verifier refined — {slug}" para cada um dos 5 átomos
- [ ] `plano03/MEMORY.md` contém DI-1 (veredito global Batch C) com lista PASS/FAIL por átomo
- [ ] Luiz executou audit humano de `action-cable-and-realtime`: leu átomo + leu fontes + decidiu
- [ ] STATE.md global tem assinatura `Aprovado por Luiz em YYYY-MM-DD` na linha de `action-cable-and-realtime`
- [ ] CA-08 cumulativo: STATE.md tem 3 assinaturas de Luiz (`active-record-fundamentals`, `action-view-and-hotwire`, `action-cable-and-realtime`)
- [ ] Se algum átomo precisou retrabalho, bloco DI-N em MEMORY.md documenta o que/porque/fix/impacto

---

## Criterio de Aceite

**Por maquina:**

- `grep -c "Verifier refined —" docs/exec-plans/active/2026-05-18-stack-knowledge-rails/plano03/MEMORY.md` retorna 5
- `grep -c "Aprovado por Luiz em" docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` retorna ≥3 (active-record-fundamentals, action-view-and-hotwire, action-cable-and-realtime)
- `grep "DI-1:" docs/exec-plans/active/2026-05-18-stack-knowledge-rails/plano03/MEMORY.md` retorna 1 match

**Por humano:**

- Luiz confirma verbalmente que leu o átomo `action-cable-and-realtime` e cross-checked com fontes — não delegou.
- Veredito global Batch C é PASS (todos os 5 átomos PASS no verifier + audit humano aprovado para o T3 flagged).
- Plano 03 fase-08 (E2E completo) pode prosseguir sem bloqueio.

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->

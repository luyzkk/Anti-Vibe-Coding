<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
O verifier é um subagente isolado; seu prompt vive nesta fase como spec, não como código.
-->

# Fase 06: Verifier sanity check + auditoria humana

**Plano:** 04 — Atom Batch A
**Sizing:** 1.5h (verifier ~30min + auditoria humana ~45min + retrabalho buffer ~15min)
**Depende de:** fase-01, fase-02, fase-03, fase-04, fase-05 (todos os 5 átomos escritos)
**Visual:** false

---

## O que esta fase entrega

Gate de qualidade do Batch A (CA-08): subagente verificador roda sample audit (≥80% das claims rastreáveis para passagens específicas da fonte) em cada um dos 5 átomos, em invocações isoladas independentes; em seguida, humano amostra 3 átomos (1 tier 1 + 1 tier 2 + 1 tier 2 alternativo) para checklist visual. Veredito do batch registrado em MEMORY.md como DI-4. Se algum átomo falhar verifier OU auditoria humana, abre retrabalho na fase do átomo afetado e re-roda fase-06.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/async-concurrency-streams.md` | Read | input do verifier (fase-01) |
| `docs/knowledge/nodejs-typescript/atoms/error-handling-observability.md` | Read | input do verifier (fase-02) |
| `docs/knowledge/nodejs-typescript/atoms/data-persistence.md` | Read | input do verifier (fase-03) |
| `docs/knowledge/nodejs-typescript/atoms/state-and-caching.md` | Read | input do verifier (fase-04) |
| `docs/knowledge/nodejs-typescript/atoms/code-smells-catalog.md` | Read | input do verifier (fase-05) |
| `docs/exec-plans/active/2026-05-16-stack-knowledge-nodejs-typescript/plano04/MEMORY.md` | Modify | registrar veredito final do batch como DI-4 |

---

## Implementacao

### Passo 1: Spawn subagente verificador isolado por átomo (5 invocações em paralelo possíveis)

Prompt do verifier (verbatim — usar este prompt sem modificações):

```
Você é um subagente verificador isolado, sem contexto prévio do projeto.
Sua única tarefa: validar fidelidade de um átomo Markdown contra sua fonte de origem.

INPUT:
- Caminho do átomo: docs/knowledge/nodejs-typescript/atoms/{slug}.md
- Caminho das fontes (frontmatter `sources:`): claude-code/knowledge/Nodejs/wf-{compass-id}.md
  (Se a fonte for skill, ex: nodejs-core/rules/{nome}.md, o path é claude-code/knowledge/Nodejs/nodejs-core/rules/{nome}.md)

PROTOCOLO:
1. Leia o átomo na íntegra.
2. Leia as fontes listadas no frontmatter `sources:` na íntegra.
3. Selecione 5 claims aleatórias do átomo (idealmente 1 por seção: Quando consultar,
   Padrões sênior, Anti-padrões, Critérios de decisão, Referências externas). Claim = afirmação
   técnica concreta (ex: "Promise.allSettled espera todos os promises, mesmo se algum falhar").
4. Para CADA claim, identifique a PASSAGEM ESPECÍFICA da fonte que a sustenta. Reporte:
   - Claim: <texto exato do átomo>
   - Citação da fonte: <parágrafo ou linhas X-Y do arquivo de fonte; transcrever as linhas relevantes>
   - Veredito: rastreada | parafrase aceitavel | nao encontrada
5. Calcule a taxa: (rastreada + parafrase aceitavel) / 5.
6. Reporte PASS se taxa >= 0.80 (4/5 ou 5/5). Reporte FAIL caso contrário, com lista das claims problemáticas.

REGRAS:
- Não invente passagem. Se não achar, marque "nao encontrada" e diga o que procurou.
- Paráfrase aceitável = mesma ideia técnica em palavras diferentes. Paráfrase com mudança de
  semântica (ex: "Promise.all retorna o primeiro resolvido" vs fonte "Promise.race retorna o
  primeiro") é "nao encontrada".
- Não consulte conhecimento prévio sobre Node.js — só a fonte importa.

OUTPUT: relatório markdown com 5 entradas (1 por claim) + veredito final.
```

Spawn 5 subagentes em paralelo (uma invocação por átomo). Cada subagente:
- Recebe `{slug}` + lista de `{compass-id}` extraída do frontmatter
- Lê o átomo + as fontes correspondentes
- Produz relatório no formato acima
- Retorna PASS ou FAIL + relatório

### Passo 2: Auditoria humana — 3 átomos amostrados (1 tier 1 + 1 tier 2 + 1 tier 2 alternativo)

Sugestão de amostragem (registrar em MEMORY.md se mudar):
- **Tier 1:** `async-concurrency-streams.md` (fase-01) — maior fonte (1511 ln) + 5 rules; alto risco de drift
- **Tier 2:** `data-persistence.md` (fase-03) — múltiplas decisões de ORM, alto risco de viés
- **Tier 2 alternativo:** `code-smells-catalog.md` (fase-05) — formato adaptado (Smell em vez de Pattern); valida que adaptação respeitou o skeleton

Checklist humano (3 átomos, ~15min cada):

- [ ] Skeleton respeitado: 5 seções na ordem (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas)
- [ ] Frontmatter com 8 campos na ordem do piloto (zero drift)
- [ ] Zero placeholders `[A DEFINIR]`
- [ ] `wc -l` retorna entre 100 e 200
- [ ] Parágrafos lem como senior Node+TS (não bullets genéricos de tutorial)
- [ ] Patterns/Smells têm Problema + Padrão (ou Sintoma + Refactor) — não só título
- [ ] Triggers do frontmatter são keywords que dev sênior digitaria (sem inventar termos)
- [ ] Citação de skills relacionadas em "Referências externas" é coerente com `_catalog.md` cluster→skill mapping

### Passo 3: Registrar veredito do batch em MEMORY.md (DI-4)

Adicionar entrada em `MEMORY.md > Decisoes de Implementacao`:

```
- **DI-4:** Batch A {aprovado | reprovado} em {YYYY-MM-DD} por {auditor}
  - Verifier subagente: {5/5 PASS | N/5 PASS, falhas em <slugs>}
  - Auditoria humana: {3/3 OK | falha no atomo <slug>: <motivo>}
  - Próximo passo: {desbloqueia Plano 06 fase-04 (INDEX) | retrabalho em fase-NN}
```

### Passo 4: Retrabalho condicional

Se algum átomo falhar verifier OU auditoria humana:
1. Identificar a fase do átomo afetado (fase-01..05)
2. Re-executar a fase (revisar conteúdo, ajustar claims contra fonte)
3. Re-rodar **apenas a invocação do verifier** para esse átomo + re-checar manualmente
4. Atualizar MEMORY.md DI-4 com nova rodada (DI-4 → DI-4-revisao-1)

Se múltiplos átomos falharem (>=2/5), revisar prompt do verifier (pode estar permissivo ou estrito demais) antes de re-rodar — registrar mudança em MEMORY.md.

---

## Gotchas

- **G3 do plano (verifier subagente é isolado):** o prompt do verifier OBRIGA citar passagem específica da fonte para cada claim. Aceitar relatório sem citação concreta = false-positive. Se o verifier devolver "rastreada" sem trecho transcrito, REJEITAR o relatório e re-spawnar com prompt reforçado.
- **G4 do plano (auditoria humana é bloqueante):** 3 átomos amostrados antes de aprovar batch. Sem auditoria humana, CA-08 não está cumprido — bloquear Plano 06 fase-04.
- **Nota de divergência PRD vs PLAN (registrada em MEMORY.md):** PRD CA-08 diz "1 tier 1 + 1 tier 2 + 1 tier 3"; PLAN.md secão "Plano 04 fase-06" (linha 119) diz "1 tier 1 + 1 tier 2 + 1 tier 2 alternativo". **Seguir PLAN.md** porque Plano 04 não contém átomos tier 3 (tier 3 fica para Plano 06: performance-and-internals, operations-and-deploy, tooling). Decisão fica em MEMORY.md como DI-3.
- **Local — paralelismo dos 5 verifiers:** invocações isoladas evitam context bleed. Não usar 1 subagente para auditar os 5 átomos em sequência (degradação de contexto + viés cross-átomo).
- **Local — relatórios do verifier devem ficar em arquivo:** sugerir salvar em `tmp/verifier-batch-a/{slug}-report.md` para auditoria posterior. Não precisa commitar — descartar após fase-06 fechar.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é gate de qualidade, não escrita de átomo. Verificação é veredito do batch.

### Checklist

- [ ] 5 invocações de verifier subagente concluídas (1 por átomo)
- [ ] Cada relatório de verifier contém: 5 claims + citação da fonte + veredito por claim + veredito final PASS/FAIL
- [ ] Cada relatório PASS tem taxa ≥80% (4/5 ou 5/5 claims rastreáveis/parafrase aceitável)
- [ ] Cada FAIL tem lista de claims problemáticas + abre retrabalho na fase do átomo
- [ ] Auditoria humana de 3 átomos amostrados concluída (1 tier 1 + 1 tier 2 + 1 tier 2 alternativo)
- [ ] Checklist humano marcado em cada átomo amostrado (skeleton + frontmatter + lem-como-sênior + triggers)
- [ ] Veredito do batch registrado em MEMORY.md como DI-4 (data + auditor + resultado por átomo)
- [ ] Se algum átomo falhou: retrabalho aberto + re-verifier rodado + DI-4 atualizada com nova rodada
- [ ] CA-08 (PRD + PLAN.md) marcado como cumprido apenas após batch aprovado

---

## Criterio de Aceite

**Por maquina:**
- 5 arquivos em `tmp/verifier-batch-a/{slug}-report.md` (ou diretório equivalente) contendo o relatório de cada verifier
- `grep "Veredito final: PASS"` em todos os 5 relatórios retorna 5 matches (após retrabalho se necessário)
- MEMORY.md contém entrada `DI-4` com `Batch A aprovado em YYYY-MM-DD`
- `wc -l` em cada um dos 5 átomos retorna entre 100 e 200
- `grep -c '\[A DEFINIR\]'` em cada átomo retorna 0

**Por humano:**
- Auditor confirma os 3 átomos amostrados passam no checklist visual (skeleton + frontmatter + lem-como-sênior)
- Nenhum dos átomos amostrados duplica conteúdo cross-stack de skill relacionada (diferencial Node+TS claro)
- CA-08 cumprido: 80% claims rastreáveis (por verifier) + auditoria humana de 3 átomos (por humano) — gate explícito para destrancar Plano 06 fase-04

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

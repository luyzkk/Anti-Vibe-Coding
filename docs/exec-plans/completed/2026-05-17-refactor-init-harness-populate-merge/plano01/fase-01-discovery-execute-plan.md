<!--
Princípio universal #5 — Comment Provenance.
Esta fase NAO produz código de runtime — apenas relatorio (markdown).
Por isso o lembrete de provenance nao se aplica aqui.
-->

# Fase 01: Auditoria do execute-plan (compatibilidade wave-based + glossario)

**Plano:** 01 — Fundacao + Discovery do execute-plan
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Relatorio `EXECUTE_PLAN_AUDIT.md` documentando se o `/anti-vibe-coding:execute-plan` atual suporta as 3 capacidades exigidas pelo PRD (D13, D25, CH-03) e veredito explicito GO ou NO-GO antes de prosseguir com fase-02.

---

## Objetivo (uma frase)

Validar D25 do PRD ("Compatibilidade de /execute-plan com PLAN.md de populacao") atraves de auditoria read-only da skill, evitando assumir capacidade inexistente.

---

## Contexto

D25 do PRD ("Compatibilidade de /execute-plan") foi explicito: "Fase 0 do `/plan-feature` (proximo passo do pipeline) inclui sub-task: ler `skills/execute-plan/SKILL.md` + `lib/`, validar suporte a wave-based paralelo com glossario compartilhado. Se sim, segue. Se nao, abre PRD paralelo de extensao do execute-plan."

D13 do CONTEXT afirma: "Subagentes paralelos por arquivo de destino via /execute-plan wave-based."

CH-03 do PRD (Could-Have): "Step 91 injeta glossario compartilhado (terminologia do projeto extraida de classify-blocks) em todos os subagent prompts."

Esta fase eh a materializacao da fase 0 de D25 — sem ela, o Plano 02 fase-02 (populate-plan-generator) corre o risco de emitir um PLAN.md que execute-plan nao consegue rodar.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/plano01/EXECUTE_PLAN_AUDIT.md` | Create | Relatorio de auditoria com veredito GO/NO-GO |
| `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/plano01/MEMORY.md` | Modify | Anotar veredito no campo "Notas para Planos Seguintes" |

---

## Tarefas

1. **Ler `skills/execute-plan/SKILL.md`** (integral). Identificar: como o pipeline le um PLAN.md, como navega fase por fase, se invoca subagentes, se ha conceito de "wave".
2. **Ler `skills/execute-plan/index.ts`** (integral — a skill NAO tem `lib/`, todo o codigo esta no `index.ts`). Identificar: signature da entrada, como instancia subagentes, se ha paralelismo nativo (`Promise.all` ou similar) ou se e sequencial.
3. **Ler `skills/execute-plan/index.test.ts`** (cobertura, casos de teste). Confirmar quais cenarios ja sao testados — paralelismo entre fases? Multiple subagentes?
4. **Ler `skills/execute-plan/references/`** (se houver — usar `ls` para confirmar). Cada arquivo de referencia eh um indicio do que ja foi pensado para a skill.
5. **Para cada um dos 3 criterios** (paralelismo wave-based, isolamento de contexto via subagentes, suporte opcional a glossario compartilhado injetado no prompt), registrar no relatorio: evidencia citando `path:linha`, status `SUPPORTED | PARTIAL | MISSING`.
6. **Emitir veredito GO ou NO-GO no topo do relatorio.** GO se os 3 estao SUPPORTED ou se MISSING podem ser contornados pelo populate-plan-generator (ex: emitir tasks sequenciais sem perder correcao). NO-GO se algum MISSING bloqueia o uso pretendido.
7. **Se NO-GO:** redigir secao "PRD Paralelo Sugerido" no fim do relatorio (apenas o esqueleto: titulo, justificativa, escopo proposto). NAO criar o PRD paralelo nesta fase — apenas registrar a necessidade.
8. **Atualizar `MEMORY.md`** do plano01: secao "Notas para Planos Seguintes" recebe linha "AUDIT: GO" ou "AUDIT: NO-GO — PRD paralelo aberto em [...]".

---

## Estrutura sugerida do `EXECUTE_PLAN_AUDIT.md`

```markdown
# EXECUTE_PLAN_AUDIT — Compatibilidade com populate-plan generator

**Auditor:** subagente da fase-01 do Plano 01
**Data:** 2026-05-18
**Veredito:** GO | NO-GO
**Origem:** D25 do PRD refactor-init-harness-populate-merge

## Capacidades avaliadas

| # | Capacidade | Status | Evidencia |
|---|-----------|--------|-----------|
| 1 | Paralelismo wave-based (multiplos subagentes simultaneos por fase) | SUPPORTED / PARTIAL / MISSING | `skills/execute-plan/index.ts:NN-MM` (snippet curto descritivo) |
| 2 | Isolamento de contexto (cada subagente tem prompt isolado, sem leak entre tasks) | SUPPORTED / PARTIAL / MISSING | `skills/execute-plan/index.ts:NN-MM` |
| 3 | Suporte opcional a glossario compartilhado (injetar bloco de glossario em todos os prompts de subagente) | SUPPORTED / PARTIAL / MISSING | `skills/execute-plan/SKILL.md:NN` ou ausente |

## Observacoes adicionais

- Comportamento atual quando PLAN.md declara N tasks paralelas em uma fase
- Limite conhecido de subagentes concorrentes (se houver)
- Mecanismo de erro (uma task falha → para a wave? continua?)

## Veredito detalhado

{Frase justificando GO ou NO-GO.}

### Se NO-GO: PRD Paralelo Sugerido

**Titulo:** `extend-execute-plan-wave-paralelism-{date}`
**Justificativa:** {por que o execute-plan atual nao atende e o que precisa ser adicionado}
**Escopo proposto:** {bullets do que o PRD paralelo deve cobrir}
**Bloqueia:** Plano 02 deste PRD ate o execute-plan ser estendido OU populate-plan-generator emitir tasks sequenciais (degradacao aceitavel?)
```

---

## Gotchas

- **G1 do plano (D25 obrigatorio):** Esta fase nao eh opcional — pular leva a risco de Plano 02 emitir PLAN.md incompativel com execute-plan, gastando tokens de subagent paralelo que execute-plan nao sabe rodar.
- **G8 do plano (efeito do NO-GO):** Se veredito for NO-GO, este Plano 01 PAUSA. As fases 02 e 03 ainda podem rodar (helpers + dispatcher nao dependem de execute-plan), mas Plano 02 inteiro fica bloqueado. Documentar isso explicitamente na "Notas para Planos Seguintes" do MEMORY.md.
- **Local — execute-plan nao tem `lib/`:** Confirmado via `ls` (so `index.ts`, `index.test.ts`, `references/`, `SKILL.md`). Auditoria deve ler `index.ts` integralmente — nao procurar arquivos `wave-runner.ts` ou `parallel.ts` que nao existem.
- **Local — glossario compartilhado e CH-03 (Could-Have):** Se MISSING, ainda pode dar GO desde que o populate-plan-generator (Plano 02 fase-02) consiga emitir tasks com glossario inline em cada prompt (custo: cada prompt cresce com o glossario duplicado). Decisao do veredito deve considerar essa degradacao aceitavel.

---

## Verificacao

### TDD

Esta fase eh read-only e produz apenas markdown. Nao ha codigo a testar.

### Checklist

- [ ] `EXECUTE_PLAN_AUDIT.md` existe em `plano01/`
- [ ] Relatorio tem secao "Capacidades avaliadas" com >=3 linhas (3 criterios obrigatorios)
- [ ] Cada criterio tem evidencia `path:linha` ou justificativa "ausente — verificado em [path]"
- [ ] Veredito GO ou NO-GO claramente marcado no topo
- [ ] Se NO-GO, secao "PRD Paralelo Sugerido" preenchida com 4 campos (titulo, justificativa, escopo, bloqueia)
- [ ] `MEMORY.md` atualizado com linha de veredito em "Notas para Planos Seguintes"
- [ ] Nenhum arquivo fora de `plano01/` foi tocado (verificavel via `git status` da pasta `plano01/`)

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/plano01/EXECUTE_PLAN_AUDIT.md` retorna 0
- `grep -E '^Veredito: (GO|NO-GO)' docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/plano01/EXECUTE_PLAN_AUDIT.md` retorna pelo menos 1 match

**Por humano:**
- Dev consegue ler o relatorio em <2min e entender se prosseguir para fase-02 ou pausar o plano

---

## Decisoes Aplicadas

- **D25 do PRD** (Compatibilidade execute-plan): esta fase EH a fase 0 obrigatoria definida em D25.
- **D13 do PRD** (subagents paralelos): auditoria verifica capacidade real antes de assumir que existe.
- **CH-03 do PRD** (glossario compartilhado): auditoria avalia suporte como criterio 3.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

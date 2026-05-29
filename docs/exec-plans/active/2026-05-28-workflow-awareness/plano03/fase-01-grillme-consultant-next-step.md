<!--
Princípio universal #5 — Comment Provenance.
Esta fase edita PROSA de SKILL.md (grill-me + consultant), não código de runtime. Sem comentários inline de código.
Provenance da decisão: PRD RF10/RF11; CONTEXT D7/INV5/INV6; PLAN R2/R3 (drift + prose-leak).
-->

# Fase 01: grill-me + consultant — Sugestão Condicional de Workflow no Próximo Passo

**Plano:** 03 — Cobertura (grill-me + consultant + retrospectivo)
**Sizing:** 0.5h
**Depende de:** Nenhuma (independente da fase-02; só LÊ `docs/WORKFLOWS.md`, criado no Plano 01)
**Visual:** false

---

## O que esta fase entrega

`skills/grill-me/SKILL.md` (Passo 6, branch Complex) e `skills/consultant/SKILL.md` (Pipeline
Awareness) ganham UMA sugestão condicional de dynamic workflow no ponto onde cada skill já sugere o
próximo passo — disparando só quando o sinal é de **escala** (semântico, INV5), referenciando
`docs/WORKFLOWS.md` por menção de caminho, suggest-only (INV6), com fallback de skill in-context.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/grill-me/SKILL.md` | Modify | Passo 6 "Sugerir Proximo Passo" (linha 261); adicionar sub-linha condicional ao branch **Complex** (linha 266). |
| `skills/consultant/SKILL.md` | Modify | "Pipeline Awareness — Proximos Passos" (linha 272); adicionar uma linha condicional de next-step de escala antes da frase "A sugestao e INFORMATIVA" (linha 289). |

> **Ground truth confirmado (Read 2026-05-29):**
> - grill-me: Passo 6 em 261; branch Complex em 266 (`- **Complex** (15-20 decisoes): "Feature complexa. Recomendo /write-prd e depois /plan-feature."`).
> - consultant: Pipeline Awareness em 272; bloco-exemplo em 276-289; linha 289 = "A sugestao e INFORMATIVA — o dev decide se quer seguir ou nao." Regra inviolável já modelada na linha 101 ("NUNCA invocar /grill-me automaticamente. Sempre perguntar primeiro.").

---

## Implementacao

### Passo 1 — grill-me: sub-linha condicional no branch Complex (RF10)

A linha 266 hoje é:

```text
- **Complex** (15-20 decisoes): "Feature complexa. Recomendo /write-prd e depois /plan-feature."
```

Adicionar uma sub-linha logo abaixo dela (indentada como sub-item do branch Complex), disparando só
quando a feature complexa ALSO tem sinal de escala. SEM número (INV5) — sinal semântico:

```text
- **Complex** (15-20 decisoes): "Feature complexa. Recomendo /write-prd e depois /plan-feature."
  - **Se a feature complexa tambem tiver sinal de ESCALA** (auditoria do codebase inteiro, centenas
    de arquivos a migrar, pesquisa cross-checada em varias fontes): mencionar que existe um degrau
    acima do plano — um dynamic workflow do Claude Code, descrito em `docs/WORKFLOWS.md`. Isto e uma
    SUGESTAO: o plugin nao executa nem lanca nada; o opt-in e do humano (incluir a palavra `workflow`
    no pedido). Alternativa in-context que funciona sempre (inclusive com workflows desabilitados):
    `/verify-work | /design-twice | /deep-research (se disponivel) | /plan-feature`.
```

Regras desta inserção:
- **INV5:** "auditoria do codebase inteiro", "centenas de arquivos", "pesquisa cross-checada" são
  sinais semânticos; nenhum threshold numérico exposto na prosa.
- **INV6 (marcadores verificados pela fase-03):** "nao executa", "nao lanca", "opt-in e do humano",
  "SUGESTAO".
- **G1:** `` `docs/WORKFLOWS.md` `` por menção de caminho, nunca link markdown.
- **D7 (G4 do plano):** `/deep-research (se disponivel)` nomeado porque o branch Complex inclui o caso
  de pesquisa cross-checada — único lugar desta fase onde pesquisa é use case.
- **NFR degradação:** o fallback in-context (`/verify-work | /design-twice | /deep-research | /plan-feature`)
  é a MESMA lista do hook (G1) e funciona sem workflows.

### Passo 2 — consultant: next-step condicional no Pipeline Awareness (RF11)

O Pipeline Awareness (linha 272) já tem dois blocos de sugestão (276-289) e fecha na linha 289 com "A
sugestao e INFORMATIVA — o dev decide se quer seguir ou nao." Adicionar um terceiro bloco condicional
ANTES dessa linha de fechamento, espelhando o tom INFORMATIVA já existente e o padrão da regra
inviolável da linha 101:

```text
**Se a decisao implicar trabalho de ESCALA** (varrer/auditar o codebase inteiro, migrar centenas de
arquivos, cross-check de muitas fontes):

> "Esta decisao implica trabalho de escala. Acima do plano normal existe um degrau: um dynamic
> workflow do Claude Code, descrito em `docs/WORKFLOWS.md`. SUGIRO considera-lo, mas o consultant
> nao lanca nem executa nada — o opt-in e do humano (incluir a palavra `workflow` no pedido). Sempre
> perguntar primeiro, nunca invocar automaticamente. Alternativa in-context que funciona sempre:
> `/verify-work | /design-twice | /deep-research (se disponivel) | /plan-feature`."
```

Inserir esse bloco entre a linha 287 (fim do bloco "Se ainda ha incertezas") e a linha 289 ("A
sugestao e INFORMATIVA..."). A frase de fechamento existente (289) cobre o novo bloco também — não
duplicar uma segunda frase INFORMATIVA.

Regras desta inserção:
- **INV6 (marcadores):** "nao executa", "nao lanca", "opt-in e do humano", "SUGIRO" + "Sempre perguntar
  primeiro, nunca invocar automaticamente" (espelha a regra inviolável da linha 101 — o consultant já
  modela esse no-launch para `/grill-me`; aqui é o mesmo padrão para workflow).
- **INV5:** sinais semânticos, sem número.
- **G1:** `` `docs/WORKFLOWS.md` `` por menção de caminho.
- **D7 (G4):** `/deep-research (se disponivel)` nomeado (cross-check de fontes é um dos gatilhos).

### Passo 3 — Conferir consistência com o tom existente de cada skill

- grill-me: o Passo 6 só **sugere** ("Recomendo...") e nunca executa — a nova sub-linha mantém esse tom.
  Não tocar Passo 5 (merge), Passo 7 (learn) nem a Pipeline Integration (280+).
- consultant: a regra inviolável da linha 101 ("NUNCA invocar /grill-me automaticamente. Sempre
  perguntar primeiro.") é o modelo de no-launch que o novo bloco replica para workflow. NÃO editar essa
  regra; garantir apenas que o novo bloco não a contradiz e que a frase 289 ("INFORMATIVA") segue
  cobrindo o conjunto.

---

## Gotchas

- **G1 do plano (uma fonte de verdade):** ambas as inserções REFERENCIAM `` `docs/WORKFLOWS.md` `` —
  não reproduzem a tabela comparativa nem a mensagem `[WORKFLOW_ADVISOR]`. O fallback in-context é a
  MESMA lista do hook.
- **G5 do plano (link-check):** menção de caminho, nunca link — `docs/WORKFLOWS.md` só existe após o
  Plano 01; um link markdown verificado quebraria `harness:validate` se esta fase rodasse antes.
- **INV5 do plano:** sem threshold numérico na prosa; sinais semânticos. Não copiar o `\d{3,}` do hook.
- **INV6 do plano:** os marcadores "nao executa"/"nao lanca"/"opt-in e do humano" são obrigatórios em
  AMBAS as superfícies (verificados pela fase-03).
- **D7/G4 do plano:** `/deep-research (se disponivel)` só onde pesquisa é o use case (aqui sim, nos dois
  branches — cross-check de fontes é gatilho).
- **Local — commit atômico único:** as duas edições são a mesma classe ("sugestão de próximo passo de
  skill") e não se cruzam; agrupar num único commit conventional (`feat(skills): ...`).
- **Local — reler antes de editar:** reler grill-me 261-267 e consultant 272-290 imediatamente antes do
  Edit (o decay de contexto pode ter movido as âncoras; confirmar as linhas).

---

## Verificacao

### TDD

Edições de PROSA não têm RED/GREEN unitário natural — o "teste" é o gate da fase-03 (marcadores).

- [ ] **RED:** antes desta fase, a asserção da fase-03 para grill-me e consultant FALHA (marcadores de
  workflow ausentes nos dois arquivos).
  - Comando: `bun run test -- --test-name-pattern "workflow coverage"` (após a fase-03 existir)
  - Resultado esperado: `expect(received).toContain(expected)` failure

- [ ] **GREEN:** após as duas edições, a asserção PASSA.
  - Comando: `bun run test -- --test-name-pattern "workflow coverage"`
  - Resultado esperado: passed

### Checklist

- [ ] grill-me Passo 6: sub-linha condicional adicionada ao branch Complex (não a Trivial/Medium).
- [ ] consultant Pipeline Awareness: bloco condicional de escala adicionado ANTES da frase "INFORMATIVA" (289).
- [ ] Ambos mencionam `` `docs/WORKFLOWS.md` `` por caminho; zero links markdown novos.
- [ ] Marcadores INV6 presentes nos dois: "nao executa", "nao lanca", "opt-in e do humano".
- [ ] Fallback in-context (`/verify-work | /design-twice | /deep-research | /plan-feature`) presente nos dois.
- [ ] `/deep-research (se disponivel)` com o hedge nos dois (pesquisa é use case).
- [ ] Sinais semânticos apenas; zero número na prosa (INV5).
- [ ] `bun run harness:validate` verde (link-check de SKILL.md não quebrou).
- [ ] `bun run typecheck` sem novos erros (GT-01 inalterado).
- [ ] `bunx biome check skills/grill-me/SKILL.md skills/consultant/SKILL.md` limpo (opcional).

---

## Criterio de Aceite

**Por maquina:**
- `bun run test` verde para os casos grill-me + consultant da fase-03.
- `bun run harness:validate` exit 0.
- Grep em `skills/grill-me/SKILL.md` e `skills/consultant/SKILL.md` por `Workflow(` e `decision:block` retorna ZERO ocorrências.

**Por humano:**
- Leitura fresca: em ambas as skills, a menção de workflow lê inequivocamente como SUGESTÃO; nenhuma
  frase pode ser lida como "a skill pode lançar o workflow por conta própria". O degrau de escala só
  aparece no caso complexo+escala (grill-me) / decisão de escala (consultant), nunca no caso trivial.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->

---
fase: 02
plano: 02
status: planned
---

# Fase 02: Ponteiros de Descoberta

**Plano:** 02 — Vocabulario de Seam
**Sizing:** ~1h
**Depende de:** fase-01 (o material precisa existir antes de ser apontado)
**Visual:** false

**Decisoes:** DI-06 (referencia, nao skill — logo, descoberta e por ponteiro)
**Invariantes:** INV-02 (arquivo nao muda de lugar)

---

## O que esta fase entrega

Tres ponteiros novos, de skills que hoje tomam decisao de design de modulo sem alcancar nenhum
vocabulario de seam.

Esta fase existe porque DI-06 tem uma consequencia: uma referencia so e alcancada por quem aponta
para ela. Skill model-invoked se anuncia sozinha; referencia nao. Se o material novo ficar
alcancavel apenas de dentro de `tdd-workflow`, `anti-vibe-review` e `verify-work`, ele so aparece
durante TDD ou review — nunca durante design.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/architecture/SKILL.md`
- `skills/design-twice/SKILL.md`
- `skills/code-simplification/SKILL.md`

**FORA do escopo**
- Os 3 ponteiros existentes (`tdd-workflow:119`, `anti-vibe-review:95`, `verify-work:170`) — ja
  resolvem e nao mudam
- Conteudo da referencia (fase-01)
- O 5o dominio do `design-twice` (fase-03) — esta fase so adiciona o ponteiro nele

---

## Implementacao

### Passo 0: escrever cada ponteiro pelas regras do plano01

Ponteiro nao e link. Pelas regras da `writing-for-agents`: front-load a leading word, um trigger
por branch, corte identidade que o alvo ja carrega. Cada linha aqui e paga toda vez que a skill
hospedeira carrega — tres ponteiros ruins custam mais que o material que apontam.

Alvo: **uma linha cada**, nomeando o gatilho especifico daquela skill.

### Passo 1: `architecture`

Dona conceitual de decisao estrutural, e hoje nao alcanca nada de seam. Gatilho: decidir onde uma
fronteira de modulo fica, ou se uma abstracao proposta merece existir.

O ponteiro precisa carregar a regra que mais serve a essa skill: **1 adapter = seam hipotetico,
2 = real** — e o guardrail direto contra a abstracao especulativa que `architecture` e chamada a
avaliar.

### Passo 2: `design-twice`

Ja cita Ousterhout mas nao alcanca a referencia. Gatilho: quando as propostas divergentes forem
sobre interface de modulo, os subagentes precisam nomear as coisas igual.

Este ponteiro tambem prepara a fase-03 — o 5o dominio consome o mesmo vocabulario.

### Passo 3: `code-simplification`

Caca over-engineering e complexidade desnecessaria. Gatilho: decidir se um modulo pass-through deve
ser colapsado.

Aqui o ponteiro carrega o **deletion test**, que e literalmente a ferramenta que falta a essa skill:
deletar o modulo faz a complexidade sumir (era pass-through) ou reaparecer em N callers (estava se
pagando)?

### Passo 4: verificar que cada ponteiro dispara

Ponteiro que nao dispara e context load puro. Para cada uma das 3 skills, descrever um cenario de
uso real e confirmar que o texto do ponteiro cobre aquele caminho. Se nao cobrir, afiar a redacao —
pela regra do plano01, **afia o ponteiro antes de mover o material**.

---

## Gotchas

- **G1** — Tres ponteiros carregando a mesma frase generica ("ver deep-modules.md") sao duplicacao
  com custo triplo e disparo nenhum. Cada um nomeia o gatilho **daquela** skill.
- **G2** — `harness:validate` checa links markdown. Caminho relativo a partir de
  `skills/<nome>/SKILL.md`, nao da raiz.
- **G3** — Nao inchar a description das 3 skills. O ponteiro vai no **corpo**; description e o
  material mais caro do repo (15.149 chars medidos no plano01) e nao e onde isso mora.
- **G4** — `design-twice` recebe ponteiro nesta fase e 5o dominio na fase-03. Sao dois toques no
  mesmo arquivo — reler antes do segundo (Edit falha silenciosa contra contexto desatualizado).

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde (link-check passa nos 3)
- [ ] Cada ponteiro tem no maximo 1 linha
- [ ] Cada ponteiro nomeia gatilho distinto — zero frase repetida entre os 3 (G1)
- [ ] Nenhuma `description` de frontmatter foi tocada (G3)
- [ ] Cenario de disparo descrito e conferido para cada um (Passo 4)

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` exit 0
- `git diff` mostra exatamente 3 arquivos, so no corpo, zero mudanca em frontmatter
- Cada arquivo ganhou ≤ 1 linha

**Por humano:**
- Ler os 3 ponteiros em sequencia e nao encontrar a mesma frase duas vezes
- Para cada skill, conseguir nomear a situacao concreta em que aquele ponteiro dispara

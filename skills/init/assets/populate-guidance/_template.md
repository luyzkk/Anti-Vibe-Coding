# Guidance: {DOC_PATH}

> Prosa interpretativa. NAO lida em runtime — referenciada via `guidanceFile` no FasePlanInput.

## What this doc is for

{Para que o doc serve, em 1-2 paragrafos. Quem le, quando consultar, qual pergunta ele responde.}

## Espirito do doc

{Tom esperado: descritivo vs aspiracional, denso vs introdutorio, gerado vs narrativo. 1 paragrafo.}

## Sinais a procurar no codebase

{Bullets com greps/globs e o que cada um indica. Espelha detectionSignals em prosa,
explicando POR QUE cada sinal eh relevante para popular este doc.}

- `{signal}` — {por que este sinal importa para este doc}
- `{signal}` — {por que este sinal importa para este doc}

## Por H2 — o que escrever

{Subsecao por cada item de sectionsToWrite. O numero de H3 DEVE ser identico ao numero de
items em sectionsToWrite da entrada em populate-instructions-table.ts.}

### {sectionsToWrite[0]}
{Prosa: 1 paragrafo do que esta H2 deve cobrir. Inclua gotchas especificos se houver.}
**Cubra:** {1 linha resumindo os itens de mustCover desta secao}
**NAO escreva:** {1 linha — itens que pertencem a outro doc}

### {sectionsToWrite[1]}
{...}

## Stack-specific (incluir apenas se o doc tem stackVariants em populate-instructions-table.ts)

### Rails
{1 paragrafo do que muda no contexto Rails para este doc.}

### Next + React
{1 paragrafo do que muda no contexto Next.js para este doc.}

### Node + TypeScript
{1 paragrafo do que muda no contexto Node-TS para este doc.}

## Links obrigatorios

{Prosa explicando POR QUE cada link em linkTargets eh necessario para este doc.}

## Quando deixar TODO

{Convencao: `TODO(<owner/context needed>): ...` quando a LLM nao tem contexto suficiente.
Especifique quais contextos sao aceitaveis (verificar com dev, grep nao retornou resultado)
vs quais NAO sao (inventar um valor, assumir comportamento nao verificado).}

## Anti-patterns

{Bullets concretos do que NAO fazer neste doc especifico. Evite genericos — cada anti-pattern
deve ser especifico o suficiente para que alguem saiba que violou a regra.}

- NAO {anti-pattern especifico com consequencia concreta}
- NAO {anti-pattern especifico com consequencia concreta}

---

> **Convencao para drift test:** as subsecoes `### {nome}` dentro de `## Por H2 — o que escrever`
> DEVEM bater 1:1 com as chaves de `mustCover` no `populate-instructions-table.ts`.
> Test `populate-guidance-drift.test.ts` valida essa simetria automaticamente.
> Case-sensitive. Espacos e caracteres especiais sao literais. Subsecoes extras devem usar H4 (`#### `).

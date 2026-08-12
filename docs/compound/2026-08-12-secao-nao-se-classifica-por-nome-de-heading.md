---
title: "Secao de SKILL.md nao se classifica por nome de heading — a maior entrada do achado era 98% fonte unica"
category: processo
tags: [auditoria, skills, skill-md, heading, falso-positivo, medicao, subagente]
created: 2026-08-12
---

## Problem

A auditoria das 40 skills produziu o achado sistemico **S1 — "secoes terminais que reescrevem os
steps"**: 28 secoes em 21 skills, 28.281 chars, agrupadas por nome de heading (`## Regras`,
`## Regras Importantes`, `## Pipeline Integration`, `## Interaction with Other Skills`...). A tabela
era ordenada por tamanho, e a maior entrada era `verify-work ## Pipeline Integration`, 6.036 chars —
24% do pool, o alvo obvio para o primeiro corte.

Medida subsecao a subsecao, **141 chars dela eram reprojecao** — o ponteiro de Learn Point, twin do
`## Step 5`. Os outros 5.895 sao fonte unica:

| Subsecao | Chars | Twin no corpo |
|---|---|---|
| `### Cleanup de Artefatos — Arquivamento do PRD` | 4.331 | nenhum (91 linhas de procedimento) |
| `### 0. Importar Contexto de Pipeline` | 646 | `SUMMARY.md` nao aparece no corpo |
| `### Ao Finalizar a Verificacao` | 632 | `/commit`, `/push`, `/open-pr` nao aparecem |
| `### Escape Hatches` | 257 | `standalone` nao aparece |
| `### Learn Point` | 141 | **`## Step 5`** |

Cortar em bloco teria removido o procedimento de arquivamento do PRD inteiro.

O padrao real: **`## Pipeline Integration` nao e reprojecao dos steps — e o contrato de pipeline da
skill** (de onde le, onde escreve, o que vem depois, como escapar). No `write-prd` ele por acaso
duplicava o corpo, porque aquela skill tambem detalha import/save dentro dos Steps 5 e 6. Nas
outras, e o unico lugar que diz. Quatro secoes com o mesmo heading, funcoes diferentes.

O mesmo achado errou em duas outras direcoes:

- A subcategoria "reprojecao pura — deletar e seguro" citava 3 exemplos como prova. **Os tres tinham
  residuo de fonte unica.** Em `write-prd`, os "4 de 4 itens com twin" contavam as 4 subsecoes
  numeradas e paravam antes do `### Escape Hatches`, que fica na mesma secao e tem 3 regras sem twin.
  Em `update`, a contagem "7 de 8" era 6 de 8.
- O ratio geral de reprojecao, quando medido item a item nas secoes que de fato eram S1, deu **56%**,
  nao os ~90% que a categoria supunha.

Os outros 5 achados sistemicos da mesma auditoria projetaram com precisao quase exata. A diferenca:
eles contavam **bytes de bloco literal**; o S1 estimava o efeito de **reescrever prosa**.

## Solution

Classificar por conteudo, item a item, com twin nomeado por linha:

1. Listar cada item/subsecao da secao candidata.
2. Para cada um, achar a linha do corpo que diz a mesma coisa. Anotar o numero.
3. Cortar **so** item com linha-twin nomeada. Item com "conceito presente em algum lugar" fica.
4. Promover o residuo para junto do step a que pertence, em vez de deixar stub de um item so.

Se a secao tem subsecoes (`###`), medir cada uma separado — a media da secao esconde blocos inteiros
de fonte unica, que foi exatamente o que aconteceu com `### Escape Hatches` e `### Cleanup`.

## Prevention

- **Nome de heading agrupa, nao classifica.** Um achado sistemico montado por `grep '^## '` produz
  um pool, nao uma categoria — o pool ainda precisa ser lido.
- Desconfiar da **maior entrada** primeiro, nao por ultimo. Secao grande sob heading generico e o
  lugar mais provavel de conteudo operacional ter sido encostado.
- **Re-medir o pool antes de abrir o lote.** Entre a auditoria e a execucao, os lotes anteriores
  consumiram 2.754 chars do S1 e 3 das 28 secoes — mesmo efeito que o achado S5 sofreu no lote 7.
- **"Terminal" tambem era falso.** So 4 das 25 secoes ficavam no fim do arquivo; as outras estao no
  meio. O rotulo do achado descrevia uma amostra, nao a populacao.
- Complementa `docs/compound/2026-08-11-skill-md-code-block-can-be-load-bearing.md`: la o sinal
  enganoso era "nao tem gatilho em hooks.json"; aqui e "tem o mesmo heading". Nos dois casos, um
  sinal barato foi usado como prova de uma propriedade que so leitura estabelece.

## Affected files

- `docs/exec-plans/active/2026-08-10-mattpocock-skills-import/plano01/AUDIT-REPORT.md` — §S1 com as
  duas correcoes, §Descartados com `verify-work` registrado para nao ser re-sugerido
- `docs/exec-plans/active/2026-08-10-mattpocock-skills-import/plano01/MEMORY.md` — DIs
  `5a-subtipo1-nao-existe`, `5b-verify-work-e-falso-positivo`, `5b-ratio-real-56-porcento`
- `skills/verify-work/SKILL.md:377-510` — a secao que nao foi tocada

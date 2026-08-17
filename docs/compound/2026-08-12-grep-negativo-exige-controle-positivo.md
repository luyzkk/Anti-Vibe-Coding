---
title: "Zero resultados no grep vira achado so depois de um controle positivo — \\| com -E e pipe literal"
category: armadilha
tags: [grep, regex, ere, bre, verification, false-negative, auditoria]
created: 2026-08-12
---

## Problem

No lote 5a do plano01, eu verificava se cada item de uma secao `## Regras` tinha um "twin" no corpo
da skill — se tinha, o item era reprojecao e podia sair; se nao, era fonte unica e ficava.

Rodei a busca com alternancia:

```bash
grep -n -i -E "nao gera\|NAO gera\|nao propoe" arquivo.md    # → vazio
grep -n -i -E "genuinamente diferentes\|variacoes" arquivo.md # → vazio
```

Dois itens voltaram vazios. Conclui que a auditoria tinha superestimado os twins ("11 de 12" seria
na verdade "9 de 12") e quase registrei isso como claim falso do relatorio.

Os twins existiam — `design-twice:112` e `:108`, ambos quase verbatim. **`grep -E` usa ERE, onde
`\|` e um pipe LITERAL**, nao alternancia. O padrao procurava a string
`nao gera|NAO gera|nao propoe` inteira, que obviamente nao existe em lugar nenhum. Em BRE (o
`grep` sem `-E`) e o contrario: `\|` alterna e `|` e literal.

O resultado e um **falso negativo silencioso**: o grep nao erra, nao avisa, so retorna nada. E
"nada" era exatamente a resposta que confirmaria minha hipotese — o que torna o erro
auto-confirmante. Se eu estivesse procurando prova de presenca, teria estranhado o vazio; procurando
prova de ausencia, o vazio parecia sucesso.

Custo se tivesse seguido: 2 itens com twin real seriam preservados como "fonte unica" (inofensivo)
— mas o relatorio ganharia uma acusacao falsa contra a auditoria, e a proxima pessoa gastaria a
verificacao de novo.

## Solution

Antes de tratar um grep vazio como achado, rodar o mesmo padrao contra um caso **conhecidamente
positivo**:

```bash
# controle: o termo isolado acha alguma coisa?
grep -c "NAO gera" arquivo.md        # → 1, entao o arquivo tem o conteudo
grep -c -E "a|b" arquivo.md          # sintaxe ERE correta: pipe sem escape
```

Regra de sintaxe: `-E` usa `|`; sem `-E` usa `\|`. Nunca misturar. Em caso de duvida, buscar cada
termo separadamente — mais lento, sem armadilha de sintaxe.

Quando a busca e por ausencia num corpo grande, preferir ler a regiao. Neste mesmo lote, o que
resolveu foi abrir `design-twice:95-138` e ver os dois itens com os olhos.

## Prevention

- **Achado negativo por grep so vale depois de provar que o mesmo grep acha um caso positivo
  conhecido.** Ausencia de evidencia com ferramenta nao validada nao e evidencia de ausencia.
- Suspeitar especialmente quando o vazio **confirma** a hipotese em teste. Grep que devolve o que
  voce esperava merece mais checagem, nao menos.
- Complementa `docs/compound/2026-06-05-grep-c-alternation-counts-import-line.md`, que cobre a
  direcao oposta — alternancia **inflando** contagem (falso positivo). Juntas: alternancia em grep
  erra nos dois sentidos, e nenhum dos dois erros faz barulho.
- Relacionado: `docs/compound/2026-04-21-grep-c-exit-1-quando-zero.md` (exit code 1 quando o count
  e zero).

## Affected files

- `docs/exec-plans/completed/2026-08-10-mattpocock-skills-import/plano01/MEMORY.md` — DI
  `DI-Plano01-fase04-5a-meu-grep-quebrado`
- `docs/exec-plans/completed/2026-08-10-mattpocock-skills-import/plano01/AUDIT-REPORT.md` — §Onde a
  auditoria errou, com a nota de que a regra vale para quem verifica tambem

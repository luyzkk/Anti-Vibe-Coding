---
title: "`bun test <diretório>` trunca em silêncio quando um arquivo chama `process.exit` no topo"
category: armadilha
tags: [bun, testes, runner, falso-verde, process-exit, cjs, verificacao]
created: 2026-09-10
---

## Problem

`bun test tests/hooks/` imprimia isto e saía com código **0**:

```
tests\hooks\pre-tool-use-destructive-guard.test.cjs:
pre-tool-use-destructive-guard: 30/30 passed
```

Um arquivo. O diretório tinha **sete**. Os outros seis nunca rodaram, e nada na saída dizia isso.

A suspeita inicial era a barra final no caminho, ou o bun tratar argumentos posicionais como filtro
de substring em vez de diretório. As duas estavam erradas:

- sem a barra, o resultado é idêntico;
- `bun test tests/e2e` roda os 25 arquivos daquele diretório sem problema.

A causa é outra, e não tem nada a ver com caminhos. O arquivo `.cjs` daquele diretório **não é um
arquivo de teste do bun**: é um script standalone que assere, imprime e termina com `process.exit(0)`
no topo do escopo. O bun o adota como arquivo de teste porque o nome casa `*.test.cjs`, executa,
e o `process.exit` **mata o processo inteiro** antes dos outros arquivos do lote rodarem. Saída 0,
porque foi um exit deliberado com sucesso.

Havia um segundo defeito por trás desse, e maior: os `PATTERNS` do `scripts/run-tests.ts` só casavam
`.ts` e `.tsx`, então **quatro arquivos de teste do plugin nunca rodavam na suíte** — o do guard
destrutivo e os três de `hooks/`. Falsa confiança nas duas pontas: quem rodava a suíte não executava
esses arquivos, e quem rodava o diretório executava só um deles.

## Solution

`scripts/run-tests.ts` passou a coletar também os `*.test.cjs` e a mandar cada um para o runner que
sabe executá-lo. A extensão não diz qual é: a classificação é por **conteúdo**.

Neste repo os `.test.cjs` vêm em três formas:

| Forma | Como reconhecer | Runner |
|---|---|---|
| `bun:test` | importa ou requer `bun:test` | entra nos lotes do `bun test` |
| `node:test` | usa o runner embutido do node | `node <arquivo>`, processo próprio |
| script puro | assere, imprime e chama `process.exit` | `node <arquivo>`, processo próprio |

Rodar cada script no **próprio processo** é o que torna o `process.exit` correto ali em vez de
destrutivo: ele encerra apenas a si mesmo, e o código de saída vira o veredito daquele arquivo.

A primeira versão do conserto mandava os quatro para o `node` e quebrou o que usa `bun:test`, com
`Cannot find module 'bun:test'`. **Foi rodar a suíte que mostrou o erro de desenho**, não a revisão.

## Prevention

- **A suíte se roda com `bun run test`.** A forma por diretório é segura só enquanto não houver um
  `.cjs` dessa família ali dentro, e ninguém percebe quando deixa de ser.
- O script `test:e2e` ainda usa a forma por diretório. Existe um teste que falha se algum `.cjs`
  aparecer em `tests/e2e/`, com a instrução de trocar por enumeração explícita antes de adicioná-lo.
  Guard falsificável vale mais que nota que ninguém lê.
- **Sinal geral:** runner que executa arquivos no mesmo processo é vulnerável a qualquer arquivo que
  chame `process.exit`. Quando o mesmo diretório mistura scripts standalone e arquivos de runner, a
  ordem de execução decide quanto da suíte roda — e o resultado é verde nos dois casos.
- Ao ampliar o padrão de coleta de testes, confira o que ele passa a arrastar: `**/*.test.cjs` sem
  prefixo traria 130+ arquivos de `claude-code/`, que é material arquivado e não é deste plugin.

## Affected files

- `scripts/run-tests.ts` — coleta, classificação por conteúdo e execução por processo
- `scripts/run-tests.test.ts` — os testes da coleta, da classificação e do guard de `tests/e2e/`
- `AGENTS.md` e `CLAUDE.md` — a regra curta, na seção Validation
- `tests/hooks/pre-tool-use-destructive-guard.test.cjs` — o script standalone que revelou o caso

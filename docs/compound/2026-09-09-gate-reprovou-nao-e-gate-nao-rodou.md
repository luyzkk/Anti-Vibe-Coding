---
title: "Num gate, \"reprovou\" e \"não pôde rodar\" nunca compartilham ramo — e a mensagem não pode ensinar o bypass"
category: armadilha
tags: [hooks, gate, fail-open, pre-commit, mensagem-de-erro, bypass, enforcement]
created: 2026-09-09
---

## Problem

Duas armadilhas de desenho de gate apareceram no mesmo dia, no mesmo arquivo de hooks.

**A primeira: um ramo só para dois casos diferentes.** O pre-commit rodava a suíte dentro de um
`try` e tratava qualquer exceção como "os testes falharam":

```js
try { execSync('bun run test'); execSync('bun run lint') }
catch (e) { process.stderr.write('[PRE-COMMIT] Testes ou lint falharam...'); process.exit(2) }
```

O `bun run lint` não existe neste repo. Enquanto o hook estava morto por outro motivo, isso era
inofensivo. No dia em que voltasse a funcionar, o erro de **script ausente** cairia no mesmo ramo de
**teste vermelho**, e todo commit do repositório passaria a ser bloqueado por uma causa que a
mensagem descreveria errado.

O mesmo vale para timeout sob carga: a suíte que demora demais é morta, o `execSync` lança, e o gate
bloqueia dizendo que os testes falharam quando eles nem terminaram.

**A segunda: a mensagem entregava a receita do bypass.** O gate que congela o teste durante o GREEN
bloqueava assim:

```
Se precisa modificar testes, volte para fase RED: atualize .claude/.tdd-phase.json
```

O arquivo citado é exatamente o que faz o bloqueio. O gate explicava ao agente restringido como se
soltar, e quem está sob a âncora tem Bash na mão.

## Solution

Para a primeira: **ramos separados, com direções opostas**. Rodou e reprovou bloqueia. Não conseguiu
rodar permite, com diagnóstico. A distinção mora no adaptador de I/O (`err.code === 'ENOENT'`,
`err.killed`, `err.signal`, saída com "Script not found"), e a decisão em si virou função pura com o
executor injetado, testável sem rodar 2200 testes dentro de um teste.

Para a segunda: a mensagem passou a dizer o que fazer sem dizer como desarmar.

```
Se o teste precisa mudar, o RED estava errado: pare e peça ao orquestrador para voltar a fase.
Quem arma e desarma a âncora é o orquestrador, nunca quem está sob ela.
```

Junto veio a terceira regra da mesma família: o `catch` final continua permitindo, porque hook
quebrado não pode travar o trabalho, mas **parou de ser mudo**. Falha aberta sim, falha calada não.

## Prevention

- Todo gate tem pelo menos três desfechos, não dois: **passou**, **reprovou**, **não pôde avaliar**.
  Juntar os dois últimos num ramo só troca um falso negativo por um falso positivo, e a mensagem
  passa a mentir sobre a causa.
- Escreva a decisão do gate como função pura com o executor injetado. Sem isso, o ramo "não pôde
  rodar" não tem como ser testado, e é justamente ele que fica anos sem exercício.
- **Mensagem de erro de mecanismo de disciplina não pode conter a instrução que o desarma.** Diga o
  que fazer e a quem pedir; nunca onde está a chave.
- Fail-open é a escolha certa para gate de disciplina e a errada para controle de segurança. Nos dois
  casos, silêncio é errado.

## Affected files

- `hooks/lib/precommit-decision.cjs` — a decisão pura, com os ramos separados
- `hooks/pre-commit-suite.cjs` — o adaptador que distingue "reprovou" de "não rodou"
- `hooks/lib/fail-open.cjs` — a política de falha aberta ruidosa, compartilhada pelos gates
- `hooks/tdd-gate.cjs` — a mensagem que parou de ensinar o bypass
- `tests/hooks/precommit-decision.test.ts` e `tests/hooks/tdd-gate-anchor-and-root.test.ts`
- `docs/design-docs/ADR-0023-honestidade-config-tdd-gate.md` — decisões T-1 e T-2
- Nota irmã: `2026-09-09-config-morta-e-mentira-que-falha-abrindo.md`

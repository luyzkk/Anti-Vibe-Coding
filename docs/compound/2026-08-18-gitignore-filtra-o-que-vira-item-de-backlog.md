---
title: "O .gitignore decide o que vira item de backlog — o mesmo defeito, silenciado, nao entra no registro"
category: armadilha
tags: [gitignore, testes, side-effect, backlog, working-tree, flake, tmpdir, observabilidade]
created: 2026-08-18
---

## Problem

Dois testes deste repo tinham **o mesmo defeito**: rodavam contra o repo vivo em vez de `os.tmpdir()`,
e escreviam dentro dele. Um virou item de `TODO.md` em 2026-05-13 e foi discutido por meses. O outro
nunca foi notado por ninguem.

A unica diferenca entre eles e onde o arquivo caia:

| Teste | O que escrevia no repo | Estava no `.gitignore`? | Virou item? |
|---|---|---|---|
| `state-md-generator` + 3 outros | `tests/fixtures/**` | Nao | **Sim**, 2026-05-13 |
| `registry.test.ts` | `.claude/stack.json` | **Sim** (L40) | Nao |

O primeiro sujava `git status` a cada `bun run test` — cinco arquivos modificados atrapalhando todo
commit. Impossivel ignorar, entao virou item, com criterio de aceite e tudo.

O segundo escrevia `primary: nodejs-typescript` no `.claude/stack.json` do repo de dev a cada run.
Como o caminho esta no `.gitignore`, **`git status` nunca mostrou nada**. O side effect existiu por
meses sem deixar rastro no unico lugar onde o dev olha.

E ele nao era inofensivo: o proprio teste lia esse arquivo uma linha depois (Step 11
`final-validation` lanca `AbortError` se ha stack detectada sem `.claude/knowledge/INDEX.md`), o que
o deixava **flaky ~1 em 6 runs** da suite completa. O flake so foi diagnosticado porque eu tropecei
nele enquanto validava o criterio de aceite do *outro* item — e a primeira coisa que fiz foi
registra-lo com a causa errada ("outros testes escrevem na mesma raiz"), quando o poluidor era ele
mesmo.

O `.gitignore` existe para tirar ruido do `git status`. O efeito colateral e que ele tambem **tira do
campo de visao qualquer defeito cujo sintoma caia ali dentro** — e `git status` e, na pratica, o
detector de side effect que mais roda neste projeto.

## Solution

O fix dos dois e o mesmo: `os.tmpdir()` por teste, com `try/finally`. No `registry.test.ts` os Steps
9-12 passaram a receber um tmpdir compartilhado — inclusive o Step 12, que ja tinha ganho esse
tratamento sozinho em 2026-05-25 pelo mesmo motivo, sem que ninguem estendesse aos irmaos.

A verificacao que mais convenceu **nao foi a contagem de runs verdes** (10 suites limpas contra uma
taxa-base de ~1/6 dao so ~84% de confianca). Foi observar que `.claude/stack.json` **nao reapareceu
em nenhuma das 10** — medicao direta do mecanismo, nao do sintoma. Contra flake, contar verde e
fraco; observar a causa sumir e forte.

## Prevention

- **Ao corrigir um teste que escreve no repo, procurar os irmaos pelo caminho que ele escreve, nao
  pelo sintoma no `git status`.** Um `grep` por `process.cwd()` nos testes acha os dois; `git status`
  acha so um.
- **Teste que recebe `cwd` deve receber tmpdir, sem excecao.** Nao existe "esse so le" — o Step 10
  aqui era descrito como leitura e escrevia `stack.json` no caminho recebido.
- **Correcao pontual em um step pede varredura nos vizinhos.** O Step 12 foi movido para tmpdir em
  2026-05-25 e os Steps 9-11 ficaram tres meses para tras no mesmo arquivo, com o mesmo defeito, sob
  o mesmo comentario explicando o porque.
- **Caminho no `.gitignore` merece verificacao explicita de side effect,** justamente porque nenhum
  sinal passivo vai denunciar. Listar o que a suite cria ali (`ls` antes/depois) vale mais que
  qualquer quantidade de runs verdes.
- **Ao registrar um flake, escrever a causa como hipotese ate medir.** Registrei "outros testes
  escrevem na mesma raiz"; era o proprio teste, com a janela aberta uma linha antes de ser explorada
  (`docs/compound/2026-08-18-reavaliar-numero-nao-medido-com-outro-nao-medido.md`).
- **Confianca em fix de flake vem de ver a causa sumir, nao de contar execucoes verdes.**

## Affected files

- `skills/init/lib/registry.test.ts` — o teste silencioso, hoje em tmpdir
- `skills/init/lib/steps/10-final-validation.ts` — le `.claude/stack.json` do `cwd` e aborta
- `.gitignore` L40 — a linha que tornou o side effect invisivel
- `docs/compound/2026-08-18-item-de-backlog-nomeia-o-site-que-gritou.md` — irma: la e *qual arquivo* entra no registro, aqui e *se* o defeito entra
- PR #44 (drift visivel) e PR #47 (side effect silencioso) — os dois fixes

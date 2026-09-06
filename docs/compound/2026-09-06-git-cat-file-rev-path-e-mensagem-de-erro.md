---
title: "Perguntar ao git se um path existe num rev: `cat-file -e` mente e a mensagem de erro e traduzida"
category: armadilha
tags: [git, cat-file, ls-tree, i18n, exit-code, route-auth-matrix, security-auditor]
created: 2026-09-06
---

## Problem

O `readAtBaseFromGit` precisa responder tres coisas diferentes sobre um arquivo no merge-base:
existe (`found`), nao existe (`absent`), ou nao deu para olhar (`unavailable`). As duas primeiras
tentativas de decidir "nao existe" falharam por motivos diferentes:

**1. `git cat-file -e <sha>:<file>` nunca devolve exit 1 para path ausente.** A documentacao promete
exit 1 quando o objeto nao existe, e o teste `returns absent for a file that does not exist at the base`
recebia `unavailable`. Causa raiz: com a forma composta `rev:path`, o **parser de revisao** do git morre
com `die()` — exit **128**, `fatal: path 'x' does not exist in 'sha'` — ANTES de chegar na logica que
devolveria 1. O exit 1 documentado vale para um SHA bem-formado que nao existe, nao para `rev:path`.
Medido em git 2.53.0.

**2. Ler a mensagem de erro do `git show` para classificar tambem nao serve.** O fix seguinte procurava
`does not exist in` / `but not in` no stderr. Funciona em ingles. O git **traduz** `fatal:` quando ha
catalogo i18n e `LANG` definido (nao neste Git for Windows 2.53.0, medido com `LC_ALL=pt_BR.UTF-8`, mas
sim em Linux com i18n instalado). Numa maquina traduzida, todo arquivo ausente na base viraria
`unavailable` — nao e silencio, mas e ruido sistematico que ninguem ia entender.

## Solution

**`git ls-tree <sha> -- <file>`** responde a mesma pergunta **por contrato, nao por texto**:

- exit 0 + stdout **vazio** = o path nao esta naquela arvore → `absent`
- exit 0 + blob listado = existe → `found` (segue para o `git show`)
- exit 128 = arvore invalida / ref irresolvivel → `unavailable`

Os tres comandos do leitor viraram `merge-base` → `ls-tree` → `show`. Nenhum deles depende de casar
string na saida do git.

## Prevention

**Regra: nunca classificar um resultado de `git` pela mensagem de erro.** Mensagem de `git` e
localizavel e muda entre versoes. Se a decisao importa, existe quase sempre um comando que responde por
codigo de saida ou por stdout estruturado — procure ele antes de escrever um `includes('fatal:')`.

**Regra: exit code documentado vale para a forma do argumento que a doc descreve.** `cat-file -e <sha>`
e `cat-file -e <sha>:<path>` sao caminhos diferentes dentro do git; so o primeiro cumpre o exit 1. Medir
o comando na forma exata que voce vai usar custa um minuto e vale mais que a man page.

**Sinal de alerta:** teste de integracao que recebe o estado "nao consegui" onde esperava "nao existe".
Sao estados com consequencias opostas — em auditor de seguranca, "nao existe na base" significa
*nada a perder* e "nao consegui ler" significa *indeterminada*. Confundir os dois inverte o veredito.

## Affected files

- `skills/security/lib/route-auth-matrix.ts` (`readAtBaseFromGit`: merge-base → ls-tree → show)
- Descoberta em: `docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/plano02/MEMORY.md`
  (BUG-fase03-1, DI-fase03-1, DI-fase03-2) — Plano 02 fase-03, PR #75
- Consumido pelo Plano 03 (G2) sem alteracao: PR #76
- Nota irma: [2026-09-06-absent-nao-e-unavailable-leitura-de-tres-estados.md](./2026-09-06-absent-nao-e-unavailable-leitura-de-tres-estados.md)

---
title: "`grep -c '^-[^-]'` nao conta remocao de bullet markdown — o guard de 'nunca diminuir' falha aberto"
category: armadilha
tags: [git-diff, grep, markdown, guard, agents-md, fail-open, checklist]
created: 2026-09-06
---

## Problem

Edicao em arquivo de agente (`agents/*.md`) segue a regra **"nunca diminuir"**: so acrescentar, exceto
remocao declarada e justificada. O checklist verificava assim:

```bash
git diff agents/security-auditor.md | grep -c '^-[^-]'    # esperado: 2
```

O `[^-]` existe para descartar o header `--- a/agents/security-auditor.md`. Parece certo.

O comando devolveu **1**, com **duas** linhas removidas. A remocao era um bullet markdown:

```
- Entrada em `delta.removed` e rota que PERDEU a declaracao de publica. Se o arquivo dela nao esta no
   diff, a lib nao a reavaliou nesta versao (escopo G1) — aponte isso no bloco; o G2 (Plano 03) fecha.
```

A primeira linha ja comeca com `- ` no arquivo. Sob o marcador `-` do diff ela vira `-- Entrada em ...`,
e o `[^-]` — que existe para pular o header — pula **ela tambem**. So a segunda linha (continuacao
indentada, `-  diff,`) foi contada.

O perigo nao e o numero errado. E a **direcao** do erro: o guard existe para detectar remocao nao
autorizada, e ele **subconta remocoes**. Falha aberto. Num arquivo markdown — onde toda lista comeca com
`- ` — as remocoes mais provaveis sao exatamente as invisiveis para o padrao.

## Solution

Contar pelo que o git ja resume, e ler o que saiu:

```bash
git diff --stat agents/security-auditor.md          # "13 insertions(+), 2 deletions(-)"
git diff agents/security-auditor.md | grep -E "^-" | grep -v "^---"   # AS linhas removidas
```

O `--stat` conta certo independente do conteudo. O segundo comando mostra **quais** linhas sairam — que e
o que a revisao precisa julgar de qualquer forma: "duas remocoes" so e aceitavel se as duas forem as
declaradas.

Na fase seguinte, cuja regra era "so insercoes", os tres checks concordaram: `--stat` com `0 deletions`,
`grep -c '^-[^-]'` = 0, e a listagem vazia.

## Prevention

**Regra: guard que conta remocao usa `git diff --stat`, nao regex sobre o diff.** Regex no corpo do diff
colide com a sintaxe do arquivo — `-` em markdown/YAML, `+` em diff embutido, `@@` em documentacao sobre
git.

**Regra: guard tem que falhar fechado.** Ao escrever um check de "nao pode diminuir", perguntar: se o
padrao errar, ele acusa de menos ou de mais? Se acusa de menos, o guard e pior que nao ter guard — da
sensacao de cobertura e deixa passar. Preferir o check que gera falso positivo e obriga a olhar.

**Sinal de alerta:** contagem de guard que nao bate com a expectativa do documento. A resposta certa e
investigar o padrao, nao ajustar a edicao ate o numero fechar. Aqui o executor reportou a divergencia em
vez de "consertar" a remocao — foi o que expos o ponto cego.

**Relacionado:** [2026-05-12-validator-regex-hits-comments.md](./2026-05-12-validator-regex-hits-comments.md)
(regex de quality-gate casando comentario) e
[2026-04-21-grep-c-exit-1-quando-zero.md](./2026-04-21-grep-c-exit-1-quando-zero.md) (`grep -c` sai 1 com
zero matches). Mesma familia: `grep` em pipeline de verificacao tem mais arestas do que parece.

## Affected files

- Checklist de `docs/exec-plans/completed/2026-09-02-route-auth-matrix-audit/plano03/fase-02-delta-e-veredito-cobertura-perdida.md`
  (item G13) — o padrao defeituoso
- Descoberto em: `docs/exec-plans/completed/2026-09-02-route-auth-matrix-audit/plano03/MEMORY.md`
  (GT-fase02-diff-bullet) — PR #76
- Nota irma: [2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md](./2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md)

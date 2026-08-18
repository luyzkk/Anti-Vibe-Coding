---
title: "Item de backlog nomeia o site que gritou — o que falha calado nunca entra no registro"
category: armadilha
tags: [todo, backlog, triagem, crlf, frontmatter, falha-silenciosa, escopo, grep]
created: 2026-08-18
---

## Problem

Dois itens do `TODO.md` foram fechados na mesma sessao. Nos dois, **o arquivo que o item nomeava nao
era o arquivo com o problema** — e nos dois o erro tinha a mesma forma.

**#6 — "validator regex `/^---\n/` rejeita arquivos com CRLF", `{file:scripts/harness-validate.ts}`.**
Esse arquivo era o unico que **nao** estava quebrado: ja tinha `normalize` CRLF→LF antes da regex.
A mesma regex tinha sido copiada para outros quatro lugares. Tres deles nao tinham `normalize`:

| Arquivo | O que acontecia com CRLF |
|---|---|
| `skills/lib/exec-plan-reader.ts` | `splitFrontmatter` caia no fallback `{frontmatter: ''}`, `status` virava `undefined`, `isComplete()` devolvia `false` **sem erro nenhum** |
| `skills/init/lib/atoms-frontmatter-validator.ts` | `missing frontmatter block` |
| `skills/init/lib/compound-writer.ts` | `Frontmatter YAML ausente` |
| `skills/init/assets/templates/scripts/harness-validate.ts.tpl` | validador **distribuido** ficou 3 meses atras da correcao que o repo ja tinha |

**#1 — "refatorar testes para usar `os.tmpdir()`", `{file:hooks/state-md-hook.test.cjs,skills/lib/state-md-generator.test.ts}`.**
Eram **quatro** arquivos de teste sujando o working tree, nao dois. E os dois nao-nomeados sujavam de
um jeito pior: o `beforeEach` fazia `rmSync` na pasta versionada e a reconstruia, entao os `.md`
commitados ali eram **saida de teste** — nunca foram entrada.

O mecanismo e o mesmo nos dois, e nao e decaimento temporal: **o item foi escrito a partir do sintoma
que apareceu.** Em #6, o que apareceu foi `active-storage.md` sendo rejeitado pelo `harness-validate`
— entao foi o `harness-validate` que entrou no registro. Os outros tres falhavam calados, ninguem
observou, ninguem escreveu. O pior deles nem lanca excecao: devolve resposta errada.

O custo de confiar: **fechar o item e sentir que acabou.** Em #6 isso ja tinha acontecido uma vez — a
correcao de 2026-05-19 foi aplicada na copia onde o sintoma aparecia, e o `.tpl` que o plugin entrega
ao usuario ficou quebrado por tres meses sem nada denunciar
(`docs/compound/2026-08-13-suite-verde-nao-exercita-validador-distribuido.md`).

Isto e **irmao**, nao duplicata, de
`docs/compound/2026-08-17-doc-de-planejamento-e-hipotese-medir-antes-de-editar.md`. La o mecanismo e
decaimento: o numero estava certo na data e envelheceu. Aqui o item ja nascia apontando para o lugar
errado — vies de selecao no que vira registro, nao passagem do tempo. A regra "quando o plano nomeia
N sites, procurar o N+1" pega os dois; a causa e diferente e o gatilho tambem.

## Solution

Nos dois casos a resposta veio do mesmo movimento: **procurar pelo padrao, nao pelo arquivo.**

```bash
grep -rnF '^---\n' --include="*.ts" --include="*.cjs" --include="*.tpl" .
```

Um `grep` de string fixa pela regex — nao pelo nome do arquivo do item — devolveu os cinco sites de
uma vez, incluindo o `.tpl` distribuido que nenhum teste exercita. Para #1, `git ls-files` na pasta
de fixtures mostrou que `lessons-crud-fixture/` tinha **um** arquivo versionado, e ele era o
`_archived/` que o proprio `archive()` gera — prova de que era saida, nao entrada.

Confirmacao de que a leitura estava certa veio de um doc de plano antigo:
`plano06/MEMORY.md` L48 registra o autor original decidindo *"lessons-crud-fixture nao commitado,
fixture eh totalmente efemera, leftovers de `_archived/` foram unstaged antes do commit"*. Vazaram de
volta depois. Remover nao foi decisao nova — foi restaurar a intencao.

## Prevention

- **O `{file:...}` de um item de backlog e onde o sintoma apareceu, nao o escopo do bug.** Tratar como
  ponto de partida da busca, nunca como a lista.
- **Antes de fechar item de bug, procurar pelo padrao com `grep -rF`, nao pelo arquivo.** Se a causa e
  uma regex, uma constante ou uma chamada, ela foi copiada — a pergunta e para quantos lugares.
- **Bug que falha calado nao entra em backlog sozinho.** Ao achar um site que grita, perguntar
  explicitamente: existe um caminho onde isto retorna resposta errada em vez de erro? Foi assim que o
  `exec-plan-reader` apareceu, e era o pior dos tres.
- **Item fechado uma vez pode ter sido fechado so onde doia.** Se o item ja tem um "done" no historico
  e o problema voltou, o primeiro suspeito e uma copia que nunca foi tocada — especialmente `.tpl`,
  template e qualquer coisa que a suite nao executa.
- **Corrigir o item, nao so o codigo.** Reescrever o texto do item com o escopo real ao fechar; senao
  a proxima pessoa que ler o historico herda o mesmo mapa errado.

## Affected files

- `TODO.md` — itens #6 e #1, ambos reescritos no fechamento com o escopo real
- `docs/compound/2026-08-17-doc-de-planejamento-e-hipotese-medir-antes-de-editar.md` — o irmao por decaimento
- `docs/compound/2026-08-13-suite-verde-nao-exercita-validador-distribuido.md` — o `.tpl` que ninguem executa
- `docs/compound/2026-05-19-crlf-breaks-frontmatter-regex.md` — a licao de origem, cuja Prevention prescrevia meia correcao
- PR #44 — os dois commits

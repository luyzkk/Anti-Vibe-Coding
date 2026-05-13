---
title: "After tagging a release, use merge (not rebase) to integrate remote divergence"
category: process
tags: [git, release, tag, merge, rebase]
created: 2026-05-12
---

## Problem

Em Plano 09 fase-05, foi criado tag anotado `v6.0.0` em commit `4c18844` (release commit final). Em seguida, `git push origin main` foi rejeitado:

```
! [rejected]        HEAD -> main (fetch first)
Updates were rejected because the remote contains work that you do not have locally.
```

O remote tinha 2 commits novos vindos de um PR mergeado (docs v5.2 readme). Soluções possíveis:

| Estratégia | Tag `v6.0.0` (em `4c18844`) |
|---|---|
| `git pull --rebase` | **QUEBRA** — rebase reescreve SHAs locais; `4c18844` deixa de existir; tag aponta para commit órfão |
| `git pull --no-rebase` (merge) | **PRESERVA** — cria merge commit; `4c18844` permanece no histórico; tag continua válido |
| `git push --force` | **DESTRUTIVO** — sobrescreve trabalho do PR no remote |

## Solution

`git pull --no-rebase --no-edit origin main` cria um merge commit. O SHA do release commit (`4c18844`) não muda. O tag continua apontando para o release real.

Conflito trivial em README.md (legacy paths vs v6 paths) resolvido manualmente, merge committed, push aceito. Tag `v6.0.0` pushed depois com `git push origin v6.0.0`.

## Prevention

- **Tag anotado em commit local + remote divergente → merge, não rebase.** Regra mecânica, sem exceção.
- A relação tag→commit é por SHA. Qualquer operação que reescreva SHA (rebase, amend, filter-branch) invalida tags que apontam para o commit reescrito.
- O tag fica no working tree local até o `git push origin <tag>` — então um rebase pré-push silenciosamente quebra o tag sem aviso. Verificar `git tag -l --points-at <sha>` antes de rebasear se houver tag suspeito.
- Para releases públicos, tag deve ser criado **depois** que o push do commit de release foi aceito — invertendo a ordem (push commit → tag → push tag) elimina o cenário de divergência pós-tag inteiramente.
- Se a regra "tag depois do push" for esquecida e divergência ocorrer: merge. Aceitar o merge commit é o custo de manter o release auditável.

## Affected files

- Cenário em: super-repo `f:/Projetos/Claude code/anti-vibe-coding/` (submódulo) — release v6.0.0
- Commit de merge: `75adc0e` (`Merge branch 'main' of github.com/luyzkk/Anti-Vibe-Coding`)
- Tag preservado: `v6.0.0` → `4c18844`
- Discovery durante push pós-fase-05 (não capturado em MEMORY.md do Plano 09 porque ocorreu na etapa de release pública, fora do escopo do plano)

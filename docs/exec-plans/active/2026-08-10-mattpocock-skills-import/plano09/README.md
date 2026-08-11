# Plano 09: `resolving-merge-conflicts`

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 2
**Sizing total:** ~3h
**Depende de:** plano01 fase-01 (a lente)
**Branch:** `feat/resolving-merge-conflicts`

---

## O que este plano entrega

A skill que falta para o estado "estou preso no meio de um merge".

`git-workflow-and-versioning` (377 linhas) menciona conflito de merge **apenas como motivo para
manter branches curtas** — nunca como resolver um. Zero `--abort`, zero `--theirs`. Verificado.

---

## A skill da fonte, em cinco passos

1. Ver o estado real do merge/rebase — historico e arquivos em conflito
2. **Achar as fontes primarias de cada lado.** Entender por que cada mudanca foi feita e qual era a
   intencao original — mensagens de commit, PRs, issues
3. Resolver hunk por hunk. **Preservar as duas intencoes onde der.** Onde incompativeis, escolher a
   que casa com o objetivo declarado do merge e anotar o trade-off. **Nao inventar comportamento
   novo.** Sempre resolver
4. Descobrir os checks automatizados do projeto e rodar — typecheck, testes, format. Consertar o que
   o merge quebrou
5. Terminar o merge/rebase

O passo 2 e o que carrega tudo: resolver por **intencao rastreada a fonte**, nao por leitura do
diff. E a diferenca entre entender o conflito e adivinhar.

---

## O que nos temos e a fonte nao (DI-30)

Tres compounds deste repo, todos de incidente real:

| Compound | O que ensina | Por que pertence aqui |
|---|---|---|
| `2026-05-12-merge-not-rebase-after-tag` | Depois de tag anotado, `pull --rebase` reescreve SHAs e a tag aponta para commit orfao; `--no-rebase` preserva. Tabela comparativa, incidente do v6.0.0 | E a decisao que se toma no exato momento em que a divergencia aparece — antes do conflito existir |
| `2026-05-14-git-stash-parallel-processes` | `git stash` reverte edicoes em silencio com processos concorrentes; edicoes em `agents/*.md` sumiram e so foram notadas dois planos depois | **Stash e o instinto de quem topa num conflito**, e este repo roda subagentes em paralelo |
| `2026-05-12-git-revert-range-vs-loop` | Loop de `git revert HEAD` oscila entre revert e reapply — o resultado depende da paridade de N. Use sintaxe de range | Reverter e a saida quando a resolucao se mostra errada. Fazer errado piora o estado |

Esses tres transformam um porte de 14 linhas em algo que so este repo teria.

---

## A regra dura, com escape (DI-31)

A fonte diz **"sempre resolva; nunca `--abort`"**. A regra vale porque abortar nao faz o conflito
sumir — so adia, e joga fora o entendimento ja construido. Ele volta igual na proxima tentativa.

Mas registramos o caso legitimo: **voce iniciou o merge errado** — branch errada, base errada,
direcao errada. Ai abortar e correto, e a skill diz isso em vez de deixar a pessoa presa resolvendo
algo que sera descartado.

O escape e estreito de proposito: e sobre o *merge* estar errado, nunca sobre a resolucao estar
dificil.

---

## Analise de Dependencias

| O que | De onde vem | Status |
|---|---|---|
| `SKILL.md` da fonte (14 linhas) | repo-fonte | pronto |
| Os 3 compounds | `docs/compound/` | pronto |
| Convencao de branch e commit | `skills/git-workflow-and-versioning/SKILL.md` | pronto |
| A lente de escrita | plano01 fase-01 | pendente |

Auto-contido. Nao depende de nenhum outro plano desta serie.

---

## Fases

| # | Fase | Arquivos | Sizing | Depende de |
|---|---|---|---|---|
| 01 | [A skill](./fase-01-skill.md) | 1 novo + 1 modificado | ~1.5h | — |
| 02 | [Ponteiro + dogfood num conflito real](./fase-02-ponteiro-e-dogfood.md) | 1 modificado | ~1.5h | fase-01 |

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | Resolver por **intencao rastreada a fonte**, nunca por leitura do diff | E o mecanismo da skill. Sem isso vira "escolha um lado" |
| INV-02 | Nao inventar comportamento novo na resolucao | Conflito e o pior lugar para introduzir logica que nenhum dos lados pediu — ninguem vai revisar aquilo |
| INV-03 | O escape do `--abort` e sobre o **merge estar errado**, nunca sobre a resolucao estar dificil | Escape largo demais anula a regra |
| INV-04 | Rodar os checks do projeto **antes** de finalizar | Merge que compila em cada lado e quebra no meio e o caso comum |

---

## Como este plano pode falhar

**A skill vira "escolha ours ou theirs".** Mitigacao: INV-01 + o passo 2 tem criterio de pronto —
saber *por que* cada lado fez o que fez, com a fonte citada.

**O escape do abort vira porta dos fundos.** Mitigacao: INV-03, e o texto pergunta pelo *merge*, nao
pela dificuldade.

**Os compounds ficam como apendice que ninguem le.** Mitigacao: cada um entra **no passo onde a
decisao acontece** — merge-vs-rebase no passo 1, stash no passo 1, revert no passo 5 — nao numa
secao "leituras relacionadas" no fim.

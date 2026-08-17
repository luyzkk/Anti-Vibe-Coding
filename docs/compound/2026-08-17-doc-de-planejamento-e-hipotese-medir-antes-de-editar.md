---
title: "Numero em doc de planejamento e hipotese datada — o plano nomeia N sites e existem outros"
category: processo
tags: [exec-plans, plan-feature, execute-plan, drift, verificacao, numero-de-linha, grep]
created: 2026-08-17
---

## Problem

O pipeline deste repo separa **escrever o plano** de **executar a fase**, as vezes por semanas. O doc
de fase cita numero de linha, contagem de ocorrencia e resultado de grep — todos medidos **quando o
plano foi escrito**. Entre uma coisa e outra o codigo muda, e o doc continua parecendo autoritativo.

Executando os planos 10 e 11 do import `mattpocock/skills` numa unica sessao, o padrao apareceu
**oito vezes**, sempre com o mesmo formato — o plano afirma um numero, a medicao devolve outro:

| O plano dizia | O real | Consequencia se eu tivesse confiado |
|---|---|---|
| `plan-feature:721` e `:501` | `:696` e `:476` | ponteiro para a linha errada num doc distribuido |
| `verify-work:126-128` | `:101-103` | editar o bloco errado |
| `fronteira` "nao aparece em nenhum SKILL.md no sentido relevante" | 15 linhas no `grill-me`, sentido exato | renomear e cortar a costura entre duas skills |
| "filtro de 3 criterios" do `decision-registry` | **2** propriedades no gate; a 3a decide o tier | citar contagem falsa num ponteiro |
| G5: "o pipeline aparece em `AGENTS.md` e `README.md`" | `README.md` **nao** cita; `CLAUDE.md` cita | atualizar 1 de 2 sites, deixar o indice mentindo |
| G3: "ciclo de bloqueio vira loop infinito" | nao vira — a fronteira olha bloqueadores **diretos** | escrever defesa contra risco inexistente |
| DI-34: "`prototype` e `grilling` degradam ate plano08 e plano04" | os dois ja tinham entregue | escrever degradacao e TODO por nada |
| "5 testes ativos e verdes, sem `test.skip`" | 4 dos 5 skipados | editar golden achando que um teste guardava |

Nenhum foi erro de quem escreveu o plano: **todos estavam certos na data em que foram medidos.**
Envelheceram. O `plan-feature` sozinho foi mexido pelo `skill-parity-refresh` entre o plano e a
execucao, o que moveu **todas** as suas linhas.

O custo quando se confia: no melhor caso, um ponteiro para a linha errada num doc que nenhum teste
executa — e path-em-doc nao quebra teste, entao envelhece calado
(`docs/compound/2026-05-14-skill-paths-tech-debt-after-v6.md`). No pior, uma decisao de design tomada
contra fato falso — foi o que quase aconteceu com `fronteira`, onde o MEMORY dizia que o termo estava
livre e ele ja era vocabulario de uma skill irma do mesmo pipeline.

## Solution

Cada uma foi pega da mesma forma: **medir antes de agir**, com o comando que o proprio plano usaria.
Custa segundos e a resposta e binaria.

O caso do `fronteira` mostra por que vale mesmo quando o plano parece exaustivo. O MEMORY afirmava
que o termo nao aparecia "no sentido relevante" — medido em 2026-08-10, **antes** de o plano04
entregar. A remedicao mostrou 15 linhas no `grill-me`, e leitura mostrou que era o **mesmo conceito
em outra escala**, com o `grill-me:257` ja mandando explicitamente para a skill nova. A decisao virou
o oposto do que o plano sugeria — nao renomear, e escrever a continuidade.

## Prevention

- **Toda afirmacao numerica de doc de fase e re-medida no comando antes de virar edicao.** Numero de
  linha, contagem de ocorrencia, "existe/nao existe" — nenhum se herda.
- **Grep negativo so vale com controle positivo no mesmo comando.** "0 hits" pode ser ausencia ou
  regex errada; medir junto um termo que voce sabe existir separa os dois casos
  (`docs/compound/2026-08-12-grep-negativo-exige-controle-positivo.md`).
- **Quando o plano nomeia N sites, procurar o N+1.** A lista foi escrita olhando o repo de uma data;
  o grep de agora e a fonte. Nas oito ocorrencias acima, **duas** eram lista incompleta, nao numero
  velho.
- **Divergencia medida vira DI no MEMORY do plano, com os dois valores.** Corrigir em silencio faz a
  proxima fase herdar a mesma afirmacao velha do doc — foi assim que `plan-feature:721` sobreviveu
  ate a terceira fase que o citava.
- **Termo que o plano diz estar livre merece re-medicao dupla:** contagem **e** leitura de um dos
  hits. Contagem responde "existe"; so a leitura responde "no mesmo sentido".

## Affected files

- `docs/exec-plans/active/2026-08-10-mattpocock-skills-import/plano10/MEMORY.md` — DIs
  `fronteira`, `chart-6-passos`, `di34-caducou`, `link-check-em-code-fence`
- `docs/exec-plans/active/2026-08-10-mattpocock-skills-import/plano11/MEMORY.md` — DIs
  `linhas-caducas`, `filtro-2-nao-3`, `notices-4o-arquivo`
- `docs/compound/2026-05-14-skill-paths-tech-debt-after-v6.md` — o mecanismo do path que envelhece calado
- `docs/compound/2026-08-12-grep-negativo-exige-controle-positivo.md` — o controle positivo

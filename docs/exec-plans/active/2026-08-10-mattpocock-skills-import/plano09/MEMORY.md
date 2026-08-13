# Memory: Plano 09 — `resolving-merge-conflicts`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** fase-01 executada (2026-08-13)
**Depende de:** plano01 fase-01 (a lente) — **entregue**. Auto-contido no resto.

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | A skill | **done** | 2/2 |
| 02 | Ponteiro + dogfood | planned | 0/1 |

## Decisoes de implementacao (DI)

Formato: `DI-Plano09-faseNN-<slug>: <o que mudou e por que>`.

### fase-01 (executada)

- `DI-Plano09-fase01-teto-de-90-medido`: a skill fechou em **95 linhas** contra o teto de ~90. O
  teto existe como **proxy** para "os compounds foram copiados em vez de citados" — e essa condicao
  esta satisfeita e verificada direto: 1 citacao cada, com gatilho e consequencia, 3-4 linhas. O que
  excede sao `Common Rationalizations` + `Red Flags`, **19 linhas** de convencao do repo que o plano
  nao contava. Sem elas: **76 linhas**, dentro do teto. Um no-op foi cortado no caminho (a frase
  "consertar o que o merge quebrou faz parte da resolucao" duplicava o passo 4 e foi fundida nele).
- `DI-Plano09-fase01-sem-marcador-literal`: G5 avisa que escrever `<`x7 na SKILL.md pode confundir
  ferramenta que varre o repo procurando conflito real, e sugere marcar o exemplo como ilustrativo.
  **Resolvido por construcao:** a skill nao escreve marcador nenhum — a description nomeia o estado
  por `MERGE_HEAD`/`REBASE_HEAD`, "unmerged paths" e "conflict markers" em prosa. Zero literais,
  medido. Melhor que escrever e avisar.
- `DI-Plano09-fase01-abort-no-passo-1`: a fonte poe "never `--abort`" dentro do passo 3 (resolver os
  hunks). Aqui a **regra** ficou na abertura e a **pergunta do escape** no passo 1, porque e ali que
  a decisao acontece de fato — voce ve o estado e percebe que a branch era errada. No passo 3 ela
  chegaria depois de a pessoa ja ter gastado o esforco que o escape existiria para poupar.
- `DI-Plano09-fase01-criterio-do-passo-2`: a fonte diz "understand deeply why each change was made".
  Bound vago convida premature completion (a lente do plano01). Trocado por criterio checavel:
  **voce consegue enunciar a intencao de cada lado sem olhar o diff**.

## Verificacao do gap (2026-08-10)

`skills/git-workflow-and-versioning/SKILL.md` (377 linhas) menciona conflito de merge em 3 lugares,
**todos como motivo para manter branches curtas** — nunca como resolver:

| Linha | Contexto |
|---|---|
| 14 | "se houver conflito, CLAUDE.md global vence" (conflito de regra, nao de merge) |
| 32 | "long-lived branches diverge, create merge conflicts" |
| 301 | "short-lived branches prevent conflicting work from colliding" |

Zero `--abort`, zero `--theirs`. Os 7 hits de `hunk` no repo sao de outro sentido (React Suspense,
SQL, hooks checklist). **Gap confirmado.**

## Os 3 compounds que entram (DI-30)

Citados, **nunca copiados** — o compound e a fonte; a skill carrega o gatilho e a consequencia.

| Compound | Entra no passo | O gatilho |
|---|---|---|
| `2026-05-12-merge-not-rebase-after-tag` | 1 | ha tag anotado e voce vai integrar divergencia |
| `2026-05-14-git-stash-parallel-processes` | 1 | o impulso de "limpar com stash para olhar direito" |
| `2026-05-12-git-revert-range-vs-loop` | 5 | a resolucao se mostrou errada depois de commitada |

O do stash e o mais valioso posicionado: **stash e o instinto de quem topa num conflito**, e este
repo roda subagentes em paralelo — exatamente a combinacao do incidente original, em que edicoes em
`agents/*.md` sumiram e so foram notadas dois planos depois.

## O escape do abort (DI-31)

Regra: **sempre resolva** — abortar nao faz o conflito sumir, so adia e joga fora o entendimento.

Escape estreito: se o *merge em si* estava errado (branch errada, base errada, direcao errada),
abortar e a resposta certa.

Escrito como pergunta para nao virar porta dos fundos: **o merge esta errado, ou a resolucao esta
dificil?** Dificuldade nao e motivo.

## Dogfood — o mais barato da serie

Um conflito de merge se fabrica em um minuto num repo descartavel. Nao ha desculpa para entregar
sem testar.

Requisitos do conflito fabricado (fase-02 Passo 2), em **repo descartavel no scratchpad, nunca
neste repo**:

- duas branches editando a mesma funcao com intencoes diferentes e legiveis
- **mensagens de commit reais** dos dois lados — sem isso o passo 2 da skill nao tem fonte para
  rastrear, e o dogfood testa a metade errada
- ao menos um hunk em que as duas intencoes **dao para preservar**, e um em que **nao dao**

### Resultados a registrar

| Observacao | Resultado |
|---|---|
| O passo 2 enunciou a intencao de cada lado a partir dos commits? | |
| O hunk compativel preservou os dois, ou escolheu um lado? | |
| O hunk incompativel veio com trade-off anotado? | |
| Algum comportamento novo foi inventado (INV-02)? | |
| No merge errado de proposito, recomendou abortar? | |

Os dois do meio sao os que mais provavelmente falham — e onde a skill pede julgamento e o caminho
facil e escolher um lado e seguir.

## Gates entre fases

- **fase-01 -> fase-02:** o ponteiro aponta para uma skill que precisa existir; o dogfood exercita
  os cinco passos.
- **dentro da fase-02:** buraco revelado pelo dogfood volta para a fase-01. Nao patch oportunista no
  meio do teste.

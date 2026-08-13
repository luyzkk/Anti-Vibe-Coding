# Memory: Plano 09 — `resolving-merge-conflicts`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** **concluido** — fases 01 e 02 executadas (2026-08-13)
**Depende de:** plano01 fase-01 (a lente) — **entregue**. Auto-contido no resto.

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | A skill | **done** | 2/2 |
| 02 | Ponteiro + dogfood | **done** | 1/1 |

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

### fase-02 (executada)

- `DI-Plano09-fase02-ponteiro-apos-trunk-based`: o ponteiro entrou logo depois dos tres bullets de
  `Trunk-Based Development` (`:42-44`), nao na tabela de racionalizacoes do `:301`. Motivo: e o
  paragrafo onde a skill ja fala de conflito como custo de branch longa — o leitor esta com o
  conceito na cabeca e falta so o que fazer quando ele acontece. A fronteira vai escrita:
  **decidir** como integrar (esta skill) vs **estar preso** no meio (a outra). `description` nao
  tocada (G5).
- `DI-Plano09-fase02-abort-precisou-de-duas-montagens`: o primeiro cenario de merge errado **nao
  conflitou** — criei o rascunho a partir do merge commit, entao o git resolveu sozinho e nao havia
  o que abortar. Remontado com as duas branches saindo da **base comum**. Registrado porque e o erro
  natural de quem fabrica conflito: a divergencia precisa ser real, nao sequencial.

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

### Resultados (executado 2026-08-13)

Repo descartavel em `scratchpad/dogfood-merge-01`, **nunca neste repo**. Conflito em `pricing.js`:
`feat/frete-e-arredondamento` (ours) contra `feat/piso-zero` (theirs), as duas editando
`calcularTotal` com mensagens de commit reais dos dois lados.

| Observacao | Resultado |
|---|---|
| O passo 2 enunciou a intencao de cada lado a partir dos commits? | **Sim, e foi o que decidiu tudo.** ours: total bater com a nota fiscal (frete apos desconto, arredondamento, excedente vira credito). theirs: gateway rejeita cobranca negativa, 3 tickets, piso em zero, "nao emitimos credito — decisao de produto" |
| O hunk compativel preservou os dois? | **Preservou.** Frete e arredondamento (ours) coexistem com piso zero (theirs). Verificado por 4 casos: piso zero, frete apos desconto, arredondamento de 2 casas, e piso zero **com** frete ainda cobrado |
| O hunk incompativel veio com trade-off anotado? | **Sim**, comentario de 5 linhas no ponto da decisao, dizendo o que foi abandonado (credito) e por que |
| Algum comportamento novo foi inventado (INV-02)? | **Nao.** A tentacao existia — criar um campo `credito` para atender os dois lados. Recusada: nenhum dos lados tem esse campo, e inventa-lo no diff de merge e exatamente o que INV-02 proibe |
| No merge errado de proposito, recomendou abortar? | **Sim.** `--abort` executado, estado limpo, piso zero da branch de entrega intacto, rascunho nao entrou |

### O achado que so o passo 2 produz

Rastrear a intencao revelou que **um dos lados nao implementava a propria intencao**.

O commit de `ours` diz *"o fiscal quer o excedente como credito para a proxima compra, entao devolvo
o valor positivo"*, e o codigo faz `if (total < 0) total = -total`. Medido: carrinho de 200 com cupom
de 500 vira `total = 300` — o cliente **paga** 300 em vez de receber 300 de credito.

Ler so o diff mostraria dois tratamentos plausiveis de `total < 0` e a escolha seria estetica. A
fonte primaria transformou a decisao em obvia: piso zero, e o credito anotado como trade-off, porque
credito de verdade exige um campo separado do total que nenhum dos dois lados tem.

**E a demonstracao mais forte do INV-01 que este dogfood podia produzir** — nao foi planejada, saiu
de escrever duas mensagens de commit honestas.

### Sobre o cenario de abort

A primeira montagem **nao conflitou**: criei o rascunho a partir do merge commit, e o git resolveu
sozinho. Remontado a partir da base comum para haver conflito real.

O que decidiu foi de novo o passo 2, nao a dificuldade: a fonte primaria do lado que chega diz
`wip: preco fixo so para medir performance — NAO MERGEAR`, entrando numa branch de release. Merge
errado por direcao, nao resolucao dificil — exatamente a distincao do INV-03.

### Nenhum buraco voltou para a fase-01

Os quatro pontos do Passo 3 passaram. A fase-01 nao precisou de patch (G4 respeitado).

## Gates entre fases

- **fase-01 -> fase-02:** o ponteiro aponta para uma skill que precisa existir; o dogfood exercita
  os cinco passos.
- **dentro da fase-02:** buraco revelado pelo dogfood volta para a fase-01. Nao patch oportunista no
  meio do teste.

# Memory: Plano 01 — Porte `writing-for-agents` + Auditoria

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** **fase-04 CONCLUIDA.** Lotes 1, 2, 3, 4, 6 e 7 completos; lote **5 fechado pelo humano
em 2026-08-12** com 5a e 5b aplicados e o resto deixado na mesa por rendimento medido — ver
`AUDIT-REPORT.md` §Adiado. Plano 01 pronto para review do PR #14.

**Delta da fase-04:** descriptions **−4.360 (−32,3%)** · corpo dos `SKILL.md` **−19.341** ·
banner `SessionStart` **−374/sessao**. Total **~23,7k chars** a menos no que o agente carrega.
**Branch:** `feat/writing-for-agents-port` (criada 2026-08-11, a partir de `main`)

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Porte do nucleo | **done** | 2 novos + 1 modificado |
| 02 | Instrumentacao + tracer | **done** | 2 novos + 1 gerado |
| 03 | Auditoria fan-out | **done** (aguardando aprovacao) | 1 novo (`AUDIT-REPORT.md`) |
| 04 | Aplicacao dos patches | **done** | 11 commits de codigo em 5 lotes — ver tabela abaixo |

Lotes aplicados: **1** (`0c964a0`, `357d154`) · **2** (`436dec7`, `e3a33b8`) · **3** (`c61e941`) ·
**4** (`c3b87d4`, `3328eef`, `497ded2`, `6d71d8e`, `22b9efc`, `184470f`) · **7** (`3bfdb4b`,
`7d8bea5`) · **6a** (`59bad47`) · **6b** (`057398c`) · **5a** (`379e10a`) · **5b** (`a45c04c`).
**17 commits de codigo, 11 de registro.** Lote **5 fechado** com ~12,9k reais deixados na mesa.

### Por que o lote 5 fechou incompleto

Decisao do humano, com o numero na mesa. O S1 e o **unico achado sistemico da auditoria cuja
projecao nao sobreviveu ao codigo** — e foram tres medicoes independentes dizendo isso: o subtipo 1
nao existia (5a), a maior entrada da tabela era falso positivo (`verify-work`, 5b recusado), e o
ratio real de reprojecao e 56% e nao ~90% (5b aplicado). O que sobra sao ~12 secoes de 275 a 1.1k,
cada uma exigindo contagem item a item para render metade — **~6k contra o risco de derrubar regra
viva numa lista de regras**. Os outros lotes renderam com projecao quase exata; este nao.

### Delta acumulado da fase-04 (medido, nao projetado)

| Metrica | Inicio da fase | Depois do lote 4 |
|---|---|---|
| `descriptionChars` | 13.499 | **9.139** (−4.360, **−32,3%**) |
| banner `SessionStart` | 4.131/sessao | **3.757** (−374) |
| `hookDescriptionChars` | 2.081 | **1.937** |
| `modelInvoked` | 40/40 | **39/40** |
| maior ofensor | `system-design` 1.481 -> `infrastructure` 792 | **`security` 419** (crescido de proposito) |

A auditoria projetou o repo terminando em **~9.475**; fechou em **9.139** (esta linha dizia 9.231
ate 2026-08-12 — numero antigo, o audit sempre reportou 9.139). A cauda longa de outliers acabou:
depois do 419, a distribuicao e 338 / 306 / 305 / 299.

Os lotes **6**, **5a** e **5b** nao mexem em nenhuma metrica desta tabela — cortam **corpo**, nao
description. Delta deles, medido em LF (ver DI sobre CRLF):

| Lote | Delta | Skills |
|---|---|---|
| 6a | −7.297 | 5 consultivas |
| 6b | −7.959 | 5 pipeline-core |
| 5a | −2.635 | design-twice, update, write-prd |
| 5b | −1.450 | write-prd, plan-feature, execute-plan |
| **total** | **−19.341** | **13 skills distintas** |

Unica metrica do audit que se moveu: `negacoes no corpo` 1.148 → **1.120**.

Modo de aprovacao escolhido pelo humano: **por lote**, com a lista do lote na tela antes de aplicar
(a alternativa era por achado, ~70 pausas). Lote 1 do relatorio virou **1a + 1b** — ver DI abaixo.

Entregue na fase-01: `skills/writing-for-agents/SKILL.md` (220 linhas),
`skills/writing-for-agents/references/SKILL-MECHANICS.md` (56 linhas), bloco de atribuicao MIT em
`THIRD-PARTY-NOTICES.md`. Zero diff em `skills/*/SKILL.md` pre-existentes (INV-03 mantida).

Entregue na fase-02: `scripts/audit-skill-docs.ts` + `scripts/audit-skill-docs.test.ts` (14 testes),
baseline em `docs/generated/skill-audit-baseline.json` (40 registros). INV-03 mantida.

Entregue na fase-03: [`AUDIT-REPORT.md`](./AUDIT-REPORT.md) — 5 subagentes read-only sobre as 40
skills, 6 achados sistemicos, ~70 achados por skill, delta projetado **−35% do context load de
descriptions**. INV-03 mantida (zero diff em `skills/`).

## Decisoes de implementacao (DI) — fase-03

- **DI-Plano01-fase03-40-nao-39**: a fase fala em 39 skills; sao **40**. `writing-for-agents` entrou
  na fase-01 e foi auditada com ela mesma (lote B) — rendeu 2 achados de duplicacao, incluindo
  `## Red Flags` sendo terceira copia de significados ja em `Common Rationalizations` e no corpo.

- **DI-Plano01-fase03-preface-e-load-bearing**: **o achado mais importante da fase, e ele derrubou
  uma proposta de subagente.** O lote C propos deletar os blocos de codigo de
  `decision-registry:10-59`. Verificacao em `scripts/harness-validate.ts:637-660`: o bloco
  `profile-aware-preface` e **obrigatorio** — o validator falha se faltar fence ou referencia a
  `readPrefaceContext`. Deletar derrubaria `bun run harness:validate` em 9 skills. Os 54.974 chars de
  blocos ```` ```typescript ```` nos SKILL.md sao **tres classes distintas**, nao uma: telemetria
  (morta, guardada por `telemetry-utils.test.ts:192`), `profile-aware-preface` (**intocavel**) e
  `stale-capabilities-check` (byte-identico em 6 arquivos, guardado por teste de ordem em 4). So a
  primeira entra na fase-04.

- **DI-Plano01-fase03-verificacao-obrigatoria**: 8 afirmacoes de subagente foram reverificadas por
  script antes de entrar no relatorio (secao §Verificacao independente). 7 confirmaram; 1 era falsa
  (a do preface). Alem dela, o lote C **retirou sozinho** um achado apos verificar: "`verify-work`
  aponta para skill removida" — a skill existe. **Saida de subagente e hipotese**, e a taxa de erro
  observada (~1 em 8 nas afirmacoes de maior impacto) justifica o custo da reverificacao.

- **DI-Plano01-fase03-sistemicos-por-script**: os 6 achados sistemicos foram medidos por script, nao
  por agente — cada lote ve 8 de 40 e nao enxerga padrao que atravessa o repo. Numeros: 28 secoes
  terminais em 21 skills (28.281 chars) · 54.974 chars de blocos de codigo · hook `SessionStart` com
  4.205 chars/sessao · 602 chars de boilerplate em 14 descriptions · 6 satelites orfaos.

- **DI-Plano01-fase03-drift-do-proprio-corte**: o corte do `system-design` (commit `01ffdf7`) **nao
  propagou para o `hooks/hooks.json`**, que mantem 273 chars da lista de triggers antiga carregados
  em toda sessao. Violacao de single source of truth cometida por quem portou a lente que a descreve.
  Entra no lote 3 da fase-04.

- **DI-Plano01-fase03-guardrail-funcionou**: **zero achados** do tipo "corpo grande demais" nos 5
  lotes. `security` (589), `verify-work` (610), `system-design` (519), `api-design` (438),
  `architecture` (434), `tdd-workflow` (451) e `infrastructure` (426) passaram como catalogo
  consultavel legitimo. O brief nomeava esse risco explicitamente e listava as skills protegidas por
  lote — sem isso, a fase-03 teria produzido a parede de ruido que o README do plano previa.

## Tracer bullet — `system-design` (gate fase-02 -> fase-03: **passou**)

**Conceito violado:** context pointer, regra "um trigger por branch" (`writing-for-agents` §Context
pointers).

**Evidencia.** A description tem **75 triggers**. O corpo tem **11 branches reais** — as secoes
numeradas 1..11 (`SKILL.md:97,119,144,171,193,225,263,302,342,396,441`), cada uma com sua propria
arvore de decisao e seu proprio `references/*.md`. Os 75 triggers mapeiam 1:1 nessas 11 secoes, com
**64 excedentes**; o 75o (`'system design'`) e a identidade que o corpo ja carrega.

Pior concentracao: §9 Filas (20 triggers) e §10 SQL internals (20). Sinonimos literais — o mesmo
branch escrito duas vezes, que e a definicao do doc-fonte:

| Sinonimos | Branch |
|---|---|
| `WAL` / `write-ahead log` | §10 |
| `DLQ` / `dead letter queue` | §9 |
| `B-tree` / `B+ tree` | §10 |
| `EXPLAIN` / `EXPLAIN ANALYZE` / `query plan` | §10 |
| `load balancer` / `load balancing algorithms` | §6 |
| `message queue` / `message broker` / `pub/sub` | §9 |

**Delta medido.** description atual **1.481 chars**. Proposta com 11 triggers (um por secao):
**248 chars**. Economia **1.233 chars (83%)** — **8,4% de todo o context load de descriptions do
repo, numa skill so**. O hook `SessionStart` gasta outros **273 chars** redescrevendo a mesma lista
de branches.

**Patch proposto — NAO aplicado (DI-04, INV-03):**

> System design consultation. Use when the user asks about CAP/PACELC trade-offs, scaling, caching,
> database selection, replication and sharding, load balancing, CDN, serverless vs serverfull,
> message queues, SQL internals, or distributed resilience.

Risco levantado: triggers como `Redis`, `RabbitMQ`, `BullMQ` e `EC2` sao nomes de produto, nao
sinonimos de branch — podem ser o que de fato dispara a skill na pratica. Colapsar sem checar
trocaria context load por invocacao perdida.

## fase-04 antecipada — variante B aplicada em `system-design` (2026-08-11)

Aprovacao humana explicita por achado, que e a condicao da DI-04. **Cruza INV-03** (que veda editar
skill existente nas fases 01–03): registrado, nao contornado.

Aplicada a **variante B** — os 11 branches mais os nomes proprios preservados numa clausula so, em vez
da variante A estrita. Razao: perder invocacao e assimetrico contra 0,6 ponto percentual de economia,
e a regra da fonte manda colapsar sinonimo, nao nome proprio distinto.

Uma linha: `skills/system-design/SKILL.md:3`. Corpo intacto (519 linhas antes e depois).

| | antes | depois |
|---|---|---|
| `descriptionChars` de `system-design` | 1.481 | **338** (-1.143) |
| `descriptionChars` do repo | 14.642 | **13.499** (-7,8%) |
| previsto no achado | -1.143 | realizado -1.143 |

Novo maior ofensor: `infrastructure` (792 chars, 35 triggers), depois `api-design` (662, 30).

**Efeitos colaterais rastreados antes de editar** (busca nao e semantica):

- `plugin-manifest.json` guardava **checksum** e **copia da description**. Ambos ficaram stale na hora
  da edicao. Resolvido com `bun run generate:manifest` — que de quebra **fechou a pendencia aberta da
  fase-01**: `writing-for-agents` agora esta registrado (skills 39 -> 40, arquivos 412 -> 414).
- Nenhum teste assertava o texto antigo.
- `docs/exec-plans/active/2026-06-15-system-design-coverage-gaps/edit-manifest.md` cita o texto antigo.
  E registro historico do que foi feito na epoca — **nao** foi tocado.
- O hook `SessionStart` mantem sua propria linha de 273 chars para `system-design`. Fora do escopo
  desta aplicacao; segue como achado aberto.

## Achados que surgiram ao aplicar

- **RESOLVIDO — `SKILL-MECHANICS.md` nao era distribuido.** `scripts/generate-manifest.js:172-202`
  varre, dentro de cada skill, apenas `references/`, `templates/`, `lib/` e `assets/`. **Arquivo irmao
  do `SKILL.md` nao entra.** Das 114 satelites `.md` registradas, zero era irma do `SKILL.md` — a
  convencao do repo e subpasta, e a fase-01 seguiu o layout plano da fonte. Em projeto-alvo o ponteiro
  ficaria pendurado. Corrigido em 2026-08-11: `git mv` para
  `skills/writing-for-agents/references/SKILL-MECHANICS.md` (linhagem preservada), 2 ponteiros
  atualizados no `SKILL.md` (`./references/SKILL-MECHANICS.md`), 2 ponteiros de volta no mechanics
  (`../SKILL.md`), 2 rotulos no `THIRD-PARTY-NOTICES.md` e a linha do `README.md` deste plano.
  Manifest regenerado: 414 -> 415 arquivos, path antigo removido. O baseline agora ve a satelite e a
  conta como alcancada (0 orfaos na skill).
  **A armadilha "path-em-doc envelhece calado" que a propria skill documenta pegou o autor dela.**
- **RESOLVIDO — `triggerCount` media estilo de aspas, nao branch.** Depois do patch, `system-design`
  passou a reportar **0 triggers**: a variante B nao usa aspas simples, embora carregue 11 branches e
  9 nomes. Como proxy de ranqueamento isso inverte o sinal — skill corrigida parece perfeita, skill
  intocada parece pessima, e a fase-03 mandaria subagente para as skills erradas. Renomeado para
  **`quotedTriggerCount`**, com o aviso no proprio tipo, e o CLI agora imprime o ranking por
  **`descriptionChars`**, que mede custo e nao estilo. A opcao mais cara (contar clausulas apos "asks
  about") ficou de fora: `descriptionChars` ja ordena certo e nao tem heuristica para envelhecer.
  **Regra para a fase-03: ranquear por `descriptionChars`.**
- **ABERTO — o teste de checksum do manifest amostra 3 de 415 arquivos** (`generate-manifest.test.ts:114-128`,
  `Object.keys(manifest.files).slice(0, 3)` = `CLAUDE.md`, `rules/api-standards.md`,
  `rules/code-quality.md`). Checksum stale em qualquer outro arquivo passa despercebido — foi o que
  aconteceu aqui: editei `system-design/SKILL.md`, o checksum ficou errado e a suite seguiu verde.

## Decisoes de implementacao (DI)

Registrar aqui toda divergencia entre a spec da fase e o que o codigo exigiu.
Formato: `DI-Plano01-faseNN-<slug>: <o que mudou e por que>`.

### fase-01

- **DI-Plano01-fase01-setima-secao**: a fonte tem **7** secoes h2, nao 6. O Passo 2 enumera 6 e omite
  `## When to split` (corte por sequencia / por invocacao). Portada como `## Quando dividir` porque o
  conceito 4 (criterios de completude) referencia explicitamente "dividindo a sequencia" — sem a
  secao, a referencia fica pendurada. Ordem do original preservada.

- **DI-Plano01-fase01-rationalizations-em-skill-md**: o Passo 6 enderecou
  `Common Rationalizations` + `Red Flags` ao `SKILL-MECHANICS.md`, mas o proprio passo manda "aplicar
  o padrao existente", e o padrao nas 19/17 skills que ja o usam e **dentro do `SKILL.md`**
  (`decision-registry` incluso). Alem disso as racionalizacoes valem para os 3 branches da skill
  (skill, `AGENTS.md`, doc revisado); atras do ponteiro de mechanics so alcancariam o branch de
  skill — contrariando o teste de hierarquia da propria skill. Gravadas em `SKILL.md`.
  Reversivel: mover e um recorte.

- **DI-Plano01-fase01-baseline-chars-nao-reproduz**: o baseline de `../CONTEXT.md` §Achado medido
  (15.149 chars de description; `system-design` 1.497) **nao reproduz**. Medicao em 2026-08-11 sobre
  as 39 skills: **14.522** com aspas / **14.452** sem aspas; `system-design` **1.483**. Nenhum numero
  de char foi gravado na skill — a fase-02 e dona deles. Atencao ao gate do plano ("divergencia =
  bug no script"): aqui a divergencia e **do baseline**, entao o gate precisa comparar contra a
  medicao nova, nao contra 15.149.

- **DI-Plano01-fase01-achado-mais-forte-que-36-39**: o "36 de 39 com `disable-model-invocation:
  false`" esta **correto**, mas subconta o achado. As outras 3 (`init`, `sync`, `update`) **omitem**
  o campo, e omitir e o mesmo default. **Zero skills com `true`** — logo **39/39 sao model-invoked** e
  pagam description permanente. Registrado nessa forma no `SKILL-MECHANICS.md`.

- **DI-Plano01-fase01-campos-8-nao-6**: CO-03 e o Passo 5 falam em "6 campos" (listando 7 nomes).
  Contagem real: **8** campos distintos em uso. `name`/`description`/`user-invocable`/`allowed-tools`
  39/39 · `disable-model-invocation` 36/39 · `argument-hint` 38/39 (`sync` omite) ·
  `context` **1/39** e `agent` **1/39** (so `anti-vibe-review`) · `kind` **1/39** (so `parity-audit`).
  A tabela do `SKILL-MECHANICS.md` ganhou coluna "Uso hoje" com esses numeros.

- **DI-Plano01-fase01-satelite-sem-frontmatter**: o criterio de aceite pede "ambos com frontmatter
  valido". `SKILL-MECHANICS.md` foi escrito **sem** frontmatter — e a convencao dos satelites deste
  repo (`skills/tdd-workflow/references/deep-modules.md`, `skills/lib/llm-anti-patterns.md`: H1 +
  linha nomeando os consumidores) e e o que a fonte faz. `harness-validate` exige **H1 no inicio**,
  nao frontmatter. H1 presente, validate verde.

- **DI-Plano01-fase01-description-sem-boilerplate**: 35 das 39 descriptions abrem com "This skill
  should be used when the user asks...". A nova nao usa. INV-01 (<250 chars) + Passo 1 (front-load,
  um trigger por branch) tornam esse boilerplate exatamente a identidade que a skill manda cortar.
  Resultado: **190 chars**, 3 branches, zero sinonimo. Divergencia consciente da convencao majoritaria.

- **DI-Plano01-fase01-frontmatter-regex-comentario-antes**: `skills/anti-vibe-review/SKILL.md` tem
  comentario HTML **antes** do frontmatter — regex ancorada em `^---` falha nele. Custou uma contagem
  errada (35 em vez de 36) durante a verificacao desta fase. **Input direto para a fase-02:** o script
  de auditoria precisa tolerar comentario e linha em branco antes do `---`, alem do `\r?\n`.

- **DI-Plano01-fase01-crlf-e-do-working-tree**: o Passo 0 exige LF. A realidade e que **37 dos 39**
  `SKILL.md` estao CRLF no working tree, e isso e esperado — `git ls-files --eol` mostra
  `i/lf  w/crlf`. `.gitattributes` **nao cobre `*.md`**; a normalizacao vem de `core.autocrlf`. O que
  importa e o indice em LF. Os 2 arquivos novos: LF puro no disco e no indice.

### fase-02

- **DI-Plano01-fase02-baseline-40-nao-39**: o criterio de aceite pede "39 registros". Sao **40** —
  `writing-for-agents` entrou na fase-01. A reconciliacao contra o CONTEXT usa o subconjunto de 39.

- **DI-Plano01-fase02-reconciliacao-linha-bruta**: descobri **como** o baseline de 15.149 foi medido:
  a linha `description:` inteira, com o prefixo YAML **e o `\r` final**. Prova exata em
  `system-design`: valor 1.481 · linha 1.496 · linha+`\r` **1.497** = o numero do CONTEXT. O script
  reporta duas metricas — `descriptionChars` (o valor, que e o que ocupa contexto) e
  `descriptionLineChars` (linha bruta sem o `\r`, para reconciliar). Nas 39: **15.029** vs 15.149 =
  **-0,79%**, dentro dos ±2%. O `\r` fica de fora de proposito: e terminador de linha, nao conteudo.

- **DI-Plano01-fase02-hook-duplication-parafraseada**: a metrica `hookDuplication` da spec
  ("description presente no payload do hook") mediria **zero**. O `SessionStart` nomeia 23 skills mas
  **parafraseia todas** — nenhuma description aparece literal. Substituida por `hookListed` +
  `hookDescriptionChars` (o hook gasta **2.081 chars** redescrevendo skills que ja pagam description).
  `hookExactDuplicate` foi mantido para o caso de teste que a spec pede, exercitado por fixture.

- **DI-Plano01-fase02-satelite-recursivo**: a primeira versao listava so filhos diretos e reportava
  **0 satelites para `system-design`**, que tem 14 em `references/`. Corrigido para recursivo sobre
  `.md`, excluindo `__tests__`/`__fixtures__`/`__golden__`/`fixtures`/`assets`/`templates` (payload
  que a skill *escreve*, nao material que o agente le — `init` sozinha gerava 60+ falsos orfaos). E
  "alcancado por ponteiro" nao e so link markdown: as skills grandes citam o satelite em backticks.
  Orfaos: 15 -> 74 -> **6** conforme a metrica ficou correta.

- **DI-Plano01-fase02-negacoes-ruidosas-em-ptbr**: **1.149** negacoes em 40 skills. Num corpo em
  pt-BR, `\bnao\b` casa prosa comum, nao so proibicao. O numero e **pool de partida, nao defeito** —
  a fase-03 julga caso a caso; contar seria transformar ruido em achado.

- **DI-Plano01-fase02-descricao-multilinha-inexistente**: o G2 afirma que "varias das nossas usam
  aspas com quebra". Verificado: **zero** descriptions ocupam mais de uma linha. Continuacao YAML foi
  implementada mesmo assim (4 linhas, e YAML permite), mas nenhuma skill exercita isso hoje.

- **DI-Plano01-fase02-baseline-versionado**: a fase marca o JSON como "GERADO (nao versionado como
  fonte)". Ele **foi commitado**: `docs/generated/db-schema.md` ja e rastreado, o `.gitignore` nao
  cobre `docs/generated/`, e um baseline fora do versionamento nao serve de antes/depois para as
  fases 03 e 04 — que e a unica razao de ele existir.

### fase-04 — lote 1a (contradicoes: secao terminal vs step)

- **DI-Plano01-fase04-lote1-excede-cap**: o lote 1 recomendado pelo relatorio tem **7 skills**, e o
  cap e 5 arquivos. Dividido pela natureza do defeito, nao por contagem: **1a** = 4 casos de secao
  terminal contradizendo um step (`execute-plan`, `consultant`, `iterate`, `init`); **1b** = 3 casos
  de frontmatter contradizendo o corpo (`quick-plan` description, `code-simplification`
  `allowed-tools`, `design-patterns` contagem). Cada metade e um commit coerente.

- **DI-Plano01-fase04-allowed-tools-e-o-arbitro**: em 2 das 4, a direcao nao precisou de julgamento —
  **`allowed-tools` ja decide**. `consultant` (`Read, Grep, Glob, WebSearch`) e `iterate`
  (`Read, Glob, Grep, Bash, AskUserQuestion`) **nao tem `Write` nem `Edit`**, logo a secao que manda
  gravar automaticamente instrui uma acao que o tool grant proibe. O relatorio nao registrou esse
  fato em nenhuma das duas. **Criterio reusavel para os lotes seguintes: ler o frontmatter antes de
  escolher qual lado da contradicao vence** — muitas vezes o lado ja esta escolhido.

- **DI-Plano01-fase04-init-77-falsa-contra-o-codigo**: o relatorio caracterizou `init:77` vs `:80`
  como contradicao interna ao doc. A verificacao no codigo mostrou coisa mais forte: `:77` e **falsa
  contra a implementacao** — `linkClaudeToAgents:24` faz `fs.rm` do CLAUDE.md raiz e o recria
  (documentado em `skills/init/lib/steps/05-scaffold-and-link.ts:48`). Muda a natureza do patch: nao
  era escolher um lado, era remover uma afirmacao falsa. O patch nao repete os paths que `:80` ja
  carrega (single source of truth).

- **DI-Plano01-fase04-iterate-direcao-humana**: Regra 6 vence, Step 3 ganha gate. Decidido pelo
  humano com as tres evidencias na tela (sem `Write`/`Edit`; a Regra 1 do mesmo bloco ja exige
  diff + aprovacao para o fix; CLAUDE.md global manda sugerir e nunca executar). As alternativas
  ofertadas — Step 3 vencer, ou dividir entre teste novo e teste existente — **exigiriam ampliar o
  `allowed-tools`**, o que moveria a contradicao para o frontmatter em vez de resolve-la.

- **DI-Plano01-fase04-manifest-todo-lote**: todo lote que edita `SKILL.md` precisa de
  `bun run generate:manifest` **no mesmo commit**. Sem isso o checksum fica stale em silencio — e o
  teste amostra 3 de 415 arquivos, entao a suite segue verde (pendencia ja registrada na fase-03).
  Isso poe o lote em **6 arquivos**: 4 editados a mao + 2 regenerados por script
  (`plugin-manifest.json`, `docs/generated/skill-audit-baseline.json`). O cap de 5 e sobre blast
  radius de edicao manual; artefato gerado por script nao conta. Registrado por transparencia.

- **DI-Plano01-fase04-delta-1a-e-comportamental**: `descriptionChars` **13.499 antes e depois** —
  zero economia, como projetado. O lote toca corpo, nao description. Unica metrica que mexeu:
  negacoes 1.149 -> 1.148. **Delta medido == projetado (~+180 chars).** G4 nao se aplica.

**Achados novos, abertos, que surgiram na verificacao do 1a** (nao aplicados — fora do escopo do lote):

- `init:80` cita `/anti-vibe-coding:init --rollback` (MH-07), mas `rollback` **nao aparece em
  `skills/init/lib/parse-flags.ts`**. Existe `rollback.test.ts` e `run-init-rollback.test.ts`, entao
  a lib existe — a duvida e se a **flag** e reconhecida. Exige verificacao antes de qualquer acao;
  candidato ao lote 2 (ponteiros mortos) se confirmado.
- `consultant` — `**Criterio para registrar:**` tem negacao redundante ("NAO registrar se dev
  recusar") com o alvo positivo na mesma frase. Lote 7 (negacoes).
- `skills/anti-vibe-review/SKILL.md`: `generate-manifest.js` emite
  `missing or malformed frontmatter delimiters` a cada run. Mesma raiz do
  **DI-Plano01-fase01-frontmatter-regex-comentario-antes** (comentario HTML antes do `---`). O
  manifest gera assim mesmo; nenhum teste quebra. Nao e desta feature, mas agora tem dois sintomas.

### fase-04 — lote 1b (contradicoes: frontmatter vs corpo)

- **DI-Plano01-fase04-quick-plan-nem-um-lado-nem-o-outro**: o relatorio pos como description vs
  `:182`. Nenhum dos dois lados estava certo. A verdade era um **terceiro** fato, visivel so lendo
  `:210` junto: a skill escreve **um** arquivo e nao cria o *scaffold* multi-arquivo do
  `/plan-feature`. A description generalizou "um arquivo" para "arquivo nenhum". **Padrao a procurar
  nos lotes seguintes: contradicao pode ser sintoma de uma terceira formulacao que ninguem escreveu**
  — resolver escolhendo um lado teria gravado uma falsidade diferente.

- **DI-Plano01-fase04-contagem-num-lugar-so**: `design-patterns` tinha a contagem em 3 sites
  (`:3` 28, `:83` 22, `:312` 28; real 26). Sincronizar os tres resolveria a instancia e deixaria a
  classe viva. Aplicado: a contagem fica **so na description** (onde e ponteiro e ajuda a dimensionar
  o alvo); nos dois sites do corpo a lista esta logo abaixo, entao o numero era cache de um lookup
  barato — regra "environment como fonte de verdade" da lente. Nao pode divergir de novo.

- **DI-Plano01-fase04-code-simplification-escalada-de-privilegio**: unico patch da fase que **amplia
  poder**, e por isso foi decidido pelo humano em pergunta propria, nao dentro da lista do lote.
  `allowed-tools: Read, Grep, Glob` vs ~170 das 335 linhas escritas como executor (Step 3 `:165`
  editar/testar/commitar/reverter; Step 4; `## Verification` checando build e linter). Escolhido:
  o corpo vence, frontmatter vira `Read, Write, Edit, Glob, Grep, Bash`. As alternativas eram
  reescrever metade da skill como consultiva, ou adiar para lote proprio.
  **Distincao util:** em `consultant` e `iterate` o `allowed-tools` restrito **confirmava** a regra
  terminal, entao ele arbitrou; aqui ele e o **outlier** contra o corpo inteiro. Ler o frontmatter
  primeiro continua certo — mas o veredito e por peso de evidencia, nao por precedencia fixa.

- **DI-Plano01-fase04-delta-1b**: `descriptionChars` 13.499 -> **13.509 (+10)**, que e exatamente o
  fragmento novo da description do `quick-plan`; a troca `28`->`26` e neutra em chars. **Medido ==
  projetado.** Nenhum trigger foi removido de nenhuma description, entao G1 nao se aplica ao lote 1.

- **DI-Plano01-fase04-lote1-nao-economiza-contexto**: somando 1a e 1b, o lote 1 fez
  **+190 chars** de context load. Era o esperado e esta no relatorio: o lote foi ordenado por
  consequencia/risco, nao por delta. O que ele entrega e determinismo — 7 pontos onde o agente
  escolhia entre duas instrucoes conflitantes por sorteio.

### fase-04 — lote 2 (S3 ponteiros mortos), commits `436dec7` + `e3a33b8`

- **DI-Plano01-fase04-legacy-15-nao-7**: o relatorio contou **7 sites**; sao **15 referencias em 14
  linhas** (`plan-feature` 7 linhas, `execute-plan` 7). Uma delas (`execute-plan:127`) esta **sem
  backticks** e escapa de qualquer grep que ancore em crase — foi so o grep sem crase que a achou.
  **Contagem de subagente e estimativa; recontar antes de aplicar.**

- **DI-Plano01-fase04-decision-registry-misdiagnostico**: o achado mais perigoso do lote. O relatorio
  disse "`index.ts:53` grava em `decisions.md` raiz, doc diz `.claude/`" — e concluir dai que o fix
  e trocar o path **estaria errado**. `index.ts:35-46` mostra que a raiz e so o branch **v5/cru**; em
  **v6**, que e o default deste repo, a skill escreve `ADR-NNNN-{slug}.md` em `docs/design-docs/`.
  Aplicar o fix implicito teria trocado uma falsidade por outra, mais convincente porque parcialmente
  verdadeira. Corrigido deferindo ao layout, com `## Fluxo (v6)` (`:229-239`) como fonte unica — ele
  ja estava certo, duas linhas abaixo do texto errado.
  **Padrao: quando o relatorio cita uma linha de codigo como prova, ler a funcao inteira** — uma
  linha dentro de um `if` prova o branch, nao o comportamento.

- **DI-Plano01-fase04-forma-do-path-root-relative**: apresentei `../lib/...` e apliquei
  `skills/lib/...`. A regra viva do repo, lida dos vizinhos na mesma secao `Referencias`: **material
  da propria skill vai skill-relative** (`references/wave-execution.md`, que existe), **material de
  fora vai root-relative** (`agents/plan-executor.md`,
  `skills/plan-feature/templates/memory-template.md`). O compound 2026-05-14:34 usa a mesma forma.
  Alvo identico nas duas formas; so uma casa com os vizinhos.

- **DI-Plano01-fase04-planning-do-step-0-e-intencional**: as referencias `.planning/` do **Step 0** de
  `plan-feature` e `execute-plan` **nao sao debito** — o compound 2026-05-14 linha 36 as preserva
  explicitamente como o fallback "v5 detectado, oferece migrar" (D10), e `harness-validate.ts:424`
  whitelista `plan-feature` por isso. **Nao "corrigir" em lote futuro.** No lote 2 so o path form
  `lib/` estava quebrado.

- **DI-Plano01-fase04-whitelist-acompanha-o-patch**: consertar um path exige aposentar a entrada de
  divida que o tolerava, **no mesmo commit**. `harness-validate.ts:412` carregava
  `'skills/iterate/SKILL.md', // busca .planning/*/SUMMARY.md` com a instrucao "remover quando cada
  skill for migrada". Deixar a entrada tornaria o gate cego a uma reintroducao — divida que sobrevive
  ao proprio motivo. `LEGACY_V5_SKILLS` e **permissivo** (autoriza `.planning/`, nao exige), entao
  remover so torna o validator mais estrito; confirmado com `grep .planning skills/iterate` = 0 e com
  `tests/harness-validate-v6-path-whitelist.test.ts` (8 verdes, usa fixtures, nao cita `iterate`).

- **DI-Plano01-fase04-sdd-descartado**: `source-driven-development` (5 sites) **nao sobreviveu a
  verificacao como defeito**. `docs/references/` existe com exatamente os 3 arquivos citados, e `:80`
  ja os rotula "Exemplos disponiveis no Anti-Vibe Coding". A observacao verdadeira do relatorio
  (`sync-to-global.sh:83` nao distribui `docs/`) e sobre **portabilidade**, nao ponteiro quebrado, e
  a instrucao "check `docs/references/`" degrada sem dano quando a pasta nao existe. Registrado no
  `AUDIT-REPORT.md` §Descartados.

- **DI-Plano01-fase04-delta-lote2**: `descriptionChars` **13.509, inalterado** nos dois sub-lotes —
  correto, o lote 2 nao toca description. Corpo: 2a ~+105 chars (path mais longo), 2b ~−120.
  `satelites sem ponteiro` segue **6**: deletar ponteiro para arquivo **inexistente** nao muda
  contagem de orfao, que mede arquivo existente sem ponteiro. Metricas distintas, nao regressao.

### fase-04 — lote 3 (S4 hook `SessionStart`), commit `c61e941`

- **DI-Plano01-fase04-hooks-json-e-CRLF**: o primeiro plano de edicao era
  `JSON.parse` -> modificar -> `JSON.stringify(obj, null, 2)`. Um gate de round-trip **abortou antes
  de escrever**: original 9.584 chars, round-trip 9.431 — diferenca de **exatamente 153, o numero de
  linhas**. `hooks/hooks.json` esta em **CRLF no disco** e `JSON.stringify` emite LF. Teria
  reescrito as 153 linhas de um arquivo com historico de sobrescrita (compound `2026-03-23`).
  Trocado para substituicao no **texto bruto**: diff de 1 linha, 153 CRLF preservados.
  **Regra para qualquer edicao futura de `hooks/hooks.json`: nunca parse+stringify; editar o texto
  bruto e conferir a contagem de CRLF antes e depois.**

- **DI-Plano01-fase04-escape-tem-duas-barras**: no texto bruto do JSON a quebra do `printf` e
  `\\n` — **3 chars: barra, barra, n** (o JSON escapa a barra que o printf vai interpretar). O
  primeiro alvo montado com `String.raw` de uma barra so casou **0x** e o gate abortou. Custou uma
  iteracao, nao um arquivo corrompido. Escrever alvo multi-linha para este arquivo exige
  `String.raw` com **duas** barras.

- **DI-Plano01-fase04-akita-metade-e-roteamento**: o relatorio tratou a tabela Akita (736 chars)
  como uma coisa so, duplicada de `pair-programming-with-agent`. Sao **duas**. O bloco **"Faz BEM"**
  (230 chars) nao tem destino de roteamento e nomeia o que o agente ja faz por default — no-op, e ai
  sim duplicata. O bloco **"Faz MAL"** (371 chars) carrega as setas `-> consultant` e `-> security`,
  que **nao existem em nenhum outro lugar do repo**: a tabela da propria skill tem os mesmos 5
  dominios **sem** os alvos. Cortar a secao inteira teria removido a unica copia do roteamento.
  Verificado lendo `pair-programming-with-agent:64-76` lado a lado, nao pela descricao do achado.

- **DI-Plano01-fase04-lista-23-adiada**: os 1.981 chars da lista de skills (53% do banner) **nao
  foram cortados**. E o G1 multiplicado por 23: se a descoberta depender so das descriptions e a
  premissa estiver errada, 23 skills param de disparar **em silencio**. A lista tambem carrega o
  protocolo "SEMPRE pergunte antes de invocar", ausente das descriptions. Precisa de lote proprio
  com verificacao real de descoberta — nao de coragem.

- **DI-Plano01-fase04-delta-lote3-divergiu-do-projetado**: projetado no relatorio **−1.039/sessao**,
  realizado **−374** (banner 4.131 -> 3.757). A divergencia e deliberada e explicada acima: ~370 dos
  chars projetados como corte sao a funcao de roteamento. **Aplicado o principio do relatorio
  ("apontar e o trabalho do hook"), nao o numero dele.** G4: registrar divergencia, nao forcar o
  numero.

- **DI-Plano01-fase04-hook-verificado-executando**: o hook foi **executado** apos o patch
  (`bash` sobre o `command` extraido), nao so validado como JSON. Renderiza, 23 skills presentes,
  setas e travessoes UTF-8 intactos. `hookDescriptionChars` do baseline: 2.081 -> **1.937**, com
  `hookListed` ainda **23** — a queda e o drift, nao descoberta perdida.

### fase-04 — lote 4 (descriptions), 6 commits

Dividido em 6 sub-lotes por delta decrescente (22 skills nao cabem no cap de 5). O 4f foi
**adicionado durante a execucao**, com aprovacao — ver DI abaixo.

| Sub-lote | Skills | Projetado | **Medido** |
|---|---|---|---|
| 4a | infrastructure, learn, git-workflow, doubt-driven, react-patterns | −1.732 | **−1.364** |
| 4b | code-simplification, anti-vibe-review, detect-architecture, grill-me, update | −1.012 | **−678** |
| 4c | init, api-design, decision-registry, qa-visual, sync | −809 | **−913** |
| 4d | source-driven, pair-programming, architecture, iterate, enhance-prompt | −408 | **−647** |
| 4e | verify-work, lessons-learned | −70 | **−150** |
| 4f | design-patterns, consultant, security, defensive-patterns | (fora da lista) | **−526** |

- **DI-Plano01-fase04-lista-de-22-nao-era-exaustiva**: a lista de descriptions da fase-03 ordenou por
  delta estimado e parou nas 22. Ao terminar o 4e, **os 4 maiores ofensores do repo eram skills que
  ela nunca listou** (`design-patterns` 579, `consultant` 386, `security` 386,
  `defensive-patterns` 362) — sozinho, `design-patterns` valia 8x o lote 4e inteiro. Dai o 4f.
  **Regra para a proxima auditoria: re-ranquear depois de cada lote, nao trabalhar a lista congelada.**

- **DI-Plano01-fase04-nome-proprio-e-gatilho-nao-sinonimo**: aplicado 5x (variante B do
  `system-design` como molde). `infrastructure` manteve Route 53/CloudFront/S3/Docker/Kubernetes;
  `design-patterns` manteve os 6 nomes GoF em parentetico; `security` manteve OAuth2/PKCE/RBAC/
  bcrypt/argon2/HMAC/CSRF/WAF intactos. Custo somado ~370 chars contra risco de invocacao perdida.

- **DI-Plano01-fase04-gatilho-ptBR-preservado**: `learn` e `qa-visual` tinham gatilhos duplicados em
  PT e EN. O relatorio mandava colapsar para um (`learn`: 15 -> 1). **Nao aplicado**: o dev deste
  repo trabalha em portugues, e colapsar para ingles economizaria ~60 chars trocando por risco de
  quebrar descoberta para exatamente quem usa a skill. Mantidos 3 PT + 2 EN em cada.

- **DI-Plano01-fase04-relatorio-errou-o-orfao-do-react**: o relatorio afirmava que `virtualization` e
  `code splitting` nao alcancam branch nenhum em `react-patterns`. **Falso** — estao em `:189` e
  `:192`, dentro de `## Checklist Rapido de Code Review` (`:178`). Corta-los teria removido a unica
  porta de entrada de material existente (G1 literal). Em vez disso o branch de review passou a ser
  **nomeado**, coisa que a description antiga nao fazia.

- **DI-Plano01-fase04-orfaos-que-o-relatorio-nao-achou**: o inverso tambem ocorreu. Em `api-design`
  o relatorio achou 1 trigger orfao (`keyset`); a verificacao achou **4** (`keyset`, `HATEOAS`,
  `filtering`, `sorting`). E separou os falsos-positivos: `status codes` (`:368-381`) e `versioning`
  (`:110`, `:348`) sao material real e sobreviveram nomeados. **Verificar trigger a trigger contra o
  corpo e o unico metodo que produziu os dois resultados.**

- **DI-Plano01-fase04-description-que-mente**: tres descriptions descreviam comportamento
  **inexistente**, nao apenas excessivo. `init` prometia "rules deployment" e "decisions registry
  initialization" (o codigo **migra** legado: `04-migrate-planning-and-manifest.ts:66-91`);
  `quick-plan` prometia "sem criar arquivos em disco" (lote 1b); `code-simplification` se chamava
  "Guia" depois que o lote 1b deu a ela Write/Edit/Bash. **Classe distinta de sprawl: nao e texto
  demais, e texto falso.**

- **DI-Plano01-fase04-trigger-que-roteia-errado**: `architecture` carregava `'design patterns'`,
  identico ao trigger da skill `design-patterns`. Nao era so duplicacao: `architecture §6` (`:280`) e
  Design **Principles** (Lei de Demeter, Tell-Don't-Ask, Composicao > Heranca) e `design-patterns §7`
  e **GoF**. Quem pergunta "design patterns" quer a segunda — o trigger mandava para o lugar errado.
  Trocado por "principios de design". A outra colisao apontada (`'REST vs GraphQL'`) **ja tinha sido
  resolvida** pelo corte do `api-design` no 4c.

- **DI-Plano01-fase04-security-era-o-oposto**: `security` entrou no 4f por contagem de chars e a
  verificacao **inverteu o diagnostico**. A skill tem 9 branches (`:114`-`:446`); a description
  cobria 8. `§9 Triagem de Vulnerabilidades de Dependencias` + `## Dependency Discipline` (`:494`)
  nao tinham gatilho nenhum. **Unico patch da fase que aumenta uma description (+33).** Description
  longa nao e sintoma; branch sem porta de entrada e.

- **DI-Plano01-fase04-yaml-sem-aspas**: 4 das 40 descriptions eram escalar YAML **sem aspas**
  (`pair-programming-with-agent`, `defensive-patterns`, `incident-response`, `parity-audit`). Texto
  novo com `": "` no meio **quebraria o parse** nessas. As duas que editei ganharam aspas junto e
  tiveram o frontmatter reparseado (6 campos cada). **Correcao de registro: o commit do lote 4d
  afirma que `pair-programming` era a unica sem aspas — errado, eram quatro.** O patch estava certo;
  a afirmacao, nao. Restam 2 sem aspas: `incident-response` e `parity-audit`.

- **DI-Plano01-fase04-anomalia-de-teste-nao-reproduzida**: durante o 4a, dois runs isolados falharam
  sem reproducao — `bun test skills` com **13 fail num run de 240s** (normal ~9s) e `bun test
  tests/e2e` com **1 fail**. Nao reproduzidos em 3 e 4 re-execucoes. Nenhum teste asserta texto de
  description (verificado), e os que citam essas skills sao do bloco `stack-aware-preface`, intocado.
  Runtime de 26x aponta contencao de ambiente. **Registrado como anomalia observada, nao como verde
  limpo** — se reaparecer, vira achado com evidencia.

### fase-04 — lote 7 (pontuais), commits `3bfdb4b` + `7d8bea5`

- **DI-Plano01-fase04-fence-e-bug-comportamental**: as 4 regioes de fence aninhado
  (`sync:81-94`, `:97-109`, `:176-205`, `verify-work:440-527`) estavam com fence externo de **3**
  backticks. O parser fecha no primeiro fence interno, e o conteudo **troca de lado**: em
  `verify-work`, o pseudocodigo `gerarMEMORYConsolidado` (`:483-508`) renderizava como prosa e os
  passos d/e/f do arquivamento (`:510-514`) viravam bloco de codigo. Fix do compound `2026-04-21`:
  externo com **4** backticks. Verificado por parser que respeita "fence de N so fecha com >= N":
  `sync` 8 blocos, `verify-work` 17, nenhum aberto ao fim.

- **DI-Plano01-fase04-correcao-heading-fantasma**: durante a analise eu tratei as duas ocorrencias de
  `## Anti-Vibe Coding — Status de Sincronizacao` (`sync:48`, `:177`) como headings fantasma criados
  pelo fence quebrado. **Errado** — `grep` e line-based e nao enxerga bloco; as duas ja estavam
  dentro de blocos corretamente pareados. O bug e o descrito acima, confirmado por leitura direta
  das linhas, nao pela contagem de headings. Registrado porque a inferencia errada quase virou
  evidencia no commit.

- **DI-Plano01-fase04-S5-consumido-pelo-lote-4**: a fase-03 contou **14** descriptions abrindo com
  "This skill should be used when the user asks" (602 chars). Ao chegar no lote 7, restava **uma**
  (`compound-engineering`) — as outras 13 sairam junto com as reescritas do lote 4. **Achado
  sistemico pode ser consumido por lote anterior; medir de novo antes de abrir o lote dele.**

- **DI-Plano01-fase04-satelites-6-para-3**: religados 3 dos 6 orfaos —
  `compound-engineering/references/capture-guide.md` (ponteiro no passo 5 do gate, que pedia titulo
  sem guia), `tdd-workflow/references/ia-tdd-workflow.md` (na secao `## IA-TDD`, que precisava dele)
  e `design-twice/examples/worked-session.md` (no Step 3). Os 3 restantes sao
  `init/lib/prompts/*.md`, que a propria fase-03 marcou como **falso positivo** — carregados por
  codigo, nao por ponteiro. **Metrica agora em 3 e nao deve ir a zero.**

- **DI-Plano01-fase04-package-manager-em-skill-distribuida**: `incremental-implementation` rodava
  `npm` em 4 sites num repo `bun`. Alinhado com as irmas (`incident-response`, `centralize-config`),
  que usam `bun run`. **Mas isso e correto so pela metade:** hardcodar gerenciador de pacote numa
  skill **distribuida** quebra nos dois sentidos — `bun run test` falha em projeto-alvo que usa npm,
  tanto quanto `npm test` falhava aqui. A regra da lente manda deixar o lookup de um comando para o
  environment (`package.json`). Nao inventei uma terceira convencao em 3 skills; fica como achado
  aberto no `AUDIT-REPORT.md`.

### fase-04 — lote 6a (telemetria, metade consultiva), commit `59bad47`

- **DI-Plano01-fase04-guard-comment-e-condicao-nao-veto**: cada bloco abria com "nao remover sem
  registrar em MEMORY.md". Isso e uma **condicao**, nao um veto: esta secao a satisfaz. Registrado
  porque o texto do guard e facil de ler como proibicao e ja tinha travado o lote uma vez.

- **DI-Plano01-fase04-lib-viva-prompt-morto**: o relatorio tratava "telemetria" como uma coisa so.
  Sao duas. O **prompt** esta morto — `SKILL.md` nao executa (compound `2026-05-12`),
  `grep -c telemetry hooks/hooks.json` = **0**, e nenhum arquivo em `scripts/`, `hooks/` ou `tests/`
  cita os simbolos. A **lib** esta viva: `skills/init/lib/emit-stack-knowledge-events.ts:5` importa
  `writeTelemetryDomainEvent`. Removi so os blocos.

- **DI-Plano01-fase04-superficie-de-teste-5-nao-1**: o brief original falava em "leva
  `telemetry-utils.test.ts:192` junto" — **uma** linha. Sao **5 testes em 3 describes**. Removidos
  os 2 smoke de `consultivas` (`:192`, `:202`); mantido `architecture skill preserves Tracer Bullet`
  sem a assertion de `writeTelemetryStart` (o `architectureProfile` que ele protege vive no bloco
  `profile-aware-preface`, intocado); `all 10 instrumented skills` estreitado para as 5
  pipeline-core e **renomeado** — um teste chamado "all 10" que checa 5 e exatamente o rotulo
  enganoso que a lente combate. Nao tocados: `exactly 10 skills are instrumented` (asserta a
  constante da lib, nao `SKILL.md`) e o `runtime smoke`. 44 → **42 testes**, 0 fail.

- **DI-Plano01-fase04-medir-em-LF-nao-no-working-tree** *(corrige um numero que eu ja tinha
  registrado aqui)*: o primeiro registro dizia **−7.527 (+270 sobre o projetado)**. Errado —
  media `wc -c` no working tree. `core.autocrlf=true` neste repo e `.gitattributes` so forca LF
  para `tests/fixtures/`, `__fixtures__/`, `*.snap` e `.husky/`: todo `SKILL.md` esta **CRLF em
  disco e LF no index**. As 46 linhas removidas por skill levavam 46 bytes de `\r` que a projecao
  nunca contou. Medido de novo contra os blobs (`git show <sha>:<path> | wc -c`): **−7.297**, ou
  **+40** sobre o projetado — 0,6%, nao 3,7%. **A projecao estava boa; a regua e que estava
  errada.** Formula real por skill, em LF: `1.439 + 2 × len(nome)` — o nome aparece em
  `__telemetry_skillName` e `__telemetry_fasePipeline`. `iterate` 1.453 · `consultant` 1.459 ·
  `architecture` 1.463 · `design-twice` 1.463 · `quick-plan` 1.459.
  **Delta de corpo em repo Windows so vale medido em LF.**

- **DI-Plano01-fase04-ancora-de-conteudo-nao-linha**: os 10 patches foram ancorados em conteudo
  (`---` + heading seguinte; prosa terminal + fence), nunca em numero de linha — o bloco 1 sai
  primeiro e desloca todo o resto do arquivo. Em `architecture` isso e critico: o fence de
  fechamento da telemetria e vizinho de `<!-- profile-aware-preface:start -->`, que e load-bearing
  (`scripts/harness-validate.ts:643`). Verificado depois: `harness:validate` passa, 361 md.

### fase-04 — lote 6b (telemetria, metade pipeline-core), commit `057398c`

- **DI-Plano01-fase04-6b-blocos-sao-de-fase-02**: os 10 blocos das pipeline-core dizem
  **`Plano 03 fase-02`**, nao `fase-03` como os das consultivas, e o bloco de fim carrega 2 linhas
  de comentario a mais (`CA-03: end emitido SEMPRE` e a limitacao do `sucesso=true` hardcoded).
  Custo em LF: **1.570 + 2 × len(nome)** contra 1.439 do 6a — os 131 bytes de diferenca sao
  exatamente esses 2 comentarios. Se eu tivesse reusado o `old_string` do 6a, os 10 Edits falhavam.
  **Bloco "identico" entre lotes e hipotese, nao fato — reler antes.**

- **DI-Plano01-fase04-6b-vizinho-nao-e-o-preface**: em 4 das 5 (`write-prd`, `plan-feature`,
  `execute-plan`, `verify-work`) o bloco de telemetria e seguido direto por outro
  ```` ```typescript ```` — `Perfil arquitetural` / `Modo dual`, do Plano 04, que usa
  `readArchitectureProfile`. **Nao e** o `profile-aware-preface`: `grep` por
  `profile-aware-preface` nas 5 retorna **zero**, entao o gate de `harness-validate.ts:643` nao
  cobre essas skills. Ancorei no primeiro comentario do bloco vizinho mesmo assim — o perigo real
  e cortar demais, e o gate so protege 9 skills, nao estas.

- **DI-Plano01-fase04-6b-hr-orfao-no-write-prd**: `write-prd` tinha um `---` de separacao entre
  `## Red Flags` e o bloco de telemetria. Removido o bloco, o `---` virava a ultima linha do
  arquivo, sem nada depois. Conferido que nao veio junto com a instrumentacao (`git show
  23c8204^` mostra o arquivo terminando numa lista numerada) e que **nenhum dos 40 `SKILL.md`
  termina em `---`**. Removido junto — sao 5 bytes, e por isso o delta de `write-prd` (1.593) e o
  unico que nao fecha na formula.

- **DI-Plano01-fase04-6b-superficie-zerada**: depois deste lote **nenhum teste le bloco de
  telemetria em `SKILL.md`**. Sobrou um unico teste tocando `SKILL.md` no arquivo — o do Tracer
  Bullet, que le `architectureProfile`. O describe `consultivas skills` foi renomeado para
  `architecture SKILL.md`: com um teste so, e sobre architecture, o nome antigo mentia.
  44 → 42 (6a) → **39 testes**, 0 fail.

### fase-04 — lote 5a (3 secoes de fechamento do S1), commit `379e10a`

- **DI-Plano01-fase04-5a-subtipo1-nao-existe**: a auditoria classificou 3 secoes como "reprojecao
  pura — deletar e seguro". Conferidas item a item, **as tres tem residuo de fonte unica**.
  `design-twice` bate no numero (11 de 12); `update` e **6 de 8**, nao 7 — o item 6 (backups nunca
  deletados automaticamente) tambem nao tem twin; e `write-prd` e o pior: os "4 de 4" contam as 4
  subsecoes numeradas e param **antes** do `### Escape Hatches`, que fica dentro da mesma secao e
  tem 3 regras sem twin nenhum. **Nenhuma secao do S1 e segura de deletar em bloco.** O resto do
  lote 5 tem que ser contado item a item, nao classificado por titulo.

- **DI-Plano01-fase04-5a-residuo-sobe-para-o-step**: em vez de deixar stub de um item so, o residuo
  foi promovido para junto do step a que pertence — item 8 do `design-twice` virou o 6 de
  `Regras para restricoes`; os dois do `update` foram para o `4.1 Criar Backup` e o fim do
  `4.2 Aplicar Estrategia`; o `### Escape Hatches` do `write-prd` virou `## Escape Hatches`. Por
  isso o delta liquido (**−2.635**) e menor que o tamanho das secoes (3.161): 344 chars voltaram.

- **DI-Plano01-fase04-5a-meu-grep-quebrado**: quase reportei o `design-twice` como claim falso da
  auditoria. O grep usava `\|` com `grep -E` — em ERE isso e pipe **literal**, nao alternacao, e os
  twins dos itens 3 e 9 (`:112`, `:108`) voltaram vazios. A auditoria estava certa. **Achado
  negativo por grep so vale depois de provar que o mesmo grep acha um caso positivo conhecido.**
  Mesma familia do compound `2026-06-05-grep-c-alternation-counts-import-line.md`.

- **DI-Plano01-fase04-5a-pool-e-rotulo**: pool re-medido antes de abrir o lote: **25.527 em 25
  secoes / 20 skills**, nao os 28.281/28/21 da fase-03 — os lotes 1-7 consumiram ~2.754 (mesmo
  efeito do S5 no lote 7). E **"terminais" e falso para 21 das 25**: so `design-twice`,
  `architecture`, `iterate` e `quick-plan` tinham a secao no fim do arquivo. Depois do 5a:
  **22.364 em 22 secoes / 18 skills**.

### fase-04 — 5b tentado e recusado por verificacao (nenhum commit de codigo)

- **DI-Plano01-fase04-5b-verify-work-e-falso-positivo**: eu mesmo propus o 5b como
  `verify-work ## Pipeline Integration` sozinha, por ser 27% do pool restante. **A verificacao
  matou o lote.** Dos 6.036 chars, **141 sao reprojecao** — o ponteiro de Learn Point, twin do
  `## Step 5`. O resto e fonte unica: `### Cleanup de Artefatos` 4.331 (91 linhas do procedimento
  de arquivamento do PRD), `### 0. Importar Contexto` 646, `### Ao Finalizar a Verificacao` 632,
  `### Escape Hatches` 257. `SUMMARY.md`, `/commit`, `/push`, `/open-pr`, `iterate harden` e
  `standalone` nao aparecem no corpo. **Nada aplicado.** Registrado em §Descartados para nao voltar.

- **DI-Plano01-fase04-5b-pipeline-integration-nao-e-S1**: o padrao que emergiu vale para a familia
  toda — `## Pipeline Integration` **nao e reprojecao dos steps**, e o contrato de pipeline da
  skill: de onde le, onde escreve, o que vem depois, como escapar. No `write-prd` ele duplicava o
  corpo por acidente (aquela skill detalha import/save dentro dos Steps 5 e 6); nas outras e o
  unico lugar que diz. **A tabela do S1 juntou 4 secoes por nome de heading, nao por conteudo.**

- **DI-Plano01-fase04-5b-escape-hatches-e-sempre-residuo**: `### Escape Hatches` aparece em 5
  skills e e **fonte unica em todas** — `standalone` da 0 hits no corpo de `plan-feature`,
  `grill-me` e `verify-work`; no `write-prd` ja tinha sido confirmado no 5a. **Qualquer sub-lote
  que toque `## Pipeline Integration` preserva o bloco inteiro, sem reconferir.**

### fase-04 — lote 5b (familia `## Regras`), commit `a45c04c`

- **DI-Plano01-fase04-5b-constraints-e-repeso-nao-duplicacao**: `qa-visual` e `tdd-workflow`
  sairam do lote na verificacao. Nos dois, `## Regras Inviolaveis` e o **conteudo unico** de um
  bloco `<constraints>` — cortar a secao esvazia o bloco. Nenhum teste assere a tag, **mas** a
  `COMPARISON-MATRIX` de 2026-06 trata os blocos `<constraints>` como escolha de design e cita a
  regra "NUNCA pular o Passo 1" do `qa-visual` como ponto forte contra a ferramenta de referencia.
  **Tag que re-pesa nao e duplicacao** — mesma familia do argumento do `profile-aware-preface`, so
  que aqui a funcao e retorica, nao mecanica. Fora de escopo ate alguem decidir mudar a convencao.

- **DI-Plano01-fase04-5b-ratio-real-56-porcento**: nas 3 secoes aplicadas, **19 de 34 itens**
  tinham twin (56%). O S1 supunha ~90%. `write-prd` 5 de 10, `plan-feature` 6 de 12,
  `execute-plan` 8 de 12. **Terceira verificacao seguida em que a premissa do S1 rende menos que o
  relatorio diz** — depois do subtipo 1 (5a) e do `verify-work` (5b recusado). O criterio usado foi
  estrito: so cortei item com **linha-twin nomeada**, nao item com "conceito presente".

- **DI-Plano01-fase04-5b-frontmatter-nao-e-twin**: dois itens do `execute-plan` (isolamento,
  troca de contexto) so apareciam na `description` do frontmatter. **Description nao conta como
  twin** — ela e o indice de descoberta, nao o corpo que o agente executa. O item 9 (transicao
  interativa) ficou por isso; o 1 (isolamento) saiu porque tinha twin real em `:781`.

## Pendencias abertas (fase-01)

- **`plugin-manifest.json` nao registra a skill nova.** O manifest lista os 39 `SKILL.md` entre 412
  arquivos com checksum; `writing-for-agents` nao esta la, e a fase-01 nao lista o manifest em
  "Arquivos Afetados". **Nenhum teste quebra** — `scripts/__tests__/generate-manifest.test.ts` so
  valida checksum de arquivo ja registrado. Mas sem entrada no manifest a skill nao e distribuida
  pelo mecanismo de update. Fechar com `bun run generate:manifest` antes do merge do plano — fora do
  escopo desta fase, decisao do humano.

## Numeros de referencia

Baseline do `../CONTEXT.md` (2026-08-10) vs. medicao desta fase (2026-08-11):

| Metrica | CONTEXT.md | Medido 2026-08-11 |
|---|---|---|
| Chars em descriptions de frontmatter | 15.149 | **14.522** (com aspas) / **14.452** (sem) |
| Skills com `disable-model-invocation: false` | 36 de 39 | 36 de 39 ✓ (as outras 3 omitem = mesmo default) |
| Skills user-invoked-only (`true`) | — | **0 de 39** |
| Maior ofensor (`system-design`) | 1.497 | **1.483** |
| Hook `SessionStart` relista skills | 23 | 23 ✓ (observado no output do hook) |

A fase-02 reproduz via script. O alvo e a coluna **medida**, nao a do CONTEXT.md.

## Gates entre fases

- **fase-02 -> fase-03:** o achado do tracer em `system-design` precisa ser acionavel, com delta
  numerico. Generico = fase-01 volta para revisao.
- **fase-03 -> fase-04:** todo achado precisa de evidencia citada + delta projetado. E `git status`
  limpo em `skills/`.
- **dentro da fase-04:** cada lote (max 5 arquivos) aguarda aprovacao antes do proximo.

## Gotchas de ambiente (pre-existentes, nao desta feature)

- **GT-01 — `bun run test` nao roda neste Windows.** `scripts/run-tests.ts` enumera os 263 arquivos
  de teste numa unica linha de comando (11.690 chars); `cmd.exe` corta em 8.191 → "Linha de comando
  muito longa". Contorno usado: rodar por diretorio (`bun test skills`, `bun test tests/e2e`, ...).
- **GT-02 — `tests/repo-structure/version-bump.test.ts` com 4 falhas pre-existentes.** O teste fixa
  `EXPECTED_VERSION = '7.4.0'`; o repo esta em `7.5.0` desde o commit de release `786678d`. Le apenas
  arquivos `.json`, nenhum tocado nesta fase.

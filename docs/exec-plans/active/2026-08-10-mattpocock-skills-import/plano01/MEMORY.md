# Memory: Plano 01 — Porte `writing-for-agents` + Auditoria

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** fase-02 executada — aguardando aprovacao para fase-03
**Branch:** `feat/writing-for-agents-port` (criada 2026-08-11, a partir de `main`)

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Porte do nucleo | **done** | 2 novos + 1 modificado |
| 02 | Instrumentacao + tracer | **done** (aguardando aprovacao) | 2 novos + 1 gerado |
| 03 | Auditoria fan-out | planned | 0/1 |
| 04 | Aplicacao dos patches | planned | escopo definido pela fase-03 |

Entregue na fase-01: `skills/writing-for-agents/SKILL.md` (220 linhas),
`skills/writing-for-agents/SKILL-MECHANICS.md` (56 linhas), bloco de atribuicao MIT em
`THIRD-PARTY-NOTICES.md`. Zero diff em `skills/*/SKILL.md` pre-existentes (INV-03 mantida).

Entregue na fase-02: `scripts/audit-skill-docs.ts` + `scripts/audit-skill-docs.test.ts` (14 testes),
baseline em `docs/generated/skill-audit-baseline.json` (40 registros). INV-03 mantida.

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

## Achados novos, abertos (surgiram ao aplicar)

- **`SKILL-MECHANICS.md` nao e distribuido.** `scripts/generate-manifest.js:172-202` varre, dentro de
  cada skill, apenas `references/`, `templates/`, `lib/` e `assets/`. **Arquivo irmao do `SKILL.md`
  nao entra.** Das 114 satelites `.md` registradas hoje, zero e irma do `SKILL.md` — a convencao do
  repo e subpasta. Consequencia: em projeto-alvo o ponteiro da `writing-for-agents` para
  `./SKILL-MECHANICS.md` fica pendurado. Correcao proposta: `git mv` para
  `references/SKILL-MECHANICS.md` + atualizar os 3 ponteiros no `SKILL.md`. **Nao aplicada** — muda a
  estrutura entregue na fase-01, decisao do humano.
- **`triggerCount` mede estilo de aspas, nao branch.** Depois do patch, `system-design` reporta
  **0 triggers** — a variante B nao usa aspas simples. A description tem 11 branches e 9 nomes; a
  metrica le zero. Como proxy de ranqueamento isso inverte o sinal: skill corrigida parece perfeita,
  skill intocada parece pessima. **A fase-03 nao pode ranquear por `triggerCount` como esta.**
  Opcoes: renomear para `quotedTriggerCount` e ranquear por `descriptionChars`, ou contar clausulas
  separadas por virgula apos "asks about". Decisao do humano antes da fase-03.
- **O teste de checksum do manifest amostra 3 de 414 arquivos** (`generate-manifest.test.ts:114-128`,
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

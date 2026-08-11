---
title: "Import de skills do mattpocock/skills"
status: in-progress
created: 2026-08-10
skill: analise-manual (sem /grill-me — analise direta do repo-fonte)
---

# Context: Import de skills do `mattpocock/skills`

Analise completa do repo-fonte e triagem das 35 skills contra o inventario do
Anti-Vibe-Coding (39 skills). Este documento e a fonte da verdade das **decisoes tomadas**;
os planos de execucao vivem em `plano01/`, `plano02/`, ...

## Fonte

| Campo | Valor |
|---|---|
| Repo | https://github.com/mattpocock/skills |
| Commit analisado | `84fdeff` (2026-08-06) |
| Versao do plugin | 1.2.3 |
| Licenca | MIT (Copyright (c) 2026 Matt Pocock) |
| Total de skills | 35 (18 engineering, 7 productivity, 4 misc, 6 in-progress) |

**Obrigacao de licenca:** atribuicao em `THIRD-PARTY-NOTICES.md` para todo material portado.

## Filosofia do repo-fonte

Declarada no README: *"small, easy to adapt, composable"* — posicionado explicitamente contra
GSD/BMAD/Spec-Kit, que "tomam o controle do processo e tornam bugs no processo dificeis de resolver".

Um unico eixo organiza tudo: **quem pode invocar**.

- **User-invoked** — so o humano digitando. `disable-model-invocation: true`. Description humana.
  Zero context load, paga cognitive load. Papel: orquestrar.
- **Model-invoked** — modelo ou humano. Description com triggers ricos. Paga context load
  permanente. Papel: guardar disciplina reutilizavel.

Regra estrutural: uma skill user-invoked pode invocar model-invoked, nunca outra user-invoked.

**Diferenca de porte que importa:** as skills dele tem 7–140 linhas (media ~60). As nossas tem
60–982. Ele empurra tudo para arquivos satelite via progressive disclosure. Isso nao e estilo —
e a tese da `writing-for-agents`, e ela mesma e a primeira a ser portada.

## Triagem completa — 35 skills

### Gap real (nao temos equivalente)

| Skill | Nucleo | Plano |
|---|---|---|
| `writing-for-agents` | Meta-referencia de escrita para agentes: context pointers, as duas cargas, hierarquia da informacao, criterios de completude, leading words, poda | **plano01** |
| `improve-codebase-architecture` | Varredura periodica por deepening opportunities (escopada por hot spot de git) -> relatorio HTML com before/after e selo de forca. **Primeira skill proativa do plugin** — todo o resto e reativo a mudanca recem-feita | **plano07** (loop de grilling adiado, DI-25) |
| `wizard` | Gera wizard bash interativo para passos que so o humano faz. `template.sh` pronto (204 linhas) | **plano03** |
| `wayfinder` | O **estagio de descoberta** — destino visivel, caminho nao. Mapa de decision tickets, fog of war, out-of-scope, 1 ticket/sessao, HITL vs AFK. Entra na frente do pipeline: `wayfinder` → `write-prd` → `plan-feature` → `execute-plan` | **plano10** |
| `prototype` | Codigo descartavel que responde UMA pergunta. Ramo LOGIC (HTML unico dirigivel por nao-desenvolvedor, com modulo puro liftavel dentro) / ramo UI (N variantes numa rota via `?variant=`) | **plano08** |
| `domain-modeling` | Glossario de linguagem ubiqua (Evans) em **`docs/GLOSSARY.md`** (DI-12). A metade ADR vira absorcao no `decision-registry`, nao skill (DI-17) | **plano05** — inclui o scaffold (entry no `TEMPLATE_MANIFEST` + linha em "When to Read What") |
| `resolving-merge-conflicts` | Resolver por intencao rastreada a fonte primaria de cada lado; sempre resolver, com escape estreito para merge iniciado errado | **plano09** — enriquecida com 3 compounds de git deste repo (DI-30) |
| `wait-what` | 7 linhas: "repitch em Simplified Technical English usando o vocabulario do `docs/GLOSSARY.md`" | a decidir — **desbloqueada** (CO-01 resolvida). Depende de `domain-modeling` ter criado o glossario, senao nao tem vocabulario para usar |

### Overlap parcial — tecnica isolada vale absorver

| Skill | Nosso equivalente | O que extrair |
|---|---|---|
| `codebase-design` | `tdd-workflow/references/deep-modules.md` (118 linhas) | **seam** (zero ocorrencias no plugin), **adapter** como papel, **leverage vs locality**, **deletion test**, "a interface e a superficie de teste", "1 adapter = seam hipotetico, 2 = real", seams internos vs externos, interface = tudo que o caller precisa saber (invariantes/ordem/erros/perf). Do `DEEPENING.md`: 4 categorias de dependencia + "replace, don't layer". **Corrige um bug conceitual nosso** — ver CF-01 abaixo. → **plano02** |
| `diagnosing-bugs` | `incident-response` | Fase 1 = construir feedback loop *tight* (10 formas ranqueadas, criterio binario de saida). Minimizar. 3-5 hipoteses falsificaveis antes de testar. Logs taggeados `[DEBUG-xxxx]`. Branch de perf. Regression test so em *seam correto* — ausencia de seam E o achado. **plano06** (absorve e reenquadra, DI-20) |
| `code-review` | `verify-work`, `anti-vibe-review`, agente `code-reviewer` | **Corrigido — ver TR-03.** O eixo Spec **existe** (`code-reviewer.md:18,35`), mas so numa direcao: pergunta se o codigo faz o que a spec diz, nunca se faz o que ela **nao** pediu (scope creep). Falta: separacao em dois eixos paralelos com regra de nao re-ranquear · diff contra **ponto fixo** que o usuario escolhe (o nosso usa `HEAD~1`/staged/`status`) · **8 dos 12 smells de Fowler**, incluindo os que so aparecem num diff |
| `grilling` | `grill-me` | Design tree + frontier + rounds; parada por fronteira vazia; fatos nao-bloqueantes. **plano04** (absorvido, DI-14) |
| `tdd` | `tdd-workflow` | Anti-padrao **tautologico**; seams pre-acordados com o usuario; "refactoring nao e parte do loop" |
| `teach` | `learn` | Workspace stateful multi-sessao (MISSION/GLOSSARY/LEARNING-RECORD/RESOURCES) |
| `git-guardrails-claude-code` | `hooks/` | PreToolUse bloqueando `push`, `reset --hard`, `clean -f`, `branch -D` |
| `research` | `source-driven-development` | So o "rodar como background agent + gravar na convencao do repo" |
| `to-spec` | `write-prd` | Variante **sem entrevista** — sintetiza o ja discutido |
| `to-tickets` | `plan-feature` | Arestas de bloqueio explicitas (DAG) |
| `grill-with-docs` | — | Padrao de composicao (wrapper de 7 linhas: grilling + domain-modeling). **Desbloqueada** (CO-01 resolvida), mas so faz sentido depois de `domain-modeling` |
| `setup-pre-commit` | — | Husky + lint-staged. Generico |
| `setup-ts-deep-modules` | — | dependency-cruiser forcando deep modules. TS-only, in-progress |
| `to-questionnaire` | — | Decisao que voce nao sabe responder -> questionario. "Grill the send, not the subject" |
| `triage` | — | Maquina de estados de triagem. Exige issue tracker + labels |

### Fora de escopo

`ask-matt` (nosso hook SessionStart ja roteia) · `implement` (temos execute-plan) ·
`setup-matt-pocock-skills` (temos init) · `grill-me` dele (wrapper + colisao de nome) ·
`handoff` / `claude-handoff` (ai-memory ja cobre) · `migrate-to-shoehorn` (lib especifica) ·
`scaffold-exercises` (autoria de curso) · `loop-me` (nicho, in-progress) ·
`writing-beats` / `writing-fragments` / `writing-shape` (prosa, nao engenharia)

## Correcoes da triagem

Registradas em vez de apagadas — a triagem inicial foi feita lendo o repo-fonte e comparando com o
*inventario de nomes* de skills, nao com o conteudo dos arquivos `references/`. Isso produziu erro.

**TR-01 (2026-08-10) — `codebase-design` foi classificada como "gap real"; e overlap parcial.**
Ja existe `skills/tdd-workflow/references/deep-modules.md` (118 linhas), alcancada por 3 ponteiros
(`tdd-workflow:119`, `anti-vibe-review:95`, `verify-work:170`). E `design-twice` ja cita Ousterhout.
O gap verdadeiro e mais estreito: nossa referencia trata **profundidade da interface**; falta o eixo
de **onde a interface fica** (seam) e **o que a atravessa** (adapter).

**TR-02 (2026-08-10) — o item #1 do `ANALYSIS.md` foi dado como pendente; ja estava executado.**
O plano01 afirmava que `## Common Rationalizations` + `## Red Flags` "nunca virou doc". Verificacao:
**19 skills tem `Common Rationalizations`, 17 tem `Red Flags`.** `decision-registry` e o exemplar do
formato (tabela racionalizacao -> realidade). Corrigido em `plano01/README.md` e
`plano01/fase-01-porte-nucleo.md`.

**TR-03 (2026-08-10) — o eixo Spec do `code-review` foi dado como ausente; existe parcialmente.**
A triagem afirmava que "`verify-work` audita qualidade, nao fidelidade a spec". O agente
`code-reviewer` **tem** conformidade com spec: linha 18 (*"o codigo faz o que a spec ou task diz?
Verificar outputs esperados, contratos de funcao, invariantes documentados"*) e linha 35 (*"leia a
spec, task ou PRD relacionados antes de revisar — o que parece errado pode ser uma escolha
deliberada documentada"*).

O gap real e mais estreito, e em tres pontos:

1. **Direcao unica.** Pergunta se o codigo faz o que a spec diz (faltante/errado); nunca se faz o
   que ela **nao pediu** (scope creep)
2. **Sem separacao de eixos.** Spec-conformance e um bullet dentro da dimensao de correctness do
   `code-reviewer`, ao lado de null/boundary/error-paths. A fonte separa em dois subagentes
   paralelos justamente para um eixo nao mascarar o outro, e **proibe re-ranquear entre eles**
3. **Base do diff.** O nosso identifica arquivos por `git diff HEAD~1` / staged / `git status`; a
   fonte pina um **ponto fixo que o usuario escolhe** (commit, branch, tag, merge-base) com diff de
   tres pontos. Revisar uma branch inteira e outro escopo que revisar o ultimo commit

**Licao (vale para TR-01, TR-02 e TR-03 — mesma raiz):** afirmacao vinda de doc de planejamento
antigo, ou de leitura so do `SKILL.md` sem os `agents/`, e **hipotese**, nao fato. Antes de escrever
plano em cima dela, verificar por grep de conceito — em `skills/*/references/*.md`, no corpo das
skills **e em `agents/*.md`**. Os tres erros desta sessao vieram de confiar num artefato ou numa
leitura parcial sem reverificar.

## Conflitos encontrados (CF)

**CF-01 — nossa metrica de profundidade premia inchar a implementacao.**
`deep-modules.md` §Sinais de Shallow Module, sinal 3: *"Interface tem mais linhas que a
implementacao"*. A `codebase-design` rejeita essa metrica nominalmente:

> *Depth as ratio of implementation-lines to interface-lines* (Ousterhout): **rewards padding the
> implementation.** We use depth-as-leverage instead.

Um modulo com 500 linhas redundantes "pontua" mais profundo que um com 50 densas. A referencia e
consumida pelo pre-check de deep modules do `verify-work` e pelo `anti-vibe-review`, entao o vies
propaga para auditoria. **Corrigido no plano02 fase-01** — ratio-de-linhas sai, leverage entra.

**CF-02 — `DESIGN-IT-TWICE.md` e redundante com o nosso `design-twice`.**
O nosso tem 385 linhas, 4 dominios, 7 divergence lenses, deteccao de convergencia e registro de
decisao. O satelite dele tem ~40 linhas e e uma especializacao estreita (desenhar a interface de um
candidato a deepening). Aproveitavel: 2 das 4 restricoes que o nosso Dominio 1 nao cobre — "otimize
para o caller mais comum" e "ports & adapters" — mais o contrato de output. Vira **5o dominio**,
nao porte de arquivo. **plano02 fase-03.**

## Colisoes conhecidas

**CO-01 — `CONTEXT.md` com duas semanticas. RESOLVIDA em 2026-08-10 — nao era colisao.**

Diagnostico inicial (errado): "nosso `grill-me` escreve decisoes indexadas em `CONTEXT.md`; o
`domain-modeling` dele exige glossario puro; incompativel no mesmo arquivo — bloqueia o porte de
`domain-modeling`, `wait-what` e `grill-with-docs`."

Verificacao por Glob: **15 `CONTEXT.md` neste repo, todos dentro de `docs/exec-plans/`. Zero na
raiz.** Os dois artefatos nunca ocupam o mesmo caminho:

| | Nosso `CONTEXT.md` | `CONTEXT.md` do Matt |
|---|---|---|
| Caminho | `docs/exec-plans/{active,completed}/{data}-{slug}/CONTEXT.md` | raiz do repo |
| Conteudo | decisoes indexadas (D1, D2...) de uma entrevista `/grill-me` | glossario de linguagem ubiqua |
| Escopo | uma feature | o projeto inteiro |
| Ciclo de vida | efemero; migra para `completed/` com o plano | permanente; cresce |
| Consumidores | `write-prd`, `design-twice` | `domain-modeling`, `wait-what`, `tdd`, `diagnosing-bugs`, `improve-codebase-architecture` |

**O problema residual, que e real e menor:** as skills dele abrem com *"read `CONTEXT.md` (if it
exists)"*. Portada literalmente num repo nosso, essa linha faz o agente dar Glob em `CONTEXT.md`,
achar 15 arquivos e ler o log de decisoes de uma feature qualquer achando que e o glossario.
Comportamento errado garantido, nao ambiguidade teorica.

**Resolucao:** glossario vai para `docs/GLOSSARY.md` (DI-12); nosso `CONTEXT.md` por-feature nao
muda (DI-13). Toda referencia a `CONTEXT.md` nas skills portadas e reescrita para `docs/GLOSSARY.md`
— mecanico, mas **obrigatorio em cada porte**. Skills afetadas: `domain-modeling`, `wait-what`,
`grill-with-docs`, `tdd`, `diagnosing-bugs`, `improve-codebase-architecture`.

**Nao bloqueia mais nada.**

**CO-02 — `grill-me` com nome identico e conteudo diferente. RESOLVIDA em 2026-08-10.**

O dele e wrapper de 7 linhas sobre `grilling`; o nosso e a skill inteira (463 linhas). A colisao e
real, mas estava escondendo a pergunta que importa: **o primitivo de entrevista vale extracao no
nosso harness?**

Os dois nao competem — sao eixos diferentes:

| | Nosso `grill-me` | `grilling` dele |
|---|---|---|
| Eixo | **cobertura** — 7 categorias garantidas (escopo, dados, UX, edge cases, performance, seguranca, integracao) | **estrutura** — design tree, frontier, rounds |
| Parada | `95%` + min 5 / max 20 | fronteira vazia |
| Fatos | Passo 2, fase unica de exploracao do codebase | regra permanente, com despacho nao-bloqueante |
| Ritmo | perguntas em sequencia | a fronteira inteira por rodada, numerada |

Nossa cobertura garante que seguranca nao seja esquecida. A estrutura dele garante que nada seja
perguntado fora de ordem nem assumido em silencio.

**Contagem de consumidores** (o que decide extrair ou absorver): ele tem 5 (`grill-me`,
`grill-with-docs`, `triage`, `wayfinder`, `improve-codebase-architecture`). Nos temos 2 pesados
(`grill-me` 17 mencoes, `write-prd` 6) e 2 leves (`consultant` 2, `quick-plan` 1).

**Resolucao:** absorver no `grill-me` (DI-14), sem skill nova e sem colisao. Se `wayfinder` e
`improve-codebase-architecture` forem portadas, os consumidores viram 4-6 e a extracao se paga —
extrair de uma versao funcionando e barato; o inverso nao e. **plano04.**

**Nao bloqueia mais nada.**

**CO-03 — modelo de frontmatter divergente.** Ele tem 2 estados (`disable-model-invocation`
presente/ausente). Nos temos 6 campos (`user-invocable`, `disable-model-invocation`,
`allowed-tools`, `argument-hint`, `context`, `agent`, `kind`). A consequencia e conceitual:
para ele, user-invoked = **zero context load**. Para nos, `user-invocable: true` +
`disable-model-invocation: false` e o default em 36 de 39 skills — pagamos context load em tudo
e nao colhemos o trade-off. **Toda secao "Invocation" portada precisa ser reescrita, nao traduzida.**

## Achado medido (baseline, 2026-08-10)

Aplicando as lentes da `writing-for-agents` no nosso proprio repo:

| Metrica | Valor |
|---|---|
| Chars em descriptions de frontmatter (sempre carregados) | 15.149 (~3.800 tokens) |
| Skills com `disable-model-invocation: false` | 36 de 39 |
| Maior ofensor | `system-design` — 1.497 chars de description (~90 keywords de trigger) |
| Duplicacao | o hook `SessionStart` relista 23 skills com descricao — as descriptions sao pagas **duas vezes** |

Pela regra "um trigger por branch", a maioria das ~90 keywords do `system-design` sao sinonimos
renomeando o mesmo branch. Isso e a definicao de **duplicacao** do doc-fonte, no nosso harness.

## Decisoes tomadas

| ID | Decisao | Razao |
|---|---|---|
| DI-01 | `writing-for-agents` entra como **skill model-invoked** em `skills/writing-for-agents/`, nao como doc em `docs/` | Deve disparar sozinha ao editar qualquer `SKILL.md`/`AGENTS.md`/`CLAUDE.md` — exatamente quando e util. E `docs/` nao e distribuido por `sync-to-global.sh` (ARCHITECTURE.md §Conventions), entao um doc ficaria preso neste repo |
| DI-02 | Escopo do plano01 = **porte + auditoria das 39 skills** | Escolha explicita do usuario. Fatiado em 4 fases por causa do cap de 5 arquivos/fase do CLAUDE.md global |
| DI-03 | Corpo em **pt-BR**, description em **EN**, leading words **mantidas em ingles** | Padrao majoritario do repo. `sediment`/`sprawl`/`tight`/`red`/`seam` traduzidos perdem o prior pre-treinado que e a unica razao de existirem |
| DI-04 | Auditoria produz **relatorio, nunca edicao automatica** | Regra registrada do usuario: sugerir, nunca executar. E o teste do no-op e comportamental — resolve rodando o documento, nao debatendo |
| DI-05 | Trabalho em branch `feat/writing-for-agents-port` + PR | Regra registrada: nunca commit direto na main deste repo |
| DI-06 | `codebase-design` **expande a referencia existente**; nao vira skill nova | Single source of truth — a referencia ja existe com 3 ponteiros resolvendo. Skill nova custaria +1 description permanente **no mesmo plano que audita esse excesso** (15.149 chars medidos). Referencia paga zero context load; so a linha de quem a alcanca |
| DI-07 | `DEEPENING.md` entra como **secao** da referencia, nao como satelite | As 4 categorias de dependencia decidem *como testar atraves do seam* — e o elo com o TDD, que e onde a referencia ja e consumida. Material sempre lido junto nao ganha nada sendo separado |
| DI-08 | 5o dominio do `design-twice` em **fase propria** | Arquivo diferente, criterio de aceite diferente. Misturar com a expansao da referencia daria uma fase com dois "prontos" distintos |
| DI-09 | `wizard`: bash unico, com os 2 defeitos corrigidos. Sem variante PowerShell | Template verificado nesta maquina (Git Bash 5.2.37): `explorer.exe`, `tput`, `mktemp`, `gh` presentes. Biblioteca paralela em PS seria ~200 linhas duplicadas — toda mudanca viraria duas, exatamente o que o plano01 audita |
| DI-10 | `wizard` e **model-invoked** | Dispara quando o trabalho esbarra em passo humano-only — momento em que o humano nao lembraria de pedir. E no nosso harness skill user-invoked nao e alcancavel por outra skill, entao `infrastructure` e `init` nao conseguiriam invoca-la |
| DI-11 | Integracao = ponteiro em `infrastructure` + ponteiro em `init` + **dogfood real** | O dogfood existe porque o compound `2026-05-12-skill-md-code-blocks-do-not-execute` registra o erro inverso: suite verde mascarando integracao nunca testada end-to-end |
| DI-12 | Glossario de linguagem ubiqua vive em **`docs/GLOSSARY.md`** no projeto-alvo | Irmao natural de `DESIGN.md` e `CODE_STYLE.md`, que e onde o `/init` ja scaffolda documentacao. A descoberta usa o mecanismo existente: uma linha na tabela "When to Read What" do `AGENTS.md` — o mesmo context pointer de todo doc do plugin. Raiz esta reservada a `AGENTS`/`ARCHITECTURE`/`CLAUDE`/`README`; um quinto doc de raiz mudaria a convencao de todo projeto que roda `/init` |
| DI-13 | Nosso `CONTEXT.md` por-feature **nao e renomeado** | Com o glossario em `docs/GLOSSARY.md` os dois nomes deixam de disputar sentido. Renomear custaria 15 arquivos + `grill-me` + `write-prd` + `design-twice` + template do PRD + as referencias `Context:` dentro dos PRDs, para resolver uma ambiguidade que DI-12 ja dissolve. E `DECISIONS.md` colidiria com o `decisions.md` que ja existe na raiz deste repo |
| DI-14 | `grilling` **absorvido no `grill-me`**; extracao adiada | 2 consumidores hoje nao pagam uma description permanente. Extrair de uma versao funcionando e barato; o inverso nao e. Reavaliar quando `wayfinder` ou `improve-codebase-architecture` entrarem |
| DI-15 | **Fronteira vazia** substitui `95%`; piso de 5 perguntas sai | `95%` e o bound vago que convida *premature completion* — o conceito que o plano01 porta. Fronteira vazia e binario e nao negociavel. Piso de 5 perde sentido: fronteira vazia com 2 perguntas significa que a feature era simples mesmo |
| DI-16 | Fatos viram **regra permanente nao-bloqueante**, substituindo o Passo 2 como fase unica | "Achar fatos e seu trabalho; decisoes sao do usuario". Pergunta que precisa de fato descoberto no meio da entrevista nao pode voltar para o usuario. Nao-bloqueante: so as perguntas a jusante daquele fato esperam o subagente |
| DI-17 | `domain-modeling` **quebra em duas**: glossario vira skill nova; ADR vira absorcao no `decision-registry` | Veredito oposto por metade. Glossario e gap total (grep confirma zero). No ADR nos ganhamos: 260 linhas + `adr-writer.ts` + numeracao automatica + lifecycle + cross-link, contra "um ADR pode ser um unico paragrafo". Portar inteiro duplicaria o `decision-registry` |
| DI-18 | ADR ganha **tier leve** ao lado do completo | Nossos Red Flags exigem `Alternatives Considered`. Mas "desvio deliberado" e "restricao invisivel" nao tem alternativa a comparar — o caminho obvio e o default rejeitado, nao uma opcao avaliada. Hoje esse ADR nao cabe no formato, entao **nao e escrito** — e sao os que impedem alguem de desfazer escolha deliberada |
| DI-19 | **Nao** portar multi-contexto (`CONTEXT-MAP.md`) | Resolve monorepo grande com times separados por bounded context. Dobraria a superficie da skill (inferir contexto, quando criar o mapa, como relacionar) para um caso que talvez nunca apareca |
| DI-20 | `diagnosing-bugs` **absorve e reenquadra** o `incident-response`; escopo passa de "pos-deploy" para "bug dificil ou regressao de perf, prod ou dev" | Compartilhariam ~70% da disciplina. Duas skills separadas seriam confundidas no momento do bug. **Custo aceito:** o nome deixa de descrever o escopo — mitigado pela `description`, que e o que dirige invocacao |
| DI-21 | O `hitl-loop.template.sh` entra | 44 linhas; e o ultimo recurso das 10 formas de construir loop — quando um humano precisa clicar, dirige ele de forma estruturada em vez de perder o loop. Mesma familia do `template.sh` do wizard (plano03) |
| DI-22 | **3-5 hipoteses ranqueadas com predicao obrigatoria**, mostradas ao dev antes de testar | Hipotese unica ancora na primeira ideia plausivel — e e o que fazemos hoje. Sem predicao enunciavel, e palpite. Mostrar antes e o checkpoint mais barato: o dev re-ranqueia na hora. Nao bloqueia se ele estiver AFK |
| DI-23 | Relatorio de arquitetura em **HTML com Tailwind + Mermaid via CDN** | O diagrama before/after e o diferencial — ver a forma rasa e a aprofundada lado a lado comunica o que prosa nao comunica. Markdown perderia o layout em cards com selo de forca |
| DI-24 | Relatorio gravado no **temp do OS**, nunca no repo | Efemero por natureza; o que sobrevive e o candidato escolhido, que vira ADR ou mudanca. Versionar relatorio que envelhece rapido poluiria o repo |
| DI-25 | `improve-codebase-architecture` entrega **varredura + relatorio**; o loop de grilling fica para fase futura | O loop depende de plano04 (frontier) e plano05 (`domain-modeling`). Sem ele a entrega depende so do plano02 e ja resolve o ponteiro pendurado do plano06 fase-03. Termina em "qual voce quer explorar?" e encaminha para `/design-twice` |
| DI-26 | `prototype` porta **os dois ramos** (LOGIC e UI) | LOGIC e universal — um HTML abre em qualquer lugar, e um nao-desenvolvedor dirige. UI e onde a maior parte do tempo de design vai, e o plugin ja tem knowledge de Next.js/React para projetos-alvo. **Custo declarado:** o ramo UI nao da para dogfoodar neste repo (plugin CLI, sem rotas) |
| DI-27 | `prototype` e **model-invoked** | Construir prototipo e justamente o que ninguem lembra de fazer — discutir no abstrato parece mais barato na hora e sai mais caro depois. E permite que `design-twice` o alcance por nome |
| DI-28 | Integracao = ponteiro em `design-twice` + ponteiro em `qa-visual` + **dogfood LOGIC real** | `design-twice` gera propostas em texto; `prototype` torna executavel — ciclo explorar → sentir. `qa-visual` percorre as variantes via Playwright, comparando na mesma dimensao. Dogfood no ciclo de vida do ADR, que tem transicoes ilegais de verdade |
| DI-29 | `resolving-merge-conflicts` e **skill separada**, model-invoked; nao absorve no `git-workflow-and-versioning` | O gatilho e um **estado detectavel** (`MERGE_HEAD`/`REBASE_HEAD`, marcadores `<<<<<<<`), nao um topico. E a description atual do `git-workflow` nao dispararia num conflito — inflar ela com gatilho de conflito custa os mesmos bytes, dentro de uma skill de 377 linhas |
| DI-30 | Entram os **3 compounds de git** deste repo, citados nos passos onde a decisao acontece | `merge-not-rebase-after-tag` (passo 1) · `git-stash-parallel-processes` (passo 1 — stash e o instinto de quem topa num conflito, e rodamos subagentes em paralelo) · `git-revert-range-vs-loop` (passo 5). Transformam um porte de 14 linhas em algo que so este repo teria |
| DI-31 | Regra **"sempre resolva"** com escape estreito | Abortar nao faz o conflito sumir — adia e joga fora o entendimento. Escape: se o *merge em si* estava errado (branch/base/direcao), abortar e correto. Escrito como pergunta — *o merge esta errado, ou a resolucao esta dificil?* — para nao virar porta dos fundos |
| DI-32 | `wayfinder`: mapa e tickets em **markdown local** (`MAP.md` + `tickets/NNN-slug.md` na pasta datada do esforco) | A fonte preve esse fallback explicitamente. Unica opcao consistente com local-first e com a regra de que so codigo do plugin vai para o GitHub. GitHub Issues espalharia o planejamento entre repo e tracker |
| DI-33 | A fronteira vira **script** (`scripts/wayfinder-frontier.ts`) | O que se perde com markdown e a fronteira renderizada na UI do tracker. O script recupera — e, diferente da query do tracker, **e testavel**. Mesmo padrao de `parity-audit.ts` e `compound-check.ts` |
| DI-34 | Os **4 tipos de ticket** entram, com degradacao | `research` ja funciona (subagente + `source-driven-development`); `prototype` e `grilling` degradam para conversa ate plano08 e plano04 entregarem. Esperar tres planos deixaria o ultimo gap real adiado indefinidamente |
| DI-35 | `code-review` **absorve** nos existentes; sem skill nova | Tres cirurgias: 8 smells de Fowler no `code-smell-detector` (9 → 17) · direcao dupla no `code-reviewer` (scope creep) · ponto fixo escolhido pelo usuario no `verify-work`. Skill nova duplicaria as 619 linhas do `verify-work` |
| DI-36 | **Rejeitar** "refactoring nao e parte do loop"; manter RED-GREEN-REFACTOR | Refatorar com teste verde na mao **e** a rede de seguranca que torna o refactor seguro, e e quando o codigo esta mais fresco. A preocupacao da fonte (refactor grande escondido em commit de feature) e legitima, mas e problema de **granularidade de commit** — `git-workflow-and-versioning` ja pede atomicidade. **Registrar como divergencia consciente**, nunca omitir |
| DI-37 | `grill-with-docs` vira **ponteiro no `grill-me`**, nao skill | O conteudo inteiro da fonte e "rode grilling usando domain-modeling". Com plano04 e plano05 entregues, a composicao ja existe — falta o `grill-me` saber alcanca-la. Verbo e **oferecer**, e a fronteira `CONTEXT.md` (decisao da feature) vs `GLOSSARY.md` (termo do dominio) precisa estar na linha |

## Pendente de decisao

As 7 skills restantes da tabela "gap real" e as 13 de "overlap parcial". Cada uma vira um
`planoNN/` proprio conforme for decidida. `PRD.md`, `PLAN.md` e `STATE.md` desta pasta so serao
escritos quando o conjunto estiver fechado — escreve-los agora seria fixar um escopo que ainda
esta em aberto.

## Referencias

- Clone local do repo-fonte: scratchpad da sessao (efemero — reclonar se necessario)
- Analise anterior de import de skills: `docs/exec-plans/active/2026-05-22-agent-skills-import-analysis/ANALYSIS.md`
  (item #1 — `## Common Rationalizations` + `## Red Flags` — **ja executado**: 19 e 17 skills
  respectivamente, verificado 2026-08-10. Ver TR-02)
- Convencao `docs/` vs runtime asset: `ARCHITECTURE.md` §Conventions
- Compound notes sobre armadilhas de `SKILL.md`: `docs/compound/2026-04-21-blocos-codigo-aninhados-skill-md.md`,
  `docs/compound/2026-05-12-skill-md-code-blocks-do-not-execute.md`,
  `docs/compound/2026-05-19-crlf-breaks-frontmatter-regex.md`,
  `docs/compound/2026-05-14-skill-paths-tech-debt-after-v6.md`

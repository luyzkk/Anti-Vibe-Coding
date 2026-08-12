# Auditoria das 40 Skills — Relatorio Consolidado

**Plano 01, fase-03** · executado 2026-08-11 · branch `feat/writing-for-agents-port`
**Lente:** `skills/writing-for-agents/SKILL.md` (portada na fase-01)
**Baseline:** `docs/generated/skill-audit-baseline.json` (fase-02)

**Nenhum arquivo de skill foi modificado nesta fase.** `git diff --stat skills/` vazio.
Todo patch aqui e **proposta**; a aplicacao e da fase-04, com aprovacao humana por achado (DI-04).

> **Fase-04 executada em 2026-08-12.** O resultado medido esta em
> [§Delta real da fase-04](#delta-real-da-fase-04), no fim deste documento — inclusive onde o
> realizado **divergiu** do projetado abaixo, e por que. Onde as duas secoes discordarem, **a
> medida vale**; as projecoes aqui sao o que se sabia antes de aplicar.

---

## Particao usada

5 subagentes read-only, particao por tamanho de corpo em snake draft — os pesados distribuidos, nao
agrupados, senao um lote estoura contexto e os outros ficam ociosos.

| Lote | Skills | Linhas |
|---|---|---|
| A | plan-feature(973), api-design(428), architecture(424), design-patterns(315), enhance-prompt(262), source-driven-development(206), defensive-patterns(201), parity-audit(50) | 2.859 |
| B | execute-plan(916), tdd-workflow(441), infrastructure(417), learn(324), anti-vibe-review(254), writing-for-agents(210), react-patterns(198), init(97) | 2.857 |
| C | verify-work(610), grill-me(454), consultant(400), code-simplification(326), decision-registry(251), quick-plan(226), sync(198), todo-pick(119) | 2.584 |
| D | security(589), write-prd(482), qa-visual(400), iterate(349), doubt-driven-development(246), pair-programming-with-agent(226), detect-architecture(167), compound-engineering(130) | 2.589 |
| E | update(527), system-design(519), design-twice(376), git-workflow-and-versioning(368), incremental-implementation(240), lessons-learned(235), incident-response(167), centralize-config(132) | 2.564 |

Sao **40** skills, nao 39 — `writing-for-agents` entrou na fase-01 e foi auditada com ela mesma
(lote B). Os 5 lotes leram as 40 por inteiro; nenhum retornou vazio; nenhuma skill ficou sem achado
exceto `parity-audit`, cuja description e a mais enxuta do repo.

## Verificacao independente

Saida de subagente e hipotese. Estas afirmacoes foram reverificadas no repo antes de entrar aqui:

| Afirmacao | Verificacao | Resultado |
|---|---|---|
| Blocos de telemetria nao tem gatilho | `grep -c "telemetry" hooks/hooks.json` | **0** — confirmado |
| Import `../../lib/telemetry-utils` nao resolve | `ls lib/` | **nao existe** — confirmado |
| `react-patterns` aponta references inexistentes | `ls skills/react-patterns/references/` | so 2 dos 4 citados — confirmado |
| `decision-registry` doc diverge do codigo | `index.ts:53` | grava em `decisions.md` raiz, doc diz `.claude/` — confirmado |
| Probe do `iterate` nunca dispara | `find .planning -name SUMMARY.md` | **vazio**; todos em `docs/exec-plans/` — confirmado |
| `Boring technology primeiro` duplicado cross-skill | diff das 2 linhas | **byte-identico** — confirmado |
| `incremental-implementation` usa npm num repo bun | grep | 4 sites `npm`, irmas usam `bun run` — confirmado |
| Bloco `profile-aware-preface` e removivel | `harness-validate.ts:643` | **FALSO — e load-bearing.** Ver §Sistemico 2 |

O ultimo item derrubou uma proposta de subagente. E o motivo de existir esta secao.

---

## Achados sistemicos

Ordenados por delta. Sistemico = mesmo padrao em 5+ skills; um patch resolve muitos arquivos.

### S1 — Secoes terminais que reescrevem os steps · 28.281 chars · 21 skills

O padrao mais difundido do repo, e os 5 lotes o encontraram sem combinar. Uma secao de fechamento
(`## Regras`, `## Regras Importantes`, `## Regras Inviolaveis`, `## Pipeline Integration`,
`## Interaction with Other Skills`, `## O que Este Skill NAO Faz`) que reenuncia o que os steps acima
ja disseram — muitas vezes verbatim.

Medido mecanicamente: **28 secoes em 21 skills, 28.281 chars.**

> **Segunda correcao (2026-08-12, verificacao do 5b).** A **maior entrada desta tabela e um falso
> positivo.** `verify-work ## Pipeline Integration` tem 6.036 chars e **141 deles sao reprojecao** —
> o ponteiro de Learn Point. O resto e conteudo de fonte unica:
> `### Cleanup de Artefatos` (4.331, 91 linhas do procedimento de arquivamento do PRD — o mesmo
> bloco cujos fences o lote 7 consertou), `### 0. Importar Contexto` (646; `SUMMARY.md` nao aparece
> no corpo), `### Ao Finalizar a Verificacao` (632; `/commit`, `/push`, `/open-pr` e
> `iterate harden` nao aparecem no corpo) e `### Escape Hatches` (257). Entrou no S1 **pelo nome do
> heading**. Sozinha ela era 27% do pool restante — o pool real e menor que 22.364.
>
> Padrao que emergiu: `## Pipeline Integration` **nao e reprojecao dos steps** — e o contrato de
> pipeline da skill (de onde le, onde escreve, o que vem depois, como escapar). No `write-prd` ele
> por acaso duplicava o corpo, porque aquela skill tambem detalha import/save dentro dos Steps 5 e
> 6. Nas outras, e o unico lugar. **E `### Escape Hatches` e fonte unica em todas** — `standalone`
> nao aparece no corpo de `plan-feature`, `grill-me` nem `verify-work` (0 hits cada).

| Skill | Secao | Chars |
|---|---|---|
| ~~verify-work~~ | ~~`## Pipeline Integration` (:402)~~ **falso positivo, ver acima** | ~~6.034~~ |
| plan-feature | `## Pipeline Integration` (:753) | 1.875 |
| write-prd | `## Pipeline Integration` (:397) | 1.811 |
| design-twice | `## Regras` (:351) | 1.348 |
| init | `## Regras Importantes` (:74) | 1.104 |
| architecture | `## Regras do Consultor` (:406) | 1.051 |
| qa-visual | `## Regras Inviolaveis` (:373) | 1.049 |
| iterate | `## Regras` (:328) | 999 |
| tdd-workflow | `## Regras Inviolaveis` (:403) | 956 |
| doubt-driven-development | `## Interaction with Other Skills` (:235) | 954 |
| execute-plan | `## Regras Criticas` (:820) | 951 |
| ...mais 17 secoes | | 10.149 |

> **Correcao aplicada em 2026-08-12 (sub-lote 5a).** Duas coisas desta secao nao sobreviveram a
> verificacao. **(a)** O pool encolheu para **25.527 chars em 25 secoes / 20 skills** antes do 5a —
> os lotes 1-7 consumiram ~2.754, mesmo efeito que o S5 sofreu no lote 7. **(b)** "Terminais" e
> literalmente falso para **21 das 25**: so `design-twice`, `architecture`, `iterate` e
> `quick-plan` tinham a secao no fim do arquivo; as outras estao no meio. O padrao real e
> *secao de fechamento*, nao *secao terminal*.

Nao e uniforme. Tres subtipos, com tratamento diferente:

1. ~~**Reprojecao pura** — todo item tem twin nomeado por linha. Deletar e seguro.~~
   **Categoria vazia — verificada e derrubada no 5a.** Os tres exemplos citados como prova
   (`design-twice`, `update`, `write-prd`) **todos** carregam residuo de fonte unica. Contagem
   real, item a item:

   | Skill | Claim | Real | Residuo que morreria |
   |---|---|---|---|
   | `design-twice ## Regras` | 11 de 12 | **11 de 12** ✓ | item 8, "qualidade das propostas depende da qualidade das restricoes" — `qualidade` nao aparece no corpo |
   | `update ## Regras Importantes` | 7 de 8 | **6 de 8** | item 5 (`REVERTER do backup`) **e** item 6 (backups nunca deletados automaticamente) — zero hits para delet/apag/limpar/remover no corpo |
   | `write-prd ## Pipeline Integration` | 4 de 4 | **4 de 4 nas subsecoes numeradas, 0 de 3 no bloco seguinte** | `### Escape Hatches` inteiro: "funciona standalone", "confirmar antes de descartar o contexto", "voltar a qualquer fase" |

   O erro do `write-prd` e o de maior consequencia da auditoria inteira: os "4 de 4" contam as 4
   subsecoes numeradas e **param antes** do `### Escape Hatches`, que fica dentro da mesma secao.
   Cortar o bloco como "seguro" apagaria 3 regras sem twin. O do `update` erra na direcao oposta
   — subconta o residuo em 1. **Nao existe secao S1 segura de deletar em bloco; toda uma exige
   contagem item a item.**
2. **Reprojecao com residuo** — a maioria tem twin, 1-2 itens sao fonte unica. `qa-visual:373-384`
   (8 de 10 com twin), `verify-work:415-436`. Preservar o residuo, cortar o resto.
3. **Reprojecao que contradiz** — o item nao repete, **diverge**. `iterate:333` diz que a skill nao
   modifica teste sem aprovacao; o Step 3 (`:128`) manda escrever o teste sem gate.
   `execute-plan:823` diz que o orquestrador nunca executa codigo; o Step 5 (`:569`) manda rodar
   `bun run test`. **Estes nao sao limpeza — sao bugs de contrato**, e o agente obedece um dos dois
   por sorteio.

O subtipo 3 e o que justifica atacar S1 primeiro, mesmo que o delta em chars fosse zero.

### S2 — Blocos de codigo em `SKILL.md` · 54.974 chars · ~15 skills · **tres classes, uma delas intocavel**

`SKILL.md` e prompt, nao runtime — compound `2026-05-12-skill-md-code-blocks-do-not-execute`. Ha
54.974 chars de blocos ```` ```typescript ```` nos SKILL.md, e `hooks/hooks.json` nao registra
gatilho para nenhum deles (`grep -c "telemetry|preface|stale-capabilities"` = **0**).

**Mas os blocos nao sao a mesma coisa, e trata-los como um so quebra o build.**

| Classe | Skills | Guard | Veredito |
|---|---|---|---|
| `writeTelemetryStart/End` | 10 — architecture, consultant, design-twice, execute-plan, grill-me, iterate, plan-feature, quick-plan, verify-work, write-prd | `skills/lib/telemetry-utils.test.ts:192` exige o texto em 5 skills | **Morto.** O compound prova 0 metricas em 7 dias de uso real. Remover exige tocar o teste na mesma fase |
| `profile-aware-preface` | 9 — api-design, architecture, compound-engineering, decision-registry, design-patterns, detect-architecture, lessons-learned, security, system-design | `scripts/harness-validate.ts:643` **falha** se faltar fence ou `readPrefaceContext` | **NAO TOCAR.** E spec que o agente simula, com `preface-simulate.ts` para exercitar. Deletar derruba `bun run harness:validate` |
| `stale-capabilities-check` | 7 — api-design, compound-engineering, decision-registry, design-patterns, lessons-learned, security, system-design | `skills/lib/__tests__/stale-warning.test.ts` declara "SYNC OBRIGATORIO nas 6 SKILL.md"; 4 `__tests__/stack-aware-preface-wire.test.ts` assertam posicao | **Byte-identico em 6 arquivos** (1.394 chars cada = 8.364). Candidato a reference externa, mas mutacao e multi-arquivo com teste |

O lote C propos deletar os blocos de `decision-registry:10-59`. Isso teria derrubado o
`harness:validate`. E o modo de falha que o README deste plano nomeia — *"cortamos algo que era
load-bearing"* — e so nao passou porque a proposta foi verificada em vez de aceita.

**Recomendacao:** so a classe telemetria entra na fase-04, e junto com o teste que a prende.

### S3 — Ponteiros mortos · 19 sites · 6 skills

Path escrito em doc e contrato com o agente e **nunca executado por teste**. Nenhum destes quebra
`harness:validate`: estao em backtick, nao em link markdown — o link checker nao os enxerga.

| Ponteiro | Sites | Realidade |
|---|---|---|
| `lib/legacy-detector.md` · `lib/legacy-migrator.md` | 7 — `plan-feature` (5), `execute-plan` (2) | Os arquivos estao em `skills/lib/`. `plan-feature/lib/` existe mas so tem `fase-policy.ts`: o agente acha a pasta e nao o arquivo |
| `references/performance.md` · `references/state-management.md` | 2 — `react-patterns:132,158` | Nao existem. So `data-fetching.md` e `useeffect-patterns.md` |
| `.claude/decisions.md` | 4 — `decision-registry:210,215,221,226` | `index.ts:53` grava em `decisions.md` na **raiz**. Um `list` depois de um `add` retorna vazio, sem erro |
| `.planning/*/SUMMARY.md` | 1 — `iterate:48` | `.planning/` existe mas nao tem nenhum `SUMMARY.md`; todos vivem em `docs/exec-plans/`. **A sonda de deploy nunca dispara** — a skill cai sempre no branch "nenhum contexto detectado" |
| `docs/references/` | 5 — `source-driven-development:16,17,82,83,84` | `sync-to-global.sh:83` nao copia `docs/`. Resolve neste repo; em todo projeto instalado via `/init`, nao existe |

### S4 — Duplicacao com o hook `SessionStart` · 4.205 chars por sessao

O banner injetado a cada sessao tem **4.205 chars** — maior que qualquer description do repo. Duas
duplicacoes medidas dentro dele:

- **Drift do proprio corte desta feature.** A description do `system-design` foi cortada de 1.481
  para 338 chars (commit `01ffdf7`), mas o hook manteve a lista antiga inteira: *"cache, scaling,
  CAP, replicacao, filas/mensageria (queue, broker, exactly-once, idempotencia), SQL internals..."*
  — **273 chars dos mesmos triggers que acabaram de ser colapsados.** Consertamos um dos dois
  lugares. E a violacao de single source of truth que a lente descreve, cometida por quem a portou.
- **Tabela Akita em dois lugares.** `hooks/hooks.json` carrega a tabela "Faz BEM / Faz MAL" (766
  chars) em toda sessao; `pair-programming-with-agent:62-73` e a skill cujo proposito declarado e
  ensinar exatamente isso. O hook e o **router** deste repo — apontar e o trabalho dele; carregar a
  tabela inteira nao.
- **23 skills relistadas** com descricao propria (2.081 chars), enquanto essas mesmas 23 ja pagam
  8.436 chars de description de frontmatter.

### S5 — Boilerplate de abertura na description · 602 chars · 14 skills

14 das 40 descriptions abrem com *"This skill should be used when the user asks..."* — 43 chars de
prefixo que nao carregam branch nenhum. As outras 26 ja nao usam, entao **nao e convencao viva**: e
sedimento parcialmente removido. `defensive-patterns` e o exemplar do formato bom (9 triggers na
primeira oracao mapeando 1:1 para as 9 secoes numeradas).

### S6 — Satelites orfaos · 4 arquivos de referencia real

Material que existe e nenhum ponteiro alcanca — o Red Flag literal da lente.

| Arquivo | Tamanho | Branch que precisaria dele |
|---|---|---|
| `compound-engineering/references/capture-guide.md` | 2.441 chars | O gate, passo 5, que pede "titulo curto descritivo" **sem guia nenhum** enquanto 34 linhas sobre titulacao ficam sem leitor |
| `design-twice/examples/worked-session.md` | 235 linhas | Nenhum. Unico ponteiro vivo esta num exec-plan fechado |
| `tdd-workflow/references/ia-tdd-workflow.md` | 4.250 bytes | A secao `## IA-TDD` (:30-82), que nao tem ponteiro |
| `init/lib/prompts/{compound,explorer,reconciler}.md` | 3 arquivos | Carregados por codigo, nao por ponteiro — falso positivo parcial |

---

## Achados por skill

Os sistemicos acima nao se repetem aqui. Esta tabela e o que sobra depois de deduplicar.

### Ponteiro — description com sinonimos do mesmo branch

| Skill | Triggers → branches | Delta |
|---|---|---|
| infrastructure | 35 → 5 (Route 53 tem **8 triggers para uma arvore**; blue-green tem 5 para um sub-bloco) | −577 |
| learn | 15 → 1 (o corpo roda os mesmos Steps 1→6 para todo gatilho) | −352 |
| git-workflow-and-versioning | ~300 chars sao identidade do corpo ("Vetado: 'Fix bug'", "hook opt-in") | −310 |
| doubt-driven-development | 254 chars finais sao a sequencia CLAIM→EXTRACT→DOUBT que o corpo carrega | −261 |
| react-patterns | 12 → 5 (`virtualization` e `code splitting` nao alcancam branch nenhum) | −232 |
| code-simplification | 3 `Use quando` para a mesma condicao | −225 |
| anti-vibe-review | 5 triggers competindo com `/verify-work` numa skill **deprecada** | −211 |
| detect-architecture | 3 sinonimos + o nome do slash-command, que o router ja resolve | −202 |
| grill-me | as 7 categorias sao a tabela do corpo, nao branches | −190 |
| update | 3 triggers para 1 branch | −184 |
| init | 4 triggers para 1 branch; a identidade envelheceu (nenhum step e "rules deployment") | −181 |
| api-design | 30 → 17 (`DTOs`≡`data transfer objects`, `gRPC`≡`Protocol Buffers`, `keyset` tem **0 ocorrencias** no corpo) | −171 |
| decision-registry | 5 → 3 (quatro frases renomeiam o branch `add`) | −165 |
| qa-visual | 10 → 2 (tres grupos de sinonimo literal) | −157 |
| sync | 4 triggers para o mesmo fluxo unico | −128 |
| source-driven-development | ultima oracao e identidade (hierarquia + UNVERIFIED estao no corpo) | −124 |
| pair-programming-with-agent | 3 "exemplos reais" sao 3 instancias de um branch so | −93 |
| architecture | `'design patterns'` e `'REST vs GraphQL'` sao **literalmente identicos** a triggers de outras 2 descriptions — roteamento em cara-ou-coroa | −69 |
| iterate | "A quarta pata do pipeline" e identidade, nao trigger | −68 |
| enhance-prompt | 2 pares de sinonimo | −54 |
| verify-work | "Evolucao do anti-vibe-review com superpoderes" e linhagem de release | −46 |
| lessons-learned | `add a lesson learned` ≡ `register a lesson` | −24 |

**Subtotal: −4.024 chars** de context load permanente (excluindo os marcados incertos).

### Completude — bound vago que convida premature completion

| Skill | Bound | Proposta |
|---|---|---|
| grill-me | `95%` (`:257`, `:390`) — nada define o que mede. Convive com um **`70%`** (`:73`) para o mesmo teste preditivo, e um terceiro em `:416` | Trocar por "prever as proximas 3 perguntas", que ja esta em `:260` e e checavel |
| tdd-workflow | Step 1 "Entender a stack" sem `<verification>`, enquanto Steps 3/4/5/7 tem | "Todo arquivo que a feature vai tocar foi lido, e o teste vizinho identificado por path" |
| write-prd | "caber em 1-2 paginas" — pagina nao existe em markdown | "Cada secao <= 5 linhas; nenhuma vazia — o que falta vai `[A DEFINIR]`" |
| plan-feature | "checklist com itens especificos (nao genericos)" | "cada item nomeia um arquivo, um comando ou uma assercao" |
| centralize-config | O grep de verificacao usa `--include=*.ts --include=*.js`, mas o exemplo da propria skill mapeia ocorrencias em `.md`. **O gate passa verde com as ocorrencias intactas** | `grep -rn --exclude-dir=node_modules`; toda ocorrencia remanescente contabilizada |
| enhance-prompt | "verificar se esta completo" — contra o que nunca e dito | O criterio existe 130 linhas acima, em `:131-136` |
| doubt-driven-development | "small enough that a reviewer can hold it in mind" — o proprio doc admite o vazamento em `:203` | Dar ao lado-codigo o bound que o lado-decisao ja tem |

### Contradicoes que mudam comportamento

| Skill | Conflito |
|---|---|
| execute-plan | `:823` "o orchestrador **nunca executa codigo**" vs Step 5 `:569` "Executar: `bun run test`". O agente que obedece a regra pula a unica validacao pos-fase |
| quick-plan | description promete "**sem criar arquivos** de planejamento em disco"; `:182` manda "Escrever em `docs/exec-plans/active/...`" |
| code-simplification | `allowed-tools: Read, Grep, Glob` vs `:165` "Make the change / Run the test suite / commit / revert" |
| consultant | `:292` "Sugerir (**nao executar automaticamente**)" vs `:316-339` "registrar **automaticamente** no `decisions.md`". E sem `Write` no frontmatter |
| iterate | `:333` "nao modifica arquivos de teste sem aprovacao" vs Step 3 `:128` "Escrever teste no arquivo correspondente", sem gate |
| init | `:77` "**NUNCA remover** secoes do CLAUDE.md" vs `:80`, a linha seguinte, documentando que o init **transforma** o CLAUDE.md em espelho <=40 linhas |
| design-patterns | "28 conceitos" (`:3`, `:312`) vs "22 conceitos" (`:83`). Contagem real por heading: **26** |

### Negacao — proibicao que ja tem alvo positivo ao lado

`grill-me` (4 sites para "nao gera codigo", com `allowed-tools` que ja impede) · `learn` (2) ·
`api-design`, `design-patterns`, `system-design`, `consultant` (a mesma regra "ensinar, nao codar"
escrita 2-3x em cada) · `incremental-implementation:123-128` (5 comportamentos proibidos listados
duas linhas abaixo do alvo positivo) · `source-driven-development:97-102` (lista "not authoritative"
logo abaixo da tabela de autoridade) · `incident-response:48-61` (4 regras de proibicao, alvo
positivo em `:50` sem governar) · `centralize-config` (2) · `enhance-prompt` (2) ·
`git-workflow-and-versioning:110` (2) · `update:375-376` (3) · `quick-plan:206-214` (5) ·
`lessons-learned:85-91` (5) · `security:243` (1) · `defensive-patterns:205` (1)

### Fences invertidos — armadilha do compound 2026-04-21, ativa

4 regioes com fence externo de 3 backticks contendo blocos de 3 backticks. Consequencia observavel:
o conteudo troca de lado.

- `sync:81-94`, `:97-109`, `:176-205` — em `:86` o comando `/anti-vibe-coding:init` cai **fora** do
  bloco e renderiza como prosa, enquanto `:88-93` (prosa) renderiza como codigo
- `verify-work:440-527` — o pseudocodigo `gerarMEMORYConsolidado` vira prosa e os passos d/e/f viram
  bloco de codigo

### Environment como fonte de verdade

- `incremental-implementation` roda **`npm`** em 4 sites (`npm test`, `npm run build`,
  `npm run lint`) num repo `bun`. As irmas (`incident-response`, `centralize-config`) usam
  `bun run`, e o CLAUDE.md global manda usar bun. O agente que segue o checklist falha
- `init:37-60` mantem uma tabela de 17 steps escrita a mao que o proprio doc declara perdedora no
  conflito com `lib/registry.ts` — 1.886 chars de cache de um lookup barato
- `detect-architecture:165-176` duplica os discriminadores de pasta que vivem em
  `classify-by-folders.ts` (com teste). Adicionar um 6o perfil hoje exige editar 3 lugares, e so 1
  tem teste
- `system-design:263-338` mantem inline (§6/§7/§8) material que ja esta nos `references/*.md`
  apontados — o resto que sobrou de uma migracao; §1-5 e §9-11 ja usam o shape enxuto

---

## Delta total projetado

| Faixa | Item | Chars |
|---|---|---|
| Sistemico | S1 secoes terminais (pool medido; subconjunto com twin nomeado) | ate 28.281 |
| Sistemico | S2 telemetria (unica classe segura das tres) | ~14.500 |
| Sistemico | S4 hook `SessionStart` (drift do system-design + tabela Akita) | −1.039/sessao |
| Sistemico | S5 boilerplate de abertura | −602 |
| Alto | Descriptions — 22 skills | −4.024 |
| Alto | S3 ponteiros mortos | 19 correcoes, delta ~0 |
| Pontual | Negacoes, fences, environment, contradicoes | ~−3.500 |

**Efeito nas descriptions:** 13.499 → **~9.475 chars (−30%)**. Somando o corte ja aplicado no
`system-design`, o total sai de 14.642 para ~9.475 — **−35% do context load permanente**.

Os numeros de chars sao a aritmetica dos subagentes sobre trechos citados; as contagens sistemicas
(28.281 / 54.974 / 4.205 / 602) foram medidas por script nesta sessao.

---

## O que ficou de fora, e por que

Silenciar truncamento le como cobertura completa. Isto ficou de fora **de proposito**:

- **Corpo longo como sprawl — zero achados.** O guardrail segurou nos 5 lotes. `security` (589
  linhas), `system-design` (519), `verify-work` (610), `infrastructure` (426), `api-design` (438),
  `architecture` (434), `tdd-workflow` (451) sao **catalogo consultavel legitimo**, e conjunto plano
  de pares nao e sprawl. Nenhuma linha de conteudo valido dessas secoes foi reportada como excesso.
- **`profile-aware-preface`** — 9 skills, ~12.500 chars. **Load-bearing**, verificado. Fora de escopo
  ate que alguem decida mudar o mecanismo, e ai o `harness-validate` muda junto.
- **`stale-capabilities-check`** — 7 skills, 8.364 chars byte-identicos. Guardado por teste de ordem
  em 4 arquivos. Marcado `incerto` pelos dois lotes que o viram.
- **`security` em profundidade.** Cortar linha load-bearing de seguranca tem custo assimetrico. O
  lote D marcou o unico achado de duplicacao como `incerto` e propos corte cirurgico que preserva
  todo limiar. Nao entrou na faixa Alto.
- **Os 11 `references/*.md` de `system-design`** nao foram lidos por inteiro — so os 3 cujas secoes
  irmas foram acusadas de duplicacao, e nesses a verificacao foi por heading + trecho literal.
- **`design-twice/examples/worked-session.md`** (235 linhas) nao foi lido. O achado e que **nenhum
  ponteiro o alcanca**, verificado por grep em todo o repo.
- **Achado retirado apos verificacao:** o lote C ia reportar "`verify-work` aponta para
  `anti-vibe-review`, skill removida". **Falso** — a skill existe e continua listada no hook. O
  achado real virou o oposto: duplicacao cross-file entre duas skills vivas (~1.721 chars em 3
  blocos, com `verify-work:546` admitindo a copia).
- **`parity-audit`** nao rendeu achado. Unico candidato (bloco "Saida esperada", 337 chars) falha o
  teste comportamental: da ao Passo 3 a forma que ele precisa interpretar antes de rodar.

---

## Descartados na fase-04, com motivo

Achado recusado aqui **nao deve ser re-sugerido** por auditoria futura sem que o motivo abaixo
tenha mudado. Cada linha e uma recusa por razao load-bearing ou por falha de verificacao, nao por
falta de tempo.

| Achado (secao de origem) | Motivo do descarte | Verificado por |
|---|---|---|
| **S3 — `docs/references/` em `source-driven-development`** (5 sites: `:16`, `:17`, `:82`, `:83`, `:84`) | **Nao e ponteiro morto.** `docs/references/` existe com exatamente os 3 arquivos citados (`testing-patterns.md`, `security-checklist.md`, `accessibility-checklist.md`), e `:80` ja os rotula "Exemplos disponiveis no Anti-Vibe Coding". A observacao verdadeira — `sync-to-global.sh:83` nao distribui `docs/` — descreve **portabilidade para projeto instalado**, nao um ponteiro quebrado; e "check `docs/references/`" degrada sem dano quando a pasta nao existe. Se virar escopo, o patch e mover material, nao consertar path | `ls docs/references/` · `sync-to-global.sh:83` |
| **Referencias `.planning/` do Step 0** de `plan-feature` e `execute-plan` | **Intencionalmente preservadas.** Compound `2026-05-14` linha 36 as lista entre os itens mantidos: e o fallback "v5 detectado, oferece migrar" (D10). `harness-validate.ts:424` whitelista `plan-feature` pelo mesmo motivo. Migra-las para `docs/exec-plans/` quebraria a deteccao de legado, que e o unico proposito do Step 0 | `docs/compound/2026-05-14-skill-paths-tech-debt-after-v6.md:31-39` |
| **S1 — `## Regras Inviolaveis` de `qa-visual` e `tdd-workflow`** (1.049 + 956) | **A secao e o conteudo unico de um bloco `<constraints>`** — corta-la esvazia o bloco. Nenhum teste assere a tag, mas a `COMPARISON-MATRIX` de 2026-06 trata os blocos `<constraints>` como escolha de design e cita a regra "NUNCA pular o Passo 1" do `qa-visual` como ponto forte contra a ferramenta de referencia. **Tag que re-pesa nao e duplicacao.** Reabrir so se alguem decidir mudar a convencao XML das 5 skills que a usam | `grep '^</\?[a-z]*>$'` em `qa-visual`/`tdd-workflow` · `COMPARISON-MATRIX.md:195,416` |
| **S1 — `verify-work ## Pipeline Integration`** (6.036 chars, a maior entrada da tabela do S1) | **Nao e secao S1.** Medido subsecao a subsecao: **141 chars de reprojecao** (o ponteiro de Learn Point, twin do `## Step 5`) contra **5.895 de fonte unica** — `### Cleanup de Artefatos` sozinho tem 4.331 (91 linhas do procedimento de arquivamento). `SUMMARY.md`, `/commit`, `/push`, `/open-pr`, `iterate harden` e `standalone` **nao aparecem** no corpo (`:1-376`). Foi classificada pelo nome do heading. Cortar em bloco removeria o arquivamento do PRD inteiro | leitura das 6 subsecoes + grep no corpo `:1-376` |
| **Fix implicito de `decision-registry`** (`.claude/decisions.md` -> `decisions.md` raiz) | **Aplicado em outra forma, porque o proposto estava errado.** `decisions.md` raiz e so o branch **v5/cru** (`index.ts:49-53`); em **v6** — default deste repo — a skill escreve `ADR-NNNN-{slug}.md` em `docs/design-docs/` (`index.ts:35-46`). Trocar o path teria produzido falsidade nova. Corrigido deferindo ao layout | `skills/decision-registry/index.ts:26-70` |

---

## Recomendacao de escopo para a fase-04

Ordenado por razao consequencia/risco, nao por chars. Cada lote respeita o cap de 5 arquivos e
aguarda aprovacao antes do proximo.

| # | Lote | Por que primeiro | Risco |
|---|---|---|---|
| 1 | **Contradicoes** (7 skills, subtipo 3 de S1) | Sao bugs de contrato, nao estetica. O agente hoje obedece um dos dois lados por sorteio. Delta em chars e irrelevante; delta em comportamento e binario | Baixo — cada uma tem uma direcao obviamente correta, exceto `iterate` (decisao humana) |
| 2 | **S3 ponteiros mortos** (19 sites, 6 skills) | Nenhum quebra teste ou validate. Falham em silencio, que e o pior modo | Nenhum — sao correcoes de path |
| 3 | **S4 hook** (1 arquivo) | 4.205 chars por sessao, maior consumidor isolado. Inclui o drift que esta feature criou | Baixo — 1 arquivo, efeito imediatamente observavel |
| 4 | **Descriptions** (22 skills, −4.024) | Maior delta mensuravel. Molde ja validado no `system-design` | Medio — **o risco e invocacao perdida, nao contexto**. Nomes proprios (`Redis`, `RabbitMQ`, `EC2`) nao sao sinonimos de branch; a variante B do `system-design` e o precedente |
| 5 | **S1 secoes terminais** (subtipos 1 e 2) | 28.281 chars de pool | Medio — exige checar twin linha a linha antes de cortar. Subtipo 2 tem residuo que morre junto se cortado em bloco |
| 6 | **S2 telemetria** (10 skills + 1 teste) | ~14.500 chars comprovadamente mortos | Medio — toca `telemetry-utils.test.ts` na mesma fase, ou a suite fica vermelha |
| 7 | **Fences, npm→bun, negacoes, S5, S6** | Pontuais | Baixo |

**Nao entra na fase-04:** `profile-aware-preface` (load-bearing), `stale-capabilities-check`
(multi-arquivo com teste de ordem), corpo de `security`.

**Gate para a fase-04**, herdado do `MEMORY.md`: todo achado precisa de evidencia citada + delta
projetado, e `git status` limpo em `skills/` antes de comecar. Ambos satisfeitos.

---

## Delta real da fase-04

Executada em 2026-08-12, aprovacao humana por lote. **17 commits de codigo, 11 de registro**
(contados por `git log 0c964a0^..HEAD`; a versao anterior desta linha dizia 11/5 e depois 14/7 —
ambos errados, vinham de contar lotes em vez de commits).
Numeros medidos por `bun scripts/audit-skill-docs.ts .` apos cada lote — nao projetados.

| Metrica | Antes | Depois | Delta |
|---|---|---|---|
| `descriptionChars` | 13.499 | **9.139** | **−4.360 (−32,3%)** |
| Corpo dos `SKILL.md` (lote 6) | — | — | **−15.256** (10 skills) |
| Corpo dos `SKILL.md` (lote 5a) | — | — | **−2.635** (3 skills) |
| Corpo dos `SKILL.md` (lote 5b) | — | — | **−1.450** (3 skills) |
| **Corpo, total da fase** | — | — | **−19.341** (13 skills tocadas) |
| Banner `SessionStart` | 4.131/sessao | **3.757** | −374 |
| `hookDescriptionChars` | 2.081 | **1.937** | −144 |
| Maior ofensor | `infrastructure` 792 | **`security` 419** | (crescido de proposito) |
| Satelites sem ponteiro | 6 | **3** | −3 (os 3 restantes sao falso positivo) |
| `modelInvoked` | 40/40 | **39/40** | `anti-vibe-review` saiu |
| Negacoes no corpo | 1.148 | **1.138** | −10 (os guard comments do lote 6) |

A projecao deste relatorio era o repo terminar em **~9.475**. Fechou em **9.139**. Somando o corpo
cortado pelos lotes 6, 5a e 5b, a fase-04 tirou **~23,7k chars** do que o agente carrega.

**Como medir delta de corpo neste repo:** em LF, contra os blobs
(`git show <sha>:<path> | wc -c`), **nunca** com `wc -c` no working tree. `core.autocrlf=true` e o
`.gitattributes` so forca LF em `tests/fixtures/`, `__fixtures__/`, `*.snap` e `.husky/` — todo
`SKILL.md` esta CRLF em disco e LF no index. Medir em disco inflou o lote 6a em 230 bytes (+3,7%
aparente sobre a projecao, quando o real era +0,6%).

### Lote a lote: projetado vs medido

| Lote | Escopo | Projetado | **Medido** |
|---|---|---|---|
| 1a+1b | 7 contradicoes de contrato | ~0 | **+190** (comportamental, nao economiza) |
| 2a+2b | S3 ponteiros mortos | ~0 | ~0 (7 skills corrigidas) |
| 3 | Hook `SessionStart` | −1.039 | **−374** |
| 4a–4f | 26 descriptions | −4.024 | **−4.278** |
| 7a | 4 fences aninhados | 0 | **+4** (comportamental) |
| 7b | Satelites, npm→bun, S5 | −602 | **−92** |
| 6a | Telemetria, 5 consultivas | −7.257 | **−7.297** (+40) |
| 6b | Telemetria, 5 pipeline-core | −7.904 | **−7.959** (+55) |
| 5a | 3 secoes de fechamento do S1 | — | **−2.635** (residuo preservado) |
| 5b | Familia `## Regras`, 3 skills | — | **−1.450** (19 de 34 itens tinham twin) |

Os dois unicos lotes cuja projecao bateu quase exato foram os do 6 — os que contavam **bytes de um
bloco literal**. Onde a projecao errou feio (3, 7b) ela estimava o efeito de **reescrever prosa**.
Vale para a proxima auditoria: projecao de delta so e confiavel quando o alvo e texto que sai
inteiro.

### Onde a auditoria errou, e o que isso ensina

Cinco afirmacoes deste relatorio nao sobreviveram a verificacao. Todas foram pegas **antes** de
virar patch, por leitura do codigo ou do corpo da skill:

1. **`legacy-*`: 7 sites** — sao **15**, em 14 linhas. Uma (`execute-plan:127`) esta sem backticks e
   escapa de grep ancorado em crase.
2. **`decision-registry`: "trocar `.claude/` pela raiz"** — o fix implicito estaria **errado**. A
   linha citada como prova (`index.ts:53`) esta dentro de um `if`: prova o branch **v5/cru**. Em
   **v6**, default deste repo, a skill escreve ADR em `docs/design-docs/`.
3. **`react-patterns`: `virtualization` e `code splitting` nao alcancam branch** — **alcancam**
   (`:189`, `:192`, dentro de `## Checklist Rapido de Code Review`). Corta-los teria removido a unica
   porta para material existente.
4. **`source-driven-development`: 5 ponteiros mortos** — **nenhum morto**. Ver §Descartados.
5. **`api-design`: 1 trigger orfao (`keyset`)** — sao **4** (`keyset`, `HATEOAS`, `filtering`,
   `sorting`). O erro aqui foi por **falta**, nao por excesso.

6. **S1: a categoria "reprojecao pura, deletar e seguro" nao existe** — os 3 exemplos citados como
   prova todos tinham residuo de fonte unica, e o do `write-prd` escondia um bloco inteiro
   (`### Escape Hatches`, 3 regras). Ver §S1, correcao do 5a.

Padrao: erro de subagente em **ambas as direcoes**. A verificacao trigger-a-trigger contra o corpo
foi o unico metodo que pegou os dois tipos.

**E vale para quem verifica tambem.** No 5a eu quase reportei o `design-twice` como claim falso: o
grep usava `\|` com `grep -E`, onde isso e pipe **literal**, nao alternacao — os twins dos itens 3 e
9 existiam (`:108`, `:112`) e voltaram vazios. Mesma familia do compound
`2026-06-05-grep-c-alternation-counts-import-line.md`. **Achado negativo por grep so vale depois de
provar que o grep acha o caso positivo.**

### O que NAO foi feito, e por que

**Fora de escopo por serem load-bearing** (confirmado, nao re-sugerir sem mudar o mecanismo):

- **`profile-aware-preface`** — 9 skills, ~12.500 chars. `scripts/harness-validate.ts:643` **falha**
  se faltar fence ou `readPrefaceContext`. Deletar derruba `bun run harness:validate`.
- **`stale-capabilities-check`** — 7 skills, 8.364 chars byte-identicos. Preso por assertion de ordem
  em 4 `__tests__/stack-aware-preface-wire.test.ts` e por "SYNC OBRIGATORIO" em
  `skills/lib/__tests__/stale-warning.test.ts`.
- **Corpo do `security`** — custo assimetrico. A description **cresceu** (+33) em vez de encolher:
  a verificacao mostrou branch orfao, nao inchaco.

**Adiado com motivo, escopo aberto para uma proxima sessao:**

| Item | Volume medido | Por que ficou |
|---|---|---|
| ~~**Lote 5 — secoes de fechamento (S1)**~~ **FECHADO por decisao do humano em 2026-08-12**, com **5a** (`379e10a`) e **5b** (`a45c04c`) aplicados | rendeu **−4.085**; deixa ~20.938 nominais / **~12,9k reais** na mesa | **Fechado por rendimento medido, nao por estar completo.** Tres verificacoes seguidas renderam menos que este relatorio previa: o subtipo 1 nao existia (5a), a maior entrada da tabela era falso positivo (`verify-work`, 5b recusado) e o ratio real de reprojecao e **56%**, nao ~90% (5b aplicado). O que sobra sao ~12 secoes de 275 a 1.1k chars, cada uma exigindo contagem item a item para render ~50% — **~6k no total, contra risco de derrubar regra viva em lista de regras**. O subtipo 3 (contradicoes) ja tinha saido no lote 1. Reabrir exige medir de novo: a estimativa de 28.281 nunca se sustentou |
| ~~**Lote 6 — telemetria (S2)**~~ **CONCLUIDO** (`59bad47` + `057398c`) | **−15.256 medidos**, 20 blocos em 10 skills | A superficie de teste era mesmo **maior que este relatorio supunha** — 5 testes em 3 describes, nao a linha unica. Confirmado tambem que **a lib nao sai junto**: `emit-stack-knowledge-events.ts:5` usa `writeTelemetryDomainEvent`. Morto era so o prompt. Deixa 5 exports sem caller — ver achado abaixo |
| **Lista das 23 skills no hook** | 1.981 chars, 53% do banner | G1 multiplicado por 23. Se a descoberta depender so das descriptions e a premissa estiver errada, 23 skills param de disparar **em silencio**. A lista tambem carrega o protocolo "SEMPRE pergunte antes de invocar", ausente das descriptions. Precisa de verificacao real de descoberta, nao de coragem |
| **Negacoes (pool de 1.148)** | julgamento caso a caso | O pool e em pt-BR: `\bnao\b` casa prosa comum. Contar seria transformar ruido em achado |

**Achados novos abertos, encontrados durante a aplicacao** (nao existiam neste relatorio):

- `init:80` cita `/anti-vibe-coding:init --rollback`, que **nao aparece** em
  `skills/init/lib/parse-flags.ts`. A lib existe (`rollback.test.ts`); a duvida e se a **flag** e
  reconhecida. Exige verificacao antes de acao.
- O banner do `SessionStart` ainda anuncia `anti-vibe-review` como skill viva ("Review
  pos-implementacao"), depois de ela ter sido deprecada e retirada da invocacao por modelo.
  `hooks/hooks.json` e lote isolado — nao foi misturado.
- `skills/anti-vibe-review/SKILL.md` faz `generate-manifest.js` emitir `missing or malformed
  frontmatter delimiters` a cada run (comentario HTML antes do `---`). Nenhum teste quebra.
- **Hardcodar gerenciador de pacote em skill distribuida** e fragil nos dois sentidos: `bun run test`
  quebra em projeto-alvo que usa npm, tanto quanto `npm test` quebrava aqui. A regra da lente manda
  deixar o lookup de um comando para o environment. Alinhado com as irmas por ora (3 skills).
- **O lote 6 deixou 5 exports de `skills/lib/telemetry-utils.ts` sem caller — nao 4.**
  Achado do 6a, **registrado e nao aplicado**, agora reconfirmado com o lote 6 fechado:
  `grep -rln 'writeTelemetryStart\|writeTelemetryEnd' skills/*/SKILL.md` retorna **vazio**, e uma
  varredura de `.ts`/`.js` fora de `node_modules` nao acha **nenhum** caller dos 5 fora da propria
  lib e do seu teste.

  | Export | Situacao | Evidencia |
  |---|---|---|
  | `INSTRUMENTED_SKILLS` | orfao | zero referencia em runtime, inclusive dentro da propria lib — `inferFasePipeline` le `SKILL_TO_FASE`, nao esta constante. So o teste asserta o length |
  | `writeTelemetryStart` | orfao | ultimo consumidor eram os 10 blocos de prompt |
  | `writeTelemetryEnd` | orfao | idem |
  | `serializeEntry` | orfao — **nao estava na lista de 4** | usado so por start/end (`:89`, `:113`). O comentario em `:137` diz explicitamente que `writeTelemetryDomainEvent` **nao** o reutiliza |
  | `inferFasePipeline` | orfao | zero caller; morre junto com `SKILL_TO_FASE` |

  **Sobrevivem:** `writeTelemetryDomainEvent` (caller real em
  `skills/init/lib/emit-stack-knowledge-events.ts:5`) e, com ele, `computeMonthlyPath` (`:145`) e
  `appendJsonlLine` (`:146`) — esses dois nao tem caller **externo**, mas sao usados dentro da lib.
  Viram internos sem `export`, nao delecoes.

  Condicao que sobra para o lote de limpeza: `docs/TELEMETRY.md` e `skills/lib/telemetry-utils.md`
  documentam a API inteira — cortar export sem toca-los cria o ponteiro morto (S3) que o lote 2
  acabou de limpar. O `runtime smoke` de `telemetry-utils.test.ts` tambem chama start/end direto;
  ele testa a lib, nao o prompt, e precisa de decisao explicita: some com os exports ou vira teste
  de `writeTelemetryDomainEvent`.

- **A lista de 22 descriptions deste relatorio nao era exaustiva.** Ao terminar as 22, os 4 maiores
  ofensores do repo eram skills que ela nunca listou (`design-patterns` 579, `consultant` 386,
  `security` 386, `defensive-patterns` 362) — dai o lote 4f. **Proxima auditoria: re-ranquear depois
  de cada lote, nao trabalhar lista congelada.**

### Anomalia de teste registrada

Durante o lote 4a, dois runs isolados falharam **sem reproducao**: `bun test skills` com 13 fail num
run de **240s** (normal ~9s), e `bun test tests/e2e` com 1 fail. Nao reproduzidos em 3 e 4
re-execucoes respectivamente. Nenhum teste asserta texto de description (verificado), e os que citam
as skills tocadas sao do bloco `stack-aware-preface`, intocado. O runtime de 26x aponta contencao de
ambiente. **Registrado como anomalia observada, nao como verde limpo.**

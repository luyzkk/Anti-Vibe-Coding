# Memory: Plano 05 — `domain-modeling`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** in-progress — fase-01 concluida
**Depende de:** plano01 fase-01 (a lente)
**Desbloqueia:** `wait-what`, `grill-with-docs`

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | A skill de glossario | **done** | 3/3 (+ `plugin-manifest.json` regenerado) |
| 02 | Scaffold + ponteiro no AGENTS | **done** | 1 novo + 7 modificados (plano previa 3) |
| 03 | Absorcao no decision-registry | **done** | 1/1 |

Fase 03 e independente das outras duas.

## Decisoes de implementacao (DI)

Formato: `DI-Plano05-faseNN-<slug>: <o que mudou e por que>`.

Duas ja sao obrigatorias, na fase-02:
- `DI-Plano05-fase02-required`: a entry do `GLOSSARY.md` no manifest e `required: true` ou `false`?
  Comparar com `DESIGN.md` e `CODE_STYLE.md` e seguir o vizinho mais proximo.
- `DI-Plano05-fase02-category`: qual `category`? Nao e `canon-andre` (nao vem do harness do Andre).
  Conferir os valores em uso antes de inventar um. **Medido em 2026-08-13:** `template-manifest.ts`
  usa exatamente dois valores — `canon-andre` (18x) e `anti-vibe-extension` (10x). Nao inventar um
  terceiro sem motivo.

### fase-01 (2026-08-13)

- `DI-Plano05-fase01-fonte-nao-estava-no-disco`: a fonte `mattpocock/skills` **nao existe** em
  `Infos/` (la mora `agent-skills-main`, do import anterior). Baixada do upstream no commit
  analisado com
  `gh api repos/mattpocock/skills/contents/skills/engineering/domain-modeling/<f>?ref=84fdeff`.
  Path upstream confirmado: `skills/engineering/domain-modeling/` com `SKILL.md` (74 linhas),
  `CONTEXT-FORMAT.md` (60) e `ADR-FORMAT.md` (47). **Fases 02 e 03 precisam do mesmo download** —
  a fase-03 usa o `ADR-FORMAT.md`.
- `DI-Plano05-fase01-references-dir`: o formato foi para
  `skills/domain-modeling/references/GLOSSARY-FORMAT.md`, e nao na raiz da skill como o fase doc
  escrevia. Convencao medida: **14 skills** usam `references/`, **1** usa `.md` irmao na raiz
  (`consultant/prompts.md`). Nenhum criterio de aceite depende do path.
- `DI-Plano05-fase01-inv02-teste-reescrito`: o teste de INV-02 da fonte — *"este conceito e unico
  deste contexto, ou e programacao em geral?"* — **reprova `harness`**, que e palavra geral com
  sentido local divergente e a entrada de maior valor que este repo teria. Reescrito para *"quem
  chega neste repo ja sabe o que esta palavra significa aqui?"*, que decide os dois casos. Achado do
  teste de aplicacao, nao de revisao — ver secao abaixo.
- `DI-Plano05-fase01-fallback-criacao`: a skill cria `docs/GLOSSARY.md` quando ele nao existe. Nao
  contradiz o "scaffold, nao criacao preguicosa" do README: a razao registrada la contra o lazy era
  a skill ter que **editar o `AGENTS.md` do projeto-alvo**, e ela nao edita. O scaffold da fase-02
  segue sendo o mecanismo de descoberta; isto e robustez para projeto que nunca rodou `/init`.
- `DI-Plano05-fase01-adr-fora`: o filtro de 3 criterios e o `ADR-FORMAT.md` **nao** entraram na
  skill — so a fronteira de duas linhas apontando para `/anti-vibe-coding:decision-registry`.
  Duplicar o filtro aqui e na fase-03 criaria dois lugares para editar a mesma regra.

### fase-02 (2026-08-13)

- `DI-Plano05-fase02-required`: **`true`**. Nao ha escolha real — as 41 entradas do manifest sao
  `required: true`, e o campo so aparece em asserçoes de teste. Quem decide erro-vs-warning no
  validador e a `category`, nao este campo.
- `DI-Plano05-fase02-category`: **`anti-vibe-extension`**, ao lado de `CODE_STYLE.md`. O glossario
  nao esta entre os 22 docs canonicos do Andre Prado.
- `DI-Plano05-fase02-rotulo-avoid`: o rotulo e **`_Avoid_`**, nao `_Evitar_` como as duas fases
  escreviam (decisao do humano, 2026-08-13). Motivo: o `GLOSSARY.md` e artefato do projeto-alvo, e
  todo `docs/*.tpl` tem corpo EN — ha inclusive um teste (`every required template ships in EN`)
  que existe por isso. Alinhado tambem no `GLOSSARY-FORMAT.md` e no Red Flag do `SKILL.md`.
- `DI-Plano05-fase02-agents-sem-tabela`: o `AGENTS.md.tpl` **nao tem** tabela "When to Read What" —
  essa tabela e do `CLAUDE.md` **deste** repo, nao do template. O mecanismo equivalente no template
  e a lista de bullets de `## Read Before Major Changes`, e a linha entrou la, em ordem alfabetica
  entre `COMPOUND_ENGINEERING` e `PLANS`. `## Anti-Vibe Extensions` nao serve: agrupa gates de
  PR/review, e `CODE_STYLE`/`COMPOUND_ENGINEERING` ja provam que a primeira lista nao e so canon.
- `DI-Plano05-fase02-cap-41`: **o achado caro desta fase.** Existem **tres** caps de linha do
  AGENTS.md, nao um:

  | Onde | Valor antes | Vale para |
  |---|---|---|
  | `scripts/harness-validate.ts:43` | 70 | **este** repo |
  | `skills/init/assets/templates/scripts/harness-validate.ts.tpl:43` | **40** | **o projeto do usuario** |
  | `tests/agents-md-template.test.ts` | 40 | o template |

  O G3 mandava "conferir folga" e eu conferi o de 70 — que tinha folga. O que morde e o do tpl. E o
  `AGENTS.md.tpl` estava **exatamente** no teto (40/40, zero folga). Subiram para **41** os tres,
  mais a string esperada em 2 testes (`harness-validate.test.ts`, `harness-validate-advanced.test.ts`)
  e a doc em `PLANS.md.tpl:64`, que anunciava "max 40 lines" ao projeto-alvo. **A suite ficou verde
  com o tpl ainda em 40** — nenhum teste do repo roda o validador do projeto-alvo contra um scaffold
  real. Sem a verificacao manual em tmpdir, `bun run harness:validate` quebraria em todo projeto que
  rodasse `/init`.
- `DI-Plano05-fase02-required-links-intocado`: `docs/GLOSSARY.md` **nao** entrou em
  `AGENTS_REQUIRED_LINKS` (nem no do repo, nem no do tpl). Adicionar tornaria o link obrigatorio e
  faria todo projeto ja inicializado passar a falhar na validacao.
- `DI-Plano05-fase02-golden-nao-regenerado`: os 2 testes de golden do greenfield estao `test.skip`
  desde 2026-05-21 (init-refactor-v7), com nota de que **nao podem ser regenerados** sem
  `detect-architecture` pre-rodado (greenfield aborta com code=20 quando `stack=null`). Nao
  regenerei; o golden segue congelado e nao cobre o glossario. Isto contradiz o MEMORY do projeto,
  que registrava "5 testes ativos e verdes" a partir do PRD populate-plan-andre-port (fechado
  2026-05-20) — o init-refactor-v7 os skipou **no dia seguinte**.

  A cobertura real vem de `skills/init/lib/scaffold-full-tree.test.ts`, que **itera o
  `TEMPLATE_MANIFEST`**: "writes every template" e "preserves all existing files on re-run" cobrem
  os dois criterios de aceite automaticamente ao adicionar a entry.

### fase-03 (2026-08-13)

- `DI-Plano05-fase03-criterio-3-nao-e-gate`: **contradicao interna do fase doc, resolvida.** O Passo 1
  manda "os tres precisam ser verdadeiros"; o Passo 4 amarra o tier ao criterio 3. As duas coisas nao
  podem valer juntas — se "houve alternativa avaliada" e obrigatorio, o tier leve nunca dispara,
  porque ele existe justamente para o caso sem alternativa (uma restricao de compliance nao tem
  trade-off; foi imposta). Resolvido: **criterios 1 e 2 sao o gate** (ha ADR?), **o 3 seleciona o
  tier**. O `### Dois tiers` documenta a pergunta unica.
- `DI-Plano05-fase03-tier-leve-nao-e-3-frases`: o fase doc define o tier leve como "titulo + 1-3
  frases". **Incompativel com o writer.** `skills/lib/adr-writer.ts:57-74` monta o corpo com as
  quatro secoes sempre, com stub quando o campo nao vem, e `decision-registry/index.ts:37` e o unico
  caminho de escrita em v6. Fazer "titulo + 3 frases" exigiria mexer no writer — proibido por G3 e
  pelo escopo. O tier leve virou **mesmas quatro secoes, duas delas curtas e honestas**: Alternatives
  declara numa linha qual default foi rejeitado e que nao houve comparacao. Preserva forma unica
  entre ADRs, e o exemplo esta na skill.
- `DI-Plano05-fase03-adr-writer-path`: o writer **nao** esta em `skills/decision-registry/lib/` como
  o README e o MEMORY deste plano registravam — esta em **`skills/lib/adr-writer.ts`**. O diretorio
  `skills/decision-registry/lib/` existe, mas so tem `decision-registry-prefaces.ts`.
- `DI-Plano05-fase03-red-flags-3-sites`: o fase doc nomeia **1** site a ajustar (o Red Flag de
  Alternatives). Sao **3**: os dois Red Flags (Alternatives e Consequences — o proprio diagnostico do
  Passo 3 cita os dois) e a checklist `## Verification (apos escrever)`, que exige "Alternatives
  nao-vazia E nao e placeholder" e "Consequences preenchida". Sem escopar a checklist, o tier leve
  nasceria reprovado por ela — o mesmo G2, em outro lugar.

## Teste retroativo da fase-03 (2026-08-13)

| Teste | Resultado |
|---|---|
| 3 ADRs existentes passam no filtro? | **3 de 3, todos tier completo.** `ADR-0001` (checksums SHA-256), `ADR-0021` (default destrutivo do `/init`), `ADR-0022` (FasePlanInput v1). Os tres sao caros de reverter, os tres respondem um "por que raios fizeram assim?" real, e os tres tem `## Alternatives Considered` preenchida |
| Filtro apertado demais, ou ADR desnecessario? | Nenhum dos dois — nao houve reprovacao |
| Existe decisao real sem ADR que caberia no tier leve? | **Sim, uma desta propria sessao.** Ver abaixo |

**A decisao sem ADR, e ela e do tipo mais perigoso:** na fase-02, `docs/GLOSSARY.md` foi deixado
**fora** de `AGENTS_REQUIRED_LINKS` de proposito, nos dois validadores. Um leitor razoavel assume o
contrario — o link esta no `AGENTS.md.tpl`, entao "obviamente" deveria estar na lista de obrigatorios.
Quem "consertar" isso faz **todo projeto ja inicializado** passar a falhar em `harness:validate`, sem
ter mudado nada. Desvio deliberado + restricao invisivel no codigo, sem alternativa avaliada: tier
leve, exatamente o ADR que hoje nao seria escrito.

Segunda candidata, menor: os 2 goldens do greenfield seguem `test.skip` de proposito, e o motivo
(nao regeneraveis sem `detect-architecture`) so vive num comentario.

**Conclusao:** o tier leve nao e solucao para problema inexistente — a primeira decisao que ele
capturaria apareceu dentro do proprio plano que o criou.

## Verificacao empirica da fase-02 (scaffold em tmpdir, 2026-08-13)

Nenhum teste do repo faz este caminho ponta a ponta, entao foi feito a mao:

| O que | Resultado |
|---|---|
| `docs/GLOSSARY.md` criado | sim — 38 arquivos escritos |
| Semente tem `## Language`, `_Avoid_`, ponteiro da skill | sim |
| Placeholder `{{...}}` nao resolvido | nenhum |
| Re-run com glossario preenchido preserva conteudo | sim — 38 skipped, 0 written (G5) |
| `AGENTS.md` do projeto aponta para o glossario | sim — 41 linhas |
| `harness:validate` **do projeto novo** | passou (25 required, 32 md) apos o fix do cap |

Gotcha encontrado no caminho: **`scripts/harness-validate.ts` ignora argumentos** — usa
`process.cwd()` na linha 10. O `.` do `package.json` e decorativo, e rodar
`bun scripts/harness-validate.ts <outro-path>` valida silenciosamente **este** repo. Para validar
outro projeto e preciso trocar o cwd.

Segunda pegadinha: `scaffoldFullTree` sozinho **nao** produz o `CLAUDE.md` da raiz (quem faz e
`linkClaudeToAgents`), entao um scaffold puro sempre falha em `[required-files] Missing required
file: CLAUDE.md`. Nao e regressao — e o teste sendo parcial.

## Teste de aplicacao da fase-01 (3 termos reais deste repo)

| Termo | Veredito | O que revelou |
|---|---|---|
| `compound note` | entra, limpo | especifico do repo, sem colisao com sentido geral |
| `parity gate` | entra, limpo | idem |
| `harness` | **entra, mas reprovava** | palavra geral (test harness) com sentido local divergente. Expos o buraco que gerou `DI-Plano05-fase01-inv02-teste-reescrito` |

Entradas escritas no formato, para a fase-02 usar como aferimento do template semente:

```md
**Harness**:
A estrutura canonica de documentos que o `/init` instala e o `harness:validate` verifica.
_Avoid_: scaffold, boilerplate, template

**Compound note**:
Uma licao durável extraida de um bug real, gravada para que a proxima sessao nao repita o erro.
_Avoid_: lesson, retro, post-mortem

**Parity gate**:
Um teste que falha quando uma skill portada perde capacidade que a fonte tinha.
_Avoid_: regression test, guard
```

## Colisoes da palavra "glossario" ja existentes no repo (medido 2026-08-13)

Nenhuma conflita com `docs/GLOSSARY.md`, mas a palavra ja significa quatro outras coisas aqui:

| Onde | Que sentido |
|---|---|
| `skills/init/assets/snippets/classifier-llm-prompt.md:28` | placeholder `{{GLOSSARY_TERMS}}` — **orfao**, zero consumidor `.ts`; sobrou da `blocks-classifier` deletada |
| `skills/learn/SKILL.md:299` | `## Glossario Interno` — tabela didatica para explicar a leigos |
| `docs/design-docs/init-rationale.md:585` | "glossario compartilhado" entre waves de subagentes |
| `docs/design-docs/subagent-contract-v1.md:118` | `docs/references/severity-glossary.md`, condicional |

Controle positivo do grep de gap: `ADR` aparece em 277 arquivos; `ubiqu` so nos docs deste import.

## Caminhos verificados (2026-08-10)

| O que | Onde |
|---|---|
| Templates do `/init` | `skills/init/assets/templates/docs/*.tpl` |
| Template do AGENTS | `skills/init/assets/templates/AGENTS.md.tpl` |
| Manifest | `skills/init/lib/template-manifest.ts` (shape: `src`, `dst`, `required`, `category`) |
| Teste do manifest | `skills/init/lib/template-manifest.test.ts` — assevera contagem (comentario registra 24, com drift pre-existente) |
| ADRs deste repo | `docs/design-docs/ADR-NNNN-{slug}.md` |
| Writer de ADR | **`skills/lib/adr-writer.ts`** — conta `ADR-*.md` para next_id. Corrigido 2026-08-13: nao fica em `decision-registry/lib/`, que so tem `decision-registry-prefaces.ts`. Unico caller v6: `decision-registry/index.ts:37` |
| Storage legado | `.claude/decisions.md` (append) |

## Estado do `decision-registry` antes da mudanca

**261** linhas (medido 2026-08-13; o plano dizia 260 — corrigido aqui e no README. `CONTEXT.md:248`
ainda carrega 260 dentro da justificativa de DI-17, deixado como registro historico).
Ja tem: `When to Write an ADR` (tabela de gatilhos por topico), lifecycle
PROPOSED→ACCEPTED→SUPERSEDED/DEPRECATED, `Common Rationalizations`, `Red Flags`, checklist de
verificacao, template completo (Context/Decision/Alternatives A-B-C/Consequences), convencao de
cross-link codigo→ADR.

**Ganha da fonte em quase tudo.** O que entra sao 3 coisas que ele nao tem: filtro de 3 criterios,
3 categorias de "o que qualifica", tier leve.

## Resultados a registrar (fase-03, teste retroativo)

| Teste | Resultado |
|---|---|
| 3 ADRs existentes passam no filtro de 3 criterios? | |
| Se algum nao passa: filtro apertado demais, ou ADR desnecessario? | |
| Existe decisao real sem ADR que caberia no tier leve? | |

Se a ultima resposta for "nenhuma", o tier leve pode ser solucao para problema inexistente.
Registrar isso em vez de esconder.

## Gates entre fases

- **fase-01 -> fase-02:** o template semente segue o formato definido em `GLOSSARY-FORMAT.md`.
- **fase-03:** independente; pode rodar antes, depois ou em paralelo.

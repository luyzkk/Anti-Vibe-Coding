# Plano 07: TODO.md + /todo-pick

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~5h (estimado original) / ~5.5h apurado (ver Mapa de Fases)
**Depende de:** Plano 06 (Agent-Native — fase-07 entrega `lib/todo-utils.ts` com helpers `parse/markDone/addLine/skip/remove`; fase-01 entrega `lib/completion-signal.ts`; fase-02 garante que as 6 skills migradas emitem signal)
**Desbloqueia:** Plano 08 (dog-food do plugin valida `/todo-pick` no proprio repositorio anti-vibe-coding com `TODO.md` populado pelas fases anteriores), Plano 09 (release — `plugin-manifest.json` precisa listar a skill nova)

---

## O que este plano entrega

**Skill nova `/todo-pick` + template `TODO.md` na raiz + integracao com `/execute-plan` para captura automatica de micro-debito.** Apos este plano: (1) `/init` (Plano 02 fase-02) ganha passo que escreve `TODO.md` skeleton na raiz do projeto-alvo; (2) `lib/todo-utils.ts` (criado em Plano 06 fase-07 — **ja existe**) e estendido com **filtros e selecao** que a skill `/todo-pick` consome (decisao ambiguity 07-A1); (3) **skill `/todo-pick`** lista itens pendentes, deixa usuario escolher 1, propoe fix, marca como `- [x]` ao concluir (CA-31, CA-32); (4) `/execute-plan` (Plano 05 fase-05) ganha hook de captura: quando agente detecta issue fora do escopo do plano em curso, **appenda** linha em `TODO.md` no formato `- [ ] {date} {file:path:line} descricao` (CA-33). Fluxo E do PRD ("Micro-debito") fica funcional end-to-end.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `lib/todo-utils.ts` com `parse/markDone/addLine/skip/remove` (helpers agnosticos) | Plano 06 fase-07 (CA-44 helper-only) | pendente |
| `lib/completion-signal.ts` — skill `/todo-pick` emite YAML signal ao fim (D33/S12/CA-47) | Plano 06 fase-01 | pendente |
| `lib/path-resolver-v6.ts` — resolve raiz do projeto onde `TODO.md` vive | Plano 05 fase-01 | pendente |
| Skill `/init` ja scaffolda projeto v6 (sem `TODO.md` ainda — esta fase adiciona) | Plano 02 fase-02 | pendente |
| Skill `/execute-plan` migrada para paths v6 (`docs/exec-plans/active/`) | Plano 05 fase-05 | pendente |
| Helper de frontmatter (parser YAML reusado de Plano 06) — fase-04 le frontmatter do plano em curso para identificar escopo | Plano 06 fase-01 (introduz `js-yaml`/`gray-matter`) | pendente |
| `scripts/harness-validate.ts` — rodar apos cada fase para garantir estado valido | Plano 01 fase-04 + Plano 04 | pendente |
| `plugin-manifest.json` (existe no repo atual; Plano 09 fase-03 atualiza para listar `/todo-pick`) | repo atual | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|--------------|
| `skills/todo-pick/SKILL.md` + `skills/todo-pick/templates/todo-md-skeleton.md` | Plano 08 fase-04 (dog-food rodara `/todo-pick` no proprio plugin), Plano 09 fase-03 (release manifest precisa listar a skill) |
| Extensao de `lib/todo-utils.ts` com `pickNext`/`filterByStatus`/`scoreByPriority` (07-A1) | Skill `/todo-pick` (fase-03 deste plano); Plano 08 fase-04 (validacao end-to-end) |
| Hook de captura out-of-scope em `/execute-plan` (Plano 05 fase-05 modificado) | Plano 08 fase-04 (planos historicos migrados nao geram TODO porque ja concluidos — mas behavior precisa funcionar para uso futuro) |
| Convencao de formato `- [ ] {date} {file:path:line} descricao` em `TODO.md` | Plano 04 (validators) opcionalmente valida formato; Plano 06 fase-03 (state-md-generator) ja conta itens TODO `[ ]` na secao Pending |
| Snapshot do `TODO.md` na fixture `tests/fixtures/v6-with-plan/` (criada em Plano 05) | Plano 08 (dog-food usa mesmo formato), Plano 06 fase-04 (hook state-md filtra por path basename `TODO.md` — 06-A4 confirma case-sensitive) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-todo-md-template.md | Template `templates/todo-md-skeleton.md` + passo no `/init` que escreve `TODO.md` na raiz (idempotente — se existe, nao sobrescreve) | 30min | — (so depende de `/init` ja existir, garantido por Plano 02) |
| 02 | fase-02-todo-utils-pick-extension.md | Estende `lib/todo-utils.ts` com `pickNext`, `listPending`, `filterByStatus`, `scoreByPriority`, `parseLine` (TS pure, sem side effects) — decisao ambiguity 07-A1 (opcao **b**: estende, nao recria) | 1h | Plano 06 fase-07 (helpers base) |
| 03 | fase-03-todo-pick-skill.md | `skills/todo-pick/SKILL.md` nova + logica de selecao interativa + emissao de completion signal (CA-31, CA-32) | 2h | fase-02 (helpers de selecao) |
| 04 | fase-04-execute-plan-captura-out-of-scope.md | `skills/execute-plan/SKILL.md` ganha bloco "Out-of-scope capture" — heuristica + `addLine` em `TODO.md` (CA-33) | 2h | Plano 06 fase-07 (`addLine` ja exposto); skill ja migrada (Plano 05 fase-05) |

**Total apurado:** 5.5h (vs ~5h estimado no PLAN.md — divergencia de 30min em fase-04, justificada pela heuristica de deteccao out-of-scope que o overview do PLAN.md subestimou).

### Decisao de ambiguidade **07-A1** (validar antes de executar)

**Pergunta:** Plano 06 fase-07 ja entrega `lib/todo-utils.ts` com `parse/markDone/addLine/skip/remove`. O que fase-02 deste plano realmente faz?

**Opcoes consideradas:**
- **(a) Remover fase-02 e ficar com 3 fases (~4h):** quebra sizing original do PLAN.md (~5h), quebra paralelismo do grafo, perde simetria com outros planos.
- **(b) Estender `todo-utils.ts` com helpers especificos de `/todo-pick`** (`pickNext`, `listPending`, `filterByStatus`, `scoreByPriority`, `parseLine`) que **NAO existem em Plano 06**: a skill `/todo-pick` precisa de **selecao**, nao so de mutacao. Plano 06 expoe CRUD baseline (mutacao). Selecao/leitura tipada eh dominio da skill. **(escolhida)**
- **(c) Apenas formalizar wrapper/imports e testes:** anemico, nao justifica 1h.

**Recomendacao:** opcao **(b)**. Justifica:
1. Helper continua agnostico — `pickNext` recebe array de `TodoItem` parseados e retorna 1 item (sem prompts, sem I/O). Skill orquestra prompts em torno do helper.
2. Preserva sizing do PLAN.md (~5h vs ~4h da opcao a).
3. Plano 06 fase-07 fica com baseline (parse/mutate); Plano 07 fase-02 acrescenta camada de **selecao tipada** sobre o baseline.
4. Testavel isoladamente — `pickNext([item1, item2, item3], { strategy: 'oldest' })` retorna `item1` deterministicamente.

**Impacto se errada:** se opcao **(a)** for preferida, este plano fica com 3 fases (~4h) e logica de `pickNext` migra para dentro do `SKILL.md` (fase-03) — viola separacao TS/markdown defendida em Plano 06. Custo de mudanca: ~1h de retrabalho em fase-02 (deletar + mover snippets para fase-03).

---

## Grafo de Fases

```
Plano 06 (Agent-Native, fase-07 entrega todo-utils baseline)
                          |
                          v
        fase-01 (todo-md-template)
                          |
                          +------------------+
                          |                  |
                          v                  v
        fase-02 (todo-utils-pick-extension)  fase-04 (execute-plan captura)
                          |                  |
                          v                  |
        fase-03 (todo-pick-skill) <----------+
                          (consome helpers)
```

**Paralelismo possivel:**
- **fase-01 isolada (30min)** — pode rodar paralela com fase-02 (template markdown + extensao TS sao arquivos disjuntos).
- **fase-02 e fase-04 100% paralelas** — fase-02 mexe so em `lib/todo-utils.ts` (extensao); fase-04 mexe so em `skills/execute-plan/SKILL.md`. Arquivos disjuntos, sub-agentes independentes. fase-04 importa `addLine` que ja existe em Plano 06.
- **fase-03 serial apos fase-02** — skill precisa dos novos helpers (`pickNext`, `listPending`).
- **Recomendacao operacional:** rodar (fase-01, fase-02, fase-04) em paralelo, depois fase-03 serial. Tempo de relogio: ~3h vs 5.5h serial.

### Decisao de ordem: por que fase-04 nao espera fase-03

A captura out-of-scope em `/execute-plan` consome **apenas** `addLine(filePath, content)` de Plano 06 fase-07 — nao precisa da skill `/todo-pick` para funcionar. Inverter (fase-03 antes de fase-04) seria serializar desnecessariamente. Trade-off: fase-04 chega no merge sem skill `/todo-pick` para "consumir" os itens criados — mas isso eh feature, nao bug: o usuario roda `/todo-pick` depois (ciclo assincrono).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**TDD natural neste plano:**

- **fase-01 (todo-md-template)** — RED: em fixture vazia, rodar `/init` esperando arquivo `{projectRoot}/TODO.md` exista com header `# TODO` + comentario explicativo. Hoje `/init` nao cria — assertion falha. GREEN: adicionar passo no scaffold que copia `templates/todo-md-skeleton.md` para `{projectRoot}/TODO.md` se ausente.
- **fase-02 (todo-utils extension)** — RED: importar `pickNext` de `lib/todo-utils.ts` em teste, chamar com array de 3 items `[{ checked: false, text: 'a' }, { checked: true, text: 'b' }, { checked: false, text: 'c' }]` e estrategia `'oldest'`. Esperar retorno `{ index: 0, item: ... }`. Hoje `pickNext` nao existe — compile error eh OK na primeira corrida; depois implementar stub que retorna `null` para que falha vire assertion. GREEN: implementar selecao filtrando `checked === false`, retornando primeiro (estrategia `oldest`).
- **fase-03 (todo-pick skill)** — RED: rodar skill em fixture com `TODO.md` populado (3 items pending). Esperar output contendo `## TODO items pendentes (3)` + lista numerada. Skill nao existe — assertion falha. GREEN: criar `skills/todo-pick/SKILL.md` chamando `parse` + `listPending` + render numerado. Segundo RED: simular escolha `1` e marcar como done — esperar `TODO.md` reescrito com `- [x]` na linha 0. GREEN: chamar `markDone(0)`.
- **fase-04 (execute-plan captura)** — RED: em fixture `v6-with-plan/` rodar `/execute-plan` simulando agente detectando "typo fora de escopo em `src/foo.ts:42`". Esperar `TODO.md` ganhe linha `- [ ] 2026-05-13 file:src/foo.ts:42 ...`. Hoje skill nao captura — assertion falha. GREEN: skill chama `addLine(todoMdPath, formattedLine)` quando heuristica detecta out-of-scope.

**Tracer Bullet deste plano:** **fase-03** (CA-31 + CA-32 verbatim — skill `/todo-pick` lista 3 items, usuario escolhe, marca como `[x]`). Prova o conceito end-to-end (template existe ← fase-01, helpers existem ← fase-02 + Plano 06 fase-07, skill funciona em fixture real).

---

## Gotchas Conhecidos

- **G1 (formato da linha do TODO — D8 verbatim):** PRD §Componente G define formato:
  ```markdown
  - [ ] {2026-05-12} {file:src/foo.ts:42} typo no comentário
  - [ ] {2026-05-12} {feature:billing} extrair magic number para constante
  ```
  Campos: data ISO `{YYYY-MM-DD}` + classificador (`file:path:line` OU `feature:nome`) + descricao livre. Parser de fase-02 deve aceitar **ambos** os tipos (file: e feature:). Linhas sem classificador (`- [ ] descricao solta`) sao validas mas com `classifier: null` no objeto parseado. Documentar em JSDoc do `parseLine`.

- **G2 (idempotencia do `/init`/fase-01):** Se `TODO.md` ja existe na raiz (usuario rodou `/init` antes, ou editou manualmente), fase-01 **NAO sobrescreve**. Skip silencioso. Logar em telemetria `init.todo_md_skipped`. Justifica: usuario perderia historico. Caso o usuario queira reset, deletar manualmente e re-rodar.

- **G3 (07-A2 — encoding):** `TODO.md` deve ser UTF-8 sem BOM. Helpers de Plano 06 fase-07 usam `fs.writeFileSync(path, content, 'utf-8')`. Confirmar antes de executar fase-01 (template) e fase-04 (addLine). Se Plano 06 fase-07 introduzir BOM por engano, `markDone`/`addLine` em arquivos editados via VSCode (que detecta encoding) pode quebrar. **Decisao assumida em fase-01:** template em UTF-8 sem BOM, line endings `\n` (LF), nao `\r\n`. Em Windows, `fs.writeFileSync` com `utf-8` produz LF por default — confirmar.

- **G4 (07-A3 — lock file / race condition):** Se dois agentes paralelos chamarem `addLine(todoMdPath, ...)` simultaneamente (cenario: 2 `/execute-plan` em 2 PRDs paralelos do mesmo projeto), pode haver perda de escrita (last-write-wins). Plano 06 fase-07 nao implementa lock. **Decisao assumida em fase-04:** aceitar race condition — improvavel (usuario nao roda 2 `/execute-plan` simultaneos no mesmo projeto). Se acontecer, item perdido aparece em `/iterate` posterior. Documentar em CHANGELOG (Plano 09) como known-limitation. Alternativa cara: lock file similar ao Plano 06 fase-04 (state-md hook) — fora de escopo aqui.

- **G5 (heuristica out-of-scope em fase-04):** Como o agente sabe que algo eh "fora de escopo"? Plano em curso tem `Goal` + `Scope` no frontmatter (Plano 05 fase-03, template D18). **Decisao assumida em fase-04:** quando agente detecta arquivo modificado/lido **fora dos paths listados em `Scope`**, perguntar via prompt curto: "Item fora do scope detectado em {path}. Adicionar a TODO.md? [s/N]". Default N. So adiciona com confirmacao explicita do usuario. Justifica: evita poluir `TODO.md` com falsos positivos. Alternativa rejeitada: appendar automatico sem confirmacao — viola D4 (hook sugestivo, nao bloqueante; mesma filosofia aplicada aqui).

- **G6 (CA-33 formato exato):** PRD CA-33 exige formato `- [ ] {date} {file:path:line} descricao`. Fase-04 deve usar `path.relative(projectRoot, absolutePath)` para gerar `{file:path:line}` — paths relativos a raiz do projeto, nunca absolutos (`f:/Projetos/...` quebra portabilidade). Em Windows, normalizar para forward slashes (`path.posix` ou replace `\\` por `/`) — segue G9 de Plano 06.

- **G7 (skill `/todo-pick` emite completion signal):** Por D33/S12/CA-47, toda skill em v6.0.0 deve emitir bloco YAML ao fim. fase-03 chama `renderCompletionSignal({ skill: 'todo-pick', status: 'complete', outputs: [todoMdPath], next_suggested: null, blocks_for_user: [] })` ao fim do fluxo. Para `--skip`/`--remove` (CA-44 — ja entregue em Plano 06 fase-07 helpers; skill expoe como sub-comandos): tambem emite signal (referencia ambiguity 06-A7 do Plano 06).

- **G8 (skill `/todo-pick` reusa CRUD do Plano 06):** Sub-comandos `--skip {n}` e `--remove {n}` ja tem helpers prontos (`skip(lineIndex)`, `remove(lineIndex)`). Fase-03 NAO recria — importa e expoe via CLI da skill. Gotcha de Plano 06 G8: `remove` nao confirma — skill DEVE confirmar interativamente. Para `--remove`, prompt "Tem certeza? [s/N]" (default N). Para `--skip`, sem confirmacao (operacao reversivel — basta editar `- [-]` de volta para `- [ ]`).

- **G9 (provenance comments):** Todo TS gerado neste plano leva `// 2026-05-11 (Luiz/dev): why...`. Aplicavel a fase-02 (extensao TS) e fase-04 (logica TS dentro da skill, se houver). Markdown gerado (template `TODO.md`, `SKILL.md`) **nao** leva provenance — sao output usuario / instrucoes para LLM. Herdado de Plano 06 G12.

- **G10 (idioma — docs em PT-BR / templates em EN):** Por D2, **templates emitidos para o projeto-alvo** (ex: `TODO.md` skeleton, `# TODO\n\n<!-- Lista de micro-debito ... -->`) sao em **EN**. Skill `SKILL.md` (instrucoes para o LLM consumir) eh em PT-BR (alinhado com o resto do plugin atual). Confirmar em fase-01 (skeleton) e fase-03 (SKILL.md texto interno).

- **G11 (interacao com state-md hook de Plano 06 fase-04):** Hook `state-md-hook.cjs` filtra por `path.basename(file_path) === 'TODO.md'` (06-A4). Fase-04 deste plano modifica `TODO.md` via `addLine` chamado **de dentro** da skill `/execute-plan`. Em Claude Code, `Edit`/`Write` direto do agente dispara `PostToolUse`. Mas `addLine` chamado em codigo TS dentro de subprocess **nao** dispara hook (filesystem mutation sem tool call). Resultado: STATE.md pode ficar stale. Aceitar — usuario roda `bun run state:regenerate` manual (G5 de Plano 06). Documentar como known-limitation.

- **G12 (fase-04 ponto de captura):** Por filosofia de D4 (hook sugestivo) + G5 acima, a captura **nao eh automatica** — eh **proposta**. Implementacao: bloco no `SKILL.md` de `/execute-plan` (em PT-BR) instruindo: "ao detectar arquivo fora de Scope, perguntar ao usuario se quer adicionar a TODO.md". Nao eh codigo TS — eh instrucao em natural language para o LLM seguir. Helper `addLine` so eh chamado **se** usuario confirmar. Gotcha: skill base `/execute-plan` precisa ter um ponto de injecao para essa instrucao — verificar em Plano 05 fase-05 onde fica o bloco "durante execucao".

### Ambiguidades sinalizadas (decisao assumida — validar antes de executar)

- **07-A1 (escopo de fase-02 — ja decidida acima):** Opcao **(b)** — estende `lib/todo-utils.ts` com `pickNext`, `listPending`, `filterByStatus`, `scoreByPriority`, `parseLine`. **Validar:** se PRD/dev preferir opcao (a) — remover fase-02 e mover logica para skill, retorno de retrabalho ~1h.

- **07-A2 (encoding e line endings de `TODO.md`):** UTF-8 sem BOM, `\n` LF. Validar em Windows — `fs.writeFileSync(path, content, 'utf-8')` deve produzir LF, mas confirmar com `Buffer.from(readFileSync(path))[0..2]` nao ser `[0xEF, 0xBB, 0xBF]` (BOM). Impacto se errada: ferramentas downstream (parser de Plano 06 hook state-md) podem falhar silenciosamente em frontmatter ou contagem de linhas.

- **07-A3 (race condition em `addLine`):** Aceitar — sem lock. Improvavel; documentar como known-limitation. Impacto se errada: 2 `/execute-plan` paralelos no mesmo projeto perdem item ocasionalmente. Mitigacao tardia se virar dor real: copiar padrao de lock de Plano 06 fase-04 (lock file em `~/.claude/cache/`).

- **07-A4 (deteccao out-of-scope — heuristica):** Comparacao path-by-path contra campo `Scope` do frontmatter do plano em curso. Decisao assumida: `Scope` no template D18 eh **array de glob patterns** (ex: `['src/notifications/**', 'tests/notifications/**']`). Se Plano 05 fase-03 definiu `Scope` como prosa livre, fase-04 deste plano fica sem como parsear — fallback: pergunta SEMPRE em qualquer Edit/Write (poluido demais — quebra UX). **Validar com Plano 05 fase-03 antes de executar.** Impacto se errada: fase-04 vira manual prompt sempre — usuario silencia rapido — feature de captura morre.

- **07-A5 (formato `feature:nome` vs `file:path:line` — escolha de classifier):** Quando agente captura out-of-scope, qual classifier usa? Decisao assumida em fase-04: se issue tem arquivo concreto (typo, magic number) → `file:path:line`. Se issue eh abstrato ("refactor billing module") → `feature:nome` (nome inferido do contexto). Heuristica: presenca de `file_path` no tool call → file: ; senao → feature: . Impacto se errada: `/todo-pick` lista classifier vazio para items mal-formados. Mitigacao: parser de fase-02 aceita ambos + null.

- **07-A6 (sub-comandos `--skip`/`--remove` na skill `/todo-pick`):** Plano 06 fase-07 entrega helpers `skip(lineIndex)` e `remove(lineIndex)`. CA-44 do PRD lista como sub-comandos da `/todo-pick`. **Decisao assumida em fase-03:** skill `/todo-pick` aceita 3 sub-comandos: bare (`/todo-pick` interativo), `--skip {n}` (marca skipped), `--remove {n}` (remove com confirmacao). Indices baseados em **listagem que a skill imprime** (1-based), nao em line index do arquivo (0-based). Helper interno traduz. Impacto se errada: usuario tenta `--skip 0` esperando primeiro item e marca o header — bug grave. Mitigacao: validar input >= 1 e <= length pendentes.

- **07-A7 (skill suporta `--add` standalone?):** CA-33 fala apenas de adicao via outras tasks (in-loop em `/execute-plan`). Usuario quer comando explicito `/todo-pick --add "texto"` para registrar TODO sem estar em `/execute-plan`? **Decisao assumida em fase-03:** **NAO** — `/todo-pick --add` fora de escopo v6.0.0. Usuario edita `TODO.md` manualmente OU dispara `/execute-plan` que captura. Justifica: minimiza superficie de skill. Could Have v6.1+.

- **07-A8 (estrategias de `pickNext` — quais entram em v6.0.0?):** Helper `pickNext` deve suportar quais estrategias? **Decisao assumida em fase-02:** apenas `'oldest'` (FIFO, primeiro item pending por linha) em v6.0.0. Outras (`'random'`, `'by-tag'`, `'shortest-description'`) ficam para v6.1+. Skill `/todo-pick` (fase-03) usa apenas `'oldest'`. Imapcto se errada: usuario quer aleatoriedade do PRD Fluxo E ("3: aleatório") — fase-03 implementa aleatoriedade INLINE com `Math.random()` (sem expor estrategia no helper). Aceitavel — codigo pequeno.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

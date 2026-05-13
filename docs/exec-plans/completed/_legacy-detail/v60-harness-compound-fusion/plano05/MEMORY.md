<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-11 (Luiz/dev): default 30s — alinhado com OQ2 do CONTEXT v6.0.0`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Memoria: Plano 05 — Skill Migration + Hooks

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion
**Iniciado:** 2026-05-12
**Status:** em andamento (5/8 fases)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Aceitar tanto string quanto objeto no primeiro arg de `lessonsLearned.add`
  - Por que: D10 zero breaking change — usuarios v5.x passam string posicional
  - Impacto: assinatura ficou union `(stringOrOpts: string | LessonOpts)`, JSDoc clarifica
-->

### Fase-01 (2026-05-12)

- **DI-01-01:** Helpers `path-resolver-v6.ts` + `compound-note-writer.ts` colocados em `anti-vibe-coding/skills/lib/` (cross-skill), nao em `anti-vibe-coding/lib/` como sugerido pela spec da fase.
  - Por que: `anti-vibe-coding/lib/` nao existe; `skills/lib/` ja eh convencao estabelecida para helpers cross-skill (feature-flags.ts, telemetry-utils.ts, manifest-schema.ts, profile-md-generator.ts etc.).
  - Impacto: imports nas 6 skills migrandas (fases 02-06) sao `../lib/path-resolver-v6` (relativo a `skills/{name}/index.ts`).
- **DI-01-02:** Fixture `tests/fixtures/v6-empty/` criada como diretorio novo com 4 `.gitkeep` (compound, design-docs, exec-plans/active, exec-plans/completed). Fixture `legacy-v5/` reutilizada (Plano 03 fase-07).
  - Por que: tracer da migracao precisa de v6 minimo sem ruido; legacy-v5 ja servia como cenario v5.
  - Impacto: fases 02..06 podem reusar `v6-empty/` para tests de v6 nu.
- **DI-01-03:** Teste de integracao `tests/lessons-learned-v6.test.ts` cria tmp dirs proprios (em vez de mutar fixture estatica) para CA-14 + D10.
  - Por que: fixture estatica nao deve receber writes durante testes (isolamento).
  - Impacto: padrao replicavel para fases 02-06.

### Fase-02 (2026-05-12)

- **DI-02-01:** `adr-writer.ts` colocado em `anti-vibe-coding/skills/lib/` (nao em `anti-vibe-coding/lib/` como o spec da fase indicava).
  - Por que: aplicacao direta de DI-01-01 — `anti-vibe-coding/lib/` nao existe; `skills/lib/` eh convencao cross-skill estabelecida.
  - Impacto: imports em `skills/decision-registry/index.ts` ficam `'../lib/adr-writer'` e `'../lib/path-resolver-v6'` (UM `..`, nao dois). Spec da fase tinha paths errados — usar este padrao em fases 03-06.
- **DI-02-02:** Guard `m[1] != null` antes de `parseInt` no parser de filename ADR.
  - Por que: TypeScript strict tipa `RegExp` capture groups como `string | undefined`; `parseInt(undefined)` quebra typecheck (TS2345). Guard explicito evita `as string` (CLAUDE.md proibe `as` quase sempre).
  - Impacto: padrao replicavel em fases 03/05 (que vao parsear filenames de exec-plans).

### Fase-03 (2026-05-12, commit fd94646)

- **DI-03-01:** `skills/plan-feature/SKILL.md` nao tinha secao "Output Format" pre-existente. Inserida como nova secao antes de `## Regras`.
  - Por que: spec dizia "substituir secao Output Format" mas a secao nao existia; insercao em posicao logica.
  - Impacto: futura mudanca de output reabre essa secao.
- **DI-03-02:** `plan-feature/index.ts` nao existe — skill e markdown-only (orquestracao via prompts). Nao foi criado.
  - Por que: confirmado em fase-01/02 que skills sao markdown-only por convencao; runtime via subagentes que leem SKILL.md.
  - Impacto: `renderExecPlan`/`writeExecPlan` sao chamados pelo subagente da skill, nao por codigo TS direto. Fases 04/05 seguem mesmo padrao.
- **DI-03-03:** `writeExecPlan` usa `writeFile` sem flag `'wx'` (em contraste com `adr-writer` da fase-02).
  - Por que: filename `YYYY-MM-DD-{slug}.md` e deterministico; reruns de testes precisam sobrescrever. ADR usa monotonic counter (colisao natural prevenida).
  - Impacto: rerun de `/plan-feature` com mesmo title no mesmo dia sobrescreve. Aceitavel — eh comportamento esperado.
- **DI-03-04:** `bulletOrEmpty` e `checkboxOrEmpty` parametros tipados como `readonly string[] | undefined`.
  - Por que: arrays `as const` (EXEC_PLAN_SECTIONS_FULL) retornam `readonly string[]`. TypeScript strict recusa atribuicao a `string[]`. CLAUDE.md proibe `as`.
  - Impacto: padrao replicavel para todos helpers que consumam `as const` arrays.

### Fase-04 (2026-05-12, commit 7204e34)

- **DI-04-01:** Output Format inserida entre Step 5 e "O que Este Skill NAO Faz".
  - Por que: posicao semanticamente correta — apos pipeline e antes de restricoes.

### Fase-05 (2026-05-12, commit 1120b96)

- **DI-05-01:** `exec-plan-reader.ts` nao importa `node:path`.
  - Por que: nenhuma operacao de path no modulo — apenas leitura de `filePath` recebido.
  - Impacto: zero deps desnecessarias.
- **DI-05-02:** `parseFrontmatter` usa type guards (`rawMode === 'full' || rawMode === 'quick'`) em vez de `as` cast.
  - Por que: CLAUDE.md proibe `as` quase sempre.
  - Impacto: padrao replicavel para qualquer parser de enum vindo de string externa.
- **DI-05-03:** Regex de `splitFrontmatter` usa double-anchor `^---\n...\n---\n`.
  - Por que: planos sem frontmatter (legacy flat) retornam defaults seguros.
  - Impacto: documentar via JSDoc para devs futuros — comportamento de fallback intencional.

- **DI-02-03:** `writeFile` com flag `'wx'` em `adr-writer.ts:69`.
  - Por que: security audit MEDIUM — race 02-G1 (duas chamadas paralelas mesmo nextId) era overwrite silencioso. Com `wx`, segunda chamada falha com `EEXIST` (detectavel).
  - Impacto: spec aceitava race como trade-off, agora eh fail-fast em vez de silent corruption. Sem lockfile ainda — se virar pain, adicionar `.adr.lock`.
- **DI-02-04:** `JSON.stringify(status)` no frontmatter (alem do `title`).
  - Por que: security audit LOW — caller JS sem types pode passar `status: 'active\nmalicious: true'` e injetar linha no YAML.
  - Impacto: assertion `'status: active'` virou `'status: "active"'` em 2 testes existentes.
- **DI-02-05:** `opts.title.replace(/\r?\n/g, ' ')` antes de interpolar em `decisions.md` legado.
  - Por que: security audit LOW — title com `\n## ` quebrava estrutura H2 do markdown legado e gerava sub-headings espurios.
  - Impacto: padrao replicavel em qualquer interpolacao de input em markdown legado (fase-01 nao tem isso mas eh prudente revisitar).
- **DI-02-06:** Magic numbers extraidos para `ADR_ID_WIDTH = 4` e `SLUG_MAX_LEN = 50` com WHY comments.
  - Por que: code smell LOW — magic numbers em `padStart(4, ...)` e `.slice(0, 50)`. Constantes documentam intencao (sort lexicografico, Windows path budget).

### Fase-06 (2026-05-12, commit 2a7ba4f)

- **DI-06-01:** `skills/iterate/index.ts` nao foi criado. Skill mantida markdown-only (herda DI-03-02 / DEV-04-01 / DEV-05-01).
  - Por que: introduzir `index.ts` para uso unico sem consumidor real adiciona abstracao sem ganho. E2E test consome `runCompoundGate` diretamente do helper em `skills/lib/`.
  - Impacto: integracao do gate em `/iterate` documentada como pseudocodigo em SKILL.md (bloco de codigo executavel). Runtime: subagente da skill le SKILL.md e chama o helper.
- **DI-06-02:** `appendValidationLog` tem fallback defensivo — se a secao `## Validation Log` nao existir no plano, cria ao final do arquivo.
  - Por que: planos podem desviar do template; gate nao deve quebrar por isso.
  - Impacto: idempotente; chamadas repetidas appendam linhas sob a mesma secao.
- **DI-06-03:** `exactOptionalPropertyTypes: true` no tsconfig do submodulo forcou spread condicional para `tags` e atribuicao condicional para `noCaptureReason`.
  - Por que: passar `tags: string[] | undefined` diretamente para `CompoundNoteInput` (que declara `tags?: string[]`) gera TS2379. Padrao `...(val != null ? { key: val } : {})` evita `as` (CLAUDE.md).
  - Impacto: padrao replicavel em qualquer interface com `?:` opcionais sob `exactOptionalPropertyTypes`.

### Fase-07 (2026-05-12, commit fea14f3)

- **DI-07-01:** `shouldSuggestPlan` **inlined** dentro de `hooks/pre-mutation-gate.cjs` (alem de exportado pelo helper).
  - Por que: `require()` Node nativo falha em paths Windows com espaco no nome do diretorio (`Claude code/`), mesmo via `path.join(__dirname, ...)`. Hook eh executado via `spawn('node', ...)` — contexto Node nativo. Bun test usa `createRequire(import.meta.url)` que resolve URL-encoded — por isso unit tests do helper funcionam.
  - Impacto: helper continua sendo a fonte de verdade (unit tests cobrem). Hook duplica a logica como fallback ate o diretorio raiz ser renomeado para sem-espaco. DEV-07-01 documenta o caminho de remediacao.

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Hook pre-mutation-gate.cjs dispara DUAS vezes em primeiro prompt
  - Causa: prompt-guard.cjs antigo tambem injeta em alguns padroes
  - Fix: shared lock file ~/.claude/cache/last-hook-fire.json TTL 5s
  - Fase afetada: fase-07
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** /execute-plan ao mover plano para completed/ em Windows precisa fechar handles antes de fs.rename — senao EPERM
  - Descoberto em: fase-05
  - Impacto: helper precisa await readFile completar antes de rename
-->

- **GT-novo-01 (fase-01):** `tests/fixtures/compound-100-docs/` aparece como untracked em `git status` (artefato gerado pelo bench do Plano 04 fase-04). Subagentes futuros devem ignorar — nao stagear acidentalmente.
  - Mitigacao: `.gitignore` da fixture (ja existe — `tests/fixtures/compound-100-docs/.gitignore` cobre conteudo gerado).
- **GT-novo-02 (fase-02):** RegExp capture groups `m[1]` tem tipo `string | undefined` em TypeScript strict — `parseInt(m[1], 10)` quebra typecheck (TS2345) mesmo dentro de `if (m)` branch. Solucao: guard extra `if (m && m[1] != null)` antes de chamar `parseInt`. Evita `as string` (CLAUDE.md proibe `as`).
  - Descoberto em: fase-02 (parser de filename ADR-NNNN-*.md).
  - Impacto: replicavel em fases 03/05 (parsing de exec-plan filenames com regex captures).
- **GT-05-01 (fase-05):** Regex de update de frontmatter em `moveToCompleted` assume `---\n` na linha 1 (sem BOM). `readExecPlan` faz BOM strip mas `moveToCompleted` le raw direto. Frontmatter v6 sempre comeca na linha 1, mas documentar.
- **GT-05-02 (fase-05):** `resolvePaths` retorna `execPlansActiveDir` calculado mesmo em layout `v5`/`cru` (path eh sempre `<root>/docs/exec-plans/active`). Helpers como `listActivePlans` e `moveToCompleted` funcionam independente de layout — usar para fixtures de teste minimas (so 4 .gitkeep necessarios).
- **GT-03-01 (fase-03):** Arrays declarados `as const` (ex.: `EXEC_PLAN_SECTIONS_FULL`) tem tipo `readonly readonly string[]`. Helpers que recebem `string[]` recusam o array. Solucao: digitar parametro como `readonly string[] | undefined`. NAO usar `as string[]` (proibido em CLAUDE.md).
  - Descoberto em: fase-03 (`bulletOrEmpty`, `checkboxOrEmpty`).
  - Impacto: replicavel em qualquer helper que consuma constantes tipadas `as const`.
- **GT-06-01 (fase-06):** `exactOptionalPropertyTypes: true` esta ativo no tsconfig. Passar `tags: string[] | undefined` direto para uma interface com `tags?: string[]` quebra com TS2379 (a propriedade nao pode receber `undefined` explicito). Solucao: spread condicional `...(val != null ? { tags: val } : {})`.
  - Descoberto em: fase-06 (`runCompoundGate` capture path passando `response.captureInput.tags`).
  - Impacto: padrao replicavel — qualquer call site que monta objeto com props opcionais a partir de unioes `| undefined`.
- **GT-07-01 (fase-07):** `require()` Node nativo falha silenciosamente para paths absolutos Windows com espaco no nome do diretorio raiz (ex.: `f:/Projetos/Claude code/...`). Bun ESM `createRequire(import.meta.url)` funciona (URL encoding). Afeta qualquer hook `.cjs` que tente `require` de modulo local.
  - Descoberto em: fase-07 (hook spawned por test via `node` nativo).
  - Mitigacao: rename do diretorio raiz futuramente (sem espaco) OU inline da logica no consumer (DI-07-01).

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-04 implementou 6 secoes em vez de 7 no quick-plan
  - Motivo: Compound Opportunity ficou redundante com Lessons Captured em planos pequenos
  - Aprovado pelo dev em sessao
-->

- **DEV-01-01 (fase-01):** Helpers em `skills/lib/` em vez de `anti-vibe-coding/lib/` (path da spec). Justificado em DI-01-01. Aprovado pelo orquestrador antes da execucao.
- **DEV-03-01 (fase-03):** `skills/lib/exec-plan-{sections,template}.ts` em vez de `anti-vibe-coding/lib/...`. Justificado em DEV-01-01/DI-02-01 (mesmo CAVEAT). Aprovado.
- **DEV-03-02 (fase-03):** `writeExecPlan` no mesmo arquivo de `renderExecPlan` (`exec-plan-template.ts`) em vez de arquivo separado. Justificativa: coesao + DRY — sem necessidade de arquivo extra so para exports relacionados.
- **DEV-04-01 (fase-04):** `skills/quick-plan/index.ts` nao criado — skill markdown-only, herda DI-03-02.
- **DEV-04-02 (fase-04):** Sem RED real — `renderExecPlan({mode:'quick'})` ja estava implementado (fase-03 entregou tanto FULL quanto QUICK). Testes passaram imediatamente. Documentado como evidencia de fase-03 ter sido implementada corretamente.
- **DEV-04-03 (fase-04):** D10 backward-compat string overload nao testado — pertenceria a wrapper inexistente (`index.ts` da skill). Teste adaptado para verificar dois objetos identicos.
- **DEV-05-01 (fase-05):** `skills/execute-plan/index.ts` nao criado — skill markdown-only. Passo 4 da spec (helper `onPlanPotentiallyComplete`) pulado. Se fase-06 precisar, criar em `skills/lib/exec-plan-orchestrator.ts` (evita criar `index.ts` em skill markdown-only).
- **DEV-06-01 (fase-06):** `skills/iterate/index.ts` nao criado — mantida markdown-only (replica DEV-04-01/DEV-05-01). Bloco "Compound Decision Gate" entregue como pseudocodigo no SKILL.md.
- **DEV-06-02 (fase-06):** Spec da fase usava `anti-vibe-coding/lib/compound-decision-gate.ts` — caminho correto eh `skills/lib/compound-decision-gate.ts` (replica DEV-01-01/DEV-03-01). Aprovado em pre-execucao.
- **DEV-07-01 (fase-07):** Logica de `shouldSuggestPlan` duplicada inline em `pre-mutation-gate.cjs` por conta de bug do `require()` Node em paths Windows com espacos (GT-07-01). Helper continua sendo a fonte de verdade (unit tests cobrem). Remediacao futura: renomear diretorio raiz para sem espaco e remover o inline duplication.
- **DEV-07-02 (fase-07):** Hook usa `async main()` com guard `handled` + `clearTimeout(safetyTimer)` para evitar dupla-emissao entre `setImmediate` (data chunk) e `stdin.on('end')`. Padrao copiado de `user-prompt-gate.cjs`.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 8 |
| Fases concluidas | 7 |
| Fases com desvio | 6 (fase-01 paths; fase-03 paths + single-file; fase-04 no-index + no-RED + D10 wrapper; fase-05 no-index + no-orchestrator; fase-06 no-index + paths; fase-07 inline duplication) |
| Bugs encontrados | 1 (BUG-05-01 — guard `string \| undefined` em `plans[0]`, corrigido inline) |
| Retries necessarios | 1 (fase-07 caiu por 529 API overload apos RED escrito; resumed GREEN em segundo plan-executor) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Exemplos do que devera estar aqui ao fim deste plano:
- Helper `lib/path-resolver-v6.ts` resolve docs/{compound,design-docs,exec-plans/active|completed} com fallback v5
- Helper `lib/compound-decision-gate.ts` exporta `runGate(planPath): Promise<GateResult>` — Plano 06 fase-02 pode encadear
- Helper `lib/exec-plan-template.ts` renderiza 10 secoes D18 (full) ou 7 secoes (quick)
- `hooks/pre-mutation-gate.cjs` registrado em `hooks/hooks.json` (UserPromptSubmit) — Plano 08 fase-01 ja conta com ele como Camada 1 D29
- Skills migradas mantem assinatura legada (D10) — Plano 06 ao adicionar --update/--delete deve respeitar esse padrao
-->

### Disponivel para fase-08 (apos fase-06 + fase-07)

- **`runCompoundGate(ctx, prompt): Promise<GateResult>`** em `skills/lib/compound-decision-gate.ts`. `ctx = {projectRoot, planPath}`; `prompt: GatePromptFn` injetada (testabilidade). Retorna `{choice, planMoved, compoundCreatedPath?, noCaptureReason?}`. Caminho **capture** chama `writeCompoundNote` + `moveToCompleted`; **no_capture_needed** chama `appendValidationLog` (formato `- YYYY-MM-DD: no_capture_needed: {razao}`) + `moveToCompleted`; **postpone** atualiza frontmatter para `status: pending-capture`, plano FICA em `active/`. Plano nao-completo → rejeita com Error.
- **`shouldSuggestPlan(prompt): {suggest, why}`** em `hooks/lib/heuristic-mutation.cjs`. Heuristica D26 (verbos PT+EN, code-path hints, negative-list short-circuit). Fase-08 dog-food pode reusar diretamente para validar matriz de exemplos.
- **`hooks/pre-mutation-gate.cjs`** registrado em `hooks/hooks.json` (UserPromptSubmit, apos user-prompt-gate). Output JSON `{inject, message, role, block}` — NUNCA `block:true` (CA-23). Honora lock compartilhado TTL 5s e CA-24 (nao molesta se ha plano ativo).
- **CRITICO para fase-08:** existencia do hook + cleanup do telemetry path antes/depois dos testes E2E. Variavel `ANTI_VIBE_DISABLE_HOOKS=1` mencionada no README do plano para desativar hook durante automated tests — fase-08 precisa decidir se implementa esse opt-out ou apenas tolera o hook injetando contexto nos testes.
- **AVISO Windows:** Inline duplication da heuristica em `pre-mutation-gate.cjs` (DI-07-01). Se renomear diretorio raiz para sem espaco no futuro, remover o duplicate e voltar para `require('./lib/heuristic-mutation')`.

### Disponivel para fases 06-08 (apos fase-04 + fase-05)

- **`readExecPlan(filePath): Promise<ExecPlanFile>`** em `skills/lib/exec-plan-reader.ts`. Retorna `{filePath, frontmatter: {title, mode, status, created, completedAt?}, bodyByH2: Record<string,string>}`. BOM strip defensivo.
- **`isComplete(plan: ExecPlanFile): boolean`** mesmo modulo. `true` so quando: `status: active` AND Exit Criteria nao vazio AND nao tem `<!-- preencher -->` AND >=1 `- [x]` AND zero `- [ ]`. Plano ja com `status: completed` retorna `false` (intencional — nao re-mover).
- **`moveToCompleted(projectRoot, activePlanPath): Promise<{newPath}>`** em `skills/lib/exec-plan-mover.ts`. Atualiza `status: active → completed` + adiciona `completedAt: YYYY-MM-DD` (idempotente). `read → writeFile newPath → unlink oldPath` (NAO atomico — trade-off documentado). NAO valida colisao no destino — fase-06+ pode adicionar `fs.stat` check antes do `writeFile` se houver risco.
- **`listActivePlans(projectRoot): Promise<string[]>`** mesmo modulo. Paths absolutos, exclui `README.md`. Retorna `[]` se diretorio nao existe.
- **Helper sugerido para fase-06:** `onPlanPotentiallyComplete(projectRoot, planPath)` deveria viver em `skills/lib/exec-plan-orchestrator.ts` (NAO em `index.ts` de skill, que e markdown-only).
- **Telemetria `exec_plan.completed`:** SKILL.md documenta evento mas NAO esta wired em codigo TS. Fase-06 ou orquestrador conecta `writeTelemetryEnd`.
- **Quick-plan validado:** `renderExecPlan({mode:'quick', title, ...})` retorna 7 secoes corretas; `writeExecPlan(root, {mode:'quick', ...})` cria arquivo em `docs/exec-plans/active/`. Sem mudancas necessarias para reuso futuro.

### Disponivel para fases 04-08 (apos fase-03)

- **`renderExecPlan(input: ExecPlanInput): string`** em `anti-vibe-coding/skills/lib/exec-plan-template.ts`. Aceita `mode: 'full'|'quick'`. Retorna markdown com frontmatter (`title`/`mode`/`status: active`/`created`) + H1 + secoes H2 nas ordens canonicas. Secoes sem input ficam com placeholder `<!-- preencher -->` ou `<!-- preencher durante execucao: ... -->`.
- **`writeExecPlan(projectRoot, input): Promise<{filePath}>`** mesmo modulo. Usa `resolvePaths().execPlansActiveDir`. `fs.mkdir` recursivo + `fs.writeFile` sem flag `wx` (DI-03-03 — filename deterministico permite overwrite).
- **`EXEC_PLAN_SECTIONS_FULL`** (10 strings, `readonly string[]`) e **`EXEC_PLAN_SECTIONS_QUICK`** (7 strings, `readonly string[]`) em `anti-vibe-coding/skills/lib/exec-plan-sections.ts`. Tipo `ExecPlanMode = 'full'|'quick'` exportado.
- **Tipo `ExecPlanInput`** exportado: `{ title, mode, goal?, scope?, assumptions?[], risks?[], executionSteps?[], reviewChecklist?[], exitCriteria?[] }`. Validation Log / Compound Opportunity / Lessons Captured nao recebem input — sempre placeholder no render inicial.
- **Template `.tpl`** em `anti-vibe-coding/skills/plan-feature/templates/exec-plan-full.md.tpl` com tokens `{{title}}` e `{{date}}`. Disponivel para casos onde skill usa template raw sem `renderExecPlan`.
- **Fase-04 (quick-plan):** invocar `renderExecPlan({mode:'quick', title, ...})` — 7 secoes automaticas. NAO precisa template QUICK separado.
- **Fase-05 (execute-plan):** ao mover plano de `active/` para `completed/`, substituir `status: active` por `status: completed` no frontmatter. Path origem: `resolvePaths().execPlansActiveDir`. Path destino: `resolvePaths().execPlansCompletedDir`.
- **Fase-06 (iterate-compound-gate):** mesmo padrao de update de frontmatter ao mover. Compound note via `writeCompoundNote` (fase-01).
- **Pattern `readonly string[]`** em helpers que consomem constantes `as const`: parametro `items?: readonly string[]`. Replicar em fases 04-08.

### Disponivel para fases 03-08 (apos fase-02)

- **`writeADR(designDocsDir, input)`** em `anti-vibe-coding/skills/lib/adr-writer.ts` retorna `{ filePath, id }`. Numeracao monotonica via `readdir` do diretorio (max(ADR-NNNN-*) + 1). Tipo `ADRInput = { title, context?, decision?, alternatives?[], consequences?, status? }`. Reusar em fase-06 se Compound Decision Gate gerar ADR auxiliar.
- **Padrao D10 consolidado em 2 skills:** `/lessons-learned add()` (fase-01) e `/decision-registry add()` (fase-02). Assinatura: `add(arg: string | Opts, projectRoot = process.cwd())`. Dispatch via `resolvePaths(projectRoot)` por `layout`. Fases 03-06 devem replicar.
- **Validacao de paths:** spec das fases tem caminhos errados (`anti-vibe-coding/lib/...`) — DI-01-01 + DI-02-01 padronizam `anti-vibe-coding/skills/lib/`. Imports relativos de `skills/{name}/index.ts` ficam `'../lib/...'` (UM nivel).

### Disponivel para fases 02-08 (apos fase-01)

- **`resolvePaths(projectRoot)`** em `anti-vibe-coding/skills/lib/path-resolver-v6.ts` retorna `ResolvedPaths` com `layout: 'v6' | 'v5' | 'cru'`, `compoundDir`, `designDocsDir`, `execPlansActiveDir`, `execPlansCompletedDir`, `legacyLessonsFile`. Heuristica v6 = `docs/compound/` AND `docs/exec-plans/` ambos existem. Reusar em fase-02 (`/decision-registry` → `designDocsDir`), fase-03/04 (`/plan-feature`, `/quick-plan` → `execPlansActiveDir`), fase-05 (`/execute-plan` move `active` → `completed`).
- **`writeCompoundNote(compoundDir, input)`** em `anti-vibe-coding/skills/lib/compound-note-writer.ts` retorna `{ filePath, created }`. Frontmatter gerado passa `parseFrontmatter` de `compound-frontmatter.ts` (Plano 04 fase-02). Slug collision policy: sufixo `-2`, `-3`, ... Reusar em fase-06 (Compound Decision Gate gera compound note via mesmo helper).
- **Padrao de fixture v6**: `tests/fixtures/v6-empty/` com 4 `.gitkeep` ja existe. Fases 02-08 reusam para cenarios v6 minimos. Para v6 com plano populado: criar nova fixture `v6-with-plan/` em fase-03 (sera consumida por Plano 06 fase-04 e Plano 07 fase-03 conforme README).
- **Padrao de testes E2E**: criar tmp dir via `fs.mkdtempSync(path.join(os.tmpdir(), 'prefix-'))`, NAO mutar fixtures estaticas (DI-01-03).
- **Assinatura D10**: `add(arg, projectRoot = process.cwd())` aceita `string | LessonOpts`. Replicar padrao em `/decision-registry add()`, `/iterate`, etc. Provenance comment `// 2026-05-12 (Luiz/dev): D10 — backward-compat com chamada posicional v5.x`.
- **Tip de migracao v5→v6**: linha `<!-- Tip: rode /anti-vibe-coding:init para migrar para layout v6 (docs/compound/) -->` injetada UMA vez em legacy (idempotente). Fases 02-06 devem usar mesmo formato de tip se applicable.

### Helpers existentes do Plano 04 disponiveis

- `anti-vibe-coding/skills/init/lib/compound-frontmatter.ts` — `parseFrontmatter(body)` valida schema (tags >=1, sections H2 estritas). Use em writeup posterior se quiser validar antes de gravar.
- `anti-vibe-coding/skills/init/lib/compound-files-collector.ts` — `listCompoundFiles(root)` exclui `_archived/` + README/index. Plano 06 CRUD reusara.

### Caveats validos para todas as fases seguintes

- GT-12 (`bun run test` global exit 1): SEMPRE escope testes (path explicito).
- TDD gate: crie `.test.ts` co-localizado ANTES do `.ts`.
- Commits dentro de `anti-vibe-coding/` (submodulo).
- Comentarios provenance `// 2026-05-12 (Luiz/dev): ...` em todo TS novo.

---

<!-- Atualizado automaticamente durante execucao -->

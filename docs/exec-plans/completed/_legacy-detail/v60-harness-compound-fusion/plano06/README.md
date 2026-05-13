# Plano 06: Agent-Native (D31 CRUD + D32 STATE.md hook + D33 completion signal)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion ([PLAN overview](../PLAN.md))
**Fases:** 7
**Sizing total:** ~12h
**Depende de:** Plano 05 (Skill Migration + Hooks — 6 skills migradas com `lib/path-resolver-v6.ts`, `lib/exec-plan-template.ts`, `lib/compound-decision-gate.ts`, hook `pre-mutation-gate.cjs` registrado em `hooks/hooks.json`, fixture `tests/fixtures/v6-with-plan/`)
**Desbloqueia:** Plano 07 (`/todo-pick` skill reusa helpers de `lib/todo-utils.ts` de fase-07), Plano 08 (dog-food do plugin valida CRUD + STATE.md + completion signal nas 6 skills migradas)

---

## O que este plano entrega

**Cherry-picks do artigo agent-native em cima das 6 skills migradas em Plano 05.** Apos este plano: (1) cada skill emite ao fim um **bloco YAML machine-readable** parseavel (D33/S12/CA-47) — orquestrador pode encadear sem heuristica textual; (2) **`docs/STATE.md` dinamico** mantido por hook `PostToolUse` com rate-limit 30s (D32/M13/CA-45/CA-46) — agente em sessao nova ve estado real do projeto em <40 linhas; (3) **CRUD completo** preservando historia: lessons via soft-archive em `docs/compound/_archived/` (CA-41/CA-42), ADRs via pattern superseded com link bidirecional (CA-43), TODOs via `[-]` skip ou remove confirmado (CA-44). **Nada eh hard-deletado** — R14 mitigado. Plano 07 ganha a skill `/todo-pick` que consome `lib/todo-utils.ts` produzido aqui.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `lib/path-resolver-v6.ts` (resolve `docs/compound/`, `docs/design-docs/`, `docs/exec-plans/active|completed/`) | Plano 05 fase-01 | pendente |
| 6 skills migradas escrevendo em paths v6: `/lessons-learned`, `/decision-registry`, `/plan-feature`, `/quick-plan`, `/execute-plan`, `/iterate` | Plano 05 fase-01..06 | pendente |
| `lib/compound-decision-gate.ts` (referencia para padrao de helper de gate em TS) | Plano 05 fase-06 | pendente |
| `lib/exec-plan-template.ts` (template 10 secoes D18 — STATE.md fase-03 le secao "Validation Log") | Plano 05 fase-03 | pendente |
| Hook infra: `hooks/hooks.json` registry + `hooks/pre-mutation-gate.cjs` (referencia de hook CJS funcionando) | Plano 05 fase-07 | pendente |
| Fixture `tests/fixtures/v6-with-plan/` (projeto v6 com plano ativo populado) | Plano 05 fase-04 (criada como subproduto) | pendente |
| Tag de frontmatter `pending-capture` em planos (introduzida em Plano 05 fase-06, ambiguity 05-A4) | Plano 05 fase-06 | pendente |
| Frontmatter de compound notes (`title/category/tags/created`) — STATE.md fase-03 lista por `created` recente | Plano 05 fase-01 (CA-14) | pendente |
| Numeracao monotonica de ADRs (`ADR-NNNN-{slug}.md`) — fase-06 daqui calcula proximo numero | Plano 05 fase-02 (CA-15) | pendente |
| `scripts/harness-validate.ts` minimal (rodar apos cada fase para garantir estado valido) | Plano 01 fase-04 + Plano 04 | pendente |
| `js-yaml` ou equivalente (parser YAML) em `package.json` do plugin | repo atual (verificar; se ausente, fase-01 adiciona) | a verificar |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|--------------|
| `lib/completion-signal.ts` (helper que gera bloco YAML padronizado) | Plano 07 fase-03 (skill `/todo-pick` nova emite completion signal), Plano 08 fase-08 (dog-food valida emissao em todas as 6 skills) |
| `lib/state-md-generator.ts` (regenera `docs/STATE.md` lendo filesystem) | Plano 08 fase-03 (dog-food roda generator no proprio plugin) |
| `hooks/state-md-hook.cjs` + registro em `hooks/hooks.json` | Plano 08 fase-08 (verifica que hook funciona dentro do plugin) |
| 6 skills emitindo completion signal — alteracoes em `skills/{lessons-learned,decision-registry,iterate,plan-feature,quick-plan,execute-plan}/SKILL.md` + helpers TS | Plano 08 fase-04..07 (planos historicos migrados serao manipulados via essas skills) |
| `lib/lessons-learned-crud.ts` (`update`, `delete` soft-archive) | Plano 08 fase-05 (dog-food usa para reescrever licoes do plugin) |
| `lib/decision-registry-revoke.ts` (`revoke` com pattern superseded + link bidirecional) | Plano 08 fase-07 (migracao decisions.md pode usar revoke em ADRs obsoletos) |
| `lib/todo-utils.ts` (`skip`, `remove`, `markDone`, `addLine`, `parse`) — helpers agnosticos de skill | Plano 07 fase-02 (skill `/todo-pick` importa estes helpers), Plano 07 fase-04 (`/execute-plan` usa `addLine` para adicionar item out-of-scope a `TODO.md`) |
| Convencao `_archived/` em `docs/compound/` | Plano 08 fase-05 (preservar `_archived/` ao migrar lessons) |
| Frontmatter expandido em compound notes: `updated` + `archived_at` | Plano 04 fase-02 (validator compound-check aceita campos opcionais), Plano 08 fase-05 |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-completion-signal-helper.md | `lib/completion-signal.ts` padroniza bloco YAML (`skill/status/outputs/next_suggested/blocks_for_user`) parseavel via `yaml.parse` (S12) | 1.5h | — (helper isolado) |
| 02 | fase-02-skills-emit-completion-signal.md | 6 skills migradas em Plano 05 invocam o helper e emitem bloco YAML no final do output (CA-47, R16) | 2h | fase-01 |
| 03 | fase-03-state-md-generator.md | `lib/state-md-generator.ts` regenera `docs/STATE.md` com 3 secoes (Resources/Recent Activity/Pending) deterministicamente (M13, CA-45) | 2h | — (independente; usa apenas `lib/path-resolver-v6.ts` de Plano 05) |
| 04 | fase-04-state-md-hook-posttooluse.md | `hooks/state-md-hook.cjs` PostToolUse com rate-limit 30s + filtragem por path; registrado em `hooks/hooks.json` (R15, CA-46) | 2h | fase-03 |
| 05 | fase-05-lessons-learned-crud.md | `/lessons-learned --update {slug}` reescreve compound note preservando `created`; `/lessons-learned --delete {slug}` move para `docs/compound/_archived/` (CA-41, CA-42, R14) | 2h | fase-02 (skill ja emite completion signal — `update/delete` precisam emitir tambem) |
| 06 | fase-06-decision-registry-revoke.md | `/decision-registry --revoke {id}` cria novo ADR-NNNN-superseded com link bidirecional (Supersedes/Superseded-by) — ADR original nao deletado (CA-43, R14) | 1.5h | fase-02 |
| 07 | fase-07-todo-pick-crud.md | `lib/todo-utils.ts` exporta `parse/markDone/addLine/skip/remove` — helpers agnosticos de skill, prontos para Plano 07 consumir (CA-44 helper-only) | 1h | — (independente; nao depende de path-resolver — `TODO.md` mora na raiz) |

**Total:** 12h.

**Decisao de escopo (fase-07):** A skill `/todo-pick` so nasce em Plano 07. Esta fase cria APENAS os helpers TS de CRUD (`lib/todo-utils.ts`) — sem `SKILL.md`, sem registro em `plugin-manifest.json`. Justifica:

1. Preserva sizing original do PLAN.md (~12h, 7 fases).
2. Mantem o helper agnostico — pode ser testado isoladamente sem skill harness around.
3. Plano 07 fase-02 (helper) e fase-03 (skill) consomem o que ja existe, sem retrabalho.
4. Alternativa rejeitada (mover fase-07 inteira para Plano 07) reduziria este plano a 6 fases e quebraria o grafo do PLAN.md.

Ver ambiguity **06-A6** para validacao.

---

## Grafo de Fases

```
                Plano 05 (Skills + Hooks)
                          |
                          v
        fase-01 (completion-signal-helper)
                          |
                          v
        fase-02 (skills-emit-completion-signal)
                |               |
                +---+-----------+
                    |
                    v
            fase-05 (lessons CRUD)    fase-06 (ADR revoke)
                    |                       |
                    +-----------------------+
                                |
                                |    fase-03 (state-md-generator) ────+
                                |              |                       |
                                |              v                       |
                                |    fase-04 (state-md-hook)           |
                                |              |                       |
                                +--------------+-----------------------+
                                               |
                                fase-07 (todo-utils helpers) ← independente
```

**Paralelismo possivel:**
- **fase-01 e fase-03 e fase-07 sao 100% paralelas** — 3 sub-agentes independentes. fase-01 mexe so em `lib/completion-signal.ts`, fase-03 mexe so em `lib/state-md-generator.ts`, fase-07 mexe so em `lib/todo-utils.ts`. Recomendado: lancar simultaneamente.
- **fase-02 serial apos fase-01** (precisa do helper para skills invocarem).
- **fase-04 serial apos fase-03** (hook chama o generator).
- **fase-05 e fase-06 paralelas apos fase-02** (sub-agentes em arquivos disjuntos: `skills/lessons-learned/` vs `skills/decision-registry/`).
- **Recomendacao operacional:** rodar (fase-01, fase-03, fase-07) em paralelo, depois (fase-02 → [fase-05, fase-06]) sequencial e (fase-04) imediatamente apos fase-03. Tempo de relogio: ~5-6h vs 12h serial.

### Decisao de ordem: por que fase-03 (state-md-generator) nao espera fase-02

Generator eh estruturalmente independente das skills — le filesystem (`docs/compound/`, `docs/exec-plans/`, `TODO.md`) e escreve `docs/STATE.md`. Nao chama codigo de skill. Colocar fase-03 paralela com fase-01 permite:

1. Testar generator em fixture v6 sem precisar das skills emitindo completion signal.
2. Hook (fase-04) entra em testes mais cedo (CA-46 valida latencia <500ms — precisa de tempo de uso real).
3. Mitiga R15 (overhead do hook) — ajustar rate-limit/filtragem em paralelo com migracao das skills.

Trade-off: STATE.md gerado em fase-03 inicialmente NAO tem "Recent Activity" populada por completion signal. fase-03 le diretamente o filesystem (mtime de arquivos em `docs/compound/`, `docs/exec-plans/active/`). Quando skills comecam a emitir completion signal (fase-02), generator NAO consome esses signals — eh leitor de estado, nao de eventos. Documentar como decisao de design em fase-03.

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

- **fase-01 (completion-signal-helper)** — RED: chamar `renderCompletionSignal({ skill: 'foo', status: 'complete', outputs: [], blocks_for_user: [] })` e tentar `yaml.parse(extractYamlBlock(result))` — esperar objeto valido. Stub atual retorna string vazia → `yaml.parse` retorna `null` → assertion falha. GREEN: helper retorna template fixo com 3 backticks + `yaml` lang + serializacao via `js-yaml`.
- **fase-02 (skills emit signal)** — RED: para cada uma das 6 skills migradas (`/lessons-learned`, `/decision-registry`, `/iterate`, `/plan-feature`, `/quick-plan`, `/execute-plan`) invocar via fixture v6 e procurar `/```yaml\nskill: {nome}\n/` no stdout — ausente em todas. GREEN: cada skill chama `renderCompletionSignal(...)` apos seu output principal. Teste cobre as 6 (matriz 6x1, nao fixture unica).
- **fase-03 (state-md-generator)** — RED: chamar `regenerateStateMd(projectRoot)` em fixture v6 com 2 compound notes, 1 plano em `active/`, 1 plano em `completed/`, 3 itens em `TODO.md`. Esperar `docs/STATE.md` com:
  - `## Resources` listando contagens (2 compound, 1 active plan, 1 completed plan, 3 TODOs)
  - `## Recent Activity` listando arquivos mais recentes por mtime (top 5 alfabetico para idempotencia em tie)
  - `## Pending` listando planos com tag `pending-capture` + itens TODO `[ ]` nao-skipped
  Helper nao existe → assertion falha. GREEN: implementar lendo `path-resolver-v6.ts` + `fs.readdirSync` + `fs.statSync`.
- **fase-04 (state-md-hook)** — RED: simular dois `PostToolUse(Edit, file=docs/exec-plans/active/foo.md)` consecutivos em 5s. Esperar `docs/STATE.md.mtime` regenerada **apenas 1x** (segunda chamada skip por rate-limit). Hook nao existe → primeira chamada nao regenera → STATE.md inalterado → assertion falha. GREEN: hook le lock `~/.claude/cache/state-md-last-run.json` (TTL 30s), filtra por path (`docs/`, `TODO.md`), chama `regenerateStateMd` async.
- **fase-05 (lessons CRUD)** — RED: em fixture com `docs/compound/2026-05-12-foo.md` (frontmatter `created: 2026-05-12`), chamar `lessonsLearned.update('foo', { body: 'novo body' })`. Esperar:
  - arquivo reescrito com `body` novo
  - `created: 2026-05-12` preservado
  - `updated: 2026-05-13` adicionado ao frontmatter
  Chamar `lessonsLearned.delete('foo')` esperar arquivo em `docs/compound/_archived/2026-05-12-foo.md` (timestamp preservado no nome) e ausente em `docs/compound/`. Metodos nao existem → throw → assertion falha. GREEN: implementar em `lib/lessons-learned-crud.ts`.
- **fase-06 (ADR revoke)** — RED: em fixture com `docs/design-docs/ADR-0003-x.md` (status: active), chamar `decisionRegistry.revoke('ADR-0003', { reason: 'substituido por nova abordagem' })`. Esperar:
  - Novo arquivo `docs/design-docs/ADR-0007-x-superseded.md` criado (numero monotonico)
  - ADR-0007 contem secao "Supersedes: ADR-0003" + razao
  - ADR-0003 ganha frontmatter `status: superseded-by: ADR-0007` (preservando demais campos)
  - ADR-0003 ganha bloco textual "Superseded-by: [ADR-0007](./ADR-0007-x-superseded.md) on 2026-05-13 — substituido por nova abordagem" (link bidirecional)
  Metodo nao existe → assertion falha. GREEN: implementar em `lib/decision-registry-revoke.ts`.
- **fase-07 (todo-utils helpers)** — RED: em fixture com `TODO.md`:
  ```
  - [ ] foo
  - [x] bar
  - [ ] baz
  ```
  chamar `todoUtils.skip(0)` — esperar linha 0 virar `- [-] foo`. Chamar `todoUtils.remove(2)` — esperar arquivo sem linha `baz`. Helpers nao existem → assertion falha. GREEN: parse line-by-line, mutate, rewrite.

**Tracer Bullet deste plano:** fase-02 (CA-47 verbatim — completion signal valido em todas as 6 skills migradas).

---

## Gotchas Conhecidos

- **G1 (D33 completion signal — formato e opcionalidade):** Bloco YAML emitido **no final** do output da skill, delimitado por triple-backtick + `yaml` lang. Campos obrigatorios: `skill` (string), `status` (`complete`/`blocked`/`in_progress`), `outputs` (array de paths absolutos relativos a `projectRoot`), `next_suggested` (string ou null), `blocks_for_user` (array de strings). R16 exige que helper seja **idempotente** (chamar 2x nao duplica bloco) e **opcional** (skill que esquece de chamar nao crashes — orquestrador faz fallback gracioso). Politica: helper retorna **string pura**; skill decide quando concatenar. Helper NAO faz `console.log` automatico — emite valor para skill controlar.

- **G2 (D33 compatibilidade com skills migradas):** As 6 skills migradas em Plano 05 ja tem fluxo de retorno proprio. Adicao do completion signal eh **append** ao output final — nao substitui texto existente. Para skills interativas (`/iterate`, `/plan-feature`): emitir signal apenas no exit final (depois de Compound Gate, depois de validacao de Exit Criteria). Para skills batch (`/lessons-learned add`): emitir imediatamente apos write. Documentar em cada skill o ponto de emissao via comentario `// 2026-05-11 (Luiz/dev): completion signal emitido aqui — fim do fluxo da skill (D33)`.

- **G3 (D32 STATE.md hook — rate-limit 30s):** Hook `PostToolUse` dispara muito (Edit, Write, Bash, etc.). Sem rate-limit, regenerar STATE.md em cada edicao explode CPU. Politica em fase-04: lock file `~/.claude/cache/state-md-last-run.json` com `{ timestamp_ms, project_root }`. Se `Date.now() - timestamp_ms < 30000` E `project_root` bate, hook retorna imediato (`{ success: true, skipped: true }`). Senao regenera + atualiza lock. R15 mitigado. **Cuidado:** lock eh **por projeto** (chave = `path.resolve(projectRoot)`) — projetos paralelos nao se bloqueiam.

- **G4 (D32 STATE.md hook — filtragem por path):** Hook so dispara `regenerateStateMd` se path do tool call bate com patterns relevantes:
  1. `docs/compound/**` (lesson nova/editada)
  2. `docs/design-docs/ADR-*.md` (ADR novo/revogado)
  3. `docs/exec-plans/active/**` ou `docs/exec-plans/completed/**` (plano mudou de status)
  4. `TODO.md` na raiz do projeto
  
  Outras edicoes (codigo fonte, configs, testes) **NAO** disparam regeneracao. Implementacao: regex match em `tool_input.file_path` antes de checar rate-limit. R15 mitigado a fundo.

- **G5 (D32 STATE.md hook — PostToolUse no Claude Code, nao Bash):** Hook escuta `PostToolUse` da Claude Code (Edit/Write/MultiEdit do agente), nao chamadas Bash diretas. Se usuario editar `docs/compound/foo.md` via VSCode sem invocar Claude, STATE.md fica desatualizado. Politica: aceitar staleness — usuario pode rodar manualmente `bun run state:regenerate` (script em `package.json` que invoca `lib/state-md-generator.ts`). Documentar em CHANGELOG (Plano 09) e `docs/STATE.md` (header tem timestamp da ultima regeneracao).

- **G6 (D31 lessons soft-delete — git como rede de seguranca dupla):** `lessonsLearned.delete('foo')` move arquivo para `docs/compound/_archived/{original-name}.md` (preserva data no nome). NAO faz `git rm` nem commit automatico. Usuario decide quando comitar. CA-42 valida via `git checkout HEAD~1` que recupera. Politica: helper adiciona frontmatter campo `archived_at: {date}` ao arquivo movido. Para "undelete": user move manualmente de `_archived/` de volta. Sem comando `--undelete` em v6.0.0 (Could Have v6.1+).

- **G7 (D31 ADR revoke — link bidirecional formato):** ADR original NAO eh deletado. Recebe:
  1. Frontmatter atualizado: `status: superseded-by: ADR-{NNNN}` (preservando demais campos)
  2. Bloco textual no topo do corpo (apos frontmatter, antes da primeira `##`): `> **Superseded-by:** [ADR-NNNN](./ADR-NNNN-{slug}-superseded.md) on {YYYY-MM-DD} — {reason}`
  
  ADR novo (-superseded.md) recebe:
  1. Frontmatter: `supersedes: ADR-{NNNN-orig}` + `status: active`
  2. Bloco textual no topo: `> **Supersedes:** [ADR-NNNN-orig](./ADR-NNNN-orig-{slug}.md)`
  3. Corpo gerado por template — usuario edita razao detalhada antes de comitar.
  
  Numero do novo ADR: monotonico apos leitura de `docs/design-docs/` (max + 1). Mesmo helper usado em Plano 05 fase-02.

- **G8 (D31 TODO skip vs remove):** `skip` muda `- [ ] foo` para `- [-] foo` — preserva historia, validador de planos pode contar skipped vs done vs pending. `remove` deleta a linha inteira — usuario perde a memoria do item. Politica em fase-07: helper `remove(lineIndex)` NAO pede confirmacao (eh helper agnostico de UX). A confirmacao interativa fica na skill `/todo-pick` em Plano 07 fase-03. Documentar no JSDoc do helper que skill consumidora **deve** confirmar antes de chamar `remove`.

- **G9 (cross-platform paths — herdado de Plano 05 G8):** Todos os helpers TS usam `path.join` e `path.resolve`. Hook em `.cjs` (Node CJS) usa `require('path').join(require('os').homedir(), '.claude', 'cache', 'state-md-last-run.json')`. Nenhuma string hardcoded com `/` ou `\`. Lock file em formato JSON UTF-8.

- **G10 (frontmatter parsing — `gray-matter` ou alternativa):** Skills v5 ja parseiam frontmatter — verificar em Plano 05 qual lib eh usada. Se `gray-matter`, manter consistente. Se parser proprio, fase-05 e fase-06 reusam. **Politica:** nao introduzir nova dep neste plano. Usar mesmo parser do Plano 05. Se nada estiver disponivel, fase-01 (que ja precisa de `js-yaml`) introduz `gray-matter` como dep adicional — documentar em commit de fase-01.

- **G11 (`pending-capture` reconhecimento em STATE.md):** Em Plano 05 fase-06 (ambiguity 05-A4), planos com Compound Gate respondido como "Pensar mais" recebem tag `pending-capture` no frontmatter. STATE.md (fase-03 daqui) lista estes planos na secao **Pending** com format:
  ```
  - **{plan-slug}** ({date}) — pending compound capture
  ```
  Generator deve ler frontmatter de todos os arquivos em `docs/exec-plans/active/` e filtrar por presenca de `pending-capture`. Documentar como decisao de design em fase-03.

- **G12 (provenance comments):** Toda linha TS gerada neste plano leva `// 2026-05-11 (Luiz/dev): why...`. Templates `.md` emitidos pelas skills (compound notes, ADRs, STATE.md, frontmatter) **nao** levam provenance — sao output usuario. Hook `state-md-hook.cjs` (CJS) leva `// 2026-05-11 (Luiz/dev): ...` mesmo sendo `.cjs` (herdado de Plano 05 G10).

- **G13 (R16 — fallback gracioso para skills sem completion signal):** O helper de fase-01 eh padronizador, nao validador. Skills antigas ou skills que esquecam de chamar `renderCompletionSignal` simplesmente nao emitem o bloco — orquestrador (parent agent que consome o stdout) deve detectar ausencia e cair em heuristica antiga (status textual). Politica: NAO criar validador que rejeita skill sem signal. PRD R16 mitigacao verbatim: "migracao gradual das 32 skills". Apenas as 6 migradas em Plano 05 emitem em v6.0.0.

- **G14 (idempotencia de fase-01 helper):** Chamar `renderCompletionSignal` 2x na mesma skill produz **2 blocos**. Helper nao detecta duplicacao — eh responsabilidade da skill chamar exatamente 1x ao fim. Sem teste de idempotencia. Skills que tem multiplos exit points (`/iterate` por exemplo, com 3 ramos do Compound Gate) devem ter signal emitido **no merge point** antes do exit final.

- **G15 (STATE.md.mtime check em testes E2E):** Teste de rate-limit (fase-04) compara `fs.statSync(stateMdPath).mtime` antes e depois das duas chamadas em 5s. Cuidado com clock skew em Windows (mtime pode ter resolucao de 2s em FAT32 — nao deveria ocorrer em NTFS, mas documentar). Politica em fase-04: usar `fs.utimesSync` ou ler `lock.timestamp_ms` direto (mais estavel que filesystem mtime).

### Ambiguidades sinalizadas (decisao assumida — validar antes de executar)

- **06-A1 (lock file location):** Lock do hook em `~/.claude/cache/state-md-last-run.json` ou `{projectRoot}/.claude/cache/state-md-last-run.json`? **Decisao assumida em fase-04:** `~/.claude/cache/state-md-last-run.json` (homedir) **com chave por projectRoot** dentro do JSON. Justifica: hook em Claude Code roda contra varios projetos numa sessao do usuario; lock global com chave evita lock-file-per-project. Se PRD/usuario preferir `.claude/cache/` no proprio projeto, mudar mas perde robustez se `.claude/` nao existe.

- **06-A2 (formato YAML do completion signal — multiline strings?):** PRD CA-47 mostra exemplo simples:
  ```yaml
  skill: grill-me
  status: complete
  outputs:
    - ./.planning/.../CONTEXT.md
  next_suggested: /write-prd
  blocks_for_user: []
  ```
  **Decisao assumida em fase-01:** strings simples, sem multiline (`|` ou `>`). `blocks_for_user` eh array de strings curtas (max 80 chars cada). Se skill quiser emitir descricao longa, truncar para 80 chars e remeter para output principal. Justifica: machine-parseability — orquestrador nao quer parsing complexo. Se PRD prefere multiline para diagnostico rico, alterar.

- **06-A3 (STATE.md — Recent Activity criterio de "recente"):** **Decisao assumida em fase-03:** top 5 arquivos por `fs.statSync().mtime` em todas as 4 fontes (`docs/compound/`, `docs/design-docs/`, `docs/exec-plans/active/`, `docs/exec-plans/completed/`), agregados. Em caso de tie de mtime (frequente em test fixtures), desempate por path alfabetico **decrescente** (ultimo path alfabetico ganha — estavel cross-platform). Se PRD prefere lista por data de `created` no frontmatter (mais semantico), trocar — mas custa parse de N arquivos toda regeneracao. Custo benefica: mtime eh O(1) por arquivo via `statSync`.

- **06-A4 (filtragem de path no hook — TODO.md):** Hook filtra `TODO.md` na raiz do projeto. **Decisao assumida em fase-04:** match exato em `path.basename(tool_input.file_path) === 'TODO.md'` (case-sensitive). Se projeto tiver `todo.md` minusculo, NAO dispara. Se PRD prefere case-insensitive, trocar para `.toLowerCase()`. Plano 07 cria `TODO.md` capitalizado (CA-31), entao por enquanto OK.

- **06-A5 (ADR superseded — slug do novo ADR):** Quando revogar `ADR-0003-foo.md`, o novo ADR vira `ADR-NNNN-foo-superseded.md` ou `ADR-NNNN-{novo-slug-do-usuario}.md`? **Decisao assumida em fase-06:** `ADR-NNNN-{original-slug}-superseded.md` (sufixo `-superseded` para sinalizar relacao). Justifica: traceability via filename. Se usuario quer slug livre para descrever a nova decisao que substitui, mudar para prompt interativo em `/decision-registry --revoke` (skill, nao helper) — mas helper de fase-06 expoe `revoke(id, { newSlug?, reason })` permitindo override.

- **06-A6 (escopo de fase-07 — apenas helpers):** Decisao explicitada acima na secao Mapa de Fases — `lib/todo-utils.ts` criado aqui, skill `/todo-pick` nasce em Plano 07. **Validar:** alternativa eh mover fase-07 inteira para Plano 07 e este plano fica com 6 fases (~11h). Recomendo manter como esta (helper aqui, skill no proximo plano) — preserva PLAN.md e sizing.

- **06-A7 (fase-02 — completion signal em modo `--update`/`--delete`/`--revoke` das skills):** Quando fase-05/06 estende skills com novos comandos, esses comandos tambem emitem completion signal? **Decisao assumida em fase-05/06:** Sim — toda invocacao de skill emite signal, independente do sub-comando. `outputs` reflete o que mudou (path do arquivo updated/archived/superseded). `next_suggested` pode ser null para CRUD ops.

- **06-A8 (`docs/compound/_archived/` aparece em STATE.md Resources?):** STATE.md secao Resources conta compound notes — inclui `_archived/`? **Decisao assumida em fase-03:** NAO. Resources reflete estado **ativo**. Arquivados aparecem na secao Recent Activity APENAS quando recem-arquivados (mtime recente). Se PRD prefere contagem separada (ex: "Active: 12 / Archived: 3"), expandir formato.

- **06-A9 (estensao parsing YAML — frontmatter de planos com tag `pending-capture`):** Plano 05 fase-06 introduz `pending-capture` no frontmatter de planos. **Decisao assumida em fase-03 daqui:** generator parsa frontmatter de **todos** arquivos em `docs/exec-plans/active/` para detectar a tag. Se parsing falha em algum arquivo (frontmatter malformado), skip silencioso com warning em `console.warn` — nao crashes generator. Performance: 100 planos x parse YAML = ~100ms; aceitavel.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

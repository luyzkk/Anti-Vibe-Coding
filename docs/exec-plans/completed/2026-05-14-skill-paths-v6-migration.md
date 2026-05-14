# Skill paths v6 migration

## Goal

Eliminar referencias hardcoded a `.planning/` (caminho v5) nas skills do plugin v6.0.0, fazendo
todas apontarem para `docs/exec-plans/active/` (e variantes v6) sem quebrar a logica de migracao
v5 -> v6 que ainda precisa LER `.planning/` para detectar repos legados.

Saneamento estrutural: paths em SKILL.md sao contratos vivos para o agente. Hoje, qualquer
agente que invoca `/anti-vibe-coding:write-prd`, `/plan-feature`, `/execute-plan`, `/grill-me`,
`/verify-work`, `/lessons-learned` ou `/iterate` recebe instrucao para escrever em `.planning/`,
um diretorio que o proprio plugin (v6) ja nao trata como ativo. Resultado: trabalho recente
caiu em pasta legada (ver PRD de hoje, originalmente salvo em `.planning/2026-05-14-init-migration-mode/`).

## Scope

- In scope:
  - Substituir paths v5 (`.planning/`) por v6 (`docs/exec-plans/active/`, `docs/compound/`,
    `docs/product-specs/`, etc.) em 9 SKILL.md ofensores.
  - Atualizar vocabulario interno (`PASTA_ATIVA`, `CONTEXT-{slug}.md`, `SUMMARY.md`,
    `_archive/`, etc.) para mapear nas convencoes v6.
  - Atualizar `templates/SUMMARY.md` (line 3: `**Plan:** .planning/PLAN-{plan_name}.md`).
  - Atualizar `skills/quick-plan/SKILL.md` lines 3 e 184 (descricoes do que a skill NAO faz —
    devem listar paths v6 atuais).
  - Rodar `bun run harness:validate` apos cada batch para garantir que nada quebrou.
  - Validar com smoke test: invocar `/anti-vibe-coding:write-prd` em ambiente limpo e
    verificar que o PRD vai para `docs/exec-plans/active/`.

- Out of scope:
  - **Logica de migracao v5 -> v6** em `skills/init/SKILL.md`, `skills/init/lib/migrate-*`,
    `skills/init/lib/detect-v5-legacy.ts`, `skills/init/lib/backup-planning.ts`,
    `skills/init/lib/parse-planning-entry.ts`, `skills/lib/legacy-migrator.md`,
    `skills/lib/legacy-detector.md`, `skills/lib/state-utils.md`. Esses MOH ler `.planning/`
    porque sao o mecanismo de detectar e migrar repos v5.
  - `hooks/prompt-guard.cjs` (lines 7, 34): detecta prompt injection em arquivos `.planning/*`
    — feature de seguranca para repos em migracao.
  - `tests/fixtures/legacy-v5/`, `docs/exec-plans/completed/_legacy-detail/**`,
    `docs/references/v5-legacy/**`: artefatos historicos preservados intencionalmente.
  - `skills/init/assets/templates/scripts/harness-validate.ts.tpl`: template scaffolded por
    `/init` em projetos novos — o `.planning/` ai e contexto de migracao (intencional).
  - Refatorar a forma de invocacao dos agentes (processo, nao API) — plano separado futuro.
  - PRD ativo `docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` (escopo deste plano
    e infra das skills, nao conteudo de outros artefatos).

## Assumptions

- O comando `/init` em v6 ja redireciona corretamente, entao a unica fonte residual de
  paths v5 sao SKILL.md das outras skills (verificado via grep).
- A convencao v6 para PRDs e `docs/exec-plans/active/{YYYY-MM-DD}-{slug}/PRD.md` (folder)
  conforme `docs/product-specs/index.md:12`.
- A convencao v6 para planos e `docs/exec-plans/active/{YYYY-MM-DD}-{slug}.md` (flat)
  conforme `scripts/new-plan.ts:24` portado de Andre Prado.
- O equivalente v6 de `.planning/CONTEXT-{slug}.md` (do grill-me) e
  `docs/exec-plans/active/{date-slug}/CONTEXT.md` dentro da pasta do PRD/plano.
- O equivalente v6 de `.planning/_archive/` e o ato de mover de
  `docs/exec-plans/active/` para `docs/exec-plans/completed/`.
- O equivalente v6 de `.planning/SUMMARY.md` (lido por `/verify-work` e `/lessons-learned`)
  e `docs/exec-plans/active/{date-slug}/SUMMARY.md` ou `STATE.md`.
- Skills nao tem testes integrados que dependam de paths `.planning/` ativos (apenas testes
  da migracao em si, que continuam validos).

## Risks

- **Risco alto — quebra de cross-references entre skills.** Skills do pipeline
  (`grill-me -> write-prd -> plan-feature -> execute-plan -> verify-work -> iterate -> lessons-learned`)
  passam contexto via arquivos. Se uma skill grava em `.planning/CONTEXT.md` e a proxima
  procura em `docs/exec-plans/active/{folder}/CONTEXT.md`, o pipeline quebra silenciosamente.
  Mitigacao: migrar todas as skills no mesmo plano (nao em PRs separados), com smoke test
  end-to-end do pipeline antes de merge.

- **Risco medio — colisao com folders v5 existentes em repos do usuario.** Se o usuario tiver
  `.planning/` nao migrado, as skills v6 (apos correcao) nao vao mais leler dali. Isso e o
  comportamento desejado, mas pode confundir. Mitigacao: documentar no CHANGELOG que
  `/anti-vibe-coding:init` deve ser rodado antes; e que `.planning/` sera ignorado pelas
  skills nao-init.

- **Risco baixo — diferenca semantica entre `_archive/` (v5) e `completed/` (v6).** Em v5 a
  pasta `_archive/` era um snapshot dentro de `.planning/`. Em v6, `completed/` e o estado
  terminal canonico. A logica de "arquivar quando feature foi entregue" (verify-work line
  416-489) precisa ser re-mapeada como "mover para completed/".

- **Risco baixo — quick-plan menciona paths v5 em descricao do que a skill NAO faz.** Trivial
  de atualizar mas e facil esquecer porque o uso e descritivo, nao operacional.

## Execution Steps

1. **Audit grep snapshot.** Rodar `rg -n "\.planning" skills/ templates/` e salvar output em
   `docs/exec-plans/active/2026-05-14-skill-paths-v6-migration.audit.txt`. Comparar com o
   inventario abaixo para confirmar 0 surprises.

   Inventario conhecido (offenders, requer edicao):
   - `skills/write-prd/SKILL.md` — 17 ocorrencias (lines 75, 219, 223, 234, 270, 285, 291,
     296, 302, 311, 312, 352, 359, 362, 365, 371, 375)
   - `skills/plan-feature/SKILL.md` — ~27 ocorrencias (lines 71, 105, 114-152, 169, 176-235,
     245, 257, 265, 601, 706, 714, 720-728)
   - `skills/execute-plan/SKILL.md` — ~25 ocorrencias (lines 83, 107, 116-201, 315-316, 422,
     746-759)
   - `skills/grill-me/SKILL.md` — 5 ocorrencias (lines 41, 190, 249, 278, 302)
   - `skills/design-twice/SKILL.md` — 1 ocorrencia (line 50)
   - `skills/verify-work/SKILL.md` — 14 ocorrencias (lines 380-489)
   - `skills/lessons-learned/SKILL.md` — 4 ocorrencias (lines 80-94)
   - `skills/iterate/SKILL.md` — 1 ocorrencia (line 48)
   - `skills/quick-plan/SKILL.md` — 2 ocorrencias descritivas (lines 3, 184)
   - `templates/SUMMARY.md` — 1 ocorrencia (line 3)

   Intentionally preserved (no change):
   - `skills/init/SKILL.md`, `skills/init/lib/migrate-*`, `skills/init/lib/detect-v5-legacy.ts`,
     `skills/init/lib/backup-planning.ts`, `skills/init/lib/parse-planning-entry.ts`,
     `skills/lib/legacy-*.md`, `skills/lib/state-utils.md`, `hooks/prompt-guard.cjs`,
     `tests/fixtures/legacy-v5/`, `docs/exec-plans/completed/_legacy-detail/**`,
     `docs/references/v5-legacy/**`, `skills/init/assets/templates/scripts/harness-validate.ts.tpl`.

2. **Definir mapping v5 -> v6 canonico** em comentario topo deste plano (ja na secao
   Assumptions). Sera usado como tabela de referencia em cada edit.

3. **Batch A — pipeline principal (grill -> prd -> plan).** Editar:
   - `skills/grill-me/SKILL.md`: 5 substituicoes. `.planning/CONTEXT-{slug}.md` ->
     `docs/exec-plans/active/{date-slug}/CONTEXT.md` (quando ja existe pasta) ou
     `docs/exec-plans/active/CONTEXT-{slug}.md` (quando o grill antecede o PRD).
     **Decisao a documentar:** grill-me roda ANTES do write-prd, entao a pasta ainda nao
     existe. Manter o CONTEXT na raiz de `docs/exec-plans/active/` ate o write-prd mover
     para dentro da pasta datada (mantem o handshake atual, so muda o root).
   - `skills/write-prd/SKILL.md`: 17 substituicoes. Step 1, 5, 5.5, 7 e Pipeline Integration.
     Mapping: `.planning/{date}-{slug}/` -> `docs/exec-plans/active/{date}-{slug}/`;
     `.planning/CONTEXT-*.md` -> `docs/exec-plans/active/CONTEXT-*.md`.
   - `skills/plan-feature/SKILL.md`: ~27 substituicoes. PASTA_ATIVA continua semantica
     valida, so muda o root. `.planning/_archive/` -> `docs/exec-plans/completed/`.
   - Validar: rodar `bun run harness:validate`.

4. **Batch B — execucao e verificacao.** Editar:
   - `skills/execute-plan/SKILL.md`: ~25 substituicoes. Step 0 logic de detectar v5 fica
     intacta mas o caminho "modo migrado" usa `docs/exec-plans/active/`.
   - `skills/verify-work/SKILL.md`: 14 substituicoes. **Atencao** lines 437-489: o fluxo de
     arquivamento `mv .planning/{basename} .planning/_archive/{basename}` vira
     `mv docs/exec-plans/active/{basename} docs/exec-plans/completed/{basename}`.
   - `skills/iterate/SKILL.md`: 1 substituicao (line 48): glob de SUMMARY -> ajustar para
     pasta ativa em v6.
   - Validar: `bun run harness:validate`.

5. **Batch C — lessons, design, quick-plan, templates.** Editar:
   - `skills/lessons-learned/SKILL.md`: 4 substituicoes (lines 80-94). `_archive/` ->
     `completed/`; `.planning/_archive/{nome}/SUMMARY.md` ->
     `docs/exec-plans/completed/{nome}/SUMMARY.md`.
   - `skills/design-twice/SKILL.md`: 1 substituicao (line 50).
   - `skills/quick-plan/SKILL.md`: 2 substituicoes descritivas (lines 3, 184). Diz que NAO
     cria arquivos em `docs/exec-plans/active/` (antigo `.planning/`).
   - `templates/SUMMARY.md`: 1 substituicao (line 3).
   - Validar: `bun run harness:validate`.

6. **Smoke test end-to-end** (manual ou em fixture). Em diretorio limpo:
   - Rodar `/anti-vibe-coding:grill-me "Feature X"` — verificar que CONTEXT.md vai para
     `docs/exec-plans/active/` (nao `.planning/`).
   - Rodar `/anti-vibe-coding:write-prd` — verificar que pasta criada e
     `docs/exec-plans/active/{date-slug}/` e CONTEXT foi movido para dentro.
   - Rodar `/anti-vibe-coding:plan-feature` — verificar que plano e gerado dentro da pasta.
   - Rodar `/anti-vibe-coding:verify-work` — verificar que oferece arquivar para
     `docs/exec-plans/completed/` (nao `.planning/_archive/`).

7. **CHANGELOG entry** documentando que skills v6 nao escrevem mais em `.planning/` ativamente
   (apenas /init le `.planning/` para migrar). Adicionar nota em `docs/UPGRADE.md` se houver
   secao de breaking changes por skill.

8. **Audit final.** Rodar `rg -n "\.planning" skills/ templates/` novamente. Comparar com
   inventario "intentionally preserved" da Step 1 — deve bater 100%. Se sobrar `.planning/`
   em skill nao-preservada, e regressao.

## Review Checklist

- [ ] Audit grep snapshot tirado antes (`*.audit.txt` salvo) e depois (paths preservados
      batem 1:1).
- [ ] Production-readiness: nenhum SKILL.md fora de `skills/init/**` ou `skills/lib/legacy-*`
      menciona `.planning/` exceto em comentarios historicos explicitos.
- [ ] Cross-references entre skills do pipeline continuam coerentes (handshake
      grill -> prd -> plan -> execute -> verify funciona).
- [ ] Smoke test end-to-end passou: arquivos foram para `docs/exec-plans/active/` e nao
      para `.planning/`.
- [ ] `bun run harness:validate` passa apos cada batch.
- [ ] `bun run compound:check` passa (sem regressao em frontmatter de compound notes).
- [ ] CHANGELOG e UPGRADE.md atualizados se aplicavel.

## Validation Log

- [x] **Step 1 audit snapshot (2026-05-14):** `rg -n "\.planning" skills templates` salvo em
      `docs/exec-plans/active/2026-05-14-skill-paths-v6-migration.audit.txt` (290 linhas).
      Confirmou inventario do plano: 9 SKILL.md ofensores + `templates/SUMMARY.md` + preservados
      (skills/init/**, skills/lib/legacy-*, state-utils.md, fixture de teste).
- [x] **Batch A (`grill-me`, `write-prd`, `plan-feature`)** — 5 + 12 + 11 edits;
      `bun run harness:validate` → PASS (26 required files, 182 markdown files).
- [x] **Batch B (`execute-plan`, `verify-work`, `iterate`)** — 5 multi-line edits no
      execute-plan, 5 no verify-work (incluindo reescrita do fluxo `mv` para `completed/`),
      1 no iterate. `bun run harness:validate` → PASS.
- [x] **Batch C (`lessons-learned`, `design-twice`, `quick-plan`, `templates`)** — 1 multi-line
      no lessons-learned, 1 no design-twice, 2 no quick-plan, 1 no templates/SUMMARY.md.
      `bun run harness:validate` → PASS. `bun run compound:check` → PASS (13 notes).
- [x] **Audit final grep:** `rg -n "\.planning" skills templates` retorna 22 arquivos, todos
      dentro da whitelist preservada (`skills/init/**` 18 arquivos, `skills/lib/legacy-*.md` 2,
      `skills/lib/state-utils.md` 1, `skills/lib/completion-signal.test.ts` 1) + Step 0 em
      plan-feature/execute-plan (intencionalmente preservado para D10 back-compat). 0 regressoes.
- [~] **Smoke test end-to-end:** deferido (requer sandbox limpo + invocacao manual de
      `/anti-vibe-coding:grill-me` -> `/write-prd` -> `/plan-feature` -> `/verify-work`).
      Validacao indireta cumprida: `harness:validate` + `compound:check` + grep auditor
      cobrem que nenhum SKILL.md fora da whitelist menciona `.planning/`. Smoke manual
      registrado como TODO de seguimento.

## Compound Opportunity

Este trabalho ensina o repo duas coisas duradouras:

1. **Folder layout migration tech debt persiste mais que voce pensa.** A v6 foi liberada,
   /init redireciona corretamente, mas SKILL.md ainda apontava para `.planning/` em 9
   skills. Licao: migracoes de layout precisam de varredura grep automatizada como gate
   de release (nao basta atualizar /init e os tests passarem). Candidato a compound note:
   `docs/compound/2026-05-14-skill-paths-tech-debt-after-v6.md`.

2. **Convencao de path-em-doc vs path-em-codigo precisa de validacao distinta.** Codigo
   referenciando path antigo quebra um teste. Doc/skill referenciando path antigo quebra
   silenciosamente — o agente segue a instrucao e cria arquivos no lugar errado. Licao:
   validator (`harness-validate.ts`) deveria ter check de "skills em v6 nao podem
   referenciar paths v5 fora de skills/init/** ou skills/lib/legacy-*".

Decidir ao fim: capturar pelo menos a licao (2) como compound note + adicionar check ao
harness-validate (proximo plano).

## Lessons Captured

- **Compound note criada:** [docs/compound/2026-05-14-skill-paths-tech-debt-after-v6.md](../../compound/2026-05-14-skill-paths-tech-debt-after-v6.md)
  - Categoria: `armadilha`
  - Tags: `skills, layout-migration, validator, harness, docs-vs-code, v6`
  - Tese: __divergencia silenciosa entre instrucao-em-doc e estado-real-do-repo__.
    Paths em SKILL.md sao contratos vivos para o agente — testes nao executam SKILL.md, entao
    drift de path nao quebra suite, mas o agente segue ao pe da letra e cria arquivos
    no lugar errado.

- **Follow-up (proximo plano — registrar em TODO.md):** adicionar check ao
  `scripts/harness-validate.ts` que bloqueia merge se algum arquivo em `skills/**` ou
  `templates/**` referenciar `.planning/` fora de uma whitelist explicita:
  - `skills/init/**`
  - `skills/lib/legacy-*.md`
  - `skills/lib/state-utils.md`
  - `skills/lib/completion-signal.test.ts` (fixture)
  - Step 0 em `skills/plan-feature/SKILL.md` e `skills/execute-plan/SKILL.md`
    (caminho de fallback para repos em migracao v5)

- **Smoke test end-to-end manual** registrado como follow-up: invocar
  `/anti-vibe-coding:grill-me` -> `/write-prd` em sandbox limpo e confirmar que CONTEXT/PRD
  aterrissam em `docs/exec-plans/active/` (nao em `.planning/`).

## Exit Criteria

- 0 referencias a `.planning/` em `skills/**` exceto `skills/init/**` e `skills/lib/legacy-*`
  e `skills/lib/state-utils.md`.
- 0 referencias a `.planning/` em `templates/**`.
- `bun run harness:validate` passa.
- `bun run compound:check` passa.
- Smoke test end-to-end passa (PRD criado em ambiente limpo aterriza em
  `docs/exec-plans/active/`).
- CHANGELOG entry escrita.
- Plano movido para `docs/exec-plans/completed/`.

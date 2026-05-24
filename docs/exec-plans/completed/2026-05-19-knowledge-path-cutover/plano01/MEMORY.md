# Memoria: Plano 01 — Cutover Foundation + Distribuicao

**Feature:** Knowledge Path Cutover (docs/knowledge → knowledge/)
**Iniciado:** 2026-05-20
**Concluido:** 2026-05-20
**Status:** completed (6/6 fases)

---

## Decisoes Pre-Execucao (resolvidas 2026-05-20)

Resolucoes dos gotchas detectados durante geracao das fases. Ja confirmadas — nao precisam re-investigacao pelo executor.

- **DP-1 (fase-05): `AbortError` constructor signature confirmada**
  - Lido: `skills/init/lib/steps/abort-error.ts:17-31`.
  - Assinatura: `new AbortError({ code: number, reason: string })`. Codigos ja em uso: `1=needs-migration`, `2=conflict`.
  - **Decisao:** fase-05 usa `code: 1` (semanticamente "needs sync — re-rodar sync-to-global.sh para popular matrix"). Mensagem deve mencionar a stack faltante e o comando de remediacao.
  - Snippet pronto: `throw new AbortError({ code: 1, reason: \`Matrix '\${primary}' nao existe em knowledge/\${primary}/. Re-rode scripts/sync-to-global.sh para atualizar o cache global.\` })`

- **DP-2 (fase-06): path real de copy-knowledge.test.ts**
  - Lido: `Glob "**/copy-knowledge.test.ts"`.
  - **Localizacao:** `skills/init/lib/copy-knowledge.test.ts` (alongside, NAO em `__tests__/`).

- **DP-3 (fase-02): linha exata do fallback `'6.5.1'` em run-init.ts**
  - Lido: `Grep "6\.5\.1" skills/init/lib/run-init.ts` → match em `linha 32: return '6.5.1'`.
  - **Edit alvo:** linha 32, substituir literal `'6.5.1'` → `'6.6.0'`. Sem ambiguidade.

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** Linhas das mensagens em copy-knowledge.ts shiftaram apos insercao do comentario provenance
  - Por que: o snippet "Depois" da fase-01 incluiu 2 linhas de comentario antes da declaracao de `knowledgeBase`
  - Impacto: as referencias a "linhas 53 e 76" no PRD/plano (mensagens com `docs/knowledge/`) viraram **linhas 68 e 78** apos a fase-01. Fase-03 deve editar as linhas 68 e 78, NAO 53/76. A linha do defense-in-depth check (era 62) virou linha 64. Re-verificar com grep antes de editar.
- **DI-2 (fase-01):** `git log --follow` retorna vazio enquanto rename esta staged mas nao commitado
  - Por que: comportamento documentado do git — `--follow` segue history via blob match e precisa de commit que registre o rename
  - Impacto: CA-02 deve ser verificado APOS commit (foi o caso). Subagente seguiu rigorosamente.

- **DI-3 (fase-02):** `marketplace.json` nao tinha campo `version` top-level — adicionado para satisfazer teste
  - Por que: o teste de fase-02 le `pkg['version']` no root do JSON. Marketplace.json apenas tinha `plugins[].version`. Foi necessario adicionar `"version": "6.6.0"` na raiz.
  - Impacto: estrutura do marketplace.json mudou. Verificar se algum consumer le `plugins[0].version` em vez do top-level — provavelmente nao, mas anotar.

- **DI-4 (fase-02):** Regressao detectada e corrigida em todo-pick.test.ts
  - Por que: o teste assercia que `plugin-manifest.json skills["todo-pick"].version === package.json.version`. Bump do package.json sem bump do entry causou falha imediata.
  - Impacto: entry `todo-pick` em plugin-manifest.json atualizado para 6.6.0. Os 393 outros entries de skills ficaram em 6.5.1 (semantica de last-modified-version por-skill, nao versao do plugin). Plano 02 ou outros podem precisar bumpar entries especificos quando tocarem skills.

- **DI-5 (fase-03):** Fixtures de copy-knowledge.test.ts referenciavam `docs/knowledge/` — corrigidos junto com mensagens
  - Por que: fixtures montavam estrutura de pastas com `docs/knowledge/{stack}/` para testar copy. Apos fase-01 (path mudou para `knowledge/`), os fixtures ficaram quebrados.
  - Impacto: 4 locations de fixture corrigidas. Os testes voltaram verde. Esses fixtures NAO sao escopo da fase-06 (que toca outros 7 arquivos de teste, nao copy-knowledge.test.ts).

- **DI-6 (fase-03):** state-md-init.ts linha 22 mantida com referencia historica a `docs/knowledge/ → knowledge/`
  - Por que: comentario de provenance documentando a migracao. Nao eh referencia stale, eh historia.
  - Impacto: grep `docs/knowledge` em state-md-init.ts retorna 1 linha (esperado). Verifier nao precisa flaggar.

- **GT-1 (fase-02 → fase-06):** `stack-knowledge-full-e2e.test.ts` e `stack-knowledge-rails-full.test.ts` ainda quebrados
  - Descoberto em: fase-02 (rodou bun run test e viu falhas)
  - Impacto: esses arquivos referenciam `docs/knowledge/` em fixtures e sao escopo direto da fase-06. Documentado em PRD §Dependencias.

- **DI-7 (fase-04):** Cache global mutation evitada — CA-04 e CA-16 validados via smoke test (`tests/smoke/sync-validation.sh`)
  - Por que: modificar o cache global real cria side-effects irreversiveis e poderia quebrar o ambiente do dev em paralelo
  - Impacto: o smoke test simula o cenario de stack ausente em pasta temporaria. A validacao do loop bash e cobertura suficiente. Cache real foi consultado apenas para CA-03 (read-only `ls`).

- **DI-8 (fase-05):** Caller `03_1-persist-stack-and-knowledge.ts` nao precisou modificacao
  - Por que: nao tem try/catch em torno de `copyKnowledge()` — AbortError propaga naturalmente para o runner
  - Impacto: ZERO codigo defensivo adicionado. Modificacao seria codigo morto. Documentado no spec da fase como "skipped" via tasks_skipped.

- **DI-9 (fase-05):** Teste pre-existente CA-03 mutou para CA-10
  - Por que: o teste `'returns status=no-source when matrix folder for primary does not exist'` testava EXATAMENTE o caso que mudou (no-source → AbortError)
  - Impacto: o teste foi atualizado in-place (assert mudou de `result.status === 'no-source'` para `rejects.toThrow(AbortError)`). Alem disso, um describe CA-10 dedicado foi adicionado conforme spec.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 6 |
| Fases com desvio | 1 |
| Bugs encontrados | 2 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 02) PRECISA saber antes de comecar.
O subagente do Plano 02 le este campo.

### Estado final pos-Plano 01 (input para Plano 02)

- **Path:** `knowledge/` na raiz do plugin distribuida via sync-to-global.sh com check bloqueante para AMBAS stacks (nodejs-typescript E rails). `docs/knowledge/` nao existe mais no plugin (CA-01 verificado).
- **copy-knowledge.ts:** linha 60 aponta para `path.resolve(pluginRoot, 'knowledge')`. Mensagens de erro atualizadas. Branch `sourceExists === false` com `primary !== null` agora throw `AbortError({code:1, reason})`. CA-13 (path traversal) preservado retornando `{status: 'no-source'}` para `VALID_PRIMARY` fail.
- **03_1-persist-stack-and-knowledge.ts:** NAO modificado — nao tem try/catch em torno de copyKnowledge, AbortError propaga naturalmente. Plano 02 fase-01 vai adicionar logica de `refresh: ctx.flags['__reentryMode'] === 're-populate'` neste arquivo.
- **Bump:** 6.6.0 propagado em 8 arquivos (7 originais + plugin-manifest.json skills.todo-pick.version fix). Constante `KNOWLEDGE_PATH_CUTOVER_VERSION = '6.6.0'` inline em `00_2-reentry-guard.ts`. Threshold mudou de '6.5.0' para essa constante.
- **Reentry-guard semantica:** projetos com manifest 6.5.0/6.5.1 agora entram em `re-populate` (`compareSemver = -1`). Projetos em 6.6.0+ -> AbortError (ja na versao atual). Esse e o caminho que Plano 02 fase-01 exercita (CA-06).
- **Validators:** APENAS `harness-validate.ts` (standalone) foi atualizado (MH-05/CA-15). O segundo validador `skills/init/lib/steps/90-final-validation.ts` (runtime) NAO foi tocado — escopo de Plano 02 fase-03 (SH-04, CA-11, CA-12).
- **Step novo:** Plano 02 fase-02 deve criar `skills/init/lib/steps/13_1-migrate-knowledge-path.ts` e registrar entre `migrate4DecisionsStep` e `scaffoldFullTreeStep` no registry. AR-03 confirma numbering.
- **Fixtures:** 9 test files apontam para `knowledge/` corretamente. `migrate-claude-artifacts.ts:12` (e .test.ts) preservados intactos — `docs/knowledge/legacy-claude-knowledge/` representa target-side, NAO plugin-side.
- **Smoke test:** `tests/smoke/sync-validation.sh` valida bash do post-sync check. Smoke test runs.
- **CHANGELOG.md:** 2 broken markdown links corrigidos (docs/knowledge/* → knowledge/*) em fase-06 — necessario para harness:validate passar.

### Decisoes resolvidas que Plano 02 pode citar

- DI-3 (DI-3, fase-02): marketplace.json ganhou campo `version` top-level (antes so plugins[].version). Estrutura alterada.
- DI-4 (fase-02): plugin-manifest.json `skills.todo-pick.version` precisa bump quando package.json bumpa (regression test). Outros 393 entries de skills nao precisam de bump (semantica last-modified-per-skill).
- DI-7 (fase-04): cache global mutation evitada — smoke test eh suficiente para validar bash logic.
- DI-8 (fase-05): caller `03_1-persist-stack-and-knowledge.ts` SEM try/catch — AbortError propaga naturalmente. Plano 02 fase-01 deve apenas adicionar o `refresh` flag, nao mexer em error handling.
- DI-9 (fase-05): teste CA-03 original `'returns status=no-source when matrix folder for primary does not exist'` mutou para CA-10 (AbortError). Documentado.
- DI-10 (fase-06): M2.6 em `run-stack-knowledge-init.test.ts` foi atualizado para AbortError semantics — era falha pre-existente da fase-05 nao detectada.

### Falhas pre-existentes (NAO regressoes deste plano)

- `lazy-import.test.ts`: erros TS pre-existentes (MEMORY.md raiz GT-01)
- `subagent-contract.ts`: erros TS pre-existentes (MEMORY.md raiz GT-01)
- `init-cutover-greenfield.test.ts`: 2 testes com `test.skip` pre-existentes (MEMORY.md raiz)
- `ca13-dry-run-parity.test.ts`: `describe.skip` pre-existente (MEMORY.md raiz)

---

<!-- Atualizado automaticamente durante execucao -->

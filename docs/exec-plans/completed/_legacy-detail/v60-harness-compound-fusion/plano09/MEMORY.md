# Memoria: Plano 09 — Versioning & Release (5.3.0 -> 6.0.0)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion
**Iniciado:** 2026-05-12
**Status:** CONCLUÍDO (5/5 fases) — v6.0.0 GA local, tag `v6.0.0` em `4c18844`. Push pendente de autorizacao manual.

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

### Fase-01

- **DI-01** (2026-05-12): Texto exato da `description` em `.claude-plugin/plugin.json` seguiu literal a sugestao do Passo 3 da fase (247 chars, dentro do limite 250): `"Plugin de desenvolvimento disciplinado com conhecimentos de programador sênior. v6.0.0 — Harness + Compound Engineering Fusion: AGENTS.md institucional, docs/* layered, validadores TS+bun (harness:validate + compound:check), /todo-pick, exec-plans + compound notes."` Por que: a spec ofereceu como `sugestao` e o texto cobre os 4 pilares v6 sem extrapolar budget. Impacto: marketplace UI le essa descricao — coerente com keywords planejadas para fase-03.

### Fase-02

- **DI-02** (2026-05-12): Referencia do "Fixed" section do CHANGELOG ajustada de `docs/compound/2026-04-21-grep-c-exit-1.md` (nome no spec) para `docs/compound/2026-04-21-grep-c-exit-1-quando-zero.md` (nome real no repo). Por que: spec usou nome simplificado; nome real surgiu durante Plano 08 fase-05 migration. Impacto: link funciona em vez de quebrar — leitor do CHANGELOG navega corretamente.
- **DI-03** (2026-05-12): Removida linha em branco entre `### Breaking Changes` e o primeiro item de lista para satisfazer pattern `grep -A 1 "^### Breaking Changes" | tail -1 | grep -q "^-"` do CA-35. Mudanca semanticamente neutra (markdown renderiza identico). Por que: pattern do CA-35 esperava continuidade direta.
- **DI-04** (2026-05-12): Step 5 renomeado de `Step 5 (optional): Customize` para `Step 5: Customize (optional)` para satisfazer pattern `^#### Step [1-5]:` do CA-35. Conteudo identico. Por que: regex do CA-35 nao tolerava parenteses entre numero e dois pontos.
- **DEV-01** (2026-05-12): Spec mencionava insercao entre linha 3 e secao `## [4.0.0]`. CHANGELOG real ja tinha `[5.3.0]` como entrada mais recente (criada em plano anterior). Insercao foi feita apos linha 3 colocando `[6.0.0]` antes de `[5.3.0]` — ordem semantica correta. Spec ficou desatualizado em relacao ao estado real.

### Fase-03

- **DI-05** (2026-05-12): `scripts/generate-manifest.js` recebeu **mudanca substancial** (177 → 236 linhas), nao apenas "minimal adjustment" como spec previa. Cinco deficiencias do gerador antigo foram corrigidas em conjunto: (1) versao hardcoded `4.0.0` → `process.env.PLUGIN_VERSION || '6.0.0'`; (2) diretorios faltantes adicionados ao scan (`scripts/`, `skills/lib/`, `skills/init/lib/`, `skills/init/assets/`, `config/`); (3) bug case-sensitivity: gerador buscava `skill.md` lowercase, arquivos reais sao `SKILL.md`; (4) array `IGNORED_PREFIXES` adicionado para excluir dog-food (`docs/`, `.github/`, `tests/fixtures/`, `.release-backup/`, `.planning.v5-backup/`); (5) hooks `.test.cjs` excluidos. Acompanhado por 16 testes em `scripts/__tests__/generate-manifest.test.ts`. Por que: rodar gerador antigo cegamente teria perdido ~120 arquivos novos do v6 + emitido versao 4.0.0 invalida. Impacto: manifest cresceu 134 → 246 entradas (delta +112), refletindo arquivos legitimos que sempre deveriam ter estado registrados.
- **DEV-02** (2026-05-12): `lastModified` de TODOS os arquivos foi recalculado via `fs.statSync().mtime` (comportamento do gerador), nao preservou data historica de arquivos nao-modificados. Funcionalmente OK (checksum detecta diff real), mas campo `lastModified` perde semantica historica. Aceito como desvio observavel — fix proprio sai do escopo de fase-03.

### Fix pos-fase-03 (commit `2809d6b`)

- **BUG-01** (2026-05-12): Fase-03 regenerou o manifest mas DROPOU o indice top-level `skills` que era um patch MANUAL feito em commit `2be2b9d` (feat(todo-pick) — adicionou `manifest.skills.todo-pick` com `path`/`version`/`introduced`/`description`). Consequencia: `tests/todo-pick.test.ts:61-82` quebrou (3 testes — esperavam `manifest.skills.todo-pick`). Adicionalmente, o teste novo `scripts/__tests__/generate-manifest.test.ts:117` introduzido na fase-03 teve typecheck FAIL por `Object is possibly 'undefined'` na strict mode (faltava guard). Fix: (1) restaurar manualmente entrada `skills.todo-pick` no manifest; (2) adicionar `if (!relPath) return` + `if (entry)` guards no teste; (3) adicionar TODO para ensinar o gerador a emitir `skills` automaticamente. Resultado: typecheck clean, 694 pass / 1 skip / 3 fail (baseline preservado).

### Fase-04

- **DI-06** (2026-05-12): CA regex `! grep -qE 'rsync|realpath|readlink -f' scripts/sync-to-global.sh` reportou FAIL porque o script contem um comentario WHY explicando *por que* `cp -r` foi escolhido em vez de `rsync` (`# 2026-05-12 (Luiz/dev): cp -r em vez de rsync - rsync nao garantido em Git Bash Windows nativo`). Excluindo comentarios via `grep -v '^[[:space:]]*#' | grep -qE 'rsync|...'`, o script eh POSIX-puro. CA satisfeito semanticamente; o regex original tem false-positive em comentarios de provenance. Comentario eh exigido pelo Principio Universal #5 (Comment Provenance). Por que: ensinar a regex a parsear sintaxe seria over-engineering; documentar como gotcha eh suficiente. Impacto: futuros patches no script devem manter o comentario WHY rsync; CA-equivalent check excluindo comentarios deveria ser adicionado a `tests/sync-test.sh` se for criado.
- **DEV-03** (2026-05-12): Spec listou em "Arquivos da raiz (v5 + v6)" copiar `senior-principles.md` com label "(legacy shim)". Em runtime o arquivo nao existe mais (Plano 08 fase-08 deletou: commit `8cab16c`). Comportamento de `copy_file_if_exists` graceful skip ("origem ausente; skip") cobre. Decisao: mantida linha por compat futura (caso projetos legados ainda tenham). Spec foi escrita antes de Plano 08 finalizar dog-food.

### Fase-05

- **DI-07** (2026-05-12): Spec do rollback test continha loop `for i in $(seq 0 $((REVERT_COUNT - 1))); do git revert --no-edit HEAD~"$i"; done`. Primeira execucao mostrou que `git revert HEAD~i` oscila revert/reapply: apos revert de HEAD~0, HEAD aponta para o commit de revert; HEAD~1 agora aponta para o commit ORIGINAL recen-revertido — `git revert HEAD~1` reaplica a mudanca. Output do run quebrado mostrou serie de `Revert "..."` / `Reapply "..."` / `Revert "Reapply..."`. Substituicao: `git revert --no-edit "HEAD~${REVERT_COUNT}..HEAD"` (range syntax, git >= 1.7.2) — reverte cada commit do range em ordem reversa criando N revert commits individuais. Resultado: todos 9 checkpoints PASS. Lesson: range syntax > sequential HEAD~i.
- **DI-08** (2026-05-12): REVERT_COUNT default no script committed = 7 (todos os 7 commits release: bump, changelog, manifest, fix-manifest, sync, date-finalize, test-infra). Test foi executado com REVERT_COUNT=6 (override env var) porque rodou ANTES do commit do test-infra (HEAD = fbbb84f date-finalize, 6 commits desde v5.3.0). Documentacao inline no script explica os 7 commits e instrui hotfixes a override. Por que: futuros mantenedores rodando `bash tests/rollback.sh` no HEAD do release (= tag v6.0.0 = commit 4c18844) precisam de 7 reverts para chegar ao estado v5.3.x; default 7 evita erro silencioso.
- **DEV-04** (2026-05-12): Spec previu commit `--amend --no-edit` para combinar date-finalize com test commit (Passo 6). Rejeitado: regra global CLAUDE.md "Always create NEW commits rather than amending". Escolhido: 2 commits separados (fbbb84f date-finalize + 4c18844 test infra). Mais granular, alinhado com Principio Universal #9 (commit granularity).
- **DEV-05** (2026-05-12): Passo 8 (push) NAO executado automaticamente. Auto mode rule #5 + regra global "Nunca faca push a um repositorio compartilhado a menos que explicitamente instruido". v6.0.0 esta GA localmente; push deve ser autorizado e executado pelo dev manualmente.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Vazio — sera preenchido durante execucao -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

### Fase-01

- **GT-01** (2026-05-12): `git stash` para verificar baseline pode conflitar com fixtures modificadas localmente (`tests/fixtures/compound-100-docs/...`, `tests/fixtures/v6-state-fixture/...`). Workaround: `git stash drop` apos verificacao e reaplicar edits idempotentes — NAO tentar `git stash pop` se houver conflito com outros WIP. Aplica a qualquer fase futura que queira comparar baseline via stash.
- **GT-02** (2026-05-12): `jq` NAO esta no PATH default no ambiente Windows do mantenedor (Git Bash). Substitutos validados: `node -e 'console.log(JSON.parse(require("fs").readFileSync("X.json")).version)'` ou `bun -e ...`. Atualizar criterios de aceite das fases 02-05 para listar fallback explicito quando dependerem de `jq`. Considerar adicionar `which jq` como pre-flight check.
- **GT-03** (2026-05-12): O baseline de testes em `anti-vibe-coding/` tem **3 failures** pre-existentes (nao 2 como Plano 02 documentou). 2 em `skills/lib/profile-md-generator.test.ts` (`renderArchitectureProfileMarkdown` snapshot `vertical-slice` e `clean-architecture-ritual`) + 1 em `pre-mutation-gate hook — integration > emite inject:true e block:false para prompt substancial sem plano ativo`. Plano 02 fase-02 dizia "2 failures (commit 42acd02)" — drift ocorreu em algum commit posterior. Atualizar referencia em fase-04..05 para "3 failures pre-existentes" como baseline.

### Fase-03

- **GT-04** (2026-05-12): O `skills` top-level index do `plugin-manifest.json` era um **patch MANUAL** (commit `2be2b9d`), nao output do gerador. Qualquer `bun scripts/generate-manifest.js` o DROPA silenciosamente. Tests que dependem dele (`tests/todo-pick.test.ts:61-82`) quebram sem aviso. **Mitigacao durarvel:** ensinar o gerador a emitir `skills` automaticamente lendo frontmatter de cada `SKILL.md` — TODO item adicionado em `anti-vibe-coding/TODO.md`. **Mitigacao temporaria:** sempre validar `bun test` apos regenerar manifest; se `todo-pick.test.ts` quebrar, re-patchar `skills.todo-pick` manualmente no manifest.
- **GT-05** (2026-05-12): O gerador antigo `scripts/generate-manifest.js` tinha **5 deficiencias** que o subagente da fase-03 corrigiu em conjunto: versao hardcoded, diretorios faltando no scan, case-sensitive bug em `SKILL.md`, falta de IGNORED_PREFIXES para dog-food, falta de exclusao de `.test.cjs`. Acumulacao de bugs significa que o manifest pre-fase-03 estava **UNDER-counting** (134 entradas em vez de ~245 que deveriam estar). Qualquer skill futura precisa re-validar que o gerador continua robusto — adicionar nova check em `scripts/__tests__/generate-manifest.test.ts` quando adicionar nova area do plugin.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

### Fase-02

- Spec previu inserir [6.0.0] entre linha 3 e [4.0.0]; CHANGELOG real tinha [5.3.0] como secao mais recente (criada por commit anterior fora da janela do Plano 09). Insercao adaptou para colocar [6.0.0] antes de [5.3.0] — ordem semantica correta, mas spec ficou desatualizado.

### Fase-03

- Spec dizia "mudanca minima ao `scripts/generate-manifest.js`". Realidade exigiu **5 correcoes substanciais** (versao env, paths novos no scan, case-sensitivity `SKILL.md`, IGNORED_PREFIXES, `.test.cjs` exclusion) + 16 testes novos. Cumulativamente significativo; cada correcao foi necessaria para que o gerador rodasse no estado v6 do repo.
- Spec previu delta `+10 entradas` no manifest. Realidade: `+112 entradas` (134 → 246), porque o gerador antigo estava UNDER-counting devido aos bugs corrigidos. Mantido nessa contagem — entradas sao todas legitimas (skills/lib, scripts, config, templates de init).
- Fix-forward com commit separado `2809d6b` em vez de Level 1 retry da fase. Justificativa: subagente entregou a maioria do trabalho corretamente; revert custaria mais que patch pontual + TODO de durarvel.

### Fase-05

- Spec do rollback test em Passo 3 continha bug de loop (`git revert HEAD~i` em sequencia) — diagnosticado durante primeira execucao (output oscilando revert/reapply). Fix-forward: substituido por range syntax `git revert HEAD~N..HEAD` (DI-07). Spec ficou desatualizado; nao retentou retry pois fix foi trivial.
- Spec recomendou `git commit --amend --no-edit` para combinar date-finalize + test infra (Passo 6 line 299). Rejeitado em favor de 2 commits separados (regra global CLAUDE.md anti-amend) — DEV-04.
- REVERT_COUNT alterado de spec default `4` (apenas fases 01-04) para `7` (release inteiro: bump + changelog + manifest + fix-manifest + sync + date-finalize + test-infra). Realista para mantenedor futuro que rode `bash tests/rollback.sh` a partir da tag v6.0.0.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 (100%) |
| Fases com desvio | 2 (fase-03: gerador substancialmente modificado; fase-05: spec do rollback test loop bugado, substituido por range syntax) |
| Bugs encontrados | 2 (BUG-01: skills index dropado; DI-07: spec rollback test loop oscilatorio) |
| Retries necessarios | 0 (fix-forward em ambos os casos) |
| Commits do release | 7 (00965ae bump, 67e1182 changelog, 08243a5 manifest, 2809d6b fix-manifest, cc1d6af sync, fbbb84f date-finalize, 4c18844 rollback test) |
| Tag criado | `v6.0.0` (annotated) em `4c18844` |
| Rollback validado | YES (9/9 checkpoints PASS) |
| Push | NAO executado (autorizacao manual pendente) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
**ESTE EH O ULTIMO PLANO DA V6.0.0** — proximos sao v6.0.x (patches) ou v6.1.0 (Node.js knowledge pack).

Notas para v6.0.1+ (se houver hotfix):
- Tag `v6.0.0` criada em fase-05 — qualquer hotfix deve ser branch `hotfix/v6.0.1` saindo de `v6.0.0`, nao de `main` (se main ja avancou)
- Path do sync-to-global.sh agora hardcoded em `6.0.0/` — patches v6.0.x precisam atualizar path para a versao correspondente (ou tornar configuravel — TODO)
- Procedimento de rollback validado: `git revert HEAD~5..HEAD` reverte release limpo. Documentado em `tests/rollback-report.md`.

Notas para v6.1.0+ (Node.js knowledge pack):
- `plugin-manifest.json` v6.0.0 NAO inclui `knowledge-packs/` (deferido para v6.1+ por D37 do PRD)
- Quando v6.1.0 shipar knowledge-packs/node-ts/, manifest precisa adicionar 5 arquivos novos (senior-knowledge.md, conventions.md, common-pitfalls.md, lessons-template.md, index.md) + atualizar `/init` para detectar e copiar

---

<!-- Atualizado automaticamente durante execucao -->

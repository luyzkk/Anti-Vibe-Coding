# Memoria: Plano 07 — TODO.md + /todo-pick

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion
**Iniciado:** 2026-05-12
**Status:** concluido

---

## Decisoes de Implementacao

- **DI-01 (fase-01):** `TEMPLATE_MANIFEST` ja incluia `TODO.md.tpl → TODO.md` e `scaffoldFullTree` ja criava o arquivo. `scaffold-todo-md.ts` criado como camada adicional idempotente para uso em projetos legados ou init parcial — sem modificar o manifest para suportar `idempotent` field (tipo nao tem esse campo).
- **DI-02 (fase-01):** Idempotencia implementada diretamente no helper `scaffold-todo-md.ts` (retorna `'created' | 'skipped'`). Backward compat preservado.
- **DI-03 (fase-02):** `pickNext` recebe `strategy: PickStrategy = 'oldest'` mas so tem um branch — parametro tipado para extensao futura (07-A8). Sem lint error usando `void` internamente.
- **DI-04 (fase-02):** `parseClassifier` retorna `null` para prefixos desconhecidos (nao throw). `parseLine` eh leniente — linha valida mesmo sem classifier.
- **DI-05 (fase-02):** `scoreByPriority` usa `Date.UTC()` explicitamente (nao `new Date(dateStr)`) para determinismo cross-platform — evita off-by-one de fuso.
- **DI-06 (fase-03):** "Regras por classifier" movidas para bloco `typescript` no SKILL.md — licao do CLAUDE.md ("instrucoes executaveis pertencem a blocos de codigo").
- **DI-07 (fase-03):** `plugin-manifest.json` nao tinha campo `skills` — adicionado como top-level key provisoria entre `description` e `files`. Plano 09 fase-03 valida e limpa.
- **DI-08 (fase-04):** Bloco "Captura Out-of-Scope" inserido entre Step 5 (Validacao Pos-Fase) e Step 6 (Transicao entre Planos) do SKILL.md de `/execute-plan`.

---

## Bugs Descobertos

- **BUG-01 (fase-04):** `captureToTodoMd` chamava `addLine(path, fullLine)` mas `addLine` ja prepende `- [ ]` ao argumento — resultado seria `- [ ] - [ ] {date} {cls} desc`.
  - Causa: spec dizia `addLine(todoMdPath, line)` onde `line` = output de `formatTodoLine` (linha completa), mas `addLine` foi projetado para aceitar apenas o `description` (texto puro).
  - Fix: `captureToTodoMd` bypassa `addLine` e escreve via `fs.writeFileSync` diretamente. Adicionado teste de regressao explícito.
  - Fase afetada: fase-04

---

## Gotchas

- **GT-01 (fase-01):** TDD gate usa `process.cwd()` da sessao Claude Code (`f:\Projetos\Claude code`), nao do submodule. Arquivo co-localizado `scaffold-todo-md.test.ts` necessario para satisfazer a busca "sameDir" do hook.
- **GT-02 (fase-01):** Arquivos da fase-01 foram bundlados no commit `8ec7c09` junto com o bugfix da fase-04 (staging simultaneo). Confirma lição do CLAUDE.md e GT do Plano 03 — sempre `git diff --staged` antes de commit em sessoes com subagentes paralelos.
- **GT-03 (fase-02):** `match.groups['key']` requer `match.groups !== undefined` + `?? fallback` para `noUncheckedIndexedAccess`. Pattern: `const g = match.groups; if (!g) return null; const val = g['key'] ?? ''`.
- **GT-04 (fase-03):** Apos `remove(lineIndex)`, items subsequentes sofrem shift de lineIndex. Testes que buscam por `lineIndex` especifico apos `remove` devem buscar por `description` em vez disso.
- **GT-05 (fase-04 typecheck):** `bun run typecheck` reportou 3 erros sobre `scaffold-todo-md` nao encontrado ANTES do commit da fase-01. Confirmado pre-existente — resolvido automaticamente apos commit `8ec7c09` que incluiu o arquivo.

---

## Desvios do Plano

- **DEV-01 (fase-01):** Nao foi adicionado `idempotent: true` ao `template-manifest.ts` (tipo nao suporta). Idempotencia implementada no helper `scaffold-todo-md.ts` — abordagem mais limpa e isolada.
- **DEV-02 (fase-03):** Tests usam helpers diretamente (`parseLine`, `markDone`, `skip`, `remove`) em vez de `runSkill` — esse helper nao existe com a API descrita na spec (interativo scripted). Abordagem mais robusta e deterministica.
- **DEV-03 (fase-04):** E2E test com `simulateOutOfScope` nao implementado — `runSkill` nao suporta essa API. Apenas unit tests do formatter (5 testes) + 2 testes de `captureToTodoMd`.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 3 |
| Bugs encontrados | 1 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

**Para Plano 08 (Dog-Fooding):**

- `skills/todo-pick/SKILL.md` criada — skill funcional para dog-food em Plano 08 fase-04.
- `plugin-manifest.json` tem `skills.todo-pick` provisorio — Plano 09 fase-03 valida.
- `skills/lib/todo-utils.ts` agora exporta: `parse`, `markDone`, `addLine`, `skip`, `remove` (baseline Plano 06) + `parseLine`, `listPending`, `filterByStatus`, `pickNext`, `scoreByPriority`, `ParsedLine`, `TodoState`, `TodoClassifier`, `PickStrategy` (novos Plano 07).
- `skills/lib/execute-plan-todo-capture.ts` exporta `formatTodoLine`, `captureToTodoMd` — helper CA-33.
- `skills/init/lib/scaffold-todo-md.ts` exporta `scaffoldTodoMd(projectRoot, pluginRoot)` — retorna `'created' | 'skipped'` (idempotente).
- **GT-04 critico:** Apos `remove(lineIndex)`, outros items MUDAM de lineIndex — re-parse sempre antes de operar em indexes diferentes.
- **BUG-01 (resolvido):** `captureToTodoMd` nao usa `addLine` (adicionaria `- [ ]` duplo) — escreve diretamente via `fs`. Qualquer integrador que tentar chamar `addLine` com output de `formatTodoLine` tem o mesmo bug.
- **`runSkill` nao tem API interativa** — testes de skills markdown-only devem usar helpers TS diretamente.
- Heuristica out-of-scope em `/execute-plan` depende de campo `Scope` no frontmatter (template D18 Plano 05 fase-03). Confirmar formato antes de Plano 08.

---

<!-- Atualizado automaticamente durante execucao -->

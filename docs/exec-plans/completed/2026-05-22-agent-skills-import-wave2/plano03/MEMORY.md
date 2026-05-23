# Memoria: Plano 03 — Skills Novas (source-driven, doubt-driven, git-workflow)

**Feature:** Agent-Skills Import — Wave 2
**Iniciado:** 2026-05-23
**Status:** concluido

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.

- **DI-Plano03-fase01-no-lint-script:** Projeto NAO tem script `lint` em `package.json`. Plan-executor substituiu `bun run lint` por `bun run typecheck` (`tsc --noEmit`) como validacao alternativa, que passou sem erros.
  - Por que: spec da fase exigia `bun run lint` verde mas o script nao existe.
  - Impacto: documentado aqui; Plano 04 e waves futuras devem usar `bun run typecheck` ate decidir se adicionar script `lint` ao package.json.

- **DI-Plano03-fase01-tools-allowlist-webfetch:** `allowed-tools: Read, Grep, Glob, WebFetch` adicionado a `source-driven-development`.
  - Por que: SDD precisa fetch de docs oficiais (Step 2 — Fetch Official Documentation). Sem WebFetch a skill nao cumpre seu mecanismo central.
  - Impacto: documentado no frontmatter; usuario sabe o que a skill consome.

- **DI-Plano03-fase02-tools-allowlist-task:** `allowed-tools: Read, Grep, Glob, Task` adicionado a `doubt-driven-development`.
  - Por que: Step 3 (DOUBT) requer spawn de fresh-context reviewer via subagente. `Task` (Agent) e o tool canonico.
  - Impacto: documentado; sem Task a skill nao consegue executar seu loop adversarial.

- **DI-Plano03-fase03-bun-adaptation:** Pre-Commit Hygiene em `git-workflow-and-versioning` adaptada para `bun test` / `bun run lint` / `bun run typecheck` como primario, com `npm test` / `npm run lint` / `npx tsc --noEmit` mantidos como alternativas comentadas.
  - Por que: CLAUDE.md global diz "Sempre use bun em vez de npm". Manter `npm` como exemplo agnostico cumpre paridade com a fonte sem divergir do projeto.
  - Impacto: alinhamento com guideline global; melhoria valida sob G1 (copy-then-improve permite enriquecer, nao reduzir).

- **DI-Plano03-fase04-bun-vs-node-cjs:** `scripts/generate-manifest.js` usa `require()` (CJS) mas `package.json` tem `"type": "module"`. `node` rejeita com `ReferenceError: require is not defined`. Solucao: rodar via `bun run scripts/generate-manifest.js` (bun suporta CJS mesmo sob `type:module`).
  - Por que: incompatibilidade pre-existente do script, exposta nesta fase.
  - Impacto: Plano 04 fase-02 (que tambem regera manifest) DEVE usar `bun run` e nao `node`. Em waves futuras, considerar renomear `generate-manifest.js` para `.cjs` ou portar para ESM.

- **DI-Plano03-fase01-corpo-em-ingles:** Corpo tecnico das 3 skills preservado 100% em ingles, apenas `description` no frontmatter em PT-BR.
  - Por que: G6 do README — traducao agressiva do corpo destroi precisao tecnica (CLAIM, EXTRACT, DOUBT, UNVERIFIED, conventional commits etc sao termos da industria). Padrao seguido por `code-simplification` (corpo majoritariamente em ingles).
  - Impacto: leitor BR encontra orientacao no frontmatter; pratica tecnica permanece consistente com fontes upstream.

---

## Bugs Descobertos

Nenhum bug funcional descoberto durante esta fase. Apenas DIs e GTs pre-existentes (abaixo).

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.

- **GT-1 pre-existente:** `harness-validate.test.ts` tem 6 FAILs em testes v6-path-whitelist. Confirmados pre-existentes via `git stash` (presentes antes desta fase, nao introduzidos). Nao bloqueiam — registrar e seguir.
  - Descoberto em: fase-01 (durante validacao); confirmado nas 3 fases.
  - Impacto: aceitar como noise ate alguma fase futura abordar. NAO usar `bun run test` como gate de cores binarias.

- **GT-2 pre-existente Windows:** `bun run test` falha com "Linha de comando muito longa" no Windows quando enumera muitos arquivos. Workaround usado na fase-04: `bun test tests/e2e/` (subset) — 84/84 pass.
  - Descoberto em: fase-04.
  - Impacto: documentar comando alternativo em README do projeto ou na propria skill `git-workflow-and-versioning`. Considerar split do test command no package.json.

- **GT-3 pre-existente:** Script `lint` NAO existe em `package.json`. `bun run lint` retorna erro. Substituto valido: `bun run typecheck` (`tsc --noEmit`).
  - Descoberto em: fase-01.
  - Impacto: revisar specs futuras que pedirem `lint` — adaptar para `typecheck`. Decidir se vale adicionar `lint` ao package.json (escopo separado).

- **GT-4 (CJS sob type:module):** Scripts `.js` em `scripts/` que usam `require()` precisam ser executados via `bun run` (NAO `node`) porque `package.json` define `"type": "module"`. Aplicavel a `generate-manifest.js` confirmado.
  - Descoberto em: fase-04.
  - Impacto: padronizar uso de `bun run` para scripts. Em audit futuro: identificar scripts afetados e considerar migracao para `.cjs` ou ESM.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.

- **DEV-1 (fase-01/03):** spec mencionava `bun run lint` como passo de validacao final, mas o projeto nao tem esse script. Substituido por `bun run typecheck` em todas as 3 fases de port (01/02/03).
  - Aprovado conceitualmente pelo orchestrador (GT-3 documentado).

- **DEV-2 (fase-04):** spec mencionava `node scripts/generate-manifest.js`, mas precisou ser `bun run scripts/generate-manifest.js` por incompatibilidade CJS vs `type:module` (DI-Plano03-fase04-bun-vs-node-cjs).
  - Documentado como DI; nao um desvio de escopo, apenas de comando.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 2 (DEV-1 lint->typecheck, DEV-2 node->bun run) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

### Linhas adicionadas

| Skill | Linhas finais | Fonte | Delta |
|-------|---------------|-------|-------|
| source-driven-development | 227 | 194 | +33 (frontmatter + telemetria + Differs from + Local references block) |
| doubt-driven-development | 267 | 243 | +24 (frontmatter + telemetria + Differs from) |
| git-workflow-and-versioning | 380 | 300 | +80 (frontmatter + telemetria + Differs from + Antipattern block + Appendix hook opt-in + bun adaptation) |

### Commits gerados

| Fase | Commit | Mensagem |
|------|--------|----------|
| 01 | 1e2c2d2 | feat(skills): portar source-driven-development de agent-skills-main |
| 02 | 89dd712 | feat(skills): portar doubt-driven-development de agent-skills-main |
| 03 | 63d85f7 | feat(skills): portar git-workflow-and-versioning de agent-skills-main |
| 04 | 980705f | chore(plugin): regenerar manifest com 3 skills novas — Plano 03 fase-04 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 04) PRECISA saber antes de comecar.

- **3 skills novas em disco e indexadas:**
  - `skills/source-driven-development/SKILL.md` (checksum no manifest: `7b9aa234a35e...`)
  - `skills/doubt-driven-development/SKILL.md` (checksum: `ed28f7229942...`)
  - `skills/git-workflow-and-versioning/SKILL.md` (checksum: `b9b9da8e0169...`)
- **Manifest:** `plugin-manifest.json` foi regenerado uma vez nesta wave (commit `980705f`). Plano 04 fase-01 vai modificar `skills/decision-registry/SKILL.md` (pedagogia ADR) — o checksum dessa skill MUDA. Plano 04 fase-02 deve regerar o manifest novamente (idempotente, sem conflito).
- **CRITICO Plano 04 fase-02:** USAR `bun run scripts/generate-manifest.js` (NAO `node scripts/generate-manifest.js`). Razao: DI-Plano03-fase04-bun-vs-node-cjs — script usa CJS sob `type:module`. Setar `PLUGIN_VERSION=7.1.0` antes (PowerShell: `$env:PLUGIN_VERSION='7.1.0'; bun run scripts/generate-manifest.js`).
- **Validacao alternativa:** projeto NAO tem `bun run lint`. Substituir por `bun run typecheck` quando uma spec pedir lint.
- **GT pre-existentes (NAO bloqueiam):**
  - 6 FAILs em `harness-validate.test.ts` v6-path-whitelist (confirmados pre-fase via git stash).
  - `bun run test` falha em Windows com "Linha de comando muito longa". Workaround: `bun test tests/e2e/` ou subsets especificos.
- **Pre-existencias do Plano 02 ainda valendo (do MEMORY do Plano 02):**
  - BUG-1: `agents/design-explorer.md` ficou com `kind: "audit"` mas deveria ser `kind: "proposal"`. Plano 04 deve corrigir.
  - DI seções legado: `plan-executor` (`## Output ao Concluir`) e `plan-verifier` (`## Output (JSON estruturado)`) tem secoes legado em formato antigo. Plano 04 deve verificar se sao deletaveis.
  - Encerrar modo transitional: `scripts/harness-validate.ts CONTRACT_VERSION_TOKENS` ainda aceita `"1.0"` e `"2.0.0"`. Plano 04 deve remover `"1.0"`.
- **Plugin version:** permanece `7.1.0` no `plugin.json`. Sem bump nesta wave (decisao para final da Wave 2 se aplicar).
- **plugin.json NAO foi tocado:** continua sem campo `skills` (descoberta automatica via filesystem). Manifest sozinho cumpre SH-05.

---

<!-- Atualizado pelo orchestrador apos plano03 fase-04 (2026-05-23) -->

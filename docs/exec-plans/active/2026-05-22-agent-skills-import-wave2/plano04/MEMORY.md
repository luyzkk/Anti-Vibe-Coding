# Memoria: Plano 04 — Pedagogia ADR + Validacao Final

**Feature:** Agent-Skills Import — Wave 2
**Iniciado:** 2026-05-23
**Status:** completed (2026-05-23)

---

## Decisoes de Implementacao

- **DI-1 (fase-01):** Lifecycle de ADR renderizado como codeblock indentado (4 espacos) em vez de fence triplo aninhado dentro de secao `##`.
  - Por que: alternativa preventiva do Passo 3 do plano para evitar conflito com parser markdown do harness:validate. Fence aninhado funcionaria, mas indentado eh mais seguro e equivalente em renderizacao.
  - Impacto: rendering visual identico; parser do harness:validate aceitou sem warning.

- **DI-2 (fase-01):** Ancora cirurgica do Edit usou 3 linhas (subtitulo do H1 + linha vazia + `## Comandos`) para garantir unicidade absoluta.
  - Por que: `## Comandos` aparece apenas 1x no arquivo, mas o Edit tool falha silenciosamente em ambiguidade de whitespace. Contexto de 3 linhas elimina risco.
  - Impacto: Edit aplicado com sucesso na primeira tentativa.

- **DI-3 (fase-02):** Script `generate-manifest.js` deve rodar com `PLUGIN_VERSION=7.1.0 bun run scripts/generate-manifest.js` (nao `node`).
  - Por que: heranca direta de DI-Plano03-fase04-bun-vs-node-cjs — `package.json` tem `type:module`, script eh CJS via `require()`. `node` falha; `bun run` funciona.
  - Impacto: registrar no doc oficial do generate-manifest.js como gotcha permanente.

- **DI-4 (fase-02):** Substituicao do snapshot `/tmp/manifest-pre.json` por copia em `./.manifest-pre.json` (raiz do projeto).
  - Por que: Node nativo do Windows nao resolve path POSIX `/tmp/`. Git Bash funciona, mas `node -e` falha. Alternativa: `git show 980705f:plugin-manifest.json > /tmp/manifest-pre.json` (Bash) + `cp` para path relativo (acessivel por node).
  - Impacto: registrar como gotcha para Wave 3+ que use scripts inline de validacao.

- **DI-5 (fase-02):** `lint` script NAO existe em package.json — script disponivel eh `typecheck` (tsc --noEmit).
  - Por que: confirma DI-Plano03-fase01 da Wave 2 inteira. Pipeline canonico do plano usava `bun run lint` (literal do README), mas o real eh `typecheck`.
  - Impacto: registrar diretamente em `## Notas para Planos Seguintes` para Wave 3 — atualizar references do pipeline canonico.

---

## Bugs Descobertos

Nenhum bug introduzido pela Wave 2 fase-01 ou fase-02. Bugs encontrados sao todos PRE-EXISTENTES (ver Gotchas).

---

## Gotchas

- **GT-1 (fase-02 Passo 6 — test):** Teste `runInit emits canonical audit log entries (CA-14) > records entries in order for a run with CLAUDE.md present` falha em HEAD.
  - Descoberto em: fase-02 Passo 6 (bun run test).
  - Causa: regressao INTRODUZIDA por commits do init-refactor-v7 (entre origin/main e commit 4c9fbde pre-Wave-2). Falha existe TAMBEM em pre-Wave 2 (4c9fbde) e em todos os 49 commits do init-refactor-v7. NAO eh culpa da Wave 2.
  - Erro: `ENOENT: no such file or directory, open 'C:\Users\luizf\AppData\Local\Temp\audit-ca14-*\discovery\agents-log.json'`.
  - Acao recomendada: registrar como tech-debt em `docs/exec-plans/tech-debt-tracker.md` ou criar PRD de fix dedicado. NAO bloqueia o encerramento da Wave 2.

- **GT-2 (fase-02 Passo 6 — typecheck):** `bun run typecheck` retorna 1 erro em HEAD pristine: `skills/init/lib/registry.ts:12 — Cannot find module './steps/inject-harness-scripts'`.
  - Descoberto em: fase-02 Passo 6 (bun run typecheck) com working tree limpo (git stash -u).
  - Causa: modulo `./steps/inject-harness-scripts` eh referenciado por `registry.ts` (commitado) mas o arquivo nao foi commitado. PRE-EXISTENTE — provavelmente arquivo em desenvolvimento no init-refactor-v7. Erros adicionais em populate-plan-* aparecem quando arquivos untracked do init-refactor-v7 estao no working tree.
  - Acao recomendada: registrar em tech-debt. NAO bloqueia Wave 2.

- **GT-3 (fase-02 Passo 6 — script run-tests.ts):** `bun run test` (que executa `scripts/run-tests.ts`) estoura limite de linha de comando do Windows ("Linha de comando muito longa").
  - Descoberto em: fase-02 Passo 6.
  - Causa: script enumera todos os ~179 arquivos .test.ts e passa como CLI args para `bun test`. Em Windows, ultrapassa ARG_MAX (~8KB).
  - Workaround usado: rodar por subset (`bun test tests/`, `bun test skills/`, `bun test scripts/`) sequencialmente.
  - Acao recomendada: refatorar `scripts/run-tests.ts` para usar globs nativos do `bun test` em vez de enumeracao. Registrar em tech-debt.

- **GT-4 (fase-02 Passo 7 — count anti-degen):** Spec do plano usava `awk '/^## Anti-Degeneration Rules/,/^## /{ if (/^- /) print }'` para contar regras, esperando lista de bullets. Real: agentes usam lista NUMERADA (`1. **Rule:** ...`), nao bullets. Pattern correto: `grep -cE "^[0-9]+\."` no range do awk.
  - Descoberto em: fase-02 Passo 7 checkpoint 3.
  - Impacto: contar dependendo do formato real. Total atual: 54 regras (esperado ≥52). Spec do PLAN.md (linha 117) tambem usa "≥4 regras" sem especificar formato.

- **GT-5 (fase-02 Passo 6 — `git checkout <commit> -- .`):** Comando para testar estado anterior pode ressuscitar arquivos UNTRACKED se eles existirem no commit anterior. Apos restaurar via `git checkout HEAD -- .`, o stash pode trazer arquivos de volta como "added" no index.
  - Descoberto em: fase-02 Passo 6 durante investigacao de regressao.
  - Workaround: usar `git stash -u` (inclui untracked) ou `git worktree add` para testes em snapshots historicos.
  - Acao recomendada: documentar em compound notes da Wave 2 — pattern para investigacao temporal sem poluir working tree.

---

## Desvios do Plano

- **DEV-1 (fase-02 Passo 6 — pipeline parcialmente verde):** Spec exigia `bun run harness:validate && bun run test && bun run lint` verde. Real:
  - harness:validate verde
  - test: 1 fail pre-existente (GT-1)
  - lint nao existe (substituido por typecheck — DI-5). typecheck: 1 erro pre-existente (GT-2).
  - Decisao: aceitar como "verde modulo pre-existentes documentados" — todos os pre-existentes sao do init-refactor-v7, anteriores ao primeiro commit da Wave 2 (e4d0614). Wave 2 NAO introduziu nenhuma regressao.

- **DEV-2 (fase-02 Passo 7 — count anti-degen pattern adaptado):** Spec usava awk + bullet matching. Adaptado para grep + numbered list (GT-4). Resultado equivalente.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 2 |
| Fases concluidas | 2 |
| Fases com desvio | 1 (fase-02) |
| Bugs encontrados | 0 (5 pre-existentes do init-refactor-v7) |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.

**Importante:** este e o ULTIMO plano da Wave 2. Wave 2 ENCERRADA em 2026-05-23 com:
- 2 commits atomicos: `ad4dd21` (fase-01 pedagogia ADR), `862ea21` (fase-02 manifest final).
- 7/8 Exit Criteria verdes; 1 com pre-existentes documentados (GT-1, GT-2 — NAO da Wave 2).
- Total de commits da Wave 2: 22 (Plano 01: 4, Plano 02: 13 incluindo close, Plano 03: 4, Plano 04: 2 — somando close docs ~22).

Proximo passo: criar `PRD-WAVE-3.md` em pasta dedicada `docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/`.

Conteudo da Wave 3 (escopo definido no PLAN/PRD da Wave 2 como "Won't Have"):
- Refactors deeper de SKILL.md das 5 skills criticas (tdd-workflow, anti-vibe-review, plan-feature, grill-me, execute-plan)
- Consolidacao `/anti-vibe-review` -> `/verify-work` com deprecation path
- Modo `prove-it` no tdd-verifier
- Pipeline compound->reference->core-belief
- References operacionais profundas
- Persona "synthesizer" (decisao pendente)

### Heranca CRITICA para Wave 3 (e Planos 05+ se existirem)

- **Pipeline canonico real**: `bun run harness:validate && bun run test && bun run typecheck` (NAO `lint`). Atualizar referencias em `references/` da Wave 3.
- **`bun run test` em Windows estoura ARG_MAX**: usar `bun test tests/`, `bun test skills/`, `bun test scripts/` em subsets. Refatoracao em `scripts/run-tests.ts` eh tech-debt prioritaria (GT-3).
- **`/tmp/` nao acessivel pelo node Windows**: para scripts inline com `require`/`fs.readFileSync`, copiar snapshots para path relativo `./.{nome}-tmp.json` antes (DI-4).
- **Manifest gerado via `bun run scripts/generate-manifest.js` (NAO `node`)**: type:module em package.json + script CJS = `node` falha. DI-3.
- **Tech-debt aberto durante Wave 2 (NAO bloqueia Wave 2 mas convem priorizar)**:
  - GT-1: regressao CA-14 audit log integration test (introduzida por init-refactor-v7).
  - GT-2: registry.ts referencia modulo inject-harness-scripts.ts que nao foi commitado.
  - GT-3: scripts/run-tests.ts estoura limite Windows.

### Verificacoes obrigatorias ANTES de iniciar Wave 3

1. Confirmar que `bun run harness:validate` esta verde (gate canonico).
2. Confirmar Exit Criteria do PLAN.md da Wave 2 com todos os 8 checkpoints em [x] (ja confirmado nesta fase-02).
3. Confirmar CA-11 (`skills/verify-work/SKILL.md` nao tocado vs origin/main).
4. Decidir: fechar tech-debt GT-1/GT-2/GT-3 ANTES da Wave 3 ou aceitar arrastar para depois.

---

<!-- Atualizado automaticamente durante execucao via /execute-plan em 2026-05-23 -->

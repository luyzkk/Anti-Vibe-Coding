# Memoria: Plano 03 — Step 5 (scaffold-and-link) + Step 6 (install-gh-files)

**Feature:** init-refactor-v7
**Iniciado:** 2026-05-21
**Status:** concluido (3/3 fases)

---

## Decisoes de Implementacao

- **DI-Plano03-fase01-no-dry-run-wiring:** Step 5 NAO recebe `writeFile` injetado (sem `makeWriter`,
  sem `WriteRecorder`). `scaffoldFullTree` usa o writer default (`fs.writeFile + mkdir`).
  - Por que: D4 removeu dry-run do pipeline v7. Comment inline nao pode mencionar 'makeWriter'
    porque o meta-test D4 escaneia todo o arquivo incluindo comentarios.
  - Impacto: 1 import a menos. Meta-test D4 verifica via grep no texto-fonte do step.

- **DI-Plano03-fase01-link-after-scaffold-mandatory:** A ordem `scaffoldFullTree -> linkClaudeToAgents`
  e contratual e nao opcional. `linkClaudeToAgents:21` faz `fs.access(agentsPath)` e falha se
  AGENTS.md raiz nao existir. Scaffold cria AGENTS.md (manifest linha 95 — antecede o link).
  - Por que: sem esta ordem, ENOENT em `linkClaudeToAgents`. Documentado como invariante no codigo.
  - Impacto: qualquer refatoracao que paralelize as duas chamadas quebra.

- **DI-Plano03-fase02-install-gh-skip-policy:** Opcao (a) escolhida — skip-if-exists guard adicionado
  via writer closure NO STEP (`06-install-gh-files.ts`), sem modificar `install-gh-files.ts` (lib).
  - Por que: lib pode ser usada por outros consumidores com semantica diferente (overwrite intencional).
  - Impacto: lib permanece inalterada. Guard e localizado no step.

- **DI-Plano03-fase03-type-guard-record-access:** E2E CA-08 adicionou type guard para acesso de
  Record<string, string> com indice string (TypeScript strict). `if (snapshot !== undefined) { ... }`
  - Por que: `Record<string, string>[key]` retorna `string | undefined` em strict mode.
  - Impacto: guard nunca dispara em pratica; e corretude de tipo.

- **DI-Plano03-fase03-stub-loop-index:** Loop de verificacao de stubs em `registry.test.ts`
  atualizado de `for (let i = 4; i < 10; ...)` para `for (let i = 6; i < 10; ...)`.
  - Por que: Steps 5-6 agora reais — iteracao iniciava nos steps reais e falhava.
  - Impacto: apenas Steps 7-10 (indices 6-9) verificados como stubs.

---

## Bugs Descobertos

- **BUG-1 (resolvido na fase-01):** Comentario inline no `05-scaffold-and-link.ts` continha
  o token 'makeWriter' (em `Sem \`writeFile: makeWriter(...)\``). Meta-test D4 escaneia o
  texto-fonte via `fs.readFile` — o comentario causou falha de assertion. Fix: reescrever
  o comentario sem o token.
  - Sintoma: meta-test 'D4: zero imports de dry-run' falhava mesmo sem import real.
  - Causa raiz: regex do teste nao distingue comentario de codigo.
  - Fix: comentario reescrito para descrever o comportamento sem mencionar o nome da funcao.

---

## Gotchas

- **linkClaudeToAgents retorna tier de 3 valores:** `symlink` (POSIX), `hardlink` (Windows NTFS)
  ou `copy-with-hook` (Windows-no-admin / fallback). Em Windows-CI sem dev-mode, esperar
  `hardlink` ou `copy-with-hook`. Testes devem usar matcher `/symlink|hardlink|copy-with-hook/`.

- **installGhFiles lib NAO tem skip-if-exists:** O writer default da lib sobrescreve sempre.
  O guard e responsabilidade do Step 6 via writer closure. Se outro consumidor precisar de
  skip, ele tambem deve adicionar o guard — a lib nao o fornece.

- **CA-08 e2e isolado (bypassa gate):** Apos `runInit` completo, `.claude/legacy-manifest.json`
  existe e Step 1 (reentry-gate) aborta re-run com code=10. Teste de CA-08 ponta-a-ponta
  para Steps 5-6 deve rodar os steps diretamente via `registry.find(...)`, nao via `runInit`.

- **Commits do Plano 03:**
  - 1160c89: Step 5 scaffold-and-link real (fase-01)
  - d92f4b1: Step 6 install-gh-files real (fase-02)
  - f9d645a: Wire registry + E2E scaffold+gh (fase-03)

---

## Desvios do Plano

- **DEV-1:** Meta-test D4 escaneia comentarios (nao so codigo). Fase spec nao alertava para isso.
  Fix trivial (remover token do comentario). Aceito.

- **DEV-2:** Type guard adicionado no E2E CA-08 para strict TS. Nao estava na spec. Aceito.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 2 (fase-01, fase-03) |
| Bugs encontrados | 1 (BUG-1 resolvido) |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o Plano 04 PRECISA saber antes de comecar.

- **Step 5 id = `'05-scaffold-and-link'`** (com prefixo). Qualquer grep/assert deve usar esse ID.
  Step 6 id = `'06-install-gh-files'` (com prefixo). Consistente com Step 3 (`'03-secrets-scan'`).
  Step 4 continua `'migrate-planning-and-manifest'` (sem prefixo — DEV-1 do Plano 02).

- **36 placeholders criados pelo Step 5 em greenfield** (TEMPLATE_MANIFEST.length). Plano 04
  Step 7 pode assumir que esses paths existem no disco antes de gerar planos populate. Alternativa:
  Plano 04 le diretamente `TEMPLATE_MANIFEST` para obter os caminhos (mais robusto).

- **Step 5 summary format:** `placeholdersCreated: N (de M)\nplaceholdersSkipped: K\nLinked via tier: T`
  Step 6 summary format: `ghFilesInstalled: N\nghFilesSkipped: K`

- **CA-02 invariante esta em `scaffoldFullTree` (lib), nao no Step 5.** `linkClaudeToAgents` opera
  APENAS no `CLAUDE.md` raiz. `.claude/CLAUDE.md` e preservado via fileExists guard da lib.
  Plano 05 e2e final pode reutilizar essa garantia.

- **Meta-test D4 escaneia o TEXTO COMPLETO do arquivo** (incluindo comentarios).
  Qualquer novo step que nao use dry-run DEVE evitar mencionar tokens como `isDryRun`,
  `WriteRecorder`, `makeWriter`, `dry-run-mode` mesmo em comentarios inline.

- **Loop de stubs em registry.test.ts** agora comeca em `i = 6` (Steps 7-10). Plano 04 entrega
  Step 7 real — na fase-final do Plano 04, o loop deve ser atualizado para `i = 7`.

---

<!-- Atualizado apos conclusao do Plano 03 em 2026-05-21 -->

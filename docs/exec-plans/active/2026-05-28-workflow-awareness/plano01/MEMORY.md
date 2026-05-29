# Memoria: Plano 01 — Núcleo (Awareness + Detector + Doc + Gate)

**Feature:** workflow-awareness
**Iniciado:** 2026-05-29
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (CONFIRMADA na fase-01):** testabilidade do hook via `module.exports = { processPrompt, SCALE_PATTERNS }`
  + guard `if (require.main === module) { ... }` envolvendo o bloco de I/O (padrão de `stop-reflector.cjs`),
  NÃO via subprocesso. Confirmado por `node -e require(...)` que retorna `{function, array}` sem pendurar no stdin.
  Comportamento CLI (fail-open + timer 500ms) preservado sob o guard.
- **DI-fase01-scale-before-silent (DESVIO autorizado):** a checagem de escala (`scaleHit`) foi movida para
  **ANTES do STEP 3 (SILENT_PATTERNS)**, não no STEP 3.6 como a prosa do passo sugeria. Causa: `rename`/`renomear`
  está em SILENT_PATTERNS (lista de trivial-fixes) **e** em SCALE_PATTERNS pattern (a). Com a posição original,
  `!hasImplementation && silentHit` curto-circuitava em `null` para "rename 200 arquivos" (CA-01) antes de alcançar
  a escala. O próprio Gotcha da fase autorizava: *"Se um futuro gatilho de escala usar uma palavra que TAMBÉM
  esteja em SILENT, mover a checagem de escala para antes do STEP 3."* Lógica do STEP 4.5 foi inlinada no bloco de
  escala (sem variável `matches` separada — `scaleMatches`). Funcionalmente equivalente à intenção da spec.
- **DEV-line-numbers (trivial):** os números de linha citados na spec (459-461 / 463-476) tinham drift leve
  (estrutura real 459-476). Ancorado na estrutura do código, não nos números — como instruído.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-01 (PRÉ-EXISTENTE — não introduzido por esta fase):** `bun run test` falha no Windows com
  "Linha de comando muito longa". Causa raiz: o glob de `scripts/run-tests.ts` expande para uma linha de
  comando que estoura o limite do Windows. Não corrigido aqui (fora do escopo da fase). Workaround usado:
  rodar o hook-test explícito (`bun test hooks/user-prompt-gate.test.cjs`) — que de qualquer forma é o canal
  certo, já que `bun run test` não descobre `*.test.cjs` (G7). Candidato a TODO/iterate separado.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (R6 do PLAN):** `tests/e2e/populate-plan-parity.test.ts` está **gutted** — `describe.skip`
  placeholder de 11 linhas (confirmado linhas 6-10: exports do gerador V2 foram deletados). A
  fase-04 cria arquivo e2e **NOVO** (`tests/e2e/workflow-advisor-directive.test.ts`); **não**
  estende esse stub. Espelha só a IDEIA do "never diminish gate".
- **GT-2 (testabilidade do hook):** `processPrompt` / `IMPLEMENTATION_PATTERNS` / `SCALE_PATTERNS`
  **não** são exportados hoje em `user-prompt-gate.cjs`. O arquivo roda I/O no top-level (sem guard
  `require.main === module`) — um `require()` cru penduraria no `process.stdin`. Decisão de
  testabilidade tomada na fase-01 seguindo o padrão dual de `stop-reflector.cjs` (linhas 121-131:
  `if (require.main === module) { run() }` + `module.exports = {...}`): exportar
  `{ processPrompt, SCALE_PATTERNS }` E envolver o bloco de I/O no guard.
- **GT-3 (INV3 — cap 70):** confirmar a contagem de linhas do `AGENTS.md` ANTES e DEPOIS da edição.
  Hoje são **67 linhas** (medido). +1 = 68, dentro do `AGENTS_MAX_LINES = 70`
  (`scripts/harness-validate.ts:43`). `ARCHITECTURE.md` ("≤40", linhas 18 e 60) está stale — NÃO
  atualizar nesta feature.
- **GT-4 (D9 — rename do banner):** renomear a tag `[ANTI_VIBE_CODING v5.0 - SKILL ADVISOR ATIVO]`
  → `[ANTI_VIBE_CODING v5.1 - SKILL & WORKFLOW ADVISOR ATIVO]`. A tag vive SÓ em `hooks/hooks.json`.
  Grep `SKILL ADVISOR|SKILL_ADVISOR|ANTI_VIBE_CODING v5` retornou 4 arquivos: `hooks/hooks.json`
  (a tag — renomear), `hooks/user-prompt-gate.cjs` (marker de runtime `[SKILL_ADVISOR]` — **string
  DIFERENTE, NÃO mexer**), `CONTEXT.md` desta feature, e um PRD histórico em
  `docs/exec-plans/completed/_legacy-detail/v60-harness-compound-fusion/PRD.md` (histórico — não
  tocar). Resultado: o rename é local ao banner; não quebra busca pelo marker de runtime.
- **GT-5 (`bun run lint` ausente):** `package.json` **não tem** script `lint`. Lint real =
  `bunx biome check`. Onde o template/checklist pedir `bun run lint`, usar `bun run typecheck`
  (`tsc --noEmit`) + `bunx biome check <arquivo>` e dizer explicitamente que lint não é um script
  npm (regra do CLAUDE.md global: "diga explicitamente se não há linter configurado").
- **GT-6 (`bun run test` ≠ `.cjs`):** `scripts/run-tests.ts` só globa `*.test.{ts,tsx}` em
  `tests/`, `skills/`, `scripts/`. Hook-tests `.cjs` em `hooks/` NÃO entram em `bun run test` — rode
  `bun test hooks/user-prompt-gate.test.cjs` explicitamente. O e2e `.ts` da fase-04 entra normal.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- preencher durante execucao -->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 1 |
| Fases com desvio | 1 |
| Bugs encontrados | 1 (pré-existente) |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (02/03) PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

- **Fonte de verdade única:** `docs/WORKFLOWS.md` (criado na fase-02) é o doc canônico. As skills
  do Plano 02/03 **só REFERENCIAM** esse arquivo — **nunca** duplicam a tabela comparativa, os
  gatilhos, os limites ou a caixa PRIME-DIRECTIVE. Drift entre N superfícies e o doc é o R2 do PLAN;
  a defesa é "uma fonte, todas leem dela".
- **Formato da mensagem `[WORKFLOW_ADVISOR]`:** definido na fase-01 (no hook). Os callouts das
  skills (Plano 02/03) citam o **mesmo análogo** (`/verify-work | /design-twice | /deep-research | /plan-feature`)
  e a **mesma regra de opt-in** (humano inclui a palavra "workflow"), mas com linguagem semântica —
  **sem repetir o threshold numérico** (INV5: o número `\d{3,}` vive SÓ no regex do hook).
- **`/deep-research` NÃO é bundled neste repo** (confirmado: `skills/deep-research/` não existe).
  Aparece como skill top-level no ambiente do dev. Por isso a citação SEMPRE leva o hedge
  "(se disponível)" — tanto no doc (fase-02) quanto nos callouts (Plano 02/03). D7.
- **Diretriz travada por CI (fase-04):** qualquer mudança futura no advisor (Plano 02/03 inclusive)
  que introduza um caminho emitindo tool Workflow ou `decision:block` quebra
  `tests/e2e/workflow-advisor-directive.test.ts`. INV6 (prose-leak hardening) do Plano 02 é validado
  por esse mesmo teste.
- **INV1 (suprimir, não empilhar):** o branch `>=2 domínios` do hook foi alterado na fase-01 para
  MESCLAR com `SCALE_PATTERNS` numa única mensagem. Plano 02/03 não devem reintroduzir empilhamento.

---

<!-- Atualizado automaticamente durante execucao -->

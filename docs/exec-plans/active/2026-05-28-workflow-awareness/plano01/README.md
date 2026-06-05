# Plano 01: Núcleo — Awareness + Detector + Doc + Gate

**Feature:** workflow-awareness ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~6h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (camadas de skill), Plano 03 (cobertura)

---

## O que este plano entrega

Ao fim do Plano 01, o plugin já **SUGERE** dynamic workflows do Claude Code corretamente e a
diretriz "sugere, nunca executa" está travada por CI. Entrega o detector de escala no
`user-prompt-gate.cjs` (tracer), o doc canônico `docs/WORKFLOWS.md` (fonte de verdade única),
a consciência permanente (linha no AGENTS + cláusula no banner SessionStart) e o teste de
regressão que ancora a diretriz. Os Planos 02/03 só aumentam a superfície de descoberta —
nenhum reimplementa lógica, todos **referenciam** o doc criado aqui.

---

## Análise de Dependências

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Máquina do skill-advisor (`processPrompt` regex → stdout) a espelhar | `hooks/user-prompt-gate.cjs` (existente, linhas 370-426) | pronto |
| Padrão de teste de hook (export + CLI dual; `module.exports`) | `hooks/stop-reflector.cjs` (linhas 121-131) + `.test.cjs` | pronto |
| Banner SessionStart como string `printf` única | `hooks/hooks.json` (linha 13) | pronto |
| Validador de links/H1/line-cap do harness | `scripts/harness-validate.ts` (linhas 215-250, 477-560) | pronto |
| PRD aprovado + decisões D1-D9 + invariantes INV1-INV8 | `../PRD.md`, `../CONTEXT.md` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `docs/WORKFLOWS.md` (doc canônico — fronteira workflow/subagente/skill) | Plano 02 (todas as skills referenciam), Plano 03 (grill-me/consultant referenciam) |
| Formato exato da mensagem `[WORKFLOW_ADVISOR]` (no hook) | Plano 02/03 (skills citam o mesmo análogo `/verify-work \| /design-twice \| /deep-research \| /plan-feature`, nunca duplicam o texto) |
| Linha "When to Read What" → `docs/WORKFLOWS.md` no `AGENTS.md` | Validador (link-check), navegação de qualquer agente |
| Teste de regressão da diretriz (ancora doc + link + não-emissão) | Exit Criteria do PLAN; gate de qualquer mudança futura no advisor |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-workflow-advisor-detector.md | `SCALE_PATTERNS` + anti-deadlock + branch `[WORKFLOW_ADVISOR]` em `user-prompt-gate.cjs` (independe de verbo; merge com multi-domínio) + testes RED→GREEN | 2h | — |
| 02 | fase-02-workflows-doc.md | `docs/WORKFLOWS.md` (tabela parafraseada, gatilhos, padrões de qualidade, limites, custo, gate de disponibilidade, caixa PRIME-DIRECTIVE, "Workflow vs skills paralelas") | 1.5h | — (paralela à fase-01) |
| 03 | fase-03-agents-row-and-banner.md | 1 linha no AGENTS "When to Read What" → WORKFLOWS.md + cláusula "Workflows dinâmicos" no banner SessionStart + rename da tag para v5.1 | 1h | fase-02 (alvo do link precisa existir) |
| 04 | fase-04-directive-regression-test.md | Teste e2e novo (`tests/e2e/workflow-advisor-directive.test.ts`): WORKFLOWS.md existe+H1, AGENTS linka, nenhum caminho `[WORKFLOW_ADVISOR]` emite tool Workflow ou `decision:block` | 1.5h | fase-01, fase-02, fase-03 |

---

## Grafo de Fases

```
fase-01 (workflow-advisor-detector)     fase-02 (workflows-doc)
    |   [TRACER — RF4, ∥ fase-02]              |   [RF1]
    |                                          v
    |                                  fase-03 (agents-row-and-banner)
    |                                          |   [RF2+RF3 — depende de fase-02]
    +---------------------+--------------------+
                          |
                          v
                  fase-04 (directive-regression-test)
                      [RF15, GATE — depende de 01, 02, 03]
```

**Paralelismo possível:** fase-01 (hook) e fase-02 (doc) são independentes e podem rodar em
paralelo — uma toca `hooks/`, a outra cria `docs/WORKFLOWS.md`, sem sobreposição. fase-03
**precisa** que fase-02 já tenha criado o arquivo (INV4: o link-check do harness faz `fs.stat`
em todo link relativo; linkar antes de existir = `broken-link` failure). fase-04 é o portão
final e depende das três (assere o produto das três simultaneamente).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test  (+ bun run typecheck; ver G6 sobre lint)
```

**Tracer Bullet deste plano:** fase-01 — `hooks/user-prompt-gate.test.cjs` prova a arquitetura
de sugestão end-to-end (prompt com sinal de escala → texto `[WORKFLOW_ADVISOR]`; "workflow" no
prompt → `null`; "12 arquivos" → sem advisor), incluindo a garantia da diretriz, antes de
escrever o doc ou espalhar pelas skills. É a fatia mais fina que prova o mecanismo inteiro.

**Ordem do gate (mitiga R2/R3):** fase-04 é re-executável e assere o estado conjunto. Rode-a
DEPOIS das três primeiras — ela é a trava de CI que garante que nada nas fases 01-03 fez o
plugin emitir uma tool Workflow ou `decision:block`.

---

## Gotchas Conhecidos

- **G1 (R6 do PLAN — GT-1):** `tests/e2e/populate-plan-parity.test.ts` está **gutted** — é só um
  `describe.skip` placeholder de 11 linhas (confirmado: linhas 6-10). A fase-04 cria um arquivo
  e2e **NOVO**; **não** estende o stub. Espelha apenas a IDEIA do "never diminish gate".
- **G2 (testabilidade do hook — GT-2):** `processPrompt` e `IMPLEMENTATION_PATTERNS` **não** são
  exportados hoje em `user-prompt-gate.cjs` (o arquivo lê stdin / escreve stdout direto, sem
  guard `require.main === module`). A fase-01 decide a testabilidade seguindo o padrão de
  `stop-reflector.cjs` (linhas 121-131): adicionar `module.exports = { processPrompt, SCALE_PATTERNS }`
  **e** envolver o bloco de I/O num guard para o `require()` do teste não pendurar no stdin.
- **G3 (INV3 — cap 70):** `AGENTS.md` tem **67 linhas hoje** (confirmado por `wc`). +1 linha = 68,
  dentro do cap (`AGENTS_MAX_LINES = 70` em `harness-validate.ts:43`). `ARCHITECTURE.md` diz "≤40"
  (linhas 18 e 60) — **quote stale**, NÃO atualizar nesta feature (fora de escopo).
- **G4 (D9 — rename do banner / GT-4):** a tag a renomear (`[ANTI_VIBE_CODING v5.0 - SKILL ADVISOR ATIVO]`)
  vive SÓ em `hooks/hooks.json`. O marker de runtime `[SKILL_ADVISOR]` (no stdout do
  `user-prompt-gate.cjs`) é uma **string diferente** — NÃO renomear esse. Grep confirmou que fora
  destes dois e de docs históricos não há outras referências (ver MEMORY GT-4).
- **G5 (INV4 — WORKFLOWS.md primeiro):** o link-check do harness (`harness-validate.ts:530-556`)
  faz `fs.stat` em todo link relativo de markdown. fase-02 DEVE rodar antes de fase-03, senão o
  link recém-adicionado no AGENTS.md vira `broken-link` e o `harness:validate` falha.
- **G6 (`bun run lint` não existe):** o `package.json` **não tem** script `lint` (confirmado: scripts
  são test/typecheck/test:e2e/... sem `lint`). O lint real roda via `bunx biome check`. Nas
  verificações use `bun run test` + `bun run typecheck` (= `tsc --noEmit`) + opcionalmente
  `bunx biome check <arquivo>`. Onde o template pedir `bun run lint`, substitua e anote.
- **G7 (`bun run test` não pega `.cjs`):** `scripts/run-tests.ts` (o alvo de `bun run test`) só
  globa `*.test.{ts,tsx}` em `tests/`, `skills/`, `scripts/` — **não** varre `hooks/*.test.cjs`.
  O teste de hook da fase-01 (`hooks/user-prompt-gate.test.cjs`) deve ser rodado **explicitamente**
  (`bun test hooks/user-prompt-gate.test.cjs`), igual aos hook-tests irmãos. O teste e2e da fase-04
  é `.ts` em `tests/e2e/` → esse SIM entra no `bun run test`.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->

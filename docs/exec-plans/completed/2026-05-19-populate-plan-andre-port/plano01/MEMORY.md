# Memoria: Plano 01 — MH-1 Lista completa de docs (Tracer Bullet)

**Feature:** populate-plan-andre-port
**Iniciado:** 2026-05-19
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-Plano01-fase01-tpl-existentes:** ARCHITECTURE.md.tpl e AGENTS.md.tpl ja existiam em
  `skills/init/assets/templates/` antes desta fase. Confirmado via Read/ls — nao re-criados.
  Apenas `.claude/CLAUDE.md.tpl` foi criado (pasta `.claude/` tambem nao existia).
  - Por que: evitar overwrite de conteudo existente.
  - Impacto: stub de `.claude/CLAUDE.md.tpl` aponta para AGENTS.md como fonte (mirror); Plano 03
    fase-02 escreve instrucao imperativa para subagent gerar conteudo real.

- **DI-Plano01-fase01-test-regressao:** O teste `'does NOT include excluded files (D14 PRD — filosoficos)'`
  em `populate-plan-generator.test.ts:44` FALHOU apos fase-01 (5 pass / 1 fail), nao "passou
  tautologicamente" como o plano antecipava. Assertions `expect(docs).not.toContain('docs/PRODUCT_SENSE.md')`
  e `expect(docs).not.toContain('README.md')` quebram porque agora ESTAO no plano gerado.
  - Por que: o plano da fase-01 (checklist linha 200-205) esperava que o teste continuasse verde
    por tautologia, mas na verdade ele afirmava ausencia ativa — o que vira falso quando D5
    reintroduz os docs.
  - Impacto: fase-03 ja estava planejada para flip esse teste — comportamento esperado, sem
    desvio funcional. Atualizar checklist da fase-01 nao e necessario (fase-03 fecha o gap).
    Apenas registrar para nao causar confusao em retrospectiva.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-Plano01-fase03-tree-golden-regenerate:** Apos fase-01, `tests/e2e/__golden__/init-greenfield.tree.json`
  fica defasado — diff mostra 5 fases novas (PRODUCT_SENSE, README, ARCHITECTURE, AGENTS, .claude/CLAUDE)
  + 1 arquivo novo (`.claude/CLAUDE.md`). Failure list (diff antes/depois fase-01):
  - SOMA: 1 nova falha em `init-cutover-greenfield.test.ts > greenfield init generates expected file
    tree matching golden`.
  - PRE-EXISTENTE (nao causado por esta feature): `greenfield-populate-plan.test.ts`,
    `init-tracer-bullet.test.ts`, `init-cutover-greenfield.test.ts > stdout matching golden`,
    `init-cutover-greenfield.test.ts > populate-harness PLAN.md (CA-01)` — todos abort por
    V6.6.0 knowledge gate (`.claude/knowledge/nodejs-typescript/INDEX.md` ausente em test env).
  - Causa raiz: golden snapshot foi gerado antes de Plano 01 expandir a lista de docs canonicos.
  - Fix: Plano 05 fase-06 regenera os goldens (ja documentado no PLAN.md).

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 0 |
| Bugs encontrados | 1 (tree golden defasado — fix em Plano 05 fase-06) |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

- **EXCLUDED_FROM_POPULATION_V2 final:** contem apenas `docs/COMPOUND_ENGINEERING.md`.
  Plano 02/03/04 podem assumir esta forma. EXPORTADO (`export const`) — testes inspecionam.

- **CanonicalDoc final:** inclui agora `'README.md'` e `'docs/PRODUCT_SENSE.md'` (alem dos 12
  pre-existentes). Plano 04 (MH-4) precisa adicionar entries de paths para esses 2 em
  `NEXTJS_CANDIDATES` / `RAILS_CANDIDATES` / `NODE_TS_CANDIDATES`.

- **TEMPLATE_MANIFEST expandido:** 3 entries novas adicionadas APOS o bloco
  `.github/pull_request_template.md`:
  - `ARCHITECTURE.md` (category: canon-andre)
  - `AGENTS.md` (category: canon-andre)
  - `.claude/CLAUDE.md` (category: anti-vibe-extension)
  `.tpl` correspondentes: ARCHITECTURE.md.tpl e AGENTS.md.tpl JA existiam (pre-existentes na
  pasta templates/). `.claude/CLAUDE.md.tpl` foi criado nesta fase como stub (espelhar AGENTS.md
  por instrucao em Plano 03 fase-02).

- **DI-Plano01-fase02-isolated-call:** parity test (`tests/e2e/populate-plan-parity.test.ts`)
  chama `generatePopulatePlanV2()` direto, sem `runInit`, para evitar abort do Step 90 (V6.6.0
  knowledge gate). Integracao end-to-end com runInit fica em Plano 05 fase-01 (golden snapshot).

- **Parity test esqueleto pronto para crescer:** `tests/e2e/populate-plan-parity.test.ts` tem 2
  asserts iniciais (>= 12 fases + EXCLUDED nao readiciona). Plano 02 fase-04 estende com asserts
  de 11 secoes obrigatorias; Plano 03 fase-03 estende com asserts de instrucoes imperativas;
  Plano 04 fase-03 estende com asserts de paths.

- **Greenfield E2E golden defasado (input para Plano 05 fase-06):**
  - `tests/e2e/__golden__/init-greenfield.tree.json` — NOVO failure (tree golden defasado por
    expansao de fases). Antes desta feature: stdout golden ja estava quebrado por outras razoes.
  - Apos fase-01: tree golden tambem precisa regeneracao. Diff inclui:
    - 1 arquivo novo: `.claude/CLAUDE.md`
    - 5 fases novas no populate-plan (PRODUCT_SENSE, README, ARCHITECTURE, AGENTS, .claude/CLAUDE)
    - "Fases emitidas: 31" no stdout (era 26)
  - Plano 05 fase-06 regenera. NAO contar como regressao desta feature.

- **Aborts pre-existentes (NAO causados por esta feature):**
  - `greenfield-populate-plan.test.ts` (V6.6.0 knowledge gate abort).
  - `init-tracer-bullet.test.ts` (mesmo abort).
  - `init-cutover-greenfield.test.ts > populate-harness PLAN.md (CA-01)` (mesmo abort).
  Confirmado via baseline com `git stash` ANTES de fase-01 — ja falhavam.

- **Comentario fonte do EXCLUDED:** linha 59 de `populate-plan-generator.ts` substituida.
  Bloco datado 2026-05-19 anula D14 do PRD anterior. Plano 02/03/04: NAO reverter este comentario.

---

<!-- Atualizado automaticamente durante execucao -->

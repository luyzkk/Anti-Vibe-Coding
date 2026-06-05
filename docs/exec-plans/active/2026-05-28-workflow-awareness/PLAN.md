---
title: "Workflow-Awareness no Anti-Vibe Coding"
mode: full
status: active
created: 2026-05-29
---

# Exec Plan: Workflow-Awareness no Anti-Vibe Coding

**PRD:** ./PRD.md
**Context:** ./CONTEXT.md
**Planos:** 3 planos, 13 fases total, ~15h
**Created:** 2026-05-29
**Tracer Bullet:** Plano 01, fase-01 — um prompt com sinal de escala produz `[WORKFLOW_ADVISOR]` via o hook, e um teste prova que nenhum caminho emite a tool Workflow nem `decision:block`. Prova a arquitetura de sugestão end-to-end antes de espalhar pelas skills.

**Decisão central:** complexidade ≠ escala. O detector é keyed em **escala** (sinal semântico + limiar numérico conservador no hook), nunca em contagem de domínios. Opt-in = humano digita `workflow`/`ultracode`; o plugin nunca lança.

---

## Goal

Fazer o plugin **sugerir** dynamic workflows do Claude Code em tarefas de escala — espelhando a máquina
do skill-advisor (regex → texto stdout → "pergunte antes de prosseguir") — sem nunca lançar um workflow.
O v1 entrega o degrau de escala que falta na escada `quick-plan → plan-feature → [workflow]`, com a
diretriz "sugere, nunca executa" travada por teste de CI.

---

## Scope

**In:**
- `docs/WORKFLOWS.md` (doc canônico, fonte de verdade única)
- 1 linha na tabela "When to Read What" do `AGENTS.md` (respeitando cap de 70 linhas)
- Cláusula "Workflows dinâmicos" no banner SessionStart (`hooks/hooks.json`)
- Detector de escala em `hooks/user-prompt-gate.cjs` (anti-deadlock + `SCALE_PATTERNS` + branch `[WORKFLOW_ADVISOR]`)
- Teste de regressão e2e da diretriz (arquivo novo)
- (Plano 02) callouts/referências em plan-feature, quick-plan, verify-work, design-twice, execute-plan + `docs/PIPELINE.md`, `docs/PLANS.md`
- (Plano 03) linhas condicionais em grill-me, consultant + retrospectivo suavizado em `hooks/stop-reflector.cjs`

**Out (Won't do PRD):**
- Telemetria do `WORKFLOW_ADVISOR` (D8 — sinal quase-zero; candidata a reativar)
- Fork de sugestão no `pre-mutation-gate.cjs` (D4 — risco de nag duplo)
- Detecção em runtime se workflows estão habilitados (degradação é suave, fallback sempre presente)
- Escrever scripts de workflow reais — o plugin só sugere; quem escreve é o Claude no opt-in

---

## Assumptions

- A máquina do skill-advisor (`user-prompt-gate.cjs`: `processPrompt` regex → stdout → "pergunte") é o molde correto a espelhar — verificado em primeira mão (linhas 48-426).
- `AGENTS.md` tem ~68 linhas hoje; o cap real do harness é 70 (`AGENTS_MAX_LINES`) — só cabe 1 linha (ARCHITECTURE.md diz "≤40", quote stale).
- O banner SessionStart é uma única string `printf` em `hooks/hooks.json` terminando no bloco da tabela Akita — ponto de append natural.
- `docs/WORKFLOWS.md` NÃO está em `REQUIRED_FILES` do harness, mas uma vez linkado DEVE existir e começar com H1 (validador de links quebrados faz `fs.stat` em todo link relativo).
- `/deep-research` é bundled e está disponível nesta sessão (citado "se disponível" para installs sem ela).
- Workflows exigem Claude Code v2.1.154+ (research preview) — disponível no ambiente do dev.

---

## Risks

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| **R1** Regex dispara em falso-positivo apesar do limiar conservador | Média | Médio | `\d{3,}` (100+); palavras só com qualificador de escopo; sugestão suave + fallback de skill; telemetria pronta como Won't a reativar (D2/D8) |
| **R2** Scope creep / drift entre as 8 skills (Planos 02/03) e o doc canônico | Média | Médio | Uma fonte de verdade (`docs/WORKFLOWS.md`); skills só **referenciam**, nunca duplicam a lógica; RF15 ancora doc + link |
| **R3** Prose-leak: opção/callout lido pela LLM como permissão de lançar | Média | Alto | **INV6** obrigatório (rótulo explicativo-only no plan-feature Step 7; opt-in fresco no execute-plan); RF15 checa não-emissão de tool Workflow/`decision:block` |
| **R4** Banner já longo / cap de tokens do SessionStart | Baixa | Baixo | Cláusula curta (só a regra essencial); detalhe vive em `docs/WORKFLOWS.md` |
| **R5** Feature do CC em research preview muda a mecânica de opt-in | Baixa | Médio | Guidance ancorada em sinais (escala/qualidade), não em UI; degradação graciosa documentada |
| **R6** O `populate-plan-parity.test.ts` a "espelhar" está gutted (skip stub) | Alta | Baixo | RF15 é arquivo NOVO seguindo convenções `bun:test` de `tests/e2e/`, espelhando só a IDEIA do parity gate — não estende o stub |

---

## Execution Steps

### Planos (hierárquicos)

| # | Nome | Fases | Sizing | Depende de | MoSCoW |
|---|------|-------|--------|------------|--------|
| 01 | Núcleo: Awareness + Detector + Doc + Gate | 4 | ~6h | — | Must |
| 02 | Camadas de Skill (descoberta no planejamento) | 6 | ~6.5h | Plano 01 | Should |
| 03 | Cobertura: grill-me + consultant + retrospectivo | 3 | ~2.5h | Plano 01 | Could |

### Grafo de Dependências

```
        Plano 01 (Núcleo: doc canônico + detector + gate)
              |
      +-------+-------+
      |               |
      v               v
  Plano 02        Plano 03
  (skills)        (cobertura)
```

**Paralelismo possível:** Planos 02 e 03 podem rodar em paralelo após o Plano 01 (ambos só
**referenciam** o `docs/WORKFLOWS.md` criado no Plano 01; não dependem um do outro).

### Tracer Bullet

**Plano:** 01, fase-01
**Descrição:** Adicionar o branch `[WORKFLOW_ADVISOR]` em `user-prompt-gate.cjs` (anti-deadlock +
`SCALE_PATTERNS` + emissão de texto advisory, independente de verbo). RED: teste espera a sugestão
para "auditar o codebase inteiro por X", NÃO espera para "renomeie 12 arquivos", e espera `null`
quando o prompt já contém "workflow". Prova a arquitetura de sugestão (prompt → advisory) end-to-end,
incluindo a garantia da diretriz, antes de escrever o doc ou espalhar pelas skills.

### Resumo por Plano

#### Plano 01: Núcleo (~6h) — Must
> Estabelece o comportamento de sugestão completo: o detector no hook (tracer), o doc canônico
> `docs/WORKFLOWS.md`, a consciência permanente (banner + linha no AGENTS) e o teste que trava a
> diretriz. Ao fim do Plano 01, o plugin já SUGERE workflows corretamente e a diretriz está garantida
> por CI — os Planos 02/03 só aumentam a superfície de descoberta.

Fases (preliminar):
- fase-01-workflow-advisor-detector (TRACER, RF4): `SCALE_PATTERNS` + anti-deadlock + branch `[WORKFLOW_ADVISOR]` + supressão/merge com multi-domínio
- fase-02-workflows-doc (RF1): criar `docs/WORKFLOWS.md` (tabela comparativa parafraseada, gatilhos, padrões de qualidade, limites, custo, caixa PRIME-DIRECTIVE, "Workflow vs skills paralelas")
- fase-03-agents-row-and-banner (RF2+RF3): 1 linha no AGENTS "When to Read What" (link → WORKFLOWS.md) + cláusula no banner SessionStart
- fase-04-directive-regression-test (RF15, GATE): teste e2e novo — WORKFLOWS.md existe+H1, AGENTS linka, nenhum caminho `[WORKFLOW_ADVISOR]` emite tool Workflow ou `decision:block`

#### Plano 02: Camadas de Skill (~6.5h) — Should
> Espalha a consciência de workflow pelos pontos onde cada skill já raciocina sobre complexidade/
> paralelismo, sempre referenciando o doc canônico (nunca duplicando lógica). plan-feature (Step 4 tier
> + Step 7 opção explicativa-only, INV6), quick-plan (escada), verify-work (escala do diff→codebase),
> design-twice (acima de 5 ângulos/cross-review), execute-plan (keep-separate, opt-in fresco INV6),
> docs/PIPELINE.md, docs/PLANS.md.

#### Plano 03: Cobertura (~2.5h) — Could
> Fecha as bordas: linha condicional no branch Complex do grill-me, next-step no consultant, e o
> retrospectivo SUAVIZADO no stop-reflector (linha no menu FEATURE_COMPLETED, gated por sinal forte,
> nunca decision:block novo — D5).

---

## Review Checklist

- [ ] Os 3 planos têm README.md/MEMORY.md gerados em `planoNN/` (este passo cria só o Plano 01)
- [ ] Cada fase tem checklist binário verificável e sizing (0.5h/1h/1.5h/2h)
- [ ] Tracer bullet (Plano 01 fase-01) é a fase mais fina que prova a arquitetura end-to-end
- [ ] Grafo de dependências entre planos é acíclico
- [ ] Riscos R1-R6 têm mitigação atribuída a fase específica
- [ ] Decisões D1-D9 (CONTEXT) e invariantes INV1-INV8 referenciados nas fases relevantes
- [ ] INV6 (prose-leak hardening) presente nas fases de plan-feature e execute-plan (Plano 02)
- [ ] Nenhuma fase faz o plugin emitir tool Workflow ou `decision:block` (travado por RF15)

---

## Validation Log

<!-- preencher durante execucao: comando + resultado -->

---

## Compound Opportunity

<!-- preencher ao /iterate: o que merece virar compound note? -->

Candidatos antecipados:
- "Espelhar a máquina do skill-advisor para uma nova categoria de sugestão" como padrão de extensão do plugin
- "Opt-in estrutural via keyword do usuário garante suggest-don't-execute por construção" — princípio reutilizável
- "Doc canônico único + skills só referenciam" como antídoto a drift quando N superfícies ensinam o mesmo conceito

---

## Lessons Captured

<!-- preencher ao /iterate: links para docs/compound/ -->

---

## Exit Criteria

- [ ] CA-01 a CA-07 do PRD validados via testes automatizados
- [ ] `bun run test` + `bun run typecheck` + `bunx biome check` verdes (NB: este repo NÃO tem `bun run lint` — usa biome; `bun run test` só descobre `*.test.{ts,tsx}`, então o teste de hook `.cjs` roda explicitamente)
- [ ] `bun run harness:validate` passa (WORKFLOWS.md existe+H1, AGENTS linka, AGENTS ≤ 70 linhas)
- [ ] Zero caminhos do `[WORKFLOW_ADVISOR]` emitem tool Workflow ou `decision:block` (grep + teste)
- [ ] PRD `status: approved` → `status: shipped` após merge

---

## Decisões do CONTEXT Aplicadas

| Decisão | Onde se aplica |
|---------|----------------|
| D1 — Escopo completo | Planos 01 (Must) + 02 (Should) + 03 (Could) |
| D2 — Regex conservador 100+/500+ | Plano 01 fase-01 (`SCALE_PATTERNS`) |
| D3 — Dispara sem verbo de implementação | Plano 01 fase-01 (branch antes do filtro SILENT) |
| D4 — Só user-prompt-gate (pre-mutation fora) | Plano 01 fase-01 (INV7) |
| D5 — Retrospectivo suavizado | Plano 03 (stop-reflector) |
| D6 — Teste de regressão | Plano 01 fase-04 (RF15) |
| D7 — Nomear /deep-research | Plano 01 fase-02 (doc) + Plano 02 (callouts) |
| D8 — Telemetria adiada | Won't (Scope Out) |
| D9 — Tag do banner "SKILL & WORKFLOW ADVISOR" | Plano 01 fase-03 |
| INV1 — Suprimir, não empilhar (escala+multi-domínio) | Plano 01 fase-01 (CA-07) |
| INV3 — AGENTS cap 70, só 1 linha | Plano 01 fase-03 |
| INV4 — WORKFLOWS.md antes de qualquer link | Plano 01 (fase-02 antes de fase-03) |
| INV6 — Prose-leak hardening | Plano 02 (plan-feature Step 7 + execute-plan callout) |

---

<!-- Gerado por /plan-feature em 2026-05-29 -->

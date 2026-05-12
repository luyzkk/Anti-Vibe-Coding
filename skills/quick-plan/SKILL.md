---
name: quick-plan
description: "Planejamento leve para tasks de complexidade media. Gera mini-plano de 3-7 passos no formato step/verify sem criar arquivos .planning/ ou spawnar subagentes. Alternativa ao pipeline completo (grill-me → plan-feature → execute-plan) para tarefas que nao justificam o overhead."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
argument-hint: "[descricao da task]"
---

```typescript
// === Telemetria passiva (Plano 03 fase-03) — nao remover sem registrar em MEMORY.md ===
// G5: telemetria SEMPRE ativa, ignora architectureDetectorEnabled
// G7: skill name canonico fixo

import { writeTelemetryStart, writeTelemetryEnd } from '../../lib/telemetry-utils'
import type { TelemetryStart, TelemetryEnd } from '../../lib/telemetry-types'

const __telemetry_skillName = 'quick-plan'
const __telemetry_fasePipeline = 'quick-plan'
const __telemetry_startTimestamp = new Date().toISOString()
const __telemetry_startMs = Date.now()

const __telemetry_startEntry: TelemetryStart = {
  evento: 'start',
  skill_invocada: __telemetry_skillName,
  timestamp_inicio: __telemetry_startTimestamp,
  profile_arquitetura: 'disabled',
  fase_pipeline: __telemetry_fasePipeline,
}

writeTelemetryStart(__telemetry_startEntry)
// === Fim do bloco de inicio ===
```

# Quick Plan — Planejamento Leve Inline

Skill de planejamento leve. Para tasks de complexidade media que nao justificam o pipeline completo mas se beneficiam de um plano antes de executar.

Diferenca das outras skills:
- **grill-me + plan-feature**: pipeline pesado com entrevista, PRD, PLAN.md, STATE.md, waves
- **quick-plan**: mini-plano inline de 3-7 passos, executa na mesma sessao, sem arquivos extras
- **sem planejamento**: codar direto (aceitavel para fixes triviais)

---

## Quando Usar

- Task toca 2-5 arquivos
- Nao ha ambiguidade critica sobre requisitos
- Complexidade media: nao trivial, mas nao precisa de PRD/waves
- Exemplos: adicionar validacao, criar endpoint simples, refatorar modulo, integrar lib

## Quando NAO Usar (sugerir pipeline completo)

- Task toca 6+ arquivos ou multiplos dominios → `/plan-feature`
- Requisitos ambiguos ou decisoes irreversiveis → `/grill-me`
- Feature complexa com multiplos stakeholders → `/write-prd`

---

## Step 1 — Entender a Task

```
1. Ler descricao fornecida pelo usuario
2. Se argumento foi passado, usar como descricao
3. Se nao, perguntar: "Descreva brevemente o que quer implementar."
4. Identificar: arquivos envolvidos, dependencias, riscos obvios
```

---

## Step 2 — Gerar Mini-Plano

Formato obrigatorio — cada passo tem acao + criterio de verificacao:

```
## Quick Plan: {nome da task}

1. [Acao concreta] → verify: [criterio verificavel]
2. [Acao concreta] → verify: [criterio verificavel]
3. [Acao concreta] → verify: [criterio verificavel]
...
N. Rodar testes e lint → verify: suite verde, zero erros de lint
```

Regras do plano:
- Minimo 3, maximo 7 passos
- Cada passo deve ser atomico (1 acao, 1 verificacao)
- Ultimo passo SEMPRE e validacao (testes + lint)
- TDD quando aplicavel: teste antes do codigo
- Criterio de verificacao deve ser objetivo (teste passa, arquivo existe, tipo compila)

---

## Step 3 — Confirmar com o Dev

Apresentar o plano e perguntar:

> "Plano acima esta ok? Posso executar step-by-step?"

Opcoes:
- "Executar" → prosseguir para Step 4
- "Ajustar" → modificar plano conforme feedback
- "Pipeline completo" → sugerir `/plan-feature` ou `/grill-me`

---

## Step 4 — Executar Step-by-Step

Para cada passo do plano:

```
1. Narrar ANTES de executar:
   "Step 1/N: [descricao] → verify: [criterio]"

2. Executar a acao (Write, Edit, Bash, etc.)

3. Verificar o criterio:
   - Se passou: "✓ Done."
   - Se falhou: diagnosticar, corrigir, tentar novamente (max 2 retries)
   - Se bloqueado: parar e informar

4. Avancar para proximo passo
```

Manter narracao minima — 1 linha por passo.

Se encontrar algo inesperado durante execucao: parar, sinalizar, e perguntar antes de adaptar.

---

## Step 5 — Validacao Final

Apos ultimo passo:

```
1. Rodar: bun run test (ou equivalente do projeto)
2. Rodar: bun run lint (ou equivalente)
3. Se tudo verde: "Quick plan concluido. Todos os passos verificados."
4. Se falhas: diagnosticar e corrigir antes de declarar completo
```

---

## Output Format (v6 — D18 reduzido)

<!-- 2026-05-12 (Luiz/dev): 04-G1 — Assumptions/Risks/Review Checklist omitidos intencionalmente.
     Sao overhead desnecessario para tasks de complexidade media (3-7 passos).
     Ambiguity 05-A5: se PRD especificar outras 7 secoes, alterar EXEC_PLAN_SECTIONS_QUICK em skills/lib/exec-plan-sections.ts -->
<!-- 2026-05-12 (Luiz/dev): 04-G2 — mode:quick no frontmatter permite validador (Plano 04) ter regra diferente
     ex: nao validar ausencia de ## Review Checklist como erro -->

```
1. Para tasks de complexidade media (3-7 passos), sem entrar em pipeline /plan-feature
2. Chamar renderExecPlan({ mode: 'quick', ... }) — 7 secoes
3. Escrever em docs/exec-plans/active/YYYY-MM-DD-{slug}.md
4. Secoes (case-sensitive):
   Goal, Scope, Execution Steps, Validation Log,
   Compound Opportunity, Lessons Captured, Exit Criteria
5. Assumptions, Risks, Review Checklist OMITIDAS (over-engineering para tasks medias)
```

---

## Completion Signal (D33)

Ao finalizar o output principal (criacao do mini-plano), a skill emite automaticamente um bloco YAML machine-readable via `console.log`. Orquestradores podem extrair o sinal usando `extractCompletionSignal(output)`.

```typescript
import { renderCompletionSignal } from '../lib/completion-signal'
console.log('\n\n' + renderCompletionSignal({
  skill: 'quick-plan',
  status: 'complete',
  outputs: [/* filePath do plano criado */],
  next_suggested: '/execute-plan',
  blocks_for_user: [],
}))
```

---

## O que Este Skill NAO Faz

- NAO cria arquivos em `.planning/` (PLAN.md, STATE.md, etc.)
- NAO spawna subagentes
- NAO entra em waves ou vertical slices
- NAO substitui o pipeline para features complexas
- NAO pula TDD — testes continuam obrigatorios quando aplicavel

```typescript
// === Telemetria passiva (Plano 03 fase-03) — registra fim ===

const __telemetry_endEntry: TelemetryEnd = {
  evento: 'end',
  skill_invocada: __telemetry_skillName,
  timestamp_inicio: __telemetry_startTimestamp,
  timestamp_fim: new Date().toISOString(),
  duracao_ms: Date.now() - __telemetry_startMs,
  profile_arquitetura: 'disabled',
  fase_pipeline: __telemetry_fasePipeline,
  tokens_aproximados_consumidos: 0,
  arquivos_lidos: 0,
  arquivos_modificados: 0,
  sucesso: true,
}

writeTelemetryEnd(__telemetry_endEntry)
// === Fim do bloco de fim ===
```

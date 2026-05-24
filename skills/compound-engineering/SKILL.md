---
name: compound-engineering
description: "This skill should be used when the user asks to 'install compound engineering scaffold', 'run compound gate', 'migrate compound schema', or 'check compound notes'. Manages the compound engineering scaffold (templates, decision gate, brownfield migration) and delegates capture to lessons-learned."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Write, Edit, Skill
argument-hint: "install|check|gate|migrate [--strict] [--force]"
---

<!-- profile-aware-preface:start -->
```typescript
// 2026-05-15 (Luiz/dev): Plano 04 fase-02 — profile-aware-preface (PRD §RF-SH-05).
// Mesmo pattern de /security (fase-01); per-skill lookup; fallback v6.2 quando profile null.

import { readPrefaceContext } from '../lib/preface-context'
import { COMPOUND_ENGINEERING_PREFACE_BY_PROFILE, DEFAULT_COMPOUND_ENGINEERING_PREFACE } from './lib/compound-engineering-prefaces'

const ctx = readPrefaceContext(process.cwd())
const preface = ctx.profile
  ? (COMPOUND_ENGINEERING_PREFACE_BY_PROFILE[ctx.profile] ?? DEFAULT_COMPOUND_ENGINEERING_PREFACE)
  : DEFAULT_COMPOUND_ENGINEERING_PREFACE
```

Se `preface` for não-vazio, prepend ao corpo da skill (inicie sua resposta com o preface e prossiga com a operação normal).
Se vazio (profile null), comportamento v6.2 intacto — sem preface (CA-02).
<!-- profile-aware-preface:end -->

<!-- stale-capabilities-check:start -->
```typescript
// 2026-05-15 (Luiz/dev): wire-up CA-09 v6.3.0 (closed em v6.3.1 RF-SH-02) — non-blocking warning.
// G2 do plano02: NUNCA bloqueia execução — alinhado com stale-detector.ts:8-10.
// G6 do plano02: capabilities.json AUSENTE NÃO emite warning falso (silently null).
// G7 do plano02: shape atual de capabilities.json não tem `storedChecksums` — check direto por age.
// SYNC: logica espelhada em skills/lib/__tests__/stale-warning.test.ts:checkStaleCapabilities.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const __STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h — CA-09 PRD v6.3.1

function __readCapabilitiesGeneratedAt(projectRoot: string): string | null {
  try {
    const raw = readFileSync(join(projectRoot, 'discovery', 'capabilities.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { generated_at?: unknown }
    return typeof parsed.generated_at === 'string' ? parsed.generated_at : null
  } catch {
    return null
  }
}

const __caps_generated_at = __readCapabilitiesGeneratedAt(process.cwd())
if (__caps_generated_at !== null) {
  const __age = Date.now() - new Date(__caps_generated_at).getTime()
  if (Number.isFinite(__age) && __age > __STALE_THRESHOLD_MS) {
    process.stderr.write('capabilities.json stale (>24h) — run /init --refresh\n')
  }
}
```
<!-- stale-capabilities-check:end -->

# Compound Engineering — Anti-Vibe Coding

Gerenciar o scaffold de compound engineering (templates, decision gate, migração brownfield).
Delega captura de novas entradas para a skill `lessons-learned`.

## Subcomandos

- `install [--force]` — Instala o scaffold compound no projeto consumidor. _Plano 03 fase-01_
- `check [--strict]` — Verifica integridade das compound notes existentes. _Plano 03 fase-02_
- `gate` — Executa o decision gate antes de merge (invoca `lessons-learned`). _Plano 03 fase-03_
- `migrate` — Migra notas de formato legado para o schema canônico. _Plano 03 fase-04_

## Acao solicitada

$ARGUMENTS

### Subcomando: install

Quando `args` comeca com `install`:

1. Detecta target root (`process.cwd()` por default).
2. Parse `--force` em `args.includes('--force')`.
3. Invoca `installCompound(targetRoot, { force })` de `skills/compound-engineering/lib/installer.ts`.
4. Renderiza output:
   - `Created: <list>` (se `result.created.length > 0`)
   - `Overwritten: <list>` (se `result.overwritten.length > 0`)
   - `Skipped existing files (use --force to overwrite): <list>` (se `result.skipped.length > 0`)
   - `result.notes` (uma linha por nota, ex: mensagem stack-agnostic sem package.json)

### Subcomando: check

Quando `args` comeca com `check`:

1. Parse `--strict` em `args.includes('--strict')`.
2. Invoca `runCompoundCheck(targetRoot, { strict })` de `skills/compound-engineering/lib/checker.ts`.
3. Repassa exit code e output (stdout/stderr) ao caller.
4. Se `--strict` e qualquer das 3 regras falhar, output inclui prefixo identificador da regra: `[agents-link]`, `[plan-generator]`, `[active-plan]`.

### Subcomando: gate

Quando `args` comeca com `gate`:

1. Invoca `detectActivePlan(targetRoot)` de `skills/compound-engineering/lib/active-plan-detector.ts`.
2. Se `status === 'none'`: imprime `No active plan found. Run /plan-feature first or specify --plan path.` e retorna.
3. Se `status === 'multiple'`: usa `AskUserQuestion` com cada plano como opcao (singleSelect) para obter `selectedPlanPath`.
4. Faz 3 perguntas ao dev (uma de cada vez via `AskUserQuestion`):
   - "Algum bug aprendido aqui que outro dev/agente futuro poderia ter evitado se soubesse?"
   - "Algum review/checklist falhou de forma que indica padrao repetivel?"
   - "Algum issue de producao/operacional revelado durante esta feature?"
5. Se qualquer resposta for 'sim': pergunte titulo curto descritivo. Invoca Skill tool nativa:
   `Skill({ skill: 'anti-vibe-coding:lessons-learned', args: 'add "<titulo>"' })`
   Em seguida invoca `updateLessonsCaptured(planPath, ...)` de `skills/compound-engineering/lib/lessons-captured-updater.ts` com o link para a nota criada.
6. Se todos 'nao': pergunta razao curta. Invoca `updateLessonsCaptured(planPath, 'no compound capture needed because: <razao>')`.

Nota: `runGate` em `skills/compound-engineering/lib/gate.ts` encapsula esta logica para testes — o SKILL.md runtime substitui `invokeSkill` pela Skill tool nativa.

7. Emite bloco YAML machine-readable no final do output (SH-07):
   ```typescript
   import { renderCompletionSignal } from '../lib/completion-signal'
   // status='complete' se capturado, 'in_progress' se no-capture
   const signal = renderCompletionSignal({
     skill: 'anti-vibe-coding:compound-engineering',
     status: 'complete',
     outputs: [notePath, planPath],
     next_suggested: null,
     blocks_for_user: [],
   })
   // signal e appendado ao result.message — orquestradores parseiam via extractCompletionSignal()
   ```

### Subcomando: migrate

Quando `args` comeca com `migrate`:

1. Invoca `runMigrate(targetRoot)` de `skills/compound-engineering/lib/migrate.ts`.
2. Renderiza output:
   - Se `readmeMigrated`: `Fixed schema in docs/compound/README.md.`
   - Se `notesWithIssues > 0`: `Inconsistencies report saved to docs/compound/migration-report.md ({N} notes need manual review).`
   - Se ambos zero: `No legacy schema detected. No migration needed.`

<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
-->

# Fase 06: Completion signal + consolidacao de edge cases

**Plano:** 03 — Subcomandos + Patches
**Sizing:** 1h
**Depende de:** fase-01..fase-05 (todos os subcomandos e patches operacionais)
**Visual:** false

---

## O que esta fase entrega

Completion signal YAML machine-readable adicionado ao output do `gate` (SH-07), telemetria `writeTelemetryStart/End` validada em todos os 4 subcomandos e suite consolidada de edge cases (CA-18 zero planos, CA-19 multiplos planos, CA-20 sem package.json) reunida em um arquivo de teste E2E. `bun test && bun run lint` verde no main.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/compound-engineering/lib/gate.ts` | Modify | Adiciona `renderCompletionSignal()` no fim do output (SH-07) |
| `skills/compound-engineering/lib/gate.test.ts` | Modify | Adiciona assertion sobre presenca de bloco YAML completion |
| `skills/compound-engineering/SKILL.md` | Modify | Validar bloco telemetria literal de lessons-learned em todos os subcomandos (R10) |
| `tests/e2e/compound-engineering-edge-cases.test.ts` | Create | Suite E2E consolidando CA-18/19/20 com fixtures isoladas |
| `tests/fixtures/compound-edge-no-plans/` | Create | Fixture sem `docs/exec-plans/active/` (CA-18) |
| `tests/fixtures/compound-edge-multiple-plans/` | Create | Fixture com 2+ planos ativos (CA-19) |
| `tests/fixtures/compound-edge-no-pkgjson/` | Create | Fixture sem `package.json` (CA-20) |

---

## Implementacao

### Passo 1: Adicionar completion signal em `gate.ts`

```typescript
// 2026-05-23 (Luiz/dev): completion signal YAML — PRD SH-07 + D33 padrao lessons-learned
import { renderCompletionSignal } from '../../lib/completion-signal'

// dentro de runGate, antes de cada return final:
const signal = renderCompletionSignal({
  skill: 'anti-vibe-coding:compound-engineering',
  subcommand: 'gate',
  status: result.status === 'captured' || result.status === 'no-capture' ? 'complete' : 'partial',
  artifacts: {
    plan_path: result.planPath,
    note_path: result.notePath,
  },
})
// Append ao output do gate — orquestradores parseiam para encadear pipeline
result.message = `${result.message}\n\n${signal}`
return result
```

**Nota:** assinatura exata de `renderCompletionSignal` deve ser verificada em `skills/lib/completion-signal.ts`. Se a API atual difere, adaptar o payload sem mudar o spirit do SH-07.

### Passo 2: Validar telemetria em todos os subcomandos

Em cada subcomando do `SKILL.md` deve haver:

```markdown
1. (inicio) Invoca `writeTelemetryStart({ skill: 'compound-engineering', subcommand: '<install|check|gate|migrate>' })`
2. (fim) Invoca `writeTelemetryEnd({ ..., status: 'success' | 'error' })`
```

Acao: grep no `SKILL.md` por `writeTelemetryStart` e `writeTelemetryEnd` — deve haver 1 par por subcomando (4 pares = 8 ocorrencias minimas). Se faltar em algum subcomando, completar nesta fase (R10 mitigacao).

### Passo 3: Suite E2E de edge cases

Criar `tests/e2e/compound-engineering-edge-cases.test.ts`:

```typescript
// 2026-05-23 (Luiz/dev): consolida CA-18/19/20 — PRD edge cases
import { describe, test, expect } from 'bun:test'
import path from 'node:path'
import { runGate } from '../../skills/compound-engineering/lib/gate'
import { installCompound } from '../../skills/compound-engineering/lib/installer'

describe('compound-engineering edge cases', () => {
  test('CA-18: gate em projeto sem planos ativos retorna no-plan', async () => {
    const root = path.resolve(__dirname, '../fixtures/compound-edge-no-plans')
    const result = await runGate(root, /* answers */ { /* no-op */ } as any, async () => '')
    expect(result.status).toBe('no-plan')
    expect(result.message).toContain('No active plan found')
  })

  test('CA-19: gate em projeto com 2+ planos pede selecao', async () => {
    const root = path.resolve(__dirname, '../fixtures/compound-edge-multiple-plans')
    const result = await runGate(root, {} as any, async () => '')
    expect(result.status).toBe('multiple-plans')
  })

  test('CA-20: install em projeto sem package.json adiciona nota standalone', async () => {
    const root = path.resolve(__dirname, '../fixtures/compound-edge-no-pkgjson')
    const result = await installCompound(root, { force: false })
    expect(result.notes.some((n) => n.includes('No package.json detected'))).toBe(true)
  })
})
```

### Passo 4: Criar fixtures

Estrutura minima:

- `tests/fixtures/compound-edge-no-plans/` — diretorio vazio com `docs/.gitkeep` (sem `exec-plans/active/`)
- `tests/fixtures/compound-edge-multiple-plans/docs/exec-plans/active/2026-01-01-foo/PLAN.md` + `2026-01-02-bar/PLAN.md` (2 planos)
- `tests/fixtures/compound-edge-no-pkgjson/` — `AGENTS.md` minimo + zero `package.json`

### Passo 5: Verificacao final do plano inteiro

Rodar suite completa:

```bash
bun test
bun run lint
bun run typecheck   # se configurado
```

Validar:
- CA-17 (one-way dependency): `grep -r "from '../../init/" skills/compound-engineering/` retorna 0
- CA-16 (sem subprocess para lessons-learned): `grep -rE "Bun.spawn|child_process" skills/compound-engineering/lib/gate.ts skills/compound-engineering/lib/invoke-lessons-learned.ts` retorna 0
- Goldens E2E init verdes (legado do Plano 02 fase-03)

---

## Gotchas

- **G8 do README (SH-07):** `renderCompletionSignal` ja existe em `skills/lib/completion-signal.ts` (usado por `lessons-learned`). Reuse direto — nao duplicar.
- **Local — telemetria boilerplate (R10):** Se algum subcomando esqueceu `writeTelemetryStart/End`, esta fase preenche. Modelo: copiar literal dos pares de `lessons-learned/SKILL.md`.
- **Local — fixtures minimas:** evitar fixtures pesadas. CA-18 = 1 diretorio vazio; CA-19 = 2 subdirs cada com PLAN.md vazio; CA-20 = 0 arquivos `package.json`.
- **Local — assercao do completion signal:** parsear o bloco YAML do output e validar campos `skill: anti-vibe-coding:compound-engineering`, `subcommand: gate`, `status: complete|partial`.

---

## Verificacao

### TDD

- [ ] **RED:** assertion sobre presenca de bloco YAML completion em `gate.test.ts` falha antes da modificacao
  - Comando: `bun test skills/compound-engineering/lib/gate.test.ts --grep 'completion signal'`
  - Resultado esperado: `Expected message to match /```yaml[\s\S]*status:/`, recebido string sem yaml (assertion failure)

- [ ] **GREEN:** completion signal adicionado, teste passa
  - Comando: `bun test skills/compound-engineering/lib/gate.test.ts`
  - Resultado esperado: todos os testes do arquivo verdes

### Checklist

- [ ] SH-07: output do `gate` contem bloco ```yaml com campos `skill`, `subcommand`, `status`
- [ ] R10: todos os 4 subcomandos (install/check/gate/migrate) tem par `writeTelemetryStart/End` no SKILL.md
- [ ] CA-18: fixture sem planos ativos → `runGate` retorna `status: 'no-plan'` + mensagem literal
- [ ] CA-19: fixture com 2 planos → `runGate` retorna `status: 'multiple-plans'`
- [ ] CA-20: fixture sem `package.json` → `installCompound` retorna `notes` contendo `No package.json detected`
- [ ] CA-16 (grep): `gate.ts` + `invoke-lessons-learned.ts` zero `Bun.spawn`/`child_process`
- [ ] CA-17 (grep): `skills/compound-engineering/**/*.ts` zero `from '../../init/`
- [ ] `bun test` full suite verde (incluindo goldens init do Plano 02)
- [ ] `bun run lint` verde

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/compound-engineering-edge-cases.test.ts` retorna 3 passed (CA-18/19/20)
- `bun test` full suite verde
- `bun run lint` retorna 0 errors
- `grep -r "from .\.\./\.\./init/" skills/compound-engineering/` retorna 0 (CA-17)
- `grep -rE "Bun\.spawn|child_process" skills/compound-engineering/lib/gate.ts skills/compound-engineering/lib/invoke-lessons-learned.ts` retorna 0 (CA-16)
- Output do `runGate` capturado nos testes contem `\`\`\`yaml` + `status:` (SH-07)

**Por humano:**
- Exit Criteria do PLAN.md (overview) atendidos: 6 MH com CA verde, 7 SH implementados, PR descricao lista 3 patches (P1/P2/P3)

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

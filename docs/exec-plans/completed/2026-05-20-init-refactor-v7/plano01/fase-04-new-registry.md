<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: Novo Registry (10 Steps — 8 Stubs + Step 1 Gate + Step 2 Detect)

**Plano:** 01 — Foundation + Tracer + Cleanup
**Sizing:** 1.5h
**Depende de:** fase-02 (Step 2 detect implementado), fase-03 (Step 1 gate implementado)
**Visual:** false

---

## O que esta fase entrega

`skills/init/lib/registry.ts` reescrito com 10 entries na ordem D12 (revisada por DV-1 e DV-3).
Steps 1 e 2 sao reais (gate + detect); os outros 8 sao stubs que apenas logam
"step N stub" e retornam `{ mutated: false, summary }`. Esta eh a base sobre a qual o tracer
(fase-06) prova que o pipeline novo executa ponta-a-ponta ANTES de qualquer logica real
(Planos 02-05) e ANTES do delete dos 15 obsoletos (fase-05).

**Mudanca vs versao original (8 steps):**
- DV-3 separou gate em Step 1 proprio → era 8, virou 9
- DV-1 manteve secrets-scan como step proprio (Step 3) → virou 10
- Pipeline tem **10 steps** (era 8 no PRD inicial). Refletido no PLAN.md overview.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/registry.ts` | Modify (rewrite) | Substituir os 21 imports atuais por 10 imports (2 reais + 8 stubs) na ordem D12 revisada |
| `skills/init/lib/steps/03-secrets-scan.ts` | Create | Stub Step 3 (DV-1 — Plano 02 implementa real) |
| `skills/init/lib/steps/04-migrate-planning-and-manifest.ts` | Create | Stub Step 4 |
| `skills/init/lib/steps/05-scaffold-and-link.ts` | Create | Stub Step 5 |
| `skills/init/lib/steps/06-install-gh-files.ts` | Create | Stub Step 6 |
| `skills/init/lib/steps/07-generate-populate-plans.ts` | Create | Stub Step 7 |
| `skills/init/lib/steps/08-delivery-loop.ts` | Create | Stub Step 8 |
| `skills/init/lib/steps/09-copy-knowledge.ts` | Create | Stub Step 9 |
| `skills/init/lib/steps/10-final-validation.ts` | Create | Stub Step 10 |
| `skills/init/lib/registry.test.ts` | Modify | Asserts: registry tem exatamente 10 entries, ids batem com lista D12 revisada, ordem preservada |

> **NOTA sobre conflicts:** existem hoje arquivos com nomes proximos (ex: `06-secrets-scan.ts`,
> `05-install-gh-files.ts`, `14-delivery-loop.ts`, `90-final-validation.ts`,
> `91-generate-populate-plan.ts`). Estes serao DELETADOS na fase-05. Conflitos diretos previstos:
> - `06-install-gh-files.ts` (novo) vs `05-install-gh-files.ts` (antigo) — numeros diferentes, OK
> - `03-secrets-scan.ts` (novo) vs `06-secrets-scan.ts` (antigo) — numeros diferentes, OK
>
> Se houver colisao literal (ex: arquivo com mesmo numero+nome), a fase-04 renomeia o novo para
> `NN-XXX-stub.ts` provisoriamente e a fase-05 corrige apos o delete.

---

## Implementacao

### Passo 1: Criar os 8 stubs (template identico)

```typescript
// skills/init/lib/steps/03-secrets-scan.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — STUB. Logica real em Plano 02 (DV-1).
// DV-1: secrets-scan mantido como step proprio (era candidato a inline no Step 2 detect).
// Razao: scan tem custo de I/O proprio e SRP — gate/detect/scan sao concerns distintos.
import type { Step } from './types'

export const secretsScanStep: Step = {
  id: 'secrets-scan',
  async run(_ctx) {
    return { mutated: false, summary: 'step 3 stub (Plano 02 implementa secrets-scan real)' }
  },
}
```

Repetir o template para:

| Arquivo | id | Plano que implementa |
|---------|-----|----------------------|
| `04-migrate-planning-and-manifest.ts` | `'migrate-planning-and-manifest'` | Plano 02 |
| `05-scaffold-and-link.ts` | `'scaffold-and-link'` | Plano 03 |
| `06-install-gh-files.ts` | `'install-gh-files'` | Plano 03 |
| `07-generate-populate-plans.ts` | `'generate-populate-plans'` | Plano 04 (CORE) |
| `08-delivery-loop.ts` | `'delivery-loop'` | Plano 05 |
| `09-copy-knowledge.ts` | `'copy-knowledge'` | Plano 05 |
| `10-final-validation.ts` | `'final-validation'` | Plano 05 |

Mensagem do summary deve incluir o plano que vai implementar — facilita debug futuro.

### Passo 2: Reescrever registry.ts

```typescript
// skills/init/lib/registry.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — registry novo v7.
// Ordem D12 revisada (DV-1 + DV-3): 10 steps. Steps 1-2 reais, 8 stubs (Plano 02-05 implementam).
// G1 do README: este arquivo eh o ponto que isola os 15+ steps obsoletos antes do delete da fase-05.
// Apos esta fase, nenhum dos steps a deletar eh importado por codigo de producao.
import type { Step } from './steps/types'
import { reentryGateStep } from './steps/01-reentry-gate'
import { detectLegacyAndStackStep } from './steps/02-detect-legacy-and-stack'
import { secretsScanStep } from './steps/03-secrets-scan'
import { migratePlanningAndManifestStep } from './steps/04-migrate-planning-and-manifest'
import { scaffoldAndLinkStep } from './steps/05-scaffold-and-link'
import { installGhFilesStep } from './steps/06-install-gh-files'
import { generatePopulatePlansStep } from './steps/07-generate-populate-plans'
import { deliveryLoopStep } from './steps/08-delivery-loop'
import { copyKnowledgeStep } from './steps/09-copy-knowledge'
import { finalValidationStep } from './steps/10-final-validation'

export const registry: readonly Step[] = [
  reentryGateStep,                // Step 1 — REAL (Plano 01 fase-03, DV-3)
  detectLegacyAndStackStep,       // Step 2 — REAL (Plano 01 fase-02)
  secretsScanStep,                // Step 3 — STUB (Plano 02, DV-1)
  migratePlanningAndManifestStep, // Step 4 — STUB (Plano 02)
  scaffoldAndLinkStep,            // Step 5 — STUB (Plano 03)
  installGhFilesStep,             // Step 6 — STUB (Plano 03)
  generatePopulatePlansStep,      // Step 7 — STUB (Plano 04, CORE)
  deliveryLoopStep,               // Step 8 — STUB (Plano 05)
  copyKnowledgeStep,              // Step 9 — STUB (Plano 05)
  finalValidationStep,            // Step 10 — STUB (Plano 05)
]
```

### Passo 3: Atualizar registry.test.ts

```typescript
// skills/init/lib/registry.test.ts
import { describe, test, expect } from 'bun:test'
import { registry } from './registry'

describe('registry v7 (Plano 01 fase-04)', () => {
  test('exatamente 10 steps (D12 revisada por DV-1 + DV-3)', () => {
    expect(registry.length).toBe(10)
  })

  test('ids batem com ordem D12 revisada', () => {
    const ids = registry.map(s => s.id)
    expect(ids).toEqual([
      'reentry-gate',
      'detect-legacy-and-stack',
      'secrets-scan',
      'migrate-planning-and-manifest',
      'scaffold-and-link',
      'install-gh-files',
      'generate-populate-plans',
      'delivery-loop',
      'copy-knowledge',
      'final-validation',
    ])
  })

  test('Steps 1-2 sao reais; Steps 3-10 sao stubs (summary contem "stub")', async () => {
    // Steps reais (indices 0, 1): summary nao tem palavra "stub"
    // Stubs (indices 2-9): summary contem "stub"
    for (let i = 2; i < 10; i++) {
      const ctx = { cwd: process.cwd(), args: [], flags: {} } as any
      const report = await registry[i]!.run(ctx)
      expect(report.summary).toContain('stub')
      expect(report.mutated).toBe(false)
    }
  })
})
```

> **Cuidado no teste "Steps 1-2 sao reais":** o teste do Step 1 (reentry-gate) chamando `run`
> em `process.cwd()` pode disparar AbortError se o repo tiver `.claude/legacy-manifest.json`.
> Por isso o loop comeca em `i = 2` — Step 1 nao eh smoke-testado aqui (cobertura em
> `01-reentry-gate.test.ts`).

### Passo 4: Verificar que run-init.ts ainda funciona (smoke)

`run-init.ts` faz `lazyImport(() => import('./registry'))` — sem mudancas necessarias.
Apos esta fase:

```bash
bun test skills/init/lib/registry.test.ts
bun build skills/init/lib/registry.ts --target=bun --outdir=/tmp/build-check
```

Se `bun build` falhar com import nao resolvido de algum step deletado, indica que algum
import perdido nao foi removido. Investigar antes de prosseguir.

---

## Gotchas

- **G1 (G5 do README):** Stubs devem ser MINIMOS. Sem side effects, sem ctx mutation, sem
  escrita. Apenas `return { mutated: false, summary: 'step N stub (...)' }`.
- **G2 (G7 do README):** `run-init.ts` linhas 71-95 (WriteRecorder + dry-run + audit) sao codigo
  vestigial v6.x. NAO removidos nesta fase (escopo: Plano 05). Stubs precisam tolerar receber
  `ctx.flags['__auditLog']` e `ctx.flags['__dryRunRecorder']` sem quebrar — como nao usam, OK.
- **G3 (cross-upgrade detector):** `run-init.ts` linhas 97-125 leem `package.json` para versao —
  isso continua funcionando independente do registry. NAO tocar.
- **G4 (Step 1 nao smoke-testado no registry.test):** registry.test.ts pula i=0 no loop de stubs
  porque Step 1 real (reentry-gate) faz `fs.stat` em `process.cwd()` e pode disparar abort se
  o repo tiver um `.claude/legacy-manifest.json` por engano. Cobertura do Step 1 esta em
  `01-reentry-gate.test.ts` (isolada via mkdtemp).
- **G5 (registry.test.ts pre-existente):** o teste atual em `registry.test.ts` cobre estado v6.7 — sera totalmente reescrito nesta fase. Backup do conteudo antigo via git history.
- **G6 (DV-1):** secrets-scan eh STUB nesta fase, mas a logica real do step antigo
  (`06-secrets-scan.ts`) sera portada no Plano 02. O step antigo eh deletado em fase-05 — entre
  fase-04 e fase-05 ele esta no disco mas nao eh importado.

---

## Verificacao

### TDD

- [ ] **RED:** Teste "exatamente 10 steps" falha — registry atual tem 21
  - Comando: `bun test skills/init/lib/registry.test.ts --grep "exatamente 10"`
  - Resultado esperado: `Expected 21 to be 10`

- [ ] **GREEN:** Registry reescrito, 8 stubs criados, 3 testes passam
  - Comando: `bun test skills/init/lib/registry.test.ts`
  - Resultado esperado: `3 pass, 0 fail`

### Checklist

- [ ] `skills/init/lib/registry.ts` tem exatamente 10 entries (`wc -l` < 25 linhas total esperado)
- [ ] Zero imports dos 15+ steps a deletar no registry.ts (grep dos nomes antigos limpo)
- [ ] 8 stubs criados, todos seguem o mesmo template, todos retornam summary contendo "stub"
- [ ] `bun test skills/init/lib/registry.test.ts` verde (3 testes)
- [ ] `bun test skills/init/lib/steps/01-reentry-gate.test.ts` continua verde (3 testes)
- [ ] `bun test skills/init/lib/steps/02-detect-legacy-and-stack.test.ts` continua verde (4 testes)
- [ ] `bun run lint` limpo
- [ ] `bun build skills/init/lib/registry.ts --target=bun --outdir=/tmp/build-check` sucesso

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/registry.test.ts` retorna `3 pass, 0 fail`
- `wc -l skills/init/lib/registry.ts` < `35`
- `grep -c "reuseDiscovery\|backupPre\|migrate0\|migrateAll\|migrate1\|migrate2\|migrate3\|migrate4\|capabilitiesDiscovery\|customizeArchitecture\|detectStackAndRegister\|persistStackKnowledge\|importProgressTxt" skills/init/lib/registry.ts` retorna `0`

**Por humano:**
- Code review confirma que cada stub eh literal copy-paste do template (zero variacao alem do id)

---

<!-- Gerado por /plan-feature em 2026-05-20, revisto apos DV-1 + DV-3 em 2026-05-21 -->

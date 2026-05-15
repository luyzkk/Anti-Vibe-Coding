# Fase 04: Tracer Bullet — Migration Entrypoint End-to-End

**Plano:** 01 — Fundação: Category Field + Detection + Tracer Bullet
**Sizing:** 2h
**Depende de:** fase-03 (SKILL.md tem Step migration.0 stub que referencia migration-tracer.ts)
**Visual:** false

---

## O que esta fase entrega

Implementa `skills/init/lib/migration-tracer.ts` — o Tracer Bullet completo que prova a
arquitetura end-to-end sem subagentes LLM:

1. Chama `detectInitMode` para confirmar que está em modo `migration`
2. Gera 1 arquivo de migration plan em `docs/exec-plans/active/{date}-migration-plan.md` com as
   10 seções do template `new-plan.ts` (shape canônico de André Prado)
3. Escreve `initMode: "migration"` em `.claude/.anti-vibe-manifest.json`

O resultado é um plano executável pelo operador humano, não por subagentes. Prova que detection
→ plano → manifest funciona antes de investir nas fases LLM (Planos 02/03).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/migration-tracer.ts` | Criar | Tracer Bullet: detecta → gera plano → escreve manifest |
| `skills/init/lib/migration-tracer.test.ts` | Criar | Teste end-to-end com fixture de repo simulado |

---

## Implementacao

### Passo 1: Escrever teste RED antes de criar o módulo

Criar `skills/init/lib/migration-tracer.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runMigrationTracer } from './migration-tracer'

// Helper: cria um repo fixture com docs/ populado (simula 3rd state)
async function createMigrationFixture(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-tracer-'))

  // Popular docs/ com 6 arquivos .md não-harness
  await fs.mkdir(path.join(dir, 'docs'), { recursive: true })
  await fs.mkdir(path.join(dir, 'docs', 'design-docs'), { recursive: true })
  await fs.writeFile(path.join(dir, 'docs', 'ARCHITECTURE.md'), '# Architecture\n\nConteudo existente.')
  await fs.writeFile(path.join(dir, 'docs', 'API.md'), '# API Docs\n\nEndpoints.')
  await fs.writeFile(path.join(dir, 'docs', 'design-docs', 'ADR-001-escolha-de-framework.md'), '# ADR-001')
  await fs.writeFile(path.join(dir, 'docs', 'design-docs', 'ADR-002-banco-de-dados.md'), '# ADR-002')
  await fs.writeFile(path.join(dir, 'docs', 'DEPLOYMENT.md'), '# Deploy guide')
  await fs.writeFile(path.join(dir, 'docs', 'ONBOARDING.md'), '# Onboarding')

  return dir
}

describe('runMigrationTracer', () => {
  let fixture: string

  beforeEach(async () => {
    fixture = await createMigrationFixture()
  })

  afterEach(async () => {
    await fs.rm(fixture, { recursive: true, force: true })
  })

  it('returns ok status for a migration-mode repo', async () => {
    const result = await runMigrationTracer(fixture)
    expect(result.status).toBe('ok')
  })

  it('creates migration plan file in docs/exec-plans/active/', async () => {
    const result = await runMigrationTracer(fixture)
    expect(result.planPath).toBeTruthy()
    const exists = await fs.access(result.planPath).then(() => true).catch(() => false)
    expect(exists).toBe(true)
  })

  it('migration plan has all 10 sections from new-plan.ts template', async () => {
    const result = await runMigrationTracer(fixture)
    const content = await fs.readFile(result.planPath, 'utf8')
    const requiredSections = [
      '## Goal',
      '## Scope',
      '## Assumptions',
      '## Risks',
      '## Execution Steps',
      '## Review Checklist',
      '## Validation Log',
      '## Compound Opportunity',
      '## Lessons Captured',
      '## Exit Criteria',
    ]
    for (const section of requiredSections) {
      expect(content).toContain(section)
    }
  })

  it('writes .anti-vibe-manifest.json with initMode migration', async () => {
    const result = await runMigrationTracer(fixture)
    expect(result.manifestPath).toBeTruthy()
    const raw = await fs.readFile(result.manifestPath, 'utf8')
    const manifest = JSON.parse(raw)
    expect(manifest.initMode).toBe('migration')
  })

  it('manifest includes installedAt ISO timestamp', async () => {
    const result = await runMigrationTracer(fixture)
    const raw = await fs.readFile(result.manifestPath, 'utf8')
    const manifest = JSON.parse(raw)
    expect(typeof manifest.installedAt).toBe('string')
    expect(new Date(manifest.installedAt).getFullYear()).toBeGreaterThanOrEqual(2026)
  })

  it('returns wrong-mode error when project is not in migration mode', async () => {
    // Repo greenfield (docs/ ausente) — não deve executar tracer
    const greenDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-green-'))
    try {
      const result = await runMigrationTracer(greenDir)
      expect(result.status).toBe('wrong-mode')
      expect(result.detectedMode).not.toBe('migration')
    } finally {
      await fs.rm(greenDir, { recursive: true, force: true })
    }
  })
})
```

Rodar para confirmar RED: `bun run test -- --grep 'runMigrationTracer'`

### Passo 2: Tipos e contratos do tracer

```typescript
// migration-tracer.ts

import type { InitMode } from './migration-mode-detector'

export type MigrationTracerResult =
  | {
      status: 'ok'
      /** Path absoluto do migration plan criado. */
      planPath: string
      /** Path absoluto do manifest criado/atualizado. */
      manifestPath: string
      /** Modo detectado (sempre 'migration' em status ok). */
      detectedMode: 'migration'
    }
  | {
      status: 'wrong-mode'
      /** Modo real detectado (não era migration). */
      detectedMode: InitMode
      planPath: null
      manifestPath: null
    }
  | {
      status: 'error'
      error: string
      planPath: null
      manifestPath: null
    }
```

### Passo 3: Shape do migration plan (10 seções canônicas)

O template é baseado em `scripts/new-plan.ts` (porta do `new-plan.mjs` do André Prado — DT-08).
As 10 seções são exatamente as do `content` em `new-plan.ts`:

```typescript
function buildMigrationPlanContent(projectName: string, docCount: number, date: string): string {
  return `# Migration Plan: ${projectName} → Anti-Vibe Coding

## Goal

Map existing institutional documentation (${docCount} files detected in docs/) to the
Anti-Vibe Coding harness structure (22 André Prado canon files + 4 anti-vibe extensions).
Each mapped file becomes a migration task in Execution Steps.

## Scope

- In scope: all .md files in docs/ and root not generated by the harness scaffold
- Out of scope: source code files, .env, secrets, binaries, node_modules

## Assumptions

- Existing docs contain institutional knowledge worth preserving (not auto-generated)
- No Anti-Vibe Coding harness is currently installed in this project
- Operator will review each migration step before executing

## Risks

- Existing docs may partially overlap with canon files (conflict resolution needed per file)
- Some docs may have no direct mapping to canon — will be placed in docs/design-docs/ as ADRs
- Migration is additive: existing files are not deleted, harness files are added alongside

## Execution Steps

1. Run \`/anti-vibe-coding:init\` with migration pipeline (Phases 1-3 via subagents) to generate
   per-file migration plans — or execute manually following the steps below.
2. For each file in docs/ that maps to a canon slot: review overlap, merge content, write to
   the canon destination (e.g., docs/DESIGN.md, docs/SECURITY.md).
3. For each file with no canon mapping: create ADR in docs/design-docs/ADR-NNNN-{slug}.md
   preserving the original content under Context/Decision/Consequences sections.
4. Install Anti-Vibe Coding harness: run \`/anti-vibe-coding:init --force-migration-complete\`
   to scaffold remaining canon files (empty templates for unmapped slots).
5. Run \`bun run harness:validate\` to confirm all required canon files are present.
6. Update \`.claude/.anti-vibe-manifest.json\` to flip \`initMode\` from "migration" to "completed".

## Review Checklist

- [ ] All existing docs reviewed against the 22 canon-andre slots
- [ ] All existing docs reviewed against the 4 anti-vibe-extension slots
- [ ] Files with overlap documented (merge strategy per file)
- [ ] Files with no mapping converted to ADRs (docs/design-docs/)
- [ ] \`bun run harness:validate\` passes after migration

## Validation Log

- [ ] Detection: \`migration-mode-detector.ts\` reported ${docCount} non-harness docs in docs/
- [ ] Tracer Bullet: this file generated by \`runMigrationTracer\` on ${date}
- [ ] Subagent phases: pending (Planos 02/03 — blocked on v6.1.0)

## Compound Opportunity

Review each existing doc for durable lessons worth capturing in docs/compound/*.md
after migration completes. The migration process itself may reveal project-specific
gotchas about the existing architecture — capture those as compound notes.

## Lessons Captured

- Migration mode detected and tracer bullet executed successfully
- 10-section shape validated against new-plan.ts template (André Prado canon)

## Exit Criteria

- \`bun run harness:validate\` returns exit 0
- \`.claude/.anti-vibe-manifest.json\` has \`initMode: "completed"\`
- All pre-existing docs either merged into canon slots or converted to ADRs
`
}
```

### Passo 4: Implementar runMigrationTracer

```typescript
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectInitMode } from './migration-mode-detector'

export async function runMigrationTracer(targetDir: string): Promise<MigrationTracerResult> {
  // 1. Verificar que estamos em migration mode
  const { mode, signals } = await detectInitMode(targetDir)
  if (mode !== 'migration') {
    return { status: 'wrong-mode', detectedMode: mode, planPath: null, manifestPath: null }
  }

  const docCountSignal = signals.find((s) => s.type === 'populated-docs')
  const docCount = docCountSignal?.count ?? 0

  // 2. Derivar nome do projeto a partir do basename do targetDir
  const projectName = path.basename(targetDir)

  // 3. Criar diretório docs/exec-plans/active/ se não existir
  const activePlansDir = path.join(targetDir, 'docs', 'exec-plans', 'active')
  await fs.mkdir(activePlansDir, { recursive: true })

  // 4. Gerar nome do arquivo de plano
  const date = new Date().toISOString().slice(0, 10)
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const planFileName = `${date}-migration-plan-${slug}.md`
  const planPath = path.join(activePlansDir, planFileName)

  // 5. Escrever o migration plan com 10 seções
  const planContent = buildMigrationPlanContent(projectName, docCount, date)
  await fs.writeFile(planPath, planContent, { encoding: 'utf8', flag: 'wx' })
    .catch(async (err: unknown) => {
      // Se já existe (re-run), sobrescrever (idempotência do tracer bullet)
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'EEXIST') {
        await fs.writeFile(planPath, planContent, 'utf8')
      } else {
        throw err
      }
    })

  // 6. Criar .claude/ se não existir e escrever manifest com initMode: "migration"
  const claudeDir = path.join(targetDir, '.claude')
  await fs.mkdir(claudeDir, { recursive: true })

  const manifestPath = path.join(claudeDir, '.anti-vibe-manifest.json')
  const manifest = {
    initMode: 'migration' as const,
    installedAt: new Date().toISOString(),
    tracerBullet: true,
    migrationPlan: path.relative(targetDir, planPath).replace(/\\/g, '/'),
    detectedDocCount: docCount,
  }
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  return { status: 'ok', planPath, manifestPath, detectedMode: 'migration' }
}
```

### Passo 5: Manifest shape completo

O manifest gerado pelo tracer bullet tem esta shape (contrato para Plano 04):

```json
{
  "initMode": "migration",
  "installedAt": "2026-05-14T12:34:56.789Z",
  "tracerBullet": true,
  "migrationPlan": "docs/exec-plans/active/2026-05-14-migration-plan-meu-projeto.md",
  "detectedDocCount": 6
}
```

Quando o Plano 04 (fase-01-fase4-manifest-orchestrator) expandir o manifest, os campos existentes
devem ser preservados e novos campos adicionados. O campo `initMode` é o pivot — valores possíveis:
- `"migration"`: em progresso (tracer bullet escreveu)
- `"completed"`: flip automático quando último plan sai de active/ (DT-05, Plano 04 fase-03)

O campo `pluginVersion` (presente no manifest do fluxo de update) é **ausente** no tracer bullet —
será adicionado pelo Plano 04 quando o manifest for expandido.

### Passo 6: Integrar com SKILL.md Step migration.0

O stub na fase-03 referencia `migration-tracer.ts`. Após esta fase, o step migration.0 do SKILL.md
estará funcional. Confirmar que o import path no SKILL.md bate com o path real:

```javascript
// No SKILL.md Step migration.0 — deve corresponder ao arquivo criado nesta fase:
const { runMigrationTracer } = await import('./lib/migration-tracer.ts')
```

---

## Gotchas

**G1 — Posição do Tracer Bullet no fluxo de erros do SKILL.md:** O SKILL.md tem `disable-model-invocation: true`
— o LLM executa o markdown como instruções literais, não como código. O import via `await import()`
funciona porque o skill runner suporta blocos javascript com imports dinâmicos (DI-06). Não usar
`bun run -e` para o migration-tracer — quebraria no Windows (GT-04).

**G2 — `flag: 'wx'` no writeFile do plano + fallback:** `wx` cria o arquivo ou falha se existir.
O fallback (catch EEXIST → sobrescrever) garante idempotência em re-runs do tracer. Sem o fallback,
um segundo run falharia silenciosamente ou com erro não tratado.

**G3 — `.claude/` pode já existir com outros arquivos:** `fs.mkdir(claudeDir, { recursive: true })`
é idempotente — não falha se o diretório já existe. O `writeFile` do manifest sobrescreve (não usa `wx`)
porque o manifest do tracer pode ser legitimamente atualizado em re-runs.

**G4 — `tracerBullet: true` no manifest:** Este campo distingue um manifest gerado pelo tracer
(sem as fases LLM) de um manifest completo (gerado pelo Plano 04). O Plano 04 deve checar
`tracerBullet` e, se presente, saber que o manifest está incompleto e expandir ao invés de substituir.

**G5 — Encoding e line endings:** O plano gerado deve usar `utf8` sem BOM e LF como line endings
(consistente com os templates existentes em `assets/templates/`). Em Windows, `fs.writeFile` com
encoding `utf8` usa LF se o conteúdo do template não tiver `\r\n`.

---

## Verificacao

### TDD
- [ ] RED: `migration-tracer.ts` não existe, testes falham com ModuleNotFoundError
  - Comando: `bun run test -- --grep 'runMigrationTracer'`
- [ ] GREEN: módulo criado, todos os 6 testes passam
  - Comando: `bun run test -- --grep 'runMigrationTracer'`

### Checklist
- [ ] `runMigrationTracer` cria migration plan com as 10 seções do new-plan.ts template
- [ ] Plano criado em `docs/exec-plans/active/{date}-migration-plan-{slug}.md`
- [ ] Manifest em `.claude/.anti-vibe-manifest.json` com `initMode: "migration"` e `tracerBullet: true`
- [ ] `wrong-mode` retornado para repo greenfield (não em migration mode)
- [ ] Re-run idempotente: segundo `runMigrationTracer` no mesmo repo sobrescreve sem erro
- [ ] `bun run tsc --noEmit` passa sem erros em todos os novos arquivos desta fase
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] `bun run harness:validate` retorna exit 0 no repo do plugin Anti-Vibe Coding

### Smoke Test Manual (Tracer Bullet completo)

```bash
# 1. Criar repo fixture temporário com docs/ populado
mkdir /tmp/test-migration-repo
mkdir -p /tmp/test-migration-repo/docs/design-docs
echo "# Arquitetura" > /tmp/test-migration-repo/docs/ARQUITETURA.md
echo "# API" > /tmp/test-migration-repo/docs/API.md
echo "# ADR-001" > /tmp/test-migration-repo/docs/design-docs/ADR-001.md
echo "# ADR-002" > /tmp/test-migration-repo/docs/design-docs/ADR-002.md
echo "# Deploy" > /tmp/test-migration-repo/docs/DEPLOY.md
echo "# Segurança" > /tmp/test-migration-repo/docs/SEGURANCA.md

# 2. Rodar o tracer via bun diretamente
cd /f/Projetos/Anti-Vibe-Coding
bun -e "
const { runMigrationTracer } = await import('./skills/init/lib/migration-tracer.ts')
const result = await runMigrationTracer('/tmp/test-migration-repo')
console.log(JSON.stringify(result, null, 2))
"

# 3. Verificar outputs
# Esperado: status 'ok', planPath com 10 seções, manifestPath com initMode: 'migration'
cat /tmp/test-migration-repo/.claude/.anti-vibe-manifest.json
ls /tmp/test-migration-repo/docs/exec-plans/active/
```

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'runMigrationTracer'` retorna 6 testes PASS, 0 FAIL
- `bun run tsc --noEmit` retorna exit code 0
- Smoke test: plano criado em `docs/exec-plans/active/` com as 10 seções
- Smoke test: manifest `.anti-vibe-manifest.json` tem `"initMode": "migration"` e `"tracerBullet": true`

**Por humano:**
- Abrir o migration plan gerado e confirmar que as 10 seções têm conteúdo específico do repo fixture
  (não genérico demais), incluindo contagem de docs detectados na seção Goal

<!-- Gerado por /plan-feature em 2026-05-14 -->

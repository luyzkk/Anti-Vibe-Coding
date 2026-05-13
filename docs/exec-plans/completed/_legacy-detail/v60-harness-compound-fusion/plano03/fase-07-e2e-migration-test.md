<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 07: E2E migration test — fixture `legacy-v5/` → `/init migrate` → estado v6 válido

**Plano:** 03 — Migration v5→v6
**Sizing:** 2h
**Depende de:** fase-06 (orquestrador funcional + dry-run)
**Visual:** false

---

## O que esta fase entrega

**Tracer Bullet do plano.** Fixture sandbox `tests/fixtures/legacy-v5/` snapshot de um projeto v5.x canônico (`.planning/` com 1 plano completo + `lessons-learned.md` com ambos formatos + `decisions.md` com 2 entries + `senior-principles.md`). Teste E2E roda `orchestrateMigration` contra a fixture, valida estado v6 final, e dispara `harness:validate` (Plano 01 fase-04 / Plano 04) que precisa retornar `exit 0`. Atende **CA-09** verbatim e prova que **D3, D9, D15, M8, R2** funcionam juntos end-to-end.

Adicionalmente cria suporte para **CA-36** (rollback test): documenta que `git revert` do commit de migração + restauração manual do `.planning.v5-backup/` retorna projeto a estado v5 intacto.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/tests/fixtures/legacy-v5/.gitignore` | Create | Ignora artefatos gerados pelo teste durante runs locais |
| `anti-vibe-coding/tests/fixtures/legacy-v5/.planning/CONTEXT-baseline.md` | Create | Snapshot |
| `anti-vibe-coding/tests/fixtures/legacy-v5/.planning/2026-04-21-feature-x/PRD.md` | Create | Snapshot |
| `anti-vibe-coding/tests/fixtures/legacy-v5/.planning/2026-04-21-feature-x/PLAN.md` | Create | Snapshot |
| `anti-vibe-coding/tests/fixtures/legacy-v5/.planning/2026-04-21-feature-x/STATE.md` | Create | Snapshot |
| `anti-vibe-coding/tests/fixtures/legacy-v5/.planning/2026-04-21-feature-x/plano01/README.md` | Create | Snapshot |
| `anti-vibe-coding/tests/fixtures/legacy-v5/.planning/2026-04-21-feature-x/plano01/fase-01-baseline.md` | Create | Snapshot |
| `anti-vibe-coding/tests/fixtures/legacy-v5/lessons-learned.md` | Create | Snapshot — formato A + B mistos |
| `anti-vibe-coding/tests/fixtures/legacy-v5/decisions.md` | Create | Snapshot — 2 ADRs |
| `anti-vibe-coding/tests/fixtures/legacy-v5/senior-principles.md` | Create | Snapshot curto |
| `anti-vibe-coding/tests/e2e/migration.test.ts` | Create | Teste E2E principal (CA-09) |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Step `migrate.5` final — chamar `harness:validate` e relatar |

---

## Implementacao

### Passo 1: Criar fixture `tests/fixtures/legacy-v5/`

Conteúdo mínimo significativo (cobrir ambos formatos de lessons, multi-plano structure, senior-principles):

```bash
# Estrutura final:
tests/fixtures/legacy-v5/
├── .gitignore                    # ignora docs/, .planning.v5-backup/
├── .planning/
│   ├── CONTEXT-baseline.md
│   └── 2026-04-21-feature-x/
│       ├── PRD.md
│       ├── PLAN.md
│       ├── STATE.md
│       └── plano01/
│           ├── README.md
│           ├── MEMORY.md
│           └── fase-01-baseline.md
├── lessons-learned.md
├── decisions.md
└── senior-principles.md
```

`.gitignore` da fixture:
```
# Artefatos gerados durante o teste (nao commitar).
docs/
.planning.v5-backup/
.planning.v5-backup.tmp/
.planning.v5-backup.lock
```

Snapshots concretos (exemplos minimal):

`lessons-learned.md`:
```markdown
# Lições

## 2026-03-23: hooks.json overwrite bug (CORRIGIDO)

**Sintoma:** hooks customizados perdidos ao instalar plugin
**Causa Raiz:** updateStrategy: replace
**Fix Aplicado:** merge ao invés de replace
**Lição:** hooks .cjs do plugin nunca devem ser copiados
**Prevenção:** documentar todos os passos

## Lições — Anti-Vibe v5.2

### [Armadilha] grep -c retorna exit 1 quando count é zero
**Regra:** Em scripts que usam grep -c, tratar exit code 1 + output "0" como válido
**Contexto:** grep -c retorna exit 1 quando padrão não encontrado

### [Arquitetura] anti-vibe-coding é repositório git independente
**Regra:** Executar git add/commit de dentro de anti-vibe-coding/
**Contexto:** Tem próprio .git/
```

`decisions.md`:
```markdown
# Decisões Arquiteturais

### [Sistema de Versionamento]: Manifest com Checksums SHA-256
**Data:** 2026-03-23
**Alternativas consideradas:** 1. Git tags; 2. Timestamps; 3. Diff textual; 4. Manifest ✓
**Justificativa:** Checksums garantem detecção de modificações reais
**Risco conhecido:** Checksum do arquivo mesclado difere do original
**Reversibilidade:** Reversível

### [Idioma dos templates]: Inglês
**Data:** 2026-05-11
**Alternativas consideradas:** PT / EN / configurável
**Justificativa:** Economia 25-30% tokens
**Risco conhecido:** Acesso reduzido a leitores PT
**Reversibilidade:** Reversível
```

`senior-principles.md`:
```markdown
# Senior Principles

## Princípio 1: Faça funcionar, faça certo, faça rápido (nessa ordem)

Knuth's law. Otimização prematura é a raiz de todo mal.
```

`.planning/CONTEXT-baseline.md`:
```markdown
# Context: Baseline

Decisões iniciais do projeto fixture.
```

`.planning/2026-04-21-feature-x/PRD.md`:
```markdown
# PRD: Feature X

## Problema
Faltava feature X.

## Solução
Implementar X.
```

`.planning/2026-04-21-feature-x/PLAN.md`:
```markdown
# Plan: Feature X

## Planos
- Plano 01 — Setup
```

`.planning/2026-04-21-feature-x/plano01/README.md`:
```markdown
# Plano 01: Setup
```

`.planning/2026-04-21-feature-x/plano01/fase-01-baseline.md`:
```markdown
# Fase 01: Baseline
Setup inicial.
```

### Passo 2: Teste E2E `tests/e2e/migration.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): tracer bullet do Plano 03 — CA-09 verbatim.
// Fixture legacy-v5 → orchestrateMigration → harness:validate exit 0.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { orchestrateMigration } from '../../skills/init/lib/migrate-orchestrator'
import { renderDryRunReport } from '../../skills/init/lib/dry-run-renderer'

const FIXTURE_SOURCE = path.join(import.meta.dir, '..', 'fixtures', 'legacy-v5')
const FIXTURE_RUN = path.join(import.meta.dir, '..', 'fixtures', '__legacy-v5-e2e-run')

async function copyFixture(src: string, dst: string): Promise<void> {
  await fs.rm(dst, { recursive: true, force: true })
  await fs.mkdir(dst, { recursive: true })
  // fs.cp recursivo (Node 16.7+):
  await fs.cp(src, dst, { recursive: true })
}

function runValidator(targetDir: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const validatorPath = path.join(import.meta.dir, '..', '..', 'scripts', 'harness-validate.ts')
    const proc = spawn('bun', ['run', validatorPath], {
      cwd: targetDir,
      env: { ...process.env },
    })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += String(d) })
    proc.stderr.on('data', (d) => { stderr += String(d) })
    proc.on('close', (code) => resolve({ exitCode: code ?? -1, stdout, stderr }))
  })
}

describe('E2E: fixture legacy-v5 → /init migrate → harness:validate (CA-09)', () => {
  beforeEach(async () => {
    await copyFixture(FIXTURE_SOURCE, FIXTURE_RUN)
  })

  afterEach(async () => {
    await fs.rm(FIXTURE_RUN, { recursive: true, force: true })
  })

  it('CA-09: migrates fixture legacy-v5 → state v6 validated', async () => {
    const report = await orchestrateMigration(FIXTURE_RUN, { dryRun: false })

    // 1. Backup criado
    expect(report.backup.status).toBe('created')
    const backupExists = await fs.access(path.join(FIXTURE_RUN, '.planning.v5-backup')).then(() => true).catch(() => false)
    expect(backupExists).toBe(true)

    // 2. .planning/ original deletada (G-A1)
    const originalExists = await fs.access(path.join(FIXTURE_RUN, '.planning')).then(() => true).catch(() => false)
    expect(originalExists).toBe(false)

    // 3. docs/exec-plans/active/ populado
    const baselineExists = await fs.access(path.join(FIXTURE_RUN, 'docs', 'exec-plans', 'active', 'baseline.md'))
      .then(() => true).catch(() => false)
    expect(baselineExists).toBe(true)

    // 4. docs/product-specs/ populado
    const prdExists = await fs.access(path.join(FIXTURE_RUN, 'docs', 'product-specs', '2026-04-21-feature-x.md'))
      .then(() => true).catch(() => false)
    expect(prdExists).toBe(true)

    // 5. docs/compound/ tem 3 lessons (1 formato A + 2 formato B)
    const compoundFiles = await fs.readdir(path.join(FIXTURE_RUN, 'docs', 'compound'))
    expect(compoundFiles.filter(f => f.endsWith('.md'))).toHaveLength(3)

    // 6. docs/design-docs/ tem 2 ADRs + core-beliefs.md
    const designDocs = await fs.readdir(path.join(FIXTURE_RUN, 'docs', 'design-docs'))
    const adrs = designDocs.filter(f => /^ADR-\d{4}-/.test(f))
    expect(adrs).toHaveLength(2)
    expect(designDocs).toContain('core-beliefs.md')

    // 7. CA-09 final: harness:validate exit 0
    // NOTA: validator real depende de Plano 04 estar pronto.
    // Em isolamento (so Plano 03), substituimos por sanity-check de paths obrigatorios:
    const requiredPaths = [
      'docs/exec-plans/active',
      'docs/product-specs',
      'docs/compound',
      'docs/design-docs',
    ]
    for (const rel of requiredPaths) {
      const exists = await fs.access(path.join(FIXTURE_RUN, rel)).then(() => true).catch(() => false)
      expect(exists, `missing: ${rel}`).toBe(true)
    }
  })

  it('CA-09 idempotency: rodar /init migrate 2x = mesmo estado', async () => {
    const first = await orchestrateMigration(FIXTURE_RUN, { dryRun: false })
    const second = await orchestrateMigration(FIXTURE_RUN, { dryRun: false })

    // Segunda execucao:
    // - Backup: already-exists
    expect(second.backup.status).toBe('already-exists')
    // - Lessons: tudo skipped
    expect(second.lessons.skipped.length).toBe(first.lessons.written.length)
    expect(second.lessons.written).toHaveLength(0)
    // - Decisions: tudo skipped
    expect(second.decisions.written).toHaveLength(0)
  })

  it('CA-10: --dry-run preview does not mutate, real run succeeds afterwards', async () => {
    const preview = await orchestrateMigration(FIXTURE_RUN, { dryRun: true })
    expect(preview.dryRun).toBe(true)
    const rendered = renderDryRunReport(preview)
    expect(rendered).toContain('DRY RUN')

    // Nada em disco:
    const docsExists = await fs.access(path.join(FIXTURE_RUN, 'docs')).then(() => true).catch(() => false)
    expect(docsExists).toBe(false)

    // Run real depois funciona:
    const real = await orchestrateMigration(FIXTURE_RUN, { dryRun: false })
    expect(real.dryRun).toBe(false)
    const docsExistsNow = await fs.access(path.join(FIXTURE_RUN, 'docs')).then(() => true).catch(() => false)
    expect(docsExistsNow).toBe(true)
  })

  it('M8 sizing: migration completes well within 120s budget', async () => {
    const start = Date.now()
    await orchestrateMigration(FIXTURE_RUN, { dryRun: false })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(120_000)  // M8 NFR
    // Em fixture pequena, deve ser <5s:
    expect(elapsed).toBeLessThan(5000)
  })

  it('CA-36 rollback prep: backup contains complete v5 state', async () => {
    await orchestrateMigration(FIXTURE_RUN, { dryRun: false })

    // Backup tem tudo que tinha o original:
    const backedUp = [
      '.planning/CONTEXT-baseline.md',
      '.planning/2026-04-21-feature-x/PRD.md',
      '.planning/2026-04-21-feature-x/plano01/fase-01-baseline.md',
      'lessons-learned.md',
      'decisions.md',
      'senior-principles.md',
    ]
    for (const rel of backedUp) {
      const exists = await fs.access(path.join(FIXTURE_RUN, '.planning.v5-backup', rel))
        .then(() => true).catch(() => false)
      expect(exists, `missing in backup: ${rel}`).toBe(true)
    }
  })
})

// NOTE: O teste seguinte só passa quando Plano 01 fase-04 (harness-validate.ts) estiver pronto.
// Em desenvolvimento isolado do Plano 03, mantido como `it.skip` ate Plano 04 mergeado.
describe.skip('E2E + harness:validate (depende de Plano 01 fase-04)', () => {
  it('CA-09 verbatim: validator exit 0 após migração', async () => {
    await copyFixture(FIXTURE_SOURCE, FIXTURE_RUN)
    await orchestrateMigration(FIXTURE_RUN, { dryRun: false })
    const result = await runValidator(FIXTURE_RUN)
    expect(result.exitCode).toBe(0)
  })
})
```

### Passo 3: Integração final em `SKILL.md`

```markdown
## Step migrate.5: Final validation (Plano 03 fase-07 — CA-09)

\`\`\`bash
bun run scripts/harness-validate.ts
VALIDATION_EXIT=$?
if [ $VALIDATION_EXIT -ne 0 ]; then
  echo "WARN: harness:validate failed after migration. Inspect output above."
  echo "Backup is at .planning.v5-backup/ — to roll back: git revert HEAD && cp -r .planning.v5-backup/.planning ./"
  exit $VALIDATION_EXIT
fi
echo "Migration validated. Suggested commit: git commit -m 'chore: migrate to anti-vibe-coding v6.0.0'"
echo "Add .planning.v5-backup/ to .gitignore (or delete after confirming all is well)."
\`\`\`
```

---

## Gotchas

- **G1 (backup é fonte de verdade — testado por CA-36 prep):** Validação explícita de que cada arquivo do source acabou no backup. Sem isso, R14 não está mitigado.
- **G2 (idempotência — teste explícito):** `it('CA-09 idempotency')` roda migrate 2x e valida que segunda é no-op.
- **G3 (cross-platform):** Fixture é puro markdown ASCII. `fs.cp` recursivo funciona em Bun + Node 16.7+. Em CI Windows o teste roda normal — paths via `path.join`.
- **G8 (dry-run não escreve — testado por CA-10 prep):** `it('CA-10')` valida o ciclo preview → real.
- **G10 (idioma):** Fixtures preservam PT do conteúdo. Validador (`harness:validate`) não checa idioma — só estrutura.
- **G11 (perf M8 ≤120s — testado):** Assertion `elapsed < 120_000` cobre NFR. Em fixture pequena fica em <5s; em projeto v5 médio do usuário (~50 .md) deve ficar em <30s.
- **Local — validador real depende de Plano 04:** Bloco `describe.skip` documenta. Em integração final (após Plano 04 mergeado), remover `.skip` e CA-09 fica 100% E2E.
- **Local — fixture deve ser checked in:** Versionar em git para Plano 08 (dog-food) reusar. Mas `docs/` e `.planning.v5-backup/` gerados durante teste vão para `.gitignore` da fixture.
- **Local — `__legacy-v5-e2e-run/` é working copy:** Teste copia fixture-source para `__legacy-v5-e2e-run/` e mexe lá. afterEach limpa. Source fica imutável.
- **G9 (provenance):** Header em `migration.test.ts`. Fixtures (.md) **não** levam provenance — são snapshots de conteúdo de usuário.

### Decisão sobre teste vs validator real

Em isolamento do Plano 03 (sem `harness-validate.ts` finalizado pelo Plano 04), o teste valida estado v6 por **inspeção de paths obrigatórios** + **shape de docs gerados**. Quando Plano 04 ship, o `describe.skip` é desbloqueado e CA-09 fica verbatim. Documentado em STATE.md ao executar este plano.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `CA-09: migrates fixture legacy-v5 → state v6 validated` falha porque fixture ou orchestrator ainda não existem (depende de fases anteriores).
  - Comando: `bun run test tests/e2e/migration.test.ts`
  - Resultado esperado: assertion fail em `expect(baselineExists).toBe(true)`.

- [ ] **GREEN:** Fixture + orchestrator amarrados — 5 testes ativos passam (skip do validator real fica skip).
  - Comando: `bun run test tests/e2e/migration.test.ts`
  - Resultado esperado: `5 passed, 1 skipped, 0 failed`

### Checklist

- [ ] Fixture `tests/fixtures/legacy-v5/` versionada no git com `.gitignore` para artefatos gerados
- [ ] Fixture cobre AMBOS formatos de lessons (A: `## YYYY-MM-DD:` + B: `### [Categoria]`)
- [ ] Fixture cobre estrutura aninhada de planning (`2026-XX-XX-slug/plano01/fase-01.md`)
- [ ] Fixture inclui `senior-principles.md` (cobre G-A3)
- [ ] Teste E2E: migration aplicada produz `docs/exec-plans/active/`, `docs/product-specs/`, `docs/compound/`, `docs/design-docs/`
- [ ] `.planning/` original deletada após sucesso; backup permanece
- [ ] Idempotência verificada (run 2x = mesmo resultado)
- [ ] Dry-run + real run ciclo testado
- [ ] Backup preserva 100% do source (CA-36 prep)
- [ ] Sizing M8 ≤120s validado por assertion
- [ ] **Tracer bullet:** rodar `bun run test tests/e2e/migration.test.ts` em CI passa
- [ ] Lint limpo: `bun run lint tests/e2e/migration.test.ts`
- [ ] Quando Plano 04 mergeado: descobrir `describe.skip` e validar CA-09 com validator real

---

## Criterio de Aceite

**Por máquina (CA-09 verbatim em isolamento do Plano 03):**

```bash
cd anti-vibe-coding
bun run test tests/e2e/migration.test.ts
# Esperado: 5 passed, 1 skipped, 0 failed em <10s
# Skipped = teste do validator real, desbloqueado após Plano 04 ship.

# Smoke manual:
cp -r tests/fixtures/legacy-v5 /tmp/legacy-smoke
bun run -e "
import { orchestrateMigration } from './skills/init/lib/migrate-orchestrator.ts'
const r = await orchestrateMigration('/tmp/legacy-smoke', { dryRun: false })
console.log(r.backup.status, '/', r.planning.entries, 'planning,',
  r.lessons.written.length, 'lessons,', r.decisions.written.length, 'ADRs')
"
# Esperado: created / 6 planning, 3 lessons, 2 ADRs (numeros variam com fixture exata)

# Estrutura final:
find /tmp/legacy-smoke/docs -type f | sort
# Esperado: lista contendo exec-plans/active/baseline.md, product-specs/2026-04-21-feature-x.md, etc.

# Cleanup:
rm -rf /tmp/legacy-smoke
```

**Por humano (CA-09 + CA-10 + CA-36 prep — full smoke):**

1. Em um projeto v5.x real (sugestão: clone de `Carreirarte` em `/tmp/`), rodar `/init` — skill detecta v5 (Plano 03 fase-01).
2. Aceitar dry-run primeiro: skill renderiza preview multi-seção, projeto inalterado.
3. Re-rodar `/init migrate` (sem flag): skill aplica migração.
4. Inspecionar:
   - `docs/exec-plans/active/` populado
   - `docs/compound/*.md` com frontmatter completo
   - `docs/design-docs/ADR-*.md` numerados
   - `.planning.v5-backup/` intacto
   - `.planning/` deletado
5. Tentar re-rodar `/init migrate`: skill reporta "already migrated" sem efeito.
6. CA-36 mental rehearsal: `git revert HEAD` reverte mutações em `docs/`; manualmente restaurar `.planning/` copiando de `.planning.v5-backup/`. Estado v5 intacto.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

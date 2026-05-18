<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-17 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: Testes E2E de byte-idempotencia (greenfield + legacy v5 + edge cases)

**Plano:** 04 — Extracao de rationale + Akita + Cutover
**Sizing:** 1.5h
**Depende de:** fase-03 (cutover concluido)
**Visual:** false

---

## O que esta fase entrega

Suite de testes E2E em `tests/e2e/` que prova **byte-idempotencia** do `/init` pos-cutover
contra o comportamento atual (PRD CA-01, CA-02, SH-03, MH-03). Cobertura:

- **Cenario base 1 (CA-01):** projeto greenfield -> 27 arquivos gerados + stdout
  byte-identico ao baseline pre-cutover.
- **Cenario base 2 (CA-02):** projeto legacy v5 -> migracao completa (backup ->
  planning -> lessons -> decisions) + stdout byte-identico.
- **Edge 1 (CA-03):** `--dry-run` -> zero mutacao em disco, relatorio gerado.
- **Edge 2 (CA-06):** Step 7 capabilities-discovery falha -> /init continua,
  log de soft-fail.
- **Edge 3 (CA-07):** backup falha (permissao) -> /init aborta com mensagem
  clara (AbortError code 1).
- **Edge 4 (CA-08):** Windows-like (tier 3 copy-with-hook ativado) -> CLAUDE.md
  copiado + hook registrado em `.claude/settings.local.json`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/init-cutover-greenfield.test.ts` | Create | Cenario base 1 + edges CA-03, CA-06, CA-08 |
| `tests/e2e/init-cutover-legacy-v5.test.ts` | Create | Cenario base 2 + edge CA-07 |
| `tests/e2e/__fixtures__/init-greenfield/.gitkeep` | Create | Diretorio vazio = projeto greenfield |
| `tests/e2e/__fixtures__/init-legacy-v5/.planning/2026-04-20-foo/PRD.md` | Create | Fixture legacy: 1 plano datado |
| `tests/e2e/__fixtures__/init-legacy-v5/.planning/2026-04-20-foo/STATE.md` | Create | Fixture legacy: state file |
| `tests/e2e/__fixtures__/init-legacy-v5/.planning/lessons-learned.md` | Create | Fixture legacy: 2-3 licoes |
| `tests/e2e/__fixtures__/init-legacy-v5/.planning/decisions.md` | Create | Fixture legacy: 2 decisoes |
| `tests/e2e/__golden__/init-greenfield.stdout.txt` | Update | Baseline capturado em fase-03 — atualizar se goldens foram placeholder |
| `tests/e2e/__golden__/init-greenfield.tree.json` | Update | Idem |
| `tests/e2e/__golden__/init-legacy-v5.stdout.txt` | Create | Baseline stdout legacy |
| `tests/e2e/__golden__/init-legacy-v5.tree.json` | Create | Baseline tree legacy |

---

## Implementacao

### Passo 1: Criar fixtures

**Greenfield** (`tests/e2e/__fixtures__/init-greenfield/`): so um `.gitkeep` vazio.

**Legacy v5** (`tests/e2e/__fixtures__/init-legacy-v5/`):

```
init-legacy-v5/
  .gitkeep
  .planning/
    2026-04-20-foo/
      PRD.md           (conteudo: "# PRD Foo\n\nLegacy v5 plan.\n")
      STATE.md         (conteudo: "# STATE\n\nstatus: complete\n")
    lessons-learned.md (formato A: "## 2026-04-15: licao um\n\nDetalhes.\n\n## 2026-04-18: licao dois\n\nDetalhes.\n")
    decisions.md       (formato: "## ADR-001 Usar bun\n\nContexto.\n\n## ADR-002 Usar TS strict\n\nContexto.\n")
```

> **Nota — fixture realistic:** o conteudo precisa SOAR como um projeto legacy
> real. Usar 2-3 licoes e 2 decisoes minimo, em formatos heterogeneos (testa o
> parser do helper).

### Passo 2: Capturar baseline pre-cutover (se fase-03 deixou placeholder)

Se na fase-03 o golden foi gravado, **pular este passo**. Se foi placeholder
(`TBD: capturar...`), gerar agora rodando o pipeline em modo "current" (HEAD~1
ou via git stash do SKILL.md atual):

```bash
# 2026-05-17 (Luiz/dev): captura de baseline — opcao 1 (preferida): rodar o dispatcher
# direto, ja que os steps copiam wording byte-identico do SKILL.md inline.
# Como o cutover ja foi feito na fase-03, o dispatcher AGORA produz output novo —
# se ele bater com o SKILL.md antigo (verificavel em HEAD~1), os goldens valem.

# Spot check: rodar o dispatcher contra fixture greenfield e gravar
bun run skills/init/lib/run-init.ts --cwd tests/e2e/__fixtures__/init-greenfield > /tmp/greenfield-current.stdout 2>&1
diff /tmp/greenfield-current.stdout tests/e2e/__golden__/init-greenfield.stdout.txt
```

> **Decisao DI-4-1 (escalavel ao dev):** se o golden pre-cutover nao bater com
> o output pos-cutover, o cutover quebrou wording. Diagnosticar: qual step
> divergiu? Reverter a fase-03 OU corrigir o step culpado (provavelmente um
> wording divergente no Plano 02/03 que passou despercebido).

### Passo 3: Escrever `init-cutover-greenfield.test.ts`

```typescript
// tests/e2e/init-cutover-greenfield.test.ts
// 2026-05-17 (Luiz/dev): E2E byte-idempotence pos-cutover — PRD CA-01, SH-03, MH-03.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { mkdtemp, cp, rm } from 'node:fs/promises'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'

const FIXTURE_SRC = path.join(import.meta.dir, '__fixtures__', 'init-greenfield')
const GOLDEN_STDOUT = path.join(import.meta.dir, '__golden__', 'init-greenfield.stdout.txt')
const GOLDEN_TREE = path.join(import.meta.dir, '__golden__', 'init-greenfield.tree.json')

async function captureStdout<T>(fn: () => Promise<T>): Promise<{ stdout: string; result: T }> {
  const lines: string[] = []
  const orig = console.log
  console.log = (...args) => { lines.push(args.map(String).join(' ')) }
  try {
    const result = await fn()
    return { stdout: lines.join('\n'), result }
  } finally {
    console.log = orig
  }
}

async function readTreeSorted(root: string): Promise<string[]> {
  const result: string[] = []
  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const name = String(e.name)
      const full = path.join(dir, name)
      const rel = path.posix.join(prefix, name)
      if (e.isDirectory()) {
        result.push(rel + '/')
        await walk(full, rel)
      } else {
        result.push(rel)
      }
    }
  }
  await walk(root, '')
  return result.sort()
}

function normalizeStdout(text: string): string {
  // 2026-05-17 (Luiz/dev): mascara campos nao-deterministicos (durationMs, timestamps).
  return text
    .replace(/in \d+ ms/g, 'in <NN> ms')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '<TIMESTAMP>')
}

describe('E2E cutover — greenfield (CA-01)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'init-greenfield-'))
    await cp(FIXTURE_SRC, tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('greenfield init generates 27 files with expected stdout', async () => {
    const { stdout } = await captureStdout(() =>
      runInit({ args: [], cwd: tmpDir })
    )

    const tree = await readTreeSorted(tmpDir)
    const expectedTree = JSON.parse(await fs.readFile(GOLDEN_TREE, 'utf8')) as string[]
    expect(tree).toEqual(expectedTree)

    const expectedStdout = await fs.readFile(GOLDEN_STDOUT, 'utf8')
    expect(normalizeStdout(stdout)).toBe(normalizeStdout(expectedStdout))
  })

  test('dry-run flag mutates nothing on disk (CA-03)', async () => {
    const treeBefore = await readTreeSorted(tmpDir)
    await runInit({ args: ['--dry-run'], cwd: tmpDir })
    const treeAfter = await readTreeSorted(tmpDir)
    expect(treeAfter).toEqual(treeBefore)
  })

  test('capabilities-discovery soft-fails when profile absent (CA-06)', async () => {
    // 2026-05-17 (Luiz/dev): fixture greenfield NAO tem .anti-vibe/architecture-profile.json
    // -> readArchitectureProfile retorna null -> Step 7 pula silenciosamente.
    const { stdout } = await captureStdout(() =>
      runInit({ args: [], cwd: tmpDir })
    )
    expect(stdout).toContain('[capabilities-discovery] skipped — architecture profile not detected')
  })

  test('Windows tier 3 copy-with-hook generates CLAUDE.md + hook (CA-08)', async () => {
    // 2026-05-17 (Luiz/dev): forcar tier 3 via env var ou via injection no helper.
    // Se ja existe variavel CLAUDE_LINK_TIER_FORCE, usar. Senao, validar tier escolhido
    // pos-execucao e que CLAUDE.md mirror == AGENTS.md.
    process.env.CLAUDE_LINK_TIER_FORCE = 'copy-with-hook'
    try {
      await runInit({ args: [], cwd: tmpDir })

      const claudeContent = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf8')
      const agentsContent = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf8')
      expect(claudeContent).toBe(agentsContent)

      const settingsPath = path.join(tmpDir, '.claude', 'settings.local.json')
      const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'))
      expect(JSON.stringify(settings)).toContain('PostToolUse')
    } finally {
      delete process.env.CLAUDE_LINK_TIER_FORCE
    }
  })
})
```

### Passo 4: Escrever `init-cutover-legacy-v5.test.ts`

```typescript
// tests/e2e/init-cutover-legacy-v5.test.ts
// 2026-05-17 (Luiz/dev): E2E migracao v5 -> v6 — PRD CA-02 + CA-07.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { mkdtemp, cp, rm, chmod } from 'node:fs/promises'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'
import { AbortError } from '../../skills/init/lib/steps/abort-error'

const FIXTURE_SRC = path.join(import.meta.dir, '__fixtures__', 'init-legacy-v5')
const GOLDEN_STDOUT = path.join(import.meta.dir, '__golden__', 'init-legacy-v5.stdout.txt')

// ... helpers `captureStdout`, `readTreeSorted`, `normalizeStdout` reusados do greenfield.

describe('E2E cutover — legacy v5 (CA-02)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'init-legacy-'))
    await cp(FIXTURE_SRC, tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('legacy v5 migrates planning + lessons + decisions with expected stdout', async () => {
    const { stdout } = await captureStdout(() =>
      runInit({ args: [], cwd: tmpDir })
    )

    // Apos /init: docs/exec-plans/completed/2026-04-20-foo/ deve existir
    expect(await fs.stat(path.join(tmpDir, 'docs/exec-plans/completed/2026-04-20-foo'))).toBeDefined()
    // Lessons migradas para docs/compound/
    const compoundEntries = await fs.readdir(path.join(tmpDir, 'docs/compound'))
    expect(compoundEntries.filter((e) => e.endsWith('.md')).length).toBeGreaterThanOrEqual(2)
    // Decisions migradas para docs/design-docs/ADR-*.md
    const designEntries = await fs.readdir(path.join(tmpDir, 'docs/design-docs'))
    expect(designEntries.filter((e) => /^ADR-\d{4}-/.test(e)).length).toBeGreaterThanOrEqual(2)
    // Backup criado em .planning.v5-backup/
    expect(await fs.stat(path.join(tmpDir, '.planning.v5-backup'))).toBeDefined()

    const expectedStdout = await fs.readFile(GOLDEN_STDOUT, 'utf8')
    expect(normalizeStdout(stdout)).toBe(normalizeStdout(expectedStdout))
  })

  test('backup-fail aborts migration with AbortError code 1 (CA-07)', async () => {
    // 2026-05-17 (Luiz/dev): simular permissao negada via chmod 000 no .planning/.
    // No Windows, chmod nao funciona — pular o teste e marcar como skip-on-win32.
    if (process.platform === 'win32') return // skip
    await chmod(path.join(tmpDir, '.planning'), 0o000)
    try {
      await expect(runInit({ args: [], cwd: tmpDir })).rejects.toThrow(AbortError)
    } finally {
      await chmod(path.join(tmpDir, '.planning'), 0o755) // restore para cleanup
    }
  })
})
```

### Passo 5: Goldens iniciais

Gerar a primeira versao dos goldens rodando os testes em modo "update":

```bash
# 2026-05-17 (Luiz/dev): primeira execucao — capturar output real, salvar como golden.
# Subsequentes execucoes comparam contra o golden.
GOLDEN_UPDATE=1 bun test tests/e2e/init-cutover-greenfield.test.ts
GOLDEN_UPDATE=1 bun test tests/e2e/init-cutover-legacy-v5.test.ts
```

Se preferir nao implementar `GOLDEN_UPDATE`, gerar manualmente:

```bash
bun run skills/init/lib/run-init.ts --cwd /tmp/init-greenfield-baseline > tests/e2e/__golden__/init-greenfield.stdout.txt
```

E `init-greenfield.tree.json` capturado via script auxiliar (Bun.Glob de `tmp/`).

---

## Gotchas

- **G1 do plano (wording byte-identico):** o golden eh o oraculo do byte-identicality.
  Se o teste falhar com diff de 1 caractere, isso eh sucesso do teste, nao do
  cutover — quer dizer que um step nao copiou wording exato. Diagnose: qual
  linha do diff? Qual step gerou? Iterar fix.

- **G9 do plano (baseline pre vs pos):** o golden de greenfield deveria ter
  sido gravado na fase-03 ANTES do cutover. Se foi placeholder, gerar agora
  via Passo 5. **Risco:** se o cutover ja introduziu wording errado, o golden
  vai congelar o errado. Spot-check manual primeiro: ler o stdout gerado e
  comparar com SKILL.md inline antigo (`git show HEAD~N:skills/init/SKILL.md`)
  procurando as strings principais.

- **G10 do plano (edge cases obrigatorios):** 4 edges (CA-03, CA-06, CA-07,
  CA-08) sao obrigatorios. Sem eles, MH-03 fica parcial. Se algum nao puder
  ser implementado no SO atual (ex: CA-07 chmod no Windows), marcar
  `if (process.platform === 'win32') return` e abrir tech-debt para rodar em
  CI Linux.

- **Local — `durationMs` flakiness:** `normalizeStdout` mascara `in NN ms` para
  `in <NN> ms` antes da comparacao. Se outra linha tiver timing
  (ex: "Tree files: N in Mms"), incluir no regex.

- **Local — `console.log` mock:** o `captureStdout` substitui `console.log`
  global. Se algum step usa `process.stdout.write` em vez, escapa do mock.
  Validar: rodar 1x sem mock e ver se algum byte vai pro stdout real.

- **Local — order do listing do filesystem:** `readdir` no Linux retorna em
  ordem arbitraria (geralmente inode), no macOS alfabetica, no Windows tambem
  arbitraria. `readTreeSorted` ja `.sort()` antes de comparar — sem isso, o
  golden seria flaky.

- **Local — `__golden__/` nao pode estar em `.gitignore`:** confirmar que
  `__golden__/` eh versionado, senao perde a referencia entre commits.

---

## Verificacao

### TDD

- [ ] **RED:** antes de criar os testes, `bun test tests/e2e/init-cutover-greenfield.test.ts`
  retorna `No tests found`.
  - Comando: `bun test tests/e2e/init-cutover-greenfield.test.ts 2>&1`
  - Resultado esperado: `No tests found in ...` ou `Cannot find module`.

- [ ] **GREEN:** apos criar fixtures + testes + goldens, todos os 6 cenarios passam.
  - Comando: `bun test tests/e2e/init-cutover-greenfield.test.ts tests/e2e/init-cutover-legacy-v5.test.ts`
  - Resultado esperado: `6 pass, 0 fail` (4 greenfield + 2 legacy; CA-07 skip em Windows).

### Checklist

- [ ] Fixtures criadas: `tests/e2e/__fixtures__/init-greenfield/` e `init-legacy-v5/` (com `.planning/`, `lessons-learned.md`, `decisions.md`).
- [ ] Goldens gerados: 4 arquivos em `tests/e2e/__golden__/` (greenfield + legacy, stdout + tree).
- [ ] Testes E2E criados: 2 arquivos em `tests/e2e/` (cutover-greenfield e cutover-legacy-v5).
- [ ] Nomes de teste seguem convencao do CLAUDE.md (verbo descritivo, sem "should").
- [ ] `bun test tests/e2e/` exit 0.
- [ ] `bun run test` exit 0 (regression cumulativa).
- [ ] `bun run harness:validate` exit 0.
- [ ] Goldens versionados (`git status` mostra eles como `A`).

---

## Criterio de Aceite

Suite E2E cobre 2 cenarios base (greenfield + legacy v5) + 4 edge cases (dry-run,
soft-fail capabilities, backup-fail abort, Windows tier-3) e prova
byte-idempotencia stdout + arvore de arquivos vs goldens pre-cutover.

**Por maquina:**
- `bun test tests/e2e/init-cutover-greenfield.test.ts` exit 0 com `4 pass`
- `bun test tests/e2e/init-cutover-legacy-v5.test.ts` exit 0 com `1 pass`
  (Linux/macOS) ou `1 pass, 1 skipped` (Windows, CA-07 chmod skip)
- `ls tests/e2e/__golden__/init-*.{stdout.txt,tree.json} | wc -l` retorna `4`
- `bun run test` exit 0
- `bun run harness:validate` exit 0

**Por humano:**
- Diff visual dos goldens: `diff tests/e2e/__golden__/init-greenfield.stdout.txt
  /tmp/sample-pre-cutover.stdout` zero linhas (modulo normalizacao). Stdout
  do /init pos-cutover eh indistinguivel do pre-cutover.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->

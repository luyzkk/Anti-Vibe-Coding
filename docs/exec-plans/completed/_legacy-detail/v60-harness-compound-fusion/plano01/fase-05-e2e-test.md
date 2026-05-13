<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 05: E2E Tracer Bullet (fixture vazia → /init → bun run harness:validate exit 0)

**Plano:** 01 — Tracer Bullet
**Sizing:** 1h
**Depende de:** fase-02 (init-skeleton), fase-03 (symlink-fallback), fase-04 (validator-minimal). Independente de fase-01 (consumida por fase-02 ja).
**Visual:** false

---

## O que esta fase entrega

**Esta fase eh o tracer bullet propriamente dito.** Teste E2E que executa o fluxo completo do plano em uma fixture vazia e prova que D2 (idioma EN), D13 (TS+bun) e D16 (symlink+fallback) funcionam juntos:

1. Cria fixture vazia em `tests/fixtures/empty-dir/`.
2. Executa o fluxo `/init` (chama os helpers de fase-02 e fase-03 diretamente).
3. Roda `bun run scripts/harness-validate.ts` na fixture.
4. Espera exit code 0.
5. Tudo isso em ≤30s no laptop do usuario.

Se este teste passar, sabemos que a arquitetura do v6.0.0 e viavel. Falha aqui = redesenho antes do Plano 02.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/tests/e2e/init-tracer-bullet.test.ts` | Create | Teste E2E que orquestra scaffoldTemplates + linkClaudeToAgents + spawn do validator |
| `anti-vibe-coding/tests/fixtures/empty-dir/.gitignore` | Create | `*` exceto `.gitignore` — para nao commitar artefatos do init |
| `anti-vibe-coding/tests/fixtures/empty-dir/.gitkeep` | Create | Mantem pasta vazia versionada |
| `anti-vibe-coding/package.json` | Modify | Adicionar `"test:e2e": "bun test tests/e2e/"` |

---

## Implementacao

### Passo 1: Garantir fixture vazia

`tests/fixtures/empty-dir/.gitignore`:
```
# Ignora tudo gerado pelo /init em runs locais
*
!.gitignore
!.gitkeep
```

`tests/fixtures/empty-dir/.gitkeep` (vazio — apenas marca pasta versionada).

### Passo 2: Teste E2E `init-tracer-bullet.test.ts`

```typescript
// 2026-05-11 (Luiz/dev): tracer bullet E2E — prova D2, D13, D16 juntos.
// Plano 01 fase-05.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { scaffoldTemplates } from '../../skills/init/lib/scaffold-templates'
import { linkClaudeToAgents } from '../../skills/init/lib/symlink-fallback'

const FIXTURE = path.join(import.meta.dir, '..', 'fixtures', 'empty-dir')
const TEMPLATES = path.join(import.meta.dir, '..', '..', 'skills/init/assets/templates')

async function runValidator(cwd: string): Promise<{ code: number; stderr: string; stdout: string; durationMs: number }> {
  const start = Date.now()
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', 'scripts/harness-validate.ts'], { cwd })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d })
    proc.stderr.on('data', (d) => { stderr += d })
    proc.on('exit', (code) => resolve({
      code: code ?? -1,
      stderr,
      stdout,
      durationMs: Date.now() - start,
    }))
  })
}

describe('E2E tracer bullet — /init → harness-validate', () => {
  beforeEach(async () => {
    // Limpar tudo dentro de FIXTURE exceto .gitignore e .gitkeep
    const entries = await fs.readdir(FIXTURE)
    for (const entry of entries) {
      if (entry === '.gitignore' || entry === '.gitkeep') continue
      await fs.rm(path.join(FIXTURE, entry), { recursive: true, force: true })
    }
  })

  afterEach(async () => {
    // Mesma limpeza
    const entries = await fs.readdir(FIXTURE)
    for (const entry of entries) {
      if (entry === '.gitignore' || entry === '.gitkeep') continue
      await fs.rm(path.join(FIXTURE, entry), { recursive: true, force: true })
    }
  })

  it('runs full init flow and validator exits 0 in under 30s', async () => {
    const overallStart = Date.now()

    // Step 1 — scaffold templates (fase-02 + fase-04)
    const scaffoldResult = await scaffoldTemplates({
      targetDir: FIXTURE,
      templatesDir: TEMPLATES,
      projectName: 'tracer-fixture',
      stack: 'unknown',
    })

    expect(scaffoldResult.filesWritten.length).toBeGreaterThanOrEqual(2)
    expect(await fs.stat(path.join(FIXTURE, 'AGENTS.md'))).toBeDefined()
    expect(await fs.stat(path.join(FIXTURE, 'ARCHITECTURE.md'))).toBeDefined()
    expect(await fs.stat(path.join(FIXTURE, 'scripts/harness-validate.ts'))).toBeDefined()
    expect(await fs.stat(path.join(FIXTURE, 'package.json'))).toBeDefined()

    // Step 2 — link CLAUDE.md to AGENTS.md (fase-03)
    const linkResult = await linkClaudeToAgents(FIXTURE)
    expect(['symlink', 'hardlink', 'copy-with-hook']).toContain(linkResult.tier)

    const claudeContent = await fs.readFile(path.join(FIXTURE, 'CLAUDE.md'), 'utf8')
    const agentsContent = await fs.readFile(path.join(FIXTURE, 'AGENTS.md'), 'utf8')
    expect(claudeContent).toBe(agentsContent)

    // Step 3 — rodar validator
    const validatorResult = await runValidator(FIXTURE)
    expect(validatorResult.code).toBe(0)
    expect(validatorResult.stdout).toContain('Harness validation passed')
    expect(validatorResult.durationMs).toBeLessThan(2000) // CA-26 com folga

    // Step 4 — orcamento total ≤30s
    const totalMs = Date.now() - overallStart
    expect(totalMs).toBeLessThan(30_000)

    console.log(`Tracer bullet end-to-end: ${totalMs}ms (link tier: ${linkResult.tier})`)
  })

  it('detects regressions: hand-edit AGENTS.md to 50 lines → validator exits 1', async () => {
    // scaffold + link + AGENTS bloated → validator deve rejeitar
    await scaffoldTemplates({
      targetDir: FIXTURE,
      templatesDir: TEMPLATES,
      projectName: 'regression-fixture',
      stack: 'unknown',
    })
    await linkClaudeToAgents(FIXTURE)

    // Inflar AGENTS.md para 50 linhas
    const bloated = Array.from({ length: 50 }, (_, i) => `# Line ${i}`).join('\n')
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), bloated, 'utf8')

    const result = await runValidator(FIXTURE)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('40 lines or fewer')
  })
})
```

### Passo 3: Atualizar `anti-vibe-coding/package.json`

Adicionar:
```json
{
  "scripts": {
    "test:e2e": "bun test tests/e2e/",
    "test:tracer": "bun test tests/e2e/init-tracer-bullet.test.ts"
  }
}
```

---

## Gotchas

- **G5 do plano (fixture limpa):** `beforeEach`/`afterEach` precisam preservar `.gitignore` e `.gitkeep`. Listar e filtrar — `fs.rm` direto na pasta apagaria os arquivos versionados.
- **G3 do plano (perf):** O fluxo inteiro (scaffold + link + validate) deve rodar em <30s. Em laptop medio Windows 11 SSD, esperado <1s real. Se passar de 5s, algo ta errado — provavelmente bun cold start ou antivirus interferindo em `fs.symlink`.
- **G4 do plano (cross-platform):** `spawn('bun', ...)` precisa que `bun` esteja no PATH. Documentar no README do tracer: pre-req `bun >= 1.0`.
- **Local — bun import resolution:** Importar TS de `../../skills/init/lib/scaffold-templates` em vez de `.ts` explicito — bun resolve. Mas para `spawn`, passar `scripts/harness-validate.ts` com extensao porque eh bun resolvendo via CLI, nao via import.
- **Local — `linkResult.tier` no Windows 11 do usuario:** Provavelmente sera `'hardlink'` (Tier 2). Em CI Linux, sera `'symlink'`. **Documentar empiricamente** o tier observado no MEMORY.md ao rodar — informa Plano 02 sobre comportamento esperado.

---

## Verificacao

### TDD

- [ ] **RED:** Teste E2E escrito antes dos helpers estarem totalmente plugados. Falha porque alguma das dependencias retorna erro ou nao existe.
  - Comando: `bun run test:tracer`
  - Resultado esperado: alguma assertion falha (provavelmente `validatorResult.code` !== 0 ou modulo nao encontrado)

- [ ] **GREEN:** Apos fases 02, 03, 04 concluidas, o E2E passa.
  - Comando: `bun run test:tracer`
  - Resultado esperado: `2 passed, 0 failed`

- [ ] **REFACTOR:** Se o teste tiver setup duplicado entre `it()`s, extrair helper `setupFixture()` retornando paths absolutos.

### Checklist

- [ ] `tests/fixtures/empty-dir/.gitignore` e `.gitkeep` versionados; resto da pasta gitignored
- [ ] `bun run test:tracer` retorna **2 passed** (happy path + regression)
- [ ] **Tracer bullet em <30s:** total elapsed do happy path eh <30_000ms (alvo real esperado <5s)
- [ ] **CA-26 amostral:** validator individual roda em <2s (medido por `durationMs` retornado de `runValidator`)
- [ ] **D2 confirmado:** AGENTS.md gerado tem zero acentos PT — `! grep -P '[ãâáàçéêíóôõú]' tests/fixtures/empty-dir/AGENTS.md` (em CI; manual em Windows)
- [ ] **D13 confirmado:** validator eh `.ts` (nao `.mjs`) — `test -f tests/fixtures/empty-dir/scripts/harness-validate.ts && ! test -f tests/fixtures/empty-dir/scripts/harness-validate.mjs`
- [ ] **D16 confirmado:** `CLAUDE.md` existe e seu conteudo eh igual a `AGENTS.md` apos init — teste explicito faz a comparacao
- [ ] **R1 mitigada:** Teste roda no Windows 11 Pro do usuario sem developer mode e retorna `linkResult.tier === 'hardlink'` (ou `'copy-with-hook'` se NTFS recusar) — anotar tier observado em MEMORY.md
- [ ] **Regression test confirma CA-27:** AGENTS.md inflado para 50 linhas → validator exit 1 com mensagem de line count
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck strict: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina (CRITERIO PRINCIPAL do tracer bullet):**

```bash
cd anti-vibe-coding
bun run test:tracer
# Esperado: 2 passed, 0 failed, execucao em <30s
```

Output esperado (exemplo):
```
✓ runs full init flow and validator exits 0 in under 30s (842ms)
  Tracer bullet end-to-end: 842ms (link tier: hardlink)
✓ detects regressions: hand-edit AGENTS.md to 50 lines → validator exits 1 (218ms)

 2 pass
 0 fail
 Ran 2 tests across 1 file [1.10s]
```

**Por humano:**
- Apos o teste passar, inspecionar visualmente `tests/fixtures/empty-dir/` durante o run (descomentar o `afterEach` temporariamente). Confirmar que: AGENTS.md tem ~28-32 linhas em ingles legivel; ARCHITECTURE.md tem secoes Overview/Stack/Folder layout; CLAUDE.md reflete AGENTS.md; package.json tem script `harness:validate`.
- Confirmar via `ls -la tests/fixtures/empty-dir/CLAUDE.md` que CLAUDE.md eh symlink (Linux/macOS) ou hardlink (Windows — `fsutil hardlink list CLAUDE.md` mostra ambos).

---

## Notas finais — Conclusao do Plano 01

Apos esta fase passar:

1. Atualizar `MEMORY.md` deste plano com o tier observado no laptop do usuario (R1 confirmada empiricamente).
2. Atualizar `STATE.md` do PRD raiz marcando Plano 01 como `completed`.
3. **Sinalizar para o Plano 02:** o helper `scaffoldTemplates` precisa ser estendido para 14+ docs. Os helpers `linkClaudeToAgents` e `harness-validate.ts` ja estao disponiveis e podem ser reutilizados sem modificacao no Plano 02.
4. CA-06 (PRD) **NAO esta totalmente coberto** por este plano — Plano 01 entrega 4 arquivos (AGENTS.md, ARCHITECTURE.md, CLAUDE.md, scripts/harness-validate.ts + package.json), nao os 14+ exigidos pelo CA-06 completo. CA-06 sera atendido na conclusao do Plano 02.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

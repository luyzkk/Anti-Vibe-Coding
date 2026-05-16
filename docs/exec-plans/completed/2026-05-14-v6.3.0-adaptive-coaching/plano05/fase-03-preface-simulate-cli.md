<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão).
Exemplo: `// 2026-05-15 (Luiz/dev): preface:simulate CLI — alinhado com PRD v6.3.0 §RF-CH-03`
-->

# Fase 03: CLI debug `bun run preface:simulate {skill-name}`

**Plano:** 05 — Polish & DX (Could Haves)
**Sizing:** ~1h
**Depende de:** Plano 01 fase-01 (`readPrefaceContext` e tipo `PrefaceContext` existem); Plano 04 fase-01 (idealmente ≥1 skill com bloco preface — fallback se ausente)
**Visual:** false
**Defer to v6.3.1: OK** — CLI de debug. Nenhum critério de aceite do release depende disso. Se Plano 04 fase-01 derrapar, a CLI ainda roda mas só mostra fallback default + warning. Pode shippar em v6.3.0 mesmo sem skills migradas.

---

## Objetivo

Criar script `scripts/preface-simulate.ts` invocável via `bun run preface:simulate {skill-name}` que printa o preface composto que SERIA injetado em uma skill ao ser invocada, SEM invocar a skill. Útil para:

- Debug ad-hoc do framework adaptativo
- Validação manual antes de submeter mudanças em lookup tables
- Geração de snapshots de regressão (CI future-proof)

---

## Contexto

PRD v6.3.0 §RF-CH-03:

> CLI debug `bun run preface:simulate {skill-name}` mostra preface composto que seria injetado, sem invocar a skill.

Problema que resolve: hoje, para ver qual preface uma skill receberia, o dev precisa invocar a skill e ler logs. Caro (tokens), lento, e mistura preface com saída da skill. A CLI dá um path determinístico: dado o estado atual do projeto (`architecture-profile.md` + lookup tables das skills) e o nome da skill, retorna a STRING de preface composto.

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `scripts/preface-simulate.ts` | Create | CLI: parse argv → ler skill name → invocar `readPrefaceContext` → buscar lookup table da skill → compor preface → printar |
| `scripts/preface-simulate.test.ts` | Create | 3 testes: skill com preface, skill sem preface (fallback warning), skill inexistente (erro útil) |
| `package.json` | Modify | Adicionar `"preface:simulate": "bun run scripts/preface-simulate.ts"` em `scripts` |

---

## Implementação

### Passo 0: Validar bloqueadores

- [ ] Confirmar `skills/lib/preface-context.ts` exporta `readPrefaceContext` E o tipo `PrefaceContext`.
- [ ] Verificar quantas skills têm bloco `<!-- profile-aware-preface:start -->`:
      `grep -l 'profile-aware-preface:start' skills/*/SKILL.md`
- [ ] Se zero: documentar em MEMORY.md "fase-03 rodando com fallback only — Plano 04 fase-01 pendente". CLI ainda funciona (fallback + warning).

### Passo 1: Criar `scripts/preface-simulate.ts`

```typescript
#!/usr/bin/env bun
// 2026-05-15 (Luiz/dev): preface:simulate — PRD v6.3.0 §RF-CH-03.
// CLI de debug: printa preface composto que SERIA injetado em uma skill, sem invocar.
// G2 do plano05: fallback grace — se skill nao tem bloco preface, printa default + warning.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { readPrefaceContext } from '../skills/lib/preface-context'

const root = process.cwd()

const PREFACE_START = '<!-- profile-aware-preface:start -->'
const PREFACE_END = '<!-- profile-aware-preface:end -->'

function usage(): never {
  console.error('Usage: bun run preface:simulate <skill-name>')
  console.error('Example: bun run preface:simulate security')
  console.error('')
  console.error('Prints the composed preface that would be injected into <skill-name>')
  console.error('based on current architecture-profile.md and lookup tables.')
  process.exit(2)
}

async function findSkillDir(skillName: string): Promise<string | null> {
  const candidate = path.join(root, 'skills', skillName)
  try {
    const stat = await fs.stat(candidate)
    if (stat.isDirectory()) return candidate
  } catch {
    return null
  }
  return null
}

async function readSkillPreface(skillDir: string): Promise<string | null> {
  const skillMdPath = path.join(skillDir, 'SKILL.md')
  let content: string
  try {
    content = await fs.readFile(skillMdPath, 'utf8')
  } catch {
    return null
  }
  const startIdx = content.indexOf(PREFACE_START)
  const endIdx = content.indexOf(PREFACE_END)
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null
  return content.slice(startIdx, endIdx + PREFACE_END.length)
}

export async function simulate(skillName: string): Promise<void> {
  if (!skillName) usage()

  const skillDir = await findSkillDir(skillName)
  if (!skillDir) {
    console.error(`Skill '${skillName}' not found in skills/`)
    console.error(`Hint: ls skills/ to see available skills`)
    process.exit(1)
  }

  const ctx = readPrefaceContext(root)
  console.log('--- PrefaceContext ---')
  console.log(JSON.stringify(ctx, null, 2))
  console.log('')

  const block = await readSkillPreface(skillDir)
  if (!block) {
    console.warn(`WARN: skills/${skillName}/SKILL.md has no profile-aware-preface block`)
    console.warn('Showing default fallback (skill behaves as v6.2 generic).')
    console.log('')
    console.log('--- Default Fallback Preface ---')
    console.log('(empty — skill prompt unchanged from v6.2)')
    return
  }

  console.log(`--- Composed Preface (skills/${skillName}/SKILL.md) ---`)
  console.log(block)
  console.log('')
  console.log('--- Notes ---')
  if (!ctx.profile) {
    console.log('profile: null — skill falls back to DEFAULT_*_PREFACE (CA-02).')
  } else {
    console.log(`profile: ${ctx.profile} (confidence ${ctx.confidence}) — lookup uses *_PREFACE_BY_PROFILE['${ctx.profile}'].`)
  }
}

// Entrypoint
if (import.meta.main) {
  const skillName = process.argv[2]
  simulate(skillName ?? '').catch((err) => {
    console.error('preface:simulate error:', err)
    process.exit(1)
  })
}
```

### Passo 2: Adicionar entrada em `package.json`

```json
{
  "scripts": {
    "preface:simulate": "bun run scripts/preface-simulate.ts"
  }
}
```

Inserir na lista existente, mantendo ordem alfabética se já é convenção, ou no final.

### Passo 3: Criar `scripts/preface-simulate.test.ts`

```typescript
// 2026-05-15 (Luiz/dev): preface-simulate.test.ts — PRD v6.3.0 §RF-CH-03.
import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Helper: roda CLI capturando stdout/stderr/exitcode.
async function runCli(workdir: string, skillName: string): Promise<{ stdout: string; stderr: string; code: number }> {
  const proc = Bun.spawn(['bun', 'run', path.resolve(__dirname, 'preface-simulate.ts'), skillName], {
    cwd: workdir,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = await proc.exited
  return { stdout, stderr, code }
}

const SKILL_WITH_PREFACE = `---
name: security
---

<!-- profile-aware-preface:start -->
\`\`\`typescript
import { readPrefaceContext } from '../lib/preface-context'
const ctx = readPrefaceContext()
\`\`\`
<!-- profile-aware-preface:end -->

# Security
`

const SKILL_WITHOUT_PREFACE = `---
name: plain
---

# Plain Skill (no adaptive preface)
`

describe('preface:simulate CLI', () => {
  let workdir: string

  beforeEach(async () => {
    workdir = await mkdtemp(path.join(tmpdir(), 'preface-sim-'))
    await mkdir(path.join(workdir, 'skills', 'lib'), { recursive: true })
    // Copia preface-context.ts minimo (ou symlinka). Skip detalhe — assumido em integration test.
  })

  afterEach(async () => {
    await rm(workdir, { recursive: true, force: true })
  })

  test('prints preface block when skill has it', async () => {
    await mkdir(path.join(workdir, 'skills', 'security'), { recursive: true })
    await writeFile(path.join(workdir, 'skills', 'security', 'SKILL.md'), SKILL_WITH_PREFACE)
    const { stdout, code } = await runCli(workdir, 'security')
    expect(code).toBe(0)
    expect(stdout).toContain('profile-aware-preface:start')
    expect(stdout).toContain('profile-aware-preface:end')
    expect(stdout).toContain('readPrefaceContext')
  })

  test('prints warning + default fallback when skill has no preface block', async () => {
    await mkdir(path.join(workdir, 'skills', 'plain'), { recursive: true })
    await writeFile(path.join(workdir, 'skills', 'plain', 'SKILL.md'), SKILL_WITHOUT_PREFACE)
    const { stdout, stderr, code } = await runCli(workdir, 'plain')
    expect(code).toBe(0)
    expect(stderr).toContain('no profile-aware-preface block')
    expect(stdout).toContain('Default Fallback Preface')
  })

  test('exits non-zero with helpful error when skill does not exist', async () => {
    const { stderr, code } = await runCli(workdir, 'does-not-exist')
    expect(code).toBe(1)
    expect(stderr).toContain('not found')
    expect(stderr).toContain('skills/')
  })

  test('exits 2 with usage when skill name omitted', async () => {
    const { stderr, code } = await runCli(workdir, '')
    expect(code).toBe(2)
    expect(stderr).toContain('Usage')
  })
})
```

> **Nota:** O teste spawn-based depende de copiar `preface-context.ts` para o tmpdir ou ajustar o resolver de imports. Alternativa pragmática: mover a função `simulate` para um helper testável puro (recebe `projectRoot` como parâmetro) e testar a função diretamente em vez de spawnar processo. Isso reduz o setup mas perde a cobertura do shebang/CLI entrypoint. Decidir durante implementação — documentar trade-off em MEMORY.md.

### Passo 4: Smoke test manual

```bash
# Em projeto com /security migrada (Plano 04 fase-01 verde):
bun run preface:simulate security
# Esperado: imprime PrefaceContext + bloco preface da SKILL.md + nota sobre lookup.

# Em projeto sem skill migrada (Plano 04 deferido):
bun run preface:simulate api-design
# Esperado: WARN + Default Fallback Preface + nota "empty — v6.2 generic".

# Erro path:
bun run preface:simulate nope
# Esperado: exit 1 + "Skill 'nope' not found in skills/".
```

---

## Gotchas

- **G2 do plano README (CRÍTICO):** Fallback grace é obrigatório. Skill sem bloco preface NÃO é erro — é warning + default. Isso permite fase-03 shippar mesmo se Plano 04 fase-01 estiver deferido. NÃO levantar exception nesse caso.
- **G5 do plano README:** Validar `process.argv[2]` antes de usar. Skill name vazio = `usage()` com exit 2 (convenção POSIX). NÃO printar `undefined` no output.
- **G7 do plano README:** Sem AST. Extrair bloco via `content.indexOf(PREFACE_START)` + `slice` simples. Aceita falso-positivo se algum SKILL.md tiver marker em exemplo de doc — improvável na prática.
- **`import.meta.main`:** Bun-specific. Garante que o módulo só roda como CLI quando invocado diretamente, mas pode ser importado para teste sem disparar `simulate()`. Mirror do pattern de `scripts/new-plan.ts` se aplicável.
- **`__dirname` em ESM:** Bun suporta `__dirname` em scripts `.ts` mesmo com `"type": "module"`. Se TypeScript reclamar, usar `import.meta.url` + `fileURLToPath`. Documentar a escolha no comment.
- **Teste com spawn é flaky no Windows:** O teste usa `Bun.spawn` que pode ter quirks em Windows com paths. Se rodar instável, refatorar para testar a função `simulate(projectRoot, skillName)` direto (não como CLI). Cobertura levemente menor mas testes determinísticos.

---

## Critério de Verificação

### TDD

- [ ] **RED:** `bun run test -- preface-simulate` falha (script ainda não existe).
- [ ] **GREEN:** Após implementar `simulate`, todos os 4 testes passam.
- [ ] **REFACTOR:** Extrair `readSkillPreface` se cresce — manter `simulate` <50 linhas.

### Checklist

- [ ] `scripts/preface-simulate.ts` criado e roda standalone (`bun run scripts/preface-simulate.ts security`)
- [ ] `package.json` tem entry `"preface:simulate"`
- [ ] `scripts/preface-simulate.test.ts` com 4 testes verdes
- [ ] `bun run preface:simulate <skill-existente-com-bloco>` printa preface + PrefaceContext
- [ ] `bun run preface:simulate <skill-existente-sem-bloco>` printa warning + default
- [ ] `bun run preface:simulate nope` exit 1 com mensagem útil
- [ ] `bun run preface:simulate` (sem arg) exit 2 com usage
- [ ] `bun run harness:validate` exit 0
- [ ] `bun run lint` limpo

### Critério de Aceite

**Por máquina:**
- `bun run preface:simulate --help` ou `bun run preface:simulate` (vazio) retorna exit 2 + usage.
- `grep -c "preface:simulate" package.json` retorna `>= 1`.
- `bun run test -- preface-simulate` retorna `4 passed, 0 failed`.

**Referências PRD:**
- RF-CH-03: ✓ CLI debug `bun run preface:simulate {skill-name}` implementada
- CA-02 (parcial): ✓ skill sem profile-aware-preface mostra "default fallback" — v6.2 preservado

---

## TDD Notes

- **Testar primeiro:** "exits 2 with usage when skill name omitted" — caso mais simples, pure CLI parsing.
- **Testar segundo:** "exits non-zero when skill does not exist" — fs error path.
- **Testar terceiro:** "prints warning when skill has no preface block" — feature central do fallback (G2).
- **Testar por último:** "prints preface block when skill has it" — caso feliz, depende de fixture completa.
- **Fixtures necessárias:**
  - Tmpdir com `skills/security/SKILL.md` contendo bloco preface válido (snippet inline no teste).
  - Tmpdir com `skills/plain/SKILL.md` sem bloco (snippet inline).
- **Mock de `readPrefaceContext`:** Se isolamento via tmpdir for difícil, mockar `readPrefaceContext` direto em vez de spawnar processo. Trade-off documentado em Gotcha "Teste com spawn é flaky no Windows".

---

<!-- Gerado por /plan-feature em 2026-05-15 -->

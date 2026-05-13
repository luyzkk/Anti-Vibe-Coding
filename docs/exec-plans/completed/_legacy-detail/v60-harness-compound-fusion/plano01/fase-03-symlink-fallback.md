<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: Symlink Fallback 3-Tier (ln -s → mklink /H → copy + hook)

**Plano:** 01 — Tracer Bullet
**Sizing:** 1.5h
**Depende de:** fase-02 (AGENTS.md ja existe no projeto via scaffoldTemplates)
**Visual:** false

---

## O que esta fase entrega

Helper `lib/symlink-fallback.ts` que tenta criar `CLAUDE.md` apontando para `AGENTS.md` em 3 niveis:

1. **Tier 1** — symlink POSIX (`fs.symlink` com `'file'`). Funciona em Linux/macOS sem permissoes especiais. Funciona em Windows **somente** com developer mode ON.
2. **Tier 2** — hardlink NTFS (`fs.link`). Funciona em Windows 11 SEM developer mode, SEM admin. Mesma data, mesmo inode no NTFS.
3. **Tier 3** — `fs.copyFile` + registrar hook `PostToolUse(Edit|Write)` em `.claude/settings.local.json` que detecta edits em `AGENTS.md` e re-copia para `CLAUDE.md`.

Mitiga **R1** (Windows symlink limitations) e implementa **D16** (AGENTS.md fonte unica, CLAUDE.md espelho).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/symlink-fallback.ts` | Create | Helper 3-tier `linkClaudeToAgents(targetDir)` |
| `anti-vibe-coding/skills/init/lib/symlink-fallback.test.ts` | Create | Testes para os 3 caminhos (mockar `fs.symlink`/`fs.link` para forcar cada tier) |
| `anti-vibe-coding/skills/init/assets/hooks/sync-agents-to-claude.cjs` | Create | Hook PostToolUse (Tier 3) — detecta edit em AGENTS.md, re-copia para CLAUDE.md |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Adicionar Step 2 v6.0.0 chamando `linkClaudeToAgents` |

---

## Implementacao

### Passo 1: Helper `lib/symlink-fallback.ts`

```typescript
// 2026-05-11 (Luiz/dev): 3-tier fallback para CLAUDE.md → AGENTS.md
// Mitiga R1 (Windows symlink). Decisao: D16 do PRD v6.0.0.
// Ordem: symlink (POSIX/Win-devmode) → hardlink (Win-NTFS) → copy + hook PostToolUse.

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type LinkTier = 'symlink' | 'hardlink' | 'copy-with-hook'

export type LinkResult = {
  tier: LinkTier
  targetPath: string
  hookRegistered: boolean
}

export async function linkClaudeToAgents(targetDir: string): Promise<LinkResult> {
  const agentsPath = path.join(targetDir, 'AGENTS.md')
  const claudePath = path.join(targetDir, 'CLAUDE.md')

  // Garantir que AGENTS.md existe — fail fast se fase-02 nao rodou.
  await fs.access(agentsPath)

  // Limpar CLAUDE.md existente (idempotente). Tolerante a ENOENT.
  await fs.rm(claudePath, { force: true })

  // Tier 1 — symlink
  try {
    await fs.symlink(agentsPath, claudePath, 'file')
    return { tier: 'symlink', targetPath: claudePath, hookRegistered: false }
  } catch (err) {
    if (!isPermissionOrUnsupported(err)) throw err
  }

  // Tier 2 — hardlink NTFS (nao exige admin no Windows 11)
  try {
    await fs.link(agentsPath, claudePath)
    return { tier: 'hardlink', targetPath: claudePath, hookRegistered: false }
  } catch (err) {
    if (!isPermissionOrUnsupported(err)) throw err
  }

  // Tier 3 — copy + hook PostToolUse
  await fs.copyFile(agentsPath, claudePath)
  await registerSyncHook(targetDir)
  return { tier: 'copy-with-hook', targetPath: claudePath, hookRegistered: true }
}

function isPermissionOrUnsupported(err: unknown): err is NodeJS.ErrnoException {
  if (!isErrnoException(err)) return false
  return err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'ENOSYS'
}

function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && typeof (value as NodeJS.ErrnoException).code === 'string'
}

async function registerSyncHook(targetDir: string): Promise<void> {
  const settingsPath = path.join(targetDir, '.claude', 'settings.local.json')
  await fs.mkdir(path.dirname(settingsPath), { recursive: true })

  let settings: Record<string, unknown> = {}
  try {
    const existing = await fs.readFile(settingsPath, 'utf8')
    settings = JSON.parse(existing) as Record<string, unknown>
  } catch {
    // arquivo nao existe — comeca do zero
  }

  const hooks = (settings.hooks as Record<string, unknown[]> | undefined) ?? {}
  const postToolUse = (hooks.PostToolUse as Array<Record<string, unknown>> | undefined) ?? []

  const alreadyRegistered = postToolUse.some((entry) =>
    typeof entry.command === 'string' && entry.command.includes('sync-agents-to-claude.cjs')
  )

  if (!alreadyRegistered) {
    postToolUse.push({
      matcher: 'Edit|Write',
      command: 'node .claude/hooks/sync-agents-to-claude.cjs',
    })
    hooks.PostToolUse = postToolUse
    settings.hooks = hooks
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
  }

  // Tambem copiar o script do hook em si para .claude/hooks/
  const hookSrc = path.join(import.meta.dir, '..', 'assets', 'hooks', 'sync-agents-to-claude.cjs')
  const hookDst = path.join(targetDir, '.claude', 'hooks', 'sync-agents-to-claude.cjs')
  await fs.mkdir(path.dirname(hookDst), { recursive: true })
  await fs.copyFile(hookSrc, hookDst)
}
```

### Passo 2: Hook `assets/hooks/sync-agents-to-claude.cjs`

```javascript
// 2026-05-11 (Luiz/dev): Tier 3 do fallback de symlink — re-copia AGENTS.md
// para CLAUDE.md sempre que AGENTS.md eh editado. Disparado por PostToolUse.
// CommonJS porque hooks Claude Code rodam em runtime Node simples.

const fs = require('node:fs')
const path = require('node:path')

const projectRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const agentsPath = path.join(projectRoot, 'AGENTS.md')
const claudePath = path.join(projectRoot, 'CLAUDE.md')

// Hook recebe payload JSON via stdin com tool_input.file_path
let payload = ''
process.stdin.on('data', (chunk) => { payload += chunk })
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(payload)
    const editedPath = event?.tool_input?.file_path
    if (typeof editedPath !== 'string') return

    const resolved = path.resolve(editedPath)
    if (resolved !== path.resolve(agentsPath)) return

    fs.copyFileSync(agentsPath, claudePath)
    process.stdout.write(JSON.stringify({ status: 'synced', from: 'AGENTS.md', to: 'CLAUDE.md' }))
  } catch (err) {
    // silencioso — hook nao bloqueia execucao
    process.stderr.write(`sync-agents-to-claude error: ${err.message}\n`)
  }
})
```

### Passo 3: Teste `symlink-fallback.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { linkClaudeToAgents } from './symlink-fallback'

const FIXTURE_DIR = path.join(import.meta.dir, '__fixtures__', 'link-test')

describe('linkClaudeToAgents', () => {
  beforeEach(async () => {
    await fs.mkdir(FIXTURE_DIR, { recursive: true })
    await fs.writeFile(path.join(FIXTURE_DIR, 'AGENTS.md'), '# Agent\n', 'utf8')
  })

  afterEach(async () => {
    await fs.rm(FIXTURE_DIR, { recursive: true, force: true })
  })

  it('uses tier 1 symlink when permission allows', async () => {
    const result = await linkClaudeToAgents(FIXTURE_DIR)
    expect(['symlink', 'hardlink']).toContain(result.tier)
    const stat = await fs.lstat(path.join(FIXTURE_DIR, 'CLAUDE.md'))
    expect(stat.isSymbolicLink() || stat.isFile()).toBe(true)
  })

  it('reads same content from CLAUDE.md as AGENTS.md', async () => {
    await linkClaudeToAgents(FIXTURE_DIR)
    const a = await fs.readFile(path.join(FIXTURE_DIR, 'AGENTS.md'), 'utf8')
    const c = await fs.readFile(path.join(FIXTURE_DIR, 'CLAUDE.md'), 'utf8')
    expect(c).toBe(a)
  })

  it('is idempotent — running twice yields same result', async () => {
    await linkClaudeToAgents(FIXTURE_DIR)
    const result2 = await linkClaudeToAgents(FIXTURE_DIR)
    expect(['symlink', 'hardlink', 'copy-with-hook']).toContain(result2.tier)
  })
})
```

Testar Tier 3 explicitamente exige mockar `fs.symlink` e `fs.link` para lancar `EPERM`. Adicionar:

```typescript
it('falls back to copy-with-hook when symlink and hardlink fail', async () => {
  const symlinkSpy = mock.module('node:fs', () => ({
    promises: {
      symlink: () => { throw Object.assign(new Error('EPERM'), { code: 'EPERM' }) },
      link: () => { throw Object.assign(new Error('EPERM'), { code: 'EPERM' }) },
      // ... resto passthrough
    }
  }))
  // ... resto do teste
})
```

(Detalhes do mock podem variar conforme a API de mocking do `bun:test` evoluir.)

### Passo 4: Atualizar SKILL.md

Adicionar Step 2 v6.0.0 logo apos Step 1 da fase-02:

```markdown
## Step 2 (v6.0.0): Link CLAUDE.md to AGENTS.md

\`\`\`bash
bun run -e "
import { linkClaudeToAgents } from './lib/symlink-fallback.ts'
const r = await linkClaudeToAgents(process.cwd())
console.log('Linked via tier:', r.tier)
if (r.tier === 'copy-with-hook') {
  console.log('Hook registered in .claude/settings.local.json — CLAUDE.md will re-sync on edits')
}
"
\`\`\`
```

---

## Gotchas

- **G1 do plano (D16/R1) — NTFS hard link nao exige admin:** Confirmado: `fs.link` no Windows 11 cria hard link sem developer mode e sem prompt UAC, desde que origem e destino estejam no mesmo volume NTFS. Documentar isso na MEMORY.md ao confirmar empiricamente.
- **G4 do plano (cross-platform):** Codigos de erro de `fs.symlink` variam: Linux retorna `EPERM`/`EACCES`, Windows retorna `EPERM` quando developer mode esta off, ou `ENOSYS` em filesystems exoticos. Incluir os tres.
- **Local — hard link vs symlink semantics:** Hard link aparece como arquivo normal em `stat`. `lstat` nao revela que eh link. Para o usuario que edita CLAUDE.md (que eh hardlink), AGENTS.md tambem muda — exatamente o que queremos. **Edicao do hardlink desconecta?** Nao em NTFS — Edit/Write usa truncate+write no mesmo inode. Confirmar empiricamente.
- **Local — hook nao roda em Linux/macOS quando Tier 1/2 funcionou:** Correto. Hook so eh registrado em Tier 3. Em outras tiers, o link/hardlink ja propaga edits automaticamente.
- **Local — payload do hook:** Claude Code passa JSON via stdin com `tool_input.file_path`. Hooks devem ler stdin **sincronamente** ou esperar evento `end` antes de processar. Hook nao pode demorar — usar `copyFileSync` (sincrono e instantaneo para arquivos pequenos).

---

## Verificacao

### TDD

- [ ] **RED:** `symlink-fallback.test.ts` escrito antes do helper. Falha por `Cannot find module './symlink-fallback'`.
  - Comando: `bun run test symlink-fallback.test.ts`
  - Resultado esperado: erro de modulo nao encontrado

- [ ] **GREEN:** Helper implementado. Os 3 testes basicos passam.
  - Comando: `bun run test symlink-fallback.test.ts`
  - Resultado esperado: `3 passed, 0 failed` (4 se incluir o de Tier 3 com mock)

### Checklist

- [ ] Helper retorna `tier: 'symlink' | 'hardlink' | 'copy-with-hook'` corretamente baseado no ambiente
- [ ] **Em Windows 11 Pro sem developer mode**: `linkClaudeToAgents` retorna `tier: 'hardlink'` (Tier 2 funciona) — testar empiricamente no laptop do usuario
- [ ] Em Linux/macOS: retorna `tier: 'symlink'`
- [ ] `CLAUDE.md` espelha `AGENTS.md` em **todos os 3 tiers** (conteudo identico apos `linkClaudeToAgents`)
- [ ] Helper eh **idempotente**: rodar 2x nao quebra (segunda execucao remove CLAUDE.md e recria)
- [ ] Tier 3 cria `.claude/settings.local.json` com hook PostToolUse registrado uma unica vez (idempotente)
- [ ] Tier 3 copia `sync-agents-to-claude.cjs` para `.claude/hooks/` no projeto-alvo
- [ ] Hook `sync-agents-to-claude.cjs` so dispara quando `tool_input.file_path` aponta para AGENTS.md (nao todo edit)
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck strict: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- Em Windows 11 Pro sem developer mode (ambiente do usuario): `bun run test symlink-fallback.test.ts` retorna 3+ passed; resultado de `linkClaudeToAgents` eh `tier: 'hardlink'`.
- Em Linux/macOS (CI): mesmo teste retorna 3+ passed; resultado eh `tier: 'symlink'`.
- Apos `linkClaudeToAgents` em qualquer tier: `diff <(cat AGENTS.md) <(cat CLAUDE.md)` retorna vazio (arquivos identicos).
- Apos edit em AGENTS.md em projeto Tier 3: hook re-sincroniza CLAUDE.md em <500ms (verificavel via timestamp `fs.stat`).

**Por humano:**
- Abrir CLAUDE.md no VS Code (no laptop Windows 11 do usuario), confirmar que conteudo eh igual a AGENTS.md. Editar AGENTS.md, salvar, abrir CLAUDE.md de novo — conteudo refletiu (Tier 1/2 instantaneo; Tier 3 apos primeiro edit do agente).

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

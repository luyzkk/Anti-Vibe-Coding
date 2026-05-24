<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-23 (Luiz/dev): skip-by-default — PRD D17-A literal Andre`
-->

# Fase 01: Subcomando `install` (skip-by-default + `--force`)

**Plano:** 03 — Subcomandos + Patches
**Sizing:** 1.5h
**Depende de:** Plano 02 completo (templates fisicos em `skills/compound-engineering/assets/` + `getCompoundManifest()` apontando para novos paths)
**Visual:** false

---

## O que esta fase entrega

Subcomando `compound-engineering install [--force]` operacional: copia 10 templates do manifest para o target, skipa arquivos existentes por padrao (D17-A), permite sobrescrita com `--force`, nunca toca notas compound (`docs/compound/*.md`), funciona em projetos sem `package.json` (stack-agnostic D11).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/compound-engineering/lib/installer.ts` | Create | Implementa `installCompound(targetRoot, opts): InstallResult` — orquestra copia via manifest + decisoes skip/force |
| `skills/compound-engineering/lib/installer.test.ts` | Create | Testes unitarios cobrindo CA-04/05/06/20 |
| `skills/compound-engineering/SKILL.md` | Modify | Adiciona bloco do subcomando `install` no body (parser de args) — stub criado em Plano 01 fase-01 |
| `skills/compound-engineering/lib/install-types.ts` | Create | Tipos `InstallOpts`, `InstallResult` (campos: `created`, `skipped`, `overwritten`, `notes`) |

---

## Implementacao

### Passo 1: Definir tipos do contrato

Criar `skills/compound-engineering/lib/install-types.ts`:

```typescript
// 2026-05-23 (Luiz/dev): tipos do installer — PRD MH-05/CA-04/05/06
export type InstallOpts = {
  force: boolean
  // 2026-05-23 (Luiz/dev): dryRun reservado para CH-02 (Could Have v1.x) — ignorar nesta fase
  dryRun?: boolean
}

export type InstallResult = {
  created: string[]      // paths copiados (target relative)
  skipped: string[]      // paths skipped por skip-by-default (D17-A)
  overwritten: string[]  // paths sobrescritos por --force
  notes: string[]        // mensagens UX (ex: "No package.json detected — ...")
}
```

### Passo 2: Implementar `installCompound`

Criar `skills/compound-engineering/lib/installer.ts`. Logica nuclear (referencia, nao implementacao final):

```typescript
import { getCompoundManifest } from './manifest'
import type { InstallOpts, InstallResult } from './install-types'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// 2026-05-23 (Luiz/dev): nunca toca docs/compound/*.md — RF-11, CA-06
const COMPOUND_NOTES_GLOB = /^docs\/compound\/(?!README\.md$).*\.md$/

export async function installCompound(
  targetRoot: string,
  opts: InstallOpts,
): Promise<InstallResult> {
  const result: InstallResult = { created: [], skipped: [], overwritten: [], notes: [] }
  const manifest = getCompoundManifest()

  // 2026-05-23 (Luiz/dev): G5 — stack-agnostic. Sem package.json = nota UX, sem patch npm
  const hasPackageJson = await fileExists(path.join(targetRoot, 'package.json'))
  if (!hasPackageJson) {
    result.notes.push(
      "No package.json detected — installed compound-check.ts as standalone (run via 'bun scripts/compound-check.ts')",
    )
  }

  for (const entry of manifest) {
    const absDst = path.join(targetRoot, entry.dst)
    // 2026-05-23 (Luiz/dev): nunca alvo do installer (D17-A + RF-11 + CA-06)
    if (COMPOUND_NOTES_GLOB.test(entry.dst)) continue

    const exists = await fileExists(absDst)
    if (exists && !opts.force) {
      result.skipped.push(entry.dst)
      continue
    }
    await fs.mkdir(path.dirname(absDst), { recursive: true })
    await fs.copyFile(entry.src, absDst)
    if (exists) result.overwritten.push(entry.dst)
    else result.created.push(entry.dst)
  }

  return result
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
```

### Passo 3: Plugar no SKILL.md

Adicionar no body de `skills/compound-engineering/SKILL.md` (apos parser de args estabelecido em Plano 01 fase-01) um caso para `install`:

```markdown
### Subcomando: install

Quando `args` comeca com `install`:

1. Detecta target root (`process.cwd()` por default).
2. Parse `--force` em `args.includes('--force')`.
3. Invoca `installCompound(targetRoot, { force })`.
4. Renderiza output:
   - `Created: <list>` (se `result.created.length > 0`)
   - `Overwritten: <list>` (se `result.overwritten.length > 0`)
   - `Skipped existing files (use --force to overwrite): <list>` (se `result.skipped.length > 0`)
   - `result.notes` (uma linha por nota)
```

### Passo 4: Console output literal (UX copy PRD)

Strings exatas a usar nos logs do subcomando (referencia: PRD "Copy relevante"):

- Skipped: `Skipped existing files (use --force to overwrite): {lista CSV}`
- Force overwrite: `Overwritten: {lista CSV}`
- Sem package.json (G5): copiar literal o texto da nota.

---

## Gotchas

- **G5 do README (D11 + CA-20):** projeto sem `package.json` precisa instalar `scripts/compound-check.ts` como standalone — log de UX e obrigatorio.
- **G6 do README (D17-A + CA-04/05/06):** skip-by-default; `--force` opt-in; notas (`docs/compound/*.md` exceto `README.md`) NUNCA sao alvo.
- **G7 do README (D24):** dogfooding — sem blocklist do proprio repo Anti-Vibe-Coding. Comportamento normal aplica (skip se ja existe; `--force` sobrescreve).
- **Local:** `getCompoundManifest()` retorna `src` absoluto (D21). `path.join(targetRoot, entry.dst)` resolve target. Forward slash vs backslash no Windows: normalizar para POSIX ao logar `result.created/skipped/overwritten`.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `installer.test.ts` escrito antes da implementacao
  - Comando: `bun test skills/compound-engineering/lib/installer.test.ts --grep 'skip-by-default'`
  - Resultado esperado: `Expected skipped to include "docs/COMPOUND_ENGINEERING.md"`, recebido `undefined` (assertion failure)

- [ ] **GREEN:** `installer.ts` implementado, todos os testes passam
  - Comando: `bun test skills/compound-engineering/lib/installer.test.ts`
  - Resultado esperado: `4 passed, 0 failed` (CA-04, CA-05, CA-06, CA-20)

### Checklist

- [ ] CA-04: target com `docs/COMPOUND_ENGINEERING.md` pre-existente — install (sem flag) skipa e reporta no `result.skipped`
- [ ] CA-05: mesmo target — install `--force` sobrescreve e reporta no `result.overwritten`
- [ ] CA-06: target com `docs/compound/2024-05-foo.md` (nota do dev) — install e install `--force` ambos NAO alteram o arquivo
- [ ] CA-20: target sem `package.json` — install copia `scripts/compound-check.ts` e adiciona nota literal em `result.notes`
- [ ] Testes passam: `bun test skills/compound-engineering/lib/`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: tipos `InstallOpts`/`InstallResult` exportados e importaveis cross-skill

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/compound-engineering/lib/installer.test.ts` retorna 4 passed (CA-04/05/06/20)
- Grep `from '../../init/` em `skills/compound-engineering/lib/installer.ts` retorna 0 (CA-17 — one-way dependency)

**Por humano:**
- Console output dos 3 cenarios (skipped, overwritten, sem package.json) bate literalmente com strings de PRD "Copy relevante"

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

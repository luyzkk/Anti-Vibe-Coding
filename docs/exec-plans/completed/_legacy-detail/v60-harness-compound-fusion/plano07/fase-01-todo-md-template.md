<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-11 (Luiz/dev): default 'oldest' — alinhado com PRD §D8 Fluxo E`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: TODO.md Template + Passo no /init

**Plano:** 07 — TODO.md + /todo-pick
**Sizing:** 30min
**Depende de:** Nenhuma (so depende de `/init` ja existir, garantido por Plano 02 fase-02)
**Visual:** false

---

## O que esta fase entrega

Template `TODO.md` skeleton + integracao no `/init` que cria o arquivo na raiz do projeto-alvo de forma idempotente (CA-31 pre-requisito — sem `TODO.md` na raiz, `/todo-pick` nao tem o que listar).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/todo-pick/templates/todo-md-skeleton.md` | Create | Template do `TODO.md` em EN (D2) — header + comentario explicativo |
| `skills/init/SKILL.md` | Modify | Adicionar passo no fluxo de scaffold que copia o template para `{projectRoot}/TODO.md` se ausente (idempotente — G2) |
| `tests/init/todo-md-skeleton.test.ts` | Create | Teste E2E em fixture vazia: rodar `/init` esperando `TODO.md` exista + ter header `# TODO` |

---

## Implementacao

### Passo 1: Criar template skeleton (EN — D2)

Template em **EN** porque eh artefato exportado para projeto-alvo (D2 verbatim). Conteudo minimo — usuario expande com seu micro-debito.

```markdown
# TODO

<!--
Micro-debt log. Each line is one actionable item the agent or user can pick.
Format:
  - [ ] {YYYY-MM-DD} {classifier} description

Classifiers:
  - file:relative/path.ts:line  (concrete code issue)
  - feature:name                (abstract scope)
  - (omit)                      (free-form)

States:
  - [ ] pending
  - [x] done
  - [-] skipped (kept for history; ignored by /todo-pick by default)

Pick one at a time via `/anti-vibe-coding:todo-pick`.
-->
```

### Passo 2: Modificar `skills/init/SKILL.md` para criar `TODO.md`

Adicionar passo no fluxo do `/init` (apos scaffold dos 9 docs harness, antes do `harness:validate`):

```markdown
### Passo X: Criar TODO.md na raiz (idempotente)

Verificar se `{projectRoot}/TODO.md` existe.
- Se existe: skip silencioso. Log em telemetria `init.todo_md_skipped` (G2).
- Se ausente: copiar `<plugin-root>/skills/todo-pick/templates/todo-md-skeleton.md`
  para `{projectRoot}/TODO.md`. Log em telemetria `init.todo_md_created`.

Importante:
- Encoding: UTF-8 sem BOM (07-A2)
- Line endings: LF (`\n`), nao CRLF
- Permissoes: 0644 (read-write owner, read others)
```

### Passo 3: Teste E2E

```typescript
// 2026-05-11 (Luiz/dev): valida que /init cria TODO.md em fixture vazia
// Referencia: CA-31 pre-requisito + G2 idempotencia
import { describe, it, expect, beforeEach } from 'bun:test'
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { runInit } from '../../skills/init/runner' // helper que existe apos Plano 02 fase-02

describe('init creates TODO.md', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'avc-init-todo-'))
  })

  it('writes TODO.md skeleton in empty project root', async () => {
    await runInit({ projectRoot: tmpDir, stack: 'node-ts' })
    const todoPath = join(tmpDir, 'TODO.md')
    expect(existsSync(todoPath)).toBe(true)
    const content = readFileSync(todoPath, 'utf-8')
    expect(content).toMatch(/^# TODO/m)
    expect(content).toContain('Micro-debt log')
  })

  it('does not overwrite existing TODO.md (idempotent)', async () => {
    const todoPath = join(tmpDir, 'TODO.md')
    writeFileSync(todoPath, '# TODO\n\n- [ ] my custom item\n', 'utf-8')
    await runInit({ projectRoot: tmpDir, stack: 'node-ts' })
    const content = readFileSync(todoPath, 'utf-8')
    expect(content).toContain('my custom item')
    expect(content).not.toContain('Micro-debt log') // skeleton NAO sobrescreve
  })
})
```

---

## Gotchas

- **G2 do plano (idempotencia):** Se `TODO.md` ja existe, skip silencioso. Justifica: usuario perderia historico de items pending/done. Caso queira reset, deletar manualmente e re-rodar `/init`.
- **G3 do plano (encoding 07-A2):** UTF-8 sem BOM. Linhas LF. `fs.writeFileSync(path, content, 'utf-8')` em Node default produz LF sem BOM — confirmar em Windows com test que le `Buffer` cru e checa os 3 primeiros bytes nao serem `0xEF 0xBB 0xBF`.
- **G10 do plano (idioma):** Template em EN porque eh artefato exportado (D2). NAO traduzir para PT-BR — viola D2.
- **Local — caminho do template:** Plugin root resolve via variavel ambiente do plugin loader ou via `path.resolve(__dirname, '..')` dentro de `skills/init/runner.ts`. Confirmar convencao usada em Plano 02 fase-02 (skill base do `/init`) antes de codar.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `'writes TODO.md skeleton in empty project root'` FALHA com `expect(existsSync(todoPath)).toBe(true)` retornando `false`
  - Comando: `bun run test -- --grep 'init creates TODO.md'`
  - Resultado esperado: `Expected true, received false`

- [ ] **GREEN:** Passo de scaffold implementado em `skills/init/SKILL.md` (+ codigo TS se houver runner). Teste passa.
  - Comando: `bun run test -- --grep 'init creates TODO.md'`
  - Resultado esperado: `2 passed, 0 failed`

### Checklist

- [ ] Template `skills/todo-pick/templates/todo-md-skeleton.md` existe e esta em EN (D2)
- [ ] `/init` em fixture vazia cria `{projectRoot}/TODO.md` (CA-31 pre-requisito)
- [ ] `/init` em fixture com `TODO.md` populado NAO sobrescreve (G2 idempotencia)
- [ ] Encoding UTF-8 sem BOM (G3 / 07-A2)
- [ ] Line endings LF (G3 / 07-A2)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck` (se configurado)

---

## Criterio de Aceite

**Por maquina:**
- Em fixture vazia, `/init` retorna exit 0 E `test -f {tmpDir}/TODO.md` retorna 0 E `head -1 {tmpDir}/TODO.md` retorna `# TODO`
- Em fixture com `TODO.md` pre-existente contendo string "custom-marker", apos `/init`, `grep -F "custom-marker" {tmpDir}/TODO.md` retorna 0

**Por humano (se aplicavel):**
- N/A (sem UI)

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

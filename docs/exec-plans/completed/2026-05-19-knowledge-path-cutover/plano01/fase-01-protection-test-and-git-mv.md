<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou secao do PRD).
-->

# Fase 01: Protection Test + git mv + Path Minimo

**Plano:** 01 — Cutover Foundation + Distribuicao
**Sizing:** ~1.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Tracer Bullet do plano: teste de protecao RED verifica que `knowledge/nodejs-typescript/INDEX.md`
existe E que `docs/knowledge/` nao existe; `git mv docs/knowledge knowledge` faz o teste passar;
update minimo de `copy-knowledge.ts:58` aponta o path base para `knowledge/`. CA-01 e CA-02 verificados.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/repo-structure/knowledge-path.test.ts` | Create | Teste de protecao do cutover (2 asserts: novo path existe, antigo ausente) |
| `docs/knowledge/` | Delete (via git mv) | Renomear para `knowledge/` na raiz |
| `knowledge/` | Create (via git mv) | Runtime asset no lugar correto |
| `skills/init/lib/copy-knowledge.ts` | Modify | Linha 58: `'docs', 'knowledge'` → `'knowledge'` |

---

## Implementacao

### Passo 1: Criar diretorio de teste se necessario

Verificar se `tests/repo-structure/` existe. Se nao existir, criar.

```bash
ls F:\Projetos\Anti-Vibe-Coding\tests\repo-structure
```

Se ausente: `mkdir -p tests/repo-structure`

### Passo 2: Escrever o teste de protecao (RED)

Criar `tests/repo-structure/knowledge-path.test.ts`:

```typescript
// 2026-05-20 (Luiz/dev): D2 do PRD knowledge-path-cutover — protection test garante que
// git mv nao seja revertido acidentalmente. Usa fs.access async (nao existsSync — risco de
// cache; ver PRD Riscos). Rodar: bun test tests/repo-structure/knowledge-path.test.ts

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// Repo root: dois niveis acima de tests/repo-structure/
const REPO_ROOT = path.resolve(import.meta.dir, '..', '..')

async function pathExists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true).catch(() => false)
}

describe('knowledge path cutover (D2)', () => {
  it('knowledge/ subdir exists at repo root with at least one stack INDEX.md', async () => {
    const knowledgeDir = path.join(REPO_ROOT, 'knowledge')
    const exists = await pathExists(knowledgeDir)
    expect(exists, `knowledge/ deve existir em ${knowledgeDir}`).toBe(true)

    // Pelo menos uma das stacks canonicas deve ter INDEX.md
    const nodejsIndex = path.join(knowledgeDir, 'nodejs-typescript', 'INDEX.md')
    const railsIndex = path.join(knowledgeDir, 'rails', 'INDEX.md')
    const hasNodejs = await pathExists(nodejsIndex)
    const hasRails = await pathExists(railsIndex)
    expect(
      hasNodejs || hasRails,
      `Pelo menos uma stack deve ter INDEX.md. nodejs-typescript: ${hasNodejs}, rails: ${hasRails}`
    ).toBe(true)
  })

  it('docs/knowledge/ does NOT exist (confirma cutover puro — nao dual-path)', async () => {
    const oldPath = path.join(REPO_ROOT, 'docs', 'knowledge')
    const exists = await pathExists(oldPath)
    expect(exists, `docs/knowledge/ nao deve mais existir pos-cutover. Path: ${oldPath}`).toBe(false)
  })
})
```

**Rodar e confirmar RED:**

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test tests/repo-structure/knowledge-path.test.ts
```

Resultado esperado: `2 failed` — ambos os testes falham por assertion (nao por erro de compilacao).
O primeiro falha porque `knowledge/` nao existe ainda. O segundo falha porque `docs/knowledge/` existe.

### Passo 3: Executar git mv (GREEN para ambos os testes)

```bash
cd F:\Projetos\Anti-Vibe-Coding && git mv docs/knowledge knowledge
```

Verificar que o git mv foi registrado:

```bash
git status
```

Resultado esperado: `renamed: docs/knowledge/... -> knowledge/...` para cada arquivo dentro do diretorio.

### Passo 4: Atualizar path minimo em copy-knowledge.ts

No arquivo `skills/init/lib/copy-knowledge.ts`, linha 58:

**Antes:**
```typescript
  const knowledgeBase = path.resolve(pluginRoot, 'docs', 'knowledge')
```

**Depois:**
```typescript
  // 2026-05-20 (Luiz/dev): D1/D2 do PRD knowledge-path-cutover — runtime asset em knowledge/
  // (nao docs/knowledge/). docs/ = dog-food nao distribuivel; knowledge/ = distribuivel via sync.
  const knowledgeBase = path.resolve(pluginRoot, 'knowledge')
```

**ATENCAO — apenas linha 58 nesta fase.** As strings de erro nas linhas 53 e 76 ainda mencionam
`docs/knowledge/` — isso e intencional nesta fase (incompleto). A fase-03 atualiza as mensagens E
a variavel de defense-in-depth. Nao antecipe.

### Passo 5: Rodar teste de protecao novamente (GREEN)

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test tests/repo-structure/knowledge-path.test.ts
```

Resultado esperado: `2 passed`.

### Passo 6: Verificar linhagem git (CA-02)

```bash
cd F:\Projetos\Anti-Vibe-Coding && git log --follow --oneline knowledge/nodejs-typescript/INDEX.md
```

Resultado esperado: historico inclui commits anteriores ao cutover (quando o arquivo estava em
`docs/knowledge/nodejs-typescript/INDEX.md`). Se o historico mostrar apenas o commit de `git mv`,
o CA-02 FALHA — isso indicaria que foi feito rm+add em vez de git mv.

### Passo 7: Commitar

```bash
git add knowledge/ tests/repo-structure/knowledge-path.test.ts skills/init/lib/copy-knowledge.ts
git commit -m "refactor: move docs/knowledge → knowledge/ (runtime asset cutover) [PRD knowledge-path-cutover]"
```

Nota: o commit message esta alinhado com o sugerido no PRD secao "Mecanismo 1".

---

## Gotchas

- **G3 do plano (fs.access async):** O teste usa `fs.access` async. NAO substituir por `fs.existsSync` — risco de cache do SO em processo longo. O snippet acima ja usa a forma correta.

- **G4 do plano (git mv, nao cp+rm):** Usar exclusivamente `git mv docs/knowledge knowledge`. Se feito errado (rm+add), o historico sera perdido e CA-02 falhara.

- **Local (linha 58 apenas nesta fase):** As outras referencias a `docs/knowledge` em copy-knowledge.ts (linhas 53, 62-68, 76) ficam deliberadamente desatualizadas nesta fase — a fase-03 as corrige. Nao antecipar.

- **Local (path no defense-in-depth):** A variavel `knowledgeBase` na linha 62 e usada no check de defense-in-depth (`!sourceDir.startsWith(knowledgeBase + path.sep)`). Com o update da linha 58, a variavel ja aponta para `knowledge/` — o defense-in-depth funciona corretamente apos a fase-01. Mas as mensagens ainda dizem `docs/knowledge/` (cosmetic, nao funcional).

---

## Verificacao

### TDD

- [ ] **RED:** Ambos os testes em `tests/repo-structure/knowledge-path.test.ts` falham por assertion
  - Comando: `bun test tests/repo-structure/knowledge-path.test.ts`
  - Resultado esperado: `2 failed` — "knowledge/ deve existir" e "docs/knowledge/ nao deve mais existir"

- [ ] **GREEN:** Apos `git mv` + update da linha 58, ambos os testes passam
  - Comando: `bun test tests/repo-structure/knowledge-path.test.ts`
  - Resultado esperado: `2 passed, 0 failed`

### Checklist

- [ ] `git status` mostra `renamed: docs/knowledge/... -> knowledge/...` (nao deleted+untracked)
- [ ] `git log --follow --oneline knowledge/nodejs-typescript/INDEX.md` mostra historico pre-cutover (CA-02)
- [ ] `git log --follow --oneline knowledge/rails/INDEX.md` mostra historico pre-cutover (CA-02 para rails)
- [ ] `ls knowledge/` retorna `nodejs-typescript rails` (ou equivalente no SO)
- [ ] `ls docs/knowledge/` retorna "No such file or directory" (CA-01)
- [ ] `bun test tests/repo-structure/knowledge-path.test.ts` passa (2 passed)
- [ ] Testes do codebase nao quebram por causa do git mv: `bun run test` (pode ter falhas pre-existentes nao relacionadas — documentar se encontrar)
- [ ] Linha 58 de `copy-knowledge.ts` agora e `path.resolve(pluginRoot, 'knowledge')` (sem `'docs'`)

---

## Criterio de Aceite

**CA-01 (cutover):**
```bash
ls knowledge/ && ls docs/knowledge/ 2>&1
```
Retorna: primeiro comando lista `nodejs-typescript rails`; segundo retorna erro "No such file or directory".

**CA-02 (linhagem):**
```bash
git log --follow --oneline knowledge/nodejs-typescript/INDEX.md
```
Retorna pelo menos 1 commit anterior ao cutover (historico pre-git-mv visivel).

---

<!-- Gerado por /plan-feature em 2026-05-20 -->

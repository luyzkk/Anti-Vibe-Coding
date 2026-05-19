<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 04: Rename Step 10 -> backup-pre-mutation (git mv + reduzir escopo)

**Plano:** 01 — Refactor de Registry (Tracer Bullet)
**Sizing:** 1.5h
**Depende de:** fase-03 (precisa do contexto limpo — libs/steps consumidores ja deletados)
**Visual:** false

---

## O que esta fase entrega

Step `10-apply-merge-destructive` renomeado para `10-backup-pre-mutation` via `git mv`
(preserva linhagem git — D3 do CONTEXT). Escopo reduzido a: copiar `CLAUDE.md` raiz
para `docs/_legacy/CLAUDE.md.bak` antes de qualquer scaffold. Sem transformacao destrutiva,
sem classificacao Akita, sem geracao de `docs/DESIGN.md`. Cobre parte de MH-05.

**Importante:** logica COMPLETA do backup leve (incluindo iteracao por outros docs raiz,
manifest do backup, etc) e responsabilidade do Plano 02 fase-03. Aqui apenas:
1. Renomeia o arquivo com `git mv`.
2. Reduz o conteudo a um esqueleto minimo que apenas copia `CLAUDE.md` raiz se existir.
3. Atualiza import + comentario no `registry.ts`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/10-apply-merge-destructive.ts` | Rename | `git mv` para `10-backup-pre-mutation.ts`. |
| `skills/init/lib/steps/10-backup-pre-mutation.ts` | Rewrite | Apos rename, reescrever conteudo: apenas copia CLAUDE.md raiz para docs/_legacy/CLAUDE.md.bak. |
| `skills/init/lib/registry.ts` | Modify | Trocar import path + identifier + comentario do array. |
| `skills/init/lib/steps/10-apply-merge-destructive.test.ts` | Rename + rewrite | `git mv` para `10-backup-pre-mutation.test.ts` + testes para o novo escopo minimo. Plano 02 fase-03 expande. |

---

## Implementacao

### Passo 1: Commit "tombstone" antes do rename (protocolo G3)

**Critico para preservar linhagem:** garantir que os deletes da fase-03 ja estao commitados
em commit separado ANTES do `git mv`. Se a fase-03 ainda nao foi commitada, fazer:

```bash
git add -A skills/init/lib/
git commit -m "chore(init): remove heuristic steps 08/09/11 + orphan libs (Plano 01 fase-03)"
```

So apos esse commit prosseguir com o rename — caso contrario o git pode interpretar como
delete + create no mesmo commit, perdendo o follow.

### Passo 2: Rename via `git mv`

```bash
git mv skills/init/lib/steps/10-apply-merge-destructive.ts \
       skills/init/lib/steps/10-backup-pre-mutation.ts

git mv skills/init/lib/steps/10-apply-merge-destructive.test.ts \
       skills/init/lib/steps/10-backup-pre-mutation.test.ts
```

Commit ISOLADO do rename (sem mudancas de conteudo) — preserva o follow:

```bash
git commit -m "chore(init): rename step 10 apply-merge-destructive -> backup-pre-mutation (D3, Plano 01 fase-04)"
```

### Passo 3: Reescrever `10-backup-pre-mutation.ts` com escopo minimo

Substituir o conteudo INTEIRO do arquivo por:

```typescript
// 2026-05-19 (Luiz/dev): Plano 01 fase-04 — Step 10 reduzido a backup-pre-mutation leve.
// PRD MH-05: copia CLAUDE.md raiz para docs/_legacy/CLAUDE.md.bak antes de qualquer scaffold.
// Sem transformacao destrutiva, sem classificacao Akita, sem gerar docs/DESIGN.md.
// Esqueleto minimo — Plano 02 fase-03 expande para outros docs raiz + manifest do backup.
// Origem: arquivo foi 10-apply-merge-destructive.ts (linhagem preservada via git mv, D3 CONTEXT).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Step } from './types'
import { isDryRun } from '../dry-run-mode'

const LEGACY_DIR = 'docs/_legacy'
const CLAUDE_BACKUP_NAME = 'CLAUDE.md.bak'

export const backupPreMutationStep: Step = {
  id: '10-backup-pre-mutation',
  async run(ctx) {
    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary: 'dry-run: would back up CLAUDE.md to docs/_legacy/CLAUDE.md.bak (if present)',
      }
    }

    const claudePath = path.join(ctx.cwd, 'CLAUDE.md')
    const exists = await fs.access(claudePath).then(() => true).catch(() => false)
    if (!exists) {
      return { mutated: false, summary: 'backup-pre-mutation: CLAUDE.md raiz nao encontrado — skip' }
    }

    const legacyDir = path.join(ctx.cwd, LEGACY_DIR)
    await fs.mkdir(legacyDir, { recursive: true })
    const targetPath = path.join(legacyDir, CLAUDE_BACKUP_NAME)
    await fs.copyFile(claudePath, targetPath)

    return {
      mutated: true,
      summary: `backup-pre-mutation: CLAUDE.md -> ${LEGACY_DIR}/${CLAUDE_BACKUP_NAME}`,
    }
  },
}
```

### Passo 4: Reescrever `10-backup-pre-mutation.test.ts` com testes minimos

Substituir conteudo inteiro por:

```typescript
// 2026-05-19 (Luiz/dev): Plano 01 fase-04 — testes minimos do backup-pre-mutation.
// Cobertura completa (manifest, multiplos docs, edge cases) e do Plano 02 fase-03.
import { describe, expect, test } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { backupPreMutationStep } from './10-backup-pre-mutation'

async function mkTmp(): Promise<string> {
  const base = path.join(import.meta.dir, '..', '..', '..', '..', '.tmp', `bpm-${Date.now()}`)
  await fs.mkdir(base, { recursive: true })
  return base
}

describe('10-backup-pre-mutation (esqueleto minimo)', () => {
  test('copies CLAUDE.md raiz to docs/_legacy/CLAUDE.md.bak when present', async () => {
    const cwd = await mkTmp()
    await fs.writeFile(path.join(cwd, 'CLAUDE.md'), '# legacy content', 'utf8')

    const report = await backupPreMutationStep.run({ cwd, flags: {} })
    expect(report.mutated).toBe(true)

    const backup = await fs.readFile(path.join(cwd, 'docs/_legacy/CLAUDE.md.bak'), 'utf8')
    expect(backup).toBe('# legacy content')
  })

  test('skips silently when no CLAUDE.md raiz', async () => {
    const cwd = await mkTmp()
    const report = await backupPreMutationStep.run({ cwd, flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('skip')
  })

  test('dry-run: nao escreve nada', async () => {
    const cwd = await mkTmp()
    await fs.writeFile(path.join(cwd, 'CLAUDE.md'), '# anything', 'utf8')

    const report = await backupPreMutationStep.run({ cwd, flags: { dryRun: true } })
    expect(report.mutated).toBe(false)

    const legacyExists = await fs.access(path.join(cwd, 'docs/_legacy')).then(() => true).catch(() => false)
    expect(legacyExists).toBe(false)
  })
})
```

**Nota:** se a forma de `StepContext` exigir mais campos (audit log, flags, etc), ajustar os
mocks consultando `skills/init/lib/steps/types.ts`. O exemplo acima assume forma minima.

### Passo 5: Atualizar `registry.ts`

Trocar:

```typescript
import { applyMergeDestructiveStep } from './steps/10-apply-merge-destructive'
```

Por:

```typescript
import { backupPreMutationStep } from './steps/10-backup-pre-mutation'
```

E no array, trocar:

```typescript
  applyMergeDestructiveStep,   // 2026-05-18 (Luiz/dev): Plano 04 fase-06 (D23) — ...
```

Por:

```typescript
  // 2026-05-19 (Luiz/dev): Plano 01 fase-04 — Step 10 (backup-pre-mutation) leve.
  // PRD MH-05 / D3 CONTEXT: arquivo renomeado via git mv preservando linhagem.
  // Roda ANTES de qualquer mutacao do scaffold (copia CLAUDE.md raiz para docs/_legacy/CLAUDE.md.bak).
  // Plano 02 fase-03 expande logica (outros docs raiz, manifest do backup).
  backupPreMutationStep,
```

Tambem reposicionar a entry no array — ja nao precisa ficar imediatamente antes do
`linkClaudeAgentsStep` (a justificativa antiga D23 era sobre Step 10 transformar CLAUDE.md
ANTES de criar o link, mas agora apenas copia para `docs/_legacy/`). A nova posicao
recomendada: logo apos `secretsScanStep` (Step 06), antes de qualquer scaffold mutativo:

```typescript
  detectLegacyStep,
  reuseDiscoveryStep,
  secretsScanStep,
  backupPreMutationStep,        // 2026-05-19 (Luiz/dev): backup CLAUDE.md raiz antes do scaffold (Plano 01 fase-04).
  // ... resto do array
```

Documentar essa reposicao no MEMORY.md como DI-N porque diverge da posicao previa (entre
scaffold e link-claude-agents).

### Passo 6: Commit do conteudo novo

```bash
git add -A skills/init/lib/steps/10-backup-pre-mutation.ts \
          skills/init/lib/steps/10-backup-pre-mutation.test.ts \
          skills/init/lib/registry.ts

git commit -m "feat(init): step 10 backup-pre-mutation skeleton + registry rewire (Plano 01 fase-04, MH-05)"
```

Tres commits separados (delete-fase-03, rename-puro, novo-conteudo) garantem `git log --follow`
limpo para auditoria posterior.

---

## Gotchas

- **G3 do plano (git mv requer commits separados):** Se voce alterar o CONTEUDO do arquivo
  ANTES de fazer `git mv` (ou misturar rename + reescrita num so commit), o git pode tratar
  como delete + create, perdendo o follow. Protocolo obrigatorio:
  1. Commit dos deletes da fase-03 PRIMEIRO.
  2. `git mv` em commit ISOLADO sem alterar conteudo.
  3. Reescrita do conteudo + atualizacao do registry em commit FINAL.
- **Local (CLAUDE_MIRROR_TEMPLATE removido):** O arquivo antigo continha um template
  CLAUDE_MIRROR_TEMPLATE e logica de transformacao via AKITA_HEADING_REGEX. Tudo isso
  PRECISA ser apagado nesta reescrita. O Step novo apenas copia — nada de transformacao.
  PRD MH-06 + D1 movem code-style para `docs/CODE_STYLE.md` (responsabilidade do Plano 02 fase-01).
- **Local (snippet-resolver, backup-anti-vibe):** O arquivo antigo importava
  `resolveSnippetIncludes` e `createBackup`. Verificar via grep se essas libs continuam
  sendo usadas em algum outro lugar. Se nao, sao candidatas a delete em plano futuro
  (NAO deletar nesta fase — escopo mantido).
- **Local (re-posicionamento muda fluxo):** Mover `backupPreMutationStep` para logo apos
  `secretsScanStep` (em vez de antes de `linkClaudeAgentsStep`) e uma decisao de design —
  documentar como DI-N no MEMORY.md. Razao: queremos backup ANTES de qualquer scaffold,
  nao perto da etapa de link.

---

## Verificacao

### TDD

- [ ] **RED:** Apos `git mv` mas ANTES de reescrever conteudo, `bun test skills/init/lib/steps/10-backup-pre-mutation.test.ts`
      vai falhar (testes antigos referenciam classe/funcao antigas).
- [ ] **GREEN:** Apos reescrever source + test conforme Passos 3 e 4, rodar:
  - Comando: `bun test skills/init/lib/steps/10-backup-pre-mutation.test.ts`
  - Resultado esperado: `3 passed, 0 failed`

### Checklist

- [ ] `git log --follow skills/init/lib/steps/10-backup-pre-mutation.ts` mostra historia
      do antigo `10-apply-merge-destructive.ts` (linhagem preservada)
- [ ] Conteudo de `10-backup-pre-mutation.ts` e o esqueleto minimo (sem AKITA_HEADING_REGEX,
      sem CLAUDE_MIRROR_TEMPLATE, sem createBackup, sem resolveSnippetIncludes)
- [ ] `registry.ts` importa `backupPreMutationStep` e usa no array
- [ ] Reposicionamento documentado em MEMORY.md como DI-N
- [ ] Testes minimos passam (3 testes: copy, skip-no-claude, dry-run-no-write)
- [ ] `bun run typecheck` passa
- [ ] Smoke test do registry continua passando

---

## Criterio de Aceite

**Por maquina:**
- `test -f skills/init/lib/steps/10-backup-pre-mutation.ts`
- `test ! -f skills/init/lib/steps/10-apply-merge-destructive.ts`
- `git log --follow --format=%H skills/init/lib/steps/10-backup-pre-mutation.ts | wc -l` retorna
  um numero MAIOR que 1 (historico preservado, nao apenas o commit de hoje)
- `grep -c "AKITA_HEADING_REGEX\|CLAUDE_MIRROR_TEMPLATE" skills/init/lib/steps/10-backup-pre-mutation.ts` retorna `0`
- `grep -c "backupPreMutationStep" skills/init/lib/registry.ts` retorna `2` (1 import + 1 array entry)
- `bun test skills/init/lib/steps/10-backup-pre-mutation.test.ts` passa
- `bun run typecheck` retorna exit 0

**Por humano:**
- `git log --follow --oneline skills/init/lib/steps/10-backup-pre-mutation.ts` mostra commits
  antigos do arquivo `10-apply-merge-destructive.ts` mesclados na historia (auditavel).

---

<!-- Gerado por /plan-feature em 2026-05-19 -->

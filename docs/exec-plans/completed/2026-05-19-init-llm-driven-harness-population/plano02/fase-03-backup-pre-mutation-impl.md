<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: backup-pre-mutation impl (Step 10 leve)

**Plano:** 02 — Scaffold expandido + Backup pre-mutacao
**Sizing:** 1.5h
**Depende de:** fase-01 (CODE_STYLE.md no scaffold) + implicitamente Plano 01 fase-04 (`git mv` ja renomeou para `10-backup-pre-mutation.ts`)
**Visual:** false

---

## O que esta fase entrega

Logica nova, minima e auditavel dentro de `skills/init/lib/steps/10-backup-pre-mutation.ts`:
se `CLAUDE.md` raiz existe, copia para `docs/_legacy/CLAUDE.md.bak` antes de qualquer
scaffold/mutacao. Zero regex de classificacao Akita, zero rewrite de `DESIGN.md`, zero
transformacao destrutiva. Cobre MH-05 (Step 10 reduzido a backup leve, sem heuristica).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/10-backup-pre-mutation.ts` | Modify | Substituir logica antiga (`applyMergeDestructiveStep`) por `backupPreMutationStep` minimo |
| `skills/init/lib/steps/10-backup-pre-mutation.test.ts` | Modify | Reescrever testes para nova logica (3 cenarios: greenfield, re-init, dry-run) |
| `skills/init/lib/steps/10-apply-merge-destructive.test.ts` | Delete | Testes antigos obsoletos — `git rm` (avisar no PR) |
| `skills/init/assets/snippets/design-md-skeleton.md` | Delete | Orfao apos Step 10 remover `SKELETON_PATH` — `git rm` (decisao ponto-revisao 4 opcao A) |
| `skills/init/lib/steps/10-migrate-1-backup.ts` + `.test.ts` | Investigate | Investigar escopo: se duplica logica de backup, consolidar com `backupPreMutationStep`; se ortogonal (ex: migracao v5→v6), documentar coexistencia em MEMORY.md (Passo 0) |

---

## Implementacao

### Passo 0: Investigar 10-migrate-1-backup.ts (decisao ponto-revisao 4)

Existe um arquivo paralelo `skills/init/lib/steps/10-migrate-1-backup.ts` (+ teste).
Antes de mexer no Step 10, entender escopo e decidir trajetoria.

```bash
# Quem importa o migrate-1-backup?
grep -rn "migrate-1-backup\|migrate1Backup\|MigrateOneBackup" skills/ tests/ 2>/dev/null

# Existe overlap com a nova logica de backup-pre-mutation?
grep -n "CLAUDE.md\|_legacy\|copyFile\|backup" skills/init/lib/steps/10-migrate-1-backup.ts
```

Decisao baseada no resultado:

- **Caso A — ortogonal** (lida com migracao v5→v6 de pastas/manifest, NAO de CLAUDE.md):
  manter coexistencia. Registrar em MEMORY.md (secao Decisoes de Implementacao):
  _"DI-N: 10-migrate-1-backup mantido — escopo ortogonal a 10-backup-pre-mutation
  (migrate cuida de pastas v5; pre-mutation cuida de CLAUDE.md raiz)."_

- **Caso B — duplicacao parcial** (tambem copia CLAUDE.md ou docs/): identificar overlap
  e decidir: (b1) consolidar logica num unico step; (b2) manter ambos com responsabilidades
  refinadas (documentar em comentario de proveniencia de cada step).

- **Caso C — orfao morto** (nao tem callers, nao roda no registry atual): registrar para
  delecao em fase futura. NAO deletar nesta fase — fora do escopo.

Resultado da investigacao DEVE ser anotado em `plano02/MEMORY.md` antes de prosseguir
para Passo 1.

### Passo 1: Definir contrato novo do Step 10

Substituir o conteudo de `skills/init/lib/steps/10-backup-pre-mutation.ts` por uma
implementacao leve. Apagar `AKITA_HEADING_REGEX`, `extractAkitaBlocks`, `buildDesignExtensions`,
`CLAUDE_MIRROR_TEMPLATE`, `applyMergeDestructiveStep`, e os imports relacionados
(`resolveSnippetIncludes`, `INIT_SUBAGENT_IDS`, `createBackup`, `SKELETON_PATH`, `SNIPPETS_DIR`).

Snippet TS exato (alvo do arquivo apos a fase):

```typescript
// 2026-05-19 (Luiz/dev): Step 10 leve — backup CLAUDE.md raiz antes de scaffold.
// PRD MH-05: sem extracao Akita; conteudo Akita sera sintetizado pela LLM no PLAN
// populate (Step 91, Plano 03). Destino fixo: docs/_legacy/CLAUDE.md.bak.
// G-local: NAO usar createBackup (helper para .anti-vibe/backup/{ts}/) — aqui o destino
// e simples e estavel, sem manifest JSON. Comportamento de falha: warning + prosseguir.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Step, StepContext, StepReport } from './types'
import { isDryRun } from '../dry-run-mode'
import type { AuditLogWriter } from '../audit-log'

const CLAUDE_FILENAME = 'CLAUDE.md'
const LEGACY_DIR_REL = path.join('docs', '_legacy')
const BACKUP_FILENAME = 'CLAUDE.md.bak'

export const backupPreMutationStep: Step = {
  id: '10-backup-pre-mutation',

  async run(ctx: StepContext): Promise<StepReport> {
    const claudeMdPath = path.join(ctx.cwd, CLAUDE_FILENAME)

    // Greenfield: CLAUDE.md ausente — skip silencioso
    const exists = await fs.access(claudeMdPath).then(() => true).catch(() => false)
    if (!exists) {
      return { mutated: false, summary: 'init-backup: CLAUDE.md ausente, skip' }
    }

    // Dry-run: nao escreve nada
    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary: 'init-backup: dry-run — would copy CLAUDE.md to docs/_legacy/CLAUDE.md.bak',
      }
    }

    const legacyDir = path.join(ctx.cwd, LEGACY_DIR_REL)
    const destPath = path.join(legacyDir, BACKUP_FILENAME)

    try {
      await fs.mkdir(legacyDir, { recursive: true })
      await fs.copyFile(claudeMdPath, destPath)
    } catch (err) {
      // G-local: permission denied / FS error — warning, NAO abortar init
      const message = err instanceof Error ? err.message : String(err)
      const writer = ctx.flags['__auditLog'] as AuditLogWriter | undefined
      await writer?.append({
        subagent_id: 'init-backup-pre-mutation',
        input_paths: [claudeMdPath],
        output_struct: { error: message, destPath },
        duration_ms: 0,
        retry_count: 0,
      })
      return {
        mutated: false,
        summary: `init-backup: write failed — ${message}. Init prossegue sem backup.`,
      }
    }

    return {
      mutated: true,
      summary: `init-backup: CLAUDE.md -> docs/_legacy/CLAUDE.md.bak`,
    }
  },
}
```

### Passo 2: Deletar a logica antiga

Garantir que o arquivo NAO contem mais:

- `AKITA_HEADING_REGEX`
- `extractAkitaBlocks`
- `buildDesignExtensions`
- `CLAUDE_MIRROR_TEMPLATE`
- `applyMergeDestructiveStep` (export removido — substituido por `backupPreMutationStep`)
- imports orfaos: `resolveSnippetIncludes`, `INIT_SUBAGENT_IDS.applyMerge`, `createBackup` (do helper anti-vibe), `SKELETON_PATH`, `SNIPPETS_DIR`

Validacao por grep apos a edicao (`grep -n 'AKITA_HEADING_REGEX\|extractAkitaBlocks\|applyMergeDestructiveStep' skills/init/lib/steps/10-backup-pre-mutation.ts`) deve retornar zero matches.

### Passo 3: Verificar o registry (assumindo estado pos-Plano 01 fase-04)

**Decisao ponto-revisao 3 opcao A:** confiar na dependencia explicita com Plano 01 fase-04.
Esse plano renomeia arquivo (`git mv`) E renomeia o export para `backupPreMutationStep`,
ja deixando `registry.ts` apontando para o nome novo. Esta fase apenas verifica o estado
esperado — NAO cobre branch defensivo onde fase-04 nao rodou.

Verificacao minima:

```bash
grep -n "backupPreMutationStep" skills/init/lib/registry.ts
```

Resultado esperado: 1 import + 1 referencia na lista de steps (ordem antes do `scaffold-full-tree`).

Se o grep retornar 0 matches (estado inconsistente — fase-04 nao rodou ou regrediu):
**ABORTAR esta fase** e voltar para Plano 01 fase-04. NAO tentar reconciliar aqui — o
contrato entre planos foi violado e a investigacao pertence ao plano anterior.

### Passo 4: Reescrever os testes

Substituir o conteudo de `skills/init/lib/steps/10-backup-pre-mutation.test.ts` por testes
da nova logica. Tres cenarios obrigatorios.

```typescript
// 2026-05-19 (Luiz/dev): testes da nova logica leve do Step 10 (MH-05).
// Substitui suite antiga (applyMergeDestructive) — deletar `10-apply-merge-destructive.test.ts`.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { backupPreMutationStep } from './10-backup-pre-mutation'
import type { StepContext } from './types'

async function mkTempProject(files: Record<string, string> = {}): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-step10-'))
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, relPath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, 'utf8')
  }
  return tmpDir
}

function ctxFor(cwd: string, flags: Record<string, boolean | string> = {}): StepContext {
  return { cwd, args: [], flags }
}

describe('backupPreMutationStep', () => {
  let tmpDir: string

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('copies CLAUDE.md to docs/_legacy/CLAUDE.md.bak when CLAUDE.md exists', async () => {
    tmpDir = await mkTempProject({ 'CLAUDE.md': '# old content' })

    const report = await backupPreMutationStep.run(ctxFor(tmpDir))

    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('CLAUDE.md -> docs/_legacy/CLAUDE.md.bak')

    const bak = await fs.readFile(path.join(tmpDir, 'docs/_legacy/CLAUDE.md.bak'), 'utf8')
    expect(bak).toBe('# old content')
  })

  it('skips silently when CLAUDE.md is absent (greenfield)', async () => {
    tmpDir = await mkTempProject() // sem CLAUDE.md

    const report = await backupPreMutationStep.run(ctxFor(tmpDir))

    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('skip')

    const legacyExists = await fs.access(path.join(tmpDir, 'docs/_legacy')).then(() => true).catch(() => false)
    expect(legacyExists).toBe(false)
  })

  it('respects --dry-run (no copy)', async () => {
    tmpDir = await mkTempProject({ 'CLAUDE.md': '# something' })

    const report = await backupPreMutationStep.run(ctxFor(tmpDir, { 'dry-run': true }))

    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('dry-run')

    const bakExists = await fs.access(path.join(tmpDir, 'docs/_legacy/CLAUDE.md.bak'))
      .then(() => true)
      .catch(() => false)
    expect(bakExists).toBe(false)
  })
})
```

Apos os testes novos passarem, deletar `skills/init/lib/steps/10-apply-merge-destructive.test.ts`
(`git rm`). Avisar no PR descricao para revisao explicita.

### Passo 5: Deletar `design-md-skeleton.md` (decisao ponto-revisao 4 opcao A)

Apos o passo 2 (remocao de `SKELETON_PATH`), o snippet `assets/snippets/design-md-skeleton.md`
fica orfao. **Decisao ponto-revisao 4 opcao A:** deletar agora junto com a extracao Akita,
mantendo o cleanup atomico (uma fase remove logica + assets associados).

Antes de deletar, validar via grep que nao ha caller residual:

```bash
grep -rn 'design-md-skeleton' skills/ tests/ 2>/dev/null
# Resultado esperado: 0 matches (passo 2 ja removeu SKELETON_PATH)
```

Se retornar matches: investigar antes de deletar (provavel caller fora dos arquivos
modificados aqui). Se zero matches: deletar via git rm preservando historico.

```bash
git rm skills/init/assets/snippets/design-md-skeleton.md
```

Snippets `akita-*.md` (`akita-code-style.md`, `akita-comments.md`, `akita-tests.md`,
`akita-dependencies.md`, `akita-logging.md`) DEVEM ser preservados — serao input do
subagente do PLAN populate no Plano 03 fase-03.

---

## Gotchas

- **G1 do plano (createBackup):** NAO usar `createBackup` de `skills/init/lib/backup-anti-vibe.ts`
  diretamente. Aquele helper cria backup com timestamp em `.anti-vibe/backup/{ts}/` + manifest
  JSON — semantica diferente. Aqui o destino e fixo (`docs/_legacy/CLAUDE.md.bak`) e a
  operacao e simples `fs.copyFile`. Misturar mecanismos confunde auditoria.

- **G2 do plano (delecao do skeleton):** `design-md-skeleton.md` eh deletado nesta fase
  (decisao ponto-revisao 4 opcao A). Validar via `grep -rn 'design-md-skeleton'` que zero
  callers residuais antes de `git rm`. Se aparecer caller fora dos arquivos modificados,
  PARAR e investigar — pode indicar ramificacao escondida.

- **G3 do plano (10-migrate-1-backup paralelo):** Arquivo `10-migrate-1-backup.ts` existe
  paralelamente. Passo 0 investiga escopo. Resultado da investigacao DEVE ser anotado em
  MEMORY.md (DI-N) antes de prosseguir para Passo 1. Provavel ortogonalidade (migracao
  v5→v6 vs backup CLAUDE.md) — confirmar com grep.

- **G4 do plano (dependencia com fase-04 do Plano 01):** Esta fase ASSUME que Plano 01
  fase-04 ja renomeou arquivo + export + registry. Decisao ponto-revisao 3 opcao A: se
  fase-04 nao rodou, ABORTAR esta fase. Nao tentar branch defensivo.

- **G4 do plano (docs/_legacy/ pode nao existir):** `fs.mkdir({ recursive: true })` cobre.
  Em re-init com `docs/_legacy/` preexistente, `fs.copyFile` sobrescreve `CLAUDE.md.bak`
  (backup mais recente vence — comportamento intencional).

- **G-local (permission denied):** NAO abortar init se backup falhar (`EACCES`, `EROFS`,
  etc). Emitir warning via `audit-log-writer` se disponivel e retornar
  `{ mutated: false, summary: 'init-backup: write failed — ...' }`. Init prossegue —
  perda de backup e degradacao aceita, perda da init nao e.

- **G-local (audit-log opcional):** `ctx.flags['__auditLog']` pode ser `undefined` em
  testes — usar optional chaining (`writer?.append(...)`). Nunca falhar por ausencia de
  writer.

- **G-local (imports orfaos limpos):** Apos remover `applyMergeDestructiveStep`, varios
  imports ficam orfaos (`resolveSnippetIncludes`, `INIT_SUBAGENT_IDS`, `createBackup`,
  etc). Lint vai apontar — remover todos. Etapa REFACTOR do TDD.

- **G-local (deletar arquivo de teste antigo via git rm):** Use `git rm skills/init/lib/steps/10-apply-merge-destructive.test.ts`
  para preservar historico do delete. NAO apenas remover do FS — git status sem `git rm`
  pode confundir o reviewer.

---

## Verificacao

### TDD

- [ ] **RED:** Testes novos falham porque logica antiga ainda referencia `AKITA_HEADING_REGEX`
  - Comando: `bun test skills/init/lib/steps/10-backup-pre-mutation.test.ts`
  - Resultado esperado: testes do novo arquivo falham por mismatch de export
    (`backupPreMutationStep` nao definido) ou por logica antiga ainda mexer em DESIGN.md

- [ ] **GREEN:** Apos substituir implementacao com snippet do Passo 1, todos os 3 testes passam
  - Comando: `bun test skills/init/lib/steps/10-backup-pre-mutation.test.ts`
  - Resultado esperado: `3 passed, 0 failed`

- [ ] **REFACTOR:** Limpar imports orfaos do arquivo, deletar `10-apply-merge-destructive.test.ts`
  via `git rm`, rodar lint
  - Comando: `bun run lint && bun test skills/init`
  - Resultado esperado: `PASS` em ambos, sem warnings novos

### Checklist

- [ ] Investigacao do `10-migrate-1-backup.ts` anotada em MEMORY.md (Passo 0)
- [ ] `skills/init/lib/steps/10-backup-pre-mutation.ts` NAO contem mais `AKITA_HEADING_REGEX`
- [ ] `skills/init/lib/steps/10-backup-pre-mutation.ts` NAO contem mais `extractAkitaBlocks`
- [ ] `skills/init/lib/steps/10-backup-pre-mutation.ts` NAO contem mais `applyMergeDestructiveStep` (export)
- [ ] `skills/init/lib/steps/10-backup-pre-mutation.ts` exporta `backupPreMutationStep` com `id: '10-backup-pre-mutation'`
- [ ] `skills/init/lib/steps/10-apply-merge-destructive.test.ts` foi removido via `git rm`
- [ ] `skills/init/assets/snippets/design-md-skeleton.md` foi removido via `git rm` (zero callers residuais validado)
- [ ] `skills/init/lib/registry.ts` referencia `backupPreMutationStep` (import + posicao — verificacao minima, sem branch defensivo)
- [ ] Step 10 esta ordenado ANTES de Step 01 (scaffold) no registry
- [ ] `bun test skills/init/lib/steps/10-backup-pre-mutation.test.ts` passa (3 testes)
- [ ] `bun run test` passa
- [ ] `bun run lint` passa sem warnings novos

---

## Criterio de Aceite

**Por maquina:**
- `grep -c 'AKITA_HEADING_REGEX' skills/init/lib/steps/10-backup-pre-mutation.ts` retorna `0`
- `grep -c 'extractAkitaBlocks' skills/init/lib/steps/10-backup-pre-mutation.ts` retorna `0`
- `grep -c 'applyMergeDestructiveStep' skills/init/lib/steps/10-backup-pre-mutation.ts` retorna `0`
- `grep -c 'export const backupPreMutationStep' skills/init/lib/steps/10-backup-pre-mutation.ts` retorna `1`
- `ls skills/init/assets/snippets/design-md-skeleton.md` retorna erro (arquivo deletado)
- `grep -rn 'design-md-skeleton' skills/ tests/` retorna 0 matches
- `bun test skills/init/lib/steps/10-backup-pre-mutation.test.ts` retorna `3 passed`
- Apos rodar Step 10 com fixture contendo `CLAUDE.md`: `ls {fixture}/docs/_legacy/CLAUDE.md.bak` retorna o arquivo
- Apos rodar Step 10 com fixture greenfield: `ls {fixture}/docs/_legacy/` retorna erro (pasta nao foi criada)

**Por humano:**
- Diff do arquivo `10-backup-pre-mutation.ts` mostra reducao substancial de linhas (~175 -> ~50)
- Comentario de proveniencia no topo cita MH-05 + Plano 02 fase-03
- MEMORY.md contem DI-N com resultado da investigacao de `10-migrate-1-backup.ts` (Passo 0)

---

<!-- Gerado por /plan-feature em 2026-05-19 -->

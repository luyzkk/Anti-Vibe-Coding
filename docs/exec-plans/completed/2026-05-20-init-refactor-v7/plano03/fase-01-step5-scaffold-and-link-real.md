<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 01: Step 5 — scaffold-and-link REAL (substitui stub do Plano 01 fase-04)

**Plano:** 03 — Step 5 (scaffold-and-link) + Step 6 (install-gh-files)
**Sizing:** 1.5h
**Depende de:** Nenhuma (so depende do Plano 01 fase-04 ja ter criado o stub `scaffoldAndLinkStep` com id `'05-scaffold-and-link'`)
**Visual:** false

---

## O que esta fase entrega

`skills/init/lib/steps/05-scaffold-and-link.ts` REAL que combina `scaffoldFullTree` (cria 36
placeholders com skip-if-exists, incluindo `.claude/CLAUDE.md` que NUNCA e sobrescrito por
forca do guard ja existente em `scaffoldFullTree:80`) e `linkClaudeToAgents` (cria mirror
raiz `CLAUDE.md` ↔ `AGENTS.md` sem tocar em `.claude/CLAUDE.md`). Sem dry-run, sem
`isDryRun(ctx)`, sem writer injetado. Testes unit cobrem: greenfield escreve todos os
placeholders, re-run pula todos, `.claude/CLAUDE.md` preexistente e preservado byte-identico,
summary contem `placeholdersCreated/Skipped/linkTier`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/05-scaffold-and-link.ts` | Create | Step real (substitui stub do Plano 01 fase-04). Invoca `scaffoldFullTree` + `linkClaudeToAgents` em sequencia. Sem dry-run/noWrite/WriteRecorder. |
| `skills/init/lib/steps/05-scaffold-and-link.test.ts` | Create | Testes unit: id contratual, greenfield placeholders, re-run skip, preservacao `.claude/CLAUDE.md`, summary format, tier matcher robusto (sym/hard/copy). |

**Nota:** `skills/init/lib/steps/01-scaffold-full-tree.ts` e `skills/init/lib/steps/02-link-claude-agents.ts`
NAO sao tocados nesta fase — eles ficam orfaos no registry apos fase-03 e serao deletados no
Plano 01 fase-05 (ja listados no escopo daquele plano). Esta fase APENAS cria os novos arquivos.

---

## Implementacao

### Passo 1: RED — escrever testes do `05-scaffold-and-link.test.ts`

Cobrir os behaviors invariantes: id estavel, greenfield writes-all, re-run skips-all,
`.claude/CLAUDE.md` preexistente preservado byte-identico + line-count identico, summary
contem as metricas. Tier matcher robusto para Windows-CI.

```typescript
// skills/init/lib/steps/05-scaffold-and-link.test.ts
// 2026-05-21 (Luiz/dev): Step 5 — scaffold-and-link REAL (Plano 03 fase-01 init-refactor-v7).
// Cobre RF-03 (scaffold 36 placeholders), CA-02 (.claude/CLAUDE.md preservado), CA-08 (skip-if-exists),
// D4 (sem dry-run/noWrite), G6 (link APOS scaffold).
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { scaffoldAndLinkStep } from './05-scaffold-and-link'
import { TEMPLATE_MANIFEST } from '../template-manifest'

async function mkTmp(): Promise<string> {
  // 2026-05-21 (Luiz/dev): fixture isolada por teste — evita poluicao cross-test (PRD NFR).
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-v7-step5-'))
}

describe('scaffoldAndLinkStep (Step 5 real)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel = 05-scaffold-and-link', () => {
    // 2026-05-21 (Luiz/dev): id e contrato com registry.ts e tracer e2e (PRD CA-09).
    expect(scaffoldAndLinkStep.id).toBe('05-scaffold-and-link')
  })

  test('greenfield: escreve todos os placeholders do TEMPLATE_MANIFEST e linka CLAUDE.md raiz', async () => {
    // 2026-05-21 (Luiz/dev): cobre RF-03 — 36 placeholders criados (incluindo 4 extras AVC).
    const report = await scaffoldAndLinkStep.run({ cwd: tmp, args: [], flags: {} })

    expect(report.mutated).toBe(true)
    // 2026-05-21 (Luiz/dev): summary multilinha contem 3 metricas observabilidade (PRD NFR linha 211).
    expect(report.summary).toMatch(/placeholdersCreated:\s*\d+/)
    expect(report.summary).toMatch(/placeholdersSkipped:\s*\d+/)
    expect(report.summary).toMatch(/Linked via tier:\s*(symlink|hardlink|copy-with-hook)/)

    // 2026-05-21 (Luiz/dev): assert por arquivo — RF-12 4 docs extras AVC presentes (G5 do README).
    const extras = [
      'docs/MERGE_GATES.md',
      'docs/CODE_STYLE.md',
      'docs/STATE.md',
      '.claude/CLAUDE.md',
    ]
    for (const rel of extras) {
      const stat = await fs.stat(path.join(tmp, rel))
      expect(stat.isFile()).toBe(true)
    }

    // 2026-05-21 (Luiz/dev): contagem total bate com TEMPLATE_MANIFEST (PRD CA-01).
    for (const entry of TEMPLATE_MANIFEST) {
      const stat = await fs.stat(path.join(tmp, entry.dst))
      expect(stat.isFile()).toBe(true)
    }
  })

  test('re-run: nenhum arquivo sobrescrito — skip-if-exists ativo (CA-08)', async () => {
    // 2026-05-21 (Luiz/dev): primeira execucao popula; segunda deve skipar tudo (PRD CA-08).
    await scaffoldAndLinkStep.run({ cwd: tmp, args: [], flags: {} })
    const second = await scaffoldAndLinkStep.run({ cwd: tmp, args: [], flags: {} })

    // 2026-05-21 (Luiz/dev): placeholdersCreated deve ser 0 no re-run (todos ja existem).
    expect(second.summary).toMatch(/placeholdersCreated:\s*0/)
    expect(second.summary).toMatch(new RegExp(`placeholdersSkipped:\\s*${String(TEMPLATE_MANIFEST.length)}`))
  })

  test('CA-02 / D16: .claude/CLAUDE.md preexistente (533 linhas) e byte-identico apos run', async () => {
    // 2026-05-21 (Luiz/dev): cobre CA-02 — PRD linha 280 ("533 linhas antes, 533 linhas depois").
    // Numero 533 escolhido por simetria com evidencia do CLAUDE.md destruido pelo init v6.7.
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })
    const original = Array.from({ length: 533 }, (_, i) => `linha ${String(i + 1)}`).join('\n')
    const claudeMdPath = path.join(tmp, '.claude', 'CLAUDE.md')
    await fs.writeFile(claudeMdPath, original, 'utf8')

    const report = await scaffoldAndLinkStep.run({ cwd: tmp, args: [], flags: {} })

    const after = await fs.readFile(claudeMdPath, 'utf8')
    // 2026-05-21 (Luiz/dev): invariante byte-identico — sem byte adicionado ou removido.
    expect(after).toBe(original)
    // 2026-05-21 (Luiz/dev): invariante line-count — CA-02 explicito.
    expect(after.split('\n')).toHaveLength(533)
    // 2026-05-21 (Luiz/dev): summary deve mostrar o skip do .claude/CLAUDE.md.
    expect(report.summary).toMatch(/placeholdersSkipped:\s*[1-9]/)
  })

  test('D4: zero imports de dry-run no codigo do step', async () => {
    // 2026-05-21 (Luiz/dev): meta-test — garante que D4 (CONTEXT linha 38) eh respeitado
    // pelo arquivo do step. Se algum dev re-introduzir isDryRun/WriteRecorder, este teste quebra.
    const src = await fs.readFile(
      path.join(import.meta.dir, '05-scaffold-and-link.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/isDryRun|WriteRecorder|makeWriter|dry-run-mode/)
  })
})
```

### Passo 2: GREEN — escrever `05-scaffold-and-link.ts`

Glue code: invoca `scaffoldFullTree` (default writer, sem injection), depois `linkClaudeToAgents`,
e monta summary multilinha. Sem `isDryRun`, sem branches.

```typescript
// skills/init/lib/steps/05-scaffold-and-link.ts
// 2026-05-21 (Luiz/dev): Step 5 — scaffold-and-link REAL (init v7, Plano 03 fase-01).
// Combina os dois steps antigos (01-scaffold-full-tree + 02-link-claude-agents) sem dry-run/noWrite.
// PRD RF-03 (scaffold 16+ placeholders), CA-02 (.claude/CLAUDE.md NUNCA sobrescrito — guard ja em
// scaffold-full-tree.ts:80), CA-08 (idempotente), D4 (sem dry-run), D16 (CLAUDE.md preservado).

import { detectProjectName } from '../detect-project-name'
import { scaffoldFullTree } from '../scaffold-full-tree'
import { linkClaudeToAgents } from '../symlink-fallback'
import type { Step, StepContext, StepReport } from './types'

export const scaffoldAndLinkStep: Step = {
  id: '05-scaffold-and-link',

  async run(ctx: StepContext): Promise<StepReport> {
    const targetDir = ctx.cwd
    const projectName = detectProjectName(targetDir)
    // 2026-05-21 (Luiz/dev): stack 'unknown' hardcoded aqui — Step 2 (detect-legacy-and-stack)
    // ja populou ctx.stack mas este step nao depende dele (PRD RF-03 e estrutural).
    // Render de variaveis em STATE.md.tpl usa default 'unknown' (scaffold-full-tree.ts:67).
    const stack = 'unknown'

    // 2026-05-21 (Luiz/dev): scaffoldFullTree usa writer default (fs.writeFile + mkdir) — D4
    // removeu dry-run. Sem `writeFile: makeWriter(...)`. Skip-if-exists ja embutido (linha 80).
    const treeResult = await scaffoldFullTree({
      targetDir,
      projectName,
      stack,
    })

    // 2026-05-21 (Luiz/dev): link APOS scaffold — invariante mandatorio.
    // linkClaudeToAgents:21 faz fs.access(AGENTS.md raiz). Scaffold ja criou (manifest:95).
    // G6 do README: link opera SOMENTE em CLAUDE.md raiz; .claude/CLAUDE.md (manifest:96)
    // permanece intocado (skip via scaffoldFullTree fileExists guard quando ja existe).
    const linkResult = await linkClaudeToAgents(targetDir)

    // 2026-05-21 (Luiz/dev): summary multilinha observability (PRD NFR linha 211).
    // Metricas: placeholdersCreated, placeholdersSkipped, linkTier — Plano 04 pode parsear
    // (ou Plano 05 se reintroduzir audit-log).
    const lines = [
      `placeholdersCreated: ${String(treeResult.filesWritten.length)} (de ${String(treeResult.filesWritten.length + treeResult.filesSkipped.length)})`,
      `placeholdersSkipped: ${String(treeResult.filesSkipped.length)}`,
      `Linked via tier: ${linkResult.tier}`,
    ]

    return {
      // 2026-05-21 (Luiz/dev): mutated true porque scaffold escreve OU pula (mas link sempre
      // cria CLAUDE.md raiz se ainda nao existir). Em re-run com tudo presente, scaffold pula
      // todos e link refaz o mirror (linkClaudeToAgents:24 fs.rm CLAUDE.md raiz e recria).
      mutated: true,
      summary: lines.join('\n'),
    }
  },
}
```

### Passo 3: VERIFY local

```bash
bun test skills/init/lib/steps/05-scaffold-and-link.test.ts
bun run typecheck
bun run lint
```

Esperado: 5 testes passam (id, greenfield, re-run, CA-02 preserva CLAUDE.md, meta-test D4).
Typecheck limpo no novo arquivo. Lint limpo.

---

## Gotchas

- **G1 do plano (D4 — sem dry-run):** O meta-test `'D4: zero imports de dry-run no codigo do step'`
  e a defesa contra re-introducao acidental. Confirmar manualmente via
  `grep -c "dry-run\|isDryRun\|makeWriter\|WriteRecorder" skills/init/lib/steps/05-scaffold-and-link.ts`
  retornando `0`.

- **G2 do plano (CA-02 / D16):** Confiamos em `scaffoldFullTree:80` para preservar
  `.claude/CLAUDE.md`. NAO duplicar logica de check aqui — fazer isso seria violacao da regra
  "Uma Fonte de Verdade" (CLAUDE.md global do user, secao "Uma Fonte de Verdade"). O teste
  CA-02 valida o invariante end-to-end.

- **G6 do plano (link APOS scaffold):** Se a ordem for invertida, `linkClaudeToAgents:21`
  joga ENOENT em `fs.access(AGENTS.md)`. O codigo da fase ja respeita a ordem; documentar
  no comentario inline.

- **Local — `linkClaudeToAgents` em re-run:** Em re-run, `scaffoldFullTree` skipa AGENTS.md
  (ja existe). `linkClaudeToAgents:24` faz `fs.rm(CLAUDE.md raiz, {force: true})` e refaz o
  mirror — comportamento OK (CLAUDE.md raiz nao e fonte do usuario, e mirror gerado). NAO
  confundir com `.claude/CLAUDE.md` que e preservado.

- **Local — tier no Windows-CI:** Bun em Windows sem dev-mode habilitado pode falhar em
  `fs.symlink` (EPERM). `linkClaudeToAgents` ja faz fallback para hardlink → copy. O teste
  greenfield usa matcher `(symlink|hardlink|copy-with-hook)` em vez de hardcoded.

- **Local — `detectProjectName`:** Em fixture temp sem `package.json`, retorna um default
  (ex: nome do diretorio temp). NAO bloqueia o step — apenas afeta substituicao de
  `{{PROJECT_NAME}}` nos templates. Se isso causar nondeterminism em CI, fixture deve criar
  `package.json` minimo. Por enquanto, OK — testes nao verificam conteudo renderizado.

- **Local — `mutated: true` em re-run:** Strictamente o disco NAO muda em re-run com tudo
  presente (scaffold pula tudo, link refaz mirror identico). Mas `mutated: true` simplifica
  o contrato — dispatcher loga "(mutated disk)" mesmo em re-run inocuo. Aceitavel — Plano 05
  pode refinar se necessario.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos ANTES do step — falham por `scaffoldAndLinkStep` nao existir
  (modulo nao encontrado). Para evitar compilation error, criar `05-scaffold-and-link.ts` com
  `export const scaffoldAndLinkStep: Step = { id: 'TODO', run: async () => ({ mutated: false, summary: '' }) }`
  primeiro — testes falham por assertion (`expected '05-scaffold-and-link' received 'TODO'`).
  - Comando: `bun test skills/init/lib/steps/05-scaffold-and-link.test.ts --grep "id contratual"`
  - Resultado esperado: `expected 'TODO' to equal '05-scaffold-and-link'` (assertion failure, nao compile error)

- [ ] **GREEN:** Logica completa implementada, 5 testes passam
  - Comando: `bun test skills/init/lib/steps/05-scaffold-and-link.test.ts`
  - Resultado esperado: `5 passed, 0 failed`

### Checklist

- [ ] `skills/init/lib/steps/05-scaffold-and-link.ts` criado com `id: '05-scaffold-and-link'`
- [ ] Step NAO importa `dry-run-mode` nem `dry-run` (`WriteRecorder/makeWriter`)
- [ ] Step invoca `scaffoldFullTree` ANTES de `linkClaudeToAgents`
- [ ] Summary multilinha contem `placeholdersCreated:`, `placeholdersSkipped:`, `Linked via tier:`
- [ ] 5 testes em `05-scaffold-and-link.test.ts` passam
- [ ] `bun run typecheck` limpo no arquivo novo
- [ ] `bun run lint` limpo
- [ ] `bun run test` global continua verde
- [ ] Provenance comment com data 2026-05-21 no top do arquivo
- [ ] Steps antigos `01-scaffold-full-tree.ts` e `02-link-claude-agents.ts` NAO foram tocados
  (serao deletados em Plano 01 fase-05)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/05-scaffold-and-link.test.ts` retorna `5 passed, 0 failed`
- `grep -c "isDryRun\|WriteRecorder\|makeWriter\|dry-run-mode" skills/init/lib/steps/05-scaffold-and-link.ts` retorna `0`
- `grep -q "id: '05-scaffold-and-link'" skills/init/lib/steps/05-scaffold-and-link.ts` retorna exit 0
- `bun run typecheck` retorna exit 0
- `bun run lint` retorna exit 0

**Por humano:**
- Diff `01-scaffold-full-tree.ts` + `02-link-claude-agents.ts` vs `05-scaffold-and-link.ts`
  mostra: 1 step mesclado, 0 branches de dry-run/additive-merge, summary multilinha com
  3 metricas observabilidade.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->

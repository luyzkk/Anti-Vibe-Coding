<!--
Princípio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
`// 2026-05-18 (Luiz/dev): <razao> — PRD <ref>`.
-->

# Fase 03: Step 10 — apply-merge-destructive (backup + transformacao + DESIGN.md)

**Plano:** 04 — Merge Invertido Destrutivo
**Sizing:** 1.5h
**Depende de:** fase-01 (skeleton `design-md-skeleton.md` existe) + fase-02 (tipos `MergeProposal` consumidos)
**Visual:** false

---

## O que esta fase entrega

Step 10 (`10-apply-merge-destructive`) que, **apos aprovacao do Step 09**, (1) cria backup canonico em `.anti-vibe/backup/{ts}/` via `lib/backup-anti-vibe.ts` (Plano 01 fase-02), (2) transforma `CLAUDE.md` original (>40 linhas) em espelho ≤40 linhas referenciando AGENTS.md, e (3) gera `docs/DESIGN.md` a partir do skeleton da fase-01 com os 5 includes Akita resolvidos + blocos extraidos do CLAUDE.md original apendados na secao "Extensoes especificas do projeto". Retorna `mutated: true` SOMENTE se backup e ambas as escritas (CLAUDE.md + DESIGN.md) completam com sucesso.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/10-apply-merge-destructive.ts` | Create | Step que aplica backup + transformacao destrutiva (MH-03, CA-02) |
| `skills/init/lib/steps/10-apply-merge-destructive.test.ts` | Create | Testes pareados: 5 casos (backup-first, mirror ≤40 linhas, DESIGN.md com 5 secoes, --additive-merge skip, erro no backup) |
| `skills/init/lib/snippet-resolver.ts` | Create | Helper local `resolveSnippetIncludes(content, baseDir)` — resolve marcadores `{{include: ../akita-XXX.md}}` substituindo pelo conteudo do snippet referenciado |
| `skills/init/lib/registry.ts` | Modify | Adicionar import + entry de `applyMergeDestructiveStep` apos `proposeMergeBatchStep`. **Reorder definitivo (Step 10 antes Step 02) eh tratado na fase-06.** Aqui apenas posicionamento provisorio apos Step 09 |

---

## Implementacao

### Passo 1: Helper `snippet-resolver.ts`

```typescript
// 2026-05-18 (Luiz/dev): resolve marcadores {{include: ../path.md}} substituindo pelo conteudo — PRD D22, fase-01 G6 (../ vs ./)
// Caminho RELATIVO ao arquivo onde o marcador aparece (skeleton vive em assets/snippets/, mesmos paths
// resolvem dali). A regex aceita ambos './' e '../' para tolerancia.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const INCLUDE_RE = /{{include:\s*([^}]+?)\s*}}/g

export async function resolveSnippetIncludes(
  content: string,
  baseDir: string,
): Promise<string> {
  const matches = [...content.matchAll(INCLUDE_RE)]
  let result = content
  for (const m of matches) {
    const rel = m[1].trim()
    const abs = path.resolve(baseDir, rel)
    const snippet = await readFile(abs, 'utf8')
    result = result.replace(m[0], snippet)
  }
  return result
}
```

### Passo 2: Construcao do `CLAUDE.md` espelho ≤40 linhas

```typescript
// 2026-05-18 (Luiz/dev): CLAUDE.md final eh espelho de AGENTS.md per PRD D16/D17 + CA-02
// Conteudo fixo abaixo (template). Step 10 NAO interpola variaveis aqui — eh literal.
const CLAUDE_MIRROR_TEMPLATE = `# CLAUDE.md

> Este arquivo eh um **espelho** de AGENTS.md. Para o conteudo canonico, consulte:
>
> - [AGENTS.md](./AGENTS.md)
> - [docs/DESIGN.md](./docs/DESIGN.md) — code style + conventions
> - [docs/SECURITY.md](./docs/SECURITY.md)
> - [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
>
> Foi transformado pelo \`/anti-vibe-coding:init\` (Step 10 apply-merge-destructive).
> O CLAUDE.md original foi salvo em \`.anti-vibe/backup/{ts}/CLAUDE.md\` e pode ser restaurado via
> \`/anti-vibe-coding:init --rollback\`.

## Como usar

Leia AGENTS.md primeiro. Para code style detalhado, leia docs/DESIGN.md.
`
// 2026-05-18 (Luiz/dev): assertar limite <=40 linhas em test — CA-02
```

### Passo 3: Extracao de blocos Akita do CLAUDE.md original

```typescript
// 2026-05-18 (Luiz/dev): heuristica simples — cabecalhos H2/H3 cujo texto casa com regex Akita — PRD SH-08
const AKITA_HEADING_RE = /^#{2,3}\s+(code\s*style|comments?|tests?|dependenc(?:y|ies)|logging|observability)/i

// Blocos extraidos sao adicionados na secao "Extensoes especificas do projeto" do DESIGN.md
// (skeleton fase-01 reserva essa secao para apend).
type ExtractedBlock = { heading: string; body: string }

function extractAkitaBlocks(claudeMdContent: string): ExtractedBlock[] {
  // ... parse linha-a-linha agrupando por cabecalho H2/H3.
  // Cabecalho NAO-Akita vira "outra extensao" — ainda assim apendado em "Extensoes especificas".
  return []
}
```

### Passo 4: Step exportado — orquestracao

```typescript
// 2026-05-18 (Luiz/dev): contrato Step{id, run} — PRD MH-03, CA-02
// subagent_id canonico: 'init-apply-merge'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Step, StepReport } from './types'
import { resolveSnippetIncludes } from '../snippet-resolver'
import { createBackup } from '../backup-anti-vibe' // adaptar conforme MEMORY do Plano 01

export const applyMergeDestructiveStep: Step = {
  id: '10-apply-merge-destructive',
  async run(ctx): Promise<StepReport> {
    // 2026-05-18 (Luiz/dev): early-skip em --additive-merge — PRD SH-09, G9 do README
    if (ctx.flags['--additive-merge'] === true) {
      return { mutated: false, summary: 'init-apply-merge: skipped (additive-merge opt-in)' }
    }

    const claudePath = path.join(ctx.cwd, 'CLAUDE.md')
    let originalContent: string
    try {
      originalContent = await readFile(claudePath, 'utf8')
    } catch {
      // Nao ha CLAUDE.md (greenfield) — nada a fazer.
      return { mutated: false, summary: 'init-apply-merge: no CLAUDE.md to transform' }
    }

    // 2026-05-18 (Luiz/dev): em --dry-run, simula sem mutar — PRD MH-06, G8 do README
    if (ctx.flags['--dry-run'] === true) {
      return { mutated: false, summary: 'init-apply-merge: dry-run preview (no backup, no write)' }
    }

    // 2026-05-18 (Luiz/dev): backup ANTES de qualquer mutacao — PRD D2/D9, G1 do README
    try {
      await createBackup({
        cwd: ctx.cwd,
        files: [{ originalPath: 'CLAUDE.md', action: 'transform' }],
      })
    } catch (err) {
      return {
        mutated: false,
        summary: `init-apply-merge: backup failed — aborted (${(err as Error).message})`,
      }
    }

    // Extracao + geracao do DESIGN.md a partir do skeleton
    const blocks = extractAkitaBlocks(originalContent)
    const skeletonPath = path.join(
      // 2026-05-18 (Luiz/dev): path do plugin instalado — resolvido via pluginRoot do dispatcher
      // adaptar conforme `resolvePluginRoot` em steps/helpers.ts (commit recente)
      'skills', 'init', 'assets', 'snippets', 'design-md-skeleton.md',
    )
    const skeletonRaw = await readFile(skeletonPath, 'utf8')
    let designContent = await resolveSnippetIncludes(skeletonRaw, path.dirname(skeletonPath))

    if (blocks.length > 0) {
      const apend = blocks.map((b) => `\n### ${b.heading}\n<!-- extraido de CLAUDE.md em ${new Date().toISOString()} -->\n\n${b.body}\n`).join('\n')
      designContent = designContent.replace('## Extensoes especificas do projeto', `## Extensoes especificas do projeto${apend}`)
    }

    // 2026-05-18 (Luiz/dev): escrita atomica — primeiro DESIGN.md, depois CLAUDE.md espelho — CA-02
    const designPath = path.join(ctx.cwd, 'docs', 'DESIGN.md')
    await writeFile(designPath, designContent, 'utf8')
    await writeFile(claudePath, CLAUDE_MIRROR_TEMPLATE, 'utf8')

    return {
      mutated: true,
      summary: `init-apply-merge: CLAUDE.md transformed (${originalContent.split('\n').length} -> <=40 linhas), docs/DESIGN.md gerado`,
    }
  },
}
```

### Passo 5: Testes pareados (5 casos)

```typescript
// 2026-05-18 (Luiz/dev): TDD — PRD MH-03, CA-02
import { describe, it, expect, beforeEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { applyMergeDestructiveStep } from './10-apply-merge-destructive'

describe('10-apply-merge-destructive', () => {
  let cwd: string
  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), 'apply-merge-'))
    mkdirSync(path.join(cwd, 'docs'), { recursive: true })
  })

  it('writes backup BEFORE transforming CLAUDE.md', async () => {
    const original = `# Original\n${'## Code Style\n- lint\n'.repeat(20)}` // >40 linhas
    writeFileSync(path.join(cwd, 'CLAUDE.md'), original, 'utf8')

    const report = await applyMergeDestructiveStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(true)
    // backup existe
    const backupDir = path.join(cwd, '.anti-vibe', 'backup')
    expect(existsSync(backupDir)).toBe(true)
    // backup contem CLAUDE.md original byte-identico (verificar via checksum quando Plano 01 entregar API)
  })

  it('produces CLAUDE.md <=40 lines after transformation (CA-02)', async () => {
    const original = `# Original\n${'linha\n'.repeat(300)}`
    writeFileSync(path.join(cwd, 'CLAUDE.md'), original, 'utf8')

    await applyMergeDestructiveStep.run({ cwd, args: [], flags: {} })

    const finalContent = readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8')
    expect(finalContent.split('\n').length).toBeLessThanOrEqual(40)
    expect(finalContent).toContain('AGENTS.md')
    expect(finalContent).toContain('docs/DESIGN.md')
  })

  it('generates docs/DESIGN.md with 5 Akita sections resolved (SH-08)', async () => {
    const original = `## Code Style\nuse strict\n## Tests\nbun test\n`
    writeFileSync(path.join(cwd, 'CLAUDE.md'), original, 'utf8')

    await applyMergeDestructiveStep.run({ cwd, args: [], flags: {} })

    const design = readFileSync(path.join(cwd, 'docs', 'DESIGN.md'), 'utf8')
    // os 5 marcadores foram resolvidos (conteudo dos snippets esta inline)
    expect(design).not.toContain('{{include:')
    expect(design).toMatch(/Code Style/i)
    expect(design).toMatch(/Comments/i)
    expect(design).toMatch(/Tests/i)
    expect(design).toMatch(/Dependencies/i)
    expect(design).toMatch(/Logging/i)
  })

  it('early-skips in --additive-merge with mutated:false', async () => {
    writeFileSync(path.join(cwd, 'CLAUDE.md'), 'whatever', 'utf8')
    const report = await applyMergeDestructiveStep.run({
      cwd, args: [], flags: { '--additive-merge': true },
    })
    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/additive-merge/)
    // CLAUDE.md NAO foi modificado
    expect(readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8')).toBe('whatever')
  })

  it('returns mutated:false when backup fails (no partial transformation)', async () => {
    // Simular falha: stubar createBackup para throw, ou usar fixture com permissoes invalidas
    // (estrategia exata depende do DI exposto pelo Plano 01 — adaptar)
    // Esperado: mutated:false, CLAUDE.md original intocado
  })
})
```

---

## Gotchas

- **G1 do plano (backup antes de tudo):** Backup eh a primeira mutacao em disco. Se falha (IO, permissao), step retorna `mutated: false` + summary com erro. CLAUDE.md original NAO eh tocado. Test #5 valida isso.
- **G5 do plano (Akita → DESIGN.md):** Extracao usa heuristica de cabecalho (regex H2/H3 + palavras-chave Akita). Blocos extraidos sao apendados na secao reservada do skeleton, NAO substituem os includes — os includes trazem as regras canonicas Akita do plugin; os blocos extraidos do CLAUDE.md do projeto-alvo sao customizacoes especificas do projeto.
- **G6 do plano (snippet path):** `resolveSnippetIncludes` recebe `baseDir` igual a `path.dirname(skeletonPath)` (que eh `assets/snippets/` do plugin). Os marcadores no skeleton podem usar `./akita-XXX.md` ou `../akita-XXX.md` — `path.resolve` normaliza ambos. Decidir a convencao em fase-01 e documentar no MEMORY do plano.
- **G8 do plano (dry-run):** Em `--dry-run`, retorna ANTES de chamar `createBackup`. Garante zero IO em disco.
- **G10 do plano (manifest schema):** `createBackup` recebe `files: [{ originalPath: 'CLAUDE.md', action: 'transform' }]`. Assinatura exata pode diferir — consultar `plano01/MEMORY.md`. Se a API canonica nao expor `append`, Step 11 (fase-05) implementara `appendToLatestBackup` localmente E essa decisao DEVE ser registrada aqui.
- **G14 do plano (link-claude-agents downstream):** Apos fase-06 (reorder), Step 02 roda DEPOIS deste step e encontra CLAUDE.md ja espelho. Esta fase NAO mexe na ordem do registry — apenas adiciona o step apos Step 09. Reorder fica para fase-06.
- **Local (resolvePluginRoot):** O path `skills/init/assets/snippets/design-md-skeleton.md` precisa ser resolvido a partir do plugin instalado (pode ser link ou copia). Reusar `resolvePluginRoot` de `steps/helpers.ts` (commit recente `98deb9e`).
- **Local (atomicidade):** Se DESIGN.md eh escrito e CLAUDE.md falha em seguida, o estado fica parcial. Para mitigar nesta versao: escrever DESIGN.md em arquivo `.tmp` primeiro, depois renomear para `docs/DESIGN.md` apos CLAUDE.md espelho estar pronto. **Decisao adiada:** se complexidade aumentar, simplificar — backup + rollback ja cobrem o caso (Plano 05 fase-04).

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/steps/10-apply-merge-destructive.test.ts` falha (step inexistente).
- [ ] **GREEN:** Step + snippet-resolver implementados; 5 testes verdes.
- [ ] **REFACTOR:** extrair `extractAkitaBlocks` e `buildClaudeMirror` como funcoes nomeadas testaveis isoladamente.

### Checklist

- [ ] `skills/init/lib/steps/10-apply-merge-destructive.ts` exporta `applyMergeDestructiveStep: Step` com id `'10-apply-merge-destructive'`.
- [ ] `skills/init/lib/snippet-resolver.ts` exporta `resolveSnippetIncludes`.
- [ ] `bun test skills/init/lib/steps/10-apply-merge-destructive.test.ts skills/init/lib/snippet-resolver.test.ts` retorna 5+ passed.
- [ ] CLAUDE.md final ≤40 linhas (assert no test #2).
- [ ] `docs/DESIGN.md` final NAO contem `{{include:` (assert no test #3).
- [ ] Backup contem `CLAUDE.md` original byte-identico (validar via checksum quando Plano 01 expor `computeSha256`).
- [ ] `bun run lint` clean.
- [ ] Grep `init-apply-merge` no step retorna pelo menos 3 matches (multiplos caminhos de summary).

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/10-apply-merge-destructive.test.ts` retorna `5/5 passed`.
- `wc -l CLAUDE.md` no fixture pos-execucao retorna `<=40`.
- `grep -c "{{include:" docs/DESIGN.md` no fixture pos-execucao retorna `0`.

**Por humano:**
- Inspecao manual: backup em `.anti-vibe/backup/{ts}/CLAUDE.md` eh byte-identico ao original.
- DESIGN.md tem secoes 1-5 (Code Style, Comments, Tests, Dependencies, Logging) com conteudo proveniente dos snippets Akita do plugin + secao "Extensoes especificas do projeto" no final (vazia ou populada conforme o CLAUDE.md original tinha blocos nao-Akita).

---

**Referencia cruzada:**
- PRD: MH-03 (apply-merge-destructive), CA-02 (CLAUDE.md ≤40 linhas + DESIGN.md 5 secoes), D2 (destrutivo+backup), D17 (Akita→DESIGN.md)
- README do plano: G1, G5, G6, G8, G10, G14
- Plano 01 MEMORY: API exata de `createBackup`, `computeSha256`, schema do manifest
- Plano 04 fase-01: skeleton consumido por este step
- Plano 04 fase-06: reorder do registry (Step 10 → antes Step 02) — depende deste step pronto

<!-- Gerado por /plan-feature em 2026-05-18 -->

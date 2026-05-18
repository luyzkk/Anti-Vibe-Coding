<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): renderer compartilhado — CA-07 + CA-13 + D18`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 02: Dry-Run Renderer Preview

**Plano:** 05 — Modos Reversiveis
**Sizing:** 1h
**Depende de:** Nenhuma (independente — primeira fase executavel do grafo apos fase-06; consome apenas o tipo `MergeProposal` ja exportado pelo Plano 04 fase-02)
**Visual:** false

---

## O que esta fase entrega

Renderer compartilhado `renderMergePreview(input: MergePreview): string` em `lib/preview-renderer.ts`. UNICA fonte de string de preview agregado consumida em DOIS codepaths:
1. `--dry-run` → `console.log(renderMergePreview(...))` (Step 09 retorna `mutated: false`, NAO chama `needsUser`).
2. modo real → o resultado vira o `prompt` do `needsUser` enviado ao dispatcher para `askUser` (Step 09 normal).

Elimina divergencia entre dry-run output e prompt real — raiz historica do risco "dry-run divergir do comportamento real" do PRD. Validado por golden snapshot test (CA-07 + CA-13).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/preview-renderer.ts` | Create | Exporta `renderMergePreview` + tipo `MergePreview`. Funcao pura (string in → string out), sem efeitos colaterais |
| `skills/init/lib/preview-renderer.test.ts` | Create | Golden snapshot test: input `MergePreview` fixture → output bate snapshot em `__golden__/preview-renderer/aggregated-diff.txt` |
| `skills/init/lib/steps/__golden__/preview-renderer/aggregated-diff.txt` | Create | Golden snapshot canonico do output do renderer para o fixture representativo (CLAUDE.md 287→36 linhas, 4 doc moves, 1 blockedBySecret) |
| `skills/init/lib/steps/09-propose-merge-batch.ts` | Modify | Importa `renderMergePreview` e substitui qualquer logica de geracao de string ad-hoc por chamada ao renderer. Tanto o branch `--dry-run` quanto o branch `needsUser` chamam a mesma funcao |

---

## Implementacao

### Passo 1: Definir o tipo `MergePreview` em `lib/preview-renderer.ts`

Shape conservador, baseado no `MergeProposal` exportado pelo Plano 04 fase-02 (ADAPTAR conforme `plano04/MEMORY.md` "API publica final do Step 09 (propose-merge-batch)" apos execucao).

```typescript
// skills/init/lib/preview-renderer.ts
// 2026-05-18 (Luiz/dev): renderer compartilhado entre --dry-run e needsUser — CA-07 + CA-13 + D18

export type MergePreview = {
  readonly claudeMd: {
    readonly originalLines: number
    readonly finalLines: number
    readonly akitaBlocks: ReadonlyArray<{
      readonly title: string  // "Code Style", "Comments", "Tests", "Dependencies", "Logging"
      readonly target: string // ex: "docs/DESIGN.md (secao Code Style)"
    }>
  }
  readonly docMoves: ReadonlyArray<{
    readonly from: string
    readonly to: string
    readonly action: 'move' | 'reference'  // 'move' = renomeia; 'reference' = orphan → docs/references/
  }>
  readonly blockedBySecrets: ReadonlyArray<{
    readonly path: string
    readonly reason: string  // ex: "contem 'sk_live_*' — move bloqueado"
  }>
  readonly backupTimestamp: string  // ex: "2026-05-18-143000" (ja path-safe)
}
```

### Passo 2: Implementar `renderMergePreview` (funcao pura)

Renderiza no formato canonico mostrado no PRD (UX Flow item 6). Texto em PT-BR (alinhado com user_profile.md). Sem cores ANSI — o dispatcher decide colorir se quiser.

```typescript
// 2026-05-18 (Luiz/dev): output deve ser DETERMINISTICO para snapshot test passar — ordem das entries
// vem do input, nao re-ordenar internamente. CA-13 dry-run parity depende disso.
export function renderMergePreview(input: MergePreview): string {
  const lines: string[] = []
  lines.push('PROPOSTA DE TRANSFORMACAO (revise antes de aprovar)')
  lines.push('')
  lines.push(`CLAUDE.md (existente, ${input.claudeMd.originalLines} linhas):`)
  for (const block of input.claudeMd.akitaBlocks) {
    lines.push(`  [Bloco: ${block.title}] -> ${block.target}`)
  }
  lines.push(`CLAUDE.md final: indice ${input.claudeMd.finalLines} linhas espelhado de AGENTS.md`)
  lines.push(`Backup: .anti-vibe/backup/${input.backupTimestamp}/CLAUDE.md`)
  lines.push('')

  if (input.docMoves.length > 0) {
    lines.push(`Docs existentes (${input.docMoves.length} arquivos):`)
    for (const move of input.docMoves) {
      const tag = move.action === 'reference' ? ' (orfao -> references)' : ''
      lines.push(`  ${move.from} -> ${move.to}${tag}`)
    }
    lines.push('')
  }

  lines.push('README.md: intocavel (read-only)')
  lines.push('')

  if (input.blockedBySecrets.length > 0) {
    lines.push('Secrets detectados:')
    for (const blocked of input.blockedBySecrets) {
      lines.push(`  WARN ${blocked.path} ${blocked.reason}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
```

### Passo 3: Refatorar `Step 09 propose-merge-batch` para consumir o renderer

Em `lib/steps/09-propose-merge-batch.ts` (criado em Plano 04 fase-02), localizar onde a string de preview eh gerada e substituir por chamada ao renderer. Pseudocodigo:

```typescript
// 2026-05-18 (Luiz/dev): Plano 05 fase-02 — unico ponto de geracao do preview agregado (CA-07 + CA-13)
import { renderMergePreview, type MergePreview } from '../preview-renderer'

// ... dentro do step.run:
const preview: MergePreview = buildPreviewFromArtifacts(classificationResult, secretsResult, /* ... */)
const renderedPreview = renderMergePreview(preview)

if (ctx.flags['--dry-run'] === true) {
  // Branch dry-run: console.log e retorna mutated: false sem needsUser
  ;(opts.log ?? console.log)(renderedPreview)  // ADAPTAR conforme convencao de log do Plano 04
  return { mutated: false, summary: 'dry-run: merge preview rendered (no needsUser)' }
}

// Branch normal: payload de needsUser usa a MESMA string
return {
  mutated: false,
  summary: 'merge proposal awaiting user approval',
  needsUser: {
    prompt: renderedPreview,
    options: ['Aprovar', 'Cancelar', 'Ver diff por arquivo', 'Aprovar exceto secrets'],
  },
}
```

**ADAPTAR conforme `plano04/MEMORY.md` "API publica final do Step 09":** a funcao `buildPreviewFromArtifacts` eh referencial — pode ja estar implementada como helper interno do Step 09. Fase-02 do Plano 05 SE LIMITA a extrair a logica de RENDERIZACAO (string formatting) para `preview-renderer.ts`, mantendo a logica de COLETA (leitura dos JSONs em `.anti-vibe/discovery/`) dentro do Step 09.

### Passo 4: Criar golden snapshot test

```typescript
// skills/init/lib/preview-renderer.test.ts
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { renderMergePreview, type MergePreview } from './preview-renderer'

describe('renderMergePreview', () => {
  it('renders representative fixture matching golden snapshot', async () => {
    // 2026-05-18 (Luiz/dev): fixture replicando UX Flow item 6 do PRD — CA-07 + CA-13
    const fixture: MergePreview = {
      claudeMd: {
        originalLines: 287,
        finalLines: 36,
        akitaBlocks: [
          { title: 'Code Style', target: 'docs/DESIGN.md (secao Code Style)' },
          { title: 'Tests', target: 'docs/DESIGN.md (secao Tests)' },
          { title: 'Security', target: 'docs/SECURITY.md' },
          { title: 'Environment', target: 'ARCHITECTURE.md (secao Environment)' },
        ],
      },
      docMoves: [
        { from: 'docs/ARQUITETURA.md', to: 'docs/ARCHITECTURE.md', action: 'move' },
        { from: 'docs/STRIPE_INTEGRATION.md', to: 'docs/references/STRIPE_INTEGRATION.md', action: 'move' },
        { from: 'CONTRIBUTING.md', to: 'docs/references/CONTRIBUTING.md', action: 'move' },
        { from: '.claude/memory/notes.md', to: 'docs/compound/2026-05-18-notes-import.md', action: 'reference' },
      ],
      blockedBySecrets: [
        { path: 'docs/STRIPE_INTEGRATION.md', reason: "contem 'sk_live_*' — move bloqueado ate aprovacao manual" },
      ],
      backupTimestamp: '2026-05-18-143000',
    }
    const goldenPath = path.join(__dirname, 'steps', '__golden__', 'preview-renderer', 'aggregated-diff.txt')
    const expected = await fs.readFile(goldenPath, 'utf8')
    const actual = renderMergePreview(fixture)
    expect(actual.trim()).toBe(expected.trim())
  })

  it('omits docMoves section when empty', () => {
    const empty: MergePreview = {
      claudeMd: { originalLines: 100, finalLines: 36, akitaBlocks: [] },
      docMoves: [],
      blockedBySecrets: [],
      backupTimestamp: '2026-05-18-143000',
    }
    const output = renderMergePreview(empty)
    expect(output).not.toContain('Docs existentes')
    expect(output).toContain('CLAUDE.md (existente, 100 linhas)')
  })

  it('omits secrets section when empty', () => {
    const noSecrets: MergePreview = {
      claudeMd: { originalLines: 100, finalLines: 36, akitaBlocks: [] },
      docMoves: [{ from: 'a.md', to: 'b.md', action: 'move' }],
      blockedBySecrets: [],
      backupTimestamp: '2026-05-18-143000',
    }
    const output = renderMergePreview(noSecrets)
    expect(output).not.toContain('Secrets detectados')
  })
})
```

### Passo 5: Criar golden snapshot file em `__golden__/preview-renderer/aggregated-diff.txt`

Conteudo deve bater EXATAMENTE com o output do renderer para o fixture do Passo 4. Geracao recomendada:
1. Rodar o teste pela primeira vez (vai falhar — golden nao existe).
2. Copiar o `actual` do erro e gravar no path do golden.
3. Re-rodar — deve passar.

Conteudo aproximado:

```
PROPOSTA DE TRANSFORMACAO (revise antes de aprovar)

CLAUDE.md (existente, 287 linhas):
  [Bloco: Code Style] -> docs/DESIGN.md (secao Code Style)
  [Bloco: Tests] -> docs/DESIGN.md (secao Tests)
  [Bloco: Security] -> docs/SECURITY.md
  [Bloco: Environment] -> ARCHITECTURE.md (secao Environment)
CLAUDE.md final: indice 36 linhas espelhado de AGENTS.md
Backup: .anti-vibe/backup/2026-05-18-143000/CLAUDE.md

Docs existentes (4 arquivos):
  docs/ARQUITETURA.md -> docs/ARCHITECTURE.md
  docs/STRIPE_INTEGRATION.md -> docs/references/STRIPE_INTEGRATION.md
  CONTRIBUTING.md -> docs/references/CONTRIBUTING.md
  .claude/memory/notes.md -> docs/compound/2026-05-18-notes-import.md (orfao -> references)

README.md: intocavel (read-only)

Secrets detectados:
  WARN docs/STRIPE_INTEGRATION.md contem 'sk_live_*' — move bloqueado ate aprovacao manual
```

---

## Gotchas

- **G3 do plano (dry-run parity):** UMA fonte de string entre dry-run e needsUser eh o ponto desta fase. Sem isso, CA-13 falha estruturalmente — nao por bug, por arquitetura.
- **G7 do plano (drift artifact schema):** Renderer NAO precisa renderizar drift report — drift eh emitido em `console.log` separado pelo Step 12 (fase-03). Mantemos escopo restrito ao MergePreview.
- **Local: snapshot teste sensivel a EOL (CRLF vs LF).** No Windows, `fs.readFile(golden, 'utf8')` pode retornar CRLF se golden foi commitado com auto-eol. Usar `.trim()` em ambos os lados E adicionar `.gitattributes` regra `*.txt text eol=lf` no `__golden__/` para evitar surpresa em CI cross-OS. Registrar em MEMORY.md como GT-1 apos primeiro encontro.
- **Local: nao incluir cor ANSI no output.** Cor eh decisao do dispatcher (que pode ter terminal sem suporte ou estar em CI). Renderer eh string pura.
- **Local: ordem dos blocos/moves vem do input.** NAO sort interno — testes do Plano 04 fase-02 ja deveriam ter ordenado deterministicamente antes de chamar o renderer. Se ordem nao for deterministica no upstream, snapshot vai flicker. Fase-02 deste plano nao corrige isso — apenas DOCUMENTA o requisito.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/preview-renderer.test.ts` falha — `preview-renderer.ts` ainda nao existe ou golden ausente.
  - Comando: `bun run test skills/init/lib/preview-renderer.test.ts`
  - Resultado esperado: `Cannot find module './preview-renderer'` ou snapshot mismatch.

- [ ] **GREEN:** Renderer implementado + golden gerado. Teste passa.
  - Comando: `bun run test skills/init/lib/preview-renderer.test.ts`
  - Resultado esperado: `3 passed, 0 failed`.

### Checklist

- [ ] `skills/init/lib/preview-renderer.ts` existe e exporta `renderMergePreview` + `MergePreview`.
- [ ] `skills/init/lib/steps/__golden__/preview-renderer/aggregated-diff.txt` existe com snapshot determinista.
- [ ] `skills/init/lib/steps/09-propose-merge-batch.ts` importa `renderMergePreview` e usa em AMBOS branches (dry-run e needsUser) — verificavel via grep: `grep -c "renderMergePreview" skills/init/lib/steps/09-propose-merge-batch.ts` retorna `>= 2` (1 import + 1 chamada minimo).
- [ ] Testes passam: `bun run test skills/init/lib/preview-renderer.test.ts`.
- [ ] Lint limpo: `bun run lint skills/init/lib/preview-renderer.ts`.
- [ ] `bun run typecheck` (se configurado) clean.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/preview-renderer.test.ts` retorna `3 passed, 0 failed`.
- `grep -c "renderMergePreview" skills/init/lib/steps/09-propose-merge-batch.ts` retorna `>= 2`.
- Diff entre output do renderer em modo `--dry-run` e prompt do `needsUser` em modo real para o mesmo input MergePreview eh BYTE-IDENTICO (validavel via teste de integracao isolado).

**Por humano:**
- Output renderizado bate o exemplo do PRD UX Flow item 6 visualmente.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

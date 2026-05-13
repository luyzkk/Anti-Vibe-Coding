<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-11 (Luiz/dev): default `status: complete` — alinhado com D33/S12`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: completion-signal-helper

**Plano:** 06 — Agent-Native (D31 CRUD + D32 STATE.md hook + D33 completion signal)
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase — helper isolado)
**Visual:** false

---

## O que esta fase entrega

`lib/completion-signal.ts` exporta `renderCompletionSignal()` que padroniza o bloco YAML machine-readable emitido ao fim de cada skill (D33/S12) — base para fase-02 e para todas as skills futuras.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/lib/completion-signal.ts` | Create | Helper TS com `renderCompletionSignal(opts)` + tipos `CompletionSignal`, `CompletionStatus` |
| `anti-vibe-coding/lib/completion-signal.test.ts` | Create | Suite de testes RED→GREEN (parsing, idempotencia de campos, fallback de `next_suggested`) |
| `anti-vibe-coding/package.json` | Modify | Adicionar `js-yaml` em `dependencies` (se ausente — verificar antes); adicionar `@types/js-yaml` em `devDependencies` |

---

## Implementacao

### Passo 1: Verificar deps existentes

Antes de adicionar `js-yaml`, verificar se ja existe no `anti-vibe-coding/package.json`. Se sim, pular instalacao. Senao:

```bash
bun add js-yaml
bun add -d @types/js-yaml
```

### Passo 2: Tipos e contrato

```typescript
// 2026-05-11 (Luiz/dev): tipos do completion signal — D33/S12, PRD CA-47
// status: 'complete' = skill rodou ate o fim sem bloqueio
// status: 'blocked' = skill precisou de input que nao foi fornecido (blocks_for_user listado)
// status: 'in_progress' = skill emitiu signal intermediario (raro — uso futuro)
export type CompletionStatus = 'complete' | 'blocked' | 'in_progress'

export type CompletionSignal = {
  skill: string                  // nome canonico, ex: 'lessons-learned'
  status: CompletionStatus
  outputs: string[]              // paths relativos a projectRoot ou absolutos
  next_suggested: string | null  // ex: '/write-prd' ou null
  blocks_for_user: string[]      // perguntas/inputs faltando — vazio se status=complete
}
```

### Passo 3: Helper `renderCompletionSignal`

```typescript
import * as yaml from 'js-yaml'

/**
 * Renderiza um bloco YAML padronizado para ser concatenado ao output final de uma skill.
 * Retorna string PURA — skill decide quando emitir (geralmente via `console.log(result)`).
 *
 * @example
 *   const block = renderCompletionSignal({
 *     skill: 'grill-me',
 *     status: 'complete',
 *     outputs: ['./.planning/2026-05-11-foo/CONTEXT.md'],
 *     next_suggested: '/write-prd',
 *     blocks_for_user: [],
 *   })
 *   console.log(mainOutput + '\n\n' + block)
 *
 * Idempotencia: NAO eh idempotente — chamar 2x produz 2 blocos. Skill deve chamar 1x ao fim.
 * Fallback gracioso: se skill esquecer de chamar, orquestrador usa heuristica antiga (R16).
 */
export function renderCompletionSignal(opts: CompletionSignal): string {
  // 2026-05-11 (Luiz/dev): valida campos antes de serializar — falha rapida com mensagem clara
  if (!opts.skill || typeof opts.skill !== 'string') {
    throw new Error('renderCompletionSignal: campo `skill` obrigatorio (string)')
  }
  if (!['complete', 'blocked', 'in_progress'].includes(opts.status)) {
    throw new Error(`renderCompletionSignal: status invalido "${opts.status}"`)
  }
  if (!Array.isArray(opts.outputs)) {
    throw new Error('renderCompletionSignal: outputs deve ser array')
  }
  if (!Array.isArray(opts.blocks_for_user)) {
    throw new Error('renderCompletionSignal: blocks_for_user deve ser array')
  }

  // 2026-05-11 (Luiz/dev): contrato D33 — se status='complete', blocks_for_user deve estar vazio
  if (opts.status === 'complete' && opts.blocks_for_user.length > 0) {
    throw new Error('renderCompletionSignal: status=complete exige blocks_for_user vazio')
  }

  // 2026-05-11 (Luiz/dev): trunca strings longas em blocks_for_user — 80 chars max (06-A2)
  const safeBlocks = opts.blocks_for_user.map((b) =>
    b.length > 80 ? b.slice(0, 77) + '...' : b
  )

  const payload = {
    skill: opts.skill,
    status: opts.status,
    outputs: opts.outputs,
    next_suggested: opts.next_suggested,
    blocks_for_user: safeBlocks,
  }

  // 2026-05-11 (Luiz/dev): flowLevel=-1 forca block-style — mais legivel para humano
  // que tambem le o output. lineWidth=120 evita quebras estranhas em paths.
  const body = yaml.dump(payload, { flowLevel: -1, lineWidth: 120, noRefs: true })

  return '```yaml\n' + body + '```'
}

/**
 * Extrai o bloco YAML de um output bruto de skill. Util para testes e para
 * orquestrador parent que precisa consumir o signal.
 *
 * @returns objeto parseado ou null se nenhum bloco encontrado
 */
export function extractCompletionSignal(rawOutput: string): CompletionSignal | null {
  // 2026-05-11 (Luiz/dev): match do ultimo bloco ```yaml ... ``` no output
  // Multiplos blocos: pegamos o ULTIMO (skill pode ter blocos didaticos antes)
  const regex = /```yaml\s*\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  let lastBlock: string | null = null
  while ((match = regex.exec(rawOutput)) !== null) {
    lastBlock = match[1]
  }
  if (!lastBlock) return null

  try {
    const parsed = yaml.load(lastBlock) as unknown
    // 2026-05-11 (Luiz/dev): type guard manual — js-yaml retorna unknown
    if (!parsed || typeof parsed !== 'object') return null
    const p = parsed as Record<string, unknown>
    if (typeof p.skill !== 'string') return null
    if (!['complete', 'blocked', 'in_progress'].includes(p.status as string)) return null
    if (!Array.isArray(p.outputs)) return null
    if (!Array.isArray(p.blocks_for_user)) return null
    return p as unknown as CompletionSignal
  } catch {
    return null
  }
}
```

### Passo 4: Suite de testes

```typescript
// anti-vibe-coding/lib/completion-signal.test.ts
import { describe, it, expect } from 'bun:test'
import { renderCompletionSignal, extractCompletionSignal } from './completion-signal'

describe('renderCompletionSignal', () => {
  it('returns parseable YAML block with required fields', () => {
    const block = renderCompletionSignal({
      skill: 'grill-me',
      status: 'complete',
      outputs: ['./.planning/foo/CONTEXT.md'],
      next_suggested: '/write-prd',
      blocks_for_user: [],
    })

    expect(block.startsWith('```yaml\n')).toBe(true)
    expect(block.endsWith('```')).toBe(true)

    const parsed = extractCompletionSignal(block)
    expect(parsed).not.toBeNull()
    expect(parsed?.skill).toBe('grill-me')
    expect(parsed?.status).toBe('complete')
    expect(parsed?.outputs).toEqual(['./.planning/foo/CONTEXT.md'])
    expect(parsed?.next_suggested).toBe('/write-prd')
  })

  it('rejects status=complete with non-empty blocks_for_user', () => {
    expect(() =>
      renderCompletionSignal({
        skill: 'foo',
        status: 'complete',
        outputs: [],
        next_suggested: null,
        blocks_for_user: ['precisa de input X'],
      })
    ).toThrow(/blocks_for_user vazio/)
  })

  it('truncates blocks_for_user strings longer than 80 chars', () => {
    const longInput = 'x'.repeat(120)
    const block = renderCompletionSignal({
      skill: 'foo',
      status: 'blocked',
      outputs: [],
      next_suggested: null,
      blocks_for_user: [longInput],
    })
    const parsed = extractCompletionSignal(block)
    expect(parsed?.blocks_for_user[0].length).toBeLessThanOrEqual(80)
    expect(parsed?.blocks_for_user[0].endsWith('...')).toBe(true)
  })

  it('accepts null next_suggested', () => {
    const block = renderCompletionSignal({
      skill: 'lessons-learned',
      status: 'complete',
      outputs: ['./docs/compound/2026-05-11-foo.md'],
      next_suggested: null,
      blocks_for_user: [],
    })
    const parsed = extractCompletionSignal(block)
    expect(parsed?.next_suggested).toBeNull()
  })
})

describe('extractCompletionSignal', () => {
  it('returns null when no yaml block present', () => {
    expect(extractCompletionSignal('plain text output')).toBeNull()
  })

  it('extracts last yaml block when multiple present', () => {
    const output = `
some output

\`\`\`yaml
skill: didactic-example
status: complete
outputs: []
next_suggested: null
blocks_for_user: []
\`\`\`

more output

\`\`\`yaml
skill: actual-signal
status: complete
outputs: ['./foo.md']
next_suggested: null
blocks_for_user: []
\`\`\`
`
    const parsed = extractCompletionSignal(output)
    expect(parsed?.skill).toBe('actual-signal')
  })

  it('returns null on malformed yaml', () => {
    expect(extractCompletionSignal('```yaml\nnot: valid: yaml:\n```')).toBeNull()
  })
})
```

---

## Gotchas

- **G1 do plano (formato e opcionalidade):** Helper retorna string pura, sem `console.log`. Skill decide quando emitir. Idempotencia eh responsabilidade da skill (chamar 1x ao fim).
- **G13 do plano (R16 fallback):** Nao validar que skill chamou. Orquestrador parent faz fallback se signal ausente.
- **G14 do plano (chamadas duplicadas):** Sem teste de idempotencia — eh contrato com a skill.
- **Local — `js-yaml` `noRefs`:** Sem `noRefs: true` o YAML pode gerar `&id001` em arrays referenciados — quebra parseability para orquestradores simples. Sempre passar a flag.
- **Local — `flowLevel: -1`:** Forca block-style. `flowLevel: 0` produziria `outputs: [./foo.md]` (inline) — menos legivel.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito ANTES da implementacao, FALHA por assertion
  - Comando: `cd anti-vibe-coding && bun test lib/completion-signal.test.ts`
  - Resultado esperado: `expect(block.startsWith('\`\`\`yaml\\n')).toBe(true)` falha porque helper stub retorna `''`

- [ ] **GREEN:** Implementacao minima, todos os 7 testes passam
  - Comando: `cd anti-vibe-coding && bun test lib/completion-signal.test.ts`
  - Resultado esperado: `7 pass, 0 fail`

### Checklist

- [ ] `js-yaml` presente em `dependencies` do `anti-vibe-coding/package.json`
- [ ] `@types/js-yaml` presente em `devDependencies`
- [ ] `renderCompletionSignal({status: 'complete', blocks_for_user: ['x']})` joga `Error`
- [ ] `extractCompletionSignal('texto sem yaml')` retorna `null`
- [ ] `extractCompletionSignal(renderCompletionSignal(opts))` recupera opts (round-trip)
- [ ] Output contem exatamente uma string `'```yaml'` no inicio e uma `'```'` no fim
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck` (ou `tsc --noEmit`)

---

## Criterio de Aceite

**Por maquina:**

- `cd anti-vibe-coding && bun test lib/completion-signal.test.ts` retorna exit 0 com `7 pass, 0 fail`.
- Round-trip: `extractCompletionSignal(renderCompletionSignal(payload))` retorna objeto profundamente igual ao `payload` (exceto `blocks_for_user` que pode ter sido truncado).
- `node -e "console.log(require('./lib/completion-signal').renderCompletionSignal({skill:'x',status:'complete',outputs:[],next_suggested:null,blocks_for_user:[]}))"` imprime bloco valido (>20 chars, contem `skill: x`).

**Por humano:**

- N/A — fase pura de helper TS sem UI.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

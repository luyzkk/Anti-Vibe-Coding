<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-21 (Luiz/dev): schemaVersion literal '1.0' — DT-06 do PRD`
-->

# Fase 01: Shared Manifest Schema (Zod)

**Plano:** 02 — Step 3 (secrets-scan) + Step 4 (migrate + manifest) + Shared Manifest Schema
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase do Plano 02; depende apenas do Plano 01 estar pronto)
**Visual:** false

---

## O que esta fase entrega

`skills/_shared/legacy-manifest-schema.ts` com schema Zod + tipos exportados (`LegacyManifest`,
`LegacyEntry`, `LegacyEntryType`) que sera importado pelo writer (init Step 4) e pelo reader
(execute-plan, em PRD proprio futuro). Cumpre DR-5 do PLAN.md.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `package.json` | Modify | Adicionar `zod` em `dependencies` via `bun add zod` |
| `skills/_shared/legacy-manifest-schema.ts` | Create | Zod schema + tipos exportados (DT-06 do PRD) |
| `skills/_shared/legacy-manifest-schema.test.ts` | Create | Testes de parse OK + parse fail em cada campo obrigatorio |

---

## Implementacao

### Passo 1: Instalar `zod` como dependency

`zod` nao esta no `package.json` (confirmado via grep — apenas `gray-matter` e `js-yaml`).
DR-5 do PLAN.md cita Zod explicitamente para schema compartilhado. Adicionar como `dependency`
(nao `devDependency`) porque ambos init writer e execute-plan reader sao runtime.

```bash
bun add zod
```

Confirmar no `package.json`:

```json
{
  "dependencies": {
    "gray-matter": "^4.0.3",
    "js-yaml": "^4.1.1",
    "zod": "^3.x"
  }
}
```

Documentar essa decisao em `MEMORY.md` como `DI-Plano02-fase01-zod-dep` (ja preenchido).

### Passo 2: Criar o diretorio `skills/_shared/`

```bash
mkdir -p skills/_shared
```

Esse diretorio nao existe ainda (confirmado via Glob). Convencao: prefixo `_` indica modulo
compartilhado entre skills (nao e uma skill em si). Outros shared assets podem entrar aqui no futuro.

### Passo 3: Escrever `skills/_shared/legacy-manifest-schema.ts`

Schema baseado EXATAMENTE em DT-06 do PRD (linha 230-273). Todos os campos obrigatorios sao
validados; campos opcionais (`migratedTo`, `note`, `lines`) sao `.optional()`.

```typescript
// skills/_shared/legacy-manifest-schema.ts
// 2026-05-21 (Luiz/dev): Schema Zod compartilhado entre init (writer) e execute-plan (reader).
// DR-5 do PLAN.md init-refactor-v7. Schema espelha DT-06 do PRD (linha 230-273).
// Mudanca em qualquer campo aqui quebra ambos os lados tipados em compile-time.

import { z } from 'zod'

// 2026-05-21 (Luiz/dev): tipos de entrada definidos no PRD D6/D7/D8.
// 'planning' eh o unico que tem action 'moved'; demais sao 'reference-only' ou 'preserved'.
export const LegacyEntryTypeSchema = z.enum([
  'planning',
  'compound',
  'lessons',
  'decisions',
  'claude-md',
  'knowledge-legacy',
  'rules',
])

export type LegacyEntryType = z.infer<typeof LegacyEntryTypeSchema>

// 2026-05-21 (Luiz/dev): action enum derivado dos exemplos do DT-06.
// 'moved' = init moveu (so planning). 'reference-only' = init nao tocou; execute-plan le.
// 'preserved' = init NAO modificou (CLAUDE.md, CA-02 do PRD).
export const LegacyActionSchema = z.enum(['moved', 'reference-only', 'preserved'])

export type LegacyAction = z.infer<typeof LegacyActionSchema>

// 2026-05-21 (Luiz/dev): entrada individual do array `legacy[]` do manifest.
// `found: true` sempre — entradas com `found: false` nao sao adicionadas ao array.
// `lines` opcional; populado apenas para `type: 'claude-md'`.
// `migratedTo` opcional; populado apenas para `action: 'moved'`.
// `note` opcional; texto livre orientador (ex: "Importar para docs/compound/").
export const LegacyEntrySchema = z.object({
  type: LegacyEntryTypeSchema,
  found: z.literal(true),
  sourcePath: z.string().min(1),
  action: LegacyActionSchema,
  migratedTo: z.string().optional(),
  note: z.string().optional(),
  lines: z.number().int().nonnegative().optional(),
})

export type LegacyEntry = z.infer<typeof LegacyEntrySchema>

// 2026-05-21 (Luiz/dev): stack snapshot do Step 2 (Plano 01 fase-02).
// `primary` pode ser null (fallback "no signal"). `confidence` derivado da quantidade
// de manifests detectados — high se >=1 probe positivo + anchor files; low se nenhum.
export const ManifestStackSchema = z.object({
  primary: z.enum(['nextjs', 'node-ts', 'rails', 'laravel', 'python']).nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
})

export type ManifestStack = z.infer<typeof ManifestStackSchema>

// 2026-05-21 (Luiz/dev): schema raiz. schemaVersion literal '1.0' — qualquer mudanca breaking
// vira '2.0' e o reader precisa migrar. detectedAt em ISO 8601 (`new Date().toISOString()`).
export const LegacyManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  detectedAt: z.string().datetime(),
  stack: ManifestStackSchema,
  legacy: z.array(LegacyEntrySchema),
})

export type LegacyManifest = z.infer<typeof LegacyManifestSchema>

/**
 * Helper: parseia JSON cru do manifest e valida contra o schema.
 * Lanca `z.ZodError` em caso de divergencia — caller pode capturar e formatar mensagem.
 *
 * @example
 * const raw = await fs.readFile('.claude/legacy-manifest.json', 'utf8')
 * const manifest = parseLegacyManifest(JSON.parse(raw))
 * // manifest agora e LegacyManifest tipado
 */
export function parseLegacyManifest(input: unknown): LegacyManifest {
  return LegacyManifestSchema.parse(input)
}
```

### Passo 4: Escrever `skills/_shared/legacy-manifest-schema.test.ts`

Testes cobrem: parse OK em greenfield (`legacy: []`), parse OK em projeto com 5 tipos de entry,
parse FAIL com `schemaVersion` errado, parse FAIL sem `detectedAt`, parse FAIL com `lines` negativo.

```typescript
// skills/_shared/legacy-manifest-schema.test.ts
// 2026-05-21 (Luiz/dev): RED-GREEN cobertura do schema Zod do legacy-manifest.json (DR-5).
import { expect, test, describe } from 'bun:test'
import { LegacyManifestSchema, parseLegacyManifest } from './legacy-manifest-schema'

describe('LegacyManifestSchema', () => {
  test('parse OK em greenfield (legacy: [])', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [],
    }
    const parsed = parseLegacyManifest(input)
    expect(parsed.legacy).toHaveLength(0)
    expect(parsed.stack.primary).toBe('node-ts')
  })

  test('parse OK com entry planning moved', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'rails', confidence: 'high' },
      legacy: [
        {
          type: 'planning',
          found: true,
          sourcePath: '.claude/planning/',
          migratedTo: 'docs/specs/',
          action: 'moved',
        },
      ],
    }
    const parsed = parseLegacyManifest(input)
    expect(parsed.legacy[0]?.action).toBe('moved')
    expect(parsed.legacy[0]?.migratedTo).toBe('docs/specs/')
  })

  test('parse OK com entry claude-md preserved + lines count', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [
        {
          type: 'claude-md',
          found: true,
          sourcePath: '.claude/CLAUDE.md',
          action: 'preserved',
          lines: 533,
        },
      ],
    }
    const parsed = parseLegacyManifest(input)
    expect(parsed.legacy[0]?.lines).toBe(533)
  })

  test('parse OK com stack.primary: null (fallback)', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: null, confidence: 'low' },
      legacy: [],
    }
    const parsed = parseLegacyManifest(input)
    expect(parsed.stack.primary).toBeNull()
  })

  test('parse FAIL com schemaVersion errado', () => {
    const input = {
      schemaVersion: '2.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [],
    }
    expect(() => parseLegacyManifest(input)).toThrow()
  })

  test('parse FAIL sem detectedAt', () => {
    const input = {
      schemaVersion: '1.0',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [],
    }
    expect(() => parseLegacyManifest(input)).toThrow()
  })

  test('parse FAIL com lines negativo', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [
        {
          type: 'claude-md',
          found: true,
          sourcePath: '.claude/CLAUDE.md',
          action: 'preserved',
          lines: -1,
        },
      ],
    }
    expect(() => parseLegacyManifest(input)).toThrow()
  })

  test('parse FAIL com type fora do enum', () => {
    const input = {
      schemaVersion: '1.0',
      detectedAt: '2026-05-21T10:00:00.000Z',
      stack: { primary: 'node-ts', confidence: 'high' },
      legacy: [
        {
          type: 'invalid-type',
          found: true,
          sourcePath: 'foo',
          action: 'moved',
        },
      ],
    }
    expect(() => parseLegacyManifest(input)).toThrow()
  })
})
```

---

## Gotchas

- **G1 do plano (zod nao instalado):** Confirmado via grep — `package.json` nao tem zod.
  Adicionar via `bun add zod` ANTES de escrever o schema (TypeScript nao compila sem o pacote).

- **G10 do plano (schemaVersion + ISO timestamp):** Schema usa `z.literal('1.0')` — qualquer
  outro valor falha no parse. `detectedAt` usa `z.string().datetime()` — exige formato ISO 8601
  com timezone (`new Date().toISOString()` retorna `'2026-05-21T10:00:00.000Z'` que e valido).

- **Local — `found: true` literal:** No PRD DT-06 todas as entries tem `found: true`. Entradas
  com `found: false` nao sao adicionadas ao array (writer no Step 4 filtra antes de pushar).
  Schema usa `z.literal(true)` para enforce isso — entry com `found: false` falha parse.

- **Local — `stack.primary: null` permitido:** O `DetectedStack.primary` no `detect-stack.ts`
  pode ser `null` (linha 31-33, "Sem sinal (fallback)"). Schema reflete isso com `.nullable()`.

- **Local — confidence enum:** `confidence: 'high' | 'medium' | 'low'`. Step 4 deriva confidence
  de regras simples: `high` se 1+ probe positivo, `low` se 0 probes (stack.primary null).
  `medium` reservado para casos futuros (ex: conflito multi-stack). Documentar no Step 4 (fase-03).

---

## Verificacao

### TDD

- [ ] **RED:** Teste `parse OK em greenfield (legacy: [])` escrito ANTES do schema —
  falha por modulo nao existir (não compilation error: tornar arquivo `_shared/legacy-manifest-schema.ts`
  vazio com `export {}` para o test compilar e falhar por `LegacyManifestSchema is not defined`
  / runtime). Alternativa: arquivo retornando schema generico `z.object({})` — parse falha por
  campos ausentes.
  - Comando: `bun test skills/_shared/legacy-manifest-schema.test.ts --grep "parse OK em greenfield"`
  - Resultado esperado: assertion failure (`expected ... received undefined` ou `expected to not throw`)

- [ ] **GREEN:** Schema completo implementado, todos os 8 testes passam
  - Comando: `bun test skills/_shared/legacy-manifest-schema.test.ts`
  - Resultado esperado: `8 passed, 0 failed`

### Checklist

- [ ] `bun add zod` executado, `package.json` mostra zod em dependencies
- [ ] `skills/_shared/legacy-manifest-schema.ts` criado e exporta: `LegacyManifestSchema`, `LegacyManifest`, `LegacyEntrySchema`, `LegacyEntry`, `LegacyEntryType`, `LegacyActionSchema`, `LegacyAction`, `ManifestStackSchema`, `ManifestStack`, `parseLegacyManifest`
- [ ] Todos os 8 testes em `legacy-manifest-schema.test.ts` passam
- [ ] `bun run typecheck` limpo (sem erros TS no arquivo novo)
- [ ] `bun run lint` limpo
- [ ] `bun run test` global continua verde (nada quebrou)
- [ ] `MEMORY.md` atualizado com `DI-Plano02-fase01-zod-dep` confirmado

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/_shared/legacy-manifest-schema.test.ts` retorna `8 passed, 0 failed`
- `grep -q '"zod"' package.json` retorna exit 0
- `bun -e "import('./skills/_shared/legacy-manifest-schema').then(m => console.log(!!m.LegacyManifestSchema))"` imprime `true`
- `bun run typecheck` retorna exit 0

**Por humano:**
- Inspeccionar `skills/_shared/legacy-manifest-schema.ts` e confirmar que cada campo
  do DT-06 do PRD (linha 230-273) esta representado no schema.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->

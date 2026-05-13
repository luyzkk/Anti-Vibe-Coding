# Fase 01: Lib `telemetry-utils` — Helper Compartilhado

**Plano:** 03 — Telemetria Passiva
**Sizing:** ~2h
**Depende de:** Plano 01 fase-02 (`telemetry-types.ts`, `telemetry-schema.ts`)
**Visual:** false

---

## O que esta fase entrega

Helper reutilizável `anti-vibe-coding/skills/lib/telemetry-utils.md` com `writeTelemetryStart(entry)`, `writeTelemetryEnd(entry)`, `appendJsonlLine(path, line)`, `computeMonthlyPath(now)` e tratamento de falha silenciosa (G2/CA-09). Consumido pelas fases 02 e 03 deste plano e pelo Plano 05 (script de análise faz read; este faz write).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lib/telemetry-utils.md` | Create | Helper markdown executável com lógica TS em blocos de código (G8) |
| `anti-vibe-coding/skills/lib/telemetry-utils.test.ts` | Create | Suite com testes RED-GREEN (path em tmp dir, falha silenciosa, rotação) |
| `anti-vibe-coding/skills/lib/__fixtures__/telemetry-fixtures.ts` | Create | Fixtures de `TelemetryStart` / `TelemetryEnd` válidas para testes |

NÃO modificar: `telemetry-types.ts` ou `telemetry-schema.ts` (Plano 01 fase-02 já consolidou esses contratos).

---

## Implementacao

### Passo 1: Estrutura do helper markdown executável

Conforme G8 (lição "Instrucoes executaveis em SKILL.md pertencem a blocos de codigo") e G7 do Plano 02, criar `telemetry-utils.md` como markdown executável. Cabeçalho com 3 linhas de prosa para humanos; resto vai em blocos `typescript`.

```markdown
# telemetry-utils

Helper de telemetria passiva. Append-only em `.claude/metrics/YYYY-MM.jsonl`.
Falha silenciosa em I/O — nunca derruba a skill caller (CA-09).

## API

\`\`\`typescript
// (bloco executável — código real abaixo)
\`\`\`
```

### Passo 2: Imports e constantes

Reusa tipos de `telemetry-types.ts` (Plano 01 fase-02). NÃO redefinir.

```typescript
// anti-vibe-coding/skills/lib/telemetry-utils.md (bloco executavel)

import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { TelemetryStart, TelemetryEnd, TelemetryEntry, FasePipeline } from './telemetry-types'

// G7: lista canônica das 10 skills instrumentadas (D13)
export const INSTRUMENTED_SKILLS: ReadonlyArray<FasePipeline> = [
  'grill-me', 'write-prd', 'plan-feature', 'execute-plan', 'verify-work',
  'iterate', 'consultant', 'architecture', 'design-twice', 'quick-plan',
] as const

// Diretório base — sempre relativo ao cwd da invocação da skill
const METRICS_DIR = join('.claude', 'metrics')
const TELEMETRY_WARN_PREFIX = '[telemetry-warn]'
```

### Passo 3: Funções puras (testáveis sem IO)

Separar serialização e cálculo de path do append. Hash-list em vez de switch (CLAUDE.md raiz).

```typescript
/**
 * Computa o path do JSONL para o mês de `now`. NÃO cacheia (G3).
 * Formato: `.claude/metrics/YYYY-MM.jsonl`.
 */
export function computeMonthlyPath(now: Date = new Date(), baseDir: string = METRICS_DIR): string {
  const yyyyMM = now.toISOString().slice(0, 7) // "2026-05"
  return join(baseDir, `${yyyyMM}.jsonl`)
}

/**
 * Serializa uma entrada como JSONL (1 linha + `\n`).
 * Não inclui validação — quem chama garante que `entry` é TelemetryStart ou TelemetryEnd válido.
 */
export function serializeEntry(entry: TelemetryEntry): string {
  return JSON.stringify(entry) + '\n'
}
```

### Passo 4: Append silencioso (CA-09 / G2)

Nunca lança. `try/catch` envolve TUDO — `mkdirSync`, `appendFileSync`, qualquer throw vai pra stderr com prefixo padronizado.

```typescript
/**
 * Append-only. Falha silenciosa: nunca lança para o caller (G2 / CA-09).
 * Garante que `dirname(filePath)` existe (G4) — `mkdirSync` recursive.
 */
export function appendJsonlLine(filePath: string, line: string): void {
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    appendFileSync(filePath, line, { encoding: 'utf-8', flag: 'a' }) // G1: 'a' não 'w'
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`${TELEMETRY_WARN_PREFIX} append failed: ${message}`)
  }
}
```

### Passo 5: Wrappers `writeTelemetryStart` / `writeTelemetryEnd`

API que as skills da fase-02 e fase-03 vão consumir. Cada wrapper:
1. Computa o path (não cacheia — G3).
2. Serializa.
3. Chama `appendJsonlLine`.

```typescript
/**
 * Append de uma linha `start`. Chamado no início da skill instrumentada (CA-03).
 *
 * Exemplo de uso (dentro de SKILL.md):
 *   writeTelemetryStart({
 *     evento: 'start',
 *     skill_invocada: 'plan-feature',
 *     timestamp_inicio: new Date().toISOString(),
 *     profile_arquitetura: 'disabled',  // G5: telemetria ignora flag
 *     fase_pipeline: 'plan-feature',
 *   })
 */
export function writeTelemetryStart(entry: TelemetryStart): void {
  const filePath = computeMonthlyPath()
  appendJsonlLine(filePath, serializeEntry(entry))
}

/**
 * Append de uma linha `end`. Chamado no fim da skill (sucesso OU erro — CA-03).
 *
 * Exemplo:
 *   writeTelemetryEnd({
 *     evento: 'end',
 *     skill_invocada: 'plan-feature',
 *     timestamp_inicio: startTimestamp,
 *     timestamp_fim: new Date().toISOString(),
 *     duracao_ms: Date.now() - startMs,
 *     profile_arquitetura: 'disabled',
 *     fase_pipeline: 'plan-feature',
 *     tokens_aproximados_consumidos: 0,  // G6: aceito como "não medido"
 *     arquivos_lidos: 0,
 *     arquivos_modificados: 0,
 *     sucesso: true,
 *   })
 */
export function writeTelemetryEnd(entry: TelemetryEnd): void {
  const filePath = computeMonthlyPath()
  appendJsonlLine(filePath, serializeEntry(entry))
}
```

### Passo 6: Helper de inferência de fase (consumido pela fase-02/03)

Mapping skill → fase do pipeline. Hash-list, não switch.

```typescript
/**
 * Mapeia skill name para `fase_pipeline`. As 10 skills mapeiam 1:1 com o nome
 * (cada skill É a sua própria fase no schema). Centralizado aqui para evitar
 * typos quando 10 skills replicarem o mesmo bloco de instrumentação.
 */
const SKILL_TO_FASE: Record<string, FasePipeline> = {
  'grill-me': 'grill-me',
  'write-prd': 'write-prd',
  'plan-feature': 'plan-feature',
  'execute-plan': 'execute-plan',
  'verify-work': 'verify-work',
  'iterate': 'iterate',
  'consultant': 'consultant',
  'architecture': 'architecture',
  'design-twice': 'design-twice',
  'quick-plan': 'quick-plan',
}

export function inferFasePipeline(skillName: string): FasePipeline | null {
  return SKILL_TO_FASE[skillName] ?? null
}
```

### Passo 7: Fixtures de teste

```typescript
// anti-vibe-coding/skills/lib/__fixtures__/telemetry-fixtures.ts

import type { TelemetryStart, TelemetryEnd } from '../telemetry-types'

export const FIXTURE_START: TelemetryStart = {
  evento: 'start',
  skill_invocada: 'plan-feature',
  timestamp_inicio: '2026-05-04T10:00:00.000Z',
  profile_arquitetura: 'disabled',
  fase_pipeline: 'plan-feature',
}

export const FIXTURE_END_SUCCESS: TelemetryEnd = {
  evento: 'end',
  skill_invocada: 'plan-feature',
  timestamp_inicio: '2026-05-04T10:00:00.000Z',
  timestamp_fim: '2026-05-04T10:00:42.000Z',
  duracao_ms: 42_000,
  profile_arquitetura: 'disabled',
  fase_pipeline: 'plan-feature',
  tokens_aproximados_consumidos: 0,
  arquivos_lidos: 3,
  arquivos_modificados: 1,
  sucesso: true,
}

export const FIXTURE_END_FAILURE: TelemetryEnd = {
  ...FIXTURE_END_SUCCESS,
  sucesso: false,
  error_message: 'fixture failure for tests',
}
```

### Passo 8: Testes RED-GREEN

```typescript
// anti-vibe-coding/skills/lib/telemetry-utils.test.ts

import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  appendJsonlLine,
  computeMonthlyPath,
  serializeEntry,
  writeTelemetryStart,
  writeTelemetryEnd,
  inferFasePipeline,
  INSTRUMENTED_SKILLS,
} from './telemetry-utils'
import { parseTelemetryEntry } from './telemetry-schema'
import { FIXTURE_START, FIXTURE_END_SUCCESS, FIXTURE_END_FAILURE } from './__fixtures__/telemetry-fixtures'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'telemetry-utils-'))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('computeMonthlyPath', () => {
  test('returns YYYY-MM.jsonl in metrics dir for given date', () => {
    const path = computeMonthlyPath(new Date('2026-05-04T10:00:00Z'))
    expect(path).toMatch(/\.claude[\\/]metrics[\\/]2026-05\.jsonl$/)
  })

  test('uses now() by default and produces stable path within same month', () => {
    const a = computeMonthlyPath()
    const b = computeMonthlyPath()
    expect(a).toBe(b)
  })

  test('respects custom baseDir', () => {
    const path = computeMonthlyPath(new Date('2026-05-04T10:00:00Z'), tmpDir)
    expect(path).toBe(join(tmpDir, '2026-05.jsonl'))
  })
})

describe('serializeEntry', () => {
  test('returns single line ending with newline', () => {
    const line = serializeEntry(FIXTURE_START)
    expect(line.endsWith('\n')).toBe(true)
    expect(line.split('\n').filter(Boolean)).toHaveLength(1)
  })

  test('produces JSON parseable back via parseTelemetryEntry', () => {
    const line = serializeEntry(FIXTURE_END_SUCCESS)
    const parsed = parseTelemetryEntry(JSON.parse(line.trim()))
    expect(parsed.evento).toBe('end')
    expect(parsed.sucesso).toBe(true)
  })
})

describe('appendJsonlLine', () => {
  test('creates dir if missing and appends line (G4)', () => {
    const path = join(tmpDir, 'sub', 'nested', '2026-05.jsonl')
    appendJsonlLine(path, 'line1\n')
    expect(existsSync(path)).toBe(true)
    expect(readFileSync(path, 'utf-8')).toBe('line1\n')
  })

  test('appends without truncating existing content (G1)', () => {
    const path = join(tmpDir, '2026-05.jsonl')
    appendJsonlLine(path, 'first\n')
    appendJsonlLine(path, 'second\n')
    expect(readFileSync(path, 'utf-8')).toBe('first\nsecond\n')
  })

  test('does not throw when target dir is invalid — falls back silently (G2 / CA-09)', () => {
    const errorSpy: string[] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => { errorSpy.push(args.join(' ')) }

    // Path inválido em Windows e Unix: caractere nulo é rejeitado por todos os filesystems
    expect(() => appendJsonlLine('\0/invalid/path.jsonl', 'x\n')).not.toThrow()
    expect(errorSpy.some(line => line.includes('[telemetry-warn]'))).toBe(true)

    console.error = originalError
  })
})

describe('writeTelemetryStart / writeTelemetryEnd', () => {
  test('writes parseable start entry to monthly file', () => {
    // Sobrescrever cwd para que computeMonthlyPath aponte para tmpDir
    const originalCwd = process.cwd()
    process.chdir(tmpDir)

    try {
      writeTelemetryStart(FIXTURE_START)
      const expectedPath = join(tmpDir, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      expect(existsSync(expectedPath)).toBe(true)
      const content = readFileSync(expectedPath, 'utf-8').trim()
      const parsed = parseTelemetryEntry(JSON.parse(content))
      expect(parsed.evento).toBe('start')
      expect(parsed.skill_invocada).toBe('plan-feature')
    } finally {
      process.chdir(originalCwd)
    }
  })

  test('writes both start and end as separate lines (CA-03)', () => {
    const originalCwd = process.cwd()
    process.chdir(tmpDir)

    try {
      writeTelemetryStart(FIXTURE_START)
      writeTelemetryEnd(FIXTURE_END_SUCCESS)
      const expectedPath = join(tmpDir, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      const lines = readFileSync(expectedPath, 'utf-8').split('\n').filter(Boolean)
      expect(lines).toHaveLength(2)

      const first = parseTelemetryEntry(JSON.parse(lines[0]))
      const second = parseTelemetryEntry(JSON.parse(lines[1]))
      expect(first.evento).toBe('start')
      expect(second.evento).toBe('end')
    } finally {
      process.chdir(originalCwd)
    }
  })

  test('records sucesso=false with error_message in end entry', () => {
    const originalCwd = process.cwd()
    process.chdir(tmpDir)

    try {
      writeTelemetryEnd(FIXTURE_END_FAILURE)
      const expectedPath = join(tmpDir, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      const content = readFileSync(expectedPath, 'utf-8').trim()
      const parsed = parseTelemetryEntry(JSON.parse(content))
      if (parsed.evento !== 'end') throw new Error('expected end')
      expect(parsed.sucesso).toBe(false)
      expect(parsed.error_message).toBe('fixture failure for tests')
    } finally {
      process.chdir(originalCwd)
    }
  })
})

describe('inferFasePipeline', () => {
  test('maps each of the 10 instrumented skills to a FasePipeline (G7 / D13)', () => {
    for (const skill of INSTRUMENTED_SKILLS) {
      expect(inferFasePipeline(skill)).toBe(skill)
    }
  })

  test('returns null for non-instrumented skill', () => {
    expect(inferFasePipeline('init')).toBeNull()
    expect(inferFasePipeline('unknown')).toBeNull()
  })

  test('INSTRUMENTED_SKILLS has exactly 10 entries (D13)', () => {
    expect(INSTRUMENTED_SKILLS).toHaveLength(10)
  })
})
```

---

## Gotchas

- **G1 do README — append-only:** `flag: 'a'` explicito em `appendFileSync`. Bun aceita `appendFileSync` sem flag, mas explicitar evita ambiguidade. Coberto pelo teste `appends without truncating existing content`.
- **G2 do README — falha silenciosa:** todos os 3 pontos de I/O (`mkdirSync`, `appendFileSync`) dentro do mesmo `try/catch`. Mensagem padronizada com `[telemetry-warn]`. Coberto pelo teste `does not throw when target dir is invalid`.
- **G3 do README — path NÃO cacheado:** `computeMonthlyPath` é chamada DENTRO de cada `writeTelemetryStart` e `writeTelemetryEnd`, NÃO em variável module-level. Coberto pelo design — não tem teste explícito (testar virada de mês exigiria mockar `Date.now`, custo > benefício).
- **G4 do README — `mkdirSync` recursive:** `{ recursive: true }` cria toda a hierarquia. Sem isso, primeira invocação em projeto novo falharia (`.claude/` ou `.claude/metrics/` ausente). Coberto pelo teste `creates dir if missing`.
- **G6 do README — tokens = 0:** fixtures usam `0`. Documentado em JSDoc e MEMORY.md. Aceitar como "não medido".
- **G8 do README — markdown executável:** `telemetry-utils.md` tem código em blocos `typescript`. Bun consegue importar via convenção do plugin (resolução existe — Plano 02 e Plano 01 fase-04 usam o mesmo padrão). Se import falhar, sinalizar como bug em MEMORY.md.
- **G10 do README — síncrono:** todos os helpers são sync. Skills markdown não têm await chain confiável.
- **Local — `\0` em path para teste de erro:** Windows e Unix rejeitam caractere nulo em paths. Forma portátil de forçar erro de I/O sem depender de permissões de filesystem.
- **Local — `process.chdir` em teste:** restaurar `originalCwd` em `finally` é obrigatório. Falha de teste no meio sem restore polui outros testes do mesmo arquivo.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos antes de `telemetry-utils.md`. Falham com `Cannot find module './telemetry-utils'` (ou cada test individualmente por assertion).
  - Comando: `bun run test --grep 'telemetry-utils'`
  - Resultado esperado: 12+ falhas

- [ ] **GREEN:** Implementação mínima do helper (passos 2-6). Todos os testes passam.
  - Comando: `bun run test --grep 'telemetry-utils'`
  - Resultado esperado: `12 passed, 0 failed` (ou mais)

- [ ] **REFACTOR:** Sem `any`, sem `as`, named exports apenas, hash-list para `SKILL_TO_FASE`.
  - Comando: `bun run lint && bun run typecheck`
  - Resultado esperado: 0 warnings, 0 errors

### Checklist

- [ ] `telemetry-utils.md` existe e tem 5 funções exportadas: `appendJsonlLine`, `computeMonthlyPath`, `serializeEntry`, `writeTelemetryStart`, `writeTelemetryEnd`, `inferFasePipeline` + constante `INSTRUMENTED_SKILLS`
- [ ] Imports usam `import type` para `TelemetryStart`/`TelemetryEnd`/`TelemetryEntry`/`FasePipeline` (vindos de Plano 01 fase-02 — não redefinir)
- [ ] `INSTRUMENTED_SKILLS.length === 10` (D13 / G7)
- [ ] Nenhum throw escapa de `appendJsonlLine` — verificado pelo teste de path inválido
- [ ] `appendFileSync` com `flag: 'a'` explícito (G1)
- [ ] `mkdirSync` com `recursive: true` (G4)
- [ ] `console.error` com prefixo exato `[telemetry-warn]` (CA-09)
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por máquina:**
- `bun run test --grep 'telemetry-utils'` retorna `passed` em todos os testes (mínimo 12)
- `bun run typecheck` retorna 0 errors
- `grep -c '\[telemetry-warn\]' anti-vibe-coding/skills/lib/telemetry-utils.md` retorna `>= 1` (string aparece pelo menos no `console.error`)
- `grep -c "INSTRUMENTED_SKILLS" anti-vibe-coding/skills/lib/telemetry-utils.md` retorna `>= 2` (definição + export)
- Conteúdo do arquivo gerado pelos testes em `tmp` valida via `parseTelemetryEntry` sem throw

**Por humano:**
- Lendo `telemetry-utils.md`, fica claro que I/O nunca lança — o `try/catch` envolve a operação inteira
- API documentada com JSDoc inclui exemplo concreto de uso (consumido pelas fases 02/03)

---

## Próxima Fase

`fase-02-instrumentar-pipeline-core.md` — instrumenta as 5 skills do pipeline core (`grill-me`, `write-prd`, `plan-feature`, `execute-plan`, `verify-work`) usando os helpers desta fase.

---

<!-- Gerado por /plan-feature em 2026-05-04 -->

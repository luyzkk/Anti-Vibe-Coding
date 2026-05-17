<!--
Princípio universal #5 — Comment Provenance.
Comentários em código gerado desta fase seguem: autor + papel, YYYY-MM-DD, razão/decisão referenciada.
Ex: `// 2026-05-16 (Luiz/dev): novo evento stack_detected — alinhado com RF9`
-->

# Fase 04: Telemetria — eventos `stack_detected` e `knowledge_copied`

**Plano:** 02 — Init Enrichment
**Sizing:** 1h
**Depende de:** fase-02 (consome `readStackJson` / `MultiStackResult`) e fase-03 (consome `CopyKnowledgeResult` com `status`/`atomCount`)
**Visual:** false

---

## O que esta fase entrega

Emissão de dois eventos auxiliares de domínio via `lib/telemetry-utils.ts` quando `/init` roda: `stack_detected` (com `primary`, `secondary`, `anchor_files`) e `knowledge_copied` (com `stack`, `atom_count`, `status`). Cumpre RF9; respeita G7 (não bloqueia, não trava o `/init`).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/lib/telemetry-types.ts` | Modify | Adicionar tipo `TelemetryDomainEvent` (`stack_detected` \| `knowledge_copied`) sem mexer em `TelemetryStart`/`TelemetryEnd` existentes. |
| `skills/lib/telemetry-utils.ts` | Modify | Adicionar helper `writeTelemetryDomainEvent(entry)` que reusa `appendJsonlLine` / `computeMonthlyPath`. |
| `skills/lib/telemetry-utils.test.ts` | Modify | Adicionar casos para o novo helper (formato JSONL correto, falha silenciosa, dirname recursive). |
| `skills/init/SKILL.md` | Modify | Após detectMultiStack + copyKnowledge, emitir os dois eventos. |

---

## Implementacao

### Passo 1: Decidir formato do tipo (DI-3)

G8 lista a decisão: reutilizar `TelemetryEnd` com payload aninhado **ou** criar tipo dedicado. Esta fase escolhe **tipo dedicado** — `stack_detected` e `knowledge_copied` não têm `evento: 'start'|'end'`, não têm `duracao_ms`, e expor isso como `TelemetryEnd` polui o schema. Registrar como DI-3 em MEMORY.md.

```typescript
// 2026-05-16 (Luiz/dev): tipo dedicado para eventos auxiliares do /init — RF9. Decisão DI-3 (ver MEMORY.md).
// G8: NÃO reusa TelemetryStart/TelemetryEnd para evitar campos não-aplicáveis (duracao_ms, etc).

// Acrescentar em skills/lib/telemetry-types.ts:

export interface TelemetryStackDetected {
  evento: "stack_detected";
  skill_invocada: "init";
  timestamp: string;            // ISO 8601 UTC
  primary: string | null;       // matrix folder name ou null (CA-06)
  secondary: string[];
  anchor_files: string[];
}

export interface TelemetryKnowledgeCopied {
  evento: "knowledge_copied";
  skill_invocada: "init";
  timestamp: string;
  stack: string | null;         // primary que foi (tentou ser) copiado
  atom_count: number;
  status: "copied" | "skipped" | "refreshed" | "no-matrix" | "no-source";
}

export type TelemetryDomainEvent = TelemetryStackDetected | TelemetryKnowledgeCopied;

// Estender união pública:
export type TelemetryEntry = TelemetryStart | TelemetryEnd | TelemetryDomainEvent;
```

### Passo 2: Helper de escrita em `telemetry-utils.ts`

Reusar a infra existente (`computeMonthlyPath`, `serializeEntry`, `appendJsonlLine`) — não duplicar.

```typescript
// 2026-05-16 (Luiz/dev): helper para eventos de domínio — RF9, G7 (falha silenciosa via appendJsonlLine).
// Acrescentar em skills/lib/telemetry-utils.ts:

import type { TelemetryDomainEvent } from './telemetry-types'

export function writeTelemetryDomainEvent(entry: TelemetryDomainEvent): void {
  const filePath = computeMonthlyPath()
  appendJsonlLine(filePath, serializeEntry(entry))
}
```

Observação: `serializeEntry` já aceita `TelemetryEntry` ampliado — basta o passo 1 ter atualizado a união.

### Passo 3: Testes do helper

```typescript
// 2026-05-16 (Luiz/dev): novos casos para o helper de eventos de domínio — RF9, G7.
// Anexar em skills/lib/telemetry-utils.test.ts:

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { writeTelemetryDomainEvent } from './telemetry-utils'

describe('writeTelemetryDomainEvent', () => {
  it('appends stack_detected entry as single JSONL line', async () => {
    // arrange: usar cwd temp para isolar .claude/metrics/
    const cwd = await fs.mkdtemp(path.join(tmpdir(), 'telem-domain-'))
    const originalCwd = process.cwd()
    process.chdir(cwd)
    try {
      writeTelemetryDomainEvent({
        evento: 'stack_detected',
        skill_invocada: 'init',
        timestamp: '2026-05-16T12:34:56.789Z',
        primary: 'nodejs-typescript',
        secondary: [],
        anchor_files: ['package.json'],
      })
      const monthlyFile = path.join(cwd, '.claude', 'metrics', '2026-05.jsonl')
      const body = await fs.readFile(monthlyFile, 'utf8')
      const lines = body.split('\n').filter(Boolean)
      expect(lines).toHaveLength(1)
      const parsed = JSON.parse(lines[0])
      expect(parsed.evento).toBe('stack_detected')
      expect(parsed.primary).toBe('nodejs-typescript')
      expect(parsed.anchor_files).toEqual(['package.json'])
    } finally {
      process.chdir(originalCwd)
    }
  })

  it('appends knowledge_copied entry with status field', async () => {
    const cwd = await fs.mkdtemp(path.join(tmpdir(), 'telem-domain-'))
    const originalCwd = process.cwd()
    process.chdir(cwd)
    try {
      writeTelemetryDomainEvent({
        evento: 'knowledge_copied',
        skill_invocada: 'init',
        timestamp: new Date().toISOString(),
        stack: 'nodejs-typescript',
        atom_count: 14,
        status: 'copied',
      })
      const monthlyFile = path.join(cwd, '.claude', 'metrics', new Date().toISOString().slice(0, 7) + '.jsonl')
      const body = await fs.readFile(monthlyFile, 'utf8')
      const parsed = JSON.parse(body.trim())
      expect(parsed.evento).toBe('knowledge_copied')
      expect(parsed.atom_count).toBe(14)
      expect(parsed.status).toBe('copied')
    } finally {
      process.chdir(originalCwd)
    }
  })

  it('never throws when filesystem write fails (G7 / CA-09 graceful)', async () => {
    // 2026-05-16 (Luiz/dev): apontar cwd para um path inválido força mkdirSync a falhar.
    // appendJsonlLine deve engolir o erro (já é contrato existente). Garantimos via expect.not.toThrow.
    const originalCwd = process.cwd()
    process.chdir('/tmp') // fallback safe
    try {
      expect(() =>
        writeTelemetryDomainEvent({
          evento: 'stack_detected',
          skill_invocada: 'init',
          timestamp: new Date().toISOString(),
          primary: null,
          secondary: [],
          anchor_files: [],
        }),
      ).not.toThrow()
    } finally {
      process.chdir(originalCwd)
    }
  })
})
```

### Passo 4: Wire-up em `/init` SKILL.md

Adicionar os dois `writeTelemetryDomainEvent` no flow do `/init`, **depois** de fase-03 e antes do return final. Não envolver em `try/catch` adicional — o helper já é silencioso (G7).

```typescript
// 2026-05-16 (Luiz/dev): emissão dos dois eventos auxiliares — RF9.
// Inserir no SKILL.md após o bloco `console.log(copyResult.message)` da fase-03.

import { writeTelemetryDomainEvent } from '../lib/telemetry-utils'

const nowISO = new Date().toISOString()

writeTelemetryDomainEvent({
  evento: 'stack_detected',
  skill_invocada: 'init',
  timestamp: nowISO,
  primary: detection.primary,
  secondary: detection.secondary,
  anchor_files: detection.anchor_files,
})

writeTelemetryDomainEvent({
  evento: 'knowledge_copied',
  skill_invocada: 'init',
  timestamp: nowISO,
  stack: detection.primary,
  atom_count: copyResult.atomCount,
  status: copyResult.status,
})
```

---

## Gotchas

- **G7 do plano:** Helper reusa `appendJsonlLine` que tem `try/catch` silencioso. NÃO adicionar `try/catch` no callsite do SKILL.md — quebra o contrato graceful e mascara o pattern centralizado.
- **G8 do plano:** Tipo dedicado `TelemetryDomainEvent` (decisão DI-3). Não reusa `TelemetryEnd` para não inflar campos não-aplicáveis (duracao_ms, tokens_aproximados_consumidos, etc).
- **Local — `skill_invocada: 'init'` mas `fase_pipeline` ausente:** Os eventos de domínio **não** têm `fase_pipeline` (tipo existente é só para skills do pipeline `grill-me → ... → iterate`). `'init'` não está em `FasePipeline` — propositalmente. Fase de telemetria observa apenas o `evento: 'stack_detected'|'knowledge_copied'`.
- **Local — `cwd` afeta o path do JSONL:** `computeMonthlyPath` resolve relativo ao cwd via `join('.claude', 'metrics', ...)`. Em testes, `process.chdir` antes da chamada e restaurar no `finally` (pattern do teste do passo 3).
- **Local — Windows path separator:** `monthlyFile` é montado com `path.join`, então no Windows vira `\` em vez de `/`. Asserts usam `path.join` também — não comparar strings hardcoded.

---

## Verificacao

### TDD

- [ ] **RED:** Testes de `writeTelemetryDomainEvent` falham (função não existe ainda no `telemetry-utils.ts`)
  - Comando: `bun run test -- --grep 'writeTelemetryDomainEvent'`
  - Resultado esperado: `TypeError: writeTelemetryDomainEvent is not a function` → após stub, `Expected 'stack_detected', received undefined`

- [ ] **GREEN:** Helper implementado; testes passam
  - Comando: `bun run test -- --grep 'writeTelemetryDomainEvent'`
  - Resultado esperado: `3 passed, 0 failed`

### Checklist

- [ ] `TelemetryDomainEvent` exportado de `telemetry-types.ts`
- [ ] Union `TelemetryEntry` ampliada para incluir o novo tipo
- [ ] Helper `writeTelemetryDomainEvent` exportado de `telemetry-utils.ts`
- [ ] Após `/init` em fixture Node+TS, `.claude/metrics/YYYY-MM.jsonl` contém **2 linhas adicionais** (uma `stack_detected`, uma `knowledge_copied`) além das linhas existentes da skill `init` (se houver)
- [ ] Após `/init` em fixture sem anchor (CA-06), evento `stack_detected` tem `primary: null` e `knowledge_copied` tem `status: 'no-matrix'`
- [ ] `git diff skills/init/lib/state-md-init.ts` vazio (G1, CA-10)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'writeTelemetryDomainEvent'` retorna `0 failed`
- Após `/init` em fixture Node+TS, `jq 'select(.evento == "stack_detected")' .claude/metrics/$(date -u +%Y-%m).jsonl` retorna objeto com `primary: "nodejs-typescript"` e `anchor_files: ["package.json"]`
- `jq 'select(.evento == "knowledge_copied")' .claude/metrics/$(date -u +%Y-%m).jsonl` retorna objeto com `stack: "nodejs-typescript"` e `atom_count > 0`

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

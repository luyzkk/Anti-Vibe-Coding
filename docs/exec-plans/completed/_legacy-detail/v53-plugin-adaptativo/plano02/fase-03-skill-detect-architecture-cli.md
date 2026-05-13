# Fase 03: Skill `/detect-architecture` — Flow CLI + Confirmacao

**Plano:** 02 — Architecture Detector
**Sizing:** 1.5h
**Depende de:** fase-02 (consome `classifyByFolders`, `sampleImports`, `computeConfidence`)
**Visual:** false

---

## O que esta fase entrega

Skill manual `/anti-vibe-coding:detect-architecture` que orquestra IO real: le `src/` do projeto atual, chama as funcoes puras das fases 01-02, computa confidence final e — quando `confidence < 80%` — abre `AskUserQuestion` mostrando o resultado preliminar com sinais e oferece confirmacao ou escolha manual entre os 5 perfis. Cobre RF1 e CA-02. Persistencia (manifest + md) e implementada na fase-04 (esta fase apenas orquestra ate ter um `DetectionResult` confirmado em memoria).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/detect-architecture/SKILL.md` | Create | Skill com frontmatter + flow executavel |
| `anti-vibe-coding/skills/lib/architecture-detector/read-src-tree.md` | Create | Helper que le `src/` real do projeto e monta `SrcTreeNode` |
| `anti-vibe-coding/skills/lib/architecture-detector/detect-architecture.md` | Create | Orquestrador puro: arvore + reader -> DetectionResult |
| `anti-vibe-coding/skills/lib/architecture-detector/detect-architecture.test.ts` | Create | Testes do orquestrador (sem AskUserQuestion) |

---

## Implementacao

### Passo 1: Helper de leitura de `src/` real

Encapsula IO. Trata G6 (src/ ausente -> tenta `app/`, `lib/`, fallback ao raiz) e G3 (monorepo: detecta `packages/` ou `apps/` na raiz).

```typescript
// read-src-tree.md

import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { SrcTreeNode } from './types'

const SRC_CANDIDATES = ['src', 'app', 'lib']
const MONOREPO_MARKERS = ['packages', 'apps']
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.turbo', 'coverage'])

export type ReadSrcTreeResult =
  | { kind: 'ok'; root: string; tree: SrcTreeNode }
  | { kind: 'monorepo'; markerDir: string }
  | { kind: 'no-src'; cwd: string }

export function readSrcTree(cwd: string): ReadSrcTreeResult {
  // G3: monorepo gracefully (OQ10)
  for (const marker of MONOREPO_MARKERS) {
    if (existsSync(join(cwd, marker))) {
      return { kind: 'monorepo', markerDir: marker }
    }
  }

  for (const candidate of SRC_CANDIDATES) {
    const full = join(cwd, candidate)
    if (existsSync(full) && statSync(full).isDirectory()) {
      return { kind: 'ok', root: full, tree: walk(full, candidate) }
    }
  }

  return { kind: 'no-src', cwd }
}

function walk(absPath: string, relPath: string): SrcTreeNode {
  const stat = statSync(absPath)
  if (!stat.isDirectory()) return { path: relPath, type: 'file' }

  const children = readdirSync(absPath)
    .filter(name => !IGNORE_DIRS.has(name))
    .map(name => walk(join(absPath, name), name))

  return { path: relPath, type: 'dir', children }
}
```

### Passo 2: Orquestrador puro

Combina classifyByFolders + sampleImports + computeConfidence em uma funcao testavel.

```typescript
// detect-architecture.md

import type { SrcTreeNode, DetectionResult } from './types'
import { classifyByFolders } from './classify-by-folders'
import { sampleImports } from './sample-imports'
import { computeConfidence } from './compute-confidence'

type FileReader = (path: string) => string

export function detectArchitecture(srcTree: SrcTreeNode, readFile: FileReader): DetectionResult {
  const folder = classifyByFolders(srcTree)
  const imports = sampleImports(srcTree, readFile)
  const { confidence, finalProfile } = computeConfidence(folder, imports)

  return {
    profile: finalProfile,
    confidence,
    detectedAt: new Date().toISOString(),
    signals: {
      folderSignals: folder.signals,
      importSignals: imports.signals,
    },
    alternativeProfiles: folder.alternativeProfiles,
  }
}
```

### Passo 3: SKILL.md com frontmatter + flow

Conforme convencao do plugin (lição "Instrucoes executaveis em SKILL.md pertencem a blocos de codigo"), todo o flow vai em blocos de codigo. Decisao D10 (confirma se < 80%) executada via `AskUserQuestion`.

```markdown
---
name: detect-architecture
description: Use this skill when the user asks to "detectar arquitetura", "classificar projeto", "qual perfil arquitetural", "/detect-architecture", or runs `/anti-vibe-coding:detect-architecture`. Classifies the project in 1 of 5 architectural profiles (clean-architecture-ritual, mvc-flat, vertical-slice, nextjs-app-router, unknown-mixed) using folder + imports heuristic.
---

# /anti-vibe-coding:detect-architecture

## Flow

```typescript
import { readSrcTree } from '../lib/architecture-detector/read-src-tree'
import { detectArchitecture } from '../lib/architecture-detector/detect-architecture'
import { readFileSync } from 'node:fs'

const cwd = process.cwd()
const srcResult = readSrcTree(cwd)

// G3: monorepo gracefully
if (srcResult.kind === 'monorepo') {
  // Pergunta ao usuario via AskUserQuestion: rodar em packages/<X>/src ou abortar?
  // Por ora (Onda 1): aborta com mensagem clara
  console.error(`[detect-architecture] Monorepo detectado (${srcResult.markerDir}/). Onda 1 nao suporta — Onda 2.`)
  process.exit(2)
}

// G6: sem src/ ou equivalente
if (srcResult.kind === 'no-src') {
  console.error('[detect-architecture] Nao encontrei src/, app/ ou lib/. Eh um projeto vazio?')
  // AskUserQuestion: indicar caminho manualmente OU classificar como unknown-mixed
  process.exit(2)
}

const { root, tree } = srcResult
const reader = (path: string) => {
  try { return readFileSync(path, 'utf-8') } catch { return '' }
}

const result = detectArchitecture(tree, reader)
```

## Decisao por confidence (D10)

```typescript
const CONFIDENCE_THRESHOLD = 80

if (result.confidence >= CONFIDENCE_THRESHOLD) {
  // Persistencia direta (delegada para fase-04 — writeArchitectureProfile)
  // Por ora desta fase: imprime preview e marca como "confirmado automaticamente"
  console.log(`Perfil detectado: ${result.profile} (${result.confidence}% confianca)`)
} else {
  // CA-02: confirma com user
  // AskUserQuestion mostra preliminar + sinais + 5 opcoes de override + "manter sugestao"
}
```

## AskUserQuestion (confidence < 80%)

```typescript
// Pseudocodigo do harness — via tool call AskUserQuestion
const top3Signals = result.signals.folderSignals.filter(s => s.matched).slice(0, 3)
const importHints = result.signals.importSignals
  .filter(s => s.matchedProfile)
  .reduce((acc, s) => { acc[s.matchedProfile!] = (acc[s.matchedProfile!] ?? 0) + 1; return acc }, {} as Record<string, number>)

const question = {
  question: `Detectei "${result.profile}" com ${result.confidence}% de confianca. Confirma ou escolhe outro?`,
  header: 'Architecture Detector',
  multiSelect: false,
  options: [
    { label: `Confirmar: ${result.profile}`, description: `Pastas: ${top3Signals.map(s => s.pattern).join(', ')}` },
    { label: 'clean-architecture-ritual', description: 'domain/, application/use-cases, infrastructure/, presentation/' },
    { label: 'mvc-flat', description: 'controllers/, models/, services/, views/ flat no topo' },
    { label: 'vertical-slice', description: 'features/<nome>/ ou modules/<nome>/ com camadas internas' },
    { label: 'nextjs-app-router', description: 'app/page.tsx, app/api/route.ts, components/, lib/' },
    { label: 'unknown-mixed', description: 'Estrutura nao bate com nenhum padrao reconhecido' },
  ],
}
// Override do profile baseado na escolha. confidence vira 100 quando user confirma manualmente.
```

## Persistencia

Delegada para fase-04 (`writeArchitectureProfile(result, cwd)`). Esta fase termina retornando o `DetectionResult` final (eventualmente com override do user).
```

### Passo 4: Testes do orquestrador

```typescript
// detect-architecture.test.ts

import { describe, expect, test } from 'bun:test'
import { detectArchitecture } from './detect-architecture'
import { TREE_CLEAN_ARCH, TREE_NEXTJS, TREE_UNKNOWN } from './__fixtures__/folder-trees'
import { FILES_CLEAN_ARCH, FILES_NEXTJS } from './__fixtures__/sample-files'

describe('detectArchitecture', () => {
  test('detects clean-architecture-ritual with confidence >= 80% (CA-01)', () => {
    const reader = (path: string) => FILES_CLEAN_ARCH[path] ?? ''
    const result = detectArchitecture(TREE_CLEAN_ARCH, reader)
    expect(result.profile).toBe('clean-architecture-ritual')
    expect(result.confidence).toBeGreaterThanOrEqual(80)
    expect(result.detectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('detects nextjs-app-router from canonical fixture', () => {
    const reader = (path: string) => FILES_NEXTJS[path] ?? ''
    const result = detectArchitecture(TREE_NEXTJS, reader)
    expect(result.profile).toBe('nextjs-app-router')
  })

  test('returns unknown-mixed with low confidence for ambiguous tree', () => {
    const result = detectArchitecture(TREE_UNKNOWN, () => '')
    expect(result.profile).toBe('unknown-mixed')
    expect(result.confidence).toBeLessThan(80)
  })

  test('combines folder + import signals into result.signals', () => {
    const reader = (path: string) => FILES_CLEAN_ARCH[path] ?? ''
    const result = detectArchitecture(TREE_CLEAN_ARCH, reader)
    expect(result.signals.folderSignals.length).toBeGreaterThan(0)
    expect(result.signals.importSignals.length).toBeGreaterThan(0)
  })

  test('detectedAt is ISO 8601 string', () => {
    const result = detectArchitecture(TREE_UNKNOWN, () => '')
    expect(() => new Date(result.detectedAt).toISOString()).not.toThrow()
  })
})
```

### Passo 5: Smoke test manual da skill

Verificacao manual (nao automatizavel sem ambiente de skill execution):

1. Em projeto Licitar (Next.js): rodar `/anti-vibe-coding:detect-architecture` e ver output de preview com `nextjs-app-router`
2. Em fixture E2E (fase-05): rodar e validar `AskUserQuestion` aparece quando confidence < 80%

---

## Gotchas

- **G2 do README — confirmacao obrigatoria:** se `confidence < 80%`, NAO persistir silenciosamente. AskUserQuestion sempre. Falha de UX critica se pular.
- **G3 do README — monorepo:** trate como erro com mensagem informativa. Nao classificar como `unknown-mixed`. Decisao OQ10 esta aqui — registrar em MEMORY.md se durante execucao decidir suportar `packages/<X>/src/`.
- **G6 do README — `src/` ausente:** `read-src-tree.md` ja trata via `SRC_CANDIDATES`. Se nenhum casar, sai com erro pedindo input do user (nao rodar heuristica em `cwd` raiz — ruido demais).
- **G7 do README — convencao SKILL.md:** todo o flow executavel em blocos triple-backtick. Frontmatter com `name` e `description` exatamente como skills existentes (`grill-me`, `write-prd`).
- **Local — `process.cwd()` em testes:** o orquestrador puro NAO usa `process.cwd()`. Apenas a SKILL.md usa, em runtime real. Testes injetam tree + reader.
- **Local — override do user vira `confidence = 100`:** quando user escolhe manualmente, confidence reflete certeza humana. Documentar em comentario WHY.

---

## Verificacao

### TDD

- [ ] **RED:** Testes de `detectArchitecture` (orquestrador) falham antes de implementar.
  - Comando: `bun run test --grep 'detectArchitecture'`
  - Resultado esperado: 5 falhas

- [ ] **GREEN:** Orquestrador implementado, testes passam.
  - Comando: `bun run test --grep 'detectArchitecture'`
  - Resultado esperado: `5 passed, 0 failed`

### Checklist

- [ ] `SKILL.md` tem frontmatter com `name: detect-architecture` e `description` contendo trigger phrases
- [ ] `read-src-tree.md` trata 3 casos: `ok`, `monorepo`, `no-src`
- [ ] `detect-architecture.md` (orquestrador) e funcao pura — sem `fs`, sem `process.cwd`
- [ ] CA-01 coberto: fixture canonica de `clean-architecture-ritual` retorna `confidence >= 80%`
- [ ] CA-02 coberto: fluxo de `AskUserQuestion` documentado em `SKILL.md` com 6 opcoes (5 perfis + confirmar)
- [ ] G3 (monorepo) tratado com mensagem clara, nao silencioso
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test --grep 'detectArchitecture'` retorna `5 passed, 0 failed`
- `grep -c '^name: detect-architecture' anti-vibe-coding/skills/detect-architecture/SKILL.md` retorna `1`
- `grep -E "(node:fs|process\\.cwd)" anti-vibe-coding/skills/lib/architecture-detector/detect-architecture.md` retorna vazio (orquestrador puro)

**Por humano:**
- SKILL.md inclui as 6 opcoes do `AskUserQuestion` em bloco de codigo
- Mensagens de erro de monorepo e no-src sao informativas (mencionam Onda 2 / pedem input)

---

<!-- Gerado por /plan-feature em 2026-05-04 -->

---
name: detect-architecture
description: "Use this skill when the user asks to 'detectar arquitetura', 'classificar projeto', 'qual perfil arquitetural', '/detect-architecture', or runs `/anti-vibe-coding:detect-architecture`. Classifies the project in 1 of 5 architectural profiles (clean-architecture-ritual, mvc-flat, vertical-slice, nextjs-app-router, unknown-mixed) using folder + imports heuristic. Requires confirmation when confidence < 80%."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Bash, Glob
argument-hint: "[optional: path to project root]"
---

<!-- profile-aware-preface:start -->
```typescript
// 2026-05-15 (Luiz/dev): v6.3.1 RF-CH-01 fase-07 — migra prosa-only → bloco TS canônico.
// Esta skill DETECTA e PERSISTE o architectureProfile. O ctx lido aqui é INFORMACIONAL:
// informa se já existe profile detectado (reclassificar) vs. primeira detecção.
// G5 do plano02 / CA-12: NUNCA preencher ctx.language ou ctx.framework — reservado v6.5/v6.6.

import { readPrefaceContext } from '../lib/preface-context'

const ctx = readPrefaceContext(process.cwd())
const existingProfile = ctx.profile ?? null
```

Esta skill detecta e persiste o `architectureProfile` no manifest. O contexto lido acima é
informacional apenas — quando `existingProfile` é não-nulo, a execução é "reclassificar";
quando é nulo, é "detectar pela primeira vez". A skill em si NÃO depende do profile já existir.
<!-- profile-aware-preface:end -->

# /anti-vibe-coding:detect-architecture

Classifica o projeto atual em 1 dos 5 perfis arquiteturais usando heurística determinística
(pastas + amostragem de imports). Quando confiança < 80%, abre confirmação interativa.

## Flow

```typescript
import { readSrcTree } from '../lib/architecture-detector/read-src-tree'
import { detectArchitecture } from '../lib/architecture-detector/detect-architecture'
import { writeArchitectureProfile } from '../lib/architecture-detector/write-architecture-profile'
import { readFileSync } from 'node:fs'

const cwd = process.cwd()
const srcResult = readSrcTree(cwd)

// G3: monorepo gracefully — Onda 1 não suporta
if (srcResult.kind === 'monorepo') {
  console.error(
    `[detect-architecture] Monorepo detectado (${srcResult.markerDir}/). ` +
    'Onda 1 não suporta detecção em monorepo. ' +
    'Execute a skill dentro do pacote específico (ex: cd packages/web && /detect-architecture) ' +
    'ou aguarde Onda 2 com suporte nativo a monorepos.'
  )
  process.exit(2)
}

// G6: sem src/ ou equivalente — pede input do usuário
if (srcResult.kind === 'no-src') {
  console.error(
    '[detect-architecture] Não encontrei src/, app/ ou lib/ neste diretório. ' +
    'É um projeto vazio? Se o código fonte está em outro caminho, execute a skill ' +
    'a partir desse diretório (ex: cd meu-app && /detect-architecture).'
  )
  process.exit(2)
}

const { root, tree } = srcResult
const reader = (path: string) => {
  try { return readFileSync(path, 'utf-8') } catch { return '' }
}

const result = detectArchitecture(tree, reader)
```

## Decisão por confidence (D10)

```typescript
const CONFIDENCE_THRESHOLD = 80

if (result.confidence >= CONFIDENCE_THRESHOLD) {
  // Alta confiança: imprime preview e vai direto para persistência (fase-04)
  console.log(
    `Perfil detectado: ${result.profile} (${result.confidence}% de confiança)\n` +
    `Detectado em: ${root}`
  )
  writeArchitectureProfile(result, cwd)
  console.log('Manifest atualizado: .claude/.anti-vibe-manifest.json')
  console.log('Markdown gerado:     .claude/architecture-profile.md')
} else {
  // CA-02: confiança baixa — confirmar com usuário via AskUserQuestion (ver abaixo)
}
```

## AskUserQuestion (confidence < 80%)

Quando `result.confidence < 80`, a skill exibe os sinais preliminares e pede confirmação
ou override manual. O harness do plugin executa via tool call `AskUserQuestion`.

```typescript
// Pseudocódigo do harness — via tool call AskUserQuestion
const top3Signals = result.signals.folderSignals.filter(s => s.matched).slice(0, 3)
const importHints = result.signals.importSignals
  .filter(s => s.matchedProfile !== null)
  .reduce((acc, s) => {
    if (s.matchedProfile) acc[s.matchedProfile] = (acc[s.matchedProfile] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

const question = {
  question: `Detectei "${result.profile}" com ${result.confidence}% de confiança.\n` +
    `Sinais de pasta: ${top3Signals.map(s => s.pattern).join(', ')}\n` +
    'Confirma ou escolhe outro perfil?',
  header: 'Architecture Detector — Confirmação',
  multiSelect: false,
  options: [
    {
      label: `Confirmar: ${result.profile}`,
      description: `Pastas encontradas: ${top3Signals.map(s => s.pattern).join(', ')} | confiança: ${result.confidence}%`,
    },
    {
      label: 'clean-architecture-ritual',
      description: 'domain/, application/use-cases, infrastructure/, presentation/',
    },
    {
      label: 'mvc-flat',
      description: 'controllers/, models/, services/, views/ flat no topo',
    },
    {
      label: 'vertical-slice',
      description: 'features/<nome>/ ou modules/<nome>/ com camadas internas',
    },
    {
      label: 'nextjs-app-router',
      description: 'app/page.tsx, app/api/route.ts, components/, lib/',
    },
    {
      label: 'unknown-mixed',
      description: 'Estrutura não bate com nenhum padrão reconhecido',
    },
  ],
}

// WHY confidence = 100 no override manual: o usuário sabe mais que a heurística.
// Quando escolhe explicitamente, a certeza é humana — 100% reflete isso.
const userChoice = /* resultado do AskUserQuestion */ question.options[0].label
const finalProfile = userChoice === `Confirmar: ${result.profile}`
  ? result.profile
  : userChoice
const finalConfidence = userChoice === `Confirmar: ${result.profile}`
  ? result.confidence
  : 100

const confirmedResult = { ...result, profile: finalProfile, confidence: finalConfidence }
writeArchitectureProfile(confirmedResult, cwd)
console.log('Manifest atualizado: .claude/.anti-vibe-manifest.json')
console.log('Markdown gerado:     .claude/architecture-profile.md')
```

## Persistência

`writeArchitectureProfile(result, cwd)` grava:
- `.claude/.anti-vibe-manifest.json` — campo `architectureProfile` preservando outros campos
- `.claude/architecture-profile.md` — markdown legível gerado por `renderArchitectureProfileMarkdown`

Idempotente: rodar duas vezes com o mesmo resultado produz arquivos idênticos (G4).

## Perfis Suportados (Onda 1)

| Perfil | Discriminador Principal |
|--------|------------------------|
| `clean-architecture-ritual` | `domain/`, `application/use-cases`, `infrastructure/`, `presentation/` |
| `mvc-flat` | `controllers/`, `models/`, `views/`, `services/` no topo |
| `vertical-slice` | `features/<nome>/` ou `modules/<nome>/` com subcamadas |
| `nextjs-app-router` | `app/page.tsx`, `app/layout.tsx`, `app/api/route.ts` |
| `unknown-mixed` | Nenhum padrão reconhecido — pede confirmação sempre |

> **Monorepo (packages/, apps/):** não suportado na Onda 1. Mensagem informativa e exit 2.
> **Onda 2:** suporte a `packages/<X>/src/` planejado (OQ10).

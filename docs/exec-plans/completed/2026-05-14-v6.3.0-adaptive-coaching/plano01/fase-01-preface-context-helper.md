<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
-->

# Fase 01: PrefaceContext Helper [TRACER BULLET]

**Plano:** 01 — Fundação Adaptativa
**Sizing:** ~1h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

`skills/lib/preface-context.ts` com o type `PrefaceContext` e a função `readPrefaceContext(projectRoot)` — wrapper de `readArchitectureProfile()` existente — mais testes unitários cobrindo CA-01 e CA-02.

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `skills/lib/preface-context.ts` | CRIAR | Helper novo: type `PrefaceContext` + `readPrefaceContext()` |
| `skills/lib/preface-context.test.ts` | CRIAR | Testes unitários: casos CA-01 (profile presente) e CA-02 (ausente) |

---

## Implementação

### Passo 1: Confirmar a API de readArchitectureProfile

Antes de escrever o wrapper, ler `skills/lib/read-architecture-profile.ts` para confirmar a assinatura exata.

Achados da exploração prévia:
- Função: `readArchitectureProfile(manifestPath?: string): ArchitectureProfile | null`
- Parâmetro: caminho absoluto para o manifest (default: `.anti-vibe-manifest.json` em `process.cwd()`)
- Retorno: objeto `{ profile: ArchitectureProfileName, confidence: number, detectedAt: string, signals: string[], schemaVersion: number }` ou `null`
- Fonte real: `.anti-vibe-manifest.json` (campo `architectureProfile`), **não** um arquivo `architecture-profile.md`

O `readPrefaceContext` receberá `projectRoot: string` e construirá o manifestPath internamente como `path.join(projectRoot, '.anti-vibe-manifest.json')`.

### Passo 2: Escrever os testes RED (CA-01 e CA-02)

Criar `skills/lib/preface-context.test.ts`:

```typescript
// 2026-05-14 (Luiz/dev): testes de regressão para CA-01 e CA-02 do PRD v6.3.0
import { describe, test, expect, mock, beforeEach } from "bun:test";
import * as path from "path";
import * as readArchProfileMod from "./read-architecture-profile";
import { readPrefaceContext } from "./preface-context";

describe("readPrefaceContext", () => {
  test("retorna shape correto quando architecture profile existe (CA-01)", () => {
    // Arrange: mock readArchitectureProfile retornando profile nextjs-app-router com confidence 92
    const mockProfile = {
      profile: "nextjs-app-router" as const,
      confidence: 92,
      detectedAt: "2026-05-14T10:00:00.000Z",
      signals: ["folder:app/"],
      schemaVersion: 1,
    };
    mock.module("./read-architecture-profile", () => ({
      readArchitectureProfile: () => mockProfile,
    }));

    // Act
    const result = readPrefaceContext("/fake/project/root");

    // Assert
    expect(result.profile).toBe("nextjs-app-router");
    expect(result.language).toBeNull();
    expect(result.framework).toBeNull();
    expect(result.confidence).toBe(92);
  });

  test("retorna profile null e confidence 0 quando architecture profile ausente (CA-02)", () => {
    // Arrange: mock readArchitectureProfile retornando null (manifest ausente ou flag off)
    mock.module("./read-architecture-profile", () => ({
      readArchitectureProfile: () => null,
    }));

    // Act
    const result = readPrefaceContext("/fake/project/root");

    // Assert
    expect(result.profile).toBeNull();
    expect(result.language).toBeNull();
    expect(result.framework).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
```

**Executar RED:** `bun test -- --grep "readPrefaceContext"` — esperado: falha por `Cannot find module './preface-context'`.

### Passo 3: Criar skills/lib/preface-context.ts (GREEN)

```typescript
/**
 * PrefaceContext helper — v6.3.0 (Adaptive Coaching, Eixo 2 Agent-Native).
 *
 * Encapsula a leitura do architecture profile em shape estável consumível por skills.
 * É wrapper deliberado de readArchitectureProfile — não duplica lógica de IO.
 *
 * Shape composto { profile, language, framework, confidence }:
 * - language e framework são null em v6.3.0 (slots reservados para v6.5/v6.6)
 * - confidence reflete diretamente o score do detector (0..100)
 *
 * @see docs/design-docs/adaptive-coaching-framework.md — migration guide para autores de skill
 * @see docs/design-docs/ADR-0020-adaptive-coaching.md — decisão D2 (shape composto)
 */

import * as path from "path";
import type { ArchitectureProfileName } from "./manifest-types";
import { readArchitectureProfile } from "./read-architecture-profile";

// 2026-05-14 (Luiz/dev): slots de linguagem e framework reservados para v6.5/v6.6
// (PRD §Decisão #2). Em v6.3.0 são sempre null — não hardcode lógica de preenchimento.
export type LanguageHint = "node-ts" | "rails" | (string & Record<never, never>);
export type FrameworkHint = "nextjs" | "rails" | (string & Record<never, never>);

/**
 * Shape de contexto adaptativo consumido pelas skills.
 * Estável: v6.5/v6.6 adicionarão language e framework sem quebrar chamadores atuais (CA-09).
 */
export type PrefaceContext = {
  /** Profile detectado pelo architecture detector, ou null se ausente/flag off. */
  profile: ArchitectureProfileName | null;
  /** Hint de linguagem — sempre null em v6.3.0; preenchido em v6.5/v6.6. */
  language: LanguageHint | null;
  /** Hint de framework — sempre null em v6.3.0; preenchido em v6.5/v6.6. */
  framework: FrameworkHint | null;
  /** Confiança do detector (0..100). Zero quando profile é null. */
  confidence: number;
};

const NULL_CONTEXT: PrefaceContext = {
  profile: null,
  language: null,
  framework: null,
  confidence: 0,
};

/**
 * Lê o PrefaceContext a partir do manifest do projeto.
 *
 * Wrapper de readArchitectureProfile — toda a lógica de guard (feature flag,
 * IO graceful, parse+validate) fica encapsulada lá. Esta função apenas adapta
 * o shape de ArchitectureProfile para PrefaceContext.
 *
 * Retorna NULL_CONTEXT quando readArchitectureProfile retorna null (qualquer motivo).
 * Nunca lança exceção.
 *
 * @param projectRoot - Diretório raiz do projeto (absoluto).
 *   O manifest é buscado em `{projectRoot}/.anti-vibe-manifest.json`.
 *
 * @example
 * // Em uma skill profile-aware
 * const ctx = readPrefaceContext(projectRoot)
 * const advice = getRecommendationForProfile(ctx.profile, ADVICE_TABLE, DEFAULT_ADVICE)
 */
export function readPrefaceContext(projectRoot: string): PrefaceContext {
  const manifestPath = path.join(projectRoot, ".anti-vibe-manifest.json");
  const archProfile = readArchitectureProfile(manifestPath);

  if (archProfile === null) {
    return NULL_CONTEXT;
  }

  return {
    profile: archProfile.profile,
    // 2026-05-14 (Luiz/dev): language null — aguarda v6.5 (PRD §Decisão #2)
    language: null,
    // 2026-05-14 (Luiz/dev): framework null — aguarda v6.6 (PRD §Decisão #2)
    framework: null,
    confidence: archProfile.confidence,
  };
}
```

**Executar GREEN:** `bun test -- --grep "readPrefaceContext"` — esperado: 2 testes passando.

### Passo 4: Refactor e verificação final

Checklist pós-green:
- Confirmar que não há lógica de leitura de arquivo em `preface-context.ts` (apenas delegation)
- Confirmar que `LanguageHint` e `FrameworkHint` usam o padrão `string & Record<never, never>` para manter autocomplete sem fechar o tipo (alternativa: manter como `string` simples se linter reclamar)
- Confirmar que `NULL_CONTEXT` é objeto freezado ou constante (não mutável externamente)

---

## Gotchas

- `readArchitectureProfile` usa `process.cwd()` como default — em testes, SEMPRE passar path explícito para evitar leitura do manifest real do projeto.
- A fonte de dados é `.anti-vibe-manifest.json` (campo `architectureProfile`), **não** um arquivo `architecture-profile.md`. O nome no PRD é shorthand — a implementação usa o manifest.
- `language` e `framework` são `null` em v6.3.0. Não adicionar condicionais para preenchê-los agora — isso seria debt técnico prematuro.
- Bun test mock com `mock.module` requer que o módulo seja importado depois do mock. Usar `import` estático no topo e deixar o mock substituir no runtime do Bun test runner.
- `ArchitectureProfileName` em `manifest-types.ts` é idêntico a `Profile` em `architecture-detector/types.ts`. Usar `ArchitectureProfileName` (de `manifest-types`) para manter consistência com `readArchitectureProfile`.

---

## Verificação

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion/module-not-found
  - Comando: `bun test skills/lib/preface-context.test.ts`
  - Resultado esperado: `Cannot find module './preface-context'`

- [ ] **GREEN:** Código mínimo implementado, testes PASSAM
  - Comando: `bun test skills/lib/preface-context.test.ts`
  - Resultado esperado: `2 pass, 0 fail`

### Checklist

- [ ] `readPrefaceContext` não contém lógica de leitura de arquivo (puro delegation)
- [ ] `language` e `framework` são `null` hardcoded para v6.3.0 (sem lógica de preenchimento)
- [ ] `profile: null` quando `readArchitectureProfile` retorna `null`
- [ ] `confidence: 0` quando profile é null
- [ ] Nenhum `any` ou `as` no código produzido
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Critério de Aceite

**Por máquina:**
- `bun test skills/lib/preface-context.test.ts` retorna `2 pass, 0 fail`
- `bun run lint` retorna sem erros em `skills/lib/preface-context.ts`

**CA-01 validado:** `readPrefaceContext` com mock retornando `{ profile: 'nextjs-app-router', confidence: 92 }` produz `{ profile: 'nextjs-app-router', language: null, framework: null, confidence: 92 }`.

**CA-02 validado:** `readPrefaceContext` com mock retornando `null` produz `{ profile: null, language: null, framework: null, confidence: 0 }`.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->

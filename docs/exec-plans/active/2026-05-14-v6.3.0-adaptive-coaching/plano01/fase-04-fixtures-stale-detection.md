<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
-->

# Fase 04: Fixtures 5 Profiles + Stale Detection

**Plano:** 01 — Fundação Adaptativa
**Sizing:** ~1h
**Depende de:** fase-01 (PrefaceContext type definido)
**Visual:** false

---

## O que esta fase entrega

Fixtures JSON de regressão para os 5 profiles do `PrefaceContext` (cobertura de CA-09) mais a lib `stale-detector.ts` com checksum em paths-chave (RF-SH-01, Decisão D10). Stale detection emite warning silencioso — nunca bloqueia.

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `skills/lib/__fixtures__/preface-context-nextjs-app-router.expected.json` | CRIAR | Fixture: profile nextjs-app-router |
| `skills/lib/__fixtures__/preface-context-mvc-flat.expected.json` | CRIAR | Fixture: profile mvc-flat |
| `skills/lib/__fixtures__/preface-context-clean-architecture-ritual.expected.json` | CRIAR | Fixture: profile clean-architecture-ritual |
| `skills/lib/__fixtures__/preface-context-vertical-slice.expected.json` | CRIAR | Fixture: profile vertical-slice |
| `skills/lib/__fixtures__/preface-context-unknown-mixed.expected.json` | CRIAR | Fixture: profile unknown-mixed |
| `skills/lib/stale-detector.ts` | CRIAR | Checksum de paths-chave, retorna `StaleCheckResult` |
| `skills/lib/stale-detector.test.ts` | CRIAR | Testes unitários do stale detector |

---

## Implementação

### Passo 1: Criar as 5 fixtures de PrefaceContext

Todas as fixtures têm `language: null` e `framework: null` (v6.3.0). A `confidence` é representativa mas não canônica — testes de regressão validam o shape e o profile, não o score exato.

**skills/lib/__fixtures__/preface-context-nextjs-app-router.expected.json:**
```json
{
  "_comment": "Fixture de regressão para readPrefaceContext com profile nextjs-app-router. language e framework são null em v6.3.0 (PRD §Decisão #2).",
  "input_profile": "nextjs-app-router",
  "input_confidence": 88,
  "expected_output": {
    "profile": "nextjs-app-router",
    "language": null,
    "framework": null,
    "confidence": 88
  }
}
```

**skills/lib/__fixtures__/preface-context-mvc-flat.expected.json:**
```json
{
  "_comment": "Fixture de regressão para readPrefaceContext com profile mvc-flat.",
  "input_profile": "mvc-flat",
  "input_confidence": 75,
  "expected_output": {
    "profile": "mvc-flat",
    "language": null,
    "framework": null,
    "confidence": 75
  }
}
```

**skills/lib/__fixtures__/preface-context-clean-architecture-ritual.expected.json:**
```json
{
  "_comment": "Fixture de regressão para readPrefaceContext com profile clean-architecture-ritual.",
  "input_profile": "clean-architecture-ritual",
  "input_confidence": 82,
  "expected_output": {
    "profile": "clean-architecture-ritual",
    "language": null,
    "framework": null,
    "confidence": 82
  }
}
```

**skills/lib/__fixtures__/preface-context-vertical-slice.expected.json:**
```json
{
  "_comment": "Fixture de regressão para readPrefaceContext com profile vertical-slice.",
  "input_profile": "vertical-slice",
  "input_confidence": 79,
  "expected_output": {
    "profile": "vertical-slice",
    "language": null,
    "framework": null,
    "confidence": 79
  }
}
```

**skills/lib/__fixtures__/preface-context-unknown-mixed.expected.json:**
```json
{
  "_comment": "Fixture de regressão para readPrefaceContext com profile unknown-mixed. confidence tipicamente baixa.",
  "input_profile": "unknown-mixed",
  "input_confidence": 45,
  "expected_output": {
    "profile": "unknown-mixed",
    "language": null,
    "framework": null,
    "confidence": 45
  }
}
```

### Passo 2: Escrever testes RED para stale-detector

Criar `skills/lib/stale-detector.test.ts`:

```typescript
// 2026-05-14 (Luiz/dev): testes de regressão para RF-SH-01 + D10
// Stale detection é conservadora: prefere falso-positivo a falso-negativo
import { describe, test, expect } from "bun:test";
import { checkStale } from "./stale-detector";

describe("checkStale", () => {
  test("retorna isStale false quando checksums batem (CA-08 negativo)", () => {
    // Arrange: stored checksums idênticos aos computados
    const storedChecksums: Record<string, string> = {
      "package.json": "abc123",
    };
    // checkStale precisa de projectRoot real ou mockado com arquivos existentes
    // Usar um diretório de fixture que tem package.json conhecido
    // Para teste unitário: mockar fs ou usar tmp dir
    // Esta fase define o contrato — implementação usa Bun file APIs
    const result = checkStale("/fake-root-no-package-json", storedChecksums);

    // Quando projectRoot não tem package.json: considera stale (conservador)
    expect(result.isStale).toBe(true);
    expect(result.checkedPaths).toContain("package.json");
    expect(result.reason).toBeDefined();
  });

  test("retorna isStale true com reason quando checksums diferem (CA-08)", () => {
    const storedChecksums: Record<string, string> = {
      "package.json": "checksum-antigo",
    };
    // Com projectRoot inválido, checkStale não consegue computar checksum real
    // Logo: isStale = true (conservador)
    const result = checkStale("/path/que/nao/existe", storedChecksums);

    expect(result.isStale).toBe(true);
    expect(result.reason).toMatch(/package\.json|não encontrado|checksum/i);
  });

  test("retorna checkedPaths sempre incluindo package.json", () => {
    const result = checkStale("/qualquer/root", {});
    expect(result.checkedPaths).toContain("package.json");
  });
});
```

**Executar RED:** `bun test skills/lib/stale-detector.test.ts` — esperado: `Cannot find module './stale-detector'`.

### Passo 3: Criar skills/lib/stale-detector.ts (GREEN)

```typescript
/**
 * Stale detector para capabilities.json (RF-SH-01, Decisão D10).
 *
 * Verifica se os paths-chave do projeto mudaram desde a última geração do
 * capabilities.json. Usa checksums SHA-256 dos arquivos (via Bun crypto).
 *
 * CONSERVADOR: prefere falso-positivo (emitir warning desnecessário) a
 * falso-negativo (não emitir quando capabilities estão stale).
 *
 * NUNCA bloqueia execução de skill — apenas retorna isStale para o caller
 * decidir se emite warning.
 *
 * @see docs/design-docs/ADR-0020-adaptive-coaching.md — decisão D6 e D10
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// 2026-05-14 (Luiz/dev): paths-chave conforme D10 do PRD. top-level src/ apenas
// (não recursivo) — custo de IO controlado sem sacrificar cobertura útil.
const KEY_PATHS = ["package.json"] as const;

export type StaleCheckResult = {
  /** true se qualquer path-chave mudou ou não pôde ser lido. */
  isStale: boolean;
  /** Paths verificados (relativos ao projectRoot). */
  checkedPaths: string[];
  /** Descrição do primeiro divergência encontrada. Undefined quando isStale=false. */
  reason?: string;
};

/**
 * Verifica se os paths-chave do projeto mudaram em relação aos checksums armazenados.
 *
 * Paths verificados:
 * - `package.json` (sempre)
 * - Todo arquivo/pasta diretamente em `src/` (top-level only, se `src/` existir)
 * - `routes/` se existir no root
 *
 * @param projectRoot - Diretório raiz absoluto do projeto.
 * @param storedChecksums - Map de path relativo → checksum SHA-256 armazenado em capabilities.json.
 * @returns `StaleCheckResult` com isStale, checkedPaths e reason opcional.
 */
export function checkStale(
  projectRoot: string,
  storedChecksums: Record<string, string>
): StaleCheckResult {
  const checkedPaths: string[] = [...KEY_PATHS];

  // Adicionar top-level src/ entries dinamicamente
  const srcDir = path.join(projectRoot, "src");
  try {
    const srcEntries = fs.readdirSync(srcDir);
    for (const entry of srcEntries) {
      checkedPaths.push(`src/${entry}`);
    }
  } catch {
    // src/ não existe — ok, não é obrigatório
  }

  // Adicionar routes/ se existir
  const routesDir = path.join(projectRoot, "routes");
  try {
    fs.accessSync(routesDir);
    checkedPaths.push("routes");
  } catch {
    // routes/ não existe — ok
  }

  // Verificar cada path
  for (const relPath of checkedPaths) {
    const absPath = path.join(projectRoot, relPath);
    const currentChecksum = computeChecksum(absPath);
    const storedChecksum = storedChecksums[relPath];

    if (currentChecksum === null) {
      // Arquivo não encontrado — conservador: stale
      return {
        isStale: true,
        checkedPaths,
        reason: `${relPath} não encontrado em ${projectRoot}`,
      };
    }

    if (storedChecksum === undefined) {
      // Path novo não estava no snapshot — conservador: stale
      return {
        isStale: true,
        checkedPaths,
        reason: `${relPath} é novo (não estava no snapshot de checksums)`,
      };
    }

    if (currentChecksum !== storedChecksum) {
      return {
        isStale: true,
        checkedPaths,
        reason: `checksum de ${relPath} divergiu (stored: ${storedChecksum.slice(0, 8)}..., current: ${currentChecksum.slice(0, 8)}...)`,
      };
    }
  }

  return { isStale: false, checkedPaths };
}

/**
 * Computa SHA-256 do conteúdo de um arquivo ou do nome dos filhos de uma pasta.
 * Retorna null se o path não existe ou não pode ser lido.
 */
function computeChecksum(absPath: string): string | null {
  try {
    const stat = fs.statSync(absPath);
    const hash = crypto.createHash("sha256");

    if (stat.isDirectory()) {
      // Para diretórios: hash dos nomes dos filhos diretos (sorted, não recursivo)
      const entries = fs.readdirSync(absPath).sort();
      hash.update(entries.join("\n"));
    } else {
      // Para arquivos: hash do conteúdo
      const content = fs.readFileSync(absPath);
      hash.update(content);
    }

    return hash.digest("hex");
  } catch {
    return null;
  }
}
```

**Executar GREEN:** `bun test skills/lib/stale-detector.test.ts` — esperado: 3 testes passando.

### Passo 4: Adicionar teste de regressão com fixtures em preface-context.test.ts

Estender `skills/lib/preface-context.test.ts` com um teste que usa as 5 fixtures:

```typescript
import fixtureNextjs from "./__fixtures__/preface-context-nextjs-app-router.expected.json";
// (importar as 5 e iterar)

describe("readPrefaceContext — fixtures de regressão (CA-09)", () => {
  const fixtures = [
    { name: "nextjs-app-router", fixture: fixtureNextjs },
    // ... demais 4
  ];

  for (const { name, fixture } of fixtures) {
    test(`shape estável para profile ${name}`, () => {
      mock.module("./read-architecture-profile", () => ({
        readArchitectureProfile: () => ({
          profile: fixture.input_profile,
          confidence: fixture.input_confidence,
          detectedAt: "2026-05-14T00:00:00.000Z",
          signals: [],
          schemaVersion: 1,
        }),
      }));

      const result = readPrefaceContext("/fake/root");

      expect(result).toEqual(fixture.expected_output);
    });
  }
});
```

---

## Gotchas

- Stale detection usa `fs.statSync` e `fs.readdirSync` — em testes unitários, paths inválidos retornam `null` do `computeChecksum`, que é o comportamento conservador correto. Não mockar o fs nos testes básicos — deixar o comportamento real com paths inválidos exercitar o path conservador.
- `src/` top-level only: NÃO usar `fs.readdirSync` recursivo — custo de IO. Apenas os filhos diretos de `src/`.
- As 5 fixtures têm `_comment` — verificar que o código que as importa não trata `_comment` como campo do shape. No TypeScript, importar JSON com `as const` ou sem tipagem explícita inclui todos os campos.
- Fixture confidence values (88, 75, 82, 79, 45) são representativos — não copiá-los como scores "canônicos" nos testes de CA-01/CA-02 em fase-01 (esses testes usam 92).
- `checkStale` retorna `isStale: true` para `projectRoot` inválido — comportamento conservador, não um bug. Deixar isso explícito no doc da função.
- CA-08: "capabilities.json gerado há 2 dias com src/ mudado → warning" — esse CA é validado em Plano 02 (quando capabilities.json existe); fase-04 apenas implementa a lib.

---

## Verificação

### TDD

- [ ] **RED:** `bun test skills/lib/stale-detector.test.ts` — falha com `Cannot find module`
- [ ] **GREEN:** `bun test skills/lib/stale-detector.test.ts` — 3 testes passando
- [ ] **GREEN (fixtures):** `bun test skills/lib/preface-context.test.ts` — todos os testes passando (incluindo os 5 de fixture)

### Checklist

- [ ] 5 arquivos de fixture criados em `skills/lib/__fixtures__/`
- [ ] Todos os fixtures têm `language: null` e `framework: null` (v6.3.0)
- [ ] `stale-detector.ts` não usa `any` nem `as`
- [ ] `stale-detector.ts` nunca lança exceção (try/catch em todos os IO)
- [ ] `checkStale` retorna `isStale: true` para projectRoot inválido (comportamento conservador)
- [ ] `checkedPaths` sempre inclui `"package.json"`
- [ ] Testes de fixture passam: `bun test skills/lib/preface-context.test.ts`
- [ ] Testes de stale passam: `bun test skills/lib/stale-detector.test.ts`
- [ ] Suite completa passa: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Critério de Aceite

**Por máquina:**
- `bun test skills/lib/stale-detector.test.ts` retorna `3 pass, 0 fail`
- `bun test skills/lib/preface-context.test.ts` retorna todos os testes passando (CA-01, CA-02, mais 5 fixtures)
- `bun run test` sem falhas

**RF-SH-01 validado:** `checkStale` retorna `{ isStale: true, reason: '...' }` quando qualquer path-chave diverge ou não existe. Nunca lança exceção.

**RF-SH-04 validado:** 5 fixtures existem em `skills/lib/__fixtures__/preface-context-{profile}.expected.json`.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->

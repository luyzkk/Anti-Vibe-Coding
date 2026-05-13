# Fase 01 — Schema do `architectureProfile` no Manifest

**Plano:** 01 — Foundation
**Sizing:** ~1h
**Dependências:** Independente
**Visual:** false

## Objetivo

Adicionar o campo opcional `architectureProfile` em `.anti-vibe-manifest.json` com schemaVersion próprio, garantindo que manifests pré-v5.3 (sem o campo) continuem parseáveis sem erro. Esta fase fecha contrato de tipos para todos os planos seguintes que leem ou escrevem profile.

## Arquivos Afetados

- `anti-vibe-coding/skills/lib/manifest-types.ts` (criar) — tipos TypeScript do manifest com `architectureProfile` opcional
- `anti-vibe-coding/skills/lib/manifest-schema.ts` (criar) — validador runtime (sem deps externas; checagem manual de shape)
- `anti-vibe-coding/skills/lib/manifest-types.test.ts` (criar) — testes de parsing (pré-v5.3 e v5.3)
- `anti-vibe-coding/docs/manifest-schema.md` (criar) — documentação do schema versionado

## Contexto Técnico

D3 (storage híbrido JSON+MD) e RF2 (campo `architectureProfile` versionado) decidem o shape. Compatibilidade backward (CA-10) é o requisito mais sensível: um manifest pré-v5.3 carregado por código v5.3 NÃO pode lançar exceção. A solução é tornar `architectureProfile` opcional (`?`) e tratar ausência como "não detectado".

OQ5 (esquema JSON) é resolvida aqui. Decisão padrão proposta:
- `profile`: union literal dos 5 perfis (D4)
- `confidence`: number 0-100
- `detectedAt`: ISO 8601 string
- `signals`: array de strings curtos (ex: `["folder:src/features/", "import:cross-layer"]`)
- `schemaVersion`: number (começa em `1`)

Sem deps externas (zod, ajv) — validação manual em ~30 linhas. Princípio "sem dependências externas novas" do CLAUDE.md.

## Snippets de Referência

```typescript
// manifest-types.ts
export type ArchitectureProfileName =
  | "clean-architecture-ritual"
  | "mvc-flat"
  | "vertical-slice"
  | "nextjs-app-router"
  | "unknown-mixed";

export interface ArchitectureProfile {
  profile: ArchitectureProfileName;
  confidence: number; // 0-100
  detectedAt: string; // ISO 8601
  signals: string[];
  schemaVersion: number; // start at 1
}

export interface AntiVibeManifest {
  version: string;
  // ... campos pré-v5.3 existentes
  architectureProfile?: ArchitectureProfile; // opcional — CA-10
}
```

```typescript
// manifest-schema.ts (assinatura)
export function parseManifest(raw: unknown): AntiVibeManifest;
export function isValidArchitectureProfile(value: unknown): value is ArchitectureProfile;
```

## Plano TDD (RED → GREEN → REFACTOR)

### RED — Escrever testes primeiro
- [ ] `parses manifest pre-v53 without architectureProfile field`
- [ ] `parses manifest v53 with full architectureProfile`
- [ ] `rejects manifest with architectureProfile missing required fields`
- [ ] `rejects architectureProfile with confidence outside 0-100 range`
- [ ] `rejects architectureProfile with unknown profile name`
- [ ] `accepts architectureProfile with empty signals array`
- [ ] Rodar `bun test anti-vibe-coding/skills/lib/manifest-types.test.ts` — confirmar falhas vermelhas

### GREEN — Implementação mínima
- [ ] Criar `manifest-types.ts` com interfaces e union types
- [ ] Criar `manifest-schema.ts` com `parseManifest` e `isValidArchitectureProfile`
- [ ] Implementar validação manual sem deps externas
- [ ] Rodar `bun test` — todos verdes

### REFACTOR — Limpeza
- [ ] Sem `any`; verificar com `bun run typecheck` (ou `tsc --noEmit`)
- [ ] Mensagens de erro claras (incluem campo problemático)
- [ ] Docstring nos exports públicos com 1 exemplo de uso

## Checklist de Verificação

- [ ] Tipos compilam em strict mode sem warnings
- [ ] Manifest fixture pré-v5.3 (real, copiado de outro repo) parseia sem erro
- [ ] Manifest fixture v5.3 com profile completo parseia
- [ ] Documentação `manifest-schema.md` lista os 5 perfis e o significado do `schemaVersion`
- [ ] CA-10 coberto: teste explícito mostra manifest sem campo não quebra

## Critérios de Aceite do PRD Cobertos

- **CA-10 (edge case)** — Manifest pré-v5.3 não quebra. Teste de parsing explícito é a evidência mais forte; o campo opcional é o mecanismo.
- **RF2** — Schema do `architectureProfile` versionado com schemaVersion.

## Próxima Fase

`fase-02-schema-telemetry-jsonl` — schema independente de telemetria. Pode rodar em paralelo com esta fase, mas sequenciamos para preservar foco.

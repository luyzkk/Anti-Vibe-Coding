# Fase 03 — Feature Flag `architectureDetectorEnabled`

**Plano:** 01 — Foundation
**Sizing:** ~0.5h
**Dependências:** fase-01 (estende `AntiVibeManifest`)
**Visual:** false

## Objetivo

Adicionar a flag `architectureDetectorEnabled` (boolean, default `false`) ao schema do manifest e expor um helper genérico `isFeatureEnabled(flag: string): boolean`. Esta flag controla se as skills estruturantes leem o profile (Plano 04). Telemetria passiva (Plano 03) ignora a flag — sempre ativa.

## Arquivos Afetados

- `anti-vibe-coding/skills/lib/manifest-types.ts` (modificar) — adicionar campo `architectureDetectorEnabled?: boolean`
- `anti-vibe-coding/skills/lib/feature-flags.ts` (criar) — helper `isFeatureEnabled`
- `anti-vibe-coding/skills/lib/feature-flags.test.ts` (criar) — testes do helper
- `anti-vibe-coding/docs/manifest-schema.md` (modificar) — documentar a flag e default

## Contexto Técnico

D15 (rollout via feature flag) e RF6 (default `false`). CA-04 exige que flag desligada preserve v5.2 integralmente — esta fase entrega o **mecanismo**; o teste E2E de "v5.2 idêntica" só faz sentido depois do plano 04 ter implementado leitura.

Helper genérico (não específico de architecture) porque:
1. OQ11 pode adicionar `telemetryEnabled` futuramente
2. Reduz boilerplate quando outras flags surgirem
3. Centraliza lógica de "manifest ausente → tratar como flag false" (CA-10)

Comportamento esperado:
- Manifest sem o campo → `false` (default seguro)
- Manifest sem arquivo → `false` (CA-10)
- Manifest com flag explícita `true`/`false` → respeita

## Snippets de Referência

```typescript
// feature-flags.ts
export type FeatureFlag = "architectureDetectorEnabled";

/**
 * Reads a feature flag from the manifest. Returns false safely if manifest
 * is missing, malformed, or the flag is absent.
 *
 * @example
 *   if (isFeatureEnabled("architectureDetectorEnabled")) {
 *     // adapt skill output to detected profile
 *   }
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean;
```

## Plano TDD (RED → GREEN → REFACTOR)

### RED — Escrever testes primeiro
- [ ] `returns false when manifest file is missing`
- [ ] `returns false when manifest exists without flag field`
- [ ] `returns false when flag is explicitly false`
- [ ] `returns true when flag is explicitly true`
- [ ] `returns false when manifest is malformed JSON`
- [ ] Rodar `bun test anti-vibe-coding/skills/lib/feature-flags.test.ts` — vermelho

### GREEN — Implementação mínima
- [ ] Estender `AntiVibeManifest` com campo opcional
- [ ] Implementar `isFeatureEnabled` lendo manifest do disco com try/catch silencioso
- [ ] Rodar `bun test` — verde

### REFACTOR — Limpeza
- [ ] Helper privado `safeReadManifest()` reutilizável
- [ ] Sem logs em caso de erro de leitura (silencioso, igual telemetria)
- [ ] Type narrowing correto em `flag: FeatureFlag` (não `string`)

## Checklist de Verificação

- [ ] Default da flag é `false` (verificado em teste e doc)
- [ ] Manifest ausente não derruba helper
- [ ] `manifest-schema.md` documenta a flag, default e link para CA-04
- [ ] Helper aceita apenas flags conhecidas (union type), não strings arbitrárias

## Critérios de Aceite do PRD Cobertos

- **CA-04 (mecanismo)** — Flag default `false` está implementada. Verificação E2E "v5.2 idêntica" depende do plano 04.
- **RF6** — Campo `architectureDetectorEnabled` no manifest com default `false`.
- **D15** — Estratégia de rollout via flag opt-in.

## Próxima Fase

`fase-04-architecture-profile-md-generator` — gera markdown legível a partir do JSON da fase-01.

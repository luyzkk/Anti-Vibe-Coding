# Fase 04 — Gerador do `architecture-profile.md`

**Plano:** 01 — Foundation
**Sizing:** ~1h
**Dependências:** fase-01 (consome `ArchitectureProfile`)
**Visual:** false

## Objetivo

Implementar função pura que recebe um `ArchitectureProfile` (JSON do manifest) e retorna o conteúdo do markdown legível `.claude/architecture-profile.md`. Determinístico para input fixo (mesmo input → mesmo output, mesmas linhas) — viabiliza snapshot tests e edição manual sem ambiguidade. Esta fase fecha OQ4.

## Arquivos Afetados

- `anti-vibe-coding/skills/lib/profile-md-generator.ts` (criar) — função `renderArchitectureProfileMarkdown(profile)`
- `anti-vibe-coding/skills/lib/profile-md-generator.test.ts` (criar) — testes determinísticos
- `anti-vibe-coding/skills/lib/__fixtures__/profile-vertical-slice.expected.md` (criar) — snapshot esperado
- `anti-vibe-coding/skills/lib/__fixtures__/profile-clean-arch-ritual.expected.md` (criar) — snapshot esperado

## Contexto Técnico

D3 (markdown legível espelhando padrão de `decisions.md`) e RF9 (resumo legível com link para docs do perfil). OQ4 é resolvida aqui — definimos seções:

1. **Cabeçalho** — perfil detectado + confiança
2. **Sinais** — lista bullet dos `signals[]`
3. **Detectado em** — `detectedAt` formatado (ISO + humano)
4. **Revisão manual** — instrução curta de como sobrescrever caso o detector erre
5. **Documentação do perfil** — link relativo para `anti-vibe-coding/docs/architecture-profiles.md#<perfil>`

Função **pura** (sem I/O) — escrita do arquivo é responsabilidade de quem chama (Plano 02 fase-04). Isso permite testar 100% sem mock de filesystem.

Determinismo: ordenação dos signals deve preservar input (não sort alfabético — a ordem reflete a ordem de detecção, é informação semântica).

## Snippets de Referência

```typescript
// profile-md-generator.ts
import type { ArchitectureProfile } from "./manifest-types";

/**
 * Generates the human-readable markdown for `.claude/architecture-profile.md`
 * from a structured ArchitectureProfile. Pure function — no I/O.
 *
 * @example
 *   const md = renderArchitectureProfileMarkdown({
 *     profile: "vertical-slice",
 *     confidence: 87,
 *     detectedAt: "2026-05-04T12:00:00Z",
 *     signals: ["folder:src/features/", "import:cohesive-feature-module"],
 *     schemaVersion: 1,
 *   });
 *   // → "# Architecture Profile\n\n**Profile:** vertical-slice (87% confidence)\n..."
 */
export function renderArchitectureProfileMarkdown(
  profile: ArchitectureProfile
): string;
```

Estrutura aproximada do output:

```markdown
# Architecture Profile

**Profile:** vertical-slice (87% confidence)
**Detected at:** 2026-05-04 12:00 UTC

## Signals

- folder:src/features/
- import:cohesive-feature-module

## Manual review

If this classification looks wrong, edit this file or run
`/anti-vibe-coding:detect-architecture --set <profile>`.

## Profile documentation

See [vertical-slice profile](../anti-vibe-coding/docs/architecture-profiles.md#vertical-slice).
```

## Plano TDD (RED → GREEN → REFACTOR)

### RED — Escrever testes primeiro
- [ ] `renders header with profile name and confidence`
- [ ] `renders all signals in input order without re-sorting`
- [ ] `renders ISO timestamp plus human-readable form`
- [ ] `renders link to profile-specific docs section`
- [ ] `produces identical output for identical input across calls (deterministic)`
- [ ] `matches snapshot for vertical-slice fixture`
- [ ] `matches snapshot for clean-architecture-ritual fixture`
- [ ] `handles empty signals array with explicit no-signals note`
- [ ] Rodar `bun test anti-vibe-coding/skills/lib/profile-md-generator.test.ts` — vermelho

### GREEN — Implementação mínima
- [ ] Implementar concatenação de seções
- [ ] Função pura sem `Date.now()` (timestamp vem do input)
- [ ] Suporte aos 5 perfis (link correto por perfil)
- [ ] Rodar `bun test` — verde

### REFACTOR — Limpeza
- [ ] Sem template literals aninhados ilegíveis — quebrar em helpers `renderHeader`, `renderSignals`, etc.
- [ ] Cada helper < 15 linhas
- [ ] Documentar por que ordenação dos signals preserva input

## Checklist de Verificação

- [ ] Snapshot vertical-slice gerado e revisto
- [ ] Snapshot clean-arch gerado e revisto
- [ ] Função é pura (zero leitura/escrita de FS)
- [ ] OQ4 fechada — formato definido e documentado em comentário do header da função

## Critérios de Aceite do PRD Cobertos

- **RF9** — Markdown legível gerado com perfil, confiança, sinais e link para docs.
- **D3** — Pareamento JSON (manifest) + Markdown (legível) operacional.
- **OQ4** — Formato exato resolvido.

## Próxima Fase

`fase-05-docs-perfis-arquiteturais` — produz o destino dos links gerados aqui (`anti-vibe-coding/docs/architecture-profiles.md`).

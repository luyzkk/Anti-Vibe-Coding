# Fase 02 — Schema do JSONL de Telemetria

**Plano:** 01 — Foundation
**Sizing:** ~1h
**Dependências:** Independente (pode rodar em paralelo com fase-01)
**Visual:** false

## Objetivo

Definir e documentar o schema das linhas JSONL gravadas em `.claude/metrics/YYYY-MM.jsonl`. Esta fase NÃO escreve telemetria de verdade (isso é Plano 03) — apenas estabelece o contrato de tipos + validador que o Plano 03 vai consumir, garantindo que a instrumentação das 10 skills produza linhas consistentes.

## Arquivos Afetados

- `anti-vibe-coding/skills/lib/telemetry-types.ts` (criar) — tipos das entradas `start` e `end`
- `anti-vibe-coding/skills/lib/telemetry-schema.ts` (criar) — validador runtime
- `anti-vibe-coding/skills/lib/telemetry-types.test.ts` (criar) — testes de validação
- `anti-vibe-coding/docs/telemetry-schema.md` (criar) — documentação dos 10 campos

## Contexto Técnico

D6 (10 campos), D7 (local-only), D8 (start + end). O schema usa um campo discriminador `evento: "start" | "end"` para diferenciar as duas linhas por invocação. Campos exclusivos de `end` (`timestamp_fim`, `duracao_ms`, `arquivos_modificados`, `sucesso`) não aparecem em linhas `start`.

Decisão emergente potencial: incluir `error_message?: string` em linhas `end` quando `sucesso = false` (CA-09). Sugerido — confirmar na implementação.

Ordem dos campos não importa em JSONL, mas documentação fixa ordem canônica para facilitar leitura humana.

JSONL = uma linha por evento, terminada com `\n`. Não vale wrap em array. Append-only.

## Snippets de Referência

```typescript
// telemetry-types.ts
export type FasePipeline =
  | "grill-me" | "write-prd" | "plan-feature" | "execute-plan"
  | "verify-work" | "iterate" | "consultant" | "architecture"
  | "design-twice" | "quick-plan";

interface BaseTelemetryEntry {
  evento: "start" | "end";
  skill_invocada: string;
  timestamp_inicio: string; // ISO 8601
  profile_arquitetura: ArchitectureProfileName | "unknown" | "disabled";
  fase_pipeline: FasePipeline;
}

export interface TelemetryStart extends BaseTelemetryEntry {
  evento: "start";
}

export interface TelemetryEnd extends BaseTelemetryEntry {
  evento: "end";
  timestamp_fim: string;
  duracao_ms: number;
  tokens_aproximados_consumidos: number;
  arquivos_lidos: number;
  arquivos_modificados: number;
  sucesso: boolean;
  error_message?: string; // só quando sucesso = false
}

export type TelemetryEntry = TelemetryStart | TelemetryEnd;
```

```typescript
// telemetry-schema.ts (assinatura)
export function parseTelemetryEntry(raw: unknown): TelemetryEntry;
export function isTelemetryStart(e: TelemetryEntry): e is TelemetryStart;
export function isTelemetryEnd(e: TelemetryEntry): e is TelemetryEnd;
```

## Plano TDD (RED → GREEN → REFACTOR)

### RED — Escrever testes primeiro
- [ ] `parses valid start entry with all required fields`
- [ ] `parses valid end entry with sucesso true`
- [ ] `parses valid end entry with sucesso false and error_message`
- [ ] `rejects start entry with timestamp_fim present`
- [ ] `rejects end entry missing duracao_ms`
- [ ] `rejects entry with unknown evento value`
- [ ] `accepts profile_arquitetura disabled when feature flag off`
- [ ] Rodar `bun test anti-vibe-coding/skills/lib/telemetry-types.test.ts` — vermelho

### GREEN — Implementação mínima
- [ ] Criar `telemetry-types.ts`
- [ ] Criar `telemetry-schema.ts` com discriminação por `evento`
- [ ] Type guards `isTelemetryStart`/`isTelemetryEnd`
- [ ] Rodar `bun test` — verde

### REFACTOR — Limpeza
- [ ] Sem `any`
- [ ] Mensagens de erro do parser apontam o campo faltante
- [ ] Reusa `ArchitectureProfileName` da fase-01 sem duplicar union

## Checklist de Verificação

- [ ] `telemetry-schema.md` lista os 10 campos com tipo, exemplo e quando aparece (start/end/ambos)
- [ ] Documentação inclui exemplo completo de par `start` + `end` em JSONL
- [ ] Documentação alerta que `error_message` só aparece se `sucesso = false`
- [ ] Tipos importam união de `manifest-types.ts` (single source of truth da fase-01)

## Critérios de Aceite do PRD Cobertos

- **RF5** — Schema JSONL com 10 campos definidos e documentados.
- **D6** — Granularidade média (10 campos) registrada no schema.
- **D8** — Trigger início + fim refletido no discriminador `evento`.

## Próxima Fase

`fase-03-feature-flag` — adiciona `architectureDetectorEnabled` no mesmo manifest da fase-01.

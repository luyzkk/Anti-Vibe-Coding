# Telemetry Schema — `.claude/metrics/YYYY-MM.jsonl`

Each invocation of a skill produces **two lines** in the JSONL file: one `start` event and one `end` event. Lines are appended in order. The file is append-only; never wrap in an array.

Format: one JSON object per line, terminated with `\n`.

---

## Discriminator Field

| Field | Type | Values | Appears in |
|-------|------|--------|-----------|
| `evento` | string | `"start"` \| `"end"` | both |

Use `evento` to distinguish the two event types.

---

## Fields — All 10

| # | Field | Type | Appears in | Example |
|---|-------|------|-----------|---------|
| 1 | `evento` | `"start" \| "end"` | both | `"start"` |
| 2 | `skill_invocada` | string | both | `"architecture"` |
| 3 | `timestamp_inicio` | string (ISO 8601) | both | `"2026-05-04T10:00:00.000Z"` |
| 4 | `profile_arquitetura` | ArchitectureProfileName \| `"unknown"` \| `"disabled"` | both | `"vertical-slice"` |
| 5 | `fase_pipeline` | FasePipeline | both | `"execute-plan"` |
| 6 | `timestamp_fim` | string (ISO 8601) | **end only** | `"2026-05-04T10:01:30.000Z"` |
| 7 | `duracao_ms` | number | **end only** | `90000` |
| 8 | `tokens_aproximados_consumidos` | number | **end only** | `4200` |
| 9 | `arquivos_lidos` | number | **end only** | `3` |
| 10 | `arquivos_modificados` | number | **end only** | `1` |
| — | `sucesso` | boolean | **end only** | `true` |
| — | `error_message` | string (optional) | **end only, when sucesso=false** | `"timeout after 90s"` |

> Note: `sucesso` and `error_message` are end-event fields not counted in the 10-field schema because `error_message` is conditional. The 10 required fields are fields 1–10 above.

---

## Valid Values

### `profile_arquitetura`
- `"clean-architecture-ritual"` — projeto com camadas rígidas (domain/application/infrastructure)
- `"mvc-flat"` — MVC clássico sem subdivisões de features
- `"vertical-slice"` — features organizadas em fatias verticais
- `"nextjs-app-router"` — Next.js com App Router
- `"unknown-mixed"` — mistura de padrões ou não detectado
- `"unknown"` — detector não rodou ainda
- `"disabled"` — feature flag `architectureDetectorEnabled = false`

### `fase_pipeline`
`"grill-me"` | `"write-prd"` | `"plan-feature"` | `"execute-plan"` | `"verify-work"` | `"iterate"` | `"consultant"` | `"architecture"` | `"design-twice"` | `"quick-plan"`

---

## `error_message`

**Só aparece quando `sucesso = false`.** Ausente em linhas com `sucesso = true`. Contém mensagem curta descrevendo o motivo da falha.

---

## Exemplo Completo — Par `start` + `end`

```jsonl
{"evento":"start","skill_invocada":"execute-plan","timestamp_inicio":"2026-05-04T10:00:00.000Z","profile_arquitetura":"vertical-slice","fase_pipeline":"execute-plan"}
{"evento":"end","skill_invocada":"execute-plan","timestamp_inicio":"2026-05-04T10:00:00.000Z","profile_arquitetura":"vertical-slice","fase_pipeline":"execute-plan","timestamp_fim":"2026-05-04T10:01:30.000Z","duracao_ms":90000,"tokens_aproximados_consumidos":4200,"arquivos_lidos":3,"arquivos_modificados":1,"sucesso":true}
```

Par com falha (`sucesso = false`):

```jsonl
{"evento":"start","skill_invocada":"architecture","timestamp_inicio":"2026-05-04T11:00:00.000Z","profile_arquitetura":"disabled","fase_pipeline":"architecture"}
{"evento":"end","skill_invocada":"architecture","timestamp_inicio":"2026-05-04T11:00:00.000Z","profile_arquitetura":"disabled","fase_pipeline":"architecture","timestamp_fim":"2026-05-04T11:01:30.000Z","duracao_ms":90000,"tokens_aproximados_consumidos":800,"arquivos_lidos":1,"arquivos_modificados":0,"sucesso":false,"error_message":"timeout after 90s"}
```

---

## Localização do Arquivo

```
.claude/metrics/YYYY-MM.jsonl
```

- Um arquivo por mês (ex: `2026-05.jsonl`)
- Local-only: nunca enviado para servidores remotos (D7)
- Gerado pelo Plano 03; esta fase apenas define o contrato de tipos

---

## Tipos TypeScript

Ver `anti-vibe-coding/skills/lib/telemetry-types.ts` para os tipos `TelemetryStart`, `TelemetryEnd` e `TelemetryEntry`.
Ver `anti-vibe-coding/skills/lib/telemetry-schema.ts` para `parseTelemetryEntry`, `isTelemetryStart` e `isTelemetryEnd`.

---

## Rotação Mensal

Os arquivos JSONL rotacionam automaticamente por mês. O path é computado **na escrita** (Plano 03 G3) com `new Date().toISOString().slice(0, 7)`, ou seja, `YYYY-MM`.

- Janeiro 2026 → `.claude/metrics/2026-01.jsonl`
- Maio 2026 → `.claude/metrics/2026-05.jsonl`
- Dezembro 2026 → `.claude/metrics/2026-12.jsonl`
- Janeiro 2027 → `.claude/metrics/2027-01.jsonl`

**Limitação aceita:** uma skill que rodou 30 segundos antes da virada do mês pode escrever a linha `start` em `2026-05.jsonl` e a linha `end` em `2026-06.jsonl`. Comportamento é raro, intencional e tratado pelo script de análise (Plano 05).

---

## Comportamento em Falha (CA-09)

Telemetria nunca derruba a skill que a chama. Em caso de erro de I/O (path inválido, permissão negada, disco cheio):

1. O erro é capturado pelo `try/catch` interno de `appendJsonlLine`.
2. Uma mensagem é escrita em `stderr` com prefixo `[telemetry-warn]`.
3. A skill caller continua execução normal.

Para o consumidor (script de análise — Plano 05): a ausência de uma linha esperada não é considerada erro do schema, é gracefully ignorado.

---

## Linha `start` Órfã

Se uma skill crashar entre o `writeTelemetryStart` e o `writeTelemetryEnd` (sem try/catch ao redor da lógica), a linha `end` correspondente NÃO será escrita. O script de análise (Plano 05) trata starts órfãos como "skill abandonada" — categoria útil para detectar instabilidade.

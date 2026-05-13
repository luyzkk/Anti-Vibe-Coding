# Fase 01: Script CLI `analyze-metrics.ts` (núcleo)

**Plano:** 05 — Análise & Dogfooding
**Sizing:** 2.5h
**Depende de:** Plano 03 fase-01 (lib telemetry-utils produz JSONL), Plano 01 fase-02 (schema + tipos `TelemetryEntry`)
**Visual:** false

---

## O que esta fase entrega

Script CLI executável `bun run anti-vibe-coding/scripts/analyze-metrics.ts` que lê `.claude/metrics/*.jsonl` (atual ou múltiplos projetos via `--projects`), pareia eventos `start`/`end`, agrega por skill / perfil / fase do pipeline, e imprime relatório em texto formatado em stdout. Cobre o núcleo de RF8 e CA-08 (sem ASCII chart — esse fica em fase-02).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/scripts/analyze-metrics.ts` | Create | Entry point CLI (parsing argv + orquestração) |
| `anti-vibe-coding/scripts/lib/parse-jsonl.ts` | Create | Função pura `parseJsonlContent(raw): TelemetryEntry[]` (skipa linhas inválidas) |
| `anti-vibe-coding/scripts/lib/pair-events.ts` | Create | Função pura `pairStartEnd(entries): { paired, orphaned }` |
| `anti-vibe-coding/scripts/lib/aggregate.ts` | Create | Funções puras de agregação por dimensão (skill, perfil, fase) |
| `anti-vibe-coding/scripts/lib/format-report.ts` | Create | `formatReport(agg): string` — texto formatado para stdout |
| `anti-vibe-coding/scripts/__tests__/analyze-metrics.test.ts` | Create | Testes unitários + integração com fixtures JSONL em tmp dir |
| `anti-vibe-coding/scripts/__tests__/__fixtures__/sample-metrics.jsonl` | Create | Fixture com ~20 entradas (15 pares válidos + 2 órfãos + 3 malformados) |

---

## Implementacao

### Passo 1: Importar tipos do Plano 01

Reutiliza `TelemetryEntry`, `parseTelemetryEntry` definidos em Plano 01 fase-02. NÃO redefinir aqui.

```typescript
// anti-vibe-coding/scripts/lib/parse-jsonl.ts
import type { TelemetryEntry } from "../../skills/lib/telemetry-types"
import { parseTelemetryEntry } from "../../skills/lib/telemetry-schema"

export type ParseResult = {
  entries: TelemetryEntry[]
  malformedCount: number
  malformedLines: number[] // line numbers (1-indexed) for stderr warnings
}

export function parseJsonlContent(raw: string): ParseResult {
  const lines = raw.split("\n")
  const entries: TelemetryEntry[] = []
  const malformedLines: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === "") continue
    try {
      const obj = JSON.parse(line)
      const entry = parseTelemetryEntry(obj)
      if (entry === null) {
        malformedLines.push(i + 1)
        continue
      }
      entries.push(entry)
    } catch {
      malformedLines.push(i + 1)
    }
  }

  return { entries, malformedCount: malformedLines.length, malformedLines }
}
```

### Passo 2: Pareamento start/end (G4)

Define o conceito de "entrada válida" (CA-11): ambos eventos presentes para mesma `skill_invocada` em janela temporal próxima (mesmo dia natural).

```typescript
// anti-vibe-coding/scripts/lib/pair-events.ts
import type { TelemetryEntry } from "../../skills/lib/telemetry-types"

export type PairedEntry = {
  skill: string
  start: TelemetryEntry
  end: TelemetryEntry
  durationMs: number
  profileArquitetura: string | null
  fasePipeline: string | null
  sucesso: boolean
  tokensEstimados: number
  arquivosLidos: number
  arquivosModificados: number
}

export type PairResult = {
  paired: PairedEntry[]
  orphanedStarts: TelemetryEntry[]
  orphanedEnds: TelemetryEntry[]
}

const SAME_DAY_WINDOW_MS = 24 * 60 * 60 * 1000

export function pairStartEnd(entries: TelemetryEntry[]): PairResult {
  const startsBySkill = new Map<string, TelemetryEntry[]>()
  const paired: PairedEntry[] = []
  const orphanedEnds: TelemetryEntry[] = []

  // primeira passada: indexa starts em ordem cronológica
  const sorted = [...entries].sort(
    (a, b) => Date.parse(a.timestamp_inicio) - Date.parse(b.timestamp_inicio),
  )

  for (const e of sorted) {
    if (e.evento === "start") {
      const list = startsBySkill.get(e.skill_invocada) ?? []
      list.push(e)
      startsBySkill.set(e.skill_invocada, list)
      continue
    }
    // evento === "end" — procura start mais antigo da mesma skill na window
    const list = startsBySkill.get(e.skill_invocada) ?? []
    const matchIdx = list.findIndex(
      (s) => Date.parse(e.timestamp_inicio) - Date.parse(s.timestamp_inicio) <= SAME_DAY_WINDOW_MS,
    )
    if (matchIdx === -1) {
      orphanedEnds.push(e)
      continue
    }
    const start = list.splice(matchIdx, 1)[0]
    paired.push({
      skill: e.skill_invocada,
      start,
      end: e,
      durationMs: e.duracao_ms,
      profileArquitetura: e.profile_arquitetura,
      fasePipeline: e.fase_pipeline,
      sucesso: e.sucesso,
      tokensEstimados: e.tokens_aproximados_consumidos,
      arquivosLidos: e.arquivos_lidos,
      arquivosModificados: e.arquivos_modificados,
    })
  }

  const orphanedStarts: TelemetryEntry[] = []
  for (const list of startsBySkill.values()) orphanedStarts.push(...list)

  return { paired, orphanedStarts, orphanedEnds }
}
```

### Passo 3: Agregações por dimensão

```typescript
// anti-vibe-coding/scripts/lib/aggregate.ts
import type { PairedEntry } from "./pair-events"

export type AggregateBySkill = Map<string, {
  count: number
  avgDurationMs: number
  avgTokensEstimados: number
  successRate: number
}>

export type AggregateByProfile = Map<string, { count: number }>
export type AggregateByPhase = Map<string, { count: number; avgDurationMs: number }>

export function aggregateBySkill(paired: PairedEntry[]): AggregateBySkill {
  const acc = new Map<string, { totalDur: number; totalTok: number; ok: number; n: number }>()
  for (const p of paired) {
    const cur = acc.get(p.skill) ?? { totalDur: 0, totalTok: 0, ok: 0, n: 0 }
    cur.totalDur += p.durationMs
    cur.totalTok += p.tokensEstimados
    if (p.sucesso) cur.ok += 1
    cur.n += 1
    acc.set(p.skill, cur)
  }
  const out: AggregateBySkill = new Map()
  for (const [skill, v] of acc) {
    out.set(skill, {
      count: v.n,
      avgDurationMs: Math.round(v.totalDur / v.n),
      avgTokensEstimados: Math.round(v.totalTok / v.n),
      successRate: v.ok / v.n,
    })
  }
  return out
}

export function aggregateByProfile(paired: PairedEntry[]): AggregateByProfile {
  const acc = new Map<string, number>()
  for (const p of paired) {
    const key = p.profileArquitetura ?? "null"
    acc.set(key, (acc.get(key) ?? 0) + 1)
  }
  const out: AggregateByProfile = new Map()
  for (const [k, v] of acc) out.set(k, { count: v })
  return out
}

export function aggregateByPhase(paired: PairedEntry[]): AggregateByPhase {
  const acc = new Map<string, { totalDur: number; n: number }>()
  for (const p of paired) {
    const key = p.fasePipeline ?? "uncategorized"
    const cur = acc.get(key) ?? { totalDur: 0, n: 0 }
    cur.totalDur += p.durationMs
    cur.n += 1
    acc.set(key, cur)
  }
  const out: AggregateByPhase = new Map()
  for (const [k, v] of acc) {
    out.set(k, { count: v.n, avgDurationMs: Math.round(v.totalDur / v.n) })
  }
  return out
}

export function abandonRate(paired: PairedEntry[], orphanedStarts: number): number {
  const total = paired.length + orphanedStarts
  if (total === 0) return 0
  return orphanedStarts / total
}
```

### Passo 4: Format report (G3 — usar palavra "estimado")

```typescript
// anti-vibe-coding/scripts/lib/format-report.ts
import type {
  AggregateBySkill,
  AggregateByProfile,
  AggregateByPhase,
} from "./aggregate"

export type ReportInput = {
  projectPath: string
  totalRawLines: number
  malformedCount: number
  validPairs: number
  orphanedStarts: number
  orphanedEnds: number
  bySkill: AggregateBySkill
  byProfile: AggregateByProfile
  byPhase: AggregateByPhase
  abandonRate: number
}

export function formatReport(input: ReportInput): string {
  const lines: string[] = []
  lines.push(`=== analyze-metrics — ${input.projectPath} ===`)
  lines.push("")
  lines.push(`Totais:`)
  lines.push(`  Linhas brutas lidas:    ${input.totalRawLines}`)
  lines.push(`  Linhas malformadas:     ${input.malformedCount}`)
  lines.push(`  Pares validos:          ${input.validPairs}`)
  lines.push(`  Starts orfaos:          ${input.orphanedStarts} (skill iniciada sem end)`)
  lines.push(`  Ends orfaos:            ${input.orphanedEnds}`)
  lines.push(`  Taxa de abandono:       ${(input.abandonRate * 100).toFixed(1)}%`)
  lines.push("")

  lines.push("Por skill (so pares validos):")
  lines.push("  skill                          n   dur_avg(ms)   tokens_estimados_avg   success%")
  for (const [skill, v] of input.bySkill) {
    lines.push(
      `  ${skill.padEnd(28)} ${String(v.count).padStart(4)}   ${String(v.avgDurationMs).padStart(11)}   ${String(v.avgTokensEstimados).padStart(20)}   ${(v.successRate * 100).toFixed(0).padStart(7)}%`,
    )
  }
  lines.push("")

  lines.push("Por perfil arquitetural:")
  for (const [profile, v] of input.byProfile) {
    lines.push(`  ${profile.padEnd(28)} ${String(v.count).padStart(4)}`)
  }
  lines.push("")

  lines.push("Por fase do pipeline:")
  for (const [phase, v] of input.byPhase) {
    lines.push(
      `  ${phase.padEnd(28)} ${String(v.count).padStart(4)}   dur_avg=${v.avgDurationMs}ms`,
    )
  }
  lines.push("")
  lines.push("Notas:")
  lines.push("  - Tokens sao ESTIMADOS pelo agente, nao medidos em tempo real (G3).")
  lines.push("  - Pares validos = entries com 'start' E 'end' no mesmo dia natural (G4).")
  lines.push("  - Privacy-first: nenhum conteudo de codigo foi lido (D7).")
  return lines.join("\n")
}
```

### Passo 5: Entry point CLI

Parsing manual de flags (sem deps externas, conforme diretriz). Suporta `--projects p1,p2,p3`, `--month YYYY-MM`. As flags `--ascii` e `--set` ficam para fase-02 (entry point reserva os hooks mas delega para função stub).

```typescript
// anti-vibe-coding/scripts/analyze-metrics.ts
import * as fs from "node:fs"
import * as path from "node:path"
import { parseJsonlContent } from "./lib/parse-jsonl"
import { pairStartEnd } from "./lib/pair-events"
import {
  aggregateBySkill,
  aggregateByProfile,
  aggregateByPhase,
  abandonRate,
} from "./lib/aggregate"
import { formatReport, type ReportInput } from "./lib/format-report"

type CliArgs = {
  projects: string[]
  month: string | null
  ascii: boolean
  setProfile: string | null
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { projects: [], month: null, ascii: false, setProfile: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--projects") args.projects = (argv[++i] ?? "").split(",").filter(Boolean)
    else if (a === "--month") args.month = argv[++i] ?? null
    else if (a === "--ascii") args.ascii = true
    else if (a === "--set") args.setProfile = argv[++i] ?? null
  }
  return args
}

function findMetricsFiles(projectRoot: string, monthFilter: string | null): string[] {
  const dir = path.join(projectRoot, ".claude", "metrics")
  if (!fs.existsSync(dir)) return []
  const all = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
  if (monthFilter !== null) return all.filter((f) => f.startsWith(monthFilter)).map((f) => path.join(dir, f))
  return all.map((f) => path.join(dir, f))
}

function analyzeProject(projectPath: string, monthFilter: string | null): ReportInput {
  const files = findMetricsFiles(projectPath, monthFilter)
  const allEntries = []
  let totalRawLines = 0
  let malformedCount = 0

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8")
    totalRawLines += raw.split("\n").filter((l) => l.trim() !== "").length
    const result = parseJsonlContent(raw)
    if (result.malformedCount > 0) {
      console.error(`[analyze-warn] ${file}: ${result.malformedCount} linha(s) malformadas (linhas: ${result.malformedLines.join(", ")})`)
    }
    malformedCount += result.malformedCount
    allEntries.push(...result.entries)
  }

  const { paired, orphanedStarts, orphanedEnds } = pairStartEnd(allEntries)

  return {
    projectPath,
    totalRawLines,
    malformedCount,
    validPairs: paired.length,
    orphanedStarts: orphanedStarts.length,
    orphanedEnds: orphanedEnds.length,
    bySkill: aggregateBySkill(paired),
    byProfile: aggregateByProfile(paired),
    byPhase: aggregateByPhase(paired),
    abandonRate: abandonRate(paired, orphanedStarts.length),
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))

  // --set é tratado em fase-02 (override de profile). Stub aqui:
  if (args.setProfile !== null) {
    console.error("[analyze-info] --set sera implementado em fase-02 (Plano 05).")
    process.exit(0)
  }

  const projects = args.projects.length > 0 ? args.projects : [process.cwd()]
  const reports: ReportInput[] = []

  for (const p of projects) {
    const abs = path.resolve(p)
    if (!fs.existsSync(abs)) {
      console.error(`[analyze-error] projeto nao encontrado: ${abs}`)
      process.exit(1)
    }
    reports.push(analyzeProject(abs, args.month))
  }

  // G5: por-projeto antes de agregado
  for (const r of reports) {
    console.log(formatReport(r))
    console.log("")
  }

  if (reports.length > 1) {
    // agregado simples: soma de pares + média ponderada de abandono
    const totalPairs = reports.reduce((s, r) => s + r.validPairs, 0)
    const totalOrphans = reports.reduce((s, r) => s + r.orphanedStarts, 0)
    console.log(`=== AGREGADO (${reports.length} projetos) ===`)
    console.log(`  Total de pares validos:  ${totalPairs}`)
    console.log(`  Total de starts orfaos:  ${totalOrphans}`)
    console.log(`  Taxa de abandono global: ${((totalOrphans / (totalPairs + totalOrphans || 1)) * 100).toFixed(1)}%`)
  }
}

main()
```

### Passo 6: Testes (TDD)

```typescript
// anti-vibe-coding/scripts/__tests__/analyze-metrics.test.ts
import { describe, test, expect } from "bun:test"
import { parseJsonlContent } from "../lib/parse-jsonl"
import { pairStartEnd } from "../lib/pair-events"
import { aggregateBySkill, abandonRate } from "../lib/aggregate"
import { formatReport } from "../lib/format-report"

describe("parseJsonlContent", () => {
  test("skipa linhas malformadas e reporta linhas", () => {
    const raw = [
      '{"evento":"start","skill_invocada":"plan-feature","timestamp_inicio":"2026-05-05T10:00:00Z","timestamp_fim":"","duracao_ms":0,"profile_arquitetura":"vertical-slice","tokens_aproximados_consumidos":0,"arquivos_lidos":0,"arquivos_modificados":0,"fase_pipeline":"plan","sucesso":true}',
      "isso nao eh json",
      '{"evento":"end","skill_invocada":"plan-feature","timestamp_inicio":"2026-05-05T10:00:00Z","timestamp_fim":"2026-05-05T10:01:30Z","duracao_ms":90000,"profile_arquitetura":"vertical-slice","tokens_aproximados_consumidos":1200,"arquivos_lidos":3,"arquivos_modificados":0,"fase_pipeline":"plan","sucesso":true}',
    ].join("\n")
    const result = parseJsonlContent(raw)
    expect(result.entries.length).toBe(2)
    expect(result.malformedCount).toBe(1)
    expect(result.malformedLines).toEqual([2])
  })
})

describe("pairStartEnd", () => {
  test("pareia start+end da mesma skill no mesmo dia", () => {
    // ... usa fixture, valida paired.length, orphanedStarts, orphanedEnds
  })

  test("nao pareia start sem end correspondente (CA-11)", () => {
    // ...
  })
})

describe("aggregateBySkill", () => {
  test("calcula media de duracao e success rate", () => {
    // ...
  })
})

describe("formatReport (CA-08)", () => {
  test("inclui token medio, perfil mais usado, taxa de abandono, tempo por fase", () => {
    // assertion explicita: regex em "tokens_estimados_avg" + "Por perfil" + "Taxa de abandono" + "Por fase"
  })

  test("usa palavra ESTIMADOS para nao induzir falsa precisao (G3)", () => {
    // ...
  })
})
```

---

## Gotchas

- **G1 do plano:** Nunca abrir arquivos JSONL em modo `w`. `fs.readFileSync(..., "utf8")` é read-only por construção.
- **G2 do plano:** `parseJsonlContent` skipa linhas inválidas com warning em stderr (`[analyze-warn]`). Nunca lança.
- **G3 do plano:** Todos os labels do relatório usam "estimado" — `tokens_estimados_avg`, "Tokens sao ESTIMADOS pelo agente, nao medidos em tempo real" no rodapé.
- **G4 do plano:** Window de pareamento = 24h (mesmo dia natural). Documentado no rodapé do relatório.
- **G5 do plano:** Quando `--projects` recebe N paths, cada um gera um relatório separado ANTES do agregado. Nunca mistura paths em um único bloco.
- **G8 do plano:** Sem `fetch`, `http`, `axios`. Validar manualmente com grep no code review.
- **G9 do plano:** Output é texto, não JSON. Decisão registrada em MEMORY.md como DI-1 se questionado.
- **Local:** `Math.round` em médias evita decimais ruidosos no relatório. Aceitar perda de precisão por legibilidade.
- **Local:** Pareamento usa Map + splice — O(n²) no pior caso. Aceitável para < 10k entradas (bem acima do esperado em 2 semanas).

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test --grep 'parseJsonlContent skipa linhas malformadas'` falha (função não existe ainda)
  - Resultado esperado: `Expected 2, received undefined`

- [ ] **GREEN:** Implementação mínima de `parseJsonlContent`, teste passa
  - Resultado esperado: `1 passed, 0 failed`

- [ ] **RED:** Teste de `formatReport (CA-08) inclui token medio, perfil mais usado, taxa de abandono, tempo por fase` falha
- [ ] **GREEN:** `formatReport` implementada cobrindo todos 4 dados do CA-08

### Checklist

- [ ] Script roda sem deps externas: `bun run anti-vibe-coding/scripts/analyze-metrics.ts --help` (ou sem args, fica em cwd)
- [ ] Fixture com 15 pares válidos + 2 órfãos + 3 malformadas produz relatório consistente
- [ ] stderr recebe `[analyze-warn]` para linhas malformadas com número de linha
- [ ] `--projects p1,p2` produz 2 relatórios + 1 bloco agregado
- [ ] `--month 2026-05` filtra apenas `2026-05.jsonl`
- [ ] Sem chamadas a `fetch` / `http` / `axios` no código (G8): `grep -r 'fetch\|http\|axios' anti-vibe-coding/scripts/` retorna vazio
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test --grep 'analyze-metrics'` retorna `0 failed`
- Executar `bun run anti-vibe-coding/scripts/analyze-metrics.ts` em diretório com fixture pré-populada (>= 50 entradas válidas) imprime stdout contendo as 4 métricas do CA-08: "tokens_estimados_avg", "Por perfil", "Taxa de abandono", "Por fase do pipeline"
- Exit code 0 em sucesso; exit code 1 em projeto inexistente

**Por humano:**
- Relatório é legível em terminal sem rolagem horizontal (linhas ≤ 100 colunas)
- Palavra "estimado" aparece em todos os contextos onde tokens são mencionados
- Privacy notice ("nenhum conteudo de codigo foi lido") está presente no rodapé

---

<!-- Gerado por /plan-feature em 2026-05-04 -->

import { describe, test, expect } from "bun:test"
import * as path from "node:path"
import * as fs from "node:fs"
import { parseJsonlContent } from "../lib/parse-jsonl"
import { pairStartEnd } from "../lib/pair-events"
import { aggregateBySkill, aggregateByProfile, aggregateByPhase, abandonRate } from "../lib/aggregate"
import { formatReport } from "../lib/format-report"
import type { PairedEntry } from "../lib/pair-events"

const FIXTURE_PATH = path.join(import.meta.dir, "__fixtures__", "sample-metrics.jsonl")

describe("parseJsonlContent", () => {
  test("skipa linhas malformadas e reporta linhas", () => {
    const raw = [
      '{"evento":"start","skill_invocada":"plan-feature","timestamp_inicio":"2026-05-05T10:00:00Z","profile_arquitetura":"vertical-slice","fase_pipeline":"plan-feature"}',
      "isso nao eh json",
      '{"evento":"end","skill_invocada":"plan-feature","timestamp_inicio":"2026-05-05T10:00:00Z","timestamp_fim":"2026-05-05T10:01:30Z","duracao_ms":90000,"profile_arquitetura":"vertical-slice","fase_pipeline":"plan-feature","tokens_aproximados_consumidos":1200,"arquivos_lidos":3,"arquivos_modificados":0,"sucesso":true}',
    ].join("\n")
    const result = parseJsonlContent(raw)
    expect(result.entries.length).toBe(2)
    expect(result.malformedCount).toBe(1)
    expect(result.malformedLines).toEqual([2])
  })

  test("linhas vazias sao ignoradas sem contar como malformadas", () => {
    const raw = "\n\n"
    const result = parseJsonlContent(raw)
    expect(result.entries.length).toBe(0)
    expect(result.malformedCount).toBe(0)
  })

  test("retorna zero entries para string vazia", () => {
    const result = parseJsonlContent("")
    expect(result.entries.length).toBe(0)
    expect(result.malformedCount).toBe(0)
  })

  test("le fixture sample-metrics.jsonl e retorna entries validas", () => {
    const raw = fs.readFileSync(FIXTURE_PATH, "utf8")
    const result = parseJsonlContent(raw)
    // fixture tem 2 malformadas: linha 17 (nao-json), linha 20 (json sem campos obrigatorios)
    expect(result.malformedCount).toBe(2)
    // 21 linhas totais - 1 vazia no final - 2 malformadas = 19 entries validas (9 starts + 9 ends + 1 start orfao = 19)
    expect(result.entries.length).toBe(19)
  })
})

describe("pairStartEnd", () => {
  test("pareia start+end da mesma skill no mesmo dia", () => {
    const raw = [
      '{"evento":"start","skill_invocada":"plan-feature","timestamp_inicio":"2026-05-05T10:00:00Z","profile_arquitetura":"vertical-slice","fase_pipeline":"plan-feature"}',
      '{"evento":"end","skill_invocada":"plan-feature","timestamp_inicio":"2026-05-05T10:00:00Z","timestamp_fim":"2026-05-05T10:01:30Z","duracao_ms":90000,"profile_arquitetura":"vertical-slice","fase_pipeline":"plan-feature","tokens_aproximados_consumidos":1200,"arquivos_lidos":3,"arquivos_modificados":0,"sucesso":true}',
    ].join("\n")
    const { entries } = parseJsonlContent(raw)
    const result = pairStartEnd(entries)
    expect(result.paired.length).toBe(1)
    expect(result.orphanedStarts.length).toBe(0)
    expect(result.orphanedEnds.length).toBe(0)
  })

  test("start sem end correspondente fica como orfao (CA-11)", () => {
    const raw = '{"evento":"start","skill_invocada":"plan-feature","timestamp_inicio":"2026-05-05T10:00:00Z","profile_arquitetura":"vertical-slice","fase_pipeline":"plan-feature"}'
    const { entries } = parseJsonlContent(raw)
    const result = pairStartEnd(entries)
    expect(result.paired.length).toBe(0)
    expect(result.orphanedStarts.length).toBe(1)
    expect(result.orphanedEnds.length).toBe(0)
  })

  test("end sem start correspondente fica como orfao", () => {
    const raw = '{"evento":"end","skill_invocada":"plan-feature","timestamp_inicio":"2026-05-05T10:00:00Z","timestamp_fim":"2026-05-05T10:01:30Z","duracao_ms":90000,"profile_arquitetura":"vertical-slice","fase_pipeline":"plan-feature","tokens_aproximados_consumidos":1200,"arquivos_lidos":3,"arquivos_modificados":0,"sucesso":true}'
    const { entries } = parseJsonlContent(raw)
    const result = pairStartEnd(entries)
    expect(result.paired.length).toBe(0)
    expect(result.orphanedStarts.length).toBe(0)
    expect(result.orphanedEnds.length).toBe(1)
  })

  test("nao pareia starts de skills diferentes", () => {
    const raw = [
      '{"evento":"start","skill_invocada":"plan-feature","timestamp_inicio":"2026-05-05T10:00:00Z","profile_arquitetura":"vertical-slice","fase_pipeline":"plan-feature"}',
      '{"evento":"end","skill_invocada":"execute-plan","timestamp_inicio":"2026-05-05T10:00:00Z","timestamp_fim":"2026-05-05T10:01:30Z","duracao_ms":90000,"profile_arquitetura":"vertical-slice","fase_pipeline":"execute-plan","tokens_aproximados_consumidos":1200,"arquivos_lidos":3,"arquivos_modificados":0,"sucesso":true}',
    ].join("\n")
    const { entries } = parseJsonlContent(raw)
    const result = pairStartEnd(entries)
    expect(result.paired.length).toBe(0)
    expect(result.orphanedStarts.length).toBe(1)
    expect(result.orphanedEnds.length).toBe(1)
  })

  test("processa fixture completa: 9 pares, 1 orfao start", () => {
    const raw = fs.readFileSync(FIXTURE_PATH, "utf8")
    const { entries } = parseJsonlContent(raw)
    const result = pairStartEnd(entries)
    // 9 pares: (plan-feature x3, execute-plan x3, verify-work x2, grill-me x1) + 1 start orfao (execute-plan dia 07)
    expect(result.paired.length).toBe(9)
    expect(result.orphanedStarts.length).toBe(1)
    expect(result.orphanedEnds.length).toBe(0)
  })
})

describe("aggregateBySkill", () => {
  test("calcula contagem, media de duracao e success rate", () => {
    const paired: PairedEntry[] = [
      {
        skill: "plan-feature",
        start: { evento: "start", skill_invocada: "plan-feature", timestamp_inicio: "2026-05-05T10:00:00Z", profile_arquitetura: "vertical-slice", fase_pipeline: "plan-feature" },
        end: { evento: "end", skill_invocada: "plan-feature", timestamp_inicio: "2026-05-05T10:00:00Z", timestamp_fim: "2026-05-05T10:10:00Z", duracao_ms: 600000, profile_arquitetura: "vertical-slice", fase_pipeline: "plan-feature", tokens_aproximados_consumidos: 1000, arquivos_lidos: 5, arquivos_modificados: 2, sucesso: true },
        durationMs: 600000,
        profileArquitetura: "vertical-slice",
        fasePipeline: "plan-feature",
        sucesso: true,
        tokensEstimados: 1000,
        arquivosLidos: 5,
        arquivosModificados: 2,
      },
      {
        skill: "plan-feature",
        start: { evento: "start", skill_invocada: "plan-feature", timestamp_inicio: "2026-05-05T11:00:00Z", profile_arquitetura: "vertical-slice", fase_pipeline: "plan-feature" },
        end: { evento: "end", skill_invocada: "plan-feature", timestamp_inicio: "2026-05-05T11:00:00Z", timestamp_fim: "2026-05-05T11:10:00Z", duracao_ms: 600000, profile_arquitetura: "vertical-slice", fase_pipeline: "plan-feature", tokens_aproximados_consumidos: 2000, arquivos_lidos: 3, arquivos_modificados: 1, sucesso: false },
        durationMs: 600000,
        profileArquitetura: "vertical-slice",
        fasePipeline: "plan-feature",
        sucesso: false,
        tokensEstimados: 2000,
        arquivosLidos: 3,
        arquivosModificados: 1,
      },
    ]
    const result = aggregateBySkill(paired)
    const pf = result.get("plan-feature")
    expect(pf).toBeDefined()
    expect(pf!.count).toBe(2)
    expect(pf!.avgDurationMs).toBe(600000)
    expect(pf!.avgTokensEstimados).toBe(1500)
    expect(pf!.successRate).toBe(0.5)
  })
})

describe("abandonRate", () => {
  test("calcula taxa de abandono corretamente", () => {
    expect(abandonRate([], 0)).toBe(0)
    expect(abandonRate([{} as PairedEntry], 1)).toBe(0.5)
    expect(abandonRate([{} as PairedEntry, {} as PairedEntry], 0)).toBe(0)
  })
})

describe("formatReport (CA-08)", () => {
  test("inclui token medio, perfil mais usado, taxa de abandono, tempo por fase", () => {
    const bySkill = new Map([
      ["plan-feature", { count: 3, avgDurationMs: 600000, avgTokensEstimados: 1200, successRate: 1.0 }],
    ])
    const byProfile = new Map([
      ["vertical-slice", { count: 3 }],
    ])
    const byPhase = new Map([
      ["plan-feature", { count: 3, avgDurationMs: 600000 }],
    ])
    const report = formatReport({
      projectPath: "/tmp/test-project",
      totalRawLines: 6,
      malformedCount: 0,
      validPairs: 3,
      orphanedStarts: 0,
      orphanedEnds: 0,
      bySkill,
      byProfile,
      byPhase,
      abandonRate: 0,
    })
    // CA-08: as 4 metricas obrigatorias
    expect(report).toMatch(/tokens_estimados_avg/i)
    expect(report).toMatch(/Por perfil/i)
    expect(report).toMatch(/Taxa de abandono/i)
    expect(report).toMatch(/Por fase do pipeline/i)
  })

  test("usa palavra ESTIMADOS para nao induzir falsa precisao (G3)", () => {
    const report = formatReport({
      projectPath: "/tmp/test",
      totalRawLines: 2,
      malformedCount: 0,
      validPairs: 1,
      orphanedStarts: 0,
      orphanedEnds: 0,
      bySkill: new Map([["plan-feature", { count: 1, avgDurationMs: 100, avgTokensEstimados: 500, successRate: 1 }]]),
      byProfile: new Map([["vertical-slice", { count: 1 }]]),
      byPhase: new Map([["plan-feature", { count: 1, avgDurationMs: 100 }]]),
      abandonRate: 0,
    })
    // G3: palavra "estimado" deve aparecer em contexto de tokens
    expect(report.toLowerCase()).toMatch(/estimad/)
  })

  test("inclui privacy notice no rodape", () => {
    const report = formatReport({
      projectPath: "/tmp/test",
      totalRawLines: 2,
      malformedCount: 0,
      validPairs: 1,
      orphanedStarts: 0,
      orphanedEnds: 0,
      bySkill: new Map(),
      byProfile: new Map(),
      byPhase: new Map(),
      abandonRate: 0,
    })
    expect(report).toMatch(/nenhum conteudo de codigo foi lido/i)
  })
})

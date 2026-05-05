import * as fs from "node:fs"
import * as path from "node:path"
import { parseJsonlContent } from "./lib/parse-jsonl"
import { pairStartEnd } from "./lib/pair-events"
import { aggregateBySkill, aggregateByProfile, aggregateByPhase, abandonRate } from "./lib/aggregate"
import { formatReport, type ReportInput } from "./lib/format-report"
import { writeArchitectureProfile } from "../skills/lib/architecture-detector/write-architecture-profile"
import type { ArchitectureProfileName } from "../skills/lib/manifest-types"

type CliArgs = {
  projects: string[]
  month: string | null
  ascii: boolean
  setProfile: string | null
}

const VALID_PROFILES: readonly ArchitectureProfileName[] = [
  "clean-architecture-ritual",
  "mvc-flat",
  "vertical-slice",
  "nextjs-app-router",
  "unknown-mixed",
]

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { projects: [], month: null, ascii: false, setProfile: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--projects") {
      args.projects = ((argv[i + 1] ?? "")).split(",").filter(Boolean)
      i++
    } else if (a === "--month") {
      args.month = argv[i + 1] ?? null
      i++
    } else if (a === "--ascii") {
      args.ascii = true
    } else if (a === "--set") {
      args.setProfile = argv[i + 1] ?? null
      i++
    }
  }
  return args
}

/**
 * Handles `--set <profile>` — validates and writes architecture profile to manifest.
 * Uses a synthetic FolderSignal to embed "manual override" text in signals array.
 * Exits the process (never returns).
 */
function handleSetProfile(value: string, projectRoot: string): never {
  if (!VALID_PROFILES.includes(value as ArchitectureProfileName)) {
    process.stderr.write(`[analyze-error] perfil invalido: '${value}'\n`)
    process.stderr.write(`Perfis validos: ${VALID_PROFILES.join(", ")}\n`)
    process.exit(1)
  }

  // Synthetic DetectionResult for a manual override.
  // FolderSignal with matched=true embeds "manual override" text via toArchitectureProfile.
  writeArchitectureProfile(
    {
      profile: value as ArchitectureProfileName,
      confidence: 100,
      detectedAt: new Date().toISOString(),
      signals: {
        folderSignals: [
          { pattern: "manual override via analyze-metrics --set", matched: true, weight: 0 },
        ],
        importSignals: [],
      },
      alternativeProfiles: [],
    },
    projectRoot,
  )

  process.stdout.write(`[analyze-info] profile sobrescrito para '${value}' em ${projectRoot}\n`)
  process.exit(0)
}

function findMetricsFiles(projectRoot: string, monthFilter: string | null): string[] {
  const dir = path.join(projectRoot, ".claude", "metrics")
  if (!fs.existsSync(dir)) return []
  const all = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
  if (monthFilter !== null) {
    return all.filter((f) => f.startsWith(monthFilter)).map((f) => path.join(dir, f))
  }
  return all.map((f) => path.join(dir, f))
}

function analyzeProject(projectPath: string, monthFilter: string | null): ReportInput {
  const files = findMetricsFiles(projectPath, monthFilter)
  const allEntries: ReturnType<typeof parseJsonlContent>["entries"] = []
  let totalRawLines = 0
  let malformedCount = 0

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8")
    totalRawLines += raw.split("\n").filter((l) => l.trim() !== "").length
    const result = parseJsonlContent(raw)
    if (result.malformedCount > 0) {
      process.stderr.write(
        `[analyze-warn] ${file}: ${result.malformedCount} linha(s) malformadas (linhas: ${result.malformedLines.join(", ")})\n`,
      )
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

  if (args.setProfile !== null) {
    handleSetProfile(args.setProfile, process.cwd())
  }

  const projects = args.projects.length > 0 ? args.projects : [process.cwd()]
  const reports: ReportInput[] = []

  for (const p of projects) {
    const abs = path.resolve(p)
    if (!fs.existsSync(abs)) {
      process.stderr.write(`[analyze-error] projeto nao encontrado: ${abs}\n`)
      process.exit(1)
    }
    reports.push(analyzeProject(abs, args.month))
  }

  // G5: per-project reports before aggregate
  for (const r of reports) {
    process.stdout.write(formatReport(r, { ascii: args.ascii }) + "\n\n")
  }

  if (reports.length > 1) {
    const totalPairs = reports.reduce((s, r) => s + r.validPairs, 0)
    const totalOrphans = reports.reduce((s, r) => s + r.orphanedStarts, 0)
    const rate = ((totalOrphans / (totalPairs + totalOrphans || 1)) * 100).toFixed(1)
    process.stdout.write(`=== AGREGADO (${reports.length} projetos) ===\n`)
    process.stdout.write(`  Total de pares validos:  ${totalPairs}\n`)
    process.stdout.write(`  Total de starts orfaos:  ${totalOrphans}\n`)
    process.stdout.write(`  Taxa de abandono global: ${rate}%\n`)
  }
}

main()

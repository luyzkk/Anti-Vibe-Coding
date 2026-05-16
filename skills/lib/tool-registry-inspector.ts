// 2026-05-15 (Luiz/dev): Plano 03 fase-01 — tracer bullet for /parity-audit.
// Reads .anti-vibe-manifest.json + agents/*.md frontmatter.
// Never throws — degrades to source:'partial' on any IO/parse error.
// alinhado com PRD §Decisao #2 (composabilidade futura) e PLAN.md risco "scope creep"

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

// 2026-05-15 (Luiz/dev): cache 1× por agent — evita poluir stderr em projetos com muitos
// agents legacy. RNF Observabilidade do PRD v6.3.1. Module-scoped Set persiste entre
// múltiplas chamadas de inspectToolRegistry() no mesmo processo (ex: test suite).
const warnedAgents = new Set<string>()

// 2026-05-15 (Luiz/dev): shape composto desde ja — PRD §Decisao #2 (composabilidade futura)
export type MCPDescriptor = {
  name: string
  tools: string[]
}

export type BuiltinToolDescriptor = {
  name: string
}

export type SubagentDescriptor = {
  name: string
  description: string
  allowed_tools: string[]
}

export type ToolRegistrySnapshot = {
  mcps: MCPDescriptor[]
  builtin_tools: BuiltinToolDescriptor[]
  subagents: SubagentDescriptor[]
  generated_at: string
  source: 'manifest' | 'partial'
}

type ManifestShape = {
  mcps?: Array<{ name: string; tools?: string[] }>
  builtin_tools?: string[]
}

// 2026-05-15 (Luiz/dev): busca ascendente ate root — espelha read-architecture-profile.ts
async function findManifestPath(startDir: string): Promise<string | null> {
  let dir = path.resolve(startDir)
  const root = path.parse(dir).root
  while (dir !== root) {
    const candidate = path.join(dir, '.anti-vibe-manifest.json')
    try {
      await readFile(candidate, 'utf-8')
      return candidate
    } catch {
      dir = path.dirname(dir)
    }
  }
  return null
}

async function readManifest(projectRoot: string): Promise<{
  mcps: MCPDescriptor[]
  builtin_tools: BuiltinToolDescriptor[]
  found: boolean
}> {
  const manifestPath = await findManifestPath(projectRoot)
  if (!manifestPath) {
    return { mcps: [], builtin_tools: [], found: false }
  }

  const raw = await readFile(manifestPath, 'utf-8').catch(() => null)
  if (!raw) return { mcps: [], builtin_tools: [], found: false }

  const parsed = JSON.parse(raw) as ManifestShape
  const mcps: MCPDescriptor[] = (parsed.mcps ?? []).map(m => ({
    name: m.name,
    tools: m.tools ?? [],
  }))
  const builtin_tools: BuiltinToolDescriptor[] = (parsed.builtin_tools ?? []).map(name => ({ name }))

  return { mcps, builtin_tools, found: true }
}

async function readSubagents(projectRoot: string): Promise<{
  subagents: SubagentDescriptor[]
  found: boolean
}> {
  const agentsDir = path.join(projectRoot, 'agents')
  const entries = await readdir(agentsDir, { withFileTypes: true }).catch(() => null)
  if (!entries) return { subagents: [], found: false }

  const subagents: SubagentDescriptor[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue
    const full = path.join(agentsDir, entry.name)
    const raw = await readFile(full, 'utf-8').catch(() => null)
    if (!raw) continue

    const { data } = matter(raw)
    const name = typeof data['name'] === 'string' ? data['name'] : entry.name.replace(/\.md$/, '')
    const description = typeof data['description'] === 'string' ? (data['description'].split('\n')[0] ?? '') : ''

    // 2026-05-15 (Luiz/dev): precedência 'tools:' canônica per convenção Claude Code
    // (agents=tools, skills=allowed-tools) — ref D2 do PRD v6.3.1, .claude/prd-v5/11-new-agents.md:31.
    // Fallback a 'allowed-tools:' emite deprecation warning 1× por agent (cache módulo).
    let toolsRaw = ''
    if (typeof data['tools'] === 'string') {
      toolsRaw = data['tools']
    } else if (typeof data['allowed-tools'] === 'string') {
      toolsRaw = data['allowed-tools']
      if (!warnedAgents.has(name)) {
        process.stderr.write(
          `[deprecation] agent ${name} uses 'allowed-tools'; canonical is 'tools' (per Claude Code convention)\n`
        )
        warnedAgents.add(name)
      }
    }

    const allowed_tools = toolsRaw
      .split(',')
      .map((s: string) => s.trim())
      .filter((s): s is string => s.length > 0)

    subagents.push({ name, description, allowed_tools })
  }

  return { subagents, found: true }
}

export async function inspectToolRegistry(projectRoot: string): Promise<ToolRegistrySnapshot> {
  let manifestResult: { mcps: MCPDescriptor[]; builtin_tools: BuiltinToolDescriptor[]; found: boolean }
  try {
    manifestResult = await readManifest(projectRoot)
  } catch {
    // 2026-05-15 (Luiz/dev): JSON.parse or IO error → degrades to partial — PLAN.md risco "scope creep"
    manifestResult = { mcps: [], builtin_tools: [], found: false }
  }

  const subagentsResult = await readSubagents(projectRoot)

  const source: 'manifest' | 'partial' =
    manifestResult.found && subagentsResult.found ? 'manifest' : 'partial'

  return {
    mcps: manifestResult.mcps,
    builtin_tools: manifestResult.builtin_tools,
    subagents: subagentsResult.subagents,
    generated_at: new Date().toISOString(),
    source,
  }
}

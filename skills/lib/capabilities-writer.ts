import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export type CapabilitySource = 'ast' | 'llm'

export type Capability = {
  kind: 'route'
  method: string
  path: string
  handler: string
  owner_path: string
  confidence: number
  source: CapabilitySource
}

export type CapabilitiesOutput = {
  capabilities: Capability[]
  coverage_gaps: string[]
  generated_at: string
  profile_at_generation: string
  schema_version: '1.0'
}

async function findRouteFiles(appDir: string): Promise<string[]> {
  const results: string[] = []
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.name === 'route.ts' || entry.name === 'route.tsx') results.push(full)
    }
  }
  await walk(appDir).catch(() => {})
  return results
}

function extractMethods(content: string): Array<{ method: string; line: number }> {
  const found: Array<{ method: string; line: number }> = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === undefined) continue
    const match = line.match(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/)
    if (match?.[1] !== undefined) {
      found.push({ method: match[1], line: i + 1 })
    }
  }
  return found
}

function toApiPath(relPath: string): string {
  const noApp = relPath.replace(/^app\//, '')
  const noRoute = noApp.replace(/\/route\.tsx?$/, '')
  return '/' + noRoute
}

export async function discoverNextjsAppRouterCapabilities(
  projectRoot: string
): Promise<CapabilitiesOutput> {
  const appDir = path.join(projectRoot, 'app')
  const routeFiles = await findRouteFiles(appDir)

  if (routeFiles.length === 0) {
    return {
      capabilities: [],
      coverage_gaps: ['app/ folder not found or empty — no routes discovered'],
      generated_at: new Date().toISOString(),
      profile_at_generation: 'nextjs-app-router',
      schema_version: '1.0',
    }
  }

  const capabilities: Capability[] = []
  const coverage_gaps: string[] = []

  for (const filePath of routeFiles) {
    const content = await readFile(filePath, 'utf-8').catch(() => null)
    if (content === null) {
      const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/')
      coverage_gaps.push(`${relPath} — read failed`)
      continue
    }
    const methods = extractMethods(content)
    const relPath = path.relative(projectRoot, filePath).replace(/\\/g, '/')
    if (methods.length === 0) {
      coverage_gaps.push(`${relPath} — no HTTP method exports found`)
      continue
    }
    const apiPath = toApiPath(relPath)
    const ownerPath = path.dirname(relPath).replace(/\\/g, '/') + '/'
    for (const { method, line } of methods) {
      capabilities.push({
        kind: 'route',
        method,
        path: apiPath,
        handler: `${relPath}:${line}`,
        owner_path: ownerPath,
        confidence: 1.0,
        source: 'ast',
      })
    }
  }

  return {
    capabilities,
    coverage_gaps,
    generated_at: new Date().toISOString(),
    profile_at_generation: 'nextjs-app-router',
    schema_version: '1.0',
  }
}

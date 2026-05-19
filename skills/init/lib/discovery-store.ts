import { promises as fs } from 'node:fs'
import path from 'node:path'

export type DiscoveryArtifactName =
  | 'secrets-scan-result'
  | 'discovered-docs'
  | 'classification-result'

export type DiscoveryWriteOptions = {
  readonly noWrite?: boolean
}

export function discoveryArtifactPath(cwd: string, name: DiscoveryArtifactName): string {
  return path.join(cwd, '.anti-vibe', 'discovery', `${name}.json`)
}

export async function writeDiscoveryArtifact<T>(
  cwd: string,
  name: DiscoveryArtifactName,
  data: T,
  opts: DiscoveryWriteOptions = {},
): Promise<void> {
  if (opts.noWrite === true) return
  const filePath = discoveryArtifactPath(cwd, name)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export async function readDiscoveryArtifact<T>(
  cwd: string,
  name: DiscoveryArtifactName,
): Promise<T | null> {
  const filePath = discoveryArtifactPath(cwd, name)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

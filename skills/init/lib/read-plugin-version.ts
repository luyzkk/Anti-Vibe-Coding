// skills/init/lib/read-plugin-version.ts
// 2026-05-25 (Luiz/dev): extraido de run-init.ts para permitir reuso no Step 11
// (write-anti-vibe-manifest). Logica byte-identica a run-init.ts:13-36 pre-extracao.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 2026-05-25 (Luiz/dev): fileURLToPath em vez de new URL().pathname.
// Bug pre-existente em Windows: .pathname retorna "/F:/..." que fs.readFile rejeita,
// fazendo o reader sempre cair no fallback '6.7.0' (impacto: cross-upgrade-detector cego em Windows).
const HERE = path.dirname(fileURLToPath(import.meta.url))

export async function readPluginVersion(): Promise<string> {
  try {
    const pluginJsonPath = path.join(HERE, '..', '..', '..', '.claude-plugin', 'plugin.json')
    const raw = await readFile(pluginJsonPath, 'utf-8')
    const parsed = JSON.parse(raw) as { version?: string }
    if (parsed.version) return parsed.version
  } catch { /* fall through */ }
  try {
    const pkgPath = path.join(HERE, '..', '..', '..', 'package.json')
    const raw = await readFile(pkgPath, 'utf-8')
    const parsed = JSON.parse(raw) as { version?: string }
    if (parsed.version) return parsed.version
  } catch { /* fall through */ }
  // 2026-05-20 (Luiz/dev): D6 do PRD knowledge-path-cutover — fallback version bump 6.5.1 → 6.6.0.
  // Patch 6.6.1: alinhamento de boundary tests do reentry-guard (verify-work).
  // Minor 6.7.0: populate-plan-andre-port (Andre harness format) + gate path drift fix + caveats cleanup.
  return '6.7.0'
}

// 2026-05-24 (Luiz/dev): subcomando check — wrapper de compound-check do target — PRD RF-05, CA-09, CA-10, RNF-01

import path from 'node:path'

// 2026-05-24 (Luiz/dev): tipos do subcomando check — inlinados (sem arquivo separado, sem cross-skill import)
export type CheckOpts = { strict: boolean }
export type CheckResult = {
  exitCode: number
  stdout: string
  stderr: string
}

export async function runCompoundCheck(
  targetRoot: string,
  opts: CheckOpts,
): Promise<CheckResult> {
  const scriptPath = path.join(targetRoot, 'scripts', 'compound-check.ts')
  const args = ['run', scriptPath]
  if (opts.strict) args.push('--strict')

  // 2026-05-24 (Luiz/dev): Bun.spawn captura stdout/stderr — backward compat RNF-01, CA-09/10
  const proc = Bun.spawn(['bun', ...args], {
    cwd: targetRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  return { exitCode, stdout, stderr }
}

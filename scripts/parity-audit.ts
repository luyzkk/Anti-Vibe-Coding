#!/usr/bin/env bun
// 2026-05-15 (Luiz/dev): parity-audit script — PRD v6.3.1 §RF-MH-03, plano01 fase-03 GREEN.
// Pure-fn audit() + entrypoint guarded. Padrão DEC-4 da v6.3.0 (preface-simulate.ts:92).

import { inspectToolRegistry } from "../skills/lib/tool-registry-inspector"
import {
  computeParityGaps,
  writeParityGaps,
} from "../skills/parity-audit/lib/parity-gaps-writer"

// 2026-05-15 (Luiz/dev): regex barra input malicioso — GT-4 do PRD v6.3.0 lessons (path traversal).
// task_type aceito é slug kebab-case (alfanumérico + hífen, deve começar com letra).
const SAFE_TASK_TYPE = /^[a-z][a-z0-9-]*$/i

export async function audit(
  projectRoot: string,
  taskType: string | null,
): Promise<{ stdout: string[]; stderr: string[]; code: number }> {
  const stdout: string[] = []
  const stderr: string[] = []

  if (taskType !== null && !SAFE_TASK_TYPE.test(taskType)) {
    stderr.push(
      `Invalid task_type. Allowed: [a-z][a-z0-9-]*, no path separators or special chars.`,
    )
    return { stdout, stderr, code: 1 }
  }

  const snapshot = await inspectToolRegistry(projectRoot)
  if (snapshot.source === "partial") {
    stderr.push(
      "Tool registry incompleto (manifest ou agents/ ausente). Resultado será best-effort.",
    )
  }

  const output = await computeParityGaps(snapshot, taskType)
  const outPath = await writeParityGaps(output, projectRoot)

  // resumo top-3 por severity
  const bySeverity = {
    critical: output.gaps.filter(g => g.severity === "critical"),
    important: output.gaps.filter(g => g.severity === "important"),
    nice: output.gaps.filter(g => g.severity === "nice"),
  }

  stdout.push(`Parity Audit — ${output.gaps.length} gap(s) encontrado(s)`)
  stdout.push("")
  for (const sev of ["critical", "important", "nice"] as const) {
    const list = bySeverity[sev]
    if (list.length === 0) continue
    stdout.push(`${sev.toUpperCase()} (${list.length}):`)
    for (const g of list.slice(0, 3)) {
      stdout.push(
        `  - gap_id: ${g.gap_id} | missing: ${g.missing_capability} | suggestion: ${g.suggestion}`,
      )
    }
    stdout.push("")
  }
  stdout.push(`Output completo: ${outPath}`)

  return { stdout, stderr, code: 0 }
}

if (import.meta.main) {
  const taskTypeArg = process.argv[2] ?? null
  const taskType = taskTypeArg && taskTypeArg.length > 0 ? taskTypeArg : null
  audit(process.cwd(), taskType)
    .then(result => {
      for (const line of result.stdout) console.log(line)
      for (const line of result.stderr) console.error(line)
      process.exit(result.code)
    })
    .catch((err: unknown) => {
      console.error("parity:audit error:", err)
      process.exit(1)
    })
}

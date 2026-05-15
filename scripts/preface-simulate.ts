#!/usr/bin/env bun
// 2026-05-15 (Luiz/dev): preface-simulate — PRD v6.3.0 §RF-CH-03, plano05 fase-03 GREEN

import { promises as fs } from "node:fs"
import path from "node:path"
import { readPrefaceContext } from "../skills/lib/preface-context"

const PREFACE_START = "<!-- profile-aware-preface:start -->"
const PREFACE_END = "<!-- profile-aware-preface:end -->"

// 2026-05-15 (Luiz/dev): skill-name regex barra path traversal (../, /, .) e null bytes.
// Skill names sao identificadores kebab/underscore — ver skills/* atuais.
const SAFE_SKILL_NAME = /^[a-zA-Z0-9_-]+$/

async function findSkillDir(
  projectRoot: string,
  skillName: string,
): Promise<string | null> {
  const candidate = path.join(projectRoot, "skills", skillName)
  try {
    const stat = await fs.stat(candidate)
    if (stat.isDirectory()) return candidate
  } catch {
    return null
  }
  return null
}

async function readSkillPreface(skillDir: string): Promise<string | null> {
  const skillMdPath = path.join(skillDir, "SKILL.md")
  let content: string
  try {
    content = await fs.readFile(skillMdPath, "utf-8")
  } catch {
    return null
  }
  const startIdx = content.indexOf(PREFACE_START)
  const endIdx = content.indexOf(PREFACE_END)
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null
  return content.slice(startIdx, endIdx + PREFACE_END.length)
}

export async function simulate(
  projectRoot: string,
  skillName: string,
): Promise<{ stdout: string[]; stderr: string[]; code: number }> {
  const stdout: string[] = []
  const stderr: string[] = []

  if (!skillName) {
    stderr.push("Usage: bun run preface:simulate <skill-name>")
    stderr.push("Example: bun run preface:simulate security")
    stderr.push(
      "Prints the composed preface that would be injected into <skill-name>",
    )
    return { stdout, stderr, code: 2 }
  }

  if (!SAFE_SKILL_NAME.test(skillName)) {
    stderr.push(`Invalid skill name. Allowed: [a-zA-Z0-9_-]+, no path separators.`)
    return { stdout, stderr, code: 1 }
  }

  const skillDir = await findSkillDir(projectRoot, skillName)
  if (!skillDir) {
    stderr.push(`Skill '${skillName}' not found in skills/`)
    stderr.push("Hint: ls skills/ to see available skills")
    return { stdout, stderr, code: 1 }
  }

  const block = await readSkillPreface(skillDir)
  if (!block) {
    stderr.push(
      `WARN: skills/${skillName}/SKILL.md has no profile-aware-preface block`,
    )
    stderr.push("Showing default fallback (skill behaves as v6.2 generic).")
    stdout.push("")
    stdout.push("--- Default Fallback Preface ---")
    stdout.push("(empty — skill prompt unchanged from v6.2)")
    return { stdout, stderr, code: 0 }
  }

  const ctx = readPrefaceContext(projectRoot)
  stdout.push(`--- Composed Preface (skills/${skillName}/SKILL.md) ---`)
  stdout.push(block)
  stdout.push("")
  stdout.push("--- PrefaceContext ---")
  stdout.push(JSON.stringify(ctx, null, 2))
  return { stdout, stderr, code: 0 }
}

if (import.meta.main) {
  const skillName = process.argv[2] ?? ""
  simulate(process.cwd(), skillName)
    .then((result) => {
      for (const line of result.stdout) console.log(line)
      for (const line of result.stderr) console.error(line)
      process.exit(result.code)
    })
    .catch((err: unknown) => {
      console.error("preface:simulate error:", err)
      process.exit(1)
    })
}

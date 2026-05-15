// 2026-05-15 (Luiz/dev): preface-simulate.test.ts — PRD v6.3.0 §RF-CH-03, plano05 fase-03 RED

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { simulate } from "./preface-simulate"

// Fixtures verbatim from spec
const SKILL_WITH_PREFACE = `---
name: security
---

<!-- profile-aware-preface:start -->
\`\`\`typescript
import { readPrefaceContext } from '../lib/preface-context'
const ctx = readPrefaceContext()
\`\`\`
<!-- profile-aware-preface:end -->

# Security
`

const SKILL_WITHOUT_PREFACE = `---
name: plain
---

# Plain Skill (no adaptive preface)
`

describe("preface:simulate (pure-fn contract)", () => {
  let workdir: string

  beforeEach(async () => {
    workdir = await mkdtemp(path.join(tmpdir(), "preface-sim-"))
  })

  afterEach(async () => {
    await rm(workdir, { recursive: true, force: true })
  })

  test("exits 2 with usage when skill name is empty", async () => {
    const result = await simulate(workdir, "")
    expect(result.code).toBe(2)
    expect(result.stderr.some((line) => /Usage/i.test(line))).toBe(true)
  })

  test("exits 1 with helpful error when skill directory does not exist", async () => {
    // no skills/foo/ created — tmpdir is empty
    const result = await simulate(workdir, "foo")
    expect(result.code).toBe(1)
    expect(result.stderr.join("\n")).toMatch(/not found/i)
    expect(result.stderr.join("\n")).toContain("skills/")
  })

  test("prints warning + default fallback when skill has no preface block", async () => {
    await mkdir(path.join(workdir, "skills", "plain"), { recursive: true })
    await writeFile(
      path.join(workdir, "skills", "plain", "SKILL.md"),
      SKILL_WITHOUT_PREFACE,
    )
    const result = await simulate(workdir, "plain")
    expect(result.code).toBe(0)
    expect(result.stderr.join("\n")).toMatch(/no profile-aware-preface block/)
    expect(result.stdout.join("\n")).toContain("Default Fallback Preface")
  })

  test("prints preface block when skill has it", async () => {
    await mkdir(path.join(workdir, "skills", "security"), { recursive: true })
    await writeFile(
      path.join(workdir, "skills", "security", "SKILL.md"),
      SKILL_WITH_PREFACE,
    )
    const result = await simulate(workdir, "security")
    expect(result.code).toBe(0)
    const joined = result.stdout.join("\n")
    expect(joined).toContain("profile-aware-preface:start")
    expect(joined).toContain("profile-aware-preface:end")
    expect(joined).toContain("readPrefaceContext")
  })
})

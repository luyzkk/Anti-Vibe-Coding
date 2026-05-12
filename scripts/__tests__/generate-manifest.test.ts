import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import * as path from "node:path"
import * as fs from "node:fs"
import * as os from "node:os"
import * as crypto from "node:crypto"

const PLUGIN_ROOT = path.join(import.meta.dir, "..", "..")
const MANIFEST_PATH = path.join(PLUGIN_ROOT, "plugin-manifest.json")

/**
 * Testes para generate-manifest.js
 * Verificam que o manifest gerado cobre paths novos do v6
 */
describe("generate-manifest", () => {
  let manifest: {
    version: string
    generatedAt: string
    files: Record<string, { version: string; checksum: string; lastModified: string; updateStrategy: string }>
  }

  beforeAll(() => {
    const raw = fs.readFileSync(MANIFEST_PATH, "utf8")
    manifest = JSON.parse(raw)
  })

  test("top-level version matches PLUGIN_VERSION=6.0.0", () => {
    expect(manifest.version).toBe("6.0.0")
  })

  test("generatedAt is a valid ISO string", () => {
    expect(() => new Date(manifest.generatedAt)).not.toThrow()
    expect(new Date(manifest.generatedAt).toISOString()).toBe(manifest.generatedAt)
  })

  test("skills/todo-pick/SKILL.md is registered", () => {
    expect(manifest.files["skills/todo-pick/SKILL.md"]).toBeDefined()
  })

  test("hooks/pre-mutation-gate.cjs is registered", () => {
    expect(manifest.files["hooks/pre-mutation-gate.cjs"]).toBeDefined()
  })

  test("hooks/state-md-hook.cjs is registered", () => {
    expect(manifest.files["hooks/state-md-hook.cjs"]).toBeDefined()
  })

  test("scripts/harness-validate.ts is registered", () => {
    expect(manifest.files["scripts/harness-validate.ts"]).toBeDefined()
  })

  test("scripts/compound-check.ts is registered", () => {
    expect(manifest.files["scripts/compound-check.ts"]).toBeDefined()
  })

  test("scripts/analyze-metrics.ts is registered", () => {
    expect(manifest.files["scripts/analyze-metrics.ts"]).toBeDefined()
  })

  test("all checksums are SHA-256 (64 hex chars)", () => {
    const SHA256_RE = /^[a-f0-9]{64}$/
    const bad = Object.entries(manifest.files).filter(([, v]) => !SHA256_RE.test(v.checksum))
    expect(bad.map(([k]) => k)).toEqual([])
  })

  test("all per-file versions are 6.0.0", () => {
    const versions = [...new Set(Object.values(manifest.files).map((f) => f.version))]
    expect(versions).toEqual(["6.0.0"])
  })

  test("all new v6 files have updateStrategy=replace", () => {
    const newFiles = [
      "skills/todo-pick/SKILL.md",
      "hooks/pre-mutation-gate.cjs",
      "hooks/state-md-hook.cjs",
      "scripts/harness-validate.ts",
      "scripts/compound-check.ts",
    ]
    newFiles.forEach((f) => {
      const entry = manifest.files[f]
      if (entry) {
        expect(entry.updateStrategy).toBe("replace")
      }
    })
  })

  test("total file count >= 123", () => {
    expect(Object.keys(manifest.files).length).toBeGreaterThanOrEqual(123)
  })

  test("no paths with backslashes (must be POSIX)", () => {
    const bad = Object.keys(manifest.files).filter((k) => k.includes("\\"))
    expect(bad).toEqual([])
  })

  test("skills/lib has .ts files registered", () => {
    const libTs = Object.keys(manifest.files).filter(
      (k) => k.startsWith("skills/lib/") && k.endsWith(".ts")
    )
    expect(libTs.length).toBeGreaterThan(0)
  })

  test("doc-only paths are excluded (AGENTS.md, ARCHITECTURE.md, docs/)", () => {
    const excluded = Object.keys(manifest.files).filter(
      (k) => k === "AGENTS.md" || k === "ARCHITECTURE.md" || k.startsWith("docs/")
    )
    expect(excluded).toEqual([])
  })

  test("checksums match actual file content", () => {
    // Verifica 3 arquivos aleatorios que existem
    const sampleKeys = Object.keys(manifest.files).slice(0, 3)
    sampleKeys.forEach((relPath) => {
      if (!relPath) return
      const absPath = path.join(PLUGIN_ROOT, relPath)
      if (fs.existsSync(absPath)) {
        const content = fs.readFileSync(absPath, "utf8")
        const expected = crypto.createHash("sha256").update(content).digest("hex")
        const entry = manifest.files[relPath]
        if (entry) expect(entry.checksum).toBe(expected)
      }
    })
  })
})

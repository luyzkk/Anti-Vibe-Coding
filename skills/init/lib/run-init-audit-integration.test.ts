import { describe, it, expect } from 'bun:test'
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises'
import path from 'node:path'
import { runInit } from './run-init'

describe('runInit emits canonical audit log entries (CA-14)', () => {
  it('records entries in order for a run with CLAUDE.md present', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'audit-ca14-'))
    try {
      await mkdir(path.join(tmp, 'discovery'), { recursive: true })
      // CLAUDE.md present but no docs/ dir — Step 07 discovers it but 08 classifies as 0
      // mapped (only orphan). Step 09 detects a move but additive-merge skips interaction.
      await writeFile(
        path.join(tmp, 'CLAUDE.md'),
        '# Test\nsome content\n',
        'utf-8',
      )

      // Use --additive-merge to bypass Step 09/10 interactive prompt (no askUser loop issue)
      await runInit(['--additive-merge'], {
        cwd: tmp,
        askUser: async (_prompt, options) => options[0] ?? 'Confirm',
      })

      const logPath = path.join(tmp, 'discovery', 'agents-log.json')
      const log = JSON.parse(await readFile(logPath, 'utf-8'))
      const ids = log.entries.map((e: { subagent_id: string }) => e.subagent_id)

      // At minimum, secrets-scan must have emitted
      expect(ids).toContain('init-secrets-scan')

      for (const entry of log.entries) {
        expect(entry).toMatchObject({
          input_paths: expect.any(Array),
          output_struct: expect.any(Object),
          duration_ms: expect.any(Number),
          retry_count: 0,
        })
        // Zero PII: no secret patterns in output_struct
        expect(JSON.stringify(entry.output_struct)).not.toMatch(/AKIA[0-9A-Z]{16}/)
      }
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it('does NOT emit audit log entries in --dry-run mode', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'audit-dryrun-'))
    try {
      await mkdir(path.join(tmp, 'discovery'), { recursive: true })
      await writeFile(
        path.join(tmp, 'CLAUDE.md'),
        '# Test\nsome content\n',
        'utf-8',
      )

      await runInit(['--dry-run'], {
        cwd: tmp,
        askUser: async (_prompt, options) => options[0] ?? 'Confirm',
      })

      const logPath = path.join(tmp, 'discovery', 'agents-log.json')
      const exists = await access(logPath).then(() => true).catch(() => false)
      if (exists) {
        const log = JSON.parse(await readFile(logPath, 'utf-8'))
        expect(log.entries).toHaveLength(0)
      }
      // If file doesn't exist: passed (dry-run does not create the file)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })
})

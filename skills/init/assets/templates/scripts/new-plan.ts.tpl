#!/usr/bin/env bun
// new-plan: scaffold a new execution plan.
// Generates docs/exec-plans/active/{YYYY-MM-DD}-{slug}.md with the 10 standard sections.
// Refuses to overwrite an existing file (exit 1 on EEXIST).

import { promises as fs } from 'node:fs'
import path from 'node:path'

const title = process.argv.slice(2).join(' ').trim()

if (!title) {
  console.error('Usage: bun run scripts/new-plan.ts "Plan title"')
  process.exit(1)
}

const date = new Date().toISOString().slice(0, 10)
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60)

const fileName = `${date}-${slug || 'plan'}.md`
const target = path.join(process.cwd(), 'docs/exec-plans/active', fileName)

const content = `# ${title}

## Goal

Describe the desired outcome in one paragraph.

## Scope

- In scope:
- Out of scope:

## Assumptions

- List the assumptions that could invalidate the plan.

## Risks

- Note migration, rollout, or dependency risks.

## Execution Steps

1. Gather context and confirm constraints.
2. Implement the smallest safe slice.
3. Verify behavior with tests or manual checks.
4. Update docs and close the loop.

## Review Checklist

- Select the relevant checklist for the touched surface.
- Record security, reliability, UI, data, migration, runtime, and production concerns.

## Validation Log

- Record commands run, results, browser smoke evidence, docs updates, and blockers.

## Compound Opportunity

- Note what this work should teach the repo, or why no durable capture is expected yet.

## Lessons Captured

- Link compound notes, checklist updates, smoke flows, specs, scripts, or state why no new capture was needed.

## Exit Criteria

- Define what must be true before the work is considered done.
`

try {
  await fs.writeFile(target, content, { flag: 'wx' })
  console.log(`Created ${path.relative(process.cwd(), target)}`)
} catch (err: unknown) {
  if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'EEXIST') {
    console.error(`Plan already exists: ${path.relative(process.cwd(), target)}`)
    process.exit(1)
  }
  throw err
}

# Smoke Flows

Manual smoke flows for plugin installation and core features.
Run these after any release or major change to confirm nothing is broken.

## Flows

### 1. Fresh Install
1. Clone/enter an empty project directory
2. Run `/anti-vibe-coding:init`
3. Verify: `docs/exec-plans/active/README.md` exists, `AGENTS.md` exists, `hooks.json` registered

### 2. Compound Note Capture
1. Run `/anti-vibe-coding:lessons-learned` with a sample lesson
2. Verify: new file created in `docs/compound/YYYY-MM-DD-slug.md` with valid frontmatter
3. Run `bun run compound:check` — must exit 0

### 3. Pipeline End-to-End
1. Run `/anti-vibe-coding:grill-me` → confirm questions generated
2. Run `/anti-vibe-coding:write-prd` → confirm PRD.md created in `docs/exec-plans/active/`
3. Run `/anti-vibe-coding:plan-feature` → confirm planoNN/ created
4. Run `/anti-vibe-coding:verify-work` → confirm harness:validate called

### 4. Upgrade from v5
1. Add a legacy `.planning/{date-slug}/` folder to a test project
2. Run `/anti-vibe-coding:init`
3. Verify: migration offered, `.planning.v5-backup/` created, content moved to `docs/exec-plans/`

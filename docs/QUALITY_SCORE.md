# Quality Bars

For any change to merge:
- `bun run test` passes
- `bun run typecheck` (or `tsc --noEmit`) passes
- `bun run harness:validate` returns exit 0
- `bun run compound:check` returns exit 0 (if compound notes touched)
- CHANGELOG.md entry added (for user-facing changes)
- Provenance comments added in TS files: `// {YYYY-MM-DD} (author): why this exists`

# Merge Gates

Binary checks that every change must pass before merging. These are enforcement gates, not quality assessments. For the project's living quality dashboard see `docs/QUALITY_SCORE.md`.

For any change to merge:

- All tests pass
- Typecheck passes (`bun run typecheck` or equivalent)
- `bun run harness:validate` returns exit 0
- `bun run compound:check` returns exit 0 (if compound notes touched)
- CHANGELOG entry added for user-facing changes
- Provenance comments added in source files where the rationale is non-obvious

Replace this scaffold with project-specific gates as the toolchain solidifies.

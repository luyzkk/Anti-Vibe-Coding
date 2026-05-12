# Security — Plugin Permissions

## Destructive Operations

The agent must NEVER execute without explicit user confirmation:
- `rm -rf` and equivalents
- `DROP TABLE`, `TRUNCATE`
- Destructive migrations
- Global package install
- Production env var changes
- CI/CD config changes

A hook `pre-tool-use-destructive-guard.cjs` (deferred to v6.1) enforces this mechanically.

## Secrets

The plugin never sends data externally. Telemetry is local only at `~/.claude/projects/.../memory/`.

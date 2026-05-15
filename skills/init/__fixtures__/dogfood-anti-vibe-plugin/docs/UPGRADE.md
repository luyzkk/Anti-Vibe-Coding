# Upgrade Guide

## Versioning

This plugin uses semantic versioning. Breaking changes increment MAJOR.

## Migration from v5 to v6

1. Move `.planning/` contents to `docs/exec-plans/`.
2. Update `CLAUDE.md` with new pipeline references.
3. Run `bun run harness:validate` to confirm structure.

## Checksums

Each release includes a manifest checksum for integrity verification.

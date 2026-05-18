# ADR-{NUMBER}: Rollback of /anti-vibe-coding:init — {date}

**Status:** Accepted
**Date:** {date}
**Backup restored:** `.anti-vibe/backup/{backup_ts}/`
**Git SHA at rollback:** {git_sha}

## Context

Dev invoked `/anti-vibe-coding:init --rollback`. This ADR documents the rollback so future investigations have a record of when and why the destructive merge applied by `/init` was reverted.

## Decision

Restored {N} files from backup at `.anti-vibe/backup/{backup_ts}/`. State of repo returned to pre-init checkpoint. Backup manifest checksum integrity validated before any file was restored (per D29 schema + CA-10).

## Restored Files

{restored_files_list}

## Consequences

- Repo returned to state at {backup_ts}.
- CLAUDE.md original content recovered byte-identico (per CA-06).
- If `/init` is re-attempted, dev may want to address the issue that prompted rollback first (e.g., revise classification heuristic output, adjust `--additive-merge` opt-in, edit secrets in flagged files).
- The backup directory `.anti-vibe/backup/{backup_ts}/` is preserved for forensic reference.

<!-- 2026-05-18 (Luiz/dev): template para `lib/rollback.ts` fase-04 — D10 + MH-07 + CA-06 -->

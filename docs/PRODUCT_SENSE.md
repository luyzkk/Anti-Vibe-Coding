# Product Sense — Why This Plugin Exists

## Problem

AI-assisted coding without discipline produces "vibe code" — features without architecture,
tests written after code, lessons lost in chat history.

## Solution

A Claude Code plugin that enforces:
1. Plan before code (grill-me → write-prd → plan-feature)
2. Test before implement (TDD adaptive levels: guided/assisted/direct)
3. Capture lessons after merge (compound notes with YAML frontmatter)
4. Validate mechanically (`harness:validate`, `compound:check`)

## Non-Goals

- Replace human judgment
- Block experimentation (hooks are suggestive by default)
- Force one architecture (`/detect-architecture` adapts)

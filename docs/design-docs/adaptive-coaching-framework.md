# Adaptive Coaching Framework (v6.3.0)

> Migration guide for skill authors. Estimated reading time: 20 min.

---

## 1. PrefaceContext — the shape

Every profile-aware skill consumes `PrefaceContext` via `readPrefaceContext()`:

```typescript
import type { PrefaceContext } from "../lib/preface-context";

type PrefaceContext = {
  profile: ArchitectureProfileName | null  // 'nextjs-app-router' | 'mvc-flat' | etc.
  language: LanguageHint | null            // null in v6.3.0; populated in v6.5/v6.6
  framework: FrameworkHint | null          // null in v6.3.0; populated in v6.6
  confidence: number                       // 0..100 (0 when profile is null)
}
```

**Invariant rules:**
- `profile: null` means "no adaptation — use generic behavior"
- `language` and `framework` are always `null` in v6.3.0 — do not branch on these fields yet
- `confidence` is `0` when `profile` is `null`

---

## 2. Using readPrefaceContext in a skill

5 lines of integration:

```typescript
import { readPrefaceContext } from "../lib/preface-context";
import { getRecommendationForProfile } from "../lib/read-architecture-profile";

const ctx = readPrefaceContext(projectRoot);
const advice = getRecommendationForProfile(ctx.profile, ADVICE_TABLE, DEFAULT_ADVICE);
// use `advice` in the skill output
```

`readPrefaceContext` never throws. If the manifest does not exist or the feature flag is
disabled, it returns `{ profile: null, confidence: 0, language: null, framework: null }`
and the skill falls back to generic behavior.

---

## 3. capabilities-v1.schema.json

Schema at `discovery/_schemas/capabilities-v1.schema.json`.

**Root fields:** `capabilities[]`, `coverage_gaps[]` (optional), `generated_at` (ISO 8601),
`profile_at_generation`, `schema_version: "1.0"`.

**Fields per capability entry:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | `"route" \| "mutation" \| "job" \| "cli"` | yes | Category |
| `path` | `string` | yes | Route or identifier |
| `handler` | `string` | yes | Handler file relative to root |
| `confidence` | `number 0..1` | yes | Detection score |
| `source` | `"ast" \| "llm"` | yes | Detection method |
| `method` | `"GET" \| "POST" \| ...` | no | HTTP method (routes only) |
| `owner_path` | `string` | no | Owning domain module |

`source: "llm"` entries always have `confidence < 1.0`. Consumers must flag them as
"requires human review."

---

## 4. parity-gaps-v1.schema.json

Schema at `discovery/_schemas/parity-gaps-v1.schema.json`.

**Root fields:** `gaps[]`, `tool_registry_snapshot` (mcps, builtin_tools, subagents),
`generated_at` (ISO 8601), `schema_version: "1.0"`.

**Fields per gap entry:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gap_id` | `string` | yes | Stable ID (e.g., `GAP-001`) |
| `task_type` | `string` | yes | Task that exposes the gap |
| `missing_capability` | `string` | yes | What the agent lacks |
| `severity` | `"critical" \| "important" \| "nice"` | yes | Impact level |
| `suggestion` | `string` | yes | Action to close the gap |

---

## 5. Migration guide for skill authors (4 steps)

Checklist for making an existing skill profile-aware:

**Step 1 — Add block to SKILL.md**

Insert after the telemetry block (before `## Steps`):

```markdown
## Profile-Aware Preface

This block adapts the skill output to the detected architecture profile.
Uses `readPrefaceContext()` from `skills/lib/preface-context.ts`.
Fallback: generic behavior when `profile === null`.
```

**Step 2 — Import and call readPrefaceContext**

At the top of the skill logic (not inside a loop):

```typescript
const ctx = readPrefaceContext(projectRoot);
```

**Step 3 — Define lookup table for all 5 profiles**

```typescript
const ADVICE: Record<ArchitectureProfileName, string> = {
  "clean-architecture-ritual": "...",
  "mvc-flat": "...",
  "vertical-slice": "...",
  "nextjs-app-router": "...",
  "unknown-mixed": "...",
};
const DEFAULT_ADVICE = "..."; // generic v5.2 behavior
```

**Step 4 — Apply the lookup in the output**

```typescript
const advice = getRecommendationForProfile(ctx.profile, ADVICE, DEFAULT_ADVICE);
// use `advice` in generated markdown/output
```

That is the full integration. `readPrefaceContext` handles manifest-not-found, feature-flag-off,
and parse errors — the skill never needs to guard against those.

---

## 6. Skills currently implementing profile-aware-preface

| Skill | SKILL.md file | Since |
|-------|---------------|-------|
| (none in v6.3.0 — Plano 04 implements the first adopters) | — | v6.4 |

---

## References

- `skills/lib/preface-context.ts` — implementation
- `skills/lib/read-architecture-profile.ts` — IO wrapper (do not call directly from skills)
- `docs/design-docs/ADR-0020-adaptive-coaching.md` — architectural decisions
- `discovery/_schemas/` — versioned JSON schemas

# Manifest Schema — Anti-Vibe Coding v5.3

## Overview

`.anti-vibe-manifest.json` is the root config file for the Anti-Vibe Coding plugin. Starting in v5.3, it supports two optional new fields: `architectureProfile` and `architectureDetectorEnabled`.

Pre-v5.3 manifests (without these fields) remain fully parseable — backward compatibility is guaranteed (CA-10).

---

## Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `string` | yes | Plugin version (e.g. `"5.3.0"`) |
| `generatedAt` | `string` | yes | ISO 8601 generation timestamp |
| `description` | `string` | yes | Human-readable description |
| `files` | `Record<string, ManifestFile>` | yes | Tracked files with checksum and update strategy |
| `architectureProfile` | `ArchitectureProfile` | no (v5.3+) | Detected architecture profile object |
| `architectureDetectorEnabled` | `boolean` | no (v5.3+) | Feature flag; default `false` when absent |

---

## `architectureProfile` Object

Introduced in v5.3. Absent on pre-v5.3 manifests.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `profile` | `ArchitectureProfileName` | see below | One of the 5 recognized profiles |
| `confidence` | `number` | 0–100 (integer) | Detection confidence score |
| `detectedAt` | `string` | ISO 8601 | Timestamp of last detection run |
| `signals` | `string[]` | may be empty | Evidence strings, e.g. `"folder:src/features/"` |
| `schemaVersion` | `number` | ≥ 1 | Schema version; increment when shape changes |

### `schemaVersion` Policy

- Starts at `1` for all v5.3 manifests.
- Increment only when the shape of `architectureProfile` changes in a breaking way.
- Consumers MUST check `schemaVersion` before reading fields added after v1.

---

## `ArchitectureProfileName` — Valid Values

The 5 recognized architecture profiles in v5.3:

| Value | Description |
|-------|-------------|
| `"clean-architecture-ritual"` | Strict layered architecture with domain/application/infrastructure separation |
| `"mvc-flat"` | Model-View-Controller, flat folder structure |
| `"vertical-slice"` | Feature-first slices; each feature owns its full stack |
| `"nextjs-app-router"` | Next.js App Router convention (`app/` directory, RSC) |
| `"unknown-mixed"` | Mixed or unrecognized patterns; confidence typically low |

See `docs/architecture-profiles.md` for full descriptions and detection heuristics.

---

## Example: Pre-v5.3 Manifest (backward compatible)

```json
{
  "version": "5.2.0",
  "generatedAt": "2026-04-21T00:00:00.000Z",
  "description": "Manifest de arquivos gerenciados pelo plugin Anti-Vibe Coding",
  "files": {
    "CLAUDE.md": {
      "version": "5.0.0",
      "checksum": "dff9...",
      "lastModified": "2026-04-08",
      "updateStrategy": "merge"
    }
  }
}
```

## Example: v5.3 Manifest with Architecture Profile

```json
{
  "version": "5.3.0",
  "generatedAt": "2026-05-04T10:00:00.000Z",
  "description": "Manifest de arquivos gerenciados pelo plugin Anti-Vibe Coding",
  "files": {},
  "architectureDetectorEnabled": true,
  "architectureProfile": {
    "profile": "vertical-slice",
    "confidence": 85,
    "detectedAt": "2026-05-04T10:00:00.000Z",
    "signals": [
      "folder:src/features/",
      "import:cross-layer"
    ],
    "schemaVersion": 1
  }
}
```

---

## Parsing

Use `parseManifest(raw: unknown): AntiVibeManifest` from `skills/lib/manifest-schema.ts`.

- Throws `Error` with field name if required fields are missing or invalid.
- Returns typed `AntiVibeManifest` on success.
- `architectureProfile` and `architectureDetectorEnabled` are omitted from the result if absent in input (not set to `undefined` explicitly).

```typescript
import { parseManifest } from "./skills/lib/manifest-schema";

const raw = JSON.parse(fs.readFileSync(".anti-vibe-manifest.json", "utf8"));
const manifest = parseManifest(raw); // throws on invalid shape

if (manifest.architectureProfile) {
  console.log(manifest.architectureProfile.profile); // "vertical-slice"
}
```

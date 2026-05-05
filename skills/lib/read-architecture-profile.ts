/**
 * Helper to read the architectureProfile from .anti-vibe-manifest.json.
 *
 * Returns null (never throws) when:
 * - feature flag is disabled
 * - manifest is missing or malformed
 * - profile field is absent
 * - profile field is invalid
 *
 * Returns null instead of throwing because skills must degrade gracefully —
 * a missing manifest must never break the core consultation flow (CA-10, D15).
 *
 * Used by structural skills (architecture, plan-feature, etc.) to adapt output
 * once at the top of the prompt — no deep branching required (D11, RF7).
 *
 * @example
 *   const profile = readArchitectureProfile();
 *   if (profile) {
 *     // prepend "Recomendações para perfil: <profile.profile>"
 *   }
 */

import * as fs from "fs";
import * as path from "path";
import type { ArchitectureProfile } from "./manifest-types";
import { isFeatureEnabled } from "./feature-flags";
import { isValidArchitectureProfile } from "./manifest-schema";

const DEFAULT_MANIFEST_PATH = path.join(process.cwd(), ".anti-vibe-manifest.json");

/**
 * Reads architectureProfile from the manifest. Returns null on any failure.
 *
 * @param manifestPath - Override the manifest file path (used in tests).
 */
export function readArchitectureProfile(
  manifestPath: string = DEFAULT_MANIFEST_PATH
): ArchitectureProfile | null {
  if (!isFeatureEnabled("architectureDetectorEnabled", manifestPath)) {
    return null;
  }

  try {
    const raw: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return null;
    }
    const profile = (raw as Record<string, unknown>)["architectureProfile"];
    if (!isValidArchitectureProfile(profile)) {
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

/**
 * Stable helper to read the detected architecture profile from `.anti-vibe-manifest.json`.
 *
 * Promoted from tracer bullet (Plano 01 fase-06) to stable API in Plano 04 fase-01.
 * Consumed by all 5 structural skills (architecture, plan-feature, write-prd,
 * execute-plan, verify-work) via the "read once + lookup table" convention.
 *
 * Returns `null` (silently, no throw) when ANY of the following is true:
 * - The feature flag `architectureDetectorEnabled` is disabled (CA-04 — preserves v5.2 behavior)
 * - The manifest file does not exist or cannot be parsed (graceful degradation)
 * - The `architectureProfile` field is absent (CA-10 — pre-v5.3 manifest)
 * - The `architectureProfile` field fails schema validation
 *
 * Callers MUST treat `null` as "no adaptation; fall back to v5.2 behavior" and
 * MAY surface a single-line hint suggesting `/anti-vibe-coding:detect-architecture`.
 *
 * Guard order is deliberate: flag check first (cheap IO), then file read, then parse.
 * Inverting the order would cause unnecessary disk reads when the flag is off.
 *
 * @see getRecommendationForProfile — use this helper to resolve lookup table entries
 * @see docs/dual-mode-convention.md — canonical pattern for skills using mode dual
 *
 * @example
 * const profile = readArchitectureProfile()
 * const recommendation = getRecommendationForProfile(
 *   profile?.profile ?? null,
 *   RECOMMENDATIONS,
 *   DEFAULT_RECOMMENDATION,
 * )
 */

import * as fs from "fs";
import * as path from "path";
import type { ArchitectureProfile, ArchitectureProfileName } from "./manifest-types";
import { isFeatureEnabled } from "./feature-flags";
import { isValidArchitectureProfile } from "./manifest-schema";

const DEFAULT_MANIFEST_PATH = path.join(process.cwd(), ".anti-vibe-manifest.json");

/**
 * Reads the detected architecture profile from the manifest file.
 *
 * Guard order (deliberate):
 * 1. Feature flag check — cheapest, returns early when disabled (CA-04)
 * 2. File read — graceful fallback if manifest does not exist yet
 * 3. JSON parse + schema validation — returns null on malformed data (CA-10)
 *
 * @param manifestPath - Absolute path to the manifest JSON file.
 *   Defaults to `.anti-vibe-manifest.json` in `process.cwd()`.
 *   Pass a fixture path in tests to avoid touching the real manifest.
 * @returns The validated {@link ArchitectureProfile} object, or `null` if any guard fails.
 *
 * @example
 * // Default usage in a skill
 * const profile = readArchitectureProfile()
 * if (profile) {
 *   // adapt output to profile.profile
 * }
 *
 * @example
 * // Test usage with a fixture
 * const profile = readArchitectureProfile(path.join(__fixtures__, "vertical-slice.json"))
 * expect(profile?.profile).toBe("vertical-slice")
 */
export function readArchitectureProfile(
  manifestPath: string = DEFAULT_MANIFEST_PATH
): ArchitectureProfile | null {
  // Guard 1: feature flag (cheapest check, runs first)
  if (!isFeatureEnabled("architectureDetectorEnabled", manifestPath)) {
    return null;
  }

  // Guard 2: manifest IO (graceful — file may not exist yet)
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }

  // Guard 3: shape check + profile validation
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const profile = (raw as Record<string, unknown>)["architectureProfile"];
  if (!isValidArchitectureProfile(profile)) {
    return null;
  }
  return profile;
}

/**
 * Generic helper that resolves a recommendation `T` for a given profile name,
 * falling back to `fallback` when the profile is `null` (flag disabled, manifest
 * missing, or profile field absent/invalid).
 *
 * This is THE convention for adapting skill output in v5.3: skills read profile
 * ONCE at the top, then use this helper to look up output — no deep branching.
 *
 * The lookup table MUST have exactly 5 keys (one per canonical profile).
 * TypeScript enforces this via `Record<ArchitectureProfileName, T>` at call sites.
 *
 * @param profile - The profile name to look up, or `null` to use the fallback.
 * @param lookup - Map of profile name → recommendation. Must cover all 5 profiles.
 * @param fallback - Value returned when `profile` is `null` (v5.2 baseline behavior).
 * @returns The resolved recommendation, or `fallback` when profile is null.
 *
 * @example
 * const ADVICE: Record<ArchitectureProfileName, string> = {
 *   'clean-architecture-ritual': 'organize por camada',
 *   'mvc-flat': 'pastas curtas, controllers magros',
 *   'vertical-slice': 'organize por feature',
 *   'nextjs-app-router': 'siga convenção do app/',
 *   'unknown-mixed': 'rode /detect-architecture',
 * }
 * const advice = getRecommendationForProfile(profile?.profile ?? null, ADVICE, DEFAULT_ADVICE)
 */
export function getRecommendationForProfile<T>(
  profile: ArchitectureProfileName | null,
  lookup: Record<ArchitectureProfileName, T>,
  fallback: T,
): T {
  if (profile === null) return fallback;
  return lookup[profile];
}

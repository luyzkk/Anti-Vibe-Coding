/**
 * Feature flag reader for .anti-vibe-manifest.json.
 *
 * Returns false safely when the manifest is missing, malformed, or the flag is absent.
 * Never throws — all errors are silenced (CA-10, D15).
 *
 * Example usage:
 *   if (isFeatureEnabled("architectureDetectorEnabled")) {
 *     // adapt skill output to detected profile
 *   }
 */

import * as fs from "fs";
import * as path from "path";

/** All recognized feature flags in the manifest. */
export type FeatureFlag = "architectureDetectorEnabled";

const DEFAULT_MANIFEST_PATH = path.join(process.cwd(), ".anti-vibe-manifest.json");

/**
 * Reads and parses the manifest JSON silently.
 * Returns null on any error (file missing, parse failure, non-object shape).
 */
function safeReadManifest(manifestPath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Reads a feature flag from the manifest.
 * Returns false safely if the manifest is missing, malformed, or the flag is absent.
 *
 * @param flag - The feature flag name to read.
 * @param manifestPath - Override the manifest file path (used in tests).
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  manifestPath: string = DEFAULT_MANIFEST_PATH
): boolean {
  const manifest = safeReadManifest(manifestPath);
  if (manifest === null) return false;

  const value = manifest[flag];
  if (typeof value !== "boolean") return false;

  return value;
}

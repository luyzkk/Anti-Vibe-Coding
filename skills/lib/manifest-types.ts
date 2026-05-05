/**
 * Type definitions for .anti-vibe-manifest.json (v5.3+).
 *
 * Example usage:
 *   import type { AntiVibeManifest } from "./manifest-types";
 *   const m: AntiVibeManifest = parseManifest(rawJson);
 */

/** The 5 recognized architecture profiles. */
export type ArchitectureProfileName =
  | "clean-architecture-ritual"
  | "mvc-flat"
  | "vertical-slice"
  | "nextjs-app-router"
  | "unknown-mixed";

/**
 * The `architectureProfile` object stored inside the manifest.
 * Introduced in v5.3. Field is optional for backward compatibility (CA-10).
 *
 * Example:
 *   {
 *     profile: "vertical-slice",
 *     confidence: 85,
 *     detectedAt: "2026-05-04T10:00:00.000Z",
 *     signals: ["folder:src/features/"],
 *     schemaVersion: 1
 *   }
 */
export interface ArchitectureProfile {
  profile: ArchitectureProfileName;
  /** Detection confidence score, integer 0–100. */
  confidence: number;
  /** ISO 8601 timestamp of when the profile was detected. */
  detectedAt: string;
  /** Short signal strings used to justify the profile choice. */
  signals: string[];
  /** Schema version starting at 1. Increment when shape changes. */
  schemaVersion: number;
}

/** Per-file metadata tracked in the manifest. */
export interface ManifestFile {
  version: string;
  checksum: string;
  lastModified: string;
  updateStrategy: string;
}

/**
 * Root shape of .anti-vibe-manifest.json.
 * Pre-v5.3 manifests omit `architectureProfile` and `architectureDetectorEnabled`.
 *
 * Example (v5.2, no profile):
 *   { version: "5.2.0", generatedAt: "...", description: "...", files: {} }
 */
export interface AntiVibeManifest {
  version: string;
  generatedAt: string;
  description: string;
  files: Record<string, ManifestFile>;
  /** Optional v5.3+ field. Absent on pre-v5.3 manifests — treated as "not detected". */
  architectureProfile?: ArchitectureProfile;
  /** Feature flag for the architecture detector. Default false when absent. */
  architectureDetectorEnabled?: boolean;
}

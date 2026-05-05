/**
 * Runtime validators for .anti-vibe-manifest.json.
 * No external dependencies — manual shape checks only.
 *
 * Example usage:
 *   import { parseManifest } from "./manifest-schema";
 *   const manifest = parseManifest(JSON.parse(fs.readFileSync(".anti-vibe-manifest.json")));
 */

import type {
  AntiVibeManifest,
  ArchitectureProfile,
  ArchitectureProfileName,
  ManifestFile,
} from "./manifest-types";

const VALID_PROFILE_NAMES: readonly ArchitectureProfileName[] = [
  "clean-architecture-ritual",
  "mvc-flat",
  "vertical-slice",
  "nextjs-app-router",
  "unknown-mixed",
];

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number";
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidProfileName(v: unknown): v is ArchitectureProfileName {
  return isString(v) && (VALID_PROFILE_NAMES as readonly string[]).includes(v);
}

/**
 * Type guard: returns true if `value` is a valid ArchitectureProfile object.
 * Validates all required fields and their constraints.
 */
export function isValidArchitectureProfile(
  value: unknown
): value is ArchitectureProfile {
  if (!isRecord(value)) return false;

  const { profile, confidence, detectedAt, signals, schemaVersion } = value;

  if (!isValidProfileName(profile)) return false;
  if (!isNumber(confidence) || confidence < 0 || confidence > 100) return false;
  if (!isString(detectedAt)) return false;
  if (!Array.isArray(signals) || !signals.every(isString)) return false;
  if (!isNumber(schemaVersion) || schemaVersion < 1) return false;

  return true;
}

function parseManifestFile(raw: unknown, key: string): ManifestFile {
  if (!isRecord(raw)) {
    throw new Error(`manifest.files["${key}"] must be an object`);
  }
  const { version, checksum, lastModified, updateStrategy } = raw;
  if (!isString(version)) throw new Error(`manifest.files["${key}"].version must be a string`);
  if (!isString(checksum)) throw new Error(`manifest.files["${key}"].checksum must be a string`);
  if (!isString(lastModified)) throw new Error(`manifest.files["${key}"].lastModified must be a string`);
  if (!isString(updateStrategy)) throw new Error(`manifest.files["${key}"].updateStrategy must be a string`);
  return { version, checksum, lastModified, updateStrategy };
}

/**
 * Parses raw JSON input into a typed AntiVibeManifest.
 * Throws a descriptive error if required fields are missing or invalid.
 * Pre-v5.3 manifests (without architectureProfile) parse without error (CA-10).
 *
 * @throws Error with field name when shape is invalid
 */
export function parseManifest(raw: unknown): AntiVibeManifest {
  if (!isRecord(raw)) {
    throw new Error("manifest must be a non-null object");
  }

  const { version, generatedAt, description, files, architectureProfile, architectureDetectorEnabled } = raw;

  if (!isString(version)) throw new Error("manifest.version must be a string");
  if (!isString(generatedAt)) throw new Error("manifest.generatedAt must be a string");
  if (!isString(description)) throw new Error("manifest.description must be a string");
  if (!isRecord(files)) throw new Error("manifest.files must be an object");

  const parsedFiles: Record<string, ManifestFile> = {};
  for (const [key, fileRaw] of Object.entries(files)) {
    parsedFiles[key] = parseManifestFile(fileRaw, key);
  }

  const result: AntiVibeManifest = {
    version,
    generatedAt,
    description,
    files: parsedFiles,
  };

  if (architectureDetectorEnabled !== undefined) {
    if (!isBoolean(architectureDetectorEnabled)) {
      throw new Error("manifest.architectureDetectorEnabled must be a boolean");
    }
    result.architectureDetectorEnabled = architectureDetectorEnabled;
  }

  if (architectureProfile !== undefined) {
    if (!isValidArchitectureProfile(architectureProfile)) {
      throw new Error(
        "manifest.architectureProfile is invalid: check profile name, confidence (0-100), signals (string[]), schemaVersion (>=1)"
      );
    }
    result.architectureProfile = architectureProfile;
  }

  return result;
}

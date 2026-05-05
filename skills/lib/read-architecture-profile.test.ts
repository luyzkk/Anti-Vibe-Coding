/**
 * Tests for readArchitectureProfile helper.
 *
 * Uses fixture manifests via the manifestPath override so no real
 * .anti-vibe-manifest.json is required during CI runs.
 */

import { describe, it, expect, test } from "bun:test";
import * as path from "path";
import { readArchitectureProfile, getRecommendationForProfile } from "./read-architecture-profile";
import type { ArchitectureProfileName } from "./manifest-types";

const FIXTURES = path.join(import.meta.dir, "__fixtures__");
const TRACER_BULLET = path.join(FIXTURES, "manifest-tracer-bullet.json");
const FLAG_OFF = path.join(FIXTURES, "manifest-flag-off.json");
const MISSING = path.join(FIXTURES, "manifest-does-not-exist.json");

const MANIFESTS = path.join(FIXTURES, "manifests");

describe("readArchitectureProfile", () => {
  // --- Original 4 tests (tracer bullet — must stay green) ---
  it("returns null when flag is false", () => {
    const result = readArchitectureProfile(FLAG_OFF);
    expect(result).toBeNull();
  });

  it("returns null when manifest is missing", () => {
    const result = readArchitectureProfile(MISSING);
    expect(result).toBeNull();
  });

  it("returns null when profile field is absent", () => {
    // FLAG_OFF fixture has no architectureProfile field
    const result = readArchitectureProfile(FLAG_OFF);
    expect(result).toBeNull();
  });

  it("returns parsed profile when flag true and profile valid", () => {
    const result = readArchitectureProfile(TRACER_BULLET);
    expect(result).not.toBeNull();
    expect(result?.profile).toBe("vertical-slice");
    expect(result?.confidence).toBe(100);
    expect(result?.signals).toContain("mock:tracer-bullet");
    expect(result?.schemaVersion).toBe(1);
  });

  // --- New tests: one per profile ---
  test("returns profile object for clean-architecture-ritual", () => {
    const profile = readArchitectureProfile(path.join(MANIFESTS, "clean-architecture-ritual.json"));
    expect(profile?.profile).toBe("clean-architecture-ritual");
    expect(profile?.confidence).toBeGreaterThanOrEqual(0);
  });

  test("returns profile object for mvc-flat", () => {
    const profile = readArchitectureProfile(path.join(MANIFESTS, "mvc-flat.json"));
    expect(profile?.profile).toBe("mvc-flat");
  });

  test("returns profile object for vertical-slice", () => {
    const profile = readArchitectureProfile(path.join(MANIFESTS, "vertical-slice.json"));
    expect(profile?.profile).toBe("vertical-slice");
  });

  test("returns profile object for nextjs-app-router", () => {
    const profile = readArchitectureProfile(path.join(MANIFESTS, "nextjs-app-router.json"));
    expect(profile?.profile).toBe("nextjs-app-router");
  });

  test("returns profile object for unknown-mixed", () => {
    const profile = readArchitectureProfile(path.join(MANIFESTS, "unknown-mixed.json"));
    expect(profile?.profile).toBe("unknown-mixed");
  });

  test("returns null when flag is disabled (CA-04 regression)", () => {
    expect(readArchitectureProfile(path.join(MANIFESTS, "flag-disabled.json"))).toBeNull();
  });

  test("returns null when architectureProfile field is missing (CA-10)", () => {
    expect(readArchitectureProfile(path.join(MANIFESTS, "no-profile.json"))).toBeNull();
  });

  test("returns null when manifest file does not exist", () => {
    expect(readArchitectureProfile(path.join(MANIFESTS, "nonexistent.json"))).toBeNull();
  });

  test("returns null when architectureProfile has invalid profile name (schema guard)", () => {
    expect(readArchitectureProfile(path.join(MANIFESTS, "invalid-profile.json"))).toBeNull();
  });
});

describe("getRecommendationForProfile", () => {
  const lookup: Record<ArchitectureProfileName, string> = {
    "clean-architecture-ritual": "A",
    "mvc-flat": "B",
    "vertical-slice": "C",
    "nextjs-app-router": "D",
    "unknown-mixed": "E",
  };

  test("returns lookup value for valid profile", () => {
    expect(getRecommendationForProfile("vertical-slice", lookup, "FALLBACK")).toBe("C");
  });

  test("returns fallback when profile is null", () => {
    expect(getRecommendationForProfile(null, lookup, "FALLBACK")).toBe("FALLBACK");
  });

  test("lookup table must have exactly 5 keys (G6 enforcement)", () => {
    expect(Object.keys(lookup).length).toBe(5);
  });
});

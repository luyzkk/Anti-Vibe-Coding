/**
 * Tests for readArchitectureProfile helper.
 *
 * Uses fixture manifests via the manifestPath override so no real
 * .anti-vibe-manifest.json is required during CI runs.
 */

import { describe, it, expect } from "bun:test";
import * as path from "path";
import { readArchitectureProfile } from "./read-architecture-profile";

const FIXTURES = path.join(import.meta.dir, "__fixtures__");
const TRACER_BULLET = path.join(FIXTURES, "manifest-tracer-bullet.json");
const FLAG_OFF = path.join(FIXTURES, "manifest-flag-off.json");
const MISSING = path.join(FIXTURES, "manifest-does-not-exist.json");

describe("readArchitectureProfile", () => {
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
});

/**
 * Compile-level verification that manifest-types exports are structurally correct.
 * All behavioral tests live in manifest-schema.test.ts (the runtime validators).
 */
import { describe, it, expect } from "bun:test";
import type { AntiVibeManifest, ArchitectureProfile, ArchitectureProfileName } from "./manifest-types";

describe("manifest-types", () => {
  it("ArchitectureProfileName union accepts all 5 valid profile names", () => {
    // This test verifies the union at the type level via explicit assignments.
    // If a profile name is removed from the union, TypeScript will error here.
    const names: ArchitectureProfileName[] = [
      "clean-architecture-ritual",
      "mvc-flat",
      "vertical-slice",
      "nextjs-app-router",
      "unknown-mixed",
    ];
    expect(names).toHaveLength(5);
  });

  it("AntiVibeManifest allows optional architectureProfile field (CA-10)", () => {
    // Structural check: pre-v5.3 manifest without architectureProfile is valid type.
    const preV53: AntiVibeManifest = {
      version: "5.2.0",
      generatedAt: "2026-04-21T00:00:00.000Z",
      description: "Pre-v5.3 manifest",
      files: {},
    };
    expect(preV53.architectureProfile).toBeUndefined();
    expect(preV53.architectureDetectorEnabled).toBeUndefined();
  });

  it("AntiVibeManifest accepts full v5.3 shape with architectureProfile", () => {
    const profile: ArchitectureProfile = {
      profile: "vertical-slice",
      confidence: 85,
      detectedAt: "2026-05-04T10:00:00.000Z",
      signals: ["folder:src/features/"],
      schemaVersion: 1,
    };
    const v53: AntiVibeManifest = {
      version: "5.3.0",
      generatedAt: "2026-05-04T10:00:00.000Z",
      description: "v5.3 manifest",
      files: {},
      architectureDetectorEnabled: false,
      architectureProfile: profile,
    };
    expect(v53.architectureProfile?.profile).toBe("vertical-slice");
    expect(v53.architectureProfile?.schemaVersion).toBe(1);
  });
});

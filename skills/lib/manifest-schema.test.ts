import { describe, it, expect } from "bun:test";
import { parseManifest, isValidArchitectureProfile } from "./manifest-schema";

describe("parseManifest", () => {
  it("parses manifest pre-v53 without architectureProfile field", () => {
    const raw = {
      version: "5.2.0",
      generatedAt: "2026-04-21T00:00:00.000Z",
      description: "Manifest de arquivos gerenciados pelo plugin Anti-Vibe Coding",
      files: {},
    };

    const result = parseManifest(raw);

    expect(result.version).toBe("5.2.0");
    expect(result.generatedAt).toBe("2026-04-21T00:00:00.000Z");
    expect(result.architectureProfile).toBeUndefined();
    expect(result.architectureDetectorEnabled).toBeUndefined();
  });

  it("parses manifest v53 with full architectureProfile", () => {
    const raw = {
      version: "5.3.0",
      generatedAt: "2026-05-04T10:00:00.000Z",
      description: "Manifest v5.3",
      files: {},
      architectureDetectorEnabled: true,
      architectureProfile: {
        profile: "vertical-slice",
        confidence: 85,
        detectedAt: "2026-05-04T10:00:00.000Z",
        signals: ["folder:src/features/", "import:cross-layer"],
        schemaVersion: 1,
      },
    };

    const result = parseManifest(raw);

    expect(result.version).toBe("5.3.0");
    expect(result.architectureDetectorEnabled).toBe(true);
    expect(result.architectureProfile?.profile).toBe("vertical-slice");
    expect(result.architectureProfile?.confidence).toBe(85);
    expect(result.architectureProfile?.signals).toEqual([
      "folder:src/features/",
      "import:cross-layer",
    ]);
    expect(result.architectureProfile?.schemaVersion).toBe(1);
  });

  it("rejects manifest with architectureProfile missing required fields", () => {
    const raw = {
      version: "5.3.0",
      generatedAt: "2026-05-04T10:00:00.000Z",
      description: "Manifest v5.3",
      files: {},
      architectureProfile: {
        profile: "vertical-slice",
        // missing: confidence, detectedAt, signals, schemaVersion
      },
    };

    expect(() => parseManifest(raw)).toThrow();
  });

  it("rejects architectureProfile with confidence outside 0-100 range", () => {
    const raw = {
      version: "5.3.0",
      generatedAt: "2026-05-04T10:00:00.000Z",
      description: "Manifest v5.3",
      files: {},
      architectureProfile: {
        profile: "vertical-slice",
        confidence: 150,
        detectedAt: "2026-05-04T10:00:00.000Z",
        signals: [],
        schemaVersion: 1,
      },
    };

    expect(() => parseManifest(raw)).toThrow();
  });

  it("rejects architectureProfile with unknown profile name", () => {
    const raw = {
      version: "5.3.0",
      generatedAt: "2026-05-04T10:00:00.000Z",
      description: "Manifest v5.3",
      files: {},
      architectureProfile: {
        profile: "hexagonal-ports-and-adapters",
        confidence: 80,
        detectedAt: "2026-05-04T10:00:00.000Z",
        signals: [],
        schemaVersion: 1,
      },
    };

    expect(() => parseManifest(raw)).toThrow();
  });

  it("accepts architectureProfile with empty signals array", () => {
    const raw = {
      version: "5.3.0",
      generatedAt: "2026-05-04T10:00:00.000Z",
      description: "Manifest v5.3",
      files: {},
      architectureProfile: {
        profile: "nextjs-app-router",
        confidence: 60,
        detectedAt: "2026-05-04T10:00:00.000Z",
        signals: [],
        schemaVersion: 1,
      },
    };

    const result = parseManifest(raw);

    expect(result.architectureProfile?.signals).toEqual([]);
  });

  it("rejects non-object input", () => {
    expect(() => parseManifest(null)).toThrow();
    expect(() => parseManifest("string")).toThrow();
    expect(() => parseManifest(42)).toThrow();
  });

  it("rejects manifest missing required version field", () => {
    const raw = {
      generatedAt: "2026-05-04T10:00:00.000Z",
      description: "Missing version",
      files: {},
    };

    expect(() => parseManifest(raw)).toThrow();
  });
});

describe("isValidArchitectureProfile", () => {
  it("returns true for valid full profile", () => {
    const value = {
      profile: "clean-architecture-ritual",
      confidence: 90,
      detectedAt: "2026-05-04T10:00:00.000Z",
      signals: ["folder:src/domain/"],
      schemaVersion: 1,
    };

    expect(isValidArchitectureProfile(value)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidArchitectureProfile(null)).toBe(false);
  });

  it("returns false for profile with confidence below 0", () => {
    const value = {
      profile: "mvc-flat",
      confidence: -1,
      detectedAt: "2026-05-04T10:00:00.000Z",
      signals: [],
      schemaVersion: 1,
    };

    expect(isValidArchitectureProfile(value)).toBe(false);
  });

  it("returns false for unknown profile name", () => {
    const value = {
      profile: "not-a-real-profile",
      confidence: 50,
      detectedAt: "2026-05-04T10:00:00.000Z",
      signals: [],
      schemaVersion: 1,
    };

    expect(isValidArchitectureProfile(value)).toBe(false);
  });

  it("returns false when signals is not an array", () => {
    const value = {
      profile: "unknown-mixed",
      confidence: 40,
      detectedAt: "2026-05-04T10:00:00.000Z",
      signals: "not-an-array",
      schemaVersion: 1,
    };

    expect(isValidArchitectureProfile(value)).toBe(false);
  });
});

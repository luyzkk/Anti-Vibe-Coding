import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderArchitectureProfileMarkdown } from "./profile-md-generator";
import type { ArchitectureProfile } from "./manifest-types";

const verticalSliceProfile: ArchitectureProfile = {
  profile: "vertical-slice",
  confidence: 87,
  detectedAt: "2026-05-04T12:00:00.000Z",
  signals: ["folder:src/features/", "import:cohesive-feature-module"],
  schemaVersion: 1,
};

const cleanArchProfile: ArchitectureProfile = {
  profile: "clean-architecture-ritual",
  confidence: 92,
  detectedAt: "2026-05-04T09:30:00.000Z",
  signals: [
    "folder:src/domain/",
    "folder:src/application/",
    "folder:src/infrastructure/",
  ],
  schemaVersion: 1,
};

describe("renderArchitectureProfileMarkdown", () => {
  it("renders header with profile name and confidence", () => {
    const result = renderArchitectureProfileMarkdown(verticalSliceProfile);
    expect(result).toContain("# Architecture Profile");
    expect(result).toContain("**Profile:** vertical-slice (87% confidence)");
  });

  it("renders all signals in input order without re-sorting", () => {
    const profileWithSignals: ArchitectureProfile = {
      profile: "mvc-flat",
      confidence: 70,
      detectedAt: "2026-05-04T10:00:00.000Z",
      signals: ["z-signal", "a-signal", "m-signal"],
      schemaVersion: 1,
    };
    const result = renderArchitectureProfileMarkdown(profileWithSignals);
    const signalSection = result.split("## Signals")[1] ?? "";
    const zIdx = signalSection.indexOf("z-signal");
    const aIdx = signalSection.indexOf("a-signal");
    const mIdx = signalSection.indexOf("m-signal");
    expect(zIdx).toBeLessThan(aIdx);
    expect(aIdx).toBeLessThan(mIdx);
  });

  it("renders ISO timestamp plus human-readable form", () => {
    const result = renderArchitectureProfileMarkdown(verticalSliceProfile);
    expect(result).toContain("**Detected at:** 2026-05-04 12:00 UTC");
  });

  it("renders link to profile-specific docs section", () => {
    const result = renderArchitectureProfileMarkdown(verticalSliceProfile);
    expect(result).toContain(
      "[vertical-slice profile](../anti-vibe-coding/docs/architecture-profiles.md#vertical-slice)"
    );
  });

  it("produces identical output for identical input across calls (deterministic)", () => {
    const first = renderArchitectureProfileMarkdown(verticalSliceProfile);
    const second = renderArchitectureProfileMarkdown(verticalSliceProfile);
    expect(first).toBe(second);
  });

  it("handles empty signals array with explicit no-signals note", () => {
    const profileNoSignals: ArchitectureProfile = {
      profile: "unknown-mixed",
      confidence: 40,
      detectedAt: "2026-05-04T08:00:00.000Z",
      signals: [],
      schemaVersion: 1,
    };
    const result = renderArchitectureProfileMarkdown(profileNoSignals);
    expect(result).toContain("_No signals recorded._");
  });

  it("matches snapshot for vertical-slice fixture", () => {
    const result = renderArchitectureProfileMarkdown(verticalSliceProfile);
    const fixture = readFileSync(
      join(import.meta.dir, "__fixtures__/profile-vertical-slice.expected.md"),
      "utf8"
    );
    expect(result).toBe(fixture);
  });

  it("matches snapshot for clean-architecture-ritual fixture", () => {
    const result = renderArchitectureProfileMarkdown(cleanArchProfile);
    const fixture = readFileSync(
      join(
        import.meta.dir,
        "__fixtures__/profile-clean-arch-ritual.expected.md"
      ),
      "utf8"
    );
    expect(result).toBe(fixture);
  });
});

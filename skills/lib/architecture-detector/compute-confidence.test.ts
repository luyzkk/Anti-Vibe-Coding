import { describe, expect, test } from "bun:test";
import { computeConfidence } from "./compute-confidence";
import type { FolderClassification, ImportSampling } from "./types";

describe("computeConfidence", () => {
  test("boosts confidence when folder and imports agree", () => {
    const folder: FolderClassification = {
      profile: "clean-architecture-ritual",
      preliminaryScore: 70,
      signals: [],
      alternativeProfiles: [],
    };
    const imports: ImportSampling = {
      filesSampled: 5,
      signals: [],
      profileVotes: { "clean-architecture-ritual": 4 },
    };
    const { confidence, finalProfile } = computeConfidence(folder, imports);
    expect(confidence).toBe(100); // 70 + 30
    expect(finalProfile).toBe("clean-architecture-ritual");
  });

  test("penalizes confidence when folder says A but imports say B", () => {
    const folder: FolderClassification = {
      profile: "mvc-flat",
      preliminaryScore: 80,
      signals: [],
      alternativeProfiles: [],
    };
    const imports: ImportSampling = {
      filesSampled: 5,
      signals: [],
      profileVotes: { "clean-architecture-ritual": 3 },
    };
    const { confidence, finalProfile } = computeConfidence(folder, imports);
    expect(confidence).toBe(60); // 80 - 20
    expect(finalProfile).toBe("mvc-flat"); // folder wins on divergence
  });

  test("keeps folder score unchanged when imports inconclusive (< 2 votes)", () => {
    const folder: FolderClassification = {
      profile: "vertical-slice",
      preliminaryScore: 75,
      signals: [],
      alternativeProfiles: [],
    };
    const imports: ImportSampling = {
      filesSampled: 5,
      signals: [],
      profileVotes: { "vertical-slice": 1 },
    };
    const { confidence } = computeConfidence(folder, imports);
    expect(confidence).toBe(75);
  });

  test("floors divergence penalty at FLOOR_ON_DIVERGENCE", () => {
    const folder: FolderClassification = {
      profile: "unknown-mixed",
      preliminaryScore: 50,
      signals: [],
      alternativeProfiles: [],
    };
    const imports: ImportSampling = {
      filesSampled: 5,
      signals: [],
      profileVotes: { "mvc-flat": 3 },
    };
    const { confidence } = computeConfidence(folder, imports);
    expect(confidence).toBeGreaterThanOrEqual(40); // floor
  });

  test("returns confidence <= 100 even when folder score is high", () => {
    const folder: FolderClassification = {
      profile: "nextjs-app-router",
      preliminaryScore: 90,
      signals: [],
      alternativeProfiles: [],
    };
    const imports: ImportSampling = {
      filesSampled: 5,
      signals: [],
      profileVotes: { "nextjs-app-router": 5 },
    };
    const { confidence } = computeConfidence(folder, imports);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  test("keeps folder score unchanged when profileVotes is empty", () => {
    const folder: FolderClassification = {
      profile: "mvc-flat",
      preliminaryScore: 60,
      signals: [],
      alternativeProfiles: [],
    };
    const imports: ImportSampling = {
      filesSampled: 3,
      signals: [],
      profileVotes: {},
    };
    const { confidence, finalProfile } = computeConfidence(folder, imports);
    expect(confidence).toBe(60);
    expect(finalProfile).toBe("mvc-flat");
  });
});

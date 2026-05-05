import { describe, expect, test } from "bun:test";
import type {
  Profile,
  SrcTreeNode,
  FolderSignal,
  FolderClassification,
  ImportSignal,
  ImportSampling,
  DetectionResult,
} from "./types";

describe("types", () => {
  test("Profile union covers exactly 5 canonical profiles", () => {
    const profiles: Profile[] = [
      "clean-architecture-ritual",
      "mvc-flat",
      "vertical-slice",
      "nextjs-app-router",
      "unknown-mixed",
    ];
    expect(profiles).toHaveLength(5);
  });

  test("SrcTreeNode accepts dir with children", () => {
    const node: SrcTreeNode = {
      path: "src",
      type: "dir",
      children: [{ path: "domain", type: "dir" }],
    };
    expect(node.path).toBe("src");
    expect(node.children).toHaveLength(1);
  });

  test("FolderSignal has pattern, matched and weight fields", () => {
    const signal: FolderSignal = {
      pattern: "pasta domain/ com agregados",
      matched: true,
      weight: 30,
    };
    expect(signal.matched).toBe(true);
    expect(signal.weight).toBe(30);
  });

  test("FolderClassification has profile, score, signals and alternativeProfiles", () => {
    const classification: FolderClassification = {
      profile: "clean-architecture-ritual",
      preliminaryScore: 90,
      signals: [],
      alternativeProfiles: [
        { profile: "vertical-slice", score: 20 },
        { profile: "mvc-flat", score: 10 },
      ],
    };
    expect(classification.profile).toBe("clean-architecture-ritual");
    expect(classification.alternativeProfiles).toHaveLength(2);
  });

  test("ImportSignal accepts null matchedProfile for no-match entries", () => {
    const signal: ImportSignal = {
      filePath: "src/utils/helper.ts",
      pattern: "no-match",
      matchedProfile: null,
    };
    expect(signal.matchedProfile).toBeNull();
    expect(signal.pattern).toBe("no-match");
  });

  test("ImportSampling profileVotes is a partial record", () => {
    const sampling: ImportSampling = {
      filesSampled: 5,
      signals: [],
      profileVotes: { "clean-architecture-ritual": 3, "mvc-flat": 1 },
    };
    expect(sampling.filesSampled).toBe(5);
    expect(sampling.profileVotes["clean-architecture-ritual"]).toBe(3);
  });

  test("DetectionResult has confidence in 0..100 and detectedAt as string", () => {
    const result: DetectionResult = {
      profile: "nextjs-app-router",
      confidence: 85,
      detectedAt: new Date().toISOString(),
      signals: { folderSignals: [], importSignals: [] },
      alternativeProfiles: [],
    };
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(typeof result.detectedAt).toBe("string");
  });
});

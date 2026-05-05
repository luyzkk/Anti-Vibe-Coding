import { describe, expect, test } from "bun:test";
import type { Profile, SrcTreeNode, FolderSignal, FolderClassification } from "./types";

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
});

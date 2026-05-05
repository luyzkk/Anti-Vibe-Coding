import { describe, expect, test } from "bun:test";
import { classifyByFolders } from "./classify-by-folders";
import {
  TREE_CLEAN_ARCH,
  TREE_NEXTJS,
  TREE_VERTICAL_SLICE,
  TREE_MVC_FLAT,
  TREE_UNKNOWN,
  TREE_AMBIGUOUS_NEXTJS_AND_FEATURES,
} from "./__fixtures__/folder-trees";

describe("classifyByFolders", () => {
  test("classifies clean-architecture-ritual when domain+application+infra+presentation present", () => {
    const result = classifyByFolders(TREE_CLEAN_ARCH);
    expect(result.profile).toBe("clean-architecture-ritual");
    expect(result.preliminaryScore).toBeGreaterThanOrEqual(80);
  });

  test("classifies nextjs-app-router when app/page.tsx present", () => {
    const result = classifyByFolders(TREE_NEXTJS);
    expect(result.profile).toBe("nextjs-app-router");
  });

  test("prefers nextjs-app-router over vertical-slice when both have folder patterns (G1)", () => {
    const result = classifyByFolders(TREE_AMBIGUOUS_NEXTJS_AND_FEATURES);
    expect(result.profile).toBe("nextjs-app-router");
  });

  test("returns unknown-mixed when no pattern matches", () => {
    const result = classifyByFolders(TREE_UNKNOWN);
    expect(result.profile).toBe("unknown-mixed");
    expect(result.preliminaryScore).toBeLessThan(60);
  });

  test("preserves alternativeProfiles top-2 sorted by score desc", () => {
    const result = classifyByFolders(TREE_CLEAN_ARCH);
    expect(result.alternativeProfiles).toHaveLength(2);
    expect(result.alternativeProfiles[0]!.score).toBeGreaterThanOrEqual(
      result.alternativeProfiles[1]!.score
    );
  });
});

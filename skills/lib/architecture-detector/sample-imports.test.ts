import { describe, expect, test } from "bun:test";
import { sampleImports } from "./sample-imports";
import {
  TREE_CLEAN_ARCH,
  TREE_NEXTJS,
  TREE_MVC_FLAT,
  TREE_VERTICAL_SLICE,
} from "./__fixtures__/folder-trees";
import {
  FILES_CLEAN_ARCH,
  FILES_NEXTJS,
  FILES_MVC_FLAT,
  FILES_VERTICAL_SLICE,
} from "./__fixtures__/sample-files";

describe("sampleImports", () => {
  test("detects clean-architecture-ritual via imports of @/domain and @/application", () => {
    const reader = (path: string) => FILES_CLEAN_ARCH[path] ?? "";
    const result = sampleImports(TREE_CLEAN_ARCH, reader);
    expect(result.profileVotes["clean-architecture-ritual"]).toBeGreaterThanOrEqual(2);
  });

  test("reads at most MAX_LINES_READ lines per file (G5)", () => {
    // Import on line 2001 must NOT be detected — only first 100 lines are read
    const longFile = "\n".repeat(2000) + "import x from '@/domain/foo'";
    const reader = () => longFile;
    const result = sampleImports(TREE_CLEAN_ARCH, reader);
    expect(result.profileVotes["clean-architecture-ritual"] ?? 0).toBe(0);
  });

  test("respects MIN_SAMPLES floor and MAX_SAMPLES ceiling", () => {
    const reader = () => "export const x = 1";
    const result = sampleImports(TREE_CLEAN_ARCH, reader);
    expect(result.filesSampled).toBeGreaterThanOrEqual(5);
    expect(result.filesSampled).toBeLessThanOrEqual(10);
  });

  test("detects nextjs-app-router via next/navigation import", () => {
    const reader = (path: string) => FILES_NEXTJS[path] ?? "";
    const result = sampleImports(TREE_NEXTJS, reader);
    expect(result.profileVotes["nextjs-app-router"]).toBeGreaterThanOrEqual(1);
  });

  test("signals no-match for files with no recognized import pattern", () => {
    const reader = () => "export const x = 1";
    const result = sampleImports(TREE_CLEAN_ARCH, reader);
    const noMatchSignals = result.signals.filter((s) => s.pattern === "no-match");
    expect(noMatchSignals.length).toBeGreaterThan(0);
  });

  test("candidates sorted alphabetically for determinism", () => {
    const calls: string[] = [];
    const reader = (path: string) => {
      calls.push(path);
      return "export const x = 1";
    };
    sampleImports(TREE_CLEAN_ARCH, reader);
    const sorted = [...calls].sort();
    expect(calls).toEqual(sorted);
  });
});

import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { SrcTreeNode } from "./types";

const SRC_CANDIDATES = ["src", "app", "lib"] as const;
const MONOREPO_MARKERS = ["packages", "apps"] as const;
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
]);

export type ReadSrcTreeResult =
  | { kind: "ok"; root: string; tree: SrcTreeNode }
  | { kind: "monorepo"; markerDir: string }
  | { kind: "no-src"; cwd: string };

/**
 * Reads the source tree from the given project root directory.
 *
 * Handles:
 * - G3 (monorepo): if packages/ or apps/ found at root, signals gracefully.
 *   Does NOT classify as unknown-mixed silently (OQ10 from README).
 * - G6 (src/ absent): tries src/ → app/ → lib/ in order.
 *   If none found, returns no-src so the caller can ask the user.
 *   We do NOT run heuristics on the raw cwd root — too much noise.
 */
export function readSrcTree(cwd: string): ReadSrcTreeResult {
  // G3: monorepo — check before src/ candidates
  for (const marker of MONOREPO_MARKERS) {
    if (existsSync(join(cwd, marker))) {
      return { kind: "monorepo", markerDir: marker };
    }
  }

  // G6: try canonical src candidates in order
  for (const candidate of SRC_CANDIDATES) {
    const full = join(cwd, candidate);
    if (existsSync(full) && statSync(full).isDirectory()) {
      return { kind: "ok", root: full, tree: walk(full, candidate) };
    }
  }

  return { kind: "no-src", cwd };
}

function walk(absPath: string, relPath: string): SrcTreeNode {
  const stat = statSync(absPath);
  if (!stat.isDirectory()) return { path: relPath, type: "file" };

  const children = readdirSync(absPath)
    .filter((name) => !IGNORE_DIRS.has(name))
    .map((name) => walk(join(absPath, name), name));

  return { path: relPath, type: "dir", children };
}

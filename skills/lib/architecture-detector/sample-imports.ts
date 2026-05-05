import type { SrcTreeNode, ImportSampling, ImportSignal, Profile } from "./types";

// Injected by callers — keeps this module free of fs IO and fully testable
export type FileReader = (path: string) => string;

// G5: never read more than 100 lines per file — imports always appear at the top
export const MAX_LINES_READ = 100;
const MIN_SAMPLES = 5;
const MAX_SAMPLES = 10;

type ImportPattern = {
  regex: RegExp;
  profile: Profile;
  description: string;
};

const IMPORT_PATTERNS: ImportPattern[] = [
  // clean-architecture-ritual: imports crossing layers (presentation -> application -> domain)
  {
    regex: /from\s+['"]@?\/?(?:domain|application)\/.+['"]/,
    profile: "clean-architecture-ritual",
    description: "imports de @/domain ou @/application",
  },
  {
    regex: /from\s+['"]\.\.\?\/(?:domain|application|use-cases)\//,
    profile: "clean-architecture-ritual",
    description: "imports relativos para camadas",
  },

  // mvc-flat: controllers importing services/models directly
  {
    regex: /from\s+['"]@?\/?(?:controllers|services|repositories|models)\/.+['"]/,
    profile: "mvc-flat",
    description: "imports de controllers/services/models flat",
  },

  // vertical-slice: imports from features/<X>/<internal-layer> or shared/
  {
    regex: /from\s+['"]@?\/?(?:features|modules)\/[^/]+\/(?:domain|api|data|ui)/,
    profile: "vertical-slice",
    description: "imports de features/<X>/<camada-interna>",
  },
  {
    regex: /from\s+['"]@?\/?shared\//,
    profile: "vertical-slice",
    description: "imports de shared/",
  },

  // nextjs-app-router: next/* imports and 'use client'/'use server' directives
  {
    regex: /from\s+['"]next\/(?:navigation|server|headers|cache)['"]/,
    profile: "nextjs-app-router",
    description: "imports next/server, next/navigation",
  },
  {
    regex: /^['"]use\s+(?:client|server)['"]/m,
    profile: "nextjs-app-router",
    description: "directive 'use client' / 'use server'",
  },
];

/**
 * Samples up to MAX_SAMPLES representative files from the src tree, reads their
 * first MAX_LINES_READ lines (G5 performance guard), and tallies import pattern
 * votes per architecture profile.
 *
 * `readFile` is injected so the function stays pure and testable without fs IO.
 */
export function sampleImports(srcTree: SrcTreeNode, readFile: FileReader): ImportSampling {
  const candidates = pickCandidates(srcTree);
  const clamped = Math.min(MAX_SAMPLES, Math.max(MIN_SAMPLES, candidates.length));
  const sampled = candidates.slice(0, clamped);

  const signals: ImportSignal[] = [];
  const votes: Partial<Record<Profile, number>> = {};

  for (const filePath of sampled) {
    const raw = readFile(filePath);
    // G5: only inspect first MAX_LINES_READ lines — imports live at the top
    const content = raw.split("\n").slice(0, MAX_LINES_READ).join("\n");

    let fileMatched = false;

    for (const { regex, profile, description } of IMPORT_PATTERNS) {
      if (regex.test(content)) {
        signals.push({ filePath, pattern: description, matchedProfile: profile });
        votes[profile] = (votes[profile] ?? 0) + 1;
        fileMatched = true;
      }
    }

    // File read but no recognized pattern: still record as sampled
    if (!fileMatched) {
      signals.push({ filePath, pattern: "no-match", matchedProfile: null });
    }
  }

  return { filesSampled: sampled.length, signals, profileVotes: votes };
}

/**
 * Collects .ts/.tsx files at depth 2–3 (relative to root), excluding index files
 * and test files. Results are sorted alphabetically to ensure deterministic ordering
 * — avoids non-reproducible test behavior from Set or Map iteration order.
 */
function pickCandidates(node: SrcTreeNode, prefix = "", depth = 0): string[] {
  if (node.type === "file") {
    if (depth >= 2 && depth <= 3) {
      const fullPath = prefix ? `${prefix}/${node.path}` : node.path;
      if (/\.(ts|tsx)$/.test(node.path) && !/^index\.|\.test\./.test(node.path)) {
        return [fullPath];
      }
    }
    return [];
  }

  const here = prefix ? `${prefix}/${node.path}` : node.path;
  const childResults = (node.children ?? [])
    .flatMap((c) => pickCandidates(c, here, depth + 1));

  // Sort alphabetically for determinism (Gotcha: Set/Map order not guaranteed)
  return childResults.sort();
}

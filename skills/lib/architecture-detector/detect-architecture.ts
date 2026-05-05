import type { SrcTreeNode, DetectionResult } from "./types";
import { classifyByFolders } from "./classify-by-folders";
import { sampleImports, type FileReader } from "./sample-imports";
import { computeConfidence } from "./compute-confidence";

/**
 * Pure orchestrator: combines classifyByFolders + sampleImports + computeConfidence
 * into a single DetectionResult.
 *
 * WHY pure (no direct IO): keeps this function fully testable with fixtures.
 * IO is handled by the caller (SKILL.md flow or read-src-tree.ts).
 */
export function detectArchitecture(
  srcTree: SrcTreeNode,
  readFile: FileReader,
): DetectionResult {
  const folder = classifyByFolders(srcTree);
  const imports = sampleImports(srcTree, readFile);
  const { confidence, finalProfile } = computeConfidence(folder, imports);

  return {
    profile: finalProfile,
    confidence,
    detectedAt: new Date().toISOString(),
    signals: {
      folderSignals: folder.signals,
      importSignals: imports.signals,
    },
    alternativeProfiles: folder.alternativeProfiles,
  };
}

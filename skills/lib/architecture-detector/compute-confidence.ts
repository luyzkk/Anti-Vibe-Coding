import type { FolderClassification, ImportSampling, Profile } from "./types";

// WHY: concordance between folder structure and import patterns is strong evidence —
// both structural (how folders are named) and behavioral (what code actually imports)
// agree, so we reward with a significant boost.
const CONCORDANCE_BOOST = 30;

// WHY: divergence means imports contradict folder structure. Folder layout is the
// more stable, intentional signal (teams choose architecture consciously). Imports
// may be legacy noise (one old controller still using services flat). We penalize
// but keep the folder profile as winner.
const DIVERGENCE_PENALTY = 20;

// WHY: 1 import vote is too weak to be meaningful — could be a shared utility or
// legacy file. Require at least 2 to consider imports as a signal worth adjusting for.
const MIN_VOTES_FOR_ADJUSTMENT = 2;

// WHY: even on divergence, we shouldn't drop below 40 — some architecture was
// detected by folders. Prevents overpenalizing ambiguous projects.
const FLOOR_ON_DIVERGENCE = 40;

type ConfidenceResult = {
  confidence: number;
  finalProfile: Profile;
};

/**
 * Combines folder classification and import sampling into a final confidence score.
 *
 * Rules (explicit, per spec):
 * - Folder and imports agree on same profile → confidence = min(100, folderScore + CONCORDANCE_BOOST)
 * - Folder and imports diverge (imports have ≥ MIN_VOTES_FOR_ADJUSTMENT) → confidence = max(FLOOR_ON_DIVERGENCE, folderScore - DIVERGENCE_PENALTY)
 * - Imports inconclusive (< MIN_VOTES_FOR_ADJUSTMENT total votes for top profile) → confidence = folderScore unchanged
 *
 * On divergence, folder always wins as finalProfile — it is the more structural signal.
 */
export function computeConfidence(
  folder: FolderClassification,
  imports: ImportSampling,
): ConfidenceResult {
  const sortedVotes = (
    Object.entries(imports.profileVotes) as Array<[Profile, number]>
  ).sort(([, a], [, b]) => b - a);

  const topImportProfile = sortedVotes[0]?.[0] ?? null;
  const topImportVotes = sortedVotes[0]?.[1] ?? 0;

  // Imports inconclusive: not enough signal to adjust the folder result
  if (topImportVotes < MIN_VOTES_FOR_ADJUSTMENT) {
    return { confidence: folder.preliminaryScore, finalProfile: folder.profile };
  }

  // Concordance: folder and imports agree — boost confidence
  if (topImportProfile === folder.profile) {
    return {
      confidence: Math.min(100, folder.preliminaryScore + CONCORDANCE_BOOST),
      finalProfile: folder.profile,
    };
  }

  // Divergence: imports disagree with folder structure.
  // WHY folder wins: folder layout is a deliberate architectural decision; import
  // patterns can be legacy noise from partial migrations or cross-cutting utilities.
  return {
    confidence: Math.max(FLOOR_ON_DIVERGENCE, folder.preliminaryScore - DIVERGENCE_PENALTY),
    finalProfile: folder.profile,
  };
}

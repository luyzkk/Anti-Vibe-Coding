/**
 * Shared types for the architecture detector (phases 01–05).
 * See types.md for full documentation.
 */

export type Profile =
  | "clean-architecture-ritual"
  | "mvc-flat"
  | "vertical-slice"
  | "nextjs-app-router"
  | "unknown-mixed";

export type SrcTreeNode = {
  path: string;
  type: "dir" | "file";
  children?: SrcTreeNode[];
};

export type FolderSignal = {
  pattern: string;
  matched: boolean;
  weight: number;
};

export type FolderClassification = {
  profile: Profile;
  preliminaryScore: number;
  signals: FolderSignal[];
  alternativeProfiles: Array<{ profile: Profile; score: number }>;
};

export type ImportSignal = {
  filePath: string;
  // Human-readable description of the import pattern matched (or 'no-match')
  pattern: string;
  // Profile suggested by this import; null when no pattern matched
  matchedProfile: Profile | null;
};

export type ImportSampling = {
  filesSampled: number;
  signals: ImportSignal[];
  // Vote count per profile — tallied from all matched import patterns
  profileVotes: Partial<Record<Profile, number>>;
};

export type DetectionResult = {
  profile: Profile;
  // 0..100 final confidence combining folder + import heuristics
  confidence: number;
  // ISO 8601 timestamp of detection
  detectedAt: string;
  signals: {
    folderSignals: FolderSignal[];
    importSignals: ImportSignal[];
  };
  alternativeProfiles: Array<{ profile: Profile; score: number }>;
};

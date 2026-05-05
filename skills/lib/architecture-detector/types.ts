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

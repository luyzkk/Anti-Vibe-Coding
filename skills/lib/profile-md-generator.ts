import type { ArchitectureProfile } from "./manifest-types";

/**
 * Generates the human-readable markdown for `.claude/architecture-profile.md`
 * from a structured ArchitectureProfile. Pure function — no I/O.
 *
 * Output lives at `.claude/architecture-profile.md` in the consumer project.
 * The link to profile docs uses a relative path from `.claude/`:
 *   `../anti-vibe-coding/docs/architecture-profiles.md#<profile>`
 *
 * Signal order is preserved from input (not sorted) — order reflects detection
 * priority and is semantically meaningful.
 *
 * @example
 *   const md = renderArchitectureProfileMarkdown({
 *     profile: "vertical-slice",
 *     confidence: 87,
 *     detectedAt: "2026-05-04T12:00:00.000Z",
 *     signals: ["folder:src/features/", "import:cohesive-feature-module"],
 *     schemaVersion: 1,
 *   });
 *   // → "# Architecture Profile\n\n**Profile:** vertical-slice (87% confidence)\n..."
 */
export function renderArchitectureProfileMarkdown(
  profile: ArchitectureProfile
): string {
  return [
    renderHeader(profile),
    renderSignals(profile.signals),
    renderManualReview(),
    renderProfileDocs(profile.profile),
  ].join("\n\n");
}

function renderHeader(profile: ArchitectureProfile): string {
  const humanTimestamp = formatTimestamp(profile.detectedAt);
  return [
    "# Architecture Profile",
    "",
    `**Profile:** ${profile.profile} (${profile.confidence}% confidence)`,
    `**Detected at:** ${humanTimestamp}`,
  ].join("\n");
}

function renderSignals(signals: string[]): string {
  const body =
    signals.length === 0
      ? "_No signals recorded._"
      : signals.map((s) => `- ${s}`).join("\n");
  return `## Signals\n\n${body}`;
}

function renderManualReview(): string {
  return [
    "## Manual review",
    "",
    "If this classification looks wrong, edit this file or run",
    "`/anti-vibe-coding:detect-architecture --set <profile>`.",
  ].join("\n");
}

function renderProfileDocs(profileName: string): string {
  const link = `[${profileName} profile](../anti-vibe-coding/docs/architecture-profiles.md#${profileName})`;
  return `## Profile documentation\n\nSee ${link}.`;
}

/**
 * Formats an ISO 8601 timestamp to "YYYY-MM-DD HH:MM UTC".
 * Pure — no Date.now(), input drives everything.
 */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

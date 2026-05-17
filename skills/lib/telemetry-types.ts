export type ArchitectureProfileName =
  | "clean-architecture-ritual"
  | "mvc-flat"
  | "vertical-slice"
  | "nextjs-app-router"
  | "unknown-mixed";

export type FasePipeline =
  | "grill-me"
  | "write-prd"
  | "plan-feature"
  | "execute-plan"
  | "verify-work"
  | "iterate"
  | "consultant"
  | "architecture"
  | "design-twice"
  | "quick-plan";

interface BaseTelemetryEntry {
  evento: "start" | "end";
  skill_invocada: string;
  timestamp_inicio: string;
  profile_arquitetura: ArchitectureProfileName | "unknown" | "disabled";
  fase_pipeline: FasePipeline;
}

export interface TelemetryStart extends BaseTelemetryEntry {
  evento: "start";
}

export interface TelemetryEnd extends BaseTelemetryEntry {
  evento: "end";
  timestamp_fim: string;
  duracao_ms: number;
  tokens_aproximados_consumidos: number;
  arquivos_lidos: number;
  arquivos_modificados: number;
  sucesso: boolean;
  error_message?: string;
}

export type TelemetryEntry = TelemetryStart | TelemetryEnd;

// 2026-05-16 (Luiz/dev): tipos dedicados para eventos auxiliares do /init — RF9.
// DI-6 (Plano 02 fase-04): tipo dedicado em vez de reusar TelemetryStart/TelemetryEnd (G8).
// Justificativa: eventos de dominio nao tem duracao_ms, fase_pipeline, timestamp_inicio — campos nao-aplicaveis.
// Wave 4 D5/GT-4: Pipeline events = TelemetryEntry; consumers que precisam de TODOS os eventos usam AnyTelemetryEntry.
// pair-events.ts aceita AnyTelemetryEntry[] e filtra internamente para pipeline events (start/end).

export interface TelemetryStackDetected {
  evento: "stack_detected";
  skill_invocada: "init";
  timestamp: string;            // ISO 8601 UTC
  primary: string | null;       // matrix folder name ou null (CA-06 — stack nao detectada)
  secondary: string[];
  anchor_files: string[];
}

export interface TelemetryKnowledgeCopied {
  evento: "knowledge_copied";
  skill_invocada: "init";
  timestamp: string;
  stack: string | null;         // primary que foi (tentou ser) copiado
  atom_count: number;
  status: "copied" | "skipped" | "refreshed" | "no-matrix" | "no-source";
}

export type TelemetryDomainEvent = TelemetryStackDetected | TelemetryKnowledgeCopied;

/**
 * Union of all telemetry events (pipeline + domain).
 * Use this when consuming raw JSONL that may contain mixed event types.
 * Pipeline-only consumers use TelemetryEntry; pair-events.ts filters to pipeline events internally.
 *
 * IMPORTANT: Pipeline entries use `timestamp_inicio`; domain entries use `timestamp`.
 * Consumers MUST narrow with `isPipelineEntry` / `isDomainEntry` before accessing timestamp fields.
 * Use `getEntryTimestamp` as a convenience helper when you only need the timestamp value.
 */
export type AnyTelemetryEntry = TelemetryEntry | TelemetryDomainEvent;

// H2.3 (2026-05-17): type guards for AnyTelemetryEntry narrow — Wave 4 telemetry heterogeneous JSONL.
// Pipeline events (start/end) use timestamp_inicio; domain events use timestamp.
// These guards ensure consumers narrow before accessing timestamp fields.

/** Returns true when entry is a pipeline event (start or end). Narrows to TelemetryStart | TelemetryEnd. */
export function isPipelineEntry(e: AnyTelemetryEntry): e is TelemetryStart | TelemetryEnd {
  return e.evento === 'start' || e.evento === 'end'
}

/** Returns true when entry is a domain event (stack_detected or knowledge_copied). Narrows to TelemetryDomainEvent. */
export function isDomainEntry(e: AnyTelemetryEntry): e is TelemetryDomainEvent {
  return e.evento === 'stack_detected' || e.evento === 'knowledge_copied'
}

/**
 * Returns the timestamp for any entry type, selecting the correct field per event kind.
 * Use instead of accessing `timestamp_inicio` / `timestamp` directly on AnyTelemetryEntry.
 */
export function getEntryTimestamp(e: AnyTelemetryEntry): string {
  if (isPipelineEntry(e)) return e.timestamp_inicio
  return e.timestamp
}

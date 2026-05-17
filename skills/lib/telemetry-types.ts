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
 */
export type AnyTelemetryEntry = TelemetryEntry | TelemetryDomainEvent;

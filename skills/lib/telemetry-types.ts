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

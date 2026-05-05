import type { TelemetryEntry, TelemetryStart, TelemetryEnd, FasePipeline, ArchitectureProfileName } from "./telemetry-types";

const VALID_EVENTOS = new Set(["start", "end"]);

const VALID_PROFILES = new Set<string>([
  "clean-architecture-ritual",
  "mvc-flat",
  "vertical-slice",
  "nextjs-app-router",
  "unknown-mixed",
  "unknown",
  "disabled",
]);

const VALID_FASES = new Set<string>([
  "grill-me", "write-prd", "plan-feature", "execute-plan",
  "verify-work", "iterate", "consultant", "architecture",
  "design-twice", "quick-plan",
]);

function requireString(obj: Record<string, unknown>, field: string): string {
  const val = obj[field];
  if (typeof val !== "string" || val.length === 0) {
    throw new Error(`campo obrigatorio "${field}" ausente ou invalido`);
  }
  return val;
}

function requireNumber(obj: Record<string, unknown>, field: string): number {
  const val = obj[field];
  if (typeof val !== "number") {
    throw new Error(`campo obrigatorio "${field}" ausente ou deve ser numero`);
  }
  return val;
}

function requireBoolean(obj: Record<string, unknown>, field: string): boolean {
  const val = obj[field];
  if (typeof val !== "boolean") {
    throw new Error(`campo obrigatorio "${field}" ausente ou deve ser booleano`);
  }
  return val;
}

export function parseTelemetryEntry(raw: unknown): TelemetryEntry {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("entrada de telemetria deve ser um objeto");
  }

  const obj = raw as Record<string, unknown>;

  const evento = requireString(obj, "evento");
  if (!VALID_EVENTOS.has(evento)) {
    throw new Error(`campo "evento" deve ser "start" ou "end", recebeu "${evento}"`);
  }

  const skill_invocada = requireString(obj, "skill_invocada");
  const timestamp_inicio = requireString(obj, "timestamp_inicio");

  const profile_raw = requireString(obj, "profile_arquitetura");
  if (!VALID_PROFILES.has(profile_raw)) {
    throw new Error(`campo "profile_arquitetura" invalido: "${profile_raw}"`);
  }
  const profile_arquitetura = profile_raw as ArchitectureProfileName | "unknown" | "disabled";

  const fase_raw = requireString(obj, "fase_pipeline");
  if (!VALID_FASES.has(fase_raw)) {
    throw new Error(`campo "fase_pipeline" invalido: "${fase_raw}"`);
  }
  const fase_pipeline = fase_raw as FasePipeline;

  if (evento === "start") {
    if ("timestamp_fim" in obj) {
      throw new Error(`linha "start" nao pode conter "timestamp_fim"`);
    }
    const entry: TelemetryStart = {
      evento: "start",
      skill_invocada,
      timestamp_inicio,
      profile_arquitetura,
      fase_pipeline,
    };
    return entry;
  }

  // evento === "end"
  const timestamp_fim = requireString(obj, "timestamp_fim");
  const duracao_ms = requireNumber(obj, "duracao_ms");
  const tokens_aproximados_consumidos = requireNumber(obj, "tokens_aproximados_consumidos");
  const arquivos_lidos = requireNumber(obj, "arquivos_lidos");
  const arquivos_modificados = requireNumber(obj, "arquivos_modificados");
  const sucesso = requireBoolean(obj, "sucesso");

  const entry: TelemetryEnd = {
    evento: "end",
    skill_invocada,
    timestamp_inicio,
    profile_arquitetura,
    fase_pipeline,
    timestamp_fim,
    duracao_ms,
    tokens_aproximados_consumidos,
    arquivos_lidos,
    arquivos_modificados,
    sucesso,
  };

  if (!sucesso && typeof obj["error_message"] === "string") {
    entry.error_message = obj["error_message"] as string;
  }

  return entry;
}

export function isTelemetryStart(e: TelemetryEntry): e is TelemetryStart {
  return e.evento === "start";
}

export function isTelemetryEnd(e: TelemetryEntry): e is TelemetryEnd {
  return e.evento === "end";
}

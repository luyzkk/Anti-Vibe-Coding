import { describe, it, expect } from "bun:test";
import type { TelemetryEntry, TelemetryStart, TelemetryEnd, FasePipeline, ArchitectureProfileName } from "./telemetry-types";

describe("TelemetryEntry types", () => {
  it("FasePipeline covers all 10 pipeline phases", () => {
    const phases: FasePipeline[] = [
      "grill-me", "write-prd", "plan-feature", "execute-plan",
      "verify-work", "iterate", "consultant", "architecture",
      "design-twice", "quick-plan",
    ];
    expect(phases).toHaveLength(10);
  });

  it("ArchitectureProfileName covers all 5 profiles", () => {
    const profiles: ArchitectureProfileName[] = [
      "clean-architecture-ritual",
      "mvc-flat",
      "vertical-slice",
      "nextjs-app-router",
      "unknown-mixed",
    ];
    expect(profiles).toHaveLength(5);
  });

  it("TelemetryStart discriminator is start", () => {
    const entry: TelemetryStart = {
      evento: "start",
      skill_invocada: "architecture",
      timestamp_inicio: "2026-05-04T10:00:00.000Z",
      profile_arquitetura: "vertical-slice",
      fase_pipeline: "execute-plan",
    };
    expect(entry.evento).toBe("start");
  });

  it("TelemetryEnd discriminator is end with all required fields", () => {
    const entry: TelemetryEnd = {
      evento: "end",
      skill_invocada: "architecture",
      timestamp_inicio: "2026-05-04T10:00:00.000Z",
      profile_arquitetura: "vertical-slice",
      fase_pipeline: "execute-plan",
      timestamp_fim: "2026-05-04T10:01:30.000Z",
      duracao_ms: 90000,
      tokens_aproximados_consumidos: 4200,
      arquivos_lidos: 3,
      arquivos_modificados: 1,
      sucesso: true,
    };
    expect(entry.evento).toBe("end");
    expect(entry.error_message).toBeUndefined();
  });

  it("TelemetryEntry union accepts both start and end", () => {
    const entries: TelemetryEntry[] = [
      {
        evento: "start",
        skill_invocada: "grill-me",
        timestamp_inicio: "2026-05-04T10:00:00.000Z",
        profile_arquitetura: "disabled",
        fase_pipeline: "grill-me",
      },
      {
        evento: "end",
        skill_invocada: "grill-me",
        timestamp_inicio: "2026-05-04T10:00:00.000Z",
        profile_arquitetura: "disabled",
        fase_pipeline: "grill-me",
        timestamp_fim: "2026-05-04T10:00:05.000Z",
        duracao_ms: 5000,
        tokens_aproximados_consumidos: 100,
        arquivos_lidos: 0,
        arquivos_modificados: 0,
        sucesso: true,
      },
    ];
    expect(entries).toHaveLength(2);
  });
});

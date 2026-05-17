import { describe, it, expect } from "bun:test";
import type { TelemetryEntry, TelemetryStart, TelemetryEnd, FasePipeline, ArchitectureProfileName, AnyTelemetryEntry } from "./telemetry-types";
import { isPipelineEntry, isDomainEntry, getEntryTimestamp } from "./telemetry-types";

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

// H2.3 — type guard narrow tests
describe("AnyTelemetryEntry type guards", () => {
  const pipelineStart: AnyTelemetryEntry = {
    evento: "start",
    skill_invocada: "architecture",
    timestamp_inicio: "2026-05-17T10:00:00.000Z",
    profile_arquitetura: "vertical-slice",
    fase_pipeline: "execute-plan",
  };

  const pipelineEnd: AnyTelemetryEntry = {
    evento: "end",
    skill_invocada: "architecture",
    timestamp_inicio: "2026-05-17T10:00:00.000Z",
    profile_arquitetura: "vertical-slice",
    fase_pipeline: "execute-plan",
    timestamp_fim: "2026-05-17T10:01:00.000Z",
    duracao_ms: 60000,
    tokens_aproximados_consumidos: 1200,
    arquivos_lidos: 2,
    arquivos_modificados: 1,
    sucesso: true,
  };

  const domainStackDetected: AnyTelemetryEntry = {
    evento: "stack_detected",
    skill_invocada: "init",
    timestamp: "2026-05-17T10:00:01.000Z",
    primary: "nodejs-typescript",
    secondary: [],
    anchor_files: ["package.json"],
  };

  const domainKnowledgeCopied: AnyTelemetryEntry = {
    evento: "knowledge_copied",
    skill_invocada: "init",
    timestamp: "2026-05-17T10:00:02.000Z",
    stack: "nodejs-typescript",
    atom_count: 14,
    status: "copied",
  };

  it("isPipelineEntry returns true for start event", () => {
    expect(isPipelineEntry(pipelineStart)).toBe(true);
  });

  it("isPipelineEntry returns true for end event", () => {
    expect(isPipelineEntry(pipelineEnd)).toBe(true);
  });

  it("isPipelineEntry returns false for stack_detected domain event", () => {
    expect(isPipelineEntry(domainStackDetected)).toBe(false);
  });

  it("isPipelineEntry returns false for knowledge_copied domain event", () => {
    expect(isPipelineEntry(domainKnowledgeCopied)).toBe(false);
  });

  it("isDomainEntry returns true for stack_detected event", () => {
    expect(isDomainEntry(domainStackDetected)).toBe(true);
  });

  it("isDomainEntry returns true for knowledge_copied event", () => {
    expect(isDomainEntry(domainKnowledgeCopied)).toBe(true);
  });

  it("isDomainEntry returns false for pipeline start event", () => {
    expect(isDomainEntry(pipelineStart)).toBe(false);
  });

  it("isDomainEntry returns false for pipeline end event", () => {
    expect(isDomainEntry(pipelineEnd)).toBe(false);
  });

  it("isPipelineEntry and isDomainEntry are mutually exclusive for all entry types", () => {
    const entries = [pipelineStart, pipelineEnd, domainStackDetected, domainKnowledgeCopied];
    for (const entry of entries) {
      expect(isPipelineEntry(entry) && isDomainEntry(entry)).toBe(false);
    }
  });

  it("getEntryTimestamp returns timestamp_inicio for pipeline entries", () => {
    expect(getEntryTimestamp(pipelineStart)).toBe("2026-05-17T10:00:00.000Z");
    expect(getEntryTimestamp(pipelineEnd)).toBe("2026-05-17T10:00:00.000Z");
  });

  it("getEntryTimestamp returns timestamp for domain entries", () => {
    expect(getEntryTimestamp(domainStackDetected)).toBe("2026-05-17T10:00:01.000Z");
    expect(getEntryTimestamp(domainKnowledgeCopied)).toBe("2026-05-17T10:00:02.000Z");
  });
});

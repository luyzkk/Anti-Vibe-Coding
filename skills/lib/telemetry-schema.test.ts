import { describe, it, expect } from "bun:test";
import { parseTelemetryEntry, isTelemetryStart, isTelemetryEnd } from "./telemetry-schema";

describe("parseTelemetryEntry", () => {
  const baseStart = {
    evento: "start",
    skill_invocada: "architecture",
    timestamp_inicio: "2026-05-04T10:00:00.000Z",
    profile_arquitetura: "vertical-slice",
    fase_pipeline: "execute-plan",
  };

  const baseEnd = {
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

  it("parses valid start entry with all required fields", () => {
    const result = parseTelemetryEntry(baseStart);
    expect(result.evento).toBe("start");
    expect(result.skill_invocada).toBe("architecture");
    expect(result.profile_arquitetura).toBe("vertical-slice");
    expect(result.fase_pipeline).toBe("execute-plan");
  });

  it("parses valid end entry with sucesso true", () => {
    const result = parseTelemetryEntry(baseEnd);
    expect(result.evento).toBe("end");
    if (isTelemetryEnd(result)) {
      expect(result.duracao_ms).toBe(90000);
      expect(result.sucesso).toBe(true);
      expect(result.error_message).toBeUndefined();
    } else {
      throw new Error("expected TelemetryEnd");
    }
  });

  it("parses valid end entry with sucesso false and error_message", () => {
    const entry = {
      ...baseEnd,
      sucesso: false,
      error_message: "timeout after 90s",
    };
    const result = parseTelemetryEntry(entry);
    if (isTelemetryEnd(result)) {
      expect(result.sucesso).toBe(false);
      expect(result.error_message).toBe("timeout after 90s");
    } else {
      throw new Error("expected TelemetryEnd");
    }
  });

  it("rejects start entry with timestamp_fim present", () => {
    const entry = { ...baseStart, timestamp_fim: "2026-05-04T10:01:00.000Z" };
    expect(() => parseTelemetryEntry(entry)).toThrow();
  });

  it("rejects end entry missing duracao_ms", () => {
    const { duracao_ms: _d, ...withoutDuracao } = baseEnd;
    expect(() => parseTelemetryEntry(withoutDuracao)).toThrow();
  });

  it("rejects entry with unknown evento value", () => {
    const entry = { ...baseStart, evento: "pause" };
    expect(() => parseTelemetryEntry(entry)).toThrow();
  });

  it("accepts profile_arquitetura disabled when feature flag off", () => {
    const entry = { ...baseStart, profile_arquitetura: "disabled" };
    const result = parseTelemetryEntry(entry);
    expect(result.profile_arquitetura).toBe("disabled");
  });
});

describe("isTelemetryStart", () => {
  it("returns true for start entries", () => {
    const entry = parseTelemetryEntry({
      evento: "start",
      skill_invocada: "grill-me",
      timestamp_inicio: "2026-05-04T10:00:00.000Z",
      profile_arquitetura: "unknown",
      fase_pipeline: "grill-me",
    });
    expect(isTelemetryStart(entry)).toBe(true);
    expect(isTelemetryEnd(entry)).toBe(false);
  });
});

describe("isTelemetryEnd", () => {
  it("returns true for end entries", () => {
    const entry = parseTelemetryEntry({
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
    });
    expect(isTelemetryEnd(entry)).toBe(true);
    expect(isTelemetryStart(entry)).toBe(false);
  });
});

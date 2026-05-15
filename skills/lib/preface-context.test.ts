// 2026-05-14 (Luiz/dev): testes de regressão para CA-01 e CA-02 do PRD v6.3.0
import { describe, test, expect, mock } from "bun:test";
import { readPrefaceContext } from "./preface-context";

describe("readPrefaceContext", () => {
  test("retorna shape correto quando architecture profile existe (CA-01)", () => {
    // Arrange: mock readArchitectureProfile retornando profile nextjs-app-router com confidence 92
    const mockProfile = {
      profile: "nextjs-app-router" as const,
      confidence: 92,
      detectedAt: "2026-05-14T10:00:00.000Z",
      signals: ["folder:app/"],
      schemaVersion: 1,
    };
    mock.module("./read-architecture-profile", () => ({
      readArchitectureProfile: () => mockProfile,
    }));

    // Act
    const result = readPrefaceContext("/fake/project/root");

    // Assert
    expect(result.profile).toBe("nextjs-app-router");
    expect(result.language).toBeNull();
    expect(result.framework).toBeNull();
    expect(result.confidence).toBe(92);
  });

  test("retorna profile null e confidence 0 quando architecture profile ausente (CA-02)", () => {
    // Arrange: mock readArchitectureProfile retornando null (manifest ausente ou flag off)
    mock.module("./read-architecture-profile", () => ({
      readArchitectureProfile: () => null,
    }));

    // Act
    const result = readPrefaceContext("/fake/project/root");

    // Assert
    expect(result.profile).toBeNull();
    expect(result.language).toBeNull();
    expect(result.framework).toBeNull();
    expect(result.confidence).toBe(0);
  });
});

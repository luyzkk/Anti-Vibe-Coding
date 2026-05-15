// 2026-05-14 (Luiz/dev): testes de regressão para CA-01 e CA-02 do PRD v6.3.0
// Fase-04: adicionados testes de regressão CA-09 com 5 fixtures de profile
import { describe, test, expect, mock, afterAll } from "bun:test";
import type { PrefaceContext } from "./preface-context";
import { readPrefaceContext } from "./preface-context";
import type { ArchitectureProfileName } from "./manifest-types";
import fixtureNextjs from "./__fixtures__/preface-context-nextjs-app-router.expected.json";
import fixtureMvc from "./__fixtures__/preface-context-mvc-flat.expected.json";
import fixtureCleanArch from "./__fixtures__/preface-context-clean-architecture-ritual.expected.json";
import fixtureVerticalSlice from "./__fixtures__/preface-context-vertical-slice.expected.json";
import fixtureUnknownMixed from "./__fixtures__/preface-context-unknown-mixed.expected.json";

// 2026-05-14 (Luiz/dev): mock.module é global no Bun — reset após todos os testes do arquivo
// para manter estado de contaminação idêntico ao baseline (CA-02 deixa null, mantemos null).
afterAll(() => {
  mock.module("./read-architecture-profile", () => ({
    readArchitectureProfile: () => null,
  }));
});

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

// 2026-05-14 (Luiz/dev): regressão CA-09 — shape estável para todos os 5 profiles (fase-04)
describe("readPrefaceContext — fixtures de regressão (CA-09)", () => {
  const fixtures = [
    { name: "nextjs-app-router", fixture: fixtureNextjs },
    { name: "mvc-flat", fixture: fixtureMvc },
    { name: "clean-architecture-ritual", fixture: fixtureCleanArch },
    { name: "vertical-slice", fixture: fixtureVerticalSlice },
    { name: "unknown-mixed", fixture: fixtureUnknownMixed },
  ] as const;

  for (const { name, fixture } of fixtures) {
    test(`shape estável para profile ${name}`, () => {
      mock.module("./read-architecture-profile", () => ({
        readArchitectureProfile: () => ({
          profile: fixture.input_profile,
          confidence: fixture.input_confidence,
          detectedAt: "2026-05-14T00:00:00.000Z",
          signals: [],
          schemaVersion: 1,
        }),
      }));

      const result = readPrefaceContext("/fake/root");

      // Construir expected tipado a partir dos campos do fixture —
      // fixture.expected_output.profile é string (JSON), mas PrefaceContext.profile
      // é ArchitectureProfileName | null. input_profile já tem o tipo correto.
      const expected: PrefaceContext = {
        profile: fixture.input_profile as ArchitectureProfileName,
        language: null,
        framework: null,
        confidence: fixture.input_confidence,
      };
      expect(result).toEqual(expected);
    });
  }
});

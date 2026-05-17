// 2026-05-14 (Luiz/dev): testes de regressão para CA-01 e CA-02 do PRD v6.3.0
// Fase-04: adicionados testes de regressão CA-09 com 5 fixtures de profile
// 2026-05-17 (Luiz/dev): migrado de mock.module para reader injetável — mock.module
// no Bun é global e vazava `() => null` para read-architecture-profile.test.ts e
// fase-policy.test.ts (9 testes falhavam em `bun run test`, passavam isolados).
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { PrefaceContext } from "./preface-context";
import { readPrefaceContext } from "./preface-context";
import type { ArchitectureProfile, ArchitectureProfileName } from "./manifest-types";
import fixtureNextjs from "./__fixtures__/preface-context-nextjs-app-router.expected.json";
import fixtureMvc from "./__fixtures__/preface-context-mvc-flat.expected.json";
import fixtureCleanArch from "./__fixtures__/preface-context-clean-architecture-ritual.expected.json";
import fixtureVerticalSlice from "./__fixtures__/preface-context-vertical-slice.expected.json";
import fixtureUnknownMixed from "./__fixtures__/preface-context-unknown-mixed.expected.json";

import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";

describe("readPrefaceContext", () => {
  test("retorna shape correto quando architecture profile existe (CA-01)", () => {
    const mockProfile: ArchitectureProfile = {
      profile: "nextjs-app-router",
      confidence: 92,
      detectedAt: "2026-05-14T10:00:00.000Z",
      signals: ["folder:app/"],
      schemaVersion: 1,
    };

    const result = readPrefaceContext("/fake/project/root", () => mockProfile);

    expect(result.profile).toBe("nextjs-app-router");
    expect(result.language).toBeNull();
    expect(result.framework).toBeNull();
    expect(result.confidence).toBe(92);
  });

  test("retorna profile null e confidence 0 quando architecture profile ausente (CA-02)", () => {
    const result = readPrefaceContext("/fake/project/root", () => null);

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
      const reader = (): ArchitectureProfile => ({
        profile: fixture.input_profile as ArchitectureProfileName,
        confidence: fixture.input_confidence,
        detectedAt: "2026-05-14T00:00:00.000Z",
        signals: [],
        schemaVersion: 1,
      });

      const result = readPrefaceContext("/fake/root", reader);

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

// 2026-05-15 (Luiz/dev): threshold edge cases — PRD v6.3.0 §RF-CH-02 (plano05 fase-02)
describe("readPrefaceContext — confidence threshold (RF-CH-02)", () => {
  let workdir: string;

  beforeEach(async () => {
    workdir = await mkdtemp(path.join(tmpdir(), "anti-vibe-threshold-"));
    await mkdir(path.join(workdir, "config"), { recursive: true });
  });

  afterEach(async () => {
    await rm(workdir, { recursive: true, force: true });
  });

  const makeReader = (confidence: number): (() => ArchitectureProfile) => () => ({
    profile: "nextjs-app-router",
    confidence,
    detectedAt: "2026-05-15T00:00:00.000Z",
    signals: [],
    schemaVersion: 1,
  });

  test("confidence 50 with threshold 70 returns profile null", async () => {
    await writeFile(
      path.join(workdir, "config", "adaptive-coaching.json"),
      JSON.stringify({ confidence_threshold: 70, schema_version: "1.0" }),
    );

    const result = readPrefaceContext(workdir, makeReader(50));

    expect(result.profile).toBeNull();
    expect(result.confidence).toBe(50);
  });

  test("confidence exactly 70 with threshold 70 keeps profile (boundary accepted)", async () => {
    await writeFile(
      path.join(workdir, "config", "adaptive-coaching.json"),
      JSON.stringify({ confidence_threshold: 70, schema_version: "1.0" }),
    );

    const result = readPrefaceContext(workdir, makeReader(70));

    expect(result.profile).toBe("nextjs-app-router");
  });

  test("confidence 71 with threshold 70 keeps profile", async () => {
    await writeFile(
      path.join(workdir, "config", "adaptive-coaching.json"),
      JSON.stringify({ confidence_threshold: 70, schema_version: "1.0" }),
    );

    const result = readPrefaceContext(workdir, makeReader(71));

    expect(result.profile).toBe("nextjs-app-router");
  });

  test("confidence 100 with threshold 70 keeps profile", async () => {
    await writeFile(
      path.join(workdir, "config", "adaptive-coaching.json"),
      JSON.stringify({ confidence_threshold: 70, schema_version: "1.0" }),
    );

    const result = readPrefaceContext(workdir, makeReader(100));

    expect(result.profile).toBe("nextjs-app-router");
  });

  test("config file absent uses default threshold 70", async () => {
    // No config file written — workdir/config/ exists but adaptive-coaching.json does not
    const result = readPrefaceContext(workdir, makeReader(65));

    // confidence 65 < default threshold 70 → profile should be null
    expect(result.profile).toBeNull();
    expect(result.confidence).toBe(65);
  });

  test("config file malformed falls back to default threshold 70", async () => {
    await writeFile(
      path.join(workdir, "config", "adaptive-coaching.json"),
      "{not valid json",
    );

    const result = readPrefaceContext(workdir, makeReader(65));

    // confidence 65 < default threshold 70 → profile should be null
    expect(result.profile).toBeNull();
    expect(result.confidence).toBe(65);
  });
});

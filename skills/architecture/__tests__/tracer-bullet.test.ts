/**
 * Tracer Bullet — end-to-end integration test for Modo Dual (CA-04, CA-05 preview).
 *
 * Strategy (a): asserts that:
 *   1. SKILL.md contains the profile-aware preface block with clear HTML markers.
 *   2. The preface block instructs the LLM to prepend "Recomendações para perfil: <profile>".
 *   3. readArchitectureProfile returns "vertical-slice" when fixture has flag=true + valid profile.
 *   4. readArchitectureProfile returns null when flag=false (CA-04: v5.2 behavior preserved).
 *
 * This proves the end-to-end path: manifest → helper → SKILL.md marker present.
 * Actual LLM output is not tested — that is a human verification step.
 */

import { describe, it, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { readArchitectureProfile } from "../../lib/read-architecture-profile";

const SKILL_MD = path.join(import.meta.dir, "../SKILL.md");
const FIXTURES = path.join(import.meta.dir, "../../lib/__fixtures__");
const TRACER_BULLET = path.join(FIXTURES, "manifest-tracer-bullet.json");
const FLAG_OFF = path.join(FIXTURES, "manifest-flag-off.json");

describe("architecture skill — tracer bullet", () => {
  it("SKILL.md contains profile-aware-preface:start marker", () => {
    const content = fs.readFileSync(SKILL_MD, "utf8");
    expect(content).toContain("<!-- profile-aware-preface:start -->");
  });

  it("SKILL.md contains profile-aware-preface:end marker", () => {
    const content = fs.readFileSync(SKILL_MD, "utf8");
    expect(content).toContain("<!-- profile-aware-preface:end -->");
  });

  it("SKILL.md preface instructs LLM to prepend Recomendações para perfil", () => {
    const content = fs.readFileSync(SKILL_MD, "utf8");
    expect(content).toContain("Recomendações para perfil");
  });

  it("readArchitectureProfile returns vertical-slice from tracer bullet fixture", () => {
    const profile = readArchitectureProfile(TRACER_BULLET);
    expect(profile).not.toBeNull();
    expect(profile?.profile).toBe("vertical-slice");
  });

  it("readArchitectureProfile returns null when flag is false — CA-04: v5.2 behavior preserved", () => {
    const profile = readArchitectureProfile(FLAG_OFF);
    expect(profile).toBeNull();
  });
});

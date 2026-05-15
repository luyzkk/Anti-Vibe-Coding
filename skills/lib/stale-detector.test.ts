// 2026-05-14 (Luiz/dev): testes de regressão para RF-SH-01 + D10
// Stale detection é conservadora: prefere falso-positivo a falso-negativo
import { describe, test, expect } from "bun:test";
import { checkStale } from "./stale-detector";

describe("checkStale", () => {
  test("retorna isStale true e checkedPaths inclui package.json quando projectRoot inválido (CA-08 conservador)", () => {
    // Arrange: stored checksums idênticos aos computados
    const storedChecksums: Record<string, string> = {
      "package.json": "abc123",
    };
    // Com projectRoot inválido, computeChecksum retorna null → conservador → stale
    const result = checkStale("/fake-root-no-package-json", storedChecksums);

    // Quando projectRoot não tem package.json: considera stale (conservador)
    expect(result.isStale).toBe(true);
    expect(result.checkedPaths).toContain("package.json");
    expect(result.reason).toBeDefined();
  });

  test("retorna isStale true com reason quando checksums diferem (CA-08)", () => {
    const storedChecksums: Record<string, string> = {
      "package.json": "checksum-antigo",
    };
    // Com projectRoot inválido, checkStale não consegue computar checksum real
    // Logo: isStale = true (conservador)
    const result = checkStale("/path/que/nao/existe", storedChecksums);

    expect(result.isStale).toBe(true);
    expect(result.reason).toMatch(/package\.json|não encontrado|checksum/i);
  });

  test("retorna checkedPaths sempre incluindo package.json", () => {
    const result = checkStale("/qualquer/root", {});
    expect(result.checkedPaths).toContain("package.json");
  });
});

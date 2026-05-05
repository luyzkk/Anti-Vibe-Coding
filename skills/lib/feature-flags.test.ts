/**
 * Tests for isFeatureEnabled — feature flag reader from .anti-vibe-manifest.json.
 * Tests write temp manifest files and pass a path override to avoid CWD coupling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { isFeatureEnabled } from "./feature-flags";

const VALID_BASE_MANIFEST = {
  version: "5.3.0",
  generatedAt: "2026-05-04T10:00:00.000Z",
  description: "test manifest",
  files: {},
};

let tmpDir: string;
let tmpManifestPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "anti-vibe-test-"));
  tmpManifestPath = path.join(tmpDir, ".anti-vibe-manifest.json");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("isFeatureEnabled", () => {
  it("returns false when manifest file is missing", () => {
    const result = isFeatureEnabled("architectureDetectorEnabled", tmpManifestPath);
    expect(result).toBe(false);
  });

  it("returns false when manifest exists without flag field", () => {
    fs.writeFileSync(tmpManifestPath, JSON.stringify(VALID_BASE_MANIFEST));
    const result = isFeatureEnabled("architectureDetectorEnabled", tmpManifestPath);
    expect(result).toBe(false);
  });

  it("returns false when flag is explicitly false", () => {
    fs.writeFileSync(
      tmpManifestPath,
      JSON.stringify({ ...VALID_BASE_MANIFEST, architectureDetectorEnabled: false })
    );
    const result = isFeatureEnabled("architectureDetectorEnabled", tmpManifestPath);
    expect(result).toBe(false);
  });

  it("returns true when flag is explicitly true", () => {
    fs.writeFileSync(
      tmpManifestPath,
      JSON.stringify({ ...VALID_BASE_MANIFEST, architectureDetectorEnabled: true })
    );
    const result = isFeatureEnabled("architectureDetectorEnabled", tmpManifestPath);
    expect(result).toBe(true);
  });

  it("returns false when manifest is malformed JSON", () => {
    fs.writeFileSync(tmpManifestPath, "{ not valid json }");
    const result = isFeatureEnabled("architectureDetectorEnabled", tmpManifestPath);
    expect(result).toBe(false);
  });
});

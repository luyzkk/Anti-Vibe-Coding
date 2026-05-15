/**
 * Stale detector para capabilities.json (RF-SH-01, Decisão D10).
 *
 * Verifica se os paths-chave do projeto mudaram desde a última geração do
 * capabilities.json. Usa checksums SHA-256 dos arquivos (via Node crypto).
 *
 * CONSERVADOR: prefere falso-positivo (emitir warning desnecessário) a
 * falso-negativo (não emitir quando capabilities estão stale).
 *
 * NUNCA bloqueia execução de skill — apenas retorna isStale para o caller
 * decidir se emite warning.
 *
 * @see docs/design-docs/ADR-0020-adaptive-coaching.md — decisão D6 e D10
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// 2026-05-14 (Luiz/dev): paths-chave conforme D10 do PRD. top-level src/ apenas
// (não recursivo) — custo de IO controlado sem sacrificar cobertura útil.
const KEY_PATHS = ["package.json"] as const;

export type StaleCheckResult = {
  /** true se qualquer path-chave mudou ou não pôde ser lido. */
  isStale: boolean;
  /** Paths verificados (relativos ao projectRoot). */
  checkedPaths: string[];
  /** Descrição da primeira divergência encontrada. Undefined quando isStale=false. */
  reason?: string;
};

/**
 * Verifica se os paths-chave do projeto mudaram em relação aos checksums armazenados.
 *
 * Paths verificados:
 * - `package.json` (sempre)
 * - Todo arquivo/pasta diretamente em `src/` (top-level only, se `src/` existir)
 * - `routes/` se existir no root
 *
 * @param projectRoot - Diretório raiz absoluto do projeto.
 * @param storedChecksums - Map de path relativo → checksum SHA-256 armazenado em capabilities.json.
 * @returns `StaleCheckResult` com isStale, checkedPaths e reason opcional.
 */
export function checkStale(
  projectRoot: string,
  storedChecksums: Record<string, string>
): StaleCheckResult {
  const checkedPaths: string[] = [...KEY_PATHS];

  // Adicionar top-level src/ entries dinamicamente
  const srcDir = path.join(projectRoot, "src");
  try {
    const srcEntries = fs.readdirSync(srcDir);
    for (const entry of srcEntries) {
      checkedPaths.push(`src/${entry}`);
    }
  } catch {
    // src/ não existe — ok, não é obrigatório
  }

  // Adicionar routes/ se existir
  const routesDir = path.join(projectRoot, "routes");
  try {
    fs.accessSync(routesDir);
    checkedPaths.push("routes");
  } catch {
    // routes/ não existe — ok
  }

  // Verificar cada path
  for (const relPath of checkedPaths) {
    const absPath = path.join(projectRoot, relPath);
    const currentChecksum = computeChecksum(absPath);
    const storedChecksum = storedChecksums[relPath];

    if (currentChecksum === null) {
      // Arquivo não encontrado — conservador: stale
      return {
        isStale: true,
        checkedPaths,
        reason: `${relPath} não encontrado em ${projectRoot}`,
      };
    }

    if (storedChecksum === undefined) {
      // Path novo não estava no snapshot — conservador: stale
      return {
        isStale: true,
        checkedPaths,
        reason: `${relPath} é novo (não estava no snapshot de checksums)`,
      };
    }

    if (currentChecksum !== storedChecksum) {
      return {
        isStale: true,
        checkedPaths,
        reason: `checksum de ${relPath} divergiu (stored: ${storedChecksum.slice(0, 8)}..., current: ${currentChecksum.slice(0, 8)}...)`,
      };
    }
  }

  return { isStale: false, checkedPaths };
}

/**
 * Computa SHA-256 do conteúdo de um arquivo ou do nome dos filhos de uma pasta.
 * Retorna null se o path não existe ou não pode ser lido.
 */
function computeChecksum(absPath: string): string | null {
  try {
    const stat = fs.statSync(absPath);
    const hash = crypto.createHash("sha256");

    if (stat.isDirectory()) {
      // Para diretórios: hash dos nomes dos filhos diretos (sorted, não recursivo)
      const entries = fs.readdirSync(absPath).sort();
      hash.update(entries.join("\n"));
    } else {
      // Para arquivos: hash do conteúdo
      const content = fs.readFileSync(absPath);
      hash.update(content);
    }

    return hash.digest("hex");
  } catch {
    return null;
  }
}

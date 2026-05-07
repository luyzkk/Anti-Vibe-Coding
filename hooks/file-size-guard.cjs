'use strict';

/**
 * file-size-guard.cjs - Anti-Vibe Coding v5.2
 *
 * PostToolUse hook (matcher: Write|Edit): emite warning quando:
 * - Arquivo editado tem >500 linhas totais
 * - Alguma função no arquivo tem >40 linhas
 *
 * Advisory only — NUNCA bloqueia (exit 0 sempre).
 * Fail-open: qualquer erro → process.exit(0) silencioso.
 */

const fs   = require('fs');
const path = require('path');

const FILE_LINE_LIMIT = 500;
const FN_LINE_LIMIT   = 40;

// Extensões elegíveis para análise de funções
const ELIGIBLE_EXTS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

// Extensões elegíveis para contagem de linhas de arquivo (mais amplo)
const COUNT_EXTS = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|java|cs|cpp|c|h|rs|swift|kt)$/;

/**
 * Conta linhas de um arquivo no disco.
 * Retorna -1 se o arquivo não existir ou não puder ser lido.
 */
function countFileLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return -1;
  }
}

/**
 * Detecta funções longas usando heurística de regex + contagem de linhas.
 *
 * Estratégia:
 * 1. Encontra declarações de função (function, arrow, método de classe)
 * 2. A partir da linha de declaração, conta linhas até fechar o bloco `{}`
 * 3. Emite warning se o bloco tem >FN_LINE_LIMIT linhas
 *
 * Retorna array de { name, startLine, lineCount }
 */
function detectLongFunctions(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = content.split('\n');
  const results = [];

  // Padrão para detectar início de função:
  // - function nome(
  // - async function nome(
  // - nome = (...) => {  (arrow com corpo)
  // - nome(...) {        (método de classe/objeto)
  // - async nome(...) {  (método async)
  const FN_START = /(?:(?:async\s+)?function\s+(\w+)\s*\(|(\w+)\s*[:=]\s*(?:async\s*)?\([^)]*\)\s*(?::\s*\S+\s*)?\s*=>\s*\{|(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\S+\s*)?\s*\{)/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(FN_START);
    if (!match) continue;

    const fnName = match[1] || match[2] || match[3] || '<anonymous>';

    // Conta linhas do bloco: percorre à frente balanceando {}
    let depth = 0;
    let foundOpen = false;
    let endLine = i;

    for (let j = i; j < lines.length; j++) {
      const line = lines[j];
      for (const ch of line) {
        if (ch === '{') { depth++; foundOpen = true; }
        else if (ch === '}') { depth--; }
      }
      if (foundOpen && depth === 0) {
        endLine = j;
        break;
      }
    }

    const lineCount = endLine - i + 1;
    if (lineCount > FN_LINE_LIMIT) {
      results.push({ name: fnName, startLine: i + 1, lineCount });
    }
  }

  return results;
}

// — Main logic ——————————————————————————————————————————————————————————————

let handled = false;

const safetyTimer = setTimeout(() => {
  if (!handled) { handled = true; process.exit(0); }
}, 5000);

function run() {
  if (handled) return;
  handled = true;
  clearTimeout(safetyTimer);

  try {
    const filePath = process.env.CLAUDE_FILE_PATH || '';

    if (!filePath) return process.exit(0);

    // Resolve para path absoluto se relativo
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    const warnings = [];

    // --- Verificação 1: tamanho do arquivo ---
    if (COUNT_EXTS.test(filePath)) {
      const lineCount = countFileLines(absPath);
      if (lineCount > FILE_LINE_LIMIT) {
        const filename = path.basename(filePath);
        warnings.push(
          `[FILE-SIZE] ${filename} (${lineCount} linhas) excede limite de ${FILE_LINE_LIMIT}. Considere dividir por responsabilidade.`
        );
      }
    }

    // --- Verificação 2: funções longas ---
    if (ELIGIBLE_EXTS.test(filePath)) {
      const longFns = detectLongFunctions(absPath);
      const filename = path.basename(filePath);
      for (const fn of longFns) {
        warnings.push(
          `[FILE-SIZE] função '${fn.name}' (${filename}:${fn.startLine}) tem ${fn.lineCount} linhas — excede limite de ${FN_LINE_LIMIT}.`
        );
      }
    }

    if (warnings.length > 0) {
      process.stdout.write(warnings.join('\n') + '\n');
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
}

// PostToolUse: o runtime pode não enviar stdin. Usar CLAUDE_FILE_PATH diretamente.
// Aguarda um tick para garantir que env vars estão disponíveis, depois executa.
process.nextTick(run);

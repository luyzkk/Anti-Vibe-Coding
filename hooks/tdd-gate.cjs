'use strict';

/**
 * tdd-gate.cjs - TDD Gate para Anti-Vibe Coding
 *
 * PreToolUse hook (type: command): bloqueia edição de código de produção
 * se não existe arquivo de teste correspondente no projeto.
 *
 * Recebe argumentos da ferramenta via stdin (JSON do Claude Code).
 * Bloqueia via exit code 2 + stderr; permite via exit code 0.
 */

const fs = require('fs');
const path = require('path');

const PRODUCTION_EXTS  = /\.(ts|tsx|js|jsx)$/;
const TEST_PATTERN     = /\.(test|spec)\.(ts|tsx|js|jsx)$|__tests__/;
const SKIP_PATTERN     = /\.(config\.|json$|ya?ml$|toml$|env)|\.d\.ts$|\.(md|txt|mdx|css|scss|svg|png|jpg|ico|graphql|gql|prisma|sql|mjs|cjs)$|(node_modules|dist|build|\.git|\.claude|\.next|migrations|seeds)[/\\]/;

function allow()        { process.exit(0); }
function block(reason)  {
  process.stderr.write(reason + '\n');
  process.exit(2);
}

/** Busca recursiva por arquivo de teste que contenha `basename` no nome. */
function findTestFile(dir, basename) {
  if (!fs.existsSync(dir)) return false;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (findTestFile(full, basename)) return true;
      } else if (
        TEST_PATTERN.test(entry.name) &&
        entry.name.toLowerCase().includes(basename.toLowerCase())
      ) {
        return true;
      }
    }
  } catch { /* ignore permission errors */ }
  return false;
}

// Safety timeout: exit allow after 5s if stdin never closes (Windows pipe issue)
const safetyTimer = setTimeout(() => allow(), 5000);

let rawInput = '';
let handled = false;

function processInput() {
  if (handled) return;
  handled = true;
  clearTimeout(safetyTimer);
  try {
    const input     = JSON.parse(rawInput || '{}');
    // PreToolUse sends { tool_input: { file_path: "..." } }
    // Support both nested (correct) and flat (legacy) formats
    const toolInput = input.tool_input || input;
    const filePath  = toolInput.file_path || toolInput.path || '';

    // Sem caminho ou fora do escopo de produção → allow
    if (!filePath)                        return allow();
    if (TEST_PATTERN.test(filePath))      return allow();
    if (SKIP_PATTERN.test(filePath))      return allow();
    if (!PRODUCTION_EXTS.test(filePath))  return allow();

    const basename = path.basename(filePath).replace(PRODUCTION_EXTS, '');
    const cwd      = process.cwd();

    // 1. Busca nos diretórios de teste padrão
    const testDirs = ['src/test', 'src/__tests__', 'test', '__tests__', 'tests'];
    for (const dir of testDirs) {
      if (findTestFile(path.join(cwd, dir), basename)) return allow();
    }

    // 2. Busca co-localizada (mesmo diretório do arquivo)
    const sameDir   = path.join(cwd, path.dirname(filePath));
    const colocated = [
      path.join(sameDir, `${basename}.test.ts`),
      path.join(sameDir, `${basename}.test.tsx`),
      path.join(sameDir, `${basename}.test.js`),
      path.join(sameDir, `${basename}.test.jsx`),
      path.join(sameDir, `${basename}.spec.ts`),
      path.join(sameDir, `${basename}.spec.tsx`),
      path.join(sameDir, `${basename}.spec.js`),
      path.join(sameDir, `${basename}.spec.jsx`),
      path.join(sameDir, '__tests__', `${basename}.test.ts`),
      path.join(sameDir, '__tests__', `${basename}.test.tsx`),
      path.join(sameDir, '__tests__', `${basename}.test.js`),
    ];
    if (colocated.some(p => { try { return fs.existsSync(p); } catch { return false; } })) {
      return allow();
    }

    block(
      `TDD GATE: Nenhum teste encontrado para "${basename}". ` +
      `Crie o arquivo de teste primeiro (Red phase). ` +
      `Sugestao: use /anti-vibe-coding:tdd-workflow para estruturar os testes antes de codar. ` +
      `Anti-Vibe Coding: Red -> Green -> Refactor.`
    );
  } catch {
    allow(); // fail-open em erros inesperados
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { rawInput += chunk; });
process.stdin.on('end', processInput);
process.stdin.on('error', () => allow());

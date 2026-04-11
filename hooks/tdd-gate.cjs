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

function readConfig() {
  const defaults = {
    mode: 'regex',
    suggest_ai_judge_threshold: 3,
    max_tests_per_cycle: 1,
    immutable_test_patterns: ['*.test.*', '*.spec.*', '*.e2e.*'],
    approach: 'outside-in',
    block_test_modification_in_green: true,
    require_assertion_failure: true,
    judge_model: 'haiku'
  };
  try {
    const configPath = path.join(__dirname, '..', 'config', 'tdd-gate.json');
    if (!fs.existsSync(configPath)) return defaults;
    const raw = fs.readFileSync(configPath, 'utf8');
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function readTddPhase() {
  try {
    const phasePath = path.join(process.cwd(), '.claude', '.tdd-phase.json');
    if (!fs.existsSync(phasePath)) return null;
    return JSON.parse(fs.readFileSync(phasePath, 'utf8'));
  } catch {
    return null;
  }
}

function isImmutableTest(filePath, config, phaseData) {
  if (!phaseData) return false;
  if (phaseData.phase !== 'green') return false;
  if (!config.block_test_modification_in_green) return false;

  const fileName = path.basename(filePath);

  // If phase data has explicit list, use that
  if (phaseData.immutable_tests && phaseData.immutable_tests.length > 0) {
    const norm = filePath.replace(/\\/g, '/');
    return phaseData.immutable_tests.some(t => t.replace(/\\/g, '/') === norm);
  }

  // Fall back to glob patterns from config
  const patterns = config.immutable_test_patterns || ['*.test.*', '*.spec.*', '*.e2e.*'];
  for (const pattern of patterns) {
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    if (regex.test(fileName)) return true;
  }
  return false;
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
    const config = readConfig();
    if (config.mode === 'off') return allow();
    if (config.mode === 'ai-judge') {
      // TODO: task-05 implements real AI Judge — fall through to regex for now
    }

    const input     = JSON.parse(rawInput || '{}');
    // PreToolUse sends { tool_input: { file_path: "..." } }
    // Support both nested (correct) and flat (legacy) formats
    const toolInput = input.tool_input || input;
    const filePath  = toolInput.file_path || toolInput.path || '';
    const toolName  = input.tool_name || '';

    // Sem caminho ou fora do escopo de produção → allow
    if (!filePath) return allow();

    // Anchor check: block test modification in GREEN phase
    const phaseData = readTddPhase();
    if (isImmutableTest(filePath, config, phaseData)) {
      const isEdit = toolName === 'Edit';
      const absPath = path.resolve(process.cwd(), filePath);
      const fileExists = fs.existsSync(absPath);
      if (isEdit || fileExists) {
        return block(
          `ANCHOR: Arquivo de teste "${path.basename(filePath)}" e read-only durante fase GREEN (ancora imutavel).\n` +
          `Fase atual: GREEN | Feature: ${phaseData.feature || 'desconhecida'}\n` +
          `Acao permitida: editar apenas codigo de producao para fazer os testes passarem.\n` +
          `Se precisa modificar testes, volte para fase RED: atualize .claude/.tdd-phase.json\n` +
          `Anti-Vibe Coding: Red -> Green -> Refactor.`
        );
      }
      return allow(); // Write to new test file: allowed in GREEN
    }

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

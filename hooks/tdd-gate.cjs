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

// 2026-09-05 (Luiz/dev): os padroes e a busca por teste moram em `lib/tdd-decision.cjs`, para o
// caminho Bash (`tdd-gate-bash.cjs`) decidir pela MESMA regra. Duas copias divergentes seriam
// piores que o bypass que motivou a extracao: o dev aprenderia que a mesma escrita passa ou nao
// dependendo da ferramenta. As justificativas de cada padrao (fixtures no skip, `middleware`
// deliberadamente FORA do NEXTJS_ROUTE_FILE) estao la, junto do codigo que as aplica.
const { needsTest, basenameFor } = require('./lib/tdd-decision.cjs');

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

// `findTestFile` vive em `lib/tdd-decision.cjs`, junto de `needsTest`.

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

    if (!needsTest(filePath, process.cwd())) return allow();

    const basename = basenameFor(filePath);

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

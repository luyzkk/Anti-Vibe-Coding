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
// 2026-09-09 (Luiz/dev): ADR-0023 — a raiz do projeto vem do caminho do arquivo, nao do cwd da
// sessao. Compartilhado com o caminho Bash pelo mesmo motivo que `tdd-decision.cjs`.
const { projectRootFor } = require('./lib/project-root.cjs');
const { reportAndAllow } = require('./lib/fail-open.cjs');
// A leitura da ancora e compartilhada com o pre-commit: formato lido em dois lugares com regras
// proprias e como nasce uma terceira definicao do mesmo ciclo.
const { readTddPhase } = require('./lib/tdd-phase.cjs');

function allow()        { process.exit(0); }
function block(reason)  {
  process.stderr.write(reason + '\n');
  process.exit(2);
}

function readConfig() {
  // 2026-09-09 (Luiz/dev): ADR-0023 — toda chave aqui precisa ter leitor real neste arquivo.
  // Chave que aparece so nos defaults e config morta: documenta comportamento que nao existe e
  // falha ABRINDO, entao ninguem descobre pelo uso. Cinco sairam por isso; a lista nominal mora no
  // ADR, e nao aqui, para nao envenenar busca por token neste arquivo.
  const defaults = {
    mode: 'regex',
    immutable_test_patterns: ['*.test.*', '*.spec.*', '*.e2e.*'],
    block_test_modification_in_green: true
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

    const input     = JSON.parse(rawInput || '{}');
    // PreToolUse sends { tool_input: { file_path: "..." } }
    // Support both nested (correct) and flat (legacy) formats
    const toolInput = input.tool_input || input;
    const filePath  = toolInput.file_path || toolInput.path || '';
    const toolName  = input.tool_name || '';

    // Sem caminho ou fora do escopo de produção → allow
    if (!filePath) return allow();

    // Anchor check: block test modification in GREEN phase
    const phaseData = readTddPhase(process.cwd());
    if (isImmutableTest(filePath, config, phaseData)) {
      const isEdit = toolName === 'Edit';
      const absPath = path.resolve(process.cwd(), filePath);
      const fileExists = fs.existsSync(absPath);
      if (isEdit || fileExists) {
        return block(
          `ANCHOR: Arquivo de teste "${path.basename(filePath)}" e read-only durante fase GREEN (ancora imutavel).\n` +
          `Fase atual: GREEN | Feature: ${phaseData.feature || 'desconhecida'}\n` +
          `Acao permitida: editar apenas codigo de producao para fazer os testes passarem.\n` +
          `Se o teste precisa mudar, o RED estava errado: pare e peca ao orquestrador para voltar a fase.\n` +
          `Quem arma e desarma a ancora e o orquestrador, nunca quem esta sob ela.\n` +
          `Anti-Vibe Coding: Red -> Green -> Refactor.`
        );
      }
      return allow(); // Write to new test file: allowed in GREEN
    }

    const projectRoot = projectRootFor(filePath, process.cwd());
    if (!needsTest(filePath, projectRoot)) return allow();

    const basename = basenameFor(filePath);

    block(
      `TDD GATE: Nenhum teste encontrado para "${basename}". ` +
      `Crie o arquivo de teste primeiro (Red phase). ` +
      `Sugestao: use /anti-vibe-coding:tdd-workflow para estruturar os testes antes de codar. ` +
      `Anti-Vibe Coding: Red -> Green -> Refactor.`
    );
  } catch (err) {
    // Fail-open e deliberado: hook quebrado nao pode travar o trabalho. MUDO, nao — o silencio era
    // o que fazia a quebra ser invisivel, e gate que falha calado vira gate que ninguem sabe que
    // parou de existir (ADR-0023).
    reportAndAllow('tdd-gate', err);
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { rawInput += chunk; });
process.stdin.on('end', processInput);
process.stdin.on('error', () => allow());

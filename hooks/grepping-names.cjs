'use strict';

/**
 * grepping-names.cjs - Anti-Vibe Coding v5.2
 *
 * PreToolUse hook (matcher: Bash, filtra git commit): emite warning quando
 * o diff staged introduz nomes genéricos conhecidos ou nomes com >10 hits
 * no codebase.
 *
 * Advisory only — NUNCA bloqueia (exit 0 sempre).
 * Fail-open: qualquer erro → process.exit(0) silencioso.
 *
 * Nota Windows: usa `grep` via git bash/WSL. Em PowerShell puro sem git bash,
 * o grep pode não estar disponível — o hook falha silenciosamente via try/catch.
 */

const { execSync } = require('child_process');
const path = require('path');

// Nomes genéricos proibidos (word-boundary match)
const GENERIC_NAMES = new Set([
  'data', 'handler', 'process', 'Manager', 'Service',
  'Helper', 'Utils', 'info', 'temp', 'obj', 'result',
  'value', 'item', 'list', 'response', 'error', 'err',
  'res', 'req', 'cb', 'callback', 'fn', 'func', 'args',
]);

// Threshold de hits no codebase para considerar nome "genérico por uso"
const HIT_THRESHOLD = 10;

// Diretórios de busca para grep
const SEARCH_DIRS = ['src', 'lib', 'app', 'pages', 'components'];

/**
 * Extrai nomes de variáveis/funções introduzidos no diff staged.
 * Analisa linhas com `+` (adições) no diff unificado.
 * Retorna Set de nomes únicos encontrados.
 */
function extractNewNamesFromDiff() {
  let diff;
  try {
    diff = execSync('git diff --staged', { timeout: 15000, encoding: 'utf8', stdio: 'pipe' });
  } catch {
    return new Set();
  }

  const names = new Set();
  const addedLines = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));

  // Padrões de declaração de nome:
  // const/let/var nome =
  // function nome(
  // nome: tipo  (parâmetro ou propriedade)
  // class nome
  const DECL_PATTERNS = [
    /(?:const|let|var)\s+(\w+)\s*[=:]/g,
    /function\s+(\w+)\s*\(/g,
    /(?:async\s+)?(\w+)\s*[:=]\s*(?:async\s*)?\([^)]*\)\s*(?::\s*\S+\s*)?=>/g,
    /class\s+(\w+)/g,
    /(?:^|\s)(\w+)\s*\(/g,  // chamadas/declarações genéricas
  ];

  for (const line of addedLines) {
    // Remove prefixo `+`
    const cleaned = line.slice(1);
    for (const pattern of DECL_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(cleaned)) !== null) {
        const name = match[1];
        // Filtra: apenas nomes com >=3 chars, sem números isolados, sem palavras-chave JS
        if (name && name.length >= 2 && !/^\d+$/.test(name)) {
          names.add(name);
        }
      }
    }
  }

  return names;
}

/**
 * Conta hits de um nome no codebase usando grep.
 * Retorna -1 se grep não disponível ou erro.
 */
function countHitsInCodebase(name, cwd) {
  // Determina quais diretórios existem
  const existingDirs = SEARCH_DIRS.filter(d => {
    try {
      const { statSync } = require('fs');
      statSync(path.join(cwd, d));
      return true;
    } catch {
      return false;
    }
  });

  // Se nenhum diretório padrão existe, busca no cwd
  const searchTarget = existingDirs.length > 0
    ? existingDirs.join(' ')
    : '.';

  const grepCmd = `grep -r "\\b${name}\\b" ${searchTarget} --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l 2>/dev/null | wc -l`;

  try {
    const result = execSync(grepCmd, {
      timeout: 10000,
      encoding: 'utf8',
      stdio: 'pipe',
      cwd,
      shell: true,
    });
    const count = parseInt(result.trim(), 10);
    return isNaN(count) ? -1 : count;
  } catch {
    return -1;
  }
}

/**
 * Gera sugestão de nome específico baseado no nome genérico.
 * Heurística simples: prefixar com contexto comum.
 */
function suggestSpecificName(name) {
  const suggestions = {
    'data':     'invoiceData / userProfileData / orderData',
    'handler':  'onSubmitHandler / onClickHandler / invoiceSubmitHandler',
    'process':  'processInvoice / processPayment / processUserSignup',
    'Manager':  'InvoiceManager / UserSessionManager',
    'Service':  'InvoiceService / PaymentService / AuthService',
    'Helper':   'DateFormatHelper / CurrencyHelper',
    'Utils':    'DateUtils / StringUtils / CurrencyUtils',
    'info':     'userInfo / invoiceInfo / sessionInfo',
    'temp':     'tempFilePath / tempOrderId',
    'obj':      'invoiceObj / userObj',
    'result':   'parseResult / fetchResult / validationResult',
    'value':    'inputValue / priceValue / selectedValue',
    'item':     'cartItem / listItem / menuItem',
    'list':     'invoiceList / userList / orderList',
    'response': 'apiResponse / fetchResponse / httpResponse',
    'error':    'validationError / networkError / parseError',
    'err':      'networkErr / parseErr',
    'res':      'apiRes / httpRes',
    'req':      'httpReq / apiReq',
    'cb':       'onSuccessCallback / onErrorCallback',
    'callback': 'onSuccessCallback / onErrorCallback',
    'fn':       'transformFn / filterFn / mapFn',
    'func':     'transformFunc / filterFunc',
    'args':     'cliArgs / constructorArgs / queryArgs',
  };
  return suggestions[name] || `nome específico para ${name}`;
}

// — Main logic ——————————————————————————————————————————————————————————————

let rawInput = '';
let handled  = false;

const safetyTimer = setTimeout(() => {
  if (!handled) { handled = true; process.exit(0); }
}, 8000);

function run() {
  if (handled) return;
  handled = true;
  clearTimeout(safetyTimer);

  try {
    const input     = JSON.parse(rawInput || '{}');
    // PreToolUse: { tool_name, tool_input: { command: "git commit ..." } }
    const toolInput = input.tool_input || input;
    const command   = toolInput.command || process.env.CLAUDE_TOOL_INPUT || '';

    // Só ativa para git commit
    if (!command.includes('git commit')) return process.exit(0);

    const cwd = process.cwd();
    const newNames = extractNewNamesFromDiff();

    if (newNames.size === 0) return process.exit(0);

    const warnings = [];

    for (const name of newNames) {
      // Verificação 1: nome está na lista de genéricos conhecidos
      if (GENERIC_NAMES.has(name)) {
        const suggestion = suggestSpecificName(name);
        warnings.push(
          `[GREPPING] '${name}' é nome genérico conhecido. Prefira nome específico como '${suggestion}'.`
        );
        continue; // não fazer grep para nomes já sinalizados como genéricos
      }

      // Verificação 2: nome com >HIT_THRESHOLD hits no codebase
      const hits = countHitsInCodebase(name, cwd);
      if (hits > HIT_THRESHOLD) {
        const suggestion = suggestSpecificName(name) !== `nome específico para ${name}`
          ? suggestSpecificName(name)
          : `${name}ForInvoice / ${name}ForUser`;
        warnings.push(
          `[GREPPING] '${name}' retorna ${hits} hits — nome genérico. Prefira nome específico como '${suggestion}'.`
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

process.stdin.setEncoding('utf8');
process.stdin.on('data',  chunk => { rawInput += chunk; });
process.stdin.on('end',   run);
process.stdin.on('error', () => { if (!handled) { handled = true; clearTimeout(safetyTimer); process.exit(0); } });

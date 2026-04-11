'use strict';

/**
 * prompt-guard.cjs - Anti-Vibe Coding v5.0
 *
 * PreToolUse hook (pattern: Write|Edit): escaneia conteudo sendo escrito
 * em arquivos .planning/* contra padroes conhecidos de prompt injection.
 *
 * Advisory only — emite warning, NUNCA bloqueia (exit 0 sempre).
 * Fail-open: qualquer erro → process.exit(0) silencioso.
 */

const path = require('path');

const PATTERNS = [
  { name: 'ignore-instructions',     pattern: /ignore\s+(all\s+)?previous\s+instructions/i },
  { name: 'role-impersonation',      pattern: /(?:you\s+are\s+now|pretend\s+you\s+are)/i },
  { name: 'role-injection',          pattern: /^(?:system|assistant):/mi },
  { name: 'unicode-invisible',       pattern: /[\u200B\uFEFF\u200C\u200D]/ },
  { name: 'control-characters',      pattern: /[\x00-\x08]/ },
  { name: 'base64-suspicious',       pattern: /(?:aWdub3Jl|cHJldGVuZC|c3lzdGVtO|YXNzaXN0YW50)/ },
  { name: 'hex-encoded',             pattern: /\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){3,}/i },
  { name: 'markdown-image-injection',pattern: /!\[.*?\]\(https?:\/\// },
  { name: 'html-injection',          pattern: /<(?:script|img\s+onerror|iframe)/i },
  { name: 'llm-prompt-markers',      pattern: /\[INST\]|\[\/INST\]|<<SYS>>/ },
  { name: 'anthropic-role-injection', pattern: /^(?:Human|Assistant):\s/mi },
  { name: 'override-instructions',   pattern: /(?:do\s+not\s+follow|override|bypass)\s+(?:the\s+)?instructions/i },
  { name: 'padding-attack',          pattern: / {50,}|\n{20,}/ },
];

function isInPlanningDir(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.includes('.planning/');
}

function extractContent(toolInput) {
  const filePath = toolInput.file_path || toolInput.path || '';
  const toolName = (toolInput.tool_name || '').toLowerCase();

  if (toolName === 'edit' || toolInput.old_string !== undefined) {
    // Edit: scan both old and new content
    const content = [toolInput.old_string || '', toolInput.new_string || ''].join('\n');
    return { filePath, content };
  }

  // Write: scan content directly
  return { filePath, content: toolInput.content || '' };
}

function scanContent(content, patterns) {
  const lines = content.split('\n');
  const matches = [];

  for (const { name, pattern } of patterns) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(pattern);
      if (m) {
        const preview = m[0].slice(0, 60) + (m[0].length > 60 ? '...' : '');
        matches.push({ line: i + 1, name, preview });
      }
    }
  }

  return matches;
}

function formatWarning(matches, filePath) {
  const filename = path.basename(filePath);
  const lines = [
    `⚠️ PROMPT GUARD: Detected ${matches.length} potential prompt injection pattern(s) in ${filename}:`,
    ...matches.map(m => `- Line ${m.line}: Pattern "${m.name}" matched: "${m.preview}"`),
    'Recomendacao: Revise manualmente o conteudo antes de prosseguir.',
  ];
  return lines.join('\n');
}

// — Main logic ——————————————————————————————————————————————————————————————

let rawInput = '';
let handled  = false;

function run() {
  if (handled) return;
  handled = true;
  clearTimeout(safetyTimer);

  try {
    const input = JSON.parse(rawInput || '{}');
    // PreToolUse sends { tool_name, tool_input }
    const toolInput = input.tool_input || input;

    const { filePath, content } = extractContent(toolInput);

    if (!isInPlanningDir(filePath)) return process.exit(0);
    if (!content) return process.exit(0);

    const matches = scanContent(content, PATTERNS);

    if (matches.length > 0) {
      process.stdout.write(formatWarning(matches, filePath) + '\n');
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
}

const safetyTimer = setTimeout(() => {
  if (!handled) { handled = true; process.exit(0); }
}, 5000);

process.stdin.setEncoding('utf8');
process.stdin.on('data',  chunk => { rawInput += chunk; });
process.stdin.on('end',   run);
process.stdin.on('error', () => { if (!handled) { handled = true; clearTimeout(safetyTimer); process.exit(0); } });

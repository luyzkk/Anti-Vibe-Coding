'use strict';

/**
 * context-monitor.cjs - Anti-Vibe Coding v5.0
 *
 * PostToolUse hook (pattern: *): monitora heuristicas de uso da janela de contexto
 * e injeta warnings em stdout quando thresholds sao atingidos.
 *
 * Fail-open obrigatorio: qualquer erro resulta em process.exit(0) silencioso.
 * Estado persiste entre invocacoes via .claude/.context-monitor-state.json
 */

const fs   = require('fs');
const path = require('path');

const PLUGIN_ROOT  = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..');
const PROJECT_ROOT = process.cwd();
const CONFIG_PATH  = path.join(PLUGIN_ROOT, 'config', 'context-monitor.json');
const STATE_PATH   = path.join(PROJECT_ROOT, '.claude', '.context-monitor-state.json');

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas

const DEFAULTS = {
  enabled: true,
  debounce_interval: 5,
  thresholds: { warn: 35, critical: 25, stop: 15 },
  weights: { tool_calls: 0.4, message_turns: 0.3, estimated_output_size: 0.3 },
  max_expected_tool_calls: 200,
  max_expected_turns: 50,
  max_expected_output_kb: 500,
};

const SEVERITY_ORDER = { ok: 0, warn: 1, critical: 2, stop: 3 };

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return DEFAULTS;
  }
}

function freshState() {
  return {
    tool_call_count: 0,
    accumulated_output_kb: 0,
    last_check_at: 0,
    last_severity: 'ok',
    last_score: 100,
    session_start: new Date().toISOString(),
  };
}

function readState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    const age = Date.now() - new Date(raw.session_start || 0).getTime();
    return age > SESSION_TIMEOUT_MS ? freshState() : raw;
  } catch {
    return freshState();
  }
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch {
    // ignorar erros de escrita — fail-open
  }
}

function calculateScore(state, cfg) {
  const count      = state.tool_call_count;
  const outputKb   = state.accumulated_output_kb || 0;
  const turns      = Math.ceil(count / 4); // heuristica: ~4 tool calls por turno

  const toolScore   = clamp((1 - count    / cfg.max_expected_tool_calls) * 100);
  const turnScore   = clamp((1 - turns    / cfg.max_expected_turns)       * 100);
  const outputScore = clamp((1 - outputKb / cfg.max_expected_output_kb)   * 100);

  const w = cfg.weights;
  return toolScore * w.tool_calls + turnScore * w.message_turns + outputScore * w.estimated_output_size;
}

function clamp(v) { return Math.max(0, Math.min(100, v)); }

function getSeverity(score, thresholds) {
  if (score < thresholds.stop)     return 'stop';
  if (score < thresholds.critical) return 'critical';
  if (score < thresholds.warn)     return 'warn';
  return 'ok';
}

function emitWarning(severity, score) {
  const usedPct = Math.round(100 - score);
  const tag     = `(score: ${Math.round(score)}/100)`;

  const msgs = {
    warn:
      `⚠️ CONTEXT WINDOW: estimated ~${usedPct}% used ${tag}.\n` +
      `Considere: finalizar task atual, fazer commit, iniciar nova sessao.\n` +
      `Recomendacao: /compact ou iniciar nova conversa.`,
    critical:
      `🔴 CONTEXT WINDOW CRITICAL: estimated ~${usedPct}% used ${tag}.\n` +
      `PARE apos a task atual. Risco de degradacao de contexto.\n` +
      `Recomendacao: commit agora, /compact, ou nova conversa.`,
    stop:
      `🛑 CONTEXT WINDOW ESGOTADO: estimated ~${usedPct}% used ${tag}.\n` +
      `NAO inicie novas tasks. Contexto provavelmente ja degradou.\n` +
      `ACAO: commit imediato e iniciar nova conversa.`,
  };

  if (msgs[severity]) process.stdout.write(msgs[severity] + '\n');
}

function extractOutputKb(rawInput) {
  try {
    const ctx = JSON.parse(rawInput || '{}');
    const res = ctx.tool_response || ctx.tool_result;
    if (!res) return 0;
    return Buffer.byteLength(typeof res === 'string' ? res : JSON.stringify(res), 'utf8') / 1024;
  } catch {
    return 0;
  }
}

// — Main logic ——————————————————————————————————————————————————————————————

let rawInput = '';
let handled  = false;

function run() {
  if (handled) return;
  handled = true;
  clearTimeout(safetyTimer);

  try {
    const cfg = readConfig();
    if (!cfg.enabled) return process.exit(0);

    const outputKb = extractOutputKb(rawInput);
    const state    = readState();

    state.tool_call_count     += 1;
    state.accumulated_output_kb = (state.accumulated_output_kb || 0) + outputKb;

    const score    = calculateScore(state, cfg);
    const severity = getSeverity(score, cfg.thresholds);

    const callsSinceCheck = state.tool_call_count - (state.last_check_at || 0);
    const debounceReached = callsSinceCheck >= cfg.debounce_interval;
    const escalated       = SEVERITY_ORDER[severity] > SEVERITY_ORDER[state.last_severity || 'ok'];

    if (debounceReached || escalated) {
      state.last_check_at = state.tool_call_count;
      state.last_severity = severity;
      state.last_score    = score;
      if (severity !== 'ok') emitWarning(severity, score);
    }

    saveState(state);
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

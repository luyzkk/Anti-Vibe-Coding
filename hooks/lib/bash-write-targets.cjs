'use strict';

/**
 * bash-write-targets.cjs — extrai, de um comando shell, os caminhos que ele ESCREVE.
 *
 * 2026-09-05 (Luiz/dev): o discriminador e o operador/verbo de escrita, NUNCA a mencao ao caminho.
 * `cat > x.ts` escreve; `cat x.ts` le. `bun test x.ts` e `grep foo x.ts` mencionam e nao escrevem.
 * Confundir os dois transformaria o gate num bloqueador de trabalho legitimo — e gate que atrapalha
 * e desligado na primeira semana.
 *
 * LIMITE HONESTO: so as formas inequivocas sao detectadas. Um script que escreve
 * (`python gen.py`, `bun run build`) passa sem ser visto, e isso NAO tem conserto por regex.
 * Isto e atrito contra o contorno casual, nao enforcement completo — ver README do gate.
 */

/** Substitui trechos entre aspas por espacos, preservando o comprimento. */
function stripQuoted(command) {
  let out = '';
  let quote = null;
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (quote !== null) {
      if (ch === '\\' && quote !== "'") { out += '  '; i += 1; continue; }
      if (ch === quote) { quote = null; out += ' '; continue; }
      out += ' ';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; out += ' '; continue; }
    out += ch;
  }
  return out;
}

/** Remove o corpo de heredocs: `<<'EOF' ... EOF`. O delimitador do redirect ja foi lido antes. */
function stripHeredocBodies(command) {
  return command.replace(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?[\s\S]*?^\1\s*$/gm, ' ');
}

const PATH_TOKEN = "[A-Za-z0-9_@.:$~/\\\\-]+";
const PROD_EXT = /\.(ts|tsx|js|jsx)$/;

/**
 * Caminhos escritos pelo comando. Formas cobertas:
 *   - redirect `>` / `>>` para arquivo (NAO `2>&1`, NAO `>&2`)
 *   - `tee [-a] alvo...`
 *   - `sed -i ... alvo`
 *   - `cp origem... destino` e `mv origem... destino` (so o destino)
 *   - `touch alvo...`
 */
function extractWriteTargets(command) {
  if (typeof command !== 'string' || command.length === 0) return [];
  const scan = stripQuoted(stripHeredocBodies(command));
  const found = new Set();

  const add = (token) => {
    if (typeof token !== 'string') return;
    const clean = token.replace(/^["'`]|["'`]$/g, '');
    if (PROD_EXT.test(clean)) found.add(clean);
  };

  // Redirect. `[^&]` apos o operador exclui `2>&1` e `>&2` (fd, nao arquivo).
  const redirect = new RegExp(`>>?\\s*(${PATH_TOKEN})`, 'g');
  for (const m of scan.matchAll(redirect)) add(m[1]);

  const tee = new RegExp(`\\btee\\b((?:\\s+-\\S+)*)((?:\\s+${PATH_TOKEN})+)`, 'g');
  for (const m of scan.matchAll(tee)) {
    for (const t of (m[2] || '').trim().split(/\s+/)) add(t);
  }

  // `sed -i` (GNU) e `sed -i ''` (BSD): o alvo e o ultimo token com extensao de producao.
  const sedInPlace = new RegExp(`\\bsed\\b[^|;&]*?\\s-i(?:\\S*)?\\s([^|;&]*)`, 'g');
  for (const m of scan.matchAll(sedInPlace)) {
    for (const t of (m[1] || '').trim().split(/\s+/)) add(t);
  }

  // cp/mv: so o ULTIMO argumento e destino.
  const copyMove = new RegExp(`\\b(?:cp|mv)\\b((?:\\s+${PATH_TOKEN})+)`, 'g');
  for (const m of scan.matchAll(copyMove)) {
    const args = (m[1] || '').trim().split(/\s+/).filter(a => !a.startsWith('-'));
    if (args.length >= 2) add(args[args.length - 1]);
  }

  const touch = new RegExp(`\\btouch\\b((?:\\s+${PATH_TOKEN})+)`, 'g');
  for (const m of scan.matchAll(touch)) {
    for (const t of (m[1] || '').trim().split(/\s+/)) add(t);
  }

  return [...found];
}

module.exports = { extractWriteTargets, stripQuoted, stripHeredocBodies };

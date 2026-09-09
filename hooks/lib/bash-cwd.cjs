'use strict';

/**
 * bash-cwd.cjs — de que diretorio o comando escreve.
 *
 * 2026-09-09 (Luiz/dev): issue #82. O gate do caminho Bash resolvia o alvo contra `process.cwd()`,
 * que e o cwd da SESSAO, e nao contra o diretorio onde o comando de fato escreve. Um
 * `cd outro/projeto && echo x > src/a.ts` fazia o gate procurar o teste-irmao no projeto errado,
 * nao achar, e bloquear escrita legitima. Falso positivo, e falso positivo desliga gate.
 *
 * LIMITE HONESTO: so o `cd` que ABRE o comando e lido, incluindo uma cadeia de `cd a && cd b`.
 * Um `cd` no meio (`echo x > a.ts && cd outro && echo y > b.ts`) muda o cwd das etapas seguintes,
 * e adivinhar qual etapa escreve o que seria chute — nesses casos devolvemos null e o chamador
 * fica com o cwd da sessao, que e o comportamento antigo.
 */

const path = require('path');

/** `cd` de abertura, incluindo cadeia. Aspas simples/duplas em volta do caminho sao aceitas. */
const LEADING_CD = /^\s*cd\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s*(?:&&|;)\s*/;

/**
 * Traduz caminho de estilo MSYS/Git Bash (`/f/tmp/x`) para nativo do Windows (`F:\tmp\x`).
 *
 * Sem isto o fix nao serve para o caso que originou a issue: no Windows o Node enraiza a barra
 * inicial no DRIVE CORRENTE, entao `/f/tmp/x` vira `F:\f\tmp\x` — um diretorio que nao existe.
 * So o primeiro segmento de UMA letra e tratado como drive; `/foo/bar` passa intacto.
 */
function toNativePath(p, platform) {
  if (typeof p !== 'string' || p.length === 0) return p;
  if (platform !== 'win32') return p;
  const m = /^\/([A-Za-z])(\/.*)?$/.exec(p);
  if (!m) return p;
  const rest = (m[2] || '\\').replace(/\//g, '\\');
  return `${m[1].toUpperCase()}:${rest}`;
}

/**
 * Diretorio a partir do qual o comando escreve, ou `null` quando o comando nao abre com `cd`.
 * Caminho relativo no `cd` e resolvido contra `sessionCwd`.
 */
function commandCwd(command, sessionCwd, platform) {
  if (typeof command !== 'string' || command.length === 0) return null;
  let rest = command;
  let cwd = null;
  for (;;) {
    const m = LEADING_CD.exec(rest);
    if (!m) break;
    const raw = m[1] || m[2] || m[3];
    const dir = toNativePath(raw, platform);
    cwd = path.resolve(cwd || sessionCwd, dir);
    rest = rest.slice(m[0].length);
  }
  return cwd;
}

module.exports = { commandCwd, toNativePath };

'use strict';

/**
 * project-root.cjs — de qual projeto e o arquivo que esta sendo escrito.
 *
 * 2026-09-09 (Luiz/dev): ADR-0023. O gate procurava o teste-irmao a partir do cwd da SESSAO. Numa
 * sessao com diretorios adicionais de outro projeto, isso olha no lugar errado: bloqueia escrita
 * legitima num projeto que TEM o teste, e (no sentido oposto) pode achar um homonimo alheio. E a
 * mesma classe da issue #82, com mecanismo diferente — aqui nao existe `cd` para ler, so o caminho.
 *
 * Mora em `lib/` porque os dois caminhos do gate (Write|Edit e Bash) precisam decidir pela MESMA
 * regra, pelo mesmo motivo que `tdd-decision.cjs` foi extraido: duas copias divergentes ensinariam
 * o dev que a mesma escrita passa ou nao dependendo da ferramenta.
 *
 * NUNCA usar `path.resolve` aqui. Ele enraiza caminho no drive/cwd do host, e foi exatamente esse
 * acoplamento ao host que fez o RED-check da issue #82 passar localmente e o CI reprovar.
 */

const fs = require('fs');
const path = require('path');

// Marcadores de raiz por stack. Ordem nao importa: basta um casar.
const PROJECT_MARKERS = [
  'package.json',
  '.git',
  'deno.json',
  'Gemfile',
  'go.mod',
  'pyproject.toml',
  'requirements.txt',
  'Cargo.toml',
  'composer.json',
  'pom.xml',
  'build.gradle',
];

function hasProjectMarker(dir) {
  for (const marker of PROJECT_MARKERS) {
    try {
      if (fs.existsSync(path.join(dir, marker))) return true;
    } catch { /* permissao: trata como "nao e raiz" */ }
  }
  return false;
}

/**
 * Sobe do arquivo ate o primeiro ancestral com marcador de projeto.
 *
 * @param {string} filePath caminho do arquivo sendo escrito (absoluto para valer a busca)
 * @param {string} fallbackCwd usado quando o caminho e relativo ou nenhum ancestral e raiz
 * @param {(dir: string) => boolean} [isProjectRoot] injetavel para teste sem tocar o disco
 * @returns {string} a raiz do projeto dono do arquivo, ou `fallbackCwd`
 */
function projectRootFor(filePath, fallbackCwd, isProjectRoot = hasProjectMarker) {
  // Caminho relativo nao tem ancestral confiavel: quem sabe a base e o chamador.
  if (!filePath || !path.isAbsolute(filePath)) return fallbackCwd;

  let dir = path.dirname(filePath);
  let previous = null;
  while (dir && dir !== previous) {
    if (isProjectRoot(dir)) return dir;
    previous = dir;
    dir = path.dirname(dir);
  }
  return fallbackCwd;
}

module.exports = { projectRootFor, hasProjectMarker, PROJECT_MARKERS };

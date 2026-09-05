'use strict';

/**
 * tdd-decision.cjs — decisao compartilhada do TDD Gate.
 *
 * 2026-09-05 (Luiz/dev): extraido de `hooks/tdd-gate.cjs` para ser consumido tambem pelo caminho
 * Bash (`hooks/tdd-gate-bash.cjs`). Os padroes e a busca por teste vivem AQUI e em lugar nenhum
 * mais — dois caminhos com regras divergentes seria pior que o bypass que motivou a extracao:
 * o dev aprenderia que a mesma escrita passa ou nao dependendo da ferramenta.
 */

const fs = require('fs');
const path = require('path');

const PRODUCTION_EXTS = /\.(ts|tsx|js|jsx)$/;
const TEST_PATTERN    = /\.(test|spec|e2e)\.(ts|tsx|js|jsx)$|__tests__/;
// `__fixtures__|fixtures`: arquivo sob diretorio de fixture e DADO DE TESTE, nao codigo de producao.
const SKIP_PATTERN    = /\.(config\.|json$|ya?ml$|toml$|env)|\.d\.ts$|\.(md|txt|mdx|css|scss|svg|png|jpg|ico|graphql|gql|prisma|sql|mjs|cjs)$|(node_modules|dist|build|\.git|\.claude|\.next|migrations|seeds|__fixtures__|fixtures)[/\\]/;
// Next.js route files are structural/presentational — covered by E2E, not unit tests.
// `middleware` NAO entra: e onde a auth mora (ver comentario em tdd-gate.cjs).
const NEXTJS_ROUTE_FILE = /(^|[/\\])(page|layout|loading|error|not-found|template|default|global-error|route)\.(ts|tsx|js|jsx)$/;

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

/**
 * `true` quando o caminho e codigo de producao SEM teste correspondente.
 * `false` para teste, arquivo pulado, extensao fora de escopo, ou producao ja coberta.
 */
function needsTest(filePath, cwd) {
  if (!filePath) return false;
  if (TEST_PATTERN.test(filePath)) return false;
  if (SKIP_PATTERN.test(filePath)) return false;
  if (!PRODUCTION_EXTS.test(filePath)) return false;
  if (NEXTJS_ROUTE_FILE.test(filePath)) return false;

  const basename = path.basename(filePath).replace(PRODUCTION_EXTS, '');

  const testDirs = ['src/test', 'src/__tests__', 'test', '__tests__', 'tests'];
  for (const dir of testDirs) {
    if (findTestFile(path.join(cwd, dir), basename)) return false;
  }

  // Busca co-localizada. path.resolve (nao join) — filePath absoluto + cwd geram hibrido invalido
  // no Windows.
  const sameDir = path.resolve(cwd, path.dirname(filePath));
  const suffixes = ['test.ts', 'test.tsx', 'test.js', 'test.jsx', 'spec.ts', 'spec.tsx', 'spec.js', 'spec.jsx', 'e2e.ts', 'e2e.tsx', 'e2e.js', 'e2e.jsx'];
  const colocated = suffixes.map(s => path.join(sameDir, `${basename}.${s}`));
  colocated.push(
    path.join(sameDir, '__tests__', `${basename}.test.ts`),
    path.join(sameDir, '__tests__', `${basename}.test.tsx`),
    path.join(sameDir, '__tests__', `${basename}.test.js`),
  );
  for (const p of colocated) {
    try { if (fs.existsSync(p)) return false; } catch { /* ignore */ }
  }

  return true;
}

function basenameFor(filePath) {
  return path.basename(filePath).replace(PRODUCTION_EXTS, '');
}

module.exports = {
  PRODUCTION_EXTS,
  TEST_PATTERN,
  SKIP_PATTERN,
  NEXTJS_ROUTE_FILE,
  findTestFile,
  needsTest,
  basenameFor,
};

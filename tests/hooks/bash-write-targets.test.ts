// 2026-09-05 (Luiz/dev): o parser que decide se um comando shell ESCREVE um arquivo.
//
// O grupo que nao pode dar falso positivo e o segundo: comandos legitimos que apenas MENCIONAM um
// `.ts`. Se `bun test x.ts` ou `grep foo x.ts` forem lidos como escrita, o gate passa a bloquear
// trabalho normal — e gate que atrapalha e desligado na primeira semana, o que e pior que o bypass
// que ele veio fechar.
import { describe, it, expect } from 'bun:test'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { extractWriteTargets } = require(
  path.join(import.meta.dir, '..', '..', 'hooks', 'lib', 'bash-write-targets.cjs'),
) as { extractWriteTargets: (cmd: string) => string[] }

describe('detecta escrita real', () => {
  it('catches a heredoc redirect — the exact form used to bypass the gate', () => {
    expect(extractWriteTargets("cat > src/foo.ts <<'EOF'\nconst a = 1\nEOF")).toEqual(['src/foo.ts'])
  })

  it('catches append redirect', () => {
    expect(extractWriteTargets('echo "x" >> src/foo.ts')).toEqual(['src/foo.ts'])
  })

  it('catches redirect without space', () => {
    expect(extractWriteTargets('printf a >src/foo.ts')).toEqual(['src/foo.ts'])
  })

  it('catches tee, with and without flags', () => {
    expect(extractWriteTargets('echo x | tee src/foo.ts')).toEqual(['src/foo.ts'])
    expect(extractWriteTargets('echo x | tee -a src/foo.ts')).toEqual(['src/foo.ts'])
  })

  it('catches sed in place', () => {
    expect(extractWriteTargets("sed -i 's/a/b/' src/foo.ts")).toEqual(['src/foo.ts'])
  })

  it('catches only the destination of cp and mv', () => {
    expect(extractWriteTargets('cp src/a.ts src/b.ts')).toEqual(['src/b.ts'])
    expect(extractWriteTargets('mv src/a.ts src/b.ts')).toEqual(['src/b.ts'])
  })

  it('catches touch', () => {
    expect(extractWriteTargets('touch src/foo.ts')).toEqual(['src/foo.ts'])
  })

  it('catches a write hidden after a legitimate command in the same line', () => {
    expect(extractWriteTargets('bun test src/a.ts && cat > src/b.ts <<EOF\nx\nEOF')).toEqual(['src/b.ts'])
  })
})

describe('NAO confunde mencao com escrita', () => {
  // Cada um destes e trabalho normal. Falso positivo aqui mata o gate por irrelevancia.
  const readOnly = [
    'bun test skills/x/y.ts',
    'bun run scripts/build.ts',
    'grep foo src/a.ts',
    'cat src/a.ts',
    'head -20 src/a.ts',
    'git diff src/a.ts',
    'wc -l src/a.ts',
    'node src/a.ts',
    'rm src/a.ts',
    'ls src/a.ts',
  ]

  for (const cmd of readOnly) {
    it(`ignores: ${cmd}`, () => {
      expect(extractWriteTargets(cmd)).toEqual([])
    })
  }

  it('ignores stderr redirection to a file descriptor', () => {
    expect(extractWriteTargets('bun test src/a.ts 2>&1')).toEqual([])
    expect(extractWriteTargets('bun test src/a.ts >&2')).toEqual([])
  })

  it('ignores redirect to a non-production path', () => {
    expect(extractWriteTargets('bun test > /tmp/out.log')).toEqual([])
    expect(extractWriteTargets('bun test > out.json')).toEqual([])
  })

  // 2026-09-05 (Luiz/dev): `>` dentro de aspas e texto, nao redirect. Sem stripQuoted, este
  // comando seria lido como escrita em foo.ts.
  it('ignores a redirect operator that lives inside a quoted string', () => {
    expect(extractWriteTargets('grep "a > foo.ts" src/a.ts')).toEqual([])
    expect(extractWriteTargets(`echo 'write > bar.ts'`)).toEqual([])
  })

  it('ignores the body of a heredoc, which is data and not command', () => {
    expect(extractWriteTargets("cat > README.md <<'EOF'\nrode: cat > perigoso.ts\nEOF")).toEqual([])
  })

  it('returns empty for an empty or non-string command', () => {
    expect(extractWriteTargets('')).toEqual([])
  })
})

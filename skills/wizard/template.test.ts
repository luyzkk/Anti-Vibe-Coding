// 2026-08-12 (Luiz/dev): plano03 fase-01 — guarda do template.sh.
// INV-03 proibe rodar o wizard end-to-end (abre navegador e bloqueia em input humano), entao
// a verificacao aqui e estatica ou sobre a biblioteca isolada.
//
// Sobre D1 (CRLF), leia o comentario de `existingUnderPosixPipe` antes de mexer: a verificacao
// em runtime que a fase-01 pedia e **impossivel nesta plataforma**, e a razao esta medida la.
import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const TEMPLATE = path.join(import.meta.dir, 'template.sh')
const STAGES_MARKER = '# STAGES — author this section'

function templateSource(): string {
  return fs.readFileSync(TEMPLATE, 'utf-8').replace(/\r/g, '')
}

/**
 * Roda `_existing` com a biblioteca isolada e `grep | tail` substituidos por adapters que
 * entregam a linha como um pipe POSIX entregaria (com o CR terminal).
 *
 * **Isto nao consegue reprovar a ausencia da correcao no Windows.** Quatro camadas comem o CR
 * antes de qualquer assercao, cada uma medida com `od -c`:
 *
 *   1. `grep` (GNU 3.0/MSYS2) abre o arquivo em modo texto — `FOO=bar\r\n` sai como `FOO=bar\n`;
 *   2. `tail -n1` remove o CR de novo, mesmo recebendo a linha com ele;
 *   3. o **proprio bash do MSYS2** remove o CR terminal na substituicao de comando —
 *      `$(printf 'a\r\n')` devolve `a`. Como `_existing` usa `line=$(...)`, nenhum stub de
 *      utilitario alcanca o caso;
 *   4. o `spawnSync` do bun remove CR do stdout no Windows — `printf "a\rb"` volta `"ab"`,
 *      entao assertar sobre stdout decodificado seria vacuo mesmo se 1-3 nao existissem.
 *      (Por isso a saida vem em base64: os bytes atravessam a captura intactos.)
 *
 * Em POSIX nenhuma das quatro ocorre e o defeito e real — e o template e cross-platform
 * (`open_url` tem ramos wslview/xdg-open/open). A guarda contra remocao da correcao esta no
 * teste de fonte abaixo; este aqui prova que a funcao continua devolvendo o valor certo.
 */
function existingUnderPosixPipe(rawLine: string, key: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-tpl-'))
  try {
    const lib = path.join(dir, 'lib.sh')
    const full = templateSource()
    const cut = full.indexOf(STAGES_MARKER)
    expect(cut).toBeGreaterThan(0)
    fs.writeFileSync(lib, full.slice(0, cut), 'utf-8')

    const envFile = path.join(dir, '.env')
    fs.writeFileSync(envFile, 'placeholder\n', 'utf-8') // so para o teste -f passar
    const script = [
      `set +u`,
      `ENV_FILE='${envFile}'`,
      `source '${lib}'`,
      `grep() { printf '%s\\n' "$RAW_LINE"; }`,
      `tail() { cat; }`,
      `_existing ${key} | base64 | tr -d '\\n'`,
    ].join('; ')
    const out = spawnSync('bash', ['-c', script], {
      encoding: 'utf-8',
      env: { ...process.env, RAW_LINE: rawLine },
    })
    expect(out.status).toBe(0)
    return Buffer.from(out.stdout.trim(), 'base64').toString('utf-8')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

describe('template.sh — validade estatica', () => {
  test('passa em bash -n', () => {
    const out = spawnSync('bash', ['-n', TEMPLATE], { encoding: 'utf-8' })
    expect(out.stderr).toBe('')
    expect(out.status).toBe(0)
  })

  test('mantem o marcador STAGES que separa biblioteca de estagios', () => {
    expect(templateSource()).toContain(STAGES_MARKER)
  })

  test('grava em LF — CRLF quebraria o shebang (INV-02)', () => {
    expect(fs.readFileSync(TEMPLATE, 'utf-8')).not.toContain('\r')
  })
})

describe('_existing — correcao D1', () => {
  // Guarda real contra a remocao da correcao. G1 do plano avisa que alguem pode "consertar" a
  // biblioteca de volta ao original; runtime nao pega isso nesta plataforma, fonte pega.
  test('remove o CR terminal antes de propagar o valor', () => {
    const fn = templateSource().split('_existing() {')[1]?.split('\n}')[0] ?? ''
    expect(fn).toMatch(/line="\$\{line%\$'\\r'\}"/)
  })

  test('devolve o valor apos o primeiro = quando a linha vem com CR', () => {
    expect(existingUnderPosixPipe('FOO=bar\r', 'FOO')).toBe('bar')
  })

  test('preserva = interno no valor', () => {
    expect(existingUnderPosixPipe('TOKEN=a=b=c', 'TOKEN')).toBe('a=b=c')
  })
})

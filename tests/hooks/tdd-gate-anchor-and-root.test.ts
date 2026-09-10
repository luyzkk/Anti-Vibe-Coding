// 2026-09-09 (Luiz/dev): ADR-0023 — tres defeitos do tdd-gate que so aparecem quando alguem le a
// mensagem ou roda o hook fora do projeto da sessao.
//
// 1. A mensagem de bloqueio da ancora ENSINAVA O DESVIO: mandava o agente bloqueado editar
//    `.claude/.tdd-phase.json` para voltar ao RED. Ou seja, o gate explicava ao restringido como
//    se soltar. Quem arma e desarma a ancora e o orquestrador, nunca quem esta sob ela.
// 2. O `catch` final permitia em qualquer erro inesperado SEM emitir nada. Fail-open e a escolha
//    certa para um gate de disciplina (hook quebrado nao pode travar o trabalho), mas o silencio
//    e o que fazia a quebra ser invisivel.
// 3. A busca do teste-irmao partia do cwd da SESSAO, nao da raiz do projeto a que o arquivo
//    pertence. Numa sessao com diretorios adicionais de outro projeto, o gate olhava no lugar
//    errado. Mesma classe da issue #82, mecanismo diferente: aqui nao ha `cd` para ler.
//
// Nota sobre plataforma: ao contrario de `bash-cwd.cjs`, `projectRootFor` NAO recebe `platform`
// como parametro. Ela opera sobre caminhos nativos do host, que e o que o Claude Code entrega ao
// hook. Sem parametro de plataforma nao existe a armadilha do #82 (expectativa que concorda com o
// host em vez de com a spec), entao construir os caminhos do teste com `path.join` e honesto.
import { describe, it, expect, afterAll } from 'bun:test'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { projectRootFor } = require('../../hooks/lib/project-root.cjs')

const HOOK_PATH = path.join(import.meta.dir, '..', '..', 'hooks', 'tdd-gate.cjs')
const BASH_HOOK_PATH = path.join(import.meta.dir, '..', '..', 'hooks', 'tdd-gate-bash.cjs')
const REPO_ROOT = path.join(import.meta.dir, '..', '..')

type HookResult = { code: number; stderr: string }

/** Roda um hook qualquer com payload e cwd arbitrarios. code 0 = allow, code 2 = block. */
function runRawOn(hookPath: string, stdin: string, cwd: string): Promise<HookResult> {
  return new Promise((resolve) => {
    const childEnv: NodeJS.ProcessEnv = { ...process.env }
    delete childEnv.ANTI_VIBE_DISABLE_HOOKS
    const proc = spawn('node', [hookPath], { stdio: ['pipe', 'pipe', 'pipe'], cwd, env: childEnv })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += String(d) })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr }))
    proc.stdin.write(stdin)
    proc.stdin.end()
  })
}

function runRaw(stdin: string, cwd: string): Promise<HookResult> {
  return runRawOn(HOOK_PATH, stdin, cwd)
}

function runGate(filePath: string, toolName: string, cwd: string): Promise<HookResult> {
  return runRaw(JSON.stringify({ tool_name: toolName, tool_input: { file_path: filePath } }), cwd)
}

const tempDirs: string[] = []
function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterAll(() => {
  for (const dir of tempDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* best effort */ }
  }
})

describe('ancora: a mensagem de bloqueio nao pode ensinar o proprio desvio', () => {
  function projectWithGreenAnchor(): string {
    const dir = makeTempDir('avc-anchor-')
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true })
    fs.writeFileSync(
      path.join(dir, '.claude', '.tdd-phase.json'),
      JSON.stringify({ phase: 'green', feature: 'exemplo', immutable_tests: [] }),
    )
    fs.writeFileSync(path.join(dir, 'algo.test.ts'), 'export const antes = 1\n')
    return dir
  }

  it('bloqueia a edicao do teste durante o GREEN', async () => {
    const dir = projectWithGreenAnchor()
    const r = await runGate('algo.test.ts', 'Edit', dir)
    expect(r.code).toBe(2)
  })

  // DEFESA A MUTAR: a ausencia do token `.tdd-phase.json` na mensagem de bloqueio.
  // Esta e a assertion que importa. Uma mensagem que diz ao agente bloqueado para editar o arquivo
  // da ancora e uma receita de bypass entregue pelo proprio gate.
  it('nao instrui o agente bloqueado a editar o arquivo da ancora', async () => {
    const dir = projectWithGreenAnchor()
    const r = await runGate('algo.test.ts', 'Edit', dir)
    expect(r.stderr).not.toContain('.tdd-phase.json')
  })

  // A contraparte positiva: dizer o que fazer, e nao so o que nao fazer.
  it('manda pedir ao orquestrador, que e quem arma e desarma a ancora', async () => {
    const dir = projectWithGreenAnchor()
    const r = await runGate('algo.test.ts', 'Edit', dir)
    expect(r.stderr).toMatch(/orquestrador/i)
  })
})

describe('falha aberta, nunca muda', () => {
  // DEFESA A MUTAR: a emissao em stderr antes do allow no `catch` final.
  it('emite diagnostico quando o payload nao e JSON, e ainda assim permite', async () => {
    const dir = makeTempDir('avc-badinput-')
    const r = await runRaw('isto nao e json', dir)
    expect(r.code).toBe(0)
    expect(r.stderr.trim().length).toBeGreaterThan(0)
  })

  // O caminho Bash tem o MESMO `catch` mudo. Consertar so um lado e o defeito que a 7.8.0
  // registrou como "o fix cobriu so o caminho Bash", agora ao contrario. Os dois ou nenhum.
  it('o caminho Bash tambem emite diagnostico ao falhar, e ainda assim permite', async () => {
    const dir = makeTempDir('avc-badinput-bash-')
    const r = await runRawOn(BASH_HOOK_PATH, 'isto nao e json', dir)
    expect(r.code).toBe(0)
    expect(r.stderr.trim().length).toBeGreaterThan(0)
  })
})

describe('projectRootFor: a raiz vem do caminho do arquivo, nao do cwd da sessao', () => {
  // Preditor literal: nao toca o disco, entao a expectativa nao pode concordar com o host por
  // coincidencia.
  const raiz = path.join(path.sep, 'a', 'b', 'c')
  const isRaiz = (dir: string) => dir === raiz

  it('sobe do arquivo ate o diretorio marcado como raiz', () => {
    const arquivo = path.join(raiz, 'src', 'nested', 'foo.ts')
    expect(projectRootFor(arquivo, path.join(path.sep, 'fallback'), isRaiz)).toBe(raiz)
  })

  it('devolve a propria pasta do arquivo quando ela ja e a raiz', () => {
    const arquivo = path.join(raiz, 'foo.ts')
    expect(projectRootFor(arquivo, path.join(path.sep, 'fallback'), isRaiz)).toBe(raiz)
  })

  it('cai no fallback quando nenhum ancestral e raiz de projeto', () => {
    const fallback = path.join(path.sep, 'fallback')
    const arquivo = path.join(path.sep, 'x', 'y', 'foo.ts')
    expect(projectRootFor(arquivo, fallback, () => false)).toBe(fallback)
  })

  it('cai no fallback para caminho relativo, que nao tem ancestral confiavel', () => {
    const fallback = path.join(path.sep, 'fallback')
    expect(projectRootFor('src/foo.ts', fallback, () => false)).toBe(fallback)
  })
})

describe('gate: o teste-irmao e procurado no projeto DONO do arquivo', () => {
  // DEFESA A MUTAR: `needsTest` receber a raiz derivada do caminho, e nao `process.cwd()`.
  // Sem o fix, o gate procura `zzunico` dentro do repo da sessao, nao acha, e bloqueia escrita
  // legitima num projeto que TEM o teste.
  it('permite escrita em projeto vizinho que tem o teste-irmao', async () => {
    const projeto = makeTempDir('avc-vizinho-')
    fs.writeFileSync(path.join(projeto, 'package.json'), '{"name":"vizinho"}')
    fs.mkdirSync(path.join(projeto, 'src'), { recursive: true })
    fs.mkdirSync(path.join(projeto, 'tests'), { recursive: true })
    fs.writeFileSync(path.join(projeto, 'tests', 'zzunico.test.ts'), 'export const t = 1\n')

    const alvo = path.join(projeto, 'src', 'zzunico.ts')
    const r = await runGate(alvo, 'Write', REPO_ROOT)
    expect(r.code).toBe(0)
  })

  // O contrapeso obrigatorio: estreitar o falso positivo nao pode afrouxar o gate.
  it('continua bloqueando producao sem teste no projeto vizinho', async () => {
    const projeto = makeTempDir('avc-vizinho-sem-teste-')
    fs.writeFileSync(path.join(projeto, 'package.json'), '{"name":"vizinho"}')
    fs.mkdirSync(path.join(projeto, 'src'), { recursive: true })

    const alvo = path.join(projeto, 'src', 'zzsemteste.ts')
    const r = await runGate(alvo, 'Write', REPO_ROOT)
    expect(r.code).toBe(2)
  })
})

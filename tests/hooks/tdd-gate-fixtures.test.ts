// 2026-09-05 (Luiz/dev): regressao do falso positivo do tdd-gate em diretorio de fixture.
//
// Contexto (GT-fase01-1 do PRD route-auth-matrix): ao criar a fixture
// `tests/fixtures/route-auth-matrix/nextjs-minimal/`, o `route.ts` passou por coincidencia de
// regex (casa NEXTJS_ROUTE_FILE) e o `middleware.ts` ao lado foi BLOQUEADO, exigindo teste
// homonimo — que arquivo de dados nunca tera. A saida usada na epoca foi criar o arquivo por
// outra ferramenta, fora do matcher `Write|Edit`. O contorno e que era o problema: se "o hook
// bloqueou, troco de ferramenta" vira habito, o gate perde a funcao.
//
// O teste que MAIS importa aqui e o de producao: o gate tem de continuar bloqueando codigo de
// producao sem teste. Estreitar o falso positivo nao pode virar afrouxar o gate.
import { describe, it, expect } from 'bun:test'
import { spawn } from 'node:child_process'
import path from 'node:path'

const HOOK_PATH = path.join(import.meta.dir, '..', '..', 'hooks', 'tdd-gate.cjs')
const REPO_ROOT = path.join(import.meta.dir, '..', '..')

type HookResult = { code: number; stderr: string }

/** Roda o hook com o payload real do PreToolUse. code 0 = allow, code 2 = block. */
function runGate(filePath: string, toolName = 'Write'): Promise<HookResult> {
  return new Promise((resolve) => {
    const childEnv: NodeJS.ProcessEnv = { ...process.env }
    delete childEnv.ANTI_VIBE_DISABLE_HOOKS
    const proc = spawn('node', [HOOK_PATH], { stdio: ['pipe', 'pipe', 'pipe'], cwd: REPO_ROOT, env: childEnv })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += String(d) })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr }))
    proc.stdin.write(JSON.stringify({ tool_name: toolName, tool_input: { file_path: filePath } }))
    proc.stdin.end()
  })
}

describe('tdd-gate: diretorio de fixture nao exige teste homonimo', () => {
  // Este e o arquivo exato que foi bloqueado e levou ao contorno.
  it('allows middleware.ts under tests/fixtures', async () => {
    const r = await runGate('tests/fixtures/route-auth-matrix/nextjs-minimal/middleware.ts')
    expect(r.code).toBe(0)
  })

  it('allows an arbitrary .ts under tests/fixtures, not just Next convention names', async () => {
    const r = await runGate('tests/fixtures/algum-caso/helper-sem-teste.ts')
    expect(r.code).toBe(0)
  })

  // __fixtures__ e a convencao dominante no repo (12 diretorios).
  it('allows files under __fixtures__ anywhere in the tree', async () => {
    const r = await runGate('skills/init/lib/__fixtures__/algum-arquivo.ts')
    expect(r.code).toBe(0)
  })

  // 2026-09-05 (Luiz/dev): nome deliberadamente FORA da convencao Next. Com `page.tsx` aqui o
  // teste passava mesmo sem o fix (casa NEXTJS_ROUTE_FILE) — passaria pelo motivo errado, que e
  // exatamente a assimetria que originou este bug.
  it('allows .tsx under a fixture directory even when the name is not a Next convention', async () => {
    const r = await runGate('tests/fixtures/algum-caso/componente-qualquer.tsx')
    expect(r.code).toBe(0)
  })

  it('allows Edit on a fixture, not only Write', async () => {
    const r = await runGate('tests/fixtures/route-auth-matrix/nextjs-minimal/middleware.ts', 'Edit')
    expect(r.code).toBe(0)
  })
})

describe('tdd-gate: o bloqueio de producao continua de pe', () => {
  // 2026-09-05 (Luiz/dev): ESTE e o teste que nao pode quebrar. Se ele virar verde por engano,
  // o gate deixou de existir e ninguem percebe.
  it('still blocks a production file that has no test', async () => {
    const r = await runGate('skills/security/lib/arquivo-de-producao-sem-teste.ts')
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('TDD GATE')
  })

  it('still blocks production code whose path merely mentions fixture in the filename', async () => {
    // `fixtures` tem de casar como SEGMENTO de diretorio, nao como pedaco do nome do arquivo.
    const r = await runGate('skills/security/lib/fixtures-loader.ts')
    expect(r.code).toBe(2)
  })

  // middleware NAO entra em NEXTJS_ROUTE_FILE por decisao — e onde a auth mora.
  it('still blocks a production middleware.ts without a test', async () => {
    const r = await runGate('src/middleware.ts')
    expect(r.code).toBe(2)
  })

  // Controle positivo: sem ele, os testes acima passariam mesmo se o gate bloqueasse TUDO.
  it('still allows a production file that has a colocated test', async () => {
    const r = await runGate('skills/security/lib/stack-aware-preface.ts')
    expect(r.code).toBe(0)
  })
})

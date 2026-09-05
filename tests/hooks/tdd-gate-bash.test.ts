// 2026-09-05 (Luiz/dev): integracao do TDD Gate no caminho Bash.
//
// Fecha o bypass estrutural: o gate so casava `Write|Edit`, entao escrever por shell passava direto.
// Aconteceu de verdade no Plano 01 do route-auth-matrix (GT-fase01-1).
//
// O grupo que NAO pode falhar e o de comandos legitimos. Falso positivo aqui bloqueia trabalho
// normal, e gate que atrapalha e desligado — o que devolveria o bypass de bandeja.
import { describe, it, expect } from 'bun:test'
import { spawn } from 'node:child_process'
import path from 'node:path'

const HOOK_PATH = path.join(import.meta.dir, '..', '..', 'hooks', 'tdd-gate-bash.cjs')
const REPO_ROOT = path.join(import.meta.dir, '..', '..')

type HookResult = { code: number; stderr: string; ms: number }

function runGate(command: string): Promise<HookResult> {
  return new Promise((resolve) => {
    const started = Date.now()
    const childEnv: NodeJS.ProcessEnv = { ...process.env }
    delete childEnv.ANTI_VIBE_DISABLE_HOOKS
    const proc = spawn('node', [HOOK_PATH], { stdio: ['pipe', 'pipe', 'pipe'], cwd: REPO_ROOT, env: childEnv })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += String(d) })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, ms: Date.now() - started }))
    proc.stdin.write(JSON.stringify({ tool_name: 'Bash', tool_input: { command } }))
    proc.stdin.end()
  })
}

describe('caminho Bash: escrita de producao sem teste e bloqueada', () => {
  // A forma exata do contorno que originou esta tarefa.
  it('blocks a heredoc write to a production file with no test', async () => {
    const r = await runGate("cat > skills/security/lib/sem-teste-nenhum.ts <<'EOF'\nexport const x = 1\nEOF")
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('TDD GATE (bash)')
  })

  it('blocks sed -i on a production file with no test', async () => {
    const r = await runGate("sed -i 's/a/b/' skills/security/lib/sem-teste-nenhum.ts")
    expect(r.code).toBe(2)
  })

  it('names the file in the message, so the block is actionable', async () => {
    const r = await runGate('echo x > skills/security/lib/sem-teste-nenhum.ts')
    expect(r.stderr).toContain('sem-teste-nenhum')
  })
})

describe('caminho Bash: trabalho legitimo nao e tocado', () => {
  // 2026-09-05 (Luiz/dev): ESTE bloco e o que decide se o gate sobrevive ao uso real.
  const legitimate = [
    'bun test skills/security/lib/stack-aware-preface.ts',
    'bun run scripts/parity-audit.ts',
    'grep foo skills/security/lib/stack-aware-preface.ts',
    'cat skills/security/lib/stack-aware-preface.ts',
    'git diff skills/security/lib/stack-aware-preface.ts',
    'bun test skills/security/lib/stack-aware-preface.ts 2>&1',
    'bun run test > /tmp/saida.log',
    'echo "cuidado com cat > x.ts" ',
  ]

  for (const cmd of legitimate) {
    it(`allows: ${cmd}`, async () => {
      const r = await runGate(cmd)
      expect(r.code).toBe(0)
    })
  }

  it('allows writing a test file — that is the Red phase, not a bypass', async () => {
    const r = await runGate("cat > skills/security/lib/novo.test.ts <<'EOF'\nx\nEOF")
    expect(r.code).toBe(0)
  })

  it('allows writing a fixture, consistent with the Write path', async () => {
    const r = await runGate("cat > tests/fixtures/algo/dado.ts <<'EOF'\nx\nEOF")
    expect(r.code).toBe(0)
  })

  it('allows writing production that already has a colocated test', async () => {
    const r = await runGate('echo x > skills/security/lib/stack-aware-preface.ts')
    expect(r.code).toBe(0)
  })
})

describe('custo: o hook roda em TODO comando Bash', () => {
  // O pre-filtro sai antes de qualquer I/O quando nao ha caminho de producao no texto.
  it('returns quickly for a command with no production path', async () => {
    const r = await runGate('git status --short')
    expect(r.code).toBe(0)
    expect(r.ms).toBeLessThan(2000)
  })

  it('never exceeds the 5s safety timeout even when it has work to do', async () => {
    const r = await runGate('echo x > skills/security/lib/sem-teste-nenhum.ts')
    expect(r.ms).toBeLessThan(5000)
  })
})

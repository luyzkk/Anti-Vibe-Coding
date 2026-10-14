// tests/hooks/hooks-wiring.test.ts
// 2026-10-13 (Luiz/dev): 8.0 fatia 2 — 7 dos 16 comandos do hooks.json estavam mortos havia meses com a
// suite verde, porque nenhum teste executava o COMANDO configurado: os testes chamavam as funcoes direto.
// Este arquivo roda cada comando exatamente como o Claude Code roda (bash -c, CLAUDE_PLUGIN_ROOT, payload
// no stdin) e exige um efeito observavel. Todo comando do hooks.json precisa de um caso aqui.
import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const ROOT = path.join(import.meta.dir, '..', '..')

type HookEntry = { matcher?: string; hooks: Array<{ command: string }> }
type HooksFile = { hooks: Record<string, HookEntry[]> }

function readHooks(): HooksFile {
  const raw: unknown = JSON.parse(readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8'))
  if (typeof raw !== 'object' || raw === null || !('hooks' in raw)) throw new Error('hooks.json sem a chave hooks')
  return raw as HooksFile
}

/** Nome curto de cada comando: o arquivo .cjs que ele carrega, ou "banner" para o printf do SessionStart. */
function keyOf(command: string): string {
  const file = /hooks\/([a-z0-9-]+)\.cjs/.exec(command)
  if (file) return file[1] ?? command
  if (command.startsWith('printf')) return 'banner'
  return command.slice(0, 40)
}

function commandFor(key: string): { event: string; command: string } {
  for (const [event, entries] of Object.entries(readHooks().hooks)) {
    for (const entry of entries) {
      for (const h of entry.hooks) if (keyOf(h.command) === key) return { event, command: h.command }
    }
  }
  throw new Error(`hooks.json nao tem comando para "${key}"`)
}

type Run = { code: number; stdout: string; stderr: string }

function runConfigured(key: string, payload: Record<string, unknown>, cwd: string, home: string): Run {
  const { event, command } = commandFor(key)
  const proc = Bun.spawnSync(['bash', '-c', command], {
    cwd,
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT, CLAUDE_PROJECT_DIR: cwd, HOME: home, USERPROFILE: home },
    stdin: Buffer.from(JSON.stringify({ session_id: 'wiring', cwd, hook_event_name: event, ...payload })),
  })
  return { code: proc.exitCode ?? -1, stdout: proc.stdout.toString(), stderr: proc.stderr.toString() }
}

function sandbox(): { cwd: string; home: string } {
  const base = mkdtempSync(path.join(tmpdir(), 'hooks-wiring-'))
  const cwd = path.join(base, 'proj')
  const home = path.join(base, 'home')
  mkdirSync(cwd, { recursive: true })
  mkdirSync(home, { recursive: true })
  return { cwd, home }
}

const CASES: Record<string, () => void> = {
  banner: () => {
    const { cwd, home } = sandbox()
    const run = runConfigured('banner', {}, cwd, home)
    expect(run.stdout).toContain('[Anti-Vibe-Coding 8.0]')
    expect(run.stdout.trim().split('\n').length).toBeLessThanOrEqual(6)
  },

  'pre-tool-use-destructive-guard': () => {
    const { cwd, home } = sandbox()
    const run = runConfigured('pre-tool-use-destructive-guard', { tool_name: 'Bash', tool_input: { command: 'git reset --hard HEAD~1' } }, cwd, home)
    expect(run.code).toBe(2)
  },

  'tdd-gate': () => {
    const { cwd, home } = sandbox()
    writeFileSync(path.join(cwd, 'package.json'), '{}')
    mkdirSync(path.join(cwd, 'src'), { recursive: true })
    const run = runConfigured('tdd-gate', {
      tool_name: 'Write',
      tool_input: { file_path: path.join(cwd, 'src', 'payment.ts'), content: 'export const pay = () => 1\n' },
    }, cwd, home)
    expect(run.code).toBe(2)
  },

  'tdd-gate-bash': () => {
    const { cwd, home } = sandbox()
    writeFileSync(path.join(cwd, 'package.json'), '{}')
    mkdirSync(path.join(cwd, 'src'), { recursive: true })
    const run = runConfigured('tdd-gate-bash', { tool_name: 'Bash', tool_input: { command: 'echo "export const pay = 1" > src/payment.ts' } }, cwd, home)
    expect(run.code).toBe(2)
  },

  'pre-commit-suite': () => {
    const { cwd, home } = sandbox()
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'wiring', scripts: { test: 'node -e "process.exit(1)"' } }))
    const run = runConfigured('pre-commit-suite', { tool_name: 'Bash', tool_input: { command: 'git commit -m "feat: wiring"' } }, cwd, home)
    expect(run.code).toBe(2)
  },

  'stop-reflector': () => {
    const { cwd, home } = sandbox()
    const transcript = path.join(cwd, '..', 'transcript.jsonl')
    writeFileSync(transcript, JSON.stringify({ type: 'user', message: { role: 'user', content: 'isso está errado, reverta' } }) + '\n')
    const run = runConfigured('stop-reflector', { transcript_path: transcript, stop_hook_active: false }, cwd, home)
    const out: unknown = JSON.parse(run.stdout)
    expect(out).toMatchObject({ decision: 'block' })
    expect(run.stdout).toContain('/anti-vibe-coding:lessons-learned')
  },
}

describe('hooks.json — cada comando configurado funciona de verdade', () => {
  test('todo comando do hooks.json tem um caso de fiacao neste arquivo', () => {
    const keys = Object.values(readHooks().hooks).flatMap((entries) => entries.flatMap((e) => e.hooks.map((h) => keyOf(h.command))))
    const semCaso = keys.filter((k) => !(k in CASES))
    expect(semCaso).toEqual([])
  })

  for (const [key, check] of Object.entries(CASES)) {
    test(`${key}: o comando configurado produz o efeito`, check, 30_000)
  }
})

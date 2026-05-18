// skills/init/lib/run-init-needs-user.test.ts
import { describe, test, expect } from 'bun:test'
import { runInit } from './run-init'
import type { Step } from './steps/types'

describe('runInit — needsUser flow (Plano 03 fase-06)', () => {
  test('pausa, chama askUser, re-invoca step com resposta em flags.__interactiveAnswer', async () => {
    let callCount = 0
    let lastFlags: Readonly<Record<string, boolean | string>> = {}
    const interactiveStep: Step = {
      id: 'interactive',
      async run(ctx) {
        callCount += 1
        lastFlags = ctx.flags
        if (callCount === 1) {
          return {
            mutated: false,
            summary: '',
            needsUser: { prompt: 'pick one', options: ['y', 'N'] },
          }
        }
        return { mutated: false, summary: 'done' }
      },
    }

    let askUserCalls = 0
    const askUserStub = async (prompt: string, opts: readonly string[]): Promise<string> => {
      askUserCalls += 1
      expect(prompt).toBe('pick one')
      expect(opts).toEqual(['y', 'N'])
      return 'y'
    }

    const result = await runInit([], {
      registry: [interactiveStep],
      cwd: '/tmp',
      log: () => {},
      askUser: askUserStub,
    })

    expect(askUserCalls).toBe(1)
    expect(callCount).toBe(2)
    expect(lastFlags.__interactiveAnswer).toBe('y')
    expect(result.kind).toBe('ok')
  })

  test('anti-loop guard: step que retorna needsUser duas vezes vira Error', async () => {
    const buggyStep: Step = {
      id: 'buggy-interactive',
      async run() {
        // 2026-05-17 (Luiz/dev): sempre pede user, mesmo apos resposta. Bug — dispatcher deve abortar.
        return { mutated: false, summary: '', needsUser: { prompt: 'p', options: ['a'] } }
      },
    }
    await expect(
      runInit([], {
        registry: [buggyStep],
        cwd: '/tmp',
        log: () => {},
        askUser: async () => 'a',
      }),
    ).rejects.toThrow(/anti-loop guard/)
  })
})

// 2026-10-18 (Luiz/dev): 8.0 fatia 5 — a memoria (D5).
// docs/exec-plans/active/2026-10-13-anti-vibe-8/fatia-5.md
//
// O problema medido: o plugin escrevia o que o projeto aprende e ninguem lia de volta. Este arquivo trava
// o contrato da fatia, uma fase por vez: as pecas que nunca rodavam sairam (F5-6), o indice existe e e
// conferido (F5-1, F5-2), os quatro momentos de leitura (F5-3) e a captura no fim da fatia (F5-4, F5-5).
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.join(import.meta.dir, '..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8').replace(/\r/g, '')
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel))

describe('as pecas de memoria que nunca rodavam sairam (F5-6)', () => {
  test.each([
    // ninguem chamava o agente avaliador: o filtro de qualidade vive no proprio /lessons-learned
    'agents/lesson-evaluator.md',
    // o init atual nao chama nenhum destes; importavam licoes de formatos antigos
    'skills/init/lib/compound-writer.ts',
    'skills/init/lib/prompts/compound.md',
    'skills/init/lib/compound-imported-writer.ts',
    'skills/init/lib/compound-imported-constants.ts',
    'skills/init/lib/progress-txt-parser.ts',
    // nenhum hook nem skill chamava o gerador; o docs/STATE.md e editado a mao
    'skills/lib/state-md-generator.ts',
  ])('%s nao existe mais', (rel) => {
    expect(exists(rel)).toBe(false)
  })

  test('o perfil de modelos nao lista mais o agente avaliador', () => {
    expect(read('config/model-profiles.json')).not.toContain('lesson-evaluator')
  })

  test('o modelo do docs/STATE.md nao promete atualizacao automatica', () => {
    expect(read('skills/init/assets/templates/docs/STATE.md.tpl')).not.toMatch(/in future|by hooks/i)
  })
})

describe('o indice das licoes existe e e mantido por script (F5-1, F5-2)', () => {
  test.each(['package.json', 'skills/init/assets/templates/package.json.tpl'])('%s tem o comando compound:index', (rel) => {
    expect(read(rel)).toMatch(/"compound:index":\s*"[^"]*--write-index"/)
  })

  test('o /lessons-learned roda o indice depois de gravar a licao', () => {
    const captura = read('skills/lessons-learned/SKILL.md').split('## Fluxo de Captura (v6)')[1] ?? ''
    expect(captura).toContain('compound:index')
  })

  test.each(['docs/compound/README.md', 'skills/init/assets/templates/docs/compound/README.md.tpl'])(
    '%s explica o indice e o comando que o gera',
    (rel) => {
      const body = read(rel)
      expect(body).toContain('INDEX.md')
      expect(body).toContain('compound:index')
    },
  )

  test('este repositorio tem o indice gerado', () => {
    expect(exists('docs/compound/INDEX.md')).toBe(true)
  })
})

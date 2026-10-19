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

// Corpo de uma secao ate o proximo heading de nivel igual ou acima; '' se o heading nao existe.
function section(rel: string, heading: RegExp): string {
  const lines = read(rel).split('\n')
  const start = lines.findIndex((l) => heading.test(l))
  if (start === -1) return ''
  const level = (lines[start] ?? '').match(/^#+/)?.[0].length ?? 0
  const out: string[] = []
  let inFence = false
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('```')) inFence = !inFence
    const m = line.match(/^(#+) /)
    if (!inFence && m && (m[1] ?? '').length <= level) break
    out.push(line)
  }
  return out.join('\n')
}

describe('o Claude consulta o indice nos quatro momentos (F5-3)', () => {
  test.each([
    ['write-prd, ao escrever a pagina', 'skills/write-prd/SKILL.md', /^## Step 2/],
    ['plan-feature, ao detalhar uma fatia', 'skills/plan-feature/SKILL.md', /^## Step 9/],
    ['incident-response, ao diagnosticar', 'skills/incident-response/SKILL.md', /^### Etapa 4/],
    ['verify-work, na revisao final', 'skills/verify-work/SKILL.md', /^### 2g\./],
  ])('%s le o indice e abre so a licao que bate', (_label, rel, heading) => {
    const body = section(rel, heading)
    expect(body.length, `secao ${heading} ausente em ${rel}`).toBeGreaterThan(0)
    expect(body).toContain('docs/compound/INDEX.md')
    expect(body).toMatch(/abr\w+\s+(a\s+li[cç][aã]o\s+inteira|o\s+arquivo\s+da\s+li[cç][aã]o)\s+s[oó]\s+quando/i)
    expect(body, 'projeto sem indice nao pode travar o fluxo').toMatch(/sem (o )?[ií]ndice/i)
  })

  test('na pagina, a licao que bate vira premissa ou cenario', () => {
    expect(section('skills/write-prd/SKILL.md', /^## Step 2/)).toMatch(/Cen[aá]rio/)
  })

  test('na revisao final, as listas de revisao do projeto entram junto', () => {
    const body = section('skills/verify-work/SKILL.md', /^### 2g\./)
    expect(body).toContain('docs/review-checklists/')
    expect(read('skills/verify-work/SKILL.md')).toMatch(/^### Li[cç][oõ]es e listas de revis[aã]o/m)
  })

  test('a revisao final nao cita mais a aderencia ao perfil, que saiu na fatia 4', () => {
    expect(read('skills/verify-work/SKILL.md')).not.toContain('perfil)')
  })
})

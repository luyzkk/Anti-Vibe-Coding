// 2026-10-14 (Luiz/dev): 8.0 fatia 3, fase 3 — o plano vem em fatias (D3, F3-4).
// docs/exec-plans/active/2026-10-13-anti-vibe-8/fatia-3.md
//
// A pagina lista as fatias, uma linha cada. Cada fatia vira um planoNN, e so a que vai comecar ganha
// fases: as seguintes sao detalhadas quando chegam, ja com o que as anteriores ensinaram. Antes, o
// plan-feature quebrava a feature inteira em planos e fases no comeco, e a fase escrita cedo demais
// era a parte do plano que mais envelhecia.
//
// Assere apenas contrato: headings, campos e ponteiros. A prosa pode ser reescrita sem tocar aqui.
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.join(import.meta.dir, '..')

/** CRLF quebra regex ancorada em `$` — repo Windows, mesmo cuidado dos outros contratos. */
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8').replace(/\r/g, '')

const planFeature = read('skills/plan-feature/SKILL.md')
const overview = read('skills/plan-feature/templates/plan-overview-template.md')
const state = read('skills/plan-feature/templates/state-template.md')
const executePlan = read('skills/execute-plan/SKILL.md')

/** Corpo de uma secao ate o proximo heading de nivel igual ou superior; '' se o heading nao existe. */
function section(doc: string, heading: RegExp): string {
  const lines = doc.split('\n')
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

describe('plan-feature — cada fatia da pagina vira um plano, detalhado quando comeca (F3-4)', () => {
  const fatias = () => section(planFeature, /^### Fatias da p[aá]gina/)

  test('a secao "Fatias da pagina" existe e liga fatia a planoNN', () => {
    expect(fatias().length, 'Secao "### Fatias da pagina" ausente do plan-feature/SKILL.md').toBeGreaterThan(0)
    expect(fatias()).toMatch(/plano\{?NN\}?/)
  })

  test('so a fatia que vai comecar ganha fases', () => {
    expect(
      /s[oó] a (fatia|pr[oó]xima)/i.test(fatias()) && /quando (ela )?(for )?come[cç]ar/i.test(fatias()),
      `[contrato — D3] A regra de detalhar so a fatia que vai comecar sumiu. Sem ela o plan-feature volta ` +
        `a escrever todas as fases no comeco, quando ainda nao sabe o que as primeiras fatias vao ensinar.`,
    ).toBe(true)
  })

  test('pagina sem fatias (anterior a 8.0) ganha fatias propostas e aprovadas na propria pagina', () => {
    // Uma fonte de verdade: a lista de fatias mora na pagina, nunca so no PLAN.md.
    expect(/anterior [aà] 8\.0/i.test(fatias()) && /## Fatias/.test(fatias()) && /aprova/i.test(fatias())).toBe(true)
  })

  test('o Step 9 nao oferece mais criar o plano seguinte logo depois do primeiro', () => {
    expect(planFeature).not.toContain('Quer criar o Plano 2?')
    expect(section(planFeature, /^## Step 9/)).toContain('--fatia')
  })

  test('o argumento --fatia esta no argument-hint', () => {
    expect(planFeature).toMatch(/^argument-hint:.*--fatia/m)
  })

  test('os planos nao sao mais agrupados por camada tecnica', () => {
    // "Plano 2: API Core / Plano 3: Componentes" e corte horizontal — o contrario da fatia vertical.
    expect(planFeature).not.toContain('Plano 2 "API Core"')
  })
})

describe('plan-feature — le a pagina nova (fatia 3, fases 1 e 2)', () => {
  test('os cortes saem de "Precisa ter" e "Deveria ter", em portugues', () => {
    expect(planFeature).toContain('Precisa ter')
    expect(planFeature).not.toMatch(/Ler cada requisito Must Have e Should Have do PRD/)
  })

  test('o CA-SEC-* nasce dos AB-* da pagina e do mapa de ameacas do DESIGN.md', () => {
    const risco = section(planFeature, /^### Classificacao de Risco do Slice/)
    expect(
      /AB-\*/.test(risco) && risco.includes('DESIGN.md'),
      `[contrato — F3-3] A classificacao de risco nao aponta para os AB-* da pagina e para o DESIGN.md. ` +
        `O mapa de ameacas saiu da pagina; procurar "Ameacas & Dados" no PRD nao acha nada.`,
    ).toBe(true)
    expect(risco).not.toMatch(/se o PRD tem a secao "Ameacas & Dados"/)
  })
})

describe('PLAN.md e STATE.md — fatia nao detalhada nao tem fases inventadas', () => {
  test('o PLAN.md aponta para as fatias da pagina em vez de repeti-las', () => {
    expect(overview).toMatch(/^## Fatias/m)
    expect(overview).toMatch(/`## Fatias` da p[aá]gina/)
    expect(overview).toContain('a detalhar')
  })

  test('o PLAN.md nao lista as fases de todos os planos', () => {
    expect(overview).not.toMatch(/^## Resumo por Plano/m)
  })

  test('o STATE.md tem o estado "a detalhar"', () => {
    expect(state).toContain('a detalhar')
  })
})

describe('execute-plan — ao fechar uma fatia, oferece detalhar a proxima (F3-4)', () => {
  test('o Step 6a oferece detalhar a proxima fatia', () => {
    expect(section(executePlan, /^### 6a\./)).toMatch(/Detalhar a fatia/)
  })

  test('o Step 3a trata a fatia que ainda nao foi detalhada', () => {
    const step3a = section(executePlan, /^### 3a\./)
    expect(/a detalhar|ainda n[aã]o foi detalhada/i.test(step3a) && step3a.includes('--fatia')).toBe(true)
  })
})

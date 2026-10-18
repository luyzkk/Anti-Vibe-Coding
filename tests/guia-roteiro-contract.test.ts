// 2026-10-18 (Luiz/dev): 8.0 fatia 4 (D4, F4-1, F4-2) — os guias viram roteiros de perguntas.
// docs/exec-plans/active/2026-10-13-anti-vibe-8/fatia-4.md
//
// O guia deixa de ser aula e vira conversa: o Claude diz a decisao em uma frase, pergunta ate 3 coisas que so
// o usuario sabe numa tela so, mostra 2 ou 3 opcoes com pros, contras, custo e quando seria a escolha errada,
// recomenda ligado as respostas e registra a escolha. O texto longo antigo fica em references/guia-completo.md,
// lido so quando o usuario pedir (D4).
//
// Assere apenas CONTRATO — a forma do roteiro. A qualidade das perguntas de cada decisao e revisada pelo
// usuario na aprovacao de cada guia, e nao e verificavel por teste.
//
// A lista GUIAS cresce uma fase por vez: system-design (fase 5), security (fase 6), architecture (fase 7).
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.join(import.meta.dir, '..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8').replace(/\r/g, '')

type Guia = { skill: string; minDecisoes: number }

const GUIAS: Guia[] = [
  { skill: 'system-design', minDecisoes: 10 },
  { skill: 'security', minDecisoes: 11 },
]
const MAX_LINHAS = 230

describe.each(GUIAS)('$skill — roteiro de decisao (D4)', ({ skill, minDecisoes }) => {
  const rel = `skills/${skill}/SKILL.md`
  const body = read(rel)
  const frontmatter = body.split(/^---$/m)[1] ?? ''

  test('pode perguntar ao usuario (AskUserQuestion) e continua sem escrever codigo', () => {
    expect(frontmatter).toMatch(/^allowed-tools:.*AskUserQuestion/m)
    expect(frontmatter).not.toMatch(/^allowed-tools:.*\b(Write|Edit|Bash)\b/m)
  })

  test('Como Operar traz os seis passos do roteiro', () => {
    const operar = body.split(/^## Como Operar/m)[1]?.split(/^## /m)[0] ?? ''
    expect(operar.length, `${rel}: secao "## Como Operar" ausente`).toBeGreaterThan(0)
    expect(operar, 'passo 1: a decisao em uma frase').toMatch(/uma frase/i)
    expect(operar, 'passo 2: ate 3 perguntas numa tela so').toMatch(/at[eé] 3 perguntas/i)
    expect(operar, 'passo 2: numa tela so').toMatch(/numa tela/i)
    expect(operar, 'passo 3: 2 ou 3 opcoes com pros, contras, custo e quando erra').toMatch(/2 ou 3 op[cç]/i)
    expect(operar, 'passo 3: custo e quando seria a escolha errada').toMatch(/quando seria a escolha errada/i)
    expect(operar, 'passo 4: recomendacao ligada as respostas').toMatch(/recomend/i)
    expect(operar, 'passo 5: sem resposta, o padrao de um senior, dizendo qual').toMatch(/n[aã]o souber[\s\S]{0,200}padr[aã]o/i)
    expect(operar, 'passo 6: registra a escolha').toMatch(/registr/i)
  })

  test('registra no DESIGN.md da feature ou num ADR do projeto (F4-2)', () => {
    expect(body).toContain('DESIGN.md')
    expect(body).toMatch(/## Decis[oõ]es/)
    expect(body).toContain('decision-registry')
  })

  test('cada decisao do catalogo tem perguntas, opcoes, padrao e quando erra', () => {
    const decisoes = body.split(/^### /m).slice(1)
    const completas = decisoes.filter(
      (d) => /\*\*Perguntas:\*\*/.test(d) && /\*\*Op[cç][oõ]es:\*\*/.test(d) && /\*\*Padr[aã]o:\*\*/.test(d) && /\*\*Errada quando:\*\*/.test(d),
    )
    expect(
      completas.length,
      `${rel}: so ${completas.length} decisoes completas (Perguntas, Opcoes, Padrao, Errada quando); o minimo e ${minDecisoes}`,
    ).toBeGreaterThanOrEqual(minDecisoes)
  })

  test('o texto antigo ficou em references/guia-completo.md, lido so a pedido', () => {
    const guia = `skills/${skill}/references/guia-completo.md`
    expect(fs.existsSync(path.join(ROOT, guia)), `${guia} ausente`).toBe(true)
    expect(body).toContain('references/guia-completo.md')
    expect(body).toMatch(/s[oó] (é lido )?quando o usu[aá]rio pedir/i)
    expect(read(guia).split('\n').length, 'o guia completo nao pode ter encolhido a um resumo').toBeGreaterThan(150)
  })

  test('toda reference do guia e citada no roteiro', () => {
    const dir = path.join(ROOT, `skills/${skill}/references`)
    const orfas = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md') && f !== 'guia-completo.md')
      .filter((f) => !body.includes(f))
    expect(orfas, `references que o roteiro nao cita: ${orfas.join(', ')}`).toEqual([])
  })

  test(`cabe em ${MAX_LINHAS} linhas`, () => {
    expect(body.split('\n').length).toBeLessThanOrEqual(MAX_LINHAS)
  })

  test('o guia completo nao carrega mais o cabecalho de skill', () => {
    const guia = read(`skills/${skill}/references/guia-completo.md`)
    expect(guia).not.toMatch(/^name: /m)
    expect(guia).not.toContain('stack-aware-preface')
    expect(guia).not.toContain('$ARGUMENTS')
  })
})

// 2026-10-18 (Luiz/dev): o que so a seguranca tem — a lista de aprovacao humana e o checklist ASVS.
describe('security — o que o roteiro preserva do guia antigo', () => {
  const body = read('skills/security/SKILL.md')

  test('a lista de aprovacao humana continua com as 7 mudancas que nunca se auto-aplicam', () => {
    // write-prd/templates/design-template.md aponta para este titulo exato.
    const secao = body.split(/^### Aprovacao Humana Necessaria/m)[1]?.split(/^#{1,3} /m)[0] ?? ''
    expect(secao.length, 'secao "### Aprovacao Humana Necessaria" ausente').toBeGreaterThan(0)
    const itens = secao.split('\n').filter((l) => /^\d\. /.test(l))
    expect(itens.length).toBe(7)
    expect(secao).toMatch(/nunca auto-aplicar/i)
  })

  test('o checklist ASVS L1 ficou em references/checklist-minimo.md e o roteiro o cita', () => {
    const checklist = read('skills/security/references/checklist-minimo.md')
    for (const cap of ['V1', 'V4', 'V5', 'V6', 'V7', 'V8', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16']) {
      expect(checklist, `capitulo ${cap} sumiu do checklist`).toMatch(new RegExp(`^### ${cap} `, 'm'))
    }
    expect(body).toContain('checklist-minimo.md')
  })

  test('o guia completo nao duplica o checklist', () => {
    expect(read('skills/security/references/guia-completo.md')).not.toMatch(/^### V8 /m)
  })
})

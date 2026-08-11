#!/usr/bin/env bun
// 2026-08-11 (Luiz/dev): plano01 fase-02 GREEN — mede o custo de contexto das skills.
// Padrao DEC-4 (parity-audit.ts): funcao pura exportada + entrypoint guardado.
//
// Escopo deliberado: SO metrica objetiva. Julgamento (no-op, sprawl, leading word desperdicada)
// e trabalho de subagente na fase-03 — regex nao roda o teste do no-op, que e comportamental.
// Nenhum score composto: um numero unico esconde qual eixo esta ruim.

import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface Negation {
  line: number
  term: string
  text: string
}

export interface SkillAuditRecord {
  skill: string
  /** Texto da description, sem as aspas externas. E o que ocupa contexto. */
  descriptionChars: number
  /**
   * Linha `description:` inteira, com o prefixo YAML e sem o `\r`.
   * Existe para reconciliar com o baseline de 2026-08-10, que mediu a linha bruta.
   */
  descriptionLineChars: number
  triggerCount: number
  bodyLines: number
  negations: Negation[]
  modelInvoked: boolean
  hookListed: boolean
  hookDescriptionChars: number
  hookExactDuplicate: boolean
  satelliteFiles: string[]
  satellitesLinked: string[]
}

export interface SkillAuditReport {
  skills: SkillAuditRecord[]
  /** Diretorios com SKILL.md ilegivel ou sem frontmatter — reportados, nunca fatais. */
  skipped: string[]
  totals: {
    skillCount: number
    descriptionChars: number
    descriptionLineChars: number
    modelInvoked: number
    hookListed: number
    hookDescriptionChars: number
    negations: number
    satellitesUnlinked: number
  }
}

// Tolera comentario HTML e linha em branco antes do `---`, e CRLF.
// anti-vibe-review/SKILL.md abre com comentario: regex ancorada em /^---/ erra a contagem nele.
const FRONTMATTER = /^(?:\s*<!--[\s\S]*?-->\s*)*---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/

// Negacao como palavra inteira: "Nevertheless" nao e "never".
const NEGATION = /\b(nunca|n[ãa]o|jamais|never|don't|do not)\b/gi

const QUOTED_TRIGGER = /'[^']+'/g

function splitLines(raw: string): string[] {
  return raw.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l))
}

/** Valor da chave, com continuacao YAML multi-linha. Nenhuma skill usa hoje, mas YAML permite. */
function readField(fmLines: string[], key: string): string | null {
  const start = fmLines.findIndex((l) => l.startsWith(`${key}:`))
  const head = start === -1 ? undefined : fmLines[start]
  if (head === undefined) return null

  let value = head.slice(key.length + 1).trim()
  for (let i = start + 1; i < fmLines.length; i++) {
    const next = fmLines[i]
    if (next === undefined || next.trim() === '' || /^[a-zA-Z][\w-]*:/.test(next)) break
    value += ` ${next.trim()}`
  }
  return value
}

function unquote(value: string): string {
  const m = value.match(/^"([\s\S]*)"$/) ?? value.match(/^'([\s\S]*)'$/)
  return m?.[1] ?? value
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && (lines[start] ?? '').trim() === '') start++
  while (end > start && (lines[end - 1] ?? '').trim() === '') end--
  return lines.slice(start, end)
}

// Satelite = doc de referencia alcancavel por ponteiro. Recursivo: as skills grandes guardam os
// seus em references/, entao olhar so filhos diretos reportaria zero justamente em quem mais usa
// progressive disclosure.
// Fora da conta: fixture de teste, golden, e payload que a skill *escreve* no projeto-alvo
// (assets/, templates/). Nada disso e material que o agente le por ponteiro — contar inflaria
// `init` sozinha com 60+ falsos orfaos.
const NOT_REFERENCE = new Set(['__tests__', '__fixtures__', '__golden__', 'fixtures', 'assets', 'templates', 'node_modules'])

function listSatellites(dir: string, prefix = ''): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (NOT_REFERENCE.has(entry.name)) continue
      found.push(...listSatellites(join(dir, entry.name), rel))
      continue
    }
    if (rel === 'SKILL.md' || !entry.name.endsWith('.md')) continue
    found.push(rel)
  }
  return found.sort()
}

function hookLineFor(skill: string, hookPayload: string): string | null {
  if (!hookPayload) return null
  const needle = `anti-vibe-coding:${skill} `
  for (const line of splitLines(hookPayload)) {
    if (line.includes(needle)) return line
  }
  return null
}

export function auditSkillDocs(skillsRoot: string, hookPayload = ''): SkillAuditReport {
  const skills: SkillAuditRecord[] = []
  const skipped: string[] = []

  const dirs = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  for (const name of dirs) {
    const dir = join(skillsRoot, name)
    const file = join(dir, 'SKILL.md')
    if (!existsSync(file)) continue

    const raw = readFileSync(file, 'utf8')
    const match = raw.match(FRONTMATTER)
    const fmBlock = match?.[1]
    if (!match || fmBlock === undefined) {
      skipped.push(name)
      continue
    }

    const fmLines = splitLines(fmBlock)
    const descriptionRaw = readField(fmLines, 'description')
    if (descriptionRaw === null) {
      skipped.push(name)
      continue
    }

    const description = unquote(descriptionRaw)
    const allLines = splitLines(raw)
    const frontmatterLineCount = splitLines(match[0]).length - 1
    const bodyRaw = allLines.slice(frontmatterLineCount)

    const negations: Negation[] = []
    bodyRaw.forEach((text, i) => {
      NEGATION.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = NEGATION.exec(text)) !== null) {
        negations.push({ line: frontmatterLineCount + i + 1, term: m[1] ?? m[0], text })
      }
    })

    // "Alcancado por ponteiro" nao e so link markdown: as skills grandes citam o satelite em
    // backticks (`references/cap-theorem.md`). O que conta e o caminho aparecer no corpo.
    const satelliteFiles = listSatellites(dir)
    const satellitesLinked = satelliteFiles.filter((f) => raw.includes(f))

    const hookLine = hookLineFor(name, hookPayload)

    skills.push({
      skill: name,
      descriptionChars: description.length,
      descriptionLineChars: `description: ${descriptionRaw}`.length,
      triggerCount: (description.match(QUOTED_TRIGGER) ?? []).length,
      bodyLines: trimBlankEdges(bodyRaw).length,
      negations,
      modelInvoked: readField(fmLines, 'disable-model-invocation') !== 'true',
      hookListed: hookLine !== null,
      hookDescriptionChars: hookLine?.length ?? 0,
      hookExactDuplicate: hookLine !== null && hookLine.includes(description),
      satelliteFiles,
      satellitesLinked,
    })
  }

  return {
    skills,
    skipped,
    totals: {
      skillCount: skills.length,
      descriptionChars: skills.reduce((a, s) => a + s.descriptionChars, 0),
      descriptionLineChars: skills.reduce((a, s) => a + s.descriptionLineChars, 0),
      modelInvoked: skills.filter((s) => s.modelInvoked).length,
      hookListed: skills.filter((s) => s.hookListed).length,
      hookDescriptionChars: skills.reduce((a, s) => a + s.hookDescriptionChars, 0),
      negations: skills.reduce((a, s) => a + s.negations.length, 0),
      satellitesUnlinked: skills.reduce(
        (a, s) => a + s.satelliteFiles.filter((f) => !s.satellitesLinked.includes(f)).length,
        0,
      ),
    },
  }
}

/** Concatena os comandos do SessionStart — e ali que o hook redescreve as skills. */
export function readSessionStartPayload(repoRoot: string): string {
  const file = join(repoRoot, 'hooks', 'hooks.json')
  if (!existsSync(file)) return ''

  const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
    hooks?: Record<string, Array<{ hooks?: Array<{ command?: string }> }>>
  }
  const entries = parsed.hooks?.SessionStart ?? []
  return entries
    .flatMap((e) => e.hooks ?? [])
    .map((h) => h.command ?? '')
    .join('\n')
    .replace(/\\n/g, '\n')
}

if (import.meta.main) {
  const repoRoot = process.argv[2] ?? '.'
  const report = auditSkillDocs(join(repoRoot, 'skills'), readSessionStartPayload(repoRoot))

  const outDir = join(repoRoot, 'docs', 'generated')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'skill-audit-baseline.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  const t = report.totals
  console.log(`skills medidas        ${t.skillCount}`)
  console.log(`description chars     ${t.descriptionChars} (linha bruta: ${t.descriptionLineChars})`)
  console.log(`model-invoked         ${t.modelInvoked}/${t.skillCount}`)
  console.log(`relistadas no hook    ${t.hookListed} (${t.hookDescriptionChars} chars)`)
  console.log(`negacoes no corpo     ${t.negations}`)
  console.log(`satelites sem ponteiro ${t.satellitesUnlinked}`)
  if (report.skipped.length > 0) console.log(`ignoradas             ${report.skipped.join(', ')}`)
  console.log(`\nBaseline: ${join(outDir, 'skill-audit-baseline.json')}`)
}

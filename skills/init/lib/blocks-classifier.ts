import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { DiscoveredDoc } from './discover-existing-docs'

export type HarnessCategory =
  | 'docs/SECURITY.md'
  | 'docs/DESIGN.md'
  | 'docs/FRONTEND.md'
  | 'docs/RELIABILITY.md'
  | 'docs/PLANS.md'
  | 'docs/QUALITY_SCORE.md'
  | 'docs/MERGE_GATES.md'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type DocMapping = {
  readonly source: string
  readonly target: HarnessCategory
  readonly confidence: ConfidenceLevel
  readonly rationale: string
  readonly pendingLlmRefinement: boolean
}

export type OrphanMapping = {
  readonly source: string
  readonly target: string
  readonly reason: string
}

export type GlossaryEntry = {
  readonly term: string
  readonly occurrences: number
  readonly sources: readonly string[]
}

export type ClassifyInput = {
  readonly docs: readonly DiscoveredDoc[]
  readonly cwd: string
  readonly contentsBySource?: ReadonlyMap<string, string>
}

export type ClassifyOutput = {
  readonly mappings: readonly DocMapping[]
  readonly orphans: readonly OrphanMapping[]
  readonly sharedGlossary: readonly GlossaryEntry[]
}

type CategoryRule = {
  readonly category: HarnessCategory
  readonly pattern: RegExp
}

const CATEGORY_RULES: ReadonlyArray<CategoryRule> = [
  { category: 'docs/SECURITY.md',       pattern: /\b(auth|cors|csrf|jwt|oauth|password|secret|seguranca|criptografia)\b/i },
  { category: 'docs/DESIGN.md',         pattern: /\b(SOLID|arquitetura|architecture|pattern|design|estrutura|camadas)\b/i },
  { category: 'docs/FRONTEND.md',       pattern: /\b(component|react|vue|tailwind|css|UI|UX|frontend|acessibilidade|wcag)\b/i },
  { category: 'docs/RELIABILITY.md',    pattern: /\b(observability|monitoring|sentry|log|retry|timeout|reliability)\b/i },
  { category: 'docs/PLANS.md',          pattern: /\b(roadmap|plan|escopo|milestone)\b/i },
  { category: 'docs/QUALITY_SCORE.md',  pattern: /\b(quality|score|review|checklist|criterio)\b/i },
  { category: 'docs/MERGE_GATES.md',    pattern: /\b(merge|gate|CI|workflow|pre-commit)\b/i },
]

type CategoryScore = {
  category: HarnessCategory
  matchCount: number
}

function scoreCategories(content: string): CategoryScore[] {
  const scores: CategoryScore[] = []
  for (const { category, pattern } of CATEGORY_RULES) {
    const matches = content.match(new RegExp(pattern.source, 'gi'))
    if (matches && matches.length > 0) {
      scores.push({ category, matchCount: matches.length })
    }
  }
  return scores.sort((a, b) => b.matchCount - a.matchCount)
}

function decideConfidence(scores: CategoryScore[]): ConfidenceLevel {
  if (scores.length === 0) return 'low'
  const top = scores[0]
  // 2026-05-18 (Luiz/dev): regras de confidence — D8 do PRD.
  const tieClose = scores.length > 1 && (scores[1]?.matchCount ?? 0) * 2 >= (top?.matchCount ?? 0)
  if ((top?.matchCount ?? 0) >= 3 && !tieClose) return 'high'
  return 'medium'
}

const STOPWORDS_PT_EN: ReadonlySet<string> = new Set([
  'para', 'como', 'pelo', 'pela', 'mais', 'menos', 'isso', 'esta', 'esse', 'essa',
  'sobre', 'cada', 'todo', 'toda', 'todos', 'todas', 'quando', 'porque', 'porquê',
  'this', 'that', 'with', 'from', 'have', 'will', 'would', 'should', 'their', 'there',
  'then', 'than', 'them', 'these', 'those', 'when', 'what', 'which', 'where', 'while',
])

function accumulateGlossary(
  index: Map<string, { occurrences: number; sources: Set<string> }>,
  content: string,
  source: string,
): void {
  const tokens = content.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []
  for (const t of tokens) {
    if (STOPWORDS_PT_EN.has(t)) continue
    const existing = index.get(t)
    if (existing) {
      existing.occurrences += 1
      existing.sources.add(source)
    } else {
      index.set(t, { occurrences: 1, sources: new Set([source]) })
    }
  }
}

function finalizeGlossary(
  index: Map<string, { occurrences: number; sources: Set<string> }>,
): readonly GlossaryEntry[] {
  const out: GlossaryEntry[] = []
  for (const [term, { occurrences, sources }] of index) {
    if (occurrences >= 3) {
      out.push({
        term,
        occurrences,
        sources: Array.from(sources).sort(),
      })
    }
  }
  out.sort((a, b) => b.occurrences - a.occurrences || (a.term < b.term ? -1 : 1))
  return out
}

async function loadContent(doc: DiscoveredDoc, input: ClassifyInput): Promise<string> {
  const preloaded = input.contentsBySource?.get(doc.relativePath)
  if (preloaded !== undefined) return preloaded
  return fs.readFile(doc.absolutePath, 'utf-8')
}

export async function classifyDocs(input: ClassifyInput): Promise<ClassifyOutput> {
  const mappings: DocMapping[] = []
  const orphans: OrphanMapping[] = []
  const termIndex = new Map<string, { occurrences: number; sources: Set<string> }>()

  for (const doc of input.docs) {
    const content = await loadContent(doc, input)
    const scores = scoreCategories(content)
    const confidence = decideConfidence(scores)

    if (scores.length === 0) {
      orphans.push({
        source: doc.relativePath,
        target: `docs/references/${path.basename(doc.relativePath)}`,
        reason: 'no heuristic match — orphan candidate (D11)',
      })
    } else {
      const top = scores[0]
      if (top) {
        mappings.push({
          source: doc.relativePath,
          target: top.category,
          confidence,
          rationale: `heuristic: ${top.matchCount} matches in ${top.category}; top2=${scores[1]?.matchCount ?? 0}`,
          pendingLlmRefinement: confidence !== 'high',
        })
      }
    }

    accumulateGlossary(termIndex, content, doc.relativePath)
  }

  const sharedGlossary = finalizeGlossary(termIndex)
  return { mappings, orphans, sharedGlossary }
}

// 2026-05-24 (Luiz/dev): patcha secao `## Lessons Captured` do PLAN.md alvo — D10 + CA-07/08
import { promises as fs } from 'node:fs'

export async function updateLessonsCaptured(
  planPath: string,
  content: string,
): Promise<void> {
  const original = await fs.readFile(planPath, 'utf-8')
  const sectionRegex = /(## Lessons Captured\s*\n)([\s\S]*?)(\n##\s|\n*$)/

  // 2026-05-24 (Luiz/dev): se secao ausente, append no fim (degraded path)
  if (!sectionRegex.test(original)) {
    await fs.writeFile(planPath, `${original}\n\n## Lessons Captured\n\n${content}\n`)
    return
  }

  const replaced = original.replace(sectionRegex, `$1\n${content}\n$3`)
  await fs.writeFile(planPath, replaced)
}

export type AsciiBarInput = {
  label: string
  value: number
}

const BAR_CHAR = "\u2588" // U+2588 FULL BLOCK
const DEFAULT_WIDTH = 40

/**
 * Renders horizontal ASCII bar chart.
 * Returns "(sem dados)" when input is empty.
 *
 * Example:
 *   renderAsciiBars([{ label: "plan-feature", value: 10 }], 10)
 *   // "  plan-feature  ██████████ 10"
 */
export function renderAsciiBars(data: AsciiBarInput[], width = DEFAULT_WIDTH): string {
  if (data.length === 0) return "(sem dados)"
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const maxLabelLen = Math.max(...data.map((d) => d.label.length), 1)

  const lines: string[] = []
  for (const d of data) {
    const barLen = Math.round((d.value / maxValue) * width)
    const bar = BAR_CHAR.repeat(barLen)
    lines.push(`  ${d.label.padEnd(maxLabelLen)}  ${bar} ${d.value}`)
  }
  return lines.join("\n")
}

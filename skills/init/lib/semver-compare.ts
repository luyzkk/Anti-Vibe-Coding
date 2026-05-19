/**
 * Compara duas versoes semver no formato MAJOR.MINOR.PATCH (sufixo pre-release ignorado).
 * Retorna -1 se a < b, 0 se iguais, 1 se a > b.
 * @remarks Patch ausente trata como 0. Componentes nao numericos lancam.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string): [number, number, number] => {
    const core = v.split('-')[0] ?? v
    const parts = core.split('.').map((p) => Number(p))
    if (parts.some((n) => Number.isNaN(n))) {
      throw new Error(`invalid semver: ${v}`)
    }
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
  }
  const [a0, a1, a2] = parse(a)
  const [b0, b1, b2] = parse(b)
  if (a0 !== b0) return a0 < b0 ? -1 : 1
  if (a1 !== b1) return a1 < b1 ? -1 : 1
  if (a2 !== b2) return a2 < b2 ? -1 : 1
  return 0
}

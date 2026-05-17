// skills/init/lib/parse-flags.ts

export type ParsedFlags = {
  args: readonly string[]
  flags: Readonly<Record<string, boolean | string>>
}

/**
 * Parser intencional-minimo. Reconhece:
 *   --flag         → flags.flag = true
 *   --flag=value   → flags.flag = 'value'
 *   tudo o resto   → args (posicional)
 *
 * Nao trata short-flags (-d), nao agrupa, nao normaliza camelCase. Se /init crescer alem disso,
 * trocar por uma lib — mas hoje YAGNI.
 */
export function parseFlags(argv: readonly string[]): ParsedFlags {
  const args: string[] = []
  const flags: Record<string, boolean | string> = {}

  for (const raw of argv) {
    if (raw.startsWith('--')) {
      const body = raw.slice(2)
      const eq = body.indexOf('=')
      if (eq >= 0) {
        flags[body.slice(0, eq)] = body.slice(eq + 1)
      } else {
        flags[body] = true
      }
    } else {
      args.push(raw)
    }
  }

  return { args, flags }
}

// 2026-05-16 (Luiz/dev): parser inline da flag --refresh-knowledge — RF7, G6 (sem commander/yargs).
// DI-4: extraído em arquivo TS separado (não inline em SKILL.md) para testabilidade.
// Aceita flag em qualquer posição da string de argumentos. Sem aliases (-r etc).

/**
 * Detecta `--refresh-knowledge` na string de argumentos brutos recebida via $ARGUMENTS no SKILL.md.
 * Parser intencional simples (~10 linhas): split por whitespace, busca token exato.
 */
export function parseRefreshFlag(rawArgs: string | undefined): boolean {
  if (!rawArgs) return false
  const tokens = rawArgs.split(/\s+/).filter(Boolean)
  return tokens.includes('--refresh-knowledge')
}

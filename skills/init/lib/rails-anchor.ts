// 2026-08-18 (Luiz/dev): TODO.md #5 — fonte unica da deteccao do anchor Rails no Gemfile.
// Antes a regex vivia duplicada em dois lugares que precisavam de coisas diferentes:
// `detect-stack.ts` queria so "e Rails?" e `format-knowledge-preview.ts` queria a versao.
// A copia da versao nao casava com `gem 'rails'` sem versao, entao os dois discordavam
// justamente nos Gemfiles que declaram rails sem constraint (git source, versao no lockfile).
// Um parse, dois consumidores: presenca e versao saem da mesma leitura.

export interface RailsAnchor {
  /** `gem 'rails'` declarado no Gemfile, com ou sem constraint de versao. */
  present: boolean
  /** Major da constraint, quando declarada. `null` quando o Gemfile nao fixa versao. */
  major: number | null
  /** Minor da constraint, quando declarada. `null` quando o Gemfile nao fixa versao. */
  minor: number | null
}

// O grupo de versao e opcional de proposito — `gem 'rails'` e `gem 'rails', github: ...`
// sao Rails legitimo sem constraint. `['"]rails['"]` exige o fechamento da aspa, o que
// impede `rails-i18n` e afins de casarem.
const RAILS_ANCHOR_RX = /^\s*gem\s+['"]rails['"](?:\s*,\s*['"][~^>=<]*\s*(\d+)\.(\d+))?/m

const ABSENT: RailsAnchor = { present: false, major: null, minor: null }

export function parseRailsAnchor(gemfileContent: string): RailsAnchor {
  const m = RAILS_ANCHOR_RX.exec(gemfileContent)
  if (!m) return { ...ABSENT }
  return {
    present: true,
    major: m[1] === undefined ? null : Number(m[1]),
    minor: m[2] === undefined ? null : Number(m[2]),
  }
}

// 2026-08-18 (Luiz/dev): TODO.md #5 — util compartilhado de deteccao do anchor Rails.
// Antes existiam duas regex quase iguais: detect-stack.ts (so presenca) e
// format-knowledge-preview.ts (presenca + versao). Este teste fixa o contrato das duas
// de uma vez, incluindo os casos onde elas divergiam: `gem 'rails'` sem versao e
// `gem 'rails', github: ...` sao presenca SEM versao — nao "ausente".
import { describe, test, expect } from 'bun:test'
import { parseRailsAnchor } from './rails-anchor'

describe('parseRailsAnchor', () => {
  test('captura major e minor quando a versao esta declarada', () => {
    expect(parseRailsAnchor("gem 'rails', '~> 7.1'")).toEqual({ present: true, major: 7, minor: 1 })
  })

  test('aceita aspas duplas e versao patch completa', () => {
    expect(parseRailsAnchor('gem "rails", "7.0.4"')).toEqual({ present: true, major: 7, minor: 0 })
  })

  test('aceita os operadores de range antes do numero', () => {
    expect(parseRailsAnchor("gem 'rails', '>= 8.0'")).toEqual({ present: true, major: 8, minor: 0 })
  })

  test('reconhece a linha indentada dentro de um group block', () => {
    const gemfile = "group :production do\n  gem 'rails', '~> 8.0'\nend\n"
    expect(parseRailsAnchor(gemfile)).toEqual({ present: true, major: 8, minor: 0 })
  })

  // Os dois casos abaixo sao a razao do util existir: aqui as duas regex antigas discordavam.
  // detect-stack dizia "rails"; format-knowledge-preview nao casava e o chamador tratava
  // como se nao houvesse Rails nenhum.
  test('gem rails sem versao e presenca sem versao, nao ausencia', () => {
    expect(parseRailsAnchor("gem 'rails'")).toEqual({ present: true, major: null, minor: null })
  })

  test('gem rails apontando para git e presenca sem versao', () => {
    expect(parseRailsAnchor("gem 'rails', github: 'rails/rails'")).toEqual({
      present: true,
      major: null,
      minor: null,
    })
  })

  test('Gemfile sem rails nao tem anchor', () => {
    expect(parseRailsAnchor("source 'https://rubygems.org'\ngem 'sinatra'\n")).toEqual({
      present: false,
      major: null,
      minor: null,
    })
  })

  test('Gemfile vazio nao tem anchor', () => {
    expect(parseRailsAnchor('')).toEqual({ present: false, major: null, minor: null })
  })

  test('linha comentada nao conta como anchor', () => {
    expect(parseRailsAnchor("# gem 'rails', '~> 7.1'\n")).toEqual({
      present: false,
      major: null,
      minor: null,
    })
  })

  test('nao confunde outra gem que contem rails no nome', () => {
    expect(parseRailsAnchor("gem 'rails-i18n', '~> 7.0'")).toEqual({
      present: false,
      major: null,
      minor: null,
    })
  })
})

// skills/security/lib/route-auth-heuristics.test.ts
// 2026-09-06 (Luiz/dev): Plano 04 DP-3 — heuristica de nome de auth compartilhada pelos adaptadores
// Rails, Express e Python; e os utilitarios de texto movidos do adaptador Next (DP-3a).
import { describe, it, expect } from 'bun:test'
import { authNameNotes, isAuthName, lineOf, readBalanced, splitByAuthName, splitTopLevel } from './route-auth-heuristics'

describe('isAuthName (DP-3 — heuristica declarada como proxy)', () => {
  it('matches the auth vocabulary of the four stacks', () => {
    for (const n of [
      'authenticate_user!',
      'requireAuth',
      'require_login',
      'login_required',
      'get_current_user',
      'verify_jwt',
      'JWTBearer',
      'AuthMiddleware',
      'check_auth',
      'signed_in?',
      'authorize_admin',
    ])
      expect(isAuthName(n)).toBe(true)
  })

  it('does not match cross-cutting names that are not auth', () => {
    for (const n of ['set_locale', 'logRequests', 'cors', 'author_lookup', 'compression', 'set_current_tenant'])
      expect(isAuthName(n)).toBe(false)
  })

  it('is case-insensitive and ignores a trailing bang or question mark', () => {
    expect(isAuthName('AUTHENTICATE!')).toBe(true)
  })
})

it('splitByAuthName partitions names and authNameNotes lists both sides', () => {
  const split = splitByAuthName(['authenticate_user!', 'set_locale'])
  expect(split).toEqual({ auth: ['authenticate_user!'], other: ['set_locale'] })
  expect(authNameNotes('filtros', split)).toEqual([
    'filtros contados como auth: authenticate_user!',
    'filtros ignorados por nome: set_locale',
    'heuristica de nome de auth e proxy: nome que casa e contado sem ler o corpo; nome que nao casa nao conta',
  ])
})

// 2026-09-07 (Luiz/dev): defeito achado pelo CI (Linux) — `names` chega na ordem de varredura de
// arquivos, que difere de Windows para Linux. A nota (authNameNotes) nao pode depender do SO.
it('splitByAuthName returns the same auth/other order regardless of input order', () => {
  const forward = splitByAuthName(['requireAuth', 'requireAdmin', 'logger'])
  const reversed = splitByAuthName(['logger', 'requireAdmin', 'requireAuth'])
  expect(forward).toEqual(reversed)
  expect(forward).toEqual({ auth: ['requireAdmin', 'requireAuth'], other: ['logger'] })
})

describe('utilitarios de texto (movidos do adaptador Next — DP-3a)', () => {
  it('lineOf counts newlines before the index', () => expect(lineOf('a\nb\nc', 4)).toBe(3))

  it('readBalanced returns the body between matching delimiters, skipping strings', () => {
    expect(readBalanced('f(a, "(", (b))', 1, '(', ')')).toEqual({ body: 'a, "(", (b)', end: 14 })
  })

  it('splitTopLevel splits on top-level commas only', () => {
    expect(splitTopLevel("'/x', [a, b], {c: (d, e)}")).toEqual(["'/x'", ' [a, b]', ' {c: (d, e)}'])
  })
})

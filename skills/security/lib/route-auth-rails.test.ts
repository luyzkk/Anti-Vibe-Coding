// skills/security/lib/route-auth-rails.test.ts
// 2026-09-06 (Luiz/dev): adaptador Rails — Plano 04 fase-01. Fontes: Rails Guides "Rails Routing
// from the Outside In" (SS2.2 CRUD/verbos/resources, SS2.5 singular resource, SS2.6 namespace/scope,
// SS2.7 nested, SS2.10 member/collection, SS3.7 match ... via:) e
// knowledge/rails/atoms/action-controller-and-routing.md (before_action only:/except:, skip_before_action).
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { evaluateRoute } from './route-auth-matrix'
import { isRoute } from './route-auth-matrix.types'
import type { HttpMethod, Route, Verdict } from './route-auth-matrix.types'
import { appliesTo, parseRailsController, parseRailsRoutes, railsAdapter, resolveFilterChain } from './route-auth-rails'
import type { ControllerInfo } from './route-auth-rails'

const FIXTURE = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix/rails-minimal')
const R = 'config/routes.rb'
const draw = (body: string): string => `Rails.application.routes.draw do\n${body}\nend`
const key = (r: Route): string => `${r.method} ${r.path} ${r.handler ?? ''}${r.unresolved === undefined ? '' : ' [unresolved]'}`
const toMap = (cs: Array<ControllerInfo | null>): Map<string, ControllerInfo> => {
  const map = new Map<string, ControllerInfo>()
  for (const c of cs) if (c !== null) map.set(c.name, c)
  return map
}

describe('parseRailsRoutes (subset da DSL — Rails Guides "Routing from the Outside In")', () => {
  it('expands resources into the eight REST routes with PATCH and PUT for update', () => {
    const { routes } = parseRailsRoutes(draw('  resources :users'), R)
    expect(routes.map(key).sort()).toEqual([
      'DELETE /users/:id UsersController#destroy',
      'GET /users UsersController#index',
      'GET /users/:id UsersController#show',
      'GET /users/:id/edit UsersController#edit',
      'GET /users/new UsersController#new',
      'PATCH /users/:id UsersController#update',
      'POST /users UsersController#create',
      'PUT /users/:id UsersController#update',
    ])
    expect(routes[0]?.line).toBe(2)
  })

  it('honours only: and except: on resources', () => {
    expect(parseRailsRoutes(draw('  resources :posts, only: [:index, :show]'), R).routes.map(key).sort()).toEqual([
      'GET /posts PostsController#index',
      'GET /posts/:id PostsController#show',
    ])
    expect(parseRailsRoutes(draw('  resources :posts, except: [:destroy]'), R).routes).toHaveLength(7)
  })

  it('prefixes path and module inside namespace, and path/module inside scope', () => {
    const ns = parseRailsRoutes(draw('  namespace :admin do\n    resources :users, only: [:index]\n  end'), R).routes
    expect(ns.map(key)).toEqual(['GET /admin/users Admin::UsersController#index'])
    const sc = parseRailsRoutes(draw("  scope path: '/v1', module: 'api' do\n    get 'ping', to: 'status#ping'\n  end"), R).routes
    expect(sc.map(key)).toEqual(['GET /v1/ping Api::StatusController#ping'])
  })

  it('reads verb routes with to: and =>, root, singular resource and one level of nesting', () => {
    const src = draw(
      "  root to: 'home#index'\n  get 'health' => 'health#show'\n  resource :profile, only: [:show]\n  resources :posts, only: [] do\n    resources :comments, only: [:index]\n  end",
    )
    expect(parseRailsRoutes(src, R).routes.map(key).sort()).toEqual([
      'GET / HomeController#index',
      'GET /health HealthController#show',
      'GET /posts/:post_id/comments CommentsController#index',
      'GET /profile ProfilesController#show',
    ])
  })

  it('reads member and collection blocks and inline on:', () => {
    const src = draw(
      "  resources :posts, only: [] do\n    member do\n      post :publish\n    end\n    collection do\n      get :search\n    end\n    get :preview, on: :member\n  end",
    )
    expect(parseRailsRoutes(src, R).routes.map(key).sort()).toEqual([
      'GET /posts/:id/preview PostsController#preview',
      'GET /posts/search PostsController#search',
      'POST /posts/:id/publish PostsController#publish',
    ])
  })

  it('expands match with via: into one route per verb and via: :all into seven', () => {
    expect(parseRailsRoutes(draw("  match 'x', to: 'x#y', via: [:get, :post]"), R).routes.map((r) => r.method).sort()).toEqual(['GET', 'POST'])
    expect(parseRailsRoutes(draw("  match 'x', to: 'x#y', via: :all"), R).routes).toHaveLength(7)
  })

  // 2026-09-06 (Luiz/dev): DP-2 / RF-09 — fora do subset vira unresolved, nunca rota inventada.
  it('marks match without via, mount, constraints, unknown scope keys and unknown lines as unresolved', () => {
    const src = draw("  match 'legacy', to: 'legacy#handle'\n  mount Sidekiq::Web => '/sidekiq'\n  scope as: :v2 do\n    get 'a', to: 'a#b'\n  end\n  devise_for :users")
    const { routes } = parseRailsRoutes(src, R)
    expect(routes.every((r) => r.unresolved !== undefined)).toBe(true)
    expect(routes.map((r) => r.unresolved)).toEqual([
      expect.stringContaining('via:'),
      expect.stringContaining('mount'),
      expect.stringContaining('scope'),
      expect.stringContaining('fora do subset'),
    ])
    expect(routes[0]?.path).toBe('/legacy')
    expect(routes[1]?.path.startsWith('/')).toBe(true)
  })
})

describe('parseRailsController + resolveFilterChain (before_action com heranca — atom action-controller-and-routing)', () => {
  const app = parseRailsController(
    'class ApplicationController < ActionController::Base\n  before_action :authenticate_user!\n  before_action :set_locale\nend',
    'app/controllers/application_controller.rb',
  )

  it('reads class, parent, module nesting and filters with only/except and their lines', () => {
    const c = parseRailsController(
      'module Admin\n  class UsersController < ApplicationController\n    before_action :require_admin, except: [:index]\n    skip_before_action :set_locale, only: [:show]\n  end\nend',
      'app/controllers/admin/users_controller.rb',
    )
    expect(c?.name).toBe('Admin::UsersController')
    expect(c?.parent).toBe('ApplicationController')
    expect(c?.filters).toEqual([
      { kind: 'before', names: ['require_admin'], except: ['index'], conditional: false, line: 3 },
      { kind: 'skip', names: ['set_locale'], only: ['show'], conditional: false, line: 4 },
    ])
  })

  it('inherits ApplicationController filters and stops at ActionController::Base or ::API', () => {
    const child = parseRailsController('class Admin::UsersController < ApplicationController\nend', 'app/controllers/admin/users_controller.rb')
    const chain = resolveFilterChain('Admin::UsersController', toMap([app, child]))
    expect(chain.kind).toBe('resolved')
    if (chain.kind === 'resolved') expect(chain.filters.map((f) => f.name)).toEqual(['authenticate_user!', 'set_locale'])
  })

  // 2026-09-06 (Luiz/dev): teste de abuso (PRD AB-2 lado Rails) — skip no filho tira a cobertura herdada.
  it('drops an inherited filter when the child skips it, and restricts it when the skip has only:', () => {
    const health = parseRailsController('class HealthController < ApplicationController\n  skip_before_action :authenticate_user!\nend', 'app/controllers/health_controller.rb')
    const chain = resolveFilterChain('HealthController', toMap([app, health]))
    if (chain.kind === 'resolved') expect(chain.filters.map((f) => f.name)).toEqual(['set_locale'])

    const posts = parseRailsController('class PostsController < ApplicationController\n  skip_before_action :authenticate_user!, only: [:show]\nend', 'app/controllers/posts_controller.rb')
    const c2 = resolveFilterChain('PostsController', toMap([app, posts]))
    if (c2.kind === 'resolved') {
      const authFilter = c2.filters[0]
      expect(authFilter).toBeDefined()
      if (authFilter !== undefined) {
        expect(appliesTo(authFilter, 'index')).toBe(true)
        expect(appliesTo(authFilter, 'show')).toBe(false)
      }
    }
  })

  it('replaces an inherited filter when the child redeclares it (CallbackChain semantics) and flags if:/unless: as conditional', () => {
    const posts = parseRailsController(
      'class PostsController < ApplicationController\n  before_action :authenticate_user!, only: [:index]\n  before_action :check_auth, if: :api_request?\nend',
      'app/controllers/posts_controller.rb',
    )
    const chain = resolveFilterChain('PostsController', toMap([app, posts]))
    if (chain.kind === 'resolved') {
      const auth = chain.filters.find((f) => f.name === 'authenticate_user!')
      expect(auth?.only).toEqual(['index']) // G22: substituiu a herdada sem only
      expect(chain.filters.find((f) => f.name === 'check_auth')?.conditional).toBe(true)
    }
    expect(resolveFilterChain('MissingController', toMap([app])).kind).toBe('missing')
  })
})

describe('railsAdapter (fixture rails-minimal)', () => {
  it('CA-08 (Rails): enumerates the thirteen routes of the fixture with handlers and lines', () => {
    const routes = railsAdapter.enumerate(FIXTURE)
    expect(routes).toHaveLength(13)
    expect(routes.every(isRoute)).toBe(true)
    expect(routes.find((r) => r.path === '/admin/users/:id' && r.method === 'PUT')?.handler).toBe('Admin::UsersController#update')
    expect(routes.find((r) => r.path === '/legacy')?.unresolved).toContain('via:')
    expect(routes.find((r) => r.path === '/health')).toMatchObject({ file: 'config/routes.rb', line: 4, stack: 'rails' })
  })

  it('emits one handler-chain per covered handler, a scoped opaque for the missing controller, and name notes', () => {
    const cov = railsAdapter.readCoverage(FIXTURE)
    const chains = cov.rules.filter((r) => r.kind === 'handler-chain')
    expect(chains.map((r) => (r.kind === 'handler-chain' ? r.handler : '')).sort()).toEqual([
      'Admin::UsersController#create',
      'Admin::UsersController#destroy',
      'Admin::UsersController#edit',
      'Admin::UsersController#index',
      'Admin::UsersController#new',
      'Admin::UsersController#show',
      'Admin::UsersController#update',
      'PostsController#index',
    ])
    expect(chains[0]).toMatchObject({ file: 'app/controllers/application_controller.rb', line: 2 })
    expect(cov.rules.find((r) => r.kind === 'opaque')).toMatchObject({ handler: 'HomeController#index', file: 'config/routes.rb', line: 3 })
    expect(cov.notes).toContain('filtros contados como auth: authenticate_user!')
    expect(cov.notes).toContain('filtros ignorados por nome: set_locale')
    expect(cov.sources[0]).toBe('config/routes.rb')
  })

  // Premissa 2 (heranca) + abuso (skip) + G22 (redeclaracao), atravessando o motor real.
  it('Premissa 2: inherited before_action covers admin, skip uncovers health, redeclaration uncovers posts#show', () => {
    const routes = railsAdapter.enumerate(FIXTURE)
    const cov = railsAdapter.readCoverage(FIXTURE)
    const verdictOf = (method: HttpMethod, path: string): Verdict => {
      const r = routes.find((rt) => rt.method === method && rt.path === path)
      if (r === undefined) throw new Error(`rota nao encontrada na fixture: ${method} ${path}`)
      return evaluateRoute(r, cov).verdict
    }
    expect(verdictOf('DELETE', '/admin/users/:id')).toBe('coberta')
    expect(verdictOf('GET', '/health')).toBe('DESCOBERTA')
    expect(verdictOf('GET', '/posts')).toBe('coberta')
    expect(verdictOf('GET', '/posts/:id')).toBe('DESCOBERTA')
    expect(verdictOf('GET', '/')).toBe('indeterminada')
    expect(verdictOf('GET', '/legacy')).toBe('indeterminada')
    const all = routes.map((r) => evaluateRoute(r, cov).verdict)
    expect(all.filter((v) => v === 'indeterminada').length / all.length).toBeLessThanOrEqual(0.25) // Premissa 3, medida
  })
})

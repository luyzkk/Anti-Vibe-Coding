<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 03: Átomo `tooling.md`

**Plano:** 06 — Atom Batch C + INDEX + Polish
**Sizing:** 1-1.5h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 3 full `docs/knowledge/nodejs-typescript/atoms/tooling.md` (~120-140 linhas, mais focado que os outros tier 3), condensando decisões de tooling sênior no idioma Node+TS atual: execução de TS (tsc/tsx/ts-node/Bun/esbuild — trade-offs reais); lint+format (biome vs eslint+prettier); package manager (pnpm vs npm vs yarn — parte cross-referenciada por `dependencies-supply-chain.md`); monorepo (Turborepo, Nx, pnpm workspaces); CI cache strategies; watch mode (nodemon vs tsx watch vs Node 22+ `--watch`). `/architecture` cobre decisões de codebase organization cross-stack; `/infrastructure` cobre CI/CD genérico — este átomo cobre o que é específico de Node+TS toolchain.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/tooling.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~120-140 linhas) |

---

## Implementacao

### Passo 1: Frontmatter completo (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: tooling
stack: nodejs-typescript
layer: both
sources:
  - research: 0058a9e6
tier: 3
triggers: [tsc, tsx, ts-node, bun, esbuild, biome, eslint, prettier, pnpm, npm, yarn, turborepo, nx, monorepo, watch mode, nodemon, ci cache]
related_skills: [/architecture, /infrastructure]
updated: 2026-05-16
---
```

Origens (de `_catalog.md`):
- `0058a9e6` — Tooling Sênior (1427 linhas, lint, format, type check, security scan, coverage, hooks)

### Passo 2: Skeleton do corpo (5 seções na ordem do piloto)

Seções obrigatórias (verbatim com piloto):

1. `# Tooling — Node.js + TypeScript` (título H1)
2. `## Quando consultar` — 3-5 bullets de cenários
3. `## Padrões sênior` — 5-7 patterns (sub-seções `### Pattern: {nome}` com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 2-4 armadilhas com correção
5. `## Critérios de decisão` — tabela ou bullets "se X, então Y"
6. `## Referências externas` — skills relacionadas + paths das fontes (RF11 audit-trail aqui)

### Passo 3: Conteúdo nuclear esperado (guia editorial — executor expande)

**Quando consultar (3-5 bullets):**
- Setup inicial de toolchain TS em projeto novo (executor, lint, format)
- Migração de eslint+prettier para biome ou vice-versa
- Setup de monorepo TS (Turborepo, Nx, pnpm workspaces)
- CI lento — investigar cache strategies (pnpm store, Turborepo remote, esbuild cache)
- Watch mode quebrado ou lento em dev

**Padrões sênior (5-7 patterns — recomendação):**

- **Pattern: Executor TS — tsc vs tsx vs ts-node vs Bun vs esbuild** — Problema: tempo de boot lento + memory hog em dev; bundle não-otimizado em prod. Padrão de decisão: `tsc` (canônico, type-checks, mais lento) para CI typecheck; `tsx` (esbuild-based, sem typecheck, super rápido) para dev/CLI; `ts-node` legado (usar `tsx` em projetos novos); `Bun` se runtime é Bun (ESM-native, single binary); `esbuild` para build de prod (bundling). Quando usar cada: `tsc --noEmit` no CI step de typecheck; `tsx` no `bun run dev`; `esbuild` no bundle step. Quando NÃO usar `ts-node` em projetos novos: tsx é mais rápido e mantido.
- **Pattern: Lint + format — biome vs eslint+prettier** — Problema: eslint+prettier exige 5+ packages, configs duplicadas, 10s+ no CI. Padrão: biome (single binary Rust, lint+format unificado, 10-100× mais rápido) para projetos novos; eslint+prettier para codebases com plugins eslint-specific (eslint-plugin-react-hooks, security plugins não-portados para biome). Quando usar biome: projeto novo TS+JS sem necessidade de regras custom obscuras. Quando NÃO: dependência forte de plugins eslint não suportados.
- **Pattern: Package manager — pnpm vs npm vs yarn** — Problema: npm install slow + node_modules de 1GB+ ocupando disco em monorepo; lockfile inconsistente entre devs. Padrão: pnpm (default — content-addressable store, symlinks, fast install, strict resolution). npm: padrão only se ecossistema/CI exige. yarn: legado de Yarn 1 ou Yarn Berry com PnP em projetos enterprise. Quando NÃO usar pnpm: monorepo com tooling que não suporta symlinks (raro). **Cross-ref:** `dependencies-supply-chain.md` cobre lockfile + audit + SBOM em profundidade.
- **Pattern: Monorepo — Turborepo vs Nx vs pnpm workspaces** — Problema: 5 apps + 10 packages: build leva 30min, cache não compartilhado, deps duplicadas. Padrão de decisão: pnpm workspaces (built-in, sem extra layer) + Turborepo (remote cache, task pipeline declarativo, integração natural com pnpm). Nx: codebase grande + necessidade de gerador de código + tooling enterprise. Quando NÃO usar monorepo: 2 apps independentes — overhead não compensa. Quando NÃO usar Nx: time pequeno, sem familiaridade prévia.
- **Pattern: CI cache — pnpm store + Turborepo remote + esbuild cache** — Problema: CI roda `pnpm install` do zero a cada commit; build não-cacheado leva 10min. Padrão: cache do `~/.pnpm-store` (GitHub Actions: `actions/cache` com key baseada em lockfile hash); Turborepo remote cache (Vercel free tier ou self-hosted); esbuild incremental cache em `.esbuild-cache/`. Quando usar todos: monorepo grande com CI >5min. Quando NÃO: app pequeno — overhead de setup não compensa.
- **Pattern: Watch mode — tsx watch vs Node 22+ `--watch` vs nodemon** — Problema: nodemon legacy, lento, restart agressivo; rebuild manual em ESM. Padrão: `tsx watch src/index.ts` em projetos TS (sem typecheck, restart instantâneo); `node --watch dist/index.js` em projetos compiled (Node 22+ built-in); nodemon: legado, evitar em projetos novos. Quando NÃO: deploy production — watch é dev-only.
- **Pattern: Pre-commit + lint-staged** — Problema: lint roda em CI e quebra build de outros; reviews cheios de "rode lint". Padrão: husky + lint-staged (lint+format só nos arquivos staged); biome ou eslint+prettier no hook pre-commit. Quando usar: time >=2 devs. Quando NÃO: solo dev — CI já pega.

**Anti-padrões (2-4 itens):**

- **`ts-node` em prod runtime** — typecheck + transpile a cada boot, slow + memory hog. Correção: build com `tsc` ou `esbuild` no CI, deployar JS compilado.
- **eslint+prettier sem `eslint-config-prettier`** — regras conflitam, dev luta com auto-fix. Correção: `eslint-config-prettier` desativa regras eslint que prettier cuida; ou migrar para biome.
- **Monorepo sem cache** — toda mudança rebuilda tudo. Correção: Turborepo + remote cache desde o setup.
- **`node_modules` versionado no git** — repositório de 1GB+. Correção: `.gitignore node_modules/`; commit `package.json` + lockfile only.

**Critérios de decisão (tabela):**

| Cenário | Escolha |
|---|---|
| Projeto novo TS, dev experience first | tsx + biome + pnpm + Turborepo (se monorepo) |
| Codebase legado com eslint plugins custom | manter eslint+prettier; migrar gradual |
| Monorepo enterprise + gerador código + scaling time | Nx + pnpm workspaces |
| Monorepo médio (2-10 packages) | pnpm workspaces + Turborepo |
| CI >5min só com install | cache do pnpm store no CI runner |
| Lambda/serverless | esbuild bundle (single file, tree-shaken) |
| Library publicada no npm | tsc com `declaration: true` + dual ESM/CJS output |

**Referências externas (RF11 audit-trail aqui):**

- Skill `/architecture` para codebase organization cross-stack
- Skill `/infrastructure` para CI/CD genérico (GitHub Actions patterns, secrets, deploy gates)
- Átomo `dependencies-supply-chain.md` para detalhes de lockfile/audit/SBOM (cross-ref interna)
- Research: `claude-code/knowledge/Nodejs/wf-0058a9e6.md` (Tooling Sênior, 1427 linhas)

---

## Gotchas

- **G1 do plano (formato copiado do piloto, zero drift):** frontmatter com 8 campos na ordem `topic, stack, layer, sources, tier, triggers, related_skills, updated`. 5 seções do corpo na ordem do piloto.
- **G2 do plano (cap de 200 linhas):** tier 3 mais focado deste batch — cap natural é ~110-140 linhas. Tooling é referência rápida, não handbook.
- **G3 do plano (frontmatter `sources:` é compass-id, audit-trail vai em corpo):** apenas `- research: 0058a9e6` no frontmatter; path absoluto vai em "Referências externas".
- **G6 do plano (overlap com /architecture e /infrastructure):** átomo cobre toolchain Node+TS-específico (tsc/tsx/biome/pnpm/Turborepo). `/architecture` cobre codebase organization cross-stack (Clean Arch, MVC, vertical slice). `/infrastructure` cobre CI/CD genérico. Sempre que um pattern parecer cross-stack, parar e linkar.
- **Local — pnpm vs npm vs yarn já tem 1 pattern aqui + atomo `dependencies-supply-chain.md`:** evitar duplicação. Aqui cobre apenas a escolha (qual usar, por que); `dependencies-supply-chain.md` cobre lockfile + audit + SBOM + license + supply chain attacks em profundidade. Cross-ref em "Referências externas" e em "Quando NÃO usar pnpm" do pattern.
- **Local — landscape muda rápido:** biome era "Rome" há 2 anos; Bun saiu há 18 meses; ts-node está em manutenção mínima. Mencionar versão/estado quando relevante (ex: "biome 1.x", "Node 22+ `--watch`") para datar o átomo — `updated: 2026-05-16` já sinaliza, mas claims sobre maturidade ajudam o leitor a recalibrar quando ler em 2027.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é escrita de átomo, não código.

### Checklist

- [ ] Arquivo criado em `docs/knowledge/nodejs-typescript/atoms/tooling.md`
- [ ] Frontmatter com **8 campos** na ordem do piloto
- [ ] `stack: nodejs-typescript` (nunca `node-ts`)
- [ ] `layer: both` (tooling vale para backend e frontend TS)
- [ ] `tier: 3`
- [ ] 5 seções do corpo na ordem certa
- [ ] Zero placeholders `[A DEFINIR]`
- [ ] `wc -l docs/knowledge/nodejs-typescript/atoms/tooling.md` retorna entre 100 e 160 (faixa saudável 120-140)
- [ ] Links para `/architecture`, `/infrastructure` e cross-ref a `dependencies-supply-chain.md` em "Referências externas"
- [ ] Audit-trail-path absoluto da fonte `wf-0058a9e6.md` em "Referências externas" (RF11 pré-cumprido)
- [ ] `bun run harness:validate` verde com o novo átomo

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/tooling.md` exit 0
- `wc -l docs/knowledge/nodejs-typescript/atoms/tooling.md | awk '{print $1}'` retorna valor entre 100 e 160
- `grep -c '\[A DEFINIR\]' docs/knowledge/nodejs-typescript/atoms/tooling.md` retorna 0
- `grep -E '^topic: tooling$' docs/knowledge/nodejs-typescript/atoms/tooling.md` retorna 1 match
- `grep -E '^tier: 3$' docs/knowledge/nodejs-typescript/atoms/tooling.md` retorna 1 match
- `grep -E '^stack: nodejs-typescript$' docs/knowledge/nodejs-typescript/atoms/tooling.md` retorna 1 match
- `bun run harness:validate` exit 0

**Por humano (verificável em fase-06 do plano, auditoria CA-08 — opcional este átomo):**
- Patterns têm versão/estado da ferramenta quando relevante (biome 1.x, Node 22+, etc.)
- Cada pattern tem Problema + Padrão + Quando usar/NÃO — não só título
- Nenhuma claim duplica conceito cross-stack que `/architecture` (codebase org) ou `/infrastructure` (CI/CD genérico) cobre
- Cada decisão de toolchain é rastreável para passagem específica de `wf-0058a9e6.md` (≥80% per CA-08)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

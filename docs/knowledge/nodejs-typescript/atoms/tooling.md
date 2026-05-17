---
topic: tooling
stack: nodejs-typescript
layer: both
sources:
  - research: 0058a9e6
tier: 3
triggers: [biome, eslint, prettier, tsconfig, strict, noUncheckedIndexedAccess, pnpm, npm, yarn, lockfile, knip, ts-prune, depcheck, husky, lint-staged, lefthook, pre-commit, pre-push, sast, semgrep, codeql]
related_skills: [/architecture, /infrastructure]
updated: 2026-05-16
---

# Tooling — Node.js + TypeScript

## Quando consultar

- Setup inicial de toolchain TS em projeto novo: escolher executor, linter, formatter.
- Avaliar migração de eslint+prettier para biome (ou vice-versa) em codebase existente.
- Configurar monorepo TS com múltiplos pacotes (Turborepo, Nx, pnpm workspaces).
- CI lento — investigar cache strategies para install, build e lint.
- Watch mode quebrado ou lento em ambiente de desenvolvimento.

## Padrões sênior

### Pattern: Lint e format — biome vs eslint+prettier

- **Problema:** eslint+prettier exige múltiplos pacotes com configs separadas e regras potencialmente conflitantes; eslint rodando com análise de tipo pode ser lento em monorepos grandes.
- **Padrão:** Detectar tooling existente antes de propor qualquer mudança (`biome.json`, `eslint.config.*`, `.eslintrc*`, `prettier.config.*`). Para projetos novos onde velocidade importa: biome 2.x (lint + format unificado, 10–25× mais rápido que ESLint+Prettier). Para codebases existentes com ESLint funcional: evoluir em vez de migrar — adicionar regras pontuais; não propor Biome a menos que o time peça. Quando ESLint e Prettier coexistem: `eslint-config-prettier` deve ser o último item da config (desativa regras de formatação do ESLint).
- **Quando usar biome:** Projeto novo TS+JS, monorepo grande com CI lento, time que quer arquivo único de configuração.
- **Quando NÃO usar biome:** Codebase depende de regras type-aware sem equivalente em Biome (`no-floating-promises`, `no-misused-promises`), ou usa plugins ESLint específicos não portados. Migrar ESLint→Biome em repo legado funcional introduz churn massivo de formatação — exige aprovação humana explícita.

---

### Pattern: TypeScript strictness — tsconfig baseline

- **Problema:** `strict: false` ou flags individuais desativadas produzem null-pointer bugs silenciosos que `strict` teria capturado em tempo de compilação.
- **Padrão:** `strict: true` como mínimo absoluto. Adicionar `noUncheckedIndexedAccess: true` (captura ~40% dos null-pointer bugs que `strict` sozinho não pega) e `noImplicitOverride: true`. Para backend Node.js puro: `module: NodeNext` + `moduleResolution: NodeNext` + `target: ES2022`. Em projeto legado com >100 erros: habilitar `strict` no raiz e usar `// @ts-expect-error` pontual com prazo — nunca desabilitar `strict` global por causa de N arquivos. `@ts-expect-error` é preferível a `@ts-ignore` porque falha se o erro sumir.
- **Quando usar:** Todo projeto Node+TS novo. Migração legada: por subpasta com `tsconfig` adicional.
- **Quando NÃO usar:** Repo em migração JS→TS ativa em <30 dias — aceitar `strict: false` temporário com prazo marcado.

---

### Pattern: Pre-commit hooks — husky+lint-staged vs lefthook

- **Problema:** Lint quebra em CI e polui review com "rode o lint"; typecheck em pre-commit dá falsos negativos porque TypeScript precisa do projeto inteiro.
- **Padrão:** Pre-commit deve rodar apenas lint + format nos arquivos staged (meta: < 5s). Pre-push: typecheck completo (`tsc --noEmit`) + testes unitários rápidos (meta: < 60s). Coverage, dead code e security: apenas em CI. Husky + lint-staged é o padrão de facto; Lefthook (Go, paralelo nativo) é alternativa mais rápida para setup novo ou monorepo. `tsc --noEmit` em pre-commit é errado — vai ao pre-push.
- **Quando usar husky+lint-staged:** Padrão quando não há preferência; ecossistema mais documentado.
- **Quando usar lefthook:** Setup novo que quer único arquivo `lefthook.yml`; monorepo onde hook global ultrapassa 30s (suporta globs por pacote afetado).

---

### Pattern: Dead code — Knip como ferramenta padrão

- **Problema:** `ts-prune` e `depcheck` estão em maintenance mode; checar unused files, unused exports e unused deps manualmente não escala.
- **Padrão:** Knip cobre os três em um único pass (unused files + unused exports + unused deps + unlisted deps) e suporta monorepos com plugins built-in para frameworks comuns. Rodar em CI como warn-only nos primeiros 30 dias, depois bloqueante. Nunca remover dead code automaticamente: verificar imports dinâmicos, decorators de DI (NestJS, InversifyJS), entries de `package.json#bin`, convenções de loaders (`migrations/`, `seeds/`, `scripts/`).
- **Quando usar:** Qualquer repo TypeScript moderno sem ferramenta de dead code.
- **Quando NÃO usar knip --fix diretamente:** Candidatos a remoção devem passar por validação humana item a item — especialmente em projetos com DI/reflect-metadata.

---

### Pattern: Package manager — pnpm como default

- **Problema:** `npm install` lento com node_modules de 1GB+ em monorepo; lockfile inconsistente entre devs; misturar comandos de package managers diferentes corrompe a árvore de dependências.
- **Padrão:** Preservar o package manager detectado pelo lockfile (`package-lock.json`→npm, `pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn). Quando `packageManager` está em `package.json`, é a fonte da verdade. Para projetos novos: pnpm (content-addressable store, symlinks, install mais rápido, resolução estrita). Nunca misturar comandos de package managers diferentes no mesmo repo.
- **Quando usar pnpm:** Projetos novos; monorepos com múltiplos pacotes. **Ver `dependencies-supply-chain.md` para detalhes de lockfile + audit + SBOM.**
- **Quando NÃO usar pnpm:** Tooling de CI ou ecossistema que exige npm explicitamente; monorepo com dependência que não suporta symlinks (raro).

---

### Pattern: Análise estática — lint vs SAST

- **Problema:** ESLint opera em AST de um arquivo; não rastreia fluxo de dados entre arquivos. Substituir Semgrep/CodeQL por ESLint deixa vetores de injeção não cobertos.
- **Padrão:** Lint (ESLint/Biome) para estilo e bugs locais. SAST (Semgrep, CodeQL) para taint tracking cross-arquivo — segue dado de `req.body` até `db.query()`. APIs HTTP públicas: adicionar Semgrep como step de CI separado do lint, com rulesets `p/javascript` + `p/owasp-top-ten`. CodeQL: projetos open source ou com GitHub Advanced Security.
- **Quando usar SAST:** Qualquer projeto expondo API HTTP pública (Express, Fastify, NestJS, Hono).
- **Quando NÃO usar SAST como substituto de lint:** São complementares, não alternativos.

---

## Anti-padrões

- **Substituir tooling existente sem ganho mensurável:** Migrar ESLint→Biome em repo legado funcional é mudança de alto risco (churn de diff em todo o repo, possível perda de regras). Só propor migração se houver bug ativo, CI inaceitavelmente lento, ou pedido explícito com validação de cobertura de regras.

- **ESLint + Prettier sem `eslint-config-prettier`:** Regras de formatação do ESLint conflitam com o Prettier, gerando auto-fix cíclico. Correção: `eslint-config-prettier` como último item do array de configs desativa regras stylistic do ESLint; ou migrar para Biome que unifica os dois.

- **`tsc --noEmit` em pre-commit:** Falsos negativos garantidos — TypeScript precisa do projeto inteiro para checar, não só dos arquivos staged. Mover para pre-push ou CI. Pre-commit deve ser rápido (<5s) e rodar apenas lint+format nos arquivos staged.

- **ts-prune ou depcheck em setup novo:** Ambas estão em maintenance mode. Usar Knip, que cobre unused files + exports + deps + unlisted em um único pass com suporte nativo a monorepos.

---

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Projeto novo TS, dev experience first | `strict: true` + `NodeNext` + biome + pnpm |
| Codebase legado com eslint+prettier funcional | Evoluir eslint config; não migrar para biome sem pedido |
| Codebase legado depende de regras type-aware | Manter eslint+typescript-eslint; biome ainda não cobre `no-floating-promises` |
| Monorepo com CI lento no lint step | Avaliar biome (10–25× mais rápido); ou oxlint como speed boost paralelo ao ESLint |
| Pre-commit hook >10s | Lint-staged (somente arquivos staged); mover typecheck para pre-push |
| Monorepo com hook global >30s | Lefthook com globs por pacote, ou `turbo run lint --filter=...[HEAD]` |
| Dead code em repo TypeScript moderno | Knip (warn-only 30 dias → bloqueante) |
| API HTTP pública exposta | Semgrep `p/owasp-top-ten` como CI step separado do lint |
| Repo open source ou com GitHub Advanced Security | CodeQL para taint tracking |

---

## Referências externas

- Skill `/architecture` — codebase organization cross-stack (Clean Arch, MVC, vertical slice); não duplicar aqui
- Skill `/infrastructure` — CI/CD genérico (GitHub Actions patterns, secrets, deploy gates); não duplicar aqui
- Átomo `dependencies-supply-chain.md` — lockfile, audit, SBOM, supply chain attacks, license scanning (cross-ref interna)
- Research: `0058a9e6` — `claude-code/knowledge/Nodejs/compass_artifact_wf-0058a9e6-c207-4d87-aaab-2e1d2b43a481_text_markdown.md`

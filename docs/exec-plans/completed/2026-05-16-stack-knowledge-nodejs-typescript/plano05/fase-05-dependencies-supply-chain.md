<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
-->

# Fase 05: Átomo `dependencies-supply-chain.md`

**Plano:** 05 — Atom Batch B
**Sizing:** 1.5h
**Depende de:** piloto (Plano 01 fase-02 — `type-system-idioms.md`) como template de formato
**Visual:** false

---

## O que esta fase entrega

Átomo tier 2 full `docs/knowledge/nodejs-typescript/atoms/dependencies-supply-chain.md` (~120 linhas), condensando gestão de dependências e supply chain no idioma Node+TS atual: lockfiles pinados (`package-lock.json`, `pnpm-lock.yaml`, `bun.lockb`), workspaces para monorepo, audits (`npm audit` + Socket + osv-scanner), SBOM com CycloneDX, license scanning, e estratégia anti-typo-squatting / malware injection. Cobre o ângulo Node+TS-específico; `/security` cobre supply chain conceitual (CVE, SLSA, sigstore) e `/infrastructure` cobre CI/CD genérico.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/dependencies-supply-chain.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~120 linhas) |

---

## Implementacao

### Passo 1: Frontmatter completo (8 campos na ordem do piloto, zero drift)

```yaml
---
topic: dependencies-supply-chain
stack: nodejs-typescript
layer: backend
sources:
  - research: deps-kb
tier: 2
triggers: [lockfile, npm audit, pnpm, workspaces, SBOM, CycloneDX, supply chain, license]
related_skills: [/security, /infrastructure]
updated: 2026-05-16
---
```

Origens (de `_catalog.md`):
- `deps-kb` — Gestão de Dependências (6911 linhas, lockfiles, monorepo, audits, SBOM, licenses, supply chain) — alta densidade, compressão ~58×

### Passo 2: Skeleton do corpo (5 seções na ordem do piloto)

Seções obrigatórias (verbatim com piloto):

1. `# Dependencies & Supply Chain — Node.js + TypeScript` (título)
2. `## Quando consultar` — 3-5 bullets de cenários
3. `## Padrões sênior` — 5-7 patterns (sub-seções `### Pattern: {nome}` com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 2-4 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skills `/security` + `/infrastructure` + paths das fontes

### Passo 3: Conteúdo nuclear esperado (guia editorial — executor expande)

Patterns recomendados (mínimo 5, máximo 7):

- **Pattern: Lockfile pinado + `npm ci` no CI** — `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `bun.lockb` (bun), `yarn.lock` (yarn). `npm install` em CI gera lock novo (drift); `npm ci` falha se lock divergir. Quando usar `npm ci`: sempre em CI/build. Quando usar `npm install`: dev local atualizando deps.
- **Pattern: pnpm/bun workspaces para monorepo** — `pnpm-workspace.yaml` aponta `packages/*`; `bun install` resolve workspace links. Padrão evita duplicação de `node_modules` e simplifica versionamento interno. Quando usar pnpm: monorepo simples (2-15 packages). Quando usar Turborepo/Nx: build cache distribuído essencial.
- **Pattern: `npm audit` + Socket.dev / osv-scanner** — `npm audit --audit-level=high` no CI bloqueia merge se vulnerabilidade high/critical. Complementar: `socket.dev` ou `osv-scanner` detecta malware/typo-squatting (não só CVE). Quando usar: serviço em produção, qualquer dep externa. Quando NÃO usar: prototype efêmero (audit virá quando virar produção).
- **Pattern: SBOM com CycloneDX (ou SPDX)** — `@cyclonedx/cdxgen` gera SBOM JSON. Útil para compliance (NIST SP 800-218, EU CRA) + supply chain transparency. Quando usar: produto que vende para enterprise/governo. Quando NÃO usar: SaaS interno — overhead injustificado.
- **Pattern: License scanning automatizado** — `license-checker` ou `oss-review-toolkit` enumera licenças das deps; bloquear GPL/AGPL em projeto proprietário. Quando usar: produto comercial. Quando NÃO usar: lib open-source MIT/Apache.
- **Pattern: `overrides`/`resolutions` para CVE em transitive deps** — quando dep direta importa transitiva vulnerável e não atualizou. `package.json#overrides` (npm 8+) ou `pnpm.overrides`. Quando usar: CVE conhecida sem patch upstream. Quando NÃO usar: como solução permanente — fork ou substituir a dep direta.
- **Pattern: Renovate ou Dependabot com merge automation** — PRs auto-criados para minor/patch; merge auto se CI verde. Padrão: agrupar updates por ecossistema (dev-deps separado), schedule semanal. Quando usar: time mantém múltiplos serviços. Quando NÃO usar: lib única — manual update suficiente.

### Passo 4: Anti-padrões (2-4 armadilhas com correção)

- **`^` em `package.json` sem lockfile commitado** — `^1.2.3` permite minor drift; sem lockfile, dev/CI/prod podem ter versões diferentes. Correção: commitar lockfile sempre; usar `npm ci` em CI.
- **Misturar gerenciadores (npm + pnpm) no mesmo repo** — múltiplos lockfiles divergem silenciosamente. Correção: escolher 1 manager por repo; CI checa que `pnpm-lock.yaml` existe e `package-lock.json` não.
- **`npm audit fix --force` sem revisar** — pode introduzir breaking change (major bump). Correção: rodar `npm audit fix` (sem `--force`) primeiro; para vulnerabilidades restantes, avaliar `overrides` ou substituir dep.
- **Postinstall scripts arbitrários** — packages com `postinstall` podem rodar código arbitrário. Correção: `npm install --ignore-scripts` em CI/dev; permitir scripts seletivamente para deps confiáveis (esbuild, sharp).

### Passo 5: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| CI install | `npm ci` / `pnpm install --frozen-lockfile` / `bun install --frozen-lockfile` |
| Dev local atualizando | `npm install` / `pnpm add` |
| Monorepo 2-15 packages | pnpm workspaces (ou bun workspaces) |
| Monorepo 15+ packages, build cache | Turborepo ou Nx |
| Vulnerabilidade alta em CI | `npm audit --audit-level=high` bloqueia merge |
| Malware/typo-squatting | Socket.dev ou osv-scanner |
| Produto enterprise/gov | SBOM via CycloneDX |
| Produto proprietário | License scanner (bloqueia GPL/AGPL) |
| CVE em transitive sem patch | `overrides` no `package.json` (temporário) |

### Passo 6: Referências externas

- Skill: `/security` para SLSA, sigstore, criptografia, supply chain conceitual cross-stack
- Skill: `/infrastructure` para CI/CD, deploy patterns gerais, Docker base image hardening
- Source: `claude-code/knowledge/Nodejs/wf-deps-kb.md`

### Passo 7: Validar cap de 200 linhas

```bash
wc -l docs/knowledge/nodejs-typescript/atoms/dependencies-supply-chain.md
```

Resultado esperado: entre 100 e 140 linhas. Alvo: ~120 (per `_topic-plan.md:66`).

---

## Gotchas

- **G1 do plano:** frontmatter verbatim com piloto (8 campos na ordem `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`). Qualquer drift invalida CA-01.
- **G2 do plano:** cap de 200 linhas. Fonte tem 6911 linhas (compressão ~58×); resistir a abrir cada subseção como pattern. Faixa saudável: 100-140 linhas.
- **G5 do plano (overlap duplo com `/security` + `/infrastructure`):** este átomo é o único com 2 related_skills. Resistir a explicar SLSA, sigstore, criptografia conceitual (`/security`) ou CI/CD genérico, Docker layers (`/infrastructure`). Aqui é **stack-specific**: lockfile npm/pnpm/bun, workspaces, `npm audit`, CycloneDX, license-checker, overrides.
- **G6 do plano:** frontmatter `sources:` lista apenas compass-id (`deps-kb`). Sem caminho absoluto. Caminho absoluto vai em "Referências externas" no corpo.
- **Local — compressão alta exige seleção dura:** com 6911 linhas → 120 alvo, 95% do material é cortado. Critério de seleção: padrão que muda CI/PR concretamente. Princípios conceituais (o que é SBOM, por que SLSA importa) vão para `/security`.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Como o piloto, este átomo é markdown. Checklist de validação de conteúdo (sem RED→GREEN):

### Checklist

- [ ] Arquivo existe em `docs/knowledge/nodejs-typescript/atoms/dependencies-supply-chain.md`
- [ ] Frontmatter contém **todos** os 8 campos na ordem: `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`
- [ ] `topic: dependencies-supply-chain` (literal, kebab-case)
- [ ] `stack: nodejs-typescript`
- [ ] `layer: backend` (deps & supply chain é backend-heavy em servidores Node; tooling de frontend usa muitos dos mesmos padrões mas o eixo decisivo é serviço)
- [ ] `tier: 2` (context-dependent, conforme `_topic-plan.md:143`)
- [ ] `updated: 2026-05-16`
- [ ] `related_skills:` inclui ambas `/security` e `/infrastructure`
- [ ] Corpo tem as 5 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas
- [ ] Pelo menos 5 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 2 anti-padrões com correção
- [ ] `wc -l` retorna entre 100 e 140 (alvo ~120)
- [ ] `grep -c '\[A DEFINIR\]' atoms/dependencies-supply-chain.md` retorna 0
- [ ] Triggers contém pelo menos: `lockfile`, `npm audit`, `pnpm`, `workspaces`, `SBOM`, `CycloneDX`, `supply chain`, `license`
- [ ] Citação de `/security` e `/infrastructure` em "Referências externas" para deixar claros os limites cross-stack
- [ ] `bun run harness:validate` verde
- [ ] Patterns têm comando concreto (`npm ci`, `npm audit --audit-level=high`) — não princípios vagos

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/knowledge/nodejs-typescript/atoms/dependencies-supply-chain.md` exit 0
- `wc -l docs/knowledge/nodejs-typescript/atoms/dependencies-supply-chain.md` retorna número entre 100 e 140
- `grep -c '\[A DEFINIR\]' docs/knowledge/nodejs-typescript/atoms/dependencies-supply-chain.md` retorna 0
- `grep -E '^(topic|stack|layer|sources|tier|triggers|related_skills|updated):' docs/knowledge/nodejs-typescript/atoms/dependencies-supply-chain.md | wc -l` retorna 8
- `bun run harness:validate` exit 0

**Por humano:**
- Leitor sênior em Node+TS reconhece os patterns como decisões de produção (`npm ci`, pnpm workspaces, Socket.dev, overrides)
- Nenhum pattern duplica `/security` (SLSA, sigstore conceitual) ou `/infrastructure` (CI/CD genérico, Docker layers) — diferencial Node+TS-específico é claro
- Comandos concretos presentes em pelo menos 3 patterns (não apenas "considere audit")

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

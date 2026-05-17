---
topic: dependencies-supply-chain
stack: nodejs-typescript
layer: backend
sources:
  - research: deps-kb (claude-code/knowledge/Nodejs/node-deps-kb.md)
tier: 2
triggers: [lockfile, npm audit, pnpm, workspaces, SBOM, CycloneDX, supply chain, license]
related_skills: [/security, /infrastructure]
updated: 2026-05-16
---

# Dependencies & Supply Chain — Node.js + TypeScript

## Quando consultar

- Escolher package manager (npm vs pnpm vs yarn vs bun) para projeto ou monorepo novo.
- Configurar CI para instalação reprodutível (lockfile frozen, sem drift entre ambientes).
- Configurar workspaces em monorepo backend com pacotes internos compartilhados.
- Auditar vulnerabilidades (`npm audit`) ou detectar malware/typo-squatting.
- Gerar SBOM para produto enterprise ou compliance regulatório.
- Escanear licenças de dependências para evitar GPL em produto proprietário.
- Resolver CVE em dependência transitiva sem patch upstream disponível.

## Padrões sênior

### Pattern: Lockfile pinado + install frozen no CI

- **Problema:** `npm install` em CI pode atualizar o lockfile silenciosamente se ranges `^` permitirem versão nova — dev local, CI e produção ficam em versões diferentes sem aviso.
- **Padrão:** Commitir sempre o lockfile (`package-lock.json`, `pnpm-lock.yaml`, `bun.lock`). No CI usar o comando frozen: `npm ci` / `pnpm install --frozen-lockfile` / `bun install --frozen-lockfile` / `yarn install --immutable`. Comando frozen falha se lockfile divergir do `package.json`.
- **Quando usar:** sempre em CI/CD e builds de produção. O lockfile é o contrato de build.
- **Quando NÃO usar:** ao adicionar ou atualizar deps em dev local — use o comando normal do PM para gerar o lockfile atualizado e commite junto.

---

### Pattern: pnpm workspaces para monorepo backend

- **Problema:** Múltiplos serviços sem workspaces geram `node_modules` duplicado por pasta, sem link entre pacotes internos e instalação lenta.
- **Padrão:** `pnpm-workspace.yaml` na raiz aponta `packages/*` e `services/*`. Pacotes internos referenciam uns aos outros com `"@org/types": "workspace:*"` — pnpm resolve o link sem publicar no registry. Isolamento estrito bloqueia phantom dependencies por padrão.
- **Quando usar:** monorepo 2-15 packages backend. pnpm é primário por store content-addressable e isolamento. Para 15+ packages com build cache distribuído: adicionar Turborepo ou Nx.
- **Quando NÃO usar:** single-package repo — overhead injustificado.

---

### Pattern: `npm audit --audit-level=high` + Socket.dev no CI

- **Problema:** `npm audit` reporta CVEs mas não detecta malware, typo-squatting ou dependency confusion — vetores sem CVE imediato.
- **Padrão:** `npm audit --audit-level=high` (ou `pnpm audit --audit-level=high`) no CI bloqueia merge em vulnerabilidade high/critical. Complementar com Socket.dev ou `osv-scanner` para análise comportamental de pacotes.
- **Quando usar:** qualquer serviço com dependências externas em produção.
- **Quando NÃO usar:** prototype descartável.

---

### Pattern: `overrides`/`pnpm.overrides` para CVE em transitivas

- **Problema:** Dependência transitiva tem CVE mas a dep direta não liberou patch; `npm audit` continua falhando sem ação possível via update normal.
- **Padrão:** `package.json#overrides` (npm 8.3+) ou `package.json#pnpm.overrides` forçam a versão segura da transitiva. Ex: `{ "overrides": { "vulnerable-pkg": ">=2.1.0" } }`.
- **Quando usar:** CVE conhecida em transitiva sem patch upstream — remediação temporária.
- **Quando NÃO usar:** como solução permanente. Se upstream não vai atualizar, substituir a dep direta. Overrides não revisados mascaram o problema.

---

### Pattern: SBOM com CycloneDX

- **Problema:** Produto vendido para enterprise ou governo precisa listar todos os componentes com versão e origem para compliance (NIST SP 800-218, EU Cyber Resilience Act).
- **Padrão:** `npx @cyclonedx/cyclonedx-npm --output-file bom.json` gera SBOM CycloneDX JSON no pipeline de release, versionado junto ao artefato.
- **Quando usar:** produto com requisito regulatório ou contratual de SBOM.
- **Quando NÃO usar:** SaaS interno sem requisito regulatório.

---

### Pattern: License scanning automatizado

- **Problema:** Dependência GPL ou AGPL em produto proprietário pode criar obrigação de publicar o código-fonte.
- **Padrão:** `npx license-checker --production --onlyAllow "MIT;Apache-2.0;BSD-3-Clause;BSD-2-Clause;ISC;CC0-1.0;Unlicense" --excludePrivatePackages` no CI falha o build se licença fora da allowlist for detectada.
- **Quando usar:** qualquer produto comercial ou proprietário com dependências externas.
- **Quando NÃO usar:** lib open-source com licença permissiva — sem restrição de saída.

---

### Pattern: Renovate para updates automatizados de deps

- **Problema:** Dependências ficam desatualizadas acumulando CVEs e breaking changes sem processo de update.
- **Padrão:** Renovate com automerge em minor/patch quando CI verde; agrupamento de devDependencies para reduzir ruído de PRs. Dependabot como alternativa nativa do GitHub.
- **Quando usar:** time mantendo múltiplos serviços.
- **Quando NÃO usar:** pacote único com ciclo de release muito curto — update manual pontual é suficiente.

## Anti-padrões

- **`^` sem lockfile commitado:** `^1.2.3` permite minor drift; sem lockfile, dev/CI/prod instalam versões diferentes silenciosamente. Correção: commitar lockfile em todo projeto; usar `npm ci` no CI.

- **Múltiplos lockfiles no mesmo repo:** rodar `npm install` em projeto pnpm gera `package-lock.json` ao lado de `pnpm-lock.yaml`; builds divergem. Correção: detectar PM canônico pelo campo `packageManager` ou pelo lockfile com maior histórico git; remover o lockfile espúrio após confirmar com o time.

- **`npm audit fix --force` sem revisar:** `--force` pode introduzir major bump com breaking changes. Correção: rodar `npm audit fix` (sem `--force`) primeiro; para CVEs restantes, usar `overrides` ou substituir a dep direta.

- **Postinstall scripts sem allowlist:** pacotes com `postinstall` rodam código arbitrário na instalação — vetor de supply chain attack. Correção: `npm install --ignore-scripts` no CI; permitir scripts seletivamente apenas para deps confiáveis que exigem (esbuild, sharp, prisma).

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| CI install | `npm ci` / `pnpm install --frozen-lockfile` / `bun install --frozen-lockfile` |
| Dev local adicionando dep | `npm install` / `pnpm add` / `bun add` |
| Single API, time pequeno | npm |
| Monorepo 2-15 packages backend | pnpm workspaces |
| Monorepo 15+ packages, build cache | pnpm + Turborepo ou Nx |
| Projeto legado em Yarn Classic | Manter Yarn Classic — não migrar sem pedido explícito |
| Vulnerabilidade high/critical em CI | `npm audit --audit-level=high` bloqueia merge |
| Malware / typo-squatting | Socket.dev ou osv-scanner |
| CVE transitiva sem patch upstream | `overrides` em `package.json` (solução temporária) |
| Produto enterprise / gov | SBOM via CycloneDX (`npx @cyclonedx/cyclonedx-npm --output-file bom.json`) |
| Produto proprietário com deps externas | `license-checker --onlyAllow "MIT;Apache-2.0;BSD-3-Clause;ISC"` |
| Updates automáticos de minor/patch | Renovate com automerge + CI verde |

## Referências externas

- Skill: `/security` — SLSA, sigstore, criptografia, supply chain conceitual cross-stack, CVE management além de Node
- Skill: `/infrastructure` — CI/CD pipelines, Docker base image hardening, deploy patterns genéricos
- Source: `deps-kb` — `claude-code/knowledge/Nodejs/node-deps-kb.md`

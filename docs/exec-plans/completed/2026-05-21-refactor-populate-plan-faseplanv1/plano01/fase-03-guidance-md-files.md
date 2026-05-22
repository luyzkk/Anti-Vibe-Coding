# Fase 03: Criar 16 arquivos .md de guidance per-doc

**Plano:** 01 — Schema, Renderer e Data
**Sizing:** 2-3h
**Depende de:** fase-02 (precisa do `mustCover` para alinhar nomes de H2)
**Visual:** false

---

## O que esta fase entrega

A camada **interpretativa** do contrato: 16 arquivos markdown em `skills/init/assets/populate-guidance/`, um por doc canonico. Cada arquivo eh prosa rica (estilo "First Use Customization" do Harness do Andre Prado) + extensoes AVC — guia a LLM a entender o **espirito** do doc, nao so a estrutura. Renderer NAO le esses `.md` em runtime (lazy loading); o caminho fica em `guidanceFile` do `FasePlanInput` e a LLM le quando executa a fase.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/populate-guidance/agents-md.md` | Create | Prosa per-doc para AGENTS.md |
| `skills/init/assets/populate-guidance/architecture-md.md` | Create | Prosa per-doc para ARCHITECTURE.md |
| `skills/init/assets/populate-guidance/readme-md.md` | Create | Prosa per-doc para README.md |
| `skills/init/assets/populate-guidance/docs-quality-score-md.md` | Create | Prosa per-doc para docs/QUALITY_SCORE.md |
| `skills/init/assets/populate-guidance/docs-plans-md.md` | Create | Prosa per-doc para docs/PLANS.md |
| `skills/init/assets/populate-guidance/docs-design-md.md` | Create | Prosa per-doc para docs/DESIGN.md |
| `skills/init/assets/populate-guidance/docs-frontend-md.md` | Create | Prosa per-doc para docs/FRONTEND.md |
| `skills/init/assets/populate-guidance/docs-product-sense-md.md` | Create | Prosa per-doc para docs/PRODUCT_SENSE.md |
| `skills/init/assets/populate-guidance/docs-reliability-md.md` | Create | Prosa per-doc para docs/RELIABILITY.md |
| `skills/init/assets/populate-guidance/docs-security-md.md` | Create | Prosa per-doc para docs/SECURITY.md |
| `skills/init/assets/populate-guidance/docs-design-docs-core-beliefs-md.md` | Create | Prosa per-doc para docs/design-docs/core-beliefs.md |
| `skills/init/assets/populate-guidance/docs-generated-db-schema-md.md` | Create | Prosa per-doc para docs/generated/db-schema.md |
| `skills/init/assets/populate-guidance/docs-merge-gates-md.md` | Create | Prosa per-doc para docs/MERGE_GATES.md |
| `skills/init/assets/populate-guidance/docs-code-style-md.md` | Create | Prosa per-doc para docs/CODE_STYLE.md |
| `skills/init/assets/populate-guidance/docs-state-md.md` | Create | Prosa per-doc para docs/STATE.md |
| `skills/init/assets/populate-guidance/claude-claude-md.md` | Create | Prosa per-doc para .claude/CLAUDE.md |
| `skills/init/assets/populate-guidance/_template.md` | Create | Template generico para futuros docs (DRY) |
| `skills/init/assets/populate-guidance/_index.md` | Create | Indice dos 16 .md com link e 1-line description |
| `skills/init/lib/populate-guidance-files.test.ts` | Create | Test: cada `guidanceFile` em `POPULATE_INSTRUCTIONS_BY_DOC` aponta para arquivo existente |

---

## Implementacao

### Passo 1: Definir a estrutura comum de cada `.md` de guidance

Todo arquivo segue o mesmo esqueleto. Eh prosa, nao bullets achatados — o objetivo eh dar a LLM **espirito** do doc.

```markdown
# Guidance: {DOC_PATH}

> Esta prosa eh **interpretativa** — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

{1-2 paragrafos. Como o Andre escreve First Use Customization — o que o doc resolve,
quem le, quando consultar.}

## Espirito do doc (tom esperado)

{1 paragrafo. Tom — descritivo vs aspiracional, denso vs introdutorio, etc.}

## Sinais a procurar no codebase

{Bullets com greps/globs e o que cada um indica. Espelha `detectionSignals` mas
em prosa, explicando POR QUE cada sinal eh relevante.}

## Por H2 — o que escrever (e o que NAO escrever)

### {H2 1}
{Prosa: 1 paragrafo do que esta H2 deve cobrir. Sublinhar gotchas se houver.}
**Cubra:** {1 linha resumindo os itens de mustCover dessa H2}
**NAO escreva:** {1 linha — itens que pertencem a outro doc}

### {H2 2}
{...}

## Stack-specific (quando aplicavel)

{Para docs com stackVariants: 3 subsecoes (Rails / Next+React / Node+TS) com
1 paragrafo cada. Quando nao aplicavel: omitir esta secao.}

## Links obrigatorios

{Prosa explicando POR QUE cada link em linkTargets eh necessario.}

## Quando deixar TODO

{Convencao do Andre: `TODO(<owner/context needed>): ...` quando LLM nao tem
contexto suficiente. Especificar quais contextos sao aceitos e quais NAO sao.}

## Anti-patterns

{Bullets de coisas explicitas a NAO fazer. Ex: "nao copiar texto de outro doc",
"nao mencionar implementacao", etc.}
```

### Passo 2: Conteudo concreto por doc

> Cada arquivo eh **1-3 KB** de prosa. Aqui dou exemplos para 3 docs; replicar o padrao para os outros 13.

**Exemplo 1: `skills/init/assets/populate-guidance/docs-security-md.md`**

```markdown
# Guidance: docs/SECURITY.md

> Prosa interpretativa para a fase que popula docs/SECURITY.md.
> NAO eh lida em runtime — referenciada via `guidanceFile` no FasePlanInput.

## What this doc is for

docs/SECURITY.md eh a **superficie de seguranca declarada** do projeto. Quem chega
no projeto deve conseguir, em 5 minutos, entender (a) como autenticacao funciona,
(b) onde secrets vivem, (c) o que esta fora do escopo. NAO eh checklist OWASP.
NAO eh relatorio de pentest. Eh um mapa minimalista que aponta para o codigo real.

## Espirito do doc

Descritivo, NUNCA aspiracional. "Usamos JWT com refresh em cookie HttpOnly" eh bom.
"Vamos implementar 2FA no Q3" eh ruim — pertence a docs/PLANS.md. Se voce nao
encontrar como autenticacao funciona no codigo, escreva `TODO(<auth-flow needed>):
provider e ciclo de sessao nao identificados` em vez de chutar.

## Sinais a procurar no codebase

- `process.env\\.` — qualquer leitura de env var. Mapeia quais secrets existem.
- `JWT_SECRET`, `SESSION_SECRET`, `*_KEY` — secrets concretos referenciados em
  codigo. Use o NOME, nao o valor (obviamente).
- `cors\\(`, `helmet\\(`, `csurf\\(` — middlewares de hardening HTTP.
- `bcrypt`, `argon2`, `scrypt` — hashing de password. Aponta provider de auth.
- `passport\\.use\\(|next-auth|devise|omniauth` — provider de auth declarado.

## Por H2 — o que escrever

### Auth Flow
Como autenticacao acontece end-to-end: provider, ciclo de sessao, refresh strategy.
**Cubra:** provider (next-auth/devise/passport/etc), sessao (cookie/JWT/server-side),
refresh (refresh token? sliding window?).
**NAO escreva:** comparativos com outros providers ("poderia ser Auth0 mas..."),
implementacao step-by-step (pertence ao codigo).

### Secrets
Onde secrets vivem em runtime e em desenvolvimento, como sao rotacionados, quem audita.
**Cubra:** onde estao (env, vault, AWS Secrets Manager), politica de rotacao se houver,
acesso audit (quem viu o que e quando).
**NAO escreva:** valores reais de secrets (obvio), instrucoes de "como obter o token"
(pertence ao runbook interno).

### Data Classification
Que tipos de dados o projeto manipula (PII, financial, public) e o que cada
classificacao implica em codigo.
**Cubra:** classificacoes em uso, exemplos de campos por classificacao, impactos
em logging/cache.
**NAO escreva:** politica corporativa generica (pertence ao compliance).

### Threat Model (opcional)
Se o projeto tem threat model, esta H2 aponta para ele. Se nao tem, omitir a H2
inteira (NAO escrever placeholder).

## Stack-specific

### Rails
Devise + rails-secrets convencionais. Procure `app/models/user.rb` para devise
modules, `config/credentials.yml.enc` para secrets.

### Next + React
next-auth e default. Procure `app/api/auth/[...nextauth]/route.ts` ou equivalente,
`middleware.ts` para guards.

### Node + TypeScript (sem Next)
Geralmente Passport ou JWT manual. Procure `src/middleware/auth.ts` ou similar,
verifique `dotenv-safe` ou similar para validacao de env.

## Links obrigatorios

- `docs/MERGE_GATES.md` — gates que bloqueiam merge se secrets vazarem (CI scan).
- `docs/ARCHITECTURE.md#components` — onde auth se encaixa no diagrama.

## Quando deixar TODO

Se voce NAO encontra como auth funciona apos grep de todos os signals listados,
deixe `TODO(<auth-flow-needed>): provider e ciclo de sessao nao identificados —
verificar com dev`. NAO chute — esse e justamente um campo onde chute eh perigoso
(seguranca falsa).

## Anti-patterns

- NAO copiar OWASP Top 10 inteiro — eh checklist generico que envelhece.
- NAO escrever "se for hackeado, ligar para X" — runbook, nao docs/SECURITY.md.
- NAO mencionar pentests historicos especificos — confidencial.
- NAO usar voz futura ("vamos adicionar...") — descritivo apenas.
```

**Exemplo 2: `skills/init/assets/populate-guidance/readme-md.md`** (mais curto, sem stackVariants intricados)

```markdown
# Guidance: README.md

> Prosa interpretativa. NAO lida em runtime.

## What this doc is for

README.md eh o **primeiro arquivo que alguem ve** ao chegar no projeto. Resolve UMA
pergunta: "consigo rodar isso localmente em <10 minutos?". Tudo mais (arquitetura,
roadmap, governanca) vai para outros docs e fica linkado.

## Espirito do doc

Curto. Acionavel. Top-to-bottom executavel sem fluxo paralelo. Se o leitor precisa
abrir 3 abas para entender o Quick Start, voce escreveu demais.

## Sinais a procurar

- `package.json` → `scripts.dev`, `scripts.start`, `scripts.test`. Source of truth.
- Framework markers: `next.config.js`, `Gemfile`, `pyproject.toml`.
- `docker-compose.yml`, `Dockerfile.dev` — se existe, mencionar como alternativa.

## Por H2 — o que escrever

### Overview
1-2 sentencas. O que o projeto faz, para quem.
**NAO escreva:** historia do projeto, pitch comercial.

### Prerequisites
Versoes de runtime (Node 18+, Ruby 3.2, etc), DBs externos se forem locais.
**NAO escreva:** "saiba git e bash" (assume baseline).

### Quick Start
Comandos exatos que rodam top-to-bottom. Idealmente 3-5 comandos.
**NAO escreva:** "rode o instalador.sh com `--help` para ver opcoes" — execute o caminho feliz.

### Key Documentation
Links para os 3-5 docs mais importantes (ARCHITECTURE, SECURITY, PLANS).
**NAO escreva:** indice completo de todos os docs (vira ruido).

## Stack-specific

### Rails
`bundle install && bin/rails db:setup && bin/rails server`. Mencione versao do Ruby.

### Next + React
`bun install && bun dev` (ou pnpm/npm dependendo do lock). Mencione versao do Node.

### Node + TypeScript
`bun install && bun run dev` se existe; caso contrario aponte para o script real.

## Links obrigatorios

- `ARCHITECTURE.md` — leitura subsequente natural para quem quer entender mais.

## Quando deixar TODO

Se Quick Start nao roda top-to-bottom (encontrou bug em setup), deixe
`TODO(<broken-setup>): comando X falha em ambiente Y — investigar`.

## Anti-patterns

- NAO incluir prints de UI (envelhece rapido, infla repo).
- NAO incluir badges decorativos no topo (CI status eh util, "made with love" nao eh).
- NAO repetir CONTRIBUTING.md aqui.
```

**Exemplo 3: `skills/init/assets/populate-guidance/docs-product-sense-md.md`** (filosofico, sem stackVariants, mais curto)

```markdown
# Guidance: docs/PRODUCT_SENSE.md

> Prosa interpretativa. NAO lida em runtime.

## What this doc is for

PRODUCT_SENSE define **quando o agente deve empurrar de volta** em vez de implementar
direto. Eh o oposto de um spec — descreve sinais para questionar requisitos.

## Espirito do doc

Reflexivo, nao prescritivo. "Quando o requisito eh 1 linha, peca exemplos antes de
codar" eh bom. "Sempre faca X" eh ruim.

## Sinais a procurar

Este doc NAO eh derivado do codigo. Eh sintese de valores. Sinais que ajudam:
- Comentarios `TODO(product):` ou `XXX:` no codebase — areas de incerteza historica.
- Commits com mensagens vagas — sinal de requisito mal formado.
- Issues abertas com "?" no titulo — perguntas pendentes a esclarecer.

## Por H2 — o que escrever

### When to push back
Sinais concretos: requisito de 1 linha, mudancas que duplicam logica existente,
features que assumem usuario sem entrevista.

### How to push back
Tom: "antes de implementar X, ajude-me a entender Y" — nao "isso eh ruim".

### When NOT to push back
Bug fixes obvios, mudancas de copy/texto, refatorions internas.

## Anti-patterns

- NAO transformar PRODUCT_SENSE em "guia de quando dizer nao para o PM" — eh
  sobre clareza, nao confronto.
- NAO citar autores especificos ("Marty Cagan diz...") — vira religiao em vez de pratica.
```

Replicar o padrao para os 13 docs restantes. Tamanho-alvo: 1-3 KB por arquivo.

### Passo 3: `_template.md` para futuros docs (DRY)

```markdown
# Guidance: {DOC_PATH}

> Prosa interpretativa. NAO lida em runtime.

## What this doc is for
{Para que o doc serve, em 1-2 paragrafos.}

## Espirito do doc
{Tom: descritivo/aspiracional, denso/introdutorio.}

## Sinais a procurar
{Bullets — espelha detectionSignals em prosa.}

## Por H2 — o que escrever
{Subsecoes por H2 de mustCover.}

## Stack-specific (se aplicavel)
{Subsecoes rails / nextjs / node-ts.}

## Links obrigatorios
{Prosa: por que cada linkTarget eh necessario.}

## Quando deixar TODO
{Convencao TODO(<owner/context needed>): ...}

## Anti-patterns
{Bullets do que NAO fazer.}
```

### Passo 4: Test de existencia

```typescript
// skills/init/lib/populate-guidance-files.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-03 — valida que cada guidanceFile aponta para .md real.

import { describe, test, expect } from 'bun:test'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { POPULATE_INSTRUCTIONS_BY_DOC } from './populate-instructions-table'

const REPO_ROOT = path.resolve(import.meta.dir, '../../..')

describe('populate-guidance .md files', () => {
  test('every guidanceFile in POPULATE_INSTRUCTIONS_BY_DOC exists on disk', async () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const abs = path.join(REPO_ROOT, instr.guidanceFile)
      const stat = await fs.stat(abs).catch(() => null)
      expect(stat, `${doc}: guidanceFile not found at ${instr.guidanceFile}`).not.toBeNull()
      expect(stat!.isFile(), `${doc}: guidanceFile is not a file`).toBe(true)
    }
  })

  test('each guidance .md is non-trivial (>= 500 chars)', async () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const abs = path.join(REPO_ROOT, instr.guidanceFile)
      const content = await fs.readFile(abs, 'utf-8')
      expect(content.length, `${doc}: guidance .md is too short (${content.length} chars)`).toBeGreaterThanOrEqual(500)
    }
  })

  test('each guidance .md starts with `# Guidance: {docPath}`', async () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const abs = path.join(REPO_ROOT, instr.guidanceFile)
      const content = await fs.readFile(abs, 'utf-8')
      const expectedHeading = `# Guidance: ${doc}`
      expect(content.startsWith(expectedHeading), `${doc}: first line should be "${expectedHeading}"`).toBe(true)
    }
  })
})
```

### Passo 5: `_index.md` para discoverability

```markdown
# Populate Guidance — Index

Prosa interpretativa per-doc para `skills/init` populate-harness pipeline.
Cada arquivo eh referenciado via campo `guidanceFile` em `populate-instructions-table.ts`.
NAO lida em runtime pelo renderer — LLM le sob demanda quando executa a fase.

- [agents-md.md](./agents-md.md) — AGENTS.md
- [architecture-md.md](./architecture-md.md) — ARCHITECTURE.md
- [readme-md.md](./readme-md.md) — README.md
- [docs-quality-score-md.md](./docs-quality-score-md.md) — docs/QUALITY_SCORE.md
- ... (16 entradas)
```

---

## Gotchas

- **G1:** Cada `.md` tem que ter cabecalho exato `# Guidance: {docPath}` — test asserta. Renomear o cabecalho quebra o test.
- **G2:** Tamanho-alvo eh 1-3 KB por arquivo. Test asserta >= 500 chars. Se ficar muito curto, provavelmente esta achatado em bullets — reescrever em prosa.
- **G3:** NAO incluir copy literal de outros docs do harness aqui (CLAUDE.md, AGENTS.md). Guidance eh META — fala sobre como popular o doc, nao eh o doc.
- **G4:** `_template.md` e `_index.md` tem prefixo `_` para nao serem confundidos com docs reais. Test filtra por convencao (somente entries em POPULATE_INSTRUCTIONS_BY_DOC).
- **G5:** Se um doc nao tem `stackVariants`, a secao "Stack-specific" do `.md` correspondente DEVE ser omitida (nao deixar vazia).
- **G6:** Em fase-04 vem o drift test — esta fase NAO valida que `mustCover` H2 names == H2 names mencionadas no `.md`. Apenas existencia e tamanho. fase-04 cuida do match semantico.

---

## Verificacao

### TDD

- [ ] **RED:** rodar `bun test skills/init/lib/populate-guidance-files.test.ts` antes de criar os `.md` — falha (arquivos nao existem)
- [ ] **RED → GREEN:** apos criar os 16 `.md` + `_template.md` + `_index.md`, `bun test` retorna `3 passed, 0 failed`
- [ ] **REFACTOR:** `bun run lint` limpo (Markdown linter se houver)

### Checklist

- [ ] 16 arquivos `.md` em `skills/init/assets/populate-guidance/` correspondendo aos 16 docs canonicos
- [ ] `_template.md` e `_index.md` presentes
- [ ] Cada arquivo abre com `# Guidance: {docPath}`
- [ ] Cada arquivo tem >= 500 chars
- [ ] Docs com `stackVariants` no `populate-instructions-table.ts` tem secao "Stack-specific" no `.md` correspondente
- [ ] Docs sem `stackVariants` NAO tem secao "Stack-specific" no `.md`
- [ ] Testes passam: `bun test skills/init/lib/populate-guidance-files.test.ts`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/populate-guidance-files.test.ts` retorna `3 passed, 0 failed`
- `find skills/init/assets/populate-guidance/ -name "*.md" -not -name "_*"` retorna 16 paths
- `wc -c skills/init/assets/populate-guidance/*.md` mostra cada arquivo >= 500 bytes

**Por humano:**
- Sampling de 3 arquivos: prosa eh interpretativa (parece um humano explicando), NAO bullets achatados
- Anti-patterns sao concretos, NAO genericos

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->

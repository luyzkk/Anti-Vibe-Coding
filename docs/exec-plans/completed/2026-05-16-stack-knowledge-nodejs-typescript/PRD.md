---
slug: stack-knowledge-nodejs-typescript
date: 2026-05-16
status: completed
completedAt: 2026-05-17
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Comentários em código gerado deste PRD seguem: autor + papel, YYYY-MM-DD, razão/decisão referenciada.
Ex: `// 2026-05-16 (Luiz/dev): default skip refresh — alinhado com CA-04`
-->

# PRD: Stack Knowledge Layer — Node.js + TypeScript (v6.3.2)

**Status:** Draft
**Author:** Luiz Felipe + AI (consultant + write-prd)
**Date:** 2026-05-16
**Context:** ./CONTEXT.md (a ser gerado via /grill-me se necessário; por ora vive em `../decisions.md`, `../docs/knowledge/nodejs-typescript/_catalog.md` e `_topic-plan.md`)

---

## Problema

Skills cross-stack do plugin (`/security`, `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow`) entregam consultoria **genérica** que vale para qualquer stack. Falta camada de **padrões sênior stack-specific**:

- `/security` cobre OWASP em geral, mas não fala de **prototype pollution** (Node-específico)
- `/api-design` cobre N+1 em geral, mas não fala de eager loading no **Prisma vs Drizzle**
- `/system-design` cobre cache, mas não fala de **AsyncLocalStorage** para request-scoped state em Node

Resultado: agente recomenda padrões cross-stack quando padrão Node+TS-específico seria melhor. Vibe coding sutil — não erra, mas perde nível sênior em projetos Node+TS.

Existem 15 pesquisas profundas + 6 skill packages de Node+TS (~27.000 linhas) já coletadas em `claude-code/knowledge/Nodejs/`, prontas para condensar em camada consultável (compressão alvo ~16×).

---

## Solução

### Outcomes

- Ao rodar `/init` em projeto Node+TS, o projeto recebe `.claude/knowledge/INDEX.md` + 14 átomos Node+TS-específicos automaticamente
- Quando skills cross-stack são invocadas em projeto com `.claude/knowledge/` populado, elas citam o knowledge stack-specific antes do corpo genérico
- Plugin matrix cresce com novas stacks (Rails, Python, Go) sem afetar projetos já instalados
- Cada projeto carrega **apenas** o knowledge da sua stack — sem deadweight de stacks irrelevantes
- Stack detection é **explícita e auditável** via `.claude/stack.json`

### Mecanismo

**Plugin matrix (este repo):**
```
docs/knowledge/
├── nodejs-typescript/
│   ├── INDEX.md
│   └── atoms/
│       ├── async-concurrency-streams.md
│       ├── type-system-idioms.md
│       ├── error-handling-observability.md
│       ├── state-and-caching.md
│       ├── data-persistence.md
│       ├── api-design-stack-specific.md       (thin, complementa /api-design)
│       ├── security-stack-specific.md         (thin, complementa /security)
│       ├── testing-strategy.md
│       ├── performance-and-internals.md
│       ├── code-smells-catalog.md
│       ├── architecture-conventions.md
│       ├── operations-and-deploy.md
│       ├── tooling.md
│       └── dependencies-supply-chain.md
└── (rails/, python/, go/ — stacks futuras)
```

**Projeto após `/init`:**
```
.claude/
├── knowledge/
│   ├── INDEX.md
│   └── atoms/*.md       (cópia de docs/knowledge/{primary-stack}/)
└── stack.json           (resultado da detecção)
```

**Init detection (heurística primário + secundário):**

Anchor files mapeiam para stacks:
- `package.json` (com TypeScript em deps/devDeps) → `nodejs-typescript`
- `Gemfile` → `rails`
- `pyproject.toml` ou `requirements.txt` → `python`
- `go.mod` → `go`

Quando múltiplos anchors detectados (ex: Rails com frontend Node):
- **Primary** = stack com mais arquivos source (`.rb` vs `.ts`/`.js` por contagem)
- **Secondary** = demais anchors detectados, listados em `stack.json` mas knowledge **NÃO** copiado

`stack.json` schema:
```json
{
  "primary": "nodejs-typescript",
  "secondary": ["rails"],
  "detected_at": "2026-05-16T12:34:56Z",
  "anchor_files": ["package.json", "Gemfile"]
}
```

**Skill wire-up (preface uniforme):**

Cada uma das 7 cross-stack skills ganha bloco `stack-aware-preface` no início:

```typescript
// stack-aware-preface — lê .claude/knowledge/INDEX.md se existir
import { existsSync, readFileSync } from 'node:fs'
const knowledgePath = '.claude/knowledge/INDEX.md'
const stackKnowledgePreface = existsSync(knowledgePath)
  ? `Antes do corpo desta skill, consulte \`.claude/knowledge/INDEX.md\` para padrões stack-specific deste projeto.`
  : ''
```

Skill **não precisa saber qual stack** — init já garantiu que `.claude/knowledge/` tem o stack certo. Graceful degradation se ausente.

**Atom format (frontmatter fixo):**

```yaml
---
topic: {slug}
stack: nodejs-typescript
layer: [backend|frontend|both]
sources:
  - research: {compass-id}
  - skill: {nome}/SKILL.md
tier: 1|2|3
triggers: [keyword, keyword, ...]
related_skills: [/skill-name, ...]
updated: YYYY-MM-DD
---
```

Corpo do átomo (skeleton):
- **Quando consultar** (3-5 bullets de cenário)
- **Padrões sênior** (3-7 patterns: problema → padrão → quando usar → quando NÃO usar)
- **Anti-padrões** (2-5 armadilhas com correção)
- **Critérios de decisão** (tabela ou bullets de "se X, então Y")
- **Referências externas** (skills relacionadas + source path)

---

## Fluxos UX por Ator

Feature backend-only (plugin internals). Único ator: **dev que roda `/init` em projeto novo**.

### Dev (uso típico)

1. Dev clona projeto Node+TS, instala plugin Anti-Vibe-Coding
2. Dev roda `/init` (slash command no Claude Code)
3. Init detecta stack via anchor files → grava `.claude/stack.json`
4. Init copia `docs/knowledge/nodejs-typescript/` do plugin matrix → `.claude/knowledge/` do projeto
5. Dev vê output: `"Stack detected: nodejs-typescript. Knowledge copied: 14 atoms."`
6. Dev usa Claude Code normalmente — skills cross-stack agora citam knowledge automaticamente

### Edge cases visíveis ao dev

- `.claude/knowledge/` já existe → init informa `"Knowledge já existe. Use --refresh-knowledge para re-copiar."` e pula
- Stack não reconhecida (sem anchor file conhecido) → init grava `stack.json` com `primary: null`, não copia nada, informa `"Stack não detectada. Knowledge não foi copiado."`
- Multi-stack (Rails + Node frontend) → init grava `primary: rails`, `secondary: [nodejs-typescript]`, copia só Rails knowledge (que ainda não existe em v6.3.2 → fica vazio)

---

## Requisitos Funcionais

### Must Have (6 itens — 35% do total)

- [ ] **RF1** — `docs/knowledge/nodejs-typescript/INDEX.md` criado com mapa de keywords → átomos + agrupamento por tier e por layer
- [ ] **RF2** — 14 átomos escritos em `docs/knowledge/nodejs-typescript/atoms/*.md`, cada um seguindo formato fixo (frontmatter + skeleton de corpo)
- [ ] **RF3** — `/init` skill estendida para detectar stack via anchor files (heurística primário + secundário) e persistir resultado em `.claude/stack.json`
- [ ] **RF4** — `/init` copia `docs/knowledge/{primary-stack}/` → `.claude/knowledge/` quando `.claude/knowledge/` não existe (idempotent default)
- [ ] **RF5** — 7 skills cross-stack (`/security`, `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow`) ganham `stack-aware-preface` que cita `.claude/knowledge/INDEX.md` se existir
- [ ] **RF6** — Cada átomo passa por sanity check: subagente verificador valida fidelidade do conteúdo vs fonte de origem em sample audit (≥ 80% das claims rastreáveis para passagens específicas)

### Should Have

- [ ] **RF7** — Flag `--refresh-knowledge` (ou equivalente) em `/init` para re-copiar knowledge mesmo se `.claude/knowledge/` já existe
- [ ] **RF8** — Re-scan dos 15 rules "core-contributor-only" de `nodejs-core/rules/` para resgatar nuggets app-relevant; mínimo obrigatório: conteúdo de `primordials.md` migra para `security-stack-specific.md`
- [ ] **RF9** — Telemetria do `/init` emite eventos `stack_detected: { primary, secondary, anchor_files }` e `knowledge_copied: { stack, atom_count }` via `lib/telemetry-utils.ts`

### Could Have

- [ ] **RF10** — Output de `/init` inclui prévia das keywords cobertas pelo knowledge (ex: "Knowledge contém átomos sobre: event loop, Prisma, Pino, OWASP Node, ...")
- [ ] **RF11** — Frontmatter `sources:` com paths absolutos das fontes em `claude-code/knowledge/Nodejs/` (para audit trail)

### Won't Have (desta versão)

- Stacks além de Node+TS — Rails, Python, Go ficam para v6.3.3+
- Cluster Keccak/Ethereum (Web3) — nicho fora de "padrões sênior gerais"
- Drift detection automática de fontes — frontmatter `sources:` é audit trail só; refresh manual
- `_shared/` para conteúdo cross-stack — criar quando segunda stack chegar
- Update flow propagando knowledge para projetos já instalados quando matrix atualizar
- Skill `/detect-stack` separada — funcionalidade fica em `/init`

---

## Requisitos Nao-Funcionais

- **Performance:** Stack detection < 500ms em projeto típico. Cópia de knowledge (~1.7k linhas markdown, 14 arquivos) < 100ms.
- **Segurança:** N/A — conteúdo markdown estático, sem execução de código no runtime.
- **Acessibilidade:** N/A — arquivos legíveis por agente, não UI human-facing.
- **Observabilidade:** Telemetria via padrão existente do plugin (`lib/telemetry-utils.ts`); eventos novos: `stack_detected`, `knowledge_copied`.
- **Manutenibilidade:** Cada átomo ≤ 200 linhas. INDEX.md ≤ 100 linhas. Frontmatter consistente em 100% dos átomos. Schema check via `bun run harness:validate`.

---

## Decisões Tecnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---|---|---|---|
| D1 | Local do knowledge no plugin | `docs/knowledge/{stack}/atoms/` | `skills/knowledge-{stack}/` | Casa com `docs/design-docs`, `docs/compound`; separa behavior de content |
| D2 | Unidade de organização | Stack (Node+TS junto) | Por linguagem | Sênior pensa em ecossistema; `layer:` no frontmatter resolve filtragem secundária |
| D3 | Granularidade | 14 átomos | 10 (consolidado) ou 18+ (split) | Balanço foco vs proliferação; ~16× compressão |
| D4 | PRD count | 1 PRD + 6 planos internos | 3 PRDs separados | Formato compartilhado vira drift entre PRDs |
| D13 | Stack detection | One-shot no `/init` | Runtime em cada skill | Init já tem signals ricos; runtime é overhead desnecessário |
| D14 | Deployment model | Init-time copy do matrix | Soft filter (sempre cita matrix) ou install-time hard filter | Matrix monotônico; projeto atômico; init é o ponto natural de filter |
| D15 | Conflito multi-stack | Primário + secundário | Prompt interativo ou maior peso | Auto detect com signal claro; secundário documentado mas não copiado |
| D16 | `.claude/knowledge/` pré-existente | Skip (idempotent) | Overwrite ou prompt | Init idempotente por default; `--refresh-knowledge` para override |
| D17 | Versionamento átomo | `updated: YYYY-MM-DD` no frontmatter | Git suffice ou semver | Signal legível sem overhead de semver |
| D18 | Quality bar dos átomos | AI-extraction + sanity check (subagente verificador) | Revisão humana ou só extraction | Balanço velocidade vs qualidade; verificador detecta drift de fonte |
| D19 | Skill detector | Estender `/init` | Criar `/detect-stack` separada | Funcionalidade adjacente; menos surface de skill |

---

## Criterios de Aceite

- [ ] **CA-01:** Dado plugin matrix com `docs/knowledge/nodejs-typescript/{INDEX.md, atoms/*.md}` populado, quando dev clona o plugin, então os 14 átomos + INDEX estão presentes; cada átomo tem frontmatter completo (`topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`), corpo ≤ 200 linhas, e zero placeholders `[A DEFINIR]`.

- [ ] **CA-02:** Dado projeto Node+TS recém-instalado com plugin (com `package.json` listando TS em devDeps), quando dev roda `/init`, então `.claude/stack.json` é criado com `primary: "nodejs-typescript"` e `.claude/knowledge/` recebe cópia de INDEX + 14 átomos em ≤ 100ms.

- [ ] **CA-03:** Dado projeto Rails puro (apenas `Gemfile`, sem `package.json`), quando dev roda `/init`, então `.claude/stack.json` é criado com `primary: "rails"`, `secondary: []`, e `.claude/knowledge/` **não recebe** átomos Node+TS (knowledge de Rails ainda não existe em v6.3.2 — pasta fica vazia ou ausente; init informa explicitamente).

- [ ] **CA-04:** Dado projeto com `.claude/knowledge/` pré-existente, quando dev roda `/init` sem flag `--refresh-knowledge`, então a pasta é preservada intacta e init informa `"Knowledge já existe em .claude/knowledge/. Use --refresh-knowledge para re-copiar."`

- [ ] **CA-05:** Dado projeto com `.claude/knowledge/INDEX.md` populado, quando agente invoca `/security` (ou qualquer das 6 outras cross-stack skills da lista), então a resposta começa com preface citando `.claude/knowledge/INDEX.md` antes do corpo da skill.

- [ ] **CA-06 (edge case):** Dado projeto sem anchor file reconhecível (sem `package.json`, `Gemfile`, `pyproject.toml`, `go.mod`), quando dev roda `/init`, então `.claude/stack.json` é criado com `primary: null`, nenhum knowledge é copiado, init informa `"Stack não detectada"`, e init **não crasha**.

- [ ] **CA-07 (edge case multi-stack):** Dado projeto Rails com frontend Node (ambos `Gemfile` e `package.json` presentes, mas maioria dos arquivos é `.rb`), quando dev roda `/init`, então `stack.json.primary == "rails"` e `stack.json.secondary == ["nodejs-typescript"]`. Knowledge de Rails copiado (vazio em v6.3.2); knowledge de Node+TS **não** copiado.

- [ ] **CA-08 (qualidade):** Para cada átomo escrito pelo subagente extrator, quando subagente verificador rodar sample audit, então pelo menos 80% das claims do átomo são rastreáveis para passagens específicas das fontes listadas no frontmatter `sources:`. Auditoria humana mínima de 3 átomos (1 tier 1, 1 tier 2, 1 tier 3) antes de approval do batch.

- [ ] **CA-09:** Skills cross-stack mantêm comportamento original quando `.claude/knowledge/INDEX.md` não existe — graceful degradation, sem warnings ou erros (CA-02 padrão).

- [ ] **CA-10 (regressão):** `/init` mantém comportamento atual para tudo que não envolve stack detection / knowledge — usuários atuais do `/init` não veem mudança de UX além do output novo sobre stack.

---

## Out of Scope (referência rápida)

Ver "Won't Have" acima. Resumo: outras stacks, drift detection, `_shared/`, update flow, cluster Keccak, skill `/detect-stack` separada.

---

## Dependencias

| Tipo | Dependência | Status |
|---|---|---|
| Skill existente | `/init` (skills/init/SKILL.md) | Disponível, será estendida |
| Padrão existente | `readArchitectureProfile()` em `skills/lib/read-architecture-profile.ts` | Template para `readStackProfile()` análogo |
| Padrão existente | `profile-aware-preface` (visto em `/security` SKILL.md) | Template para `stack-aware-preface` |
| Lib interna | `lib/telemetry-utils.ts` | Disponível |
| Fonte de conteúdo | `claude-code/knowledge/Nodejs/` (15 pesquisas + 6 skill packages) | Disponível; catalog em `docs/knowledge/nodejs-typescript/_catalog.md` |
| Validação | `bun run harness:validate` para estrutura `docs/` | Disponível (per CLAUDE.md) |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Compressão excessiva perde nuance crítica das pesquisas (~27k → ~1.7k linhas) | Média | Médio | Átomo piloto (`type-system-idioms`) antes do batch grande no plano01; revisão de tamanho real e qualidade |
| Subagente verificador (sanity check) entrega false-positive "tudo OK" sem checar de verdade | Média | **Alto** | Prompt explícito de sample audit com 5-7 claims aleatórias por átomo; revisão humana obrigatória de 3 átomos antes de aprovar batch (CA-08) |
| Stack detection erra em projetos atípicos (monorepo Nx com 3 stacks, Bun/Deno projects sem package.json) | Baixa | Médio | Telemetria registra detecções; CA-06 garante fallback gracioso; futura iteração pode adicionar overrides em `stack.json` manual |
| `.claude/knowledge/` preservado fica desatualizado vs matrix sem refresh manual | Alta | Baixo | `--refresh-knowledge` documentado; CHANGELOG do plugin nota mudanças no knowledge |
| Citação no preface vira ruído quando knowledge não é relevante para a query | Média | Médio | Preface é uma frase só; skills body já tem keyword matching; INDEX.md cita por keyword (skill segue pista) |
| Skill name `/init` confundir entre "init project" e "init agent" | Baixa | Baixo | Output claro sobre stack detection e cópia de knowledge; comportamento original preservado (CA-10) |
| Re-scan dos rules "core-contributor-only" descobre mais nuggets do que esperado, inflando átomos | Baixa | Médio | Plano01 fixa cap de 200 linhas/átomo; se nugget excede, vira nota em outro átomo ou postergado |

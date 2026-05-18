# Decisões Arquiteturais — Anti-Vibe-Coding Plugin

Registro auto-gerado pela skill `consultant` (Fase Zero). Decisões irreversíveis ou de alto impacto estratégico ficam aqui.

---

## [2026-05-16] Stack Knowledge Layer — v6.3.2

### D1 — Localização do knowledge: `docs/knowledge/{stack}/atoms/`

**Decisão:** Knowledge da stack mora em `docs/knowledge/{stack}/atoms/*.md` no plugin matrix, espelhado em `.claude/knowledge/` no projeto após init.

**Contexto:** Plugin precisa de camada de conhecimento sênior stack-specific para complementar skills cross-stack. ~27k linhas de pesquisa profunda + skill files de Node+TS prontos para condensar.

**Alternativas consideradas:**
- `skills/knowledge-{stack}/SKILL.md`: descartada — duplica `/learn`, mistura behavior com content
- `knowledge/` na raiz do plugin: descartada — quebra convenção existente do plugin (`docs/design-docs/`, `docs/compound/`)

**Razão:** Casa com convenção `docs/` para knowledge passivo. Separação behavior (skills) vs content (knowledge).

**Consequências:** Skills precisam citar via `.claude/knowledge/INDEX.md` no projeto. Discovery depende de wire-up explícito em CLAUDE.md table.

---

### D2 — Stack como unidade de organização (não linguagem)

**Decisão:** Organização por **stack** (`nodejs-typescript/`), não por linguagem (`nodejs/`, `typescript/`). Layer (`backend`/`frontend`/`both`) vira campo de frontmatter para dimensão secundária.

**Contexto:** Sênior pensa em ecossistema, não em linguagem solta. Node+TS sempre andam juntos no uso real do plugin.

**Alternativas consideradas:**
- Pastas por linguagem: descartada — duplicaria padrões cross-linguagem (async, types, errors) entre `nodejs/` e `typescript/`

**Razão:** Stack reflete realidade de uso. `layer` no frontmatter resolve filtragem backend-only/frontend-only quando necessário.

**Consequências:** Stacks futuras (Rails, Python, Go) seguem o mesmo padrão. Naming verboso (`nodejs-typescript/`) é o tradeoff aceito.

---

### D3 — 14 átomos consolidados (de 17 clusters)

**Decisão:** 14 átomos como granularidade-alvo. ~120-150 linhas por átomo. ~16× compressão sobre fontes brutas (~27k → ~1.730 linhas).

**Contexto:** 17 clusters identificados na análise das fontes. Consolidados para evitar fragmentação (A+B = async+streams, C+P = type system + modern idioms, Q virou parte de performance-and-internals).

**Alternativas consideradas:**
- 10 átomos (mais consolidado): descartada — cada átomo viraria mini-handbook, perde foco
- 18+ átomos (mais granular): descartada — INDEX inscrutável, micro-management overhead

**Razão:** Balanço entre foco (cada átomo cobre um conjunto claro de keywords) e manutenção (não proliferar arquivos sem ganho).

**Consequências:** Pilot atom obrigatório antes do batch grande para validar tamanho real (~120 linhas). Se pilot sair >200 → granularidade errada, split. Se <60 → sobre-decomposto, merge.

---

### D4 — 1 PRD único + 6 planos internos para v6.3.2

**Decisão:** 1 PRD `v6.3.2-stack-knowledge-nodejs-typescript` decomposto em 6 planos internos.

**Contexto:** Pipeline do plugin já segue convenção 1 PRD → múltiplos planos (visto em `anti-vibe-v52/`, `v53-plugin-adaptativo/`).

**Alternativas consideradas:**
- 3 PRDs separados (foundation/content/wire-up): descartada — formato compartilhado vira fonte de drift entre PRDs

**Razão:** Atomic release. PRD foca em goals/critérios; detalhe vive em planos. `/execute-plan` já navega plano-por-plano.

**Consequências:** Stacks futuras (Rails, Python) = PRDs próprios em versões futuras, não enxertos no v6.3.2.

---

### D13 — Stack detection one-shot no init (não runtime)

**Decisão:** Detecção de stack roda **uma vez no `/init`**, persistida em `.claude/stack.json`. Skills cross-stack não detectam stack — leem path fixo `.claude/knowledge/INDEX.md`.

**Contexto:** Originalmente proposto runtime detection com `stack-aware-preface` dinâmico. Usuário reformulou para init-time filter (deployment model α').

**Alternativas consideradas:**
- Runtime detection em cada invocação de skill: descartada — overhead desnecessário; init já tem todos os signals
- Skill `/detect-stack` separada (análoga a `/detect-architecture`): descartada — extensão de `/init` é mais simples para o uso atual

**Razão:** Init é one-shot e tem contexto rico (anchor files: `package.json`, `Gemfile`, etc.). Skills ficam triviais (preface = check de path fixo).

**Consequências:** Re-init necessário se stack do projeto mudar significativamente. Aceitável — stack-switch é raro.

---

### D14 — Deployment via init-time copy (não soft filter, não install-time)

**Decisão:** Plugin matrix tem todos os knowledge stacks. `/init` detecta stack do projeto e copia **apenas** `docs/knowledge/{stack}/` do matrix para `.claude/knowledge/` do projeto.

**Contexto:** Originalmente proposto soft filter (matrix sempre, skill cita dinâmico). Usuário propôs init-time copy, modelo mais limpo.

**Alternativas consideradas:**
- Soft filter (α): matrix tem tudo no plugin instalado, skill cita dinâmico. Descartada — projeto carrega knowledge irrelevante.
- Install-time hard filter (β): exclui pastas durante install. Descartada — lógica de install + risco de "instalar errado e perder knowledge".
- Manual filter (γ): user escolhe stacks no install. Descartada — friction.

**Razão:** Matrix monotônico (cresce sem afetar projetos instalados). Projeto atômico (só o que importa). Init resolve filter uma vez.

**Consequências:** Update do plugin precisa lógica para re-copiar knowledge quando matrix atualiza (ticket futuro, fora do escopo v6.3.2).

---

## Decisões reversíveis registradas como referência

- **D5-D8** (formato frontmatter, tier, conteúdo, estratégia escrita) — vivem em `docs/knowledge/nodejs-typescript/_topic-plan.md`
- **D9** Cluster R (Keccak/Ethereum) **fora de escopo** v6.3.2
- **D10** Drift detection das fontes — postergado, frontmatter `sources:` como audit trail
- **D11** Skills cross-stack ganham preface simples lendo `.claude/knowledge/INDEX.md` (path fixo)
- **D12** `primordials.md` (do nodejs-core/rules/) migra para `security-stack-specific.md`, não é descartado

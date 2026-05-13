---
slug: v60-harness-compound-fusion
date: 2026-05-11
status: draft
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-11 (Luiz/dev): default 30s — alinhado com OQ2 do CONTEXT v6.0.0`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# PRD: Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion

**Status:** Draft
**Author:** Luiz Felipe + AI
**Date:** 2026-05-11
**Context:** ./CONTEXT.md
**Current plugin version:** 5.3.0 → target **6.0.0**

---

<!-- Guia MoSCoW:
  Must Have: Sem isso a feature nao tem valor. Maximo 40% dos requisitos.
  Should Have: Importante mas nao bloqueia a primeira entrega.
  Could Have: Nice-to-have. Apenas se sobrar tempo.
  Won't Have: Explicitamente excluido DESTA versao. Evita scope creep.

  Teste: Se mover de Must para Should, a feature ainda resolve o problema core? Se sim, nao era Must.
-->

## Problema

O plugin anti-vibe-coding v5.x cobre bem o **lado da decisão** (consultant, grill-me, design-twice, plan-feature, write-prd) e o **lado da educação** (learn, lessons-learned). Mas tem três lacunas estruturais que limitam a escala do "agentic coding":

1. **Não há camada de documentação durável institucional.** Lições, decisões e contexto vivem em `lessons-learned.md` (arquivo único) e `.planning/CONTEXT-*.md` (transitórios). Quando o usuário inicia uma nova sessão num projeto antigo, o agente não tem um índice rápido (AGENTS.md) que carregue o contexto certo na janela. Resultado: o agente esquece padrões e o usuário precisa re-explicar.

2. **Não há validação mecânica do que foi capturado.** O plugin confia que a LLM segue convenções, mas não há `harness:validate` ou `compound:check` que rode em CI rejeitando AGENTS.md inchado, planos órfãos ou lições sem frontmatter pesquisável.

3. **Não há transferência de conhecimento sênior por stack.** Quem cria um projeto Rails do zero perde os 10 anos de gotchas que estão na cabeça do usuário (e em skills dispersas como `react-patterns`, `api-design`, etc.). Não há knowledge pack que o `/init` injete automaticamente ao detectar `Gemfile`.

O workshop **Harness + Compound Engineering** do André Prado (AI Builders, fev/2026) resolve (1) e (2) elegantemente: `AGENTS.md` ≤40 linhas como índice condicional, `docs/exec-plans/{active,completed}/`, `docs/compound/*.md` com YAML frontmatter, scripts de validação. A v6.0.0 absorve essa metodologia **integralmente** (D1) e adiciona (3) como contribuição própria via **knowledge packs por linguagem** com YAML frontmatter para navegação por IA (D5, D6, D19).

**Impacto de não resolver:** Cada projeto novo do usuário continua re-aprendendo do zero. Cada sessão queima 30-50% da janela de contexto em re-explicação. O plugin permanece como ferramenta de "decisão pontual" em vez de virar **sistema operacional do repositório**.

---

## Solução

### Outcomes (declarativo — o QUE, não o COMO)

- O usuário roda `/init` em qualquer projeto (novo ou v5.x existente) e em ≤60s tem `AGENTS.md` ≤40 linhas, `CLAUDE.md` espelhado, `docs/` completo com 9 docs institucionais, `docs/exec-plans/{active,completed}/`, `docs/compound/`, `docs/review-checklists/`, `docs/knowledge/{stack}/` injetado conforme stack detectado, `TODO.md` na raiz e (opcionalmente) `.github/workflows/harness.yml`.
- O agente lê `AGENTS.md` como índice e busca outros docs **condicionalmente** (security task → lê SECURITY.md; UI task → lê DESIGN.md+FRONTEND.md). Janela de contexto preserva 70%+ para trabalho real.
- Cada plano de execução vive em `docs/exec-plans/active/` com seções padronizadas (Goal, Scope, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria); ao completar, move para `docs/exec-plans/completed/` e dispara Compound Decision Gate via `/iterate`.
- Cada lição aprendida vira `docs/compound/YYYY-MM-DD-titulo.md` com frontmatter `title/category/tags/created` + seções Problem/Solution/Prevention. Agente busca por tag, lê só o que importa.
- Knowledge pack do stack detectado fica acessível em `docs/knowledge/{rails|nextjs|node-ts}/index.md` com 4 arquivos (senior-knowledge, conventions, common-pitfalls, lessons-template), todos com YAML frontmatter para busca por tags.
- Comandos `bun run harness:validate` e `bun run compound:check` rodam em ≤2s em projeto de tamanho médio e quebram CI se houver violação.
- Skills existentes (`/lessons-learned`, `/decision-registry`, `/iterate`, `/plan-feature`, `/quick-plan`) continuam com mesma interface, mas escrevem nos novos paths (zero breaking change para o usuário final — D10).
- Projeto v5.x ao rodar `/init` recebe oferta de migração idempotente com backup automático (D15).
- O próprio plugin **anti-vibe-coding** adota a estrutura harness (dog-food D20) — `.planning/plano01..04/` migra para `docs/exec-plans/completed/` e `lessons-learned.md` é dividido em compound notes individuais.

### Mecanismo (algorítmico — o COMO)

A v6.0.0 entrega 8 componentes em 7 fases ordenadas:

**Componente A — Templates harness institucionais (skills/init/templates/harness/)**
Cópia adaptada de `V6.0.0/package/skills/harness-engineering/assets/harness-template/`. Todos em inglês (D2). Inclui `AGENTS.md`, `ARCHITECTURE.md`, `README.md` skeleton, `docs/{DESIGN,FRONTEND,PLANS,PRODUCT_SENSE,QUALITY_SCORE,RELIABILITY,SECURITY,COMPOUND_ENGINEERING}.md`, `docs/exec-plans/{active,completed}/README.md`, `docs/exec-plans/tech-debt-tracker.md`, `docs/generated/db-schema.md`, `docs/product-specs/index.md`, `docs/references/README.md`, `docs/design-docs/{index,core-beliefs}.md`, `docs/review-checklists/{security,reliability,frontend-ui,agent-api,production-readiness}.md`, `docs/smoke-flows/README.md`, `docs/compound/README.md`, `.github/workflows/harness.yml`, `.github/pull_request_template.md`, `TODO.md` skeleton.

**Componente B — `/init` v6 (skills/init/)**
Absorve scaffold do harness (D9). Fluxo:
1. Detecta estado: projeto novo / v5.x legado / já v6
2. Detecta stack via heurística (`package.json` next/react/express → nextjs ou node-ts; `Gemfile` rails → rails) e pede confirmação (D7)
3. Se v5.x legado: oferece migração com backup `.planning.v5-backup/` (D15)
4. Copia templates do Componente A, substituindo tokens `{{PROJECT_NAME}}`, `{{TODAY}}`, `{{STACK}}`
5. Cria symlink `CLAUDE.md → AGENTS.md` com fallback tier (OQ1 resolvido — ver §Decisões Técnicas Pendentes)
6. Copia knowledge pack do stack confirmado para `docs/knowledge/{stack}/`
7. Customiza ARCHITECTURE.md, PRODUCT_SENSE.md, QUALITY_SCORE.md com contexto inspecionado (framework version, real folders, real env vars, real package scripts)
8. Pergunta sobre Delivery Loop com Linear (D12) — se aceito, injeta seção em AGENTS.md
9. Roda `bun run harness:validate` e relata resultado

**Componente C — Validadores TS+bun (scripts/harness-validate.ts, scripts/compound-check.ts)**
Reescrita do `.mjs` do André em TypeScript (D13). Mesma lógica:
- `harness-validate`: arquivos obrigatórios existem, AGENTS.md ≤40 linhas, links relativos válidos, planos órfãos
- `compound-check`: docs/compound/*.md tem frontmatter completo, planos ativos sem placeholder, seções obrigatórias (Compound Opportunity, Validation Log, Review Checklist, Lessons Captured) presentes no template de planos
Performance alvo: <2s em projeto com 100 docs.

**Componente D — Hook UserPromptSubmit Pre-Mutation Gate (hooks/pre-mutation-gate.cjs)**
Heurística resolvida (OQ2 — ver §Decisões Técnicas Pendentes). Sugere skill apropriada (`/plan-feature`, `/quick-plan`) quando detecta prompt substancial sem plano ativo. Integra com `hooks/user-prompt-gate.cjs` existente (não duplica).

**Componente E — Skills migradas para docs/ (skills/lessons-learned, skills/decision-registry, skills/iterate, skills/plan-feature, skills/quick-plan, skills/execute-plan)**
Zero mudança de interface (D10). Mudança de destino:
- `/lessons-learned` grava `docs/compound/YYYY-MM-DD-{slug}.md` com frontmatter completo (Problem/Solution/Prevention)
- `/decision-registry` grava `docs/design-docs/ADR-NNNN-{slug}.md`
- `/iterate` lê `docs/exec-plans/active/`, dispara Compound Decision Gate
- `/plan-feature` e `/quick-plan` geram planos com seções harmonizadas (D18)
- `/execute-plan` lê de `docs/exec-plans/active/`, move para `completed/` ao concluir

**Componente F — REMOVIDO de v6.0.0 (movido para v6.1.0+)**
Knowledge packs deferidos para releases minor por stack (v6.1.0=Node.js, v6.2.0=Rails, v6.3.0=Next.js, v6.4.0=PHP). Em v6.0.0, `/init` detecta stack mas **não** copia pack — só registra em `docs/STATE.md` para usar quando packs chegarem.

**Estrutura PRÉ-MODELADA (referência para v6.1+, não implementada em v6.0.0):**
```
knowledge-packs/{stack}/
├── index.md              # frontmatter: tags:[entry-point]; mapa de quando consultar cada arquivo
├── senior-knowledge.md   # frontmatter: tags:[architecture, ...]
├── conventions.md        # frontmatter: tags:[naming, folders, rest, routes]
├── common-pitfalls.md    # frontmatter: tags:[gotchas, perf, security]
└── lessons-template.md   # template em branco para o usuário adicionar lições próprias
```
Decisões D6 e D19 (formato + YAML frontmatter) permanecem válidas como **contrato estrutural** para quando os packs chegarem em v6.1+.

**Componente G — TODO.md + skill /todo-pick (skills/todo-pick/)**
Arquivo TODO.md na raiz do projeto, formato:
```markdown
# TODO

- [ ] {2026-05-12} {file:src/foo.ts:42} typo no comentário
- [ ] {2026-05-12} {feature:billing} extrair magic number para constante
```
Skill `/todo-pick` (separada de `/iterate` — OQ3 resolvido) puxa 1 item por vez, propõe fix, marca como concluído.

**Componente H — Skills do plugin v6 (skill /promote-lesson-to-pack)**
Deferida para v6.1 se complexa (OQ4). MVP em v6.0.0: lições com tag de stack ficam em `docs/compound/`; promoção ao knowledge pack global é processo manual.

---

## Fluxos UX por Ator

<!-- Feature é desenvolvimento de plugin (dev tooling). Único ator é o desenvolvedor usando Claude Code com o plugin instalado. -->

### Desenvolvedor (usuário do plugin)

**Fluxo A — Projeto novo:**
1. Cria pasta `meu-app/`, abre Claude Code
2. Roda `/anti-vibe-coding:init`
3. → Caminho A (stack detectado): "Detectei `package.json` com `next`. É um projeto **Next.js**? [Sim/Não/Outro]"
4. → Caminho B (stack ambíguo): "Não detectei stack. Qual é? [Rails / Next.js / Node.js+TS / Outro]"
5. "Vou criar AGENTS.md, ARCHITECTURE.md, docs/* (9 arquivos), docs/knowledge/nextjs/, TODO.md. Usar GitHub Actions? Symlink ou copy para CLAUDE.md?"
6. (60s depois) "Pronto. Validei com harness:validate. AGENTS.md tem 32 linhas. 14 docs criados. Knowledge pack Next.js exportado em docs/knowledge/nextjs/. Próximo passo: edite ARCHITECTURE.md com a real arquitetura."

**Fluxo B — Projeto v5.x existente:**
1. Roda `/anti-vibe-coding:init` em projeto que já tem `.planning/CONTEXT-*.md` e `lessons-learned.md`
2. "Detectei estrutura v5.x. Quer migrar para v6.0.0? Vou: (a) backup em `.planning.v5-backup/`; (b) converter cada CONTEXT-*.md para docs/exec-plans/active/; (c) dividir lessons-learned.md em compound notes individuais; (d) gerar AGENTS.md a partir do CLAUDE.md existente. Operação idempotente — posso reverter via `git checkout .`. [Sim/Não/Dry-run]"
3. Se Dry-run: mostra plano de migração sem aplicar
4. Se Sim: executa, relata diffs, sugere `git commit -m "chore: migrate to anti-vibe-coding v6.0.0"`

**Fluxo C — Trabalho substancial (Pre-Mutation Gate):**
1. Usuário digita "implementar sistema de notificações push"
2. Hook UserPromptSubmit detecta verbo de implementação + ausência de plano ativo em `docs/exec-plans/active/`
3. Injeta sugestão: "[SKILL_ADVISOR] Trabalho substancial detectado. Recomendo `/grill-me` para esclarecer requisitos, depois `/plan-feature` para criar plano em `docs/exec-plans/active/`. Deseja prosseguir sem plano? (Resposta livre — não bloqueio)"

**Fluxo D — Conclusão de feature (Compound Decision Gate):**
1. Usuário termina implementação, plano está em `docs/exec-plans/active/2026-05-12-push-notifications.md`
2. Usuário roda `/iterate`
3. "Plano ativo: push-notifications. Validação Log já tem `harness:validate ✅`. Vou rodar Compound Decision Gate: esse trabalho ensinou algo durável que outro agente/humano usaria? [Sim e mostrar opções / Não - registrar 'no capture needed' / Pensar mais]"
4. Se Sim: gera `docs/compound/2026-05-12-{slug}.md` com frontmatter pré-preenchido por tags inferidas. Move plano para `completed/`.

**Fluxo E — Micro-débito (TODO.md):**
1. Enquanto trabalha em outra task, agente detecta typo em arquivo X
2. Agente adiciona à `TODO.md` em vez de corrigir agora (fora de escopo)
3. Mais tarde, usuário roda `/todo-pick`
4. "TODO.md tem 3 itens. Qual puxar agora? [1: typo em foo.ts / 2: magic number em billing / 3: aleatório]"

---

## Requisitos Funcionais

### Must Have (12 itens — 41% do total ⚠️ próximo do limite, mas reduzido após remoção de M4)

**M1.** `/init` cria `AGENTS.md` ≤40 linhas em projeto novo, em ≤60s, contendo links para os 7 docs core conforme template do André.
**M2.** `/init` cria estrutura completa: `ARCHITECTURE.md`, `docs/{DESIGN,FRONTEND,PLANS,PRODUCT_SENSE,QUALITY_SCORE,RELIABILITY,SECURITY,COMPOUND_ENGINEERING}.md`, `docs/exec-plans/{active,completed}/README.md`, `docs/exec-plans/tech-debt-tracker.md`, `docs/{compound,review-checklists,smoke-flows,design-docs,product-specs,references,generated,knowledge}/`.
**M3.** `/init` detecta stack via heurística (`package.json`, `Gemfile`, `composer.json`, `pyproject.toml`) e **registra** o stack detectado em `docs/STATE.md` (seção Resources) + customiza `docs/ARCHITECTURE.md` com o framework detectado. **Não exporta knowledge pack em v6.0.0** — feature de pack ship em v6.1.0+ (ver Roadmap).
**M5.** `bun run harness:validate` reporta sucesso em projeto recém-init e falha em projeto com `AGENTS.md >40 linhas` ou plano órfão.
**M6.** `bun run compound:check` reporta sucesso em projeto recém-init e falha em compound note sem frontmatter completo.
**M7.** Skills `/lessons-learned`, `/decision-registry`, `/iterate`, `/plan-feature`, `/quick-plan`, `/execute-plan` escrevem nos novos paths (`docs/compound/`, `docs/design-docs/`, `docs/exec-plans/`) e **NÃO quebram interface pública** (mesmo comando, mesmo retorno em essência).
**M8.** Projeto v5.x ao rodar `/init` recebe oferta de migração idempotente com backup `.planning.v5-backup/` e dry-run option.
**M9.** Hook `pre-mutation-gate.cjs` em UserPromptSubmit sugere skill apropriada para prompts substanciais sem plano ativo, **sem bloquear**.
**M10.** Symlink `CLAUDE.md → AGENTS.md` é criado com fallback tier (ln -s → mklink /H → copy + hook PostToolUse).
**M11.** O plugin anti-vibe-coding em si recebe estrutura harness (dog-food D20): `AGENTS.md`, `ARCHITECTURE.md`, `docs/*` completo. `lessons-learned.md` é dividido em `docs/compound/*.md`. `.planning/plano01..04/` migra para `docs/exec-plans/completed/`.
**M12.** Versão do plugin sobe de **5.3.0 para 6.0.0** (semver major — breaking structural mesmo que skills mantenham interface).
**M13.** `docs/STATE.md` gerado pelo `/init` e atualizado por hook PostToolUse após operações que mudam recursos (lessons/ADRs/plans/TODOs). Contém seções **Resources**, **Recent Activity**, **Pending**. AGENTS.md aponta condicionalmente para STATE.md (D32).

### Should Have (12 itens)

**S1.** `/init` cria `.github/workflows/harness.yml` e `.github/pull_request_template.md` por default (D14).
**S2.** Skill `/todo-pick` separada (não fundida com `/iterate`) puxa 1 item de `TODO.md` por vez (OQ3 resolvido).
**S3.** `/init` pergunta sobre Delivery Loop com Linear (D12) — opt-in, injeta seção condicional em AGENTS.md.
**S4.** Templates de exec-plans (`/plan-feature`, `/quick-plan`) geram seções harmonizadas: Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria.
**S5.** Telemetria existente (`telemetry-utils`) estende para registrar eventos `harness:validate`, `compound:check`, `init.scaffold`, `init.migrate` (latência, sucesso/falha).
**S6.** Documentação CHANGELOG.md descreve migração 5.x → 6.0.0 com exemplos antes/depois.
**S7.** `/detect-architecture` (existente) é atualizada para detectar perfil v6 (presença de `docs/exec-plans/`) e integrar com `/init`.
**S8.** Testes de sandbox: 4 projetos de fixture (`tests/fixtures/{rails-new, nextjs-new, node-ts-new, legacy-v5}`) sobre os quais `bun test` executa `/init` end-to-end e verifica estado final.
**S9.** CRUD completo para lições (D31): `/lessons-learned --update {slug}` reescreve compound note preservando frontmatter `created`; `/lessons-learned --delete {slug}` move arquivo para `docs/compound/_archived/` (soft delete, recuperável via git).
**S10.** CRUD completo para ADRs (D31): `/decision-registry --revoke {id}` **não deleta** — cria novo ADR-NNNN-superseded com link para o original e atualiza frontmatter do ADR antigo (`status: superseded-by: ADR-XXXX`).
**S11.** CRUD completo para TODO (D31): `/todo-pick --skip {n}` marca item como `- [-]` (skipped, mantém histórico); `/todo-pick --remove {n}` deleta linha após confirmação.
**S12.** Completion signal estruturado (D33): cada skill termina sua execução com bloco YAML machine-readable contendo `skill`, `status` (complete/blocked/in_progress), `outputs` (paths), `next_suggested` (skill recomendada), `blocks_for_user` (lista de inputs faltando). Helper utility em `lib/completion-signal.ts` padroniza.

### Could Have (5 itens)

**C1.** Skill `/promote-lesson-to-pack` (OQ4) que move compound note do projeto para knowledge-pack global do plugin.
**C2.** Modo `--dry-run` global para `/init`, `/iterate`, `/lessons-learned` que mostra diffs sem aplicar.
**C3.** Comando `bun run harness:doctor` que diagnostica problemas de configuração (symlink quebrado, hooks ausentes, paths divergentes).
**C4.** Integração com `/qa-visual` como evidência alternativa ao Delivery Loop com vídeo (caminho automático para quem não usa Linear).
**C5.** Migration helper para projetos que misturam `.planning/` e `docs/` (estado parcial inconsistente).

### Won't Have (desta versão)

- **Knowledge packs com conteúdo (Rails, Next.js, Node.js+TS)** — deferido para releases minor por stack: v6.1.0=Node.js, v6.2.0=Rails, v6.3.0=Next.js. Estrutura/contrato (D6, D19) permanecem definidos.
- **PHP+Laravel knowledge pack** — v6.4.0 ou depois.
- **Python, Go, Rust knowledge packs** — v6.5+.
- **LLM-driven knowledge pack update automático** (qualquer lição vira PR automático no plugin) — risco de inflar pack com lições projeto-específicas. Permanece manual via `/promote-lesson-to-pack` se entrar como Could.
- **Integração bidirecional com Linear** (criar/fechar issues automaticamente). Apenas convenção em AGENTS.md sobre Delivery Loop (D12).
- **Bloqueio (hook bloqueante) por ausência de plano ativo** — D4 escolheu sugestão, não bloqueio.
- **Migração das skills com mudança de interface** (`/lessons-learned` → `/capture-lesson` etc.) — D10 obriga preservar comandos.
- **Reescrita do `/init` em outra linguagem que não TS** — D13 fixa TS+bun.
- **Suporte oficial a Codex/Cursor/OpenCode no v6.0.0** — o AGENTS.md genérico funciona, mas testes só serão feitos contra Claude Code.
- **Atomic primitives layer abaixo das skills** (proposição P1/D30 do artigo agent-native) — refatoração de 32 skills para serem prompts sobre primitivos (`compound:create`, `plan:move-completed` etc.) é trabalho de v6.1+. Roadmap registrado abaixo.
- **Dynamic capability discovery para knowledge packs** (P5/D34) — em v6.0.0 packs ficam estáticos em `docs/knowledge/{stack}/`. Refatoração para `knowledge:list-stacks` + `knowledge:read` fica para v6.1+.
- **`docs/AGENT_LOG.md` append-only por sessão** (P6/D35) — visibilidade total de raciocínio do agente é v6.1+. Telemetria existente cobre o básico.
- **Repensar skill-advisor como capability surface vs router** (P7/D36) — manter hook educativo atual; refatoração de router-pattern fica para v6.1+ se sentir necessidade.

---

## Requisitos Não-Funcionais

- **Performance:**
  - `bun run harness:validate` < 2s em projeto com até 100 docs Markdown.
  - `bun run compound:check` < 2s na mesma escala.
  - `/init` em projeto novo < 60s (incluindo customização).
  - `/init` em migração v5.x < 120s (incluindo backup e conversão).
- **Tamanho de contexto:**
  - `AGENTS.md` ≤40 linhas (validado mecanicamente).
  - `CLAUDE.md` ≤40 linhas (espelho do AGENTS.md).
  - Cada arquivo em `docs/knowledge/{stack}/` ≤500 linhas.
- **Segurança:**
  - Backup `.planning.v5-backup/` em migração é **obrigatório** e idempotente.
  - Symlink fallback nunca sobrescreve `CLAUDE.md` existente sem confirmação.
  - Telemetria não envia dados externos — grava apenas localmente (mantém política atual do plugin).
- **Acessibilidade:** N/A (plugin dev tooling sem UI gráfica).
- **Observabilidade:**
  - Telemetria estende eventos existentes (S5). Logs em `~/.claude/projects/.../memory/` para falhas de `/init`.
  - Mensagens de erro nominais (ex: "AGENTS.md tem 42 linhas — limite é 40. Considere mover regras condicionais para `docs/PLANS.md`").
- **Compatibilidade OS:**
  - Windows 11 (Pro/Home), macOS, Linux. Symlink fallback obrigatório no Windows (OQ1).
  - Path separators sempre `path.join` — nunca string hardcoded `/`.
- **Idioma de runtime:**
  - Skills do plugin em português (mantém v5.x).
  - Templates copiados ao projeto-alvo em **inglês** (D2).
- **Backward compatibility:**
  - Skills com mesmos nomes e mesma interface (D10). Argumentos passam a aceitar paths novos transparentemente.
  - Comando `/init` v6 detecta v5.x antes de qualquer mutação.

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Adoção do harness do André | Total (todos os 9 docs) | Seletiva / só conceitos / modular | D1 — "pegar tudo o que André tem" |
| 2 | Idioma dos templates exportados | Inglês | Português / configurável / híbrido | D2 — economia de 25-30% tokens comprovada |
| 3 | Estrutura de planejamento | `docs/exec-plans/` (migrar de `.planning/`) | Coexistência paralela | D3 — uma fonte de verdade |
| 4 | Pre-Mutation Gate | Hook sugestivo (UserPromptSubmit) | Bloqueante / só convenção | D4 — UX > enforcement rígido |
| 5 | Knowledge packs iniciais | Rails + Next.js+React + Node.js+TS | Incluir PHP+Laravel já | D5 — foco no MVP, PHP fica para v6.1 |
| 6 | Formato KP | Pasta multi-arquivo `knowledge-packs/{stack}/` | Arquivo único / skill separada | D6 — modular, expansível |
| 7 | Stack detection | Heurística + confirmação | Pergunta direta / só heurística | D7 — equilibra velocidade e precisão |
| 8 | TODO.md | Raiz do projeto, complementar | Junto com tech-debt-tracker | D8 — separação de propósito |
| 9 | `/init` vs scaffold | `/init` absorve harness | Duas skills | D9 — single entry point |
| 10 | Migração de skills | Migrar destino, manter interface | Deprecar / coexistir | D10 — zero breaking change |
| 11 | Review-checklists vs auditors | Complementares | Auditors geram dinamicamente | D11 — checklists estáticos + auditores dinâmicos |
| 12 | Delivery Loop com Linear | Opção via flag | Default QA visual / remover | D12 (consciente fora do Recommended) |
| 13 | Validadores | TS + bun | Manter JS (.mjs do André) | D13 — alinhar com CLAUDE.md global |
| 14 | GitHub Actions | Sempre instalar | Opcional via flag | D14 (consciente fora do Recommended) |
| 15 | Migração v5→v6 | Via `/init` que detecta | Skill dedicada `/migrate-to-v6` | D15 (consciente fora do Recommended) |
| 16 | AGENTS.md vs CLAUDE.md | Symlink (fonte = AGENTS.md) | Sync script / cópia / só CLAUDE | D16 — uma fonte de verdade |
| 17 | Compound Decision Gate | Convenção AGENTS.md + `/iterate` | Hook automático / só ao mover | D17 — alinha com cultura do plugin |
| 18 | Template de exec-plans | Adotar do André, adaptar skills | Manter atual + plus / dois templates | D18 — padronização |
| 19 | Profundidade dos KPs | Cheatsheet com YAML frontmatter | Doc profunda / só links | D19 — navegação por IA |
| 20 | Dog-fooding | Total | Só estrutura nova / sem dog-food | D20 — demonstração viva |
| 21 | **Versionamento** (este PRD) | **5.3.0 → 6.0.0 direto, sem pre-releases** | Pre-releases (6.0.0-alpha.1, .2, .rc.1) | Plugin é uso pessoal — sem usuários externos para alpha. Risco controlado por feature flag em `package.json` (ver §Estratégia de Rollout) |
| 22 | **Rollback strategy** (este PRD) | **Backup + git** | Comando `/init --rollback` | Backup `.planning.v5-backup/` + commit de migração separado permite `git revert HEAD`. Comando dedicado é over-engineering para uso pessoal |
| 23 | **Telemetria escopo** (este PRD) | **Estender eventos existentes** | Sistema novo | `telemetry-utils` já existe; adicionar 4 eventos novos é trivial |
| 24 | **Testes do plugin** (este PRD) | **Fixtures sandbox + bun test** | Snapshot testing / mock fs | Fixtures sob `tests/fixtures/{rails-new,nextjs-new,node-ts-new,legacy-v5}` são reais e mais confiáveis que mocks |
| 25 | **Fallback symlink Windows** (este PRD) | 3-tier: `ln -s` → `mklink /H` → copy+hook | Sempre cópia / sempre symlink | NTFS hard link não exige admin; degrada graciosamente sem fricção |
| 26 | **Heurística do hook Pre-Mutation** (este PRD) | Verbos + paths + negative-list explanatória | Só verbos / só paths | Negative list evita falso-positivo em "explique como implementar X" |
| 27 | **/todo-pick vs /iterate** (este PRD) | Skill **separada** `/todo-pick` | Sub-comando `/iterate --todo` | Mental models diferentes (reflexão vs puxar fila); compartilham helpers em `lib/todo-utils.ts` |
| 28 | **Knowledge pack update flow** (este PRD) | Manual via `/promote-lesson-to-pack` (Could Have) | Automação imediata | Risco de inflar pack com lições projeto-específicas; promoção manual permite curadoria |
| 29 | **Onde vivem as instruções do plugin** (este PRD) | **Arquitetura de 5 camadas** (ver §Distribuição de Conteúdo abaixo) | Tudo em AGENTS.md inflado / tudo em hooks / tudo em plugin CLAUDE.md monolítico | AGENTS.md ≤40 linhas (D2) não acomoda 346 linhas de regras atuais; distribuição estratificada preserva janela de contexto + carrega regra certa no momento certo |
| 30 | **CRUD completo nas entidades** (cherry-pick agent-native) | **Adicionar update/delete/revoke a Lessons/ADR/TODO** | Manter só create/read | Artigo agent-native: gap de CRUD impede agente de corrigir/revogar lições antigas — perda de parity |
| 31 | **docs/STATE.md dinâmico** (cherry-pick agent-native) | **Hook PostToolUse mantém STATE.md atualizado** | Sem state file / atualizar manualmente | Pattern `context.md` do artigo — Available Resources + Recent Activity + Pending impede context starvation com AGENTS.md ≤40 |
| 32 | **Completion signal estruturado** (cherry-pick agent-native) | **Bloco YAML machine-readable no fim de cada skill** | Heurística textual (status atual) | Artigo: detecção heurística é frágil. Bloco `status/outputs/next_suggested/blocks_for_user` permite orquestrador encadear sem ambiguidade |

---

## Distribuição de Conteúdo do CLAUDE.md atual (Camadas de Contexto — D29)

**Problema resolvido:** o `anti-vibe-coding/CLAUDE.md` atual tem 346 linhas misturando filosofia, padrões de código, workflow, skills, agents, model profiles e lições. Em v6, com AGENTS.md ≤40 linhas, esse conteúdo precisa ser distribuído em camadas que carregam conforme necessidade.

### Arquitetura de 5 Camadas

```
┌──────────────────────────────────────────────────────────────────────┐
│ CAMADA 1 — HOOKS (just-in-time, janela: 0 quando não disparam)       │
│   skill-advisor, tdd-gate, file-size-guard, pre-mutation-gate, etc.   │
│   Veículo: hooks/*.cjs                                                │
│   Quando ativa: PreToolUse / UserPromptSubmit / SessionStart          │
├──────────────────────────────────────────────────────────────────────┤
│ CAMADA 2 — PLUGIN DOCS (descoberta na 1ª interação com plugin)        │
│   Filosofia anti-vibe, pipeline, skill table, agent table, versioning │
│   Veículo: anti-vibe-coding/AGENTS.md (dog-food D20) + plugin docs    │
│   Quando carrega: agente busca "como funciona o plugin"               │
├──────────────────────────────────────────────────────────────────────┤
│ CAMADA 3 — SKILL.md SOB DEMANDA (janela: só skill invocada)          │
│   Regras detalhadas de cada skill                                     │
│   Veículo: skills/{nome}/SKILL.md                                     │
│   Quando carrega: invocação direta de `/anti-vibe-coding:{nome}`     │
├──────────────────────────────────────────────────────────────────────┤
│ CAMADA 4 — PROJECT AGENTS.md (sempre carrega, ≤40 linhas)            │
│   Contexto do projeto + pointer para plugin                           │
│   Veículo: AGENTS.md no projeto-alvo                                  │
│   Quando carrega: toda sessão                                         │
├──────────────────────────────────────────────────────────────────────┤
│ CAMADA 5 — DOCS CONDICIONAIS (lidos por tag/contexto)                │
│   Lições, princípios sênior, ADRs                                     │
│   Veículo: docs/compound/, docs/design-docs/, docs/exec-plans/        │
│   Quando carrega: agente busca por tag relevante à task atual         │
└──────────────────────────────────────────────────────────────────────┘
```

### Tabela de Distribuição — auditoria do `anti-vibe-coding/CLAUDE.md` atual (346 linhas)

| # | Seção atual (CLAUDE.md) | Linhas aprox | Camada-alvo v6 | Veículo concreto |
|---|--|--|--|--|
| 1 | Filosofia Anti-Vibe (XP, Navegador/Piloto, regras invioláveis) | 25 | **C2** | `anti-vibe-coding/AGENTS.md` seção "Core Beliefs" |
| 2 | Anti-Sycophancy | 5 | **C2** + **C1** | `anti-vibe-coding/AGENTS.md` + hook curto via `user-prompt-gate.cjs` lembra quando detectar bajulação |
| 3 | Instruções Gerais (bun, TS) | 5 | **C4** + global `~/.claude/CLAUDE.md` | Project AGENTS.md tem 1 linha; user-level CLAUDE.md mantém preferência |
| 4 | Padrões Core (naming, TS, código, hash-list) | 30 | **C5** | `docs/design-docs/core-beliefs.md` (lido sob demanda em refactor/code-review tasks) |
| 5 | Workflow Desenvolvimento (TDD Red/Green) | 12 | **C3** | `skills/tdd-workflow/SKILL.md` (já existe; conteúdo migra para lá) |
| 6 | Modo Consultor (quando ativar Fase Zero) | 12 | **C3** + **C1** | `skills/consultant/SKILL.md` + hook detecta "como deveria"/"melhor forma" e sugere `/consultant` |
| 7 | Modelo de Permissões (rm -rf, DROP, migrations destrutivas) | 7 | **C1** | Hook `pre-tool-use` bloqueante para Bash com padrões destrutivos |
| 8 | Auto-Correção e Aprendizado (registrar lição) | 5 | **C2** + **C1** | `anti-vibe-coding/AGENTS.md` + hook sugere `/lessons-learned` após correção do dev |
| 9 | Anti-Patterns (Fat Controllers, etc.) | 7 | **C5** | `docs/design-docs/core-beliefs.md` |
| 10 | Conhecimento Sênior (pointer para senior-principles.md) | 5 | **C5** | `docs/design-docs/core-beliefs.md` absorve `senior-principles.md` |
| 11 | Versionamento e Atualizações (manifest, merge/replace) | 30 | **C2** | `anti-vibe-coding/docs/UPGRADE.md` (plugin doc, lido quando rodar `/update` ou `/init`) |
| 12 | Pipeline (grill-me → write-prd → ...) | 50 | **C2** | `anti-vibe-coding/docs/PIPELINE.md` — visão geral; atualizado para refletir `docs/exec-plans/` em v6 |
| 13 | Estrutura `.planning/` v2 (tree) | 30 | **DEPRECATED** + **C2** | Substituída pela estrutura `docs/exec-plans/` documentada em `anti-vibe-coding/AGENTS.md` |
| 14 | IA-TDD níveis (Guiado/Assistido/Direto) | 6 | **C3** | `skills/tdd-workflow/SKILL.md` |
| 15 | Skills Disponíveis (tabela) | 30 | **C1** + **C2** | Skill-advisor hook já apresenta isso UserPromptSubmit; tabela completa em `anti-vibe-coding/AGENTS.md` |
| 16 | Agents Disponíveis (tabela) | 15 | **C2** | `anti-vibe-coding/docs/AGENTS_LIST.md` (lido quando agente precisa decidir qual subagent invocar) |
| 17 | Model Profiles (quality/balanced/budget) | 25 | **C2** | `anti-vibe-coding/docs/MODEL_PROFILES.md` |
| 18 | Git Workflow (conventional commits) | 3 | **C4** + global | Linha em project AGENTS.md ou user-level CLAUDE.md |
| 19 | Lições Aprendidas (4 lições inline) | 17 | **C5** | Cada lição vira `anti-vibe-coding/docs/compound/{date}-{slug}.md` com frontmatter (Plugin Development, Bash, Subagentes, Armadilha) |
| 20 | Decisões Arquiteturais (pointer) | 3 | **C5** | `anti-vibe-coding/docs/design-docs/ADR-*.md` |

**Total estimado pós-distribuição:**
- **Camada 1 (hooks):** ~15 linhas críticas adicionadas, janela ocupada = 0 quando inativas
- **Camada 2 (plugin AGENTS.md + plugin docs/):** ~150 linhas em AGENTS.md (≤40 visível, restante condicional) + ~100 linhas distribuídas em PIPELINE.md, MODEL_PROFILES.md, AGENTS_LIST.md, UPGRADE.md
- **Camada 3 (SKILL.md):** já existe; conteúdo de workflow migra para lá
- **Camada 4 (project AGENTS.md):** ~10 linhas (3 do plugin pointer, 7 de project context)
- **Camada 5 (docs/compound/, docs/design-docs/):** ~80 linhas distribuídas em ~10 arquivos individuais

**Resultado:** janela ocupada em sessão típica cai de **346 linhas SEMPRE carregadas** para **~50 linhas SEMPRE carregadas** (project AGENTS.md + 1 hook injection média), com restante sob demanda.

### Mapping → Fases de Implementação

Esta nova decisão adiciona trabalho a **3 fases**:

- **Fase 1 (Bootstrap dog-food):** ao migrar `anti-vibe-coding/CLAUDE.md` atual, aplicar esta distribuição. Cada item da tabela acima vira commit separado.
- **Fase 2 (`/init` v6):** templates de `AGENTS.md` (projeto-alvo) precisam acomodar Camada 4 (pointer ao plugin) — adicionar bloco padrão "Plugin Integration" no template.
- **Fase 5 (Hooks):** novos hooks da Camada 1 (model permissões destrutivas, anti-sycophancy soft, auto-correção lição) entram aqui.

### Critérios de Aceite adicionais (Fase 1 estendida)

- [ ] **CA-38:** Dado `anti-vibe-coding/CLAUDE.md` v5.x (346 linhas), quando aplicar distribuição D29, então existem: `anti-vibe-coding/AGENTS.md` ≤40 linhas, `anti-vibe-coding/docs/PIPELINE.md`, `MODEL_PROFILES.md`, `AGENTS_LIST.md`, `UPGRADE.md`, `docs/design-docs/core-beliefs.md`, e as 4 lições inline migraram para `docs/compound/`.
- [ ] **CA-39:** Dado projeto-alvo após `/init`, quando inspecionar `AGENTS.md`, então ≤40 linhas e contém bloco "Plugin Integration" apontando para plugin docs (Camada 4).
- [ ] **CA-40:** Dado hook `pre-tool-use` com padrões destrutivos, quando agente tenta executar `rm -rf`/`DROP TABLE`/`migration destructive`, então hook bloqueia e pede confirmação explícita.

---

## Critérios de Aceite

Organizados pelas 7 fases sugeridas no CONTEXT.md (mais a fase de versionamento).

### Fase 1 — Bootstrap dog-food (D20, M11)
- [ ] **CA-01:** Dado o repo `anti-vibe-coding/` na branch master, quando criar branch `feat/v6-dogfood` e rodar scaffold manual dos templates harness, então `AGENTS.md`, `ARCHITECTURE.md`, `docs/{DESIGN,FRONTEND,PLANS,PRODUCT_SENSE,QUALITY_SCORE,RELIABILITY,SECURITY,COMPOUND_ENGINEERING}.md` existem.
- [ ] **CA-02:** Dado os planos históricos `.planning/plano01..04/` e `.planning/2026-04-21-anti-vibe-v52/` e `.planning/2026-05-04-v53-plugin-adaptativo/`, quando migrar para `docs/exec-plans/completed/`, então cada plano fica em `docs/exec-plans/completed/{date}-{slug}.md` com seções harmonizadas (Goal, Scope, Validation Log, Lessons Captured, Exit Criteria). Conteúdo histórico preservado.
- [ ] **CA-03:** Dado `lessons-learned.md` único com N lições, quando dividir em compound notes, então cada lição vira `docs/compound/{date}-{slug}.md` com frontmatter `title/category/tags/created` + seções Problem/Solution/Prevention. N arquivos criados.
- [ ] **CA-04 (validação):** Dado o repo dog-foodado, quando rodar `bun run harness:validate`, então retorna exit 0 e nenhum erro.
- [ ] **CA-05 (validação compound):** Dado o repo dog-foodado, quando rodar `bun run compound:check`, então retorna exit 0 e cada compound note tem frontmatter completo.

### Fase 2 — `/init` v6 (M1, M2, M3, M8, M10, S1, S3, M12)
- [ ] **CA-06:** Dado um diretório vazio (sem `.git`, sem `package.json`), quando rodar `/init`, então: AGENTS.md criado com ≤40 linhas, CLAUDE.md espelha AGENTS.md (symlink ou cópia), 14+ arquivos docs criados, exit 0 em ≤60s.
- [ ] **CA-07:** Dado projeto com `package.json` contendo `"next": "*"`, quando rodar `/init`, então skill detecta "Next.js" e registra em `docs/STATE.md` + ARCHITECTURE.md. (Não copia knowledge pack — feature em v6.1+).
- [ ] **CA-08:** Dado projeto com `Gemfile` contendo `gem "rails"`, quando rodar `/init`, então skill detecta "Rails" e registra em STATE.md. (Não copia knowledge pack — feature em v6.1+).
- [ ] **CA-09:** Dado projeto v5.x com `.planning/` e `lessons-learned.md`, quando rodar `/init` e usuário aceitar migração, então: `.planning.v5-backup/` criado idempotentemente, `docs/exec-plans/active/` populado, `docs/compound/*.md` gerado, exit 0 em ≤120s.
- [ ] **CA-10:** Dado mesmo projeto v5.x, quando rodar `/init --dry-run`, então skill mostra plano de migração sem mutação em disco.
- [ ] **CA-11 (Windows):** Dado Windows 11 sem developer mode, quando `/init` falhar em `ln -s`, então tenta `mklink /H` e depois `copy + hook`. Em todos os casos, `CLAUDE.md` reflete `AGENTS.md`.
- [ ] **CA-12:** Dado `/init` executado, quando rodar `cat .github/workflows/harness.yml`, então arquivo existe e referencia `bun run harness:validate` (S1).
- [ ] **CA-13:** Dado `/init` perguntando sobre Delivery Loop, quando usuário responder "Sim, Linear", então AGENTS.md gerado tem seção "Delivery Loop" com instrução de gravar vídeo + anexar em Linear.

### Fase 3 — Migração de skills (M7, S4)
- [ ] **CA-14:** Dado plugin v6 e projeto v6, quando rodar `/lessons-learned "X aconteceu"`, então cria `docs/compound/{date}-{slug}.md` com frontmatter completo (Problem/Solution/Prevention) em vez de appendar em `lessons-learned.md` único.
- [ ] **CA-15:** Dado plugin v6, quando rodar `/decision-registry "decidi usar Y"`, então cria `docs/design-docs/ADR-NNNN-{slug}.md`.
- [ ] **CA-16:** Dado plugin v6 e plano em `docs/exec-plans/active/foo.md` completo, quando rodar `/iterate`, então dispara Compound Decision Gate, move plano para `docs/exec-plans/completed/` se aceito.
- [ ] **CA-17 (zero breaking change):** Dado script que invocava `/lessons-learned` em v5.x via mesma sintaxe, quando invocar em v6, então funciona — apenas o destino mudou (D10).
- [ ] **CA-18:** Dado `/plan-feature`, quando gerar plano, então arquivo tem todas as 10 seções: Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria (S4).

### Fase 4 — REMOVIDA (Knowledge packs movidos para v6.1+)

> Conteúdo dos knowledge packs (Rails, Next.js, Node.js+TS) foi **deferido para releases minor (v6.1.0+)**. v6.0.0 entrega só a **fundação estrutural** (detecção de stack, registro em STATE.md, customização de ARCHITECTURE.md). CAs específicos de KP movidos para PRDs futuros.

**Critério de aceite reduzido para v6.0.0:**
- [ ] **CA-19:** Dado projeto com `package.json` contendo `"next": "*"`, quando rodar `/init`, então `docs/STATE.md` tem `Resources.detected_stack: nextjs` e `docs/ARCHITECTURE.md` menciona "Next.js framework detected". Nenhuma pasta `docs/knowledge/` é criada.
- [ ] **CA-20:** Dado projeto Rails (`Gemfile` com `rails`), idem CA-19 substituindo por `detected_stack: rails`.
- [ ] **CA-21:** Dado projeto sem stack reconhecido, quando rodar `/init`, então `detected_stack: unknown` em STATE.md, sem erro, sem confirmação obrigatória de stack.

### Fase 5 — Hook Pre-Mutation + Compound Gate (M9, D17)
- [ ] **CA-23:** Dado projeto v6 sem plano em `docs/exec-plans/active/`, quando usuário enviar prompt "implementar X complexo", então hook injeta sugestão de skill mas **não bloqueia** envio.
- [ ] **CA-24:** Dado projeto v6 com plano ativo, quando usuário enviar prompt substancial, então hook **não injeta sugestão** (não molesta).
- [ ] **CA-25:** Dado plano ativo completo, quando rodar `/iterate`, então Compound Decision Gate é executado e usuário pode escolher: capturar lição / registrar "no capture needed" com razão / postergar.

### Fase 6 — Validadores TS+bun (M5, M6, D13)
- [ ] **CA-26:** Dado projeto v6 recém-init em laptop médio, quando rodar `bun run harness:validate`, então exit 0 em <2s.
- [ ] **CA-27:** Dado projeto com AGENTS.md de 50 linhas, quando rodar `bun run harness:validate`, então exit 1 com erro `"AGENTS.md should stay short; keep it at 40 lines or fewer"`.
- [ ] **CA-28:** Dado projeto com plano em `active/` aparentemente completo (Exit Criteria marcado + Validation Log com passed), quando rodar `bun run harness:validate`, então exit 1 com erro identificando o plano.
- [ ] **CA-29:** Dado compound note sem `## Solution`, quando rodar `bun run compound:check`, então exit 1 com erro identificando o arquivo.
- [ ] **CA-30:** Validadores funcionam em Windows, macOS, Linux com mesma lógica (testar via fixtures).

### Fase 7 — TODO.md + /todo-pick (S2, D8, OQ3)
- [ ] **CA-31:** Dado projeto v6 com `TODO.md` na raiz contendo 3 itens, quando rodar `/todo-pick`, então skill lista os 3 e oferece escolha.
- [ ] **CA-32:** Dado item escolhido, quando skill terminar a correção, então marca item como `- [x]` em `TODO.md`.
- [ ] **CA-33:** Dado durante outra task (ex: `/execute-plan`), quando agente detectar issue fora de escopo, então adiciona à `TODO.md` com formato `- [ ] {date} {file:path:line} descrição`.

### Versionamento e Release
- [ ] **CA-34:** Dado `package.json` do plugin, quando inspecionar, então `"version": "6.0.0"`.
- [ ] **CA-35:** Dado `CHANGELOG.md`, quando ler, então tem seção `## [6.0.0] - 2026-XX-XX` listando todas as mudanças e migration guide.
- [ ] **CA-36 (edge case rollback):** Dado projeto migrado para v6 e usuário insatisfeito, quando rodar `git revert {migration-commit}`, então projeto retorna ao estado v5.x intacto (validar com fixture `legacy-v5`).
- [ ] **CA-37 (testes do plugin):** Dado `tests/fixtures/{rails-new,nextjs-new,node-ts-new,legacy-v5}/`, quando rodar `bun test`, então cada fixture é submetida ao `/init` e validada conforme CA-06 a CA-13.

### Fase 8 — Agent-Native Cherry-Picks (S9-S12, M13, D30-D33)

- [ ] **CA-41 (CRUD lessons):** Dado `docs/compound/2026-05-12-foo.md` existente, quando rodar `/lessons-learned --update foo` com novo conteúdo, então arquivo é reescrito, `created` preservado, `updated` adicionado ao frontmatter.
- [ ] **CA-42 (CRUD lessons delete):** Dado lesson existente, quando rodar `/lessons-learned --delete foo`, então arquivo move para `docs/compound/_archived/foo.md` (soft delete) e é recuperável via `git checkout HEAD~1`.
- [ ] **CA-43 (CRUD ADR revoke):** Dado `docs/design-docs/ADR-0001-x.md` ativo, quando rodar `/decision-registry --revoke 1`, então cria `ADR-NNNN-x-superseded.md` linkando o original e atualiza frontmatter de ADR-0001 com `status: superseded-by: ADR-NNNN`. ADR-0001 **não é deletado**.
- [ ] **CA-44 (CRUD TODO):** Dado `TODO.md` com 5 itens, quando rodar `/todo-pick --skip 3`, então item 3 vira `- [-] ...` (skipped). Quando rodar `/todo-pick --remove 3` e confirmar, então linha é deletada.
- [ ] **CA-45 (STATE.md gerado):** Dado projeto recém-init, quando inspecionar, então `docs/STATE.md` existe com seções `## Resources`, `## Recent Activity`, `## Pending` populadas com estado real (contagem de compound notes, planos ativos, itens TODO).
- [ ] **CA-46 (STATE.md atualiza):** Dado `/lessons-learned add "X"` executado, quando inspecionar `docs/STATE.md` após hook PostToolUse, então `Resources` reflete +1 lesson em <500ms (validar via timestamp). Hook rate-limited: atualiza no máximo 1x a cada 30s para evitar overhead.
- [ ] **CA-47 (Completion signal):** Dado qualquer skill executada (ex: `/grill-me`), quando inspecionar output final, então contém bloco YAML como `\`\`\`yaml\nskill: grill-me\nstatus: complete\noutputs:\n  - ./.planning/.../CONTEXT.md\nnext_suggested: /write-prd\nblocks_for_user: []\n\`\`\``. Helper `lib/completion-signal.ts` padroniza.

**Total CA: 46 critérios.** Distribuição: 5 (Fase 1) + 8 (Fase 2) + 5 (Fase 3) + 3 (Fase 4 reduzida — só stack detection) + 3 (Fase 5) + 5 (Fase 6) + 3 (Fase 7) + 4 (Versionamento) + 3 (CA-38..40 Camadas) + 7 (Fase 8 Agent-Native).

---

## Estrutura de Pastas Final

### Plugin `anti-vibe-coding/` (após v6.0.0)

```
anti-vibe-coding/
├── AGENTS.md                         # NOVO — dog-food D20 (≤40 linhas, em EN)
├── CLAUDE.md                         # symlink → AGENTS.md
├── ARCHITECTURE.md                   # NOVO — layers do plugin (skills/hooks/scripts/lib)
├── README.md                         # mantém
├── CHANGELOG.md                      # ATUALIZADO — seção 6.0.0
├── COMO-ATUALIZAR.md                 # mantém
├── package.json                      # version: 6.0.0; scripts harness:validate, compound:check
├── plugin-manifest.json              # ATUALIZADO — refletir nova skill /todo-pick
├── settings.json                     # mantém
├── tsconfig.json                     # mantém
├── bun.lock                          # mantém
├── .github/                          # NOVO — dog-food
│   ├── workflows/harness.yml         # roda bun run harness:validate em PRs
│   └── pull_request_template.md
├── agents/                           # mantém (subagent auditors)
├── config/                           # mantém
├── docs/                             # NOVO — dog-food (D3, D20)
│   ├── DESIGN.md
│   ├── FRONTEND.md                   # N/A — não tem UI; arquivo placeholder
│   ├── PLANS.md
│   ├── PRODUCT_SENSE.md
│   ├── QUALITY_SCORE.md
│   ├── RELIABILITY.md
│   ├── SECURITY.md
│   ├── COMPOUND_ENGINEERING.md
│   ├── design-docs/
│   │   ├── core-beliefs.md           # ex-senior-principles.md migrado
│   │   ├── index.md
│   │   └── ADR-*.md                  # ex-decisions.md dividido
│   ├── exec-plans/
│   │   ├── active/README.md
│   │   ├── completed/                # NOVO — para onde plano01..04 migram
│   │   │   ├── 2026-XX-plano01-detect-architecture.md
│   │   │   ├── 2026-XX-plano02-migracao-atomica.md
│   │   │   ├── 2026-XX-plano03-telemetria.md
│   │   │   ├── 2026-XX-plano04-perfil-arquitetural.md
│   │   │   ├── 2026-04-21-anti-vibe-v52.md
│   │   │   └── 2026-05-04-v53-plugin-adaptativo.md
│   │   └── tech-debt-tracker.md
│   ├── compound/                     # NOVO — ex-lessons-learned.md dividido
│   │   ├── README.md
│   │   └── YYYY-MM-DD-{titulo}.md    # N arquivos
│   ├── review-checklists/
│   │   ├── README.md
│   │   ├── security.md
│   │   ├── reliability.md
│   │   ├── agent-api.md
│   │   ├── frontend-ui.md            # N/A
│   │   └── production-readiness.md
│   ├── smoke-flows/README.md
│   ├── product-specs/index.md
│   ├── references/README.md
│   └── generated/db-schema.md        # N/A — sem DB
├── hooks/                            # ATUALIZADO
│   ├── hooks.json
│   ├── context-monitor.cjs           # mantém
│   ├── file-size-guard.cjs           # mantém
│   ├── grepping-names.cjs            # mantém
│   ├── prompt-guard.cjs              # mantém
│   ├── tdd-gate.cjs                  # mantém
│   ├── user-prompt-gate.cjs          # mantém (skill advisor existente)
│   ├── version-check.cjs             # mantém
│   └── pre-mutation-gate.cjs         # NOVO (D4, M9, OQ2)
├── knowledge-packs/                  # NÃO CRIADO em v6.0.0 (vem em v6.1.0+)
│                                     # Estrutura pré-modelada — quando v6.1.0 ship Node.js,
│                                     # diretório é criado com knowledge-packs/node-ts/
├── rules/                            # mantém
├── scripts/                          # ATUALIZADO
│   ├── lib/                          # mantém
│   ├── __tests__/                    # mantém + novos para v6
│   ├── analyze-metrics.ts            # mantém
│   ├── generate-manifest.js          # mantém
│   ├── sync-projects.sh              # mantém
│   ├── sync-to-global.sh             # mantém
│   ├── harness-validate.ts           # NOVO (D13, M5)
│   └── compound-check.ts             # NOVO (D13, M6)
├── skills/                           # ATUALIZADO
│   ├── (32 skills existentes — interface preservada)
│   ├── init/                         # ATUALIZADO — absorve harness (D9)
│   │   ├── SKILL.md
│   │   └── templates/harness/        # NOVO — todos os templates do André
│   ├── lessons-learned/              # ATUALIZADO — escreve em docs/compound/
│   ├── decision-registry/            # ATUALIZADO — escreve em docs/design-docs/
│   ├── iterate/                      # ATUALIZADO — lê docs/exec-plans/active/
│   ├── plan-feature/                 # ATUALIZADO — template harmonizado
│   ├── quick-plan/                   # ATUALIZADO — template harmonizado reduzido
│   ├── execute-plan/                 # ATUALIZADO — move plano para completed/
│   └── todo-pick/                    # NOVO (S2, OQ3)
├── templates/                        # mantém (templates antigos não-conflitantes)
├── TODO.md                           # NOVO — dog-food do próprio TODO.md
└── .planning.v5-backup/              # NOVO — backup do dog-food (será git-ignored)
```

### Projeto target (após `/init`)

```
{projeto}/
├── AGENTS.md                        # ≤40 linhas (EN, índice condicional)
├── CLAUDE.md                        # symlink → AGENTS.md (ou cópia em Windows)
├── ARCHITECTURE.md                  # customizado com framework real
├── README.md                        # ATUALIZADO ou criado
├── TODO.md                          # micro-débito
├── package.json                     # ATUALIZADO — scripts harness:validate, compound:check
├── .github/                         # se aceito (S1)
│   ├── workflows/harness.yml
│   └── pull_request_template.md
├── docs/
│   ├── DESIGN.md
│   ├── FRONTEND.md
│   ├── PLANS.md
│   ├── PRODUCT_SENSE.md
│   ├── QUALITY_SCORE.md
│   ├── RELIABILITY.md
│   ├── SECURITY.md
│   ├── COMPOUND_ENGINEERING.md
│   ├── design-docs/{index, core-beliefs}.md
│   ├── exec-plans/
│   │   ├── active/README.md
│   │   ├── completed/README.md
│   │   └── tech-debt-tracker.md
│   ├── compound/README.md           # populado durante uso
│   ├── review-checklists/{security, reliability, agent-api, frontend-ui, production-readiness}.md
│   ├── smoke-flows/README.md
│   ├── product-specs/index.md
│   ├── references/README.md
│   ├── generated/db-schema.md       # se aplicável
│   └── knowledge/                   # diretório NÃO criado em v6.0.0 — só quando pack ship
│                                    # (v6.1.0 cria docs/knowledge/node-ts/ se stack=node)
├── scripts/                         # se package.json existir
│   ├── harness-validate.ts
│   └── compound-check.ts
└── .planning.v5-backup/             # SE migração de v5.x (git-ignored)
```

---

## Out of Scope (desta versão)

- Suporte oficial a Codex/Cursor/OpenCode (templates são agnósticos mas testes restritos a Claude Code).
- Integração bidirecional Linear (criar/fechar issues automaticamente).
- LLM-driven knowledge pack updates automáticos.
- Knowledge packs PHP+Laravel, Python, Go, Rust (deferido para v6.x.y).
- Comando `/migrate-to-v6` separado (incorporado em `/init` — D15).
- Hook bloqueante para Pre-Mutation Gate (D4 escolheu sugestivo).
- Migração de skills com mudança de interface (D10 obriga preservar).

---

## Dependências

| Tipo | Dependência | Status |
|------|------------|--------|
| Lib/pacote | `typescript@^5.4.0` | já no projeto |
| Lib/pacote | `@types/bun@latest` | já no projeto |
| Runtime | `bun >= 1.0` | requerido (CLAUDE.md global) |
| Feature pré-requisito | `/detect-architecture` (S7) | pronta, será estendida |
| Feature pré-requisito | `telemetry-utils` (S5) | pronta, será estendida |
| Source externa | Templates do André em `V6.0.0/package/skills/` | local, disponível |
| Documentação externa | Workshop transcription `V6.0.0/gravacao-workshop-transcricao.txt` | local, disponível |
| OS feature | symlink (POSIX) | disponível em macOS/Linux; fallback em Windows (OQ1) |
| OS feature | `mklink /H` (Windows hard link) | nativo Windows, sem admin |
| Serviço externo | Linear (D12, S3) | opcional, apenas convenção em AGENTS.md |
| Serviço externo | GitHub Actions (D14, S1) | requerido se projeto usar GitHub |

---

## Riscos com Mitigação Concreta

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| R1 | Symlink falha em Windows (CA-11) | **Alta** | Médio | 3-tier fallback: `ln -s` → `mklink /H` (não exige admin em NTFS) → `copy + hook PostToolUse(Edit AGENTS.md) que re-copia para CLAUDE.md`. Testar nas 3 plataformas via fixture. |
| R2 | Migração v5→v6 corrompe projetos | **Alta** | **Alto** | (a) Backup obrigatório em `.planning.v5-backup/` antes de qualquer mutação. (b) Migração idempotente (rodar 2x = mesmo resultado). (c) `--dry-run` mostra diff antes. (d) Sugerir `git status` limpo antes de aceitar. (e) CA-09 e CA-36 cobrem cenário. |
| R3 | AGENTS.md cresce >40 linhas (M1, CA-27) | **Média** | Médio | (a) Validador `harness:validate` rejeita. (b) Mensagem de erro instrui mover regras para `docs/PLANS.md` ou `docs/COMPOUND_ENGINEERING.md`. (c) Template inicial tem 28-32 linhas, deixando margem. |
| R4 | Dog-fooding (M11) bloqueia desenvolvimento se quebrar plugin | **Média** | Alto | Aplicar dog-food **por último** na ordem das fases (Fase 1 vira Fase 8 cronologicamente). Validadores e `/init` testados antes via fixtures. Branch separada `feat/v6-dogfood` que só merge após validação. |
| R5 | 32 skills + nova estrutura = explosão de complexidade | **Alta** | Médio | 7 fases incrementais. Cada fase tem CAs próprios e pode ser revertida via git. Não tentar mexer em todas as 32 skills — só as 6 listadas em M7 + `/init` + nova `/todo-pick`. |
| R6 | Hook UserPromptSubmit (M9) gera fricção e usuário desativa | Média | Baixo | Hook é **sugestivo**, não bloqueante. Mensagem curta (≤2 linhas). Pode ser desativado via `settings.json`. Logging em telemetria de quantos prompts disparam sugestão (ajustar heurística). |
| R7 | Knowledge packs viram outdated rápido | Média | Médio | (a) Lições novas vão para `docs/compound/` no projeto, não direto no pack. (b) Fluxo manual `/promote-lesson-to-pack` (C1) consolida quando madurece. (c) Cada arquivo de pack tem `applies-to: rails@8` no frontmatter para versionar. |
| R8 | Compound notes proliferam sem curadoria | Baixa | Baixo | `compound:check` valida frontmatter; auditor `/anti-vibe-review` flagra duplicatas. Categorização por tag facilita filtragem. |
| R9 | Telemetria nova não captura falhas de `/init` migration | Média | Médio | S5 explicita 4 eventos novos. Adicionar evento `init.migrate.error` com `error_code` + `phase` (backup/convert/validate). |
| R10 | Testes do plugin (S8, CA-37) demoram a rodar | Baixa | Baixo | Cada fixture `/init` < 60s. 4 fixtures = ~4 min. Aceitável em CI (não em pre-commit). |
| R11 | Linear feature D12 fica órfã se usuário nunca usa Linear | Baixa | Baixo | É opt-in no `/init` (S3). Pula seção se rejeitado. Documentado como "para quem usa Linear". |
| R12 | Plugin maintainer (você) saturado por 7 fases sequenciais | Média | Médio | Fases independentes podem rodar em paralelo após Fase 2 (`/init` pronto). Componentes A (templates), C (validadores), F (KPs) são paralelizáveis. |
| R13 | Validador TS+bun rejeita em environments sem bun instalado | Baixa | Médio | Bun é requirement global (CLAUDE.md). `/init` verifica `which bun` e instrui instalação se ausente. Fallback gracioso para `node scripts/harness-validate.js` se compilarmos o TS para JS no release. |
| R14 | Delete acidental de lesson/ADR (D31, S9, S10) | Média | Alto | Soft delete (move para `_archived/`) em vez de hard delete. ADR usa pattern superseded (nunca deleta). `/lessons-learned --delete` exige confirmação explícita. Git é seguro adicional. |
| R15 | Hook PostToolUse de STATE.md degrada performance (D32, M13) | Média | Médio | Rate-limit 1x/30s. Hook é assíncrono (fire-and-forget). Se hook falhar, sessão continua. CA-46 valida latência <500ms. Skip se nenhuma operação relevante (filtragem por path). |
| R16 | Completion signal YAML quebra parsing se skill esquecer de emitir (D33, S12) | Média | Médio | Helper `lib/completion-signal.ts` é obrigatório no template de skill — review checklist garante. Orquestrador tem fallback gracioso: se não houver bloco YAML, usa heurística antiga (status atual). Migração gradual das 32 skills. |

---

## Estratégia de Rollout

1. **Fase 0 (semana 0):** Aprovação deste PRD. Criar branch `feat/v6.0.0` no plugin.
2. **Fases 2 e 6 paralelas (semanas 1-2):** Componente B (`/init` com detecção de stack + STATE.md) e Componente C (validadores TS+bun). Fase 4 (knowledge packs) **removida** de v6.0.0 — só stack detection.
3. **Fase 3 (semana 3):** Migração das 6 skills (componente E). Depende de Fase 2 (templates de plano harmonizados).
4. **Fase 5 (semana 3):** Hook pre-mutation + Compound Gate (D). Depende de Fase 2.
5. **Fase 7 (semana 4):** TODO.md + `/todo-pick`. Independente.
6. **Fase 8 (semana 4):** Agent-native cherry-picks (D31 CRUD, D32 STATE.md, D33 completion signal). Pode rodar em paralelo com Fase 7. Helpers (`lib/completion-signal.ts`, hook STATE.md) entram primeiro; skills são adaptadas em segundo passo.
7. **Fase 1 — Dog-food (semana 4-5 — POR ÚLTIMO):** Aplicar harness no próprio plugin. Risco R4 mitigado por validação prévia.
8. **Versionamento (semana 5):** Bump 5.3.0 → 6.0.0, CHANGELOG, sync para diretórios de skills globais.

---

## Roadmap v6.1+ (Knowledge Packs + Agent-Native Full)

Convenção semver: **minor por stack para conteúdo** + minor para evoluções estruturais. Releases planejados em ordem:

### Drops de Conteúdo (Knowledge Packs)

Cada release minor traz UM stack completo. PRD próprio por release para detalhar os ~15 temas pesquisados de cada stack.

| Release | Stack | Status do conteúdo | PRD dedicado |
|---------|-------|--------------------|--------------|
| **v6.1.0** | Node.js+TS | Usuário tem **15 pesquisas profundas** prontas. Primeiro pack porque é base do plugin (TS+bun) e do anti-vibe-coding. | `.planning/YYYY-MM-DD-v61-node-knowledge-pack/PRD.md` (a criar) |
| **v6.2.0** | Rails | Pesquisas em preparação. Usuário tem várias skills/conhecimentos pessoais. | `.planning/YYYY-MM-DD-v62-rails-knowledge-pack/PRD.md` (a criar) |
| **v6.3.0** | Next.js + React | Stack dominante em projetos Carreirarte/Licitar. Aproveita skill react-patterns existente. | `.planning/YYYY-MM-DD-v63-nextjs-knowledge-pack/PRD.md` (a criar) |
| **v6.4.0** | PHP + Laravel | Mencionado em `<ideia2>` original. | A planejar |

Cada PRD de release de conteúdo segue o **contrato estrutural** definido em v6.0.0 (D6, D19): pasta `knowledge-packs/{stack}/` com 5 arquivos + YAML frontmatter. Implementação é só preencher conteúdo + ajustar `/init` para detectar e copiar.

### Evoluções Estruturais (Agent-Native Full)

Decisões deliberadamente deferidas após análise do artigo [agent-native architecture](https://every.to/guides/agent-native):

| ID | Tema | Por que deferido | Trigger para entrar |
|----|------|------------------|---------------------|
| **D30** (P1) | Atomic primitives layer (`scripts/primitives/{compound-create,plan-move,adr-revoke,...}.ts`) abaixo das skills. Skills viram prompts compostos. | Refatoração de 32 skills é trabalho de ~2 semanas dedicadas. Risco alto de quebrar interface. Skills atuais funcionam — não é regressão. | Quando precisar adicionar 3+ skills novas em sequência (composabilidade vira gargalo). |
| **D34** (P5) | Dynamic capability discovery para knowledge packs: `knowledge:list-stacks` + `knowledge:read {stack} {topic}` em vez de cópia estática para `docs/knowledge/{stack}/`. | Em v6.1-v6.3 estático funciona (poucos packs). Discovery vale a pena quando passar de 5-7 packs. | Adição do 4º knowledge pack (v6.4.0 PHP — gatilho concreto). |
| **D35** (P6) | `docs/AGENT_LOG.md` append-only por sessão (visibilidade total de raciocínio do agente). | Telemetria existente + STATE.md (D32) cobrem 80% do valor. AGENT_LOG.md é alto valor mas alto custo de implementação correta. | Quando debugar comportamento agent virar pain point. |
| **D36** (P7) | Repensar skill-advisor hook como **capability surface** (`skill:list` + `skill:describe`) em vez de **router LLM**. Hook fica só com safety reminders críticos. | Hook educativo atual entrega UX que o usuário valoriza. Router pattern do artigo é anti-pattern para apps consumer, mas para dev tooling com humano-on-the-loop o trade-off muda. | Quando ROI educativo do hook cair (usuário ignora sugestões consistentemente). |

**Critério de promoção do roadmap para v6.x:** Cada item entra quando trigger concreto for atingido. Não promover por "completude teórica" — só quando dor real aparecer.

### Pulando v6.0.x (Patches)

`v6.0.1`, `v6.0.2`, etc. ficam reservados para **bugfixes** do framework v6.0.0 antes de v6.1.0 ship. Não acumulam conteúdo nem features.

---

## Decisões Técnicas Pendentes — Resoluções Propostas

Esta seção resolve as **4 Open Questions** do CONTEXT.md e as **4 questões adicionais** pedidas no prompt do PRD.

### OQ1 — Fallback de symlink em Windows (Decisão 25)

**Resolução proposta:** 3-tier fallback determinístico:

```ts
async function linkClaudeMd(target: string, source: string = "AGENTS.md") {
  // Tier 1: POSIX symlink (macOS/Linux funciona; Windows requer admin/dev mode)
  try { await fs.symlink(source, target, "file"); return "symlink"; }
  catch { /* fall through */ }

  // Tier 2: Windows hard link (não exige admin em NTFS; falha em FAT32)
  if (process.platform === "win32") {
    try {
      await execFileAsync("cmd", ["/c", "mklink", "/H", target, source]);
      return "hardlink";
    } catch { /* fall through */ }
  }

  // Tier 3: cópia + hook PostToolUse que re-sincroniza
  await fs.copyFile(source, target);
  await registerSyncHook(source, target);  // adiciona ao hooks.json local
  return "copy+hook";
}
```

Logging do tier escolhido vai para telemetria (`init.scaffold.link_method`). Documentar em README do projeto-alvo qual tier foi usado.

### OQ2 — Heurística do hook UserPromptSubmit (Decisão 26)

**Resolução proposta:** Combinação de palavras-chave + path detection + negative-list:

```js
// pre-mutation-gate.cjs (PSEUDO-CÓDIGO)
const SUBSTANTIAL_VERBS_PT = /\b(implementar|criar|refatorar|adicionar|modificar|construir)\b/i;
const SUBSTANTIAL_VERBS_EN = /\b(implement|build|create|refactor|add|modify)\b/i;
const SENSITIVE_PATHS = /\b(src|app|lib|components|api|services|models|migrations)\//;
const EXPLANATORY = /\b(explique|como funciona|o que é|pergunta|explain|how does|what is)\b/i;

function shouldSuggest(prompt, repoState) {
  if (EXPLANATORY.test(prompt)) return false;  // não molesta perguntas
  const substantial = SUBSTANTIAL_VERBS_PT.test(prompt)
                   || SUBSTANTIAL_VERBS_EN.test(prompt)
                   || SENSITIVE_PATHS.test(prompt);
  if (!substantial) return false;
  if (repoState.hasActivePlan) return false;  // já tem plano — não sugere
  return true;
}
```

Reusa infraestrutura de `hooks/user-prompt-gate.cjs` existente — adiciona novos triggers em vez de criar hook duplicado.

### OQ3 — `/todo-pick` separada vs `/iterate --todo` (Decisão 27)

**Resolução proposta:** Skill **separada** (`/todo-pick`).

**Razão técnica:**
- `/iterate` tem mental model "reflexão sobre trabalho concluído" (Compound Decision Gate).
- `/todo-pick` tem mental model "puxar micro-task da fila".
- Fundir confunde o usuário (mesmo comando, dois fluxos).
- Compartilham helpers em `skills/lib/todo-utils.ts` (parse de TODO.md, marcar item como done).
- Skills custam ~50 linhas de `SKILL.md` cada — barato manter separado.

### OQ4 — Fluxo de update de knowledge pack (Decisão 28)

**Resolução proposta:** 2-tier, com promoção manual no v6.0.0 e automação opcional em v6.1+:

1. **No projeto-alvo:** lições novas vão para `docs/compound/` com tag do stack (`tags: [rails, ...]`). Permanecem no projeto.
2. **Promoção global (manual, v6.0.0):** Comando `/promote-lesson-to-pack` (Could Have C1) — humano roda explicitamente, escolhe compound note, skill propõe diff em `knowledge-packs/{stack}/common-pitfalls.md` para revisão.
3. **Automação (v6.1+):** Hook PostToolUse que detecta tag stack-related em novo compound note e sugere promoção. Deferido.

### Decisão 21 — Versionamento

**Resolução:** Subir direto de `5.3.0` para `6.0.0`. Sem pre-releases. Plugin é uso pessoal — não há base de usuários externos para alpha/beta. Risco controlado por feature flag `v6_enabled` em `settings.json` para projetos que queiram testar antes de comprometer.

### Decisão 22 — Rollback strategy

**Resolução:** Sem comando dedicado. 3 mecanismos:
1. **Backup**: `/init` em migração cria `.planning.v5-backup/` (M8).
2. **Git**: migração é commit isolado; usuário roda `git revert {sha}`.
3. **Manual**: backup + git permite restauração completa em ≤30s.

### Decisão 23 — Telemetria

**Resolução:** Estender `telemetry-utils` existente com 4 eventos:
- `init.scaffold` (campos: stack, duration_ms, link_method, files_created)
- `init.migrate` (campos: duration_ms, files_converted, success)
- `harness:validate` (campos: duration_ms, errors_count, exit_code)
- `compound:check` (campos: duration_ms, errors_count, exit_code)

### Decisão 24 — Testes do plugin

**Resolução:** Sandbox fixtures + bun test:

```
tests/
└── fixtures/
    ├── rails-new/         # Gemfile + Rails app vazio
    ├── nextjs-new/        # package.json com next
    ├── node-ts-new/       # package.json com express
    └── legacy-v5/         # .planning/ + lessons-learned.md (simulando v5.x)

tests/init-rails.test.ts:
  - fixture rails-new é copiada para temp dir
  - skill /init é invocada programaticamente (ou via sub-process)
  - verifica AGENTS.md, docs/*, knowledge/rails/, etc.
  - cleanup temp dir
```

Tempo total estimado: ~4 min para 4 fixtures. Roda em CI (GitHub Actions do plugin).

---

## Backward Compatibility e Deprecation

### Zero breaking change (D10)

Os comandos de skills permanecem com **interface idêntica**. Mudanças são internas (destino dos arquivos gerados):

| Skill | v5.x grava em | v6.0 grava em | Interface mudou? |
|-------|---------------|----------------|------------------|
| `/lessons-learned` | `lessons-learned.md` (único) | `docs/compound/{date}-{slug}.md` (individual) | ❌ Não |
| `/decision-registry` | `decisions.md` | `docs/design-docs/ADR-NNNN-{slug}.md` | ❌ Não |
| `/iterate` | `.planning/` | `docs/exec-plans/` | ❌ Não |
| `/plan-feature` | `.planning/{date}-{slug}/plano-NN.md` | `docs/exec-plans/active/{date}-{slug}.md` | ❌ Não (extra seções no template) |
| `/quick-plan` | `.planning/{date}-{slug}/quick.md` | `docs/exec-plans/active/{date}-{slug}-quick.md` | ❌ Não |
| `/execute-plan` | `.planning/` | `docs/exec-plans/` | ❌ Não |
| `/write-prd` | `.planning/{date}-{slug}/PRD.md` | `docs/product-specs/{date}-{slug}.md` ⚠️ | ⚠️ Path mudou (script de migração ajusta) |
| `/init` | CLAUDE.md básico | scaffold harness completo + KP | ⚠️ Comportamento muito maior |
| Demais 24 skills | sem alteração | sem alteração | ❌ Não |

### Breaking changes (intencionais)

- **Arquivo `lessons-learned.md` único é DEPRECATED.** `/init` em projeto v5.x oferece migração. Manualmente: usuário pode dividir, ou o arquivo permanece como legado read-only.
- **Arquivo `decisions.md` único é DEPRECATED.** Mesma estratégia.
- **`.planning/` é DEPRECATED como diretório ativo.** Continua suportado em read-only para retro-compatibility; novo trabalho vai para `docs/exec-plans/`.
- **`/init` v5 (CLAUDE.md básico)** deixa de existir. Não há flag `--minimal` no v6.0.0.

### Migration path

```bash
# Usuário em projeto v5.x:
$ claude
> /anti-vibe-coding:init
[v6.0.0 detected v5.x structure: .planning/, lessons-learned.md, decisions.md]
[Run migration? y/n/dry-run]
> y
[Backed up to .planning.v5-backup/]
[Created docs/exec-plans/, docs/compound/, docs/design-docs/]
[Migrated 3 CONTEXT files → docs/exec-plans/active/]
[Migrated 12 lessons → docs/compound/*.md]
[Migrated 5 decisions → docs/design-docs/ADR-*.md]
[Created AGENTS.md (28 lines), symlinked CLAUDE.md]
[Ran harness:validate ✓]
[Suggest: git add . && git commit -m "chore: migrate to anti-vibe-coding v6.0.0"]
```

### Deprecation warnings

CHANGELOG.md (S6) descreve cada DEPRECATED com:
- O que foi DEPRECATED.
- O que substitui.
- Quando será REMOVED (proposta: v7.0.0, sem timeline definida).
- Como migrar (link para skill `/init` ou seção do README).

---

## Próximo Passo

PRD complexo (24 decisões técnicas, 37 critérios de aceite, 13 riscos, 7 fases). Recomendo:

1. **Aprovação deste PRD** — você revisar e marcar Approved.
2. **`/anti-vibe-coding:plan-feature`** — quebrar em planos hierárquicos. Cada fase vira um plano com sub-tasks.
3. Opcional: **`/anti-vibe-coding:design-twice`** especificamente para R1 (symlink fallback Windows) e OQ2 (heurística do hook) se quiser explorar alternativas antes de cravar.

---

## Decisões Assumidas neste PRD (a confirmar)

Estas decisões foram tomadas durante a geração do PRD além das 20 do CONTEXT.md. Marcar com ⚠️ para revisão:

- ⚠️ **D21** — versionamento direto 5.3.0 → 6.0.0 sem pre-releases (justificativa: uso pessoal).
- ⚠️ **D22** — rollback via backup+git, sem comando dedicado (justificativa: simplicidade).
- ⚠️ **D23** — telemetria estende eventos existentes (4 novos eventos).
- ⚠️ **D24** — testes via fixtures sandbox + bun test (4 fixtures: rails-new, nextjs-new, node-ts-new, legacy-v5).
- ⚠️ **D25** — fallback symlink 3-tier (ln -s → mklink /H → copy+hook).
- ⚠️ **D26** — heurística do hook combina verbos + paths sensíveis + negative list explanatória.
- ⚠️ **D27** — `/todo-pick` é skill separada de `/iterate` (não fundida).
- ⚠️ **D28** — knowledge pack update é manual via `/promote-lesson-to-pack` (Could Have) em v6.0.0; automação fica para v6.1+.
- ⚠️ **D29** — distribuição de conteúdo do CLAUDE.md atual em arquitetura de 5 camadas (hooks / plugin docs / SKILL.md / project AGENTS.md / docs condicionais). Resolve o gap de "onde vivem as instruções do plugin" quando AGENTS.md é ≤40 linhas.
- ⚠️ **D31** (cherry-pick agent-native) — CRUD completo para Lessons (update/delete via soft-archive), ADRs (revoke via superseded pattern), TODO (skip/remove). Adiciona S9, S10, S11 + CA-41 a CA-44.
- ⚠️ **D32** (cherry-pick agent-native) — `docs/STATE.md` dinâmico atualizado por hook PostToolUse com Resources/Recent Activity/Pending. Adiciona M13 + CA-45, CA-46.
- ⚠️ **D33** (cherry-pick agent-native) — Completion signal estruturado (bloco YAML machine-readable) ao fim de cada skill. Helper `lib/completion-signal.ts`. Adiciona S12 + CA-47.
- ⚠️ **D37** (scope deferral) — Conteúdo de knowledge packs (15 temas de Node, Rails, Next.js) **NÃO** ship em v6.0.0. v6.0.0 entrega só **estrutura/contrato** (D6 formato pasta, D19 YAML frontmatter) + detecção de stack em `/init` registrando em STATE.md. v6.1.0 ship Node.js. v6.2.0 ship Rails. v6.3.0 ship Next.js. Cada release minor terá PRD próprio. Convenção: minor por stack. Remove M4 (knowledge packs Must Have) e Componente F. Critérios CA-19, CA-20, CA-21 reescritos para validar só stack detection. CA-22 removido.

**Total geral:** 33 decisões técnicas v6.0 (D1-D33) + **D37** (scope) + 46 critérios de aceite (CA-01 a CA-47, CA-22 removido) + 16 riscos (R1-R16). 4 decisões estruturais (D30, D34, D35, D36) registradas no roadmap v6.1+ com triggers concretos. 4 releases de conteúdo planejados (v6.1 Node, v6.2 Rails, v6.3 Next.js, v6.4 PHP).

Se aprovar, posso atualizar CONTEXT.md adicionando D21-D33 + D37 ao índice para rastreabilidade futura.

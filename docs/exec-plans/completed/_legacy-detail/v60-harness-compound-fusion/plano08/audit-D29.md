# Auditoria D29 — CLAUDE.md plugin (346 linhas → 5 camadas)

Gerado em fase-01 de Plano 08. Mapeamento baseado em leitura real do arquivo.

**Legenda de camadas:**
- C1: Permissões e segurança (DEFER v6.1)
- C2: Docs de referência permanente (AGENTS.md, PIPELINE.md, MODEL_PROFILES.md, AGENTS_LIST.md, UPGRADE.md)
- C3: Skills de workflow (skills/tdd-workflow, skills/consultant)
- C4: Instruções operacionais (global CLAUDE.md do usuário + bun/TS defaults)
- C5: Core beliefs e padrões técnicos (docs/design-docs/core-beliefs.md, docs/compound/)

| # | Range | Seção atual | Linhas | Camada | Destino | Status |
|---|-------|-------------|--------|--------|---------|--------|
| 1 | L1-L5 | Header + fonte de verdade | 5 | C2 | Mantém em CLAUDE.md (introdução) | confirmed |
| 2 | L7-L19 | Filosofia Anti-Vibe — XP, Navegador/Piloto, regras invioláveis | 13 | C2 | AGENTS.md (Core Beliefs section) | confirmed |
| 3 | L20-L25 | Anti-Sycophancy | 6 | C2 | AGENTS.md (Anti-Sycophancy section) | confirmed |
| 4 | L28-L33 | Instruções Gerais (bun, testes, TS) | 6 | C4 | global CLAUDE.md do usuário (já presente) — manter aqui como override local | confirmed |
| 5 | L36-L65 | Padrões Core — princípios, naming, código, TypeScript | 30 | C5 | docs/design-docs/core-beliefs.md | confirmed |
| 6 | L67-L79 | Workflow de Desenvolvimento (TDD steps 1-7) | 13 | C3 | skills/tdd-workflow/SKILL.md | confirmed |
| 7 | L83-L93 | Modo Consultor (Fase Zero) | 11 | C3 | skills/consultant/SKILL.md | confirmed |
| 8 | L96-L103 | Modelo de Permissões (comandos destrutivos) | 8 | C1 | DEFER v6.1 (permissions model) | confirmed |
| 9 | L106-L111 | Auto-Correção e Aprendizado | 6 | C2 | AGENTS.md (self-correction section) | confirmed |
| 10 | L114-L122 | Anti-Patterns (NUNCA faça) | 9 | C5 | docs/design-docs/core-beliefs.md | confirmed |
| 11 | L125-L131 | Conhecimento Sênior (referência a senior-principles.md) | 7 | C5 | docs/design-docs/core-beliefs.md (migrado de senior-principles.md) | confirmed |
| 12 | L134-L167 | Versionamento e Atualizações (estratégias, comandos, backup) | 34 | C2 | docs/UPGRADE.md | confirmed |
| 13 | L170-L228 | Plugin Pipeline v5.2 + Estrutura .planning hierárquica | 59 | C2 | docs/PIPELINE.md | confirmed |
| 14 | L229-L237 | IA-TDD (3 níveis adaptativos, AI Judge) | 9 | C3 | skills/tdd-workflow/SKILL.md (seção IA-TDD) | confirmed |
| 15 | L238-L269 | Skills Disponíveis (tabela 22 skills) | 32 | C2 | docs/AGENTS_LIST.md | confirmed |
| 16 | L270-L287 | Agents Disponíveis (tabela 13 agents) | 18 | C2 | docs/AGENTS_LIST.md (seção separada) | confirmed |
| 17 | L289-L315 | Model Profiles (perfis, config, funcionamento) | 27 | C2 | docs/MODEL_PROFILES.md | confirmed |
| 18 | L319-L323 | Git Workflow (conventional commits) | 5 | C4 | global CLAUDE.md + manter aqui como lembrete | confirmed |
| 19 | L326-L343 | Lições Aprendidas (4 lições específicas do plugin) | 18 | C5 | docs/compound/ (fase-03) — cada lição vira entrada no compound | confirmed |
| 20 | L344-L347 | Decisões Arquiteturais (referência a decisions.md) | 4 | C5 | docs/design-docs/ADR-*.md (fase-06, com link) | confirmed |

## Resumo por Camada

| Camada | Items | Linhas totais | Destino principal |
|--------|-------|---------------|-------------------|
| C1 | 1 | 8 | DEFER v6.1 |
| C2 | 8 | ~200 | AGENTS.md, PIPELINE.md, MODEL_PROFILES.md, AGENTS_LIST.md, UPGRADE.md |
| C3 | 3 | 33 | skills/tdd-workflow, skills/consultant |
| C4 | 2 | 11 | global CLAUDE.md + manter local |
| C5 | 5 | 68 | docs/design-docs/core-beliefs.md, docs/compound/, docs/design-docs/ADR-*.md |

**Total confirmado:** 20 items | **Status:** todos `confirmed`

## Notas de Fase-01

- CLAUDE.md permanece intacto (346 linhas) durante toda a fase-01
- Stubs criados nesta fase: PIPELINE.md, MODEL_PROFILES.md, AGENTS_LIST.md, UPGRADE.md, design-docs/core-beliefs.md
- Conteúdo real migrado nas fases subsequentes (03, 04, 06)
- AGENTS.md criado na fase-02

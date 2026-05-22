# Populate Guidance — Index

Prosa interpretativa per-doc para o `skills/init` populate-harness pipeline.
Cada arquivo eh referenciado via campo `guidanceFile` em `populate-instructions-table.ts`.
NAO lida em runtime pelo renderer — LLM le sob demanda quando executa a fase correspondente.

Para adicionar guidance de um novo doc, copie `_template.md`, preencha cada secao,
e registre o path em `guidanceFile` na entrada correspondente de `populate-instructions-table.ts`.

---

## Docs Baseline (12 — Andre Prado origin)

- [agents-md.md](./agents-md.md) — `AGENTS.md`: contrato operacional de agentes, delegation triggers, audit log fields, subagent patterns
- [architecture-md.md](./architecture-md.md) — `ARCHITECTURE.md`: mapa do sistema, componentes, data flow, invariantes, links para ADRs
- [readme-md.md](./readme-md.md) — `README.md`: entrada do projeto, pre-requisitos, quick start, links para docs chave
- [docs-quality_score-md.md](./docs-quality_score-md.md) — `docs/QUALITY_SCORE.md`: rubrico de avaliacao ponderada de PRs, pesos por dimensao, threshold de merge
- [docs-plans-md.md](./docs-plans-md.md) — `docs/PLANS.md`: indice de planos ativos e concluidos, workflow de criacao de novo plano
- [docs-design-md.md](./docs-design-md.md) — `docs/DESIGN.md`: sistema de design visual, tokens, guidelines de componentes, links para ferramentas
- [docs-frontend-md.md](./docs-frontend-md.md) — `docs/FRONTEND.md`: convencoes tecnicas do frontend, routing, componentes, estilo, acessibilidade
- [docs-product_sense-md.md](./docs-product_sense-md.md) — `docs/PRODUCT_SENSE.md`: framework de julgamento de produto, quando questionar requisitos, metricas de valor
- [docs-reliability-md.md](./docs-reliability-md.md) — `docs/RELIABILITY.md`: postura de confiabilidade, error handling, observabilidade, SLOs, incident response
- [docs-security-md.md](./docs-security-md.md) — `docs/SECURITY.md`: superficie de seguranca, auth flow, secret management, validacao de input, dependencias, CSP
- [docs-design-docs-core-beliefs-md.md](./docs-design-docs-core-beliefs-md.md) — `docs/design-docs/core-beliefs.md`: principios de engenharia senior, quality defaults, security defaults, push back triggers
- [docs-generated-db-schema-md.md](./docs-generated-db-schema-md.md) — `docs/generated/db-schema.md`: snapshot do schema do banco, tabelas, relacionamentos, indices, historico de migrations

## Docs Extras AVC (4)

- [docs-merge_gates-md.md](./docs-merge_gates-md.md) — `docs/MERGE_GATES.md`: gates binarios de merge, lint/typecheck/coverage/security gates, enforcement no CI
- [docs-code_style-md.md](./docs-code_style-md.md) — `docs/CODE_STYLE.md`: convencoes de nomenclatura, regras de formatacao, patterns preferidos, anti-patterns com rationale
- [docs-state-md.md](./docs-state-md.md) — `docs/STATE.md`: snapshot da instalacao do plugin, stack detectada, versao do manifest, data do init, features habilitadas
- [claude-claude-md.md](./claude-claude-md.md) — `.claude/CLAUDE.md`: mirror canonico de AGENTS.md, mirror notice, operating contract sincronizado

---

## Metadata

- Total: 16 docs populaveis
- Template para novos docs: [_template.md](./_template.md)
- Fonte de dados estruturados: `skills/init/lib/populate-instructions-table.ts`
- Drift test (H3 vs mustCover): `skills/init/lib/populate-guidance-drift.test.ts` (Plano 01 fase-04)

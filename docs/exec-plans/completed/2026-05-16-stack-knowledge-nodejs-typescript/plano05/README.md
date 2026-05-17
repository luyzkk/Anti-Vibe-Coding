# Plano 05: Atom Batch B — 5 átomos thin/security/testing/arch (inclui RF8 primordials)

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2) ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~7-9h
**Depende de:** Plano 01 (pilot atom `type-system-idioms.md` define formato; pasta `atoms/` existindo)
**Desbloqueia:** Plano 06 fase-04 (INDEX final consolidado consome os 5 átomos populados aqui + os 5 do Batch A + os 3 do Batch C)

---

## O que este plano entrega

5 átomos populados em `docs/knowledge/nodejs-typescript/atoms/` (api-design-stack-specific, security-stack-specific, testing-strategy, architecture-conventions, dependencies-supply-chain), todos seguindo verbatim o frontmatter e o skeleton do átomo piloto. Inclui os 2 átomos **thin** (~80 linhas) que complementam `/api-design` e `/security` sem duplicar princípios cross-stack, e migra inline em `security-stack-specific.md` o conteúdo de `nodejs-core/rules/primordials.md` (RF8 + D12). Fechado por gate de qualidade replicado do Plano 04: subagente verificador em sample audit ≥80% claims rastreáveis + auditoria humana mínima de 3 átomos do batch (CA-08).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Átomo piloto `type-system-idioms.md` como template de formato (frontmatter + 5 seções do corpo) | Plano 01 fase-02 | pendente |
| Pasta `docs/knowledge/nodejs-typescript/atoms/` existindo | Plano 01 fase-01 | pendente |
| Decisões D1, D2, D3, D12 (primordials → security-stack-specific), D17, D18 do PRD | PRD.md | pronto |
| RF8 — re-scan de rules core-contributor-only com migração mínima de `primordials.md` | PRD §Should Have | pronto (regra escrita) |
| Fontes em `claude-code/knowledge/Nodejs/wf-{compass-id}.md` para os 5 átomos: `26cc8f92` (API), `security-guide`, `ab2553f8` (Testing), `3f1af213` (Architecture), `deps-kb` | `_catalog.md` | pronto |
| Skill packages como fonte adicional: `nodejs-backend-patterns/SKILL.md`, `nodejs-best-practices/SKILL.md` | `_catalog.md` | pronto |
| Rule de skill `nodejs-core/rules/primordials.md` (fonte do RF8) | `claude-code/knowledge/Nodejs/nodejs-core/rules/` | pronto (verificar arquivo intacto antes de fase-02 — audit trail) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 5 átomos populados em `atoms/` (totalizando 10/14 com Batch A) | Plano 06 fase-04 (INDEX final consolidado precisa de keyword/layer/tier maps dos 14 átomos) |
| Reuso do padrão verifier+auditoria estabelecido no Plano 04 fase-06 (mesma estrutura, distribuição de tiers diferente) | Plano 06 fase-06 (segunda repetição do padrão para Batch C com regra literal do PRD CA-08: tier 1 + tier 2 + tier 3) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-api-design-stack-specific.md | átomo thin ~80 ln (Fastify vs Express, Zod/TypeBox, tRPC vs REST, OpenAPI from types) | 1-1.5h | piloto (Plano 01 fase-02) |
| 02 | fase-02-security-stack-specific.md | átomo thin ~80 ln (prototype pollution, `npm audit`, dotenv vs schema-config, **+ primordials migrados de RF8/D12**) | 1.5h | piloto |
| 03 | fase-03-testing-strategy.md | átomo tier 2 full ~130 ln (Vitest/Jest/node:test, pirâmide, doubles, mutação, contrato) | 1.5-2h | piloto |
| 04 | fase-04-architecture-conventions.md | átomo tier 2 full ~130 ln (8-12 patterns de arquitetura Node+TS condensados de 112 regras + skill packages) | 1.5-2h | piloto |
| 05 | fase-05-dependencies-supply-chain.md | átomo tier 2 full ~120 ln (lockfiles, workspaces, audits, SBOM, licenses, supply chain) | 1.5h | piloto |
| 06 | fase-06-verifier-sanity-check.md | verifier subagente (5 invocações isoladas) + auditoria humana 3 átomos amostrados (CA-08) | 1-1.5h | fase-01..05 |

---

## Grafo de Fases

```
        piloto (Plano 01 fase-02)
              |
   +----------+----------+----------+----------+
   |          |          |          |          |
   v          v          v          v          v
fase-01    fase-02    fase-03    fase-04    fase-05
(api-thin) (sec-thin) (testing) (arch)     (deps)
   |          |          |          |          |
   +----------+----------+----------+----------+
                         |
                         v
                 fase-06 (verifier + auditoria)
```

**Paralelismo possivel:** após o átomo piloto estar pronto (Plano 01 fase-02), as 5 fases de escrita de átomos (fase-01..05) podem ser executadas em paralelo por subagentes extratores independentes — nenhuma compartilha arquivos. Fase-06 é sequencial e fecha o ciclo, pois depende dos 5 átomos escritos para rodar o verifier e a auditoria humana.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

Fases 01-05 são **content-only** (markdown puro, sem código TS novo): usam checklist de validação de conteúdo em vez de RED→GREEN, igual ao Plano 04 e à fase-02 do Plano 01 (átomo piloto). Fase-06 também é content-only mas adiciona um gate de processo (spawn de verifier + auditoria humana) cujo veredito é registrado em MEMORY.md.

**Tracer Bullet deste plano:** N/A — o tracer bullet vive no Plano 01 fase-05 e já validou a arquitetura matrix → init → projeto → skill end-to-end. Plano 05 é escala em conteúdo, com a peculiaridade dos 2 átomos thin + migração RF8 do primordials.

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases.

- **G1 — Formato copiado do piloto (zero drift):** qualquer divergência em frontmatter (8 campos na ordem `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`) ou nas 5 seções do corpo (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas) invalida CA-01. Manter verbatim com o piloto (`docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md`).
- **G2 — Cap de 200 linhas para tier 2 full, cap de 80 linhas para os 2 thin:** se um átomo full passar de 200 linhas, sinal de granularidade errada — condensar. Se um átomo thin passar de ~90 linhas, sinal de que está absorvendo conteúdo cross-stack que pertence à skill, não ao átomo (api-design-stack-specific complementa `/api-design`, security-stack-specific complementa `/security`). Faixa saudável: 70-90 para thin, 110-150 para tier 2 full (per `_topic-plan.md:53-66`).
- **G3 — fase-06 verifier é subagente ISOLADO (PRD risk #2):** false-positive "tudo OK" sem checar de verdade é risco real. O prompt do verifier obriga **citar passagem específica (parágrafo ou linhas) da fonte** para cada claim auditada — não aceitar veredito sem citação. Spawn um verifier por átomo (5 invocações independentes) para evitar context bleed.
- **G4 — Auditoria humana é bloqueante:** 3 átomos amostrados antes de aprovar batch. Distribuição operacional deste batch: **1 thin + 2 tier 2 distintos** (ver Nota de divergência abaixo — batch B não tem tier 1 nem tier 3). Aprovação registrada em MEMORY.md como DI-4 com data e nome do auditor.
- **G5 — Overlaps com skills cross-stack (especialmente os 2 thin):** `api-design-stack-specific.md` complementa `/api-design` (não duplicar idempotência, REST vs GraphQL conceitual, pagination); `security-stack-specific.md` complementa `/security` (não duplicar OWASP geral, JWT genérico, RBAC). Cada átomo cita `/skill-relacionada` em "Referências externas". Sempre que tentar explicar conceito genérico, parar e linkar — o átomo é sobre o ângulo Node+TS, não sobre o conceito.
- **G6 — Fontes brutas em `claude-code/knowledge/Nodejs/wf-{compass-id}.md`:** frontmatter `sources:` aponta para o **compass-id** (sem path), não para o caminho do arquivo (RF11 e Could Have do PRD). O path absoluto pode ser citado **no corpo** em "Referências externas" como audit trail. Para sources que são skill packages (não pesquisas), usar `- skill: {nome}/SKILL.md`. Para a rule `primordials.md` (RF8): `- skill: nodejs-core/rules/primordials.md`.
- **G7 — Átomos do Plano 05 são escritos em PARALELO:** fase-01 a fase-05 não têm dependência entre si — todas dependem apenas do piloto (formato). `/execute-plan` pode despachar 5 subagentes extratores simultâneos. Fase-06 fecha o ciclo e depende das 5 anteriores.
- **G8 (específico do Batch B) — Migração primordials (RF8/D12):** o conteúdo de `claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` (originalmente "core-contributor-only" mas com nuggets app-relevant) DEVE ser integrado **inline** em `security-stack-specific.md`, não em átomo separado. Não criar átomo `primordials.md` em `atoms/`. Antes de fase-02 iniciar, verificar que `primordials.md` ainda existe na pasta fonte como audit trail (não deletar a fonte). Sources do átomo incluem `- skill: nodejs-core/rules/primordials.md` para rastreabilidade.

### Nota de divergência PRD vs PLAN sobre auditoria humana (registrar em MEMORY.md)

- PRD CA-08 (linha 242) usa: "1 tier 1 + 1 tier 2 + 1 tier 3"
- PLAN.md secão "Plano 05 fase-06" (linha 130) usa: "auditoria humana 3 átomos (CA-08)" sem especificar distribuição
- **Resolução:** Plano 05 contém apenas 1 thin + 4 tier 2 (sem tier 1, sem tier 3). Operacionalizar como **1 thin + 2 tier 2 distintos** (≠ ambos tier 2 do mesmo cluster temático). Isto preserva a intenção do CA-08 (cobertura por tier diferente) dentro das possibilidades do batch. Plano 06 fase-06 fará a auditoria respeitando o PRD literal (terá tier 3). Divergência registrada em MEMORY.md como DI-3.

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

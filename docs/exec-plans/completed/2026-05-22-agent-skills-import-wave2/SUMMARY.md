# Summary: Agent-Skills Import — Wave 2

**Completed:** 2026-05-23
**Duration:** 2026-05-22 -> 2026-05-23 (2 dias, intervalo de pausa entre planos)
**Planos:** 4 (4 completed, 0 skipped)
**Fases Total:** 14 (14 done, 0 skipped, 0 blocked)
**Commits atomicos:** 22 (de `e4d0614` a `56648ae`)

---

## O que foi construido

| Plano | Entrega |
|-------|---------|
| 01 — Foundation + Tracer Bullet | Audit de consumidores do `contract_version`; bump do schema `subagent-contract-v1.md` para `2.0.0` + migration guide; `agents/security-auditor.md` refinado como gold standard com 5 patterns aplicados; fixture `validator anti-generico` (CA-02) com 43 testes. |
| 02 — Refinar 12 Agentes Restantes | 12 agentes refinados em waves de 4 paralelos (Wave A: react/api/database/tdd-verifier; Wave B: code-smell/solid/infra/design-explorer; Wave C: documentation-writer/lesson-evaluator/plan-executor/plan-verifier). Total agora: 13/13 agentes com `contract_version: "2.0.0"` + `## Output Contract` + `## Anti-Degeneration Rules` + `## Composition`. 54 anti-degen rules catalogadas (>= 52 exigido). |
| 03 — Skills Novas | 3 skills portadas de `Infos/agent-skills-main/`: `source-driven-development/`, `doubt-driven-development/`, `git-workflow-and-versioning/`. Cada uma com frontmatter, telemetria passiva e cross-refs (consultant, design-twice, iterate, CLAUDE.md global). Manifest base regerado (38 skills indexadas). |
| 04 — Pedagogia ADR + Validacao Final | `skills/decision-registry/SKILL.md` ganhou secao `## When to Write an ADR` ANTES do CRUD (4 sub-secoes: gatilhos, lifecycle PROPOSED->ACCEPTED->SUPERSEDED|DEPRECATED, Common Rationalizations, Red Flags). Manifest final regerado (`decision-registry` checksum 656a4b04 -> 8a721462). Exit Criteria PLAN.md validados ponto-a-ponto. |

---

## Decisoes de Implementacao (consolidado)

**Plano 01:**
- Schema v2.0.0 em arquivo NOVO (`subagent-contract-v1.md` permanece imutavel para historico).
- Harness em modo transitional (aceita v1 e v2 durante a Wave).
- Tipos `SubagentContractBaseV2` etc adicionados em `skills/lib/subagent-contract.ts`.

**Plano 02:**
- Cabecalho real do gold standard: `## Output Contract` (nao `## Output Contract (additions)` como a spec original sugeria).
- `design-explorer` adaptou kind "proposal" para "audit" no v2; semantica de `verdict` adaptada em `## Composition`.
- `documentation-writer` -> `kind: mutation`; `lesson-evaluator` -> `kind: audit`; `plan-executor` + `plan-verifier` -> `kind: verification`.
- Secoes legado mantidas (nao deletadas) em cada agente para nao quebrar callers em transicao.

**Plano 03:**
- Corpo das 3 skills preservado em ingles (G6 — copy literal). Frontmatter PT-BR + cross-refs.
- DI-Plano03-fase04-bun-vs-node-cjs: `scripts/generate-manifest.js` requer `bun run scripts/...` (NAO `node`) devido a `type:module` em package.json.

**Plano 04:**
- DI-1: Lifecycle de ADR usa codeblock indentado (4 espacos) em vez de fence triplo aninhado — evita conflito de parser no harness:validate.
- DI-4: `/tmp/` nao acessivel por node nativo Windows — copiar snapshots para path relativo `./.{nome}-tmp.json`.
- DI-5: `lint` script NAO existe em package.json — substituto correto: `typecheck` (tsc --noEmit).

---

## Bugs e Gotchas (consolidado — GENERALIZAVEIS)

Os gotchas abaixo sao candidatos a `/lessons-learned` por serem reutilizaveis em waves futuras.

### Generalizaveis (candidato a compound notes)

1. **Subagentes paralelos com gold standard verbatim em vez de descricao paragrafal.** Plano 02 spawnou 12 subagentes em 3 waves de 4 com `agents/security-auditor.md` como template VERBATIM + grep batch como gate de QA. Resultado: 12/12 agentes consistentes na primeira tentativa, sem retries. Pattern aplicavel a qualquer refactor uniforme em N arquivos similares.

2. **Schema MAJOR bump com audit previo obrigatorio.** Plano 01 fase-01 fez grep map de TODOS os consumidores do `contract_version` ANTES do bump 1.0 -> 2.0.0. Sem audit, migration sairia em parts. Pattern: schema mudanca breaking exige audit-then-migrate-then-validate.

3. **Validator anti-generico para `positive_observations`.** Plano 01 fase-04 implementou regex blacklist + 43 testes para bloquear strings genericas ("everything is fine", "no issues") em outputs de agentes. Pattern: campos textuais opcionais sempre exigem validador que detecta degeneracao para evitar virar ruido.

4. **Pedagogia precede CRUD em skills mistas (DT-4).** Quando uma skill tem CRUD tecnico (`add`/`list`/`query`) + filosofia (`when to use`), a pedagogia ANTES do CRUD ensina QUANDO; o CRUD eh autoridade tecnica do COMO. Sem pedagogia, devs invocam CRUD sem entender o "porque".

5. **`bun run test` em Windows estoura ARG_MAX** quando o script enumera centenas de arquivos como CLI args. Workaround: subset por diretorio (`bun test tests/`, `bun test skills/`, etc).

### Especificas da Wave 2 (NAO compound notes)

- GT-1 (Plano 04): regressao do teste `runInit emits canonical audit log entries (CA-14)` em HEAD (e em pre-Wave 2 4c9fbde). Origem: init-refactor-v7. NAO Wave 2.
- GT-2 (Plano 04): `skills/init/lib/registry.ts` importa `./steps/inject-harness-scripts` modulo nao commitado. Origem: init-refactor-v7.
- GT-3 (Plano 04): `scripts/run-tests.ts` estoura limite de linha de comando do Windows. Refatoracao em tech-debt.

---

## Desvios dos Planos

- **DEV-1 (Plano 02 fase-01):** Spec usava `## Output Contract (additions)` mas gold standard real eh `## Output Contract` — corrigido na primeira invocacao.
- **DEV-2 (Plano 02 fase-02):** `design-explorer` precisou de adaptacao semantica (`kind: "proposal" -> "audit"`).
- **DEV-3 (Plano 04 fase-02):** Pipeline `lint` substituido por `typecheck` (lint nao existe). Pipeline canonico real: `bun run harness:validate && bun run test && bun run typecheck`.
- **DEV-4 (Plano 04 fase-02):** 1 teste fail + 1 typecheck error em pipeline — TODOS pre-existentes do init-refactor-v7. Aceito como "verde modulo pre-existentes documentados".

---

## Metricas Consolidadas

| Metrica | Valor |
|---------|-------|
| Planos | 4 |
| Fases total | 14 |
| Commits atomicos Wave 2 | 22 |
| Agentes refinados | 13 |
| Anti-degen rules catalogadas | 54 (>= 52 exigido) |
| Skills novas portadas | 3 |
| Schema doc bumpado | 1.0 -> 2.0.0 (MAJOR) |
| Manifest regeneracoes | 2 (Plano 03 fase-04 + Plano 04 fase-02) |
| Bugs introduzidos pela Wave 2 | 0 |
| Bugs pre-existentes descobertos | 3 (GT-1, GT-2, GT-3 — todos do init-refactor-v7) |
| Retries necessarios | 0 (cada wave de 4 subagentes paralelos foi verde na primeira) |
| Custo token estimado | ~650k (13 agentes × ~50k cada + skills + plano 04) |

---

## Exit Criteria — Status Final

- [x] CA-01 a CA-12 do PRD verificados (12 criterios)
- [x] 13/13 agentes refinados com 5 patterns aplicados
- [x] >= 52 regras anti-degeneracao catalogadas (54 atual)
- [x] 3 skills novas existem e validam
- [x] `decision-registry` tem `## When to Write an ADR` com tabela "Common Rationalizations"
- [x] `contract_version: "2.0.0"` em schema + 13 agentes + migration guide
- [x] `bun run harness:validate` verde (test/typecheck com pre-existentes documentados de init-refactor-v7)
- [x] CA-11: `verify-work` continua intocado vs origin/main

7/8 verdes diretos + 1 com pre-existentes documentados (GT-1/GT-2 atribuidos ao init-refactor-v7, NAO Wave 2).

---

## Proximos Passos

1. **Wave 3** — escopo "Won't Have" da Wave 2: refactors deeper das 5 SKILL.md criticas (tdd-workflow, anti-vibe-review, plan-feature, grill-me, execute-plan), consolidacao `/anti-vibe-review -> /verify-work` com deprecation path, modo `prove-it` no tdd-verifier, pipeline compound->reference->core-belief, references operacionais profundas, persona "synthesizer" (decisao pendente).

2. **Tech-debt aberto** (priorizar antes ou apos Wave 3 — decisao do dev):
   - GT-1: regressao CA-14 audit log integration test (init-refactor-v7).
   - GT-2: registry.ts referencia modulo nao commitado (init-refactor-v7).
   - GT-3: scripts/run-tests.ts refactor para evitar Windows ARG_MAX.

3. **Destilacao para `/lessons-learned`** — 5 patterns "Generalizaveis" acima sao candidatos a compound notes em `docs/compound/`.

---

<!-- Gerado por /anti-vibe-coding:execute-plan em 2026-05-23 -->

# Memoria: Plano 02 — Migracao Piloto (3 padroes)

**Feature:** v6.1.0-subagent-contract
**Iniciado:** 2026-05-14
**Concluido:** 2026-05-14
**Status:** completed (4/4 fases verdes, 14 testes passando — 712 globalmente -> 714)

---

## Decisoes de Implementacao

- **DI-1 (fase-01):** Prompt do `plan-verifier` usa `checks[].name/status/detail` (alinhado com schema real), nao `checks[].id/result/detail` (como o exemplo do plano sugeria). Schema verificationVariant exige `name` e `status` — `id/result` seriam rejeitados por `MISSING_REQUIRED_FIELD` + propriedade extra.
- **DI-2 (fase-02):** Escopo da fase-02 EXPANDIDO conforme decisao do dev (BUG-1) para incluir atualizacao de `agents/_contract/v1.schema.json` (proposalVariant) + `skills/lib/subagent-contract.ts` (ProposalContract), nao apenas o prompt do `design-explorer`.
- **DI-3 (fase-02):** Os 8 nomes de secao do `human_readable` adotados do plano (Context/Constraints/Alternatives/Tradeoffs/Recommendation/Risks/Open Questions/References), NAO os nomes antigos do `design-explorer.md` (Abordagem/Estrutura/Pros/Contras/Complexidade/Riscos/Esforco/Quando escolher). Justificativa: os antigos eram UX de variante especifica, os canonicos sao alinhados ao contrato de `kind: proposal` e ao consumo pelo handler `/design-twice` (Plano 04 fase-02). Divergente do que G-P02-02 sugeriu — registrado como DEV.
- **DI-4 (fase-03):** Testes novos usam `parseContract()` em vez de `parseAndDispatch()` (como o exemplo do plano sugeria). `parseContract` retorna `ValidationResult` direto com `.valid/.contract/.errors/.warnings` — suficiente para validar envelope. `parseAndDispatch` exige handler stub e retorna `DispatchResult` com `.validation` aninhado — overscoped para teste de envelope.
- **DI-5 (fase-03):** Fixtures usam `run_id` deterministicos (`fixture-pv-001`, `fixture-de-001`) — alinhado com G-Local da fase para evitar snapshot breakage em CI.
- **DI-6 (fase-03):** `reasoning` das 2 fixtures novas tem 253 e 271 chars — bem acima do threshold 50 (sem REASONING_LIKELY_WEAK).
- **DI-7 (fase-04):** Exemplos de `reasoning` na secao "Reasoning — exemplos contrastantes" do migration guide copiados verbatim das 3 fixtures — garantia de consistencia com oraculo de CI.
- **DI-8 (fase-04):** Secao "Status Mapping" inserida como subsecao H3 dentro da secao 6 do doc canonico (nao como secao H2 nova). Migration guide fica coeso como unidade pedagogica + referencia.
- **DI-9 (fase-04):** TOC adicionado como "## Indice" sem numeracao propria entre secoes 1 e 2 — nao quebra anchors existentes.

---

## Bugs Descobertos

- **BUG-1 (fase-02):** Schema `proposalVariant` em `agents/_contract/v1.schema.json` ficou como stub no Plano 01 fase-03 (`proposal_summary: string`), incompativel com o uso real do Plano 02 fase-02 e do consumidor planejado no Plano 04 fase-02 (handler `/design-twice` consome `payload.proposal` com 6 campos).
  - Causa: nenhum agente `kind: proposal` foi migrado no Plano 01 — proposalVariant ficou minimal sem ser exercitado.
  - Fix: schema + TS type atualizados em fase-02 (escopo expandido) para `payload.proposal` nested `{ title, summary, constraints[], tradeoffs[], recommendation, alternatives[] }`. Auditado: nenhuma fixture/teste do Plano 01 quebrou.
  - Fase afetada: fase-02.

---

## Gotchas

- **GT-1 (fase-01):** Quando o spec da fase contradiz o schema/codigo entregue por planos anteriores, o codigo vence. O exemplo do plano `checks[].id/result` foi corrigido mecanicamente para `checks[].name/status` no prompt. Plano 03 (escala) precisa estar ciente desse padrao.
- **GT-2 (fase-02):** Mudar o shape de uma `definitions/*Variant` do schema sem quebrar testes existentes so e seguro se nenhuma fixture do tipo afetado ja existir. Verificar via grep antes de propor schema breaking changes em planos futuros.
- **GT-3 (fase-03):** O spec da fase-03 misturava `parseContract` e `parseAndDispatch` nos exemplos de teste. As duas APIs servem proposito distinto:
  - `parseContract(raw)` -> `ValidationResult` (valid/contract/errors/warnings) — para validators/tests/CI.
  - `parseAndDispatch(raw, handlers)` -> `DispatchResult` (validation/dispatched/handlerKind) — para orquestradores com handlers.
  Documentado em fase-04. Reusar essa distincao no Plano 04 (orquestradores usam dispatch; testes usam parseContract).
- **GT-4 (fase-04):** `bun run harness:validate` retorna falhas pre-existentes nao causadas pelo Plano 02:
  - GT-2 herdado do Plano 01: links em `plano05/fase-05-changelog-compound-merge.md` resolvem incorretamente para o diretorio do plano (deveriam apontar para a raiz do repo via `../../../`).
  - GT-3 herdado do Plano 01: `every_agents.md` na raiz sem H1.
  Decisao: corrigir em Plano 05 fase-05 (CHANGELOG + ajustes finais) ou TODO.md.

---

## Desvios do Plano

- **DEV-1 (fase-01):** Prompt do `plan-verifier` usa `checks[].name/status` (correto pelo schema) em vez de `checks[].id/result` (incorreto no exemplo do plano). Aprovado pelo dev na sessao.
- **DEV-2 (fase-02):** Escopo da fase-02 expandiu de "editar 1 arquivo (prompt)" para "editar 3 arquivos (schema + TS type + prompt)". Justificativa: schema do Plano 01 era stub incompativel com Plano 02. Decisao formal do dev na sessao (opcao a). Sizing real ~2h vs ~1.5h previsto.
- **DEV-3 (fase-02):** Nomes das 8 secoes do `human_readable` mudaram da variante antiga do `design-explorer` para os canonicos do plano (UX visivel para o operador). Divergente de G-P02-02 ("manter os nomes atuais"). Justificativa: nomes antigos eram UX de uma variante especifica do output; nomes canonicos sao alinhados ao contrato e ao consumo do `/design-twice` (Plano 04). Documentado para revisao posterior.
- **DEV-4 (fase-03):** Testes novos usam `parseContract` em vez de `parseAndDispatch` (vs exemplo do plano). API correta para validar envelope sem precisar de handler stub. Comportamento de aceite identico ao spec.
- **DEV-5 (fase-04):** Migration guide expandido como subsecoes H3 dentro da secao 6 existente (vs criar 4 secoes H2 novas como o spec sugeria). Estrutura mais coesa.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 4 (todas — todas as anomalias documentadas) |
| Bugs encontrados | 1 (proposalVariant stub Plano 01) |
| Retries necessarios | 0 |
| Testes adicionados | 2 (de 12 -> 14 em subagent-contract.test.ts) |
| Suite global | 712 -> 714 pass / 0 fail / 1 skip |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 03 — Migracao em Escala) PRECISA saber antes de comecar.

### Migration guide canonico

`docs/design-docs/subagent-contract-v1.md` agora tem secao "Migration Guide" completa com:
- **Status Mapping — regra canonica** (4 tabelas: audit/verification/proposal/mutation). Copia direta para os prompts dos 10 agentes restantes.
- **human_readable — quando usar** (regra de ouro: orquestrador deve ignorar `human_readable` e ainda funcionar).
- **Reasoning — exemplos contrastantes** (3 bons das fixtures reais + 3 fracos com char counts).
- **Checklist de migracao (<30min)** (6 passos mecanicos + lista de padroes a evitar).
- **APIs do Validator** (parseContract vs parseAndDispatch).

### Distincao API critica (NAO confundir)

- `parseContract(raw: string) -> ValidationResult` — validators/tests/CI. Tem `.valid`, `.contract`, `.errors[]`, `.warnings[]`.
- `parseAndDispatch(raw: string, handlers: KindHandlers) -> DispatchResult` — orquestradores. Tem `.validation`, `.dispatched`, `.handlerKind`. Plano 04 fases 01-04 (orquestradores) usam este; testes de fixtures usam `parseContract`.

### Shapes confirmados (oraculo: fixtures verdes)

- **kind: audit** — `payload.issues[]` com `{ severity, file?, line?, description }`. domain_status: `clean | issues_found | critical` (sugerido). 7 dos 10 agentes restantes sao audit (react/solid/code-smell/tdd/api/database/infra).
- **kind: verification** — `payload.checks[]` com `{ name, status, detail? }` onde `status: pass|warn|fail|unable_to_verify`. `payload.domain_status: pass|warn|fail` opcional. Tambem aplica-se ao `plan-executor` (kind=verification per Plano 03 fase-03).
- **kind: proposal** — `payload.proposal` nested com 6 campos required: `title, summary, constraints[], tradeoffs[{axis,choice}], recommendation, alternatives[{id,title,rejected_because}]`. SEM `domain_status`. SEM `needs_retry` no lifecycle.
- **kind: mutation** — stub aceita qualquer shape. `documentation-writer` (Plano 03 fase-04) recebe envelope cosmetico + TODO.md entry para v6.2.

### Fixtures como template

Replicar shape de:
- `agents/__fixtures__/security-auditor/expected-output.json` para os 7 audit (react/solid/code-smell/tdd/api/database/infra) + `lesson-evaluator` (audit).
- `agents/__fixtures__/plan-verifier/expected-output.json` para `plan-executor` (verification).
- `agents/__fixtures__/design-explorer/expected-output.json` para qualquer agente de proposal futuro (improvavel em Plano 03).

### Recomendacoes de execucao (para o orquestrador do Plano 03)

- **fase-01 + fase-02 em paralelo** (4 audit + 3 audit, arquivos disjuntos).
- **fase-03 sequencial** apos fase-01/02 (lesson-evaluator audit + plan-executor verification).
- **fase-04 sequencial** (documentation-writer mutation stub).
- **fase-05 sequencial** (10 fixtures + bun test agents:contract verde nos 13).
- Conferir que fase-03 do Plano 03 mapeia status do `plan-executor` (Notas do Plano 01 ja preveem: `done -> complete`, `partial -> complete + payload.domain_status: partial`, `blocked` preservado).

### Pendencias estruturais para Plano 05 (nao bloqueia Plano 03)

- `harness:validate` falha por:
  - links broken em `plano05/fase-05-changelog-compound-merge.md` (paths relativos errados, GT-2 do Plano 01).
  - `every_agents.md` na raiz sem H1 (GT-3 do Plano 01).
- Decisao: Plano 05 fase-05 corrige paths OU TODO.md para v6.2.

---

<!-- Atualizado automaticamente durante execucao em 2026-05-14 -->

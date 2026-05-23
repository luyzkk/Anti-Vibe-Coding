# Memoria: Plano 02 — Refinar 12 Agentes Restantes (Waves A/B/C)

**Feature:** Agent-Skills Import — Wave 2
**Iniciado:** pendente
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-Wave2-P02-heading-real (fase-01):** Spec da fase-01 instruia grep por `## Output Contract (additions)`, mas o gold standard refinado no Plano 01 fase-03 usa `## Output Contract` (sem parenteses). Decidido: usar o heading REAL do gold standard. Subagentes foram instruidos com a heading correta. Aplicar mesma correcao em fase-02 e fase-03. Spec original do plano-02 deve ser entendido como instrucao desatualizada, nao gold.
- **DI-Wave2-P02-precommit-commit-per-agent (fase-01):** Cada subagente rodou pre-commit hook automaticamente apos Edit + git add/commit. Resultado: 4 commits atomicos (1 por agente refinado), nao 1 commit consolidado por wave. Vantagem: rollback granular se algum agente apresentar issue depois. Manter padrao em fase-02 e fase-03.
- **DI-Wave2-P02-design-explorer-kind (fase-02):** `design-explorer.md` usava `kind: "proposal"` no contrato v1 (gerado pelo /design-twice). Migrado para `kind: "audit"` em v2.0.0 porque schema v2 nao tem enum `"design"` nem `"proposal"` — `"audit"` e o unico kind canonico para agentes que retornam contrato. Semantica de verdict adaptada e documentada em ## Composition (approve = proposta viavel, request_changes = refinamento, block = inviavel sob restricao). Schema v2 nao precisa de extensao — apenas convencao de uso por parte do orquestrador.
- **BUG-1 / DEV-1 (fase-02):** PROMPT DO ORCHESTRADOR ERRADO em SB-4. Inspecao posterior do schema v2 mostra que ele TEM `"proposal"` no enum kind (linha 24 de v2.schema.json) — alem de audit/verification/mutation. Subagente foi instruido erradamente que schema nao tinha "proposal". design-explorer ficou com kind: "audit" + payload.issues[] em vez de kind: "proposal" + payload.proposal (com title/summary/constraints/tradeoffs/recommendation/alternatives). Acao corretiva: registrar como DEV-1 e adicionar nota para Plano 04 (fase-02 validacao final) re-refinar design-explorer.md para `kind: "proposal"` antes do manifest checksums final.
- **DI-Wave2-P02-kinds-variants-fase03 (fase-03):** Wave C operou com 3 kinds diferentes do schema v2 (auditVariant/verificationVariant/mutationVariant). Orchestrador instruiu cada subagente com payload-shape correto do variant alvo: lesson-evaluator (audit, issues[]), plan-executor/plan-verifier (verification, checks[]), documentation-writer (mutation, payload stub flexivel). Resultado: 4 commits atomicos sem conflito de variant. Padrao para Plano 04 e Wave 3 quando refinar agentes adicionais.
- **DI-Wave2-P02-secoes-legado-mantidas (fase-03):** plan-executor e plan-verifier tinham secoes pre-existentes (`## Output ao Concluir`, `## Output (JSON estruturado)`) com formato antigo. Subagentes MANTIVERAM essas secoes (decisao SC-3/SC-4) — preferiram nao remover para evitar scope creep. Plano 04 fase-02 (validacao consolidada) deve verificar se essas secoes redundantes podem ser deletadas (substituidas pelo `## Formato de Saida (Contrato v2.0.0)` novo). <!-- Exemplo -->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** {sintoma}
  - Causa: {raiz}
  - Fix: {correcao}
  - Fase afetada: {fase-NN}
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** {gotcha}
  - Descoberto em: {fase-NN}
  - Impacto: {efeito}
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** {desvio + motivo}
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 2 (fase-01: heading divergente — DI-Wave2-P02-heading-real; fase-02: BUG-1 design-explorer kind) |
| Bugs encontrados | 1 (BUG-1 design-explorer kind:audit em vez de proposal — escalado para Plano 04 fase-02) |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 04) PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

- **13/13 agentes refinados** com 5 patterns (Output Contract, Anti-Degeneration Rules >=4, Composition, triad PoC/Impact/Fix em critical/high, contract_version "2.0.0"). Total anti-degen catalogado: 54 (relatorio: `plano02/relatorio-validacao.md`).
- **CA-11 verificado:** `git diff --stat e4d0614 -- skills/verify-work/SKILL.md` retorna vazio. Nenhum subagente de Wave 2 saiu de escopo.
- **CA-12 documentado conceitualmente** (sem fixture runtime — adiada para Wave 3 ou escopo separado). Validator anti-generico do Plano 01 (`agents/_contract/positive-observations-validator.ts`) enforca regra de tautologia em runtime.
- **Checksums SHA-256** dos 13 agentes mudaram (12 commits novos: 619b664 ... 9f69a8b). Plano 04 deve regenerar `plugin-manifest.json` e `.claude-plugin/plugin.json`.
- **AGUARDA correcao no Plano 04 (BUG-1):** `agents/design-explorer.md` ficou com `kind: "audit"` mas deveria ser `kind: "proposal"` (schema v2 tem proposalVariant com title/summary/constraints/tradeoffs/recommendation/alternatives). Causa: prompt do orchestrador SB-4 errou ao afirmar que schema nao tinha "proposal".
- **AGUARDA correcao no Plano 04 (DI secoes legado):** plan-executor (`## Output ao Concluir`) e plan-verifier (`## Output (JSON estruturado)`) tem secoes legado em formato antigo (mantidas pelos subagentes para evitar scope creep). Verificar se podem ser deletadas.
- **AGUARDA encerrar modo transitional no Plano 04:** `scripts/harness-validate.ts CONTRACT_VERSION_TOKENS` ainda aceita ambos `"1.0"` e `"2.0.0"`. Agora que 13/13 estao em v2.0.0, remover `"1.0"` da alternativa.
- **NAO TOCAR:** `skills/verify-work/lib/audit-consolidator.ts:172` sintetico `'1.0' as const` — decisao de design documentada em DI-Wave2-P01-synthetic-contract-stays-v1.

---

<!-- Atualizado automaticamente durante execucao -->

---
slug: v6.1.0-subagent-contract-inventory
date: 2026-05-14
status: draft-inventory
purpose: Catalogar consumers e produtores de subagentes para o refactor de contrato em v6.1.0. NÃO é PRD — é input para o PRD.
related: docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md (consumer futuro)
---

# Inventário — Contrato de Subagentes v6.1.0

Eixo 1 (interno) do trabalho agent-native. Mapeia o estado atual antes do PRD.

## Princípios-alvo (do guia Every, recortados pro Eixo 1)

1. **Completion signal explícito** — todo subagente retorna `status` lifecycle padronizado, não enum de domínio.
2. **Reasoning livre** — campo `reasoning: string` para o agente sinalizar "vi algo que seu schema não previu".
3. **Output parseável** — JSON estruturado (orquestrador parsa programaticamente), com markdown opcional como `human_readable`.
4. **Prompts como features** — prompts em arquivos versionados (já parcialmente adotado via Decisão #8 do PRD do /init).
5. **Granularity** — tools/subagentes atômicos; lógica de decisão no prompt do orquestrador, não em código TS.

## Subagentes existentes (13)

| Agente | Output atual | Status atual | Reasoning livre? | Gap vs contrato v1 |
|---|---|---|---|---|
| security-auditor | markdown table | `SECURE / VULNERABILITIES_FOUND / CRITICAL_ISSUES` (enum domínio) | não — disperso em "Recomendacoes" | adicionar wrapper JSON + lifecycle status + reasoning field |
| react-auditor | markdown table | `OPTIMIZED / ISSUES_FOUND / PERFORMANCE_RISK` (enum domínio) | não | mesmo |
| solid-auditor | markdown | `COMPLIANT / ISSUES_FOUND / REFACTORING_NEEDED` (enum domínio) | não | mesmo |
| code-smell-detector | markdown | `CLEAN / SMELLS_FOUND / REFACTORING_NEEDED` (enum domínio) | não | mesmo |
| tdd-verifier | markdown | `COMPLIANT / NON-COMPLIANT / PARTIALLY_COMPLIANT` (enum domínio) | não | mesmo |
| api-auditor | markdown | `COMPLIANT / ISSUES_FOUND / CRITICAL` (enum domínio) | não | mesmo |
| database-analyzer | markdown | `OPTIMIZED / ISSUES_FOUND / CRITICAL_PERFORMANCE` (enum domínio) | não | mesmo |
| infrastructure-auditor | markdown | `COMPLIANT / ISSUES_FOUND / CRITICAL` (enum domínio) | não | mesmo |
| lesson-evaluator | markdown (sem Status field claro) | — | não | criar lifecycle status + reasoning |
| documentation-writer | markdown | — (modifica arquivos, não auditor read-only) | não | escopo diferente — write-side, requer contrato próprio |
| plan-executor | markdown estruturado | `done \| partial \| blocked` (lifecycle, parcialmente OK) | parcial — campo "Blockers" | promover status pra contrato v1, JSON wrapper, reasoning |
| plan-verifier | **JSON estruturado** | `pass \| warn \| fail` + checks[] (mais perto do alvo) | não há campo `reasoning` per-check (só `detail`) | normalizar nomes (`pass→complete`?), adicionar `reasoning` |
| design-explorer | markdown rígido 8 seções | nenhum status field | não | adicionar status + reasoning + JSON wrapper |

### Padrão de divergência

11 dos 13 retornam **markdown com enum de domínio próprio** — orquestrador precisa parse-por-regex e mapeamento por skill. Anti-pattern Every: *"Defensive tool design — Strict enums, validation at every layer"*. Cada audit tem seu enum, então orquestrador genérico é impossível hoje.

2 outliers (plan-verifier, plan-executor) já caminham na direção certa, mas com nomenclatura inconsistente.

## Skills consumidoras (orquestradores que invocam subagentes)

| Skill | Como invoca | Quantos subagentes | Parsing atual | Migração estimada |
|---|---|---|---|---|
| design-twice | `subagent_type: "general-purpose"` paralelos A/B/C com design-explorer prompt | 3+ | lê 8 seções markdown | médio — atualizar prompt design-explorer + parsing |
| execute-plan | invoca plan-executor + plan-verifier por task em waves | N por plano | parse JSON (verifier) + markdown (executor) | baixo — verifier já JSON; executor precisa wrapper |
| verify-work | auditoria multi-agente paralela (security, react, solid, code-smell, etc) | até 8 | parse markdown por enum domínio | **alto** — depende dos 11 markdown-only |
| anti-vibe-review | review pós-implementação (similar a verify-work) | múltiplos auditores | parse markdown | **alto** — mesmo problema |
| enhance-prompt | invoca conforme `## Anti-Vibe` da task | variável | varia | médio |
| quick-plan, plan-feature | mencionam subagentes em referência | indireto | n/a | baixo (sem parsing direto) |

## Pontos de acoplamento críticos

1. **verify-work + anti-vibe-review carregam o maior débito** — dependem de 11 auditores markdown. Refactor sem padronizar contrato = re-escrever parsing por skill.
2. **plan-verifier é o template de referência** — JSON estruturado, status lifecycle, checks array. Contrato v1 deve ser **generalização** do shape dele.
3. **design-explorer é caso especial** — output é proposta arquitetural longa, não auditoria binária. Contrato v1 precisa acomodar payloads ricos no campo `output`.
4. **documentation-writer escreve em vez de ler** — não é auditor, é write-side. Contrato v1 deve separar `kind: 'audit' | 'mutation' | 'proposal'` ou similar.

## Hipótese de contrato v1 (a refinar no PRD)

```json
{
  "status": "complete | needs_retry | needs_human | blocked",
  "reasoning": "string livre — o que o agente notou, inclusive fora do schema esperado",
  "kind": "audit | mutation | proposal | verification",
  "payload": { /* específico por subagente, mas com shape declarado */ },
  "human_readable": "markdown opcional para apresentação ao operador"
}
```

Validar no PRD: campos obrigatórios mínimos, schema de `payload` por `kind`, política de retry, política de versionamento do contrato.

## Escopo estimado de v6.1.0

- 13 subagentes × ~15-30min para reformatar output = **~4-6h**.
- 4 orquestradores principais (design-twice, execute-plan, verify-work, anti-vibe-review) — refatorar parsing TS/markdown leitura = **~6-10h**.
- ADR do contrato + testes de regressão (1 fixture por skill consumidora) = **~3-5h**.
- **Total estimado: 2-3 dias de trabalho focado**, alinhado com a estimativa do usuário ("não demoraria semanas").

## Pré-requisito do PRD de v6.1.0

Decidir antes de escrever PRD:
- [ ] Shape exato do contrato v1 (refinar a hipótese acima).
- [ ] Política de versionamento — `contract_version: "1.0"` no payload? Como skills declaram versão suportada?
- [ ] Backwards-compat: skills antigas continuam funcionando durante migração ou tudo migra junto?
- [ ] Onde mora a definição canônica do contrato? (sugestão: `docs/design-docs/subagent-contract-v1.md` + JSON schema em `agents/_contract/v1.json`).
- [ ] Fixtures de teste: rodar cada auditor contra repo-mock e snapshot do output JSON.

## Próximo passo

Após `/learn` rodar, escrever PRD em `docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/PRD.md` cobrindo: contrato definitivo, ordem de migração, plano de testes, ADR associado.

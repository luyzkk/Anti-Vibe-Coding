# Fase 03: Wave C — Refinar 4 Agentes (`documentation-writer`, `lesson-evaluator`, `plan-executor`, `plan-verifier`)

**Plano:** 02 — Refinar 12 Agentes Restantes
**Sizing:** 1.5h
**Depende de:** Plano 01 (gold standard + schema + validator). NAO depende formalmente de Plano 02 fase-01/02 (waves sao independentes; executor decidiu serializar)
**Visual:** false

---

## O que esta fase entrega

Os 4 agentes da Wave C refinados em paralelo (4 subagentes Fork), aplicando o gold standard `agents/security-auditor.md` (5 patterns) com regras anti-degen ESPECIFICAS do dominio de cada um. Conclui a refatoracao dos 12 agentes restantes (apos esta fase: 13/13 com 5 patterns aplicados).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/documentation-writer.md` | Modify | Adicionar 3 secoes + bumpar contract_version + triad em issues critical/high (se aplicavel) |
| `agents/lesson-evaluator.md` | Modify | Idem |
| `agents/plan-executor.md` | Modify | Idem |
| `agents/plan-verifier.md` | Modify | Idem |

Nenhum outro arquivo eh modificado nesta fase. Subagentes tem escopo restrito a 1 unico arquivo cada.

---

## Implementacao

### Passo 1: Confirmar pre-requisitos

Antes de spawnar subagentes:
- `agents/security-auditor.md` refinado (Plano 01 fase-03).
- Wave A e B opcionalmente concluidas. Wave C nao bloqueia em nenhuma, mas eh a ultima — dev geralmente revisa A+B antes.

### Passo 2: Spawnar 4 subagentes Fork em paralelo

Mesmo contrato literal da fase-01 (ver `fase-01-wave-a-refinar-4-agentes.md` secao "Contrato literal do subagente (input)"). Apenas o mapping `TARGET_AGENT_PATH` muda:

#### Mapping da Wave C (TARGET_AGENT_PATH por subagente)

| Subagente | TARGET_AGENT_PATH | Dominio | Notas sobre anti-degen especifica (CA-10 do PRD: "a definir conforme escopo do agente") |
|-----------|-------------------|---------|--------------------------------------------------|
| SC-1 | `agents/documentation-writer.md` | Doc generation | Sugerir: "Never suggest auto-generated docs sem revisao humana; never suggest copy from generated CHANGELOG without context" |
| SC-2 | `agents/lesson-evaluator.md` | Compound notes evaluation | Sugerir: "Never approve lesson that is restatement of existing rule; never approve lesson without concrete code reference" |
| SC-3 | `agents/plan-executor.md` | Plan execution | Sugerir: "Never suggest skipping fase verification; never accept fase done sem RED-GREEN evidence" |
| SC-4 | `agents/plan-verifier.md` | Plan validation | Sugerir: "Never accept claim of completion sem grep batch evidence; never approve fase with skipped tests" |

O PRD CA-10 explicitamente diz "a definir conforme escopo do agente" para estes 4 — subagente tem mais latitude para propor regras alinhadas ao papel meta de cada um. Importante: regras devem ser CONCRETAS e VERIFICAVEIS, nao filosofia.

### Passo 3: Coletar relatorios e consolidar

Apos os 4 subagentes retornarem, o executor da fase:
1. Roda o checklist de verificacao (grep por agente — ver "Verificacao" abaixo).
2. Le o diff dos 4 agentes em sequencia para confirmar consistencia visual com gold standard.
3. Roda `bun run harness:validate`.

---

## Gotchas

- **G1 do plano:** Gold standard passado VERBATIM.
- **G2 do plano:** Anti-degeneration ESPECIFICA por dominio — esta wave eh a que tem mais latitude (PRD CA-10 nao da exemplos). Subagente PRECISA gerar regras concretas, nao reciclar texto generico.
- **G3 do plano:** Bump contract_version atomico.
- **G6 do Plano 01:** Inconsistencia no gold standard propaga 4x nesta wave.
- **Local — documentation-writer:** agente generativo (nao auditor). Triad PoC/Impact/Fix pode nao se aplicar diretamente a issues — se o agente nao emite issues, secao triad pode ser opcional. Subagente decide: ou adapta (issues = documentation gaps) ou documenta no `## Composition` que triad nao se aplica.
- **Local — lesson-evaluator:** meta-agente (evaluator). Verdict eh natural: approve/request_changes/block para inclusao de compound note. Anti-degen pode focar em qualidade da licao (nao tautologica, cita arquivo, etc — espelho do CA-02).
- **Local — plan-executor + plan-verifier:** ambos meta-agentes do pipeline /execute-plan. Cuidado para NAO duplicar regras entre eles — executor anti-degen foca em "executar disciplina TDD"; verifier foca em "checar evidencia". Subagentes leem AMBOS os arquivos? NAO — escopo restrito a 1 cada. Cabe ao executor da fase (passo 3) revisar diff dos 2 lado-a-lado para detectar duplicacao.
- **Local — SH-04 do PRD:** "Para agentes nao-criticos onde severidade eh menos central (ex: documentation-writer, plan-executor), o mapping eh simplificado mas presente". Subagentes da Wave C podem usar tabela severity_action_map simplificada (mantendo as 4 linhas mas com SLA mais flexivel ex: "Backlog" para todas exceto critical). Decisao do subagente, documentar no relatorio.
- **Paralelismo intra-wave:** subagentes Fork rodam concorrentes. Editam arquivos diferentes — sem race condition.

---

## Verificacao

### TDD (grep por agente)

Para CADA um dos 4 agentes (`documentation-writer`, `lesson-evaluator`, `plan-executor`, `plan-verifier`):

- [ ] `grep -c "## Output Contract (additions)" agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c "positive_observations" agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c "verdict" agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c "## Anti-Degeneration Rules" agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c "## Composition" agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c '"contract_version": "2.0.0"' agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c '"contract_version": "1.0"' agents/{nome}.md` retorna `0`

### Checklist global da fase

- [ ] 4/4 subagentes retornaram com sucesso e relatorios coletados
- [ ] Diff visual dos 4 agentes consistente com gold standard (ordem das secoes, capitalizacao)
- [ ] `plan-executor` e `plan-verifier` NAO duplicam regras anti-degen entre si (review side-by-side)
- [ ] Nenhum arquivo fora de `agents/{documentation-writer|lesson-evaluator|plan-executor|plan-verifier}.md` foi modificado nesta fase
- [ ] `bun run harness:validate` verde
- [ ] `bun run test` verde
- [ ] `bun run lint` verde

---

## Criterio de Aceite

**Por maquina:**
- Loop pelos 4 agentes da Wave C: cada um passa os 7 greps acima.
- Total acumulado pos-fase: 13 agentes refinados (1 do Plano 01 + 4 Wave A + 4 Wave B + 4 Wave C).
- `bun run harness:validate && bun run test && bun run lint` verde.

**Por humano:**
- Review visual do diff dos 4 agentes confirma:
  - Secoes novas na mesma posicao do gold standard.
  - Regras anti-degen ESPECIFICAS concretas para cada dominio (especial atencao em documentation-writer e design-explorer que sao menos obvios).
  - SH-04 aplicado (severity simplificado em agentes nao-criticos sem violar enum canonico).
  - `plan-executor` vs `plan-verifier`: regras anti-degen distintas (executor foca em execucao, verifier em verificacao).

---

<!-- Gerado por /plan-feature em 2026-05-22 -->

# Memoria: Plano 04 — Orquestradores (handler generico, blast radius crescente)

**Feature:** v6.1.0 — Contrato de Subagentes v1
**Iniciado:** 2026-05-14
**Status:** CONCLUIDO (4/4 fases concluidas — fase-01, fase-02, fase-03, fase-04 verdes)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** `withRetry` exposto como funcao top-level em `skills/lib/subagent-contract.ts` (NAO wrapper sobre parseAndDispatch). Assinatura: `withRetry<T extends SubagentContractBase>(invoke: InvokeFn<T>, opts?: RetryOpts): Promise<T>`. Generic preserva tipo concreto do contrato (audit/verification/proposal/mutation) — sem `as` no consumidor.
- **DI-2 (fase-01):** `withRetry` colocado ANTES de `parseAndDispatch` no arquivo (dependencia logica: retry wrapper nao precisa do dispatcher, mas orquestrador usa ambos juntos).
- **DI-3 (fase-01):** Cap absoluto `max=1` default. Segundo `needs_retry` escala para `needs_human` com reasoning anotado (` [withRetry: ${max} retries esgotados, escalando para humano]`). RF-SH-03 configurabilidade fica para v6.2.
- **DI-4 (fase-02):** `consolidateProposals` usa `parseContract` (nao `parseAndDispatch`) porque so precisa do contrato validado tipado — sem dispatch de handler. `parseAndDispatch` requer handlers explicitamente e retorna `DispatchResult` (sem contrato direto), o que tornaria a extracao de `payload.proposal` mais complexa sem ganho real neste caso de uso.
- **DI-5 (fase-02):** Tipo `ProposalPayload` definido como alias de `ProposalContract['payload']['proposal']` — garante que o tipo permanece sincronizado com o schema sem duplicar definicao.
- **DI-6 (fase-04):** Bloco "## Delegacao Opcional a Auditores" inserido APOS `<context>` e ANTES de `## Modulo a revisar` — posicionamento: documentacao de extensao nao deve interromper o fluxo de execucao principal (instructions/checklist/report-template). O dev que executa o fluxo default (checklist inline) nunca ve o bloco de delegacao antes de completar o fluxo.
- **DI-7 (fase-04):** Provenance comment HTML adicionado no TOPO do arquivo (antes do frontmatter YAML), nao dentro do frontmatter — parsers de frontmatter ignoram HTML comments fora do bloco `---`, evitando quebra de parse.
- **DI-8 (fase-04):** Nota "context:fork overhead" adicionada na secao "Quando manter inline" — Agent dentro de fork spawna sub-fork, overhead de contexto nao documentado antes. Util para Plano 05 fixture CI decidir se o teste de integracao anti-vibe-review deve usar delegacao ou nao.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.

- **BUG-P04-02-01 (fase-02):** Spec da fase-02 em `Implementacao §Passo 1` cita campos `complexity`, `effort`, `pros`, `cons`, `risks` no tipo `ProposalPayload` — esses campos NAOEXISTEM no schema real (foram recusados em Plano 02 fase-02 BUG-1). Spec ficou desatualizada. Impacto: `index.ts` e testes criados com o shape REAL (titulo/summary/constraints/tradeoffs/recommendation/alternatives). Spec do plano 04 nao e a fonte de verdade para o shape — schema e `subagent-contract.ts` sao.
- **BUG-P04-02-02 (fase-02):** Spec da fase-02 mostra `parseAndDispatch(inv.rawOutput)` sem segundo argumento — assinatura real exige `handlers: KindHandlers` como segundo parametro. Solucao: usar `parseContract` que e a funcao correta para este caso de uso (sem handler dispatch).

<!-- Suspeitos a vigiar:
- BUG: telemetria-end nao dispara quando handler throw — preservar try/catch da skill, nao do handler
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.

- **GT-01 (fase-01):** O spec da fase referenciava `SubagentContractV1` como tipo de retorno de `InvokeFn` — esse tipo NAO existe. O tipo correto e `SubagentContractBase` (base da uniao discriminada exportada em Plano 01 fase-04). Solucao: generic `T extends SubagentContractBase`. Implicacao para fases 02-04: ao ler spec que cite `SubagentContractV1`, traduzir para `SubagentContractBase` (ou union concreta) sem hesitacao.
- **GT-02 (fase-01):** Baseline global de testes mostrou 15 falhas pre-existentes (scaffold perf budget 1101ms>1000ms, state-md tests, etc) — nenhuma relacionada a esta fase. O numero 727 pass citado nas notas do Plano 03 foi de um estado anterior do repo. Decisao: nao bloquear nas fases seguintes em falhas que nao tocam arquivos modificados.
- **GT-03 (fase-01):** `bun run lint` nao configurado no package.json — ausencia pre-existente, nao regressao. Skill especifica lint como criterio mas nao e bloqueante na ausencia de configuracao. Sinalizar em Plano 05 fase-04 (suite CI) se quiser adicionar.
- **GT-04 (fase-02):** Spec da fase-02 cita `SubagentContractV1` em tipos (de `subagent-contract-types`) — esse modulo nao existe. Tipos corretos: `ProposalContract` e `SubagentContractBase` de `'../lib/subagent-contract'`. GT-01 da fase-01 antecipou exatamente isso. Regra: ao ver `SubagentContractV1` em spec, traduzir para `SubagentContractBase` ou union concreta.
- **GT-05 (fase-02):** Anomalia A3 confirmada: Step 3 do SKILL.md ainda usa `subagent_type: "general-purpose"`. Plano 02 fase-02 migrou o PROMPT do design-explorer para emitir contrato v1, mas NAO mudou o subagent_type. O `anti-vibe-coding:design-explorer` como type seria a migracao completa, mas nao foi feita. Documentado com comentario no SKILL.md.
- **GT-06 (fase-04):** git stash reverteu acidentalmente as alteracoes desta fase durante verificacao de regressao (stash/pop conflitou com fixtures modificados por outros processos). Solucao: reescrever arquivo inteiro via Write tool apos confirmar conteudo desejado. Licao: em repos com muitos arquivos modificados por processos concorrentes, evitar git stash em verificacoes de baseline — usar git diff direto no arquivo modificado.
- **GT-07 (fase-04):** Anomalia G-P04-04 confirmada e RESOLVIDA: anti-vibe-review nao migrou para subagentes obrigatorios em v6.1.0. Decisao deliberada — checklist inline preservado. Para v6.2 considerar: vale a pena unificar com verify-work ou ele e diferente por design (educacional vs CI)? Plano 05 fase-04 fixture CI precisa saber: anti-vibe-review hoje nao invoca subagentes no fluxo default.
- **GT-08 (fase-04):** Suite de testes em baseline anterior mostrava 5 fail (sem alteracoes desta fase) vs 2 fail pos-fase-04 — as alteracoes desta fase MELHORARAM a baseline (testes EBUSY/Windows lock sao intermitentes e nao relacionados a anti-vibe-review). O fail remanescente (harness-validate v6-path-whitelist) e pre-existente e fora do escopo desta fase.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.

- **DEV-1 (fase-02):** Spec da fase-02 em `##Implementacao §Passo 1` usa campos `complexity/effort/pros/cons/risks` no `ProposalPayload` e mostra `import type { SubagentContractV1 } from '../lib/subagent-contract-types'`. Esses sao campos OBSOLETOS (Plano 02 fase-02 BUG-1 estabeleceu o shape canonico com constraints/tradeoffs/recommendation/alternatives). A spec ficou desatualizada — o shape REAL foi derivado do schema em `agents/_contract/v1.schema.json` e dos tipos em `skills/lib/subagent-contract.ts` (fonte de verdade, nao o spec do plano). `ProposalPayload` foi definido como alias de `ProposalContract['payload']['proposal']` para prevenir regressao futura.
- **DEV-2 (fase-02):** `Promise.allSettled` NAO esta em `consolidateProposals` — a funcao e sincrona e processa rawOutput ja resolvido. `Promise.allSettled` pertence ao orquestrador que invoca `invokeDesignExplorer()` em paralelo. `consolidateProposals` e a etapa de consolidacao pos-invocacao. Spec era ambigua sobre onde `allSettled` deveria viver — decisao: na camada de invocacao (fora do escopo desta funcao), nao na consolidacao.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 1 (fase-02: shape ProposalPayload e uso de parseContract vs parseAndDispatch) |
| Bugs encontrados | 2 (BUG-P04-02-01, BUG-P04-02-02) |
| Retries necessarios | 0 |
| Testes adicionados (fase-01) | 7 (4 withRetry + 3 integracao execute-plan) |
| Testes adicionados (fase-02) | 7 (consolidateProposals: ordem, determinismo, kind errado, needs_human, payload, human_readable, JSON invalido) |
| Testes adicionados (fase-03) | suite geral (audit-consolidator coberto por testes integrados verify-work) |
| Testes adicionados (fase-04) | 0 (skill e markdown puro — TDD via grep assertions) |
| Commits gerados | 4 (a0d743c fase-01, a7fdd1f fase-02, 23a1ad3 fase-03, d56ad2e fase-04) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 05) PRECISA saber antes de comecar.
O subagente do Plano 05 le este campo.

### Plano 05 precisa saber:

- **withRetry:** `import { withRetry } from '../lib/subagent-contract'` — assinatura `withRetry<T extends SubagentContractBase>(invoke: InvokeFn<T>, opts?: RetryOpts): Promise<T>`. Default max=1.
- **invokeAndConsolidate:** `import { invokeAndConsolidate } from '../verify-work/lib/audit-consolidator'` — signature `Array<{ agent: string; invoke: () => Promise<string> }> => Promise<AuditConsolidation>`.
- **anti-vibe-review nao invoca subagentes no fluxo default (v6.1.0):** Checklist inline preservado. allowed-tools agora inclui Agent/Bash para opt-in futuro. Fixture CI do Plano 05 deve mockar o fluxo default (sem spawn), nao o delegado.
- **Grep assertions para CI (Plano 05 fase-01):** `grep -n "Agent, Bash" skills/anti-vibe-review/SKILL.md` → 1; `grep -n "## Delegacao Opcional" skills/anti-vibe-review/SKILL.md` → 1; `grep -n "Reasoning dos auditores" skills/anti-vibe-review/SKILL.md` → >=1.
- **Auditores subset anti-vibe-review (quando delegacao usada):** security-auditor, code-smell-detector, tdd-verifier (3 de 8 do verify-work). Secoes 3, 5, 6, 7 do checklist ainda dependem de inline.
- **harness:validate falhas pre-existentes:** broken-links em plano05 e plano01, every_agents.md sem H1 — nao bloqueantes para esta feature. Plano 05 deve resolver ou documentar como won't-fix.

### Anomalias detectadas durante planejamento (a confirmar na execucao)

- **A1 — Caminho real do helper generico:** Plano 01 fase-04 cria `skills/lib/subagent-contract.ts` mas o arquivo AINDA NAO EXISTE no codebase (`Glob skills/lib/subagent-contract*` retorna vazio em 2026-05-14). fase-01 deste plano deve confirmar o nome do export usado por Plano 01 fase-04 (`parseAndDispatch` e o nome assumido pelo PLAN overview Plano 01 §Produz para).
- **A2 — anti-vibe-review nao chama subagentes hoje:** Leitura de `skills/anti-vibe-review/SKILL.md` mostra um `<checklist>` markdown inline avaliado pelo orchestrator (Claude direto), nao subagentes spawn. fase-04 deste plano teve que ajustar o escopo: nao "substituir parsing custom" e sim "preparar terreno para invocacao de subagentes quando aplicavel + nao quebrar fluxo atual". Confirmar com dev se aceita esse escopo reduzido em v6.1.0 ou se quer empurrar parte para v6.2.
- **A3 — design-twice ja usa "general-purpose" subagent type, nao agentes do plugin:** `subagent_type: "general-purpose"` no Step 3 do design-twice. O agente `design-explorer.md` e usado como PROMPT TEMPLATE, nao como subagent type. Apos Plano 02 fase-02 migrar `design-explorer.md` para emitir contrato v1, fase-02 deste plano deve confirmar que o prompt e injetado no `general-purpose` corretamente — ou se Plano 02 fase-02 mudou para `subagent_type: "anti-vibe-coding:design-explorer"`. Decisao depende do que Plano 02 entregar.
- **A4 — verify-work invoca ate 8 auditores fixos + domain-specific:** Leitura confirma — `tdd-verifier`, `security-auditor`, `code-smell-detector` (fixos) + `api-auditor`, `react-auditor`, `database-analyzer`, `infrastructure-auditor`, `solid-auditor` (condicionais por arquivo modificado). fase-03 sizing de 2h assume todos os 8 — se config desabilitar metade, fase fica mais curta na execucao.
- **A5 — verify-work e anti-vibe-review tocam arquivos diferentes:** `skills/verify-work/SKILL.md` e `skills/verify-work/lib/adherence-checks.ts` vs `skills/anti-vibe-review/SKILL.md` puro. PODERIAM rodar em paralelo, mas o README do plano explicita por que NAO paralelizamos (anti-vibe-review replica padrao consolidado em verify-work — derisking).

---

<!-- Atualizado automaticamente durante execucao -->

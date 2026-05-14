---
slug: v6.1.0-subagent-contract
date: 2026-05-14
status: draft
requires: []
unblocks: [init-migration-mode, v6.3.0-adaptive-coaching]
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão).
Exemplo: `// 2026-05-14 (Luiz/dev): campo reasoning obrigatório — alinhado com PRD §Decisões #3`
-->

# PRD: Contrato de Subagentes v1 (v6.1.0) — Eixo 1 Agent-Native

**Status:** Draft
**Author:** Luiz + AI
**Date:** 2026-05-14
**Context:** ./INVENTORY.md (estado atual mapeado), `docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md` (consumer futuro que aguarda este contrato)
**Reference:** Every guide — "Agent-native Architectures" (5 princípios; aqui aplicamos o subset do Eixo 1)

---

<!-- Guia MoSCoW:
  Must Have: Sem isso a feature nao tem valor. Maximo 40% dos requisitos.
  Should Have: Importante mas nao bloqueia a primeira entrega.
  Could Have: Nice-to-have. Apenas se sobrar tempo.
  Won't Have: Explicitamente excluido DESTA versao. Evita scope creep.
-->

## Problema

Hoje 11 dos 13 subagentes do plugin retornam **markdown com enum de domínio próprio** — cada um inventou seu vocabulário (`SECURE/VULNERABILITIES_FOUND/CRITICAL_ISSUES` vs `OPTIMIZED/ISSUES_FOUND/PERFORMANCE_RISK` vs `COMPLIANT/NON-COMPLIANT/PARTIALLY_COMPLIANT` etc — ver `./INVENTORY.md` tabela principal). Consequências concretas:

1. **Orquestrador genérico é impossível.** Skills consumidoras (`design-twice`, `execute-plan`, `verify-work`, `anti-vibe-review`) precisam de parsing custom por auditor — regex em markdown + mapeamento de enum. Adicionar 1 auditor novo = N pontos de mudança em N orquestradores.
2. **Decisão presa dentro da tool.** O guia Every chama isso de *"workflow-shaped tools — bundles judgment into the tool"*. Quando `security-auditor` decide que algo é `CRITICAL_ISSUES`, o orquestrador (que tem contexto do projeto inteiro, do escopo do PR, das prioridades) não pode revisitar. Severidade absoluta cozida no prompt do auditor não conhece contexto.
3. **Sem reasoning livre.** Se um auditor observa algo fora do schema esperado, não tem onde colocar. Anti-pattern Every: *"Defensive tool design — over-constrains tool inputs"*. Informação valiosa é descartada porque não cabe nas 3 categorias do enum ou nas 8 seções fixas do `design-explorer`.
4. **Completion signal implícito.** Hoje o orquestrador infere "subagente terminou" por parse bem-sucedido de markdown. Não existe sinal lifecycle explícito — `needs_retry` vs `needs_human` vs `blocked` vs `complete` é detectado por heurística (presença de palavra-chave, formato). Anti-pattern Every: *"Heuristic completion detection — fragile"*.
5. **Débito acumula no /init.** A próxima skill grande (`/init` migration mode, PRD ativo em `2026-05-14-init-migration-mode/`) já planeja Reconciler/Explorer/Compound como mais 3 subagentes sob o padrão velho. Se shippar antes do contrato v1, herda o débito e força retrofit.

O ponto de virada agora é deliberado: definir contrato canônico, migrar os 13 + 4 consumidores numa janela curta (estimativa: 2-3 dias focados, ver INVENTORY §"Escopo estimado"), e fazer o `/init` nascer já conforme.

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- Qualquer skill consumidora consegue invocar **qualquer subagente** e parsear o output via **um único contrato**, sem regex por auditor.
- O orquestrador sempre sabe se deve **prosseguir, re-tentar, escalar pra humano, ou abortar** — via campo `status` lifecycle explícito, independente do domínio.
- Todo subagente tem espaço pra dizer **"vi algo que seu schema não previu"** (campo `reasoning` livre obrigatório).
- O contrato distingue **kind de operação** (`audit`, `mutation`, `proposal`, `verification`) — orquestrador escolhe handler por kind, não por nome do agente.
- Adicionar um auditor novo = **zero mudança** em orquestradores genéricos. Skills especializadas continuam podendo ler campos específicos do `payload`.
- Mudar **comportamento** de um auditor = editar prompt em arquivo versionado (Every: *"To change behavior, do you edit prompts or refactor code?"* → resposta deve ser **prompt**).

### Mecanismo (algorítmico — o COMO)

**Contrato v1 — shape canônico:**

```json
{
  "contract_version": "1.0",
  "agent": "security-auditor",
  "kind": "audit",
  "status": "complete" | "needs_retry" | "needs_human" | "blocked",
  "reasoning": "Texto livre. O agente descreve o que observou, inclusive coisas fora do payload esperado. Obrigatório, mínimo 1 frase.",
  "payload": { /* shape específico por kind, ver §Decisões #5 */ },
  "human_readable": "Markdown opcional para apresentação ao operador",
  "metadata": {
    "run_id": "uuid",
    "duration_ms": 0,
    "model": "sonnet"
  }
}
```

**Distinção crítica — dois eixos de status que coexistem:**

- `status` (campo top-level): **lifecycle** — diz ao orquestrador o que fazer agora (continuar / re-tentar / escalar / abortar).
- `payload.domain_status` (dentro do payload, opcional por kind): **domínio** — diz o que o agente encontrou no domínio dele (security: `vulnerabilities_found`; tdd: `non_compliant`). Não confundir com lifecycle.

**Migração em 5 ondas, em branch isolado** (big-bang externo: main só recebe v6.1.0 quando todas as ondas estão verdes; ondas internas dão checkpoint sem dual-contract):

1. **Onda 1 — Definir e documentar contrato.** ADR + JSON schema + documento canônico. Sem refactor ainda.
2. **Onda 2 — Migrar 3 auditores piloto** (`security-auditor`, `plan-verifier`, `design-explorer`). Cobrem 3 padrões diferentes: enum domínio markdown, JSON parcial, schema rígido longo. Validam contrato contra os 3 padrões.
3. **Onda 3 — Migrar os 10 restantes.** Aplicação mecânica do template validado na Onda 2.
4. **Onda 4 — Migrar 4 orquestradores em ordem de superfície crescente:** `execute-plan` (consumidor único de plan-verifier/plan-executor — menor blast radius) → `design-twice` (3 invocações paralelas de design-explorer) → `verify-work` (até 8 auditores paralelos) → `anti-vibe-review` (maior superfície, último). Substitui parsing custom por handler genérico.
5. **Onda 5 — Validar via fixtures.** Cada skill consumidora roda 1× contra repo-mock; snapshot do output JSON entra em git como contrato de regressão.

Ondas 2-4 são sequenciais (cada uma precisa da anterior validada). Onda 5 roda em paralelo da Onda 4 — fixtures podem ser preparadas enquanto código muda.

---

## Fluxos por Ator

### Skill consumidora (caso típico — `verify-work` rodando audit em paralelo)

1. Invoca `Task` tool com `subagent_type: "anti-vibe-coding:security-auditor"`.
2. Recebe JSON conforme contrato v1.
3. Lê `status` → decide próximo passo:
   - `complete` → consolida no relatório.
   - `needs_retry` → invoca de novo com prompt ajustado (max 1 retry).
   - `needs_human` → empilha pergunta pro operador antes de consolidar.
   - `blocked` → reporta blocker ao operador, não consolida.
4. Lê `payload.issues[]` (para auditors) ou `payload.checks[]` (para verifications).
5. Lê `reasoning` — anexa ao relatório como contexto rico (auditor pode ter visto algo fora do escopo).

### Operador (humano)

1. Roda skill (ex: `/verify-work`).
2. Recebe relatório consolidado com seção "Reasoning dos auditores" — frases livres dos subagentes, separadas das findings estruturadas.
3. Quando algum auditor retorna `needs_human`, recebe pergunta direta antes de fechar.

### Autor de subagente novo

1. Escreve prompt em `agents/{nome}.md` (já é o padrão).
2. Declara `kind` no frontmatter.
3. Output do prompt instrui o agente a emitir JSON conforme contrato v1 — template/exemplo vem do documento canônico.
4. Adiciona fixture de teste em `agents/__fixtures__/{nome}/` (entrada + output esperado).

---

## Requisitos Funcionais

### Must Have (5/13 = 38%)

- [ ] **RF-MH-01:** Documento canônico do contrato em `docs/design-docs/subagent-contract-v1.md` + JSON schema em `agents/_contract/v1.schema.json`. ADR associado em `docs/design-docs/ADR-NNNN-subagent-contract.md` documentando alternativas rejeitadas.
- [ ] **RF-MH-02:** Todos os 13 subagentes (`agents/*.md`) emitem output conforme contrato v1, com campos obrigatórios (`contract_version`, `agent`, `kind`, `status`, `reasoning`, `payload`).
- [ ] **RF-MH-03:** Os 4 orquestradores principais (`design-twice`, `execute-plan`, `verify-work`, `anti-vibe-review`) parsam via handler genérico baseado em `kind`, sem regex/parser específico por auditor.
- [ ] **RF-MH-04:** Campo `status` é lifecycle padronizado (`complete | needs_retry | needs_human | blocked`) — domínio fica em `payload.domain_status` opcional. Validador rejeita uso de enum de domínio em `status` top-level.
- [ ] **RF-MH-05:** Campo `reasoning` é obrigatório, mínimo **20 caracteres**. Validador **rejeita** output com `reasoning` ausente, vazio ou < 20 chars (erro `REASONING_TOO_SHORT`). Validador **emite warning** quando `reasoning` < 50 chars (sinal de prompt subóptimo — agente não está usando o campo, só passando o pano).

### Should Have

- [ ] **RF-SH-01:** Fixtures de regressão em `agents/__fixtures__/{nome}/` (1 cenário por subagente, snapshot do JSON esperado). Rodam em CI.
- [ ] **RF-SH-02:** Helper TS em `skills/lib/subagent-contract.ts` com parser/validador do contrato v1 — reuso entre orquestradores.
- [ ] **RF-SH-03:** Política de retry padrão: orquestrador re-invoca 1× quando `status === "needs_retry"`, depois escala. Configurável por skill.
- [ ] **RF-SH-04:** Documento canônico inclui **migration guide para autores de subagentes** — como portar um agente existente em <30min.
- [ ] **RF-SH-05:** Validador roda como hook pre-commit em arquivos `agents/*.md` (verifica que prompt instrui emissão de contrato v1).

### Could Have

- [ ] **RF-CH-01:** Campo `metadata.cost_tokens` opcional emitido por subagentes que sabem medir.
- [ ] **RF-CH-02:** CLI debug (`bun run agent:simulate {nome}`) que invoca subagente isolado e valida output contra schema.
- [ ] **RF-CH-03:** Versionamento de contrato — quando v2 surgir, subagentes declaram `contract_version` e orquestradores escolhem handler.

### Won't Have (desta versão)

- **Eixo 2 — princípios adaptativos no projeto do usuário** (parity audit, CRUD audit, dynamic capability discovery, mobile checkpointing, emergent capability coaching). Vira v6.3.0+, condicionado a `detect-architecture` por stack.
- **Backwards-compat com contrato antigo.** Migração é big-bang dentro de v6.1.0 — não mantemos parsers velhos. Razão: 13 agentes é pequeno o suficiente pra migrar junto; manter dois contratos = débito permanente.
- **Self-modification de prompts pelo agente.** Prompts continuam human-curated.
- **Dashboard/UI de telemetria de subagentes.** `metadata.duration_ms` fica em logs; sem visualização.
- **Refator do `documentation-writer` para contrato write-side dedicado.** Em v6.1.0 ganha **apenas o envelope cosmético** (`kind: "mutation"`, `status`, `reasoning`) — o `payload.mutation` é **stub** (placeholder permitindo qualquer shape). Spec real do mutation payload (dry-run, diff preview, conflict resolution model) fica pra v6.2. Registrado em `TODO.md` como `{feature:plugin} v6.2 — definir spec real do mutation payload`.

---

## Requisitos Nao-Funcionais

- **Performance:** Validação de contrato (parser JSON + check de schema) em <10ms por output. Sem impacto perceptível no tempo total da skill consumidora.
- **Custo:** Migração não aumenta token budget de operação — payload JSON é comparável a markdown em tamanho. Subagentes podem ficar **mais econômicos** se markdown verboso for substituído por payload conciso + reasoning curto.
- **Confiabilidade:** Não-determinismo do LLM ao emitir JSON é mitigado por: (a) prompts com exemplo de output completo; (b) parser tolerante a whitespace/trailing-commas; (c) retry com prompt reduzido em `JSON.parse` failure (separado do `needs_retry` semântico — esse é falha mecânica).
- **Observabilidade:** `metadata.run_id` + `metadata.duration_ms` em todo output. Audit log opcional em `discovery/agents-log.json` (alinhado com /init PRD §RF-SH-03).
- **Seguranca:** Subagentes não devem incluir conteúdo de arquivo cru no `payload` se contiver secrets. Validador rejeita patterns conhecidos (`API_KEY=...`, etc) — defesa-em-profundidade.
- **Idempotência:** Mesmo input → mesmo `kind` + `status` + estrutura de `payload`. `reasoning` pode variar (LLM-gerado livre); orquestrador não depende de igualdade de reasoning.

---

## Decisoes Tecnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Formato de output | JSON estruturado + `human_readable` opcional | Markdown puro / JSON sem markdown | JSON parseável é requisito do contrato genérico; markdown opcional preserva apresentação humana sem custo. |
| 2 | Granularidade do `status` | Lifecycle padronizado (4 valores) + `payload.domain_status` separado | Status único de domínio / Sem status / Lifecycle livre | Eixo único força confusão (lifecycle vs domínio). Padronizar lifecycle permite orquestrador genérico; domínio permanece expressivo. |
| 3 | Campo `reasoning` | Obrigatório, não-vazio, prosa livre | Opcional / Estruturado em sub-fields / Ausente | É o escape hatch que destrava granularity (Every: *"agent can say things you didn't schema"*). Obrigatoriedade força agentes a usar; opcional vira sempre vazio. |
| 4 | `kind` enum | `audit \| mutation \| proposal \| verification` | Sem kind / Por agente / Mais granular | 4 valores cobrem os 13 agentes hoje. `audit` (10), `verification` (1: plan-verifier), `proposal` (1: design-explorer), `mutation` (1: documentation-writer). Extensível por v2. |
| 5 | Shape do `payload` por kind | Schema declarado em `agents/_contract/v1.schema.json` (oneOf por kind) | Payload livre / Schema por agente | Schema por kind permite handler genérico; payload livre quebra contrato; schema por agente reintroduz parsing N. |
| 6 | Migração — estratégia | Big-bang dentro de v6.1.0, em 5 ondas sequenciais, **em branch isolado até Onda 5 verde** | Incremental com backwards-compat / Por skill consumidora / Merge incremental por onda | 13 agentes é pequeno; manter parser velho = débito permanente. Branch isolado evita que main fique meio-migrado durante a janela. Ondas dão checkpoint sem dual-contract. |
| 7 | Versionamento futuro | `contract_version` no payload; v2 quando preciso | Sem versão / Semver completo / Schema-by-date | Campo declarativo permite v2 coexistir com v1 quando hora vier. Sem custo hoje. |
| 8 | Localização do schema | `agents/_contract/v1.schema.json` + doc em `docs/design-docs/subagent-contract-v1.md` | Inline no AGENTS_LIST.md / No SKILL.md de cada skill | Schema próximo dos agentes (pasta `agents/`) facilita autoria; doc em design-docs é canônico. |
| 9 | Retry policy default | 1 retry em `needs_retry`, depois escala pra `needs_human` | Sem retry / Retry infinito / Configurável obrigatório | 1 retry cobre flakes; mais vira loop ruim. Configurável fica como SH (RF-SH-03). |
| 10 | Reasoning curto/vazio | Validador **rejeita** < 20 chars; **warning** < 50 chars | Permitir vazio / Apenas warn / Apenas rejeitar vazio | Obrigatoriedade técnica força mudança de hábito; threshold em 2 níveis distingue "agente quebrou contrato" (rejeita) de "agente está usando mal" (warning, sinal pra ajustar prompt). |

---

## Criterios de Aceite

- [ ] **CA-01:** Dado um audit de `security-auditor` rodando contra fixture, então o output é JSON válido contendo `contract_version: "1.0"`, `agent: "security-auditor"`, `kind: "audit"`, `status: "complete"`, `reasoning` não-vazio, `payload.issues[]`.
- [ ] **CA-02:** Dado um output de subagente com `reasoning: ""` ou < 20 chars, então o validador rejeita com erro `REASONING_TOO_SHORT`. Dado `reasoning` entre 20 e 49 chars, então o validador **passa** mas emite warning `REASONING_LIKELY_WEAK` (não bloqueia, sinal pra ajustar prompt).
- [ ] **CA-03:** Dado um output usando enum de domínio (`status: "VULNERABILITIES_FOUND"`) no campo top-level `status`, então o validador rejeita com erro `INVALID_LIFECYCLE_STATUS` — sugere mover pra `payload.domain_status`.
- [ ] **CA-04:** Dado um orquestrador (ex: `verify-work`) invocando 5 auditores em paralelo, então parsa todos via handler único baseado em `kind`, sem código específico por nome de auditor.
- [ ] **CA-05:** Dado `status: "needs_retry"`, então o orquestrador re-invoca 1× e escala pra `needs_human` se retry também retornar `needs_retry`.
- [ ] **CA-06:** Dado um subagente novo `foo-auditor` sendo adicionado, então ele entra em `verify-work` automaticamente via handler genérico de `kind: "audit"` — sem mudança no código de `verify-work`.
- [ ] **CA-07:** Dado o conjunto de 13 fixtures (1 por subagente), então `bun test agents:contract` passa em todas.
- [ ] **CA-08:** Dado o PRD do `/init` (`docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md`), então `requires` aponta para `v6.1.0-subagent-contract` e o Reconciler/Explorer/Compound do /init declaram emissão de contrato v1.
- [ ] **CA-09:** Dado a doc canônica (`docs/design-docs/subagent-contract-v1.md`), então contém: shape do contrato, schema JSON inline ou referência, migration guide pra autor de subagente, exemplo de output para cada `kind`.
- [ ] **CA-10:** Dado `harness-validate.mjs` rodando, então valida que todo `agents/*.md` instrui emissão de contrato v1 (regex/heurística contra prompt do agente).

---

## Out of Scope

- **Eixo 2 (princípios adaptativos no projeto do usuário):** parity audit, CRUD audit, dynamic capability discovery, mobile checkpointing, emergent capability coaching. Roadmap em v6.3.0+, dependente de `detect-architecture`.
- **Refactor do `documentation-writer`:** ganha `kind: "mutation"` cosmético, mas detalhes de payload mutation ficam pra v6.2.
- **Audit de skills que NÃO invocam subagentes** (ex: `quick-plan`, `lessons-learned`, `decision-registry`). Continuam funcionando como hoje.
- **Mudança no `Task` tool / `isolation: "fork"`:** continuamos usando como hoje. Esta versão é sobre **contrato de saída**, não sobre mecânica de invocação.
- **Telemetria/observabilidade unificada:** `metadata.duration_ms` fica em log local; dashboard fica fora.

---

## Dependencias

| Tipo | Dependência | Status |
|------|-------------|--------|
| Feature pré-requisito | `Task` tool com `isolation: "fork"` | já disponível |
| Lib existente | `skills/lib/model-profile-utils.md` (resolução de model por profile) | mantida — afeta `metadata.model` |
| Script existente | `scripts/harness-validate.mjs` | precisa extensão pra checar contrato em `agents/*.md` |
| Lib nova | `skills/lib/subagent-contract.ts` (parser + validador) | a criar |
| Schema novo | `agents/_contract/v1.schema.json` (JSON schema) | a criar |
| Doc novo | `docs/design-docs/subagent-contract-v1.md` | a criar |
| ADR novo | `docs/design-docs/ADR-NNNN-subagent-contract.md` | a criar |
| Fixtures novas | `agents/__fixtures__/{nome}/{input.json, expected-output.json}` | a criar (13 fixtures) |
| Skill desbloqueada | `init` (`docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md`) | aguarda este contrato; `requires` será atualizado |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Migração big-bang quebra skills em uso real durante a janela de transição | média | alto | Ondas curtas e sequenciais (cada uma roda contra fixtures antes de avançar). Branch isolado até Onda 5 fechar. Sem release intermediário público. |
| LLM emite JSON malformado (não-determinismo) | alta | médio | Prompts com exemplo completo de output; parser tolerante (whitespace, trailing-comma); retry mecânico em parse failure separado de retry semântico. |
| Campo `reasoning` vira dump de texto desorganizado | média | médio | Migration guide instrui forma (1-3 frases, foco em "o que vi fora do schema"). Fixture inclui exemplo bom. Compound note futuro se padrão ruim emergir. |
| Versionamento de contrato (`contract_version`) vira over-engineering — v2 nunca chega | alta | baixo | Campo existe mas é fixo `"1.0"` por enquanto. Sem código de seleção de versão. Custo zero hoje. |
| Subagente expõe secrets no `reasoning` ou `payload` por descuido | baixa | alto | Validador rejeita patterns conhecidos (`API_KEY=`, `SECRET=`, `PASSWORD=`). Documentado em migration guide. |
| Distinção lifecycle vs domain_status confunde autores de subagente | média | médio | Migration guide com exemplos contrastantes; validador rejeita uso errado com mensagem que sugere correção. |
| Onda 5 (fixtures) atrasa e perde valor de regressão | média | médio | Fixtures preparadas em paralelo da Onda 4 (mesma sessão). Cada subagente migrado tem sua fixture commitada junto. |
| `/init` PRD precisa ser ajustado para `requires: v6.1.0-subagent-contract` e ainda não foi | baixa | baixo | Edit pequeno (1 linha no frontmatter + 1 nota no §Wont Have). Fazer junto com merge do ADR. |
| Big-bang em 4 orquestradores quebra `verify-work` que é skill chave do pipeline | média | alto | Onda 2 já migra `plan-verifier` como piloto (auditor JSON quase pronto). Onda 4 segue ordem de superfície crescente — `execute-plan` (consumidor único de plan-verifier/plan-executor, menor blast radius) → `design-twice` (3 invocações paralelas) → `verify-work` (até 8 paralelos) → `anti-vibe-review` (maior superfície). Cada step da Onda 4 valida contra fixtures antes do próximo. |

---

## Critérios de Encerramento (Definition of Done)

- [ ] ADR aprovado e commitado.
- [ ] Documento canônico publicado em `docs/design-docs/subagent-contract-v1.md`.
- [ ] JSON schema em `agents/_contract/v1.schema.json` referenciado pelo validador.
- [ ] 13 subagentes emitindo contrato v1; 13 fixtures verdes no CI.
- [ ] 4 orquestradores usando handler genérico; nenhum parser específico por agente em código.
- [ ] `harness-validate.mjs` checa prompts de subagente.
- [ ] PRD do `/init` atualizado com `requires: v6.1.0-subagent-contract`.
- [ ] `CHANGELOG.md` entrada para v6.1.0 com link pro ADR.
- [ ] **Branch isolado mantido durante Ondas 1-4; merge to main só depois da Onda 5 verde** (todas as 13 fixtures passando + 4 orquestradores integrados). Sem release intermediário público.
- [ ] Lesson compound em `docs/compound/` se migração revelar padrão durável (ex: "reasoning field forçou auditores a notar coisas que enum não cabiam — manter obrigatoriedade").

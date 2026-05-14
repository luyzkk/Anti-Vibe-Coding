# Plano 04: Orquestradores (handler generico, blast radius crescente)

**Feature:** v6.1.0 — Contrato de Subagentes v1 ([PLAN overview](../PLAN.md), [PRD](../PRD.md))
**Fases:** 4
**Sizing total:** ~7h
**Depende de:** Plano 03 (13/13 agentes emitindo envelope v1, `bun test agents:contract` verde, fixtures consolidadas)
**Desbloqueia:** Plano 05 fase-01 (`harness-validate` extension) e fase-04 (suite CI completa) — todas as skills consumidoras ja usam handler generico quando Plano 05 ativa pre-commit hook.

---

## O que este plano entrega

Os 4 orquestradores principais (`execute-plan`, `design-twice`, `verify-work`, `anti-vibe-review`) parseando subagentes via **um unico handler `parseAndDispatch()` baseado em `kind`**, sem regex/parser custom por nome de auditor. Ordem deliberada por blast radius crescente — fase-01 funciona como mini-tracer-bullet em producao real (execute-plan tem consumidor unico, blast radius minimo) antes de escalar para os 8+ auditores paralelos de verify-work/anti-vibe-review. Saida: zero codigo de parsing markdown por-agente em `skills/execute-plan/`, `skills/design-twice/`, `skills/verify-work/`, `skills/anti-vibe-review/` — adicionar um auditor novo passa a custar zero mudanca nas skills (CA-06).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `skills/lib/subagent-contract.ts` com `parseContract()` + `parseAndDispatch()` + retry mecanico JSON.parse + secret-pattern + threshold reasoning | Plano 01 fase-04 | bloqueador — handler generico ja deve existir; este plano apenas CONSOME |
| 13 agentes emitindo envelope v1 (`agents/*.md`) com `contract_version: "1.0"`, `kind`, `status`, `reasoning`, `payload` | Plano 03 fase-05 (consolida com Plano 02 pilotos) | bloqueador — handler espera envelope uniforme |
| 13 fixtures em `agents/__fixtures__/{nome}/{input.json,expected-output.json}` | Plano 03 fase-05 | bloqueador — TDD RED de cada fase deste plano usa fixture real, nao mock inline |
| Regra de mapping dominio→lifecycle publicada (`clean|issues_found|critical` + `needs_retry|blocked|needs_human`) | Plano 02 fase-04 (migration guide v2) | bloqueador — handler consolida `payload.domain_status` no relatorio |
| JSON schema `agents/_contract/v1.schema.json` (oneOf por kind) | Plano 01 fase-03 | bloqueador — validator no Plano 01 fase-04 referencia |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 4 orquestradores limpos de parsing custom (`grep -r "parse markdown\|enum domain" skills/{execute-plan,design-twice,verify-work,anti-vibe-review}/` retorna vazio) | Plano 05 fase-01 (`harness-validate` confirma) |
| Helper de retry `withRetry(needsRetry, max=1)` co-localizado em `skills/lib/subagent-contract.ts` (extraido em fase-01) | Plano 05 (nenhum consumer novo em v6.1.0; pronto para v6.2 / `/init`) |
| Padrao de consolidacao "issues + reasoning + domain_status por auditor" (template do relatorio do verify-work com secao "Reasoning dos auditores") | Plano 05 fase-05 (compound note se padrao durar — "reasoning forcou auditores a notar coisas fora do enum") |
| Fixture de regressao end-to-end: `verify-work` rodando 5+ auditores paralelos contra fixtures consolidadas, JSON consolidado snapshot | Plano 05 fase-04 (CI roda este snapshot) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-execute-plan-handler.md | `skills/execute-plan/` consome `plan-verifier` (kind=verification) e `plan-executor` (kind=verification) via `parseAndDispatch()`; helper `withRetry(needsRetry, max=1)` extraido para `skills/lib/subagent-contract.ts`; regex/markdown parse de status removido; Step 4d le `payload.checks[]` / `payload.domain_status` diretamente | 1.5h | Plano 03 fase-05 |
| 02 | fase-02-design-twice-handler.md | `skills/design-twice/` consome 3 invocacoes paralelas de `design-explorer` via `parseAndDispatch()`; Step 3-4 leem `payload.proposal` estruturado e renderizam tabela; `human_readable` (8 secoes) concatenado APOS tabela; deduplicacao por proposta determinante por indice de input (A/B/C) | 1.5h | fase-01 |
| 03 | fase-03-verify-work-handler.md | `skills/verify-work/` consome ate 8 auditores paralelos (security, react, solid, code-smell, tdd, api, database, infrastructure) via `parseAndDispatch()` filtrando por `kind: "audit"`; consolida `payload.issues[]` em tabela unica + secao nova "Reasoning dos auditores" com `reasoning[]` concatenado por agent; Step 2f deduplicacao por finding (mesmo issue em 2+ agents = mais severo) opera sobre objetos JSON, nao markdown | 2h | fase-02 |
| 04 | fase-04-anti-vibe-review-handler.md | `skills/anti-vibe-review/` consome mesmo conjunto de auditores via `parseAndDispatch()`; replica padrao do verify-work; remove `<checklist>` markdown inline (que e prompt manual do orchestrator) substituindo por delegacao ao handler generico; Step "Como Executar" passos 1-3 substituidos por invocar auditores + parseAndDispatch + ordenar findings | 2h | fase-03 |

**Sizing total:** 1.5 + 1.5 + 2 + 2 = **7h** — alinhado com overview.

---

## Grafo de Fases

```
fase-01 (execute-plan — consumidor unico, mini-tracer-bullet)
    |
    v
fase-02 (design-twice — 3 invocacoes paralelas, kind: proposal)
    |
    v
fase-03 (verify-work — ate 8 auditores paralelos, kind: audit)
    |
    v
fase-04 (anti-vibe-review — replica padrao do verify-work, maior superficie)
```

**Paralelismo possivel:** **Nenhum entre fases.** A ordem por blast radius crescente e deliberada (PRD §Riscos):
- fase-01 valida `parseAndDispatch()` + helper de retry em producao real com 2 agentes (`plan-verifier`, `plan-executor`) antes de escalar.
- fase-02 prova handler em invocacao **paralela** (3x design-explorer) — primeira vez que precisa consolidar resultados que retornam em ordem arbitraria.
- fase-03 escala para 8 auditores paralelos e introduz **deduplicacao** de findings cross-agent.
- fase-04 replica o padrao validado em fase-03 sobre a skill com maior superficie de prompt-markdown (checklist longo + report template).

Embora `verify-work` (fase-03) e `anti-vibe-review` (fase-04) toquem arquivos distintos e PODERIAM tecnicamente rodar em paralelo, **nao paralelizamos** porque: (a) anti-vibe-review **replica** o padrao consolidado em verify-work; rodar antes do verify-work assentar arrisca duplicar bugs; (b) PRD §Riscos explicitamente lista ordem `verify-work → anti-vibe-review`; (c) anti-vibe-review chama subset/superset dos mesmos auditores — confirmado abaixo nos gotchas.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste de integracao que invoca handler contra fixture do agente
        relevante (vinda do Plano 03 fase-05); teste falha porque a skill ainda parsa
        markdown ou porque handler ainda nao consolida campo X que a skill precisa.
2. GREEN: substituir parsing custom da skill por chamada a parseAndDispatch();
          mapear retorno (status/kind/payload) para o shape que a skill ja consumia
          (relatorio, decisao de retry, consolidacao).
3. REFACTOR: remover codigo morto (regex de markdown, mapeamento de enum domain),
            consolidar prompts inline da skill que ainda instruem formato antigo.
4. VERIFY: bun test skills/{execute-plan|design-twice|verify-work|anti-vibe-review}/
          + grep -r "enum domain\|markdown table parse" skills/{nome}/ retorna vazio.
```

**Tracer Bullet deste plano:** N/A — tracer foi no Plano 01 fase-05. **Mas a fase-01 funciona como mini-tracer-bullet dos orquestradores**: menor blast radius (consumidor unico), valida o handler generico em producao real antes de escalar para invocacoes paralelas (fase-02) e multi-agent (fase-03/04). Se fase-01 expor bug em `parseAndDispatch()` ou no helper de retry, fixamos no helper antes de propagar para os outros 3.

Para fases que tocam SKILL.md (descritivos), o "teste" e duplo:
1. **Integration test em TypeScript** (`skills/{nome}/index.test.ts` ou novo `skills/{nome}/handler.test.ts`) que importa o handler real e roda contra fixtures JSON.
2. **Grep assertion** que confirma remocao de parsing custom: `grep -r "<padrao antigo>" skills/{nome}/` retorna 0.

---

## Gotchas Conhecidos

Herdados dos Planos 01-03 + novos especificos deste plano.

### Herdados dos Planos 01-03 (aplicam aqui)

- **G1 (LLM emite JSON malformado):** Critico — o handler precisa tolerar `JSON.parse` failure com 1 retry mecanico (separado de `needs_retry` semantico). Em fase-03 e fase-04 isso pode acontecer em 1 dos 8 auditores paralelos — o handler degradar graciosamente (registrar "audit incomplete: {agent}") sem derrubar a skill toda. Aplica-se a todas as fases.
- **G2 (lifecycle vs domain_status):** Critico no relatorio do verify-work e anti-vibe-review — `payload.domain_status: "critical"` NAO mapeia para abort. Mapeia para severity CRITICO no relatorio, mas a skill consumidora segue rodando os outros auditores. Apenas `status: "blocked"` em SI mesmo escala para humano. Aplica-se a fase-03, fase-04.
- **G3 (reasoning 20/50 threshold):** O handler ja rejeita <20 chars na fase de parse. Na consolidacao do relatorio (fase-03, fase-04), `reasoning` entre 20-49 entra na secao "Reasoning dos auditores" com tag de warning visual (sinal de prompt subotimo). Nao filtrar; mostrar.
- **G5 (`contract_version: "1.0"` literal fixo):** Handler rejeita outras versoes — em fase-03/04, se um auditor retorna versao diferente (regressao em prompt), skill marca "audit incomplete: {agent}" e segue. Aplica-se a todas as fases.
- **G-P02-01 (mapping dominio→lifecycle nao e 1:1):** Aplicacao concreta no relatorio do verify-work — coluna "Severidade" do relatorio DERIVA de `payload.domain_status` + presenca em `payload.issues[].severity`, NAO de `status` lifecycle. Aplica-se a fase-03, fase-04.

### Novos deste plano

- **G-P04-01 (paralelismo retorna em ordem arbitraria):** Em fase-02 (3x design-explorer) e fase-03 (8x auditores), `Promise.all` resolve na ordem que o LLM responde — nao na ordem que invocamos. Handler de consolidacao deve **ordenar deterministicamente por chave estavel** (em fase-02: indice de input A/B/C; em fase-03/04: nome do agente em ordem alfabetica, ou ordem definida em config). Sem isso, mesma fixture roda 2x e produz relatorios diferentes — testes de snapshot quebram. Aplica-se a fase-02, fase-03, fase-04.

- **G-P04-02 (retry helper e idempotente, mas LLM nao):** `withRetry(needsRetry, max=1)` re-invoca o subagente quando primeira chamada retorna `status: "needs_retry"`. Segunda invocacao recebe o MESMO input — depende do LLM ser nao-deterministicamente "menos travado" na segunda tentativa. Se segunda tambem retornar `needs_retry`, escalar para `needs_human` (PRD §Decisoes #9). NAO loop infinito, NAO retry com prompt modificado em v6.1.0 — isso e RF-SH-03 configurabilidade, fica para v6.2. Cap absoluto: 1 retry. Aplica-se a fase-01 (onde o helper nasce).

- **G-P04-03 (status: complete != payload.domain_status: clean):** Distincao critica para o relatorio. Auditor com `status: "complete"` + `payload.domain_status: "critical"` = "auditor terminou normalmente e achou problemas graves". Auditor com `status: "blocked"` + qualquer payload = "auditor nao conseguiu terminar — operador precisa olhar". A skill consumidora **nao consolida findings de agentes blocked** (payload pode estar incompleto), mas registra no relatorio "Auditor X bloqueou: {reasoning}". Aplica-se a fase-03, fase-04.

- **G-P04-04 (anti-vibe-review chama subset dos auditores do verify-work):** Confirmado pela leitura de `skills/anti-vibe-review/SKILL.md` — anti-vibe-review NAO invoca subagentes externos explicitamente; tem um `<checklist>` markdown inline que o orquestrador (Claude) avalia manualmente. Em v6.1.0 nao mudamos esse comportamento (escopo nao inclui forcar anti-vibe-review a spawn auditores). O que fase-04 entrega: PREPARAR a estrutura para quando o checklist for migrado para auditores em v6.2 — o handler ja le contrato v1. Concretamente: fase-04 mantem checklist inline mas adiciona delegacao opcional aos auditores existentes (security, code-smell, tdd) via `parseAndDispatch()` quando `Agent` tool e invocada — sem forcar 100% migracao. Aplica-se a fase-04 (anomalia que mudou o escopo da fase).

- **G-P04-05 (execute-plan tem consumidor unico, mas DOIS agents):** `plan-verifier` (kind=verification, ja parseava JSON parcial) e `plan-executor` (kind=verification apos Plano 03 fase-03 normalizar lifecycle). Ambos sao `kind: verification` no handler — mesma logica de dispatch. fase-01 valida que `parseAndDispatch()` retorna shape uniforme para ambos e a skill consome via campo `payload.checks[]` (verifier) ou `payload.steps[]` (executor) — handler nao precisa saber a diferenca. Aplica-se a fase-01.

- **G-P04-06 (Comment Provenance em codigo de skill modificado):** `skills/{nome}/index.ts` ou novos arquivos `.ts` chamando `parseAndDispatch()` precisam de comentario com linhagem (autor + data + PRD §Decisoes #...). Aplica-se a todas as fases. Templates ja injetam header de provenance no MEMORY/fase.md.

- **G-P04-07 (telemetria existente nao deve quebrar):** Os 4 SKILL.md tem blocos de telemetria passiva no comeco (`writeTelemetryStart`, `writeTelemetryEnd`). Migrar parsing NAO toca esses blocos — preservar intactos. Adicionar parseAndDispatch entre telemetria-start e telemetria-end. Aplica-se a todas as fases.

---

## Criterio de Aceite (encadeado aos CAs do PRD)

| CA do PRD | Como fase deste plano cobre |
|-----------|----------------------------|
| **CA-04** (orquestrador genérico parsa via handler unico baseado em `kind`) | fase-01, 02, 03, 04 entregam — todas as 4 skills usam `parseAndDispatch()` |
| **CA-05** (retry policy: 1 retry em `needs_retry`, depois escala) | fase-01 implementa `withRetry(needsRetry, max=1)` em `skills/lib/subagent-contract.ts`; fase-02/03/04 consomem |
| **CA-06** (auditor novo entra em `verify-work` sem mudanca de codigo) | fase-03 entrega — handler le `kind: audit` generico; adicionar `agents/foo-auditor.md` com kind=audit funciona sem tocar skill |
| **CA-04 + CA-06 + CA-05 combinados** | grep assertion: `grep -r "regex\|markdown.parse\|enum.domain" skills/{execute-plan,design-twice,verify-work,anti-vibe-review}/` retorna 0 ocorrencias relevantes |

CAs nao cobertos aqui (Plano 05): CA-07 (13 fixtures em CI), CA-08 (init PRD requires), CA-10 (harness-validate).

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->

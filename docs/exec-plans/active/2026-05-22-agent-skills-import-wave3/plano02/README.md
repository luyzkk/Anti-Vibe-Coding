# Plano 02: Prove-It Mode no tdd-verifier

**Feature:** Agent-Skills Import — Wave 3 ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~2h
**Depende de:** Nenhum bloqueador formal (Plano 01 nao toca `tdd-verifier`; podem rodar em paralelo apos PRD aprovado). R-NEW-02: estado pos-Wave-2 do `tdd-verifier` e validado em fase-01 — se Wave 2 nao mergeada, fase-01 PAUSA.
**Desbloqueia:** Plano 04 fase-04 (manifest final consolida checksum do `agents/tdd-verifier.md` modificado + 6 fixtures novos)

---

## O que este plano entrega

Modo `prove-it` opt-in adicionado ao `tdd-verifier`, 3 campos novos no payload (`test_status`, `failing_test_snippet`, `failure_message`), guardrail `already_green` que previne RED falso, 3 fixtures cobrindo cada estado (`red_confirmed`, `already_green`, `inconclusive`). Cobre MH-03, CA-03, CA-04 do PRD. Modo padrao do `tdd-verifier` (invocacao sem `mode:`) NAO e tocado — backward-compat total preservado (Won't-Have: quebrar callers existentes).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD aprovado | `../PRD.md` (status: approved) | pronto |
| Plano 01 | NAO bloqueia (arquivos diferentes — toca `anti-vibe-review` e `verify-work`) | pronto |
| Wave 2 | NAO bloqueia formalmente, mas R-NEW-02 — fase-01 verifica `contract_version` e secoes Wave-2; se estado pre-Wave-2, pausa e alerta dev | a validar em fase-01 |
| Templates de fase/plano/memory | `skills/plan-feature/templates/` | pronto |
| Contract v1 schema | `agents/_contract/v1.schema.json` | pronto (imutavel) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `agents/tdd-verifier.md` com secao `## Prove-It Mode` | Plano 04 fase-04 (manifest final regenera checksum) |
| 6 fixtures novos em `agents/__fixtures__/tdd-verifier/prove-it/` (3 dirs com input + expected-output) | Plano 04 fase-04 (manifest se aplicavel; harness:validate verde) |
| `audit-tdd-verifier.md` (relatorio interno da fase-01) | Documento auditavel para Exit Criteria da Wave |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-auditar-tdd-verifier-estado-atual.md` | `audit-tdd-verifier.md` com 3 secoes (contract version, presenca de secoes Wave-2, decisao proceed/pause) | 0.5h | — |
| 02 | `fase-02-prove-it-mode-tdd-verifier.md` | Secao `## Prove-It Mode` adicionada em `agents/tdd-verifier.md` + 3 campos novos no payload + guardrail | 1h | fase-01 (decisao "prosseguir" registrada) |
| 03 | `fase-03-fixtures-3-estados-prove-it.md` | 6 fixtures novos em `agents/__fixtures__/tdd-verifier/prove-it/{red-confirmed,already-green,inconclusive}/` | 0.5h | fase-02 |

---

## Grafo de Fases

```
fase-01 (auditar estado atual)
    |
    v
fase-02 (adicionar Prove-It Mode + payload + guardrail)
    |
    v
fase-03 (fixtures cobrindo 3 estados)
```

**Paralelismo possivel:** NENHUM. Fases lineares — fase-02 depende da decisao de fase-01 (proceed/pause), e fase-03 depende da secao escrita em fase-02 (fixtures referenciam campos novos do payload).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: grep nao encontra padrao esperado (secao/campo) no arquivo alvo
2. GREEN: edicao cirurgica ou criacao de fixture satisfaz grep
3. REFACTOR: nao aplicavel a markdown/JSON estatico
4. VERIFY: bun run harness:validate + bun run agents:contract + greps especificos
```

**Tracer Bullet deste plano:** N/A — tracer da Wave 3 e o Plano 01. Plano 02 e contribuicao paralela ao tracer principal, focada em capability nova do `tdd-verifier`.

**Notas TDD por fase:**
- fase-01: sem TDD codigo — output e documento markdown auditavel (`audit-tdd-verifier.md`). Verificacao: arquivo existe + 3 secoes + decisao explicita (proceed/pause).
- fase-02: TDD light — RED = grep `## Prove-It Mode` em `tdd-verifier.md` retorna 0 matches; GREEN = grep retorna 1 match; greps adicionais para os 3 campos novos.
- fase-03: TDD pelos criterios de aceite. RED = invocar parser do contract v1 em fixture novo (sem secao no agent ou sem campos) -> falha esperada; GREEN = secao em fase-02 + fixtures criados em fase-03 -> parser valida.

---

## Gotchas Conhecidos

- **G1:** `contract_version` atual em `agents/tdd-verifier.md` linha 78 e `"1.0"` (NAO `"2.0.0"`). fase-01 detecta e decide: se Wave 2 ja mergeada (esperado pos-merge), `2.0.0`; se nao, `1.0` e fase-01 PAUSA o plano com alerta ao dev. Esta e a versao do envelope contract — Plano 02 NAO altera `contract_version`; apenas adiciona campos novos no `payload`, que e tipo `object` aberto no schema v1.
- **G2 (R-NEW-02 do PLAN):** Wave 2 nao foi mergeada (per `PLAN.md` linha 14: "aprovado, planejado, nao mergeado"). Estado intermediario e CERTO no momento atual — fase-01 prevista para PAUSAR. Dev decide: rodar Wave 2 antes, ou aceitar prosseguir sobre estado pre-Wave-2 e revisitar pos-merge.
- **G3:** Linguagem do protocolo `Prove-It Mode` deve enfatizar que o modo NAO sugere fix — apenas prova RED. Confusao tipica: agente escreve teste + tenta corrigir o codigo. Protocolo de 5 passos (PRD Item 2) tem que terminar explicitamente em "para no RED confirmado".
- **G4 (R-02 PRD + DC-7):** Guardrail `already_green` e MANDATORY. Sem ele, se o teste escrito acidentalmente passar (codigo ja correto, teste escrito errado, ou prefix de bug nao reproduz), o agente retornaria `red_confirmed` falso. Comportamento correto: se passa, retornar `test_status: "already_green"` com diagnostico.
- **G5 (backward-compat — CA-10 analogo):** Modo e opt-in via campo `mode: "prove-it"` na invocacao (input.json). Invocacao sem `mode:` mantem comportamento atual de auditoria read-only (Steps "O que verificar" do SKILL.md). Plano NAO altera Steps existentes — apenas ADICIONA secao nova no final do arquivo.
- **G6:** Fixture EXISTENTE em `agents/__fixtures__/tdd-verifier/{input.json, expected-output.json}` NAO deve ser tocada. Subdiretorio `prove-it/` e NOVO. `subagent-contract.test.ts` linha 172 itera lista fixa de FIXTURE_NAMES incluindo `tdd-verifier` — esse teste continua validando o fixture root. Os 3 fixtures novos em subdir nao sao auto-descobertos por esse teste; fase-03 valida via parser explicito ou via teste novo (decisao registrada como DI no MEMORY).
- **G7:** Convencao para `mode: "prove-it"` no `input.json` — escolher entre (a) campo top-level `"mode"` ao lado de `"files"` e `"scope"`; (b) parte do campo `"scope"` (string contendo "mode: prove-it"). Decisao: usar (a) — campo top-level `"mode": "prove-it"`. Razao: scope e linguagem natural; mode e enum operacional, merece campo proprio. Documentar em fase-02 (texto do agent que descreve o input shape).

---

## CAs do PRD cobertos por este plano

| CA | Cobertura | Onde |
|----|-----------|------|
| CA-03 (Prove-It Mode payload com `test_status`, `failing_test_snippet`) | Integral | fase-02 (secao + campos no agent doc) + fase-03 (fixtures provam shape do payload) |
| CA-04 (guardrail `already_green` retorna `test_status: "already_green"` quando codigo ja passa) | Integral | fase-02 (guardrail documentado) + fase-03 (fixture `already-green/` cobre o caso) |

CAs 01, 02, 10 sao cobertos por Plano 01. CAs 05-09 e CA-11 ficam para Planos 03/04.

---

## MH/SH do PRD cobertos por este plano

| Item | Cobertura | Onde |
|------|-----------|------|
| MH-03 (`tdd-verifier.md` tem secao `## Prove-It Mode` com protocolo + 3 campos no payload + guardrail) | Integral | fases 02 + 03 |

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

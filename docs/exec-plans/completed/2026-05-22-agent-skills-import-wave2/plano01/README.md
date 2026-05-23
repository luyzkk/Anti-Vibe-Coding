# Plano 01: Tracer Bullet — Schema v2.0.0 + Gold Standard (security-auditor)

**Feature:** Agent-Skills Import — Wave 2 ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~3h
**Depende de:** Nenhum (primeiro plano; Wave 1 NAO e bloqueador formal)
**Desbloqueia:** Plano 02 (replicacao do gold standard em 12 agentes), Plano 04 (manifest atualizado)

---

## O que este plano entrega

Tracer Bullet da Wave 2: prova o template canonico de refinamento de agentes + o bump MAJOR do JSON contract (`1.0` -> `2.0.0`) em UM agente (`security-auditor`) antes de escalar. Entrega audit dos consumidores do contract, schema v2.0.0 documentado, migration guide para parsers, agente refinado com os 5 patterns (gold standard) e validador anti-generico para `positive_observations`.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD aprovado | `../PRD.md` (status: approved) | pronto |
| Wave 1 | NAO bloqueia — planos rodam em paralelo | pronto |
| Templates de fase/plano/memory | `skills/plan-feature/templates/` | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `agents/security-auditor.md` refinado (gold standard) | Plano 02 (replica template em 12 agentes restantes) |
| Schema v2.0.0 em `docs/design-docs/subagent-contract-v1.md` | Plano 02 (cada agente bumpa para 2.0.0), Plano 04 (manifest) |
| Migration guide para parsers (`docs/design-docs/subagent-contract-v2-migration.md`) | Plano 02, callers downstream |
| Audit map de consumidores (`audit-consumers.md`) | Plano 02 (sabe quais parsers ajustar), Plano 04 |
| Validator anti-generico de `positive_observations` | Plano 02 (validacao batch dos 12 agentes), Plano 04 |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-audit-consumidores-contract-version.md` | `audit-consumers.md` com mapa exaustivo de callers de `contract_version` | 0.5h | — |
| 02 | `fase-02-bump-schema-v2-migration-guide.md` | Schema v2.0.0 documentado + migration guide novo | 1h | fase-01 |
| 03 | `fase-03-tracer-bullet-security-auditor.md` | `security-auditor.md` refinado com 5 patterns (gold standard) | 1.5h | fase-02 |
| 04 | `fase-04-fixture-validacao-positive-verdict.md` | Fixture + validator regex blacklist anti-generico | 0.5h | fase-03 |

---

## Grafo de Fases

```
fase-01 (audit consumidores)
    |
    v
fase-02 (bump schema v2.0.0 + migration guide)
    |
    v
fase-03 (TRACER BULLET: refinar security-auditor.md — 5 patterns)
    |
    v
fase-04 (fixture/validator anti-generico — CA-02)
```

**Paralelismo possivel:** NENHUM. Fases sao lineares — cada uma consome output da anterior. fase-03 nao pode comecar sem schema (fase-02), fase-04 valida o gold standard (fase-03).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint && bun run harness:validate
```

**Tracer Bullet deste plano:** fase-03 (refinar `security-auditor.md` — prova que o template dos 5 patterns funciona em 1 agente real antes de replicar em 12)

**Notas TDD por fase:**
- fase-01: sem TDD codigo — output e documento markdown. Verificacao: `audit-consumers.md` existe + grep retorna pelo menos 1 caller.
- fase-02: TDD light — assertions em forma de grep (`grep "2.0.0" docs/design-docs/...`). Sem codigo runtime novo.
- fase-03: TDD pelos criterios de aceite (`grep -c "## Output Contract"` etc) + `bun run harness:validate` verde.
- fase-04: TDD genuino. Fixture com casos VAlidos/INVALIDOS, validator com regex blacklist, testes que rejeitam tautologias e aceitam citacoes especificas.

---

## Gotchas Conhecidos

- **G1:** Bump de `contract_version` e MAJOR (1.0 -> 2.0.0) por adicao de campos obrigatorios (`positive_observations`, `verdict`). Parsers downstream que validam shape vao quebrar — fase-01 identifica TODOS antes da fase-02 alterar o schema. DT-2 do PRD.
- **G2:** Existem callers em `agents/_contract/` (descoberto via `ls agents/`). NAO confundir com `lib/_contract/` (verificar se existe). fase-01 confirma localizacao canonica do validator.
- **G3:** `agents/security-auditor.md` linha 99 emite `"contract_version": "1.0"` e linha 125 documenta `sempre "1.0"`. AMBAS as referencias precisam bumpar — busca por valor literal `"1.0"` e por descricao textual.
- **G4:** `positive_observations` DEVE ter `length >= 1` mesmo quando auditoria nao encontra issues (DT-7 do PRD). Validator anti-generico (fase-04) NAO pode aceitar `[]` nem strings tautologicas como `"no issues found"`.
- **G5:** Validator deve cobrir os 4 testes anti-generico (DC-5 do PRD): cita arquivo especifico, nao e tautologia, verificavel por terceiro, nao-banal. Regex blacklist e a primeira linha de defesa — testes manuais nas reviews sao a segunda.
- **G6:** O Plano 02 vai usar `security-auditor.md` VERBATIM como referencia para refinar os outros 12 agentes. Qualquer inconsistencia no gold standard (heading capitalization, ordem das secoes, formato JSON) propaga 12x. Atencao redobrada na fase-03.
- **G7:** O nome do arquivo de schema doc continua `subagent-contract-v1.md` (preservar historico). Conteudo descreve v2.0.0. Renomear seria breaking change adicional sem ganho — adiar para Wave 3 se ficar dissonante.

---

## CAs do PRD cobertos por este plano

| CA | Cobertura | Onde |
|----|-----------|------|
| CA-01 (template 5 patterns aplicado) | Parcial (1/13 agentes) | fase-03 |
| CA-02 (`positive_observations` nao-generico) | Integral (validator entregue) | fase-04 |
| CA-03 (schema v2.0.0 documentado) | Integral | fase-02 |
| CA-04 (migration guide existe) | Integral | fase-02 |
| CA-09 (audit map de consumidores) | Integral | fase-01 |
| CA-10 (>= 52 regras anti-degeneration) | Parcial (4/52 — as do security-auditor) | fase-03 |

CAs 05, 06, 07 (3 skills novas), CA-08 (decision-registry pedagogia), e o resto de CA-01/CA-10 (12 agentes restantes) ficam para Planos 02/03/04.

---

<!-- Gerado por /plan-feature em 2026-05-22 -->

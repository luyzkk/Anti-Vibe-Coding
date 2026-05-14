# Plano 01: Fundacao do Contrato

**Feature:** v6.1.0 — Contrato de Subagentes v1 ([PLAN overview](../PLAN.md), [PRD](../PRD.md))
**Fases:** 5
**Sizing total:** ~5h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (Migracao Piloto — 3 padroes)

---

## O que este plano entrega

Contrato canonico de subagentes v1 versionado em git (ADR + doc + JSON schema + helper TS de parser/validator) e prova end-to-end: `security-auditor` migrado, fixture funcionando, handler generico stub consumindo via `kind`. Saida: 1 produtor real + 1 consumer real + 1 fixture verde — antes de tocar nos outros 12 auditores.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD aprovado com 10 decisoes | `../PRD.md` | pronto (status: draft, mas decisoes congeladas) |
| INVENTORY mapeando 13 agentes + 4 orquestradores | `../INVENTORY.md` | pronto |
| Pasta `agents/` existente com 13 .md files | repo | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| ADR-0002 + doc canonico subagent-contract-v1.md | Plano 02 (migration guide referenciado), Plano 05 (CHANGELOG link) |
| `agents/_contract/v1.schema.json` | Planos 02, 03 (validar fixtures), Plano 05 (harness-validate) |
| `skills/lib/subagent-contract.ts` (parser + validator + `parseAndDispatch`) | Plano 04 (4 orquestradores usam handler generico) |
| `agents/__fixtures__/security-auditor/` (template de fixture) | Planos 02, 03 (replicam padrao para os outros 12) |
| `security-auditor.md` migrado (prompt v1) | Plano 04 fase-03 (verify-work consome direto) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-adr-contrato.md | ADR-0002 documenta as 10 decisoes do PRD com alternativas rejeitadas | 0.5h | — |
| 02 | fase-02-doc-canonico.md | `docs/design-docs/subagent-contract-v1.md` (shape + migration guide <30min + 1 exemplo por kind) | 1h | — |
| 03 | fase-03-schema-json.md | `agents/_contract/v1.schema.json` (oneOf por kind, conforme PRD §Decisoes #5) | 1h | fase-02 |
| 04 | fase-04-validator-lib.md | `skills/lib/subagent-contract.ts` (parser tolerante, validator, retry mecanico, secret-pattern, testes co-localizados) | 1.5h | fase-03 |
| 05 | fase-05-tracer-bullet-e2e.md | `security-auditor.md` migrado + fixture + `parseAndDispatch` + teste E2E | 1h | fase-04 |

---

## Grafo de Fases

```
fase-01 (ADR)         fase-02 (doc canonico)
     \                       |
      \                      v
       \              fase-03 (schema JSON)
        \                    |
         \                   v
          \           fase-04 (validator + testes)
           \                 |
            \                v
             +---->  fase-05 (tracer bullet E2E)
```

**Paralelismo possivel:** fase-01 (ADR) e fase-02 (doc canonico) sao independentes — ADR pode ser draft enquanto o doc canonico e escrito. Demais fases sao sequenciais.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** fase-05 — atravessa schema → validator → 1 produtor real (security-auditor) → 1 consumer real (parseAndDispatch stub). Slice fino antes de escalar para os outros 12 agentes.

Para fases documentais (fase-01, fase-02, fase-03) o "teste" e validacao estrutural: schema valida fixture, doc tem todos os exemplos, ADR cobre todas as decisoes.

---

## Gotchas Conhecidos

Herdados do PRD §Riscos e §Requisitos Nao-Funcionais. Indexados para referencia nas fases.

- **G1:** **LLM emite JSON malformado** (whitespace estranho, trailing commas, code fences `\`\`\`json`). Probabilidade alta. Parser TS precisa ser tolerante; retry mecanico em `JSON.parse` failure separado do `needs_retry` semantico. Aplica-se a fase-04, fase-05.
- **G2:** **Distincao lifecycle vs domain_status confunde autores.** `status: "VULNERABILITIES_FOUND"` no top-level e o erro classico. Validator deve rejeitar com mensagem que sugere mover para `payload.domain_status` (CA-03). Aplica-se a fase-03, fase-04.
- **G3:** **Threshold de reasoning tem 2 niveis distintos.** <20 chars = erro `REASONING_TOO_SHORT` (rejeita). 20-49 chars = warning `REASONING_LIKELY_WEAK` (passa, sinaliza prompt ruim). Nao colapsar em um unico nivel (CA-02). Aplica-se a fase-04.
- **G4:** **Secret pattern detection pode dar falso positivo em comentarios/docstrings** que mencionam `API_KEY=` como exemplo. Usar regex case-insensitive mas considerar contexto. Em v1 aceitar falsos positivos baixos — defesa em profundidade nao precisa ser perfeita (PRD §Seguranca). Aplica-se a fase-04.
- **G5:** **`contract_version: "1.0"` e literal fixo em v1.** Sem logica de selecao de versao — campo existe so para v2 futura coexistir (PRD §Decisoes #7). Validator rejeita qualquer outro valor. Aplica-se a fase-03, fase-04.
- **G6:** **Schema `oneOf` por kind precisa ser estrito** — payload de `kind: audit` tem shape diferente de `kind: verification`. JSON Schema `oneOf` com discriminador em `kind`. Aplica-se a fase-03.
- **G7:** **Migration guide tem que caber em <30min de leitura+execucao** (RF-SH-04). Se a fase-02 produzir guide com 50+ passos, falhou. Numerar passos, exemplo diff antes/depois, copy-paste-ready. Aplica-se a fase-02.
- **G8:** **Comment Provenance universal #5 do PRD aplica em codigo gerado.** Comentarios inline precisam de quem/quando/por que. Ex: `// 2026-05-14 (Luiz/dev): reasoning min 20 chars — PRD §Decisoes #10`. Aplica-se a fase-04, fase-05.

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->

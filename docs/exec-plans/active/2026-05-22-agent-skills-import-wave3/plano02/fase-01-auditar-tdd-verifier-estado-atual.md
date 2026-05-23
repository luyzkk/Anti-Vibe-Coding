# Fase 01: Auditar `tdd-verifier` Estado Atual

**Plano:** 02 — Prove-It Mode no tdd-verifier
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Documento `audit-tdd-verifier.md` (dentro de `plano02/`) com 3 secoes: (a) `contract_version` atual de `agents/tdd-verifier.md`, (b) presenca/ausencia das secoes esperadas pos-Wave-2 (Output Contract additions, Anti-Degeneration, Composition + 2 secoes adicionais TBD se identificadas no PRD da Wave 2), (c) decisao registrada — PROSSEGUIR (estado pos-Wave-2 confirmado) ou PAUSAR (estado pre-Wave-2 — alertar dev). Mitiga R-NEW-02 do PLAN antes de qualquer edicao em `tdd-verifier.md`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/plano02/audit-tdd-verifier.md` | Create | Relatorio de auditoria com decisao proceed/pause |

**Nao toca:** `agents/tdd-verifier.md` (read-only nesta fase — auditoria pura, sem editar producao).

---

## Implementacao

### Passo 1: Ler `agents/tdd-verifier.md` na integra

Ler o arquivo todo (~85 linhas atualmente) para entender estrutura existente.

```bash
wc -l agents/tdd-verifier.md
grep -n "^## " agents/tdd-verifier.md
grep -n "contract_version" agents/tdd-verifier.md
```

Resultado esperado **estado atual (pre-Wave-2)**:
- ~85 linhas
- Secoes H2: `## O que verificar`, `## Regras`, `## Formato de Saida (Contrato v1)`
- `contract_version` = `"1.0"` em 2 ocorrencias (linha ~52 e ~78)

Resultado esperado **estado pos-Wave-2**:
- mais linhas (refinamento Wave-2 adiciona seccoes)
- `contract_version` = `"2.0.0"`
- secoes adicionais (ver Passo 2)

### Passo 2: Identificar secoes Wave-2 esperadas

Ler o PRD da Wave 2 para listar as secoes esperadas pos-merge. Se o PRD Wave 2 nao esta acessivel ou nao detalha estrutura final, marcar como TBD com nota.

```bash
# Tentar localizar:
ls docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/PRD.md
grep -n "tdd-verifier\|5 patterns\|Output Contract additions\|Anti-Degeneration\|Composition" docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/PRD.md 2>/dev/null
```

Secoes esperadas conhecidas (per Assumption 1 do PLAN.md):
1. **Output Contract additions** — secao com fields novos compat-2.0.0
2. **Anti-Degeneration** — patterns contra responses degeneradas
3. **Composition** — quando compor com outros agentes

Secoes TBD (2 adicionais — 5 patterns total per PLAN Assumption 1):
4. **TBD-1** — identificar via leitura do PRD Wave 2 ou marcar como TBD
5. **TBD-2** — idem

Se PRD Wave 2 nao acessivel: registrar "TBD — Wave 2 PRD nao encontrado/acessivel; conhecer as 5 patterns exige merge da Wave 2" e seguir para Passo 3 com decisao PAUSAR.

### Passo 3: Verificar `contract_version` atual

```bash
grep -E 'contract_version.*"[0-9.]+"' agents/tdd-verifier.md
```

Decisao por estado:
- Output `"1.0"` -> estado pre-Wave-2 -> **PAUSAR** o Plano 02 e alertar dev (R-NEW-02 confirmado)
- Output `"2.0.0"` -> estado pos-Wave-2 -> verificar secoes (Passo 4)
- Output ausente ou outro valor -> estado inesperado -> **PAUSAR** e investigar

### Passo 4: Verificar presenca das secoes Wave-2

Se `contract_version` = `"2.0.0"`, rodar greps:

```bash
grep -c "^## Output Contract" agents/tdd-verifier.md
grep -c "^## Anti-Degeneration" agents/tdd-verifier.md
grep -c "^## Composition" agents/tdd-verifier.md
# + 2 greps para as patterns TBD
```

Esperado: cada grep retorna 1 (presente). Se algum retorna 0, registrar como ausencia parcial e PAUSAR.

### Passo 5: Gerar `audit-tdd-verifier.md`

Estrutura do documento:

```markdown
# Audit: tdd-verifier (Plano 02 fase-01)

**Data:** 2026-05-23
**Plano:** 02 / fase-01
**Objetivo:** Verificar estado atual de `agents/tdd-verifier.md` antes de adicionar `## Prove-It Mode` em fase-02. Mitiga R-NEW-02 do PLAN.

## Secao A — Contract Version Atual

- Comando: `grep -E 'contract_version.*"[0-9.]+"' agents/tdd-verifier.md`
- Output observado: `{copiar output exato}`
- Conclusao: `contract_version = "{valor}"` -> estado `{pre-Wave-2 | pos-Wave-2 | inesperado}`

## Secao B — Presenca de Secoes Wave-2

| Secao esperada | Comando de verificacao | Match? | Observacao |
|----------------|------------------------|--------|------------|
| `## Output Contract additions` | `grep -c "^## Output Contract" agents/tdd-verifier.md` | {sim/nao} | {detalhe} |
| `## Anti-Degeneration` | `grep -c "^## Anti-Degeneration" agents/tdd-verifier.md` | {sim/nao} | {detalhe} |
| `## Composition` | `grep -c "^## Composition" agents/tdd-verifier.md` | {sim/nao} | {detalhe} |
| {TBD-1} | {grep TBD} | {sim/nao/TBD} | {Wave 2 PRD nao acessivel se TBD} |
| {TBD-2} | {grep TBD} | {sim/nao/TBD} | {idem} |

## Secao C — Decisao

`{PROSSEGUIR | PAUSAR}`

**Justificativa:** `{texto curto}`

**Se PAUSAR:**
- Alertar dev no canal de execucao (`/execute-plan` interrompe e mostra audit-tdd-verifier.md ao dev)
- Opcoes para o dev:
  - (a) Rodar Wave 2 primeiro (mergear Wave 2 antes de prosseguir com Plano 02)
  - (b) Aceitar prosseguir sobre estado pre-Wave-2 (revisitar pos-merge) — dev assume risco de retrabalho se Wave 2 introduzir conflitos
- Sem aprovacao explicita, fase-02 NAO comeca.

**Se PROSSEGUIR:**
- fase-02 pode comecar imediatamente
- Registrar em `MEMORY.md` qual estado foi confirmado (pos-Wave-2) e quais secoes Wave-2 estao presentes/ausentes

## Apendice — Estrutura atual do tdd-verifier.md

`{copiar output de grep -n "^## " e relatar linhas totais}`
```

### Passo 6: Sanity check do audit

```bash
[ -f docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/plano02/audit-tdd-verifier.md ] && echo OK
grep -c "## Secao [ABC]" docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/plano02/audit-tdd-verifier.md  # esperado: 3
grep -c "PROSSEGUIR\|PAUSAR" docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/plano02/audit-tdd-verifier.md  # esperado: >=1
```

---

## Gotchas

- **G1 do plano:** estado atual confirmado pre-Wave-2 — `contract_version` linha ~52 e ~78 = `"1.0"` (visto via Read em pre-trabalho do planejamento). fase-01 com decisao "PAUSAR" e o resultado ESPERADO no momento atual.
- **G2 do plano (R-NEW-02):** Wave 2 nao mergeada (PLAN.md linha 14). fase-01 confirmaria isso e PAUSARIA. Dev decide se mergeia Wave 2 primeiro ou aceita risco de retrabalho.
- **Local — secoes TBD:** Se Wave 2 PRD nao detalha as 5 patterns por nome, registrar "TBD — sera confirmado pos-merge" em vez de inventar nomes. Auditoria honesta > auditoria especulativa.
- **Local — nao editar producao:** Esta fase NAO toca `agents/tdd-verifier.md`. Apenas Read + Grep + Write em `plano02/audit-tdd-verifier.md`. Qualquer edicao em producao quebra a regra de pre-trabalho ("auditar antes de editar").

---

## Verificacao

### Checklist

- [ ] `plano02/audit-tdd-verifier.md` existe
- [ ] Documento tem 3 secoes (A, B, C)
- [ ] Secao A reporta `contract_version` observado (texto exato do grep)
- [ ] Secao B tem tabela com >=3 secoes esperadas verificadas
- [ ] Secao C tem decisao explicita: `PROSSEGUIR` ou `PAUSAR`
- [ ] Apendice tem output de `grep -n "^## " agents/tdd-verifier.md`
- [ ] `agents/tdd-verifier.md` NAO foi modificado (git diff vazio para esse arquivo)
- [ ] Se decisao = PAUSAR, alerta foi registrado em `MEMORY.md` (campo "Notas para Planos Seguintes")

---

## Criterio de Aceite

**Por maquina:**
- `[ -f docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/plano02/audit-tdd-verifier.md ] && echo OK` retorna `OK`
- `grep -c "## Secao [ABC]" docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/plano02/audit-tdd-verifier.md` retorna `3`
- `grep -cE "(PROSSEGUIR|PAUSAR)" docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/plano02/audit-tdd-verifier.md` retorna `>=1`
- `git diff agents/tdd-verifier.md` vazio (zero mudancas em producao)

**Por humano:**
- Revisar audit document: a decisao (proceed/pause) faz sentido dado o estado observado? Se PAUSAR, o alerta para o dev e claro o suficiente para decidir?

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

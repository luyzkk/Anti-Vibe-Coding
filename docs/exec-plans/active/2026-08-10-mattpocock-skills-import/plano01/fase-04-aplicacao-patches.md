---
fase: 04
plano: 01
status: planned
---

# Fase 04: Aplicacao dos Patches Aprovados

**Plano:** 01 — Porte da `writing-for-agents` + Auditoria
**Sizing:** ~1h por lote (numero de lotes definido pela fase-03)
**Depende de:** fase-03 (o relatorio define o escopo)
**Visual:** false

**Decisoes:** DI-04 (aprovacao por achado) · DI-05 (branch + PR)
**Invariantes:** cap de 5 arquivos por lote (CLAUDE.md global)

---

## O que esta fase entrega

Os patches que o humano aprovou, aplicados em lotes de no maximo 5 arquivos, cada lote verificado
antes do proximo. **O escopo desta fase e desconhecido enquanto a fase-03 nao rodar** — e assim
que deve ser: escrever a lista de patches agora seria decidir antes de medir.

---

## Arquivos Afetados

Definidos pelo `AUDIT-REPORT.md`. Restricoes fixas:

- Maximo **5 arquivos por lote**
- Um lote = um commit
- Achados **sistemicos** viram lote proprio (mesmo patch, N arquivos — ainda cap de 5 por vez)

---

## Implementacao

### Passo 1: triagem com o humano

Apresentar os achados ranqueados. Para cada um: **aplicar / adiar / descartar**. Sem lote automatico
(DI-04).

Achado descartado vai para uma secao do relatorio com o motivo — a proxima auditoria nao deve
re-sugerir o que ja foi recusado com razao load-bearing. (Mesmo mecanismo dos ADRs no
`improve-codebase-architecture` do repo-fonte.)

### Passo 2: aplicar em lotes

Por lote:

1. Reler cada arquivo antes de editar (regra de integridade de edicao do CLAUDE.md global — a Edit
   falha silenciosamente contra contexto desatualizado)
2. Aplicar os patches
3. `bun run test && bun run typecheck && bun run harness:validate`
4. Rodar `scripts/audit-skill-docs.ts` e confirmar o delta **medido** contra o **projetado**
5. Commit convencional
6. **Parar e aguardar aprovacao** antes do proximo lote

### Passo 3: fechar o loop de duplicacao do hook

Se a auditoria confirmar a duplicacao entre descriptions e o payload do `SessionStart`, o patch
toca `hooks/hooks.json` — que **nao e** uma skill e tem regressao propria. Lote isolado, nunca
misturado com edicao de `SKILL.md`.

Compound relevante: `2026-03-23-hooks-json-overwrite-bug`.

### Passo 4: delta final

Rodar o script uma ultima vez e registrar antes/depois no `AUDIT-REPORT.md`. Numero real, nao projetado.

---

## Gotchas

- **G1** — Cortar description quebra descoberta. Uma skill que parou de disparar quando devia e
  regressao invisivel: nada falha, ela so nao aparece. Achado de description exige verificacao
  manual de que a skill ainda dispara nos branches que importam.
- **G2** — `hooks/hooks.json` tem historico de sobrescrita (compound 2026-03-23). Lote isolado.
- **G3** — Depois de 10+ mensagens de execucao, reler antes de editar. Auto-compact destroi contexto
  de arquivo silenciosamente.
- **G4** — Delta medido menor que o projetado nao e falha: e calibracao do script para a proxima
  auditoria. Registrar a divergencia.

---

## Verificacao

### Por lote

- [ ] `bun run test && bun run typecheck && bun run harness:validate` verde
- [ ] Delta medido registrado
- [ ] Skills tocadas ainda disparam nos branches que importam (G1)
- [ ] Commit convencional, um por lote

### Ao fim

- [ ] Todo achado aprovado foi aplicado ou explicitamente adiado
- [ ] Descartados registrados com motivo
- [ ] Antes/depois no `AUDIT-REPORT.md` com numero real
- [ ] PR aberto (DI-05)

---

## Criterio de Aceite

**Por maquina:**
- Suite completa verde apos o ultimo lote
- Baseline re-rodado; delta registrado
- Nenhum commit direto na `main` (DI-05)

**Por humano:**
- Nenhuma skill perdeu capacidade de disparar
- Cada patch aplicado foi aprovado explicitamente
- O relatorio final diz o que **nao** foi feito e por que

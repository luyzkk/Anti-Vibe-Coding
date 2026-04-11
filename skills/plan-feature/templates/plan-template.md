# Plan: {Feature Name}

**PRD:** {caminho do PRD usado como base}
**Total:** {N} tasks em {M} waves
**Estimativa:** {S/M/L baseado no slice mais complexo}
**Created:** {YYYY-MM-DD}

---

<!-- Guia de Complexidade:
  S (Small): < 30 min — mudancas triviais, config, rename
  M (Medium): 30min-2h — endpoint novo, componente, teste E2E
  L (Large): 2h+ — refatoracao significativa, integracao complexa

  A complexidade total do plano e a do slice mais complexo.
  Se um slice individual e L, considerar subdividi-lo.
-->

<!-- Regras do Tracer Bullet:
  - DEVE ser o Slice 1.1 da Wave 1
  - DEVE atravessar TODAS as camadas (test → service → API → UI)
  - DEVE ser o slice mais fino possivel
  - Objetivo: provar a arquitetura, nao entregar feature completa
  - Regra de ouro: se leva mais de 2h, nao e fino o suficiente
-->

---

## Wave 1 (Paralelo)

### Slice 1.1: {Tracer Bullet — Thin E2E}
> Prova que a arquitetura funciona end-to-end. O slice mais fino possivel.

- [ ] Task 1.1.1: {Escrever teste E2E que falha}
  - Files: `{caminho do arquivo de teste}`
  - Action: Create
  - Verify: Teste falha (Red) — assertion failure, nao erro de compilacao
  - Complexity: {S|M|L}

- [ ] Task 1.1.2: {Implementar backend minimo}
  - Files: `{caminho do servico/endpoint}`
  - Action: Create
  - Verify: {criterio testavel — ex: "endpoint retorna 200 com payload correto"}
  - Complexity: {S|M|L}
  - Depends on: Task 1.1.1

- [ ] Task 1.1.3: {Conectar UI minima}
  - Files: `{caminho do componente/pagina}`
  - Action: Create
  - Verify: Teste E2E passa (Green) — tela exibe dados reais do backend
  - Complexity: {S|M|L}
  - Depends on: Task 1.1.2

### Slice 1.2: {Nome descritivo do slice}
> {Descricao do que este slice entrega de valor ao usuario}

- [ ] Task 1.2.1: {Descricao da task}
  - Files: `{caminho exato do arquivo}`
  - Action: {Create | Modify | Delete}
  - Verify: {criterio testavel}
  - Complexity: {S|M|L}

---

## Wave 2 (Depende de Wave 1)

### Slice 2.1: {Nome descritivo do slice}
> {Descricao do que este slice entrega de valor ao usuario}

- [ ] Task 2.1.1: {Descricao da task}
  - Files: `{caminho exato do arquivo}`
  - Action: {Create | Modify | Delete}
  - Verify: {criterio testavel}
  - Complexity: {S|M|L}

---

## Summary

| Wave | Slices | Tasks | Estimated Complexity |
|------|--------|-------|---------------------|
| 1    | {n}    | {n}   | {S/M/L}             |
| 2    | {n}    | {n}   | {S/M/L}             |
| Total| {n}    | {n}   | {S/M/L}             |

---

## Dependencies Graph

```
{Grafo ASCII mostrando a ordem de execucao}

1.1.1 → 1.1.2 → 1.1.3
                      ↘
                       2.1.1 → 2.1.2
1.2.1 → 1.2.2
```

---

## Risks

- {risco identificado durante planejamento}
  - Mitigacao: {acao sugerida}

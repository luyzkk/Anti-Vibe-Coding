# Plan: {Feature Name}

**PRD:** {caminho do PRD usado como base}
**Planos:** {N} planos, {M} fases total
**Created:** {YYYY-MM-DD}

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | {nome descritivo} | {N} | {Xh} | — |
| 02 | {nome descritivo} | {N} | {Xh} | Plano 01 |
| 03 | {nome descritivo} | {N} | {Xh} | Plano 01 |
| 04 | {nome descritivo} | {N} | {Xh} | Plano 02, 03 |

---

## Grafo de Dependencias

```
Plano 01 ({nome})
    |
    v
Plano 02 ({nome})     Plano 03 ({nome})
    |                       |
    +----------- + ---------+
                 |
                 v
           Plano 04 ({nome})
```

**Paralelismo possivel:** {indicar quais planos podem ser executados em paralelo}

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-{nome}
**Descricao:** {o slice mais fino possivel que prova a arquitetura end-to-end}

---

## Resumo por Plano

### Plano 01: {Nome}
> {Descricao de 1-2 linhas do que este plano entrega}

Fases:
- fase-01-{nome}: {descricao curta}
- fase-02-{nome}: {descricao curta}
- ...

### Plano 02: {Nome}
> {Descricao de 1-2 linhas}

Fases:
- fase-01-{nome}: {descricao curta}
- ...

---

## Risks

- {risco identificado durante planejamento}
  - Mitigacao: {acao sugerida}

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| {D1 do CONTEXT.md ou decisao do PRD} | Plano {N}, fase-{NN} |
| {D2} | Plano {N}, fase-{NN} |

---

<!-- Gerado por /plan-feature em {YYYY-MM-DD} -->

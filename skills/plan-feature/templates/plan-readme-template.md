# Plano {NN}: {Nome do Plano}

**Feature:** {nome da feature (link ao PLAN overview)}
**Fases:** {N}
**Sizing total:** ~{X}h
**Depende de:** {Plano NN ou "Nenhum (primeiro plano)"}
**Desbloqueia:** {Plano NN, Plano MM}

---

## O que este plano entrega

{Descricao clara de 2-3 linhas do valor entregue ao completar este plano.
Nao descrever tarefas — descrever resultado.}

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| {tipos/entidades base} | Plano 01 | {pendente/pronto} |
| {migration de tabela X} | Plano 01, fase-02 | {pendente/pronto} |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| {endpoints de API} | Plano 03 (UI) |
| {queries/hooks} | Plano 04 (paginas) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-{nome}.md | {o que entrega} | {0.5h/1h/1.5h/2h} | — |
| 02 | fase-02-{nome}.md | {o que entrega} | {0.5h/1h/1.5h/2h} | fase-01 |
| 03 | fase-03-{nome}.md | {o que entrega} | {0.5h/1h/1.5h/2h} | fase-01 |
| 04 | fase-04-{nome}.md | {o que entrega} | {0.5h/1h/1.5h/2h} | fase-02, 03 |

---

## Grafo de Fases

```
fase-01 ({nome})
    |
    v
fase-02 ({nome})     fase-03 ({nome})
    |                       |
    +----------- + ---------+
                 |
                 v
           fase-04 ({nome})
```

**Paralelismo possivel:** {indicar quais fases podem executar em paralelo}

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** {fase-01 se for Plano 01, ou "N/A" se nao for o primeiro}

---

## Gotchas Conhecidos

{Gotchas do PRD, CONTEXT, ou detectados durante exploracao do codebase.
Indexados para referencia nas fases.}

- **G1:** {gotcha relevante para este plano}
- **G2:** {outro gotcha}

---

<!-- Gerado por /plan-feature em {YYYY-MM-DD} -->

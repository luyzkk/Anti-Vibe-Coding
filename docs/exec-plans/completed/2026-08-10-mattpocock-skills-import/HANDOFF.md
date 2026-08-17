# Handoff — Execucao do Import mattpocock/skills

**Escrito em:** 2026-08-10, ao fim da fase de decisao
**Para:** a sessao que vai executar
**Estado:** 11 planos escritos, **zero linha de codigo escrita**

---

## O que ja aconteceu

Analise completa das 35 skills de [mattpocock/skills](https://github.com/mattpocock/skills)
(MIT, commit `84fdeff`) contra o inventario do Anti-Vibe-Coding. 13 aprovadas, 22 descartadas com
motivo. Tudo decidido; nada implementado.

**Leia primeiro:** [`CONTEXT.md`](./CONTEXT.md) — triagem completa, 3 colisoes resolvidas,
3 correcoes de triagem, 37 decisoes (DI-01..DI-37).

---

## Estado do repositorio

| | |
|---|---|
| Branch atual | `main` |
| Arquivos de plano | **54, todos untracked** |
| Codigo modificado | nenhum |

**Os 54 arquivos de plano ainda nao foram commitados.** Eles precisam ir para a branch de trabalho
junto com a execucao — nao deixe na `main`.

---

## Por onde comecar

**`plano01/fase-01-porte-nucleo.md`** — porte da `writing-for-agents`.

Nao e escolha arbitraria: **as outras 30 fases sao escritas contra ela.** Portar a lente por ultimo
significaria reescrever o resto.

Ordem depois disso — dois gargalos, o resto paralelo:

```
plano01 fase-01  (bloqueia tudo)
    ├── plano02 fase-01 ──┬── plano06 fase-03
    │                     ├── plano07 (inteiro)
    │                     └── plano11 fase-02
    ├── plano03, plano04, plano08, plano09, plano10  (independentes)
    └── plano05 ── plano11 fase-03
```

---

## Como executar uma fase

O arquivo `fase-NN-*.md` **e a spec**. Ele tem passos numerados, gotchas, checklist de verificacao e
criterio de aceite separado em *por maquina* e *por humano*.

1. Ler o `README.md` do plano (contexto, invariantes, como pode falhar)
2. Ler o `MEMORY.md` do plano (estado, DIs obrigatorias, numeros de referencia)
3. Ler a fase inteira antes de tocar em arquivo
4. Executar os passos na ordem
5. Rodar o checklist de verificacao
6. **Registrar DIs no `MEMORY.md`** — toda divergencia entre a spec da fase e o que o codigo exigiu.
   Formato: `DI-PlanoNN-faseNN-<slug>: <o que mudou e por que>`
7. **Parar e aguardar aprovacao** antes da proxima fase

Se detectar problema real na spec da fase, **sinalize e aguarde** — nao improvise.

---

## Regras que valem em toda fase

- **Branch + PR sempre.** Nunca commit direto na `main` deste repo
- **Maximo 5 arquivos por fase.** As fases ja respeitam isso; nao agrupe
- **Reler antes de editar.** Especialmente apos 10+ mensagens — `Edit` falha em silencio contra
  contexto desatualizado
- **Sugerir, nunca executar** o que nao foi pedido
- Verificacao: `bun run harness:validate` · `bun run typecheck` · `bun run test` ·
  `bun run agents:contract` (quando tocar `agents/`)
- `bun`, nunca `npm`
- Nomes de teste sem "should" — verbos descritivos

---

## A licao que custou tres erros nesta sessao

Registrada como TR-01, TR-02 e TR-03 no `CONTEXT.md`. Mesma raiz nas tres:

> Afirmacao vinda de doc de planejamento antigo, ou de leitura so do `SKILL.md` sem os `agents/`,
> e **hipotese, nao fato.**

Antes de agir sobre qualquer afirmacao dos planos sobre o estado atual do repo, **verifique por grep
de conceito** — em `skills/*/references/*.md`, no corpo das skills, **e em `agents/*.md`**.

Os planos foram escritos com o melhor entendimento disponivel, mas foram escritos **antes** da
execucao. Se a realidade divergir, a realidade ganha — registre como DI.

---

## Arquivos por plano

Cada `planoNN/` tem `README.md`, `MEMORY.md` e um `fase-NN-*.md` por fase.

| Plano | Entrega | Fases | Sizing |
|---|---|---|---|
| 01 | `writing-for-agents` + auditoria das 39 skills | 4 | ~7h |
| 02 | Vocabulario de seam (expande `deep-modules.md`) | 3 | ~4h |
| 03 | `wizard` | 3 | ~5h |
| 04 | Frontier no `grill-me` | 2 | ~4h |
| 05 | `domain-modeling` + glossario | 3 | ~6h |
| 06 | Loop-first no `incident-response` | 3 | ~6h |
| 07 | `improve-codebase-architecture` | 2 | ~5h |
| 08 | `prototype` | 3 | ~6h |
| 09 | `resolving-merge-conflicts` | 2 | ~3h |
| 10 | `wayfinder` | 3 | ~8h |
| 11 | Absorcoes finais (`code-review`, `tdd`, `grill-with-docs`) | 3 | ~5h |

---

## Pendencias de religacao

Nao sao TODOs soltos — cada uma esta registrada no `MEMORY.md` do plano afetado, com o ponteiro
exato:

| Quando | O que religar |
|---|---|
| `plano08` entregar | `wayfinder` troca o ticket-tipo `prototype` de conversa para `/prototype` |
| `plano04` + `plano05` entregarem | `wayfinder` religa o tipo `grilling`; `plano07` ganha o loop de grilling adiado (DI-25) |
| `plano07` entregar | `plano06 fase-03` muda o destino do ponteiro de post-mortem arquitetural |

---

## Obrigacao de licenca

Material portado e MIT (Copyright (c) 2026 Matt Pocock). **Atribuicao em
`THIRD-PARTY-NOTICES.md` antes de qualquer merge.** As fases que portam material ja listam o arquivo
como afetado.

---

## Ao fechar cada plano

Pelo `docs/PLANS.md` do repo: confirmar exit criteria, registrar comandos e resultados no
`Validation Log`, registrar a decisao de compound (licao capturada ou por que nao), e mover o plano
de `active/` para `completed/`. Rerodar `bun run harness:validate` apos mover.

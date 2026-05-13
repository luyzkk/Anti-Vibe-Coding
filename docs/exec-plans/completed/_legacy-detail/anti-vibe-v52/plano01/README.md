# Plano 01: Infraestrutura — Hooks Novos

**Feature:** Anti-Vibe Coding v5.2 — Princípios Akita ([PLAN overview](../PLAN.md))
**Fases:** 2
**Sizing total:** ~2h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 03, Plano 04 (dependência fraca — serve como modelo de hook .cjs)

---

## O que este plano entrega

Dois hooks novos integrados ao `hooks.json`: `file-size-guard` (PostToolUse) avisa automaticamente quando um arquivo editado excede 500 linhas ou uma função excede 40 linhas; `grepping-names` (PreToolUse Bash) avisa antes de commits quando nomes genéricos são introduzidos com mais de 10 hits no codebase. Ambos são não-blocking (warning only).

---

## Análise de Dependências

### Bloqueadores (precisa estar pronto ANTES deste plano)

Nenhum.

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Padrão .cjs de hook: stdin JSON → stdout warning → exit 0 | Plano 03, Plano 04 (referência ao criar novos hooks) |
| Entry PostToolUse Write\|Edit em hooks.json | Plano 06 fase-02 (expande hooks.json no advisor) |
| Entry PreToolUse Bash (git commit) em hooks.json | Plano 06 fase-01 (anti-vibe-review cita hook) |

---

## Mapa de Fases

| Fase | Nome | Sizing | Depende de | Arquivos |
|------|------|--------|------------|---------|
| 01 | file-size-guard hook | ~1h | — | `hooks/file-size-guard.cjs` (novo), `hooks/hooks.json` (modifica) |
| 02 | grepping-names hook | ~1h | — | `hooks/grepping-names.cjs` (novo), `hooks/hooks.json` (modifica) |

As duas fases são independentes e podem rodar em sequência simples (cada uma toca apenas o hooks.json, em regiões diferentes).

---

## Grafo de Fases

```
[fase-01: file-size-guard]
         |
         v
[fase-02: grepping-names]   ← pode rodar após fase-01 (ou em paralelo se editors distintos)
```

Dependência de sequência recomendada apenas para evitar conflito no `hooks.json`. Cada fase cria seu próprio bloco isolado no JSON.

---

## TDD Strategy

Hooks são scripts de infraestrutura executados pelo Claude Code runtime — não há framework de teste aplicável diretamente. A verificação é manual e comportamental:

- **Fase 01:** editar ou criar um arquivo .ts com >500 linhas após o hook estar registrado; confirmar warning `[FILE-SIZE]` no output do modelo.
- **Fase 02:** fazer `git add` de um arquivo com variável `handler` e rodar `git commit`; confirmar warning `[GREPPING]` antes da execução.

Critério de aceite é formato exato da mensagem (CA-01 e CA-02 do PRD).

---

## Gotchas Conhecidos

1. **`anti-vibe-coding/` é repositório git independente** — commits devem ser feitos com `cwd` dentro de `anti-vibe-coding/`, não no root do monorepo.
2. **Hooks são .cjs** — usar `require()` e `module.exports` quando necessário. Não usar `import`.
3. **`process.exit(2)` é PROIBIDO para warnings** — qualquer saída não-zero bloqueia a ferramenta. Warnings usam `process.stdout.write` + `process.exit(0)`.
4. **`CLAUDE_FILE_PATH` pode ser undefined** — sempre guard: `const filePath = process.env.CLAUDE_FILE_PATH || ''`.
5. **grep no Windows** — `grep -r` pode não estar disponível fora de git bash/WSL. O hook `grepping-names` usa `execSync` com fallback documentado. Em Windows puro, o hook falha silenciosamente (fail-open via try/catch).
6. **stdin como canal de input** — hooks recebem o JSON da ferramenta via `process.stdin` (não via args). Ver padrão em `tdd-gate.cjs` e `prompt-guard.cjs`.
7. **Safety timeout** — sempre adicionar `setTimeout(() => process.exit(0), 5000)` para evitar travamento em caso de stdin não fechar (bug conhecido no Windows).

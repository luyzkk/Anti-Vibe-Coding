<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: AGENTS.md.tpl link CODE_STYLE.md

**Plano:** 02 — Scaffold expandido + Backup pre-mutacao
**Sizing:** 0.5h
**Depende de:** fase-01 (template e entry de CODE_STYLE.md devem existir antes do link apontar para algo real)
**Visual:** false

---

## O que esta fase entrega

`AGENTS.md.tpl` lista `docs/CODE_STYLE.md` em "Read Before Major Changes", tornando o
doc canonico de code-style/Akita descobrivel por agentes/humanos. Cobre CA-08 (Akita-style
blocks em CODE_STYLE.md; DESIGN.md permanece com template visual e nao e tocado nesta fase).

**Escopo estrito (decisao ponto-revisao 2, opcao A):** apenas CODE_STYLE.md eh adicionado
ao AGENTS.md.tpl. A ausencia de DESIGN.md em "Read Before Major Changes" eh bug separado
do PRD atual; sera registrado em MEMORY.md como debt-tracker para fase futura.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/assets/templates/AGENTS.md.tpl` | Modify | Adicionar bullet `[docs/CODE_STYLE.md](./docs/CODE_STYLE.md)` em "Read Before Major Changes" (apenas — sem tocar DESIGN.md) |
| `tests/e2e/init-tracer-bullet.test.ts` (ou golden file equivalente) | Modify | Atualizar golden de AGENTS.md scaffolded se houver byte-comparison |

---

## Implementacao

### Passo 1: Inserir bullet no AGENTS.md.tpl

Editar `skills/init/assets/templates/AGENTS.md.tpl`. Secao alvo: `## Read Before Major Changes`
(linhas 3-9 do arquivo atual). Inserir bullet em ordem alfabetica dentro da secao.

Estado atual da secao:

```markdown
## Read Before Major Changes

- [ARCHITECTURE.md](./ARCHITECTURE.md): system boundaries, layering, and ownership.
- [docs/PLANS.md](./docs/PLANS.md): when to open an execution plan and how to keep it current.
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md): users, outcomes, product tradeoffs, and non-goals.
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md): current quality bar and the biggest gaps.
- [docs/SECURITY.md](./docs/SECURITY.md): security constraints and review checklist.
```

Estado apos a edicao (insere APENAS `CODE_STYLE.md` entre `ARCHITECTURE.md` e `docs/PLANS.md`,
mantendo ordem alfabetica: `A` < `C` < `P` < `Q` < `S`):

```markdown
## Read Before Major Changes

- [ARCHITECTURE.md](./ARCHITECTURE.md): system boundaries, layering, and ownership.
- [docs/CODE_STYLE.md](./docs/CODE_STYLE.md): code style and conventions for agents (companion to DESIGN.md).
- [docs/PLANS.md](./docs/PLANS.md): when to open an execution plan and how to keep it current.
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md): users, outcomes, product tradeoffs, and non-goals.
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md): current quality bar and the biggest gaps.
- [docs/SECURITY.md](./docs/SECURITY.md): security constraints and review checklist.
```

Nota: `DESIGN.md` permanece AUSENTE da secao "Read Before Major Changes" — bug separado
do escopo desta fase. Registrar em `plano02/MEMORY.md` (secao "Notas para Planos Seguintes")
como debt-tracker. NAO adicionar DESIGN.md aqui — escopo estrito conforme ponto-revisao 2
opcao A.

### Passo 2: Atualizar golden file se existir

Rodar `bun test skills/init` e `bun test tests/e2e/init-tracer-bullet.test.ts`. Se algum
teste comparar bytes/hash de `AGENTS.md` scaffolded, atualizar o golden file
correspondente (procurar em `tests/e2e/__golden__/` ou similar).

Comando para localizar potenciais golden files que mencionam AGENTS.md:

```bash
grep -rn "AGENTS.md" tests/e2e/__golden__/ 2>/dev/null || true
grep -rn "Read Before Major Changes" tests/ 2>/dev/null || true
```

Se nenhum golden file aparece (saida vazia), pular este passo. Se aparecer, regenerar
conforme convencao do projeto (ex: `bun run test:e2e -- --update-snapshots`).

---

## Gotchas

- **G1 do plano (template vazio):** Reforco — `CODE_STYLE.md` referenciado aqui e VAZIO
  apos init (foi criado pelo scaffold da fase-01 mas o conteudo nao foi populado ainda).
  Esta fase apenas cria o LINK; o conteudo vem do PLAN populate (Plano 03).

- **G-local (NAO mexer no DESIGN.md.tpl nem listar DESIGN.md no AGENTS.md.tpl):**
  Escopo estrito decidido no ponto-revisao 2 (opcao A). `DESIGN.md.tpl` continua intocado;
  AGENTS.md.tpl recebe APENAS o bullet de CODE_STYLE.md. O gap de DESIGN.md fora do
  AGENTS.md eh registrado em MEMORY.md como debt-tracker para fase futura — NAO mistura
  com este plano.

- **G-local (ordem alfabetica):** Manter o bullet inserido em ordem alfabetica da secao.
  Inconsistencia de ordem rompe contrato visual com proximos contribuidores que esperam
  diff minimo ao adicionar bullets futuros.

- **G-local (padrao do bullet):** Linkagem deve seguir o padrao dos vizinhos: markdown
  link relativo (`[texto](./caminho)`) + descricao curta apos `:`. NAO usar HTML, nao
  usar emojis (regra global do plugin).

---

## Verificacao

### TDD

- [ ] **RED:** Nao ha teste novo necessario (mudanca textual em template `.tpl`).
  Caso golden file exista, ele falha apos a edicao por byte mismatch ate ser regenerado.
  - Comando: `bun test skills/init`
  - Resultado esperado: PASS (sem golden) ou FAIL com diff legivel (com golden)

- [ ] **GREEN:** Apos editar `AGENTS.md.tpl` e regenerar golden (se aplicavel),
  todos os testes passam
  - Comando: `bun test skills/init && bun test tests/e2e/init-tracer-bullet.test.ts`
  - Resultado esperado: `N passed, 0 failed`

### Checklist

- [ ] `AGENTS.md.tpl` contem a linha `- [docs/CODE_STYLE.md](./docs/CODE_STYLE.md):`
- [ ] `AGENTS.md.tpl` NAO ganhou bullet de DESIGN.md (escopo estrito; debt em MEMORY.md)
- [ ] Ordem alfabetica preservada na secao "Read Before Major Changes"
- [ ] Nenhum golden file ficou desatualizado (todos os testes passam)
- [ ] `bun run lint` passa sem warnings novos
- [ ] Greenfield init produz `AGENTS.md` com o link de CODE_STYLE.md presente (verificavel manualmente)

---

## Criterio de Aceite

**Por maquina:**
- `grep -c 'docs/CODE_STYLE.md' skills/init/assets/templates/AGENTS.md.tpl` retorna `>= 1`
- `grep -c 'docs/DESIGN.md' skills/init/assets/templates/AGENTS.md.tpl` retorna `0` (DESIGN.md intencionalmente ausente nesta fase — escopo estrito)
- `bun test skills/init` passa
- `bun test tests/e2e/init-tracer-bullet.test.ts` passa

**Por humano:**
- Ao abrir `AGENTS.md` apos greenfield init, dev consegue identificar em 5s o link para
  `docs/CODE_STYLE.md` na secao "Read Before Major Changes" e entender via descricao
  que e companion ao DESIGN.md.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->

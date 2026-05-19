# Plano 05: Progress.txt import + SKILL.md + E2E

**Feature:** init-llm-driven-harness-population ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~4h
**Depende de:** Plano 03 (gerador LLM-driven do PLAN populate), Plano 04 (reentry + validator)
**Desbloqueia:** merge final da feature (entrega completa da Trilha 2)

---

## O que este plano entrega

Conhecimento legado (`.claude/progress.txt`, 140+ gotchas) e preservado como entradas compound em `docs/compound/_imported/` com proveniencia por linha. Mensagem final da SKILL.md aponta para o `PLAN.md` populate gerado e mostra o comando `/anti-vibe-coding:execute-plan` exato (resolve Bug D). Suite E2E `tracer-bullet` reescrita para o novo fluxo (scaffold -> PLAN.md gerado -> fase-a-fase manual) com golden file regenerado (CA-10, R5 da revisao).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Step 91 emite `PLAN.md` em pasta datada predizivel | Plano 03 fase-04 + fase-05 | pronto |
| Reentry guard funcional (re-init com `progress.txt` pre-existente) | Plano 04 fase-01 | pronto |
| Validator warning mode (nao aborta apos PLAN.md gerado) | Plano 04 fase-04 | pronto |
| Lista canonica de docs (incluindo `CODE_STYLE.md`) no `TEMPLATE_MANIFEST` | Plano 02 fase-01 | pronto |
| Steps 07/08/09/11 removidos do registry | Plano 01 fase-02, fase-03 | pronto |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| `docs/compound/_imported/` populado | feature merge final (CA-05 verificavel em fixture) |
| SKILL.md "Apos init concluir" atualizado | dev final user (CA-11) |
| E2E tracer-bullet validando novo fluxo + golden regenerado | CI / verify-work pos-merge (CA-10) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-progress-txt-parser.md | Lib `progress-txt-parser.ts` parseia `.claude/progress.txt` em `ProgressEntry[]` com numero de linha de origem | 1h | — |
| 02 | fase-02-compound-imported-writer.md | Lib `compound-imported-writer.ts` escreve N arquivos em `docs/compound/_imported/{nnnn}-{slug}.md` + `INDEX.md`; novo step 13 invoca parser + writer | 1.5h | fase-01 |
| 03 | fase-03-skill-md-final-message.md | `skills/init/SKILL.md` "Apos init concluir" menciona PLAN.md gerado + comando `/anti-vibe-coding:execute-plan` exato + PR review (CA-11) | 0.5h | — |
| 04 | fase-04-e2e-tracer-bullet-novo-fluxo.md | `tests/e2e/init-tracer-bullet.test.ts` reescrito + `__golden__/init-greenfield.stdout.txt` regenerado (CA-10, R5) | 1h | fase-01, fase-02, fase-03 |

---

## Grafo de Fases

```
fase-01 (parser)            fase-03 (SKILL.md final message)
    |                              |
    v                              |
fase-02 (writer + step 13)         |
    |                              |
    +-------------+----------------+
                  |
                  v
            fase-04 (E2E + golden)
```

**Paralelismo possivel:** fase-03 e independente de fase-01/02 e pode ser feita em paralelo. fase-04 e o handoff final — todas as anteriores precisam estar verdes.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A (Plano 01 ja teve o tracer da feature). Este plano e o "anel de fechamento": converte entregas dos planos anteriores em evidencia executavel.

---

## Gotchas Conhecidos

- **G1:** Formato de `progress.txt` na natureza nao e canonico. Em Licitar tem mistura de `### [Categoria] Title`, `### N. Title`, `**Contexto:** ... **Erro:** ... **Solucao:**`, e secoes `## Gotchas Conhecidos`. Parser deve ser tolerante (heurıstico) com fallback: bloco entre dois `### ` consecutivos vira 1 entrada, mesmo se o corpo nao tiver os campos canonicos. Numero da linha de origem (1-indexado) sempre preservado.
- **G2:** Slug derivado do title pode colidir (ex: 2 gotchas com "Rate Limit"). Solucao: prefixo `{nnnn}-` zero-padded por ordem de aparicao no arquivo (`0001-`, `0002-`, ...). Indices NAO sao reutilizados em re-run — em re-init re-popula com backup, conteudo antigo ja foi para `docs/_legacy/pre-6.5.0/` (Plano 04 fase-02).
- **G3:** `docs/compound/_imported/` esta DENTRO de `docs/compound/`. O pre-existente `docs/compound/INDEX.md` (se existir) NAO deve ser modificado — o INDEX novo e local a `_imported/`. Validator allowlist (Plano 04 fase-03) precisa incluir o padrao `docs/compound/_imported/**` para nao gerar warnings.
- **G4:** Mensagem final da SKILL.md e renderizada DEPOIS do registry no orquestrador do `/init`. Verificar como `run-init.ts` propaga path da pasta gerada para a string final (Plano 03 fase-05 expoe `result.populatePlanPath` ou similar — confirmar). NAO hardcodar a data; ler do estado real.
- **G5:** Golden file `tests/e2e/__golden__/init-greenfield.stdout.txt` ja existe e tem normalizacao especifica (timestamp de `populate-harness/`). Ao regenerar, RODAR test em modo `--write-golden` (se infra existir) ou regravar manualmente a partir do output normalizado. NAO commitar paths absolutos do `tmpDir`.
- **G6:** Suite atual `init-tracer-bullet.test.ts` (linhas 32-116) ainda chama `scaffoldTemplates` + `scaffoldFullTree` + `linkClaudeToAgents` direto, sem passar pelo `runInit` orquestrado. Migrar para `runInit([], {...})` (padrao da `init-cutover-greenfield.test.ts`). Tracer-bullet atualizado vira "happy path do dispatcher", nao "API de bibliotecas individuais".
- **G7:** `.claude/progress.txt` pode nao existir em greenfield (fixture sem `.claude/`). Step 13 (writer) deve ser soft-fail: se ausente, retorna `{ mutated: false, summary: 'no progress.txt — skipped' }`. CA-05 so exercita o caso "presente"; greenfield cobre o "ausente" sem regressao.
- **G8:** Encoding `progress.txt` em Licitar e Dashboard Comu pode variar (UTF-8 BOM vs sem BOM). Parser deve usar `fs.readFile(path, 'utf-8')` que strip BOM automaticamente; teste explicito com fixture UTF-8 BOM para garantir.
- **G9:** Entrada de proveniencia (`source: .claude/progress.txt linha X`) deve usar path RELATIVO ao cwd do projeto, NAO absoluto. Subagentes de `execute-plan` consomem o link e podem rodar em paths diferentes.
- **G10:** SKILL.md (resolver Bug D, CA-11) so tem 2 alteracoes textuais mas a mensagem precisa caber em <=10 linhas para nao quebrar telas pequenas no terminal. Manter conciso, foco no comando exato.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->

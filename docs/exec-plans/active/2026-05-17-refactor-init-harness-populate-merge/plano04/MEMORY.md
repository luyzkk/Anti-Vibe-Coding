# Memoria: Plano 04 — Merge Invertido Destrutivo

**Feature:** refactor-init-harness-populate-merge
**Iniciado:** 2026-05-18
**Status:** pendente

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** Marcadores no skeleton usam `./akita-XXX.md` (mesma pasta) — Step 10 (fase-03) lê snippets diretamente de `skills/init/assets/snippets/` pelo filename. O `../` original no spec era armadilha intencional documentada no fase-01.md — preferir path explícito relativo ao arquivo skeleton. Marcadores literais são strings que o Step 10 busca e resolve independentemente do path relativo ao destino final (`docs/DESIGN.md`).

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** Glob recursivo do Bun retorna paths com `\\` no Windows mesmo com `posix: true`
  - Descoberto em: fase-04
  - Impacto: rewrite de links Markdown precisa normalizar `\\` -> `/` antes do regex
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-05 planejava skip apenas de README.md raiz, expandiu para README.md de subprojetos tambem
  - Motivo: D6 nao distingue, conservador por seguranca
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 7 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 05) PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- A preencher durante execucao:

- **API publica final de `lib/doc-mover-stub.ts`:** assinatura exata de `moveDocWithStub({ source, target, repoRoot, dryRun? })`, formato do `MoveResult { moved, stubWritten, linksRewritten: number, externalLinks: ReadonlyArray<{ file, line, url }>, errors: ReadonlyArray<{ stage: 'rename'|'stub'|'rewrite', message }> }`, e regex literal usado em `rewriteInternalLinks` (Plano 05 fase-04 rollback inverso precisa do regex inverso).

- **API publica final do Step 09 (propose-merge-batch):** formato do payload retornado quando `mutated: false`, formato do diff agregado renderizado (Plano 05 fase-02 cria renderer compartilhado a partir desse formato).

- **API publica final do Step 10 (apply-merge-destructive):** confirmar contrato do append-to-backup com `lib/backup-anti-vibe.ts` (helper local `appendToLatestBackup` foi necessario? ou o helper canonico do Plano 01 ja suporta append nativamente?). Plano 05 fase-04 (rollback completo) le exatamente o manifest gerado por este step.

- **API publica final do Step 11 (move-docs-with-stub):** formato do report quando ha bloqueios por `blockedBySecret`, formato do report quando ha skip de README, formato do report quando `moveDocWithStub` retorna `errors[]` parcialmente populado.

- **Schema do backup manifest apos uso real:** confirmar que `action: 'transform' | 'move' | 'overwrite'` cobre todos os casos observados. Se algum step precisou de outra action (ex: 'extract' para Akita → DESIGN.md), documentar.

- **Decisao sobre CH-02 ("ver detalhe por arquivo"):** marcada como TODO inline na fase-02 (`// TODO CH-02`). Plano 05 fase-02 (renderer compartilhado) decide se aproveita o renderer para implementar CH-02 ou deixa para v6.5+.

- **Posicao final dos steps no registry apos reorder (D23):** lista exata da ordem do `registry` apos fase-06, mostrando onde Step 10 entrou e onde Step 02 ficou. Plano 05 fase-05 (`--additive-merge`) precisa saber a posicao para skip cirurgico.

- **Lista de testes do Step 02 (link-claude-agents) atualizados em fase-06:** paths exatos dos arquivos de teste tocados + descricao do ajuste feito (ex: "fixture passa a fornecer CLAUDE.md ja espelho ≤40 linhas"). Plano 07 fase-03 (E2E CA-12) precisa confirmar que o fixture greenfield-v6.4 nao quebra esses testes.

- **Stub `logAudit` ainda eh no-op:** Plano 06 fase-01 conecta ao `AuditLogWriter`. Strings literais ja fixadas em fase-02/03/05: `init-propose-merge`, `init-apply-merge`, `init-move-docs`.

- **Texto exato da nova regra no SKILL.md (fase-07):** copiar aqui o paragrafo final aprovado, pois Plano 06 fase-03 (ADR) e fase-04 (CHANGELOG) citam o texto verbatim.

-->

---

<!-- Atualizado automaticamente durante execucao -->

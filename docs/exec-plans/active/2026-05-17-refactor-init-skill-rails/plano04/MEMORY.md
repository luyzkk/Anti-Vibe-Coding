# Memoria: Plano 04 — Extracao de rationale + Akita + Cutover

**Feature:** refactor-init-skill-rails
**Iniciado:** 2026-05-17
**Status:** concluido (5/5 fases)
**Commits:** e92c3cf (fase-01), e4690be (fase-02), f372117 (fase-03), e47ca88 (fase-04), (fase-05 — este commit)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

- **DI-P04F01-1 (fase-01):** Preservar formato original dos IDs (sem hifen vs com hifen — ex: `R2` e `DI-4`)
  - Por que: SKILL.md atual mistura formatos. Padronizar quebraria grep por `R2` em steps que ja foram portados.
  - Impacto: init-rationale.md documenta convencao no header. Plano 04 fase-03 (cutover) deve seguir o mesmo formato ao referenciar IDs no novo SKILL.md.

- **DI-P04F01-2 (fase-01):** IDs adicionais descobertos pelo grep alem do checklist minimo do PRD foram incluidos (CA-01, CA-03, CA-04, CA-05, D1, D2, D4, D16)
  - Por que: scan estatico do PRD listava apenas o "minimo garantido". O grep da fase-01 encontrou mais IDs em uso real no SKILL.md.
  - Impacto: total de 34 entradas no init-rationale.md (vs 15 esperados). Fase-05 (cross-reference check) precisa verificar TODOS os 34, nao apenas os 15 do PRD.

- **DI-P04F02-1 (fase-02):** Snippets criados sem cabecalho de proveniencia/header
  - Por que: convencao herdada de `delivery-loop.md` — sem frontmatter, sem H1, comeca direto com `## {Heading}`. O git carrega o historico.
  - Impacto: padrao reusavel. Fase-03 (cutover) injeta os snippets via leitura de arquivo, nao via merge de blocos com metadata.

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
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

- **GT-P04F02-1 (fase-02):** Git no Windows com `core.autocrlf=true` emite warnings "LF will be replaced by CRLF" ao stagear arquivos LF puros
  - Descoberto em: fase-02
  - Impacto: warnings sao cosmeticos — git armazena LF internamente. Nao bloqueia commit. Para fases 03/04 que tambem criam markdown com LF, esperar os mesmos warnings (ignorar).

- **DI-P04F05-1 (fase-05):** 19 IDs em `init-rationale.md` marcados como transversal/historico no gate de cross-reference R5.
  - Por que: IDs como DI-01, DI-04, R2, R14, M3, M7, M8, gate:* implementam comportamentos que existem nos steps mas nao sao citados pelo ID especifico do rationale. Os steps usam comentarios com `PRD CA-06`, `G7 do plano` etc., nao o ID do rationale.
  - Decisao batch: declarar todos os 19 transversal (comportamento existe no codigo, citacao pelo ID especifico seria ruido de engenharia). Nenhum removido do rationale — sao documentacao valida para mantenedores.
  - Impacto: proximos mantenedores que rodarem cross-reference devem entender que o gate verifica presenca funcional, nao citacao ID-a-ID. Adicionar comentario JSDoc `// PRD {ID}` seria opcional/backlog.

- **GT-P04F05-1 (fase-05):** `bun run test` (script wrapper) retorna exit 255 pre-existente, mas `bun test` direto retorna 0. O script `scripts/run-tests.ts` usa `Bun.spawn` com `stdio: 'inherit'` — em Windows, o exit code 255 eh artefato do processo filho sendo encerrado pelo shell. Nao e regressao deste plano — comportamento igual em todos os commits anteriores.

- **GT-P04F01-1 (fase-01) — confirma DEV-P03F04-2:** Divergencia SKILL.md linha 174 (`reason.includes('source-missing')`) vs helper `migrateLessons` (retorna `'no lessons-learned.md in backup'`) documentada na secao DEV historic do init-rationale.md
  - Descoberto em: fase-01 (re-confirmacao)
  - Impacto: a condicional do SKILL.md nunca matcha em runtime. O step ja resolveu usando `report.status === 'skipped'`. **Fase-03 (cutover) NAO precisa replicar a condicional quebrada do SKILL.md** — o manifest novo aponta para o registry, que ja contem a versao corrigida.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 2 (DEV-P03F03-1 fixture, DEV-P03F04-1 backup path, GT-P03F05-1 duplicata dry-run) |
| Bugs encontrados | 0 |
| Linhas removidas do SKILL.md | 1129 (1215 -> 86) |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

Nenhum plano sucessor — este eh o ultimo plano da feature. Notas de fechamento:

- **2026-05-17 — cutover concluido pelo Plano 04:** os steps de todos os planos agora executam pelo dispatcher `skills/init/lib/run-init.ts`. `SKILL.md` reescrito como manifest (86 linhas). Rationale extraido para `docs/design-docs/init-rationale.md`. Snippets Akita em `skills/init/assets/snippets/akita-*.md`. E2E goldens em `tests/e2e/__golden__/init-{greenfield,legacy-v5}.{stdout.txt,tree.json}`.
- **Feature concluida 2026-05-17:** `refactor-init-skill-rails` entregou o cutover Rails-style completo.
- **Rollback seguro:** `git revert f372117` reverte o SKILL.md ao formato inline (1215 linhas). Steps permanecem funcionais — sao wrappers sobre helpers existentes.
- **Licoes para capturar via `/lessons-learned`:**
  - Padrao Rails-style (manifest + dispatcher) aplicado a SKILL.md
  - Estrategia de cutover big-bang com goldens E2E pre-gravados
  - Cross-reference grep como gate contra IDs orfaos em rationale extraido
- **docs/STATE.md** atualizado com `refactor-init-skill-rails: concluido` (2026-05-17).

---

<!-- Atualizado automaticamente durante execucao -->

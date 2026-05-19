# Memoria: Plano 03 — Gerador LLM-driven do PLAN populate

**Feature:** init-llm-driven-harness-population
**Iniciado:** 2026-05-19
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Usar `slice(0, 100)` em vez de `split('\n').slice(0, 100)` no discovery
  - Por que: arquivo binario disfarcado de .md nao quebra
  - Impacto: first100Lines pode ter truncamento mid-line, aceitavel
-->

- **DI-Plano03-fase01-sequential:** Walk + leitura mantidos sequenciais (`for...of`), sem `Promise.all`.
  - Por que: G8 do README — performance ainda dentro do limite (< 500ms para 100 docs), e ordering deterministica para snapshot e diff de PR.
  - Impacto: simplicidade > paralelismo prematuro. Otimizar so se medicao real mostrar problema.
  - Aplicado em: fase-01.

- **DI-Plano03-fase01-refactor-noop:** `takeFirst100Lines` ja extraida no spec — REFACTOR foi no-op.
  - Por que: a propria fase doc Passo 3 ja a colocou como funcao isolada.
  - Impacto: sem novo commit de REFACTOR; commits RED + GREEN suficientes.

- **DI-Plano03-fase02-typecheck-substitui-lint:** Projeto nao tem script `lint`. Usado `bun run typecheck` como gate para o novo arquivo.
  - Por que: rule do CLAUDE.md global pede lint + test, mas o projeto so tem typecheck. CA do plano cita lint — interpretado como `typecheck` no contexto.
  - Impacto: validacao equivalente; documentado aqui para evitar discussao em fases seguintes.
  - Aplicado em: fase-02 (e ja aplicado implicitamente em fase-01).

- **DI-Plano03-fase04-datepathsafe:** `datePathSafe()` em `populate-plan-generator.ts` ajustado de `YYYY-MM-DDT...Z` para `YYYY-MM-DD` (date-only).
  - Por que: G5 do README — /execute-plan usa glob `docs/exec-plans/active/YYYY-MM-DD-*/`. Slug antigo `2026-05-19T10-00-00Z-populate-harness` nao bate o glob (T depois da data, nao hifen). Slug novo `2026-05-19-populate-harness` bate.
  - Impacto: pasta gerada agora e enumerada pelo /execute-plan sem intervencao. Compat G5 confirmada. Testes v1 e v2 do generator continuam passando (regex `/docs\/exec-plans\/active\/.+-populate-harness$/` e verificacao "sem colons" continuam satisfeitas).
  - Aplicado em: fase-04. Arquivo afetado: `populate-plan-generator.ts` (funcao `datePathSafe`, unica ocorrencia).

- **DI-Plano03-fase04-comment-backslash:** JSDoc com backtick contendo `*/` termina o comentario prematuramente em TypeScript/JavaScript. Substituido por comment de linha `//` para evitar o bug. Armadilha classica — evitar `*/` em JSDoc.
  - Por que: primeiro attempt usou `/**` e a linha continha `docs/exec-plans/active/YYYY-MM-DD-*/` que fechou o comentario no `*/`.
  - Impacto: zero em runtime; apenas cuidado editorial ao documentar globs em JSDoc.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Renderer v2 emite 9 fases em vez de 10
  - Causa: TEMPLATE_MANIFEST nao tinha CODE_STYLE.md (dependencia Plano 02 fase-01 nao foi para main)
  - Fix: rebase em cima do branch do Plano 02 antes de iniciar fase-05
  - Fase afetada: fase-05
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** `fs.access` no Windows e case-insensitive — paths com case errado passam validacao
  - Descoberto em: fase-02
  - Impacto: stack-aware paths podem incluir paths "fantasma" em projetos Windows com case-sensitive design
-->

- **GT-Plano03-fase01-bun-summary:** Bun test summary line ("N pass, M fail") so aparece em TTY. Output pipado/capturado perde a contagem.
  - Descoberto em: fase-01
  - Impacto: para verificar contagem em scripts/CI, rodar com escopo narrower (path especifico) ou parsear linhas individuais.

- **GT-Plano03-fase01-python:** `python3` nao disponivel no env Windows do dev. `node -e` inline usado para gerar fixture large.md de 123 linhas.
  - Descoberto em: fase-01
  - Impacto: fases futuras que precisam gerar fixtures grandes devem preferir `node -e`/`bun -e` sobre `python3`.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-04 planejava `populate-plan-writer.ts` separado, implementou inline em populate-plan-generator.ts
  - Motivo: writer ficou < 30 linhas, separacao premature
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 4 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

**Para Plano 04 (Reentrada + Validator allowlist + Audit Step 12):**

<!-- Preencher ao concluir plano 03. Itens esperados:
- `discoveryManifestLight()` exportado de `skills/init/lib/discovery-manifest-light.ts` —
  validator do Step 90 pode reusar para warnings agrupados ("ARCHITECTURE.md: 0 refs a arquivos reais")
- Tipo `DiscoveryManifestEntry` reusavel: `{ path, size, first100Lines }`
- Step 91 agora gera pasta em `docs/exec-plans/active/{date}-populate-harness/` — reentrada
  guard precisa identificar essa pasta como artefato canonico (nao apagar em re-init)
-->

**Para Plano 05 (Progress.txt import + SKILL.md + E2E):**

<!-- Preencher ao concluir plano 03. Itens esperados:
- Pasta `plano-populate-harness/` substitui PLAN.md monolitico — SKILL.md `Apos init concluir`
  deve apontar para a PASTA, nao para arquivo. Comando: `/anti-vibe-coding:execute-plan docs/exec-plans/active/{date}-populate-harness/`
- E2E novo: assertion `expect(filesInPlanFolder.length).toBeGreaterThanOrEqual(10)` cobre CA-01
- E2E novo: stack fixture Next.js+Supabase deve ter `expect(architecturePhaseContent).toMatch(/src\/app|supabase\/migrations/)` para cobrir CA-02
- snippet `assets/snippets/populate-plan-template.md` ficou orfao — cleanup candidato (G4)
-->

**Cleanup pendente apos Plano 03 verde (registrar em TODO.md):**

- [ ] Deletar `skills/init/assets/snippets/populate-plan-template.md` apos confirmar zero callers
  (renderer v2 emite markdown programatico, nao usa mais template com `{{TASKS_BLOCK}}`)
- [x] Verificar compatibilidade de `/anti-vibe-coding:execute-plan` com pasta `*-populate-harness`
  (G5 do README). CONFIRMADA em fase-04: slug ajustado para `YYYY-MM-DD-populate-harness`,
  bate glob `YYYY-MM-DD-*` do execute-plan Step 1a. Ver DI-Plano03-fase04-datepathsafe.

---

<!-- Atualizado automaticamente durante execucao -->

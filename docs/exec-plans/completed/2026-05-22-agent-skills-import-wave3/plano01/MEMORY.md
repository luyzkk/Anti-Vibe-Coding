# Memoria: Plano 01 — Consolidacao /anti-vibe-review -> /verify-work

**Feature:** Agent-Skills Import — Wave 3
**Iniciado:** 2026-05-23
**Status:** completed (4/4 fases — PASS)

---

## Decisoes de Implementacao

- **DI-1 (fase-01):** Bucket A com exatamente 3 conceitos identificados — Staged/Unstaged (linhas 154-163), grep-c heuristica (linha 64), Deep Modules inline check (linhas 77-81).
  - Por que: gap analysis revelou que `anti-vibe-review` tem 7 secoes de checklist (Bucket B) totalmente cobertas por auditores delegados em `verify-work`. Apenas estes 3 conceitos sao genuinamente unicos.
  - Impacto: fase-03 absorve EXATAMENTE estes 3 conceitos. Resolucao de Modelo NAO absorver (Bucket B — duplica Step 2d de verify-work).

- **DI-2 (fase-01):** `skills/tdd-workflow/references/deep-modules.md` confirmado existir no filesystem.
  - Por que: anti-vibe-review:81 cita esse arquivo. Sem verificacao, fase-03 poderia introduzir broken link em verify-work.
  - Impacto: fase-03 pode referenciar `deep-modules.md` sem hesitacao.

- **DI-3 (fase-01):** Telemetria TypeScript em verify-work/SKILL.md (linhas 10-57 e 562-583) marcada como nao-tocar.
  - Por que: G4 do README explicito; absorcao deve operar em secoes markdown intermediarias.
  - Impacto: fase-03 insere conteudo entre o final do markdown ativo e o bloco TypeScript final.

- **DI-4 (fase-02):** Deprecation notice inserido em anti-vibe-review/SKILL.md linha 17, exatamente apos H1 (linha 15). Texto copiado literalmente do spec do fase-02.
  - Por que: G3 do README — notice vai APOS H1, nao no topo absoluto (linhas 1-13 sao comentario HTML + frontmatter).
  - Impacto: arquivo total agora tem 217 linhas (era 204). CA-01 satisfeito. fase-04 vai revalidar CA-10 confirmando que conteudo apos linha 31 esta intacto.

- **DI-5 (fase-03) — RESOLVIDO 2026-05-23:** Armadilha original — script usava `process.env.PLUGIN_VERSION || '6.0.0'` (default hardcoded e desatualizado). Fix aplicado: `scripts/generate-manifest.js` agora le `package.json.version` como fonte unica de verdade (env var permanece como override opcional). NPM script `bun run generate:manifest` adicionado. Invocacao sem env var produz 7.1.0 corretamente.
  - Impacto antes do fix: Plano 04 fase-04 precisava de invocacao especial.
  - Impacto apos o fix: invocacao padrao `bun run generate:manifest` funciona — sem ritual. GT-1 do STATE.md global da Wave 3 (apontado para Plano 04) tambem se torna obsoleto.

- **DI-6 (fase-03):** 3 absorcoes em verify-work/SKILL.md sao puras adicoes (DT-5 do PRD aplicado). Nenhuma secao existente modificada. Telemetria TypeScript intacta (3 hits antes e apos — `grep -c "writeTelemetryStart|writeTelemetryEnd"`).
  - Por que: DT-5 — refactor por adicao, nao substituicao. G4 do plano — telemetria nao tocar.
  - Impacto: fase-04 valida CA-02 (delta absorvido) e CA-10 (backward-compat de anti-vibe-review). Conteudo de verify-work cresceu sem regressao.

- **DI-7 (fase-03):** 8 testes pre-existentes falham mesmo no baseline: v6-path-whitelist (6) + CA-09 grep-deleted-steps (2). Nao introduzido por esta fase.
  - Por que: estado conhecido do repositorio antes da wave3 iniciar.
  - Impacto: fase-04 e qualquer plano futuro devem comparar contagem de falhas, nao exigir suite 100% verde. Baseline esta documentado aqui para auditoria.

## Bugs Descobertos / Notas warn

- **WARN-1 (fase-02):** Spec do fase-02 dizia `grep -c "grace period"` deveria retornar >=2, mas o texto literal do notice (tambem definido no spec) so tem 1 ocorrencia. Texto foi copiado fielmente — inconsistencia interna do spec, nao do codigo. Para spec futuros: validar criterios numericos vs texto literal antes de fechar.

---

## Bugs Descobertos

*(preenchido durante execucao)*

<!-- Formato:
- **BUG-N:** sintoma
  - Causa: causa raiz
  - Fix: o que foi feito
  - Fase afetada: fase-NN
-->

---

## Gotchas

*(preenchido durante execucao — armadilhas que planos futuros precisam saber)*

<!-- Os gotchas conhecidos antes da execucao estao no README.md (G1-G7).
     Esta secao captura apenas o que foi DESCOBERTO durante implementacao. -->

---

## Desvios do Plano

*(preenchido durante execucao — se vazio ao fechar, otimo sinal)*

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 4 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

*(preenchido ao fechar este plano — informacao que Planos 02/03/04 precisam saber)*

**Plano 04 fase-03 (flowchart AGENTS.md):** validar que o texto do notice de deprecation usa exatamente a frase `/verify-work` (sem aspas) para que o flowchart possa referenciar consistentemente. CONFIRMADO: notice em linha 17 cita `/verify-work` literalmente (sem aspas). Tambem usa `/anti-vibe-coding:anti-vibe-review` e `/anti-vibe-coding:verify-work` (full plugin path) nas instrucoes de migracao.

**Plano 04 fase-04 (manifest final):** o checksum de `anti-vibe-review/SKILL.md` e `verify-work/SKILL.md` ja foi regenerado em fase-03 deste plano. Plano 04 fase-04 regenera novamente apos outras edicoes — confirmar que estes dois arquivos nao tiveram drift entre as duas regeneracoes. ~~**CRITICO:** usar `PLUGIN_VERSION=7.1.0 bun scripts/generate-manifest.js` — sem a env var, manifest gera com 6.0.0 e teste todo-pick falha (ver DI-5).~~ **OBSOLETO (2026-05-23):** DI-5 resolvido na raiz; use `bun run generate:manifest` sem env var.

**Todos os planos seguintes:** baseline de testes tem 8 falhas pre-existentes (v6-path-whitelist x6 + CA-09 grep-deleted-steps x2). Nao exigir 100% verde — comparar com baseline.

~~**Plano 04 GT-1 STATE.md update sugerido:** atualizar GT-1 de `bun scripts/generate-manifest.js direto` para `PLUGIN_VERSION=7.1.0 bun scripts/generate-manifest.js` — detalhe critico descoberto em fase-03.~~ **OBSOLETO (2026-05-23):** GT-1 inteiro nao se aplica mais. `bun run generate:manifest` funciona direto (DI-5 root-caused e resolvido em scripts/generate-manifest.js).

---

<!-- Atualizado automaticamente durante execucao -->

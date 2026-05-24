# Memoria: Plano 01 — Fundação + Bug Fix

**Feature:** compound-engineering-skill-port
**Iniciado:** 2026-05-23
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

### Decisões já tomadas no planejamento (input para subagentes das fases)

- **DI-Plano01-fase01-src-resolution:** Em fase-01, `getCompoundManifest()` resolve `src` absoluto via `path.resolve(import.meta.dir, '../../init/assets/templates', dst)` — paths AINDA apontam para `skills/init/assets/templates/` (transitório). O `git mv` físico só acontece no Plano 02 fase-01, que atualiza essa resolução para `path.resolve(import.meta.dir, '../assets', dst)`. Esta indireção é o coração do Tracer Bullet (fase-02): troca hardcode por função pura sem mover arquivos.
- **DI-Plano01-fase01-manifest-shape:** Retorno é `Array<{src: string, dst: string}>` (D7/D21). Sem campo `category` ou `required` — esses são preocupação do `template-manifest.ts` do init (que envolve o resultado de `getCompoundManifest()`). Boundary: skill compound expõe APENAS o subset compound; init decora.
- **DI-Plano01-fase01-10-entradas:** As 10 entradas compound em `skills/init/lib/template-manifest.ts` são (linhas 38, 55, 58-63, 66, 79):
  1. `docs/COMPOUND_ENGINEERING.md.tpl` → `docs/COMPOUND_ENGINEERING.md`
  2. `docs/compound/README.md.tpl` → `docs/compound/README.md`
  3. `docs/review-checklists/README.md.tpl` → `docs/review-checklists/README.md`
  4. `docs/review-checklists/security.md.tpl` → `docs/review-checklists/security.md`
  5. `docs/review-checklists/reliability.md.tpl` → `docs/review-checklists/reliability.md`
  6. `docs/review-checklists/agent-api.md.tpl` → `docs/review-checklists/agent-api.md`
  7. `docs/review-checklists/frontend-ui.md.tpl` → `docs/review-checklists/frontend-ui.md`
  8. `docs/review-checklists/production-readiness.md.tpl` → `docs/review-checklists/production-readiness.md`
  9. `docs/smoke-flows/README.md.tpl` → `docs/smoke-flows/README.md`
  10. `scripts/compound-check.ts.tpl` → `scripts/compound-check.ts`
- **DI-Plano01-fase02-mantém-ordem:** O refactor em `template-manifest.ts` precisa preservar EXATAMENTE a posição das 10 entradas no array. `TEMPLATE_MANIFEST` é `ReadonlyArray<TemplateEntry>` ordenado por camadas; o golden do scaffold itera nesta ordem. Trocar `{src, dst, required, category}` literais por iteração sobre `getCompoundManifest()` deve produzir entradas idênticas posicionalmente. Test de invariante obrigatório (G2 do README).
- **DI-Plano01-fase03-escopo-mínimo:** fase-03 NÃO copia o template do André literal — só substitui o bloco frontmatter dentro do `compound/README.md.tpl` atual. Conteúdo prosa (cabeçalho, seção "When to write", tabela Index) fica como está. A versão literal do André entra no Plano 02 fase-01 (D14). fase-03 fecha o bug MH-01 sem antecipar trabalho de outra fase.

- **DI-fase01-prefaces-tdd-gate:** O TDD gate do hook (`tdd-gate.cjs`) bloqueou a criação de `compound-engineering-prefaces.ts` sem teste prévio. Solução: criar `compound-engineering-prefaces.test.ts` como RED antes de criar o `.ts`. Dois testes adicionais (além dos 6 do manifest) — 8 testes no total para fase-01.
- **DI-fase01-prefaces-analogico:** Criado `skills/compound-engineering/lib/compound-engineering-prefaces.ts` com `COMPOUND_ENGINEERING_PREFACE_BY_PROFILE = {}` e `DEFAULT_COMPOUND_ENGINEERING_PREFACE = ''` — análogo de `lessons-learned-prefaces.ts`. Necessário para que o bloco de telemetria na SKILL.md referencie imports válidos sem quebrar build. Plano 03 preenche entradas por profile quando subcomandos forem implementados.
- **DI-fase01-typecheck-erros-preexistentes:** `bun run typecheck` aponta 7 erros em `skills/init/lib/populate-plan*` — todos pré-existentes, nenhum introduzido pela fase-01. Erros confirmados como GT-01 pré-existente (mencionado em MEMORY do Plano 01 original).

### Decisões tomadas na fase-03

- **DI-fase03-forma-a-tdd:** TDD Forma A escolhida — test de string-match em `README.md.tpl.test.ts` (6 testes). RED confirmado antes da edicao (6/6 falhando). GREEN confirmado apos edicao (6/6 passando). Forma B (roundtrip via compound-check) descartada por ser mais pesada e desnecessaria — Forma A prova CA-01 diretamente.
- **DI-fase03-bloco-yaml-escopo:** Apenas 4 linhas alteradas dentro do bloco yaml (date→title, author→category, decision→created, tags permanece com valor simplificado). Prosa (cabecalho, secao "When to write", tabela Index) byte-identica confirmada por `git diff`.
- **DI-fase03-goldens-intactos:** `git diff --stat tests/e2e/__golden__/` vazio — golden de conteudo nao referencia o interior do template. E2E `init-cutover-greenfield.test.ts`: 1 pass + 4 skip pre-existentes, 0 fail.
- **DI-fase03-lint-nao-configurado:** Confirmado novamente que `bun run lint` retorna "Script not found" (consistente com DI-fase02). Nao bloqueante.

### Decisões tomadas na fase-02

- **DI-fase02-spec-contradição-classificacao:** Spec da fase-02 Passo 1 dizia "9 canon-andre + 2 anti-vibe-extension" (listando smoke-flows como canon-andre), mas o código real tinha `smoke-flows/README.md` como `anti-vibe-extension` (linha 66). O Passo 3 (testes) dizia corretamente "7 canon-andre + 3 anti-vibe-extension". Regra 7 aplicada: código usado como fonte de verdade. COMPOUND_CATEGORY_BY_DST reflete o código real: 7 canon-andre + 3 anti-vibe-extension.
- **DI-fase02-compoundEntry-helper:** Abordagem escolhida para spread fragmentado: `compoundEntry(dst)` helper síncrono chama `buildCompoundEntries().find(...)`. Alternativa seria chamar `getCompoundManifest()` diretamente por index — descartada por ser frágil a reordenações em manifest.ts. Helper é O(10×10) mas manifest é pequeno e constante.
- **DI-fase02-TEMPLATES_ROOT-movido:** `TEMPLATES_ROOT` foi movido para antes do array `TEMPLATE_MANIFEST` (mas após o tipo `TemplateEntry`) para que `buildCompoundEntries()` possa referenciar na mesma scope. Export permanece inalterado.
- **DI-fase02-e2e-4-skips:** E2E `init-cutover-greenfield.test.ts` rodou com 1 pass + 4 skip (pré-existentes). MEMORY anterior dizia "2 com test.skip" — na realidade são 4. Nenhum skip introduzido por esta fase.
- **DI-fase02-lint-nao-configurado:** `bun run lint` retorna "Script not found" — lint não configurado neste projeto. Documentado para não repetir o check desnecessariamente.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

Nenhum bug novo descoberto nesta fase.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-fase01-tdd-gate-bloqueia-constants:** O TDD gate do hook bloqueia qualquer arquivo `.ts` sem teste prévio — inclusive arquivos de constantes/tabelas de dados sem lógica. Se criar arquivo análogo de prefaces em Plano 03, criar o `.test.ts` RED antes.
- **GT-fase02-compoundEntry-runtime-throw:** `compoundEntry(dst)` lança erro em runtime se dst não estiver em `COMPOUND_CATEGORY_BY_DST`. Se Plano 02/03 adicionar nova entrada compound em `manifest.ts`, precisa sincronizar o hash-map em `template-manifest.ts` simultaneamente — caso contrário init quebra em runtime (não em typecheck).

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-fase01-prefaces-test:** A fase especificava criar `compound-engineering-prefaces.ts` sem mencionar testes — o TDD gate forçou adicionar `compound-engineering-prefaces.test.ts` (2 testes). Desvio mínimo; contagem de testes subiu de 6 para 8.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 1 (desvio mínimo — 2 testes extras por TDD gate em fase-01) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

### Bug MH-01 fechado (fase-03)

- **MH-01 FECHADO:** `skills/init/assets/templates/docs/compound/README.md.tpl` agora tem schema canonico `title/category/tags/created`. CA-01 verificavel por maquina: `grep -E "^(title|category|created):" ... | wc -l` retorna 3; `grep -E "^(date|author|decision):" ... | wc -l` retorna 0.
- **Plano 02 fase-01 DEVE preservar schema:** O `git mv` fisico e/ou substituicao literal do template do Andre (D14) NAO deve reverter para `date/author/decision`. Se a versao literal do Andre tiver schema diferente, ADAPTAR para `title/category/tags/created` antes de commitar. Nao regredir MH-01.
- **Test de regressao existente:** `skills/init/assets/templates/docs/compound/README.md.tpl.test.ts` (6 testes) garante que qualquer regressao de schema sera detectada automaticamente. Nao deletar este arquivo em planos futuros.

Informacoes que o proximo plano (Plano 02 — git mv físico + goldens) PRECISA saber antes de comecar.

- `skills/compound-engineering/SKILL.md` criado com `user-invocable: true`, `disable-model-invocation: false`, `argument-hint: "install|check|gate|migrate [--strict] [--force]"` e bloco de telemetria literal de lessons-learned (profile-aware-preface + stale-capabilities-check).
- `skills/compound-engineering/lib/manifest.ts` exporta `getCompoundManifest()` com 10 entradas. `src` ainda aponta para `skills/init/assets/templates/` via `path.resolve(import.meta.dir, '../../init/assets/templates')`. Plano 02 fase-01 muda para `'../assets'` após `git mv`.
- `skills/compound-engineering/lib/compound-engineering-prefaces.ts` existe como stub — `COMPOUND_ENGINEERING_PREFACE_BY_PROFILE = {}` e `DEFAULT_COMPOUND_ENGINEERING_PREFACE = ''`. Plano 03 adiciona entradas por profile.
- `skills/compound-engineering/lib/manifest.test.ts`: 6 testes verdes. `skills/compound-engineering/lib/compound-engineering-prefaces.test.ts`: 2 testes verdes.
- `skills/init/lib/template-manifest.ts` NÃO foi tocado nesta fase — Plano 02 fase-01 refatora para consumir `getCompoundManifest()`.
- Goldens E2E `init-greenfield.tree.json` e `init-greenfield.stdout.txt` permanecem verdes — `git diff tests/e2e/__golden__/` vazio confirmado.
- `skills/compound-engineering/references/capture-guide.md` existe como placeholder; Plano 03 fase-03 preenche.

### Estado após fase-02 (input para Plano 02)

- `skills/init/lib/template-manifest.ts` agora **consome `getCompoundManifest()`** via import puro — hardcode das 10 entradas compound removido. `COMPOUND_CATEGORY_BY_DST` hash-map mantém classificação por dst. `compoundEntry(dst)` helper preserva posição posicional no array (G2).
- Plano 02 fase-01 precisa mudar APENAS a string `'../../init/assets/templates'` → `'../assets'` em `skills/compound-engineering/lib/manifest.ts` após `git mv` físico. O `template-manifest.ts` não precisa de alteração — `path.relative(TEMPLATES_ROOT, src)` continuará resolvendo corretamente.
- 14 testes verdes em `skills/init/lib/template-manifest.test.ts` (9 originais + 4 R11 + 1 D25).
- Goldens E2E `init-greenfield.tree.json` e `init-greenfield.stdout.txt` intactos.
- `bun run lint` retorna "Script not found" — lint não configurado neste projeto.

---

<!-- Atualizado automaticamente durante execucao -->

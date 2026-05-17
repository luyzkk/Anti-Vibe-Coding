# Memoria: Plano 03 — Skill Wire-up (6 cross-stack restantes)

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2)
**Iniciado:** 2026-05-16
**Concluido:** 2026-05-16
**Status:** completed

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01/02):** Bloco `stack-aware-preface` delega ao helper `getStackKnowledgePreface` (importado de `../security/lib/stack-aware-preface`) em vez de fazer `existsSync` inline como mostrado nos docs do plano (fase-01/02).
  - Por que: a MEMORY do Plano 01 (linha 120) declarou explicitamente que "Plano 03 deve **importar este helper** nas 6 skills cross-stack restantes". O helper foi extraído em commit `683a2c2` (verify-work HIGH #4) APÓS o plano03 ter sido escrito — MEMORY é mais recente que docs do plano e autoritativa. Plan docs descreviam pre-hardening state.
  - Impacto: zero duplicação de lógica entre as 7 SKILL.md. Testes assertam `getStackKnowledgePreface` + `'../security/lib/stack-aware-preface'` (não mais `existsSync`). Padrão de cross-skill import segue precedente (`execute-plan` importa de `../plan-feature/lib/fase-policy`).

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Vazio — nenhum bug durante esta execução. -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (fase-01, geral):** docs do plano (fase-01/fase-02) foram congelados num momento pré-verify-work do Plano 01 fase-04. A MEMORY do Plano 01 capturou a refatoração (extração para helper) e instruiu Plano 03 a usar a versão pós-refator. **Sempre conferir MEMORY do plano anterior antes de iniciar — ela é mais recente que os docs do próprio plano.**

- **GT-2 (fase-02, infrastructure/tdd-workflow):** template do plano mostrava texto "(após o `preface` profile-aware, se ambos existirem)" no rodapé do bloco. Em greenfield (skill sem profile-aware), esse trecho fica falso/confuso. Encurtado para `'Se vazio, ignore — comportamento da skill = v6.3.1 intacto (CA-09).'` Variação semântica esperada vs batch-1 — registrar em fase-03 não causou regressão (o E2E não asserta o texto após o bloco).

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-01/02):** Snippet inserido nas 6 SKILL.md NÃO é byte-idêntico ao template descrito nos docs do plano (`existsSync` inline). Em vez disso, **é byte-idêntico ao que `/security` realmente tem hoje** (import do helper `getStackKnowledgePreface`). DI-1 explica o motivo. CA-10 (insertion-only diff) preservado — apenas o conteúdo do snippet variou.

- **DEV-2 (fase-01/02):** Tests usam `bun:test` em vez de `vitest` como mostrado nos docs do plano. Mesma correção que Plano 01 fase-03 DEV-2 (projeto não usa vitest). Sem impacto funcional.

- **DEV-3 (fase-03):** E2E **não replica** lógica do preface inline (como o plano mostrava com `computeStackKnowledgePreface`). Importa diretamente `getStackKnowledgePreface` do helper real. Mais robusto contra drift entre teste e produção (fecha o gap que justificou o verify-work HIGH #4 originalmente).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 3 (DEV-1/2/3 todos resolvidos no mesmo sentido — usar helper, não duplicar) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| SKILL.md modificadas | 6 (api-design, system-design, design-patterns, architecture, infrastructure, tdd-workflow) |
| Tests files criados | 7 (6 wire tests co-localizados + 1 E2E) |
| Novos testes passando | 32 (9 fase-01 + 9 fase-02 + 14 fase-03) |
| Suite global final | 1066 pass, 11 fail (baseline mantido, +32 novos) |

### Log de execução

- **fase-01 (2026-05-16):** wire batch 1 (api-design, system-design, design-patterns). 6 arquivos modificados (3 SKILL.md + 3 testes co-localizados). Bloco inserido entre `<!-- profile-aware-preface:end -->` e `<!-- stale-capabilities-check:start -->`. Commit `5801d47`. 9 testes passando. Suite 1043 pass / 11 fail.
- **fase-02 (2026-05-16):** wire batch 2 (architecture, infrastructure, tdd-workflow). 6 arquivos modificados (3 SKILL.md + 3 testes). Architecture com anchor profile-aware:end; infrastructure e tdd-workflow greenfield (anchor = fechamento frontmatter). Commit `357f0b7`. 9 testes passando. Suite 1052 pass / 11 fail.
- **fase-03 (2026-05-16):** E2E final `tests/e2e/stack-aware-preface-all-skills.test.ts` — 14 asserts (7 skills × 2 cenários CA-05/CA-09). Importa `getStackKnowledgePreface` real, zero drift entre teste e produção. Commit `f16d2bd`. 14 testes passando. Suite 1066 pass / 11 fail. **Plano 03 COMPLETED.**

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Para Plano 04 — Atom Batch A (5 átomos tier 1)

- **As 7 skills cross-stack estão wired ao contrato `stack-aware-preface`.** Plano 04 NÃO precisa tocar em nenhuma SKILL.md — escreve apenas átomos novos em `docs/knowledge/nodejs-typescript/atoms/`. O wire das skills é responsabilidade do Plano 03 (concluído) e do Plano 06 (E2E final CA-01..CA-10).
- **Padrão de átomo está consolidado** em `docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md` (pilot do Plano 01 fase-02). Seguir frontmatter exato, cap 200 linhas, sources como lista de objetos `{research: <id>}` / `{skill: <nome>/SKILL.md}`. Plano 01 notas para "TODOS os planos seguintes" já cobriram isso (linhas 109-115 da MEMORY do Plano 01).

### Para Plano 05 / 06 — Atoms Batch B/C + INDEX final + E2E

- **Helper `getStackKnowledgePreface(projectRoot)` está em `skills/security/lib/stack-aware-preface.ts`** e é importado pelas 7 SKILL.md cross-stack. Se algum plano futuro precisar trocar a mensagem (`PREFACE_MESSAGE`), basta editar o helper — as 7 skills pegam automaticamente.
- **E2E `tests/e2e/stack-aware-preface-all-skills.test.ts` cobre CA-05 + CA-09 para as 7 skills.** Plano 06 fase-06 (E2E CA-01..CA-10) pode **reusar o array `SKILLS_CROSS_STACK`** e estender o setup para cobrir CA-01/CA-03/CA-06/CA-07 (init+stack.json+copy-knowledge fluxo completo end-to-end).
- **Setup inline com `mkdtempSync`** continua sendo o padrão (regra "extrair helper só com 3+ usos"). Plano 06 fase-06, se for o 3o uso, pode considerar extrair para `tests/e2e/helpers/temp-project.ts`.

### Guard rails do projeto (relembrar)

- **`bun:test`, nunca `vitest`** (DEV-2 cumprida em Plano 01 fase-03 e replicada aqui).
- **`bun run lint` não existe** (Plano 01 GT-2). Critérios mencionando lint = gap pré-existente, não bloqueante.
- **Baseline de testes em failure:** 11 fail estáveis (harness-validate-v6-path-whitelist 1, generate-manifest 2, readArchitectureProfile 6, architecture tracer-bullet 1, fase-policy 1). Garantir que cada fase nova não adicione regressão a esse baseline.

---

<!-- Atualizado durante execucao -->

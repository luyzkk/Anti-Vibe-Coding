# Memoria: Plano 02 — Use Crossing & Tolerance Cleanup (Should/Could)

**Feature:** v6.3.1 — Adaptive Coaching: Honesty & Wire-up
**Iniciado:** 2026-05-15
**Concluido:** 2026-05-16
**Status:** completed

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-05):** `grepReferences` matcha `parent-dir/basename-no-ext` (ex: `used-route/route`), nao apenas basename (`route`).
  - Por que: `route.ts` eh nome universal em Next.js App Router — basename puro casaria contra qualquer arquivo `route` no projeto, gerando falso-negativo (orphan-route ficaria "referenciado" porque used-route/route.ts matcha o pattern dele).
  - Impacto: matching mais especifico e correto. Tradeoff: re-exports de barrel sem caminho exato ainda nao sao cobertos (aceitavel por design — fase doc Gotcha "Re-exports barrel").
- **DI-2 (fase-05):** `computeParityGaps` virou async (breaking change interno) — todos os 5 callers atualizados em 1 commit.
  - Por que: Passo 3 da fase doc exige integracao de `crossCapabilitiesWithUsage` (async). Sem async, ou usa sync wrapper (gambiarra) ou cria funcao paralela. Async eh o caminho limpo.
  - Impacto: callers afetados: `scripts/parity-audit.ts`, `tests/parity-gaps-schema-v2.test.ts`, `skills/parity-audit/lib/__tests__/parity-gaps-writer.test.ts` (3 callbacks `it` async + await), `skills/init/lib/reuse-discovery.ts` (tipo + await), `skills/init/lib/reuse-discovery.test.ts` (mock async).
- **DI-3 (fase-05):** Mock error-path em `reuse-discovery.test.ts:246` mantido sync (sync-throw, nao Promise.reject).
  - Por que: `inspectToolRegistry` lanca ANTES de `computeParityGaps` ser chamado nesse teste — async/sync no mock nao tem efeito observavel.
  - Impacto: minimiza diff e mantem semantica original.
- **DI-4 (fase-05):** Fase-05 executada em 3 spawns (RED + GREEN minimo + integracao), nao 2.
  - Por que: GREEN inicial recebeu instrucao de focar APENAS em fazer os 2 tests `crossCapabilitiesWithUsage` passar — integracao com `computeParityGaps` ficou de fora desse spawn por ANCHOR de TDD (GREEN nao olha codigo alem de tests). Orquestrador detectou gap vs. Criterio de Aceite e spawnou 3o subagente.
  - Impacto: 3 commits para a fase (bae595b RED, c8811aa GREEN minimo, 77d33c6 integracao). Padrao replicavel para fases com integracao multi-arquivo: GREEN minimo + spawn de integracao.
- **DI-5 (fase-06):** RED inicial usou STUB no-op em vez de copia da implementacao alvo.
  - Por que: a fase doc duplica a logica em duas localizacoes (bloco SKILL.md inline + funcao `checkStaleCapabilities` no test). Se o RED ja tivesse a copia, os 3 tests passariam de cara — sem falha legitima. Stub no-op produz falha real (1/3) no caso "stale > 24h", mantendo os 2 no-op tests (absent + fresh) verdes (comportamento desejado para a stub).
  - Impacto: TDD honesto sem reescrever a estrutura do test. Padrao replicavel para fases onde a unidade-sob-teste vive duplicada por restricao de runtime (skills.md inline vs. test helper).
- **DI-6 (fase-06):** Bloco stale-check inserido EXATAMENTE identico nas 6 SKILL.md.
  - Por que: fase doc §Passo 2 — "Aplicar bloco IDENTICO nas 6 skills. NAO parametrizar nome da skill". Como o comportamento nao varia, parametrizacao seria YAGNI.
  - Impacto: 6 edits sequenciais com mesmo `old_string`/`new_string` por skill (diferindo apenas no H1 imediatamente posterior, usado como ancora de match). Custo de manutencao futuro: se a logica mudar, atualizar 7 locais (6 SKILL.md + test). SYNC comment apontando para o test.
- **DI-7 (fase-07):** Comentario do bloco profile-aware-preface em `skills/architecture/SKILL.md` mantem literal `architectureProfile` (lowercase 'a') alem de `readArchitectureProfile`.
  - Por que: `skills/lib/telemetry-utils.test.ts:190` ("architecture skill preserves Tracer Bullet code from Plano 01 fase-06") asserta `content.includes('architectureProfile')`. Sem o literal lowercase, a migracao quebraria esse tracer-bullet test legitimo (que valida que a skill ainda fala sobre o campo do manifest).
  - Impacto: comentario diz "Lê architectureProfile do manifest via readPrefaceContext" — preserva semantica do test sem reintroduzir `readArchitectureProfile()` como chamada. Padrao replicavel: tracer-bullet tests que assertam literal strings sao contrato — adaptar comentario antes de remover string.
- **DI-8 (fase-07):** Tolerancia de prosa-only convertida em ERRO explicito (`failures.push(...)`), nao removida silenciosamente.
  - Por que: fase doc §Passo 5 — "Convertida (nao removida silenciosamente)". Skill com bloco profile-aware-preface SEM fenced code passa a ser bug detectavel, alinhado com a decisao de converter `detect-architecture` para bloco TS canonico.
  - Impacto: regressao protegida pelo 2o teste novo. Onboarding futuro: autor de skill que esquecer o fenced code recebe mensagem clara em vez de comportamento silencioso.
- **DI-9 (fase-07):** CHANGELOG `[6.3.1]` adicionado consolidando todas as fases do release, nao apenas fase-07.
  - Por que: fase-07 e a ultima do release; fases anteriores nao tinham entrada propria. Single-entry release notes facilita changelog reading. Fase doc requisito minimo era "entrada referenciando esta fase" — escopo expandido pelo orquestrador.
  - Impacto: CHANGELOG segue padrao das releases anteriores (entry unica por version, com sub-secoes Added/Changed/Removed/Reservation). Broken-link em link errado (`skills/init/lib/capabilities-writer.ts`) detectado pelo harness e corrigido para `skills/lib/capabilities-writer.ts`.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Grep de imports em `crossCapabilitiesWithUsage` retorna falso-positivo em comentarios
  - Causa: regex `import.*['"]<handler>['"]` casa em `// import handler from ...`
  - Fix: filtrar linhas comecando com `//` antes do match
  - Fase afetada: fase-05
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (fase-05):** Pattern matching de imports em codebase Next.js precisa usar `parent-dir/basename-no-ext`, NAO apenas basename. `route.ts`, `page.tsx`, `layout.tsx` sao nomes universais.
  - Descoberto em: fase-05 (GREEN subagente identificou no primeiro tentativa).
  - Impacto: qualquer feature futura que faca grep-of-imports em App Router precisa adotar mesma estrategia.
- **GT-2 (fase-05):** Smoke do Criterio de Aceite (chamada direta de `computeParityGaps`) so funciona via arquivo `.mjs` no repo root + `bun arquivo.mjs`.
  - Por que: `bun -e "..."` mostra help message em Windows; `bun --eval "..."` idem; tdd-gate bloqueia Write em `*.ts`; bun resolve modulos relativos a partir do CWD (script em `/tmp` falha).
  - Workaround: `cat > arquivo.mjs <<'EOF' ... EOF` no repo root, depois `bun arquivo.mjs && rm arquivo.mjs`.
- **GT-3 (fase-05):** `git stash --include-untracked` em sessao de execucao pode bloquear `pop` se algum teste mutou fixture (ex: `tests/fixtures/v6-state-fixture/docs/STATE.md` recebe timestamp regenerado por e2e tests).
  - Workaround: `git stash push -m drift -- <fixture-path>` para isolar, `git stash drop` no isolado, depois `git stash pop` no original.
  - Nota: destructive-guard bloqueia `git checkout -- <file>` para discard direto; usar stash isolado eh o caminho safe.
- **GT-4 (fase-05):** GREEN-isolation pura nao captura integracao multi-arquivo. Se a fase exige refatorar callers downstream, GREEN sozinho nao faz — orquestrador precisa spawnar passo de integracao apos GREEN.
  - Impacto: previne falsos "complete" onde o codigo passa nos novos tests mas quebra contrato da fase. Ver DI-4.
- **GT-5 (fase-06):** Teste pre-existente `tests/harness-validate-v6-path-whitelist.test.ts` ja falha em `main` antes desta fase (1 fail, 7 pass). Confirmado via `git stash && bun test` na mesma sessao. Nao foi introduzido pela fase-06.
  - Impacto: continuar fluxo da fase sem trata-lo. Registrar para evitar repetir analise em fases futuras. Pode justificar item em TODO.md ou /iterate.
- **GT-6 (fase-07):** Tracer-bullet tests (literal string assertions tipo `expect(content).toContain('architectureProfile')`) sao contrato implicito que sobrevive a refactors.
  - Descoberto em: fase-07 (primeira passada removeu o literal lowercase e quebrou `telemetry-utils.test.ts:190`).
  - Workaround: ao migrar nomenclatura (X → Y), preservar literal X em comentario quando ha tracer-bullet test asserindo presenca. Comentario serve simultaneamente como documentacao da migracao E preservacao do tracer.
  - Pattern: rodar `bun test <test-file>` apos cada edit em SKILL.md migrada, nao apenas no final.
- **GT-7 (fase-07):** CHANGELOG broken-link check do harness eh path-sensitive ao filesystem real.
  - Sintoma: `harness:validate` falhou com `[broken-link] CHANGELOG.md has a broken relative link: skills/init/lib/capabilities-writer.ts`. O arquivo real vive em `skills/lib/capabilities-writer.ts` (sem `init/`).
  - Impacto: rascunhos de CHANGELOG com paths "intuitivos" mas incorretos sao pegos pelo harness. Workflow: rodar `harness:validate` apos cada edit no CHANGELOG, nao apenas no final.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-05):** Fase executada em 3 commits (RED + GREEN + integracao), nao 2 como o ciclo TDD classico (RED + GREEN).
  - Motivo: GREEN minimo focou apenas em fazer os 2 testes novos passar; integracao em `computeParityGaps` ficou para 3o spawn por ANCHOR de TDD (GREEN nao olha o resto).
  - Impacto: padrao "RED + GREEN minimo + integracao" deve ser default para fases com refator downstream em callers (ver DI-4 / GT-4).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 1 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Plano 02 e o ultimo da v6.3.1 — sem planos seguintes.
Notas vao para o SUMMARY da feature ao /iterate. -->

- v6.3.1 NAO preenche `PrefaceContext.language` / `framework` — reservado v6.5/v6.6 (D2 ADR-0020, CA-12)
- v1 schema permanece em `discovery/_schemas/` como deprecated ate v6.4
- Tolerancias removidas em fase-07 NAO devem voltar; harness-validate.ts agora exige bloco com fenced TS + `readPrefaceContext` em SKILL.md que opte-in
- **`computeParityGaps` agora eh async (DI-2 fase-05):** todo caller futuro precisa `await`. Assinatura: `(snapshot, taskType, rules?, capabilities?, projectRoot?) => Promise<ParityGapsOutput>`.
- **Pattern de matching `parent-dir/basename-no-ext` em App Router (GT-1 fase-05):** fase 06 ou futuras features que precisem grep-of-imports devem usar esse pattern (nao basename puro).

---

<!-- Atualizado automaticamente durante execucao -->

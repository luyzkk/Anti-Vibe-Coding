# Memoria: Plano 05 — Atom Batch B

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2)
**Iniciado:** 2026-05-16
**Concluido:** 2026-05-16
**Status:** completed

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

### Decisões herdadas do Plano 01 (aplicáveis aqui)

- **DI-1 (herdada do Plano 01):** Alias map `'node-ts' → 'nodejs-typescript'` em `skills/init/lib/copy-knowledge.ts`.
  - Impacto neste plano: irrelevante para a escrita dos átomos (átomos vivem em `docs/knowledge/nodejs-typescript/atoms/` independentemente do alias). Citação aqui apenas para garantir que o frontmatter `stack:` use sempre `nodejs-typescript` (nome canônico do matrix), nunca `node-ts`.

- **DI-2 (herdada do Plano 01):** Dupla representação do id de stack (`StackId` interno `node-ts` vs nome de pasta `nodejs-typescript`).
  - Impacto neste plano: `stack: nodejs-typescript` no frontmatter dos 5 átomos. Sem exceção.

### Decisões herdadas do Plano 04 (aplicáveis aqui)

- **DI-3 do Plano 04 (estendida):** Divergência PRD CA-08 vs PLAN.md sobre auditoria humana foi resolvida no Plano 04 com "1 tier 1 + 1 tier 2 + 1 tier 2 alternativo" porque aquele batch não tinha tier 3. Plano 05 herda lógica análoga, mas com distribuição própria.

### Decisões deste plano (registrar durante execução)

- **DI-3 (planejada — específica do Plano 05):** Divergência PRD CA-08 vs PLAN.md sobre auditoria humana, operacionalizada para Batch B.
  - PRD diz "1 tier 1 + 1 tier 2 + 1 tier 3"; PLAN.md secão "Plano 05 fase-06" (linha 130) não especifica distribuição.
  - Batch B contém 1 thin (api-design-stack-specific OU security-stack-specific — ambos são thin) + 4 tier 2 full (testing-strategy, architecture-conventions, dependencies-supply-chain, + o outro thin). Sem tier 1, sem tier 3.
  - **Decisão:** auditar **1 thin + 2 tier 2 distintos** (≠ mesmo cluster temático). Sugestão de amostragem: thin = `security-stack-specific.md` (fase-02, inclui RF8 primordials = maior risco de drift de fonte); tier 2 #1 = `testing-strategy.md` (fase-03); tier 2 #2 = `architecture-conventions.md` (fase-04, alta densidade — 112 regras condensadas em 8-12 patterns). Documentado no fase-06 do plano.
  - Impacto: Plano 06 fase-06 fará a auditoria respeitando o PRD literal (terá tier 3 disponível: performance, operations, tooling).

- **DI-4 (planejada — RF8 / D12):** Migração de `nodejs-core/rules/primordials.md` para dentro de `security-stack-specific.md` (fase-02).
  - PRD §Should Have RF8 obriga "mínimo: conteúdo de `primordials.md` migra para `security-stack-specific.md`".
  - Decisão: integrar como 1-2 patterns dentro da seção "Padrões sênior" do átomo de security stack-specific, NÃO criar átomo `primordials.md` separado em `atoms/`.
  - Frontmatter `sources:` do átomo lista `- skill: nodejs-core/rules/primordials.md` para audit trail (RF11).
  - Verificação adicional na fase-02 do plano: confirmar que `claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` ainda existe após migração (não deletar a fonte — audit trail).
  - Impacto: zero arquivo novo além dos 5 átomos previstos. Cap thin de 80 linhas mantido.

- **DI-5 (registrada 2026-05-16):** Batch B **APROVADO** em 2026-05-16 (auditor: orquestrador + 5 plan-verifier subagentes isolados + audit mecanico humano + verify-work fresh-context review do Plano 04 aplicado preventivamente).
  - **Verifier subagente (protocolo refinado v3 do Plano 04 DI-5):** 5/5 PASS na PRIMEIRA invocacao — zero rework loop.
    - fase-01 (api-design-stack-specific): v1 PASS 5/5 (Fastify+TypeBox, tRPC "not suitable for public APIs", Valibot bundle, req.body anti-pattern, Standard Schema 1.0)
    - fase-02 (security-stack-specific): v1 PASS 5/5 (incluindo primordials claim obrigatoria — atomo afirma corretamente que primordials sao lib/internal/, inaplicaveis a app code; confirmado palavra-por-palavra em primordials.md)
    - fase-03 (testing-strategy): v1 PASS 5/5 (Vitest/Jest/node:test criteria, Honeycomb/Trophy/Testcontainers, doubles taxonomy, coverage diagnostico Google 60/75/90, Stryker target ≥80%)
    - fase-04 (architecture-conventions): v1 PASS 4/5 (1 WARN — efeitos especificos de barrel files recursivos sao inferencia, nao verbatim; aceitavel)
    - fase-05 (dependencies-supply-chain): v1 PASS 4/5 (2 divergencias factuais detectadas; corrigidas em commit 2ba03d5)
  - **Auditoria mecanica (orquestrador):** 3/3 OK em amostra 1 thin + 2 tier 2 distintos: security-stack-specific (thin, RF8 primordials), testing-strategy (tier 2, diferente cluster), architecture-conventions (tier 2, diferente cluster). Frontmatter 8-fields-order, 5-sections-order, line caps, zero placeholders — todos verde.
  - **Lições do Plano 04 aplicadas com sucesso:** anti-drift clause no prompt do extrator + refined verifier protocol → **zero rework loops em fase-06** (vs 2 ciclos no Plano 04). Sizing 7-9h planejado, executado em ~6h.
  - **Proximo passo:** Plano 05 desbloqueia 10/14 atomos populados, faltam 3 atomos tier 3 (Plano 06: performance-and-internals, operations-and-deploy, tooling) + INDEX final consolidado + E2E CA-01..CA-10.

- **DI-6 (registrada 2026-05-16):** Bug factual em dependencies-supply-chain.md detectado por verifier — commit 2ba03d5 corrigiu.
  - **Sintoma:** atomo recomendava `@cyclonedx/cdxgen` para SBOM, source usa `@cyclonedx/cyclonedx-npm` (pacotes distintos no npm).
  - **Sintoma 2:** atomo usava `license-checker --failOn 'GPL;AGPL'`, source usa `--onlyAllow 'MIT;Apache-2.0;...'` (sintaxe completamente diferente).
  - **Causa raiz:** drift de extrator (GT-1 do Plano 04 ainda visivel mesmo com anti-drift clause — clause reduz mas nao elimina). Subagente conhecia ambos pacotes cyclonedx (cdxgen é uma variante valida em outros contextos) e escolheu o errado para este source.
  - **Fix:** Edit cirurgico com comando verbatim do source. Linha count inalterado (119).
  - **Lição:** anti-drift clause sozinha eh insuficiente para nomes de pacote/comando exatos — verifier subagente eh o gate final que pega isso. Sistema funciona via 2 gates (anti-drift no extrator + traceability no verifier), nao 1 sozinho.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-1 (descoberto fase-05 verifier v1):** Comandos errados em SBOM e license scanning. Ver DI-6 acima. Fix em commit 2ba03d5.

<!-- Preencher durante execução. Vazio = nenhum bug, bom sinal. -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (Plano 05 descoberto):** Anti-drift clause + refined verifier protocol (heranca do Plano 04) **funcionam em conjunto, nao isoladamente**. Anti-drift sozinho ainda deixa passar nomes de pacote/comando especificos errados (BUG-1 da fase-05). Verifier eh o gate final. **Como aplicar em Plano 06:** manter os 2 gates, nunca tirar um pensando que o outro cobre.
- **GT-2 (Plano 05 descoberto):** Thin atoms (cap 80-90 ln) sao MAIS dificeis que tier 2 full (cap 100-200 ln). O extrator quer "ser util" e tende a explicar conceito cross-stack. Resultado: thin termina em 90/90 (no cap). **Como aplicar em Plano 06:** se um atomo tier 3 tem cluster similar a outra skill, considerar thin (≤90 ln) mas alocar tempo extra para edicao por condensacao.
- **GT-3 (Plano 05 — meta):** Aplicar licoes do Plano 04 ANTES de iniciar foi a maior alavanca de produtividade. Sizing 7-9h planejado → ~6h real (vs Plano 04 onde 9-11h previsto virou ~10h com 2 ciclos de rework). ROI direto de capturar compound notes.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-05):** Rework cirurgico em dependencies-supply-chain.md apos verifier v1 detectar 2 divergencias factuais (cyclonedx package name + license-checker flag). Commit 2ba03d5 corrige verbatim do source. Linhas inalteradas (119). Sem impacto em sizing total — fix tomou ~10min.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 6 |
| Fases com desvio | 1 (fase-05 — rework cirurgico cyclonedx/license) |
| Bugs encontrados | 1 (BUG-1, ja corrigido) |
| Retries necessarios | 1 (apenas fase-05 v1→corrigida; vs 2+1 do Plano 04) |
| Átomos aprovados no verifier (≥80% claims rastreáveis) | 5/5 (3 em 5/5 + 2 em 4/5) |
| Átomos aprovados na auditoria mecanica humana | 3/3 amostra (1 thin + 2 tier 2 distintos) |
| Primordials migrados (RF8 verificado) | 1/1 (inline em security-stack-specific.md) |
| Linhas escritas total (5 atomos) | 565 (90+90+122+144+119) |
| Commits gerados | 6 (5 atomos + 1 rework) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Para Plano 06 — Atom Batch C + INDEX + Polish

- **Os 5 átomos aprovados neste plano + os 5 do Batch A são input** para o INDEX final (Plano 06 fase-04). INDEX consolida keyword maps de todos os 14 átomos — confirmar que os triggers escritos aqui são realistas (verbos/substantivos que dev sênior digitaria).
- **CA-08 do Plano 06 fase-06** terá distribuição diferente: 14 átomos prontos permitem amostrar com a regra literal do PRD (1 tier 1 + 1 tier 2 + 1 tier 3). Reaproveitar o prompt do verifier deste plano fase-06 verbatim.
- **Os 2 átomos thin do Plano 05 não devem ser amostrados novamente** no Plano 06 fase-06 — já foram cobertos aqui (1 dos 2). O Plano 06 audita os 3 tier 3 (performance-and-internals, operations-and-deploy, tooling).
- **Path absoluto das fontes (RF11, Could Have)** é citado em "Referências externas" no corpo do átomo, NÃO no frontmatter. Frontmatter `sources:` continua sendo apenas o compass-id (ou skill path para rules).
- **RF8 cumprido aqui (D12):** `primordials.md` integrado em `security-stack-specific.md`. Plano 06 NÃO precisa criar átomo separado de primordials, NÃO precisa migrar mais rules core-contributor-only (RF8 só obriga o mínimo: primordials).

---

<!-- Atualizado automaticamente durante execucao -->

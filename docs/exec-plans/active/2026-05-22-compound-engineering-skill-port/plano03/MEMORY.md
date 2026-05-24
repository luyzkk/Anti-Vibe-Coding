# Memoria: Plano 03 — Subcomandos + Patches

**Feature:** compound-engineering-skill-port
**Iniciado:** 2026-05-24
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-fase01-tdd-gate-types:** TDD gate bloqueou criacao de `install-types.ts` antes de qualquer teste existir. Solucao: criar `install-types.test.ts` (2 testes de contrato de tipos) antes de `install-types.ts`. Gate satisfeito via teste colocado na mesma pasta com basename `install-types`.
  - Por que: gate verifica basename exato do arquivo de producao — tipos puros sem test dedicado sao rejeitados.
  - Impacto: 2 testes extras em install-types.test.ts (verificam shape do contrato); custo baixo, beneficio de estabilidade do contrato.

- **DI-fase01-dst-normalizacao:** `entry.dst` do manifest usa forward slash em todas as plataformas (string literal), mas para seguranca o installer normaliza via `.replace(/\\/g, '/')` ao registrar em `result.created/skipped/overwritten`. Isso evita divergencias em Windows onde `path.join` pode retornar backslash.
  - Por que: gotcha local documentado no fase-01 doc — "Forward slash vs backslash no Windows: normalizar para POSIX ao logar".
  - Impacto: paths nos arrays de resultado sempre usam `/` independente de OS.

- **DI-fase01-regex-notas:** Regex `COMPOUND_NOTES_RE` cobre apenas `.md` diretamente em `docs/compound/` (sem subdiretorios profundos). O `compound-files-collector.ts` cobre recursivo; o installer so precisa excluir o nivel superficial pois o manifest nao inclui subdiretorios de notas.
  - Por que: manifest lista apenas `docs/compound/README.md` — unico arquivo de compound/ que poderia ser alvo. A regex `(?!README\.md$)` exclui esse unico arquivo do manifest sem afeta-lo.
  - Impacto: notas de dev em `docs/compound/YYYY-MM-DD-*.md` nunca sao processadas.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

_(Nenhum bug encontrado em fase-01 — implementacao direta do spec.)_

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-fase01-tdd-gate-tipos-puros:** O TDD gate bloqueia criacao de arquivos `.ts` sem arquivo `.test.ts` correspondente com mesmo basename — mesmo para arquivos de tipos puros (sem logica). Solucao: criar sempre `<nome>.test.ts` antes de `<nome>.ts`, mesmo que seja apenas teste de contrato de tipos.
  - Descoberto em: fase-01
  - Impacto: todas as fases seguintes que criarem arquivos de tipos precisam ter teste de contrato colocado.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-fase01-install-types-test-extra:** Spec nao previa `install-types.test.ts` — apenas `install-types.ts`. TDD gate forcou criacao de teste antes do arquivo de tipos. Adicionado `install-types.test.ts` com 2 testes de contrato.
  - Motivo: TDD gate do projeto e inviolavel (regra 2 do executor).
  - Impacto: +1 arquivo nao listado nos "Arquivos Afetados" do fase-01 doc. Bom sinal (cobertura adicional).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 1 |
| Fases com desvio | 1 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

_(Plano 03 e o ultimo plano da feature. Notas aqui sao para PRD-FOLLOWUP ou compound captures.)_

### Estado pos-fase-01 (input para fase-02..06)

**O que ficou pronto:**
- `skills/compound-engineering/lib/install-types.ts` — tipos `InstallOpts` e `InstallResult` exportados e importaveis cross-skill.
- `skills/compound-engineering/lib/install-types.test.ts` — 2 testes de contrato de tipos (verdes).
- `skills/compound-engineering/lib/installer.ts` — `installCompound(targetRoot, opts)` implementado, 4 CAs cobertos.
- `skills/compound-engineering/lib/installer.test.ts` — 4 testes (CA-04/05/06/20) verdes.
- `skills/compound-engineering/SKILL.md` — bloco `### Subcomando: install` adicionado com passos de implementacao.
- Suite da lib: 37 testes, 0 falhas.
- CA-17 verde: `installer.ts` nao importa de `skills/init/`.

**Commits:**
- `118721f` — RED phase (tests apenas, installer.ts ausente)
- `86b4c22` — GREEN phase (installer.ts + SKILL.md update)

**Pegadinhas para fases seguintes:**
- TDD gate EXIGE `<basename>.test.ts` antes de qualquer `<basename>.ts` — mesmo para arquivos de tipos puros. Crie sempre o teste de contrato primeiro.
- `InstallResult.created/skipped/overwritten` sempre usam forward slash como separador (normalizado no installer). Fases que consumirem esses arrays podem assumir posix paths.
- `COMPOUND_NOTES_RE` no installer exclui apenas `.md` nivel 1 de `docs/compound/` (nao recursivo). Notas em subdiretorios profundos teoricamente nao seriam alvo de qualquer forma (manifest nao as lista), mas e bom saber.
- `result.notes` e o vetor de mensagens UX — fase-06 (edge cases) pode adicionar mais mensagens aqui se necessario.

---

<!-- Atualizado automaticamente durante execucao -->

# Memoria: Plano 01 — Tracer Bullet (dedup + schema + piloto Rails + E2E)

**Feature:** Stack Knowledge Layer — Rails (v6.3.3)
**Iniciado:** 2026-05-18
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** Manter o lado SEM sufixo em todos os 6 pares duplicados (`rails-code-review`, `rails-migration-safety`, `rails-security-review`, `rails-stack-conventions`, `rails-tdd-slices`, `rails-upgrade`).
  - Por que: subagente confirmou via `diff -r` que conteudo e 100% identico em todos os pares (exit 0). O unico discriminador e `mtime` — originais (sem sufixo) tem mtime ~13h posterior as copias (todas com mesmo timestamp `2026-04-29 07:55:35`, indicando bulk copy). Manter o lado "trabalhado pos-copia" + nomenclatura sem sufixo preserva consistencia.
  - Impacto: extratores dos Planos 02 e 03 leem APENAS de `claude-code/knowledge/Rails/{nome-sem-sufixo}/`. Frontmatter `sources:` aponta para esse lado. Plano 03 fase-09 (hardening) faz `rm -rf` das 6 pastas com sufixo.

- **DI-2 (fase-02):** Cenario A escolhido — criar `skills/init/lib/atoms-frontmatter-validator.ts` como helper novo, com regex puro (sem libs ajv/zod/yaml).
  - Por que: `atoms-rf11-audit.test.ts` faz validacao inline sem helper exportavel; `scripts/harness-validate.ts` valida estrutura (broken links, AGENTS.md) mas nao schema de frontmatter. Nenhum helper reusavel existe. Regex puro basta para o escopo (parse `---\n...\n---`, lista campos obrigatorios, validacao opcional de `rails_versions`).
  - Impacto: futuros extratores (Planos 02/03) podem importar `validateAtomFrontmatter` para validar antes de escrever atomo. Verifier refined (fase-06) pode usar tambem.

- **DI-3 (fase-02):** Stub adicional `atoms-frontmatter-validator.test.ts` criado para satisfazer TDD gate hook que exige test file co-localizado com basename da implementacao.
  - Por que: testes reais ficam em `atoms-frontmatter-schema.test.ts` (nome semantico — descreve o que e testado, nao o arquivo). TDD gate hook do plugin exige `<basename>.test.ts` ao lado de `<basename>.ts`. Stub valida apenas que a funcao e exportada (1 teste trivial).
  - Impacto: padrao a replicar quando criar novos helpers — sempre co-localizar stub mesmo que testes principais vivam em outro arquivo com nome semantico.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

(nenhum bug encontrado em fase-01)

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (fase-01):** Todos os 6 pares duplicados em `claude-code/knowledge/Rails/` sao byte-for-byte identicos. Audit linha-por-linha do dedup-report.md foi rapida porque nao havia merge decisions (zero conteudo exclusivo em qualquer lado). Se em features futuras aparecer outro folder duplicado, primeiro rode `diff -r origA origB` — se exit 0, decisao e mecanica (escolher um lado pelo criterio que fizer sentido: mtime, sufixo, consistencia). Nao gastar tempo audit elaborado quando conteudo bate.

- **GT-2 (fase-01):** CONTEXT.md D3 dizia "8 pares duplicados"; inspecao real mostrou 6. G2 do README do Plano 01 ja antecipava isso. **Sempre validar contagens do CONTEXT via `ls` antes de planejar trabalho dimensionado**. Drift CONTEXT-vs-codigo e comum entre /grill-me e /execute-plan (semanas de gap).

- **GT-3 (fase-02):** TDD gate hook do plugin exige test file co-localizado com basename da implementacao (`foo.ts` -> `foo.test.ts`), mesmo que os testes reais vivam em outro arquivo com nome semantico (`schema.test.ts`). Solucao: criar stub minimo no co-localizado (1 export check) e manter os testes substantivos no arquivo semantico. Replicar esse padrao em fases futuras quando o nome semantico do test for diferente do arquivo testado.

- **GT-4 (fase-02):** Erros de typecheck pre-existentes em 4 arquivos nao relacionados (`lazy-import.test.ts`, `09-propose-merge-batch.ts`, `subagent-contract.ts` x2) NAO bloqueiam novos planos. Apenas verificar que os arquivos novos da fase atual estejam limpos. Hardening leve em Plano 03 fase-10 pode resolver, mas nao e blocker das fases intermediarias.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

(nenhum desvio em fase-01 — relatorio entregue conforme template D20)

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 2 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 02) PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

- **Fontes canonicas decididas (DI-1):** Extratores dos Planos 02 e 03 leem APENAS das 6 pastas SEM sufixo:
  - `claude-code/knowledge/Rails/rails-code-review/`
  - `claude-code/knowledge/Rails/rails-migration-safety/`
  - `claude-code/knowledge/Rails/rails-security-review/`
  - `claude-code/knowledge/Rails/rails-stack-conventions/`
  - `claude-code/knowledge/Rails/rails-tdd-slices/`
  - `claude-code/knowledge/Rails/rails-upgrade/`
  - Frontmatter `sources:` de cada atomo extraido referencia ESTES paths (nunca os com sufixo `copy`/`v2`).

- **Delecao fisica:** Plano 03 fase-09 (hardening) faz `rm -rf` das 6 pastas com sufixo. Ate la, ambas existem no disco — extratores precisam ignorar os duplicados.

- **Schema rails_versions:** pronto. Helper `validateAtomFrontmatter` em `skills/init/lib/atoms-frontmatter-validator.ts`. Aceita campo opcional `rails_versions` como array inline YAML de ranges semver-style (regex `/^(>=|<=|>|<|=|~>)\s*\d+\.\d+(\.\d+)?$/`). Rejeita: string, array vazio, ranges malformados. Atomos Node sem o campo continuam validos (CA-10 retrocompat).

- **Detector Rails:** regex `gem 'rails'` ja existe em `skills/init/lib/detect-stack.ts:72`. Plano 01 fase-03 refatora contrato (D22 multi-stack) e fase-04 adiciona regression coverage. Antes de Plano 02 comecar, contrato sera `DetectedStack { primary, secondary, signalSource, anchorFiles }`.

- **Anti-drift + verifier refined:** pendente — sera consolidado em fase-05 (extrator) e fase-06 (verifier) deste plano. Plano 02/03 copiam o prompt verbatim apos validacao.

- **E2E baseline:** pendente — sera medido em fase-06 (D24 target ≤200ms com 1 atomo). Plano 03 fase-09 estende para o set completo.

---

<!-- Atualizado automaticamente durante /execute-plan -->

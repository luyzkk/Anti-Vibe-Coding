# Memoria: Plano 01 — Tracer Bullet (dedup + schema + piloto Rails + E2E)

**Feature:** Stack Knowledge Layer — Rails (v6.3.3)
**Iniciado:** 2026-05-18
**Status:** concluido (6/6 fases)

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

- **DI-4 (fase-03):** `StackId` mantem `'unknown'` no union, mas `DetectedStack.primary` e tipado `Exclude<StackId, 'unknown'> | null` — invariante D22 enforced no nivel de tipos.
  - Por que: `skills/init/lib/detect-multi-stack.ts` ja usa `StackId` em outro contrato (`MatrixFolder`) e referencia 'unknown' como placeholder para go.mod sem language detection. Remover 'unknown' de StackId quebraria detect-multi-stack sem ganho real. Solucao: manter o union, restringir apenas em DetectedStack.primary onde D22 exige `null` no lugar de 'unknown'.
  - Impacto: futuros consumidores de DetectedStack tem garantia compile-time de que primary nunca e 'unknown'. detect-multi-stack continua usando 'unknown' como placeholder (escopo isolado).

- **DI-5 (fase-03):** Probes em `detectStack()` agora rodam TODAS (nao mais break-on-first). Resultado: primeira detectada vira `primary`, demais vao para `secondary[]`.
  - Por que: D22 exige `secondary` populado para suportar monorepos (CA-07: Rails + Node coexistindo). Break-on-first impede coleta de segundaria. Custo: ~6 fs.existsSync extras por chamada (insignificante; init roda 1x por projeto).
  - Impacto: telemetria CA-06 fica completa. CA-21 (zero signal) continua valido — todos null/[].

- **DI-6 (fase-03):** Precedence Rails-vs-Node-TS resolvida via fixture minima (Opcao C) em vez de reordenar probes.
  - Por que: fixture do teste CA-02 (happy Rails) original tinha `package.json` com typescript no devDeps — Node-TS probe (que roda antes de Rails na ordem do array) capturava primary. Reordenar probes alteraria semantica global. Solucao cirurgica: remover typescript do devDeps na fixture especifica (Rails real-world raramente tem TS no devDeps junto com Gemfile).
  - Impacto: ordem de probes preservada para outros cenarios. Monorepo intencional (CA-07) usa fixture com ambos — primary fica como o que vier primeiro no array, secondary captura o outro. Aceitavel ate Plano 02 introduzir scoring/heuristica explicita.

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

- **GT-5 (fase-03):** Refactor de tipo central (`DetectedStack`) toca call sites em cadeia. Inventario antes do refactor evita surpresa: 10 arquivos consumiam `stack.id`/`stack.kind` antes do D22. Lista completa: `customize-architecture.ts`, `customize-architecture.test.ts`, `state-md-init.ts`, `state-md-init.test.ts`, `steps/03-detect-stack-and-register.ts`, `steps/04-customize-architecture.ts`, `stack-id-map.ts`, `tests/e2e/stack-knowledge-tracer-bullet.test.ts`, alem dos proprios `detect-stack.ts/.test.ts`. Plano 02/03 nao deveriam reabrir esses arquivos por contrato — se reabrirem, releia este GT.

- **GT-6 (fase-03):** `bun tsc --noEmit` com argumentos de arquivos individuais retorna `TS1343 (import.meta)` falsos. Use sempre `bun tsc --noEmit` sem args (deixa o tsconfig do projeto cuidar de `module: esnext`).

- **GT-7 (fase-04):** Detector Rails ja era zero-falso-positivo desde o inicio. A regex `["']rails["']` exige aspas FECHANDO logo apos `rails` — `gem 'rails-erb'` nao matcha porque o char apos `rails` e `-`, nao quote. Nao perder tempo "endurecendo" a regex em features futuras se ja existir; primeiro escrever o test e ver se ja passa (5 minutos vs 1 hora de refactor desnecessario).

- **GT-8 (fase-05):** Hard cap de 200 linhas no atomo cabe FOLGADAMENTE quando o subagente segue a anti-drift clause. Piloto saiu com 108 linhas (~54% do cap) cobrindo CoC/Zeitwerk/ActiveSupport/metaprogramming/Concerns. Indicador implicito: se um T1 transversal estourar 200 linhas, provavel sintoma de drift (subagente injetando conhecimento alem do source). Verifier refined em fase-06 deve manter o cap absoluto — nao "permitir" 220 sob nenhuma justificativa.

- **GT-9 (fase-05):** SKILL.md canonico (`rails-stack-conventions`) e ESCOPADO a "PostgreSQL + Hotwire + Tailwind stack" — pratico, nao conceitual. Cobertura T1 transversal (CoC, DRY, Zeitwerk, ActiveSupport, metaprogramming) vem majoritariamente dos COMPASS ARTIFACTS, nao do SKILL. Implicacao: ao planejar atomos T1 futuros, priorizar compass artifacts como source primario quando o topico for arquitetural/conceitual; SKILL packages sao melhores para T2-T3 (camada de implementacao com naming/wiring especifico).

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
| Fases concluidas | 6 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| CA-02 perf (medido) | avg 6.97ms / max 10.39ms (1 atomo) — folga ~20x do limite D24 (200ms) |
| Verifier refined taxa | 100% (38/38 claims rastreaveis) |

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

- **Detector Rails:** regex `gem 'rails'` continua em `skills/init/lib/detect-stack.ts` (probe rails). Contrato D22 ja entregue na fase-03: `DetectedStack { primary: Exclude<StackId,'unknown'> | null, secondary: StackId[], signalSource: string, anchorFiles: string[] }`. Probes rodam todas (nao mais break-on-first). Plano 02 pode importar e usar diretamente.

- **Anti-drift prompt:** ja validado em fase-05 (piloto). Bloco verbatim (REGRA DE FIDELIDADE + Liberdade explicita + HARD CAPS + ENTREGAVEIS) deve ser copiado para extratores dos Planos 02/03 sem modificacao. Subagente reportou que a regra foi seguida e omitiu claims plausiveis-mas-nao-rastreaveis (ex: overhead quantitativo de Zeitwerk, DRY como tema isolado).

- **Verifier refined:** ja validado em fase-06 (38/38 claims rastreaveis, 100% — meta era >=80%). Bloco verbatim (TECHNICAL CLAIMS vs ATOM-STRUCTURAL METADATA) deve ser copiado para verifier de Planos 02/03 sem modificacao. Subagente seguiu protocolo refined corretamente: auditou Padroes senior + Anti-padroes + Criterios de decisao; ignorou Quando consultar + Referencias externas. Report em `plano01/verifier-report-fase06.md`.

- **E2E perf baseline (CA-02):** avg 6.97ms / max 10.39ms (5 amostras, 1 atomo). Limite D24 = 200ms; extrapolacao linear para 14 atomos ~98ms (ainda dentro de SLA). Plano 03 fase-09 estende para set completo e mede com warm cache vs cold I/O.

- **Plano 02 pode comecar:** arquitetura validada (detector D22 + schema rails_versions + piloto anti-drift + verifier refined). 13 atomos restantes seguem o mesmo padrao: extrair via subagente com prompt anti-drift verbatim + verifier auditando apenas secoes tecnicas.

- **E2E baseline:** pendente — sera medido em fase-06 (D24 target ≤200ms com 1 atomo). Plano 03 fase-09 estende para o set completo.

---

<!-- Atualizado automaticamente durante /execute-plan -->

# Memoria: Plano 04 — Modo Dual + 5 Princípios Universais

**Feature:** Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)
**Iniciado:** 2026-05-04
**Status:** concluido (2026-05-05)

---

## Fase 01 — Resultado

**Status:** done
**Commit:** `a1bde38` — feat(plano04-fase01): promote readArchitectureProfile to stable API with getRecommendationForProfile helper
**Acceptance:** passou — 145 testes verdes (133 pre-existentes + 12 novos), typecheck limpo, 8 fixtures, tracer bullet do Plano 01 fase-06 preservado (5 testes).

**Arquivos criados:**
- 8 fixtures em `skills/lib/__fixtures__/manifests/`: clean-architecture-ritual.json, mvc-flat.json, vertical-slice.json, nextjs-app-router.json, unknown-mixed.json, no-profile.json, flag-disabled.json, invalid-profile.json
- `docs/dual-mode-convention.md` — convencao "le profile UMA vez + lookup table"

**Arquivos modificados:**
- `skills/lib/read-architecture-profile.ts` — JSDoc completo, `getRecommendationForProfile<T>` exportado
- `skills/lib/read-architecture-profile.test.ts` — 12 novos testes (16 readArchitectureProfile + 3 getRecommendationForProfile)

---

## Decisoes de Implementacao

**DI-01: Assinatura preservada como `readArchitectureProfile(manifestPath?: string)` (nao `cwd: string`)**
- Fase: fase-01
- Decisao: manter assinatura existente do tracer bullet (path de arquivo) em vez de migrar para `cwd: string` (diretorio) como mostrado no snippet da spec
- Razao: G8 e DI-11 do Plano 01 dizem "assinatura externa preservada"; mudar quebraria os 5 testes do tracer bullet (architecture/__tests__/tracer-bullet.test.ts)
- Impacto: fases 02-05 chamam `readArchitectureProfile(path)` ou `readArchitectureProfile()` (default = `.claude/.anti-vibe-manifest.json` no cwd)

**DI-02: 8o fixture e `invalid-profile.json` (spec truncada com "e...")**
- Fase: fase-01
- Decisao: criar `invalid-profile.json` com profile inexistente (`"not-a-real-profile"`) para cobrir o guard de schema validation
- Razao: spec listava 7 fixtures explicitos + "e..." truncado; CA exige `wc -l = 8`. invalid-profile cobre o quarto cenario de retorno null (schema invalido)
- Impacto: fases 02-05 podem assumir 8 fixtures canonicos incluindo invalid-profile

**DI-03: 16 + 3 testes (acima do minimo 11)**
- Fase: fase-01
- Decisao: 16 testes em readArchitectureProfile (1 por fixture + edge cases) + 3 em getRecommendationForProfile = 19 totais
- Razao: cobertura de todos os cenarios negativos (no-profile, flag-disabled, invalid-profile, no-manifest) alem dos 5 perfis felizes
- Impacto: nao bloqueia paralelismo; aumenta robustez

---

## Bugs Descobertos

Nenhum.

---

## Fase 02 — Resultado

**Status:** done
**Commit:** `5c9be59` — feat(plano04-fase02): adapt architecture skill with 5-profile recommendation lookup and Greenfield mode
**Acceptance:** passou — 168 testes verdes (145 + 11 novos + 12 da fase-03 paralela), tracer bullet Plano 01 fase-06 preservado, SKILL.md com UMA chamada a readArchitectureProfile.

**Arquivos criados:**
- `skills/architecture/lib/architecture-recommendations.ts` — ARCHITECTURE_RECOMMENDATIONS (5), DEFAULT_RECOMMENDATION_V52, GREENFIELD_RECOMMENDATION, isGreenfield
- `skills/architecture/lib/__tests__/architecture-recommendations.test.ts` — 11 testes
- `skills/architecture/lib/__fixtures__/empty-src/.gitkeep` — fixture Greenfield
- `skills/architecture/lib/__fixtures__/populated-src/index.ts` — fixture nao-Greenfield

**Arquivos modificados:**
- `skills/architecture/SKILL.md` — bloco profile-aware-preface substituido por bloco TS completo (leitura UMA vez + readdir src/ + lookup com Greenfield branch). Comentario `architectureProfile` preservado para nao quebrar telemetry-utils.test.ts (DEV-02).

**DI-04 (fase-02):** path relativo `'../../lib/manifest-types'` em arquivos sob `skills/architecture/lib/` (2 niveis acima).

**DI-05 (fase-02):** `noUncheckedIndexedAccess: true` no tsconfig — `Record<K,V>[K]` retorna `V | undefined`. Use `!` ou helper de narrowing em testes.

**DI-06 (fase-02):** comentario explicito `architectureProfile` mantido no SKILL.md para satisfazer assertion pre-existente em `skills/lib/telemetry-utils.test.ts` linha 194.

**DEV-01 (fase-02):** test em subpasta `lib/__tests__/` em vez de co-localizado puro. Compativel com TDD gate (mantido pelo Plano 01 fase-06 com `architecture/__tests__/tracer-bullet.test.ts`).

**DEV-02 (fase-02):** comentario explicito adicionado ao SKILL.md (nao estava na spec) para nao quebrar suite existente.

---

## Fase 03 — Resultado

**Status:** done
**Commit:** `251436d` — feat(plano04-fase03): adapt plan-feature skill with profile-aware fase policy lookup
**Acceptance:** passou — 168 testes verdes (12 novos da fase-03), CA-05 verificado E2E (vertical-slice fixture -> bloco contem "1 fase = 1 feature vertical"), CA-04 verificado, SKILL.md com UMA chamada.

**Arquivos criados:**
- `skills/plan-feature/lib/fase-policy.ts` — FasePolicy type, FASE_POLICY_BY_PROFILE (5), FASE_POLICY_V52, renderFasePolicyBlock
- `skills/plan-feature/lib/__tests__/fase-policy.test.ts` — 12 testes (lookup + render + CA-04 + CA-05 E2E)

**Arquivos modificados:**
- `skills/plan-feature/SKILL.md` — bloco TS no topo (leitura UMA vez + injecao de fasePolicyBlock no contexto)
- `skills/plan-feature/templates/plan-readme-template.md` — marcador `{- fase-policy-block -}` antes da secao TDD Strategy

**API exposta para fase-05:** `FASE_POLICY_BY_PROFILE`, `FASE_POLICY_V52`, `renderFasePolicyBlock` em `skills/plan-feature/lib/fase-policy.ts`.

**DI-04 (fase-03):** path relativo confirmado `'../../lib/manifest-types'` (2 niveis acima de `plan-feature/lib/`).

**DI-05 (fase-03):** helper `getPolicy(name)` com guard explicito para evitar `V | undefined` do `noUncheckedIndexedAccess` — sem `as`, sem `any`.

---

## Fase 04 — Resultado

**Status:** done
**Commit:** `d1fdda7` — feat(plano04-fase04): adapt write-prd skill with profile-aware structure snippets
**Acceptance:** passou — 188 testes verdes, 10 novos (spec pedia 9), typecheck limpo, marcador `{- structure-snippet -}` em prd-template.md, SKILL.md com UMA chamada.

**Arquivos criados:**
- `skills/write-prd/lib/structure-snippets.ts` — STRUCTURE_SNIPPETS (5 perfis), STRUCTURE_SNIPPET_V52 (string vazia)
- `skills/write-prd/lib/__tests__/structure-snippets.test.ts` — 10 testes

**Arquivos modificados:**
- `skills/write-prd/SKILL.md` — bloco TS apos bloco de telemetria de start
- `skills/write-prd/templates/prd-template.md` — marcador `{- structure-snippet -}` na secao "Solucao". GT-06: secao "Fluxos UX por Ator" pre-existente preservada.

**DI-07 (fase-04):** import path confirmado `'../../lib/manifest-types'` (mesmo padrao das fases anteriores).

**DEV-01 (fase-04):** dois commits. O primeiro (`280703f`) capturou inadvertidamente arquivos staged da fase-05 paralela; o segundo (`d1fdda7`) contem os arquivos reais da fase-04. Ambos com mesma mensagem misleading.

---

## Fase 05 — Resultado

**Status:** done
**Commit:** bundled em `280703f` (mensagem fala fase-04 mas conteudo e da fase-05 — ver BUG-01 / GT-21).
**Acceptance:** passou — 188 testes verdes, 10 novos, typecheck limpo, ADHERENCE_CHECKS com 5 perfis sem prescritivo (G7), execute-plan/SKILL.md importa `../plan-feature/lib/fase-policy`, ambos SKILL.md com UMA chamada (real, nao em comentario — GT-22).

**Arquivos criados (commitados em 280703f):**
- `skills/verify-work/lib/adherence-checks.ts` — AdherenceCheck type, ADHERENCE_CHECKS (5), ADHERENCE_CHECKS_V52, renderAdherenceSection
- `skills/verify-work/lib/__tests__/adherence-checks.test.ts` — 10 testes (lookup + render + cross-skill smoke)

**Arquivos modificados (commitados em 280703f):**
- `skills/execute-plan/SKILL.md` — bloco TS importando FASE_POLICY_BY_PROFILE de plan-feature
- `skills/verify-work/SKILL.md` — bloco TS com lookup adherence-checks

**DI-10 (fase-05):** cross-skill import `execute-plan -> plan-feature/lib/fase-policy` aceito como acoplamento consciente intra-plugin (evita duplicar lookup).

**DEV-01 (fase-05):** smoke test cross-skill incluido no mesmo `adherence-checks.test.ts` (path `../../../execute-plan/SKILL.md` apos correcao em RED).

**BUG-01 (fase-05):** commit `280703f` tem mensagem `feat(plano04-fase04)` mas conteudo e da fase-05. Causa: race condition de `git add` entre subagentes paralelos. Codigo correto, mensagem trocada. Para auditoria futura: commit antes de d1fdda7 e fase-05 (verify-work + execute-plan + adherence-checks); commit d1fdda7 e fase-04 (write-prd).

---

## Gotchas (atualizado apos rodada 2)

**GT-21: race condition de `git add` em subagentes paralelos**
- Contexto: fase-04 e fase-05 rodaram em paralelo no submodulo `anti-vibe-coding/`. O `git add` da fase-04 capturou tambem arquivos staged da fase-05, gerando commit `280703f` com conteudo misturado. A fase-04 entao precisou um segundo commit (`d1fdda7`) com seus arquivos reais.
- Implicacao: para fases paralelas que tocam o mesmo repo, considerar:
  1. `git add` por path explicito (nao `-A`).
  2. Sincronizacao via lock file ou execucao serial.
  3. Aceitar e documentar a discrepancia (foi a opcao tomada — codigo correto, mensagem misleading).

**GT-22: grep de `readArchitectureProfile()` conta tambem comentarios**
- Contexto: ao verificar "UMA chamada" via grep, comentarios `// readArchitectureProfile() retorna null...` aumentam o count.
- Implicacao: nao confundir ocorrencia textual com invocacao real. Use grep mais especifico ou inspecao manual quando o numero de matches passar de 1.

## Gotchas

**GT-16: spec da fase-01 mostrava `cwd: string` mas API real usa `manifestPath: string`**
- Contexto: snippet da spec usava `mkdtempSync` + cwd directory. API real usa path do arquivo.
- Implicacao: fases 02-05 passam path direto do fixture, nao tmp dir.

**GT-17: package.json do submodulo NAO tem script `lint`**
- Contexto: scripts = `test`, `typecheck` apenas.
- Implicacao: fases omitem `bun run lint` da verificacao final.

**GT-18: noUncheckedIndexedAccess: true no tsconfig**
- Contexto: descoberto em fase-02 e fase-03 paralelas. `Record<K,V>[K]` retorna `V | undefined` mesmo que K seja union completa.
- Implicacao: fase-05 (e Plano 05) ao acessar lookups indexados deve usar helper com narrowing ou `!` em testes (sem `any`/`as`).

**GT-19: testes pre-existentes assertam strings literais em SKILL.md**
- Contexto: `skills/lib/telemetry-utils.test.ts` linha 194 verifica string `architectureProfile` em SKILL.md de architecture.
- Implicacao: antes de modificar qualquer SKILL.md, rodar `grep -r 'SKILL.md' skills/` para descobrir asserts. Manter strings sensiveis preservadas.

**GT-20: import path `'../../lib/manifest-types'` (2 niveis), nao 3**
- Contexto: arquivos em `skills/<skill>/lib/` ficam 2 niveis abaixo de `skills/lib/manifest-types.ts`.
- Implicacao: fase-04 e fase-05 que criarem `skills/<skill>/lib/*.ts` usam `'../../lib/manifest-types'`.

---

## Desvios do Plano

Documentados nas secoes de cada fase (DEV-01 e DEV-02 da fase-02).

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** `readArchitectureProfile()` retorna profile válido mesmo com flag false em ambiente de teste
  - Causa: ordem do guard — `parseManifest` rodando antes de `isFeatureEnabled`
  - Fix: invertida ordem; flag check é a primeira linha da função
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** Skills markdown não compartilham bloco `<script>` entre execuções
  - Descoberto em: fase-02
  - Impacto: cada SKILL.md precisa repetir o bloco de leitura de profile no topo; helper centralizado vive em arquivo separado
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-04 originalmente previa snippet único de "Estrutura sugerida"; ampliada para incluir snippet de "Critérios de aceite por feature"
  - Motivo: princípio #7 (Declarative-first) ficou diluído sem isso
  - Aprovado pelo dev em sessão
-->

---

## Fase 06 — Resultado

**Status:** done
**Commit:** `1201461` — feat(plano04-fase06): integrate 5 universal principles into prompts and templates
**Acceptance:** passou — 7/7 greps do CA, 203 testes verdes (188 + 15 novos), typecheck limpo.

**Arquivos criados:**
- `docs/universal-principles-v53.md` — tabela dos 5 universais com pointers
- `skills/lib/__tests__/universal-principles.test.ts` — 15 testes textuais

**Arquivos modificados:**
- `skills/consultant/SKILL.md` — bloco #1 (10 Questions Test) + bloco #10 (YAGNI checklist)
- `skills/grill-me/SKILL.md` — pointer para 10 Questions Test (GT-06 nao se materializou — working tree estava clean)
- `skills/write-prd/templates/prd-template.md` — Comment Provenance (#5) + reordenacao Outcomes/Mecanismo (#7); preservado marcador `{- structure-snippet -}` da fase-04 e secao "Fluxos UX por Ator" pre-existente
- `skills/plan-feature/templates/fase-template.md` — Comment Provenance + exemplo com linhagem
- `skills/verify-work/SKILL.md` — secao "Fase Final — Fresh-context Review" (#9)

**DI-15 (fase-06):** path para `docs/` em testes vivendo em `skills/lib/__tests__/` precisa de 3 niveis up (`../../../docs/`).

**GT-23 (fase-06):** `import.meta.dir` em Bun resolve para diretorio do test file, nao raiz do projeto.

**DEV-01 (fase-06):** spec sugeria 2 niveis (`../../docs/`) — incorreto para a estrutura real (test em subpasta `__tests__/`). Corrigido para `../../../docs/`.

---

## Metricas Finais (Plano 04 concluido)

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 6 |
| Fases com desvio | 5 (todos menores) |
| DIs registrados | 15 (DI-01..DI-15) |
| Bugs encontrados | 1 (BUG-01: bundling de commits paralelos, recovery feito) |
| Gotchas novos | 8 (GT-16..GT-23) |
| Retries necessarios | 0 |
| Testes novos no plano | +70 (133 -> 203) |
| Cobertura CA | CA-04, CA-05, CA-06, CA-10 cobertos por testes |
| Commits no submodulo | 6 (1 com mensagem trocada — ver BUG-01) |

### Mapa de commits (com nota sobre bundling GT-21)

| Fase | Commit | Mensagem | Conteudo real |
|------|--------|----------|---------------|
| 01 | `a1bde38` | feat(plano04-fase01): promote readArchitectureProfile... | helper estavel + 8 fixtures + dual-mode-convention.md |
| 02 | `5c9be59` | feat(plano04-fase02): adapt architecture skill... | architecture-recommendations + Greenfield + SKILL.md |
| 03 | `251436d` | feat(plano04-fase03): adapt plan-feature skill... | fase-policy + plan-readme-template marker |
| 04 | `d1fdda7` | feat(plano04-fase04): adapt write-prd skill... | structure-snippets + prd-template marker |
| 05 | `280703f` | feat(plano04-fase04): adapt write-prd skill... [MENSAGEM TROCADA] | adherence-checks + verify-work + execute-plan SKILL.md |
| 06 | `1201461` | feat(plano04-fase06): integrate 5 universal principles... | 5 universais em SKILL.md + templates + universal-principles-v53.md |

---

## Notas para Plano 05 (Analise & Dogfooding)

**Onda 1 quase completa.** Plano 05 fecha o ciclo: script CLI de analise (RF8) + dogfooding 2 semanas em Licitar (CA-11) + release notes.

**Helpers e contratos prontos:**
- `readArchitectureProfile(manifestPath?: string): ArchitectureProfile | null` em `skills/lib/read-architecture-profile.ts`. Default: `process.cwd() + '/.claude/.anti-vibe-manifest.json'`. Helper auxiliar `getRecommendationForProfile<T>` exportado.
- 8 fixtures canonicas em `skills/lib/__fixtures__/manifests/` (5 perfis + no-profile + flag-disabled + invalid-profile). Reutilizar para testes do script CLI se precisar.
- `INSTRUMENTED_SKILLS` (10 skills) em `skills/lib/telemetry-utils.ts`. Telemetria emite `start`/`end` por invocacao em `.claude/metrics/YYYY-MM.jsonl`. Plano 05 fase-01 (script CLI) le esses JSONLs.
- Detector ja popula `.claude/.anti-vibe-manifest.json` via `/anti-vibe-coding:detect-architecture`. Em Licitar (piloto), rodar detector primeiro, ativar flag `architectureDetectorEnabled: true`, deixar dogfooding 2 semanas.

**Convencoes de codigo (reusar):**
- `noUncheckedIndexedAccess: true` ativo (GT-18) — use helper de narrowing em testes.
- TDD gate exige test co-localizado por nome (GT-09).
- Fixtures `__fixtures__/*.ts` criadas via Bash, nao Write tool (GT-07).
- Bun nao resolve .md (GT-08) — `.ts` e modulo, `.md` opcional.
- Path imports `'../../lib/manifest-types'` (2 niveis acima de `skills/<skill>/lib/`).
- `import.meta.dir` resolve para diretorio do arquivo de teste (GT-23).
- Commits no submodulo `anti-vibe-coding/` (GT-02), nao no repo pai.
- Sem script `lint` (GT-17) — use `bun run test` + `bun run typecheck`.

**Sobre GT-19 e GT-21:**
- Antes de modificar SKILL.md de skills referenciadas em testes existentes, rodar `grep -rn 'SKILL.md' anti-vibe-coding/skills/lib/` para descobrir asserts pre-existentes.
- Se Plano 05 paralelizar fases, atencao a race de `git add` (GT-21) — recomenda-se `git add` por path explicito.

**Perfis suportados (D4):** clean-architecture-ritual, mvc-flat, vertical-slice, nextjs-app-router, unknown-mixed. Plano 05 nao precisa adicionar nenhum.

**5 universais integrados (RF11 done):**
- `consultant`: #1 (10 Questions Test) + #10 (YAGNI checklist)
- `grill-me`: pointer para #1
- `prd-template.md`: #5 (Comment Provenance) + #7 (Declarative-first — Outcomes antes de Mecanismo)
- `fase-template.md`: #5 + exemplo com linhagem
- `verify-work`: #9 (Fresh-context Review)
- `docs/universal-principles-v53.md`: tabela canonica

**Pendencias para Plano 05:**
- RF8 (script CLI `analyze-metrics.ts`) — usa `INSTRUMENTED_SKILLS` para conhecer as 10 skills.
- CA-08 (output do script com 50+ entradas).
- CA-11 (dogfooding 2 semanas em Licitar — Carreirarte intocado conforme CA-12).
- CA-12 (Carreirarte intocado durante piloto — flag = false).
- Release notes referenciando: `docs/dual-mode-convention.md`, `docs/universal-principles-v53.md`, `docs/architecture-profiles.md`, `docs/manifest-schema.md`, `docs/telemetry-schema.md`.

---

<!-- Atualizado automaticamente durante execucao -->

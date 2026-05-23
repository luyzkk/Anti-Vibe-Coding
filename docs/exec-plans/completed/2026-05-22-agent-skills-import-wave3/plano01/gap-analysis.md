# Gap Analysis: /anti-vibe-review vs /verify-work

**Data:** 2026-05-23
**Fase:** Plano 01 / fase-01

---

## Resumo executivo

- Secoes H2 em anti-vibe-review: 6 (Modos de Invocacao, Resolucao de Modelo via Model Profiles, Estrategia de Revisao Eficiente, Delegacao Opcional a Auditores, Modulo a revisar, Como Executar)
- Secoes H2 em verify-work: 8 (Step 1–5, Pipeline Integration, Regras, Fase Final)
- Checklist inline em anti-vibe-review: 7 secoes H3 (TDD, Padroes, Arquitetura, Error Handling, Seguranca, Performance/Obs, React)
- Duplicacoes conceituais detectadas: 7 (todas as secoes do checklist inline)
- Itens unicos em anti-vibe-review (candidatos a absorcao): 3
- Itens unicos em verify-work (estado atual, manter): 9

---

## Bucket A — Absorver em verify-work

Conceitos presentes em `anti-vibe-review` que NAO tem equivalente em `verify-work`.
Estes devem ser absorvidos na fase-03.

| Conceito | Origem (linha) | Justificativa | Onde absorver em verify-work |
|----------|---------------|---------------|------------------------------|
| Estrategia Staged/Unstaged | anti-vibe-review:154-163 | Diretriz operacional valiosa (como usar git stage para comparar antes/depois de revisao) sem equivalente em verify-work. Texto puro sem tag `<context>` ao absorver. | Nova secao `## Estrategia Staged/Unstaged` imediatamente antes de `## Regras` |
| Heuristica "nomes grepáveis" com grep -c | anti-vibe-review:64 | Check pratico nao explicitado em nenhum auditor de verify-work: "rode `grep <nome> src/` e verifique se retorna <5 hits nao relacionados — se >10 hits, nome e generico demais". Complementa code-smell-detector mas nao e coberto por ele. | Nota inline em `## Step 2 / 2b. Auditores Fixos` proxima a code-smell-detector (como pre-check manual antes do spawn) |
| Deep Modules inline check | anti-vibe-review:77-81 | Conceito de "interface pequena / implementacao rica" como check rapido de arquitetura antes de spawnar solid-auditor. Referencia a `skills/tdd-workflow/references/deep-modules.md` (arquivo verificado: existe). Nao aparece em nenhuma secao de verify-work. | Adicionar em `## Step 2 / 2c. Auditores Domain-Specific` como pre-check descritivo antes de spawnar solid-auditor |

**Nota sobre Resolucao de Modelo (anti-vibe-review:32-38):**
O bloco `## Resolucao de Modelo via Model Profiles` em `anti-vibe-review` e conceitualmente duplicado pelo `## Step 2 / 2d. Modelo por Auditor` de verify-work. NAO absorver — Bucket B.

---

## Bucket B — Duplicacao conceitual (NAO absorver)

Conceitos que existem em `anti-vibe-review` mas ja sao cobertos por auditores delegados ou
por secoes equivalentes em `verify-work`. Absorver criaria ruido e conflito de autoridade.

| Conceito | Em anti-vibe-review (linhas) | Coberto por |
|----------|------------------------------|-------------|
| TDD Compliance checklist (testes existem, assertions reais, timestamps git, edge cases, naming sem "should") | anti-vibe-review:51-57 | `tdd-verifier` agent (Step 2b) + Verificacao 5 TDD compliance via git history (Step 2e) |
| Padroes de Codigo (type-safety, early return, magic strings, named exports, `const` > `let`) | anti-vibe-review:60-68 | `code-smell-detector` agent (Step 2b) — cobre God objects, funcoes longas, DRY violations |
| Arquitetura (Fat Controllers, Lei de Demeter, Tell-Don't-Ask) | anti-vibe-review:70-76 | `solid-auditor` agent (Step 2c, domain-specific) |
| Error Handling (Result Pattern, try/catch confinado, erros relancados, feedback ao usuario) | anti-vibe-review:83-89 | `code-smell-detector` + Step 3 relatorio compilado (classificacao de severidade) |
| Seguranca (SQL injection, input validation, secrets, HMAC, ReDoS, UUIDs) | anti-vibe-review:91-98 | `security-auditor` agent (Step 2b) — cobre OWASP top 10, secrets expostos, input validation, timing attacks |
| Performance e Observability (N+1, console.log, Promise.all, background jobs, wide events) | anti-vibe-review:100-105 | `api-auditor` + `database-analyzer` agents (Step 2c domain-specific) |
| React (useEffect, TanStack Query, cadeia de efeitos, useMemo/useCallback, server vs client state) | anti-vibe-review:107-112 | `react-auditor` agent (Step 2c domain-specific) |
| Resolucao de Modelo via Model Profiles | anti-vibe-review:32-38 | Step 2d em verify-work (mesmo mecanismo, mesma logica de fallback) |

**Regra aplicada (G1 do plano):** Qualquer item de checklist inline que corresponde a um auditor
ja delegado em verify-work e Bucket B — nao ha valor em duplicar. Em conflito de autoridade,
verify-work e a fonte de verdade.

---

## Bucket C — Unico em verify-work (manter, nao tocar)

Capacidades ativas em `verify-work` que NAO existem em `anti-vibe-review`. Estas representam
a evolucao da skill e nao devem ser afetadas pela consolidacao.

| Capacidade | Localizacao em verify-work |
|------------|---------------------------|
| Rodar testes via Bash (`bun run test`) com captura de stdout+stderr | Step 1 (linha 83-86) |
| Rodar lint via Bash (`bun run lint`) | Step 1 (linha 88-91) |
| Debug agent automatico em falha de teste (spawn subagente com stack trace + 3 arquivos max) | Step 1.6 (linha 97-112) |
| Spawn paralelo de auditores via `invokeAndConsolidate` | Step 2 / 2f (linha 256-265) |
| Test Quality Audit: cobertura real Negocios vs Infra | Step 2e Verificacao 1 (linha 177-189) |
| Deteccao de testes fracos (assertions vazias, apenas happy path) | Step 2e Verificacao 2 (linha 191-202) |
| Hallucination check (imports apontando para arquivos/metodos inexistentes) | Step 2e Verificacao 3 (linha 204-216) |
| Mutation testing (com reversao garantida) | Step 2e Verificacao 4 (linha 218-238) |
| TDD compliance via git history (ordem de commits teste vs producao) | Step 2e Verificacao 5 (linha 240-251) |
| Fresh-context review final (subagente com contexto limpo) | Fase Final (linha 539-560) |
| Cleanup de artefatos / arquivamento do PRD com MEMORY consolidado | Pipeline Integration (linha 428-516) |
| Integracao com SUMMARY.md do pipeline para focar auditoria | Pipeline Integration (linha 395-403) |
| Blocos de telemetria passiva (start/end) | Linhas 10-57 e 562-583 |

---

## Analise de Estrutura

### anti-vibe-review SKILL.md (203 linhas)

Secoes H2 identificadas (7 total incluindo subdivisoes de checklist):
```
linha 19  ## Modos de Invocacao
linha 32  ## Resolucao de Modelo via Model Profiles
linha 41  ## Como Executar  [dentro de <instructions>]
linha 51  ### 1. TDD Compliance  [H3 dentro de <checklist>]
linha 59  ### 2. Padroes de Codigo
linha 70  ### 3. Arquitetura
linha 83  ### 4. Error Handling
linha 91  ### 5. Seguranca
linha 100 ### 6. Performance e Observability
linha 107 ### 7. React (se aplicavel)
linha 115 <report-template>  [template inline]
linha 154 ## Estrategia de Revisao Eficiente (Staged/Unstaged)  [dentro de <context>]
linha 165 ## Delegacao Opcional a Auditores (v6.1.0+)
linha 201 ## Modulo a revisar
```

### verify-work SKILL.md (583 linhas)

Secoes H2 identificadas (8 total alem dos blocos typescript de telemetria):
```
linha 70  ## Step 1 — Rodar Testes e Lint
linha 117 ## Step 2 — Audit Pipeline
linha 270 ## Step 3 — Compilar Relatorio
linha 333 ## Step 4 — Apresentar ao Dev e Decidir
linha 371 ## Step 5 — Learn Point
linha 392 ## Pipeline Integration
linha 526 ## Regras
linha 539 ## Fase Final — Fresh-context Review
```

---

## Recomendacoes para fase-03

1. **Absorver apenas os 3 conceitos do Bucket A** — nenhuma outra secao de anti-vibe-review vai para verify-work.

2. **NAO copiar o checklist de 7 secoes** (Bucket B) — os 7 auditores ja cobrem cada categoria. Adicionar o checklist inline criaria duplicacao que vai datar mal assim que os auditores evoluirem.

3. **Estrategia Staged/Unstaged (anti-vibe-review:154-163):** Extrair texto puro SEM a tag `<context>`. Reformatar como secao H2 padrao markdown. Posicionar antes de `## Regras` em verify-work.

4. **Heuristica grep -c (anti-vibe-review:64):** Absorver como nota curta (`> Nota:`), nao como secao separada. Manter junto ao paragrafo do `code-smell-detector` no Step 2b.

5. **Deep Modules (anti-vibe-review:77-81):** Absorver como nota descritiva em Step 2c antes do spawn do solid-auditor. Manter referencia a `skills/tdd-workflow/references/deep-modules.md` (arquivo confirmado existente).

6. **Linguagem da absorcao:** Referenciar anti-vibe-review como "skill consolidada neste pipeline" — nao como "skill antiga" (G2 do plano: sem urgencia artificial).

7. **Preservar blocos TypeScript de telemetria** em verify-work (linhas 10-57 e 562-583) — nao tocar durante absorcao (G4 do plano).

8. **Modos de Invocacao (anti-vibe-review:19-30):** Esta secao ja documenta a relacao "automaticamente pelo verify-work" — nao e um candidato a absorcao, e contexto que permanece em anti-vibe-review durante o grace period (G5 do plano).

# Golden Files

Snapshots usados pelos testes E2E para gate "nunca diminuir".

## Convencao de regen

Para regravar qualquer golden:

```
UPDATE_GOLDENS=1 bun test tests/e2e/<arquivo-do-teste>.test.ts
```

Apos regen, o diff do arquivo golden aparece no PR e **exige aprovacao humana explicita** — a regen automatica e o mecanismo de conveniencia, nao de bypass.

## Arquivos

| Arquivo | Teste de origem | Nota |
|---------|-----------------|------|
| `init-greenfield.tree.json` | `init-cutover-greenfield.test.ts` | Arvore de arquivos esperada em init greenfield |
| `init-greenfield.stdout.txt` | `init-cutover-greenfield.test.ts` | Stdout esperado em init greenfield (testes parcialmente skipados ate Plano 05 fase-04) |
| `init-legacy-v5.tree.json` | `init-cutover-greenfield.test.ts` | Arvore de arquivos esperada em init legacy V5 |
| `init-legacy-v5.stdout.txt` | `init-cutover-greenfield.test.ts` | Stdout esperado em init legacy V5 |
| `populate-plan-andre-parity.md` | `populate-plan-parity.test.ts` | Estrutura minima do plano populate gerado (Plano 05 fase-01 — CA-08) |

## `populate-plan-andre-parity.md` — notas especificas

Este golden captura **marcadores estruturais** (headers, linhas da tabela de fases, sub-secoes
de fase), nao o output literal completo. O assert usa `actual.includes(goldenLine)` por linha —
mudancas em conteudo (instrucoes expandidas, texto de corpo) nao quebram o gate; apenas
remocao de estrutura quebra.

**Regen valida:**
- Adicao de doc canonico ao TEMPLATE_MANIFEST (nova linha na tabela de fases).
- Refinamento de instrucao LLM imperativa (conteudo de corpo — nao estrutura).
- Path candidato novo em stack-aware-input-paths.

**Regen invalida (deve quebrar build sem UPDATE_GOLDENS):**
- Doc canonico removido (linha da tabela de fases some).
- Secao obrigatoria do PLAN.md removida (header ## some).
- Sub-secao de fase removida (### Inputs / ### Instrucao LLM / ### Criterio de done some).

# Plano 03: MH-3 Instrucoes imperativas

**Feature:** populate-plan-andre-port ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3h
**Depende de:** Plano 01 (lista canonica de docs + `EXCLUDED_FROM_POPULATION_V2` reduzido + `tests/e2e/populate-plan-parity.test.ts` com 2 asserts MH-1 ativos)
**Desbloqueia:** Plano 05 fase-01 (golden snapshot estendido com asserts CA-06)

---

## O que este plano entrega

Reescrever `LLM_INSTRUCTIONS` map e `DEFAULT_INSTRUCTION` em
`skills/init/lib/populate-plan-generator.ts` de `string` para `ImperativeInstruction` —
schema com 3 elementos obrigatorios: `fontes` (rastreio especifico), `secoes` (sub-secoes
obrigatorias do output) e `honestidade` (frase contra placeholder). Remove brechas tipo
"se nao houver historico, mantenha template". Cada uma das 12 entries atuais ganha o novo
schema, mais um sub-assert CA-06 no parity test garantindo o gate "nunca diminuir": adicionar
nova entry sem os 3 elementos quebra build.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status apos Plano 01 |
|-------|-------------|----------------------|
| `populate-plan-generator.ts` exporta `generatePopulatePlanV2` (contrato externo estavel) | feature anterior | pronto |
| `tests/e2e/populate-plan-parity.test.ts` (esqueleto + 2 asserts MH-1) | Plano 01 fase-02 | pronto |
| `CanonicalDoc` estendido com `README.md`, `docs/PRODUCT_SENSE.md` | Plano 01 fase-01 | pronto |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| `ImperativeInstruction` exportado de `populate-plan-generator.ts` | Plano 05 fase-01 (golden snapshot inspeciona o tipo via `isImperativeInstruction`) |
| `LLM_INSTRUCTIONS` exportado (apos fase-03) | `tests/e2e/populate-plan-parity.test.ts` (assert CA-06) |
| 2 sub-asserts CA-06 no parity test | Plano 05 fase-01 (estende com snapshot diff) |
| `formatImperativeInstruction` + `isImperativeInstruction` helpers reutilizaveis | Plano 05 fase-01 (re-uso direto no golden) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-schema-imperative-instruction.md | Tipo `ImperativeInstruction` + helpers `formatImperativeInstruction` / `isImperativeInstruction` + 3 unit tests em arquivo novo | 45min | — |
| 02 | fase-02-reescrever-llm-instructions.md | 12 entries de `LLM_INSTRUCTIONS` refatoradas para `ImperativeInstruction`; map type atualizado; `llmInstructionFor` retorna `ImperativeInstruction`; `renderLLMInstructionBlock` chama `formatImperativeInstruction` | 1.5h | fase-01 |
| 03 | fase-03-default-imperative-assert-ca06.md | `DEFAULT_INSTRUCTION` reescrita como `ImperativeInstruction`; `LLM_INSTRUCTIONS` exportado; 2 sub-asserts CA-06 em `tests/e2e/populate-plan-parity.test.ts` | 45min | fase-02 |

---

## Grafo de Fases

```
fase-01 (schema + helpers)
        |
        v
fase-02 (reescrever 12 entries)
        |
        v
fase-03 (default + 2 asserts CA-06)
```

**Paralelismo possivel:** zero entre fases deste plano (sequencial — schema vira contrato
para entries, entries viram input do parity test). **Em paralelo com outros planos:** Plano 02
e Plano 04 (arquivos disjuntos — este toca `LLM_INSTRUCTIONS` map + `DEFAULT_INSTRUCTION` em
`populate-plan-generator.ts` e adiciona testes ao parity, nao bate com tpl `.tpl` nem com
ARCHITECTURE/AGENTS scaffolds).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

Por fase:

- **fase-01:** TDD puro. 3 testes em arquivo novo `skills/init/lib/imperative-instruction.test.ts`:
  RED (helper inexistente, falha de import), GREEN (declarar tipo + helpers minimos), REFACTOR
  (extrair render se necessario). Sem tocar em codigo existente — risco baixo.
- **fase-02:** TDD reverso suave. O teste `expect(content).toContain('### Instrucao LLM')` em
  `populate-plan-generator.test.ts` ja existe e DEVE continuar verde (heading preservada — G5
  desta fase). Novo teste `each LLM_INSTRUCTION entry satisfies isImperativeInstruction` via
  `test.each(Object.entries(LLM_INSTRUCTIONS))` adicionado ao mesmo arquivo — RED no inicio
  da fase (entries sao string, falham `isImperativeInstruction`), GREEN apos refatorar as 12.
- **fase-03:** RED puro no parity test. Comentar uma `fontes` em qualquer entry → teste lista
  a chave ofensora. GREEN ao restaurar. Se rodado standalone (so Plano 01 + Plano 03 merged),
  parity test tem 4 testes (2 MH-1 + 2 CA-06). Se Plano 02 tambem merged, tem 6.

**Tracer Bullet deste plano:** N/A — Tracer Bullet global da feature ja foi Plano 01. Plano 03
entra na coluna "Honestidade > marketing" (CA-06).

---

## Gotchas Conhecidos

- **G1 (heading `### Instrucao LLM` preservada):** `populate-plan-generator.test.ts` checa
  `expect(content).toContain('### Instrucao LLM')`. `formatImperativeInstruction` NAO pode
  emitir essa string — o heading e adicionado pelo `renderLLMInstructionBlock`. O helper de
  formato produz apenas o corpo (3 blocos: Fontes / Secoes obrigatorias / honestidade).
- **G2 (TS guarda errors de map literal):** ao mudar `LLM_INSTRUCTIONS: Record<string, string>`
  para `Record<string, ImperativeInstruction>` em fase-02, o compilador lista TODAS as entries
  ainda em formato antigo. Usar essa lista como guia — refatorar em lotes de 3 e rodar
  `bun run typecheck` entre lotes para feedback rapido. 12 entries a reescrever.
- **G3 (linhagem git blame):** NAO mover o map `LLM_INSTRUCTIONS` para outro lugar do arquivo.
  Mantern posicao (linha 79 atual) — git blame preserva contexto historico das instrucoes.
- **G4 (frase de honestidade padrao):** texto canonico:
  `'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca \`TODO(<contexto>):\`. Honestidade > marketing.'`
  Variacoes legitimas sao permitidas (ex: doc de design pode usar "Cada token rastreia um
  arquivo do design system"), MAS toda variacao deve manter as 3 promessas: rastreio,
  fallback `TODO(<contexto>)`, e a frase "Honestidade > marketing" (ou equivalente literal).
- **G5 (brechas a matar):** alguns textos atuais tem brechas explicitas. Ex: `QUALITY_SCORE.md`
  diz "Se nao houver historico de PR review, mantenha o template e adicione TODO". Reescrever:
  o `honestidade` da nova entry exige `TODO(contexto)` rastreavel — NAO "mantenha o template".
  Outro: `DEFAULT_INSTRUCTION` atual diz "Se nao houver evidencia suficiente, marque `needsUser`"
  — manter o `needsUser` mas mudar o resto para `fontes`/`secoes` explicitas.
- **G6 (ARCHITECTURE.md como exemplo canonico):** o PRD MH-3 referencia a secao
  `Convencao: docs/ vs Runtime Assets` (presente no `ARCHITECTURE.md` atual deste plugin)
  como modelo do TIPO de output que a LLM deve produzir. As `secoes` da entry
  `ARCHITECTURE.md` em fase-02 devem listar pelo menos: `Convencao docs/ vs Runtime Assets`,
  `Modulos compartilhados`, `Integracoes externas`, `Decisoes obrigatorias`.
- **G7 (export de `LLM_INSTRUCTIONS`):** atualmente NAO exportado (linha 79 declara `const`
  sem `export`). Adicionar `export` em fase-03 e registrar em MEMORY.md como
  `DI-Plano03-fase03-export-llm-instructions` — caller novo: o parity test em
  `tests/e2e/populate-plan-parity.test.ts`.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->

---
fase: 02
plano: 04
status: planned
---

# Fase 02: Teste de Paridade do Contrato do `grill-me`

**Plano:** 04 — Modelo de Frontier
**Sizing:** ~1.5h
**Depende de:** fase-01 (o teste e escrito contra o comportamento novo)
**Visual:** false

**Invariantes:** INV-01 (contrato de saida imutavel) · INV-02 (7 categorias) · INV-03 (gate do Passo 4.5)

---

## O que esta fase entrega

O primeiro teste do `grill-me`.

Hoje: 463 linhas, centro do pipeline `grill-me → write-prd → plan-feature → execute-plan`, e
**zero cobertura**. Enquanto isso `plan-feature` e `quick-plan` tem teste de paridade de template
com gate "nunca diminuir" (`tests/plan-feature-template.test.ts`,
`tests/quick-plan-template.test.ts`).

A fase-01 reescreve o coracao dessa skill. Sair dela sem teste significa que a proxima edicao pode
remover o gate de sintetizar-e-confirmar ou uma das 7 categorias e nada acusa.

---

## Arquivos Afetados

**NOVOS**
- `tests/grill-me-contract.test.ts`

**FORA do escopo**
- Testar a *qualidade* da entrevista — isso e comportamento de LLM, nao verificavel por assertion
- `write-prd` e `design-twice` (consumidores; nao mudam)

---

## Implementacao

### Passo 1: RED — escrever o teste antes

Modelo: `tests/plan-feature-template.test.ts`, que assevera secoes obrigatorias com mensagem de
falha nomeando o que sumiu.

Validar RED de verdade: remover temporariamente uma secao do `grill-me/SKILL.md`, rodar, confirmar
que falha com mensagem util, restaurar. Sem esse passo o teste pode estar passando por vacuidade.

### Passo 2: o que asseverar

Somente o que e **contrato**, nunca prosa. Prosa muda; contrato nao pode mudar em silencio.

| Grupo | Assercao | Invariante |
|---|---|---|
| Cobertura | as 7 categorias presentes: escopo, dados, UX, edge cases, performance, seguranca, integracao | INV-02 |
| Estrutura | os termos-ancora `frontier`, `design tree` e `round` presentes | fase-01 |
| Parada | `95%` **ausente**; parada por fronteira vazia presente | DI-15 |
| Fatos | regra de fatos nao-bloqueantes presente | DI-16 |
| Gates | Passo 1.5 (hipotese/confianca) e Passo 4.5 (sintetizar-e-confirmar) presentes | INV-03 |
| Saida | caminho `docs/exec-plans/active/{date}-{slug}/CONTEXT.md` e as secoes `## Decisions`, `## Open Questions`, `## Recommended Next Steps` | INV-01 |

Nomes de teste sem "should" — verbos descritivos.

### Passo 3: o gate "nunca diminuir"

Mesmo padrao dos testes existentes: a mensagem de falha cita a razao, nao so o que faltou. Um teste
que diz "secao ausente" convida a apagar o teste; um que diz *por que* aquela secao existe convida a
restaurar a secao.

Exemplo de mensagem: `[parity gate — INV-02] Categoria ausente do grill-me: SEGURANCA. As 7
categorias sao sementes do design tree; sem elas o ramo nunca existe e a entrevista fecha sem
tocar no assunto.`

### Passo 4: o que deliberadamente NAO e testado

Registrar no proprio arquivo de teste, como comentario. Silenciar o que nao e coberto le como
cobertura completa:

- que o agente **de fato** calcula a fronteira corretamente — comportamento de LLM
- que as perguntas sao boas
- o fluxo end-to-end `grill-me → write-prd` — exigiria fixture de conversa; candidato a plano futuro

### Passo 5: registrar no `run-tests.ts` se necessario

Conferir se `scripts/run-tests.ts` pega `tests/*.test.ts` por glob ou por lista. Se for lista,
adicionar.

---

## Gotchas

- **G1** — Testar prosa em vez de contrato produz teste que quebra em toda edicao e treina o time a
  ignora-lo. Asseverar so o que nao pode mudar em silencio.
- **G2** — Teste que passa por vacuidade. O passo 1 exige RED validado a mao.
- **G3** — Regex sobre markdown pega comentario tambem. O compound
  `2026-05-12-validator-regex-hits-comments` registra esse erro neste repo. Se a assercao de ausencia
  do `95%` puder casar com um comentario explicando por que foi removido, ancorar melhor — ou nao
  mencionar o token no doc.
- **G4** — CRLF quebra regex de secao (compound `2026-05-19`). Normalizar antes de casar.

---

## Verificacao

### TDD

RED (passo 1, validado a mao removendo uma secao) → GREEN (assercoes contra o arquivo real).

### Checklist

- [ ] `bun test tests/grill-me-contract.test.ts` verde
- [ ] RED validado manualmente e registrado no MEMORY
- [ ] Os 6 grupos de assercao presentes
- [ ] Mensagens de falha citam a razao, nao so o que faltou
- [ ] Secao "o que nao e testado" no arquivo
- [ ] `bun run test` completo verde
- [ ] G3 conferido: a assercao de ausencia do `95%` nao casa com comentario

---

## Criterio de Aceite

**Por maquina:**
- `bun run test && bun run typecheck` exit 0
- Remover qualquer uma das 7 categorias faz o teste falhar com mensagem nomeando a categoria
- Remover o Passo 4.5 faz o teste falhar

**Por humano:**
- Ler uma mensagem de falha e entender **por que** aquela secao existe, sem abrir o `SKILL.md`
- A lista do que nao e coberto e honesta

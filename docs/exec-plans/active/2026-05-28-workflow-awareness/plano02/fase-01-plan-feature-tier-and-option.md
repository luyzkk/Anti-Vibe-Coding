<!--
Princípio universal #5 — Comment Provenance.
Esta fase edita PROSA de SKILL.md, não código de runtime. Sem comentários inline de código.
Provenance da decisão: PRD RF5; CONTEXT INV5/INV6; PLAN R3.
-->

# Fase 01: plan-feature — Tier de Escala-Workflow + Opção Explicativa-Only

**Plano:** 02 — Camadas de Skill (Descoberta no Planejamento)
**Sizing:** 1.5h
**Depende de:** Nenhuma (independente das demais fases; só LÊ `docs/WORKFLOWS.md`, criado no Plano 01)
**Visual:** false

---

## O que esta fase entrega

`skills/plan-feature/SKILL.md` ganha (a) um TERCEIRO tier semântico de sinais "ESCALA-WORKFLOW" no
Step 4 de análise de complexidade e (b) uma opção AskUserQuestion **explicativa-only** no Step 7,
com o invariante no-launch (INV6) reafirmado adjacente — sem que nenhuma das duas adições possa ser
lida pela LLM como permissão de lançar um workflow.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/plan-feature/SKILL.md` | Modify | Step 4 ("Sinais Semanticos de Complexidade", ~linhas 469-488): adicionar bloco "SINAIS DE ESCALA-WORKFLOW" APÓS o bloco "SINAIS DE COMPLEXIDADE BAIXA". Step 7 ("Apresentar ao Dev", lista AskUserQuestion ~linhas 597-602): adicionar 1 opção explicativa-only + nota INV6 adjacente. |

> **Ground truth confirmado (Read 2026-05-29):** Step 4 tem os blocos `SINAIS DE COMPLEXIDADE ALTA`
> (linha 474) e `SINAIS DE COMPLEXIDADE BAIXA` (linha 483) dentro de um fence ```` ``` ````. Step 7
> tem a lista de opções do `AskUserQuestion` nas linhas 597-602 (item 3), terminando em "Cancelar".

---

## Implementacao

### Passo 1 — Step 4: terceiro tier "SINAIS DE ESCALA-WORKFLOW" (semântico, INV5)

O Step 4 hoje classifica complexidade em dois tiers (ALTA → múltiplos planos; BAIXA → plano único).
A insight da feature é que **complexidade ≠ escala**: uma feature pode ser ALTA em complexidade e
ainda assim caber no `plan-feature` (o Claude orquestra turno a turno). Escala é ortogonal — é
sobre **volume** que estoura o que uma conversa coordena.

Adicionar um terceiro tier DENTRO do mesmo fenced block, logo APÓS `SINAIS DE COMPLEXIDADE BAIXA`.
O tier é **puramente semântico** — INV5 proíbe qualquer threshold numérico aqui (o número
`100+/500+` vive SÓ no regex do hook do Plano 01). Prosa PT-BR proposta (inserir após a linha 488,
ainda dentro do fence que fecha na linha 488):

```text
SINAIS DE ESCALA-WORKFLOW (ortogonal a complexidade — NAO e "mais um nivel de complexidade"):
- Varredura/auditoria do CODEBASE INTEIRO (nao de um modulo ou diff)
- Migracao em massa de muitos arquivos para um novo formato/padrao
- Pesquisa cross-checada em VARIAS fontes (caminho concreto: /deep-research, se disponivel)
- Plano com MUITOS angulos paralelos ou muitas rodadas de revisao adversarial
- Volume que estoura o que UMA conversa coordena com seguranca (dezenas-a-centenas de agentes)

Se estes sinais aparecerem, NAO aumente o numero de planos para "dar conta na marra" — isto e
escala, nao complexidade. Considere SUGERIR ao dev rodar como dynamic workflow (ver `docs/WORKFLOWS.md`
para a fronteira workflow vs subagente vs skill). A sugestao e do dev: ele opta digitando a palavra
`workflow` no pedido. Este passo NUNCA lanca um workflow nem decide por conta propria — apenas sinaliza.
```

Regras desta inserção:
- **INV5:** zero números. Use "muitos", "varias", "codebase inteiro" — nunca "100+", "5+", etc.
- **G1 (uma fonte de verdade):** referenciar `` `docs/WORKFLOWS.md` `` por **menção de caminho**
  (texto em backtick), NUNCA como link markdown `[..](../../docs/WORKFLOWS.md)` — ver G5 do README.
- **G4 (D7):** nomear `/deep-research` com o hedge "se disponível" no item de pesquisa.
- **INV6:** a última frase ("NUNCA lança ... apenas sinaliza") é obrigatória e é um dos marcadores
  verificados pela fase-06.

### Passo 2 — Step 7: opção AskUserQuestion explicativa-only (INV6 — alto risco de prose-leak)

O Step 7 (linha 597) tem hoje 5 opções no `AskUserQuestion` (linhas 598-602):

```text
3. AskUserQuestion com opcoes:
   - "Aprovar estrutura e criar Plano 1"
   - "Ajustar (diga o que mudar)"
   - "Refazer decomposicao"
   - "Quero plano unico (flat) mesmo"
   - "Cancelar"
```

Adicionar UMA opção explicativa-only ANTES de "Cancelar", e uma nota INV6 logo abaixo do bloco de
opções. A opção é mostrada SOMENTE quando o Step 4 detectou sinais de ESCALA-WORKFLOW (condicional —
não poluir o menu quando não há sinal de escala). Prosa PT-BR proposta (substituir as linhas 597-602):

```text
3. AskUserQuestion com opcoes:
   - "Aprovar estrutura e criar Plano 1"
   - "Ajustar (diga o que mudar)"
   - "Refazer decomposicao"
   - "Quero plano unico (flat) mesmo"
   - (SE o Step 4 detectou sinais de ESCALA-WORKFLOW) "Explicar a opcao de workflow (nao executa)"
   - "Cancelar"

   Invariante (INV6): a opcao "Explicar a opcao de workflow" e EXPLICATIVA. Se o dev a escolher, a
   skill apenas DESCREVE o que e um dynamic workflow e como o dev opta (digitando `workflow` no
   pedido), apontando `docs/WORKFLOWS.md`. A skill NAO lanca o workflow, NAO emite a tool Workflow,
   NAO decide por conta propria — o opt-in e 100% acao do humano. Apos explicar, retorna ao menu de
   opcoes acima (a explicacao nao avanca o fluxo nem cria nada).
```

Regras desta inserção:
- **INV6:** o rótulo da opção contém literalmente `(nao executa)`. A nota-invariante usa os
  marcadores "NAO lanca", "NAO emite a tool Workflow", "opt-in e 100% acao do humano" — todos
  verificados pela fase-06.
- **Condicional, não incondicional:** a opção só aparece quando há sinal de escala (caso contrário,
  é ruído no menu de planejamento normal). Documentar a condição em texto.
- **Retorno ao menu:** deixar explícito que escolher a opção NÃO avança o fluxo — apenas explica e
  volta. Isso fecha a brecha de "explicar = começar a executar".
- **G1:** `` `docs/WORKFLOWS.md` `` por menção de caminho, nunca link markdown.

### Passo 3 — Conferir que nada mais no plan-feature precisa mudar

A Regra 4 da skill (linha 801: "A quantidade de planos e fases e decidida por analise semantica,
NUNCA por thresholds fixos") já está alinhada com INV5 — NÃO editar. O bloco de telemetria
(linhas 10-33 e 916-937) NÃO é tocado. Nenhuma outra seção menciona escala/workflow.

---

## Gotchas

- **G1 do plano (uma fonte de verdade):** as duas inserções REFERENCIAM `` `docs/WORKFLOWS.md` `` —
  nunca reproduzem a tabela comparativa nem o texto da mensagem `[WORKFLOW_ADVISOR]`.
- **G2 do plano (INV5):** o tier do Step 4 é o ponto de maior tentação de colocar número. NÃO colocar.
- **G3 do plano (INV6 — esta é uma das DUAS fases de hardening obrigatório):** ambos os passos têm
  marcadores no-launch verificados pela fase-06.
- **G5 do plano (link-check):** menção de caminho em backtick, nunca link markdown — `docs/WORKFLOWS.md`
  só existe após o Plano 01; um link verificado quebraria `harness:validate`.
- **Local — fence boundaries:** o tier do Step 4 entra DENTRO do fence ```` ``` ```` que fecha na
  linha 488 (junto com os outros tiers). Reler o arquivo antes de editar para casar o fence exato
  (o `Edit` falha em silêncio se o contexto não bater).

---

## Verificacao

### TDD

- [ ] **RED:** a asserção da fase-06 para `plan-feature/SKILL.md` FALHA antes desta fase (marcadores
  "SINAIS DE ESCALA-WORKFLOW" e "(nao executa)" ausentes).
  - Comando: `bun run test -- --test-name-pattern "plan-feature"` (após fase-06 existir)
  - Resultado esperado: assertion failure (string não encontrada)

- [ ] **GREEN:** após as inserções, a asserção PASSA.
  - Comando: `bun run test -- --test-name-pattern "plan-feature"`
  - Resultado esperado: passed

### Checklist

- [ ] Step 4 contém o bloco "SINAIS DE ESCALA-WORKFLOW" APÓS "SINAIS DE COMPLEXIDADE BAIXA", dentro do mesmo fence.
- [ ] O tier NÃO contém nenhum dígito de threshold (grep por `\d` no bloco inserido = só aparece em "/deep-research" se houver — não deve haver número de escala). INV5 respeitado.
- [ ] Step 7 contém a opção `"Explicar a opcao de workflow (nao executa)"` marcada como condicional ao sinal de escala.
- [ ] Nota-invariante INV6 presente abaixo do bloco de opções com os marcadores "NAO lanca" / "NAO emite a tool Workflow" / "opt-in e 100% acao do humano".
- [ ] `docs/WORKFLOWS.md` referenciado por menção de caminho (backtick), zero links markdown novos no arquivo.
- [ ] `bun run harness:validate` verde (sem `broken-link`, H1 do SKILL.md preservado).
- [ ] `bun run typecheck` sem novos erros (estado-base GT-01 do Plano 01 inalterado).
- [ ] `bunx biome check skills/plan-feature/SKILL.md` limpo (opcional).

---

## Criterio de Aceite

**Por maquina:**
- `bun run test` (incluindo `tests/e2e/workflow-prose-leak.test.ts` da fase-06) verde para o caso de `plan-feature`.
- `bun run harness:validate` retorna exit 0.
- Grep em `skills/plan-feature/SKILL.md` por `Workflow(` e `decision:block` retorna ZERO ocorrências.

**Por humano:**
- Leitura fresca (persona de novo dev) das duas inserções: nenhuma frase sugere que a skill lança o workflow. A opção e o tier são inequivocamente suggest-only.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->

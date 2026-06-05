<!--
Princípio universal #5 — Comment Provenance.
Esta fase edita PROSA de SKILL.md, não código de runtime. Sem comentários inline de código.
Provenance da decisão: PRD RF9; CONTEXT INV2/INV6/INV8; PLAN R3.
-->

# Fase 02: execute-plan — Callout "Workflow vs Orquestrador" (keep-separate + opt-in fresco)

**Plano:** 02 — Camadas de Skill (Descoberta no Planejamento)
**Sizing:** 1.5h
**Depende de:** Nenhuma (independente das demais fases; só LÊ `docs/WORKFLOWS.md`, criado no Plano 01)
**Visual:** false

---

## O que esta fase entrega

`skills/execute-plan/SKILL.md` ganha um callout "Workflow vs este orquestrador" que estabelece
**keep-separate** no nível do plano (checkpoints humanos + STATE.md/MEMORY.md cross-session vs
"no mid-run input" + variáveis de script in-session do workflow — INV8) e **offer-alongside** SÓ
para uma única fase mecânica, exigindo opt-in fresco e explícito do humano — escrito de modo que
NUNCA possa ser lido como "execute-plan delega uma fase por decisão própria" (INV6).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/execute-plan/SKILL.md` | Modify | Adicionar UM callout (subseção) ancorado entre Step 4b "Spawn de Subagente por Fase" (~linha 410) e o Step 5, OU como nota dentro de Step 6 "Transição entre Planos" (~linha 624). Decisão de âncora abaixo. |

> **Ground truth confirmado (Read 2026-05-29):** Step 4b "Spawn de Subagente por Fase" começa na
> linha 410. Step 6 "Transicao entre Planos" começa na linha 624. A skill já tem o conceito de
> isolamento de contexto, checkpoints humanos (Step 3 obrigatório, linha 825 "Sempre confirma antes
> de executar") e persistência em STATE.md/MEMORY.md cross-session.

---

## Implementacao

### Passo 1 — Decidir a âncora do callout

Duas âncoras candidatas (do brief). **Decisão recomendada:** inserir o callout como uma subseção
nova **logo após o Step 4b** (após o bloco que fecha na linha 435, antes de "### 4c. Ciclo TDD por
Fase"). Razão: 4b é onde a skill descreve o spawn de subagente POR FASE — exatamente o ponto onde o
dev pode se perguntar "por que não rodar isto como workflow?". É o local de maior relevância
contextual. Step 6 (transição entre planos) é sobre fronteira de plano, menos preciso para a
distinção fase-mecânica.

Se a execução preferir Step 6, é aceitável — mas registrar o desvio na MEMORY.md. O conteúdo do
callout é o mesmo independente da âncora.

### Passo 2 — Redigir o callout (INV2 + INV8 + INV6 — alto risco de prose-leak)

Prosa PT-BR proposta (inserir como subseção `### 4b.1` após o fence que fecha o Step 4b na linha 435):

```text
### 4b.1 — Workflow vs este orquestrador (quando NÃO unificar)

Um dynamic workflow do Claude Code (script que orquestra dezenas-a-centenas de subagentes) e este
orquestrador resolvem problemas DIFERENTES — eles se complementam, nunca se substituem (INV2).

KEEP-SEPARATE no nivel do plano (NAO unificar — INV8):
- Este orquestrador roda CROSS-SESSION: pausa, retoma, e persiste estado em STATE.md/MEMORY.md no
  disco. Tem CHECKPOINTS HUMANOS (o Step 3 confirma antes de cada plano; o dev decide transicoes).
- Um workflow roda IN-SESSION: sem input humano no meio do run ("no mid-run input"), estado em
  VARIAVEIS DE SCRIPT (nao em disco). Edicoes de arquivo sao AUTO-APROVADAS assim que o workflow lanca.
- Essas duas naturezas NAO se fundem: a memoria cross-session do plano e a coordenacao in-session do
  workflow sao camadas distintas. Nao tente rodar "o plano inteiro como um workflow".

OFFER-ALONGSIDE so para UMA fase mecanica (com opt-in FRESCO e explicito):
- Se UMA fase isolada e puramente mecanica e de ESCALA (ex: aplicar o mesmo refactor a muitos
  arquivos, varrer o codebase inteiro), o orquestrador pode SUGERIR ao dev rodar AQUELA fase como
  dynamic workflow — apontando `docs/WORKFLOWS.md`.
- Esta sugestao exige um opt-in NOVO e explicito do humano (digitar `workflow` para aquela fase).
  O orquestrador NUNCA lanca o workflow, NUNCA emite a tool Workflow, e NUNCA delega uma fase por
  decisao propria. Lembre: o CC auto-aprova edicoes de arquivo assim que um workflow lanca — por
  isso o opt-in tem que ser uma acao consciente e fresca do dev, nunca uma inferencia da skill.
- Alternativa in-context que funciona sempre (inclusive com workflows desabilitados): manter a fase
  no fluxo normal de subagente isolado deste orquestrador.
```

Regras desta inserção:
- **INV2:** o callout abre com "se complementam, nunca se substituem" — marcador verificado.
- **INV8:** os pares cross-session/in-session, disco/variáveis-de-script, checkpoints/no-mid-run
  estão explícitos. "NAO se fundem" / "NAO tente rodar o plano inteiro como um workflow" são marcadores.
- **INV6:** os marcadores "NUNCA lanca o workflow", "NUNCA emite a tool Workflow", "NUNCA delega uma
  fase por decisao propria", "opt-in NOVO e explicito", e a frase sobre auto-aprovação do CC são
  obrigatórios e verificados pela fase-06.
- **G1:** `` `docs/WORKFLOWS.md` `` por menção de caminho, nunca link markdown.
- **D7 (G4):** não há caso de pesquisa direto aqui, então `/deep-research` não é citado nesta fase
  (correto — só citar onde pesquisa é o use case; ver verify-work fase-03 e docs fase-05).

### Passo 3 — Conferir consistência com as Regras Críticas existentes

A Regra Crítica 2 (linha 823: "O orchestrador nunca executa codigo — apenas spawn de subagentes e
atualizacao de estado") já reforça que o orquestrador não age sozinho — o callout é coerente com
ela. A Regra Crítica 4 (linha 825: "Sempre confirma antes de executar") sustenta o opt-in fresco.
NÃO editar essas regras; apenas garantir que o callout não as contradiz. Bloco de telemetria
(linhas 10-33, 904-925) NÃO tocado.

---

## Gotchas

- **G1 do plano (uma fonte de verdade):** o callout REFERENCIA `` `docs/WORKFLOWS.md` `` — não
  reproduz a tabela comparativa nem a mensagem `[WORKFLOW_ADVISOR]`.
- **G3 do plano (INV6 — esta é a SEGUNDA fase de hardening obrigatório, a mais sensível):** o
  execute-plan é onde o prose-leak é mais perigoso (CC auto-aprova edições após o workflow lançar).
  Todos os marcadores no-launch + a frase de auto-aprovação são obrigatórios.
- **G5 do plano (link-check):** menção de caminho, nunca link — `docs/WORKFLOWS.md` só existe após Plano 01.
- **Local — INV8 é o diferenciador deste callout vs os outros:** só este callout fala de
  persistência (STATE.md/MEMORY.md disco vs variáveis de script). Não diluir essa distinção; é o
  núcleo do RF9.
- **Local — âncora:** reler o arquivo antes de editar; o fence do Step 4b fecha na linha 435.
  Inserir a subseção entre `` ``` `` (435) e `### 4c.` (437).

---

## Verificacao

### TDD

- [ ] **RED:** a asserção da fase-06 para `execute-plan/SKILL.md` FALHA antes desta fase (marcadores
  "Workflow vs este orquestrador" e "opt-in NOVO e explicito" ausentes).
  - Comando: `bun run test -- --test-name-pattern "execute-plan"` (após fase-06 existir)
  - Resultado esperado: assertion failure

- [ ] **GREEN:** após o callout, a asserção PASSA.
  - Comando: `bun run test -- --test-name-pattern "execute-plan"`
  - Resultado esperado: passed

### Checklist

- [ ] Callout "Workflow vs este orquestrador" presente (âncora: após Step 4b, ou Step 6 com desvio registrado).
- [ ] INV8 explícito: cross-session/STATE.md/MEMORY.md/checkpoints vs in-session/variáveis-de-script/no-mid-run, com "NAO se fundem".
- [ ] INV2 explícito: "se complementam, nunca se substituem".
- [ ] INV6 explícito: "NUNCA lanca o workflow" + "NUNCA emite a tool Workflow" + "NUNCA delega uma fase por decisao propria" + "opt-in NOVO e explicito" + a frase sobre auto-aprovação do CC.
- [ ] Alternativa in-context (manter fase no fluxo de subagente) mencionada — funciona com workflows desabilitados.
- [ ] `docs/WORKFLOWS.md` por menção de caminho; zero links markdown novos.
- [ ] `bun run harness:validate` verde.
- [ ] `bun run typecheck` sem novos erros.
- [ ] `bunx biome check skills/execute-plan/SKILL.md` limpo (opcional).

---

## Criterio de Aceite

**Por maquina:**
- `bun run test` verde para o caso `execute-plan` (fase-06).
- `bun run harness:validate` exit 0.
- Grep em `skills/execute-plan/SKILL.md` por `Workflow(` e `decision:block` retorna ZERO ocorrências.

**Por humano:**
- Leitura fresca: o callout deixa inequívoco que o execute-plan NÃO delega uma fase a um workflow por
  conta própria; o opt-in é sempre uma ação fresca do dev. A distinção keep-separate (INV8) está clara.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->

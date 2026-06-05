<!--
Princípio universal #5 — Comment Provenance.
Esta fase edita PROSA de dois SKILL.md, não código de runtime. Sem comentários inline de código.
Provenance da decisão: PRD RF7 + RF8; CONTEXT INV2/INV5/D7; PLAN R2.
-->

# Fase 03: Skills com Subagentes Paralelos — verify-work + design-twice

**Plano:** 02 — Camadas de Skill (Descoberta no Planejamento)
**Sizing:** 1h
**Depende de:** Nenhuma (independente das demais fases; só LÊ `docs/WORKFLOWS.md`, criado no Plano 01)
**Visual:** false

---

## O que esta fase entrega

As duas skills que já spawnam subagentes em paralelo ganham, cada uma, uma nota curta que posiciona
seu paralelismo in-context como a versão "mesmo padrão, escala diferente" do workflow: `verify-work`
(auditores paralelos sobre o DIFF vs workflow para o codebase inteiro) e `design-twice` (3-5 ângulos
in-context vs workflow só acima de ~5 ângulos / com cross-review adversarial / quando a orquestração
precisa ser rerunnable). Ambas referenciam `docs/WORKFLOWS.md` sem duplicar lógica.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/verify-work/SKILL.md` | Modify | RF7 — callout curto perto do Step 2 "Audit Pipeline" (~linha 117) / "2b. Auditores Fixos" (~linha 140): paralelo+fresh-context = versão in-context escopada ao diff; workflow só para codebase inteiro / muitas rodadas de cross-review. |
| `skills/design-twice/SKILL.md` | Modify | RF8 — nota curta perto do Step 3 "Spawnar Subagentes em Paralelo" (~linha 141): workflow só ACIMA de ~5 ângulos OU com revisão adversarial entre rascunhos OU quando a orquestração deve ser rerunnable. |

> **Ground truth confirmado (Read 2026-05-29):**
> - verify-work: Step 2 "Audit Pipeline" abre na linha 117 ("Spawnar auditores em paralelo..."),
>   "### 2b. Auditores Fixos" na linha 140. Há ainda "Fase Final — Fresh-context Review" (linha 556).
> - design-twice: Step 3 "Spawnar Subagentes em Paralelo" na linha 141 (3 subagentes A/B/C);
>   Regra 5 (linha 335: "Minimo 3 propostas, maximo 5") e a opção "Mais propostas" (linha 260,
>   max 5 total) — o limite natural da skill é 3-5 propostas.

---

## Implementacao

### Passo 1 — verify-work: callout "mesmo padrão, escala diferente" (RF7)

Inserir um callout curto logo após a linha de abertura do Step 2 (linha 119, antes de "### 2a.").
A ideia: a máquina de auditores paralelos + fresh-context É a versão in-context do que um workflow
faz — só que escopada ao DIFF. Workflow só ganha quando o escopo é o CODEBASE INTEIRO ou quando há
MUITAS rodadas de cross-review. Prosa PT-BR proposta:

```text
> **Workflow vs este pipeline de auditoria (mesmo padrao, escala diferente):** os auditores rodando
> em paralelo + a Fase Final de fresh-context JA SAO a versao in-context de orquestracao adversarial —
> escopados ao DIFF (arquivos modificados). Um dynamic workflow e a MESMA ideia em escala maior: use-o
> apenas quando o escopo for o CODEBASE INTEIRO (nao um diff) ou quando precisar de MUITAS rodadas de
> cross-review que uma conversa nao coordena. Para pesquisa cross-checada, o caminho concreto e
> /deep-research (se disponivel). Workflow e a camada ACIMA deste pipeline — nunca o substitui (INV2).
> Como sempre, a sugestao e do dev: ele opta digitando `workflow`. Ver `docs/WORKFLOWS.md`.
```

Regras:
- **INV5:** sem threshold numérico. "Codebase inteiro", "muitas rodadas" — semântico.
- **INV2:** "camada ACIMA deste pipeline — nunca o substitui" (marcador).
- **G4 (D7):** `/deep-research` com "se disponível" (verify-work toca o caso de pesquisa cross-check).
- **G1/G5:** `` `docs/WORKFLOWS.md` `` por menção de caminho.
- **INV6 (leve aqui):** "a sugestao e do dev: ele opta digitando `workflow`" — verify-work não lança
  nada; o marcador suggest-only é mantido por consistência.

### Passo 2 — design-twice: nota "acima de ~5 ângulos / cross-review / rerunnable" (RF8)

Inserir uma nota curta logo após o bloco de spawn do Step 3 (após o fence que termina na linha 150,
antes de "Regras de isolamento" na linha 154). A skill hoje gera 3 propostas (máx 5 — Regra 5).
A nota delimita quando subir para workflow. Prosa PT-BR proposta:

```text
> **Quando subir para um dynamic workflow (em vez de mais propostas aqui):** este Step gera de 3 a 5
> propostas divergentes in-context — suficiente para a maioria das decisoes. Considere SUGERIR ao dev
> um workflow apenas quando: (a) o problema pede ACIMA de ~5 angulos genuinamente diferentes; (b) cada
> rascunho precisa passar por revisao ADVERSARIAL entre si antes de convergir; ou (c) a orquestracao
> precisa ser RERUNNABLE (re-executavel com parametros, nao uma exploracao unica). Workflow e a camada
> ACIMA do design-twice — nunca o substitui (INV2). A escolha e do dev (ele digita `workflow`); este
> Step nao lanca nada. Ver `docs/WORKFLOWS.md`.
```

Regras:
- **INV5/G2:** "~5 ângulos" é uma APROXIMAÇÃO semântica do limite da própria skill (3-5 propostas),
  não um threshold de detecção. Marcar com "~" e "genuinamente diferentes". Este é o único "número"
  tolerado no plano e é justificável (deriva do max-5 que a skill já documenta na Regra 5).
- **INV2:** "camada ACIMA do design-twice — nunca o substitui" (marcador).
- **G1/G5:** menção de caminho para `` `docs/WORKFLOWS.md` ``.
- **INV6 (leve):** "este Step nao lanca nada" — marcador suggest-only.
- **D7:** design-twice NÃO é caso de pesquisa, então NÃO citar `/deep-research` aqui (citar só onde
  pesquisa é o use case — verify-work e docs).

### Passo 3 — Não tocar telemetria nem contratos

Ambos os arquivos têm blocos de telemetria (verify-work 10-33/580-600; design-twice 10-33/345-363) e
referências a contrato v1 — NÃO tocar. As inserções são puramente as duas notas acima.

---

## Gotchas

- **G1 do plano (uma fonte de verdade):** ambas as notas REFERENCIAM `` `docs/WORKFLOWS.md` `` —
  nunca reproduzem a tabela comparativa nem a mensagem do hook.
- **G2 do plano (INV5):** verify-work = zero números; design-twice = só "~5" como aproximação do
  limite próprio da skill (não threshold de detecção). Não introduzir "100+", "16 concorrentes", etc.
- **G4 do plano (D7):** `/deep-research` aparece em verify-work (pesquisa cross-check é use case),
  NÃO em design-twice.
- **G5 do plano (link-check):** menção de caminho, nunca link markdown.
- **Local — esta fase NÃO é INV6-hardening obrigatório** (diferente de fase-01 e fase-02): verify-work
  e design-twice não lançam workflows nem têm o risco de auto-aprovação do execute-plan. Ainda assim,
  mantêm o marcador suggest-only ("a escolha e do dev / não lança nada") por consistência e para o
  scan da fase-06 passar uniformemente.

---

## Verificacao

### TDD

- [ ] **RED:** as asserções da fase-06 para `verify-work/SKILL.md` e `design-twice/SKILL.md` FALHAM
  antes desta fase (marcadores "mesmo padrao, escala diferente" e "ACIMA de ~5 angulos" ausentes).
  - Comando: `bun run test -- --test-name-pattern "verify-work|design-twice"` (após fase-06)
  - Resultado esperado: assertion failure

- [ ] **GREEN:** após as duas notas, as asserções PASSAM.
  - Comando: `bun run test -- --test-name-pattern "verify-work|design-twice"`
  - Resultado esperado: passed

### Checklist

- [ ] verify-work: callout perto do Step 2 com "mesmo padrao, escala diferente", escopo diff vs codebase inteiro, `/deep-research` (se disponível), "camada ACIMA ... nunca o substitui".
- [ ] design-twice: nota perto do Step 3 com "acima de ~5 angulos / revisao adversarial / rerunnable", "camada ACIMA ... nunca o substitui".
- [ ] Nenhum threshold numérico exceto o "~5" aproximado e justificado no design-twice (INV5).
- [ ] Marcador suggest-only ("a escolha/sugestão é do dev; não lança nada") presente em AMBAS.
- [ ] `docs/WORKFLOWS.md` por menção de caminho nos dois arquivos; zero links markdown novos.
- [ ] `bun run harness:validate` verde (H1 de ambos SKILL.md preservado).
- [ ] `bun run typecheck` sem novos erros.
- [ ] `bunx biome check skills/verify-work/SKILL.md skills/design-twice/SKILL.md` limpo (opcional).

---

## Criterio de Aceite

**Por maquina:**
- `bun run test` verde para os casos `verify-work` e `design-twice` (fase-06).
- `bun run harness:validate` exit 0.
- Grep nos dois arquivos por `Workflow(` e `decision:block` retorna ZERO ocorrências.

**Por humano:**
- Leitura fresca: as duas notas comunicam "mesma máquina, escala maior" e deixam claro que a skill
  apenas sugere — não lança workflow.

---

<!-- Gerado por /plan-feature em 2026-05-29 -->

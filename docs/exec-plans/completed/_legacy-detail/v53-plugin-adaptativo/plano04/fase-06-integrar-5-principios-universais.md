# Fase 06: Integrar os 5 Princípios Universais

**Plano:** 04 — Modo Dual + 5 Princípios Universais
**Sizing:** 1h
**Depende de:** fase-04 (templates de write-prd já adaptados), fase-05 (verify-work já adaptado)
**Visual:** false

---

## O que esta fase entrega

Integra os 5 princípios universais (1, 5, 7, 9, 10) nos prompts e templates relevantes. Os princípios são cross-cutting (não dependem do perfil arquitetural) — entram como adições estáticas. Cobre RF11 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/consultant/SKILL.md` | Modify | #1 (10 Questions Test obrigatórias antes de recomendar) + #10 (YAGNI checklist no fim) |
| `anti-vibe-coding/skills/grill-me/SKILL.md` | Modify | #1 (referência ao 10 Questions Test como expansão opcional do questionário) |
| `anti-vibe-coding/skills/write-prd/templates/prd-template.md` | Modify | #5 (Comment Provenance — instrução para code samples) + #7 (Declarative-first — seção "Outcomes" precede "Algoritmo") |
| `anti-vibe-coding/skills/plan-feature/templates/fase-template.md` | Modify | #5 (Comment Provenance — instrução nos snippets de exemplo) |
| `anti-vibe-coding/skills/verify-work/SKILL.md` | Modify | #9 (Fresh-context review — nova fase no fim do fluxo, spawn de subagente sem histórico) |
| `anti-vibe-coding/docs/universal-principles-v53.md` | Create | Documenta os 5 universais com pointers para onde estão integrados |

---

## Implementacao

### Passo 1: #1 (10 Questions Test) em `consultant/SKILL.md`

Antes de qualquer recomendação técnica, `consultant` agora pergunta (ou se autoresponde quando óbvio) 10 perguntas de contexto. Lista canônica:

```markdown
## Princípio universal #1 — 10 Questions Test (obrigatório antes de recomendar)

Antes de oferecer recomendação técnica, garanta que estas 10 perguntas têm resposta:

1. Qual problema concreto está sendo resolvido (não a feature, o problema)?
2. Quem é o usuário/consumidor final desta decisão?
3. Qual a escala atual (usuários, RPS, tamanho de dados)?
4. Qual a escala esperada em 6 meses?
5. Quais restrições existem (stack, deadline, budget de complexidade)?
6. Que decisões similares já foram tomadas no projeto (consultar `decisions.md`)?
7. Qual o pior cenário se a decisão estiver errada?
8. Quão reversível é a decisão (em horas, dias, semanas)?
9. Quais alternativas foram consideradas e descartadas, e por quê?
10. Como vamos medir se a decisão funcionou?

Se 3+ perguntas ficarem sem resposta sólida, pause a recomendação e pergunte ao usuário. Não recomende no escuro.
```

### Passo 2: #10 (YAGNI checklist) em `consultant/SKILL.md`

No fim do fluxo do consultant, antes de emitir a recomendação final:

```markdown
## Princípio universal #10 — YAGNI checklist (obrigatório após análise)

Antes de finalizar a recomendação, responda explicitamente:

- [ ] Este problema existe HOJE no projeto, ou é especulativo (pode acontecer no futuro)?
- [ ] Se especulativo, qual o sinal concreto que ativaria a necessidade?
- [ ] A solução mais simples que resolve HOJE é qual?
- [ ] A solução recomendada é mais elaborada que a simples por qual razão concreta?
- [ ] Algum item da recomendação cobre cenário hipotético sem evidência?

Se a recomendação inclui itens "para o futuro" sem sinal concreto, marque-os explicitamente como **especulativos** e ofereça versão minimalista como alternativa.
```

### Passo 3: #1 referência em `grill-me/SKILL.md`

`grill-me` já tem questionário próprio. Adicionar pointer no fim do prompt:

```markdown
## Expansão opcional — 10 Questions Test (princípio universal #1)

Se o feature for de complexidade alta E o questionário acima ainda deixou ambiguidade,
expanda para o 10 Questions Test (definido em `consultant/SKILL.md`) antes de fechar o CONTEXT.md.
```

### Passo 4: #5 (Comment Provenance) em templates

Em `prd-template.md`, adicionar uma instrução logo após o front-matter:

```markdown
<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->
```

Em `fase-template.md`, mesma instrução no início, e nos exemplos de snippet TS adicionar UM comentário de exemplo com linhagem:

```typescript
// 2026-05-04 (Luiz/dev): status default 'pending' — alinhado com PRD seção "Estados"
export type NotificationStatus = 'pending' | 'sent' | 'failed'
```

### Passo 5: #7 (Declarative-first) em `prd-template.md`

Reordenar a seção "Solução" do template para preceder algoritmo com outcomes:

```markdown
## Solução

### Outcomes (declarativo — o QUE, não o COMO)

Liste os resultados observáveis que esta feature entrega. Use linguagem de resultado:
"o usuário consegue X", "o sistema garante Y", "Z é mensurável via W".
NÃO inclua passos de implementação aqui.

- {outcome 1}
- {outcome 2}

### Mecanismo (algorítmico — o COMO)

{Apenas após os outcomes estarem listados. Descrever fluxos, algoritmos, integrações.}

{- structure-snippet -}
```

A separação Outcomes / Mecanismo é a manifestação do princípio #7. PRDs que se enquadram declaram resultados antes de explicar implementação.

### Passo 6: #9 (Fresh-context review) em `verify-work/SKILL.md`

Adicionar nova fase no fim do fluxo do `verify-work`:

```markdown
## Fase Final — Fresh-context Review (princípio universal #9)

Após todas as outras fases (anti-vibe-review, test quality audit, aderência ao perfil),
spawn um subagente NOVO com contexto limpo. O subagente recebe APENAS:

- O PRD (PRD.md)
- O plano (PLAN.md + READMEs dos planos)
- Os arquivos finais alterados (lista via git diff)

NÃO compartilhe com o subagente:

- O histórico desta sessão de execução
- Tentativas que foram revertidas
- Decisões emergentes que mudaram durante execução

Pergunte ao subagente:

1. "O código entregue cobre os outcomes declarados no PRD?"
2. "Há alguma divergência entre o plano e o entregue que precisa ser sinalizada?"
3. "Há algum sinal de over-engineering que só fica visível com olhos frescos?"

Inclua a resposta do subagente na seção "Fresh-context Review" do relatório final.
```

Implementação: bloco TS no final da SKILL.md spawna subagente via Task tool com prompt contendo APENAS os 3 inputs declarados acima.

### Passo 7: Documentar em `docs/universal-principles-v53.md`

```markdown
# 5 Princípios Universais (v5.3)

5 princípios cross-cutting integrados nas skills consultivas e templates.
Não dependem do perfil arquitetural — sempre aplicam quando a skill é invocada.

| # | Nome | Onde aplica | Tipo |
|---|------|-------------|------|
| 1 | Context-First / 10 Questions Test | `consultant`, `grill-me` | Prompt instruction |
| 5 | Comment Provenance | `prd-template.md`, `fase-template.md` | Template instruction |
| 7 | Declarative-first specs | `prd-template.md` (seção "Solução") | Template structure |
| 9 | Fresh-context review | `verify-work` (fase final) | Subagent spawn |
| 10 | YAGNI checklist | `consultant` (pós-análise) | Prompt checklist |

## Princípios adiados (Onda 2+)

- #3 — Token Tax audit: depende de baseline da telemetria (Plano 03 + Plano 05)
- #8 — Comprehension Debt tracking: precisa design dedicado
```

---

## Gotchas

- **G10 do plano:** Comment Provenance (#5) aplica em TEMPLATES, não em runtime do plugin. Helpers TS do plugin já têm JSDoc — não duplicar com comentários de provenance.
- **#9 (Fresh-context):** literal "spawn de subagente sem histórico" — usar Task tool nativo do Claude Code, NÃO um sub-skill ad hoc. Subagente recebe APENAS PRD + PLAN + diff. Confundir com `verify-work` rodando no mesmo contexto perde o ganho do princípio.
- **#1 (10 Questions):** lista canônica de 10 perguntas. Não inventar mais nem reduzir. O número 10 é parte do nome do princípio.
- **#10 (YAGNI):** o checklist roda no fim, não no início. Início é #1; fim é #10. Ordem importa para o consultor não dispensar o exercício de YAGNI antes de gerar a recomendação.
- **#7 (Declarative-first):** reordenar a seção "Solução" do PRD. Mudança visível em qualquer PRD novo. Cobertura por teste textual: PRD gerado deve ter "Outcomes" antes de "Mecanismo".
- **Local:** mudanças no template afetam TODOS os PRDs futuros. Comunicar via release notes (Plano 05 fase-06).
- **Local:** Fase-06 NÃO toca em runtime de modo dual — apenas integra os universais. Pode rodar em paralelo com retoque final das fases 02-05 se necessário, mas serial é mais seguro.

---

## Verificacao

### TDD

- [ ] **RED:** Testes textuais escritos antes da modificação:
  - Template `prd-template.md` deve ter seção "Outcomes" antes de "Mecanismo" (#7)
  - Template `prd-template.md` deve ter comentário HTML mencionando "Comment Provenance" (#5)
  - `consultant/SKILL.md` deve ter os literais "10 Questions Test" e "YAGNI checklist"
  - `verify-work/SKILL.md` deve ter literal "Fresh-context Review"
  - `docs/universal-principles-v53.md` deve existir e listar os 5 princípios
  - Comando: `bun run test -- --grep 'universal-principles|prd-template|fase-template|consultant integration|verify-work fresh-context'`
  - Resultado esperado: 6+ assertion failures por strings ausentes.

- [ ] **GREEN:** Templates e SKILLs atualizadas. Todos os testes textuais passam.
  - Comando: idem
  - Resultado esperado: `6+ passed, 0 failed`.

### Checklist

- [ ] `consultant/SKILL.md` contém o literal "10 Questions Test" (#1)
- [ ] `consultant/SKILL.md` contém o literal "YAGNI checklist" (#10)
- [ ] `grill-me/SKILL.md` referencia o 10 Questions Test (#1)
- [ ] `prd-template.md` tem seção "Outcomes" antes de "Mecanismo" (#7)
- [ ] `prd-template.md` tem comentário HTML mencionando "Comment Provenance" (#5)
- [ ] `fase-template.md` tem comentário mencionando "Comment Provenance" + 1 exemplo de comentário com linhagem (#5)
- [ ] `verify-work/SKILL.md` tem fase final "Fresh-context Review" com spawn de subagente (#9)
- [ ] `docs/universal-principles-v53.md` existe e lista os 5 princípios com pointers
- [ ] Lint limpo (markdownlint nos templates): `bun run lint`
- [ ] PRDs novos gerados pela skill atualizada têm "Outcomes" antes de "Mecanismo" (smoke E2E manual)

---

## Criterio de Aceite

**Por maquina:**
- `grep -l "10 Questions Test" anti-vibe-coding/skills/consultant/SKILL.md` retorna 1 match
- `grep -l "YAGNI checklist" anti-vibe-coding/skills/consultant/SKILL.md` retorna 1 match
- `grep -l "Outcomes" anti-vibe-coding/skills/write-prd/templates/prd-template.md` retorna 1 match (e está ANTES de "Mecanismo" via offset textual)
- `grep -l "Comment Provenance" anti-vibe-coding/skills/write-prd/templates/prd-template.md` retorna 1 match
- `grep -l "Comment Provenance" anti-vibe-coding/skills/plan-feature/templates/fase-template.md` retorna 1 match
- `grep -l "Fresh-context Review" anti-vibe-coding/skills/verify-work/SKILL.md` retorna 1 match
- `ls anti-vibe-coding/docs/universal-principles-v53.md` retorna o arquivo

**Por humano:**
- Dev novo lê `docs/universal-principles-v53.md` e em 1 minuto sabe onde cada princípio está integrado e como invocá-lo.

---

<!-- Gerado por /plan-feature em 2026-05-04 -->

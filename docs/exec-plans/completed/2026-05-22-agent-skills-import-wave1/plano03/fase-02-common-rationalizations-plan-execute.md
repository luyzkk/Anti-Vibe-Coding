# Fase 02 — Common Rationalizations + Red Flags em plan-feature e execute-plan

## Objetivo

Adicionar as seções `## Common Rationalizations` e `## Red Flags` em `skills/plan-feature/SKILL.md` e `skills/execute-plan/SKILL.md`.

## Arquivos Afetados

- `skills/plan-feature/SKILL.md`
- `skills/execute-plan/SKILL.md`

## Processo

### Pré-condição

Verificar que as seções ainda não existem antes de editar:

```bash
grep "## Common Rationalizations\|## Red Flags" skills/plan-feature/SKILL.md
grep "## Common Rationalizations\|## Red Flags" skills/execute-plan/SKILL.md
```

Se já existirem em algum arquivo, registrar no MEMORY.md e pular.

Reler cada arquivo completo antes de editar.

### plan-feature — conteúdo a adicionar

Inserir APÓS a última seção existente:

```markdown
## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Vou planejar enquanto codifico" | Planejamento e implementação misturados geram escopo crescente invisível. Quando perceber o desvio, já há código que resiste à mudança. |
| "O plano está na minha cabeça" | Plano não escrito não é plano — é intenção. Intenção não passa por revisão nem por sub-agente. |
| "Essa feature é simples, não precisa de PRD" | Features "simples" sem spec são as maiores fontes de retrabalho. A simplificação é visível antes de começar, não depois. |
| "Vou ajustar as fases durante a execução" | Ajustes durante execução não documentados geram desvios invisíveis. Correto é pausar, corrigir o plano, então prosseguir. |

## Red Flags

- Task sem critério explícito de verificação (como saber que está pronta?)
- Fase com descrição "criar tudo de uma vez" ou "implementar o módulo completo"
- Estimativa de sizing ausente ou apenas "grande/médio/pequeno" sem justificativa
- Dependência entre fases não declarada explicitamente
- Plano sem seção de rollback ou exit criteria
- Feature com >3 etapas sem diagrama de fluxo ou sequência de estados
```

### execute-plan — conteúdo a adicionar

Inserir APÓS a última seção existente:

```markdown
## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "O plano estava errado, vou improvisar" | Improviso durante execução gera desvios não documentados. Correto: pausar, atualizar o plano com a decisão, então prosseguir. O plano é o registro de decisão — improvisação apaga rastro. |
| "Esse arquivo extra não conta como desvio de escopo" | Todo arquivo fora do escopo declarado é uma decisão não registrada. Se vale tocar, vale registrar no plano. |
| "Vou passar pela fase sem validar — sei que funcionou" | Verificação sem evidência não é verificação. Checklist não executado é teatro de qualidade. |
| "Posso pular a fase de testes — os tipos já garantem" | Types não testam comportamento em runtime. Fases de teste existem precisamente porque o compilador não consegue garantir tudo. |

## Red Flags

- Sub-agente que toca mais de 5 arquivos não relacionados sem justificativa no plano
- Fase concluída sem checklist de verificação preenchido
- PR que mistura mudanças de 2+ planos distintos
- Decisão tomada durante execução que não foi registrada no MEMORY.md do plano
- Step executado sem ter lido o arquivo antes de editar (violação de integridade de edição)
- Fase marcada como concluída antes de `bun run harness:validate` verde
```

### Passo final — validar

```bash
bun run harness:validate
```

## Sizing

~1h

## Gotchas

- `execute-plan` pode ser um arquivo longo — reler antes de editar, identificar a última seção existente
- Não copiar conteúdo entre as duas skills — domínios distintos, racionalizações distintas
- MEMORY.md deve ser atualizado se houver qualquer decisão não prevista nesta fase

## Checklist de Conclusão

- [ ] `skills/plan-feature/SKILL.md` contém `## Common Rationalizations` com ≥4 linhas de tabela
- [ ] `skills/plan-feature/SKILL.md` contém `## Red Flags` com ≥5 itens
- [ ] `skills/execute-plan/SKILL.md` contém `## Common Rationalizations` com ≥4 linhas de tabela
- [ ] `skills/execute-plan/SKILL.md` contém `## Red Flags` com ≥5 itens
- [ ] Conteúdo de plan-feature e execute-plan é distinto (domínios diferentes)
- [ ] `bun run harness:validate` verde

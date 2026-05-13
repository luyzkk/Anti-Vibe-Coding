# Fase 01 — Novo item de auditoria: Nomes Grepáveis

**Arquivo:** `f:\Projetos\Claude code\anti-vibe-coding\skills\anti-vibe-review\SKILL.md`  
**Sizing:** ~0.5h  
**Decisao PRD:** D13

## Contexto

O checklist do `anti-vibe-review` cobre type-safety, arquitetura, error handling, segurança, performance e React. Falta auditoria de nomes — se um nome é tão genérico que grep retorna dezenas de hits não relacionados, é impossível refatorar com segurança.

O Plano 01 fase-02 adiciona um hook pré-commit que bloqueia nomes genéricos detectando padrões no diff. Esta fase adiciona a contraparte humana: um checklist item no audit manual que o auditor executa via grep real.

D13 define duas camadas complementares:
- Hook automático (Plano 01): detecção via regex no diff
- Checklist manual (esta fase): verificação via grep real no src/

## Onde Inserir

O novo item entra na **seção "2. Padroes de Codigo"** do checklist, após o item de nomes concretos e descritivos existente:

```
- [ ] Nomes concretos e descritivos (sem `data`, `item`, `list`)?
```

O novo item vem logo abaixo, como sub-verificação prática do mesmo princípio.

## Diff Exato

**old_string** (linha 61-62 do SKILL.md atual):
```
- [ ] Nomes concretos e descritivos (sem `data`, `item`, `list`)?
- [ ] Sem magic strings ou magic numbers (usar constantes nomeadas)?
```

**new_string:**
```
- [ ] Nomes concretos e descritivos (sem `data`, `item`, `list`)?
- [ ] Nomes grepáveis — rode `grep <nome> src/` e verifique se retorna <5 hits não relacionados. Se >10 hits, o nome é genérico demais e dificulta refatoração segura.
- [ ] Sem magic strings ou magic numbers (usar constantes nomeadas)?
```

## Checklist de Execucao

- [ ] Leu o arquivo `skills/anti-vibe-review/SKILL.md` antes de editar
- [ ] Localizou a seção "2. Padroes de Codigo" no checklist
- [ ] Encontrou o item "Nomes concretos e descritivos" como âncora
- [ ] Aplicou o diff usando old_string/new_string exatos acima
- [ ] Releu o arquivo após edição para confirmar inserção correta
- [ ] Verificou que o item novo está entre "Nomes concretos" e "Sem magic strings" (ordem preservada)
- [ ] Commit no repositório `anti-vibe-coding/` com mensagem: `feat(anti-vibe-review): add grepping-names audit checklist item (D13)`

## Verificacao

Após editar, o bloco da seção 2 deve conter exatamente (na ordem):

```
- [ ] Type-safety: sem `any`, sem `as` desnecessario?
- [ ] Named exports (sem default exports desnecessarios)?
- [ ] Early return em vez de if-else aninhado?
- [ ] Nomes concretos e descritivos (sem `data`, `item`, `list`)?
- [ ] Nomes grepáveis — rode `grep <nome> src/` e verifique se retorna <5 hits não relacionados. Se >10 hits, o nome é genérico demais e dificulta refatoração segura.
- [ ] Sem magic strings ou magic numbers (usar constantes nomeadas)?
- [ ] Sem abstracoes prematuras (helpers usados uma vez)?
- [ ] Tipos de dominio para valores criticos (Email, CPF, Money nao sao strings)?
- [ ] `const` > `let` > nunca `var`?
```

## Notas

- Não alterar nenhuma outra seção do arquivo
- O threshold ">5 hits não relacionados / >10 hits = genérico" é do D13 — não ajustar
- O item é um lembrete para o auditor executar o grep manualmente; não é lógica automatizada

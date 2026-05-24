# Fase 01 — Common Rationalizations + Red Flags em tdd-workflow e security

## Objetivo

Adicionar as seções `## Common Rationalizations` e `## Red Flags` em `skills/tdd-workflow/SKILL.md` e `skills/security/SKILL.md`.

## Arquivos Afetados

- `skills/tdd-workflow/SKILL.md`
- `skills/security/SKILL.md`

## Processo

### Pré-condição

Antes de editar qualquer arquivo:

1. Verificar que as seções ainda não existem:
   ```bash
   grep "## Common Rationalizations\|## Red Flags" skills/tdd-workflow/SKILL.md
   grep "## Common Rationalizations\|## Red Flags" skills/security/SKILL.md
   ```
   Se já existirem, registrar no MEMORY.md e pular o arquivo.

2. Reler o arquivo completo antes de editar.

### tdd-workflow — conteúdo a adicionar

Inserir APÓS a última seção existente no arquivo:

```markdown
## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Vou escrever os testes depois que o código estiver funcionando" | Testes escritos após implementação tendem a apenas confirmar o que foi feito, não o que deveria ser feito. Test-after não descobre design problems. |
| "Este código é tão simples que não precisa de teste" | Código simples hoje, complexo amanhã. O custo de escrever o teste é mínimo; o custo da regressão não é. |
| "TDD é lento, vou usar em código complexo" | TDD é mais lento no início de um arquivo, mais rápido no total do projeto. O tempo economizado em debug supera o investimento. |
| "O tipo já garante o comportamento — não preciso testar" | Types verificam estrutura; testes verificam comportamento. Um `string` pode ser um email inválido — o compilador não detecta. |

## Red Flags

- `test.skip` ou `xit` sem comentário com data e ticket vinculado
- `expect(true).toBe(true)` ou qualquer assertion que sempre passa
- Teste sem nenhuma assertion (`expect` ausente)
- 0% de cobertura em arquivo com lógica de negócio
- Teste que só roda com `--testNamePattern` específico (jamais na suite completa)
- Mock que retorna dados de produção hardcoded sem label `FIXTURE`
- Describe block vazio criado como placeholder sem `test.todo`
```

### security — conteúdo a adicionar

Inserir APÓS a última seção existente no arquivo:

```markdown
## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Estamos num ambiente interno, não precisamos de autenticação forte" | Insider threats são reais. Credenciais internas vazam para terceiros. Perímetro não é defesa suficiente. |
| "Vou adicionar HTTPS depois em produção" | Sem HTTPS em development, credenciais em texto plano viram hábito. Interceptação em redes locais é trivial. |
| "JWT é seguro por padrão" | JWT sem `expiresIn` é válido para sempre. JWT sem verificação de assinatura no server é decoração. |
| "Validação no frontend é suficiente" | Qualquer requisição pode bypashar o frontend. Server-side validation não é opcional — é a única camada confiável. |

## Red Flags

- `localStorage.setItem('token', ...)` — tokens sensíveis nunca em localStorage (XSS os expõe)
- `console.log(password)` ou qualquer log de dado sensível
- `expiresIn` ausente em payload JWT
- `response_type=token` em OAuth (implicit flow — deprecado desde RFC 9700)
- CORS configurado com wildcard `*` em endpoint autenticado
- `eval()` em qualquer contexto com input do usuário
- SQL concatenado com template string sem prepared statement
- Segredo hardcoded em arquivo não ignorado pelo .gitignore
```

### Passo final — validar

```bash
bun run harness:validate
```

## Sizing

~1h

## Gotchas

- Reler o arquivo inteiro antes de editar — não editar com base em memória
- Inserir APÓS a última seção, não no meio do conteúdo
- Conteúdo deve ser específico do domínio — não copiar entre as duas skills

## Checklist de Conclusão

- [ ] `skills/tdd-workflow/SKILL.md` contém `## Common Rationalizations` com ≥4 linhas de tabela
- [ ] `skills/tdd-workflow/SKILL.md` contém `## Red Flags` com ≥5 itens
- [ ] `skills/security/SKILL.md` contém `## Common Rationalizations` com ≥4 linhas de tabela
- [ ] `skills/security/SKILL.md` contém `## Red Flags` com ≥5 itens
- [ ] Conteúdo é específico do domínio de cada skill (não genérico/idêntico)
- [ ] `bun run harness:validate` verde

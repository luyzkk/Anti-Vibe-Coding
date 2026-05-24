# Fase 02 — References Bootstrap

## Objetivo

Adicionar 3 seed files externos em `docs/references/` e atualizar o `README.md` existente
para refletir a nova estrutura. Seeds são checklists operacionais — o que verificar, não
como fazer.

## Sizing

~1h

## Dependências

Fase-01 (nenhuma dependência técnica — pode executar em paralelo, mas executar em sequência
por convenção do plano).

## Conceito: references vs compound

| `docs/references/` | `docs/compound/` |
|---|---|
| Documentações EXTERNAS consultáveis | Lições capturadas de bugs REAIS do projeto |
| OWASP, WCAG, Core Web Vitals, docs oficiais | Aprendizados reativos pós-bug/pós-merge |
| Proativo-externo | Reativo-local |
| Checklists operacionais | Notas de causa-raiz e prevenção |

Não misturar. Seed files vão em `docs/references/`, nunca em `docs/compound/`.

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `docs/references/README.md` | ATUALIZAR — adicionar seção "Seeds disponíveis", manter links existentes |
| `docs/references/security-checklist.md` | CRIAR |
| `docs/references/accessibility-checklist.md` | CRIAR |
| `docs/references/testing-patterns.md` | CRIAR |
| `docs/references/v5-legacy/` | NÃO TOCAR |

## Referência Fonte

Antes de criar, verificar se existe:

```
Infos/agent-skills-main/references/
```

Se existir, ler o conteúdo e adaptar — copiar estrutura, melhorar para contexto do plugin.
Não adaptar para baixo: se a fonte for melhor, manter a qualidade da fonte.

## Estrutura Esperada de Cada Seed File

```markdown
---
title: "Nome do Checklist"
source_url: "https://fonte-oficial.org/..."
last_verified: "2026-05-22"
---

# Nome do Checklist

Breve descrição do que este checklist cobre e quando usar.

## Seção

- [ ] Item verificável em linguagem objetiva
- [ ] Outro item verificável
...

## Anti-patterns (quando aplicável)

| Anti-pattern | Por que evitar | Alternativa |
|---|---|---|
| ... | ... | ... |
```

Regras:
- Itens em linguagem de checklist binário `[ ]` — verificável, não tutorial
- `source_url` aponta para a fonte primária (OWASP, W3C, etc.)
- `last_verified` é a data de criação/verificação do seed
- Seções claras por categoria
- Anti-patterns como tabela quando o checklist tiver armadilhas comuns

## Conteúdo Mínimo por Seed

### `security-checklist.md` — ≥10 itens

Cobre (no mínimo):
- Autenticação e autorização
- Validação de entrada / sanitização
- Exposição de dados sensíveis
- Dependências vulneráveis
- Headers de segurança HTTP
- CORS
- Rate limiting
- Secrets em código / logs

Fonte primária: OWASP Top 10 (https://owasp.org/www-project-top-ten/)

### `accessibility-checklist.md` — ≥8 itens (WCAG 2.0 AA)

Cobre (no mínimo):
- Contraste de cor (4.5:1 texto normal, 3:1 texto grande)
- Navegação por teclado
- Atributos `alt` em imagens
- Labels em formulários
- Foco visível
- Landmarks ARIA
- Hierarquia de headings
- Skip links

Fonte primária: WCAG 2.0 AA (https://www.w3.org/WAI/WCAG21/quickref/)

### `testing-patterns.md` — ≥8 padrões

Cobre (no mínimo):
- Nomear testes com verbo descritivo (sem "should")
- Arrange-Act-Assert explícito
- Um assert por teste quando possível
- Não testar implementação, testar comportamento
- Mocks apenas na fronteira (I/O, rede, tempo)
- Fixtures reproduzíveis
- Testes de edge cases (empty, null, boundary)
- Padrões específicos Bun/TypeScript

Fonte primária: documentação Bun test (https://bun.sh/docs/cli/test)

## Gotchas

### Gotcha 1 — README.md já existe com links

`docs/references/README.md` já contém links existentes. Ação correta:

- ADICIONAR uma nova seção (ex: `## Seeds Disponíveis`) no final ou em posição lógica
- NÃO substituir o conteúdo existente
- NÃO reorganizar links existentes

Se o README estiver vazio ou mínimo, adicionar seção normalmente.

### Gotcha 2 — Seeds são checklists, não tutoriais

Errado (tutorial):
```markdown
- [ ] Para implementar autenticação, use JWT com RS256. Primeiro instale...
```

Correto (checklist operacional):
```markdown
- [ ] Tokens JWT usam algoritmo RS256 ou ES256 (não HS256 com segredo compartilhado)
```

O leitor já sabe como fazer — o checklist pergunta se foi feito.

### Gotcha 3 — v5-legacy intocado

`docs/references/v5-legacy/` não deve ser modificado, renomeado, movido ou deletado.
Verificar antes de fazer qualquer `git add` que nenhum arquivo desse diretório foi alterado.

## Checklist de Verificação

- [ ] `docs/references/security-checklist.md` existe com ≥10 itens de checklist `[ ]`
- [ ] `docs/references/accessibility-checklist.md` existe com ≥8 itens (WCAG 2.0 AA)
- [ ] `docs/references/testing-patterns.md` existe com ≥8 itens/padrões
- [ ] Todos os 3 seeds têm frontmatter YAML com `title`, `source_url`, `last_verified`
- [ ] `docs/references/README.md` atualizado com referência/link para os 3 seeds
- [ ] Conteúdo existente do README preservado (não deletado)
- [ ] `docs/references/v5-legacy/` intocado — verificar com `git status docs/references/v5-legacy/`
- [ ] `bun run harness:validate` verde

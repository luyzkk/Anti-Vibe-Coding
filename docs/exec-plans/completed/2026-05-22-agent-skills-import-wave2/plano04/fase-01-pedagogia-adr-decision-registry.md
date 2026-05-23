<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
Exemplo: `// 2026-05-23 (Luiz/dev): bloco pedagogico inserido antes de "## Comandos" — DT-4 / CA-08`
NAO aplicar em codigo de runtime do plugin (helpers TS ja tem JSDoc, suficiente).
-->

# Fase 01: Adicionar pedagogia "When to Write an ADR" em decision-registry/SKILL.md

**Plano:** 04 — Pedagogia ADR + Validacao Final (Wave 2)
**Sizing:** 1h
**Depende de:** Plano 02 fase-04 (13 agentes finalizados, contract v2.0.0 uniforme) AND Plano 03 fase-04 (3 skills + manifest base)
**Visual:** false

---

## O que esta fase entrega

Secao `## When to Write an ADR` inserida em `skills/decision-registry/SKILL.md` **ANTES** do CRUD existente (linha ~66, antes de `## Comandos`), com 4 sub-secoes em ordem:
1. Tabela "Quando ADR e obrigatorio" (>=6 linhas: framework choice, data model, auth strategy, API architecture, build/host/infra, decisoes expensive to reverse)
2. Lifecycle `PROPOSED -> ACCEPTED -> (SUPERSEDED ou DEPRECATED)` com regra "Don't delete old ADRs"
3. Tabela "Common Rationalizations" (>=5 linhas, copy-then-improve do fonte em `Infos/agent-skills-main/skills/documentation-and-adrs/SKILL.md`)
4. "Red Flags" (>=4 bullets)

O CRUD existente (`## Comandos`, `### add`, `### list`, `### query`, `## Formato de Registro`, `## Fluxo de Trabalho`, `## Fluxo (v6)`, `## Completion Signal`, `## Acao solicitada`) permanece INALTERADO. R-06 do PRD reforcado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/decision-registry/SKILL.md` | Modify | Adicionar secao `## When to Write an ADR` antes da secao `## Comandos` (linha ~66 atual). Edit cirurgico — nunca rewrite |

---

## Implementacao

### Passo 1: Identificar a ancora exata para o Edit cirurgico

```bash
# 2026-05-23 (Luiz/dev): localizar onde o CRUD comeca para inserir pedagogia ANTES
grep -n "^## Comandos" skills/decision-registry/SKILL.md
# Esperado: 66:## Comandos (ou linha proxima — confirmar)

grep -n "^# Registro de Decisoes Arquiteturais" skills/decision-registry/SKILL.md
# Esperado: 61:# Registro de Decisoes Arquiteturais — Anti-Vibe Coding
```

**Estado atual conhecido (lido em planejamento):**
- Linha 61: `# Registro de Decisoes Arquiteturais — Anti-Vibe Coding` (H1 do corpo)
- Linha 63: `Gerenciar o registro de decisoes do projeto, mantendo consistencia entre sessoes.`
- Linha 65: linha em branco
- Linha 66: `## Comandos` (inicio do CRUD)

**Decisao:** ancora do `old_string` no Edit sera o bloco entre a linha 63 (subtitulo do H1) e linha 66 (`## Comandos`). Isso garante unicidade — `## Comandos` aparece apenas uma vez no arquivo, mas usar contexto extra evita falha silenciosa do Edit (G1 do README + Edits seguras do CLAUDE.md global).

### Passo 2: Ler fonte e fazer copy-then-improve

Le `Infos/agent-skills-main/skills/documentation-and-adrs/SKILL.md` secoes:
- "When to Write an ADR" (linhas ~27-34)
- "ADR Lifecycle" (linhas ~83-90)
- "Common Rationalizations" (linhas ~249-258)
- "Red Flags" (linhas ~259-267)

**Regras de adaptacao (feedback `copy-then-improve` do MEMORY global):**
- Traduzir para PT-BR sem acentos onde apropriado (consistente com o resto da skill que ja e PT-BR)
- Manter termos tecnicos canonicos em ingles: `PROPOSED`, `ACCEPTED`, `SUPERSEDED`, `DEPRECATED` (alinha com industria + frontmatter existente em ADRs do projeto)
- Manter referencia a `superseded_by` no frontmatter (ja usado pelo projeto — ver ADRs em `docs/design-docs/`)
- NAO copiar a secao "ADR Template" do fonte — o projeto ja tem template tecnico em `adr-writer.ts` (R-06 do PRD: pedagogia ensina quando; CRUD continua autoridade do como)
- NAO copiar "Inline Documentation", "API Documentation", "README Structure", "Changelog Maintenance", "Documentation for Agents" do fonte — fora do escopo (essas secoes pertencem a uma skill `documentation-and-adrs` mais ampla, nao a `decision-registry`)

### Passo 3: Inserir o bloco markdown via Edit cirurgico

Bloco a inserir (literal, manter formatacao exata — incluindo linhas em branco entre sub-secoes):

```markdown
## When to Write an ADR

> Adicionado na Wave 2 (2026-05-22) — pedagogia ANTES do CRUD para ensinar QUANDO escrever ADR antes de oferecer COMO escrever.

ADRs capturam o raciocinio por tras de decisoes tecnicas significativas. Escreva ADR quando:

| Gatilho | Exemplo |
|---|---|
| Escolha de framework, biblioteca ou major dependency | Next.js vs Remix, Prisma vs Drizzle |
| Design de modelo de dados ou schema | Relacionamento N:N, particionamento, RLS strategy |
| Estrategia de autenticacao | Cookie + session vs JWT vs OAuth provider |
| Arquitetura de API | REST vs GraphQL vs tRPC vs RPC |
| Build tool, hosting, infraestrutura | Vercel vs Cloudflare, Supabase vs RDS |
| Qualquer decisao expensive to reverse | Trocar banco em prod, migrar de monolito para servicos |

### Lifecycle de um ADR

```
PROPOSED -> ACCEPTED -> (SUPERSEDED por ADR-NNNN) ou DEPRECATED
```

- **Don't delete old ADRs.** Eles preservam o raciocinio historico — futuras geracoes (humanos e agentes) precisam entender PORQUE algo foi decidido para nao re-decidir o mesmo.
- Quando uma decisao mudar, escreva um NOVO ADR que referencia e supersede o antigo (campo `superseded_by` no frontmatter).
- Status `DEPRECATED` significa "nao se aplica mais" sem substituto direto.

### Common Rationalizations

| Racionalizacao | Realidade |
|---|---|
| "O codigo se auto-documenta" | Codigo mostra o QUE. Nao mostra o PORQUE, nem quais alternativas foram rejeitadas, nem que restricoes se aplicam. |
| "Vamos escrever ADR quando a API estabilizar" | APIs estabilizam mais rapido quando documentadas. O ADR e o primeiro teste do design. |
| "Ninguem le ADRs" | Agentes leem. Engenheiros futuros leem. Seu eu daqui-a-3-meses le. |
| "ADRs sao overhead" | Um ADR de 10 minutos previne 2 horas de debate sobre a mesma decisao 6 meses depois. |
| "Vou lembrar por que tomei essa decisao" | Nao vai. Decisoes sem registro viram folclore — versao oral, distorcida a cada repasse. |

### Red Flags

- Decisao arquitetural sem ADR escrito.
- ADR sem secao "Alternatives Considered" — virou monologo, nao analise.
- ADR sem secao "Consequences" — incapaz de avaliar trade-off depois.
- Decisao mudada SEM superseder o ADR antigo — historico corrompido.
- `DEPRECATED` sem motivo registrado.

---
```

**Operacao via Edit:**

- `old_string` (3 linhas para garantir unicidade — pega o final do H1 + linha em branco + `## Comandos`):

  ```
  Gerenciar o registro de decisoes do projeto, mantendo consistencia entre sessoes.

  ## Comandos
  ```

- `new_string`: o mesmo conteudo de `old_string` MAIS o bloco pedagogico inteiro inserido ENTRE a linha do H1-subtitulo e `## Comandos`. Estrutura:

  ```
  Gerenciar o registro de decisoes do projeto, mantendo consistencia entre sessoes.

  ## When to Write an ADR

  > Adicionado na Wave 2 (2026-05-22) — pedagogia ANTES do CRUD para ensinar QUANDO escrever ADR antes de oferecer COMO escrever.

  ADRs capturam o raciocinio por tras de decisoes tecnicas significativas. Escreva ADR quando:

  | Gatilho | Exemplo |
  |---|---|
  | Escolha de framework, biblioteca ou major dependency | Next.js vs Remix, Prisma vs Drizzle |
  | Design de modelo de dados ou schema | Relacionamento N:N, particionamento, RLS strategy |
  | Estrategia de autenticacao | Cookie + session vs JWT vs OAuth provider |
  | Arquitetura de API | REST vs GraphQL vs tRPC vs RPC |
  | Build tool, hosting, infraestrutura | Vercel vs Cloudflare, Supabase vs RDS |
  | Qualquer decisao expensive to reverse | Trocar banco em prod, migrar de monolito para servicos |

  ### Lifecycle de um ADR

  ```
  PROPOSED -> ACCEPTED -> (SUPERSEDED por ADR-NNNN) ou DEPRECATED
  ```

  - **Don't delete old ADRs.** Eles preservam o raciocinio historico — futuras geracoes (humanos e agentes) precisam entender PORQUE algo foi decidido para nao re-decidir o mesmo.
  - Quando uma decisao mudar, escreva um NOVO ADR que referencia e supersede o antigo (campo `superseded_by` no frontmatter).
  - Status `DEPRECATED` significa "nao se aplica mais" sem substituto direto.

  ### Common Rationalizations

  | Racionalizacao | Realidade |
  |---|---|
  | "O codigo se auto-documenta" | Codigo mostra o QUE. Nao mostra o PORQUE, nem quais alternativas foram rejeitadas, nem que restricoes se aplicam. |
  | "Vamos escrever ADR quando a API estabilizar" | APIs estabilizam mais rapido quando documentadas. O ADR e o primeiro teste do design. |
  | "Ninguem le ADRs" | Agentes leem. Engenheiros futuros leem. Seu eu daqui-a-3-meses le. |
  | "ADRs sao overhead" | Um ADR de 10 minutos previne 2 horas de debate sobre a mesma decisao 6 meses depois. |
  | "Vou lembrar por que tomei essa decisao" | Nao vai. Decisoes sem registro viram folclore — versao oral, distorcida a cada repasse. |

  ### Red Flags

  - Decisao arquitetural sem ADR escrito.
  - ADR sem secao "Alternatives Considered" — virou monologo, nao analise.
  - ADR sem secao "Consequences" — incapaz de avaliar trade-off depois.
  - Decisao mudada SEM superseder o ADR antigo — historico corrompido.
  - `DEPRECATED` sem motivo registrado.

  ---

  ## Comandos
  ```

**Observacao sobre fence aninhado:** o bloco de lifecycle usa ` ``` ` triplo. Markdown aninhado funciona porque o code fence interno fica DENTRO do nivel `##` que o parser ja conhece. Se o harness:validate reclamar, alternativa: trocar `\`\`\`` por indentacao de 4 espacos (codeblock indentado).

### Passo 4: Verificar que CRUD existente permanece intocado

```bash
# 2026-05-23 (Luiz/dev): garantia de adicao-only — CRUD continua autoridade tecnica
grep -n "^## Comandos$" skills/decision-registry/SKILL.md
# Esperado: 1 ocorrencia, agora em linha posterior (~130+)

grep -n "^### add" skills/decision-registry/SKILL.md
grep -n "^### list" skills/decision-registry/SKILL.md
grep -n "^### query" skills/decision-registry/SKILL.md
# Esperado: cada um retorna 1 ocorrencia
```

Se qualquer um dos 4 greps retornar 0, a edicao foi alem do escopo — restaurar via `git checkout -- skills/decision-registry/SKILL.md` e refazer.

### Passo 5: Rodar harness:validate

```bash
# 2026-05-23 (Luiz/dev): gate canonico — skill continua valida apos a edicao
bun run harness:validate
```

Se falhar com algo como "code fence imbalanced" ou similar, recorrer a alternativa do Passo 3 (codeblock indentado em vez de fence triplo aninhado).

---

## Gotchas

- **G1 do plano (pedagogia precede CRUD, NAO substitui — DT-4):** mesmo principio reforcado no README. A unica modificacao permitida nesta fase e ADICAO de bloco novo. NUNCA editar o CRUD existente para "harmonizar" — perda de autoridade tecnica.

- **Local — ancora unica para o Edit:** `## Comandos` aparece em texto LITERAL no arquivo apenas uma vez (linha 66), mas o Edit tool falha silenciosamente se houver ambiguidade de whitespace. Usar `old_string` de 3 linhas (subtitulo do H1 + linha em branco + `## Comandos`) garante unicidade absoluta. Se mesmo assim falhar, ler o arquivo de novo (G1 do CLAUDE.md global — releer antes de editar) e ajustar.

- **Local — PT-BR sem quebrar termos canonicos:** Status `PROPOSED`/`ACCEPTED`/`SUPERSEDED`/`DEPRECATED` ficam em ingles. ADRs do projeto ja usam esses literais (ver `docs/design-docs/ADR-*.md`). Traduzir destruiria interoperabilidade com tooling existente.

- **Local — fence aninhado em markdown:** o bloco de lifecycle usa ` ``` ` triplo dentro de uma secao `##`. Se o parser do harness:validate considerar isso ambiguo (raro, mas possivel), trocar por indentacao de 4 espacos. Documentar em MEMORY como DI se necessario.

- **Local — escopo de copy-then-improve:** NAO copiar secoes do fonte que pertencem a outra skill (Inline Documentation, API Documentation, README Structure, Changelog, Documentation for Agents). Essas pertencem a uma futura `documentation-and-adrs` ampliada (decisao Wave 3+ se relevante). Aqui, apenas pedagogia ADR.

---

## Verificacao

### TDD (gates declarativos)

- [ ] **RED:** antes do Passo 3, `grep -c "## When to Write an ADR" skills/decision-registry/SKILL.md` retorna `0`
- [ ] **GREEN apos Passo 3:** mesmo comando retorna `1`
- [ ] **REFACTOR:** validar literal das tabelas:
  - `grep -c "^| Racionalizacao" skills/decision-registry/SKILL.md` retorna `1` (cabecalho da tabela)
  - Contar linhas da tabela Common Rationalizations: `awk '/^### Common Rationalizations/,/^### Red Flags/' skills/decision-registry/SKILL.md | grep -c "^|"` deve retornar `>=7` (cabecalho + separador + >=5 linhas)
  - `grep -F "PROPOSED -> ACCEPTED" skills/decision-registry/SKILL.md` retorna >=1
  - `grep -F "Don't delete old ADRs" skills/decision-registry/SKILL.md` retorna >=1
- [ ] **VERIFY:** `bun run harness:validate` exit 0 + CRUD existente intocado (4 greps do Passo 4 confirmam)

### Checklist

- [ ] Secao `## When to Write an ADR` adicionada ANTES de `## Comandos`
- [ ] Tabela "Quando ADR e obrigatorio" com >=6 linhas de dados (mais cabecalho)
- [ ] Lifecycle `PROPOSED -> ACCEPTED -> SUPERSEDED` ou `DEPRECATED` documentado
- [ ] Regra "Don't delete old ADRs" presente literalmente
- [ ] Tabela "Common Rationalizations" com >=5 linhas de dados
- [ ] "Red Flags" presentes (>=4 bullets)
- [ ] CRUD existente intocado: `## Comandos`, `### add`, `### list`, `### query` ainda presentes (Passo 4 verifica)
- [ ] `bun run harness:validate` verde
- [ ] `bun run test` verde (rode subset relevante se demorar — sugestao: `bun test skills/decision-registry`)
- [ ] `bun run lint` verde

---

## Criterio de Aceite

**Por maquina (CA-08 do PRD):**

```bash
# 2026-05-23 (Luiz/dev): atomico — pedagogia adicionada + CRUD preservado + harness verde
grep -c "## When to Write an ADR" skills/decision-registry/SKILL.md  # esperado: 1
grep -c "^## Comandos$" skills/decision-registry/SKILL.md            # esperado: >=1 (CRUD intocado)
grep -c "PROPOSED" skills/decision-registry/SKILL.md                 # esperado: >=1
grep -c "Common Rationalizations" skills/decision-registry/SKILL.md  # esperado: >=1
grep -c "Don't delete old ADRs" skills/decision-registry/SKILL.md    # esperado: 1
bun run harness:validate                                              # esperado: exit 0
```

Todos os 6 comandos devem satisfazer os valores esperados. Qualquer divergencia bloqueia a fase-02.

**Por humano:**
- Abrir `skills/decision-registry/SKILL.md` em editor e validar visualmente que a secao nova aparece ANTES de `## Comandos`, com formatacao consistente (tabelas renderizam, fence de lifecycle renderiza).
- Confirmar que o tom PT-BR esta consistente com o resto da skill (sem acentos), mas os termos tecnicos `PROPOSED`/`ACCEPTED`/`SUPERSEDED`/`DEPRECATED` permanecem em ingles.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

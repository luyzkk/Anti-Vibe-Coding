<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): dedup auditada — alinhado com D3+D20 do CONTEXT`
-->

# Fase 01: Dedup auditada dos pares duplicados em `claude-code/knowledge/Rails/`

**Plano:** 01 — Tracer Bullet
**Sizing:** 2h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

`dedup-report.md` em `{PASTA_ATIVA}/plano01/` contendo tabela markdown por par duplicado (6 pares) com colunas `nome | mtime ladoA | mtime ladoB | diff linhas resumido | conteúdo novo vs comum | recomendação justificada`. Subagente gera o relatório; dev (Luiz) aprova linha por linha em STATE.md antes de prosseguir para fase-02. Sem deletar nada nesta fase — apenas decidir qual lado é canônico. RF5 + D3 + D20 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/plano01/dedup-report.md` | Create | Tabela markdown por par duplicado (output do subagente) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Modify | Adicionar bloco `## Dedup decisions (Plano 01 fase-01)` com aprovação linha-por-linha do dev |
| `claude-code/knowledge/Rails/**` | Read-only | Subagente apenas LÊ as 6 pastas duplicadas; deleção é deliberada e fica para Plano 03 fase-09 (hardening), nunca aqui |

---

## Implementacao

### Passo 1: Subagente lista todos os pares reais via `ls`

**Antes de gerar o relatório, subagente DEVE validar a lista de pares.** CONTEXT D3 menciona "8 pares" mas inspeção real mostra 6. Não confiar na contagem do CONTEXT — gerar lista programática (G2 do plano).

Comando de validação (subagente roda em ambiente bash do tool Bash):

```bash
# 2026-05-18 (Luiz/dev): validar pares reais antes de auditar — G2 do plano
ls "f:/Projetos/Anti-Vibe-Coding/claude-code/knowledge/Rails/" | grep -E "(copy|v2)$"
```

Resultado esperado (6 pares confirmados em PLAN.md `Assumptions` linha 37):

| Pasta original | Pasta duplicada | Sufixo |
|---|---|---|
| `rails-code-review` | `rails-code-review copy` | `copy` |
| `rails-migration-safety` | `rails-migration-safety copy` | `copy` |
| `rails-security-review` | `rails-security-review v2` | `v2` |
| `rails-stack-conventions` | `rails-stack-conventions v2` | `v2` |
| `rails-tdd-slices` | `rails-tdd-slices copy` | `copy` |
| `rails-upgrade` | `rails-upgrade copy` | `copy` |

Se a contagem real diverge, ABORTAR e atualizar README.md G2 antes de prosseguir.

### Passo 2: Subagente coleta metadados de cada par

Para cada par (X, Y), subagente roda:

```bash
# 2026-05-18 (Luiz/dev): coletar mtime + total de linhas + diff resumido para audit trail — alinhado com D20
stat -c '%y %n' "X/SKILL.md" "Y/SKILL.md" 2>/dev/null || powershell -Command "Get-Item 'X/SKILL.md','Y/SKILL.md' | Select-Object FullName, LastWriteTime"
wc -l "X/SKILL.md" "Y/SKILL.md"
diff -u "X/SKILL.md" "Y/SKILL.md" | head -50  # diff resumido (primeiras 50 linhas) — não verbose completo
```

E aplica a comparação a TODOS os arquivos relevantes da pasta (`PATTERNS.md`, `BACKENDS.md`, `REVIEW_CHECKLIST.md`, `PITFALLS.md`, etc.), não apenas `SKILL.md`. Subagente decide o set de arquivos a comparar com base no que existe em cada pasta.

### Passo 3: Subagente gera `dedup-report.md` com a tabela canônica

Formato exato (alinhado com D20 do CONTEXT):

```markdown
# Dedup Report — claude-code/knowledge/Rails/

**Gerado por:** subagente do Plano 01 fase-01
**Data:** 2026-05-18
**Decisão final:** aguardando aprovação do dev (Luiz) em STATE.md

---

## Par 1: rails-code-review vs rails-code-review copy

| Arquivo | mtime lado A (`rails-code-review`) | mtime lado B (`rails-code-review copy`) | linhas A | linhas B | diff resumido |
|---|---|---|---|---|---|
| SKILL.md | 2025-11-12 14:23 | 2025-12-03 09:15 | 240 | 256 | B adiciona seção "Strong migrations review checklist" (16 linhas novas); A sem essa seção; resto idêntico |
| PATTERNS.md | 2025-11-12 14:23 | 2025-11-12 14:23 | 180 | 180 | Idênticos (mesmo mtime, diff vazio) |
| REVIEW_CHECKLIST.md | 2025-11-12 14:23 | 2025-12-03 09:15 | 95 | 102 | B reescreve 2 bullets sobre `bin/brakeman` (linhas 41-47); A usa fraseado antigo |

**Conteúdo novo (apenas em B):** seção "Strong migrations review checklist" + reescrita de 2 bullets sobre Brakeman.
**Conteúdo comum (em A e B):** ~95% do material (PATTERNS.md inteiro; SKILL.md exceto a nova seção; REVIEW_CHECKLIST exceto os 2 bullets).
**Recomendação do subagente:** **MANTER `rails-code-review copy`, DELETAR `rails-code-review`** — `copy` é mais novo (3 semanas) e contém conteúdo aditivo sem regressão; nada em A que não esteja em B.

---

## Par 2: rails-migration-safety vs rails-migration-safety copy

[seguir mesmo formato — tabela + conteúdo novo/comum + recomendação justificada]

---

## Par 3: rails-security-review vs rails-security-review v2

[seguir mesmo formato — atenção: sufixo `v2` ao invés de `copy`, mas tratamento idêntico]

---

## Par 4: rails-stack-conventions vs rails-stack-conventions v2

[seguir mesmo formato]

---

## Par 5: rails-tdd-slices vs rails-tdd-slices copy

[seguir mesmo formato]

---

## Par 6: rails-upgrade vs rails-upgrade copy

[seguir mesmo formato]

---

## Resumo de decisões propostas

| Par | Manter | Deletar | Motivo principal |
|---|---|---|---|
| 1 | `rails-code-review copy` | `rails-code-review` | copy é mais novo e aditivo |
| 2 | [recomendação] | [recomendação] | [motivo] |
| 3 | [recomendação] | [recomendação] | [motivo] |
| 4 | [recomendação] | [recomendação] | [motivo] |
| 5 | [recomendação] | [recomendação] | [motivo] |
| 6 | [recomendação] | [recomendação] | [motivo] |

---

**Próximo passo:** dev (Luiz) aprova linha-por-linha em `STATE.md` da feature. Deleção física fica para Plano 03 fase-09 (hardening); até lá ambos os lados continuam no disco e o frontmatter `sources:` dos átomos aponta apenas para o lado canônico.

<!-- Gerado por subagente em /execute-plan Plano 01 fase-01 -->
```

### Passo 4: Dev aprova decisões em STATE.md

Após subagente entregar `dedup-report.md`, dev abre o arquivo, lê cada par, e adiciona em `STATE.md` da feature um bloco:

```markdown
## Dedup decisions (Plano 01 fase-01 — aprovado por Luiz em 2026-05-18)

| Par | Decisão | Aprovado por | Data |
|---|---|---|---|
| 1 (rails-code-review) | manter `rails-code-review copy` | Luiz | 2026-05-18 |
| 2 (rails-migration-safety) | [decisão] | Luiz | 2026-05-18 |
| 3 (rails-security-review) | [decisão] | Luiz | 2026-05-18 |
| 4 (rails-stack-conventions) | [decisão] | Luiz | 2026-05-18 |
| 5 (rails-tdd-slices) | [decisão] | Luiz | 2026-05-18 |
| 6 (rails-upgrade) | [decisão] | Luiz | 2026-05-18 |
```

Se dev DISCORDAR de qualquer recomendação do subagente, fase-01 NÃO é concluída até resolver — dev pode ajustar a decisão no STATE.md (justificando) ou pedir refinement do subagente. Sem aprovação completa, fase-02 fica bloqueada.

### Passo 5: Commit do relatório

```bash
git add docs/exec-plans/active/2026-05-18-stack-knowledge-rails/plano01/dedup-report.md
git add docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md
git commit -m "$(cat <<'EOF'
docs(plano01): dedup report Rails fontes + decisões aprovadas

Subagente auditou 6 pares duplicados em claude-code/knowledge/Rails/
(rails-code-review/copy, rails-migration-safety/copy, rails-security-review/v2,
rails-stack-conventions/v2, rails-tdd-slices/copy, rails-upgrade/copy).
Relatório em plano01/dedup-report.md; decisões finais em STATE.md.

Deleção física é Plano 03 fase-09 (hardening) — aqui apenas decidimos
qual lado é canônico para os extratores dos Planos 02/03 consumirem.

Alinhado com D3 + D20 do CONTEXT, RF5 do PRD.
EOF
)"
```

---

## Gotchas

- **G2 do plano (6 pares, não 8):** CONTEXT D3 está desatualizado. Subagente DEVE rodar `ls` e validar a lista antes de processar. Se aparecer um 7º par (alguém adicionou entre planejamento e execução), atualizar README.md G2 + esta fase + dedup-report.md proativamente.

- **G3 do plano (anti-drift como regression):** fase-01 não invoca o extrator ainda, mas o `dedup-report.md` aqui produz a fonte canônica de cada par. Se subagente do dedup recomendar errado (ex: deletar versão mais nova com conteúdo crítico), os extratores em Plano 02/03 vão consumir fonte degradada e drift cascateia. Por isso aprovação humana **linha-por-linha**, não em bloco.

- **Local — pastas com sufixo `v2` (não `copy`):** dois pares usam `v2` ao invés de `copy` (`rails-security-review v2`, `rails-stack-conventions v2`). Subagente deve tratar `v2` semanticamente igual a `copy` (lado duplicado, comparar com original sem sufixo). NÃO assumir que `v2` é sempre canônico só porque sufixo sugere "versão 2" — comparar mtime + diff e decidir caso a caso.

- **Local — espaços em nomes de pasta (Windows):** `rails-code-review copy` tem ESPAÇO no nome (não hífen, não underscore). Subagente deve quotar paths em todos os comandos bash (`"rails-code-review copy/SKILL.md"`) ou usar escape adequado. Esquecer disso quebra `wc -l` e `diff` silenciosamente.

- **Local — diff resumido, não verbose:** D20 deixa claro que relatório quer "diff de linhas resumido", não diff completo. Subagente DEVE limitar com `head -50` ou similar e descrever em prosa o que mudou. Diff completo polui o report e torna aprovação humana inviável.

---

## Verificacao

### TDD

Fase content-only — sem ciclo RED→GREEN. Usar checklist abaixo.

### Checklist

- [ ] Subagente listou os 6 pares reais via `ls` antes de gerar o relatório (output do `ls` capturado em STATE.md ou comment no commit)
- [ ] `dedup-report.md` contém **uma tabela markdown por par** (6 tabelas) com colunas obrigatórias: `Arquivo | mtime A | mtime B | linhas A | linhas B | diff resumido`
- [ ] Cada par tem seção "Conteúdo novo", "Conteúdo comum", "Recomendação do subagente" com justificativa em 1-2 frases
- [ ] Tabela "Resumo de decisões propostas" no final do report consolida as 6 recomendações
- [ ] STATE.md tem bloco `## Dedup decisions (Plano 01 fase-01 — aprovado por Luiz em YYYY-MM-DD)` com decisão linha-por-linha
- [ ] Nenhuma pasta foi deletada nesta fase (verificar `ls claude-code/knowledge/Rails/` ainda lista as 12 pastas — 6 originais + 6 duplicadas)
- [ ] Commit feito com mensagem citando D3 + D20 + RF5

---

## Criterio de Aceite

**Por maquina:**
- `dedup-report.md` existe em `plano01/`, é arquivo Markdown válido (sem erros de sintaxe de tabela)
- `ls claude-code/knowledge/Rails/ | wc -l` retorna o mesmo valor antes e depois da fase (nada deletado)
- `git log --oneline -1` mostra commit citando "dedup report Rails"

**Por humano:**
- Dev (Luiz) leu cada uma das 6 tabelas, comparou com o lado canônico real quando teve dúvida, e assinou aprovação em STATE.md
- Para cada par: recomendação do subagente faz sentido considerando mtime + conteúdo novo (não há "manter o mais antigo porque sim" sem justificativa explícita)

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->

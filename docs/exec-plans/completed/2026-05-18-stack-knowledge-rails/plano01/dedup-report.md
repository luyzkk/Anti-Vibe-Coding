# Dedup Report — claude-code/knowledge/Rails/

**Gerado por:** subagente do Plano 01 fase-01
**Data:** 2026-05-18
**Decisao final:** aguardando aprovacao do dev (Luiz) em STATE.md

---

## Validacao dos pares reais (G2)

Comando rodado: `ls "f:/Projetos/Anti-Vibe-Coding/claude-code/knowledge/Rails/" | grep -E "(copy| v2)$"`

Output capturado:
```
rails-code-review copy
rails-migration-safety copy
rails-security-review v2
rails-stack-conventions v2
rails-tdd-slices copy
rails-upgrade copy
```

Contagem: **6 pares** — confirma G2 do plano. CONTEXT D3 menciona "8 pares"; inspeção real mostra 6.

---

## Achado transversal

**Todos os 6 pares são byte-for-byte identicos em conteudo** (`diff -r` retornou exit code 0 para todos os pares, incluindo subpastas e assets). Nenhum par tem conteudo exclusivo em qualquer lado.

O unico discriminador entre os lados de cada par é o `mtime`:
- **Originais (sem sufixo):** mtime `2026-04-29 21:11:xx` (todos entre 21:11:26 e 21:11:54 — touches individuais, posterior)
- **Copias/v2:** mtime `2026-04-29 07:55:35` (identico para todos os 6 — indica um bulk copy/paste realizado mais cedo no mesmo dia)

Interpretacao: os folders sem sufixo foram editados/tocados ~13 horas DEPOIS das copias, sugerindo que as copias foram criadas primeiro e os originais sao a versao "assentada". A recomendacao para todos os 6 pares segue o mesmo criterio.

---

## Par 1: rails-code-review vs rails-code-review copy

| Arquivo | mtime lado A (`rails-code-review`) | mtime lado B (`rails-code-review copy`) | linhas A | linhas B | diff resumido |
|---|---|---|---|---|---|
| SKILL.md | 2026-04-29 21:11:32 | 2026-04-29 07:55:35 | 116 | 116 | Identicos — diff vazio (exit 0) |
| REVIEW_CHECKLIST.md | 2026-04-29 21:11:32 | 2026-04-29 07:55:35 | 95 | 95 | Identicos — diff vazio (exit 0) |
| assets/checklist.md | 2026-04-29 21:11:32 | 2026-04-29 07:55:35 | — | — | Identicos — diff -r vazio |
| assets/examples.md | 2026-04-29 21:11:32 | 2026-04-29 07:55:35 | — | — | Identicos — diff -r vazio |

**Conteudo novo (apenas em um lado):** Nenhum — conteudo 100% identico.
**Conteudo comum (em A e B):** Todo o conteudo (116 linhas SKILL.md + 95 linhas REVIEW_CHECKLIST.md + assets completos).
**Recomendacao do subagente:** **MANTER `rails-code-review` (sem sufixo), DELETAR `rails-code-review copy`** — A (sem sufixo) tem mtime posterior (~13h depois) indicando que foi o lado "trabalhado" pos-copia; o sufixo `copy` e o sinal semantico inequivoco do lado descartavel. Conteudo identico elimina qualquer risco de perda.

---

## Par 2: rails-migration-safety vs rails-migration-safety copy

| Arquivo | mtime lado A (`rails-migration-safety`) | mtime lado B (`rails-migration-safety copy`) | linhas A | linhas B | diff resumido |
|---|---|---|---|---|---|
| SKILL.md | 2026-04-29 21:11:30 | 2026-04-29 07:55:35 | 128 | 128 | Identicos — diff vazio (exit 0) |
| PATTERNS.md | 2026-04-29 21:11:30 | 2026-04-29 07:55:35 | 74 | 74 | Identicos — diff vazio (exit 0) |

**Conteudo novo (apenas em um lado):** Nenhum — conteudo 100% identico.
**Conteudo comum (em A e B):** Todo o conteudo (128 linhas SKILL.md + 74 linhas PATTERNS.md).
**Recomendacao do subagente:** **MANTER `rails-migration-safety` (sem sufixo), DELETAR `rails-migration-safety copy`** — mesma logica: A tem mtime posterior; sufixo `copy` identifica inequivocamente o lado descartavel. Zero risco de regressao — conteudo identico.

---

## Par 3: rails-security-review vs rails-security-review v2

| Arquivo | mtime lado A (`rails-security-review`) | mtime lado B (`rails-security-review v2`) | linhas A | linhas B | diff resumido |
|---|---|---|---|---|---|
| SKILL.md | 2026-04-29 21:11:26 | 2026-04-29 07:55:35 | 129 | 129 | Identicos — diff vazio (exit 0) |
| PITFALLS.md | 2026-04-29 21:11:26 | 2026-04-29 07:55:35 | 12 | 12 | Identicos — diff vazio (exit 0) |

**Conteudo novo (apenas em um lado):** Nenhum — conteudo 100% identico.
**Conteudo comum (em A e B):** Todo o conteudo (129 linhas SKILL.md + 12 linhas PITFALLS.md).
**Recomendacao do subagente:** **MANTER `rails-security-review` (sem sufixo), DELETAR `rails-security-review v2`** — apesar do sufixo `v2` sugerir "versao mais nova", o mtime contradiz: A (sem sufixo) foi tocado ~13h depois de B. Conteudo identico confirma que v2 nao acrescentou nada apos a copia. Manter o sem sufixo preserva consistencia de naming com os demais pares.

---

## Par 4: rails-stack-conventions vs rails-stack-conventions v2

| Arquivo | mtime lado A (`rails-stack-conventions`) | mtime lado B (`rails-stack-conventions v2`) | linhas A | linhas B | diff resumido |
|---|---|---|---|---|---|
| SKILL.md | 2026-04-29 21:11:54 | 2026-04-29 07:55:35 | 141 | 141 | Identicos — diff vazio (exit 0) |
| assets/snippets/*.rb, *.js, *.erb (6 arquivos) | 2026-04-29 21:11:54 | 2026-04-29 07:55:35 | — | — | Identicos — diff -r vazio |

**Conteudo novo (apenas em um lado):** Nenhum — conteudo 100% identico (SKILL.md + 6 arquivos de assets).
**Conteudo comum (em A e B):** Todo o conteudo (141 linhas SKILL.md + snippets Ruby/JS/ERB completos).
**Recomendacao do subagente:** **MANTER `rails-stack-conventions` (sem sufixo), DELETAR `rails-stack-conventions v2`** — mesmo raciocinio do Par 3: sufixo `v2` nao indica versao mais nova aqui, pois mtime de A e posterior. Conteudo 100% identico. Manter sem sufixo para consistencia.

---

## Par 5: rails-tdd-slices vs rails-tdd-slices copy

| Arquivo | mtime lado A (`rails-tdd-slices`) | mtime lado B (`rails-tdd-slices copy`) | linhas A | linhas B | diff resumido |
|---|---|---|---|---|---|
| SKILL.md | 2026-04-29 21:11:42 | 2026-04-29 07:55:35 | 133 | 133 | Identicos — diff vazio (exit 0) |

**Conteudo novo (apenas em um lado):** Nenhum — conteudo 100% identico.
**Conteudo comum (em A e B):** Todo o conteudo (133 linhas SKILL.md).
**Recomendacao do subagente:** **MANTER `rails-tdd-slices` (sem sufixo), DELETAR `rails-tdd-slices copy`** — unico arquivo no par; A tem mtime posterior; sufixo `copy` e o indicador semantico direto do descartavel. Sem risco.

---

## Par 6: rails-upgrade vs rails-upgrade copy

| Arquivo | mtime lado A (`rails-upgrade`) | mtime lado B (`rails-upgrade copy`) | linhas A | linhas B | diff resumido |
|---|---|---|---|---|---|
| SKILL.md | 2026-04-29 21:11:38 | 2026-04-29 07:55:35 | 548 | 548 | Identicos — diff vazio (exit 0) |
| CHANGELOG.md | 2026-04-29 21:11:38 | 2026-04-29 07:55:35 | 29 | 29 | Identicos — diff vazio (exit 0) |
| detection-scripts/ (9 arquivos .yml) | 2026-04-29 21:11:38 | 2026-04-29 07:55:35 | — | — | Identicos — diff -r vazio |
| examples/ (2 arquivos .md) | 2026-04-29 21:11:38 | 2026-04-29 07:55:35 | — | — | Identicos — diff -r vazio |
| references/ (6 arquivos .md) | 2026-04-29 21:11:38 | 2026-04-29 07:55:35 | — | — | Identicos — diff -r vazio |
| templates/ (2 arquivos .md) | 2026-04-29 21:11:38 | 2026-04-29 07:55:35 | — | — | Identicos — diff -r vazio |
| version-guides/ (13 arquivos .md) | 2026-04-29 21:11:38 | 2026-04-29 07:55:35 | — | — | Identicos — diff -r vazio |
| workflows/ (4 arquivos .md) | 2026-04-29 21:11:38 | 2026-04-29 07:55:35 | — | — | Identicos — diff -r vazio |

**Conteudo novo (apenas em um lado):** Nenhum — conteudo 100% identico (37 arquivos verificados via `diff -r`).
**Conteudo comum (em A e B):** Todo o conteudo — 37 arquivos identicos incluindo SKILL.md de 548 linhas, CHANGELOG.md, 9 detection scripts, 13 version guides, workflows, references e templates.
**Recomendacao do subagente:** **MANTER `rails-upgrade` (sem sufixo), DELETAR `rails-upgrade copy`** — par mais complexo (37 arquivos) mas igualmente identico. A tem mtime posterior; sufixo `copy` indica a origem descartavel. Deleção futura em Plano 03 fase-09 deve incluir a pasta inteira (`rm -rf "rails-upgrade copy"`).

---

## Resumo de decisoes propostas

| Par | Manter | Deletar | Motivo principal |
|---|---|---|---|
| 1 | `rails-code-review` | `rails-code-review copy` | Conteudo identico; sem sufixo tem mtime posterior (21:11:32 vs 07:55:35) |
| 2 | `rails-migration-safety` | `rails-migration-safety copy` | Conteudo identico; sem sufixo tem mtime posterior (21:11:30 vs 07:55:35) |
| 3 | `rails-security-review` | `rails-security-review v2` | Conteudo identico; sem sufixo tem mtime posterior apesar do sufixo v2 (21:11:26 vs 07:55:35) |
| 4 | `rails-stack-conventions` | `rails-stack-conventions v2` | Conteudo identico; sem sufixo tem mtime posterior apesar do sufixo v2 (21:11:54 vs 07:55:35) |
| 5 | `rails-tdd-slices` | `rails-tdd-slices copy` | Conteudo identico; sem sufixo tem mtime posterior (21:11:42 vs 07:55:35) |
| 6 | `rails-upgrade` | `rails-upgrade copy` | Conteudo identico (37 arquivos); sem sufixo tem mtime posterior (21:11:38 vs 07:55:35) |

---

**Proximo passo:** dev (Luiz) aprova linha-por-linha em `STATE.md` da feature. Delecao fisica fica para Plano 03 fase-09 (hardening); ate la ambos os lados continuam no disco e o frontmatter `sources:` dos atomos aponta apenas para o lado canonico (sem sufixo).

<!-- 2026-05-18 (subagente/plan-executor): gerado em /execute-plan Plano 01 fase-01 — alinhado com D3+D20 do CONTEXT, RF5 do PRD -->

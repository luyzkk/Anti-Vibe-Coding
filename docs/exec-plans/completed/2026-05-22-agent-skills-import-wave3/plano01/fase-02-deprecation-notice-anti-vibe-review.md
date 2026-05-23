# Fase 02: Deprecation Notice em anti-vibe-review/SKILL.md

**Plano:** 01 — Consolidacao /anti-vibe-review -> /verify-work
**Sizing:** 0.5h
**Depende de:** fase-01 (gap-analysis define linguagem do notice; sem isso, risco de duplicar conceito em verify-work)
**Visual:** false

---

## O que esta fase entrega

Bloco `## ⚠️ Deprecation Notice (Wave 3 — 2026-05-22)` adicionado como PRIMEIRA secao apos o titulo H1 de `skills/anti-vibe-review/SKILL.md`. Atende MH-01 e CA-01 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/anti-vibe-review/SKILL.md` | Modify | Adicionar bloco de deprecation notice logo apos `# Revisao Anti-Vibe — Auditoria Pos-Implementacao` (linha 15) |

---

## Implementacao

### Passo 1: Reler o arquivo antes de editar (integridade)

Conforme CLAUDE.md (Integridade das Edicoes): reler `skills/anti-vibe-review/SKILL.md` para confirmar estado atual antes de qualquer Edit.

Estrutura atual (linhas 1-17):
```
1: <!-- 2026-05-14 (Luiz/dev): comentario HTML -->
4: ---
5: name: anti-vibe-review
... (frontmatter completo) ...
13: ---
14: (linha em branco)
15: # Revisao Anti-Vibe — Auditoria Pos-Implementacao
16: (linha em branco)
17: Auditor de qualidade rigoroso. ...
```

### Passo 2: Inserir o bloco de deprecation notice

Usar Edit cirurgico. O bloco deve vir IMEDIATAMENTE apos a linha 15 (H1) e ANTES da descricao em linha 17.

Texto exato a inserir (entre `# Revisao Anti-Vibe...` e `Auditor de qualidade rigoroso...`):

```markdown
## ⚠️ Deprecation Notice (Wave 3 — 2026-05-22)

Esta skill foi consolidada em `/verify-work`.

**Migracao:** substitua `/anti-vibe-coding:anti-vibe-review` por `/anti-vibe-coding:verify-work` no seu workflow.

A skill permanece **funcional** durante grace period — todos os comandos, opcoes e formato de relatorio continuam operando normalmente. Nenhuma alteracao de comportamento.

**Por que migrar:** `/verify-work` executa o mesmo audit pipeline + adiciona testes/lint automatizados, debug agent, mutation testing, hallucination check e consolidacao paralela de auditores. Ver `## Diferencas com anti-vibe-review` em `/verify-work` para detalhes.

**Sem data de remocao definida** — Wave 4 reavalia delete fisico baseado em telemetria de uso. Nao ha urgencia artificial.

---
```

Edit operation a executar:

```
old_string:
# Revisao Anti-Vibe — Auditoria Pos-Implementacao

Auditor de qualidade rigoroso. Executar uma revisao completa do codigo recem-implementado seguindo os principios Anti-Vibe Coding.

new_string:
# Revisao Anti-Vibe — Auditoria Pos-Implementacao

## ⚠️ Deprecation Notice (Wave 3 — 2026-05-22)

Esta skill foi consolidada em `/verify-work`.

**Migracao:** substitua `/anti-vibe-coding:anti-vibe-review` por `/anti-vibe-coding:verify-work` no seu workflow.

A skill permanece **funcional** durante grace period — todos os comandos, opcoes e formato de relatorio continuam operando normalmente. Nenhuma alteracao de comportamento.

**Por que migrar:** `/verify-work` executa o mesmo audit pipeline + adiciona testes/lint automatizados, debug agent, mutation testing, hallucination check e consolidacao paralela de auditores. Ver `## Diferencas com anti-vibe-review` em `/verify-work` para detalhes.

**Sem data de remocao definida** — Wave 4 reavalia delete fisico baseado em telemetria de uso. Nao ha urgencia artificial.

---

Auditor de qualidade rigoroso. Executar uma revisao completa do codigo recem-implementado seguindo os principios Anti-Vibe Coding.
```

### Passo 3: Releitura pos-edicao

Conforme CLAUDE.md: reler o arquivo apos Edit para confirmar mudanca aplicada corretamente.

```bash
sed -n '15,32p' skills/anti-vibe-review/SKILL.md  # nao via Bash — usar Read tool
```

Validacao esperada (via Read tool, range 15-32):
- linha 15: `# Revisao Anti-Vibe — Auditoria Pos-Implementacao`
- linha 17: `## ⚠️ Deprecation Notice (Wave 3 — 2026-05-22)`
- linha 19: `Esta skill foi consolidada em \`/verify-work\`.`
- linha ~29: `---` (separador final do notice)
- linha ~31: `Auditor de qualidade rigoroso...`

### Passo 4: Verificacao por grep

```bash
grep -c "## ⚠️ Deprecation Notice" skills/anti-vibe-review/SKILL.md  # esperado: 1
grep -c "verify-work" skills/anti-vibe-review/SKILL.md  # esperado: >=3 (notice + Modos de Invocacao existente + Por que migrar)
grep -c "grace period" skills/anti-vibe-review/SKILL.md  # esperado: >=2 (notice menciona 2x)
```

---

## Gotchas

- **G3 do plano:** Notice vai APOS H1 (linha 15) e ANTES do paragrafo descritivo. NAO no topo absoluto do arquivo (linha 1 e comentario HTML, linha 4-13 e frontmatter — esses NAO sao tocados).
- **G7 do plano (CA-10 backward-compat):** Notice e ADICAO pura. NENHUMA outra linha do arquivo deve ser tocada — `<instructions>`, `<checklist>`, `<report-template>`, `<context>`, "Delegacao Opcional" e "Modulo a revisar" permanecem intactos.
- **Local — caractere unicode no emoji:** O caractere `⚠️` (warning sign + variation selector) e UTF-8 multi-byte. Edit tool e seguro com UTF-8, mas confirmar via Read que apareceu corretamente apos save (nao virou `?` ou bytes corrompidos).
- **Local — separador `---`:** O `---` apos o notice e separador markdown (linha horizontal), NAO frontmatter. Markdown renderers exibem como `<hr/>`. Nao deve confundir parsers que procuram frontmatter — esse esta nas linhas 4-13.

---

## Verificacao

### TDD

- [ ] **RED:** Antes da edicao, `grep -c "## ⚠️ Deprecation Notice" skills/anti-vibe-review/SKILL.md` retorna `0`
- [ ] **GREEN:** Apos a edicao, mesmo grep retorna `1`

### Checklist

- [ ] Notice aparece como PRIMEIRA secao apos H1 (validar via Read linhas 15-32)
- [ ] Notice menciona `/verify-work` explicitamente (texto literal)
- [ ] Notice menciona "grace period" e "funcional"
- [ ] Frontmatter (linhas 4-13) inalterado
- [ ] H1 (linha 15) inalterado
- [ ] Todo conteudo apos o notice (descricao + secoes originais) inalterado — `<instructions>`, `<checklist>`, `<report-template>`, `<context>`, "Delegacao Opcional", "Modulo a revisar" presentes
- [ ] `bun run harness:validate` passa (sem novos erros)

---

## Criterio de Aceite

**CA-01 do PRD:** "Dado [skills/anti-vibe-review/SKILL.md], quando aberto, entao a primeira secao apos o frontmatter e `## ⚠️ Deprecation Notice` com texto mencionando `/verify-work` e grace period."

**Por maquina:**
- `grep -n "^## ⚠️ Deprecation Notice" skills/anti-vibe-review/SKILL.md` retorna `17:## ⚠️ Deprecation Notice (Wave 3 — 2026-05-22)`
- `grep -A 10 "## ⚠️ Deprecation Notice" skills/anti-vibe-review/SKILL.md | grep -c "verify-work"` retorna ≥1
- `grep -A 10 "## ⚠️ Deprecation Notice" skills/anti-vibe-review/SKILL.md | grep -c "grace period"` retorna ≥1
- `wc -l skills/anti-vibe-review/SKILL.md` retorna 218 (203 originais + 15 do notice + separador)

**Por humano:**
- Ler o notice e confirmar que linguagem e neutra (sem urgencia artificial) e clara para um novo usuario que invoca `/anti-vibe-review` pela primeira vez.

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

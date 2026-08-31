<!--
Princípio universal #5 — Comment Provenance.
Fase interativa (dev na sessão) — outputs são assinaturas no STATE.md da feature,
remoção de flags de frontmatter e eventuais fixes aplicados na hora.
-->

# Fase 06: Audit Humano Luiz — 3 Átomos D11 (RF5, CA-08)

**Plano:** 04 — Atoms T3 + INDEX Final + Audit Humano + E2E Full
**Sizing:** ~1h de interação com o dev (agendar antes de iniciar)
**Depende de:** fase-05 (verifier ANTES do audit — o humano recebe átomos já rastreados)
**Visual:** false

---

## O que esta fase entrega

Os 3 átomos flagged (D11) revisados pelo dev contra as fontes, com fixes aplicados na hora,
assinatura `Aprovado por Luiz em YYYY-MM-DD` gravada no STATE.md da feature e flags
`flagged_for_human_audit` removidas. **BLOQUEIA a fase-07** enquanto qualquer átomo estiver
reprovado — este é o fechamento do loop R3 (verifier false-positive) que máquina nenhuma fecha.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/STATE.md` | Modify | Seção "Audit Humano (RF5/CA-08)" com as 3 assinaturas |
| `knowledge/python/atoms/security-fastapi-owasp.md` | Modify | Fixes do audit (se pedidos) + remoção da flag |
| `knowledge/python/atoms/sqlalchemy-async-and-orm.md` | Modify | Fixes do audit (se pedidos) + remoção da flag |
| `knowledge/python/atoms/debugging-pdb-debugpy.md` | Modify | Fixes do audit (se pedidos) + remoção da flag |
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/plano04/MEMORY.md` | Modify | Tabela de audit (fixes por átomo, resultado, data) |

---

## Implementacao

Esta fase é **interativa e não-delegável** (G21): o agente conduz, o dev decide. Nenhum
subagente em background; nenhuma aprovação "em nome do dev". Um átomo por vez.

### Passo 1: Preparar o material (antes de chamar o dev)

Para cada átomo, montar o pacote de revisão:

| Átomo | Origem | Fontes do frontmatter (abrir para o dev) |
|---|---|---|
| `security-fastapi-owasp` (T1) | Plano 02 fase-05 | `Infos/knowledge/Python/compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md` |
| `sqlalchemy-async-and-orm` (T2) | Plano 03 fase-03 | `Infos/knowledge/Python/deep-research-report.md` (split 1/2 — runtime ORM) |
| `debugging-pdb-debugpy` (T3) | Plano 04 fase-02 | `Infos/knowledge/Python/python-debugpy/SKILL.md` (EN, MIT) |

Anexar as "Observações para o audit humano" do `verifier-report-plano04.md` (fase-05) e, para
os dois primeiros, dos reports dos Planos 02/03 — claims borderline ganham atenção primeiro.

### Passo 2: Loop de revisão (por átomo, sequencial)

Para cada um dos 3, nesta ordem (a mesma do critério D11 — onde erro custa mais primeiro):
`security-fastapi-owasp` → `sqlalchemy-async-and-orm` → `debugging-pdb-debugpy`.

1. **Apresentar** ao dev: o átomo completo + os paths das fontes do frontmatter `sources:` +
   observações borderline do verifier. O dev lê e compara com a fonte aberta.
2. **Coletar veredito** (perguntar explicitamente, uma decisão por átomo):
   - **APROVADO** → seguir ao Passo 3 para este átomo.
   - **FIXES PEDIDOS** → aplicar NA HORA (precedente Next: 2 fixes em
     security-stack-specific antes do APPROVE): rework cirúrgico da claim apontada, contra a
     fonte. Se o fix alterar claim técnica, re-rastrear a claim afetada contra a fonte antes
     de re-apresentar. Repetir até APROVADO.
   - **REPROVADO** (defeito estrutural, não pontual) → PARAR a fase. Registrar no MEMORY o
     motivo, voltar o átomo para rework maior (novo ciclo extrator → verifier → audit).
     A fase-07 fica BLOQUEADA até os 3 estarem aprovados.
3. **Selar o átomo aprovado:**
   - Remover a linha `flagged_for_human_audit: true` do frontmatter + a nota de audit no
     corpo (logo após o título).
   - Rodar `validateAtomFrontmatter` no átomo (continua `{valid: true}` sem a flag).
4. **Registrar** na tabela de audit do `plano04/MEMORY.md` (fixes pedidos, resultado, data).

### Passo 3: Assinatura no STATE.md da feature

Adicionar ao `docs/exec-plans/active/2026-08-30-stack-knowledge-python/STATE.md` (novo bloco
antes do `## Log`):

```markdown
## Audit Humano (RF5 / CA-08 / D11)

| Átomo | Fixes antes do aprove | Assinatura |
|-------|----------------------|------------|
| security-fastapi-owasp | {N} | Aprovado por Luiz em {YYYY-MM-DD} |
| sqlalchemy-async-and-orm | {N} | Aprovado por Luiz em {YYYY-MM-DD} |
| debugging-pdb-debugpy | {N} | Aprovado por Luiz em {YYYY-MM-DD} |
```

E uma linha no `## Log` do STATE.md: `{data}: audit humano D11 concluído — 3/3 aprovados
({N} fixes aplicados)`.

### Passo 4: Verificação e commit

```
grep -rn "flagged_for_human_audit" knowledge/python/atoms/   # esperado: zero
bun test && bun run harness:validate
```

Commit (commit 3 do plano — agrupa com o verifier-report da fase-05, regra do README):
fixes de audit + flags removidas + STATE.md assinado + MEMORY + verifier-report.

```
git commit -m "docs(python-knowledge): audit humano D11 aprovado 3/3 + verifier T3 + assinaturas STATE (RF5, CA-08)"
```

---

## Gotchas

- **G21 do plano (crítico):** o valor da fase é o olhar do DEV, não o do agente. Não resumir
  o átomo "para facilitar" de um jeito que esconda claims — apresentar o arquivo real. Não
  aceitar "aprova aí por mim" como aprovação: a assinatura registra que o humano LEU.
- **Local — ordem de gates:** verifier (máquina) já passou; o audit procura o que o verifier
  NÃO pega — claim rastreável mas mal priorizada, ênfase errada, padrão perigoso no contexto
  do dev (R3: verifier false-positive "tudo OK").
- **Local — fix na hora muda o gate?** Fix cosmético (typo, fraseado): só aplicar. Fix de
  claim técnica: re-rastrear a claim contra a fonte antes do APROVADO final (não precisa
  re-rodar o batch inteiro da fase-05 — rastreio pontual da claim alterada basta).
- **Local — debugging tem dupla checagem:** além da fidelidade, o dev confirma a LIMPEZA
  Hermes (CA-10) e a redação da entrada MIT no NOTICES (fase-02 deixou a nuance do copyright
  sem ano registrada como gotcha — decisão final é daqui).
- **G8 do plano:** remover a flag NÃO quebra o validador (campo desconhecido era ignorado;
  ausência idem) — rodar mesmo assim.
- **Local — STATE.md é o registro canônico** (PRD RF5: "assinatura no STATE.md"); o MEMORY
  guarda o operacional. Não inverter.
- **Local — reprovação não é fracasso do plano:** é o gate funcionando. Registrar, reciclar o
  átomo, re-agendar o audit do átomo reciclado. A fase-07 espera.

---

## Verificacao

### TDD (adaptado — gate humano)

- [ ] **Gate:** 3/3 átomos com veredito APROVADO explícito do dev (nenhum implícito)

### Checklist

- [ ] Os 3 átomos apresentados com fonte aberta + observações do verifier
- [ ] Fixes pedidos aplicados na hora e re-apresentados (contagem no MEMORY)
- [ ] `grep -rn "flagged_for_human_audit" knowledge/python/atoms/` → zero
- [ ] Notas de audit removidas do corpo dos 3 átomos
- [ ] `validateAtomFrontmatter` verde nos 3 pós-edição
- [ ] Bloco "Audit Humano" no STATE.md da feature com as 3 assinaturas datadas
- [ ] Tabela de audit no `plano04/MEMORY.md` preenchida
- [ ] `bun test` + `bun run harness:validate` verdes; commit 3 feito

---

## Criterio de Aceite

**Por maquina:**
- `grep -c "Aprovado por Luiz" docs/exec-plans/active/2026-08-30-stack-knowledge-python/STATE.md` = 3
- `grep -rn "flagged_for_human_audit" knowledge/python/atoms/` retorna vazio

**Por humano:**
- O dev confirma em sessão que leu e comparou os 3 átomos com as fontes — a assinatura no
  STATE.md é dele, não do agente

---

<!-- Gerado por /plan-feature em 2026-08-30 -->

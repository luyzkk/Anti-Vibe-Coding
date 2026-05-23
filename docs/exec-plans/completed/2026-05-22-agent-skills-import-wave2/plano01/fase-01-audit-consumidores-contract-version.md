<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-22 (Luiz/dev): default — alinhado com PRD seção DT-2`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Audit Consumidores do Contract Version

**Plano:** 01 — Tracer Bullet Schema v2.0.0 + Gold Standard
**Sizing:** 0.5h (XS)
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Documento exaustivo `audit-consumers.md` mapeando todos os arquivos que referenciam `contract_version`, parsers de payload de agente e validadores de schema — input obrigatorio para o bump da fase-02.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `f:/Projetos/Anti-Vibe-Coding/docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/plano01/audit-consumers.md` | Create | Documento markdown com mapa de consumidores (tabela: caminho + linha + snippet + leitura/escrita + precisa-adaptar-v2) |

---

## Implementacao

### Passo 1: Grep exaustivo por `contract_version`

Rodar busca em todos os diretorios candidatos. Anotar caminho + numero da linha + snippet (3 linhas de contexto).

```bash
# Busca primaria — token literal `contract_version`
grep -rn "contract_version" \
  f:/Projetos/Anti-Vibe-Coding/lib \
  f:/Projetos/Anti-Vibe-Coding/skills \
  f:/Projetos/Anti-Vibe-Coding/agents \
  f:/Projetos/Anti-Vibe-Coding/scripts \
  f:/Projetos/Anti-Vibe-Coding/tests

# Busca complementar — valor literal "1.0" no contexto de agentes/contracts
grep -rn '"1.0"' f:/Projetos/Anti-Vibe-Coding/agents f:/Projetos/Anti-Vibe-Coding/skills

# Busca de referencias ao doc de schema
grep -rn "subagent-contract" f:/Projetos/Anti-Vibe-Coding
```

**Importante:** preferir a ferramenta Grep do harness sobre `grep` puro (truncamento + permissoes). Para esta fase, ambos sao aceitos — output e markdown.

### Passo 2: Categorizar cada match

Para cada hit, classificar:
- **Leitura (consome):** parser/validator que LE o JSON e valida shape. Quebra com bump se nao for adaptado.
- **Escrita (emite):** template/agente que EMITE o JSON com `contract_version`. Bumpa para `"2.0.0"` na fase-02/03.
- **Documentacao:** referencia textual (`.md` que cita a versao). Atualiza para `"2.0.0"` na fase-02.
- **Teste/fixture:** dado de teste. Pode precisar de ambos (fixture v1 deprecada + fixture v2 nova).

### Passo 3: Listar agentes de `agents/_contract/`

Diretorio especifico — provavelmente contem o validator canonico. Listar conteudo e identificar:

```bash
ls f:/Projetos/Anti-Vibe-Coding/agents/_contract/
ls f:/Projetos/Anti-Vibe-Coding/agents/__fixtures__/
```

Se houver `validator.ts`/`schema.ts`/`parser.ts`, anotar como caller canonico no audit.

### Passo 4: Verificar referencias indiretas

Busca por padroes que NAO usam o token `contract_version` literal mas sao parsers do payload:

```bash
# Tipos TS que modelam o contrato
grep -rn "SubagentContract\|AgentContract\|AuditPayload\|SubagentReport" \
  f:/Projetos/Anti-Vibe-Coding/lib f:/Projetos/Anti-Vibe-Coding/agents/_contract f:/Projetos/Anti-Vibe-Coding/skills

# JSON.parse + schema validation
grep -rn "JSON.parse" f:/Projetos/Anti-Vibe-Coding/agents/_contract f:/Projetos/Anti-Vibe-Coding/lib | grep -i "agent\|audit\|subagent"
```

### Passo 5: Montar o documento `audit-consumers.md`

Estrutura sugerida do arquivo:

```markdown
# Audit: Consumidores de `contract_version` — Wave 2 Plano 01

**Gerado em:** 2026-05-22
**Schema atual:** "1.0" — sera bumpado para "2.0.0" na fase-02

## Resumo executivo

- Total de matches: N
- Emissores (escrita): X arquivos
- Consumidores (leitura/parser): Y arquivos
- Documentacao: Z arquivos
- Testes/fixtures: W arquivos
- Bump status: { "safe" se Y == 0; "needs-migration" se Y > 0 }

## Tabela de matches

| # | Caminho | Linha | Tipo | Snippet | Acao na fase-02/03 |
|---|---------|-------|------|---------|---------------------|
| 1 | agents/security-auditor.md | 99 | Escrita | `"contract_version": "1.0"` | Bumpar para "2.0.0" (fase-03) |
| 2 | agents/security-auditor.md | 125 | Doc | `` `contract_version` sempre `"1.0"`.`` | Atualizar texto (fase-03) |
| 3 | ... | ... | ... | ... | ... |

## Callers descobertos em `agents/_contract/`

{listar arquivos e o que cada um faz}

## Decisao de migracao

- [ ] Bump e SAFE (zero parsers afetados): seguir direto para fase-02
- [ ] Bump precisa MIGRACAO: listar parsers a ajustar na fase-03 (preencher coluna "Acao")

## Notas para fase-02

{Qualquer descoberta inesperada que mude o sizing — ex: parser em script CI que ninguem lembrava}
```

---

## Gotchas

- **G2 do plano:** `agents/_contract/` existe (confirmado por `ls agents/`). Confirmar se contem validator canonico ou apenas fixtures.
- **G3 do plano:** `agents/security-auditor.md` tem MULTIPLAS referencias a `"1.0"` (linhas 99 e 125). Buscar por valor literal nao basta — buscar tambem por descricao textual (`sempre "1.0"`, `contract version 1`, etc).
- **Local:** Grep do Anti-Vibe pode retornar matches em `docs/exec-plans/completed/` ou em PRDs antigos — anotar mas marcar como "historico" (nao precisa migrar).
- **Local:** Se a busca retornar > 50 matches, suspeitar de truncamento (regra global de contexto). Re-rodar com escopo mais estreito por diretorio.

---

## Verificacao

### TDD

Esta fase NAO tem ciclo RED/GREEN de codigo — o entregavel e um documento. A verificacao e por gates de existencia + completude.

### Checklist

- [ ] Arquivo `f:/Projetos/Anti-Vibe-Coding/docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/plano01/audit-consumers.md` existe
- [ ] Pelo menos 1 caller identificado (sabemos que `agents/security-auditor.md:99` emite — minimo aceito)
- [ ] Coluna "Acao na fase-02/03" preenchida para 100% dos matches
- [ ] Decisao de migracao escolhida ("safe" ou "needs-migration")
- [ ] Contagem de matches por categoria (escrita/leitura/doc/teste) presente no resumo executivo
- [ ] `agents/_contract/` inspecionado e seu conteudo listado no documento
- [ ] Notas para fase-02 preenchidas (mesmo que `"sem descobertas inesperadas"`)

---

## Criterio de Aceite

**Por maquina:**
- `test -f f:/Projetos/Anti-Vibe-Coding/docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/plano01/audit-consumers.md && echo OK`
- `grep -c "agents/security-auditor.md" audit-consumers.md` retorna >= 1 (minimo de 1 match conhecido documentado)
- `grep -c "| " audit-consumers.md` retorna >= 5 (tabela com pelo menos 5 linhas — 1 header + 4 dados)

**Por humano:**
- Decisao de migracao registrada (safe vs needs-migration) com justificativa de 1 linha

---

<!-- Gerado por /plan-feature em 2026-05-22 -->

# Fase 01: Gap Analysis anti-vibe-review vs verify-work

**Plano:** 01 — Consolidacao /anti-vibe-review -> /verify-work
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Documento `gap-analysis.md` (dentro de `plano01/`) mapeando explicitamente: secoes/conceitos presentes APENAS em `anti-vibe-review`, presentes APENAS em `verify-work`, e duplicados. Define o delta exato a absorver na fase-03.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/plano01/gap-analysis.md` | Create | Mapa explicito de delta entre as duas skills |

**Nao toca:** `skills/anti-vibe-review/SKILL.md` nem `skills/verify-work/SKILL.md` — esta fase e analise pura.

---

## Implementacao

### Passo 1: Ler ambos os SKILL.md na integra

Ler:
- `skills/anti-vibe-review/SKILL.md` (203 linhas)
- `skills/verify-work/SKILL.md` (583 linhas)

Extrair todas as secoes H2 (`## ...`) de cada arquivo e classificar por conceito coberto.

Secoes conhecidas (validar com grep):

```bash
grep -n "^## " skills/anti-vibe-review/SKILL.md
grep -n "^## " skills/verify-work/SKILL.md
```

`anti-vibe-review` (esperado):
- Modos de Invocacao
- Resolucao de Modelo via Model Profiles
- Como Executar (`<instructions>`)
- 7 secoes de checklist (`<checklist>`: TDD, Padroes, Arquitetura, Error Handling, Seguranca, Performance/Obs, React)
- Relatorio Anti-Vibe Review (`<report-template>`)
- Estrategia de Revisao Eficiente — Staged/Unstaged (`<context>`)
- Delegacao Opcional a Auditores
- Modulo a revisar

`verify-work` (esperado):
- Step 1 — Rodar Testes e Lint
- Step 2 — Audit Pipeline (com sub-secoes 2a-2f)
- Step 3 — Compilar Relatorio
- Verification Report template
- Step 4 — Apresentar ao Dev e Decidir
- Step 5 — Learn Point
- Pipeline Integration
- Regras
- Fase Final — Fresh-context Review

### Passo 2: Classificar cada secao em 3 buckets

Para cada conceito, decidir:

**Bucket A — Unico em anti-vibe-review (candidato a absorcao):**
- Conteudo conceitual nao coberto pelos auditores delegados de verify-work
- Exemplos esperados: Staged/Unstaged strategy (`<context>`), Deep Modules inline check, "nomes grepáveis" com grep -c heuristic

**Bucket B — Duplicado conceitualmente (NAO absorver):**
- Itens de checklist que ja sao cobertos por auditores spawned em verify-work
- Exemplos esperados: TDD Compliance (cobre `tdd-verifier`), Seguranca OWASP (cobre `security-auditor`), code smells (cobre `code-smell-detector`)

**Bucket C — Unico em verify-work (estado atual, manter):**
- Capacidades ativas: rodar testes, debug agent, mutation testing, hallucination check, git history TDD compliance
- Estas NAO existem em anti-vibe-review e nao precisam ser absorvidas (verify-work e a autoridade)

### Passo 3: Gerar `gap-analysis.md`

Estrutura do documento:

```markdown
# Gap Analysis: /anti-vibe-review vs /verify-work

**Data:** 2026-05-23
**Fase:** Plano 01 / fase-01

## Resumo executivo

- Secoes em anti-vibe-review: {N}
- Secoes em verify-work: {M}
- Duplicacoes conceituais detectadas: {K}
- Itens unicos em anti-vibe-review (candidatos a absorcao): {L}
- Itens unicos em verify-work (estado atual, manter): {P}

## Bucket A — Absorver em verify-work

| Conceito | Origem (linha) | Justificativa | Onde absorver em verify-work |
|----------|---------------|---------------|------------------------------|
| Estrategia Staged/Unstaged | anti-vibe-review:155-163 | Diretriz operacional valiosa sem equivalente em verify-work | Secao nova `## Estrategia Staged/Unstaged` antes de "Regras" |
| Heuristica "nomes grepáveis" (grep -c) | anti-vibe-review:64 | Check pratico nao explicitado em code-smell-detector | Adicionar como nota inline em Step 2 (audit pipeline), proxima a code-smell-detector |
| Deep Modules inline check + referencia a deep-modules.md | anti-vibe-review:77-81 | Conceito util como check rapido antes de spawnar solid-auditor | Adicionar em Step 2c (Auditores Domain-Specific) como pre-check |

## Bucket B — Duplicacao conceitual (NAO absorver)

| Conceito | Em anti-vibe-review | Coberto por |
|----------|---------------------|-------------|
| TDD Compliance checklist (testes existem, assertions reais, edge cases) | linhas 51-58 | `tdd-verifier` agent (auditor automatizado) |
| Padroes de Codigo (type-safety, early return, etc.) | linhas 60-69 | `code-smell-detector` agent |
| Arquitetura (Fat Controllers, Lei de Demeter, Tell-Don't-Ask) | linhas 70-82 | `solid-auditor` agent |
| Error Handling (Result Pattern, try/catch confinado) | linhas 83-89 | `code-smell-detector` + revisao manual em verify-work Step 3 |
| Seguranca (OWASP, SQL injection, secrets) | linhas 91-98 | `security-auditor` agent |
| Performance e Observability (N+1, console.log) | linhas 100-105 | `api-auditor` + `database-analyzer` agents |
| React (useEffect, TanStack Query) | linhas 107-112 | `react-auditor` agent |

## Bucket C — Unico em verify-work (manter, nao tocar)

| Capacidade | Em verify-work |
|------------|----------------|
| Rodar testes via Bash (`bun run test`) | Step 1 |
| Rodar lint via Bash (`bun run lint`) | Step 1 |
| Debug agent automatico em falha de teste | Step 1.6 |
| Spawn paralelo de auditores via invokeAndConsolidate | Step 2 |
| Mutation testing | Step 2e Verificacao 4 |
| Hallucination check (imports apontando para arquivos inexistentes) | Step 2e Verificacao 3 |
| Test quality audit (cobertura negocio vs infra, testes fracos) | Step 2e |
| TDD compliance via git history | Step 2e Verificacao 5 |
| Fresh-context review final | Fase Final |

## Recomendacoes para fase-03

1. Adicionar APENAS os 3 conceitos do Bucket A em verify-work
2. NAO copiar checklist de 7 secoes — auditores ja cobrem
3. Linguagem da absorcao deve referenciar anti-vibe-review como "skill consolidada" (nao "skill antiga")
4. Preservar blocos TypeScript de telemetria em verify-work (linhas 10-57 e final)
```

### Passo 4: Validacao do documento

Antes de fechar a fase, confirmar via grep que o documento contem:

```bash
grep -c "## Bucket A" plano01/gap-analysis.md  # esperado: 1
grep -c "## Bucket B" plano01/gap-analysis.md  # esperado: 1
grep -c "## Bucket C" plano01/gap-analysis.md  # esperado: 1
grep -c "^| " plano01/gap-analysis.md  # esperado: >=10 (linhas de tabela)
```

---

## Gotchas

- **G1 do plano:** Conflito conceitual entre as 2 skills — em conflito, `verify-work` e a autoridade. Item de checklist inline NUNCA deve ser absorvido se ja existe auditor (Bucket B). Itens de Bucket A devem ser estritamente conceitos NAO cobertos por nenhum auditor.
- **Local — `<context>` block em anti-vibe-review:** A secao "Estrategia Staged/Unstaged" esta DENTRO de uma tag `<context>` (linhas 154-163). Ao absorver, extrair o texto puro (sem a tag) e re-formatar como secao H2 markdown standard em verify-work.
- **Local — referencias a outras skills:** `anti-vibe-review` linha 81 cita `skills/tdd-workflow/references/deep-modules.md`. Verificar que esse arquivo existe ANTES de absorver a referencia em verify-work (evitar broken link).

---

## Verificacao

### Checklist

- [ ] `plano01/gap-analysis.md` existe
- [ ] Documento lista todas as secoes H2 de ambas skills (validar contagem)
- [ ] 3 buckets (A/B/C) classificados com tabelas
- [ ] Bucket A tem ≥1 conceito identificado para absorcao
- [ ] Bucket B documenta duplicacoes com auditor correspondente
- [ ] Bucket C lista capacidades ativas de verify-work (rodar testes, debug agent, etc.)
- [ ] Recomendacoes para fase-03 estao explicitas no final do documento
- [ ] Nenhum arquivo de skills foi tocado (esta fase e analise pura)

---

## Criterio de Aceite

**Por maquina:**
- `[ -f docs/exec-plans/active/2026-05-22-agent-skills-import-wave3/plano01/gap-analysis.md ] && echo OK` retorna `OK`
- `grep -c "## Bucket [ABC]" plano01/gap-analysis.md` retorna `3`
- `grep -E "anti-vibe-review:[0-9]+" plano01/gap-analysis.md` retorna ≥3 matches (referencias com linha)

**Por humano:**
- Revisar documento: a classificacao em buckets faz sentido conceitualmente? Algum item esta em bucket errado? Algum conceito ficou de fora?

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

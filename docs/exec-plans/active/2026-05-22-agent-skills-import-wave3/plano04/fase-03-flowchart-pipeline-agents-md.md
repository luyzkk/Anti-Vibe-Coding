<!--
Princípio universal #5 — Comment Provenance.
Refactor markdown-only: nenhum codigo de runtime tocado. JSDoc/Comments nao se aplicam.
-->

# Fase 03: Flowchart `## Pipeline de Trabalho` em AGENTS.md

**Plano:** 04 — Refactor Skills + Flowchart AGENTS.md + Manifest Final
**Sizing:** 0.5h
**Depende de:** Plano 01 fase-02 (deprecation notice de `/anti-vibe-review` ja escrito — flowchart cita "(DEPRECADO → use /verify-work)")
**Visual:** false

---

## O que esta fase entrega

Secao `## Pipeline de Trabalho` adicionada em `AGENTS.md` como PRIMEIRA secao apos titulo
principal, contendo flowchart canonico `Define → Plan → Build → Verify → Review → Ship`
mapeado para skills publicas. Atende CA-09 + SH-03 + DT-4.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `AGENTS.md` | Modify | Adicionar `## Pipeline de Trabalho` IMEDIATAMENTE apos titulo principal (`# Anti-Vibe Coding Plugin — Agent Index`) e ANTES de `## Core Beliefs`. Conforme PRD: "antes da listagem de agentes". |

---

## Implementacao

### Passo 0: Pre-checagem de dependencia (G4)

ANTES de editar, verificar que o deprecation notice do Plano 01 fase-02 ja foi criado:

```bash
grep -E "Deprecation Notice|DEPRECADO|deprecated" skills/anti-vibe-review/SKILL.md
```

Se nao retornar match, PAUSAR — o flowchart cita `(DEPRECADO → use /verify-work)`. Sem o
notice no destino, o link conceitual fica orfao. Registrar bloqueio no MEMORY e aguardar
Plano 01 fase-02.

### Passo 1: Validacao defensiva — slugs canonicos (G3)

Listar skills publicas disponiveis para confirmar que cada `/skill-name` citado existe:

```bash
ls skills/ | sort
```

As skills citadas no flowchart abaixo (write-prd, grill-me, plan-feature, quick-plan,
tdd-workflow, execute-plan, code-simplification, verify-work, anti-vibe-review, security,
lessons-learned, iterate) devem TODAS aparecer como pastas em `skills/`. Se alguma faltar,
ajustar o flowchart antes de escrever (e registrar a divergencia no MEMORY).

### Passo 2: Adicionar `## Pipeline de Trabalho` em AGENTS.md

Inserir IMEDIATAMENTE apos a linha de titulo principal. Conteudo:

```markdown
## Pipeline de Trabalho

Novo ao repo? Comece aqui. Cada fase do trabalho tem uma skill canonica — invoque na ordem.

| Fase do trabalho | Skill a invocar | O que entrega |
|------------------|------------------|---------------|
| **Define** | `/anti-vibe-coding:write-prd`, `/anti-vibe-coding:grill-me` | PRD aprovado, ambiguidade zero |
| **Plan** | `/anti-vibe-coding:plan-feature`, `/anti-vibe-coding:quick-plan` | Plano executavel hierarquico (PLAN.md + fases) |
| **Build** | `/anti-vibe-coding:tdd-workflow`, `/anti-vibe-coding:execute-plan` | Implementacao fase-a-fase em ciclo RED/GREEN |
| **Verify** | `/anti-vibe-coding:verify-work`, `/anti-vibe-coding:security` | Testes verdes + auditoria multi-agente |
| **Review** | `/anti-vibe-coding:verify-work` (canonico), `/anti-vibe-review (DEPRECADO → use /verify-work)` | Quality score + checklist de release |
| **Ship** | `/anti-vibe-coding:lessons-learned`, `/anti-vibe-coding:iterate` | Compound capturado + ciclo pos-deploy aberto |

Fluxo canonico:

\`\`\`
Define ---> Plan ---> Build ---> Verify ---> Review ---> Ship
                                                            |
                                                            v
                                                      (loop iterativo)
\`\`\`

Skills auxiliares (chamaveis de qualquer fase): `/anti-vibe-coding:consultant`,
`/anti-vibe-coding:decision-registry`, `/anti-vibe-coding:design-twice`,
`/anti-vibe-coding:code-simplification`, `/anti-vibe-coding:learn`.

---
```

> Nota: deixar uma linha em branco apos o `---` final para nao colar com a proxima secao
> (`## Core Beliefs`).

### Passo 3: Validacao defensiva pos-edicao

Confirmar que a secao foi inserida como PRIMEIRA secao apos o titulo:

```bash
grep -n "^## " AGENTS.md | head -5
```

Resultado esperado: a primeira linha retornada deve ser `## Pipeline de Trabalho` (com numero
de linha apos o titulo), e `## Core Beliefs` deve aparecer logo em seguida.

---

## Gotchas

- **G3 do plano (slugs canonicos):** Cada `/skill-name` citado no flowchart corresponde a uma
  pasta em `skills/`. Se um slug nao bater, o link conceitual quebra. Validado no Passo 1.
- **G4 do plano (notice de deprecation):** Flowchart cita `/anti-vibe-review (DEPRECADO → use
  /verify-work)`. O notice precisa existir em `skills/anti-vibe-review/SKILL.md` antes desta
  fase rodar — validado no Passo 0.
- **G7 do plano (AGENTS.md curto):** Arquivo tem 39 linhas. Insercao logo apos titulo principal
  e ANTES de `## Core Beliefs`. Nao no meio nem no fim.
- **Local:** Se um slug nao existir hoje mas estiver na roadmap, citar mesmo assim — o
  manifest e harness:validate detectarao a divergencia e o autor podera corrigir. Registrar
  no MEMORY se aplicavel.

---

## Verificacao

### TDD

- [ ] **RED:** Antes da edicao, secao ausente.
  - Comando: `grep -cE "^## Pipeline de Trabalho" AGENTS.md`
  - Resultado esperado: `0`

- [ ] **GREEN:** Apos edicao, secao presente + 6 fases mapeadas.
  - Comando A: `grep -cE "^## Pipeline de Trabalho" AGENTS.md` → `1`
  - Comando B: `grep -cE "\*\*(Define|Plan|Build|Verify|Review|Ship)\*\*" AGENTS.md` → `6` (cada fase aparece pelo menos uma vez em negrito na tabela)

### Checklist

- [ ] Secao presente como PRIMEIRA `^## ` apos o titulo principal
- [ ] 6 fases mapeadas em tabela: Define, Plan, Build, Verify, Review, Ship
- [ ] Pelo menos 8 skills citadas com prefixo `/anti-vibe-coding:` (excluindo anti-vibe-review legado)
- [ ] `(DEPRECADO → use /verify-work)` aparece junto a `/anti-vibe-review`
- [ ] Flowchart ASCII visivel (com `--->` ou `→`)
- [ ] `## Core Beliefs` ainda existe e aparece DEPOIS da nova secao
- [ ] Cada slug citado corresponde a uma pasta real em `skills/` (validar com `ls skills/`)
- [ ] `bun run harness:validate` verde

---

## Criterio de Aceite

**Por maquina:**
- `grep -cE "^## Pipeline de Trabalho" AGENTS.md` retorna `1`
- A primeira ocorrencia de `^## ` no arquivo (apos titulo) e `## Pipeline de Trabalho`
- `grep -cE "\*\*(Define|Plan|Build|Verify|Review|Ship)\*\*" AGENTS.md` retorna `6`
- `grep -c "DEPRECADO" AGENTS.md` retorna `>= 1`
- `bun run harness:validate` retorna exit code 0

**Por humano:**
- Leitura por novato (persona "primeiro dia no repo") confirma: "entendo por onde comecar
  e qual skill chamar em cada fase".

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

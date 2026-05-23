# Fase 02: Wave B — Refinar 4 Agentes (`code-smell-detector`, `solid-auditor`, `infrastructure-auditor`, `design-explorer`)

**Plano:** 02 — Refinar 12 Agentes Restantes
**Sizing:** 1.5h
**Depende de:** Plano 01 (gold standard + schema + validator). NAO depende de Plano 02 fase-01 (waves sao independentes; executor decidiu serializar para revisao incremental)
**Visual:** false

---

## O que esta fase entrega

Os 4 agentes da Wave B refinados em paralelo (4 subagentes Fork), aplicando o gold standard `agents/security-auditor.md` (5 patterns) com regras anti-degen ESPECIFICAS do dominio de cada um.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/code-smell-detector.md` | Modify | Adicionar 3 secoes + bumpar contract_version + triad em issues critical/high |
| `agents/solid-auditor.md` | Modify | Idem |
| `agents/infrastructure-auditor.md` | Modify | Idem |
| `agents/design-explorer.md` | Modify | Idem |

Nenhum outro arquivo eh modificado nesta fase. Subagentes tem escopo restrito a 1 unico arquivo cada.

---

## Implementacao

### Passo 1: Confirmar pre-requisitos

Antes de spawnar subagentes:
- `agents/security-auditor.md` refinado (Plano 01 fase-03).
- Wave A (fase-01) opcionalmente ja concluida — nao bloqueia, mas dev tipicamente revisa Wave A antes de B.

### Passo 2: Spawnar 4 subagentes Fork em paralelo

Mesmo contrato literal da fase-01 (ver `fase-01-wave-a-refinar-4-agentes.md` secao "Contrato literal do subagente (input)"). Apenas o mapping `TARGET_AGENT_PATH` muda:

#### Mapping da Wave B (TARGET_AGENT_PATH por subagente)

| Subagente | TARGET_AGENT_PATH | Dominio | Exemplos de anti-degen especifica (CA-10 do PRD) |
|-----------|-------------------|---------|--------------------------------------------------|
| SB-1 | `agents/code-smell-detector.md` | Code quality / smells | "Never suggest `// eslint-disable` over fixing the smell; never suggest `any` over typing" |
| SB-2 | `agents/solid-auditor.md` | SOLID principles | "Never suggest violating SRP with `if (env === 'test')` branches; never suggest dependency on concretes over abstractions" |
| SB-3 | `agents/infrastructure-auditor.md` | Infra / DevOps | "Never suggest hardcoding secrets em prod; never suggest `chmod 777`" |
| SB-4 | `agents/design-explorer.md` | Architecture exploration | Definir conforme dominio (sugerir nao-genericas: "Never propose pattern X without trade-off analysis; never copy-paste design from analogous project without verifying constraints") |

O subagente LE o agente alvo e gera regras concretas do dominio dele. Os exemplos vem do PRD CA-10; subagente pode propor variacoes mais especificas.

### Passo 3: Coletar relatorios e consolidar

Apos os 4 subagentes retornarem, o executor da fase:
1. Roda o checklist de verificacao (grep por agente — ver "Verificacao" abaixo).
2. Le o diff dos 4 agentes em sequencia para confirmar consistencia visual com gold standard.
3. Roda `bun run harness:validate`.

---

## Gotchas

- **G1 do plano:** Gold standard passado VERBATIM. Subagentes nao parafraseiam.
- **G2 do plano:** Anti-degeneration ESPECIFICA varia por dominio. NAO copiar regras do security-auditor.
- **G3 do plano:** Bump contract_version atomico (literal `"1.0"` + descricao textual no mesmo edit).
- **G6 do Plano 01:** Inconsistencia no gold standard propaga 4x nesta wave.
- **Local — code-smell-detector:** dominio overlaps com regras GENERICAS (eslint-disable ja eh universal). Subagente precisa propor regras ESPECIFICAS distintas (ex: "Never suggest deleting commented-out code that documents intent; never suggest extracting helper for single-use code").
- **Local — solid-auditor:** dominio abstrato. Regras concretas: "Never suggest violating SRP with if(env)", "Never suggest concrete dependency over interface", "Never suggest god-class refactor that just renames the class".
- **Local — infrastructure-auditor:** secrets, IAM, chmod, network policies. Anti-degen forte: "Never suggest hardcoding secrets", "Never suggest chmod 777", "Never suggest disabling firewall rule as a fix".
- **Local — design-explorer:** dominio meta (gera propostas, nao audita). Pode requerer ajuste do template — verdict pode ser `approve/request_changes/block` mas semantica e "proposta aprovada para implementar" vs "proposta precisa refinamento". Subagente documenta essa nuance no `## Composition` (Invoke via /design-twice).
- **Paralelismo intra-wave:** subagentes Fork rodam concorrentes. Editam arquivos diferentes — sem race condition.

---

## Verificacao

### TDD (grep por agente)

Para CADA um dos 4 agentes (`code-smell-detector`, `solid-auditor`, `infrastructure-auditor`, `design-explorer`):

- [ ] `grep -c "## Output Contract (additions)" agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c "positive_observations" agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c "verdict" agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c "## Anti-Degeneration Rules" agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c "## Composition" agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c '"contract_version": "2.0.0"' agents/{nome}.md` retorna `>= 1`
- [ ] `grep -c '"contract_version": "1.0"' agents/{nome}.md` retorna `0`

### Checklist global da fase

- [ ] 4/4 subagentes retornaram com sucesso e relatorios coletados
- [ ] Diff visual dos 4 agentes consistente com gold standard (ordem das secoes, capitalizacao)
- [ ] Nenhum arquivo fora de `agents/{code-smell-detector|solid-auditor|infrastructure-auditor|design-explorer}.md` foi modificado nesta fase
- [ ] `bun run harness:validate` verde
- [ ] `bun run test` verde
- [ ] `bun run lint` verde

---

## Criterio de Aceite

**Por maquina:**
- Loop pelos 4 agentes da Wave B: cada um passa os 7 greps acima.
- `bun run harness:validate && bun run test && bun run lint` verde.

**Por humano:**
- Review visual do diff dos 4 agentes confirma:
  - Secoes novas na mesma posicao do gold standard.
  - Regras anti-degen especificas SAO concretas e citam o dominio (nao genericas copiadas do security-auditor).
  - Triad PoC/Impact/Fix presente no JSON exemplo de issues critical/high.
  - `design-explorer` adapta semantica de verdict (proposta aprovada vs request changes) sem inventar valores fora do enum canonico.

---

<!-- Gerado por /plan-feature em 2026-05-22 -->

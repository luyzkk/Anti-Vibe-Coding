# Fase 01: Wave A — Refinar 4 Agentes (`react-auditor`, `api-auditor`, `database-analyzer`, `tdd-verifier`)

**Plano:** 02 — Refinar 12 Agentes Restantes
**Sizing:** 1.5h
**Depende de:** Plano 01 fases 01/02/03/04 (gold standard + schema v2.0.0 + migration guide + validator anti-generico)
**Visual:** false

---

## O que esta fase entrega

Os 4 primeiros agentes da Wave 2 refinados em paralelo (4 subagentes Fork), aplicando o gold standard `agents/security-auditor.md` (5 patterns) com regras anti-degen ESPECIFICAS do dominio de cada um.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/react-auditor.md` | Modify | Adicionar 3 secoes + bumpar contract_version + triad em issues critical/high |
| `agents/api-auditor.md` | Modify | Idem |
| `agents/database-analyzer.md` | Modify | Idem |
| `agents/tdd-verifier.md` | Modify | Idem |

Nenhum outro arquivo eh modificado nesta fase. Subagentes tem escopo restrito a 1 unico arquivo cada.

---

## Implementacao

### Passo 1: Carregar gold standard

Antes de spawnar subagentes, o executor da fase confirma que `agents/security-auditor.md` foi refinado no Plano 01 fase-03 (grep `## Output Contract (additions)` retorna >=1).

Path absoluto do gold standard: `f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md`.

### Passo 2: Spawnar 4 subagentes Fork em paralelo

Cada subagente recebe o MESMO contrato literal abaixo, com apenas o `TARGET_AGENT_PATH` variando.

#### Contrato literal do subagente (input)

```
Voce e um subagente Fork (herda contexto pai cache-otimizado) com escopo de refinamento de UM unico agente .md. Escopo restrito: NAO toque em qualquer arquivo fora de TARGET_AGENT_PATH.

INPUT:
- GOLD_STANDARD_PATH: f:/Projetos/Anti-Vibe-Coding/agents/security-auditor.md (LEIA verbatim antes de editar)
- TARGET_AGENT_PATH: f:/Projetos/Anti-Vibe-Coding/agents/{nome-do-agente}.md
- SCHEMA_DOC: f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v1.md (referencia para v2.0.0)
- MIGRATION_GUIDE: f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v2-migration.md (gerado no Plano 01 fase-02)

REGRAS:
1. Ler GOLD_STANDARD inteiro. Identificar onde estao as 3 secoes novas (## Output Contract (additions), ## Anti-Degeneration Rules, ## Composition) e a triad PoC/Impact/Fix em issues critical/high. Manter ordem e formato verbatim ao replicar.
2. Ler TARGET_AGENT_PATH inteiro. Identificar dominio do agente (pelo nome, frontmatter description e secoes "## O que verificar").
3. Aplicar os 5 patterns no TARGET_AGENT (referenciar PRD Mecanismo Item 1):

   PATTERN 1 — `## Output Contract (additions)`:
     - `payload.positive_observations: string[] (>=1 obrigatorio, mesmo em estado "clean")`
     - `payload.verdict: "approve" | "request_changes" | "block"`
     - Tabela severity_action_map inline (4 linhas: critical/high/medium/low)

   PATTERN 2 — Triad em issues critical/high:
     - Para `severity in {critical, high}`, payload.issues[].* DEVE conter:
       - exploitation_scenario (descritivo, nao codigo executavel)
       - impact (consequencias mensuraveis)
       - fix_with_example (snippet de correcao)

   PATTERN 3 — `## Anti-Degeneration Rules`:
     - >=2 GENERICAS (universais): NUNCA sugerir @ts-ignore / eslint-disable / test.skip / desabilitar validador-gate-hook como correcao
     - >=2 ESPECIFICAS do dominio do agente (gerar a partir do que voce LEU no TARGET_AGENT — citar PRD CA-10 como referencia para exemplos por dominio se necessario; NAO copiar literalmente as do security-auditor)

   PATTERN 4 — `## Composition`:
     - "Invoke directly when: {casos do dominio}"
     - "Invoke via: {skill canonica que orquestra — ex: verify-work, iterate}"
     - "Do not invoke from another persona (constraint plataforma)"

   PATTERN 5 — Bump contract_version:
     - Substituir TODAS as ocorrencias literais de `"contract_version": "1.0"` por `"contract_version": "2.0.0"` no JSON
     - Substituir descricoes textuais que digam "sempre `1.0`" por "sempre `2.0.0`"
     - Verificar com grep que ZERO ocorrencias de `"1.0"` (como contract_version) permanecem

4. Edits sao cirurgicos (Edit tool, NAO Write inteiro). Preservar o resto do arquivo intacto.
5. Validacao automatica antes de retornar:
   - grep -c "## Output Contract (additions)" TARGET_AGENT_PATH >= 1
   - grep -c "positive_observations" TARGET_AGENT_PATH >= 1
   - grep -c "verdict" TARGET_AGENT_PATH >= 1
   - grep -c "## Anti-Degeneration Rules" TARGET_AGENT_PATH >= 1
   - grep -c "## Composition" TARGET_AGENT_PATH >= 1
   - grep -c '"contract_version": "2.0.0"' TARGET_AGENT_PATH >= 1
   - grep -c '"contract_version": "1.0"' TARGET_AGENT_PATH == 0

OUTPUT:
- TARGET_AGENT_PATH modificado in-place
- Relatorio curto (<150 palavras): dominio identificado, regras anti-degen especificas escolhidas (2 frases), contagem das 7 validacoes acima
```

#### Mapping da Wave A (TARGET_AGENT_PATH por subagente)

| Subagente | TARGET_AGENT_PATH | Dominio | Exemplos de anti-degen especifica (CA-10 do PRD) |
|-----------|-------------------|---------|--------------------------------------------------|
| SA-1 | `agents/react-auditor.md` | React patterns | "Never suggest removing dependency array; never suggest useEffect for data fetching" |
| SA-2 | `agents/api-auditor.md` | REST/API design | "Never suggest GET with side effects; never suggest skipping idempotency key" |
| SA-3 | `agents/database-analyzer.md` | DB/SQL | "Never suggest SELECT * in production code; never suggest disabling FK constraint" |
| SA-4 | `agents/tdd-verifier.md` | TDD discipline | "Never accept test.skip with TODO; never accept test sem assertion real" |

O subagente LE o agente alvo e gera regras concretas do dominio dele — os exemplos acima vem do PRD CA-10 e servem apenas como ancora. Subagente pode propor variacoes mais especificas (ex: react-auditor pode adicionar "Never suggest useEffect dentro de loop").

### Passo 3: Coletar relatorios e consolidar

Apos os 4 subagentes retornarem, o executor da fase:
1. Roda o checklist de verificacao (grep por agente — ver "Verificacao" abaixo).
2. Le o diff dos 4 agentes em sequencia para confirmar consistencia visual com gold standard (heading capitalization, ordem das secoes, formato JSON).
3. Roda `bun run harness:validate`.

---

## Gotchas

- **G1 do plano:** Gold standard passado VERBATIM. Subagentes NAO parafraseiam — leem o arquivo inteiro e copiam estrutura.
- **G6 do Plano 01:** Qualquer inconsistencia no gold standard (heading, ordem) propaga em 4 agentes nesta wave. Se executor detectar deriva durante o passo 3, abortar e abrir compound note para o Plano 01 corrigir.
- **Local — react-auditor:** dominio inclui closure stale, dependency array, server state. Regras especificas devem refletir isso (PRD CA-10).
- **Local — api-auditor:** idempotency, CORS, rate limiting. Atencao para NAO duplicar regras de CORS com security-auditor — api-auditor foca em `idempotency-key`, side effects de GET, status codes corretos.
- **Local — database-analyzer:** SELECT *, FK constraints, indices, N+1. Domain-specific anti-degen e crucial.
- **Local — tdd-verifier:** test.skip, asserts vazios, fake green. Esta agente tem sobreposicao com `## Anti-Degeneration Rules` GENERICAS (test.skip ja esta na lista universal) — subagente precisa propor regras ESPECIFICAS distintas (ex: "Never accept describe.only / it.only em codigo merged").
- **Paralelismo intra-wave:** subagentes Fork rodam concorrentes. Como editam arquivos DIFERENTES, nao ha race condition.

---

## Verificacao

### TDD (grep por agente)

Para CADA um dos 4 agentes (`react-auditor`, `api-auditor`, `database-analyzer`, `tdd-verifier`):

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
- [ ] Nenhum arquivo fora de `agents/{react|api|database|tdd-verifier}-*.md` foi modificado nesta fase: `git status --porcelain | grep -v "^.. agents/(react-auditor|api-auditor|database-analyzer|tdd-verifier)\.md"` retorna vazio (modulo MEMORY do plano)
- [ ] `bun run harness:validate` verde
- [ ] `bun run test` verde
- [ ] `bun run lint` verde

---

## Criterio de Aceite

**Por maquina:**
- Loop pelos 4 agentes da Wave A: cada um passa os 7 greps acima.
- `bun run harness:validate && bun run test && bun run lint` verde.

**Por humano:**
- Review visual do diff dos 4 agentes confirma:
  - Secoes novas na mesma posicao do gold standard.
  - Regras anti-degen especificas SAO concretas e citam o dominio (nao genericas copiadas do security-auditor).
  - Triad PoC/Impact/Fix presente no JSON exemplo de issues critical/high.

---

<!-- Gerado por /plan-feature em 2026-05-22 -->

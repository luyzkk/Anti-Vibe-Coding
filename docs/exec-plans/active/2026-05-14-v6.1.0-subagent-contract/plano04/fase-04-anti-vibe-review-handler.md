<!--
Princípio universal #5 — Comment Provenance.
Comentários inline em código gerado nesta fase precisam de linhagem
(autor + data + razão). Ver fase-01 para exemplo.
-->

# Fase 04: anti-vibe-review consome handler genérico (replica padrão do verify-work)

**Plano:** 04 — Orquestradores
**Sizing:** 2h
**Depende de:** fase-03 (`audit-consolidator.ts` validado em verify-work; padrao consolidado)
**Visual:** false

---

## O que esta fase entrega

`anti-vibe-review` consumindo subset dos mesmos auditores que `verify-work` via mesmo `audit-consolidator.ts` (reuso, nao reescrita); checklist markdown inline preservado (anomalia A3 — anti-vibe-review hoje **NAO invoca subagentes**, e prompt manual); fase **prepara** o terreno para delegacao opcional a subagentes via `parseAndDispatch()`. Remove qualquer parsing de markdown que pudesse existir em fluxos auxiliares; alinha estrutura do relatorio com verify-work (secao "Reasoning dos auditores" quando subagentes forem invocados em v6.2).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/anti-vibe-review/SKILL.md` | Modify | Manter `<checklist>` inline (avaliado pelo orchestrator/Claude). Adicionar bloco "## Delegacao Opcional a Auditores" descrevendo COMO chamar `invokeAndConsolidate` de `skills/verify-work/lib/audit-consolidator.ts` quando o dev preferir auditoria automatizada. Padrao continua sendo checklist manual (preserva fluxo v6.0). Atualizar `<report-template>` para incluir secao "Reasoning dos auditores" quando subagentes forem invocados |
| `skills/anti-vibe-review/SKILL.md` (frontmatter) | Modify | Adicionar `Agent` em `allowed-tools` (hoje so tem `Read, Grep, Glob`) — pre-requisito para delegacao opcional. Sem isso o orquestrador nem podia invocar auditores no futuro |

**Nota A3 / G-P04-04:** Esta fase teve seu escopo **ajustado durante planejamento** porque o codigo atual de anti-vibe-review nao invoca subagentes — usa um `<checklist>` inline avaliado pelo Claude diretamente. Substituir parsing custom por `parseAndDispatch()` nao se aplica literalmente. O que entregamos: **preparar a estrutura** (frontmatter + bloco de delegacao opcional) sem quebrar o fluxo manual atual. Confirmar com dev em execucao se escopo aceitavel ou se v6.2 deve forcar migracao completa para auditores spawn.

---

## Implementacao

### Passo 1: Atualizar frontmatter

Antes:
```yaml
allowed-tools: Read, Grep, Glob
```

Depois:
```yaml
allowed-tools: Read, Grep, Glob, Agent, Bash
```

Justificativa em comentario fora do frontmatter (HTML comment no topo do arquivo):
```html
<!-- 2026-05-14 (Luiz/dev): Agent adicionado para permitir delegacao opcional a auditores em v6.2.
     v6.1.0 mantem checklist inline como default — Agent so e usado se dev pedir explicitamente. -->
```

### Passo 2: Adicionar bloco "## Delegacao Opcional a Auditores"

Inserir APOS o `<context>` block e ANTES de `## Modulo a revisar`. Texto sugerido:

```markdown
## Delegacao Opcional a Auditores (v6.1.0+)

Por padrao, este skill avalia o checklist inline diretamente — o orquestrador (Claude) le os arquivos
e pontua cada item. Esse fluxo nao mudou em v6.1.0.

Para fluxo automatizado (delegar partes do checklist a auditores especializados), use:

```typescript
// 2026-05-14 (Luiz/dev): delegacao opcional — PRD §Decisões #5 (handler unico por kind)
// Default em v6.1.0 e manter checklist inline. Esta delegacao e opt-in.

import { invokeAndConsolidate } from '../verify-work/lib/audit-consolidator'

// Spawn dos auditores aplicaveis (subset do verify-work)
const consolidation = await invokeAndConsolidate([
  { agent: 'security-auditor', invoke: () => spawnAudit('security-auditor', files) },
  { agent: 'code-smell-detector', invoke: () => spawnAudit('code-smell-detector', files) },
  { agent: 'tdd-verifier', invoke: () => spawnAudit('tdd-verifier', files) },
])

// Mesmo shape do verify-work — alimenta secoes 1, 2, 4 do checklist
// (TDD, Padroes de Codigo, Error Handling tem auditores correspondentes;
// secoes 3, 5, 6, 7 ainda dependem do orquestrador avaliar inline).
```

**Quando usar delegacao:**
- Codebase grande (>50 arquivos no diff) onde leitura manual via checklist demora muito
- Fluxo CI/CD que precisa de saida estruturada (JSON via consolidation, nao prosa)
- Equipe quer reutilizar findings ja gerados pelo verify-work sem re-rodar tudo

**Quando manter inline (default v6.1.0):**
- Dev quer feedback educacional ao percorrer cada item do checklist (caso uso classico)
- Codebase pequeno onde overhead de spawn nao compensa
- Foco em itens que nao tem auditor dedicado (Arquitetura, Seguranca contextual, React patterns)
```

### Passo 3: Atualizar `<report-template>` com secao condicional

Adicionar APOS "### Recomendacoes" e ANTES do `</report-template>`:

```markdown
### Reasoning dos auditores (apenas quando delegacao opcional foi usada)

{Para cada agent em consolidation.reasoningByAgent:}
**{agent}**: {reasoning}

{Se algum agent em incomplete[]:}
**{agent}** (incomplete): {reason}

### Domain Status por auditor (apenas quando delegacao opcional foi usada)

| Auditor | domain_status |
|---------|---------------|
| security-auditor | {clean / issues_found / critical} |
| code-smell-detector | {clean / issues_found / critical} |
| tdd-verifier | {clean / issues_found / critical} |
```

Seccoes condicionais — quando checklist inline e usado (default), nao renderizar.

### Passo 4: Telemetria

`anti-vibe-review/SKILL.md` hoje **nao tem** bloco de telemetria explicito (verificar — apenas verify-work, design-twice, execute-plan tem). Se nao tiver, NAO adicionar nesta fase — fora de escopo. Se tiver (verificar com `grep -n writeTelemetryStart skills/anti-vibe-review/SKILL.md`), preservar intacto.

### Passo 5: Grep assertion para garantir nao-regressao

Apos modificacao, validar:
```
grep -n "subagent_type" skills/anti-vibe-review/SKILL.md
```

Deve retornar **apenas** dentro do bloco "Delegacao Opcional" (nao deve aparecer no fluxo principal de "Como Executar"). Garante que o fluxo default v6.1.0 continua manual.

---

## Gotchas

- **G1 do plano (JSON malformado):** Aplica-se apenas no fluxo de delegacao opcional. `invokeAndConsolidate` reusado do verify-work ja trata.
- **G-P04-01 (paralelismo fora de ordem):** Reuso direto — sem novo codigo.
- **G-P04-04 (anomalia anti-vibe-review nao spawn subagentes hoje):** Esta fase **nao forca** migracao. Preserva fluxo manual. Documenta caminho opt-in. Decisao explicita em MEMORY.md para v6.2 considerar.
- **G-P04-06 (Comment Provenance):** Snippet markdown dentro do SKILL.md ja tem comentario `// 2026-05-14 (Luiz/dev): ...` no exemplo.
- **G-P04-07 (telemetria intacta):** Verificar se existe; se sim, preservar.
- **Local — frontmatter mudou `allowed-tools`:** Mudanca pode quebrar testes que validam shape do frontmatter (se houver). Verificar `bun test skills/anti-vibe-review/` e tambem `bun run harness:validate` (que checa frontmatters).
- **Local — `context: fork` no frontmatter:** anti-vibe-review usa fork (linha 8 do SKILL.md atual: `context: fork`, `agent: Explore`). Delegacao opcional via `Agent` tool dentro de fork **funciona** mas spawna sub-fork — overhead de contexto. Documentar isso na secao "Quando usar delegacao".

---

## Verificacao

### TDD

- [ ] **RED:** Nenhum teste TS novo necessario (skill e markdown puro, sem `index.ts` hoje). RED desta fase e:
  - `grep -n "Agent" skills/anti-vibe-review/SKILL.md` retorna apenas frontmatter atual (sem Agent).
  - Apos edicao: `grep -n "## Delegacao Opcional" skills/anti-vibe-review/SKILL.md` retorna 1 ocorrencia.

- [ ] **GREEN:** Aplicar Passos 1-3; greps confirmam mudanca.

- [ ] **TEST harness-validate:** rodar `bun run harness:validate` (do Plano 05 fase-01 — pode nao existir ainda) ou validador atual; SKILL.md continua valido (frontmatter parseavel, secoes obrigatorias presentes).

### Checklist

- [ ] Frontmatter `allowed-tools` inclui `Agent` e `Bash` (Bash para harness se aplicavel).
- [ ] Bloco "## Delegacao Opcional a Auditores" presente apos `<context>`.
- [ ] `<report-template>` tem secao condicional "Reasoning dos auditores".
- [ ] Fluxo default (checklist inline) inalterado — `<checklist>` block intacto.
- [ ] Grep: `grep -rn "Agent" skills/anti-vibe-review/SKILL.md | wc -l` retorna >=2 (frontmatter + bloco delegacao).
- [ ] Grep: `grep -rn "subagent_type\|spawnAudit" skills/anti-vibe-review/SKILL.md` retorna apenas dentro do bloco "Delegacao Opcional" (nao no `<instructions>` principal).
- [ ] Testes: `bun run test` (anti-vibe-review nao tem test suite hoje; rodar suite geral nao regressa).
- [ ] Lint: `bun run lint`
- [ ] `bun run harness:validate` (se ja existe — confirma frontmatter valido).

---

## Criterio de Aceite

**Por maquina:**
- `grep -n "Agent, Bash" skills/anti-vibe-review/SKILL.md` retorna 1 (frontmatter atualizado).
- `grep -n "## Delegacao Opcional" skills/anti-vibe-review/SKILL.md` retorna 1.
- `bun run lint` verde.
- Apos Plano 05 fase-01 ativar `harness:validate` estendido: `bun run harness:validate` confirma SKILL.md valido.

**Por humano:**
- Dev consegue rodar `/anti-vibe-coding:anti-vibe-review` como antes — checklist inline funciona exatamente igual ao v6.0 (fluxo default preservado).
- Dev consegue invocar variante automatizada com bloco de delegacao opcional — output incluiria secao "Reasoning dos auditores".

**Decisoes do PRD aplicadas:**
- **D5** (shape de payload por kind): delegacao opcional consome via `audit-consolidator.ts` reusado do verify-work — shape `findings[] + reasoning + domain_status`.
- **D9** (retry): herdado de `invokeAndConsolidate`.
- **CA-04** (handler unico): atendido para fluxo de delegacao opcional. Fluxo default (checklist inline) e independente do contrato — anti-vibe-review apenas suporta ambos.
- **CA-06** (auditor novo sem mudanca): atendido para fluxo de delegacao (reuso do `audit-consolidator`).

**Anomalia registrada para MEMORY.md:**
- Esta fase **nao migra** anti-vibe-review para subagentes obrigatorios em v6.1.0 — preserva checklist inline. Decisao deliberada (G-P04-04). Para v6.2 considerar: vale a pena unificar com verify-work ou ele e diferente por design (educacional vs CI)?

---

<!-- Gerado por /plan-feature em 2026-05-14 -->

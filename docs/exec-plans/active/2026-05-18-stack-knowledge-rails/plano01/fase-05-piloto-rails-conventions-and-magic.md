<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): piloto rails-conventions-and-magic — alinhado com D17 do CONTEXT`
-->

# Fase 05: Extração do piloto `rails-conventions-and-magic.md` (T1 transversal) com anti-drift clause

**Plano:** 01 — Tracer Bullet
**Sizing:** 2.5h
**Depende de:** fase-01 (precisa de fonte canônica decidida entre `rails-stack-conventions` vs `rails-stack-conventions v2`); fase-02 (validator aceita `rails_versions` opcional — frontmatter do piloto usa o campo). Independe de fase-03/fase-04 (conteudo markdown, nao toca em codigo TS).
**Visual:** false

---

## O que esta fase entrega

`docs/knowledge/rails/atoms/rails-conventions-and-magic.md` — piloto T1 transversal (CoC, DRY, Zeitwerk, ActiveSupport core extensions, metaprogramming) com frontmatter completo (8 campos base + `rails_versions: ['>=7.1']`) e corpo ≤200 linhas seguindo skeleton padrão (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas). **Anti-drift clause OBRIGATÓRIA no prompt do subagente extrator** — colada literalmente do compound lesson 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md. Também cria `docs/knowledge/rails/INDEX.md` SKELETON mínimo (lista apenas o piloto; INDEX final consolidado é Plano03 fase-06). D12 + D17 + D18 do CONTEXT, RF2 + RF6 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/rails-conventions-and-magic.md` | Create | Piloto T1 transversal, ≤200 linhas, frontmatter completo + `rails_versions: ['>=7.1']` |
| `docs/knowledge/rails/INDEX.md` | Create | SKELETON mínimo listando apenas o piloto (Plano03 fase-06 substitui pelo INDEX final consolidado D9) |
| `docs/knowledge/rails/atoms/.gitkeep` | Create | Se ainda não existir, garantir que pasta `atoms/` é trackeada antes do piloto (opcional — Git já trackea ao adicionar o `.md`) |

---

## Implementacao

### Passo 1: identificar fonte canônica (depende de fase-01)

Ler `STATE.md` da feature, seção `## Dedup decisions (Plano 01 fase-01)`, e identificar qual lado venceu para o par `rails-stack-conventions` vs `rails-stack-conventions v2`. Esse é o **único source primário** do piloto. Compass artifacts entram apenas como complemento (D2 do CONTEXT — skill packages = autoridade primária; compass = preenche lacunas).

Lista de compass artifacts relevantes para o piloto (T1 transversal — conceitual + arquitetural):
- `compass_artifact_wf-0deebe76-*.md` (rodar `head -20` para checar tópico)
- `compass_artifact_wf-1d48ebbc-*.md` (idem)
- `compass_artifact_wf-3e82e3be-*.md` (idem)

Subagente extrator deve listar os artifacts e escolher 1-2 que cobrem CoC/DRY/Zeitwerk/ActiveSupport. Se nenhum cobre, fonte primária é APENAS o skill package canônico — corpo do átomo encolhe proporcionalmente.

### Passo 2: subagente extrator com prompt anti-drift

Invocar subagente via Task tool (executar plan-executor ou equivalente). **Prompt OBRIGATÓRIO contém os blocos abaixo verbatim**:

```text
TAREFA: extrair piloto T1 `rails-conventions-and-magic.md` para Plano01 fase-04 da feature
Stack Knowledge Rails (v6.3.3).

ESCOPO DO ÁTOMO (D17 do CONTEXT):
- Tópico: rails-conventions-and-magic
- Stack: rails
- Layer: both
- Tier: 1 (T1 transversal — todo Rails dev sr precisa)
- Cobertura: Convention over Configuration (CoC), DRY, autoloading Zeitwerk,
  ActiveSupport core extensions, metaprogramming idiomático em Rails

FONTES (ler ANTES de escrever — NÃO escrever de memória):
- Skill package canônico (decidido em fase-01 dedup): {fonte_canonica}
- Compass artifacts complementares (escolher 1-2 que cobrem CoC/DRY/Zeitwerk):
  - claude-code/knowledge/Rails/compass_artifact_wf-*.md (listar e selecionar)

FRONTMATTER OBRIGATÓRIO (D13 + D18 do CONTEXT):
---
topic: rails-conventions-and-magic
stack: rails
layer: both
sources:
  - skill: rails-stack-conventions (claude-code/knowledge/Rails/{fonte_canonica}/SKILL.md)
  - research: {compass-id} (claude-code/knowledge/Rails/compass_artifact_wf-{full-hash}.md)
tier: 1
triggers: [CoC, DRY, Zeitwerk, ActiveSupport, metaprogramming, conventions, autoloading]
related_skills: [/architecture, /design-patterns]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

SKELETON OBRIGATÓRIO DO CORPO (≤200 linhas total, incluindo frontmatter):

# Rails Conventions and Magic

## Quando consultar

(3-5 bullets de cenário — quando o agente deve ler este átomo)

## Padrões sênior

(3-7 patterns. Cada um:)
### Pattern: {nome}
- **Problema:** ...
- **Padrão:** ... (com snippet Ruby quando relevante)
- **Quando usar:** ...
- **Quando NÃO usar:** ...

## Anti-padrões

(2-5 armadilhas com correção)
### Anti-pattern: {nome}
- **Sintoma:** ...
- **Por que é ruim:** ...
- **Correção:** ...

## Critérios de decisão

(tabela "se X, então Y" cobrindo decisões frequentes — quando criar concern vs service object,
quando metaprogramar vs explicit code, etc.)

## Referências externas

- Skills relacionadas: /architecture, /design-patterns
- Source paths (audit trail RF14):
  - {path absoluto do skill package}
  - {path absoluto do compass artifact}

================================================================================
REGRA DE FIDELIDADE (anti-drift — compound lesson 2026-05-16, REGRESSION desde Plano01):
================================================================================

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou
> parafraseavelmente na fonte declarada em `sources:`, **NÃO escreva**, mesmo que
> você saiba que é verdade. O verifier gate downstream marca como falha qualquer
> claim não-rastreável ao source — e você gastará tempo no retrabalho. Quando em
> dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia o source
> para confirmar."

> Liberdade explícita: se source não documenta um tópico do skeleton (ex: source
> não fala de "metaprogramming idiomático"), descreva apenas o que está no source.
> NÃO complete com "verdade conhecida na comunidade Rails". Se source não fornece
> overhead quantitativo de Zeitwerk, descreva qualitativamente (como a fonte faz).
> NÃO estime números próprios.

================================================================================
HARD CAPS (verifier rejeita se ultrapassa):
================================================================================
- Corpo do átomo (excluindo frontmatter): ≤200 linhas
- Frontmatter: exatamente os 9 campos listados acima, nessa ordem
- Zero placeholders `[A DEFINIR]`, `TODO`, `FIXME`
- Cada claim técnica em "Padrões sênior", "Anti-padrões", "Critérios de decisão"
  deve ser rastreável a uma passagem específica das fontes em `sources:`

================================================================================
ENTREGÁVEIS:
================================================================================
1. `docs/knowledge/rails/atoms/rails-conventions-and-magic.md` (átomo completo)
2. Confirmação em STATE.md de quais sources foram consumidos (lista de paths absolutos)
3. NÃO criar INDEX.md skeleton — isso é Passo 3 desta fase, executado fora do subagente
```

### Passo 3: criar INDEX.md SKELETON mínimo

Após subagente entregar o piloto, criar manualmente o INDEX skeleton:

```markdown
<!-- 2026-05-18 (Luiz/dev): INDEX skeleton mínimo Plano01 fase-04. INDEX final consolidado é Plano03 fase-06 (layout D9 — por skill cross-stack + por tier). Alinhado com RF1 do PRD. -->

# Rails Knowledge — Index (skeleton — Plano 01)

> Este INDEX é provisório (apenas piloto). INDEX final consolidado com layout D9
> (por skill cross-stack + por tier) é entregue no Plano 03 fase-06 após os 13 átomos
> restantes serem extraídos nos Planos 02 e 03.

## Átomos disponíveis nesta fase

### Tier 1
- [rails-conventions-and-magic](./atoms/rails-conventions-and-magic.md) — CoC, DRY, Zeitwerk, ActiveSupport core extensions, metaprogramming idiomático

## Status

- Piloto: ✅ extraído via subagente em Plano01 fase-04 (2026-05-18)
- Verifier refined: ⏳ pendente (Plano01 fase-05)
- Audit humano: ⏳ pendente (Plano02 fase-09 cobre AR fundamentals + Hotwire; Plano03 fase-07 cobre ActionCable — piloto não está na lista CA-08)

<!-- Plano 03 fase-06 substitui este skeleton pelo INDEX final D9 -->
```

### Passo 4: validar frontmatter com schema da fase-02

```bash
# 2026-05-18 (Luiz/dev): validar piloto contra schema estendido — confirma que fase-02 está integrada
bun run test -- --grep 'rails_versions optional'
```

Resultado esperado: tests da fase-02 continuam verdes E o piloto recém-criado é válido se passado ao helper `validateAtomFrontmatter`.

Adicionalmente, rodar um smoke test ad-hoc:

```typescript
// One-shot script — NÃO commitar
import { validateAtomFrontmatter } from './skills/init/lib/atoms-frontmatter-validator'
const r = validateAtomFrontmatter('docs/knowledge/rails/atoms/rails-conventions-and-magic.md')
console.log(r) // { valid: true, errors: [] }
```

### Passo 5: contar linhas do piloto

```bash
wc -l docs/knowledge/rails/atoms/rails-conventions-and-magic.md
```

Resultado esperado: ≤200 linhas (frontmatter + corpo). Se >200, NÃO commitar — re-rodar subagente extrator com instrução de cortar. Se <60, granularidade está errada (escopo do átomo é grande demais para tão pouco conteúdo) — discutir com dev antes de prosseguir para fase-05.

### Passo 6: registrar fonte canônica em STATE.md

```markdown
## Piloto extraído (Plano 01 fase-04 — 2026-05-18)

- **Átomo:** `rails-conventions-and-magic.md`
- **Linhas:** {N} (≤200 confirmado)
- **Fonte canônica skill package:** `claude-code/knowledge/Rails/{fonte_canonica}/SKILL.md`
- **Compass artifacts consumidos:** {lista de 1-2 paths}
- **Anti-drift clause aplicada no prompt:** ✅ (cole verbatim do compound lesson 2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md)
- **rails_versions:** `['>=7.1']` (cobre 7.1+ e 8.x — coerente com D1 do CONTEXT)
- **Próximo passo:** verifier refined em fase-05
```

---

## Gotchas

- **G3 do plano (anti-drift é regression):** o prompt do extrator DEVE conter os blocos "REGRA DE FIDELIDADE" e "Liberdade explícita" colados verbatim do compound lesson. Não parafrasear, não resumir, não simplificar. Se subagente entrega átomo com claims plausíveis mas não-rastreáveis, blocker em fase-05 (verifier rejeita) — re-rodar com prompt reforçado.

- **G4 do plano (formato `rails_versions`):** `['>=7.1']` é inline array YAML. NÃO usar bloco com `- '>=7.1'` na linha de baixo. NÃO usar string simples. Validator da fase-02 rejeita.

- **Local — hard cap 200 linhas é absoluto:** se subagente entrega 230 linhas, NÃO "aceitar com nota". Re-rodar com instrução de cortar (priorizar Padrões sênior + Anti-padrões + Critérios de decisão; encolher "Quando consultar" e "Referências externas"). Verifier em fase-05 conta linhas e rejeita.

- **Local — fonte canônica depende de fase-01:** se fase-01 ainda não foi aprovada (STATE.md não tem decisão para `rails-stack-conventions` vs `v2`), PARAR fase-04. Subagente extrator precisa saber qual SKILL.md ler. Sem decisão, extração espelha problema do dedup (drift cascateia).

- **Local — escopo do piloto: T1 transversal, não AR-deep:** se durante extração subagente perceber que CoC+DRY+Zeitwerk+ActiveSupport não fecha 200 linhas (faltam temas), NÃO inflar com Active Record fundamentals — esse é átomo separado em Plano02 fase-01. Manter o piloto enxuto e focado nos 4-5 tópicos conceituais.

- **Local — `related_skills` aponta apenas para skills do plugin:** `/architecture` e `/design-patterns` existem; NÃO inventar `/rails-magic` ou similar. Lista verificada contra `f:/Projetos/Anti-Vibe-Coding/skills/` antes de commitar.

---

## Verificacao

### TDD

Fase content-only — sem ciclo RED→GREEN. Usar checklist abaixo + verifier refined em fase-05.

### Checklist

- [ ] `docs/knowledge/rails/atoms/rails-conventions-and-magic.md` existe
- [ ] Frontmatter contém exatamente: `topic, stack, layer, sources, tier, triggers, related_skills, updated, rails_versions` (9 campos)
- [ ] `rails_versions: ['>=7.1']` (inline array, formato D18)
- [ ] Corpo segue skeleton: `## Quando consultar`, `## Padrões sênior`, `## Anti-padrões`, `## Critérios de decisão`, `## Referências externas` (5 seções obrigatórias)
- [ ] Zero placeholders `[A DEFINIR]`, `TODO`, `FIXME` no corpo
- [ ] `wc -l` reporta ≤200 linhas
- [ ] `docs/knowledge/rails/INDEX.md` skeleton criado listando apenas o piloto + nota de provisoriedade
- [ ] `bun run test -- --grep 'rails_versions optional'` passa (fase-02 não regrediu)
- [ ] Helper `validateAtomFrontmatter` retorna `{ valid: true, errors: [] }` para o piloto
- [ ] STATE.md tem bloco "Piloto extraído (Plano 01 fase-04)" com fonte canônica + compass + linhas
- [ ] Prompt do subagente extrator (em transcripts da execução ou anexado ao STATE.md) confirmou inclusão verbatim da "REGRA DE FIDELIDADE" — sem parafrase

---

## Criterio de Aceite

**Por maquina:**
- `wc -l docs/knowledge/rails/atoms/rails-conventions-and-magic.md` retorna ≤200
- `grep -c "^## " docs/knowledge/rails/atoms/rails-conventions-and-magic.md` retorna 5 (cinco seções H2 obrigatórias)
- `grep -E "^(topic|stack|layer|sources|tier|triggers|related_skills|updated|rails_versions):" docs/knowledge/rails/atoms/rails-conventions-and-magic.md` retorna 9 linhas (9 campos do frontmatter)
- `bun run test -- --grep 'fixture combinada'` continua verde

**Por humano:**
- Conteúdo do piloto NÃO contém detalhes técnicos (números, libs, comandos) que não apareçam nas fontes listadas em `sources:` — humano faz spot-check de 2-3 claims rastreando para o source antes de aprovar fase-05
- Linguagem é assertiva ("Use Zeitwerk para autoload moderno"), não vaga ("Considere usar autoload")
- Snippets Ruby (se presentes) usam Ruby idiomático moderno (Rails 7.1+) — heredoc, `&.`, pattern matching quando aplicável

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->

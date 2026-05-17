<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline a registrar.
O verifier é um subagente isolado; seu prompt vive nesta fase como spec, não como código.
-->

# Fase 06: Verifier sanity check + auditoria humana

**Plano:** 05 — Atom Batch B
**Sizing:** 1-1.5h (verifier ~30min + auditoria humana ~45min + retrabalho buffer ~15min)
**Depende de:** fase-01, fase-02, fase-03, fase-04, fase-05 (todos os 5 átomos escritos)
**Visual:** false

---

## O que esta fase entrega

Gate de qualidade do Batch B (CA-08): subagente verificador roda sample audit (≥80% das claims rastreáveis para passagens específicas da fonte) em cada um dos 5 átomos, em invocações isoladas independentes; em seguida, humano amostra 3 átomos (**1 thin + 2 tier 2 distintos** — divergência operacional registrada como DI-3 porque Batch B não tem tier 1 nem tier 3) para checklist visual. Veredito do batch registrado em MEMORY.md como DI-5. Se algum átomo falhar verifier OU auditoria humana, abre retrabalho na fase do átomo afetado e re-roda fase-06.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/nodejs-typescript/atoms/api-design-stack-specific.md` | Read | input do verifier (fase-01, thin) |
| `docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md` | Read | input do verifier (fase-02, thin + RF8 primordials) |
| `docs/knowledge/nodejs-typescript/atoms/testing-strategy.md` | Read | input do verifier (fase-03, tier 2 full) |
| `docs/knowledge/nodejs-typescript/atoms/architecture-conventions.md` | Read | input do verifier (fase-04, tier 2 full) |
| `docs/knowledge/nodejs-typescript/atoms/dependencies-supply-chain.md` | Read | input do verifier (fase-05, tier 2 full) |
| `claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` | Read | audit trail RF8/D12 — confirmar que ainda existe na fonte |
| `docs/exec-plans/active/2026-05-16-stack-knowledge-nodejs-typescript/plano05/MEMORY.md` | Modify | registrar veredito final do batch como DI-5 |

---

## Implementacao

### Passo 1: Spawn subagente verificador isolado por átomo (5 invocações em paralelo possíveis)

Prompt do verifier (verbatim — usar este prompt sem modificações, mesmo prompt usado no Plano 04 fase-06 para consistência):

```
Você é um subagente verificador isolado, sem contexto prévio do projeto.
Sua única tarefa: validar fidelidade de um átomo Markdown contra sua fonte de origem.

INPUT:
- Caminho do átomo: docs/knowledge/nodejs-typescript/atoms/{slug}.md
- Caminho das fontes (frontmatter `sources:`): claude-code/knowledge/Nodejs/wf-{compass-id}.md
  (Se a fonte for skill, ex: nodejs-core/rules/{nome}.md, o path é claude-code/knowledge/Nodejs/nodejs-core/rules/{nome}.md.
   Se a fonte for skill package, ex: nodejs-backend-patterns/SKILL.md, o path é claude-code/knowledge/Nodejs/nodejs-backend-patterns/SKILL.md.)

PROTOCOLO:
1. Leia o átomo na íntegra.
2. Leia as fontes listadas no frontmatter `sources:` na íntegra.
3. Selecione 5 claims aleatórias do átomo (idealmente 1 por seção: Quando consultar,
   Padrões sênior, Anti-padrões, Critérios de decisão, Referências externas). Claim = afirmação
   técnica concreta (ex: "Vitest é ESM-first e oferece HMR via Vite plugin").
4. Para CADA claim, identifique a PASSAGEM ESPECÍFICA da fonte que a sustenta. Reporte:
   - Claim: <texto exato do átomo>
   - Citação da fonte: <parágrafo ou linhas X-Y do arquivo de fonte; transcrever as linhas relevantes>
   - Veredito: rastreada | parafrase aceitavel | nao encontrada
5. Calcule a taxa: (rastreada + parafrase aceitavel) / 5.
6. Reporte PASS se taxa >= 0.80 (4/5 ou 5/5). Reporte FAIL caso contrário, com lista das claims problemáticas.

REGRAS:
- Não invente passagem. Se não achar, marque "nao encontrada" e diga o que procurou.
- Paráfrase aceitável = mesma ideia técnica em palavras diferentes. Paráfrase com mudança de
  semântica (ex: "npm ci falha se lock divergir" vs fonte "npm ci instala usando lock pinado, sem regenerar")
  é "nao encontrada" se a invariante operacional não estiver na fonte.
- Não consulte conhecimento prévio sobre Node.js — só a fonte importa.
- Para átomos thin (api-design-stack-specific, security-stack-specific): a auditoria deve verificar
  ESPECIFICAMENTE que claims não duplicam princípios cross-stack que pertencem à skill relacionada.
  Se uma claim parecer genérica (ex: "use HTTPS"), marque "nao encontrada" mesmo que a fonte mencione,
  porque o thin não deveria carregar conteúdo cross-stack.

OUTPUT: relatório markdown com 5 entradas (1 por claim) + veredito final.
```

Spawn 5 subagentes em paralelo (uma invocação por átomo). Cada subagente:
- Recebe `{slug}` + lista de `{compass-id}` ou skill paths extraída do frontmatter
- Lê o átomo + as fontes correspondentes
- Produz relatório no formato acima
- Retorna PASS ou FAIL + relatório

**Sources por átomo (referência rápida para o despacho):**

| Slug | Sources (frontmatter) | Paths absolutos para o verifier |
|---|---|---|
| `api-design-stack-specific` | `research: 26cc8f92`, `skill: nodejs-backend-patterns/SKILL.md` | `wf-26cc8f92.md` + `nodejs-backend-patterns/SKILL.md` |
| `security-stack-specific` | `research: security-guide`, `skill: nodejs-core/rules/primordials.md` | `wf-security-guide.md` + `nodejs-core/rules/primordials.md` |
| `testing-strategy` | `research: ab2553f8` | `wf-ab2553f8.md` |
| `architecture-conventions` | `research: 3f1af213`, `skill: nodejs-best-practices/SKILL.md`, `skill: nodejs-backend-patterns/SKILL.md` | `wf-3f1af213.md` + `nodejs-best-practices/SKILL.md` + `nodejs-backend-patterns/SKILL.md` |
| `dependencies-supply-chain` | `research: deps-kb` | `wf-deps-kb.md` |

### Passo 2: Auditoria humana — 3 átomos amostrados (1 thin + 2 tier 2 distintos)

**Divergência operacional registrada como DI-3:** Batch B não contém átomos tier 1 nem tier 3. Operacionalizar CA-08 como "1 thin + 2 tier 2 distintos" (de clusters temáticos diferentes — não os 2 thin, não os 2 mais parecidos).

Sugestão de amostragem (registrar em MEMORY.md se mudar):
- **Thin:** `security-stack-specific.md` (fase-02) — escolhido entre os 2 thin porque carrega a migração RF8/D12 do `primordials.md` (maior risco de drift de fonte cross-arquivo); valida que o conteúdo migrado é fiel + que o thin não absorveu cross-stack de `/security`.
- **Tier 2 #1:** `testing-strategy.md` (fase-03) — cluster temático "qualidade" (Vitest/Jest/Stryker/Pact); valida que diferentes runners estão diferenciados por trade-off concreto.
- **Tier 2 #2:** `architecture-conventions.md` (fase-04) — cluster temático "estrutura" (layered/modular/DI/monorepo); valida que 112 regras condensaram em ~8-12 patterns transversais (não lista de 112 bullets); valida cluster diferente do tier 2 #1.

Alternativa válida (se auditor preferir): `api-design-stack-specific.md` (thin) + `testing-strategy.md` (tier 2) + `dependencies-supply-chain.md` (tier 2). Justificar mudança em MEMORY.md DI-3.

Checklist humano (3 átomos, ~15min cada):

- [ ] Skeleton respeitado: 5 seções na ordem (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas)
- [ ] Frontmatter com 8 campos na ordem do piloto (zero drift)
- [ ] Zero placeholders `[A DEFINIR]`
- [ ] `wc -l` retorna entre 60-90 (thin) ou 100-150 (tier 2 full)
- [ ] Parágrafos lem como senior Node+TS (não bullets genéricos de tutorial)
- [ ] Patterns têm Problema + Padrão + Quando usar/NÃO — não só título
- [ ] Triggers do frontmatter são keywords que dev sênior digitaria (sem inventar termos)
- [ ] Citação de skills relacionadas em "Referências externas" é coerente com `_catalog.md` cluster→skill mapping
- [ ] **Específico thin:** nenhuma claim duplica princípio cross-stack que `/api-design` ou `/security` cobre (idempotência, OWASP genérico, JWT, REST URL design, etc.)
- [ ] **Específico security-stack-specific.md (se amostrado):** pelo menos 1 pattern cobre primordials/prototype pollution (RF8/D12); `nodejs-core/rules/primordials.md` ainda existe na fonte (audit trail RF11)

### Passo 3: Registrar veredito do batch em MEMORY.md (DI-5)

Adicionar entrada em `MEMORY.md > Decisoes de Implementacao`:

```
- **DI-5:** Batch B {aprovado | reprovado} em {YYYY-MM-DD} por {auditor}
  - Verifier subagente: {5/5 PASS | N/5 PASS, falhas em <slugs>}
  - Auditoria humana: {3/3 OK | falha no atomo <slug>: <motivo>}
  - Amostragem auditoria humana: 1 thin (<slug>) + 2 tier 2 (<slug>, <slug>)
  - RF8 (primordials migration): {verificado — primordials.md ainda existe na fonte | NÃO verificado — bloquear approval}
  - Próximo passo: {desbloqueia Plano 06 fase-04 (INDEX) | retrabalho em fase-NN}
```

### Passo 4: Retrabalho condicional

Se algum átomo falhar verifier OU auditoria humana:
1. Identificar a fase do átomo afetado (fase-01..05)
2. Re-executar a fase (revisar conteúdo, ajustar claims contra fonte)
3. Re-rodar **apenas a invocação do verifier** para esse átomo + re-checar manualmente
4. Atualizar MEMORY.md DI-5 com nova rodada (DI-5 → DI-5-revisao-1)

Se múltiplos átomos falharem (>=2/5), revisar prompt do verifier (pode estar permissivo ou estrito demais) antes de re-rodar — registrar mudança em MEMORY.md.

---

## Gotchas

- **G3 do plano (verifier subagente é isolado):** o prompt do verifier OBRIGA citar passagem específica da fonte para cada claim. Aceitar relatório sem citação concreta = false-positive. Se o verifier devolver "rastreada" sem trecho transcrito, REJEITAR o relatório e re-spawnar com prompt reforçado.
- **G4 do plano (auditoria humana é bloqueante):** 3 átomos amostrados antes de aprovar batch. Sem auditoria humana, CA-08 não está cumprido — bloquear Plano 06 fase-04.
- **G8 do plano (RF8 verification):** auditor humano DEVE verificar (1) que `security-stack-specific.md` contém pelo menos 1 pattern cobrindo primordials/prototype pollution, (2) que `claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` ainda existe na pasta fonte como audit trail. Se qualquer das duas verificações falhar, bloquear approval e abrir retrabalho em fase-02.
- **Nota de divergência PRD vs PLAN (registrada em MEMORY.md como DI-3):** PRD CA-08 diz "1 tier 1 + 1 tier 2 + 1 tier 3"; Plano 05 não tem tier 1 nem tier 3 — operacionalizar como "1 thin + 2 tier 2 distintos". Decisão fica em MEMORY.md como DI-3. Plano 06 fase-06 fará a auditoria com a regra literal do PRD (terá tier 3).
- **Local — paralelismo dos 5 verifiers:** invocações isoladas evitam context bleed. Não usar 1 subagente para auditar os 5 átomos em sequência (degradação de contexto + viés cross-átomo).
- **Local — relatórios do verifier devem ficar em arquivo:** sugerir salvar em `tmp/verifier-batch-b/{slug}-report.md` para auditoria posterior. Não precisa commitar — descartar após fase-06 fechar.
- **Local — verifier dos átomos thin requer atenção extra:** o prompt verbatim já cobre o caso ("se claim parecer genérica, marque nao encontrada mesmo que a fonte mencione"), mas reforçar manualmente que claims sobre OWASP/REST URL/idempotência cross-stack são automaticamente "fora de escopo" para os thin.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é gate de qualidade, não escrita de átomo. Verificação é veredito do batch.

### Checklist

- [ ] 5 invocações de verifier subagente concluídas (1 por átomo)
- [ ] Cada relatório de verifier contém: 5 claims + citação da fonte + veredito por claim + veredito final PASS/FAIL
- [ ] Cada relatório PASS tem taxa ≥80% (4/5 ou 5/5 claims rastreáveis/parafrase aceitável)
- [ ] Cada FAIL tem lista de claims problemáticas + abre retrabalho na fase do átomo
- [ ] Auditoria humana de 3 átomos amostrados concluída (1 thin + 2 tier 2 distintos — DI-3)
- [ ] Checklist humano marcado em cada átomo amostrado (skeleton + frontmatter + lem-como-sênior + triggers)
- [ ] **RF8/D12 verificado:** `security-stack-specific.md` contém pattern de primordials + `claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` existe na fonte
- [ ] Veredito do batch registrado em MEMORY.md como DI-5 (data + auditor + resultado por átomo + amostragem + RF8 status)
- [ ] Se algum átomo falhou: retrabalho aberto + re-verifier rodado + DI-5 atualizada com nova rodada
- [ ] CA-08 (PRD + PLAN.md) marcado como cumprido apenas após batch aprovado

---

## Criterio de Aceite

**Por maquina:**
- 5 arquivos em `tmp/verifier-batch-b/{slug}-report.md` (ou diretório equivalente) contendo o relatório de cada verifier
- `grep "Veredito final: PASS"` em todos os 5 relatórios retorna 5 matches (após retrabalho se necessário)
- MEMORY.md contém entrada `DI-5` com `Batch B aprovado em YYYY-MM-DD`
- `wc -l` em cada um dos 2 átomos thin retorna entre 60 e 90
- `wc -l` em cada um dos 3 átomos tier 2 full retorna entre 100 e 150
- `grep -c '\[A DEFINIR\]'` em cada um dos 5 átomos retorna 0
- `test -f claude-code/knowledge/Nodejs/nodejs-core/rules/primordials.md` exit 0 (audit trail RF8/D12)
- `grep -c 'primordials\|__proto__\|Object\.create(null)' docs/knowledge/nodejs-typescript/atoms/security-stack-specific.md` retorna ≥1 (RF8 cumprido)

**Por humano:**
- Auditor confirma os 3 átomos amostrados passam no checklist visual (skeleton + frontmatter + lem-como-sênior)
- Nenhum dos átomos amostrados duplica conteúdo cross-stack de skill relacionada (diferencial Node+TS claro — especialmente nos 2 thin)
- CA-08 cumprido: 80% claims rastreáveis (por verifier) + auditoria humana de 3 átomos (por humano) — gate explícito para destrancar Plano 06 fase-04
- RF8/D12 cumprido: primordials migrado inline em security-stack-specific.md e fonte preservada como audit trail

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

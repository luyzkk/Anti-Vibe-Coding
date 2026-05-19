# Memoria: Plano 02 — Batch A T1 + Batch B parcial T2 + verifier refined + audit humano CA-08

**Feature:** Stack Knowledge Layer — Rails (v6.3.3)
**Iniciado:** 2026-05-18
**Concluido:** 2026-05-18
**Status:** done (9/9 fases — Batch A T1 + Batch B parcial T2 aprovado por Luiz)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (veredito do batch, fase-09):** **Batch A T1 + Batch B parcial T2 APROVADO em 2026-05-18 por Luiz.**
  - Verifier refined: **8/8 PASS** (1 verifier subagente paralelo por atomo, taxa 5/5 cada)
  - Audit humano CA-08: **2/2 OK** — `active-record-fundamentals` (T1) e `action-view-and-hotwire` (T2) aprovados por Luiz; 3/3 claims cross-check rastreaveis em ambos
  - Total claims auditadas: **40** (8 atomos x 5 claims cada)
  - Taxa global rastreabilidade: **40/40 = 100%** (meta D12 era >=80%; replica exatamente a taxa do piloto Plano 01 fase-06)
  - Citacoes verificadas (amostras): Homakov/Preston-Werner em wf-8afc0f40 §11 (security); RAILS-SEC-040/060/001/080; SKILL.md AR fundamentals; form_helpers.md + working_with_javascript_in_rails.md (Hotwire); wf-1d48ebbc linhas 125/988/282/424 (caching); wf-0deebe76 linhas 106/510; wf-3e82e3be linhas 1094/1240
  - Relatorios verifier: `tmp/verifier-batch-rails-02/{slug}-report.md` (8 arquivos, nao commitados conforme spec — audit trail temporario)
  - **Proximo passo:** desbloqueia Plano 03 fase-01..05 (Batch C — 5 atomos restantes: performance-and-tuning, deployment-with-kamal, action-cable-and-realtime [flagged T3], action-mailer-and-mailbox, active-storage) + fase-06 (INDEX final D9)

- **DI-Plano02-fase01 (active-record-fundamentals):** anti-drift forcou corte de 3 topicos previstos na spec mas nao rastreaveis as fontes reais — AR Encryption (Rails 7+ `encrypts :doc, deterministic: true`), Multiple Databases (`connects_to`), e `dependent: :destroy_async`. Nenhum dos 4 sources (rails-stack-conventions/SKILL.md, rails-expert/SKILL.md, rails-code-review/REVIEW_CHECKLIST.md, compass wf-cb73df7d) cobre esses topicos. Impacto: 129 ln em vez de alvo 150; 7 patterns + 5 anti-patterns ainda dao cobertura solida do nucleo AR.

- **DI-Plano02-fase02 (active-record-migrations-safety):** compass artifact wf-9d10f3ac listado na spec era sobre Rails API Design, nao migrations — removido de sources apos grep zero claims rastreaveis. PITFALLS.md tambem inexistente em rails-migration-safety/. Atomo construido de SKILL.md + PATTERNS.md somente. 121 ln, 7 patterns + 4 anti-patterns.

- **DI-Plano02-fase03 (action-controller-and-routing):** sources corrigidas via Glob antes do frontmatter — PATTERNS.md (rails-stack-conventions), BACKENDS.md (mesma pasta), e rails-expert/REVIEW_CHECKLIST.md NAO existem no disco. Substituidos por SKILL.md/SKILL.md/references/api-development.md. Secao API-only (G7 + D7) embutida entre Criterios e Referencias → 6 H2 em vez de 5. 134 ln.

- **DI-Plano02-fase04 (security-csrf-and-brakeman):** compass wf-fd78fcce listado na spec teve 0 matches para termos de seguranca (csrf|brakeman|csp|mass-assign|strong-param|sql-inject) — REMOVIDO. Sources reforcadas com 2 compass artifacts novos descobertos via grep: wf-8afc0f40 (Segurança Idiomática em Rails, 90 matches — cobre verbosamente todos os padroes) + wf-a0aa55c4 (Tooling Sênior Rails, 38 matches Brakeman CI integration). PATTERNS.md e REVIEW_CHECKLIST.md inexistentes em rails-security-review/ (so SKILL.md + PITFALLS.md). 129 ln, 6 H2 com API-only.

- **DI-Plano02-fase05 (rspec-and-minitest):** D21 aplicado com sucesso — 5 patterns abstratos cada um com snippet RSpec + snippet Minitest sem secoes separadas. compass wf-61b9b080 listado na spec teve 0 matches TDD — REMOVIDO; wf-cb73df7d mantido com 201 matches (fonte primaria). PATTERNS.md/REVIEW_CHECKLIST.md inexistentes em rails-tdd-slices (so SKILL.md); PITFALLS.md tambem ausente em rails-expert. 198 ln — proximo do hard cap 200, mas com 5 patterns + snippets duplos era inevitavel. 1 pattern adicional (`parallelize` para fast suite) ficou so na tabela de criterios para nao estourar (G1 do plano confirmado).

- **DI-Plano02-fase06 (active-job-and-solid-queue):** Rails 8+ (Solid Queue) contextualizado no corpo via patterns dedicados em vez de splittar atomo. rails_versions=['>=7.1'] mantido — Solid Queue e padrao em Rails 8 mas roda em 7.1+ como gem opcional. Path error capturado: spec listava `rails-stack-conventions/BACKENDS.md` mas arquivo real e `rails-background-jobs/BACKENDS.md`. Subagente corrigiu via Glob antes de fixar frontmatter. 142 ln, 5 H2.

- **DI-Plano02-fase07 (action-view-and-hotwire):** atomo T2 flagged para audit humano CA-08 (D14) — Stimulus controllers + Turbo Frames/Streams sao territorio editorial onde nuance importa. 127 ln, 5 H2. Anti-drift cortou Turbo Stream broadcast syntax (`broadcasts_to` no model) — fonte mencionava o conceito mas nao o snippet exato; subagente preferiu nao injetar.

- **DI-Plano02-fase08 (caching-with-rails):** wf-9d10f3ac listado na spec REMOVIDO (0 matches caching/fragment/russian-doll). wf-1d48ebbc adicionado (cobre HTTP caching + ETag/Last-Modified verbosamente). Solid Cache contextualizado como pattern Rails 8+ no corpo (analogo a fase-06). Russian doll caching syntax cortada por anti-drift — fonte mencionava o conceito mas dependeria de exemplo nao-rastreavel; subagente listou na tabela de criterios apenas. 120 ln, 5 H2.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Esperado preencher se algum extrator falhar verifier v1. Exemplo:
- **BUG-1:** Extrator de fase-NN injetou claim "X tem N% overhead" não-presente na fonte
  - Causa: anti-drift clause não estava verbatim no prompt — foi parafraseado
  - Fix: re-spawn extrator com texto LITERAL da compound lesson colado no prompt; claim removido; re-verifier passou
  - Fase afetada: fase-NN
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Esperado preencher se descobrir gotcha novo. Candidatos a observar:
- **GT-1:** Algum padrão Rails 8 (Solid Queue/Solid Cache) tem comportamento divergente entre 8.0 e 8.1 — frontmatter precisa especificar `['>=8.0', '<8.1']` para um subset; ou a documentação oficial não cobre o caso
- **GT-2:** Subagente extrator de `rspec-and-minitest` (fase-05) tentou criar seções separadas (violando D21) — solução: prompt explicitar "layout framework-agnostic com snippets duplos POR padrão; NÃO criar seções RSpec/Minitest separadas"
- **GT-3:** Verifier marcou claim de API-only mode (fase-03/04) como "não encontrada" — confirmação de G7 do README: a seção API-only é scaffolding editorial, deve ser excluída do audit por design
-->

- **GT-Plano02-batch1:** specs das fases 01-08 listam paths de fontes que NAO existem no disco. Padrao consistente nas 3 fases do batch 1: `PATTERNS.md`, `PITFALLS.md`, `BACKENDS.md`, `REVIEW_CHECKLIST.md` aparecem na spec como sources mas algumas pastas em `claude-code/knowledge/Rails/` so tem `SKILL.md` + `references/`. Causa raiz: spec foi escrita sob hipotese de estrutura uniforme entre skills package; na realidade cada pasta tem layout proprio. Mitigacao: subagentes extratores DEVEM Glob/ls a pasta canonica ANTES de fixar frontmatter `sources:`. Replicar instrucao em prompts das fases 04-08 (ja embutida no prompt do orquestrador atual). Verifier refined da fase-09 vai validar paths existem — se nao existem, blocker.

- **GT-Plano02-fase02:** compass artifacts em `claude-code/knowledge/Rails/` cobrem dominios HETEROGENEOS — wf-9d10f3ac e API Design, wf-cb73df7d e testing, etc. NAO assumir que um wf-* relacionado por proximidade alfabetica/temporal cobre o atomo planejado. Subagente deve `grep` por termos-chave do dominio no compass antes de incluir em `sources:`. Se zero claims rastreaveis, REMOVER (anti-drift > completude editorial).

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-08 (caching-with-rails) planejou cobrir HTTP caching + fragment + Russian doll + Solid Cache mas estourou 200 linhas
  - Motivo: HTTP caching (etag/last-modified) tem 3 padrões e 2 anti-padrões próprios; cortar deixaria buraco
  - Resolução: HTTP caching virou backlog v6.3.4+ como átomo dedicado `http-caching-with-rails.md`; átomo principal foca em Solid Cache + fragment + Russian doll
  - Aprovado pelo dev (Luiz) em sessão
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 9 |
| Fases concluidas | 9 |
| Fases com desvio | 0 (todas dentro do escopo; cortes anti-drift = decisao planejada, nao desvio) |
| Bugs encontrados | 0 |
| Retries do verifier | 0 (anti-drift agressivo desde piloto entregou 8/8 PASS na primeira rodada) |
| Átomos que atingiram cap 200 ln | 0 (maior: rspec-and-minitest 198 ln — 1% folga; todos os demais ≤142 ln) |
| Total linhas dos 8 átomos | 1100 (129+121+134+129+198+127+142+120 = 1100 ln — abaixo do alvo 1.150-1.200, gracas a anti-drift) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (03) PRECISA saber antes de comecar.
O subagente do Plano 03 le este campo.

### Frontmatter exato dos 8 átomos novos (template real para os 6 átomos do Plano 03)

Estrutura YAML usada nos 8 átomos do Batch A+B parcial (preencher slugs/sources reais após execução):

```yaml
---
topic: {slug-kebab-case}
stack: rails
layer: backend | frontend | both
sources:
  - claude-code/knowledge/Rails/{pasta-canonica-X}/{arquivo}.md
  - claude-code/knowledge/Rails/compass_artifact_wf-{uuid}_text_markdown.md
tier: 1 | 2
triggers: [keyword1, keyword2, keyword3, keyword4, keyword5, keyword6, keyword7]
related_skills: [/security, /api-design, /system-design, /design-patterns, /architecture, /infrastructure, /tdd-workflow]
updated: 2026-05-18
rails_versions: ['>=7.1']  # ou ['>=8.0'] para padrões Rails 8 exclusivos; omitir se universal
---
```

Plano 03 deve copiar este template verbatim para os 6 átomos restantes (`performance-and-tuning`, `deployment-with-kamal`, `action-cable-and-realtime`, `action-mailer-and-mailbox`, `active-storage`) — exceto que `deployment-with-kamal` usa `['>=8.0']` (Kamal 2 default) e `action-cable-and-realtime` é flagged para audit humano (D14).

### Claims que falharam verifier (se houver) e como foram corrigidas

**Zero claims falharam.** Batch 8/8 PASS na primeira rodada (taxa global 40/40 = 100%). Anti-drift agressivo (claims cortadas durante extracao por subagentes) preveniu drift downstream. Plano 03 fase-07 (verifier batch C) pode usar o mesmo prompt verbatim — comprovadamente calibrado.

### Decisões dos 2 átomos flagged: o que Luiz aprovou e por quê

**Audit humano CA-08 concluido em 2026-05-18:**

- **`active-record-fundamentals` (T1):** APROVADO por Luiz. Cross-check 3/3 claims rastreaveis (verifier auditou 5/5 contra rails-code-review/REVIEW_CHECKLIST.md + rails-expert/SKILL.md + rails-stack-conventions/SKILL.md). DI-Plano02-fase01 documenta os cortes anti-drift (AR Encryption + Multiple DBs + dependent: :destroy_async) — confirmacao Luiz: cortes corretos.
- **`action-view-and-hotwire` (T2):** APROVADO por Luiz. Cross-check 3/3 claims rastreaveis (verifier auditou 5/5 contra form_helpers.md + layouts_and_rendering.md + working_with_javascript_in_rails.md + compass wf-a0aa55c4). Patterns Hotwire (Turbo Frames/Streams + Stimulus) lem como Rails 7+ idiomaticos, nao tutorial Guides.

Notas guardadas para audit humano do `action-cable-and-realtime` no Plano 03 fase-07 (terceiro atomo flagged, T3 — replicar mesmo protocolo: 1 verifier refined + cross-check humano 3/3 claims).

### Total linhas por átomo (calibração para batch C)

| Átomo | Tier | Linhas reais | Atingiu cap? |
|-------|------|--------------|--------------|
| active-record-fundamentals | 1 | 129 | nao (~65% do cap) |
| active-record-migrations-safety | 1 | 121 | nao (~60%) |
| action-controller-and-routing | 1 | 134 (com API-only D7) | nao (~67%) |
| security-csrf-and-brakeman | 1 | 129 (com API-only D7) | nao (~65%) |
| rspec-and-minitest | 1 | 198 (D21 dual snippets) | quase (99% — 1 pattern foi p/ tabela) |
| action-view-and-hotwire | 2 | 127 | nao (~64%) |
| active-job-and-solid-queue | 2 | 142 | nao (~71%) |
| caching-with-rails | 2 | 120 | nao (~60%) |

**Calibracao para Batch C (Plano 03):** alvo 140-160 ln/atomo se mantem; 5 dos 8 ficaram abaixo de 140 ln — significa que anti-drift corta mais do que esperado. Plano 03 pode aceitar atomos 110-150 ln como saudaveis (sinal de fidelidade, nao de incompletude).

### Conteúdo cortado (backlog v6.3.4+)

Cortes anti-drift consolidados (nao viraram backlog explicito por ora — registrados aqui para Plano 03/v6.3.4 reaver):

- **active-record-fundamentals** (fase-01): AR Encryption (`encrypts :doc, deterministic: true`), Multiple Databases (`connects_to`), `dependent: :destroy_async` — nao rastreaveis aos 4 sources existentes
- **action-view-and-hotwire** (fase-07): Turbo Stream broadcast model-side syntax (`broadcasts_to`) — fonte mencionava conceito, sem snippet rastreavel
- **caching-with-rails** (fase-08): Russian doll caching syntax — fonte mencionava conceito, dependeria de exemplo nao-rastreavel
- **rspec-and-minitest** (fase-05): pattern `parallelize` (fast suite) — ficou so na tabela de criterios para nao estourar cap 198

Plano 03/v6.3.4 pode revisitar se sources adicionais (compass novos, Rails 8 docs) forem incorporados.

---

<!-- Atualizado automaticamente durante execucao -->

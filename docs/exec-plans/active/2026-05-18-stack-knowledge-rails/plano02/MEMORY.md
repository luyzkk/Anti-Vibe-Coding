# Memoria: Plano 02 — Batch A T1 + Batch B parcial T2 + verifier refined + audit humano CA-08

**Feature:** Stack Knowledge Layer — Rails (v6.3.3)
**Iniciado:** {YYYY-MM-DD ao executar}
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Esperado preencher durante /execute-plan. Candidatos a observar:
- **DI-1:** Veredito do batch (fase-09) — "Batch A+B parcial aprovado em YYYY-MM-DD por Luiz"
  - Verifier refined: {8/8 PASS | N/8 PASS, falhas em <slugs>}
  - Audit humano CA-08: {2/2 OK (AR fundamentals + Hotwire) | falha no atomo <slug>: <motivo>}
  - Próximo passo: {desbloqueia Plano 03 fase-01..05 (Batch C) + fase-06 (INDEX) | retrabalho em fase-NN}
- **DI-2:** Decisão sobre alguma fonte canônica não óbvia (ex: par com mtime idêntico e conteúdo divergente — escolha justificada)
- **DI-3:** Decisão sobre conteúdo que estourou cap 200 (qual seção foi cortada, qual virou backlog v6.3.4+)
-->

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
| Fases concluidas | {preencher durante execução} |
| Fases com desvio | {preencher} |
| Bugs encontrados | {preencher} |
| Retries do verifier | {preencher — esperado 0 com anti-drift desde piloto} |
| Átomos que atingiram cap 200 ln | {preencher} |
| Total linhas dos 8 átomos | {preencher — alvo ~1.150-1.200 ln total} |

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

{Preencher durante execução. Input para fase-07 do Plano 03 (verifier batch C) calibrar o prompt:}

- Fase-NN, claim "<texto>": fonte declarava X mas átomo escreveu Y; correção: removida (não há equivalente na fonte) | reescrita: "<texto novo>" (passou v2)
- Total claims FAIL no batch: N/40 (8 átomos × 5 claims auditadas cada)

Se taxa de FAIL > 10%, sinalizar para o Plano 03 reforçar o prompt do extrator antes de Batch C.

### Decisões dos 2 átomos flagged: o que Luiz reprovou/aprovou e por quê

{Preencher após audit humano CA-08:}

- **`active-record-fundamentals` (T1):** {aprovado | reprovado}; motivos: {ex: "padrão X muito genérico, sem nuance Rails — reescrever citando includes vs preload vs eager_load com exemplo concreto"}
- **`action-view-and-hotwire` (T2):** {aprovado | reprovado}; motivos: {ex: "Turbo Frames bem coberto; Stimulus controllers naming conv. precisa exemplo do controller_class naming"}

Notas guardadas para audit humano do `action-cable-and-realtime` no Plano 03 fase-07 (terceiro átomo flagged, T3).

### Total linhas por átomo (calibração para batch C)

{Preencher após execução. Alvo 140-160 ln/átomo, hard cap 200:}

| Átomo | Tier | Linhas reais | Atingiu cap? |
|-------|------|--------------|--------------|
| active-record-fundamentals | 1 | ? | ? |
| active-record-migrations-safety | 1 | ? | ? |
| action-controller-and-routing | 1 | ? | ? |
| security-csrf-and-brakeman | 1 | ? | ? |
| rspec-and-minitest | 1 | ? | ? |
| action-view-and-hotwire | 2 | ? | ? |
| active-job-and-solid-queue | 2 | ? | ? |
| caching-with-rails | 2 | ? | ? |

### Conteúdo cortado (backlog v6.3.4+)

{Preencher se algum extrator precisou cortar conteúdo para respeitar cap 200:}

- Fase-NN: `{slug}` — cortado: {tópico}; motivo: cap 200; destino: backlog `v6.3.4-rails-extra-{slug-subtema}.md`
- Plano 03 deve revisar este backlog ao planejar v6.3.4+ (não escopo desta feature).

---

<!-- Atualizado automaticamente durante execucao -->

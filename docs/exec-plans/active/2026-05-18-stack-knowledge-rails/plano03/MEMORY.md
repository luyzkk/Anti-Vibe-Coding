# Memoria: Plano 03 — Batch C + INDEX final + E2E completo + Hardening leve

**Feature:** Stack Knowledge Layer — Rails (v6.3.3)
**Iniciado:** (preenchido no kick-off do /execute-plan)
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1: Veredito Batch C (verifier refined + audit humano CA-08 PENDENTE)**
  - **O que:** PASS global do verifier sobre 5/5 atomos do Batch C; audit humano CA-08 de `action-cable-and-realtime` PENDENTE — requer Luiz.
  - **Por que:** gate de qualidade obrigatorio antes da fase-10 (hardening + RF12). Audit humano CA-08 nao pode ser delegado (D19 explicito).
  - **Detalhes (verifier refined paralelo, 5 subagentes):**
    - performance-and-tuning: PASS (28/30 claims, 93%) — 2 PARCIAIS sao expansoes editoriais corretas (blow-up cardinalidade preload, callbacks bypass insert_all)
    - deployment-with-kamal: PASS (29/30 claims, 97%) — 1 NAO: recomendacao Capistrano para Rails 7.x sem Docker e adicao editorial nao traceavel as 4 fontes listadas
    - action-cable-and-realtime: PASS (30/31 claims, 96.8%) — 1 PARCIAL: mecanismo race condition de after_commit (rule RAILS-HOTWIRE-001 confirmada, texto explicativo nao verbatim). **CA-08 D14/D19: audit humano de Luiz pendente.**
    - action-mailer-and-mailbox: PASS (23/23 claims, 100%) — 2 inferencias razoaveis (ingress aberto sem credenciais, gem active_storage_validations nao nomeado mas comportamento confirmado)
    - active-storage: PASS (20/22 claims, 91%) — 2 PARCIAIS: gem active_storage_validations nao nomeado em wf-8afc0f40 (so `marcel`); rails_blob_url com expires_in: 1.hour nao verbatim. **CVE claims (CVE-2022-21831, CVE-2025-24293, CVSS 9.8, versoes patched) 100% traceaveis.**
  - **Impacto:**
    - Fase-10 (hardening + RF12) PODE prosseguir — qualidade do conteudo aprovada pelo verifier.
    - Marcar Plano 03 COMPLETE bloqueado ate Luiz fazer audit humano de action-cable-and-realtime (CA-08 D14, D19 — D19 explicito que nao pode ser delegado).
  - **Acao Luiz:** quando puder, Read `docs/knowledge/rails/atoms/action-cable-and-realtime.md` + cross-check com fontes (wf-1d48ebbc, wf-3e82e3be, wf-a0aa55c4, deep-research-report (1).md, rails-stack-conventions/SKILL.md) e assinar `Aprovado por Luiz em YYYY-MM-DD` no STATE.md global da feature.

- **DI-2 (RF13):** active-storage promovido T3 → T2 (decisao auto em modo continuo)
  - O que: tier=2 no frontmatter de docs/knowledge/rails/atoms/active-storage.md
  - Por que: o atomo cobre os 3 criterios de promocao T2 definidos em fase-05 spec:
    (1) signed URLs (CVE-2025-24293 CVSS 9.8 mitigation)
    (2) direct uploads com CORS (padrao critico para qualquer app com UGC)
    (3) variants + libvips + named-presets (CVE-2022-21831 mitigation)
    Apps modernas Rails com upload de arquivo enfrentam esses problemas no dia 1.
  - Impacto: INDEX (fase-06) lista active-storage em "Por Tier > T2" + agrupa em /security e /api-design sections.

---

## Findings do Verifier Refined (Batch C — fase-07)

### Verifier refined — performance-and-tuning (T2)
**Veredito:** PASS (28/30 = 93%). Fontes (4): rails-expert/SKILL.md, references/active-record.md, rails-code-review/REVIEW_CHECKLIST.md, compass wf-0deebe76.
**Parciais (2):** "blow-up cardinalidade preload" (inferencia editorial sobre preload=subquery), "insert_all bypassa callbacks" (REVIEW_CHECKLIST lista mas nao detalha bypass).
**Acao:** Nenhuma — parciais sao expansoes editoriais corretas, nao fabricacoes.

### Verifier refined — deployment-with-kamal (T2)
**Veredito:** PASS (29/30 = 97%). Fontes (4): upgrade-7.2-to-8.0.md, upgrade-8.0-to-8.1.md, compass wf-3e82e3be, wf-1d48ebbc.
**Sem fonte (1):** "Capistrano como alternativa legada para Rails 7.x sem Docker" — nenhuma das 4 fontes nomeia Capistrano explicitamente.
**Acao:** Aceitar (D16 reference editorial — Capistrano e fato conhecido Rails, mas claim deveria ter source ou ser removida). Considerar para v6.3.4 fix.

### Verifier refined — action-cable-and-realtime (T3) — **CA-08 PENDENTE**
**Veredito:** PASS (30/31 = 96.8%). Fontes (5): rails-stack-conventions/SKILL.md, compass wf-3e82e3be, wf-1d48ebbc, wf-a0aa55c4, deep-research-report (1).md.
**Parcial (1):** "race condition broadcast antes commit" — rule RAILS-HOTWIRE-001 confirmada (`after_commit` obrigatorio), texto mecanico de race condition nao verbatim na fonte.
**Audit humano CA-08:** PENDENTE — Luiz deve assinar STATE.md global apos cross-check pessoal.

### Verifier refined — action-mailer-and-mailbox (T3)
**Veredito:** PASS (23/23 = 100%). Fontes (4): rails-guides/action_mailer_basics.md, action_mailbox_basics.md, action_text_overview.md, rails-expert/SKILL.md.
**Inferencias razoaveis (2):** "ingress aberto sem credenciais" (cada provider exige credentials → endpoint aberto e consequencia logica), "texto simples sem ActionText" (NOTE sobre join overhead suporta inferencia).
**Acao:** Nenhuma — todos os claims sao traceaveis com inferencia minima.

### Verifier refined — active-storage (T2 promovido RF13)
**Veredito:** PASS (20/22 = 91%). CVE claims 100% sourced. Fontes (3): rails-guides/active_storage_overview.md, compass wf-8afc0f40 (RAILS-SEC-090/091/095), wf-a0aa55c4 (RAILS-SEC-006).
**Parciais (2):** "gem active_storage_validations" (wf-8afc0f40 RAILS-SEC-091 so cita `marcel`), "rails_blob_url(blob, expires_in: 1.hour)" (source mostra rails_blob_path + expires_in em CDN, nao essa combinacao exata).
**Acao:** Aceitar — sao APIs Rails publicas corretas; gem active_storage_validations e wrapper comum em prod. Considerar source adicional na v6.3.4.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo (a preencher durante /execute-plan):
- **BUG-1:** Verifier de action-mailer-and-mailbox marca claim de ActionText como "nao encontrada"
  - Causa: ActionText absorvido sem fonte dedicada — extrator pegou conhecimento prévio
  - Fix: re-extrair com fonte explícita de rails-stack-conventions (seção rich text)
  - Fase afetada: fase-04
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo (a preencher durante /execute-plan):
- **GT-1:** Fixture tests/fixtures/rails-legacy-70 precisa de Gemfile.lock mock (não real)
  - Descoberto em: fase-08
  - Impacto: detector não exige Gemfile.lock, mas E2E test fica determinístico só com lock estável
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo (a preencher durante /execute-plan):
- **DEV-1:** Fase-09 ganhou 3o auditor (database-auditor) por sugestão do code-smell-detector
  - Motivo: code-smell encontrou pattern de migração ad-hoc no schema validator que database-auditor é mais adequado
  - Aprovado pelo dev em sessão
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 9 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Sizing planejado (h) | 12-14 |
| Sizing realizado (h) | (preenchido ao final) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Este é o último plano da feature v6.3.3 — não há "próximo plano".
Notas aqui viram input para:
1. /lessons-learned na fase de captura compound pós-merge
2. v6.3.4+ (Rails knowledge expansion) — backlog de conteúdo excedente que estourou cap 200
3. Próximas stacks (Python, Go) reaproveitando padrão de hardening leve (D15)

Candidatos a registrar ao final da execução:
- Lista de patterns recortados por estourar cap 200 (input v6.3.4+)
- Decisão final de tier de active-storage (DI-2) — pode virar compound se padrão for útil para outras stacks
- Falsos-positivos do verifier que exigiram refinement do protocolo — input para refinar lesson 2026-05-16-verifier-protocol-technical-sections-only.md
- Tempo real gasto em hardening leve (D15) vs Node hardening completo — métrica para próximas stacks decidirem intensidade
-->

---

<!-- Atualizado automaticamente durante execucao -->

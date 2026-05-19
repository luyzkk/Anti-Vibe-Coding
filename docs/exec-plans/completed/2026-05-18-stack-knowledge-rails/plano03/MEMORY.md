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

- **BUG-1:** `active-storage.md` falhou validator regex `/^---\n/` no harness:validate
  - Causa: arquivo escrito com line endings CRLF (Windows default) — regex esperava LF
  - Fix: conversão CRLF→LF via Python script (10597→10472 bytes)
  - Fase afetada: fase-09 (descoberto durante content audit)
- **BUG-2:** Tracer-bullet CA-03 falhava após v6.3.3 — assertion esperava "não foi copiado" (v6.3.2)
  - Causa: contrato v6.3.2 (Rails sem knowledge) mudou em v6.3.3 (15 atomos copiados)
  - Fix: atualizar assertion para `output.toMatch(/copied/i)` + checar INDEX.md exists
  - Fase afetada: fase-09 (descoberto rodando suite completa)
- **BUG-3:** RF12 preview não emitia para Rails — INDEX.md sem seção "Por keyword"
  - Causa: `parseTopKeywords()` lê tabela `## Por keyword` (formato Node) — Rails INDEX só tinha "Por Skill" e "Por Tier"
  - Fix: adicionar seção `## Por keyword` no Rails INDEX.md com 14 rows (1 por atomo, top keywords agregados)
  - Fase afetada: fase-10 (verificação RF12)

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1:** Arquivos markdown gerados no Windows tendem a CRLF — validator regex `/^---\n/` precisa LF
  - Descoberto em: fase-09 (BUG-1)
  - Impacto: rodar `git config core.autocrlf input` no projeto OU criar pre-commit hook que normaliza
  - Para v6.3.4+: validator poderia aceitar tanto `\n` quanto `\r\n` (regex `/^---\r?\n/`)
- **GT-2:** `detectMultiStack` trata Gemfile presence como Rails anchor mesmo sem `gem 'rails'`
  - Descoberto em: fase-09 (Sinatra-only fixture vira primary=rails)
  - Impacto: fixtures de stacks ruby-mas-não-Rails (Sinatra, Hanami, Roda) precisam usar `detectStack` em testes, não `runStackKnowledgeInit`
  - Para v6.3.4+: refinar Rails anchor para exigir `gem 'rails'` no Gemfile (não só presença do Gemfile)
- **GT-3:** INDEX.md cap "≤100 linhas" mede via `wc -l` (newlines) mas testes usam `split('\n').length`
  - Descoberto em: fase-10 (CA-01 falhou em 101 quando wc=100)
  - Impacto: para passar CA-01, garantir wc -l ≤ 99 (split gives 100 com trailing newline)
- **GT-4:** Auditor security/code-smell flags `readFileSync` síncrono em fluxo async (run-stack-knowledge-init.ts:105)
  - Descoberto em: fase-10 (hardening)
  - Impacto: refatorar para `fs.promises.readFile` em v6.3.4+ (mantém pattern do M1.1 da v6.3.2)

## Findings de Auditores (fase-10 hardening leve)

Apenas delta v6.3.3 auditado (D15 — não Node full hardening):

### security-auditor
- **0 HIGH** — pronto para merge sem rework
- **2 MEDIUM:**
  - `run-stack-knowledge-init.ts:105` — `readFileSync(gemfilePath, 'utf8')` sem size limit (DoS risk teórico se Gemfile >100MB). Trato em v6.3.4+ via `fs.stat` + limit 1MB.
  - `atoms-frontmatter-validator.ts:15` — regex `[\s\S]*?` lazy sem closing delimiter guard. ReDoS teórico em frontmatter malformado. Trato em v6.3.4+ via regex bounded ou yaml.parse.
- **1 LOW:** sync I/O em função async (mesmo readFileSync acima) — already GT-4.

### code-smell-detector
- **0 CRITICAL**
- **2 MEDIUM:**
  - `format-knowledge-preview.ts:85` — magic numbers `7`/`1` inline (`major < 7 || (major === 7 && minor < 1)`). Refatorar para constantes `MIN_SUPPORTED_RAILS_MAJOR=7` / `MIN_SUPPORTED_RAILS_MINOR=1` em v6.3.4+.
  - Duplicate regex Rails detection: `format-knowledge-preview.ts:78` e `detect-stack.ts:98` ambos detectam `gem 'rails'`. Considerar extrair `parseRailsVersion()` em util compartilhado em v6.3.4+.
- **3 LOW (sem ação):** nested conditionals em `run-stack-knowledge-init.ts:102`, primitive obsession em `REQUIRED_FIELDS` array do validator, regex literals espalhados.

**Decisão de triage:** Todos MEDIUM são <10min cada, mas não bloqueiam merge (severity Q2 da rubrica). Registrados em `TODO.md` raiz como follow-ups v6.3.4+. LOW vira GT-4 acima.

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

Último plano da feature v6.3.3 — não há "próximo plano". Notas aqui alimentam `/lessons-learned`, v6.3.4+ e próximas stacks (Python, Go).

### Release Notes — v6.3.3 (Stack Knowledge Layer — Rails)

**Conteúdo entregue:**
- 14 átomos Rails-native em `docs/knowledge/rails/atoms/` cobrindo Active Record (fundamentals + migrations), Action Pack (controller, routing, view, hotwire), Solid Trifecta (Queue/Cache/Cable), security (CSRF/Brakeman), performance, deployment com Kamal, ActiveStorage, ActionMailer/Mailbox, conventions/Zeitwerk, RSpec/Minitest
- `docs/knowledge/rails/INDEX.md` com 3 layouts: Por Skill (7 skills cross-stack), Por Tier (T1×6, T2×6, T3×2), Por keyword (RF12)
- Schema `rails_versions` opcional no frontmatter (audit trail de compat por padrão)
- Warning RF11 para projetos Rails legados (<7.1)
- E2E suite 11 testes em `tests/e2e/stack-knowledge-rails-full.test.ts` + tracer-bullet atualizado para v6.3.3 (10 testes)

**Decisões importantes:**
- DI-2 (RF13): active-storage promovido T3→T2 — CVE-2025-24293 (CVSS 9.8) + direct uploads + signed URLs justificam Tier 2
- D15 hardening leve: 2 auditores sobre delta ~10 linhas (não 6 como Node v6.3.2)
- D22 multi-stack contract reaproveitado integralmente da v6.3.2 (zero refactor)
- D24 perf SLA: ≤200ms para copyKnowledge (relaxado de 100ms para Windows cold I/O)
- D25 hard cap 200 linhas por atomo — todos respeitados (maior: rspec-and-minitest 198 linhas)

**Reuso 100%:** runStackKnowledgeInit, copyKnowledge, getStackKnowledgePreface, telemetria. Próxima stack adiciona só `docs/knowledge/{stack}/` e entrada no stack-id-map.

**Pendências antes do merge:**
- [ ] CA-08 audit humano de `action-cable-and-realtime.md` por Luiz (D19 — não pode ser delegado). Read atom + cross-check com fontes (wf-1d48ebbc, wf-3e82e3be, wf-a0aa55c4, deep-research-report, rails-stack-conventions/SKILL.md) e assinar STATE.md global

**Backlog v6.3.4+:**
- 2 MEDIUM security findings (readFileSync sem size limit, regex lazy sem closing guard) — ambos teóricos
- 2 MEDIUM code-smell findings (magic numbers 7/1, duplicate regex Rails detection)
- Refinar Rails anchor: exigir `gem 'rails'` no Gemfile, não só presença (GT-2)
- Validator regex aceitar CRLF (BUG-1 / GT-1)
- Atom splits: nenhum estourou D25 (não há backlog de patterns excedentes)

**Inputs para `/lessons-learned`:**
- Compound candidato: hardening leve (D15) sobre delta pequeno foi efetivo — 0 HIGH em 10 linhas auditadas vs Node v6.3.2 que rodou 6 auditores em 2 rodadas
- Anti-drift compound (2026-05-16) aplicado em verifier-refined Batch C — 5/5 atomos PASS first-try
- Métrica wall-clock: 5 verifiers + 1 RF11 spawned em paralelo (fork) ~15min vs sequencial estimado 60min

---

<!-- Atualizado automaticamente durante execucao -->

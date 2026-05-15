---
slug: init-reuse-discovery
date: 2026-05-15
status: completed
completedAt: 2026-05-15
requires: []
unblocks: [v6.3.0-adaptive-coaching]
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que.
Exemplo: `// 2026-05-15 (Luiz/dev): FRESH_THRESHOLD_MS=24h — alinhado com PRD §Decisão #1`
-->

# PRD: /init `--reuse-discovery` flag (FRESH_THRESHOLD <24h cache)

**Status:** Draft
**Author:** Luiz + AI
**Date:** 2026-05-15
**Context:** Spin-off documentado em `docs/exec-plans/active/2026-05-14-v6.3.0-adaptive-coaching/plano05/MEMORY.md` DEC-1.
**Predecessor:** `docs/exec-plans/completed/2026-05-14-init-migration-mode/PRD.md` (§RF-CH-02 listou como Could Have e nunca foi construído — esta PRD constrói essa peça)
**Sucessor consumidor:** `docs/exec-plans/active/2026-05-14-v6.3.0-adaptive-coaching/plano05/fase-01-init-refresh-flag.md` (depende deste PRD shippar para sair do paused)

---

## Problema

O `/init` é uma skill cara: roda stack detection, scaffold de pastas, AGENTS.md merge, capabilities discovery, audit log — sequência completa leva 2-8 minutos em projetos médios. Quando o desenvolvedor já rodou `/init` recentemente (digamos, mesma manhã) e só quer **atualizar o inventário** (porque adicionou rotas novas em `app/api/`, por exemplo), o fluxo atual obriga a refazer tudo. Tempo gasto + tokens consumidos sem entregar valor adicional.

Pior: skills downstream que dependem de `discovery/capabilities.json` e `discovery/parity-gaps.json` (Plano 05/fase-01 do PRD v6.3.0 — `/init --refresh`) **não conseguem ser construídas** sem uma forma do `/init` saber "o cache anterior ainda vale". Hoje não existe `FRESH_THRESHOLD_MS`, não existe leitura de timestamp do último init, não existe flag de reuso. RF-CH-02 do PRD original do /init (`docs/exec-plans/completed/2026-05-14-init-migration-mode/PRD.md:189`) declarou a intenção como Could Have, mas o trabalho ficou Won't Have de fato.

Impacto direto: o plano05/fase-01 do PRD v6.3.0-adaptive-coaching está bloqueado (status paused desde 2026-05-15) porque seu Passo 0 exige exatamente essa peça. Sem este PRD shippar, o release v6.3.0 fica incompleto OU o `/init --refresh` é deferido para v6.3.1.

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

- O desenvolvedor consegue rodar `/init --reuse-discovery` e, quando o último `/init` foi há menos de 24h, o `/init` pula Fases 0-1 (stack detection, scaffold) e re-executa apenas a Fase 7 (Capabilities Discovery).
- Quando a flag é passada mas o cache está stale (`>=24h`) ou ausente, o `/init` emite um warning explícito e roda o fluxo completo — o usuário entende que pediu o atalho mas não foi possível usá-lo.
- O `/init` exporta um helper público `shouldReuseDiscovery(cachedAt: string | null): boolean` e a constante `FRESH_THRESHOLD_MS` para que outras skills (notadamente o futuro `/init --refresh` do PRD v6.3.0) possam reusar a mesma lógica sem duplicação.
- O comportamento do `/init` sem a flag continua **byte-identical** ao v6.2.x atual — nenhum efeito colateral fora do branch `--reuse-discovery`.

### Mecanismo (algorítmico — o COMO)

1. **Parse da flag.** Helper puro `parseReuseDiscoveryFlag(args: string[]): { reuseDiscovery: boolean }` lê `ARGUMENTS` da skill `/init`. Mirror direto do pattern de `parseDryRunFlag` em `Step migrate.0` (linhas 47-53 do `skills/init/SKILL.md`).

2. **Leitura do timestamp do último init.** Helper puro `readLastInitTimestamp(projectRoot: string): Promise<string | null>` lê `discovery/agents-log.json` e retorna o campo `started_at` (definido em `skills/init/lib/audit-log.ts:32`). Se o arquivo não existe → `null`. Se existe mas JSON inválido → `null` (treat como ausente, fallback seguro).

3. **Decisão fresh/stale.** Helper puro `shouldReuseDiscovery(cachedAt: string | null): boolean`. Retorna `true` se `cachedAt` é ISO válido e `Date.now() - new Date(cachedAt).getTime() < FRESH_THRESHOLD_MS`. Retorna `false` em todos os outros casos (`null`, malformado, ou >=24h). Constante: `FRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000`.

4. **Branching no SKILL.md.** Adicionar `Step reuse-discovery.0` antes do `Passo 0 — Detectar Modo de Inicialização`. Lê a flag; se presente e fresh: skip direto para `Step 7 (Capabilities Discovery)` + audit log entry; se presente e stale: warning + continua fluxo normal; se ausente: comportamento idêntico ao atual.

5. **Audit log.** Quando o reuso for ativado, append entry no `discovery/agents-log.json` com `subagent_id: 'reuse-discovery'`, registrando que o atalho foi tomado e em quanto tempo (`duration_ms`). Permite auditoria pós-fato ("por que esse /init só durou 3s?").

```
fluxo: /init --reuse-discovery
        |
        v
Step reuse-discovery.0
        |
        +-- args.includes('--reuse-discovery')? --no--> fluxo normal (Step 0.5 ...)
        |
       yes
        |
        v
   ler agents-log.json.started_at
        |
        +-- null/malformed? ----yes----> warn "stale/absent — full init" + fluxo normal
        |
        no
        |
        v
   shouldReuseDiscovery(cachedAt)?
        |
        +-- false (>=24h) ----------> warn "stale — full init" + fluxo normal
        |
       true
        |
        v
   skip para Step 7 (Capabilities Discovery)
        |
        v
   append audit entry { subagent_id: 'reuse-discovery', duration_ms }
        |
        v
   exit 0 (sucesso — atalho concluído)
```

---

## Requisitos Funcionais

### Must Have (maximo 40% do total)
- [ ] **RF-MH-01:** Flag `--reuse-discovery` é detectada em `ARGUMENTS` da skill `/init`. Helper `parseReuseDiscoveryFlag` exportado de `skills/init/lib/reuse-discovery.ts`.
- [ ] **RF-MH-02:** Constante `FRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000` exportada do mesmo módulo. Helper `shouldReuseDiscovery(cachedAt: string | null): boolean` retorna `true` apenas quando `cachedAt` é ISO válido E `<24h` atrás.
- [ ] **RF-MH-03:** Helper `readLastInitTimestamp(projectRoot: string): Promise<string | null>` lê `discovery/agents-log.json` e retorna `started_at` (ou `null` em qualquer caso de erro/ausência).
- [ ] **RF-MH-04:** `Step reuse-discovery.0` inserido em `skills/init/SKILL.md` antes do `Passo 0 — Detectar Modo de Inicialização`. Quando ativado fresh: skip para Step 7 e exit. Quando ativado stale: warning + fluxo normal.

### Should Have
- [ ] **RF-SH-01:** Audit log entry com `subagent_id: 'reuse-discovery'` em `discovery/agents-log.json` quando o atalho for usado. `output_struct` inclui `cache_age_ms`, `cached_at`, `threshold_ms`.
- [ ] **RF-SH-02:** Quando o cache é stale, a mensagem distingue os dois subcasos: "stale (>24h)" vs "absent (no previous init)". Útil para diagnóstico.

### Could Have
- [ ] **RF-CH-01:** Override via env var `ANTI_VIBE_FRESH_HOURS` para devs que querem fast-iterate com janela menor (ex: 1h). NÃO bloqueia release.

### Won't Have (desta versao)
- **`--reuse-discovery=force` (ignorar threshold):** se o dev quer forçar reuso independente da idade, deleta `discovery/` ou roda `/init` completo. Adicionar modo "force" agora complica API sem caso real.
- **Cache invalidation por mudança de arquivo (file watcher):** monitorar se `app/api/**` mudou desde o último init e invalidar cache. Over-engineering — heurística temporal de 24h cobre o caso real (dev rodando `/init` várias vezes ao dia).
- **Flag `--reuse-discovery` no `/init --refresh` deste PRD:** o `--refresh` é skill diferente (plano05/fase-01 do PRD v6.3.0). Este PRD só constrói a base reutilizável; `--refresh` consome.
- **Configurabilidade via `config/adaptive-coaching.json`:** dependência circular com plano05/fase-02 que ainda não rodou. Hardcoded 24h até demanda real surgir (D3).

---

## Requisitos Nao-Funcionais

- **Performance:** Quando o atalho é ativado fresh, `/init` total `<500ms` (Read 1 arquivo + comparação `Date.now()` + Step 7 reaproveita resultado). Quando ativado stale, overhead `<50ms` antes de cair no fluxo normal (1 Read + 1 comparação).
- **Seguranca:** Não introduz superfície nova. `discovery/agents-log.json` já é gitignored. Leitura é read-only do ponto de vista do helper; mutação só no audit append (mesmo padrão de `AuditLogWriter`).
- **Acessibilidade:** N/A (CLI tool, sem UI).
- **Observabilidade:** Audit entry com `subagent_id: 'reuse-discovery'` permite tracking. Console output em `console.log` (stdout — surface para Claude text output, padrão do plugin).

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | Nome da flag | `--reuse-discovery` | `--cache-only`, `--fast` | Mantém consistência histórica com RF-CH-02 do PRD original do /init. Semântica explícita: "reusar discovery anterior se fresh". |
| 2 | Source do timestamp | `discovery/agents-log.json.started_at` | Arquivo novo `discovery/.last-init`; frontmatter de AGENTS.md | Reusa artefato existente — zero novo arquivo, zero acoplamento extra. Princípio "uma fonte de verdade" (CLAUDE.md). Se `agents-log.json` não existe, fallback seguro para `null` (full init). |
| 3 | Threshold | Hardcoded `FRESH_THRESHOLD_MS = 24h` | Configurável via `config/adaptive-coaching.json`; env var | YAGNI. Configurabilidade só faz sentido se houver demanda real. Hardcoded é trivial mudar quando/se aparecer. Configurável via JSON cria dependência circular com plano05/fase-02 do PRD v6.3.0. |
| 4 | Posição do step | Antes do `Passo 0 — Detectar Modo` | Dentro do Passo 0 como sub-branch | Atalho deve interceptar ANTES da detecção de modo (que faz I/O extra). Mantém o "happy path" do atalho `<500ms`. |
| 5 | Comportamento em stale | Warning + fluxo normal | Erro hard (exit 1) | Princípio least surprise: dev pediu atalho, atalho não foi possível → roda o `/init` que ele teria rodado de qualquer forma. Erro hard quebra fluxos automatizados. |

---

## Criterios de Aceite

- [ ] **CA-01:** Dado um projeto com `discovery/agents-log.json.started_at` setado há 1h, quando o dev rodar `/init --reuse-discovery`, então `/init` pula Fases 0-1, executa apenas Step 7 (Capabilities Discovery), e termina em `<500ms` com exit 0.
- [ ] **CA-02:** Dado um projeto com `discovery/agents-log.json.started_at` setado há 48h, quando o dev rodar `/init --reuse-discovery`, então o `/init` emite warning "stale (48h ago) — running full init" e executa o fluxo completo.
- [ ] **CA-03:** Dado um projeto sem `discovery/agents-log.json` (greenfield), quando o dev rodar `/init --reuse-discovery`, então o `/init` emite warning "no previous init detected — running full init" e executa o fluxo completo.
- [ ] **CA-04 (edge case):** Dado um projeto com `discovery/agents-log.json` corrompido (JSON inválido), quando o dev rodar `/init --reuse-discovery`, então `readLastInitTimestamp` retorna `null` (não lança), warning é emitido, e fluxo normal roda.
- [ ] **CA-05 (idempotência):** Dado o `/init --reuse-discovery` rodando em fresh path, quando completar, então um audit entry `subagent_id: 'reuse-discovery'` é appended em `discovery/agents-log.json` SEM duplicar entries de `capabilities-discovery` anteriores.
- [ ] **CA-06 (backward compat):** Dado o `/init` sem a flag, quando rodar, então o comportamento é byte-identical ao v6.2.x (mesmo audit log shape, mesmo número de entries, mesmas mensagens).
- [ ] **CA-07 (helper reuse):** Dado que o plano05/fase-01 do PRD v6.3.0 consome `shouldReuseDiscovery` + `FRESH_THRESHOLD_MS` deste módulo, quando este PRD shippar, então o paused do plano05/fase-01 pode ser retomado sem nenhuma mudança neste PRD (helper é estável).

---

## Out of Scope

- Reescrita do `Step 7 (Capabilities Discovery)`: este PRD adiciona um caminho de entrada novo, mas NÃO refatora capabilities-discovery em si.
- Suporte a flag `--reuse-discovery` em outras skills (apenas `/init`).
- Métrica agregada de "quantas vezes o atalho foi usado vs full init" — pode ser derivada do audit log a posteriori, mas não há dashboard.

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Arquivo existente | `skills/init/lib/audit-log.ts` (exporta `AuditLogWriter`, `AgentsLog`, `started_at`) | pronto |
| Arquivo existente | `skills/init/SKILL.md` (será editado para inserir Step reuse-discovery.0) | pronto |
| Pattern existente | `parseDryRunFlag` em `Step migrate.0` linhas 47-53 do SKILL.md | pronto (mirror) |
| Lib/pacote | Nenhuma nova — usa `node:fs/promises`, `node:path` (já no projeto) | N/A |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| `agents-log.json.started_at` semântica muda (atualmente é "quando AuditLogWriter foi instanciado" — pode ou não corresponder a "quando o /init começou") | baixa | médio | RF-MH-03 inclui teste explícito do shape esperado. Se a semântica drift, ajusta o helper sem mudar API pública. |
| Helper escrita em arquivo não-`.test.ts` ainda usa pattern `await import` que GT-04 do PRD do /init flagou problemas em Windows | baixa | médio | Mirror exato do pattern existente em `Step migrate.0` (que já passou validação). Smoke test em Windows manual antes de merge. |
| Plano05/fase-01 do PRD v6.3.0 mudou a forma como consome o helper (drift entre PRDs) | média | baixo | CA-07 explicita o contrato. Plano05/fase-01 ficará paused até este PRD merge; quando retomar, lê PRD atualizado. |
| Audit entry duplicado quando `/init --reuse-discovery` falha após o append | baixa | baixo | Append é última operação do fluxo fresh — se falhar antes, não há entry. Se falhar durante Step 7, comportamento idêntico ao `/init` normal (esse erro já é tratado). |
| Cache "fresh" enganoso (24h é muito? muito pouco?) | média | baixo | RF-CH-01 oferece override via env var como Could Have. Constante facilmente ajustável depois. |

---

<!-- Gerado por /write-prd (manual, model-invocation disabled) em 2026-05-15 -->

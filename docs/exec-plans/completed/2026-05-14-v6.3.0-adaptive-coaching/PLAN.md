# Plan: Adaptive Coaching (v6.3.0)

**PRD:** ./PRD.md
**Planos:** 5 planos, 17 fases total
**Created:** 2026-05-14
**Last Updated:** 2026-05-15 (Plano 05 adicionado — Could Haves)

---

## Planos

| # | Nome | Fases | Sizing | Depende de | Target |
|---|------|-------|--------|------------|--------|
| 01 | Fundação Adaptativa | 4 | ~4.5h | — | v6.3.0 |
| 02 | /init produz capabilities.json | 3 | ~3.5h | Plano 01 | v6.3.0 |
| 03 | /parity-audit + tool-registry-inspector | 3 | ~3.5h | Plano 01 | v6.3.0 |
| 04 | profile-aware-preface ×4-6 skills | 4 | ~4h | Plano 01 | v6.3.0 |
| 05 | Polish & DX (Could Haves) | 3 | ~3.5h | Planos 01, 02, 04 | v6.3.0 ou v6.3.1 (defer-friendly) |

---

## Grafo de Dependencias

```
Plano 01 (Fundação Adaptativa)  ← BLOCKER
         |
  ┌──────┴───────────┐───────────────┐
  ↓                  ↓               ↓
Plano 02          Plano 03        Plano 04
(/init caps)    (/parity-audit)  (preface ×4-6)
  |                                  |
  └──────────────┬───────────────────┘
                 ↓
            Plano 05
       (Polish & DX — defer-friendly)
```

**Paralelismo possível:** Planos 02, 03 e 04 podem ser executados em paralelo após Plano 01 concluído. Plano 05 aguarda 01+02+04 (fase-03 do 05 precisa de skill com bloco preface).

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-preface-context-helper
**Descrição:** Criar `PrefaceContext` type + `readPrefaceContext()` helper que lê `architecture-profile.md` existente + 1 teste com fixture nextjs-app-router. Prova que o helper lê, parseia e retorna o shape `{ profile, language, framework, confidence }` corretamente — fundação de toda a adaptação.

---

## Resumo por Plano

### Plano 01: Fundação Adaptativa
> Cria as peças de infraestrutura que todos os outros planos dependem: o helper de contexto adaptativo, os schemas JSON versionados, a documentação canônica e os fixtures de regressão.

Fases:
- fase-01-preface-context-helper: PrefaceContext type + readPrefaceContext + testes unitários [TRACER BULLET]
- fase-02-json-schemas-discovery-folder: schemas capabilities-v1 + parity-gaps-v1 + discovery/ + .gitignore
- fase-03-adr-doc-canonico: ADR + adaptive-coaching-framework.md (doc canônico)
- fase-04-fixtures-stale-detection: Fixtures 5 profiles para PrefaceContext + stale detection (RF-SH-01)

### Plano 02: /init produz capabilities.json
> Adiciona geração de `discovery/capabilities.json` ao `/init`: AST-first para nextjs-app-router, LLM-fallback para mvc-flat, com integração na pipeline do init e audit log.

Fases:
- fase-01-ast-parser-nextjs: AST parser nextjs-app-router (app/**/route.ts → capabilities.json) + testes
- fase-02-llm-fallback-mvc-flat: LLM-fallback para mvc-flat marcado source:"llm" + coverage_gaps
- fase-03-init-integracao: /init nova fase capabilities-discovery + agents-log.json audit entry

### Plano 03: /parity-audit + tool-registry-inspector
> Cria a lib de inspeção de capabilities do agente (MCPs/tools/subagents) e a skill `/parity-audit` que produz `parity-gaps.json`. Refatora `qa-visual` para consumir a lib sem mudança de UX.

Fases:
- fase-01-tool-registry-inspector: tool-registry-inspector.ts (enumera MCPs/tools/subagents) + testes
- fase-02-parity-audit-skill: /parity-audit SKILL.md (kind:"audit") + geração de parity-gaps.json
- fase-03-qa-visual-refactor: qa-visual → tool-registry-inspector (comportamento idêntico ao v6.2)

### Plano 04: profile-aware-preface ×4-6 skills
> Aplica o padrão profile-aware-preface às 4 skills priorizadas (Must Have) + 2 candidatas (Should Have). Estende harness-validate para checar bem-formação dos blocos. Fecha com CHANGELOG e lesson compound.

Fases:
- fase-01-4-skills-must-have: /security, /api-design, /system-design, /design-patterns ganham blocos preface
- fase-02-2-skills-should-have: /decision-registry, /lessons-learned (candidatos Should Have RF-SH-05)
- fase-03-harness-validate-preface: harness-validate.mjs valida blocos profile-aware-preface bem-formados (RF-SH-06)
- fase-04-changelog-compound: CHANGELOG.md v6.3.0 entry + lesson compound se padrão durável emergir

### Plano 05: Polish & DX (Could Haves)
> Agrupa os 3 itens Could Have do PRD em um plano defer-friendly: cada fase é independente, pode entrar em v6.3.0 ou virar v6.3.1 sem bloquear release. Cobre `--refresh` flag, threshold configurável de confidence, e CLI debug de preface.

Fases:
- fase-01-init-refresh-flag: `/init --refresh` regenera só `discovery/*.json` se idade <24h (RF-CH-01)
- fase-02-confidence-threshold-config: `config/adaptive-coaching.json` + threshold default 70 desliga adaptação abaixo (RF-CH-02)
- fase-03-preface-simulate-cli: `bun run preface:simulate {skill-name}` mostra preface composto sem invocar a skill (RF-CH-03)

---

## Risks

- `discovery/` folder não existe — criar em Plano 01 Fase 02 com .gitkeep + .gitignore
  - Mitigação: `discovery/*.json` gitignored; só `discovery/_schemas/` e `discovery/.gitkeep` comitados
- Blocos profile-aware-preface conflituam com bloco de telemetria se mal posicionados
  - Mitigação: colocar preface DEPOIS do bloco de telemetria (seguir estrutura de `/architecture/SKILL.md`)
- AST parser cobre apenas `app/**/route.ts` — projetos híbridos (pages + app router) têm cobertura parcial
  - Mitigação: `coverage_gaps` no JSON declara o que falhou; LLM-fallback cobre o resto com `confidence < 1.0`
- `tool-registry-inspector` scope creep se tentar parsear todos os MCPs em runtime
  - Mitigação: ler apenas manifest metadata (`.anti-vibe-manifest.json`) + lista de tools declarada; sem I/O heavy
- qa-visual refactoring quebra fluxo já validado
  - Mitigação: `tool-registry-inspector` é wrapper transparente; smoke test antes de mergear (CA-06)

---

## Decisoes do PRD Aplicadas

| Decisão | Onde se aplica |
|---------|---------------|
| D1: profile-aware-preface em SKILL.md (bloco marcado) | Plano 04, todas as fases |
| D2: PrefaceContext { profile, language, framework, confidence } composto | Plano 01, fase-01 |
| D3: nextjs-app-router (AST) + mvc-flat (LLM-fallback) apenas | Plano 02, fases 01-02 |
| D4: AST-first + LLM-fallback marcado source + confidence | Plano 02, fases 01-02 |
| D5: skill nova /parity-audit + lib compartilhada (não extender qa-visual) | Plano 03, fases 01-02 |
| D6: build-time default + stale checksum + warning | Plano 01, fase-04 |
| D7: discovery/ folder para capabilities + parity-gaps + schemas | Plano 01, fase-02 |
| D8: discovery/*.json gitignored por default | Plano 01, fase-02 |
| D9: qa-visual migra pra tool-registry-inspector, sem mudança UX | Plano 03, fase-03 |
| D10: checksum em paths-chave (package.json, top-level src/) | Plano 01, fase-04 |
| RF-CH-01: Flag --refresh em /init reusa otimização <24h | Plano 05, fase-01 |
| RF-CH-02: Threshold configurável de confidence em config/adaptive-coaching.json | Plano 05, fase-02 |
| RF-CH-03: CLI debug preface:simulate sem invocar skill | Plano 05, fase-03 |

---

<!-- Gerado por /plan-feature em 2026-05-14 -->

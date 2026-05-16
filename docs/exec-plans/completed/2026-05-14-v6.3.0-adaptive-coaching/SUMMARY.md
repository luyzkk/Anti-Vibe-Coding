# Summary: v6.3.0 — Adaptive Coaching Framework

**Completed:** 2026-05-15
**Duration:** 2026-05-14 → 2026-05-15 (2 days)
**Planos:** 5 (all completed)
**Fases Total:** 17 (17 done, 0 skipped, 0 blocked)
**Commits v6.3.0:** ~44 (across planos 01–05, RED/GREEN/docs/security)
**Spin-off shippado:** `init-reuse-discovery` (4 fases) — `docs/exec-plans/completed/2026-05-15-init-reuse-discovery/`

## O que foi construído

### Plano 01 — Fundação Adaptativa (Must Have / Should Have)
- `skills/lib/preface-context.ts` — `readPrefaceContext(projectRoot): PrefaceContext` (shape composto `{ profile, language, framework, confidence }`, wrapper de `readArchitectureProfile`; `language`/`framework` reservados para v6.5/v6.6).
- JSON Schemas em `schemas/`: `capabilities-v1.schema.json`, `parity-gaps-v1.schema.json` (+ `discovery/` placeholder).
- `ADR-0020-adaptive-coaching.md` + framework canônico em `docs/design-docs/adaptive-coaching-framework.md` (entrada no index).
- 5 fixtures de profile (`tests/fixtures/v6-state-fixture/.anti-vibe-manifest.*.json`) + stale-detector (`skills/lib/stale-detector.ts`) com 3 testes (CA-09 regression).

### Plano 02 — `/init` produz capabilities.json (Must Have)
- `skills/lib/capabilities-writer.ts`: regex parser para Next.js App Router (`source: 'ast'`, `confidence: 1.0`) + LLM-fallback para mvc-flat (`source: 'llm'`, `confidence: 0.7`) + dispatcher `discoverCapabilities(profile)`.
- `Step 7` inserido em `skills/init/SKILL.md` (após Delivery Loop), com schema validation soft (`schema_version === '1.0'`) e fallback de `run_id` via `crypto.randomUUID()` em greenfield.
- 17 testes (5 AST + 10 fallback/dispatcher + 2 integration). Typecheck limpo.

### Plano 03 — `/parity-audit` + tool-registry-inspector (Must Have / Could Have)
- `skills/lib/tool-registry-inspector.ts` — lê `.anti-vibe-manifest.json` (mcps disponíveis) e cruza com `skills/*/SKILL.md` (`allowed-tools:`).
- `skills/parity-audit/SKILL.md` + `parity-gaps-writer.ts` + `gap-rules.ts` (3+2 testes, escreve `discovery/parity-gaps.json` com 4-section snapshot).
- `qa-visual` ganhou pre-check via `inspectToolRegistry` (CA-06 — UX v6.2 idêntica quando Playwright instalado; mensagem clara quando ausente).

### Plano 04 — profile-aware-preface ×6 skills (Must Have / Should Have)
- 6 skills migradas com bloco `<!-- profile-aware-preface:start --> ... :end -->` + lookup table por profile + fallback DEFAULT='' (CA-02):
  - Must Have (4): `/security`, `/api-design`, `/system-design`, `/design-patterns`
  - Should Have (2): `/decision-registry`, `/lessons-learned`
- `harness-validate` ganhou `checkProfileAwarePreface` (4 testes; tolerâncias: aceita `readArchitectureProfile(` alternativo + skip silencioso quando bloco sem fenced code).
- CHANGELOG `[6.3.0]` + compound note `2026-05-15-profile-aware-preface-migration.md`.

### Plano 05 — Polish & DX (Could Have)
- **fase-01:** `parseReuseDiscoveryFlag` aceita `--refresh` como alias + novo export `tryRegenerateParityGaps` (loader pattern, graceful degradation). Wire-up em `Step reuse-discovery.0` do `/init`.
- **fase-02:** `readPrefaceContext` aplica `confidence_threshold` (snake_case, default 70, range 0..100) de `config/adaptive-coaching.json`. Opt-in via existência de `config/` (preserva CA-09 fixture). Schema draft-07 + 3 fixtures.
- **fase-03:** `bun run preface:simulate <skill>` — `scripts/preface-simulate.ts` (pure-fn contract `simulate(projectRoot, skillName): Promise<{stdout, stderr, code}>` + entry guarded por `import.meta.main`). 6 testes (4 happy-path + 2 path-traversal regression pós-security audit).

## Verificação Pós-Implementação (verify-work)

### Tests / Typecheck / Harness
- **Tests:** suite global 970 pass / 9 fail = **baseline pré-existente** (test pollution em `readArchitectureProfile.test.ts` + CA-05 E2E rodando em sequência; isolados passam — confirmado co-rodando `read-architecture-profile.test.ts` + `preface-simulate.test.ts` → 20 pass).
- **Typecheck:** limpo (`bun run typecheck`).
- **Harness:** `bun run harness:validate` OK — 26 required + 184 markdown; 6 skills com preface + 2 legadas (`/architecture`, `/detect-architecture`) usando `readArchitectureProfile` continuam compliance via tolerância.

### TDD Gate (tdd-verifier)
- **14/17 fases STRICT** RED→GREEN observável.
- **3/17 PARTIAL** documentadas em STATE.md:
  - DI-07 (Plano 02 fase-03): integration smoke contra dispatcher pré-existente, sem ciclo clássico.
  - DEV-3 (Plano 03 fase-02): TDD gate forçou criar `gap-rules.test.ts` (2 testes adicionais, additivo).
  - DEV-3 (Plano 05 fase-02): rename mecânico camelCase→snake_case em commit de scaffolding, anchor semântica preservada.

### Auditoria de Segurança (security-auditor)
- **HIGH (corrigido):** `scripts/preface-simulate.ts` aceitava `skillName` sem sanitização (path traversal via `'../../etc/passwd'` ou `'/etc'`).
- **Fix:** commit `65cbf95` — `SAFE_SKILL_NAME = /^[a-zA-Z0-9_-]+$/` validado antes de qualquer fs lookup + 2 regression tests (`'../etc'`, `'/etc'`).

### Code Smell (code-smell-detector)
- Falso-positivo em "unreachable code" linha 22 (verificado: alcançável quando `fs.stat` sucede mas path não é diretório). Não acionado.

### Revisão Fresh-Context (princípio universal #9)
Subagente sem contexto prévio confirmou: RF-MH-01/03/04/05, RF-SH-05, RF-CH-02/03, CA-01/02, CA-06. **Não confirmou** os seguintes — material para v6.3.1:

| Item PRD | O que ficou divergente | Severidade |
|---|---|---|
| RF-MH-02 / CA-03 | "AST-first" prometido; ship é regex com `source:'ast', confidence:1.0` | **Alta** (label incorreto polui parity-audit) |
| CA-05 | gap-rules não cruzam capabilities com USO real no projeto — só catálogo | Média |
| CA-08 | nenhuma skill emite warning quando capabilities.json fica stale | Baixa |
| CA-11 | `checkProfileAwarePreface` ganhou 2 tolerâncias (alt readArchitectureProfile + skip prosa-only) | Média (rege legacy, mas dilui invariante) |
| DEV-1 Plano 03 | parser de subagentes lê `allowed-tools:` (com hífen); agentes reais usam `tools:` — retorna `allowed_tools:[]` para todos | **Alta** (tool-registry-inspector cego em agents reais) |
| DEV-2 Plano 03 | schema `parity-gaps-v1.schema.json` define `mcps` como `array<string>`, runtime é `Array<{name,tools}>` | Média |
| `/parity-audit` SKILL.md | frontmatter `allowed-tools:` sem Bash; instruções pedem importar TS — não executável no harness | **Alta** (skill documentada mas inerte) |
| `PrefaceContext.language/framework` | slots reservados sempre `null`; CA-09 cobre não-quebra, mas v6.3.0 paga custo de design sem benefício | Baixa (intencional) |

## Decisões de Implementação (consolidado por plano)

**Plano 01:**
- DI-01: `bun run lint` substituído por `bun run typecheck` (script `lint` não existe — propagado a todas as fases).
- DEV-02 (fase-03): ADR-0020 usa "References" em vez de "Verbatim original" (ADR-0001 mantém o legado).

**Plano 02:**
- DEV-04 (fase-02): impl GREEN divergiu do pseudocódigo em 3 pontos não-cobertos por teste (handler sem `:line`, walk só na primeira candidate dir, regex linha-a-linha).
- DEV-07/08/09 (fase-03): "Step 4 — Detect Architecture Profile" não existe (`/detect-architecture` é skill separada); `run_id` via `crypto.randomUUID()` em greenfield; pseudocódigo do spec carregava `readFile` import não usado.
- DI-08: schema validation reduzida a `schema_version === '1.0'` (sem ajv) — alinhado com spec.

**Plano 03:**
- DEV-1: agentes reais usam `tools:`, fixtures/parser usam `allowed-tools:`. **Permanece pendente** — escopo v6.3.1.
- DEV-2: schema vs runtime mismatch em `parity-gaps.mcps`. **Permanece pendente** — escopo v6.3.1.
- GT-1: `noUncheckedIndexedAccess:true` exige `?? ''` em `String.split()[0]`.

**Plano 04:**
- DEV-2 (fase-03): `checkProfileAwarePreface` ganhou 2 tolerâncias para não quebrar skills legadas (`readArchitectureProfile(` alt + skip prosa-only).
- Decisão Passo 0 fase-02: INCLUIR `/decision-registry` e `/lessons-learned` (não SKIP).

**Plano 05:**
- DEC-2 (fase-01): adotada opção 3 (`--refresh` alias + extensão p/ parity-gaps.json) em vez da opção literal do spec.
- DEC-3 (fase-02): opt-in via existência de `config/` dir (não via flag explícita) — preserva CA-09 fixture.
- DEC-4 (fase-03): contrato pure-fn `simulate(): Promise<{stdout, stderr, code}>` em vez de `process.exit`/`console.log` inline (G7 — flakiness de spawn no Windows).
- DEV-3 (fase-02): rename mecânico `confidenceThreshold` → `confidence_threshold` (snake_case per PRD §RF-CH-02 e AC `jq .confidence_threshold`).
- DEV-5/6 (fase-03): contrato pure-fn adotado; entry `preface:simulate` em `package.json` inserido alfabeticamente (entre `new-plan` e `state:regenerate`).

## Bugs / Gotchas Generalizáveis (consolidado)

- **GT-1 (já em init-reuse-discovery SUMMARY):** `bun run lint` não existe — use `bun run typecheck`. Reaplicado em toda a feature.
- **GT-2 (novo):** `noUncheckedIndexedAccess:true` exige `?? ''` em `String.split()[0]` (Plano 03 fase-01).
- **GT-3 (novo):** Bun.spawn é flaky no Windows — para scripts CLI testáveis, padrão preferido é contrato pure-fn `(...args) → {stdout:string[], stderr:string[], code:number}` + entrypoint guarded por `import.meta.main` (Plano 05 fase-03, registrado como L-3 / P-2 emergente).
- **GT-4 (novo, security):** Qualquer CLI que aceite path-segment do usuário deve validar contra regex permissiva ANTES de `path.join` (Plano 05 fase-03, fix `65cbf95`).

## Desvios dos Planos

| Plano | Fase | Desvio | Severidade |
|---|---|---|---|
| 02 | fase-02 | Pseudocódigo do spec divergiu em 3 pontos (handler sem :line, walk em 1ª dir, regex linha-a-linha) — não coberto por teste | Baixa |
| 03 | fase-02 | TDD gate forçou criar `gap-rules.test.ts` (additivo, não tocou anchor) | Baixa |
| 04 | fase-03 | `checkProfileAwarePreface` ganhou 2 tolerâncias (compromete invariante CA-11) | **Média** |
| 05 | fase-01 | DEC-2 adotada (opção 3) em vez da literal do spec | Baixa |
| 05 | fase-02 | Opt-in via `config/` dir + rename camelCase→snake_case pós-GREEN | Baixa |
| 05 | fase-03 | Contrato pure-fn em vez de `process.exit` inline (G7) + entry alfabético | Baixa |

## Backlog v6.3.1 (sugerido)

1. **Relabel `source:'ast' → 'regex'`** em `capabilities-writer.ts` (RF-MH-02 honesty) ou implementar AST real (`@typescript-eslint/parser`).
2. **DEV-1 Plano 03:** suportar `tools:` no parser de subagentes ou normalizar fixtures para `tools:` (resolver dual-format ou padronizar).
3. **DEV-2 Plano 03:** alinhar schema `parity-gaps-v1` ao runtime (`mcps: Array<{name, tools}>`).
4. **/parity-audit executável:** adicionar Bash ao `allowed-tools:` ou reescrever skill para usar tooling disponível.
5. **CA-05:** estender gap-rules para cruzar capabilities com USO real (grep por imports/rotas no projeto).
6. **CA-08:** adicionar warning de stale capabilities (>24h sem regen) em skills consumidoras.
7. **CA-11 (opcional):** auditar se as 2 tolerâncias do `checkProfileAwarePreface` ainda são necessárias após migrar `/architecture` e `/detect-architecture` ao padrão novo.

## Métricas Consolidadas

| Métrica | Valor |
|---|---|
| Planos | 5 |
| Fases total | 17 |
| Fases concluídas | 17 (100%) |
| Tests adicionados | ~60+ (RED→GREEN em 14 fases; 3 PARTIAL) |
| Bugs encontrados pós-implementação | 1 HIGH (path traversal — corrigido) |
| Falsos-positivos | 1 (code-smell unreachable) |
| Retries | 0 |
| Desvios documentados | 6 (5 baixa + 1 média) |
| Divergências PRD vs Ship | 4 (AST/regex, DEV-1, DEV-2, /parity-audit inerte) |
| Commits | ~44 |
| Spin-off shippado | `init-reuse-discovery` |

## Desbloqueia

- **v6.4 / v6.5 / v6.6:** slots `language` e `framework` em `PrefaceContext` (atualmente null) podem ser preenchidos sem quebrar chamadores atuais (CA-09 garante).
- **v6.3.1 patch:** items 1–7 do backlog acima.

## Smoke Tests Manuais Pendentes

- `bun run preface:simulate security` em projeto com `.anti-vibe-manifest.json` válido → confirmar que `--- PrefaceContext ---` mostra `profile`/`confidence` reais.
- `bun run preface:simulate ../etc` → confirmar exit 1 + "Invalid skill name".
- `/init --refresh` em projeto com `started_at` há 1h → confirmar regeneração de capabilities.json E parity-gaps.json (não só capabilities).
- `config/adaptive-coaching.json` com `{"confidence_threshold": 80}` em projeto com `confidence=75` → confirmar que `readPrefaceContext` retorna `profile: null`.
- `/parity-audit` em projeto real → confirmar se skill é executável OU se cai no caso documentado (não executável até v6.3.1).

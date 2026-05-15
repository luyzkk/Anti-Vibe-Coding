# Memory: Plano 05 - Polish & DX

**Feature:** Adaptive Coaching v6.3.0
**Iniciado:** 2026-05-15 (fase-01 imediatamente pausada — bloqueador externo)
**Status:** completed (3/3 fases — encerra release v6.3.0)

---

## Decisões Durante Execução

- **DEC-4 (2026-05-15, fase-03):** CLI `preface:simulate` shipa como função pura `simulate(projectRoot, skillName)` + thin entrypoint guarded por `import.meta.main`, **não** como CLI spawn-based.
  - **Contexto:** Spec de fase-03 oferecia dois caminhos (spawn `Bun.spawn` vs função pura) e citava `Bun.spawn` como flaky no Windows (G7). Repo é Windows-first; `scripts/__tests__/analyze-metrics.test.ts` já testa libs por import direto (sem spawn).
  - **3 opções:**
    1. Spawn-based como literal no draft. Mais fiel ao "comportamento real da CLI" mas frágil em Windows (paths, escaping, stdio race).
    2. Pure-fn `simulate(projectRoot, skillName): Promise<{stdout, stderr, code}>` testada por chamada direta. Determinístico, segue padrão do repo. Trade-off: shebang/entrypoint não coberto por teste — mitigado por smoke manual.
    3. Híbrido (spawn p/ caso feliz + pure-fn p/ edge cases). Custo dobrado, sem ganho real.
  - **Decisão:** opção 2. Justificativa: paridade com `scripts/__tests__/analyze-metrics.test.ts`, G7 do README do plano explicitamente autoriza, sem trade-off relevante. Smoke manual com `bun run preface:simulate security` valida o entrypoint real (rodou exit 0 imprimindo bloco da skill `/security`).
  - **Impacto:** padrão reusável — futuros scripts CLI no repo devem exportar a função "puramente computacional" e atar o I/O em um bloco `if (import.meta.main)`. Documentar no migration guide quando o tema de DX voltar.

- **DEC-3 (2026-05-15, fase-02):** Convenção opt-in para threshold — diretório `config/` deve existir no `projectRoot` para o threshold ser aplicado.
  - **Contexto:** Pre-existing CA-09 fixture test para `unknown-mixed` chama `readPrefaceContext("/fake/root")` com mock retornando `confidence: 45` e espera `profile === "unknown-mixed"`. Após adicionar threshold default 70, `45 < 70` faria o teste falhar (`profile === null`).
  - **3 opções:**
    1. Modificar a fixture CA-09 para confidence ≥ 70 — quebra contrato de regressão estabelecido em fase-04 do Plano 01.
    2. Tornar o threshold sempre opcional via flag explícita no manifest — adiciona acoplamento manifest ↔ threshold sem ganho.
    3. **Existência de `config/` dir = opt-in.** Sem o diretório, threshold não se aplica (comportamento v6.2). Com o diretório (vazio ou com JSON), threshold opera (default 70).
  - **Decisão:** opção 3. Justificativa: backward compat (CA-02) preservado, opt-in explícito, contrato CA-09 intacto. Documentar em ADR-0020 ou seção "Adaptive Coaching" do design-doc se ainda não existir.
  - **Impacto:** plugin shipa com `config/` já populado (config.json + schema + fixtures), então em projetos onde o plugin é o próprio repo, threshold está ATIVO. Em projetos externos consumindo o plugin, o usuário precisa criar o diretório/arquivo conscientemente. Documentar no migration guide.

- **DEC-2 (2026-05-15):** fase-01 adota **opção 3** (alias + extensão), não a spec literal.
  - **Contexto:** Spin-off `init-reuse-discovery` (completed em `docs/exec-plans/completed/2026-05-15-init-reuse-discovery/`) já shippou em `skills/init/lib/reuse-discovery.ts` exatamente a lógica que a fase-01 ia construir do zero: `FRESH_THRESHOLD_MS`, `shouldReuseDiscovery(cachedAt, thresholdMs?)`, `readLastInitTimestamp`, `resolveThresholdMs`, `parseReuseDiscoveryFlag`. SKILL.md `Step reuse-discovery.0` (linhas 450–519) já liga tudo, com `process.exit(0)` quando cache fresh + regen de capabilities.json.
  - **Delta real da fase-01 sobre o spin-off:** (a) regenerar TAMBÉM `discovery/parity-gaps.json` (não só capabilities.json), com graceful degradation se `/parity-audit` ausente. (b) Aceitar `--refresh` como segundo nome da flag.
  - **3 opções avaliadas:**
    1. Literal à spec — criar `refresh-flag.ts` paralelo (mesma lógica do `reuse-discovery.ts`, nomes diferentes). Duplica código pra fazer a mesma coisa.
    2. Estender só `--reuse-discovery` — descartar `--refresh` da PRD. Quebra promessa textual da PRD §RF-CH-01.
    3. **`--refresh` como alias de `--reuse-discovery`** — `parseReuseDiscoveryFlag` aceita os dois nomes; Step reuse-discovery.0 estendido para também escrever parity-gaps.json. Sem código duplicado, PRD §RF-CH-01 satisfeita.
  - **Decisão do dev:** opção 3. Justificativa: CLAUDE.md "Elegância Balanceada — existe uma forma mais elegante?" + "Não Super-Engenheirar — sem código sem valor real".
  - **Impacto:** fase-01 vira "extensão cirúrgica" do que já existe, não criação de novo módulo. Arquivos afetados encolhem de 4 (criar refresh-flag.ts + test + estender discovery.ts + estender SKILL.md) para 3 (estender reuse-discovery.ts + estender seu test + estender SKILL.md). PRD §RF-CH-01 e CA-08 satisfeitos via o flag alias + warning de stale (já presente via `formatStaleMessage`).

- **DEC-1 (2026-05-15):** fase-01 PAUSED — spin-off de PRD próprio para construir `<24h` cache no `/init`.
  - **Bloqueador:** Passo 0 do fase-01 + G3 do README exigem que a otimização `<24h` (constante `FRESH_THRESHOLD_MS`, leitura de `discovery/agents-log.json.started_at`, flag `--reuse-discovery`) esteja mergeada no `/init` ANTES desta fase rodar. Inspeção realizada (`grep FRESH_THRESHOLD|24h|reuse-discovery skills/init/` → 0 matches) confirma que a otimização nunca foi construída — RF-CH-02 do PRD `/init` (completed em `docs/exec-plans/completed/2026-05-14-init-migration-mode/PRD.md`) listou como Could Have e ficou Won't Have de fato.
  - **3 saídas analisadas:**
    1. Deferir fase-01 → v6.3.1 (seguir spec literalmente). Recomendado pelo orquestrador.
    2. Construir o `<24h` inline no plano05/fase-01. **Rejeitada** — viola explicitamente G3 ("NÃO improvisar criando a otimização aqui — escopo creep + acoplamento errado de PRDs").
    3. Implementar fase-01 com `shouldSkipInitPhases` sempre retornando `false`. **Rejeitada** — código sem valor real, smoke test do checklist nunca roda.
  - **Decisão do dev:** opção 4 não listada inicialmente — **criar PRD/plano próprio para o `--reuse-discovery` no /init**, executar antes do plano05, então retomar fase-01 normalmente. Justificativa: a feature `/init --refresh` é considerada importante o suficiente para shippar em v6.3.0 (não deferir para v6.3.1) e respeita a regra "cada PRD constrói o seu pedaço".
  - **Impacto:** fase-02 e fase-03 também ficam paused enquanto o spin-off não shippa, porque o release v6.3.0 fica aberto. Alternativa avaliada: rodar fase-02 e fase-03 em paralelo ao spin-off (são independentes). Pode ser feito se time-box apertar.
  - **Próximo passo concreto:** invocar `/anti-vibe-coding:write-prd` para criar `docs/exec-plans/active/YYYY-MM-DD-init-reuse-discovery/PRD.md` (slug a confirmar) com frontmatter `unblocks: [v6.3.0-adaptive-coaching plano05 fase-01]`.

<!-- Exemplo:
- **DEC-2:** fase-01 deferida para v6.3.1 — Plano 02 fase-03 ainda em review
  - Por que: dependência externa não pronta no time-box
  - Impacto: fase-02 e fase-03 shipparam em v6.3.0; fase-01 patch posterior
-->

---

## Bugs Encontrados

- **GT-1 (fase-01, 2026-05-15):** TS strict reclama de contravariância quando o loader de `tryRegenerateParityGaps` é tipado como `() => Promise<ParityAuditModule | null>` e o teste passa mocks com types inferidos estreitamente (ex: `mcps: never[]` quando o array literal é vazio). Tipar o loader como `() => Promise<unknown>` (covariante) e fazer o cast interno para `ParityAuditModule` resolve sem perder safety — o runtime é validado pelos testes que injetam mocks fakes. Pattern reaproveitável quando função aceita módulo carregado por DI para testabilidade.

- **DEV-3 (fase-02, 2026-05-15):** GREEN inicial escolheu `confidenceThreshold` (camelCase) como chave do config JSON. Spec do plano e AC machine (`jq .confidence_threshold`) exigem snake_case. Catch tardio (pós-GREEN); corrigido em commit de scaffolding com rename mecânico de impl + tests + JSON shipado. Anchor (semântica do teste) preservada. Aprendizado: briefar GREEN explicitamente com o nome da chave JSON quando o spec define um identificador externamente visível.

- **DEV-4 (fase-02, 2026-05-15):** Spec sugere validação manual (`typeof + >= + <=`) em vez de AJV (G7). GREEN inicial implementou apenas `typeof === 'number'` sem bounds. Bounds (`0..100`) adicionados no commit de scaffolding para garantir que `confidence_threshold: 150` no config caia em default ao invés de propagar valor inválido. Não há teste explícito para bounds — risco aceito porque o schema JSON cobre o caso em CI (eventualmente).

- **DEV-5 (fase-03, 2026-05-15):** Spec do fase-03 trazia exemplo de `simulate(skillName)` com `process.exit`/`console.log` inline; teste shape era spawn-based. Adotado contrato pure-fn `simulate(projectRoot, skillName): Promise<{stdout:string[], stderr:string[], code:number}>` para satisfazer DEC-4 (testabilidade Windows-friendly). Entrypoint sob `if (import.meta.main)` faz console + exit. Cobertura real do shebang fica no smoke manual, não automatizada.

- **DEV-6 (fase-03, 2026-05-15):** Spec sugeriu inserir entry `preface:simulate` em `package.json` "entre `new-plan` e `prepare`". Mantido ordem alfabética real (entre `new-plan` e `state:regenerate`) — `prepare` vem depois de `state:regenerate` no objeto. Sem impacto funcional.

<!-- Exemplo:
- **BUG-1:** preface:simulate quebra em Windows quando skill name tem barra invertida
  - Causa: path.join no Windows produz \ mas glob pattern espera /
  - Fix: normalize path com .replace(/\\/g, '/') antes de match
  - Fase afetada: fase-03
-->

---

## Learnings

- **L-1 (fase-02, 2026-05-15):** Existência de **diretório** como signal opt-in é mais robusto que existência de **arquivo** quando há fixtures legadas com paths fake. Arquivos faltam por diversos motivos (não criado, ENOENT por bug, race condition); diretório é decisão deliberada do usuário/instalação. Padrão reaproveitável para configs futuras.

- **L-2 (fase-02, 2026-05-15):** RED com 3 testes que falham + 3 boundary tests que "passam vacuously" é TDD legítimo. Boundary tests não falham antes da impl porque o comportamento default (preservar profile) já satisfaz a asserção; eles servem de regression guard durante GREEN. Não considerar isso falha de RED.

- **L-3 (fase-03, 2026-05-15):** Scripts CLI testáveis no padrão do repo: exportar função pura computacional `simulate(...): Promise<{stdout, stderr, code}>` + bloco `if (import.meta.main)` que traduz para `console.*` e `process.exit`. Beneficios: testes determinísticos em Windows, tipagem estática completa, anchor TDD claro. Trade-off: shebang/entrypoint precisa de smoke manual. Aplicável a qualquer novo script futuro em `scripts/`.

---

## Patterns Emergentes

- **P-1 (fase-02, 2026-05-15):** Config files novos em `config/` shipam como tripla: arquivo de config default + JSON Schema draft-07 em `config/_schemas/` + 3 fixtures em `config/__fixtures__/` (válida + 2 inválidas para edge cases distintos). Mantém validação CI estável e fornece exemplos canônicos para o autor da próxima skill. Source: schema `adaptive-coaching-v1`.

- **P-2 (fase-03, 2026-05-15):** Pure-fn CLI pattern (ver L-3). Exportar `simulate(projectRoot, ...): Promise<{stdout: string[], stderr: string[], code: number}>` + `if (import.meta.main) { ... }` para entrypoint. Aplicar em qualquer novo script `scripts/*.ts` que precise de testes determinísticos cross-platform.

---

## Notas para v6.3.1 / v6.4

- **CLI `bun run preface:simulate {skill}`** está estável; consumidores: humanos em debug ad-hoc. Para CI snapshot futuro de prefaces compostos, importar `simulate(projectRoot, skillName)` direto e snapshot-test stdout — sem precisar spawnar processo.
- **Pure-fn pattern (P-2 / L-3)** disponível para qualquer novo script `scripts/*.ts`. Caso o repo padronize, vale RFC para migrar `scripts/new-plan.ts` e demais entries (não bloqueia release atual).
- **fase-03 não introduziu novos schemas ou ADRs.** Apenas adicionou `scripts/preface-simulate.ts`, `scripts/preface-simulate.test.ts`, e a entrada `preface:simulate` em `package.json`.
- **Plano 05 e feature v6.3.0 CONCLUÍDOS.** Próximo passo coordenado pelo dev: SUMMARY.md + /lessons-learned destilação + mover pasta para `docs/exec-plans/completed/`.

---

<!-- Atualizado automaticamente durante execucao -->

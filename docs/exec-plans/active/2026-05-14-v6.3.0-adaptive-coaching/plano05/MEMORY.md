# Memory: Plano 05 - Polish & DX

**Feature:** Adaptive Coaching v6.3.0
**Iniciado:** 2026-05-15 (fase-01 imediatamente pausada — bloqueador externo)
**Status:** in-progress (fase-01 retomada após spin-off `init-reuse-discovery` shippar)

---

## Decisões Durante Execução

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

<!-- Exemplo:
- **BUG-1:** preface:simulate quebra em Windows quando skill name tem barra invertida
  - Causa: path.join no Windows produz \ mas glob pattern espera /
  - Fix: normalize path com .replace(/\\/g, '/') antes de match
  - Fase afetada: fase-03
-->

---

## Learnings

_(preencher durante execução do plano)_

<!-- Exemplo:
- **L-1:** Threshold default 70 cobre casos reais — fixtures de profile com confidence 65-75
  validam o limiar sem ruído. Subir para 80 derrubaria 20% dos casos legítimos.
  Source: fase-02 testes edge cases.
-->

---

## Patterns Emergentes

_(preencher durante execução do plano)_

<!-- Exemplo:
- **P-1:** Config files novos em config/ devem vir com schema + fixture válida + 2 inválidas
  desde o primeiro commit. Validador em CI evita drift silencioso.
  Source: fase-02 — schema adaptive-coaching-v1.
-->

---

<!-- Atualizado automaticamente durante execucao -->

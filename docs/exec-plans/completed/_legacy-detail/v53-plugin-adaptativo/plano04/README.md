# Plano 04: Modo Dual + 5 Princípios Universais

**Feature:** Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1) ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~9h
**Depende de:** Plano 01 (Foundation), Plano 02 (Architecture Detector)
**Desbloqueia:** Plano 05 (Análise & Dogfooding — dogfooding com modo dual ativo)

---

## O que este plano entrega

Adapta as 5 skills estruturantes (`architecture`, `plan-feature`, `write-prd`, `execute-plan`, `verify-work`) ao perfil arquitetural detectado, lendo o profile UMA vez no início de cada skill via helper compartilhado e adaptando saída via lookup table — sem branching profundo. Integra os 5 princípios universais (1, 5, 7, 9, 10) nos prompts e templates relevantes. Cobre RF7 e RF11 do PRD; CA-04, CA-05 e CA-06 ficam totalmente verificáveis após este plano.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Tipo `ArchitectureProfile` + union `ArchitectureProfileName` | Plano 01, fase-01 (`manifest-types.ts`) | pendente |
| `parseManifest(raw)` + `isValidArchitectureProfile(value)` | Plano 01, fase-01 (`manifest-schema.ts`) | pendente |
| Helper `isFeatureEnabled(flag)` lê `architectureDetectorEnabled` | Plano 01, fase-03 | pendente |
| Helper `renderArchitectureProfileMarkdown(profile)` (função pura) | Plano 01, fase-04 | pendente |
| Helper experimental `readArchitectureProfile()` (tracer bullet) | Plano 01, fase-06 | pendente — promovido a estável na fase-01 deste plano |
| Documentação dos 5 perfis em `anti-vibe-coding/docs/architecture-profiles.md` | Plano 01, fase-05 | pendente |
| Skill `/anti-vibe-coding:detect-architecture` populando o manifest em projetos reais | Plano 02, fase-03/04 | pendente |
| `writeArchitectureProfile(profile)` (idempotente) | Plano 02, fase-04 | pendente |
| 10 skills instrumentadas com telemetria (não bloqueia, mas reduz risco de regressão) | Plano 03, fases 02-03 | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Helper estável `readArchitectureProfile()` em `lib/read-architecture-profile.ts` (consumido por 5 skills) | Plano 05 (script de análise lê o mesmo profile) |
| Convenção "lê profile UMA vez no topo + lookup table" documentada como padrão do plugin | Onda 2 (skills consultivas que vierem a aderir) |
| 5 skills estruturantes com modo dual ativo em projeto piloto | Plano 05 fases 03-04 (dogfooding em Licitar com flag = `true`) |
| Templates de PRD / plan com Comment Provenance e seção "Outcomes (declarative)" | Plano 05 fase-06 (release notes referenciam novo formato) |
| Fase obrigatória de Fresh-context review em `verify-work` | Plano 05 fase-04 (parte do critério "feature completa") |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-helper-read-architecture-profile.md | Promove helper a API estável: tipos exportados, JSDoc, testes por perfil, helper auxiliar `getRecommendationForProfile`, guard de flag | 1.5h | Plano 01 fase-06, Plano 02 fase-04 |
| 02 | fase-02-adaptar-architecture-skill.md | Recommendation table 5×output em `architecture/SKILL.md` lendo profile UMA vez; CA-06 explícito (Greenfield) | 1.5h | fase-01 |
| 03 | fase-03-adaptar-plan-feature.md | `plan-feature` adapta granularidade de fases por perfil (vertical-slice = feature; layered = camada); CA-05 verificável | 2h | fase-01 |
| 04 | fase-04-adaptar-write-prd-templates-por-perfil.md | `write-prd` injeta snippets de template adaptados (5 perfis × 1 snippet de "Estrutura sugerida") | 1.5h | fase-01 |
| 05 | fase-05-adaptar-execute-plan-e-verify-work.md | `execute-plan` respeita perfil ao gerar fases; `verify-work` mede aderência sem prescrever refactor | 1.5h | fase-01 |
| 06 | fase-06-integrar-5-principios-universais.md | #1 (consultant/grill-me), #5 (templates), #7 (write-prd), #9 (verify-work), #10 (consultant) | 1h | fase-04, fase-05 |

**Sizing total:** 9h (1.5 + 1.5 + 2 + 1.5 + 1.5 + 1).

---

## Grafo de Fases

```
fase-01 (helper readArchitectureProfile estável)
    |
    +----------------+----------------+----------------+
    |                |                |                |
    v                v                v                v
fase-02          fase-03          fase-04          fase-05
(architecture)   (plan-feature)   (write-prd)      (execute-plan
    |                |                |             + verify-work)
    +----------------+----------------+----------------+
                            |
                            v
                  fase-06 (5 universais)
```

**Paralelismo possivel:** fases 02, 03, 04 e 05 são independentes entre si após a fase-01 concluir (cada uma toca uma skill diferente, mesmo helper, lookup tables independentes). Recomendado executar 02 e 03 em paralelo via subagentes; 04 e 05 em outra rodada paralela. Fase-06 obrigatoriamente serial no final (toca templates de write-prd já adaptados pela fase-04 e a skill verify-work já adaptada pela fase-05).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: teste com manifest mock (profile X + flag true) ou flag false; assertion no output da skill
2. GREEN: lookup table + 1 ponto de leitura no topo da skill; nenhum branching profundo
3. REFACTOR: extrair lookup como const exportada, mover JSDoc para tipos
4. VERIFY: bun run test --grep '<fase>' && bun run lint && bun run typecheck
```

Estratégia específica do modo dual:
- **CA-04 é teste de regressão obrigatório em TODAS as fases 02-05.** Cada fase tem um teste com `architectureDetectorEnabled: false` que verifica output idêntico ao v5.2 (snapshot ou comparação textual). Sem este teste, a fase NÃO é aprovada.
- **Fixtures reutilizáveis:** `anti-vibe-coding/skills/lib/__fixtures__/manifests/<perfil>.json` (5 manifests + 1 manifest sem profile + 1 manifest com flag desligada) compartilhados entre as fases 02-05.
- **Sem mock de I/O:** `readArchitectureProfile()` recebe `cwd` opcional (default `process.cwd()`); testes passam diretório temporário escrito em `os.tmpdir()`.
- **Snapshot apenas como sanity check:** asserts primários verificam strings específicas no output (ex: "Vertical Slice: 1 fase = 1 feature"). Snapshot completo é secundário.

**Tracer Bullet deste plano:** N/A — o tracer bullet do PRD vive em Plano 01 fase-06. Plano 04 promove esse tracer bullet a comportamento padrão das 5 skills estruturantes.

---

## Gotchas Conhecidos

Indexados para referência cruzada nas fases. Cada fase cita o `Gx` aplicável.

- **G1: Modo dual SEM branching profundo.** RNF do PRD: skill lê profile UMA vez no topo e adapta saída via UMA lookup. Proibido `if profile === 'A' { ... } else if profile === 'B' { ... }` espalhado pela skill. Lookup table é `Record<ArchitectureProfileName, T>` ou `Map`. Aplicado em todas as fases 02-05.
- **G2: Flag desligada = comportamento v5.2 INTACTO (CA-04).** Se `isFeatureEnabled('architectureDetectorEnabled')` retornar `false`, `readArchitectureProfile()` retorna `null` e a skill DEVE seguir o caminho v5.2 sem ler o lookup. Cada fase 02-05 tem um teste de regressão explícito comparando output com flag false versus output v5.2.
- **G3: Profile ausente OU inválido = comportamento v5.2 + sugestão (CA-10).** Quando flag = `true` mas o manifest não tem `architectureProfile` (ou o objeto é inválido), `readArchitectureProfile()` retorna `null` e a skill exibe UMA linha "perfil arquitetural não detectado — rode `/anti-vibe-coding:detect-architecture`". Skill segue executando em modo v5.2. Sem throw, sem prompt obrigatório.
- **G4: Greenfield só em pasta vazia (CA-06).** Em `architecture` (fase-02), Greenfield mode (vertical-slice + bounded contexts opinados) ativa SOMENTE quando `profile === 'unknown-mixed'` E `src/` está vazia/quase-vazia (limiar: < 5 arquivos `.ts`/`.tsx`). Em qualquer outro caso de `unknown-mixed`, sugere rodar `/detect-architecture` ou edição manual do `architecture-profile.md`.
- **G5: Skills SÃO markdown executável (lição CLAUDE.md raiz).** Helpers em `anti-vibe-coding/skills/lib/<nome>.ts` ou `<nome>.md` com bloco TS triple-backtick. SKILL.md das 5 skills estruturantes ganha bloco TS no topo (idealmente logo após front-matter) que invoca `readArchitectureProfile()` e armazena resultado em variável local. Texto fora de blocos é ignorado pelo modelo durante execução. Mesma convenção de Plano 02 G7 e Plano 03 G8.
- **G6: 5 perfis exatos (D4).** Lookup tables das fases 02-05 cobrem EXATAMENTE: `clean-architecture-ritual`, `mvc-flat`, `vertical-slice`, `nextjs-app-router`, `unknown-mixed`. Não inventar perfil novo. Lookup deve ter 5 chaves; teste com `Object.keys(lookup).length === 5`.
- **G7: Lookup table não é doutrinal — é descritivo.** Saídas adaptadas DESCREVEM o perfil ("plano-feature em vertical-slice organiza fases por feature vertical"), nunca PRESCREVEM refactor ("converta seu projeto para vertical-slice"). Princípio "Adaptativo > Opinativo" do CONTEXT.md.
- **G8: Fase-01 NÃO é redundante com Plano 01 fase-06.** Plano 01 fase-06 cria helper experimental como tracer bullet (1 consumidor: skill `architecture`). Fase-01 deste plano PROMOVE o helper a API estável: tipos exportados, JSDoc completo, testes por perfil, helper auxiliar `getRecommendationForProfile`, documentação da convenção. As fases 02-05 são consumidores adicionais.
- **#9 — Fresh-context review (fase-06):** spawn de subagente sem histórico da execução. NÃO confundir com `verify-work` atual (que é audit no mesmo contexto). Subagente recebe APENAS o PRD, o plano e os arquivos finais — sem ver o que foi tentado e descartado durante execução.
- **G10: Comment Provenance (#5) aplica em TEMPLATES, não em runtime.** Princípio #5 entra em `prd-template.md`, `plan-template.md`, `fase-template.md` como instrução: "todo comentário em código gerado deve ter linhagem (autor, data, decisão)". NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
- **G11: Telemetria já instrumentada (Plano 03).** Não tocar em telemetria. Skills estruturantes já emitem `start`/`end`. Modo dual apenas adiciona o campo `profile_arquitetura` ao payload de `start` quando profile é lido. Esse campo já está no schema (Plano 01 fase-02). Sem mudança em telemetria-utils.
- **G12: Helper `getRecommendationForProfile` é genérico.** Assinatura: `<T>(profile: ArchitectureProfileName | null, lookup: Record<ArchitectureProfileName, T>, fallback: T): T`. Reutilizado pelas fases 02-05 — cada uma instancia com `T` próprio (string, objeto de fase, snippet markdown, etc). Centraliza o comportamento de fallback (`null` → `fallback`).

---

<!-- Gerado por /plan-feature em 2026-05-04 -->

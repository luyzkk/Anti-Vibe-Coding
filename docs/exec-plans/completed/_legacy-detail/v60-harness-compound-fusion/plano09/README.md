# Plano 09: Versioning & Release (5.3.0 -> 6.0.0)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~6h
**Depende de:** Plano 08 (Dog-Fooding — produz `anti-vibe-coding/AGENTS.md`, `docs/*`, `bun run harness:validate && bun run compound:check` retornam exit 0)
**Desbloqueia:** GA da v6.0.0 (release publicado — usuario roda `/anti-vibe-coding:init` em qualquer projeto e recebe v6 layout)

---

## O que este plano entrega

Bump versionado e publicacao do v6.0.0: `package.json` e `plugin-manifest.json` migram de `5.3.0` para `6.0.0` com checksums regenerados, `CHANGELOG.md` ganha secao `## [6.0.0] - 2026-XX-XX` completa (breaking changes, novas features, migration guide passo-a-passo do v5 para v6, deprecacoes), `plugin-manifest.json` registra `skills/todo-pick/SKILL.md` + arquivos novos da fase 5/6/7 (hooks `pre-mutation-gate.cjs`, `state-md-hook.cjs`, libs `completion-signal`, etc.), `sync-to-global.sh` atualizado para caminho `~/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.0.0/` (POSIX-compatible via Git Bash), e validacao formal de CA-36 (rollback via `git revert` retorna o estado a v5.3.x funcional usando fixture `tests/fixtures/legacy-v5/`).

Cobre CA-34, CA-35, CA-36. Apos este plano, **v6.0.0 esta em producao** — usuarios atualizando para a nova versao podem migrar projetos existentes via `/init` (com backup automatico) ou aceitar rollback consciente via `git revert`.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `anti-vibe-coding/AGENTS.md` ≤40 linhas validado | Plano 08 fase-02 | pendente |
| `anti-vibe-coding/docs/*` completo (8 institucionais + design-docs + compound + exec-plans) | Plano 08 fase-03..07 | pendente |
| `bun run harness:validate && bun run compound:check` em `anti-vibe-coding/` exit 0 | Plano 08 fase-08 | pendente |
| Skill `skills/todo-pick/SKILL.md` + `lib/todo-utils.ts` no plugin | Plano 07 fase-01..03 | pendente |
| Hook `hooks/pre-mutation-gate.cjs` registrado em `hooks/hooks.json` | Plano 05 fase-07 | pendente |
| Hook `hooks/state-md-hook.cjs` registrado em `hooks/hooks.json` | Plano 06 fase-04 | pendente |
| Libs novas em `skills/lib/`: `completion-signal.md`, `path-resolver-v6.md`, `state-md-generator.md`, `lessons-learned-crud.md`, `decision-registry-revoke.md`, `todo-utils.md`, `legacy-detector` v6 (extendido), `backup-planning`, `migrate-planning`, `migrate-lessons`, `migrate-decisions` | Planos 03+05+06+07 | pendente |
| Scripts novos: `scripts/harness-validate.ts`, `scripts/compound-check.ts`, `scripts/state-regenerate.ts` | Planos 01+04+06 | pendente |
| Templates novos em `skills/init/templates/harness/` (AGENTS.md, ARCHITECTURE.md, 8 docs, design-docs, exec-plans, compound, review-checklists, smoke-flows, product-specs, references, generated) | Planos 01+02 | pendente |
| Fixture `tests/fixtures/legacy-v5/` com estrutura v5.x reproduzivel | Plano 03 fase-07 | pendente |
| Tabela final de skills/agents/hooks/configs/templates/rules para regenerar manifest | Repo agregado pos-Plano 08 | pendente |
| Versao atual `5.3.0` em `package.json` + `plugin.json` + `plugin-manifest.json` | Repo atual | **pronto** (confirmado: 3 arquivos contem `"version": "5.3.0"`) |
| `CHANGELOG.md` atual com historico ate v4.0.0 (sem entradas v5.x) | Repo atual | **pronto** (159 linhas, ultima entrada [4.0.0] - 2026-03-23) |
| `scripts/sync-to-global.sh` existente apontando para cache `5.2.0` | Repo atual | **pronto** (54 linhas, hardcoded `PLUGIN_GLOBAL=/c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/5.2.0`) |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|--------------|
| `package.json` v6.0.0 publicavel | Usuario final (instala via plugin marketplace ou clone direto) |
| `CHANGELOG.md` migration guide | Usuarios v5.x que querem migrar sem perder configuracao |
| `plugin-manifest.json` v6.0.0 com checksums regenerados | Skill `/update` (detecta diff entre versao instalada e nova) + skill `/sync` (invalida cache) |
| `sync-to-global.sh` aponta para `.../6.0.0/` | Workflow dev do mantenedor (Luiz) — push local → cache global |
| Procedimento de rollback validado (`git revert` + fixture legacy-v5) | Documentacao do usuario (referenciado em CHANGELOG) + suporte (hot-fix v6.0.x) |
| Tag git `v6.0.0` (criada em fase-05 apos validacao) | GitHub release / mecanismo de distribuicao |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-package-json-bump.md | `package.json`, `.claude-plugin/plugin.json`, raiz `plugin-manifest.json` campo `"version"` de `5.3.0` para `6.0.0`; nenhum script quebra (`bun test`, `bun run typecheck` rodam) | ~0.5h | — (independente; entrada do plano) |
| 02 | fase-02-changelog.md | `CHANGELOG.md` ganha secao `## [6.0.0] - 2026-XX-XX` no topo com Keep-a-Changelog 1.1: Added / Changed / Deprecated / Removed / Fixed / Breaking Changes / Migration Guide (passo-a-passo v5 → v6 explicito: backup, `/init`, validar `harness:validate`, ajustar `docs/`) | ~2h | fase-01 (header do release contem versao 6.0.0) |
| 03 | fase-03-plugin-manifest-update.md | `plugin-manifest.json` regenerado: nova skill `skills/todo-pick/SKILL.md` registrada, novos hooks `pre-mutation-gate.cjs` + `state-md-hook.cjs`, novos scripts `harness-validate.ts` + `compound-check.ts` + `state-regenerate.ts`, novos templates harness em `skills/init/templates/harness/`, novas libs em `skills/lib/`, checksums SHA-256 atualizados (todos arquivos passam de v5.3.0 a v6.0.0), `generatedAt` reflete data do release | ~1h | fase-01 (campo top-level `"version"` ja em 6.0.0) + Plano 07 (skill /todo-pick existe) |
| 04 | fase-04-sync-global.md | `scripts/sync-to-global.sh` atualizado: variavel `PLUGIN_GLOBAL` aponta para `~/.claude/plugins/cache/local-plugins/anti-vibe-coding/6.0.0/`, copia `docs/`, `AGENTS.md`, `ARCHITECTURE.md`, `scripts/`, `tests/fixtures/`, `.github/`, alem dos diretorios existentes; **idempotente** (rodar 2x = mesmo resultado, nao sobrescreve customizacoes do usuario), **POSIX-compatible** (testado em Git Bash Windows), preserva symlink CLAUDE.md → AGENTS.md | ~1h | fase-01 (path contem 6.0.0) + fase-03 (manifest novo a copiar) |
| 05 | fase-05-rollback-test.md | Validacao automatica de CA-36: cria branch temporario, aplica `git revert {commit-bump}..HEAD`, verifica que fixture `tests/fixtures/legacy-v5/` ainda passa em estado v5.3.x funcional (sem `harness:validate`, sem `docs/`, com `.planning/` original intacto), gera relatorio `tests/rollback-report.md` com PASS/FAIL por checkpoint, tag git `v6.0.0` criada APENAS se rollback test passar | ~1.5h | fase-01..04 (precisa de commits do release completos para reverter) |

**Total:** ~6h (alinhado com PLAN.md).

---

## Grafo de Fases

```
            fase-01 (package.json + plugin.json + manifest top-level bump)
                          |
            +-------------+--------------+
            |                            |
            v                            v
       fase-02 (CHANGELOG.md         fase-03 (plugin-manifest.json
        6.0.0 section +              regenerated with new files +
        migration guide)             checksums)
            |                            |
            +-------------+--------------+
                          |
                          v
            fase-04 (sync-to-global.sh updated for 6.0.0/)
                          |
                          v
            fase-05 (rollback test against legacy-v5 fixture +
                     tag v6.0.0 if PASS)
                          |
                          v
                    Release GA
```

**Paralelismo possivel:**
- **fase-02 e fase-03 podem rodar em paralelo** apos fase-01 (CHANGELOG eh prosa humana; plugin-manifest eh JSON regenerado por `scripts/generate-manifest.js` existente — escrevem em arquivos disjuntos, sem race). Sub-agente A escreve CHANGELOG, sub-agente B regenera manifest. Tempo de relogio: max(2h, 1h) = 2h em vez de 3h serial.
- **fase-04 e fase-05 sao serializadas no fim** — fase-04 precisa do manifest novo (fase-03) para validar o que copiar; fase-05 precisa de TODOS os commits de fase-01..04 para testar o revert completo.
- **fase-01 NAO paraleliza** com nada — eh pre-requisito de todas as demais (versao em qualquer outro arquivo precisa apontar para 6.0.0).

**Tempo de relogio com paralelismo (f2 ‖ f3):** 0.5h (f1) + 2h (max f2/f3) + 1h (f4) + 1.5h (f5) = **~5h reais** vs 6h serial.

---

## TDD Strategy

Este plano e **majoritariamente declarativo** (mudanca de version field, prosa de CHANGELOG, JSON regenerado, bash script). NAO eh codigo TS novo — entao **TDD nao aplica no sentido RED/GREEN classico**. Em vez disso, cada fase tem **verificacao executavel** (comando bash que retorna PASS/FAIL).

```
Ciclo por fase:
1. EXECUTE: aplicar mudanca (editar arquivo, regenerar JSON, rodar script)
2. VERIFY: comando `cat | jq` ou `wc -l` ou `bun run X` retorna valor esperado
3. ROLLBACK if fail: `git checkout {arquivo}` + investigar
4. COMMIT: snapshot por fase (commit isolado para `git revert` granular se CA-36 precisar)
```

**Excecao:** fase-05 (rollback test) eh **teste real de regressao** — escreve um teste em `tests/rollback.test.ts` ou script bash `tests/rollback.sh` que:
1. Snapshot do HEAD (sera 6.0.0).
2. `git revert --no-edit HEAD~N..HEAD` em branch temp.
3. Verifica que o estado revertido eh equivalente a tag `v5.3.0` (diff = vazio modulo .planning/v5-backup esperado).
4. Verifica que fixture `tests/fixtures/legacy-v5/` ainda passa quando submetida ao plugin revertido (v5.3.0 NAO tinha `harness:validate`; valida que `/init` v5 funciona).

**Tracer Bullet deste plano:** fase-05 (CA-36 verbatim — prova que release eh reversivel sem perda).

---

## Gotchas Conhecidos

- **G1 (R2 — migracao corrompe projetos legados):** Migration guide do CHANGELOG (fase-02) DEVE incluir passo explicito: "antes de rodar `/anti-vibe-coding:init` em projeto v5.x, confirme `git status` limpo. `/init` cria backup automatico em `.planning.v5-backup/` mas seu codigo nao versionado eh seu risco." Inspirado em D22/R2 do PRD. Sem este aviso, usuario com WIP nao-comittado perde trabalho.

- **G2 (sequencing de Plano 07 — risco bloqueante para fase-03):** `plugin-manifest.json` registra `skills/todo-pick/SKILL.md` (CA do Plano 07). **Se Plano 07 nao tiver concluido, fase-03 falha** porque tenta gerar checksum de arquivo inexistente. Politica: fase-03 le lista de arquivos com `find anti-vibe-coding/ -type f \\( -name "*.md" -o -name "*.json" -o -name "*.cjs" -o -name "*.ts" \\) -not -path "*/node_modules/*" -not -path "*/.git/*"` no momento de execucao — se `skills/todo-pick/SKILL.md` nao aparecer, **abortar fase-03 com mensagem clara** "Plano 07 nao concluiu — `skills/todo-pick/SKILL.md` ausente. Bloqueando release ate Plano 07 ship". Ambiguidade 09-A1 detalhada abaixo.

- **G3 (CHANGELOG date placeholder):** A data `2026-XX-XX` no header `## [6.0.0] - 2026-XX-XX` eh um **placeholder consciente** — substituido por data real (ISO `YYYY-MM-DD`) no momento do release commit (fase-05 imediatamente antes de criar a tag). Documentar em fase-02 que ate fase-05 a data permanece placeholder; substituir via `sed -i "s/2026-XX-XX/$(date +%Y-%m-%d)/" CHANGELOG.md` na fase-05.

- **G4 (Windows + Git Bash):** Sync script (fase-04) usa POSIX `cp -r`, `[ -d ... ]`, `[ ! -d ... ]`. Validar que **NAO** usa: `realpath` (varia entre Git Bash e WSL), `readlink -f` (idem), `rsync` (nao garantido no Git Bash do Windows nativo). Manter `cp -r` simples + `mkdir -p` para destinos. Idempotencia: usar `[ ! -e destino ] && cp` para arquivos novos; para `docs/` rodar `cp -r docs/* destino/docs/` (merge in-place, sobrescreve sem deletar arquivos extras do destino — preserva eventuais customizacoes do usuario, embora cache global nao deveria ter customizacoes).

- **G5 (manifest regeneration eh ferramenta existente):** `scripts/generate-manifest.js` ja existe no plugin (linha do CHANGELOG v4.0.0). Reusar — NAO escrever novo. Fase-03 invoca `bun scripts/generate-manifest.js` e valida saida. Se o script gera com bug (e.g., omite skill recem-criada), corrigir o script primeiro em fase separada antes do release. Confirmar que o script aceita argumento de versao (caso contrario passar via env: `PLUGIN_VERSION=6.0.0 bun scripts/generate-manifest.js`).

- **G6 (Keep a Changelog 1.1 — secoes obrigatorias):** Padrao oficial https://keepachangelog.com/en/1.1.0/ usa: **Added**, **Changed**, **Deprecated**, **Removed**, **Fixed**, **Security**. Adicionar duas secoes nao-padronizadas mas semanticamente uteis: **Breaking Changes** (no topo, antes de Added) e **Migration Guide** (no fundo, antes da regua `---` do release seguinte). Migration Guide eh PROSA — passos numerados com comandos copiables.

- **G7 (rollback parcial — CA-36 escopo):** R-rollback do prompt: `git revert` cobre **package.json + plugin-manifest + sync + CHANGELOG entry**. NAO desfaz: `docs/` ja criados no plugin via dog-food (Plano 08) — esses sao **historico do desenvolvimento**, NAO sao parte do release que poderia ser revertido. Politica documentada em fase-05: "rollback do release 6.0.0 retorna o usuario ao plugin funcional v5.3.x; **NAO** apaga `docs/` do proprio plugin (esses sao trabalho intelectual permanente). Para usuarios que migraram projetos via `/init`, o rollback eh o backup `.planning.v5-backup/` deles mais `git revert` no plugin." Esta distincao DEVE estar no CHANGELOG migration guide.

- **G8 (CA-37 fora de escopo deste plano):** PRD lista CA-37 (testes do plugin com 4 fixtures) na mesma secao "Versionamento e Release". MAS CA-37 eh implementado em Plano 03 fase-07 (fixture `legacy-v5`) e Plano 02 fase-06 (fixtures `rails-new`, `nextjs-new`, `node-ts-new`). Plano 09 apenas **valida CA-36** que e o subset de rollback. Documentar em fase-05 que CA-37 deve estar passando ANTES do release ser tagueado (gate adicional).

- **G9 (commit granularity para `git revert`):** Para `git revert HEAD~N..HEAD` funcionar de forma cirurgica em fase-05, cada fase deste plano DEVE produzir 1 commit isolado:
  1. `chore(release): bump version to 6.0.0` (fase-01)
  2. `docs(changelog): add 6.0.0 section with migration guide` (fase-02)
  3. `chore(manifest): regenerate plugin-manifest.json for 6.0.0` (fase-03)
  4. `chore(sync): update sync-to-global.sh for 6.0.0 path` (fase-04)
  5. `test(release): add rollback validation against legacy-v5 fixture` (fase-05 — antes de tag)
  6. Tag `v6.0.0` criada por fase-05 apos rollback passar (NAO eh commit; eh tag anotada).

  Isso permite `git revert HEAD~5..HEAD` reverter exatamente o release sem tocar em Planos 01-08.

- **G10 (cache global path Windows):** `scripts/sync-to-global.sh` atual hardcoda `/c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/5.2.0` (note: 5.2.0, nao 5.3.0 — drift entre dev e cache). Fase-04 corrige para `6.0.0`. Documentar que o path eh especifico do mantenedor (Luiz, Windows 11) — outros desenvolvedores precisariam ajustar manualmente. Considerar fazer o path configuravel via env var `PLUGIN_GLOBAL_DIR` em fase-04 com default ao path atual (fora de escopo para v6.0.0 mas mencionar em TODO).

- **G11 (CHANGELOG idioma):** Conforme D2 (docs institucionais em EN), CHANGELOG.md ganha entradas em INGLES neste release. MAS as 4 entradas existentes (1.0.0, 2.0.0, 3.0.0, 4.0.0) estao em **portugues** ("Adicionado", "Modificado", "Notas de Migracao"). Politica para fase-02: nova secao 6.0.0 em INGLES (Added, Changed, etc.); entradas anteriores permanecem em portugues (preserva historico). Documentar inconsistencia consciente em fase-02 — alternativa rejeitada eh traduzir TODO o CHANGELOG, fora de escopo. Esta decisao alinha com G4 do Plano 08 (provenance — estrutura em EN, conteudo legado em PT preservado).

### Ambiguidades sinalizadas (decisao assumida — validar antes de executar)

- **09-A1 (sequencing Plano 07 vs Plano 09 — manifest registration):** PLAN.md lista Plano 07 (TODO.md + /todo-pick) como pre-requisito implicito porque fase-03 deste plano registra `skills/todo-pick/SKILL.md` no manifest. **Decisao assumida:** Plano 09 executa APOS Plano 08, que por sua vez consome Plano 07. Se sequencia for invertida (Plano 09 antes de Plano 07 concluir), fase-03 detecta arquivo ausente e aborta com erro `Plano 07 missing — skills/todo-pick/SKILL.md not found`. **Risco:** se Plano 07 atrasar e a equipe quiser shipar v6.0.0 sem /todo-pick, manifest precisaria ser regenerado sem essa skill. Alternativa nao recomendada: tornar `/todo-pick` opcional em v6.0.0 e adia-la para v6.0.1. Decisao assumida: **bloquear release ate /todo-pick existir**. Validar com user antes de executar.

- **09-A2 (CHANGELOG migration guide — quao detalhado?):** PRD CA-35 diz "migration guide passo-a-passo (executar `/init` em projeto v5 produz layout v6 funcional)". MAS o quao prescritivo? **Opcao A (assumida):** Migration guide em ~30 linhas com 5-7 passos numerados, cada um com comando copiavel + saida esperada + troubleshooting comum. **Opcao B (rejeitada):** Tutorial completo de 100+ linhas. Justificativa: usuario eh dev (Luiz), nao iniciante; aponta para `docs/UPGRADE.md` do plugin (criado em Plano 08 D29 Camada 5) para detalhes profundos. CHANGELOG fica como "executive summary" do migration.

- **09-A3 (sync-to-global.sh — copia `docs/` do plugin?):** Sync atual copia skills/hooks/agents/rules/CLAUDE.md/senior-principles.md/plugin-manifest.json + plugin.json. Plano 08 cria `anti-vibe-coding/docs/`, `AGENTS.md`, `ARCHITECTURE.md`, `.github/`, `tests/fixtures/`. **Decisao assumida:** fase-04 estende a lista de paths copiados para incluir TODOS os artefatos novos (docs/, AGENTS.md, ARCHITECTURE.md, scripts/, tests/fixtures/, .github/) — fazer o cache global ser **espelho fiel** do dev local. Senao, o usuario que invoca o plugin via cache nao ve as novidades. Alternativa nao recomendada: deixar `docs/` apenas no repo dev (cache global nao precisa) — rejeitada porque `/init` e validators precisam ler templates de `skills/init/templates/harness/` que **estao** no `skills/` (ja copiado), mas docs do plugin si si NAO eh template — eh dog-food. Conclusao revisada: **NAO copiar `anti-vibe-coding/docs/`** (eh dog-food interno, nao distribuivel). Copiar `AGENTS.md`, `ARCHITECTURE.md`, `.github/`, `tests/fixtures/`, `scripts/` (para usuario rodar `bun run harness:validate` se quiser auditar o plugin). Confirmar com user.

- **09-A4 (versionamento de `plugin-manifest.json` — strategy field):** Arquivo atual lista 113+ entradas, cada uma com `"updateStrategy": "merge|replace|never"`. **Decisao assumida em fase-03:** Para os NOVOS arquivos do v6 (templates harness, skills/todo-pick, hooks novos, scripts/*.ts, libs novas), aplicar strategies coerentes com o que ja existe:
  - Skills SKILL.md: `replace` (oficial do plugin)
  - Templates: `replace`
  - Hooks `.cjs`: `replace`
  - Scripts `.ts`: `replace`
  - Libs `.md` em `skills/lib/`: `replace`
  - Possiveis arquivos novos de configuracao em `config/*.json`: `merge`
  Nenhum arquivo novo deveria ser `never`. AGENTS.md/ARCHITECTURE.md do plugin NAO entram no manifest (dog-food interno, nao distribuivel — mesma logica de 09-A3).

- **09-A5 (escopo do rollback test — quao real?):** PRD CA-36 diz "validar com fixture `legacy-v5`". **Decisao assumida em fase-05:** Cobrir 3 niveis:
  1. **Nivel 1 (mecanico):** `git revert HEAD~5..HEAD --no-edit` em branch temporario; conferir `git diff main~6 HEAD` eh exatamente vazio (commits removidos limpamente, sem conflito).
  2. **Nivel 2 (estrutural):** `cat package.json | jq -r .version` retorna `5.3.0`; `cat plugin-manifest.json | jq -r .version` retorna `5.3.0`; `grep "## \[6.0.0\]" CHANGELOG.md | wc -l` retorna `0`.
  3. **Nivel 3 (funcional):** Fixture `tests/fixtures/legacy-v5/` submetida ao plugin revertido (v5.3.x) — rodar `/init` simulado (helper do Plano 03 fase-07 reutilizado em modo dry-run) e confirmar que estrutura legacy detectada e migracao OFERECIDA (nao executada — apenas validar deteccao). Se Plano 03 fase-07 expoe `bun tests/fixtures/legacy-v5/run-init.ts`, rodar isso. **Risco:** se Plano 03 nao expoe helper testavel, fallback eh apenas Nivel 1+2 e documentar Nivel 3 como manual-validation pendente.

  Alternativa rejeitada: testar via `npx claude-code /init` real (Claude Code nao roda em CI sandbox). Aceita Nivel 1+2 como gate automatico + Nivel 3 como sanity check.

- **09-A6 (data do release):** CHANGELOG entry tem `2026-XX-XX`. **Decisao assumida:** Data real eh `date +%Y-%m-%d` na hora da fase-05 commit (apos rollback test passar). Tag `v6.0.0` recebe mesma data anotada via `git tag -a v6.0.0 -m "v6.0.0 - $(date +%Y-%m-%d) - Harness + Compound Fusion"`. Se release atrasar varios dias entre planejamento e ship, atualizar manualmente.

---

## Cross-Cutting Notes

- **Plano 07 (TODO.md + /todo-pick):** fase-03 deste plano REGISTRA artefatos criados em Plano 07. Se Plano 07 mudar interface (e.g., renomear skill para `/pick-todo`), fase-03 precisa refletir. Validar em pre-release que paths em `skills/todo-pick/` batem com manifest.

- **Plano 03 (Migration v5→v6):** Migration guide do CHANGELOG (fase-02) eh **espelho narrativo** do que Plano 03 implementa programaticamente. Conteudo do guide vem de Plano 03 fase-06 (dry-run mode) + fase-07 (E2E test) — observar o output real do `/init --migrate --dry-run` rodando contra fixture `legacy-v5`, copiar para CHANGELOG como passo a passo. Sem isso, migration guide vira ficcao.

- **Plano 08 (Dog-Fooding):** fase-05 deste plano confia que dog-food do plugin esta verde (`harness:validate` exit 0 no proprio plugin). Se Plano 08 fase-08 falhou, **abortar release** — release nao pode ser shipado com plugin internamente quebrado. Politica explicita em fase-05.

- **Sync script eh artefato MANTAINER-ONLY:** `sync-to-global.sh` nao eh consumido por usuario final — eh ferramenta de dev do Luiz para iterar localmente. Documentar em fase-04 que CI nao roda este script; nao adicionar a workflow harness.yml. Path hardcoded eh aceitavel (so o mantainer roda).

- **README.md raiz do plugin (fora de escopo):** Tabela de versao no README pode mencionar 5.3.0 ou ter exemplos com versao desatualizada. **NAO** atualizar README como parte deste plano (escopo expandiria). Se houver string `5.3.0` no README.md, ADD para `TODO.md` do plugin (criado em Plano 08 fase-08-A4) com `- [ ] 2026-XX-XX README.md:N v5.3.0 → v6.0.0`.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

# Fase 06: Release notes v5.3 + CHANGELOG + docs de upgrade

**Plano:** 05 — Análise & Dogfooding
**Sizing:** 2h
**Depende de:** fase-04 (números do baseline disponíveis), fase-05 (CA-12 validado)
**Visual:** false

---

## O que esta fase entrega

Três artefatos de release fechando a Onda 1:
- `anti-vibe-coding/CHANGELOG.md` — entrada técnica v5.3 (criar ou atualizar)
- `anti-vibe-coding/docs/upgrade-v52-to-v53.md` — guia técnico para devs que usam o plugin
- `anti-vibe-coding/docs/release-notes-v53.md` — comunicação humana (público híbrido D1)

Todas referenciando D1 (público), D7 (privacy), e OQ1-3 do PRD com respostas empíricas do baseline (fase-04).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/CHANGELOG.md` | Create or Modify | Entrada v5.3 com features, bug fixes, breaking changes (none), refs |
| `anti-vibe-coding/docs/upgrade-v52-to-v53.md` | Create | Guia técnico passo-a-passo para devs |
| `anti-vibe-coding/docs/release-notes-v53.md` | Create | Comunicação humana com diferenciais e callouts |

---

## Implementacao

### Passo 1: Verificar se CHANGELOG.md já existe

```bash
ls -la F:/Projetos/Claude\ code/anti-vibe-coding/CHANGELOG.md
```

Se existe → adicionar entrada no topo (formato Keep a Changelog).
Se não existe → criar com header padrão.

### Passo 2: Conteúdo de `CHANGELOG.md`

Formato Keep a Changelog. Privacy-first em destaque (G12 / D7).

```markdown
# Changelog

Todas as mudanças notáveis deste plugin são documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [5.3.0] — 2026-05-19

### Added — Plugin Adaptativo (Onda 1)

- **Architecture Detector skill** (`/anti-vibe-coding:detect-architecture`): classifica projeto em 1 de 5 perfis com score de confiança 0-100% (RF1, RF3).
- **Schema `architectureProfile`** em `.anti-vibe-manifest.json` versionado para evolução futura (RF2).
- **Modo Dual** em 5 skills estruturantes (`architecture`, `plan-feature`, `write-prd`, `execute-plan`, `verify-work`): adapta saída ao perfil detectado lendo profile UMA vez no início, sem branching profundo (RF7).
- **Telemetria passiva** em 10 skills (pipeline core + consultivas), schema JSONL com 10 campos, rotação mensal `.claude/metrics/YYYY-MM.jsonl` (RF4, RF5).
- **Feature flag opt-in** `architectureDetectorEnabled` (default `false`) — comportamento v5.2 preservado integralmente quando desligada (RF6, CA-04).
- **Script CLI** `bun run anti-vibe-coding/scripts/analyze-metrics.ts`: lê metrics local, gera relatório baseline (RF8, CA-08).
- **5 princípios universais** integrados em prompts/templates: 10 Questions Test (consultant/grill-me), Comment Provenance (templates), Declarative-first (write-prd), Fresh-context review (verify-work), YAGNI checklist (consultant) (RF11).
- **Could-haves:** ASCII chart no script CLI (`--ascii`), override manual `--set <perfil>`, sugestão (não execução) em /init (RF12, RF13, RF14).
- **Documentação dos 5 perfis** em `docs/architecture-profiles.md` (RF10).
- **Markdown legível** `architecture-profile.md` gerado automaticamente pelo detector (RF9).

### Privacy-first (D7 — irreversível)

Telemetria é **local-only**. Nunca sai do repo. Sem network calls, sem upload, sem endpoint configurável. O script `analyze-metrics.ts` apenas lê arquivos locais.

### Public alvo (D1 — híbrido)

Plugin é projetado para uso single-user (Luiz Felipe) E para comunidade externa adotar com retrocompat via versionamento.

### Compatibilidade

- Manifest pré-v5.3 não quebra: campo `architectureProfile` é opcional (CA-10).
- Repos rodando v5.2 que receberem `/update` para v5.3 NÃO quebram (validado em Carreirarte como projeto controle — ver `docs/baseline-v53-onda1.md`).
- Backfill de planos legacy é opcional (D5) — não há migração automática.

### Validação

- 2 semanas de dogfooding em projeto piloto (Licitar, flag=true): >= 50 entradas válidas coletadas (CA-11).
- Projeto controle (Carreirarte, flag=false) intocado durante o piloto (CA-12).
- Relatório baseline arquivado em `docs/baseline-v53-onda1.md`.

### Won't Have (adiados para Onda 2)

Token Tax audit, Comprehension Debt tracking, skill `/dependency-graph`, perfis DDD strategic e Monorepo. Todos dependem de evidência empírica da Onda 1, agora disponível.

[5.3.0]: ./docs/release-notes-v53.md
```

### Passo 3: Conteúdo de `docs/upgrade-v52-to-v53.md`

Guia técnico, voltado a devs.

```markdown
# Upgrade: v5.2 → v5.3

Guia técnico para atualizar projetos rodando Anti-Vibe Coding v5.2 para v5.3.

## TL;DR

- v5.3 é **opt-in**. Sem ação, comportamento v5.2 é preservado.
- Telemetria passiva começa a escrever em `.claude/metrics/YYYY-MM.jsonl` automaticamente após upgrade. Local-only.
- Para ativar Modo Dual: setar `architectureDetectorEnabled: true` no manifest e rodar `/anti-vibe-coding:detect-architecture`.

## Passo 1: Atualizar plugin

Use o método de update do seu setup (`/sync`, `/update`, ou reinstalação manual). Após:

```bash
cat .claude/.anti-vibe-manifest.json | jq '.version'
# Esperado: "5.3.0" ou superior
```

## Passo 2: (opcional) Ativar Architecture Detector

Edite `.claude/.anti-vibe-manifest.json`:

```json
{
  "version": "5.3.0",
  "architectureDetectorEnabled": true
}
```

Depois rode:

```
/anti-vibe-coding:detect-architecture
```

O detector vai:
1. Amostrar `src/`
2. Classificar em 1 de 5 perfis com score 0-100%
3. Pedir confirmação se score < 80%
4. Persistir em `architectureProfile` do manifest + gerar `.claude/architecture-profile.md`

## Passo 3: (opcional) Verificar Modo Dual

Invoque uma skill estruturante e veja saída adaptada:

```
/anti-vibe-coding:architecture
```

A recommendation table virá adaptada ao perfil detectado.

## Passo 4: (opcional) Inspecionar telemetria

```bash
bun run anti-vibe-coding/scripts/analyze-metrics.ts
```

Relatório baseline em stdout. Use `--ascii` para distribuição visual.

## Compatibilidade

- Manifest sem campo `architectureProfile` continua válido. Skills detectam ausência e degradam para v5.2 silenciosamente (CA-10).
- Planos em curso em `.planning/` não são modificados.
- Telemetria passiva ignora a feature flag — sempre ativa, sempre local.

## Reverter

Para voltar ao comportamento v5.2 sem desinstalar:

```json
{
  "architectureDetectorEnabled": false
}
```

Skills voltam ao comportamento v5.2 imediatamente (CA-04). Telemetria continua escrevendo, mas com `profile_arquitetura: "disabled"`.

## Privacidade

Nenhum dado sai do repo. Sem network calls. Sem upload remoto. Decisão D7 do PRD é irreversível.
```

### Passo 4: Conteúdo de `docs/release-notes-v53.md`

Comunicação humana, voltado ao público híbrido (D1).

```markdown
# Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)

**Data de release:** 2026-05-19
**Compatibilidade:** v5.2 → v5.3 sem breaking changes (opt-in puro)

## O que mudou

A v5.3 introduz três capacidades complementares:

### 1. Architecture Detector

Skill manual que classifica seu projeto em 1 de 5 perfis arquiteturais:

- **clean-architecture-ritual** — separação rigorosa por camadas (`src/application/`, `src/domain/`)
- **mvc-flat** — controllers/services/models em pastas top-level
- **vertical-slice** — features auto-contidas, agrupadas por domínio
- **nextjs-app-router** — convenções `app/` com route groups e server components
- **unknown-mixed** — estrutura ambígua ou greenfield

Score de confiança 0-100%. Confirmação pelo usuário se < 80%.

### 2. Modo Dual nas skills estruturantes

5 skills (`architecture`, `plan-feature`, `write-prd`, `execute-plan`, `verify-work`) leem o perfil detectado e adaptam recomendações sem prescrever refactor. Filosofia "adaptativo > opinativo" do plugin.

Exemplo: em projeto vertical-slice, `plan-feature` organiza fases por feature vertical, não por camada.

### 3. Telemetria passiva

10 skills emitem 2 linhas JSONL (start + end) por invocação em `.claude/metrics/YYYY-MM.jsonl`. **Tudo local. Nada sai do repo.**

Script CLI `analyze-metrics.ts` agrega e gera relatório baseline.

## Para quem é

Plugin é **híbrido** (D1):
- Single-user (autor): evolui com disciplina de retrocompat
- Comunidade externa: adoção via feature flag opt-in, comportamento v5.2 preservado quando flag=false

## Privacy-first (D7)

- Telemetria nunca sai do repo
- Sem network calls
- Sem upload remoto
- Sem coleta de conteúdo de código (apenas metadata: counts, durações, perfis)

## Validação empírica

2 semanas de dogfooding em projeto piloto (Licitar, flag=true) com projeto controle (Carreirarte, flag=false):

- {N} entradas válidas coletadas (>= 50 conforme CA-11)
- {X}% taxa de abandono observada
- Perfil mais usado no piloto: {perfil}
- CA-12 cumprido: Carreirarte (flag=false) intocado durante o piloto

Detalhes: `docs/baseline-v53-onda1.md`.

## Open Questions resolvidas com baseline

- **OQ1** (métricas exatas de sucesso): {resposta empírica}
- **OQ3** (threshold 80% do detector): {confirmado / ajustado}
- **OQ11** (flag opt-out de telemetria): {decisão da Onda 1}

## O que vem na Onda 2

Com baseline coletada, Onda 2 desbloqueia:
- Token Tax audit (já temos campo `tokens_aproximados_consumidos`)
- Comprehension Debt tracking
- Perfil DDD strategic e Monorepo
- Skill `/dependency-graph` (depende de tooling AST/MCP)

## Como atualizar

Veja `docs/upgrade-v52-to-v53.md`.

TL;DR: opt-in puro. Sem ação, plugin se comporta como v5.2.

## Reconhecimentos

Plugin desenvolvido com Claude Code como pair programming. Filosofia "humano navega, agente pilota" aplicada ao próprio framework.
```

### Passo 5: Substituir placeholders pelos números reais

Antes de commitar, substituir `{N}`, `{X}`, `{perfil}`, `{resposta empírica}` pelos valores extraídos de `baseline-v53-onda1.md` (gerado em fase-04).

### Passo 6: Lint dos markdowns

```bash
# Se houver linter de markdown configurado
bun run lint
```

---

## Gotchas

- **G12 do plano:** Sem essas referências (D1, D7, OQs), comunidade externa fica perdida. Verificar manualmente que cada artefato cita as decisões pertinentes.
- **G3 do plano:** Em todo lugar onde tokens são mencionados, usar "estimado". Validar com `grep -i 'token' anti-vibe-coding/docs/release-notes-v53.md` e revisar contexto de cada match.
- **Local:** CHANGELOG.md pode já existir com entradas anteriores. Adicionar v5.3 NO TOPO (ordem reversa cronológica do Keep a Changelog).
- **Local:** Datas reais podem deslizar (G15). Usar a data real de release no header — não 2026-05-19 hardcoded.
- **Local:** Se OQ1, OQ3 ou OQ11 não tiveram resposta clara durante o dogfooding (dados insuficientes), registrar honestamente em release notes ("dados insuficientes — Onda 2 manterá pergunta em aberto") em vez de inventar.
- **Local:** NÃO criar README novo na raiz do plugin se já existir — apenas atualizar referências para v5.3 se houver.

---

## Verificacao

### Checklist

- [ ] `anti-vibe-coding/CHANGELOG.md` existe e tem entrada `[5.3.0]` no topo
- [ ] `anti-vibe-coding/docs/upgrade-v52-to-v53.md` criado e revisado
- [ ] `anti-vibe-coding/docs/release-notes-v53.md` criado e revisado
- [ ] Todos os placeholders `{...}` substituídos por valores reais do baseline
- [ ] Cada artefato menciona D1 (público híbrido) e D7 (privacy-first) ao menos uma vez
- [ ] OQ1, OQ3, OQ11 mencionadas em release-notes-v53.md com resposta (ou "Onda 2 manterá pergunta em aberto" se aplicável)
- [ ] Palavra "estimado" usada em todos os contextos onde tokens são mencionados
- [ ] Lint limpo: `bun run lint` (se configurado)
- [ ] CHANGELOG no formato Keep a Changelog (seções Added/Changed/Fixed/Removed conforme aplicável)

### TDD

N/A — fase de documentação.

---

## Criterio de Aceite

**Por maquina:**
- Os 3 arquivos existem e são não-vazios:
  ```bash
  test -s anti-vibe-coding/CHANGELOG.md && \
  test -s anti-vibe-coding/docs/upgrade-v52-to-v53.md && \
  test -s anti-vibe-coding/docs/release-notes-v53.md
  ```
- Nenhum placeholder remanescente: `grep -E '\{N\}|\{X\}|\{perfil\}|\{resposta' anti-vibe-coding/CHANGELOG.md anti-vibe-coding/docs/upgrade-v52-to-v53.md anti-vibe-coding/docs/release-notes-v53.md` retorna vazio
- CHANGELOG menciona "5.3.0": `grep '\[5.3.0\]' anti-vibe-coding/CHANGELOG.md` retorna ao menos 1 match

**Por humano:**
- Release notes legíveis para alguém que nunca usou o plugin (teste com olhos frescos — princípio do CLAUDE.md)
- Upgrade guide é executável passo-a-passo sem ambiguidade
- CHANGELOG segue convenção Keep a Changelog reconhecida pela comunidade

---

<!-- Gerado por /plan-feature em 2026-05-04 -->

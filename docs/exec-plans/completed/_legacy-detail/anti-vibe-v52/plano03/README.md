# Plano 03 — Skills Standalone Pós-Deploy

## Visão Geral

Cria quatro skills standalone voltadas para o ciclo pós-deploy: resposta a incidentes, hardening defensivo, centralização de configuração e pair-programming disciplinado com agente.

**Sizing estimado:** ~4h (1h por fase)
**Depende de:** Plano 02 (políticas D3/D7 consolidadas — as skills as referenciam)
**Desbloqueia:** Plano 04 (/iterate referencia estas skills como building blocks)

## Decisões do PRD Aplicadas

### D4 — Loop pós-produção
`/iterate` como skill standalone. As skills desta fase alimentam o /iterate como steps discretos.

### D5 — Skills standalone
`incident-response`, `defensive-patterns`, `centralize-config` ficam standalone — invocadas manualmente OU dentro do /iterate. Não exigem sequência fixa.

### D8 — Pair-programming com agente
Skill tutorial: quando interromper o agente, quando navegar vs pilotar, sinais de erro antes de terminar, como injetar contexto de domínio.

## Arquivos a Criar

| Fase | Arquivo |
|------|---------|
| 01 | `anti-vibe-coding/skills/incident-response/SKILL.md` |
| 02 | `anti-vibe-coding/skills/defensive-patterns/SKILL.md` |
| 03 | `anti-vibe-coding/skills/centralize-config/SKILL.md` |
| 04 | `anti-vibe-coding/skills/pair-programming-with-agent/SKILL.md` |

## Fases

| Fase | Nome | Status |
|------|------|--------|
| 01 | `incident-response` skill | pending |
| 02 | `defensive-patterns` skill | pending |
| 03 | `centralize-config` skill | pending |
| 04 | `pair-programming-with-agent` skill | pending |

## Gotchas Globais

- `anti-vibe-coding/` é repositório git independente — commits dentro dele, não no repo pai
- Cada skill é um diretório com `SKILL.md` dentro (ex: `skills/incident-response/SKILL.md`)
- Skills devem ter ≤200 linhas — manter densidade, evitar prosa
- Frontmatter obrigatório: `name`, `description`, `user-invocable`, `disable-model-invocation`, `allowed-tools`, `argument-hint`
- Standalone obrigatório — cada skill funciona sem as outras serem invocadas primeiro
- NÃO criar `plugin-manifest.json` ainda — Plano 04 fase-03 faz o registro
- NÃO criar diretórios de skills que já existem — verificar com `ls` antes de criar

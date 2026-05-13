# Plano 04 — Skill /iterate + Pipeline Integration

**Status:** pending  
**Sizing:** ~3h  
**Depende de:** Plano 03 (skills standalone que /iterate referencia)  
**Desbloqueia:** Plano 06 (auditores verificam integração completa)

## Objetivo

Fechar o ciclo do pipeline com a "quarta pata" do mantra:

```
Ensinar → Planejar → Verificar → Iterar em produção
```

O `/iterate` guia o dev no ciclo pós-deploy: capturar incidentes, escrever regression tests, corrigir e endurecer o sistema. Também integra sugestões de próximo passo no `/verify-work` e atualiza manifesto + CLAUDE.md do plugin.

## Fases

| Fase | Nome | Sizing | Arquivo a criar/modificar |
|------|------|--------|---------------------------|
| 01 | iterate-skill | ~1.5h | `skills/iterate/SKILL.md` (novo) |
| 02 | verify-work-integration | ~0.5h | `skills/verify-work/SKILL.md` (editar) |
| 03 | plugin-manifest-update | ~1h | `plugin-manifest.json` + `CLAUDE.md` (editar) |

## Skills do Plano 03 que /iterate referencia

- `/anti-vibe-coding:incident-response` — modo aprofundado de incident
- `/anti-vibe-coding:defensive-patterns` — menu de categorias de hardening
- `/anti-vibe-coding:centralize-config` — centralizar config espalhada

## Decisões aplicadas

- **D4:** /iterate é skill standalone, não estende execute-plan. Pipeline cíclico: deploy → observe → iterate → deploy
- **D5:** regression-fix e hardening aparecem como opções sugeridas após verify-work
- **CA-05:** /iterate guia sequencialmente: logs → regression test → fix → confirma → commit
- **CA-08:** Se invocada sem contexto de deploy → avisa e oferece `/tdd-workflow`

## Gotchas

- `anti-vibe-coding/` é repositório git independente — commits dentro dele, não no pai
- Skills ≤ 200 linhas
- Instruções executáveis dentro de blocos de código (lição do CLAUDE.md do plugin)
- Adicionar entries ao plugin-manifest.json sem quebrar JSON existente
- Adicionar linhas à tabela de Skills no CLAUDE.md sem reformatar toda a tabela

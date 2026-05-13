# Plano 05 — /init e /update: Template Akita

**Sizing:** ~2.5h  
**Status:** planned  
**Depende de:** Plano 02 (política de comentários consolidada)  
**Desbloqueia:** Plano 06

## Objetivo

Integrar os princípios Akita ao template gerado pelo `/init` e implementar o mecanismo de upgrade gerenciado com diff + confirmação por seção no `/update`.

## Fases

| Fase | Nome | Sizing | Arquivo alvo |
|------|------|--------|--------------|
| 01 | Update `skills/init/SKILL.md` — merge do template Akita | ~1.5h | `anti-vibe-coding/skills/init/SKILL.md` |
| 02 | Update `skills/update/SKILL.md` — upgrade gerenciado | ~1.0h | `anti-vibe-coding/skills/update/SKILL.md` |

## Decisões do PRD aplicadas

**D9 (/init merge Akita):**
- Integrar ao template existente do /init (MERGE, não substituição)
- Seções a adicionar: Code style for agents, Comments, Tests, Dependencies, Logging
- Multi-linguagem: TS/JS + Python + Ruby (Go/Rust fora de escopo nesta versão)

**D10 (/update breaking gerenciado):**
- /update faz merge com confirmação explícita por seção
- Mostrar diff por seção → usuário confirma "aplicar" ou "pular"
- CA-07: não aplicar nada sem confirmação explícita

## Contexto técnico crítico

- `anti-vibe-coding/` é repositório git independente — commits dentro dele, não no repo pai
- Estratégia MERGE para CLAUDE.md (esta fase não toca hooks/agents)
- Template Akita no /init deve ser multi-linguagem (tabs ou seções por linguagem)
- Não quebrar o /init existente — adição pura, sem remover nada do template atual
- Instruções executáveis dentro de blocos de código (lição aprendida)

## Arquivos de referência

- `f:\Projetos\Claude code\anti-vibe-coding\skills\init\SKILL.md` — estado atual lido
- `f:\Projetos\Claude code\anti-vibe-coding\skills\update\SKILL.md` — estado atual lido
- `f:\Projetos\Claude code\anti-vibe-coding\CLAUDE.md` — padrões do plugin

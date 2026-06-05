---
title: "Colisão de arquivo entre fases: resolver por execução serial + re-leitura do committed"
category: pattern
tags: [execute-plan, collision, graft, parallel-subagents, file-edit, anchor]
created: 2026-06-05
---

## Problem

Quando duas fases de um plano editam o **mesmo arquivo** (colisão), rodá-las em paralelo
(subagentes isolados) corrompe o resultado: a segunda fase escreve sobre um estado que não
enxerga, gerando seções duplicadas, conteúdo sobrescrito ou perda de trabalho verificado.

No skill-parity-refresh houve 4 colisões (security/SKILL.md, iterate/SKILL.md, qa-visual/SKILL.md,
write-prd/templates/prd-template.md). Naïvemente, um agente tentaria editar ambos os grafts numa
passada — e a colisão #3 (qa-visual) teria virado DUAS seções de segurança (`## Security Boundaries`
EN + `## Limites de Seguranca` PT) cobrindo o mesmo terreno, violando "Uma Fonte de Verdade".

## Solution

Serializar as fases que colidem e resolver por re-leitura do estado committed:

1. **Fase-base primeiro, commitada.** A fase que cria a âncora roda sozinha e faz commit.
2. **Fase-consumidora relê o arquivo committed** (não confia em memória — context-decay guard) e
   escolhe a resolução conforme o conteúdo se sobrepõe ou não:
   - **Expand-in-place** quando os grafts cobrem o mesmo tópico: a 2ª fase EXPANDE a seção que a 1ª
     criou, em vez de criar uma nova. Guard de dedupe: `grep -c '^## Heading' == 1`. (colisões #1
     security §9←Dependency Discipline; #3 qa-visual `## Limites de Seguranca`.)
   - **Âncora distinta** quando os grafts são aditivos paralelos: a 2ª fase insere seções novas em
     pontos diferentes do arquivo, sem tocar no que a 1ª escreveu. (colisões #2 iterate; #4
     prd-template.) Guard: `grep` confirma que ambos os conteúdos coexistem.

Casar SEMPRE por texto de heading/âncora, nunca por número de linha (a 1ª fase deslocou as linhas).

## Prevention

- No orquestrador (execute-plan), detectar colisões pelo `target_files` dos planos ANTES de
  paralelizar; alocar fases colidentes no mesmo plano e em rounds seriais (base → consumidora).
- Passar à fase-consumidora uma instrução explícita de resolução (expand vs distinct-anchor) e o
  guard de `grep -c == 1` quando for expand — senão o subagente segue o texto literal do plano-fonte
  (que muitas vezes diz "Insert a new section", criando a duplicata).
- Complementa `docs/compound/2026-05-17-multi-auditor-parallel-wave-hardening.md` (regra "mesmo
  arquivo → mesma wave"): esta nota cobre a MECÂNICA de resolução da colisão, não só o agrupamento.
- Relacionado: `docs/compound/2026-05-19-anchor-presence-vs-content-match.md`.

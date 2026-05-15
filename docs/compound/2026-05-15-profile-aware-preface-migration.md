---
title: "Migração v6.3.0 — profile-aware-preface em 6 skills"
category: arquitetura
tags: [adaptive-coaching, preface, skills, migration, lookup-table]
created: "2026-05-15"
---

## Problem

O padrão `profile-aware-preface` estava provado em 1 skill (`/architecture`), mas replicação em 6 skills levantou duas tensões não-triviais:

**Tensão 1 — per-skill lookup table vs God-table central:** Onde mora o mapa `Record<ArchitectureProfileName, string>` de cada skill? Uma opção era centralizar em `skills/lib/all-prefaces.ts`; a outra era per-skill em `skills/{skill}/lib/{skill}-prefaces.ts`. Cada opção tem trade-off de acoplamento vs discovery.

**Tensão 2 — como o harness valida skills legadas:** O check `checkProfileAwarePreface` precisava lidar com skills que usam `readArchitectureProfile` direto (a API legada, não `readPrefaceContext`) e skills cujo bloco marcado contém apenas prosa-only sem código executável. Forçar API única antes de migração coordenada teria quebrado o gate de CI e bloqueado o release.

As duas tensões revelaram um anti-pattern documentável: spec estrita vs realidade do codebase quando migração é incremental.

## Solution

**Tensão 1 — per-skill lookup table venceu (G3 do plano).**

Cada skill tem seu próprio `skills/{skill}/lib/{skill}-prefaces.ts` exportando `{SKILL}_PREFACE_BY_PROFILE` e `DEFAULT_{SKILL}_PREFACE`. Razão: cada skill evolui sua narrativa adaptativa de forma independente; uma God-table central acoplaria updates de prompts entre skills não-relacionadas (ex: `/security` e `/lessons-learned` não compartilham vocabulário de adaptação). Custo aceito: leve duplicação de imports — `import { readPrefaceContext }` repetido em 6 arquivos. Acoplamento evitado vale mais do que a duplicação.

**Tensão 2 — tolerâncias intencionais no harness com plano de unificação para v6.5.**

O validator `checkProfileAwarePreface` aceita `readArchitectureProfile` como alternativa válida a `readPrefaceContext` para skills legadas (DI-4 do MEMORY.md). Skills prosa-only sem bloco executável recebem skip silencioso em vez de falha (DI-5). Essas tolerâncias são intencionais e documentadas — não são buracos no validator, são decisões de tradeoff com data de validade (v6.5: migração coordenada para `readPrefaceContext` único). Trade-off explícito: harness gate verde no curto prazo vs débito técnico de dois caminhos de leitura coexistindo.

Uma observação adicional (DI-2 do MEMORY.md): skills meta-orquestradoras (`/lessons-learned`, `/decision-registry`) se beneficiam de preface mesmo sem consultar código diretamente — preface pode sugerir tags, categorização e framing contextual baseado no perfil do projeto. A heurística "skipar meta-skills" não é absoluta.

## Prevention

1. **Lookup tables SEMPRE em `skills/{skill}/lib/`, NUNCA em `skills/lib/all-prefaces.ts` central.** God-table acoplará updates de prompts entre skills não-relacionadas e vira débito técnico em 6 meses quando um skill evoluir sua narrativa e o autor não perceber que o arquivo central afeta todas as outras.
2. **Harness checks textuais devem ser bidirecionais (start + end + ref) quando dependem de markers.** Sem AST parser disponível (apenas `string.includes()`), o único caminho confiável é checar os três artefatos: marker de abertura, marker de fechamento, e referência ao helper — faltar qualquer um indica preface malformada, não parcialmente presente.
3. **Quando spec exige API nova (`readPrefaceContext`) mas codebase tem API legada (`readArchitectureProfile`), validator deve aceitar ambas até migração coordenada.** Forçar API única antes da migração quebra o harness gate e bloqueia o release. A tolerância deve ser documentada com data de validade explícita (ex: "resolver em v6.5 na migração coordenada") para não virar legacy silencioso.
4. **A heurística "meta-skills não precisam de preface" não é absoluta.** Skills que orquestram trabalho meta (lessons, decisions) podem se beneficiar de preface para sugerir categorização e tags contextuais baseadas no perfil do projeto. Avaliar caso a caso em vez de aplicar a heurística cegamente.

## See Also

- PRD: `docs/exec-plans/active/2026-05-14-v6.3.0-adaptive-coaching/PRD.md`
- ADR: `docs/design-docs/ADR-0020-adaptive-coaching.md`
- Doc canônico: `docs/design-docs/adaptive-coaching-framework.md`
- Referência: `skills/architecture/SKILL.md`
- Plano: `docs/exec-plans/active/2026-05-14-v6.3.0-adaptive-coaching/plano04/`

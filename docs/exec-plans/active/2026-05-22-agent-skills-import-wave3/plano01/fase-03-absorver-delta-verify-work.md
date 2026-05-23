# Fase 03: TRACER BULLET — Absorver Delta em verify-work + Regenerar Manifest

**Plano:** 01 — Consolidacao /anti-vibe-review -> /verify-work
**Sizing:** 1h
**Depende de:** fase-01 (gap-analysis define o delta), fase-02 (deprecation notice ja aplicado)
**Visual:** false

---

## O que esta fase entrega

Conteudo unico (Bucket A do gap-analysis) absorvido em `skills/verify-work/SKILL.md` como secoes novas. Manifest SHA-256 regenerado para refletir checksums atualizados de `anti-vibe-review/SKILL.md` (fase-02) e `verify-work/SKILL.md` (esta fase). Atende MH-02 e CA-02 do PRD. **Esta e a TB do plano: prova consolidacao funcional end-to-end com harness verde.**

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/verify-work/SKILL.md` | Modify | Adicionar 3 secoes novas conforme Bucket A do gap-analysis |
| `plugin-manifest.json` | Modify | Regenerar checksums SHA-256 (skills/anti-vibe-review + skills/verify-work) |
| `.claude-plugin/plugin.json` | Modify | Regenerar checksums SHA-256 idem |

**Nao toca:**
- Blocos `typescript` de telemetria em verify-work/SKILL.md (linhas 10-57 inicio, e bloco final) — G4 do plano
- Frontmatter de verify-work/SKILL.md (linhas 1-8)
- Steps existentes 1, 2, 3, 4, 5 (apenas ADICIONA secoes novas, nao modifica existentes)

---

## Implementacao

### Passo 1: Reler gap-analysis.md (do fase-01) e identificar Bucket A

Conforme fase-01, Bucket A deve ter ≥3 conceitos:
1. **Estrategia Staged/Unstaged** (linhas 155-163 de anti-vibe-review)
2. **Heuristica "nomes grepáveis"** (linha 64 de anti-vibe-review)
3. **Deep Modules inline check** (linhas 77-81 de anti-vibe-review)

Se o gap-analysis identificou conceitos diferentes/adicionais, ajustar este passo de acordo.

### Passo 2: Reler verify-work/SKILL.md (integridade pre-edit)

Conforme CLAUDE.md: reler na integra antes de qualquer Edit. Mapear pontos de insercao:

- Inserir `## Estrategia Staged/Unstaged` ANTES de `## Regras` (existente na linha ~526)
- Inserir nota inline sobre "nomes grepáveis" em Step 2 (proxima a referencia a `code-smell-detector`)
- Inserir pre-check de Deep Modules em Step 2c (Auditores Domain-Specific)

### Passo 3: Adicionar `## Estrategia Staged/Unstaged`

Localizar a secao `## Regras` em verify-work/SKILL.md (linha ~526) e inserir ANTES dela:

```markdown
## Estrategia Staged/Unstaged (Consolidado de anti-vibe-review)

Para comparar codigo antes e depois da verificacao sem perder o trabalho original, recomenda-se o fluxo Staged/Unstaged:

1. Deixar as alteracoes em **staged**: `git add <arquivos>`
2. Executar `/verify-work` (audit pipeline e debug agent operam sobre staged)
3. Solicitar que as melhorias propostas (apos analise do report) sejam aplicadas como **unstaged** (sem `git add`)
4. Comparar com `git diff` — staged = codigo original, unstaged = codigo revisado
5. Aceitar ou rejeitar cada melhoria individualmente com `git add -p`

> Nota: esta estrategia foi originalmente documentada em `/anti-vibe-review` (skill consolidada em Wave 3). Preservada aqui por valor operacional independente do audit pipeline automatizado.

---
```

### Passo 4: Adicionar nota "nomes grepáveis" em Step 2

Localizar a referencia a `code-smell-detector` em Step 2b (linha ~152-154) e adicionar nota inline:

```markdown
**code-smell-detector:**
- Input: todos os arquivos modificados
- Verifica: God objects, funcoes longas, DRY violations, magic numbers
- Skippado se: config.auditors.code_quality = false
- **Heuristica pratica (consolidada de anti-vibe-review):** nomes grepáveis — para identificadores de funcoes/tipos/constantes criados, rodar `grep -c <nome> src/` e verificar se retorna <5 hits nao relacionados. Se >10 hits, o nome e generico demais e dificulta refatoracao segura. Esta heuristica complementa o auditor automatizado (que detecta padroes mas nao mede greppability).
```

### Passo 5: Adicionar pre-check Deep Modules em Step 2c

Localizar Step 2c (Auditores Domain-Specific, linha ~157) e adicionar nota inline:

```markdown
### 2c. Auditores Domain-Specific (condicional, se config.auditors.domain_specific = true)

Spawn apenas dos detectados na classificacao de arquivos modificados.

Spawn todos em paralelo com os fixos (mesma mensagem, multiplos Agent calls).

**Pre-check Deep Modules (consolidado de anti-vibe-review):** antes de spawnar `solid-auditor`, considere avaliar se os modulos modificados expoem interface pequena com implementacao rica (deep) ou interface quase tao complexa quanto implementacao (shallow). Sinal de modulo shallow: muitos metodos publicos, muitos parametros expostos. Sinal de deep: interface pequena, implementacao rica. Em caso de shallow, o relatorio pode incluir warning de encapsulamento alem dos findings do auditor. Referencia: `skills/tdd-workflow/references/deep-modules.md`.
```

### Passo 6: Regenerar manifest

Verificar nome do script no `package.json`:

```bash
grep -E "generate.*manifest|manifest.*generate" package.json
```

Executar (nome exato depende do package.json — exemplos comuns):

```bash
bun run generate:manifest
# OU
bun run manifest:generate
# OU
node scripts/generate-manifest.js
```

Validar que `plugin-manifest.json` e `.claude-plugin/plugin.json` foram atualizados:

```bash
git diff --stat plugin-manifest.json .claude-plugin/plugin.json
# Esperado: ambos arquivos com mudancas (checksums atualizados)
```

### Passo 7: Validar harness

```bash
bun run harness:validate
# Esperado: zero erros novos
```

Se `harness:validate` reportar erro de checksum, re-executar generate:manifest (passo 6).

---

## Gotchas

- **G4 do plano:** verify-work/SKILL.md tem blocos `typescript` de telemetria (linhas 10-57 e bloco final apos linha ~539). NAO tocar nesses blocos — Edit cirurgico apenas em secoes markdown puras.
- **G6 do plano:** Manifest regeneration e MANDATORIA. Sem ela, harness:validate falha. Confirmar nome do script antes de invocar (varia entre projetos).
- **Local — preservar Steps existentes:** As 3 absorcoes sao ADICOES, nao substituicoes. Steps 1-5 + "Fase Final" devem permanecer estruturalmente intactos. Inserir blocos novos ENTRE elementos existentes, nunca substituir.
- **Local — autoria explicita:** Cada bloco absorvido cita "(Consolidado de anti-vibe-review)" — preserva linhagem conceitual e facilita auditoria futura de proveniencia. Padrao consistente com como Wave 2 trata absorcoes (DT-5 do PRD: refactor por adicao).
- **Local — Bucket A pode crescer apos fase-01:** Se gap-analysis identificar 4+ conceitos para absorver (nao apenas os 3 esperados), criar secoes/notas adicionais seguindo o mesmo padrao. Sizing 1h tem folga para 4-5 absorcoes pequenas; >5 absorcoes pode estender para 1.5h (registrar em MEMORY como desvio).

---

## Verificacao

### TDD

- [ ] **RED:** Antes da edicao, `grep -c "Estrategia Staged/Unstaged" skills/verify-work/SKILL.md` retorna `0`
- [ ] **GREEN:** Apos a edicao, mesmo grep retorna `1`
- [ ] **RED:** Antes da edicao, `grep -c "nomes grepáveis" skills/verify-work/SKILL.md` retorna `0`
- [ ] **GREEN:** Apos a edicao, mesmo grep retorna `1`

### Checklist

- [ ] 3+ absorcoes do Bucket A aplicadas em verify-work/SKILL.md
- [ ] Cada absorcao cita "Consolidado de anti-vibe-review" para preservar linhagem
- [ ] Blocos `typescript` de telemetria intactos (validar via grep antes/depois: `grep -c "writeTelemetryStart\|writeTelemetryEnd" skills/verify-work/SKILL.md` igual antes e depois)
- [ ] Steps 1, 2, 3, 4, 5 e "Fase Final" presentes e estruturalmente intactos
- [ ] `plugin-manifest.json` atualizado (git diff mostra mudanca em campos de checksum)
- [ ] `.claude-plugin/plugin.json` atualizado idem
- [ ] `bun run harness:validate` verde (zero erros novos)
- [ ] `bun run test` verde (zero regressoes)
- [ ] `bun run lint` verde

---

## Criterio de Aceite

**CA-02 do PRD:** "Dado [skills/verify-work/SKILL.md], quando comparado com `anti-vibe-review`, entao contem todo conceito de `anti-vibe-review` nao duplicado — sem perda de conteudo util."

**Por maquina:**
- `grep -c "Consolidado de anti-vibe-review" skills/verify-work/SKILL.md` retorna ≥3 (3 absorcoes do Bucket A com linhagem explicita)
- `grep -c "Staged/Unstaged" skills/verify-work/SKILL.md` retorna ≥1
- `grep -c "nomes grepáveis" skills/verify-work/SKILL.md` retorna ≥1
- `grep -c "Deep Modules\|deep-modules" skills/verify-work/SKILL.md` retorna ≥1
- `bun run harness:validate` exit code 0
- `bun run test` exit code 0

**Por humano:**
- Comparar gap-analysis.md (Bucket A) com SKILL.md final: todo conceito unico foi absorvido? Nenhuma duplicacao de Bucket B foi adicionada por engano?

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

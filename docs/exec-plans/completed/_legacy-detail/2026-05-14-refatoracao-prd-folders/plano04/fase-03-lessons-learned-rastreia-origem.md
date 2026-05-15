# Fase 03: Lessons-learned rastreia origem do PRD

**Plano:** 04 — Extras (Could Have — cortavel)
**Sizing:** 0.5h
**Depende de:** Nenhuma (INDEPENDENTE das outras fases deste plano). Pre-requisito externo: Plano 03 fase-03 (para existir pasta `.planning/_archive/`)
**Visual:** false

---

## O que esta fase entrega

`/lessons-learned add` infere o PRD de origem automaticamente olhando o mais recente em
`.planning/_archive/` (ordenacao por data descendente) e adiciona linha
`**Origem:** .planning/_archive/{pasta}/SUMMARY.md` a licao registrada. Satisfaz **RF10** e
**D12**. Preserva comportamento atual quando `_archive/` vazio ou ausente.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lessons-learned/SKILL.md` | Modify | No fluxo `add`, apos formatar a licao e antes de salvar, inferir PRD mais recente de `.planning/_archive/` e injetar linha `**Origem:**` no bloco |

---

## Implementacao

### Passo 1: Adicionar Step de inferencia no fluxo `add`

A skill atual tem o bloco **"Ao adicionar (`add`)"** com 6 passos. Inserir logica de inferencia
entre o Passo 4 (formatar) e o Passo 5 (salvar). Nao alterar Passo 6 (promocao a senior-principles).

Localizar em `lessons-learned/SKILL.md` a secao `### Ao adicionar (\`add\`):`:

```
Passo atual 4 — "Se passar, adicionar no formato correto"
    |
    v
NOVO Passo 4b — Inferir origem do PRD mais recente em _archive/
    |
    v
Passo atual 5 — "Se nao passar, explicar por que nao qualifica"
(renumerar para 6)
```

Pseudo-codigo do novo passo:

```
Passo 4b — Inferir origem do PRD

1. Glob `.planning/_archive/YYYY-MM-DD-*/`
   - Matcher: `^\d{4}-\d{2}-\d{2}-.+$` (data prefixo + slug kebab)
2. Se resultado vazio ou `.planning/_archive/` nao existe:
   - NAO adicionar linha de origem (G10 — comportamento atual preservado)
   - Prosseguir ao salvar
3. Se encontrou pastas:
   - Ordenar descendente por nome (ordem lexicografica eh igual a cronologica pra YYYY-MM-DD)
   - Pegar a primeira (mais recente)
   - Construir string: `**Origem:** .planning/_archive/{pasta}/SUMMARY.md`
4. Injetar a string como TERCEIRA linha do bloco da licao, apos `**Contexto:**`:

   ### [Categoria] Titulo conciso da licao
   **Regra:** ...
   **Contexto:** ...
   **Origem:** .planning/_archive/2026-04-20-auth/SUMMARY.md   <-- NOVO

5. Prosseguir ao salvar com a licao ja formatada
```

### Passo 2: Formato da linha de origem

Formato exato (G12 do README):

```
**Origem:** .planning/_archive/{nome-da-pasta}/SUMMARY.md
```

Observacoes:
- Path relativo da raiz do projeto, como os outros paths da skill
- Usar `SUMMARY.md` fixo (nao tenta inferir secao dentro — D12 do CONTEXT menciona
  `#secao` opcional mas nao eh parte do MVP desta fase — pode ser evolucao futura)
- Se por algum motivo `SUMMARY.md` nao existir dentro da pasta, AINDA assim incluir a linha
  (dev pode verificar a pasta como um todo — link quebrado eh melhor que falha silenciosa)

### Passo 3: Compatibilidade com arquivo de licoes existente

`lessons-learned/SKILL.md` menciona `.claude/lessons.md OU secao no CLAUDE.md`. Fase-03 NAO altera
onde a licao eh salva — apenas adiciona uma linha ao bloco formatado. Ambos destinos continuam
funcionando (G13 do README).

### Passo 4: Dogfooding manual

Fixture:

```
.planning-test/_archive/
├── 2026-01-10-auth/
│   └── SUMMARY.md
├── 2026-03-15-billing/
│   └── SUMMARY.md
└── 2026-04-18-dashboard/
    └── SUMMARY.md        <-- mais recente
```

Cenarios:

1. **Com `_archive/` populado:** Rodar `/lessons-learned add "Algo especifico do projeto"`
   - Esperado: bloco gerado tem linha
     `**Origem:** .planning/_archive/2026-04-18-dashboard/SUMMARY.md`
2. **Com `_archive/` vazio:** Limpar a pasta, rodar de novo
   - Esperado: bloco SEM linha `Origem:` (comportamento atual)
3. **Sem `_archive/` (nao existe):** Deletar a pasta, rodar
   - Esperado: bloco SEM linha `Origem:` (comportamento atual, sem crash)

---

## Gotchas

- **G1 do plano (G10 README — skill sem parametro de path):** Nao adicionar flag nova a
  `lessons-learned`. Inferir automaticamente via filesystem. Mais simples e respeita interface
  existente.
- **G2 do plano (ordenacao lexicografica = cronologica):** Formato `YYYY-MM-DD` permite sort
  alfabetico direto como cronologico. Nao precisa parsing de data (DI-1 possivel na MEMORY).
- **G3 do plano (G12 README — posicao da linha):** `**Origem:**` vai APOS `**Contexto:**`, NAO
  antes de `**Regra:**`. Manter ordem: Regra -> Contexto -> Origem.
- **G4 do plano (G13 README — destino das licoes):** A linha eh adicionada ao bloco da licao
  **antes** de salvar — independente de onde a skill grava (CLAUDE.md vs .claude/lessons.md).
  Nao precisa tratar os dois destinos diferentemente.
- **Local (ambiguidade de "mais recente"):** Se 2 pastas arquivadas no mesmo dia (ex: `-v2`),
  pegar qualquer uma (sort estavel). Nao eh critico — dev pode corrigir manualmente se errado.
- **Local (SUMMARY.md ausente):** Ainda assim incluir a linha. Link quebrado > falha silenciosa
  (auditabilidade — D12).
- **Local (edicao de arquivo de licoes):** Ao inserir linha nova no bloco, usar Edit com
  `old_string = "**Contexto:** ...\n"` exato + `new_string = "**Contexto:** ...\n**Origem:** ...\n"`.
  Nao reescrever o arquivo inteiro.

---

## Verificacao

### TDD

Dogfooding manual.

- [ ] **RED manual:** Sem a alteracao, rodar `/lessons-learned add ...` com `_archive/` populado —
  bloco gerado NAO tem linha `Origem:`
- [ ] **GREEN:** Com a alteracao, bloco gerado tem linha `**Origem:** .planning/_archive/{pasta-mais-recente}/SUMMARY.md`

### Checklist

- [ ] `lessons-learned/SKILL.md` tem novo Passo 4b entre os atuais 4 e 5
- [ ] Passo 4b enumera `.planning/_archive/YYYY-MM-DD-*/`
- [ ] Ordenacao descendente por nome (lexicografica = cronologica)
- [ ] Pasta mais recente vira `**Origem:** .planning/_archive/{pasta}/SUMMARY.md`
- [ ] Linha eh injetada APOS `**Contexto:**`
- [ ] `_archive/` vazio: bloco sem linha de origem
- [ ] `_archive/` ausente: bloco sem linha de origem, skill nao crasha
- [ ] Formato do bloco preservado (categorias, Regra, Contexto inalterados)
- [ ] Fluxo de promocao a senior-principles (Passo 6 original) preservado

---

## Criterio de Aceite

**Por humano (dogfooding):**
- Dado `.planning/_archive/` com 1+ pastas datadas e `SUMMARY.md` dentro, quando rodar
  `/lessons-learned add "texto"` e a licao passar no filtro de qualidade, entao o bloco salvo
  contem linha `**Origem:** .planning/_archive/{pasta-mais-recente}/SUMMARY.md` (RF10).
- Dado `.planning/_archive/` vazio ou inexistente, quando rodar `/lessons-learned add`, entao o
  bloco salvo NAO contem linha `Origem:` — comportamento atual preservado.

**Por maquina:**
- Grep em `lessons-learned/SKILL.md` encontra string "Passo 4b" ou "Inferir origem"
- Grep em `lessons-learned/SKILL.md` encontra padrao `\*\*Origem:\*\*`
- Grep em `lessons-learned/SKILL.md` encontra string `_archive`

---

<!-- Gerado por /plan-feature em 2026-04-20 -->

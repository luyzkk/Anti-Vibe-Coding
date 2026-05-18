<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Fixture Greenfield v6.4

**Plano:** 07 — Aceitacao E2E + Release v6.4.0
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase do plano)
**Visual:** false

---

## O que esta fase entrega

Fixture E2E `tests/fixtures/greenfield-v6.4/` representando o cenario greenfield canonico da v6.4.0: repo absolutamente vazio sob a perspectiva do init — sem `CLAUDE.md`, sem `docs/`, sem `package.json`, sem `.claude/`. Apenas `.gitignore` minimo para que o checkin do fixture nao polua o filesystem ao rodar local. Consumido pela fase-03 (CA-12 E2E).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fixtures/greenfield-v6.4/.gitignore` | Create | 3 linhas: `node_modules/`, `.DS_Store`, `.anti-vibe/` (artefatos gerados pelo init nao entram no git history do fixture) |

**Total:** 1 arquivo novo. Diretorio criado implicitamente.

---

## Implementacao

### Passo 1: Criar diretorio

```bash
mkdir -p tests/fixtures/greenfield-v6.4
```

### Passo 2: Escrever `.gitignore` minimo

Conforme **G6 do README** (registry pos-reorder D23 nao afeta greenfield), o fixture nao precisa de nenhum arquivo de input alem do `.gitignore`. Razao: em greenfield, Step 06 (secrets-scan) nao tem o que escanear; Step 07 (discover-existing-docs) retorna lista vazia; Step 08 (classify-blocks-hybrid) tambem; Step 09 (propose-merge-batch) detecta "nada a propor" e retorna `mutated: false` sem chamar `needsUser` (G13 do `plano04/README.md`); Steps 10 e 11 idem. Step 91 entao gera o `PLAN.md` de populacao para todos os arquivos do `TEMPLATE_MANIFEST` excluindo filosoficos.

Conteudo exato do `.gitignore`:

```gitignore
# 2026-05-18 (Luiz/dev): fixture greenfield para CA-12 E2E (Plano 07 fase-03)
# Nao versionar artefatos gerados pelo /anti-vibe-coding:init dentro do fixture.
node_modules/
.DS_Store
.anti-vibe/
```

### Passo 3: Verificar estrutura

```bash
find tests/fixtures/greenfield-v6.4/ -type f
# Esperado: apenas 'tests/fixtures/greenfield-v6.4/.gitignore'
```

---

## Gotchas

- **G6 do README (registry reorder nao afeta greenfield):** Em greenfield sem `CLAUDE.md`, Steps 09/10/11 sao no-ops naturais. Reorder D23 (Step 10 antes Step 02) nao muda o comportamento aqui — Step 10 retorna `mutated: false` ("nothing to merge"), Step 02 cria CLAUDE.md a partir do AGENTS.md scaffoldado.
- **Local — sem `.git/`:** o fixture NAO contem `.git/` ao ser comitado (Bun test framework opera sobre a pasta nua). Quando o teste E2E copia o fixture para tmpdir, opcionalmente roda `git init` se algum step depender de gitSha (Plano 01 fase-02 G6 confirma que gitSha eh opcional — null quando ausente). Decisao default: NAO rodar `git init` em tmpdir (cobre o caminho greenfield sem git).
- **Local — fixture nao tem `package.json`:** Step `detect-stack` (id existente) classifica como `unknown` quando nao ha package.json. Isso eh o esperado para o cenario greenfield "limpo" — caso queira testar detect-stack populado, criar outro fixture. Plano 07 nao escopa isso.
- **Local — CRLF vs LF no Windows:** Adicionar opcional `.gitattributes` com `* text eol=lf` se for problema observado. **NAO** adicionar preventivamente — apenas se fase-03 reportar contagens flutuantes.

---

## Verificacao

### TDD

Esta fase eh **content authoring** (fixture estatico). Nao ha TDD codigo. Verificacao via grep/find apos criacao.

- [ ] Diretorio criado: `test -d tests/fixtures/greenfield-v6.4`
- [ ] Arquivo `.gitignore` existe: `test -f tests/fixtures/greenfield-v6.4/.gitignore`

### Checklist

- [ ] `find tests/fixtures/greenfield-v6.4/ -type f` retorna **exatamente** uma linha: `tests/fixtures/greenfield-v6.4/.gitignore`.
- [ ] `cat tests/fixtures/greenfield-v6.4/.gitignore | wc -l` retorna `4` (3 linhas de conteudo + linha de comentario + EOF — ajustar se necessario, mas conteudo deve incluir os 3 patterns canonicos).
- [ ] `grep -c '^node_modules/$' tests/fixtures/greenfield-v6.4/.gitignore` retorna `1`.
- [ ] `grep -c '^\.DS_Store$' tests/fixtures/greenfield-v6.4/.gitignore` retorna `1`.
- [ ] `grep -c '^\.anti-vibe/$' tests/fixtures/greenfield-v6.4/.gitignore` retorna `1`.
- [ ] Lint nao aplica (sem `.ts`/`.js`).
- [ ] `bun test` ainda verde (fixture novo nao deve quebrar testes existentes — checagem de sanidade).

---

## Criterio de Aceite

**Por maquina:**
- `find tests/fixtures/greenfield-v6.4/ -type f | wc -l` retorna `1`.
- `grep -E '^(node_modules/|\.DS_Store|\.anti-vibe/)$' tests/fixtures/greenfield-v6.4/.gitignore | sort -u | wc -l` retorna `3`.

**Por humano:** N/A (fixture estatico, sem UX).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-18 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Fixture Inverted Merge v6.4

**Plano:** 07 — Aceitacao E2E + Release v6.4.0
**Sizing:** 0.5h
**Depende de:** Nenhuma (independente da fase-01)
**Visual:** false

---

## O que esta fase entrega

Fixture E2E `tests/fixtures/inverted-merge-v6.4/` representando o cenario **migration** canonico da v6.4.0: repo com `CLAUDE.md` rico (regras Akita expandidas, ~287 linhas) e 4 docs estruturais existentes. Consumido pelas fases 03 (parcial — opcional para CA-12 ratificar caminho greenfield vs migration) e 04 (principal — CA-13 dry-run parity + CA-14 audit log ordem).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fixtures/inverted-merge-v6.4/.gitignore` | Create | mesmas 3 linhas da fase-01 + `.gitattributes` opcional (CRLF guard) |
| `tests/fixtures/inverted-merge-v6.4/.gitattributes` | Create | `* text eol=lf` para garantir contagem `wc -l == 287` consistente Win/Linux |
| `tests/fixtures/inverted-merge-v6.4/CLAUDE.md` | Create | EXATO 287 linhas — espelha trechos canonicos das 5 secoes Akita do PRD anterior (`assets/snippets/akita-*.md`) consolidados como bloco unico legado |
| `tests/fixtures/inverted-merge-v6.4/docs/PIPELINE.md` | Create | espelha versao reduzida de `docs/PIPELINE.md` real do plugin (deduplicada para evitar churn em harness:validate) |
| `tests/fixtures/inverted-merge-v6.4/docs/AGENTS_LIST.md` | Create | espelha versao reduzida de `docs/AGENTS_LIST.md` real |
| `tests/fixtures/inverted-merge-v6.4/docs/QUALITY_SCORE.md` | Create | espelha versao reduzida de `docs/QUALITY_SCORE.md` real |
| `tests/fixtures/inverted-merge-v6.4/docs/PRODUCT_SENSE.md` | Create | espelha versao reduzida de `docs/PRODUCT_SENSE.md` real |

**Total:** 7 arquivos novos. **Acima do limite de 5/fase do CLAUDE.md** — justificado por ser content authoring de fixture estatico (sem codigo de runtime, sem risco de regressao). Tabela Akita: "Fixture authoring" eh atividade onde o agente faz bem.

---

## Implementacao

### Passo 1: Criar diretorio + `.gitignore` + `.gitattributes`

```bash
mkdir -p tests/fixtures/inverted-merge-v6.4/docs
```

`.gitignore` (identico ao fase-01 com comentario adaptado):

```gitignore
# 2026-05-18 (Luiz/dev): fixture inverted-merge para CA-13 + CA-14 (Plano 07 fase-04)
node_modules/
.DS_Store
.anti-vibe/
```

`.gitattributes` (conforme **GT-? fase-02 do MEMORY**):

```gitattributes
# 2026-05-18 (Luiz/dev): forca LF em todos os arquivos de texto do fixture.
# wc -l do CLAUDE.md deve retornar 287 em Win/Linux/macOS sem variacao.
* text eol=lf
```

### Passo 2: Gerar `CLAUDE.md` com EXATAS 287 linhas

Conforme **G1 do README** (CA-14 integrado em fase-04), o conteudo eh livre — o numero exato de linhas eh o contrato. Compor a partir das 5 secoes Akita reais do plugin (`skills/init/assets/snippets/akita-code-style.md`, `akita-comments.md`, `akita-tests.md`, `akita-dependencies.md`, `akita-logging.md`) com cabecalhos descritivos no estilo de regras inline de CLAUDE.md historico, alinhado com o exemplo do PRD secao "Fluxos UX por Ator".

Estrutura sugerida (totalizando 287 linhas; ajustar densidade de cada secao para fechar a conta exata):

```markdown
# CLAUDE.md
# (Fixture v6.4 inverted-merge — gerado por Plano 07 fase-02)
# 2026-05-18 (Luiz/dev): 287 linhas para CA-13 (dry-run parity) e CA-14 (audit log ordem)
# Conteudo espelha regras Akita reais para que classifier (Plano 03 fase-05) reconheca padroes.

## Code Style (Akita)
{aproximadamente 60 linhas — copiar de `skills/init/assets/snippets/akita-code-style.md`}

## Comments (Akita)
{aproximadamente 40 linhas — copiar de `skills/init/assets/snippets/akita-comments.md`}

## Tests (Akita)
{aproximadamente 60 linhas — copiar de `skills/init/assets/snippets/akita-tests.md`}

## Dependencies (Akita)
{aproximadamente 50 linhas — copiar de `skills/init/assets/snippets/akita-dependencies.md`}

## Logging (Akita)
{aproximadamente 50 linhas — copiar de `skills/init/assets/snippets/akita-logging.md`}

## Environment Variables
{aproximadamente 15 linhas — bloco de exemplo `DATABASE_URL`, `JWT_SECRET`, etc. ATENCAO: NAO usar literais que casem com a regex do secrets-scanner (sk_live_*, AKIA*, postgres://user:pass) — usar placeholders como `<<DATABASE_URL>>` ou `${DATABASE_URL}` para nao acionar Step 06 e bloquear o move involuntariamente. Se o teste de CA-04 (secrets bloqueia move) for desejado, criar OUTRO fixture especifico.}

## Security Rules
{aproximadamente 12 linhas — auth/cors keywords para classifier mapear para SECURITY.md}
```

**Procedimento de execucao:**

1. Ler os 5 snippets `skills/init/assets/snippets/akita-*.md` na ordem listada.
2. Concatenar com cabecalhos `## {Secao}` (formato H2).
3. Adicionar bloco final `## Environment Variables` (placeholders, nao literais que acionam scanner — conforme nota acima).
4. Adicionar bloco final `## Security Rules` curto (cobre cenario do PRD Fluxos UX, mapeia para SECURITY.md).
5. Confirmar `wc -l` retorna exatamente `287`. Ajustar densidade do bloco "Security Rules" ou "Environment Variables" para fechar a contagem se necessario (esses 2 blocos sao os mais elasticos).

### Passo 3: Criar 4 docs estruturais

Espelhar versoes **reduzidas** dos arquivos reais do plugin para que classifier (Plano 03 fase-05) tenha sinais reais para classificar:

- `docs/PIPELINE.md`: copiar 15-30 linhas iniciais de `docs/PIPELINE.md` real do plugin — descreve o fluxo grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate.
- `docs/AGENTS_LIST.md`: copiar 15-30 linhas iniciais de `docs/AGENTS_LIST.md` real — lista de auditores.
- `docs/QUALITY_SCORE.md`: copiar 15-30 linhas iniciais de `docs/QUALITY_SCORE.md` real — rubrica de score.
- `docs/PRODUCT_SENSE.md`: copiar 15-30 linhas iniciais de `docs/PRODUCT_SENSE.md` real — quando empurrar de volta em requisitos.

**Razao de espelhar mas reduzir:** o conteudo precisa ser realista para o classifier mapear para as categorias corretas (`PIPELINE.md` → harness PIPELINE.md, etc.). Reduzir evita que harness:validate falhe por size se algum step renomear estruturalmente os arquivos durante o init.

### Passo 4: Verificar estrutura

```bash
find tests/fixtures/inverted-merge-v6.4/ -type f -name '*.md' | sort
# Esperado:
# tests/fixtures/inverted-merge-v6.4/CLAUDE.md
# tests/fixtures/inverted-merge-v6.4/docs/AGENTS_LIST.md
# tests/fixtures/inverted-merge-v6.4/docs/PIPELINE.md
# tests/fixtures/inverted-merge-v6.4/docs/PRODUCT_SENSE.md
# tests/fixtures/inverted-merge-v6.4/docs/QUALITY_SCORE.md

wc -l tests/fixtures/inverted-merge-v6.4/CLAUDE.md
# Esperado: 287 tests/fixtures/inverted-merge-v6.4/CLAUDE.md
```

---

## Gotchas

- **G1 do README (CA-14 integrado em fase-04):** Este fixture serve AMBOS CA-13 e CA-14 (mesma execucao, mesmo runId). Conteudo precisa exercitar os 7 subagent_ids esperados — significa que `CLAUDE.md` E os 4 docs estruturais geram trabalho real para Steps 06-11 e 91.
- **Local — secrets accidentais no CLAUDE.md:** se algum snippet Akita real contiver string parecida com secret (ex: `sk_test_abc123` em exemplo de Stripe), Step 06 (secrets-scan) marca `blockedBySecret` e Step 11 NAO move o arquivo — quebra CA-13 parity. **Mitigacao:** auditar visualmente o CLAUDE.md gerado com `grep -E '(sk_live_|AKIA[0-9A-Z]{16}|postgres://[^:]+:[^@]+@|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)' tests/fixtures/inverted-merge-v6.4/CLAUDE.md` — deve retornar zero matches. Caso aparecam, substituir por placeholders inocuos.
- **Local — line endings CRLF/LF (GT-? fase-02 do MEMORY):** sem `.gitattributes` com `eol=lf`, Windows pode salvar com CRLF e `wc -l` retornar 287 ou 288 inconsistente. O `.gitattributes` resolve. Em CI Linux, double-check via `file tests/fixtures/inverted-merge-v6.4/CLAUDE.md` (deve reportar "ASCII text" sem "with CRLF line terminators").
- **Local — 4 docs estruturais devem ser PEQUENOS:** se cada um tiver >100 linhas, o populate-plan vai gerar tasks redundantes e harness:validate pode reclamar. 15-30 linhas eh suficiente para classifier extrair sinais.

---

## Verificacao

### TDD

Esta fase eh **content authoring** (fixture estatico). Verificacao via grep/wc/find apos criacao.

- [ ] Diretorio criado: `test -d tests/fixtures/inverted-merge-v6.4`
- [ ] Subdiretorio `docs/` criado: `test -d tests/fixtures/inverted-merge-v6.4/docs`

### Checklist

- [ ] `wc -l tests/fixtures/inverted-merge-v6.4/CLAUDE.md` retorna `287` (numero exato — ajustar densidade se necessario).
- [ ] `find tests/fixtures/inverted-merge-v6.4/docs/ -maxdepth 1 -type f -name '*.md' | wc -l` retorna `4`.
- [ ] `ls tests/fixtures/inverted-merge-v6.4/docs/` lista exatamente: `AGENTS_LIST.md`, `PIPELINE.md`, `PRODUCT_SENSE.md`, `QUALITY_SCORE.md`.
- [ ] `grep -E '(sk_live_|AKIA[0-9A-Z]{16}|postgres://[^:]+:[^@]+@|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)' tests/fixtures/inverted-merge-v6.4/CLAUDE.md` retorna ZERO matches.
- [ ] `grep -c '^## Code Style' tests/fixtures/inverted-merge-v6.4/CLAUDE.md` retorna `1` (secao Akita presente).
- [ ] `grep -c '^## Tests' tests/fixtures/inverted-merge-v6.4/CLAUDE.md` retorna `1`.
- [ ] `grep -c '^## Logging' tests/fixtures/inverted-merge-v6.4/CLAUDE.md` retorna `1`.
- [ ] `bun test` ainda verde (fixture novo nao quebra testes existentes).

---

## Criterio de Aceite

**Por maquina:**
- `wc -l tests/fixtures/inverted-merge-v6.4/CLAUDE.md | awk '{print $1}'` retorna `287`.
- `find tests/fixtures/inverted-merge-v6.4/docs/ -type f -name '*.md' | wc -l` retorna `4`.
- `grep -cE '(sk_live_|AKIA[0-9A-Z]{16}|postgres://[^:]+:[^@]+@)' tests/fixtures/inverted-merge-v6.4/CLAUDE.md` retorna `0`.

**Por humano:** N/A (fixture estatico).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

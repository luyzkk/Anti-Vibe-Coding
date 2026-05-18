<!--
Princípio universal #5 — Comment Provenance.
Esta fase eh doc-only — sem codigo de runtime. Comentarios HTML no SKILL.md sao tolerados
mas nao obrigatorios.
-->

# Fase 07: SKILL.md — reescrita da regra "merge aditivo"

**Plano:** 04 — Merge Invertido Destrutivo
**Sizing:** 0.5h
**Depende de:** Nenhuma intra-plano (independente; doc-only; pode rodar paralelo a qualquer outra fase)
**Visual:** false

---

## O que esta fase entrega

Reescrita da regra "merge ADITIVO" em `skills/init/SKILL.md` para refletir a decisao D26 + D28: a regra default passa a ser "NUNCA sobrescrever sem aprovacao explicita + backup recuperavel". Modo aditivo continua disponivel via flag opt-in `--additive-merge` (SH-09). Documentar o opt-in na mesma secao para que dev tenha escape hatch visivel.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/SKILL.md` | Modify | Linha 70: substituir bullet "O merge deve ser **aditivo**..." pela nova regra ancorada em D26/D28; adicionar bullet sobre `--additive-merge` opt-in (SH-09) |

**NAO modificar:** nenhum codigo TypeScript, nenhum outro arquivo de documentacao do plugin.

---

## Implementacao

### Passo 1: Localizar a regra atual

Estado atual de `skills/init/SKILL.md` linhas 64-72 (do Read realizado):

```markdown
## Regras Importantes

- **NUNCA sobrescrever** informacoes do projeto sem aprovacao
- **NUNCA remover** secoes existentes do CLAUDE.md original
- **SEMPRE** criar backup antes de modificar
- **SEMPRE** mostrar ao usuario o que sera alterado antes de alterar
- O merge deve ser **aditivo** — o Anti-Vibe Coding complementa, nao substitui
- Se nao tiver certeza sobre um conflito, **perguntar ao usuario**
```

### Passo 2: Substituir a linha 70

Texto exato a remover (uma linha):

```
- O merge deve ser **aditivo** — o Anti-Vibe Coding complementa, nao substitui
```

Texto exato a inserir no lugar (multiplas linhas, mesma indentacao bullet):

```
- **Default destrutivo + revogavel** — em projetos com CLAUDE.md pre-existente, o init **transforma** o CLAUDE.md em espelho <=40 linhas (D2/D26/D28) extraindo regras Akita para `docs/DESIGN.md`. NUNCA aplica essa transformacao sem (a) aprovacao explicita do dev via `needsUser` agregado (MH-04) e (b) backup recuperavel em `.anti-vibe/backup/{timestamp}/` (D9, D29). Reversibilidade garantida via `/anti-vibe-coding:init --rollback` (MH-07).
- **Opt-in conservador disponivel:** `/anti-vibe-coding:init --additive-merge` preserva o comportamento da v6.3.x (merge aditivo, sem reescrever CLAUDE.md, sem backup) para users que ainda nao querem migrar para o novo formato (SH-09). Documentado tambem em `docs/design-docs/ADR-NNNN-destructive-merge-default.md` (Plano 06 fase-03).
```

### Passo 3: Atualizar referencias da regra antiga no codebase (se houver)

Antes de fechar a fase, executar:

```bash
grep -rn "merge aditivo\|merge ADITIVO\|merge.*additive" skills/ docs/ tests/ --include="*.md" --include="*.ts"
```

Quaisquer outras ocorrencias da expressao precisam ser avaliadas:
- Em arquivos de codigo/teste: provavelmente referem-se a flag `--additive-merge` — manter como esta.
- Em outros arquivos `.md` (ex: `init-rationale.md`, ADRs): atualizar referencia para apontar para a nova regra. **Decisao:** se houver mais de 3 ocorrencias em outros docs, criar TODO para Plano 06 fase-05 (init-rationale-atualizado) tratar consistencia documental — NAO bagunçar esta fase com escopo expandido.

### Passo 4: Validar a edicao

```bash
grep -i "aditivo" skills/init/SKILL.md
```

Esperado: 0 matches OU apenas matches dentro de "--additive-merge" (flag literal).

```bash
grep -E "NUNCA sobrescrever sem aprovacao explicita" skills/init/SKILL.md
```

Esperado: 1 match na linha nova.

```bash
grep -E "\\-\\-additive-merge" skills/init/SKILL.md
```

Esperado: pelo menos 1 match (documentando opt-in).

---

## Gotchas

- **Local (idempotencia de edicao):** se a fase rodar duas vezes, a segunda passagem nao deve duplicar a linha. Edit tool exige `old_string` unico — apos primeira execucao, `old_string` original some e a tentativa falha silenciosamente. Antes de re-rodar, verificar via grep se a regra ja foi substituida.
- **Local (preservar contexto vizinho):** As 4 bullets antes da linha 70 (NUNCA sobrescrever, NUNCA remover, SEMPRE backup, SEMPRE mostrar) e a 1 bullet depois (Se nao tiver certeza, perguntar) ficam INTOCADAS. Mantem a estrutura "Regras Importantes" coesa.
- **Local (nao mexer em ADR ainda):** O ADR-NNNN-destructive-merge-default referenciado no novo texto eh criado em Plano 06 fase-03. Esta fase apenas APONTA para ele. Quando Plano 06 fase-03 rodar, o numero `NNNN` sera substituido pelo numero real do ADR.

---

## Verificacao

### TDD

Esta fase eh doc-only — sem teste codigo. RED/GREEN nao aplicam.

### Checklist

- [ ] `grep -i "merge.*aditivo\|merge.*ADITIVO" skills/init/SKILL.md` retorna 0 matches (a regra antiga sumiu).
- [ ] `grep "NUNCA sobrescrever sem aprovacao explicita" skills/init/SKILL.md` retorna 1 match.
- [ ] `grep "\\-\\-additive-merge" skills/init/SKILL.md` retorna pelo menos 1 match (opt-in documentado).
- [ ] Bullets vizinhas (NUNCA sobrescrever, NUNCA remover, SEMPRE backup, SEMPRE mostrar, Se nao tiver certeza) preservadas — `wc -l skills/init/SKILL.md` antes e depois deve diferir por +1 linha (1 linha removida, 2 linhas adicionadas → +1 net).
- [ ] `bun run harness:validate` (se configurado para validar SKILL.md) retorna 0 falhas.
- [ ] Grep no resto do codebase por "merge aditivo" lista todas ocorrencias e cada uma foi avaliada (atualizar referencia, manter como literal de flag, ou criar TODO para Plano 06).

---

## Criterio de Aceite

**Por maquina:**
- `grep -ic "aditivo" skills/init/SKILL.md` retorna `0` (caso preserve maiusculas) OU retorna apenas matches dentro da string literal `--additive-merge`.
- `grep -c "NUNCA sobrescrever sem aprovacao explicita" skills/init/SKILL.md` retorna `1`.

**Por humano:**
- Leitura visual da secao "Regras Importantes" mostra fluxo logico: NUNCA sobrescrever (1), NUNCA remover (2), SEMPRE backup (3), SEMPRE mostrar (4), **default destrutivo + revogavel** (5 NOVA), **opt-in conservador** (6 NOVA), perguntar em duvida (7). Sequencia logicamente coerente.

---

**Referencia cruzada:**
- PRD: D26 (resolucao do conflito merge aditivo), D28 (nova regra "NUNCA sem aprovacao + backup"), SH-09 (--additive-merge opt-in), Notas de Implementacao (resolucao do conflito)
- README do plano: G9 (consequencia em runtime ja documentada nas fases 02/03)
- Plano 06 fase-03: ADR-NNNN-destructive-merge-default referenciado pelo novo texto
- Plano 06 fase-04: CHANGELOG v6.4.0 cita a regra reescrita aqui

<!-- Gerado por /plan-feature em 2026-05-18 -->

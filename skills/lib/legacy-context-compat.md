# Legacy Context Compat — Paths v5 para grill-me e write-prd

Documento de referencia compartilhado. Consumido por `grill-me/SKILL.md` e `write-prd/SKILL.md`
para backward compat quando o projeto do usuario ainda usa layout v5.

> **Para migrar:** rodar `/anti-vibe-coding:init` no projeto do usuario converte o layout v5
> em v6 (`docs/exec-plans/`). Após a migracao, este doc nao e mais consultado.

---

## Deteccao de Layout

```
Layout v6 (atual):  docs/exec-plans/active/  existe no projeto do usuario
Layout v5 (legado): .planning/               existe mas docs/exec-plans/ nao existe
Nenhum:             criar docs/exec-plans/active/ e usar v6
```

---

## Paths v5 (legado)

### grill-me — onde salvar CONTEXT.md

```
Raiz: .planning/
Arquivo: .planning/CONTEXT-{feature-name}.md
Criar raiz se nao existir antes de salvar.
```

Mensagem de aviso ao dev:
> "Seu projeto usa o layout legado (`.planning/`). Recomendo `/init` para migrar
> para `docs/exec-plans/`. Salvando CONTEXT.md no formato legado por ora."

### write-prd — onde buscar CONTEXT.md existente

```
Glob: .planning/CONTEXT-*.md   (raiz de .planning/, sem subpastas)
```

### write-prd — onde salvar PRD e pasta

```
Folder: .planning/{YYYY-MM-DD}-{slug}/
PRD:    .planning/{YYYY-MM-DD}-{slug}/PRD.md
```

### write-prd Step 5.5 — mover CONTEXT para dentro da pasta do PRD

```
Origem:  .planning/CONTEXT-{slug}.md
Destino: .planning/{YYYY-MM-DD}-{slug}/CONTEXT.md
```

Mensagem de aviso ao dev ao salvar PRD em layout v5:
> "PRD salvo em `.planning/{date}-{slug}/PRD.md` (layout legado).
> Rode `/init` para migrar para `docs/exec-plans/`."

---

## Regras

1. V5 nunca e o default — sempre checar v6 primeiro
2. Nunca criar `.planning/` se `docs/exec-plans/` ja existe no projeto
3. Se ambos existirem: preferir v6, avisar o dev sobre duplicidade

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Remove Step 07 (discover-existing-docs)

**Plano:** 01 — Refactor de Registry (Tracer Bullet)
**Sizing:** 1h
**Depende de:** fase-01
**Visual:** false

---

## O que esta fase entrega

Step `07-discover-existing-docs` removido do registry e o arquivo source deletado.
Imports orfaos limpos. Discovery semantico passa a ser responsabilidade do Plano 03
(coracao LLM-driven do Step 91 reescrito).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/registry.ts` | Modify | Remove import e entry `discoverExistingDocsStep`. Atualiza comentario explicativo. |
| `skills/init/lib/steps/07-discover-existing-docs.ts` | Delete | Heuristica antiga substituida por discovery-manifest leve no Plano 03 fase-01. |
| `skills/init/lib/steps/07-discover-existing-docs.test.ts` | Delete | Testes do Step 07 obsoletos. |
| `skills/init/lib/discover-existing-docs.ts` | Investigate | Verificar se ha outros callers via `grep`. Se orfao, deletar; se nao, manter e marcar TODO. |
| `skills/init/lib/discover-existing-docs.test.ts` | Investigate | Se a lib for deletada, deletar testes. |

**Nota sobre `discovery-store.ts`:** NAO deletar nesta fase. Step 06 (`06-secrets-scan.ts`)
ainda usa `writeDiscoveryArtifact` / `readDiscoveryArtifact` para persistir `secrets-scan-result`.
fase-03 reavalia, mas a hipotese ate este ponto e que `discovery-store.ts` permanece.

---

## Implementacao

### Passo 1: Remover import + entry em `registry.ts`

Linhas a remover (estado atual apos fase-01):

```typescript
import { discoverExistingDocsStep } from './steps/07-discover-existing-docs'
```

E no array `registry`:

```typescript
  discoverExistingDocsStep,     // 2026-05-18 (Luiz/dev): Plano 03 fase-04 — discover apos secrets-scan; emite lista flagada (D5, SH-02, D6).
```

Substituir o slot pelo comentario:

```typescript
  // 2026-05-19 (Luiz/dev): Plano 01 fase-02 — Step 07 (discover-existing-docs) removido.
  // MH-04 PRD novo: discovery semantico vira responsabilidade do Step 91 LLM-driven (Plano 03 fase-01).
```

### Passo 2: Deletar arquivos do Step 07

```bash
rm skills/init/lib/steps/07-discover-existing-docs.ts
rm skills/init/lib/steps/07-discover-existing-docs.test.ts
```

### Passo 3: Investigar `discover-existing-docs.ts` (a lib, nao o step)

```bash
grep -rn "discoverExistingDocs\|from.*discover-existing-docs" skills/init/lib/ --include="*.ts" | grep -v "^skills/init/lib/discover-existing-docs"
```

Possibilidades:
- **Zero callers (alem do step deletado):** deletar `skills/init/lib/discover-existing-docs.ts`
  + `skills/init/lib/discover-existing-docs.test.ts`.
- **Callers em outros steps (ex: Step 08, 09):** manter nesta fase, anotar no MEMORY.md.
  fase-03 vai cobrir ao deletar os steps consumidores.

### Passo 4: Verificar tipos exportados (`DiscoveredDocWithFlags`)

O tipo `DiscoveredDocWithFlags` era exportado pelo Step 07 e importado pelo Step 08
(`08-classify-blocks-hybrid.ts` linha 8). fase-03 cobre o Step 08 — verificar que o tipo
nao e referenciado fora dos arquivos prestes a serem deletados.

```bash
grep -rn "DiscoveredDocWithFlags" skills/init/lib/ --include="*.ts"
```

Esperado: apenas em arquivos deletados em fase-02 e fase-03.

---

## Gotchas

- **Local (TS quebra antes do delete completar):** Apos remover o import do `registry.ts`,
  o TS pode quebrar em arquivos que ainda importam de `'./07-discover-existing-docs'`. Verificar
  ordem dos deletes — primeiro arquivos consumidores (steps 08/09/10/11 sao removidos em fase-03,
  entao roda fase-03 ANTES de validar com typecheck completo) OU comentar imports temporariamente
  + fazer comentario claro `// 2026-05-19 (Luiz/dev): TEMP — Plano 01 fase-03 remove este arquivo`.
- **G4 do plano (libs orfas):** Decisao sobre deletar `discover-existing-docs.ts` (a lib)
  depende do resultado do grep no Passo 3. Documentar a decisao no MEMORY.md (campo
  "Decisoes de Implementacao", DI-1).
- **DiscoveredDoc type:** O tipo `DiscoveredDoc` exportado por `discover-existing-docs.ts`
  pode ainda ser util como tipo base. Se for, mover a definicao de tipo para um arquivo
  separado (ex: `discover-existing-docs.types.ts`) ou deixar para Plano 03 fase-01 quando
  a discovery-manifest light for criada.

---

## Verificacao

### TDD

- [ ] **RED:** Antes do delete, rodar `bun test skills/init/lib/registry.test.ts`.
      Apos remover o import + entry, o teste de "all step ids are unique" continua passando
      (set encolhe), mas qualquer teste que assertasse a presenca do step 07 falha.
  - Comando: `bun test skills/init/lib/registry.test.ts`
  - Resultado esperado pre-mudanca: pass
  - Resultado esperado pos-mudanca: pass (nenhum teste do registry.ts asserta presenca explicita
    do Step 07 — checar via grep `discoverExistingDocsStep` em registry.test.ts).

- [ ] **GREEN:** Apos deletar arquivos e limpar imports, suite completa do init nao
      referencia `discoverExistingDocsStep`.
  - Comando: `bun test skills/init/lib/` (pode falhar pendente da fase-03 — esperado)
  - Resultado esperado: erros apenas em arquivos que serao deletados na fase-03
    (08-classify-blocks-hybrid.test.ts, 09-propose-merge-batch.test.ts).

### Checklist

- [ ] `registry.ts` nao tem mais `import { discoverExistingDocsStep }`
- [ ] `registry.ts` nao tem mais `discoverExistingDocsStep` no array
- [ ] Arquivo `skills/init/lib/steps/07-discover-existing-docs.ts` nao existe
- [ ] Arquivo `skills/init/lib/steps/07-discover-existing-docs.test.ts` nao existe
- [ ] Decisao sobre `discover-existing-docs.ts` (lib) documentada no MEMORY.md
- [ ] `grep -rn "07-discover-existing-docs" skills/` retorna zero matches
- [ ] Smoke test do registry continua passando: `bun test skills/init/lib/registry.smoke.test.ts`

---

## Criterio de Aceite

**Por maquina:**
- `test ! -f skills/init/lib/steps/07-discover-existing-docs.ts` (arquivo nao existe)
- `grep -c "discoverExistingDocsStep" skills/init/lib/registry.ts` retorna `0`
- `bun test skills/init/lib/registry.smoke.test.ts` retorna `2 passed, 0 failed`
- `grep -rn "07-discover-existing-docs" skills/` retorna zero matches

**Por humano:**
- Diff mostra apenas remocoes e o novo comentario explicativo. Nada de logica nova.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->

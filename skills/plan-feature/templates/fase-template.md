# Fase {NN}: {Nome Descritivo}

**Plano:** {NN} — {nome do plano}
**Sizing:** {0.5h / 1h / 1.5h / 2h}
**Depende de:** {fase-NN ou "Nenhuma (primeira fase)"}
**Visual:** {true/false — se modifica arquivos de UI, sinaliza /qa-visual}

---

## O que esta fase entrega

{Descricao clara do valor entregue. Uma frase.}

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `{caminho/exato/do/arquivo}` | Create | {o que sera criado} |
| `{caminho/exato/do/arquivo}` | Modify | {o que sera modificado} |

---

## Implementacao

### {Passo 1: Nome do passo}

{Descricao do que fazer. Se nao trivial, incluir snippet de referencia:}

```typescript
// Exemplo: tipo a ser criado
export type NotificationStatus = 'pending' | 'sent' | 'failed'

export type Notification = {
  id: string
  userId: string
  message: string
  status: NotificationStatus
  createdAt: Date
}
```

### {Passo 2: Nome do passo}

{Descricao. Incluir SQL se for migration:}

```sql
-- Exemplo: migration
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id);
```

### {Passo N: Nome do passo}

{...}

---

## Gotchas

{Gotchas especificos desta fase, referenciando os do README quando aplicavel.}

- **G1 do plano:** {gotcha herdado do README, contextualizado para esta fase}
- **Local:** {gotcha especifico desta fase descoberto durante planejamento}

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun run test -- --grep '{nome do teste}'`
  - Resultado esperado: `Expected X, received Y` (assertion failure)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun run test -- --grep '{nome do teste}'`
  - Resultado esperado: `{N} passed, 0 failed`

### Checklist

- [ ] {Verificacao especifica 1 — ex: "Migration roda sem erros: bun run db:migrate"}
- [ ] {Verificacao especifica 2 — ex: "Tipo exportado e importavel: sem erros de TS"}
- [ ] {Verificacao especifica 3 — ex: "RLS policy bloqueia acesso de outro user"}
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck` (se configurado)

---

## Criterio de Aceite

{Criterio VERIFICAVEL — por maquina ou humano.
Preferir verificavel por maquina sempre que possivel.}

**Por maquina:**
- `{comando que valida}` retorna {resultado esperado}

**Por humano (se aplicavel):**
- {descricao visual/UX verificavel}

---

<!-- Gerado por /plan-feature em {YYYY-MM-DD} -->

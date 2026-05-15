<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que.
Exemplo: `// 2026-05-15 (Luiz/dev): treat invalid JSON as absent — alinhado com PRD §CA-04`
-->

# Fase 03: Backward Compat + Edge Cases + Contrato de Export

**Plano:** 01 — Reuse-Discovery Helper & SKILL Integration
**Sizing:** 0.5h (~45min)
**Depende de:** fase-01 (modulo `reuse-discovery.ts` + Step inserido)
**Visual:** false

---

## O que esta fase entrega

Robustez de producao: JSON corrompido nao quebra `readLastInitTimestamp` (CA-04), snapshot byte-identical de `agents-log.json` quando a flag esta ausente (CA-06), e teste de contrato garantindo que `shouldReuseDiscovery` + `FRESH_THRESHOLD_MS` sao exports publicos estaveis para o consumidor downstream (CA-07).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/reuse-discovery.test.ts` | Modify | Adicionar tests: JSON corrompido -> null; agents-log shape com `started_at` ausente -> null; import-contract test |
| `skills/init/lib/reuse-discovery.ts` | Modify (talvez) | Apenas se o teste CA-04 falhar — provavelmente ja passa porque o `try/catch` em `readLastInitTimestamp` ja foi escrito em fase-01 |
| `tests/fixtures/reuse-discovery/agents-log-snapshot.json` | Create (opcional) | Fixture para snapshot test de byte-identical (CA-06) |

---

## Implementacao

### Passo 1: Test CA-04 — JSON corrompido nao throw

```typescript
describe('readLastInitTimestamp — edge cases (CA-04)', () => {
  it('returns null when agents-log.json contains invalid JSON', async () => {
    await writeFile(
      path.join(tmp, 'discovery', 'agents-log.json'),
      '{ this is not valid json',
      'utf-8',
    )
    expect(await readLastInitTimestamp(tmp)).toBeNull()
  })

  it('returns null when agents-log.json is valid JSON but missing started_at', async () => {
    await writeFile(
      path.join(tmp, 'discovery', 'agents-log.json'),
      JSON.stringify({ run_id: 'r1', entries: [] }),
      'utf-8',
    )
    expect(await readLastInitTimestamp(tmp)).toBeNull()
  })

  it('returns null when started_at is not a string', async () => {
    await writeFile(
      path.join(tmp, 'discovery', 'agents-log.json'),
      JSON.stringify({ run_id: 'r1', started_at: 123456, entries: [] }),
      'utf-8',
    )
    expect(await readLastInitTimestamp(tmp)).toBeNull()
  })
})
```

Esses tests cobrem G3 (semantica de `started_at` pode driftar — o helper trata qualquer formato inesperado como ausente).

### Passo 2: Test CA-07 — contrato de export estavel

```typescript
describe('public export contract (CA-07)', () => {
  it('exports shouldReuseDiscovery as a function', () => {
    expect(typeof shouldReuseDiscovery).toBe('function')
  })

  it('exports FRESH_THRESHOLD_MS as a finite number', () => {
    expect(typeof FRESH_THRESHOLD_MS).toBe('number')
    expect(Number.isFinite(FRESH_THRESHOLD_MS)).toBe(true)
    expect(FRESH_THRESHOLD_MS).toBeGreaterThan(0)
  })

  it('shouldReuseDiscovery accepts string | null and returns boolean', () => {
    // Type contract: exatamente como PRD v6.3.0-adaptive-coaching / plano05/fase-01 vai consumir.
    expect(typeof shouldReuseDiscovery('2026-05-15T10:00:00.000Z')).toBe('boolean')
    expect(typeof shouldReuseDiscovery(null)).toBe('boolean')
  })
})
```

Quando o consumidor (plano05/fase-01) for retomado do paused, esses tests garantem que a API publica nao mudou silenciosamente.

### Passo 3: Test CA-06 — byte-identical sem flag

CA-06 exige que `agents-log.json` apos `/init` (sem flag) seja byte-identical ao v6.2.x. Como nao temos snapshot do v6.2.x facilmente, abordagem mais pragmatica:

- **Test by structure (preferido):** assert que `Step reuse-discovery.0` nao gera nenhum side-effect quando a flag NAO esta presente. Implementacao: ler o JS block do SKILL.md, simular `ARGUMENTS = ''`, confirmar que NAO chama `readLastInitTimestamp` e NAO chama `AuditLogWriter`.

Esse teste eh dificil de automatizar sem mockar o runner do SKILL.md. Alternativa concreta:

```typescript
describe('byte-identical compatibility without flag (CA-06)', () => {
  it('parseReuseDiscoveryFlag returns false for empty args (no flag = full init path)', () => {
    expect(parseReuseDiscoveryFlag([]).reuseDiscovery).toBe(false)
  })

  it('parseReuseDiscoveryFlag returns false when only other flags present', () => {
    expect(parseReuseDiscoveryFlag(['--dry-run', '--verbose']).reuseDiscovery).toBe(false)
  })
})
```

Se `parseReuseDiscoveryFlag([]) === false`, entao o `if (reuseDiscovery)` no Step reuse-discovery.0 SKILL.md eh `false`, entao o bloco inteiro eh pulado, garantindo zero side-effect — equivalente operacional a CA-06.

Para CA-06 stricter (snapshot literal): documentar em MEMORY.md como nao-automatizado — recomendar smoke test manual rodando `/init` sem flag e fazendo `git diff` em `discovery/agents-log.json` contra a versao v6.2.x (se artefato existir).

### Passo 4: Verificar nada quebrou

```bash
bun run test skills/init/lib/reuse-discovery.test.ts
bun run lint
bun run harness:validate
```

---

## Gotchas

- **G3 do plano (semantica de `started_at`):** os 3 tests do Passo 1 cobrem todas as variacoes problematicas — JSON corrompido, campo ausente, tipo errado. Se aparecer um 4o caso (ex: `started_at: ''` string vazia), adicionar teste.
- **Local (fase-03):** o test CA-06 stricter (byte-identical literal) NAO eh automatizado nesta fase — documentar em MEMORY.md como follow-up manual. A cobertura estrutural via `parseReuseDiscoveryFlag([]) === false` eh boa o suficiente para PR.

---

## Verificacao

### TDD

- [ ] **RED:** Os 3 tests novos de CA-04 falham SE o `try/catch` do `readLastInitTimestamp` estiver incompleto, OU passam se fase-01 ja cobriu (verificar)
  - Comando: `bun run test skills/init/lib/reuse-discovery.test.ts -t "edge cases"`
  - Resultado esperado: ou (a) 3 falham e Passo seguinte ajusta o helper, ou (b) ja passam (fase-01 acertou).

- [ ] **GREEN:** Todos os tests da fase passam
  - Comando: `bun run test skills/init/lib/reuse-discovery.test.ts`
  - Resultado esperado: total de tests soma fase-01 + fase-02 + fase-03, todos passando.

### Checklist

- [ ] Test `returns null when agents-log.json contains invalid JSON` passa
- [ ] Test `returns null when started_at is missing` passa
- [ ] Test `returns null when started_at is not a string` passa
- [ ] Test `exports shouldReuseDiscovery as a function` passa (CA-07)
- [ ] Test `exports FRESH_THRESHOLD_MS as a finite number` passa (CA-07)
- [ ] Test `parseReuseDiscoveryFlag returns false for empty args` passa (CA-06 estrutural)
- [ ] MEMORY.md anotado: "CA-06 byte-identical snapshot deferido para smoke test manual"
- [ ] Tests passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] Harness valida: `bun run harness:validate`

---

## Criterio de Aceite

Cobre CA-04 (JSON corrompido -> null), CA-06 (byte-identical sem flag — estrutural via `parseReuseDiscoveryFlag([]) === false`), CA-07 (helper reuse contract).

**Por maquina:**
- `bun run test skills/init/lib/reuse-discovery.test.ts -t "edge cases"` retorna `0 failed`
- `bun run test skills/init/lib/reuse-discovery.test.ts -t "public export contract"` retorna `0 failed`
- `bun run test skills/init/lib/reuse-discovery.test.ts -t "byte-identical"` retorna `0 failed`

**Por humano:**
- MEMORY.md menciona CA-06 stricter como follow-up manual
- Leitura do test file confirma cobertura dos 3 modos de falha de `readLastInitTimestamp`

---

<!-- Gerado por /plan-feature em 2026-05-15 -->

<!--
Princípio universal #5 — Comment Provenance.
Esta fase combina audit subagente (security-auditor + code-smell-detector) sobre delta pequeno
+ polish de UX no /init (preview keywords RF12). RF11 foi movido para fase-08 (D23).
Comentários inline em TS novo: autor + papel, YYYY-MM-DD, razão (RF12 / D15).
-->

# Fase 10: Hardening leve com content auditors + polish RF12 (preview keywords)

**Plano:** 03 — Batch C + INDEX + E2E + Hardening leve
**Sizing:** 1-1.5h
**Depende de:** fase-09 (E2E verde — sem regressão antes de polir). Independe da fase-07 já que hardening cobre delta de código + content audit do markdown, não claims técnicas dos átomos (já auditadas em fase-07). Independe da fase-08 (RF11 já implementado lá — cobertura aqui é apenas auditar o delta de ~10 linhas).
**Visual:** false

---

## O que esta fase entrega

Hardening leve (D15 — apenas content auditors sobre delta pequeno, não 6 auditores em 2 rodadas como Node v6.3.2 fez) + polish final de UX no `/init` que fecha RF12 do PRD. RF11 (warning Rails legado) já foi entregue em fase-08 — esta fase apenas inclui o delta de ~10 linhas na auditoria. Componentes:

1. **`security-auditor` + `code-smell-detector` em paralelo** sobre delta de código (~10 linhas: RF11 helper + caller da fase-08, schema validator do `harness:validate` que aceita `rails_versions`, refactor multi-stack do `detect-stack.ts` do Plano01 fase-03). Auditores de SOLID/database/API/infra ficam IDLE (sem delta significativo).
2. **Content audit do markdown:** todos os 14 átomos têm frontmatter completo (8 campos base + `rails_versions` quando aplicável), zero placeholders `[A DEFINIR]`, cap 200 linhas respeitado (D25 — hard cap; backlog para v6.3.4+ se algum átomo estourou), `sources:` com paths absolutos válidos (RF14). Executado como checklist humano + `bun run harness:validate` sobre toda a subárvore `docs/knowledge/`.
3. **Polish RF12:** `/init` exibe preview de top-8 keywords agregadas dos `triggers:` dos 14 átomos antes de aplicar — regressão automática se a infra Node está agnóstica de stack; senão, ajuste leve no formatter.
4. **STATE.md global atualizado:** todos os 3 planos marcados como `completed`; release notes draft opcional em `plano03/MEMORY.md` (Notas para Planos Seguintes / próxima feature).

Se fase-10 verde sem findings críticos não-tratados, feature v6.3.3 entra em condição de merge.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/format-knowledge-preview.ts` | Modify (se necessário) | Adicionar lógica RF12 (top-N keywords) — apenas se NÃO for regressão automática do Node. RF11 já está aqui (fase-08). |
| `skills/init/lib/format-knowledge-preview.test.ts` | Modify (se necessário) | Adicionar test case RF12 (preview top-8 Rails keywords). RF11 tests já existem (fase-08). |
| `skills/init/lib/run-stack-knowledge-init.ts` | Read | Confirmar que chama o formatter com os argumentos certos (atom triggers); caller RF11 já foi adicionado em fase-08 |
| `tests/e2e/stack-knowledge-rails-full.test.ts` | Read | Re-validar CA-02 (preview RF12) — pode virar GREEN agora se ainda RED. CA-04 (RF11) já GREEN desde fase-09. |
| `docs/knowledge/rails/atoms/*.md` (14 arquivos) | Read | Content audit (frontmatter 14/14 + cap 200 — D25 hard cap + zero placeholders) |
| `docs/knowledge/rails/INDEX.md` | Read | Content audit (≤100 linhas, layout D9, sem links quebrados para átomos) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Modify | Marcar Plano 03 e a feature como `completed`; adicionar release notes draft |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/plano03/MEMORY.md` | Modify | Registrar findings de auditores + decisão de tratamento; release notes draft em "Notas para Planos Seguintes" |
| `TODO.md` (raiz do projeto) | Modify (condicional) | Se algum átomo estourou 200 linhas (D25), registrar split em v6.3.4+ |

---

## Implementacao

### Passo 1: Spawn auditores em paralelo sobre delta de código (~10 linhas)

`/execute-plan` spawna 2 subagentes auditores em paralelo:

- **`security-auditor`** — input: diff de `skills/init/lib/detect-stack.ts` (refactor multi-stack D22 do Plano 01 fase-03) + `skills/init/lib/detect-stack.test.ts` (regression test fallback Sinatra do Plano 01 fase-04) + diff do validator (schema `rails_versions` do Plano 01 fase-02) + diff de `skills/init/lib/format-knowledge-preview.ts` (helper `extractRailsVersionWarning` da fase-08) + diff do caller em `run-stack-knowledge-init.ts` (injeção de warning). Foco: regex DoS no parser de versão Gemfile, leitura de path sem sanitização, XSS em string interpolada no warning. Output: findings com severity (HIGH/MEDIUM/LOW) + fix sugerido.
- **`code-smell-detector`** — input: mesmo diff. Foco: regex frágil, magic numbers, duplicação com lógica existente, naming inconsistente, comment provenance ausente em código novo. Output: findings com severity + sugestão.

Auditores de SOLID/database/API/infra ficam fora — D15 explícito.

Spawn como Fork (herda contexto, cache-otimizado). Wall-clock alvo: 10-15 min total.

### Passo 2: Triage de findings

Para cada finding, classificar em MEMORY.md como bloco DI-N ou GT-N:

- **HIGH severity (security-auditor):** sempre tratar antes de merge. Re-rodar auditor após fix.
- **MEDIUM severity (code-smell):** tratar se fix é <10min; senão registrar como TODO em `TODO.md` para v6.3.4+.
- **LOW severity:** registrar como GT-N em MEMORY.md, sem ação.

Output esperado para essa feature (delta de ~10 linhas): provavelmente 0-3 findings totais. Se >5, suspeitar que auditor extrapolou escopo (auditou código além do delta) — reduzir input e re-rodar.

### Passo 3: Content audit do markdown (checklist humano + harness:validate)

Sequência:

1. `bun run harness:validate` sobre toda a subárvore `docs/knowledge/` (Node atoms + Rails atoms). Deve retornar exit 0 (CA-10). Se erro, identificar átomo + corrigir antes de prosseguir.
2. Para cada um dos 14 átomos em `docs/knowledge/rails/atoms/*.md`:
   - `grep -c '^topic:' atom` retorna 1
   - `grep -c '^stack: rails$' atom` retorna 1
   - `grep -c '^tier:' atom` retorna 1
   - `wc -l atom` ≤ 200 (**D25 — hard cap; átomos que estouraram entram no TODO.md como split em v6.3.4+**)
   - `grep -c '\[A DEFINIR\]' atom` retorna 0
   - `sources:` lista paths que existem em `claude-code/knowledge/Rails/...` (RF14)
3. `docs/knowledge/rails/INDEX.md`:
   - `wc -l` ≤ 100
   - Contém as 7 seções `### Para /{skill}` (security, api-design, system-design, design-patterns, architecture, infrastructure, tdd-workflow)
   - Contém os 3 mapas `### Tier 1/2/3`
   - Cada link aponta para átomo existente em `atoms/`

Findings registrados em MEMORY.md. Fix aplicado se trivial; senão registrar como GT-N + abrir issue para v6.3.4+.

### Passo 4: Polish RF12 — preview de top-N keywords no /init

**Verificação primeiro:** se infra Node v6.3.2 (`formatKnowledgePreview` em `skills/init/lib/format-knowledge-preview.ts`) já é agnóstica de stack — lê `triggers:` de cada átomo em `.claude/knowledge/atoms/*.md` e agrega top-N — então RF12 é regressão automática. Test: rodar /init em fixture Rails moderno e capturar output; deve conter "Knowledge contém átomos sobre: Active Record, Hotwire, Solid Queue, RSpec, Brakeman, Kamal, Zeitwerk, ActiveSupport, ...".

Se a infra hardcode "nodejs-typescript" em algum ponto (string literal, magic constant), **bug** — corrigir em ~3 linhas: trocar literal por leitura dinâmica do `stackJson.primary` ou do path do matrix copiado.

Test case (acrescentar em `format-knowledge-preview.test.ts`):

```typescript
// 2026-05-18 (Luiz/dev): RF12 regression para Rails — preview lê triggers dos átomos copiados
test('formatKnowledgePreview lista top-8 keywords Rails para primary=rails', () => {
  const out = formatKnowledgePreview({ stack: 'rails', atomsDir: 'docs/knowledge/rails/atoms' })
  expect(out).toContain('Active Record')
  expect(out).toContain('Hotwire')
  expect(out).toContain('Solid Queue')
  expect(out).toContain('RSpec')
  expect(out).toContain('Brakeman')
  // Top-N agregado de triggers — pelo menos 5 desses devem aparecer
})
```

### Passo 5: Re-rodar suite E2E para confirmar RF12 coberto

`bun run test -- tests/e2e/stack-knowledge-rails-full.test.ts` — CA-02 (preview RF12) continua GREEN (ou vira GREEN se RF12 precisou de fix em Passo 4). CA-04 (RF11) já estava GREEN desde fase-09. Suite 11 testes PASS.

### Passo 6: Marcar feature como completed

Em STATE.md global:

```markdown
## Status Final (v6.3.3)

- [x] Plano 01 — completed em 2026-05-NN (commit {hash})
- [x] Plano 02 — completed em 2026-05-NN (commit {hash})
- [x] Plano 03 — completed em 2026-05-NN (commit {hash})

Feature pronta para merge. Próximos passos:
1. /verify-work final
2. /lessons-learned (capturar compound: dedup auditado, anti-drift first-try em piloto, hardening leve sobre delta pequeno)
3. Merge → main, fecha v6.3.3
```

Release notes draft em `plano03/MEMORY.md` "Notas para Planos Seguintes":

```markdown
## Release Notes — v6.3.3 (Stack Knowledge Layer — Rails)

- 14 átomos Rails-native + INDEX.md em `docs/knowledge/rails/`
- Detector Rails robusto: regex `gem 'rails'` no Gemfile (zero falso-positivo Sinatra/Hanami)
- Schema `rails_versions` opcional no frontmatter (audit trail de compat por padrão)
- Warning RF11 para projetos Rails legados (<7.1)
- Preview de keywords no /init (regressão Node RF10)
- E2E suite 11 testes cobrindo CA-01..CA-11 com 5 fixtures
- Hardening leve (D15) — content auditors sobre delta de ~5 linhas
- Audit humano CA-08 cumprido em 3 átomos (active-record-fundamentals, action-view-and-hotwire, action-cable-and-realtime)

Reuso 100% da infra v6.3.2 (Node+TS): runStackKnowledgeInit, copyKnowledge, getStackKnowledgePreface, telemetria.

Próxima feature provável: v6.3.4 stack adicional (Python ou Go) — pode reusar 100% deste padrão.
```

---

## Gotchas

- **G9 do plano (hardening leve, não completo):** NÃO spawnar 6 auditores em 2 rodadas como Node fez. Apenas 2 auditores sobre delta de ~5 linhas. Auditores idle se input é vazio. D15 explícito.
- **G11 do plano (RF11 já implementado em fase-08):** esta fase NÃO toca em código TS para RF11 — apenas inclui o delta de ~10 linhas (helper + caller) na auditoria do Passo 1. Se reviewer pedir review do RF11, redirecionar para `fase-08-rf11-warning-rails-legado.md`.
- **G12 do plano (RF12 deve ser regressão automática):** se NÃO for, abrir bug — algo está hardcode em `formatKnowledgePreview`. Não duplicar lógica de keyword aggregation para Rails — extrair função genérica se preciso.
- **G-local D25 (hard cap 200 linhas):** átomos que estouraram NÃO devem ser cortados ad-hoc aqui — registrar como TODO em `TODO.md` raiz com plano de split para v6.3.4+ (ex: `active-record-fundamentals.md` excede → split em `-queries.md` + `-callbacks.md`). Comprometer split mas não bloquear v6.3.3.
- **Local — auditores podem extrapolar escopo:** se `security-auditor` audita o detector Rails inteiro (não só o delta), reduzir input para diff strict + repetir. D15 evita gasto desnecessário de tokens.
- **Local — content audit é checklist humano:** não spawnar subagente para "auditar 14 átomos têm frontmatter" — `bun run harness:validate` + grep cobrem com determinismo. Subagente para isso é over-engineering (G9).
- **Local — release notes não é spec:** texto em MEMORY.md é draft. Polish editorial fica para o agente que rodar `/lessons-learned` ou `/iterate` pós-merge.

---

## Verificacao

### TDD

- [ ] **RED+GREEN (RF12):** se já é regressão automática do Node, test passa de cara. Se não, criar test em `format-knowledge-preview.test.ts` que falhe (RED) e implementar fix mínimo (GREEN).
  - Comando: `bun run test -- skills/init/lib/format-knowledge-preview.test.ts`

> Nota: RF11 já tem ciclo TDD coberto em fase-08 — não duplicar aqui.

### Checklist

- [ ] `security-auditor` + `code-smell-detector` rodados em paralelo sobre delta de ~10 linhas (RF11 helper+caller da fase-08 + refactor multi-stack D22 + schema rails_versions); findings registrados em `plano03/MEMORY.md`
- [ ] Findings HIGH severity (se houver) tratados; re-rodar auditor confirma fix
- [ ] Findings MEDIUM tratados se trivial; senão TODO.md para v6.3.4+
- [ ] `bun run harness:validate` retorna exit 0 sobre toda a subárvore `docs/knowledge/` (Node + Rails atoms)
- [ ] Cada um dos 14 átomos: frontmatter completo + `wc -l ≤ 200` (D25 hard cap; estouros em TODO.md) + zero `[A DEFINIR]` + sources paths válidos
- [ ] `docs/knowledge/rails/INDEX.md`: `wc -l ≤ 100` + 7 seções "Para /skill" + 3 mapas "Tier 1/2/3"
- [ ] RF12 preview funciona em Rails (regressão automática OU fix leve aplicado)
- [ ] `bun run test -- tests/e2e/stack-knowledge-rails-full.test.ts` retorna `11 passed, 0 failed` (CA-02 + CA-04 verdes)
- [ ] `bun run lint` limpo sobre `format-knowledge-preview.ts` e teste
- [ ] STATE.md marca os 3 planos e a feature como `completed`
- [ ] Release notes draft em `plano03/MEMORY.md`
- [ ] `TODO.md` raiz atualizado com átomos que estouraram 200 linhas (split planejado para v6.3.4+), se houver

---

## Criterio de Aceite

**Por maquina:**

- `bun run test` (full suite) retorna 0 erros
- `bun run lint` retorna 0
- `bun run harness:validate` retorna 0 sobre `docs/knowledge/`
- `grep -c "completed" docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` retorna ≥3 (3 planos)
- Output do `/init` em fixture `rails-legacy-70` contém substring "Knowledge Rails cobre 7.1+"
- Output do `/init` em fixture `rails-modern-8x` contém substring "Knowledge contém átomos sobre:" + ≥5 keywords Rails

**Por humano:**

- Findings HIGH dos auditores: 0 não-tratados.
- Reviewer lê output do `/init` em projeto Rails legado e entende imediatamente o warning.
- Reviewer roda `/init` em fixture moderna e vê preview de keywords sem ruído.
- Feature v6.3.3 está pronta para PR (`/anti-vibe-coding:ship` ou equivalente).

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->

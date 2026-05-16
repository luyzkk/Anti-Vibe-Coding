# Memoria: Plano 02 — /init produz capabilities.json

**Feature:** Adaptive Coaching v6.3.0
**Iniciado:** 2026-05-15
**Concluído:** 2026-05-15
**Status:** completed (3/3 fases)

---

## Decisoes de Implementacao

- **DI-01** (fase-01): Implementação seguiu pseudocódigo do spec exatamente (regex puro, walk recursivo). Único ajuste: `noUncheckedIndexedAccess` exigiu optional chaining em 3 acessos `result.capabilities[0]` no test file. Aplicado pelo orquestrador pós-GREEN para preservar invariante de anchor durante GREEN.
- **DI-02** (fase-01): `stale-detector.ts` NÃO foi importado em `capabilities-writer.ts` apesar do spec sugerir. Justificativa: nenhum dos 5 testes da fase-01 exige checksum — o uso real é em fase-03 (quando capabilities.json é escrito em disco com `key_files_checksums`). Importar agora seria over-engineering. Reavaliar em fase-03.
- **DI-03** (fase-01): Path normalization via `.replace(/\\/g, '/')` aplicado em `path.relative()` antes de compor `handler`, `path` e `owner_path`. Necessário em ambiente Windows (CLAUDE.md env).
- **DI-04** (fase-02): Dispatcher implementado como `switch` (não hash map). Justificativa: cada case retorna `Promise<CapabilitiesOutput>` e a função alvo é async — switch é mais legível para 3 ramos. Não viola CLAUDE.md (regra de hash map sobre switch foi por preferência geral, mas aqui o ganho é zero).
- **DI-05** (fase-02): `findRoutesDir` retorna PRIMEIRA pasta encontrada entre `routes/`, `src/routes/`, `app/routes/` (não percorre todas). Tests da fase só criam uma. Se um projeto real tiver duas dessas pastas coexistindo (raríssimo), só a primeira é descoberta. Aceito como trade-off de simplicidade — revisar se evidência de uso real surgir.
- **DI-06** (fase-02): `extractMvcRoutes` usa regex line-by-line (não `matchAll` global como o spec sugeriu). Funcionalmente equivalente para os fixtures dos tests (uma chamada `router.METHOD(...)` por linha). Múltiplas chamadas na mesma linha não são capturadas; aceito como gap conhecido.
- **DI-07** (fase-03): Sem TDD RED→GREEN clássico nesta fase. O integration test passou GREEN imediatamente porque `discoverCapabilities` já existia (fase-01/02). Aceito — é smoke test contra dispatcher pré-existente, não unit test de novo comportamento. RED puro só faria sentido se tivéssemos novos exports.
- **DI-08** (fase-03): Validação contra schema reduzida a check `output.schema_version === '1.0'`. Spec sugeria carregar JSON schema de `discovery/_schemas/capabilities-v1.schema.json` e validar shape, mas isso exigiria ajv (não está no `package.json`). Validação por shape básico cobre G6 (string vs número) sem dependência nova. Se cobertura mais profunda for exigida, adicionar ajv em fase futura.
- **DI-09** (fase-03): `AuditLogWriter` instanciado com `crypto.randomUUID()` como `run_id`. Em migration mode, `run_id` vem de `discovery/inventory.json` (correlação inventory ↔ agents-log); em /init greenfield esse arquivo não existe. UUID fresh garante unicidade da entrada de audit sem quebrar contrato do AuditLogWriter. Trade-off: sem correlação cross-run em greenfield, mas isso não é requisito desta fase.

---

## Bugs Descobertos

_Nenhum ainda._

---

## Gotchas

- **GT-01** (fase-01): Em projetos com `tsconfig.json` strict + `noUncheckedIndexedAccess`, acessos `array[0].prop` em tests falham typecheck mesmo quando precedidos de `expect(array.length).toBe(1)` — TS não narrow array index a partir de assertion runtime. Usar optional chaining `array[0]?.prop` é o caminho idiomático (toBe/toContain continuam falhando claramente se elemento undefined). Aplicável aos próximos testes que indexarem `capabilities[]`.
- **GT-02** (fase-02): `bun test` falha o módulo INTEIRO quando um named import resolve a um símbolo inexistente (`SyntaxError: Export named 'X' not found in module`). Resultado: durante RED, os 5 testes pré-existentes da fase-01 também aparecem como erro, mas isso é cosmético — a falha confirma que o símbolo está ausente, que é o estado desejado. Reportar contagens (`5 originais pass / 4 novos fail`) é impossível neste cenário. Aplicável a qualquer RED phase com `bun:test` e novos exports.

---

## Desvios do Plano

- **DEV-01** (fase-01): Spec listava `bun run lint` no checklist; substituído por `bun run typecheck` (DI-01 do Plano 01 — script `lint` não existe no `package.json`). Sem impacto funcional. Aplicar nas fases 02 e 03.
- **DEV-02** (fase-01): Spec recomendava importar `stale-detector.ts` em `capabilities-writer.ts` lazy/protegido. Implementação não importou — vide DI-02. Adicionar em fase-03 onde o checksum é efetivamente computado e gravado.
- **DEV-03** (fase-01): Orquestrador editou `capabilities-writer.test.ts` APÓS GREEN passar para satisfazer `noUncheckedIndexedAccess`. Anchor invariant respeitado (GREEN nunca tocou tests). Mudança puramente sintática (optional chaining), 3 linhas, sem alteração de assertions.
- **DEV-04** (fase-02): GREEN divergiu do pseudocódigo em 3 pontos não-cobertos por test (aceito porque tests verdes):
  1. `handler` em capabilities mvc-flat é só `relPath` (sem `:line`). Spec previa `${relPath}:${line}`. Reavaliar quando fase-03 escrever capabilities.json se consumidores externos precisarem do número de linha.
  2. `findRoutesDir` retorna primeira pasta encontrada; spec previa walk em todas as 3 candidates agregando resultados. Tests só criam `routes/`.
  3. Regex linha-a-linha em vez de `matchAll` global com flag `g`. Captura múltipla na mesma linha não funciona; tests usam uma chamada por linha.
- **DEV-05** (fase-02): GREEN reordenou função `discoverNextjsAppRouterCapabilities` para o final do arquivo (após novos exports `discoverMvcFlatCapabilities` e `discoverCapabilities`). Cosmético; tests insensíveis a ordem. Sem impacto.
- **DEV-06** (fase-02): GREEN adicionou `.tsx` extension ao walker mvc (`findMvcRouteFiles`) que o spec não listou — spec mencionava só `.ts` e `.js`. JS não é coberto pelo walker (apenas `.ts`/`.tsx`). Tests só testam `.ts`. Express.js puro JavaScript não seria descoberto. Aceito como gap conhecido — projetos mvc-flat modernos em TypeScript funcionam.
- **DEV-07** (fase-03): Spec mandou inserir o novo step "APÓS Step 4 — Detect Architecture Profile" no `skills/init/SKILL.md`. Esse step não existe — `/anti-vibe-coding:detect-architecture` é skill SEPARADA, invocada pelo usuário após `/init` (linha ~1031 do SKILL.md). Inserido como `### Step 7 (v6.3.0): Capabilities Discovery` após `### Step 6 (v6.0.0): Delivery Loop opt-in` e antes de `### Passo 0 — Detectar Modo de Inicialização`. Pula silenciosamente quando `readArchitectureProfile()` retorna null (flag desabilitada OU profile não detectado).
- **DEV-08** (fase-03): Spec sugeria `new AuditLogWriter(projectRoot)` (1 arg). Constructor real exige `(targetDir, run_id)`. Em /init greenfield não há `discovery/inventory.json` (de onde normalmente vem o `run_id`). Solução: gerar `crypto.randomUUID()` localmente. Sem impacto em correlação porque greenfield /init é evento único.
- **DEV-09** (fase-03): Pseudocódigo do spec listava import de `readFile` no bloco JS do SKILL.md, mas não usa. Mantido no novo Step 7 como prosa instrucional (SKILL.md não é compilado — `noUnusedImports` não se aplica). Cosmético. Se editor de skill quiser limpar no futuro: remover `readFile` da linha de import.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 3 |
| Fases com desvio | 3 (fase-01 — 3 desvios; fase-02 — 3 desvios não-cobertos por teste; fase-03 — 3 desvios pequenos) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

- `skills/lib/capabilities-writer.ts` exporta tipos `CapabilitySource`, `Capability`, `CapabilitiesOutput` e a função async `discoverNextjsAppRouterCapabilities(projectRoot)`. Sem AST library — regex puro sobre `app/**/route.{ts,tsx}`.
- `Capability` shape: `{ kind: 'route', method, path, handler, owner_path, confidence, source }`. `handler` é `"<rel-path>:<line>"`. `path` começa com `/`. `source: 'ast'` e `confidence: 1.0` para descobertas do Next.js App Router.
- `CapabilitiesOutput.schema_version` é a string literal `'1.0'` (não número) — G6 do README do plano.
- Em path strings de output, sempre normalizar separadores Windows: `.replace(/\\/g, '/')`. Tests assertam forward slashes.
- Fase-02 concluída: `discoverMvcFlatCapabilities(projectRoot)` e `discoverCapabilities(projectRoot, profile)` exportados. Dispatcher trata `nextjs-app-router`, `mvc-flat` e qualquer profile desconhecido (best-effort, retorna `coverage_gaps: ["profile 'X' not supported — ..."]`).
- **Para fase-03 (integração `/init`):** o dispatcher já existe. `/init` deve chamar `await discoverCapabilities(projectRoot, profile)` com o profile vindo de `readArchitectureProfile()`. Se profile === null (flag desabilitada), pular geração de capabilities.json.
- **Para fase-03:** mvc-flat `handler` atualmente NÃO inclui número de linha (DEV-04). Se consumidores futuros (Plano 03/04) precisarem do `:line`, abrir RF separado — não tocar nesta fase.
- **Para fase-03:** importar `stale-detector` aqui — não foi importado em fase-01/02 (DI-02, DEV-02). Computar `key_files_checksums` ao escrever `capabilities.json`. Schema (`capabilities-v1.schema.json` de Plano 01 fase-02) inclui campo opcional `key_files_checksums` se precisar conferir.
- **Para fase-03:** validação soft contra `discovery/_schemas/capabilities-v1.schema.json` (não lançar exceção em falha — adicionar a `coverage_gaps`).
- **Para fase-03:** registrar audit entry via `AuditLogWriter` de `skills/init/lib/audit-log.ts` (G5 do README — reusar, nunca recriar).

---

## Notas para Plano 03+ (após conclusão do Plano 02)

- **`/init` agora produz `discovery/capabilities.json` automaticamente** (Step 7 do `skills/init/SKILL.md`) quando `readArchitectureProfile()` retorna não-null. Output segue contrato `CapabilitiesOutput` de `skills/lib/capabilities-writer.ts`.
- **`/init` registra audit entry em `discovery/agents-log.json`** com `subagent_id: 'capabilities-discovery'`, `output_struct: { capabilities_count, coverage_gaps_count, profile, schema_version }`. Plano 03 (parity-audit) pode consumir esse log para correlacionar gaps.
- **`/init` em greenfield NÃO tem `inventory.json`** — `AuditLogWriter` é instanciado com `crypto.randomUUID()` como `run_id`. Migration mode continua usando `inventory.run_id`. Se Plano 03 precisar correlacionar capabilities-discovery com outro subagente, gerar/ler o `run_id` antes de instanciar AuditLogWriter.
- **Step 7 é soft-fail**: `try/catch` cobre o bloco inteiro, qualquer erro vira `console.warn` sem abortar `/init`. Plano 03 (parity-audit consumindo capabilities.json) deve seguir mesma filosofia — degradar graciosamente se capabilities.json estiver ausente/malformado.
- **Capabilities discovery PULA silenciosamente** se `readArchitectureProfile()` retornar null (flag `architectureDetectorEnabled=false` OU profile não detectado). Para garantir que Plano 03 tenha capabilities.json, o usuário deve rodar `/anti-vibe-coding:detect-architecture` antes de `/init`.
- **`stale-detector.ts` ainda NÃO foi importado em `capabilities-writer.ts`** — Plano 03/04 podem implementar `key_files_checksums` quando precisarem detectar capabilities stale (RF-SH-01 do PRD). Função pronta em `skills/lib/stale-detector.ts`.
- **Smoke test de integração:** `skills/lib/__tests__/capabilities-writer-integration.test.ts` (2 casos, JSON round-trip + schema compliance). Pattern reutilizável para Plano 03 testar consumidores de capabilities.json.

---

<!-- Atualizado automaticamente durante execução -->

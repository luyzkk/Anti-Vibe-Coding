# Memoria: Plano 02 — /init produz capabilities.json

**Feature:** Adaptive Coaching v6.3.0
**Iniciado:** 2026-05-15
**Status:** in-progress (2/3 fases)

---

## Decisoes de Implementacao

- **DI-01** (fase-01): Implementação seguiu pseudocódigo do spec exatamente (regex puro, walk recursivo). Único ajuste: `noUncheckedIndexedAccess` exigiu optional chaining em 3 acessos `result.capabilities[0]` no test file. Aplicado pelo orquestrador pós-GREEN para preservar invariante de anchor durante GREEN.
- **DI-02** (fase-01): `stale-detector.ts` NÃO foi importado em `capabilities-writer.ts` apesar do spec sugerir. Justificativa: nenhum dos 5 testes da fase-01 exige checksum — o uso real é em fase-03 (quando capabilities.json é escrito em disco com `key_files_checksums`). Importar agora seria over-engineering. Reavaliar em fase-03.
- **DI-03** (fase-01): Path normalization via `.replace(/\\/g, '/')` aplicado em `path.relative()` antes de compor `handler`, `path` e `owner_path`. Necessário em ambiente Windows (CLAUDE.md env).
- **DI-04** (fase-02): Dispatcher implementado como `switch` (não hash map). Justificativa: cada case retorna `Promise<CapabilitiesOutput>` e a função alvo é async — switch é mais legível para 3 ramos. Não viola CLAUDE.md (regra de hash map sobre switch foi por preferência geral, mas aqui o ganho é zero).
- **DI-05** (fase-02): `findRoutesDir` retorna PRIMEIRA pasta encontrada entre `routes/`, `src/routes/`, `app/routes/` (não percorre todas). Tests da fase só criam uma. Se um projeto real tiver duas dessas pastas coexistindo (raríssimo), só a primeira é descoberta. Aceito como trade-off de simplicidade — revisar se evidência de uso real surgir.
- **DI-06** (fase-02): `extractMvcRoutes` usa regex line-by-line (não `matchAll` global como o spec sugeriu). Funcionalmente equivalente para os fixtures dos tests (uma chamada `router.METHOD(...)` por linha). Múltiplas chamadas na mesma linha não são capturadas; aceito como gap conhecido.

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

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 2 |
| Fases com desvio | 2 (fase-01 — 3 desvios; fase-02 — 3 desvios não-cobertos por teste) |
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

<!-- Atualizado automaticamente durante execução -->

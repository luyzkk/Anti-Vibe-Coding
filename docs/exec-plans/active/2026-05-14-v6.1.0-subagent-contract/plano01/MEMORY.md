# Memoria: Plano 01 — Fundacao do Contrato

**Feature:** v6.1.0 — Contrato de Subagentes v1
**Iniciado:** 2026-05-14
**Concluido:** 2026-05-14
**Status:** completed (5/5 fases verdes, 12/12 testes passando)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** ADR-0002 segue headings em INGLES do ADR-0001 real (Context/Decision/Alternatives Considered/Consequences/Reversibility), nao o esqueleto portugues do exemplo da fase. Razao: ADR-0001 ja existente no repo usa ingles; manter consistencia entre ADRs supera espelhar o exemplo do plano.
- **DI-2 (fase-02):** subagent-contract-v1.md em prosa ingles (alinhado ao ADR-0001) com prosa sem acentuacao (alinhado ao restante do plugin). Exemplos JSON usam UUID completo real em `metadata.run_id` (copy-paste-ready). FAQ com 4 perguntas (dentro do range 3-5) focada nos pontos de confusao esperada.
- **DI-3 (fase-02):** Migration guide Passo 3 entrega diff antes/depois completo copy-paste-ready (G7 atendido literalmente).
- **DI-4 (fase-03):** Adicionado `"type": "object"` em cada uma das 4 definitions do schema (auditVariant, verificationVariant, proposalVariant, mutationVariant). Razao: ajv v8 strict mode rejeita `properties` sem `type` explicito. Impacto: nenhum em semantica, schema mais explicito.
- **DI-5 (fase-03):** Instalado `ajv` como devDependency antecipadamente (fase-04 vai precisar do validator TS).
- **DI-6 (fase-04):** Schema carregado via `readFileSync` em runtime (com `import.meta.dir`), nao via `import assert { type: 'json' }`. Razao: ambiente do plugin tem `exactOptionalPropertyTypes: true` no tsconfig — import-attributes mais readFileSync se mostrou mais robusto.
- **DI-7 (fase-04):** Usar `AnySchema` do ajv para `compile()` call (cast explicito, escapa TS2769 por `schemaJson: unknown`).
- **DI-8 (fase-04):** Spread condicional `...(path ? { path } : {})` para campos opcionais — adaptacao a `exactOptionalPropertyTypes: true` do projeto.
- **DI-9 (fase-05):** Acesso a array index em testes (`issues[0].severity`) precisa de extracao para `const issue0 = issues[0]` + uso de `?.`. Razao: `exactOptionalPropertyTypes: true` faz array access retornar `T | undefined`. Padrao a seguir em testes que envolvem `payload.issues`/`payload.checks` nas demais fases.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Preenchido durante execucao. Exemplo:
- **BUG-1:** Schema `oneOf` aceita audit com payload de verification quando ambos tem `issues`
  - Causa: discriminator em `kind` nao estava aplicado
  - Fix: adicionar `"required": ["kind"]` + `"const"` em cada variante
  - Fase afetada: fase-03
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (fase-01):** O exemplo dentro de `fase-01-adr-contrato.md` usa headings em portugues (## Contexto, ## Decisao). O ADR-0001 real no repo usa headings em INGLES. **Regra para fases futuras que criarem ADRs:** sempre ler o ADR-0001 antes de escrever, nao confiar nos exemplos dos plano-files.
- **GT-2 (fase-02):** Links em `plano05/fase-05-changelog-compound-merge.md` usam caminhos sem `./` (ex: `docs/design-docs/subagent-contract-v1.md`). O harness resolve relativo ao diretorio do arquivo de plano, nao a raiz do repo. **Implicacao:** mesmo apos esta fase, esses links aparecem como broken no `harness:validate`. Fix nao foi feito (fora de escopo da fase-02). Plano 05 fase-05 vai precisar corrigir os paths para `../../../design-docs/subagent-contract-v1.md` OU o harness vai precisar resolver paths de exec-plans relativo a raiz do repo. Levantar isso em Plano 05.
- **GT-3 (fase-02):** `every_agents.md` na raiz do repo nao tem H1 — quebra `harness:validate`. Pre-existente, nao causado por esta fase. Decidir em Plano 05 ou TODO.md.
- **GT-4 (fase-03):** ajv v8 strict mode rejeita `properties` sem `type` em definitions. Solucao adotada: adicionar `"type": "object"` em cada variante. Implicacao para fase-04: ao usar ajv como lib, manter o schema explicito; OR pode-se passar `strict: false` para silenciar mas isso perde checagem util.
- **GT-5 (fase-04):** tsconfig do plugin tem `exactOptionalPropertyTypes: true`. Implicacao: campos opcionais (`path?: string`) NAO aceitam `string | undefined` — usar spread condicional `...(value ? { key: value } : {})` para construir objetos opcionais. Padrao a seguir nas demais fases que produzirem TS no plugin.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-01):** Headings do ADR-0002 em ingles (consistente com ADR-0001), nao em portugues como o exemplo do plano sugeria. Justificativa: consistencia com padrao real do repo supera o exemplo do plano.
- **DEV-2 (fase-03):** Schema teve `"type": "object"` adicionado nas 4 definitions (vs versao do plano que omitia). Pure compat com ajv v8 strict, sem mudanca semantica.
- **DEV-3 (fase-04):** Schema carregado via `readFileSync(import.meta.dir + "../../agents/_contract/v1.schema.json")` ao inves do `import assert { type: 'json' }` sugerido no plano. Razao: mais robusto com `exactOptionalPropertyTypes: true`. Comportamento equivalente.
- **DEV-4 (fase-05):** Criterio de aceite do plano mencionava "9 anteriores + 2 = 11 testes". Total real e 12 (1 skeleton da fase-03 ja contava como teste). Sem impacto — criterio "todos passam" atingido.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 4 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano (Plano 02 — Migracao Piloto) PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Artefatos disponiveis no repo

- **ADR criado:** `docs/design-docs/ADR-0002-subagent-contract.md` (10 decisoes em tabela + 5 alternativas rejeitadas; headings em ingles).
- **Doc canonico:** `docs/design-docs/subagent-contract-v1.md` — 8 secoes, 4 exemplos por kind (audit/verification/proposal/mutation), migration guide com diff antes/depois (Passo 3) copy-paste-ready, FAQ.
- **Schema JSON:** `agents/_contract/v1.schema.json` (draft-07, oneOf por kind, 4 variantes com discriminador `kind: { const: "..." }`). Cada variante tem `"type":"object"` explicito (compat ajv v8 strict).
- **Validator lib:** `skills/lib/subagent-contract.ts` exporta:
  - `parseLooseJSON(raw)`, `validateContract(parsed)`, `parseContract(raw)` (alta-level)
  - `parseAndDispatch(raw, handlers)` para uso pelos orquestradores
  - Tipos: `AuditContract`, `VerificationContract`, `ProposalContract`, `MutationContract`, `SubagentContract` union, `SubagentContractBase`
  - Codigos: `ValidationErrorCode`, `ValidationWarningCode`, `ValidationError`, `ValidationWarning`, `ValidationResult`
  - Dispatch: `KindHandler<T>`, `KindHandlers`, `DispatchResult`
- **Fixture template:** `agents/__fixtures__/security-auditor/{input.md, expected-output.json}` — replicar shape para os outros 12 agentes (Planos 02/03).
- **Fixtures do validator:** `skills/lib/__fixtures__/contract-v1/` tem 4 exemplos de negativos validos para reuso em testes.

### Assinaturas/API

```ts
// Parser tolerante (strip code fence ```json, trailing comma recovery)
parseLooseJSON(raw: string): { ok: true; value: unknown } | { ok: false; error: string }

// Validador (ajv + checks custom)
validateContract(parsed: unknown): ValidationResult
parseContract(raw: string): ValidationResult  // = parseLooseJSON + validateContract

// Orquestracao por kind
parseAndDispatch(raw: string, handlers: KindHandlers): Promise<DispatchResult>
// DispatchResult = { validation: ValidationResult, dispatched: boolean, handlerKind?: ContractKind }
```

### Codigos de erro/warning (use exatamente esses nomes)

Errors: `INVALID_JSON`, `INVALID_CONTRACT_VERSION`, `MISSING_REQUIRED_FIELD`, `INVALID_LIFECYCLE_STATUS`, `REASONING_TOO_SHORT`, `INVALID_KIND`, `PAYLOAD_SCHEMA_MISMATCH`, `SECRET_PATTERN_DETECTED`.
Warnings: `REASONING_LIKELY_WEAK`.

### Thresholds confirmados

- `reasoning` < 20 chars → `REASONING_TOO_SHORT` (rejeita).
- `reasoning` 20..49 chars → `REASONING_LIKELY_WEAK` (warning, passa).
- `reasoning` >= 50 chars → sem warning.

### Padroes obrigatorios para fases que escreverem TS no plugin

- `exactOptionalPropertyTypes: true` no tsconfig. Sempre usar spread condicional `...(value ? { key: value } : {})` para opcionais. Acesso a array index retorna `T | undefined` — extrair para const e usar `?.`.
- `bun:test` (alinhado com restante do repo). `__dirname` funciona em testes (sem precisar de `import.meta.dir`).
- Zero `any`. Provenance comments com `// 2026-05-14 (Luiz/dev): ... — PRD §...` em pontos de decisao.
- Para subagentes migrados: adicionar `kind: <audit|verification|proposal|mutation>` + `contract_version: "1.0"` no frontmatter. Substituir secao "Formato de Saida" por bloco JSON + regras (status lifecycle, reasoning >= 20, dominio em `payload.domain_status`, sem secrets crus).

### Sem ajustes ao schema apos migracao do security-auditor

Schema da fase-03 validou o `expected-output.json` da fase-05 sem retoques. Os outros 12 agentes podem assumir o mesmo padrao mecanico ja em Plano 02/03.

### Itens fora de escopo levantados (para Plano 05 ou TODO.md)

- **GT-2:** Links em `plano05/fase-05-changelog-compound-merge.md` usam caminhos relativos ao diretorio do plano. Quebram `harness:validate`. Decidir em Plano 05.
- **GT-3:** `every_agents.md` na raiz sem H1, pre-existente. Decidir em Plano 05.

---

<!-- Atualizado automaticamente durante execucao -->

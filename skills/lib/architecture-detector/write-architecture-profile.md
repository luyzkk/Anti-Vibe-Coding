# write-architecture-profile

Helper de persistencia do `DetectionResult` em duas saidas sincronizadas:

1. `.claude/.anti-vibe-manifest.json` — campo `architectureProfile` (merge, nao sobrescreve outros campos)
2. `.claude/architecture-profile.md` — markdown legivel gerado pelo `renderArchitectureProfileMarkdown`

## Contrato da funcao

```typescript
export function writeArchitectureProfile(result: DetectionResult, cwd: string): void
```

- `result` — saida de `detectArchitecture()` ou resultado confirmado pelo usuario (fase-03)
- `cwd` — raiz do projeto alvo (onde `.claude/` sera criado se ausente)

## Idempotencia (G4)

Chamada duas vezes com o mesmo `DetectionResult` produz arquivos identicos.
`detectedAt` vem do `result` — nao gerado internamente — garantindo idempotencia total.

## Serializacao de signals

- `FolderSignal` com `matched=true` → `"folder:<pattern>"`
- `ImportSignal` com `matchedProfile !== null` → `"import:<pattern>"`
- Sinais negativos (nao matched) sao omitidos — nao contribuiram com evidencia positiva.

## Comportamento em manifests pre-existentes

Le o manifest atual como `Record<string, unknown>` (sem validacao de schema),
faz merge do campo `architectureProfile` e grava de volta.
Campos pre-existentes (`pluginVersion`, `architectureDetectorEnabled`, etc.) sao preservados.

Manifest ausente ou malformado (CA-10): retorna `{}` e continua — nao derruba a skill.

## DEV-01: escrita nao atomica

Nao usa o padrao `<path>.tmp` + rename. Em caso de crash no meio da escrita,
o manifest pode ficar truncado. Aceitavel para Onda 1 (escrita unica por invocacao).
Revisitar se frequencia de escrita aumentar ou se o manifest crescer.

## Modulo real

O modulo TypeScript esta em `write-architecture-profile.ts` (co-localizado).
Este arquivo e apenas documentacao.

<!--
Princípio universal #5 — Comment Provenance.
Helpers TS já têm JSDoc — suficiente. Provenance inline aplica-se a código de
runtime/cliente, NÃO a helpers internos do plugin. JSDoc + linhas de "2026-05-18
(Luiz/dev): ..." nos pontos não-obvios.
-->

# Fase 02: Helper `backup-anti-vibe` com manifest canonico (TDD)

**Plano:** 01 — Fundacao + Discovery do execute-plan
**Sizing:** 1.5h
**Depende de:** fase-01 (veredito GO no `EXECUTE_PLAN_AUDIT.md`; se NO-GO, esta fase ainda pode rodar — helper e independente de execute-plan, mas o plano feature fica bloqueado em Plano 02)
**Visual:** false

---

## O que esta fase entrega

Helper canonico `lib/backup-anti-vibe.ts` que cria, le, lista e valida backups em `.anti-vibe/backup/{ts}/` com manifest schema D29. API publica com 4 funcoes + tipo exportado, cobertura completa via TDD com 6 testes. Helper sera consumido por Plano 04 fase-03 (apply-merge-destructive) e Plano 05 fase-04 (rollback completo).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/backup-anti-vibe.ts` | Create | Helper canonico de backup com 4 funcoes publicas |
| `skills/init/lib/backup-anti-vibe.test.ts` | Create | 6 testes cobrindo schema, roundtrip, idempotencia, gitSha opcional, latest-by-timestamp |
| `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/plano01/MEMORY.md` | Modify | Registrar API final + qualquer DI/BUG/GT em "Notas para Planos Seguintes" |

---

## Implementacao

### Passo 1: Definir tipos publicos (RED)

Tipo `BackupManifest` com schema canonico D29 + `BackupAction` discriminado para tipo-seguranca em sites de consumo (Plano 04/05).

```typescript
// skills/init/lib/backup-anti-vibe.ts

export type BackupAction = 'overwrite' | 'move' | 'transform'

export type BackupManifestEntry = {
  readonly originalPath: string  // relativo ao cwd
  readonly backupPath: string    // relativo ao backup root
  readonly sha256: string
  readonly action: BackupAction
}

export type BackupManifest = {
  readonly timestamp: string  // ISO 8601: "2026-05-18T14:30:00.000Z"
  readonly files: ReadonlyArray<BackupManifestEntry>
  readonly gitSha: string | null  // null quando .git ausente
}
```

### Passo 2: Definir API publica (4 funcoes exportadas)

```typescript
export type CreateBackupInput = {
  readonly cwd: string
  readonly files: ReadonlyArray<{
    readonly originalPath: string
    readonly action: BackupAction
  }>
  /** Injetavel em testes para determinismo. Default: () => new Date() */
  readonly clock?: () => Date
}

export type CreateBackupResult = {
  readonly backupDir: string  // path absoluto: `{cwd}/.anti-vibe/backup/{ts}/`
  readonly manifest: BackupManifest
}

export declare function createBackup(input: CreateBackupInput): Promise<CreateBackupResult>
export declare function readBackupManifest(backupDir: string): Promise<BackupManifest>
export declare function getLatestBackupDir(cwd: string): Promise<string | null>
export declare function computeSha256(filePath: string): Promise<string>
```

### Passo 3: Implementar `computeSha256` (folha — sem deps internas)

- Usar `crypto.createHash('sha256')` do builtin `node:crypto`.
- Stream-read do arquivo via `fs.createReadStream` para suportar arquivos grandes sem carregar tudo em memoria.
- Retornar hex digest (string de 64 chars).
- Lancar `Error` (nao silencioso) se arquivo nao existe — caller decide tratamento.

### Passo 4: Implementar `createBackup`

Algoritmo:
1. Gerar timestamp ISO via `clock()` e derivar nome de pasta path-safe: substituir `:` por `-` e remover milissegundos → ex `2026-05-18T14-30-00Z` (G5: Windows nao aceita `:` em paths).
2. Construir `backupDir = path.join(cwd, '.anti-vibe', 'backup', tsFolder)`.
3. **Idempotencia (RNF-04, G4):** antes de criar pasta nova, chamar `getLatestBackupDir(cwd)`. Se existe e o manifest contem entries com TODOS os mesmos `originalPath` + `sha256` (computado agora) que os inputs, retornar `{ backupDir: latestExisting, manifest: latestManifest }` sem criar novo backup.
4. Caso contrario, `await fs.mkdir(backupDir, { recursive: true })`.
5. Para cada `file` em `input.files`:
   - Computar `sha256 = await computeSha256(path.join(cwd, file.originalPath))`
   - Copiar conteudo para `path.join(backupDir, file.originalPath)` (preservar estrutura de subpastas — chamar `mkdir` recursivo do parent antes).
   - Apendar `BackupManifestEntry` ao array.
6. Resolver `gitSha`:
   - Tentar `await import('node:child_process').execSync('git rev-parse HEAD', { cwd })` capturando stderr — se falha (nao e repo git), `gitSha = null` (G6).
   - Alternativamente, ler `.git/HEAD` direto via `fs.readFile` e parsear ref → menos invasivo, mais portavel. Subagente escolhe (documentar a escolha em MEMORY.md DI-N).
7. Escrever `manifest.json` em `path.join(backupDir, 'manifest.json')` com `JSON.stringify(manifest, null, 2)`.
8. Retornar `{ backupDir, manifest }`.

### Passo 5: Implementar `readBackupManifest`

- `await fs.readFile(path.join(backupDir, 'manifest.json'), 'utf8')`.
- `JSON.parse` + validacao minima de schema (presenca dos campos `timestamp`, `files`, `gitSha`; tipos basicos).
- Se invalido, lancar `Error('Backup manifest at {path} is malformed: {reason}')` — caller (Plano 05 rollback) decide se aborta.

### Passo 6: Implementar `getLatestBackupDir`

- `const root = path.join(cwd, '.anti-vibe', 'backup')`.
- Se `root` nao existe (`fs.access` falha com `ENOENT`), retornar `null`.
- `await fs.readdir(root)` → filtrar por padrao regex `/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/` (ISO path-safe).
- Como o formato e lexicograficamente ordenado igual a cronologicamente (G3), `sort()` + pegar ultimo retorna o mais recente.
- Retornar `path.join(root, latest)` absoluto.

### Passo 7: Testes (`backup-anti-vibe.test.ts`)

Cada teste usa `tmpdir()` isolado + clock injetado para determinismo. Listagem dos 6 testes obrigatorios:

| # | Nome do teste | O que verifica |
|---|---------------|----------------|
| 1 | `createBackup writes manifest with sha256 of each file` | Cria 2 arquivos tmp, chama createBackup, le manifest.json, asserta que sha256 de cada entry bate com `computeSha256(originalPath)`. |
| 2 | `readBackupManifest roundtrips with createBackup` | Apos createBackup, chama readBackupManifest(result.backupDir) e asserta deep-equal com result.manifest. |
| 3 | `getLatestBackupDir returns null when .anti-vibe/backup does not exist` | tmpdir vazio → resultado null. |
| 4 | `getLatestBackupDir returns latest by lexicographic timestamp` | Criar 3 backups com clocks 2026-05-18T10:00:00Z, T11:00:00Z, T09:00:00Z → resultado deve ser o T11:00:00Z. |
| 5 | `manifest includes gitSha when .git exists, null otherwise` | tmpdir com `.git/HEAD` mockado contendo `ref: refs/heads/main` + `.git/refs/heads/main` com sha → asserta gitSha valido. tmpdir sem `.git` → asserta null. |
| 6 | `idempotency: createBackup is no-op when state checksums match latest backup` | Cria backup com clock t1, chama createBackup novamente com clock t2 mas mesmo conteudo dos arquivos → asserta que retornou o backupDir do t1 (sem criar pasta nova). Lista de `.anti-vibe/backup/` deve ter exatamente 1 entrada. |

### Passo 8: REFACTOR

- Extrair constante `BACKUP_ROOT_REL = '.anti-vibe/backup'`.
- Extrair util interno `formatTimestampPathSafe(date: Date): string`.
- Extrair util interno `readGitSha(cwd: string): Promise<string | null>`.
- Garantir que tipos exportados sao `Readonly`/`ReadonlyArray` (imutabilidade).

---

## Snippets de referencia

### Schema do manifest (canonico — NAO ALTERAR sem atualizar PRD)

```typescript
// 2026-05-18 (Luiz/dev): D29 do PRD — schema canonico do backup manifest.
// Consumido por Plano 04 fase-03 (apply-merge) e Plano 05 fase-04 (rollback).
export type BackupManifest = {
  readonly timestamp: string  // ISO 8601 com Z (UTC)
  readonly files: ReadonlyArray<BackupManifestEntry>
  readonly gitSha: string | null
}
```

### Path-safe timestamp

```typescript
// G5: Windows nao aceita ":" em paths. ISO normal `2026-05-18T14:30:00.000Z`
// vira `2026-05-18T14-30-00Z`.
function formatTimestampPathSafe(d: Date): string {
  return d.toISOString().replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z')
}
```

### Stub de gitSha sem child_process (preferido)

```typescript
async function readGitSha(cwd: string): Promise<string | null> {
  try {
    const headPath = path.join(cwd, '.git', 'HEAD')
    const head = await fs.readFile(headPath, 'utf8')
    const refMatch = head.match(/^ref: (.+)$/m)
    if (refMatch) {
      const refPath = path.join(cwd, '.git', refMatch[1].trim())
      return (await fs.readFile(refPath, 'utf8')).trim()
    }
    return head.trim()  // detached HEAD: ja eh sha
  } catch {
    return null
  }
}
```

---

## Gotchas

- **G3 do plano (schema D29 canonico):** Qualquer mudanca de campo (renomear `originalPath` → `original_path`, p.ex.) quebra Plano 05 fase-04. Atualizar PRD ANTES de mudar.
- **G4 do plano (idempotencia RNF-04):** Teste #6 deve checar tambem que pasta `.anti-vibe/backup/` tem exatamente 1 entrada — nao basta retornar o path do antigo, eh proibido criar pasta vazia.
- **G5 do plano (Windows path-safety):** Use o util `formatTimestampPathSafe`. Teste #4 implicitamente valida (compara ordenacao lexicografica de paths reais).
- **G6 do plano (gitSha opcional):** Teste #5 cobre os dois caminhos. NAO usar `child_process.execSync` quando possivel — `fs.readFile` em `.git/HEAD` evita dependencia de `git` no PATH (relevante para CI minimalista).
- **Local — manifest.json fica DENTRO de `{ts}/`, nao fora:** path completo eh `.anti-vibe/backup/{ts}/manifest.json`. Consistente com D9 ("espelha estrutura original").
- **Local — `getLatestBackupDir` ignora pastas nao-canonicas:** se houver pasta `.anti-vibe/backup/garbage/` sem timestamp valido, filter regex descarta. Garante robustez contra lixo manual do dev.

---

## Verificacao

### TDD

- [ ] **RED:** Criar `backup-anti-vibe.test.ts` com os 6 testes ANTES de implementar. Rodar `bun test skills/init/lib/backup-anti-vibe.test.ts` — deve falhar com "Cannot find module ./backup-anti-vibe" (compilation OK, runtime error eh expected na assertion).
  - Reformular: criar primeiro stubs vazios em `backup-anti-vibe.ts` exportando os 4 nomes que lancam `Error('not implemented')`. Rodar testes — devem falhar nas assertions, nao no import.
- [ ] **GREEN:** Implementar passo-a-passo (computeSha256 → createBackup → readBackupManifest → getLatestBackupDir). Cada implementacao faz 1 ou 2 testes passarem.
  - Comando: `bun test skills/init/lib/backup-anti-vibe.test.ts`
  - Resultado esperado: `6 passed, 0 failed`.
- [ ] **REFACTOR:** Extrair constantes/utils internos. Re-rodar testes — devem continuar verdes.

### Checklist

- [ ] `skills/init/lib/backup-anti-vibe.ts` exporta exatamente: `BackupAction`, `BackupManifestEntry`, `BackupManifest`, `CreateBackupInput`, `CreateBackupResult`, `createBackup`, `readBackupManifest`, `getLatestBackupDir`, `computeSha256`.
- [ ] Todos os 6 testes em `backup-anti-vibe.test.ts` passam.
- [ ] Teste #6 (idempotencia) verifica TAMBEM que `.anti-vibe/backup/` tem 1 entrada apos segundo `createBackup` com conteudo identico.
- [ ] Teste #5 cobre os dois caminhos de gitSha (com e sem `.git`).
- [ ] Nenhum teste usa `process.cwd()` real — todos usam `mkdtemp` isolado.
- [ ] `bun run lint` clean em `skills/init/lib/backup-anti-vibe.ts` e `backup-anti-vibe.test.ts`.
- [ ] Sem uso de `child_process` (preferir leitura direta de `.git/HEAD`).
- [ ] `MEMORY.md` do plano01: secao "Notas para Planos Seguintes" lista as 4 funcoes publicas com assinatura exata e nota a decisao de implementacao do `readGitSha` (DI-N).

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/backup-anti-vibe.test.ts` retorna `6 passed, 0 failed`.
- `bun run lint skills/init/lib/backup-anti-vibe.ts skills/init/lib/backup-anti-vibe.test.ts` retorna 0.
- `grep -E '^export (function|type|const) ' skills/init/lib/backup-anti-vibe.ts | wc -l` >= 9 (4 funcoes + 5 tipos).

**Por humano:**
- Reviewer consegue importar `createBackup` de outro arquivo TS sem alertas de tipo (autocomplete mostra `CreateBackupInput`/`CreateBackupResult` corretamente tipados).

---

## Decisoes Aplicadas

- **D9 do PRD** (localizacao do backup): pasta `.anti-vibe/backup/{ts}/` implementada exatamente como especificado.
- **D29 do PRD** (manifest schema): tipos `BackupManifest` + `BackupManifestEntry` materializam o schema canonico.
- **SH-12 do PRD** (manifest dedicado com checksum-validation): `sha256` armazenado em cada entry permite rollback validar integridade antes de restaurar.
- **RNF-04 do PRD** (idempotencia cross-runs): teste #6 garante que estado identico → no-op.
- **R-04 do PRD** (Windows compat): `formatTimestampPathSafe` + `path.join` em vez de concatenacao.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

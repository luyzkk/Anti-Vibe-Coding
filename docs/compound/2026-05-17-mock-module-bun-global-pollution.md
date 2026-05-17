---
title: "mock.module no Bun e GLOBAL: vaza entre arquivos de teste e quebra suites em ordem alfabetica"
category: armadilha
tags: [bun, testing, mock, isolation, pollution, dependency-injection, cross-file]
created: "2026-05-17"
---

## Problem

No Bun (v1.3.9), `mock.module("./path", factory)` substitui o modulo **globalmente** no module cache do runtime — nao por arquivo, nao por describe block, nao por test. O mock persiste por toda a execucao do `bun run test` (que carrega todos os 162 arquivos no mesmo processo).

Em [skills/lib/preface-context.test.ts](../../skills/lib/preface-context.test.ts), o autor sabia disso e tentou "mitigar" via `afterAll` re-mockando para `() => null`:

```ts
afterAll(() => {
  mock.module("./read-architecture-profile", () => ({
    readArchitectureProfile: () => null,
  }));
});
```

Resultado: quando `bun run test` carrega arquivos em ordem alfabetica, `preface-context.test.ts` roda ANTES de `read-architecture-profile.test.ts` e `fase-policy.test.ts`. Esses 2 arquivos chamam a funcao real `readArchitectureProfile(fixture)` e recebem `null` do mock fantasma — **9 testes falhando silenciosamente** com mensagens enganosas (`Expected: "vertical-slice"  Received: undefined`).

Pior: rodar cada arquivo em isolamento (`bun test ./skills/lib/read-architecture-profile.test.ts`) passa 16/16. Pollution so aparece no run global. Bisection custou ~30min ate isolar `preface-context.test.ts` como polluter.

Tentativa de fix por restauracao tambem falhou: capturar `import * as realReadArch from "./read-architecture-profile"` no topo e re-mockar com esse objeto **nao funciona** porque o namespace object ja foi substituido pelo primeiro `mock.module`. Voce nao tem referencia ao real depois que mockou.

## Solution

**Eliminar `mock.module` substituindo por dependency injection** no codigo de producao. Adicionar parametro opcional `reader` com default = impl real:

```ts
// skills/lib/preface-context.ts
export function readPrefaceContext(
  projectRoot: string,
  reader: (manifestPath: string) => ArchitectureProfile | null = readArchitectureProfile,
): PrefaceContext {
  const archProfile = reader(manifestPath);
  // ...
}
```

No teste, passar reader inline:

```ts
const result = readPrefaceContext("/fake/root", () => mockProfile);
// nao precisa de mock.module, nao precisa de afterAll, zero contaminacao
```

Custo: 1 parametro novo na assinatura publica (backward-compat preservado via default). Beneficio: testes 100% isolados, sem dependencia de ordem de execucao, falhas reproduziveis em isolamento.

Commit: `2c2aa04` (suite 11 fail -> 3 fail apenas com esse fix).

## Why It Matters (Lesson)

**Pattern detectavel:** todo `mock.module` em runtime que cacheia modulos globalmente (Bun, Jest sem reset, Vitest sem `vi.restoreAllMocks`) e uma **bomba-relogio cross-file**. Sintomas:

1. Teste passa em isolamento, falha no run global.
2. Mensagem de erro nao aponta para o polluter (`Received: undefined` em vez de "mock vazou").
3. Ordem alfabetica do nome do arquivo importa — renomear `preface-context.test.ts` para `zz-preface.test.ts` "fixaria" temporariamente, mascarando o bug.

**Heuristica:** se voce usa `mock.module` para mockar um modulo X em um arquivo de teste Y, **NAO existe outro arquivo de teste Z que importa X** sem mockar. Se houver, voce vai ter pollution mais cedo ou mais tarde.

**Sinal de alerta:** comentario no codigo dizendo "mock.module e global no Bun — vamos manter contaminacao consistente" e um anti-pattern disfaracado de awareness. Awareness sem fix nao protege — proxima pessoa que adicionar um teste em qualquer arquivo paga o preco.

**Generalizacao:** o mesmo padrao se manifesta em outros sistemas:
- `process.env.X` setado em test sem `afterEach` — vaza para proximos arquivos.
- `process.chdir(tmpDir)` sem restore — vaza cwd.
- `globalThis.fetch = fn` para mockar HTTP — vaza para outros arquivos.
- Singleton patterns mutados em setup.

A solucao canonica em todos os casos e a mesma: **dependency injection no codigo de producao + reader/handler/client passado por argumento em testes**. Resiste a refactors do test runner, funciona em qualquer linguagem, nao depende de feature do framework.

## Prevention

Antes de adicionar `mock.module` em qualquer arquivo `.test.ts`:

1. Grep por outros arquivos de teste que importam o modulo alvo:
   ```bash
   rg -l "from ['\"]./read-architecture-profile['\"]" --type ts
   ```
2. Se houver outro consumidor de teste: **NAO USE `mock.module`**. Refatore o codigo para aceitar dependency injection.
3. Se o codigo de producao nao puder ser refatorado agora, isole o teste em um arquivo cujo nome ordene **DEPOIS** alfabeticamente de todos os consumidores reais — e adicione um comentario gritante:
   ```ts
   // WARNING: este arquivo USA mock.module global do Bun.
   // NAO crie outro teste que importe X — vai falhar silenciosamente.
   ```
4. Documente no PR que e debito tecnico explicito.

CI gate sugerido (futuro): script que detecta `mock.module(` em arquivos de teste e cruza com `import.*from.*<modulo-mockado>` em outros tests. Falha se encontrar conflito.

## References

- Commit do fix: `2c2aa04` (fix(tests): preface-context usa reader injetavel em vez de mock.module global)
- Polluter original: [skills/lib/preface-context.test.ts](../../skills/lib/preface-context.test.ts) (antes do commit `2c2aa04`)
- Vitimas detectadas: `read-architecture-profile.test.ts` (8 testes) + `fase-policy.test.ts` (1 teste)
- Bun docs sobre mock.module: https://bun.sh/docs/test/mocks#mock-modules (nao menciona escopo global explicitamente — origem da confusao)
- Lesson relacionada: [2026-05-12-skill-md-code-blocks-do-not-execute.md](./2026-05-12-skill-md-code-blocks-do-not-execute.md) — mesma classe de "feature parece scoped mas nao e"

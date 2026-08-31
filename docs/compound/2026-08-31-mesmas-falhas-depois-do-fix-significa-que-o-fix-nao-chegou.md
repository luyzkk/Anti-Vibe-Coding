---
title: "As mesmas falhas depois do GREEN significam que o fix não chegou onde você pensa — camada de escape corrompe conteúdo em silêncio"
category: armadilha
tags: [tooling, heredoc, escaping, regex, tdd, diagnostico, python, bash, falha-silenciosa]
created: 2026-08-31
---

## Problem

Escrever um arquivo TypeScript através de um heredoc Python (`python - <<'EOF'` com o conteúdo
numa string `'''...'''`) converte `\b` em **caractere backspace** (0x08). O `\s` sobrevive, porque
não é sequência de escape em Python; o `\b` não, porque é.

O resultado é uma regex que **compila sem erro** e nunca casa:

```
const DEP_ENTRY = /["']\s*(django|flask)<BS>/i     // o byte 0x08 é invisível
```

Nenhuma camada denuncia. `sed`, `grep` e a leitura normal do arquivo mostram o texto correto — o
byte não tem representação visível. O TypeScript compila. O lint passa. O teste falha com
`Expected: "...", Received: null`, que é indistinguível de "a lógica está errada".

Só apareceu com `cat -A`, que renderiza o byte como `^H`.

O mesmo mecanismo tem uma variante em Bash: escrever conteúdo por `cat <<EOF` **sem** aspas no
delimitador faz o shell expandir `$var` e crases dentro do texto. Aqui isso engoliu um trecho de
mensagem de commit — `` `origin: ECC` `` virou string vazia porque as crases foram lidas como
substituição de comando, e a mensagem foi ao repositório com um buraco no meio da frase.

## Solution

**O sintoma diagnóstico é mais valioso que o bug.** A sequência foi:

1. RED escrito → 4 falhas, todas assertion failure legítimas
2. GREEN implementado → **as mesmas 4 falhas, idênticas**

Falha idêntica depois de um fix não é "o fix está incompleto". É **"o fix não chegou onde você
pensa que chegou"**. As hipóteses, em ordem de custo:

- o arquivo editado não é o que o teste importa (path, build stale, cópia)
- o conteúdo escrito não é o conteúdo pretendido (escaping, encoding, truncamento)
- o teste não exercita o caminho que você mudou

A terceira é a que se investiga por instinto — reler a lógica. As duas primeiras são mais baratas
de descartar e foi a segunda que valia aqui. `cat -A` no trecho alterado resolveu em um comando o
que reescrever a lógica não resolveria nunca.

Correções aplicadas:

- Para conteúdo com regex ou escapes: usar a **ferramenta de escrita direta**, não heredoc. Se
  precisar de Python, string **raw** (`r'''...'''`).
- Para heredoc Bash com texto que contenha crase, `$` ou `!`: delimitador **entre aspas**
  (`<<'EOF'`), que desliga a expansão. Para mensagem de commit, `git commit -F arquivo`.

## Prevention

1. **Mesma falha antes e depois do fix ⇒ suspeite do transporte, não da lógica.** Antes de reler o
   código, prove que o byte que está no disco é o byte que você quis escrever.

2. **`cat -A` é o comando que fecha essa classe.** Bytes de controle, CRLF e espaços em fim de
   linha são todos invisíveis nas ferramentas normais. Custa um comando.

3. **Toda camada de escape é uma oportunidade de corrupção silenciosa.** Conteúdo que atravessa
   shell → linguagem → arquivo passa por três interpretadores, cada um com o seu conjunto de
   sequências especiais. Quanto mais o conteúdo parece código (regex, JSON, template), maior a
   chance de colisão.

4. **Sintoma correlato:** trecho que "sumiu" de uma mensagem, log ou doc — quase sempre expansão de
   shell num heredoc sem aspas, não perda de edição.

5. **Esta lição se aplica a:** qualquer agente ou script que gere arquivo por heredoc, `echo`,
   template ou serialização — e em especial a conteúdo com regex, path do Windows (`\`), ou texto
   que cite comandos.

## Affected files

- `skills/init/lib/format-knowledge-preview.ts` — onde a regex corrompida foi escrita e corrigida (`extractPythonWebFrameworkNote`)
- `docs/exec-plans/completed/2026-08-30-stack-knowledge-python/plano04/fase-04-index-final-e-nota-django-flask.md` — a fase em que ocorreu
- `TODO.md` — registro do gotcha para as fases seguintes

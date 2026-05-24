# Capture Guide

Knowledge interno da skill `compound-engineering` (D13).
Consultado pelo agente durante o decision gate; NAO instalado em projetos consumidores.

---

## Quando capturar

Capture quando o trabalho revelou algo que outro dev ou agente futuro poderia errar sem saber:

**Sinais positivos — capture:**
- Um bug que levou mais de 1 hora para diagnosticar e nao era obvio no stack trace
- Um review/checklist falhou e o motivo era um padrao que se repete (ex: "toda vez que X, checar Y")
- Producao ou staging revelou um comportamento diferente do esperado em dev
- Uma suposicao sobre uma lib/API estava errada e custou tempo corrigi-la
- Uma decisao de design que parece estranha mas tem razao nao-trivial (previne regresso de entendimento)

**Sinais negativos — NAO capture:**
- Fix de typo ou problema cosmetico
- Mudanca de configuracao trivial (bump de versao, ajuste de indent)
- Bug ja documentado em issue ou ADR existente
- Algo que qualquer dev junior encontraria na documentacao oficial em < 5 minutos
- Refatoracao sem mudanca de comportamento ou API

---

## Como formular o titulo

O titulo deve ser:
- **Curto** (< 60 chars) — cabe em uma linha de log
- **Declarativo** — descreve o que e verdade, nao o que aconteceu (prefira "X causa Y em Z" sobre "descobri que X causa Y")
- **Indexavel** — use termos que aparecem no codigo ou na documentacao (facilita grep futuro)

Exemplos bons:
- `bun test --watch reinicia ao modificar fixtures`
- `registry.test.ts falha se import orfo nao e removido`
- `Bun.spawn cwd diferente de process.cwd em subtasks`

Exemplos ruins:
- `bug encontrado hoje` (sem contexto)
- `corrigido problema de deploy` (vago, nao indexavel)
- `importante: lembrar de checar isso` (imperativo, nao declarativo)

---

## Formato da nota

Use o subcomando `lessons-learned add "<titulo>"` para criar a nota.
A skill `lessons-learned` gera o frontmatter e o template padrao.

Preencha os campos:
- **Context:** o que voce estava fazendo quando encontrou isso
- **What happened:** o comportamento inesperado ou a decisao tomada
- **Why it matters:** consequencias se ignorado
- **How to avoid:** o que verificar, o padrao a seguir

---

## Idioma

PT-BR e aceito para knowledge interno (este guia, notas de compound).
Templates instalados em projetos consumidores (`.tpl`) sao en-US por convencao (GT-fase01-tpl-en-us-only).

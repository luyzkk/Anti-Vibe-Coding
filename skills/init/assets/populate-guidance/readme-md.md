# Guidance: README.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

README.md eh o **primeiro arquivo que alguem ve** ao chegar no projeto. Resolve UMA pergunta: "consigo rodar isso localmente em menos de 10 minutos?". Tudo mais — arquitetura, roadmap, governanca — vai para outros docs e fica linkado aqui. Qualquer informacao que nao ajude a responder essa pergunta central nao pertence ao README.

O publico primario eh um engenheiro novo no projeto que nunca viu o codebase antes. O publico secundario eh um CI que vai executar os mesmos comandos do Quick Start para verificar que eles ainda funcionam.

## Espirito do doc (tom esperado)

Curto. Acionavel. Top-to-bottom executavel sem fluxo paralelo. Se o leitor precisa abrir 3 abas para entender o Quick Start, voce escreveu demais. A voz eh imperativa e direta: "instale as dependencias", "rode o servidor", "abra no browser". Sem filosofia, sem historia.

## Sinais a procurar no codebase

- `package.json` scripts (`dev`, `start`, `test`, `build`) — fonte da verdade dos comandos. Nao invente comandos que nao estao nesses scripts.
- Framework markers: `next.config.js`, `Gemfile`, `pyproject.toml`, `composer.json` — determinam a linguagem do Quick Start.
- `docker-compose.yml`, `Dockerfile.dev` — se existe, mencionar como alternativa de setup.
- `.env.example` — se existe, o Quick Start deve incluir "copie .env.example para .env".
- `bun.lockb`, `package-lock.json`, `yarn.lock` — determinam qual gerenciador de pacotes usar no Quick Start.

## Por H2 — o que escrever

### Overview
Uma ou duas sentencas. O que o projeto faz, para quem. Se voce precisar de mais de duas sentencas para descrever o projeto, o projeto provavelmente nao tem foco claro — escreva as duas sentencas e pare.

**Cubra:** proposito em uma linha, audiencia primaria
**NAO escreva:** historia do projeto, pitch comercial, por que essa tecnologia foi escolhida

### Prerequisites
Versoes de runtime (Node 18+, Ruby 3.2, etc.), banco de dados externo se for local, ferramentas de CLI obrigatorias. So mencione pre-requisitos que o setup nao instala automaticamente — se `bun install` cuida das dependencias, nao liste cada pacote individualmente.

**Cubra:** versao de runtime, variaveis de ambiente obrigatorias antes do primeiro run, ferramentas que nao sao instaladas pelo projeto
**NAO escreva:** "saiba git e bash" (assume baseline), instrucoes de instalacao do SO, pre-requisitos que o proprio setup resolve

### Quick Start
Comandos exatos que rodam top-to-bottom no ambiente de desenvolvimento. Idealmente 3-5 comandos. O caminho feliz, nao todos os casos de borda. Se houver passo que falha em ambiente comum (ex: falta de variavel), mencione o `TODO` — nao silencia o problema.

**Cubra:** clone, install, env setup (se necessario), run command
**NAO escreva:** "rode o instalador.sh com `--help` para ver opcoes" — execute o caminho feliz diretamente

### Key Documentation
Links para os 3-5 docs mais importantes do projeto (ARCHITECTURE.md, docs/SECURITY.md, docs/PLANS.md). Nao tente ser exaustivo — um indice completo de todos os docs vira ruido. Escolha os docs que um novo contribuidor vai precisar em seus primeiros dias.

**Cubra:** links para ARCHITECTURE.md e docs mais acessados, com 1 linha de contexto cada
**NAO escreva:** lista completa de todos os arquivos em docs/ (isso eh um indice, nao Key Documentation)

## Stack-specific

### Rails
`bundle install && bin/rails db:setup && bin/rails server`. Mencione a versao do Ruby se nao estiver no Gemfile diretamente. Se usa `bin/setup`, prefira esse sobre os passos individuais — mantem README e script em sincronia.

### Next + React
`bun install && bun dev` (ou o gerenciador de pacotes indicado pelo lockfile). Mencione versao do Node. Se usa `.env.local`, o Quick Start deve incluir o passo de copiar `.env.example`.

### Node + TypeScript
`bun install && bun run dev` se o script existe; caso contrario aponte para o script real no package.json. Nao invente nome de script.

## Links obrigatorios

`ARCHITECTURE.md` eh a leitura subsequente natural para quem quer entender mais depois do Quick Start. O link deve ter 1 linha de contexto: "para entender a estrutura do sistema, leia ARCHITECTURE.md".

## Quando deixar TODO

Se Quick Start nao roda top-to-bottom sem erro (encontrou bug em setup ou dependencia faltando), deixe `TODO(<broken-setup>): comando X falha com erro Y — verificar setup de ambiente`. NAO documente um Quick Start que voce nao sabe se funciona.

## Anti-patterns

- NAO incluir prints de UI no README — envelhece rapido, infla o repositorio
- NAO incluir badges decorativos sem valor (CI status eh util, "made with love" nao eh)
- NAO repetir conteudo de CONTRIBUTING.md aqui — link para ele
- NAO listar roadmap ou features planejadas no README — pertence a docs/PLANS.md

<!--
Princípio universal #5 — Comment Provenance.
Esta fase cria THIRD-PARTY-NOTICES.md (markdown puro, sem código TS). Não há comments inline
de provenance porque o arquivo INTEIRO é audit trail de licença. Convenção: arquivo abre com
HTML comment `<!-- 2026-05-24 (Luiz/dev): NOTICES único — D14 + RF-15, resolve R6 do PRD -->`.
-->

# Fase 02: `THIRD-PARTY-NOTICES.md` — texto MIT + Copyright Addy Osmani + lista das 6 SKILL.md V2

**Plano:** 01 — Infra + Detector + Tracer Bullet
**Sizing:** 0.5h
**Depende de:** fase-01 (precisa `knowledge/nextjs/` existir caso decisão de localização caia em `knowledge/nextjs/THIRD-PARTY-NOTICES.md`. Se localização for raiz do plugin, dependência é nominal — `knowledge/nextjs/` apenas referenciado no texto)
**Visual:** false

---

## O que esta fase entrega

Arquivo `THIRD-PARTY-NOTICES.md` (decisão de localização: **raiz do plugin** — padrão tipo kernel/Apache) contendo: texto MIT verbatim copiado de [Infos/knowledge/NextJS/agent-skills-main/LICENSE](../../../../Infos/knowledge/NextJS/agent-skills-main/LICENSE), Copyright (c) 2025 Addy Osmani, lista nomeada das 6 SKILL.md V2 usadas como inspiração para atoms de `knowledge/nextjs/`, e referência ao path do LICENSE original (que está em `Infos/` no .gitignore — verificado localmente). Resolve R6 do PRD via D14/RF-15. Satisfaz CA-11.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `THIRD-PARTY-NOTICES.md` (na raiz do plugin) | Create | Texto MIT verbatim + Copyright Addy Osmani + lista das 6 SKILL.md V2 + nota sobre LICENSE verificado localmente em `Infos/` |

**Decisão de localização — raiz do plugin (recomendado):**
- **Por que raiz:** padrão de projetos open-source maduros (kernel Linux, Apache, Node.js — todos mantêm NOTICES na raiz). Centraliza atribuições de terceiros num único arquivo, facilita auditoria de licença pelo usuário/dev/contributor.
- **Alternativa rejeitada (`knowledge/nextjs/THIRD-PARTY-NOTICES.md`):** acoplaria NOTICES à matrix folder, dificultando expansão futura quando outras stacks (Phoenix? Go?) importarem material de terceiros — teríamos múltiplos NOTICES espalhados, contrariando MIT "preserve in copies or substantial portions" no espírito de "centralizado e visível".
- **Mencionada no preâmbulo do NOTICES:** este arquivo se aplica a `knowledge/nextjs/atoms/*.md` (escopo atual); expansões futuras adicionam seções ao mesmo arquivo.

---

## Implementacao

### Passo 1: ler LICENSE original

```bash
cat Infos/knowledge/NextJS/agent-skills-main/LICENSE
```

Resultado esperado (já lido nesta fase de planejamento):

```
MIT License

Copyright (c) 2025 Addy Osmani

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OU IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Passo 2: criar `THIRD-PARTY-NOTICES.md` na raiz do plugin

Conteúdo exato (espelhado verbatim do LICENSE para texto MIT — toda mudança é violação):

```markdown
<!-- 2026-05-24 (Luiz/dev): NOTICES único — D14 + RF-15 do PRD nextjs-react-stack-knowledge, resolve R6. -->

# Third-Party Notices

This file lists third-party works that the Anti-Vibe-Coding plugin includes content **derived from** (not copied verbatim). Each entry preserves the upstream copyright notice and license text as required by the upstream license terms.

---

## Anti-Vibe-Coding plugin includes content derived from third-party works:

### agent-skills (Addy Osmani, MIT License)

The atoms in `knowledge/nextjs/atoms/*.md` are **distilled** from the `agent-skills` repository by Addy Osmani (MIT licensed). Distillation involves selecting senior patterns, anti-patterns, and decision criteria from upstream SKILL.md V2 files and rewriting them in the Anti-Vibe-Coding atom format (frontmatter + 4 mandatory sections). Each derivative atom lists the upstream SKILL.md V2 path in its frontmatter `sources:` field for audit traceability.

**Upstream license verified locally at:** `Infos/knowledge/NextJS/agent-skills-main/LICENSE` (the `Infos/` directory is `.gitignore`-d as reference material — the LICENSE file lives outside the public repo but its text is reproduced verbatim below per the MIT preservation clause).

**Upstream SKILL.md V2 files used as inspiration for `knowledge/nextjs/atoms/`:**

1. `nextjs-app-router-patterns V1` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns/SKILL.md`)
2. `nextjs-app-router-patterns V2` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-app-router-patterns V2/SKILL.md`)
3. `nextjs-best-practices` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-best-practices/SKILL.md`)
4. `nextjs-expert` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-expert/SKILL.md`)
5. `nextjs-supabase-auth` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-supabase-auth/SKILL.md`)
6. `nextjs-turbopack` (`Infos/knowledge/NextJS/agent-skills-main/nextjs-turbopack/SKILL.md`)

#### MIT License (verbatim from upstream LICENSE):

```
MIT License

Copyright (c) 2025 Addy Osmani

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Future expansion

If future stacks (Phoenix? Go? Elixir?) include derivative content from third-party works, append additional sections (`### <upstream-name> (<author>, <license>)`) to this file. Keep this single file as the canonical NOTICES — do not split across matrix folders.
```

### Passo 3: validar checksums e CA-11

Verificar com `grep` se os 3 ingredientes obrigatórios estão presentes:

```bash
# 1. Texto MIT (procurar phrase única do MIT)
grep -c "Permission is hereby granted, free of charge" THIRD-PARTY-NOTICES.md

# 2. Copyright Addy Osmani (CA-11 exige string exata)
grep -c "Copyright (c) 2025 Addy Osmani" THIRD-PARTY-NOTICES.md

# 3. Lista das 6 SKILL.md V2 (CA-11)
grep -c "nextjs-app-router-patterns V1\|nextjs-app-router-patterns V2\|nextjs-best-practices\|nextjs-expert\|nextjs-supabase-auth\|nextjs-turbopack" THIRD-PARTY-NOTICES.md
```

Resultado esperado:
- Grep 1: ≥1 (texto MIT presente)
- Grep 2: ≥1 (copyright preservado)
- Grep 3: 6 (todas as 6 skills listadas)

Se qualquer um falhar, NÃO commitar — revisar arquivo até passar.

### Passo 4: commit fase-02

```bash
git add THIRD-PARTY-NOTICES.md
git commit -m "$(cat <<'EOF'
docs: add THIRD-PARTY-NOTICES.md — MIT attribution para agent-skills

D14 + RF-15 do PRD nextjs-react-stack-knowledge, resolve R6.

Lista 6 SKILL.md V2 do agent-skills (Addy Osmani, MIT) usadas como
inspiração para atoms de knowledge/nextjs/. Texto MIT verbatim
preservado (cláusula "include in copies or substantial portions").
LICENSE original verificado localmente em
Infos/knowledge/NextJS/agent-skills-main/LICENSE (Infos/ está no
.gitignore — reference material, não committado).

Localização: raiz do plugin (padrão tipo kernel/Apache).
Plano 01 fase-02. Satisfaz CA-11.
EOF
)"
```

---

## Gotchas

- **Local — texto MIT é VERBATIM (não parafrasear):** copiar literalmente da fonte. Mesmo uma letra trocada ("OU" vs "OR", "the" vs "this") pode invalidar a preservação da licença legalmente. O LICENSE no arquivo source tem um typo (`OUT OF OU IN CONNECTION`) — copiar SEM corrigir. Se for evidente erro de OCR, documentar mas manter verbatim.
   - **AÇÃO:** abrir [Infos/knowledge/NextJS/agent-skills-main/LICENSE](../../../../Infos/knowledge/NextJS/agent-skills-main/LICENSE), copiar com cuidado, comparar byte-a-byte (ou linha-a-linha) com o output do NOTICES.

- **Local — `Infos/` está no .gitignore (incidente 2026-05-24 — feedback_git_repo_scope):** o arquivo `Infos/knowledge/NextJS/agent-skills-main/LICENSE` NÃO entra no repo. O NOTICES.md no repo aponta para esse path como "verified locally at" — funciona como audit trail textual. Devs que clonem o repo veem o NOTICES mas não o LICENSE original. Isso é CORRETO — material de consulta fica local; apenas o aviso de preservação vai pro repo público.

- **Local — localização raiz vs `knowledge/nextjs/`:** opção raiz é recomendada (D14, kernel/Apache padrão). Se o dev preferir colocar em `knowledge/nextjs/`, atualizar:
  - Path do create: `knowledge/nextjs/THIRD-PARTY-NOTICES.md`
  - Comentário "Future expansion": muda para "Other matrix folders that import derivative content should have their own THIRD-PARTY-NOTICES.md" — mas é menos elegante.
  - **Recomendação firme:** raiz do plugin. Discutir com dev em STATE.md se necessário antes de commitar.

- **Local — 6 SKILL.md V2 incluem `V1` da nextjs-app-router-patterns:** o PRD lista as 6 skills sem distinção; o agent-skills repo tem `nextjs-app-router-patterns` e `nextjs-app-router-patterns V2` (V1 e V2 mantidos lado-a-lado). Listar as 6 explicitamente para evitar confusão. Verificar via `ls Infos/knowledge/NextJS/agent-skills-main/` para confirmar nomes exatos antes de listar.

- **Local — `compound:check` pode reclamar de licensing files:** `bun run compound:check` é orientado a compound notes (`docs/compound/*.md`). NOTICES não é compound — pode ser ignorado pelo checker. Se reclamar (por estar em raiz), considerar adicionar exclusion pattern. Improvável — NOTICES tem extensão `.md` mas nome distinto.

- **Local — futuro: se Plano 02/03 destilar de fontes ADICIONAIS além de agent-skills (ex: compass_artifact_wf-*.md são research deep-research, não licensed code):** considerar adicionar seções extras ao NOTICES quando aplicável. Os compass artifacts não vêm com licença explícita (são deep-research files internos) — não necessário NOTICES para eles. Apenas as 6 SKILL.md V2 demandam atribuição (MIT explícito).

---

## Verificacao

### TDD

Fase **content-only** (markdown puro com texto licensed). Sem ciclo RED→GREEN. Usar checklist + greps de validação CA-11.

### Checklist

- [ ] `THIRD-PARTY-NOTICES.md` existe na raiz do plugin
- [ ] HTML comment de provenance na linha 1: `<!-- 2026-05-24 (Luiz/dev): NOTICES único — D14 + RF-15 do PRD nextjs-react-stack-knowledge, resolve R6. -->`
- [ ] Texto MIT verbatim presente (grep `"Permission is hereby granted, free of charge"` retorna ≥1)
- [ ] String exata `Copyright (c) 2025 Addy Osmani` presente (CA-11)
- [ ] Lista nomeada das 6 SKILL.md V2: `nextjs-app-router-patterns V1`, `nextjs-app-router-patterns V2`, `nextjs-best-practices`, `nextjs-expert`, `nextjs-supabase-auth`, `nextjs-turbopack`
- [ ] Path absoluto do LICENSE original referenciado (`Infos/knowledge/NextJS/agent-skills-main/LICENSE`)
- [ ] Nota explicando que `Infos/` está no .gitignore (transparência para devs)
- [ ] Section "Future expansion" preparando para próximas stacks com material licensed
- [ ] Lint limpo: `bun run lint`
- [ ] `bun run harness:validate` continua verde (NOTICES não deve afetar matrix validation)

---

## Criterio de Aceite

**Por maquina (CA-11 — Plano 01):**
- `test -f THIRD-PARTY-NOTICES.md && echo OK` retorna `OK`
- `grep -c "Permission is hereby granted, free of charge" THIRD-PARTY-NOTICES.md` retorna ≥1 (texto MIT preservado)
- `grep -c "Copyright (c) 2025 Addy Osmani" THIRD-PARTY-NOTICES.md` retorna ≥1
- `grep -c "nextjs-app-router-patterns" THIRD-PARTY-NOTICES.md` retorna ≥2 (V1 e V2)
- `grep -c "nextjs-best-practices\|nextjs-expert\|nextjs-supabase-auth\|nextjs-turbopack" THIRD-PARTY-NOTICES.md` retorna ≥4

**Por humano:**
- Texto MIT é uma cópia byte-a-byte do LICENSE original (sem typos introduzidos)
- Nome das 6 skills coincide exatamente com o que existe em `Infos/knowledge/NextJS/agent-skills-main/`
- Tom do arquivo é informativo (não defensivo, não publicitário) — segue convenção de NOTICES kernel/Apache

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->

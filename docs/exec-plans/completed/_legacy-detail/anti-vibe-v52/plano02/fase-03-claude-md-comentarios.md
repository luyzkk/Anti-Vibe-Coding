# Fase 03 — Política D3 em `anti-vibe-coding/CLAUDE.md`

## Objetivo

Substituir a regra `- Sem comentários desnecessários — converta em nomes descritivos` na seção `### Código` do `anti-vibe-coding/CLAUDE.md` pela política D3 completa (WHY sim, WHAT não).

## Arquivo a Modificar

`f:\Projetos\Claude code\anti-vibe-coding\CLAUDE.md`

**OBRIGATÓRIO:** Releia o arquivo imediatamente antes de editar. A seção `### Código` está por volta da linha 57. Confirme o old_string exato antes de aplicar o Edit.

## Nota Sobre o CLAUDE.md Global

O arquivo `C:\Users\luizf\.claude\CLAUDE.md` (global do usuário) foi lido durante planejamento e NÃO contém a regra de comentários na seção "Código". Suas regras são:
- Nunca use `any`
- Nunca fetch data em useEffect
- Prefira hash maps
- Priorize error monitoring
- Acessibilidade WCAG 2.0
- Nomes de teste sem "should"

**O CLAUDE.md global NÃO deve ser modificado nesta fase.** Apenas o `anti-vibe-coding/CLAUDE.md`.

---

## Pré-Edição: Confirmar Estado Atual

Antes de editar, execute:

```bash
grep -n "Sem comentários" "f:/Projetos/Claude code/anti-vibe-coding/CLAUDE.md"
# Esperado: linha com "- Sem comentários desnecessários — converta em nomes descritivos"
```

Se o grep não retornar resultado, releia o arquivo completo e localize a seção `### Código` para confirmar o old_string exato.

---

## Estado Atual da Seção `### Código`

Conforme leitura em planejamento (linhas 55–59 aproximadamente):

```
### Código
- SEMPRE use early return
- Prefira hash-lists sobre switch-case
- Sem comentários desnecessários — converta em nomes descritivos
```

---

## Edição 1 — Substituir Regra de Comentários pela Política D3

### old_string (exato):
```
### Código
- SEMPRE use early return
- Prefira hash-lists sobre switch-case
- Sem comentários desnecessários — converta em nomes descritivos
```

### new_string:
```
### Código
- SEMPRE use early return
- Prefira hash-lists sobre switch-case
- **WHY comments:** sempre permitidos — proveniência, decisão, workaround, bug ref, constraint externa
- **WHAT comments:** proibidos — comentário óbvio do que o código já diz (`// incrementa i` acima de `i++`)
- Nunca remova WHY comments ao refatorar — eles carregam intenção que o código não captura
- Funções públicas exportadas: docstring com intenção + 1 exemplo de uso
```

**Razão:** A regra anterior era vaga ("sem comentários desnecessários") e contraditória com a política D3: comentários de proveniência são contexto de primeira classe para o agente, não "desnecessários". A distinção WHY/WHAT é o contrato correto.

---

## Checklist de Verificação

Após aplicar a edição, confirme cada item:

```bash
# 1. Regra antiga removida
grep "Sem comentários desnecessários" "f:/Projetos/Claude code/anti-vibe-coding/CLAUDE.md"
# Esperado: nenhum resultado

# 2. WHY comments presente
grep "WHY comments" "f:/Projetos/Claude code/anti-vibe-coding/CLAUDE.md"
# Esperado: linha com "WHY comments: sempre permitidos"

# 3. WHAT comments presente
grep "WHAT comments" "f:/Projetos/Claude code/anti-vibe-coding/CLAUDE.md"
# Esperado: linha com "WHAT comments: proibidos"

# 4. Regra de não remover ao refatorar presente
grep "Nunca remova WHY" "f:/Projetos/Claude code/anti-vibe-coding/CLAUDE.md"
# Esperado: linha com a instrução

# 5. Docstrings presente
grep "docstring" "f:/Projetos/Claude code/anti-vibe-coding/CLAUDE.md"
# Esperado: linha com "docstring com intenção"

# 6. Seção TypeScript ainda presente e intacta (próxima após Código)
grep "### TypeScript" "f:/Projetos/Claude code/anti-vibe-coding/CLAUDE.md"
# Esperado: encontrar a seção

# 7. Confirmação: CLAUDE.md global NÃO foi modificado
grep "WHY comments" "C:/Users/luizf/.claude/CLAUDE.md"
# Esperado: nenhum resultado (arquivo global não foi tocado)
```

---

## Commit

Repo: `f:\Projetos\Claude code\anti-vibe-coding\`

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add CLAUDE.md
git commit -m "feat(claude-md): política de comentários D3 — WHY/WHAT distinction"
```

---

## Gotchas desta Fase

### Arquivo com muitas seções — risco de edição errada
O `anti-vibe-coding/CLAUDE.md` tem ~200+ linhas com múltiplas seções (`### Código`, `### TypeScript`, `## Workflow de Desenvolvimento`, etc.). O old_string deve incluir contexto suficiente para ser único no arquivo. O bloco de 4 linhas especificado acima é único — mas confirme com grep antes de aplicar.

### Risco de podar TypeScript section
A seção `### TypeScript` começa imediatamente após `### Código`. Ao aplicar o Edit, confirmar que o new_string não inclui conteúdo de TypeScript acidentalmente.

### NÃO modificar o CLAUDE.md global
O arquivo `C:\Users\luizf\.claude\CLAUDE.md` é o arquivo global do usuário. Confirmado em leitura: não contém regra de comentários. Esta fase NÃO toca esse arquivo.

### Dependência de Fase 01
Esta fase é independente das Fases 01 e 02 em termos de arquivo (arquivo diferente). Pode ser executada em paralelo, mas deve fazer commit separado no mesmo repo. Verificar `git diff --staged` antes de commitar.

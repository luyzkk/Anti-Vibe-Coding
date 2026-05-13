# Fase 02 — Update `verify-work/SKILL.md` — Integrar Sugestões Pós-Verify

**Sizing:** ~0.5h  
**Arquivo a modificar:** `f:\Projetos\Claude code\anti-vibe-coding\skills\verify-work\SKILL.md`  
**Ação:** Editar seção "Pipeline Integration" → subseção "Ao Finalizar a Verificação"

## Contexto

Após `/verify-work` concluir, o dev fica sem próximo passo claro quando:
- Há bugs encontrados: faz sentido sugerir `/iterate` para regression fix
- Tudo verde: faz sentido sugerir checklist de hardening via `/iterate harden`

A integração é aditiva — nenhuma lógica existente muda, apenas a seção de finalização ganha sugestões condicionais.

## Localização exata do diff

A seção a modificar está nas linhas 341–356 do arquivo atual:

```
### Ao Finalizar a Verificacao

**Se tudo verde:**
> "Verificacao concluida com sucesso.
>
> Quer fazer commit, push e abrir o PR agora?
> - `/commit` para commit atomico
> - `/push` para push
> - `/open-pr` para abrir PR no GitHub"

**Se issues encontrados:**
> "Encontrei [N] issues. Quer que eu corrija antes de prosseguir com o commit/PR?"
```

## Diff exato (old_string → new_string)

### old_string

```
### Ao Finalizar a Verificacao

**Se tudo verde:**
> "Verificacao concluida com sucesso.
>
> Quer fazer commit, push e abrir o PR agora?
> - `/commit` para commit atomico
> - `/push` para push
> - `/open-pr` para abrir PR no GitHub"

**Se issues encontrados:**
> "Encontrei [N] issues. Quer que eu corrija antes de prosseguir com o commit/PR?"
```

### new_string

```
### Ao Finalizar a Verificacao

**Se tudo verde:**
> "Verificacao concluida com sucesso.
>
> Quer fazer commit, push e abrir o PR agora?
> - `/commit` para commit atomico
> - `/push` para push
> - `/open-pr` para abrir PR no GitHub"
>
> Proximo passo opcional: esta feature esta em producao ou prestes a ir?
> - `/anti-vibe-coding:iterate harden` — checklist defensivo (rate limit, timeouts, fallbacks)

**Se issues encontrados:**
> "Encontrei [N] issues. Quer que eu corrija antes de prosseguir com o commit/PR?
>
> Se os issues incluem bugs confirmados em producao:
> - `/anti-vibe-coding:iterate` — regression test + fix guiado"
```

## Instrução de execução

```
1. Ler o arquivo verify-work/SKILL.md para confirmar que old_string é único
2. Aplicar o Edit com old_string/new_string acima
3. Reler o arquivo para confirmar que a edição foi aplicada corretamente
4. Verificar que o resto do arquivo não foi alterado
```

## Verificação

Após editar, confirmar:

- [ ] A seção "Ao Finalizar a Verificacao" foi modificada corretamente
- [ ] "Se tudo verde" agora sugere `/iterate harden` como próximo passo opcional
- [ ] "Se issues encontrados" agora sugere `/iterate` quando há bugs de produção
- [ ] Nenhuma outra seção do arquivo foi alterada
- [ ] O arquivo continua funcionalmente correto (sem quebra de markdown)
- [ ] Total de linhas do arquivo não aumentou mais de 6 linhas

## Comando de commit

```bash
cd 'f:/Projetos/Claude code/anti-vibe-coding'
git add skills/verify-work/SKILL.md
git commit -m "feat(verify-work): sugerir /iterate apos verificacao concluida"
```

## Nota de rollback

Se a edição causar problema, reverter com:
```bash
cd 'f:/Projetos/Claude code/anti-vibe-coding'
git diff skills/verify-work/SKILL.md
git checkout skills/verify-work/SKILL.md
```

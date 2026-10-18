# Fatia 4 — Os guias de decisão

Detalhe da fatia 4 do [PRD da 8.0](./PRD.md), escrito quando ela começou (D3). As decisões abaixo
saíram da entrevista de 2026-10-18 e aplicam a D4.

## Decisões

| # | Decisão |
|---|---|
| F4-1 | O guia vira roteiro: o Claude diz a decisão em uma frase, faz até 3 perguntas que só o usuário sabe responder numa tela só, e mostra 2 ou 3 opções com prós, contras, custo e quando seria a escolha errada, mais a recomendação ligada às respostas. Sem resposta, usa o padrão de um sênior e diz qual usou. |
| F4-2 | A escolha fica registrada: com feature em andamento, numa linha das `## Decisões` do DESIGN.md dela; se vale para o projeto inteiro (banco, stack), num ADR. |
| F4-3 | O Modo Dual (detector de arquitetura, perfis e os blocos de código no topo das skills) sai primeiro, antes de reescrever os guias. Ele nunca ligou num projeto real: o detector grava o perfil em `.claude/.anti-vibe-manifest.json`, o leitor procura em `.anti-vibe-manifest.json` na raiz, e o leitor ainda exige uma chave de ativação que nada no plugin liga. Fica na tag v7.9.0. |
| F4-4 | Entram nesta fatia os guias de system design, segurança e arquitetura. API e infraestrutura seguem o mesmo molde depois, se couber no apetite. |
| F4-5 | As 4 fases da limpeza rodam em sequência, um commit por fase com a suíte verde, e param no fim para o usuário ver tudo. Cada guia para para aprovação. |

## Fases

**Limpeza (F4-3).** Uma fase por peça, cada uma com a suíte verde no commit.

1. O detector: a skill `detect-architecture`, os módulos de detecção e as menções no init e no README.
2. Os perfis nas skills de consulta: os blocos do topo e as tabelas por perfil.
3. Os perfis no pipeline: os blocos do write-prd, plan-feature, execute-plan e verify-work, e os
   marcadores que eles preenchiam nos modelos.
4. O leitor: os módulos que liam o perfil, a checagem do harness e o simulador.

**Guias (F4-1, F4-2).** Uma fase por guia, com aprovação do usuário no fim de cada uma.

5. System design.
6. Segurança.
7. Arquitetura.

O texto atual de cada guia vai para `references/`, lido só quando o usuário pedir (D4).

## Fora desta fatia

- Os guias de API e de infraestrutura, salvo se couberem no apetite.
- O aviso de capacidades desatualizadas (`stale-capabilities-check`) no topo de algumas skills. Ele
  não faz parte do Modo Dual e não muda nesta fatia.

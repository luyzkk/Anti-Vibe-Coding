## 2026-04-15: Timeout em conexoes WebSocket sob carga

Detalhes: conexoes expiravam em 30s sem heartbeat configurado. Fix: adicionar ping/pong a cada 15s.
Impacto: eliminou 90% das reconexoes inesperadas em producao.

## 2026-04-18: Race condition no reconnect handler

Detalhes: multiplos eventos 'close' disparavam reconexoes simultaneas. Fix: flag de reconexao em andamento.
Impacto: eliminadas duplicacoes no canal de mensagens.

## 2026-04-22: Buffer overflow em mensagens grandes

Detalhes: payloads >64KB causavam fragmentacao silenciosa. Fix: chunk manual + reassembly no cliente.
Impacto: mensagens de log estruturado agora chegam completas.

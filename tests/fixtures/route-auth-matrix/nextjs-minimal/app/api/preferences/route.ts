// 2026-09-04 (Luiz/dev): terceira forma de export de verbo (const arrow) — G6. Rota sem marcador
// de privilegio e com metodo que nao muta estado: e o caso ALTO do CA-01b na fase-05.
export const GET = async () => {
  return Response.json({ theme: 'dark' })
}

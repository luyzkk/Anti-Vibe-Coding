// 2026-09-04 (Luiz/dev): dois verbos no mesmo arquivo — G6. O DELETE alimenta a regra
// "metodo muta estado" da fase-05. Segmento dinamico [id] fica no dialeto Next (fase-02).
export async function GET() {
  return Response.json({ id: 'x' })
}

export async function DELETE() {
  return new Response(null, { status: 204 })
}

// 2026-09-03 (Luiz/dev): matcher literal cobre /dashboard e NAO cobre a rota admin — PRD CA-01.
// (comentario evita citar o path literal da rota: o string-match ingenuo do Passo 2 le o
// arquivo inteiro como texto, entao mencionar o path aqui daria falso "coberta".)
export function middleware(_request: Request) {
  return new Response(null, { status: 401 })
}

export const config = {
  matcher: ['/dashboard/:path*'],
}

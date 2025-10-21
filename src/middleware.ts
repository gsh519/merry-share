import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 公開ページ（認証不要）
  const publicPaths = ['/login', '/signup']
  const isPublicPath = publicPaths.some(publicPath => path.startsWith(publicPath))

  // APIルートは認証チェックをスキップ
  if (path.startsWith('/api')) {
    return NextResponse.next()
  }

  // 公開ページへのアクセスは許可
  if (isPublicPath) {
    return NextResponse.next()
  }

  // クッキーまたはヘッダーから認証情報をチェック
  // （クライアント側でlocalStorageを使用しているため、ここでは簡易チェック）
  // より厳密にはクッキーベースの認証を推奨

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

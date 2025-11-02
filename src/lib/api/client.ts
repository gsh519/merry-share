import { useAuthStore } from '@/stores/authStore'

/**
 * 認証付きAPIリクエストを行うためのヘルパー関数
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { accessToken, refreshAccessToken, logout } = useAuthStore.getState()

  if (!accessToken) {
    throw new Error('認証トークンがありません')
  }

  // アクセストークンをヘッダーに追加
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  let response = await fetch(url, {
    ...options,
    headers,
  })

  // 401エラーの場合、トークンをリフレッシュして再試行
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()

    if (!refreshed) {
      // リフレッシュ失敗 → ログアウト
      logout()
      throw new Error('認証の有効期限が切れました')
    }

    // 新しいトークンで再試行
    const newAccessToken = useAuthStore.getState().accessToken
    const newHeaders = {
      ...options.headers,
      Authorization: `Bearer ${newAccessToken}`,
      'Content-Type': 'application/json',
    }

    response = await fetch(url, {
      ...options,
      headers: newHeaders,
    })
  }

  return response
}

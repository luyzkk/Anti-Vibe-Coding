export const API_URL = '/api'

export function fetchPosts(): Promise<unknown[]> {
  return fetch(`${API_URL}/posts`).then((r) => r.json() as Promise<unknown[]>)
}

export type ApiError = {
  status: number
  message: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText)
    throw { status: res.status, message } satisfies ApiError
  }

  return (await res.json()) as T
}

export const api = {
  get<T>(path: string) {
    return request<T>(path, { method: 'GET' })
  },
}


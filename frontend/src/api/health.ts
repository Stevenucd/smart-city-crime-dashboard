import { api } from './client'

export type HealthResponse = {
  status: string
}

export function fetchHealth() {
  return api.get<HealthResponse>('/api/health')
}


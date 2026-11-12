import type { ProjectCreatorApi } from '../shared/types'

declare global {
  interface Window {
    api: ProjectCreatorApi
  }
}

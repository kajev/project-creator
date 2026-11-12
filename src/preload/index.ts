import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ProjectCreatorApi } from '@shared/types'

const api: ProjectCreatorApi = {
  platform: process.platform,
  project: {
    openFolder: () => ipcRenderer.invoke('project:openFolder'),
    openRecent: (root) => ipcRenderer.invoke('project:openRecent', root),
    recent: () => ipcRenderer.invoke('project:recent'),
    close: () => ipcRenderer.invoke('project:close')
  },
  fs: {
    readDir: (dir) => ipcRenderer.invoke('fs:readDir', dir),
    readFile: (file) => ipcRenderer.invoke('fs:readFile', file),
    writeFile: (file, content) => ipcRenderer.invoke('fs:writeFile', file, content)
  },
  ai: {
    hasKey: () => ipcRenderer.invoke('ai:hasKey'),
    setKey: (key) => ipcRenderer.invoke('ai:setKey', key),
    clearKey: () => ipcRenderer.invoke('ai:clearKey'),
    proposeProjects: (input) => ipcRenderer.invoke('ai:propose', input),
    writeBrief: (input, proposal) => ipcRenderer.invoke('ai:writeBrief', input, proposal)
  },
  terminal: {
    start: (cwd, cols, rows) => ipcRenderer.invoke('terminal:start', cwd, cols, rows),
    write: (id, data) => ipcRenderer.send('terminal:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('terminal:resize', id, cols, rows),
    kill: (id) => ipcRenderer.send('terminal:kill', id),
    onData: (listener) => {
      const handler = (_e: IpcRendererEvent, id: number, data: string): void => listener(id, data)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.removeListener('terminal:data', handler)
    },
    onExit: (listener) => {
      const handler = (_e: IpcRendererEvent, id: number, code: number): void => listener(id, code)
      ipcRenderer.on('terminal:exit', handler)
      return () => ipcRenderer.removeListener('terminal:exit', handler)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

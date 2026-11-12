import { ipcMain } from 'electron'
import { clearKey, hasKey, setKey } from './keyStore'

export function registerAiHandlers(): void {
  ipcMain.handle('ai:hasKey', () => hasKey())
  ipcMain.handle('ai:setKey', (_event, key: string) => setKey(key))
  ipcMain.handle('ai:clearKey', () => clearKey())
}

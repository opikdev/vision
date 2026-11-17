import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { channels } from '../shared/channels';
import type { VisionApi } from '../shared/contract';

function subscribe(channel: string, listener: (value: never) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, value: unknown): void => {
    listener(value as never);
  };
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

const api: VisionApi = {
  getState: () => ipcRenderer.invoke(channels.getState),
  onState: (listener) => subscribe(channels.state, listener),
  listRecent: () => ipcRenderer.invoke(channels.listRecent),
  onRecentChanged: (listener) => subscribe(channels.recentChanged, listener),
  removeRecent: (path) => ipcRenderer.invoke(channels.removeRecent, path),
  openPath: (path) => ipcRenderer.invoke(channels.openPath, path),
  runCommand: (command) => ipcRenderer.invoke(channels.runCommand, command),
  onViewCommand: (listener) => subscribe(channels.viewCommand, listener),
  writeClipboard: (text) => ipcRenderer.invoke(channels.writeClipboard, text),
  getMcpServer: () => ipcRenderer.invoke(channels.getMcpServer),
  captureReady: () => ipcRenderer.invoke(channels.captureReady),
  captureFailed: (message) => ipcRenderer.invoke(channels.captureFailed, message),
  onAgentActivity: (listener) => subscribe(channels.agentActivity, listener),
  getPathForFile: (file) => webUtils.getPathForFile(file),
};

contextBridge.exposeInMainWorld('vision', api);

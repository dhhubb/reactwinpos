'use strict';

/**
 * Preload bridge.
 *
 * Only a deliberately small, read-only surface is exposed. The renderer never gets
 * `require`, `process` or `ipcRenderer` itself, so a malicious backup file cannot
 * reach the host machine.
 */

const { contextBridge, ipcRenderer } = require('electron');

const api = Object.freeze({
  /** App version from package.json, shown in Settings → About. */
  getVersion: () => ipcRenderer.invoke('app:version'),
  /** True when running inside the desktop shell rather than a browser tab. */
  isDesktop: true,
  platform: process.platform,
  /** Writes a text file through the OS save dialog (used for reports). */
  saveTextFile: (suggestedName, contents) =>
    ipcRenderer.invoke('file:save-text', { suggestedName, contents }),
});

contextBridge.exposeInMainWorld('desktop', api);

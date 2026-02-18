// Preload script - セキュリティのためのコンテキスト分離
// 必要に応じてipcRendererの公開等を追加できます

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: true,
});

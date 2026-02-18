const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

// クラウドURLを設定（Vercelデプロイ後に変更してください）
const CLOUD_URL = process.env.FAN_SCORE_URL || "https://fan-score.vercel.app";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Fan Score",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // クラウドURLをロード
  mainWindow.loadURL(CLOUD_URL);

  // 外部リンクはデフォルトブラウザで開く
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // シンプルなメニュー
  const template = [
    {
      label: "Fan Score",
      submenu: [
        {
          label: "リロード",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.webContents.reload(),
        },
        {
          label: "戻る",
          accelerator: "Alt+Left",
          click: () => mainWindow?.webContents.goBack(),
        },
        {
          label: "進む",
          accelerator: "Alt+Right",
          click: () => mainWindow?.webContents.goForward(),
        },
        { type: "separator" },
        {
          label: "開発者ツール",
          accelerator: "F12",
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: "separator" },
        { label: "終了", accelerator: "CmdOrCtrl+Q", role: "quit" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

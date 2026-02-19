const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

// ─── パス解決 ───
const isPackaged = app.isPackaged;
const appRoot = isPackaged
  ? path.join(process.resourcesPath, "app")
  : path.join(__dirname, "..");

const standaloneDir = path.join(appRoot, ".next", "standalone");
const serverJs = path.join(standaloneDir, "server.js");

// DB は userData に保存（アプリ更新してもデータ保持）
const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "fan-score.db");

// Prisma の生成ファイルパス
const prismaEngineDir = isPackaged
  ? path.join(process.resourcesPath, "prisma-engines")
  : path.join(appRoot, "node_modules", ".prisma", "client");

let mainWindow;
let serverProcess;
const PORT = 3456; // 3000は他と被りやすいので変更

// ─── DB初期化（prismaのマイグレーション相当） ───
function initDatabase() {
  // dev.db が userData に無ければ、ビルド同梱のものをコピー
  if (!fs.existsSync(dbPath)) {
    const sourceDbs = [
      path.join(appRoot, "prisma", "dev.db"),
      path.join(appRoot, "dev.db"),
    ];
    for (const src of sourceDbs) {
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dbPath);
        console.log(`[DB] Copied from ${src} to ${dbPath}`);
        return;
      }
    }
    console.log("[DB] No existing DB found, server will create one");
  } else {
    console.log(`[DB] Using existing DB at ${dbPath}`);
  }
}

// ─── Next.js サーバー起動 ───
function startServer() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(serverJs)) {
      reject(new Error(`server.js not found at: ${serverJs}`));
      return;
    }

    const env = {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      DATABASE_URL: `file:${dbPath}`,
    };

    // Prisma エンジン設定
    if (isPackaged && fs.existsSync(prismaEngineDir)) {
      env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
        prismaEngineDir,
        "libquery_engine-win32-x64-msvc.dll.node"
      );
    }

    // ELECTRON_RUN_AS_NODE=1 でElectron自体をNodeとして使う（無限ループ防止）
    env.ELECTRON_RUN_AS_NODE = "1";
    const nodeExe = process.execPath;
    serverProcess = spawn(nodeExe, [serverJs], {
      cwd: standaloneDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    serverProcess.stdout.on("data", (data) => {
      console.log(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on("data", (data) => {
      console.error(`[Server Error] ${data.toString().trim()}`);
    });

    serverProcess.on("error", (err) => {
      console.error("[Server] Failed to start:", err);
      reject(err);
    });

    serverProcess.on("exit", (code) => {
      console.log(`[Server] Exited with code ${code}`);
      serverProcess = null;
    });

    // サーバーの起動を待つ
    waitForServer(resolve, reject, 0);
  });
}

function waitForServer(resolve, reject, attempt) {
  if (attempt > 30) {
    reject(new Error("Server did not start within 30 seconds"));
    return;
  }

  setTimeout(() => {
    http
      .get(`http://127.0.0.1:${PORT}/`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 302) {
          console.log(`[Server] Ready on port ${PORT}`);
          resolve();
        } else {
          waitForServer(resolve, reject, attempt + 1);
        }
      })
      .on("error", () => {
        waitForServer(resolve, reject, attempt + 1);
      });
  }, 1000);
}

// ─── ウィンドウ作成 ───
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Fan Score β",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false, // 準備できてから表示
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // 外部リンクはデフォルトブラウザで開く
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // メニュー
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
        {
          label: "データフォルダを開く",
          click: () => shell.openPath(userDataPath),
        },
        { type: "separator" },
        { label: "終了", accelerator: "CmdOrCtrl+Q", role: "quit" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── スプラッシュスクリーン ───
let splashWindow;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0; padding: 0;
          display: flex; align-items: center; justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border-radius: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: white;
          -webkit-app-region: drag;
        }
        .container { text-align: center; }
        h1 { font-size: 28px; margin: 0 0 8px 0; }
        .sub { font-size: 14px; opacity: 0.8; margin-bottom: 24px; }
        .loader {
          width: 40px; height: 40px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status { font-size: 12px; margin-top: 16px; opacity: 0.7; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⭐ Fan Score</h1>
        <div class="sub">β version</div>
        <div class="loader"></div>
        <div class="status">起動中...</div>
      </div>
    </body>
    </html>
  `)}`);
}

// ─── アプリ起動フロー ───
app.whenReady().then(async () => {
  createSplashWindow();

  try {
    initDatabase();
    await startServer();
    createWindow();
  } catch (err) {
    console.error("[App] Startup error:", err);
    dialog.showErrorBox(
      "起動エラー",
      `Fan Scoreの起動に失敗しました。\n\n${err.message}\n\nアプリを再インストールしてください。`
    );
    app.quit();
    return;
  }

  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
});

app.on("window-all-closed", () => {
  // サーバープロセスを停止
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

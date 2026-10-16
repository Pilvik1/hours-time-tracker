const { app, BrowserWindow, dialog, Menu } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

let backendProcess = null;
let frontendProcess = null;
let mainWindow = null;
let quitting = false;

if (process.platform === "win32") app.setAppUserModelId("io.github.pilvik1.hourstimetracker");

const lockAcquired = app.requestSingleInstanceLock();
if (!lockAcquired) app.quit();

function logPath() {
  return path.join(app.getPath("logs"), "hours-desktop.log");
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.mkdirSync(app.getPath("logs"), { recursive: true });
    fs.appendFileSync(logPath(), line);
  } catch {
    // Logging must never prevent the application from starting.
  }
  console.log(line.trim());
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => (error || port === null ? reject(error) : resolve(port)));
    });
  });
}

function requestIsHealthy(url, headers = {}) {
  return new Promise((resolve) => {
    const request = http.get(url, { headers }, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.setTimeout(1_000, () => request.destroy());
    request.once("error", () => resolve(false));
  });
}

async function waitForHealth(url, processHandle, headers = {}, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (processHandle?.exitCode !== null) {
      throw new Error(`Process exited before readiness with code ${processHandle.exitCode}`);
    }
    if (await requestIsHealthy(url, headers)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function attachProcessLogging(label, child) {
  child.stdout?.on("data", (chunk) => log(`${label} stdout: ${chunk.toString().trim()}`));
  child.stderr?.on("data", (chunk) => log(`${label} stderr: ${chunk.toString().trim()}`));
  child.once("error", (error) => log(`${label} launch error: ${error.message}`));
  child.once("exit", (code, signal) => {
    log(`${label} exited code=${code} signal=${signal}`);
    if (!quitting && code !== 0) {
      void showStartupFailure(`${label} stopped unexpectedly (code ${code ?? "unknown"}).`);
    }
  });
}

async function showStartupFailure(detail) {
  log(detail);
  await dialog.showMessageBox({
    type: "error",
    title: "Hours could not start",
    message: "The local Hours services did not start correctly.",
    detail: `${detail}\n\nDiagnostic log: ${logPath()}`,
    buttons: ["Close Hours"],
  });
  app.quit();
}

function sqliteUrl(databasePath) {
  return `sqlite+pysqlite:///${databasePath.replace(/\\/g, "/")}`;
}

function startBackend(port, desktopToken) {
  const executable = path.join(
    process.resourcesPath,
    "backend",
    process.platform === "win32" ? "hours-backend.exe" : "hours-backend",
  );
  if (!fs.existsSync(executable)) {
    throw new Error(`Bundled backend is missing: ${executable}`);
  }

  const dataDirectory = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dataDirectory, { recursive: true });
  backendProcess = spawn(executable, [], {
    env: {
      ...process.env,
      DATABASE_URL: sqliteUrl(path.join(dataDirectory, "hours.sqlite3")),
      HOURS_BACKEND_HOST: "127.0.0.1",
      HOURS_BACKEND_PORT: String(port),
      TIME_TRACKER_DESKTOP_API_TOKEN: desktopToken,
      TIME_TRACKER_SESSION_SECRET: crypto.randomBytes(48).toString("base64url"),
      TIME_TRACKER_COOKIE_SECURE: "false",
      TIME_TRACKER_TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  attachProcessLogging("backend", backendProcess);
}

function startFrontend(port, backendPort, desktopToken, frontendToken) {
  const serverEntry = path.join(app.getAppPath(), "frontend", ".output", "server", "index.mjs");
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Bundled frontend server is missing: ${serverEntry}`);
  }
  frontendProcess = spawn(process.execPath, [serverEntry], {
    cwd: app.getAppPath(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(port),
      API_INTERNAL_URL: `http://127.0.0.1:${backendPort}`,
      TIME_TRACKER_DESKTOP_API_TOKEN: desktopToken,
      TIME_TRACKER_DESKTOP_FRONTEND_TOKEN: frontendToken,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  attachProcessLogging("frontend", frontendProcess);
}

async function createWindow(frontendPort, frontendToken) {
  const windowsTitleBar =
    process.platform === "win32"
      ? {
          titleBarStyle: "hidden",
          titleBarOverlay: {
            color: "#151817",
            symbolColor: "#aef6c7",
            height: 38,
          },
        }
      : {};
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: "Hours",
    autoHideMenuBar: true,
    backgroundColor: "#151817",
    ...windowsTitleBar,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const appOrigin = `http://127.0.0.1:${frontendPort}`;
  await mainWindow.webContents.session.cookies.set({
    url: appOrigin,
    name: "hours_desktop_session",
    value: frontendToken,
    httpOnly: true,
    sameSite: "strict",
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, destination) => {
    if (!destination.startsWith(appOrigin)) event.preventDefault();
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
    log(`renderer failed to load: ${code} ${description} ${url}`);
  });
  await mainWindow.loadURL(appOrigin);
}

async function startApplication() {
  const desktopToken = crypto.randomBytes(48).toString("base64url");
  const frontendToken = crypto.randomBytes(48).toString("base64url");
  const backendPort = await freePort();
  const frontendPort = await freePort();
  startBackend(backendPort, desktopToken);
  await waitForHealth(`http://127.0.0.1:${backendPort}/health`, backendProcess);
  startFrontend(frontendPort, backendPort, desktopToken, frontendToken);
  await waitForHealth(`http://127.0.0.1:${frontendPort}/healthz`, frontendProcess);
  await createWindow(frontendPort, frontendToken);
}

function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  try {
    child.kill();
  } catch (error) {
    log(`failed to stop child process: ${error.message}`);
  }
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  if (process.platform === "win32") Menu.setApplicationMenu(null);
  try {
    await startApplication();
  } catch (error) {
    await showStartupFailure(error instanceof Error ? error.message : String(error));
  }
});

app.on("before-quit", () => {
  quitting = true;
  stopProcess(frontendProcess);
  stopProcess(backendProcess);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && mainWindow) mainWindow.show();
});

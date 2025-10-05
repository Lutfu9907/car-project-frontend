const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const axios = require("axios");

let mainWindow;
const api = axios.create({
  baseURL: "http://localhost:8080/api",
  timeout: 5000,
});
// Port listesini al
ipcMain.handle("list-ports", async () => {
  try {
    const response = await api.get("/obd/ports");
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Port listesi alinamadi:", error.message);
    return { success: false, message: error.message };
  }
});
// OBD'ye bağlan
ipcMain.handle("connect-obd", async () => {
  try {
    const response = await api.post("/obd/connect");
    return { success: true, message: response.data };
  } catch (error) {
    console.error("OBD baglanti hatasi:", error.message);
    return { success: false, message: error.message };
  }
});

// RPM oku
ipcMain.handle("read-rpm", async () => {
  try {
    const res = await api.get("/obd/rpm");
    return { success: true, rpm: res.data };
  } catch (err) {
    console.error("RPM okuma hatasi:", err.message);
    return { success: false, message: err.message };
  }
});

// OBD bağlantısını kes
ipcMain.handle("disconnect-obd", async () => {
  try {
    const res = await api.post("/obd/disconnect");
    return { success: true, message: res.data };
  } catch (err) {
    console.error("OBD disconnect hatasi:", err.message);
    return { success: false, message: err.message };
  }
});

// 🔐 Lisans durumunu sor
ipcMain.handle("license-status", async () => {
  try {
    const res = await api.get("/license/status");
    return res.data; // { ok: boolean, message: string }
  } catch (err) {
    console.error("License status hatasi:", err.message);
    return { ok: false, message: "Status error: " + err.message };
  }
});

// 🔐 Lisans aktive et
ipcMain.handle("license-activate", async (_evt, payload) => {
  try {
    const res = await api.post("/license/activate", payload);
    return res.data; // { ok: boolean, message: string }
  } catch (err) {
    console.error("License activate hatasi:", err.message);
    return { ok: false, message: "Activate error: " + err.message };
  }
});

// 🔐 Lisans detaylarini al
ipcMain.handle("license-details", async () => {
  try {
    const res = await api.get("/license/details");
    return { success: true, data: res.data };
  } catch (err) {
    console.error("License details hatasi:", err.message);
    return { success: false, message: err.message };
  }
});
// 🔐 Lisans sifirla
ipcMain.handle("license-reset", async () => {
  try {
    const res = await api.delete("/license/reset");
    return res.data; // { ok, message }
  } catch (err) {
    console.error("License reset hatasi:", err.message);
    return { ok: false, message: "Reset error: " + err.message };
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

  if (isDev) {
    console.log("Development modunda baslatiliyor...");
    mainWindow.loadURL("http://localhost:5173").catch((err) => {
      console.error("React arayuzu yuklenemedi:", err.message);
    });
  } else {
    mainWindow
      .loadFile(path.join(__dirname, "dist", "index.html"))
      .catch((err) => {
        console.error("index.html yuklenemedi:", err.message);
      });
  }

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Arayuz basariyla yuklendi!");
  });

  mainWindow.webContents.on("did-fail-load", (_, code, desc) => {
    console.error(`Sayfa yuklenemedi: [${code}] ${desc}`);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

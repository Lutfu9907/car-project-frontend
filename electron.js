import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "url";
import path, { join } from "path";
import { ipcMain } from "electron";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const api = axios.create({
  baseURL: "http://localhost:8080/api",
});

ipcMain.handle("connect-obd", async () => {
  try {
    const response = await api.post("/obd/connect");
    return { success: true, message: response.data };
  } catch (error) {
    console.error("OBD bağlantı hatası:", error.message);
    return { success: false, message: error.message };
  }
});

// Portları listele
ipcMain.handle("list-ports", async () => {
  try {
    const response = await axios.get("http://localhost:8080/api/obd/ports");
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Port listesi alınamadı:", error.message);
    return { success: false, message: error.message };
  }
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const env = process.env.NODE_ENV;
  const isDev = env === "development" || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(join(__dirname, "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

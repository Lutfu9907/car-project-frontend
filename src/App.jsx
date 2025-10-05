import { useState } from "react";

// Electron'un renderer tarafı
let ipcRenderer;
try {
  ipcRenderer = window.require && window.require("electron").ipcRenderer;
} catch {
  console.warn("Electron ortamında değil, ipcRenderer yok");
  ipcRenderer = null;
}

function App() {
  const [status, setStatus] = useState("");

  const handleConnect = async () => {
    try {
      setStatus("Bağlanılıyor...");
      const result = await ipcRenderer.invoke("connect-obd");
      if (result.success) {
        setStatus("✅ " + result.message);
      } else {
        setStatus("❌ " + result.message);
      }
    } catch (err) {
      setStatus("Hata: " + err.message);
    }
  };

  const handleListPorts = async () => {
    try {
      setStatus("Portlar alınıyor...");
      const result = await ipcRenderer.invoke("list-ports");
      if (result.success) {
        const ports = result.data.join(", ");
        setStatus("🔌 Bulunan Portlar: " + ports);
      } else {
        setStatus("❌ " + result.message);
      }
    } catch (err) {
      setStatus("Hata: " + err.message);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "3rem" }}>
      <h2>Car Project — OBD Bağlantı Paneli</h2>

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
        <button onClick={handleConnect}>OBD’ye Bağlan</button>
        <button onClick={handleListPorts}>Portları Listele</button>
      </div>

      <p style={{ marginTop: "1rem" }}>{status}</p>
    </div>
  );
}

export default App;

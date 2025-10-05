import { useEffect, useState } from "react";

const { ipcRenderer } = window.require
  ? window.require("electron")
  : { ipcRenderer: null };

function App() {
  // License state
  const [licenseChecked, setLicenseChecked] = useState(false);
  const [licenseOk, setLicenseOk] = useState(false);
  const [licenseMsg, setLicenseMsg] = useState("");

  // License form
  const [keyInput, setKeyInput] = useState("");
  const [ownerInput, setOwnerInput] = useState("");
  const [hwInput, setHwInput] = useState("");

  // OBD state
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [status, setStatus] = useState("Henuz baglanilmadi");
  const [rpm, setRpm] = useState(null);
  const [connected, setConnected] = useState(false);

  // --- Lisans durumunu uygulama acilisinda kontrol et ---
  useEffect(() => {
    (async () => {
      try {
        const res = await ipcRenderer.invoke("license-status");
        setLicenseOk(!!res.ok);
        setLicenseMsg(res.message || "");
      } catch (e) {
        setLicenseOk(false);
        setLicenseMsg("License status cekilemedi: " + e.message);
      } finally {
        setLicenseChecked(true);
      }
    })();
  }, []);

  // --- Port listesini cek (UI yüklendiginde) ---
  useEffect(() => {
    (async () => {
      try {
        const result = await ipcRenderer.invoke("list-ports");
        if (result.success) setPorts(result.data);
        else setStatus("Portlar alinamiadi: " + result.message);
      } catch (e) {
        setStatus("Hata: " + e.message);
      }
    })();
  }, []);

  // --- Baglan ---
  const handleConnect = async () => {
    if (!selectedPort) {
      setStatus("Lutfen bir port seciniz!");
      return;
    }
    try {
      setStatus("Baglaniyor...");
      const result = await ipcRenderer.invoke("connect-obd");
      if (result.success) {
        setConnected(true);
        setStatus("Baglanti basarili ✅");
      } else {
        setStatus("Baglanti hatasi ❌: " + result.message);
      }
    } catch (e) {
      setStatus("Hata: " + e.message);
    }
  };

  // --- Baglantiyi kes ---
  const handleDisconnect = async () => {
    try {
      const result = await ipcRenderer.invoke("disconnect-obd");
      if (result.success) {
        setConnected(false);
        setRpm(null);
        setStatus("Baglanti sonlandirildi ❎");
      } else {
        setStatus("Baglanti kesilemedi ❌: " + result.message);
      }
    } catch (e) {
      setStatus("Hata: " + e.message);
    }
  };

  // --- RPM periyodik oku ---
  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(async () => {
      try {
        const res = await ipcRenderer.invoke("read-rpm");
        if (res.success) setRpm(res.rpm);
        else setStatus("RPM hatasi: " + res.message);
      } catch (e) {
        setStatus("RPM hatasi: " + e.message);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [connected]);

  // --- Lisans aktive et ---
  const handleActivate = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setLicenseMsg("Lisans anahtari bos olamaz.");
      return;
    }
    try {
      const payload = {
        licenseKey: keyInput.trim(),
        owner: ownerInput.trim() || "UNKNOWN",
        hardwareId: hwInput.trim() || "UNKNOWN",
      };
      const res = await ipcRenderer.invoke("license-activate", payload);
      setLicenseMsg(res.message || "");
      setLicenseOk(!!res.ok);
    } catch (e) {
      setLicenseMsg("Activate error: " + e.message);
      setLicenseOk(false);
    }
  };

  // ---------- RENDER ----------
  if (!licenseChecked) {
    return (
      <div style={styles.container}>
        <h2 style={styles.header}>Car Project — Lisans</h2>
        <p>License kontrol ediliyor...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Car Project — OBD Panel</h2>

      {/* Lisans banner */}
      <div
        style={{
          ...styles.banner,
          backgroundColor: licenseOk ? "#e8f5e9" : "#fff3e0",
          borderColor: licenseOk ? "#2e7d32" : "#ff9800",
        }}
      >
        <strong>{licenseOk ? "Full Mod Aktif" : "Demo Mod"}</strong>
        <div style={{ marginTop: 6 }}>{licenseMsg}</div>
      </div>

      {/* Lisans Giriş Formu (sadece lisans yoksa) */}
      {!licenseOk && (
        <form onSubmit={handleActivate} style={styles.card}>
          <h3>Lisans Anahtari Gir</h3>
          <input
            style={styles.input}
            placeholder="Lisans Anahtari (ABCD-1234-...)"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
          />
          <input
            style={styles.input}
            placeholder="Sahip (opsiyonel)"
            value={ownerInput}
            onChange={(e) => setOwnerInput(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Cihaz ID (opsiyonel)"
            value={hwInput}
            onChange={(e) => setHwInput(e.target.value)}
          />
          <button type="submit" style={styles.activateBtn}>
            Lisansı Etkinleştir
          </button>
        </form>
      )}

      {/* ✅ Lisans Bilgilerini Göster butonu */}
      {licenseOk && (
        <div style={styles.card}>
          <h3>Lisans Bilgileri</h3>
          <button
            style={styles.activateBtn}
            onClick={async () => {
              const res = await ipcRenderer.invoke("license-details");
              if (res.success && res.data) {
                alert(
                  `📄 Lisans Bilgileri:\n\n` +
                    `Sahip: ${res.data.owner}\n` +
                    `Donanim ID: ${res.data.hardwareId}\n` +
                    `Gecerli Tarih: ${res.data.validUntil}`
                );
              } else {
                alert("Lisans bilgileri okunamadi!");
              }
            }}
          >
            Lisans Bilgilerini Göster
          </button>
          <button
            style={styles.disconnectBtn}
            onClick={async () => {
              const res = await ipcRenderer.invoke("license-reset");
              alert(res.message);
              window.location.reload(); // Uygulama yeniden "demo" moduna geçer
            }}
          >
            Lisansı Sıfırla
          </button>
        </div>
      )}

      {/* OBD panel (demo modda da gosteriyoruz; istersen disable edebiliriz) */}
      <div style={styles.card}>
        <label>OBD Port Sec:</label>
        <select
          value={selectedPort}
          onChange={(e) => setSelectedPort(e.target.value)}
          style={styles.select}
          disabled={connected}
        >
          <option value="">Port sec...</option>
          {ports.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {!connected ? (
          <button
            onClick={handleConnect}
            style={styles.connectBtn}
            disabled={!licenseOk /* full mod sart olsun istersen true yap */}
          >
            Baglan
          </button>
        ) : (
          <button onClick={handleDisconnect} style={styles.disconnectBtn}>
            Baglantiyi Kes
          </button>
        )}

        <p style={styles.status}>{status}</p>

        {connected && (
          <div style={styles.rpmBox}>
            <h3>RPM: {rpm ?? "--"}</h3>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { textAlign: "center", marginTop: "3rem", fontFamily: "Arial" },
  header: { color: "#333" },
  banner: {
    display: "inline-block",
    padding: "10px 16px",
    border: "1px solid",
    borderRadius: 6,
    marginBottom: 16,
    minWidth: 360,
    textAlign: "left",
  },
  card: {
    display: "inline-block",
    padding: "20px 40px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
    margin: "8px",
  },
  input: {
    display: "block",
    width: 300,
    margin: "8px auto",
    padding: "8px",
  },
  select: { margin: "10px", padding: "5px" },
  activateBtn: {
    marginTop: 8,
    padding: "8px 20px",
    cursor: "pointer",
    backgroundColor: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "4px",
  },
  connectBtn: {
    margin: "10px",
    padding: "8px 20px",
    cursor: "pointer",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
  },
  disconnectBtn: {
    margin: "10px",
    padding: "8px 20px",
    cursor: "pointer",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
  },
  status: { marginTop: "10px", color: "#444" },
  rpmBox: {
    marginTop: "20px",
    backgroundColor: "#fff",
    border: "1px solid #aaa",
    padding: "10px",
    borderRadius: "6px",
  },
};

export default App;

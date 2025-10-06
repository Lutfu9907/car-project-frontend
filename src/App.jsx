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
  const [status, setStatus] = useState("Henüz bağlanılmadı");
  const [rpm, setRpm] = useState(null);
  const [connected, setConnected] = useState(false);
  const [dtcList, setDtcList] = useState([]);

  // Arıza koduna göre satır rengi belirle
  const getSeverityColor = (code) => {
    if (!code) return "#fff";
    if (code.startsWith("P0") || code.startsWith("U0")) return "#ffcccc"; // Kritik (Motor / Ağ hatası)
    if (code.startsWith("P1")) return "#fff5cc"; // Orta (Performans / Sensör uyarısı)
    return "#e8f5e9"; // Hafif (bilgilendirme)
  };

  // --- Lisans durumunu uygulama acilisinda kontrol et ---
  useEffect(() => {
    (async () => {
      try {
        const res = await ipcRenderer.invoke("license-status");
        setLicenseOk(!!res.ok);
        setLicenseMsg(res.message || "");
      } catch (e) {
        setLicenseOk(false);
        setLicenseMsg("License status çekilemedi: " + e.message);
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
        else setStatus("Portlar alınamadı: " + result.message);
      } catch (e) {
        setStatus("Hata: " + e.message);
      }
    })();
  }, []);

  // --- Baglan ---
  const handleConnect = async () => {
    if (!selectedPort) {
      setStatus("Lütfen bir port seçiniz!");
      return;
    }
    try {
      setStatus("Bağlanıyor...");
      const result = await ipcRenderer.invoke("connect-obd");
      if (result.success) {
        setConnected(true);
        setStatus("Baglantı başarılı ✅");
      } else {
        setStatus("Bağlantı hatası ❌: " + result.message);
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
        setStatus("Bağlantı sonlandırıldı ❎");
      } else {
        setStatus("Bağlantı kesilemedi ❌: " + result.message);
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
        else setStatus("RPM hatası: " + res.message);
      } catch (e) {
        setStatus("RPM hatası: " + e.message);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [connected]);

  // --- Lisans aktive et ---
  const handleActivate = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setLicenseMsg("Lisans anahtarı boş olamaz.");
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
      <h2 style={styles.header}> OBD PANEL </h2>

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
          <h3>Lisans Anahtarını Gir</h3>
          <input
            style={styles.input}
            placeholder="Lisans Anahtarı (ABCD-1234-...)"
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
                    `Donanım ID: ${res.data.hardwareId}\n` +
                    `Geçerli Tarih: ${res.data.validUntil}`
                );
              } else {
                alert("Lisans bilgileri okunamadı!");
              }
            }}
          >
            Lisans Bilgilerini Göster
          </button>
          <button
            style={styles.disconnectBtn}
            onClick={async () => {
              try {
                // 1) backend'e reset isteği
                const res = await ipcRenderer.invoke("license-reset");
                alert(res?.message || "Lisans reset istegi gönderildi");

                // 2) backend'den güncel durumu aldık
                const status = await ipcRenderer.invoke("license-status");

                // 3) input ve lisans state'lerini temizle
                setKeyInput("");
                setOwnerInput("");
                setHwInput("");

                setLicenseOk(!!status?.ok);
                setLicenseMsg(
                  status?.message ||
                    (status?.ok ? "Lisans aktif" : "Demo moda gecildi")
                );
                setLicenseChecked(true); // kontrol tamamlandı

                // 4) eğer demo moddaysa formu göster
                if (!status?.ok) {
                  console.log("Demo moda gecildi, form aktif.");
                } else {
                  console.log("Hemen tekrar full moda gecildi.");
                }
              } catch (err) {
                console.error("License reset error:", err);
                alert("Lisans sıfırlama sırasında hata: " + err?.message);
                // fallback: formu aç
                setLicenseOk(false);
                setLicenseChecked(true);
                setKeyInput("");
                setOwnerInput("");
                setHwInput("");
              }
            }}
          >
            Lisansı Sıfırla
          </button>
        </div>
      )}

      {/* OBD panel (demo modda da gosteriyoruz) */}
      <div style={styles.card}>
        <label style={styles.label}>OBD Port Seç:</label>
        <select
          value={selectedPort}
          onChange={(e) => setSelectedPort(e.target.value)}
          style={styles.select}
          disabled={connected}
        >
          <option value="">Port seç...</option>
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
            disabled={!licenseOk}
          >
            Bağlan
          </button>
        ) : (
          <button onClick={handleDisconnect} style={styles.disconnectBtn}>
            Bağlantıyı Kes
          </button>
        )}

        <p style={styles.status}>{status}</p>

        {connected && (
          <div style={styles.rpmBox}>
            <h3>RPM: {rpm ?? "--"}</h3>
          </div>
        )}
      </div>

      {/* 🔧 Arıza Kodları Paneli */}
      <div style={styles.card}>
        <h3>Arıza Kodları</h3>

        <div style={{ marginBottom: 12 }}>
          <button
            style={styles.connectBtn}
            onClick={async () => {
              try {
                const res = await ipcRenderer.invoke("dtc-read");
                if (res.success && Array.isArray(res.data)) {
                  if (res.data.length === 0) {
                    setDtcList([]); // liste boş
                    setStatus("Arıza kodu bulunamadı ✅");
                  } else {
                    setDtcList(res.data);
                    setStatus(`${res.data.length} adet arıza kodu bulundu ⚠️`);
                  }
                } else {
                  setStatus("Arıza kodları okunamadı!");
                }
              } catch (err) {
                setStatus("Arıza kodu okuma hatası: " + err.message);
              }
            }}
          >
            Arıza Kodlarını Oku
          </button>

          <button
            style={styles.disconnectBtn}
            onClick={async () => {
              try {
                const res = await ipcRenderer.invoke("dtc-clear");
                if (res.success) {
                  setDtcList([]); // tabloyu sıfırla
                  setStatus(res.message || "Arıza kodları silindi.");
                } else {
                  setStatus("Silme işlemi başarısız!");
                }
              } catch (err) {
                setStatus("Silme hatası: " + err.message);
              }
            }}
          >
            Arıza Kodlarını Sil
          </button>
        </div>

        {/* Tablo görünümü */}
        {dtcList && dtcList.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Kod</th>
                <th style={styles.th}>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {dtcList.map((d, i) => (
                <tr
                  key={i}
                  style={{ backgroundColor: getSeverityColor(d.code) }}
                >
                  <td style={styles.td}>{d.code}</td>
                  <td style={styles.td}>{d.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#555", marginTop: 10 }}>
            Henüz arıza kodu bulunmuyor.
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    textAlign: "center",
    marginTop: "2rem",
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    backgroundColor: "#f7f9fb",
    minHeight: "100vh",
  },
  header: {
    color: "#1e3a8a",
    fontWeight: "700",
    marginBottom: "2rem",
    fontSize: "1.6rem",
  },
  banner: {
    display: "inline-block",
    padding: "16px 24px",
    border: "2px solid",
    borderRadius: 10,
    marginBottom: 20,
    minWidth: 420,
    textAlign: "left",
    fontSize: "15px",
    fontWeight: "500",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    color: "#111",
  },
  card: {
    display: "inline-block",
    padding: "25px 40px",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    backgroundColor: "#ffffff",
    margin: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  input: {
    display: "block",
    width: 320,
    margin: "10px auto",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #9ca3af",
    fontSize: "14px",
    outline: "none",
  },
  select: {
    margin: "10px",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #4b5563",
    backgroundColor: "#ffffff",
    color: "#111827",
    fontWeight: "500",
    fontSize: "14px",
    cursor: "pointer",
    outline: "none",
    transition: "all 0.2s ease",
  },
  activateBtn: {
    marginTop: 10,
    padding: "10px 25px",
    cursor: "pointer",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
  },
  connectBtn: {
    margin: "12px 8px",
    padding: "10px 25px",
    cursor: "pointer",
    backgroundColor: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    transition: "all 0.2s ease",
  },
  disconnectBtn: {
    margin: "12px 8px",
    padding: "10px 25px",
    cursor: "pointer",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    transition: "all 0.2s ease",
  },
  label: {
    display: "block",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "8px",
    fontSize: "15px",
  },
  status: {
    marginTop: "10px",
    color: "#1f2937",
    fontSize: "15px",
    fontWeight: "500",
  },
  rpmBox: {
    marginTop: "20px",
    background: "linear-gradient(180deg, #e0f2fe 0%, #eff6ff 100%)",
    border: "1px solid #60a5fa",
    padding: "14px",
    borderRadius: "10px",
    color: "#1e40af",
    fontWeight: "700",
    fontSize: "18px",
    width: 250,
    margin: "15px auto 0 auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    borderRadius: "6px",
    overflow: "hidden",
  },
  th: {
    backgroundColor: "#1976d2",
    color: "white",
    padding: "8px",
    border: "1px solid #ccc",
    textAlign: "center",
  },
  td: {
    padding: "8px",
    border: "1px solid #ccc",
    textAlign: "center",
  },
};

export default App;

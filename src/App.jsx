import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Alert,
} from "@mui/material";
import Select from "@mui/material/Select";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

// Electron IPC
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
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#0A1929",
        color: "#E0E6ED",
        p: 4,
      }}
    >
      <Typography
        variant="h4"
        align="center"
        sx={{
          fontWeight: 700,
          mb: 4,
          color: "#E6EDF3",
          textShadow: "0 0 4px rgba(255,255,255,0.3)",
        }}
      >
        🚗 OBD Panel Dashboard
      </Typography>

      <Grid
        container
        spacing={3}
        justifyContent="center"
        maxWidth="lg"
        sx={{ margin: "0 auto" }}
      >
        {/* SOL SÜTUN - LİSANS */}
        <Grid item xs={12} md={5}>
          {/* Lisans Durumu */}
          <Card
            sx={{
              backgroundColor: licenseOk ? "#1B4332" : "#432818",
              borderLeft: licenseOk ? "4px solid #2E8B57" : "4px solid #D97706",
              color: "#fff",
              p: 2,
              mb: 2,
              boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
            }}
          >
            <Typography variant="h6">
              {licenseOk ? "✅ Full Mod Aktif" : "⚠️ Demo Mod"}
            </Typography>
            <Typography variant="body2">{licenseMsg}</Typography>
          </Card>

          {/* Lisans Girişi */}
          {!licenseOk && (
            <Card sx={{ backgroundColor: "#1E293B", p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Lisans Anahtarını Gir
              </Typography>
              <Box component="form" onSubmit={handleActivate}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Lisans Anahtarı (ABCD-1234-...)"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Sahip (opsiyonel)"
                  value={ownerInput}
                  onChange={(e) => setOwnerInput(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Cihaz ID (opsiyonel)"
                  value={hwInput}
                  onChange={(e) => setHwInput(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                >
                  Lisansı Etkinleştir
                </Button>
              </Box>
            </Card>
          )}

          {/* Lisans Bilgileri */}
          {licenseOk && (
            <Card sx={{ backgroundColor: "#1E293B", p: 3, mb: 3 }}>
              <Typography variant="h6">Lisans İşlemleri</Typography>
              <Divider sx={{ my: 1, borderColor: "#555" }} />
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
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
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={async () => {
                    const res = await ipcRenderer.invoke("license-reset");
                    alert(res.message);
                    window.location.reload();
                  }}
                >
                  Lisansı Sıfırla
                </Button>
              </Box>
            </Card>
          )}
        </Grid>

        {/* SAĞ SÜTUN - OBD & ARIZA */}
        <Grid item xs={12} md={7}>
          {/* OBD Port Kartı */}
          <Card sx={{ backgroundColor: "#1E293B", p: 3, mb: 3 }}>
            <Typography variant="h6">OBD Bağlantısı</Typography>
            <Divider sx={{ my: 1, borderColor: "#555" }} />
            <Typography variant="body2" sx={{ mb: 1 }}>
              OBD Port Seç:
            </Typography>
            <Select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              sx={{
                bgcolor: "#2c2c2c",
                color: "#fff",
                mb: 2,
                minWidth: 200,
              }}
            >
              <MenuItem value="">Port seç...</MenuItem>
              {ports.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>

            {!connected ? (
              <Button
                variant="contained"
                color="success"
                disabled={!licenseOk}
                onClick={handleConnect}
              >
                Bağlan
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                onClick={handleDisconnect}
              >
                Bağlantıyı Kes
              </Button>
            )}

            <Alert
              severity="info"
              sx={{ mt: 2, backgroundColor: "#E3F2FD", color: "#000" }}
            >
              {status}
            </Alert>

            {connected && (
              <Typography variant="h5" sx={{ mt: 2, color: "#4caf50" }}>
                RPM: {rpm ?? "--"}
              </Typography>
            )}
          </Card>

          {/* Arıza Kodları */}
          <Card sx={{ backgroundColor: "#1E293B", p: 3 }}>
            <Typography variant="h6">Arıza Kodları</Typography>
            <Divider sx={{ my: 1, borderColor: "#555" }} />
            <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="info"
                onClick={async () => {
                  const res = await ipcRenderer.invoke("dtc-read");
                  if (res.success && Array.isArray(res.data)) {
                    if (res.data.length === 0) {
                      setDtcList([]);
                      setStatus("Arıza kodu bulunamadı ✅");
                    } else {
                      setDtcList(res.data);
                      setStatus(
                        `${res.data.length} adet arıza kodu bulundu ⚠️`
                      );
                    }
                  } else {
                    setStatus("Arıza kodları okunamadı!");
                  }
                }}
              >
                Arıza Kodlarını Oku
              </Button>

              <Button
                variant="outlined"
                color="error"
                onClick={async () => {
                  const res = await ipcRenderer.invoke("dtc-clear");
                  if (res.success) {
                    setDtcList([]);
                    setStatus(res.message || "Arıza kodları silindi.");
                  } else {
                    setStatus("Silme işlemi başarısız!");
                  }
                }}
              >
                Arıza Kodlarını Sil
              </Button>
            </Box>

            {dtcList && dtcList.length > 0 ? (
              <Table sx={{ bgcolor: "#222" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "#ccc" }}>Kod</TableCell>
                    <TableCell sx={{ color: "#ccc" }}>Açıklama</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dtcList.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ color: "#fff" }}>{d.code}</TableCell>
                      <TableCell sx={{ color: "#fff" }}>
                        {d.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" sx={{ color: "#aaa" }}>
                Henüz arıza kodu bulunmuyor.
              </Typography>
            )}
          </Card>
          {/* 🚀 Araç Özellikleri */}
          <Card sx={{ bgcolor: "#1e1e1e", p: 3, mb: 3 }}>
            <Typography variant="h6">Araç Özellikleri</Typography>
            <Divider sx={{ my: 1, borderColor: "#555" }} />

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="warning"
                onClick={async () => {
                  const res = await ipcRenderer.invoke("speed-limit-remove");
                  if (res.success) {
                    alert("✅ " + res.message);
                  } else {
                    alert("❌ " + res.message);
                  }
                }}
              >
                Hız Limitini Kaldır
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
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

import { useState, useEffect, useRef, useCallback } from "react";

const QUICK_KEYS = [
  { label: "↵ ENTER",      cmd: "[ENTER]" },
  { label: "⇥ TAB",        cmd: "[TAB]" },
  { label: "⎋ ESC",        cmd: "[ESC]" },
  { label: "⌫ BACKSPACE",  cmd: "[BACKSPACE]" },
  { label: "DEL",           cmd: "[DELETE]" },
  { label: "⊞ WIN+R",      cmd: "[WIN+R]" },
  { label: "⊞ WIN+L",      cmd: "[WIN+L]" },
  { label: "⊞ WIN+D",      cmd: "[WIN+D]" },
  { label: "CTRL+C",        cmd: "[CTRL+C]" },
  { label: "CTRL+V",        cmd: "[CTRL+V]" },
  { label: "CTRL+Z",        cmd: "[CTRL+Z]" },
  { label: "CTRL+A",        cmd: "[CTRL+A]" },
  { label: "CTRL+S",        cmd: "[CTRL+S]" },
  { label: "CTRL+SHIFT+T",  cmd: "[CTRL+SHIFT+T]" },
  { label: "ALT+F4",        cmd: "[ALT+F4]" },
  { label: "CTRL+ALT+DEL",  cmd: "[CTRL+ALT+DELETE]" },
  { label: "F5",            cmd: "[F5]" },
  { label: "↑",             cmd: "[UP]" },
  { label: "↓",             cmd: "[DOWN]" },
  { label: "←",             cmd: "[LEFT]" },
  { label: "→",             cmd: "[RIGHT]" },
];

const EXAMPLE_SCRIPTS = {
  "Open Notepad":   "[WIN+R][DELAY:600]notepad[ENTER]",
  "Hello World":    "Hello, World![ENTER]",
  "Lock PC":        "[WIN+L]",
  "New Tab":        "[CTRL+T]",
  "Delayed Script": "[WIN+R][DELAY:800]cmd[ENTER][DELAY:1200]echo Hello[ENTER]",
};

const KEY_REF = [
  ["[ENTER]",               "Press Enter"],
  ["[TAB]",                 "Tab"],
  ["[ESC]",                 "Escape"],
  ["[BACKSPACE]",           "Backspace"],
  ["[WIN]  [GUI]",          "Windows key"],
  ["[CAPS]",                "Caps Lock"],
  ["[F1] .. [F12]",         "Function keys"],
  ["[DELAY:500]",           "Wait 500 ms"],
  ["[CTRL+C]",              "Copy"],
  ["[CTRL+Z]",              "Undo"],
  ["[WIN+R]",               "Run dialog"],
  ["[CTRL+SHIFT+T]",        "Triple combo"],
  ["[ALT+F4]",              "Close window"],
  ["[UP/DOWN/LEFT/RIGHT]",  "Arrow keys"],
];

const DEFAULT_IP = "192.168.1.1";

function useApi(ip) {
  const base = `http://${ip}`;
  return useCallback(async (path, method = "GET", body = null) => {
    const res = await fetch(base + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }, [base]);
}

function LogLine({ entry }) {
  const col = { ok: "#4ade80", err: "#f87171", info: "#475569", warn: "#fbbf24" };
  return (
    <div style={{ fontSize: 11, fontFamily: "monospace", lineHeight: 1.7, color: col[entry.type] || "#475569" }}>
      <span style={{ color: "#2d3f52", marginRight: 8 }}>{entry.time}</span>
      {entry.msg}
    </div>
  );
}

function Pill({ on, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5, fontSize: 10, padding: "3px 9px",
      borderRadius: 3, border: `1px solid ${on ? "#155e2a" : "#6b1f1f"}`,
      background: on ? "#041a0c" : "#180404", color: on ? "#22c55e" : "#f87171",
      letterSpacing: "0.1em", flexShrink: 0,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: on ? "#22c55e" : "#f87171", boxShadow: `0 0 5px ${on ? "#22c55e" : "#f87171"}` }} />
      {children}
    </div>
  );
}

export default function App() {
  const [ip, setIp]             = useState(DEFAULT_IP);
  const [ipDraft, setIpDraft]   = useState(DEFAULT_IP);
  const [bleOn, setBle]         = useState(false);
  const [wifiOn, setWifiOn]     = useState(false);
  const [wifiSsid, setWifiSsid] = useState("");
  const [queued, setQueued]     = useState(false);
  const [tab, setTab]           = useState("type");
  const [typeText, setTypeText] = useState("");
  const [sName, setSName]       = useState("");
  const [sContent, setSContent] = useState("");
  const [scripts, setScripts]   = useState([]);
  const [logs, setLogs]         = useState([]);
  const [busy, setBusy]         = useState(false);
  const logRef = useRef(null);
  const req    = useApi(ip);

  const log = useCallback((msg, type = "info") => {
    const time = new Date().toTimeString().slice(0, 8);
    setLogs(l => [...l.slice(-120), { msg, type, time }]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = 999999; }, 20);
  }, []);

  const poll = useCallback(async () => {
    try {
      const d = await req("/status");
      setBle(d.ble_connected);
      setQueued(d.has_queued);
      setWifiOn(!!d.ip && d.ip !== "0.0.0.0");
      setWifiSsid(d.ssid || "");
    } catch { setBle(false); setWifiOn(false); }
  }, [req]);

  useEffect(() => { poll(); const t = setInterval(poll, 2500); return () => clearInterval(t); }, [poll]);

  const fetchScripts = useCallback(async () => {
    try { const d = await req("/scripts"); if (Array.isArray(d)) setScripts(d); }
    catch (e) { log("Error fetching scripts: " + e.message, "err"); }
  }, [req, log]);

  useEffect(() => { if (tab === "scripts") fetchScripts(); }, [tab, fetchScripts]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const sendType = async () => {
    if (!typeText.trim()) return; setBusy(true);
    try {
      const d = await req("/type", "POST", { text: typeText });
      d.ok ? log(`Sent: ${typeText.slice(0, 55)}${typeText.length > 55 ? "…" : ""}`, "ok")
           : log("Error: " + (d.error || "?"), "err");
    } catch (e) { log(e.message, "err"); }
    setBusy(false);
  };

  const sendKey = async (cmd) => {
    setBusy(true);
    try { const d = await req("/type", "POST", { text: cmd }); d.ok ? log(`Key: ${cmd}`, "ok") : log("Error: " + (d.error || "?"), "err"); }
    catch (e) { log(e.message, "err"); }
    setBusy(false);
  };

  const saveScript = async () => {
    if (!sName.trim() || !sContent.trim()) { log("Name and content required", "warn"); return; }
    try {
      const d = await req("/script", "POST", { name: sName, content: sContent });
      if (d.ok) { log(`Saved: ${sName}`, "ok"); fetchScripts(); }
      else log("Error: " + d.error, "err");
    } catch (e) { log(e.message, "err"); }
  };

  const loadScript = async (name) => {
    try { const d = await req(`/script?name=${encodeURIComponent(name)}`); if (d.content !== undefined) { setSName(name); setSContent(d.content); log(`Loaded: ${name}`, "ok"); } }
    catch (e) { log(e.message, "err"); }
  };

  const deleteScript = async (name) => {
    try { const d = await req(`/script?name=${encodeURIComponent(name)}`, "DELETE"); if (d.ok) { log(`Deleted: ${name}`, "warn"); fetchScripts(); } }
    catch (e) { log(e.message, "err"); }
  };

  const runScript = async () => {
    if (!sContent.trim()) { log("No content", "warn"); return; } setBusy(true);
    try { const d = await req("/run", "POST", { content: sContent }); d.ok ? log(`Running: ${sName || "unnamed"}`, "ok") : log("Error: " + d.error, "err"); }
    catch (e) { log(e.message, "err"); } setBusy(false);
  };

  const queueScript = async () => {
    if (!sContent.trim()) { log("No content", "warn"); return; }
    try { const d = await req("/queue", "POST", { content: sContent }); if (d.ok) { log("Script queued — will run on next BLE connect ✓", "ok"); poll(); } else log("Error: " + d.error, "err"); }
    catch (e) { log(e.message, "err"); }
  };

  const clearQueue = async () => {
    try { await req("/queue", "DELETE"); log("Queue cleared", "warn"); poll(); } catch (e) { log(e.message, "err"); }
  };

  // ── Design tokens ─────────────────────────────────────────────────────────
  const C = {
    bg: "#07090d", surf: "#0c1018", bdr: "#18222e",
    green: "#22c55e", greenBg: "#041a0c",
    cyan: "#38bdf8",  cyanBg: "#071627",
    amber: "#f59e0b", amberBg: "#180e00",
    red: "#f87171",   redBg: "#180404",
    dim: "#3d5166",   text: "#c4cdd8", muted: "#4a6070",
  };

  const btn = (v = "ghost") => {
    const V = {
      green: [C.greenBg, "#155e2a", C.green],
      cyan:  [C.cyanBg,  "#1a3a5c", C.cyan],
      amber: [C.amberBg, "#7c4a00", C.amber],
      red:   [C.redBg,   "#6b1f1f", C.red],
      ghost: [C.surf,    C.bdr,     C.muted],
    }[v] || [C.surf, C.bdr, C.muted];
    return { padding: "6px 14px", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.07em", background: V[0], border: `1px solid ${V[1]}`, color: V[2], borderRadius: 3, cursor: "pointer" };
  };

  const chip = { background: C.surf, border: `1px solid ${C.bdr}`, color: C.muted, padding: "4px 9px", fontSize: 10, fontFamily: "monospace", borderRadius: 3, cursor: "pointer", letterSpacing: "0.05em" };
  const inp  = { width: "100%", background: C.surf, border: `1px solid ${C.bdr}`, color: C.text, fontFamily: "monospace", fontSize: 12, padding: "7px 10px", borderRadius: 3, outline: "none", boxSizing: "border-box" };
  const lbl  = { fontSize: 10, color: C.muted, letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 6, display: "block" };
  const sec  = { marginBottom: 20 };
  const hr   = { border: "none", borderTop: `1px solid ${C.bdr}`, margin: "18px 0" };

  const notConn = !bleOn && (
    <div style={{ fontSize: 11, color: C.red, fontFamily: "monospace", marginTop: 8, lineHeight: 1.7 }}>
      ✖ BLE not connected — pair the ESP32 as a Bluetooth keyboard on the target device first
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Courier New', monospace", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{ background: C.surf, borderBottom: `1px solid ${C.bdr}`, padding: "11px 18px", display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.green, letterSpacing: "0.15em" }}>⌨ ESP32 BLE KEYBOARD</span>

        <Pill on={bleOn}>{bleOn ? "BLE CONNECTED" : "BLE DISCONNECTED"}</Pill>

        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, padding: "3px 9px", borderRadius: 3, border: `1px solid ${wifiOn ? "#1a3a5c" : "#2a2a2a"}`, background: wifiOn ? C.cyanBg : "#0a0d10", color: wifiOn ? C.cyan : C.muted, letterSpacing: "0.1em", flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: wifiOn ? C.cyan : C.muted, boxShadow: wifiOn ? `0 0 5px ${C.cyan}` : "none" }} />
          {wifiOn ? `WiFi: ${wifiSsid || ip}` : "WiFi: offline"}
        </div>

        <div style={{ fontSize: 10, color: C.dim, border: `1px solid ${C.bdr}`, padding: "3px 9px", borderRadius: 3, letterSpacing: "0.12em" }}>AZERTY</div>

        {queued && (
          <div onClick={clearQueue} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 3, border: `1px solid #7c4a00`, background: C.amberBg, color: C.amber, cursor: "pointer", letterSpacing: "0.08em" }}>
            ⏳ SCRIPT QUEUED — click to clear
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: "auto" }}>
          <span style={{ fontSize: 10, color: C.muted }}>IP:</span>
          <input style={{ ...inp, width: 140, padding: "4px 8px" }} value={ipDraft} onChange={e => setIpDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && (setIp(ipDraft), log(`IP → ${ipDraft}`))} />
          <button style={{ ...btn("cyan"), padding: "4px 12px" }} onClick={() => { setIp(ipDraft); log(`IP → ${ipDraft}`); }}>SET</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── Tabs ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.bdr}`, background: C.surf }}>
            {[["type", "▶ Type"], ["scripts", "📁 Scripts"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ padding: "9px 20px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", background: "none", border: "none", color: tab === k ? C.green : C.muted, borderBottom: `2px solid ${tab === k ? C.green : "transparent"}`, fontFamily: "monospace" }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, padding: "18px 20px", overflowY: "auto" }}>

            {/* ═══ TYPE TAB ═══ */}
            {tab === "type" && <>
              <div style={sec}>
                <label style={lbl}>Text to type</label>
                <textarea style={{ ...inp, minHeight: 90, resize: "vertical", lineHeight: 1.6, padding: 10 }}
                  value={typeText} onChange={e => setTypeText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendType(); }}
                  placeholder={"Hello, World![ENTER]\nUse [CTRL+C], [WIN+R], [DELAY:500]...\n(Ctrl+Enter to send)"}
                />
                <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                  <button style={btn("green")} onClick={sendType} disabled={busy || !bleOn}>▶ SEND</button>
                  <button style={btn()} onClick={() => setTypeText("")}>CLEAR</button>
                </div>
                {notConn}
              </div>

              <hr style={hr} />

              <div style={sec}>
                <label style={lbl}>Quick keys</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                  {QUICK_KEYS.map(k => (
                    <button key={k.cmd} style={chip} onClick={() => sendKey(k.cmd)} disabled={busy || !bleOn}>{k.label}</button>
                  ))}
                </div>
              </div>

              <hr style={hr} />

              <div style={sec}>
                <label style={lbl}>Script syntax reference</label>
                <div style={{ fontSize: 11, fontFamily: "monospace", lineHeight: 1.9, color: C.muted }}>
                  {KEY_REF.map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 12, marginBottom: 1 }}>
                      <span style={{ color: C.green, minWidth: 200 }}>{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 10, color: C.dim }}>Natural 30–80 ms delay between each keystroke (simulates human typing).</div>
                </div>
              </div>
            </>}

            {/* ═══ SCRIPTS TAB ═══ */}
            {tab === "scripts" && <>
              <div style={sec}>
                <label style={lbl}>Saved scripts ({scripts.length})</label>
                {scripts.length === 0
                  ? <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>No scripts yet. Write one below and hit SAVE.</div>
                  : scripts.map(name => (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 3, border: `1px solid ${C.bdr}`, marginBottom: 5, background: C.surf }}>
                      <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace" }}>{name}</span>
                      <button style={{ ...chip, color: C.cyan }} onClick={() => loadScript(name)}>LOAD</button>
                      <button style={{ ...chip, color: C.red }}  onClick={() => deleteScript(name)}>DEL</button>
                    </div>
                  ))
                }
                <div style={{ marginTop: 12 }}>
                  <label style={lbl}>Examples</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {Object.keys(EXAMPLE_SCRIPTS).map(n => (
                      <button key={n} style={chip} onClick={() => { setSName(n); setSContent(EXAMPLE_SCRIPTS[n]); log(`Example: ${n}`); }}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>

              <hr style={hr} />

              <div style={sec}>
                <label style={lbl}>Script editor</label>
                <input style={{ ...inp, marginBottom: 8 }} placeholder="Script name…" value={sName} onChange={e => setSName(e.target.value)} />
                <textarea style={{ ...inp, minHeight: 130, resize: "vertical", lineHeight: 1.6, padding: 10 }}
                  placeholder={"[WIN+R][DELAY:600]notepad[ENTER][DELAY:1000]Hello from ESP32!"}
                  value={sContent} onChange={e => setSContent(e.target.value)}
                />
                <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                  <button style={btn("cyan")}  onClick={saveScript}>💾 SAVE</button>
                  <button style={btn("green")} onClick={runScript}   disabled={busy || !bleOn}>▶ RUN NOW</button>
                  <button style={btn("amber")} onClick={queueScript}>⏳ LOAD FOR NEXT CONNECT</button>
                  <button style={btn()}        onClick={() => { setSName(""); setSContent(""); }}>CLEAR</button>
                </div>
                <div style={{ fontSize: 11, fontFamily: "monospace", lineHeight: 1.8, marginTop: 10, color: C.muted }}>
                  <strong style={{ color: C.amber }}>LOAD FOR NEXT CONNECT</strong>{" — stores the script in ESP32 Flash.\nRuns automatically on the next Bluetooth connection, even if this interface is closed."}
                </div>
                {queued && (
                  <div style={{ fontSize: 11, color: C.amber, fontFamily: "monospace", marginTop: 8 }}>
                    ⚠ A script is already queued.{" "}
                    <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={clearQueue}>Clear it</span>
                  </div>
                )}
                {notConn}
              </div>
            </>}

          </div>
        </div>

        {/* ── Log panel ── */}
        <div style={{ width: 255, borderLeft: `1px solid ${C.bdr}`, background: "#050709", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "7px 12px", fontSize: 9, letterSpacing: "0.16em", color: C.dim, borderBottom: `1px solid ${C.bdr}`, textTransform: "uppercase" }}>// activity log</div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }} ref={logRef}>
            {logs.length === 0 && <div style={{ color: "#1e2d3d", fontSize: 11, marginTop: 6, fontFamily: "monospace" }}>Waiting for activity…</div>}
            {logs.map((e, i) => <LogLine key={i} entry={e} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

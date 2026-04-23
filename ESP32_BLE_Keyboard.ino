/*
 * ESP32 BLE Keyboard — AZERTY / WiFi STA Edition
 * ================================================
 * - BLE HID Keyboard (pairs with target device)
 * - WiFi STA only — joins your existing router, no hotspot
 * - HTTP API on port 80 for the companion interface
 * - SPIFFS script storage + auto-run queue on BLE connect
 * - AZERTY character mapping + natural typing delays
 *
 * ══ SETUP ══════════════════════════════════════════════════
 *  1. Edit WIFI_SSID and WIFI_PASS below
 *  2. Flash to ESP32  (Board: ESP32 Dev Module,
 *                      Partition: Default 4MB with spiffs)
 *  3. Open Serial Monitor @ 115200 — note the IP address
 *  4. Open the companion interface and set that IP
 *
 * !! ESP32 only supports 2.4 GHz WiFi — use your router's
 *    2.4 GHz band, not the 5 GHz one.
 *
 * REQUIRED LIBRARIES (Arduino Library Manager):
 *   "ESP32 BLE Keyboard" by T-vK
 *   "ArduinoJson"         by Benoit Blanchon
 * ═══════════════════════════════════════════════════════════
 */

#include <BleKeyboard.h>
#include <WiFi.h>
#include <WebServer.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>
#include "esp_random.h"

// ─── !! Edit these two lines !! ──────────────────────────────────────────────
#define WIFI_SSID  "Proximus-Home-CBD0"
#define WIFI_PASS  "ww73kdd94zad3"
// ─────────────────────────────────────────────────────────────────────────────

const char*    QUEUE_FILE   = "/queue.txt";
const uint8_t  DELAY_MIN    = 30;
const uint8_t  DELAY_MAX    = 80;
const uint8_t  KEY_HOLD     = 25;
const uint16_t STA_TIMEOUT  = 12000;   // ms to wait for router association

BleKeyboard bleKeyboard("ESP32 Keyboard", "ESP32-DIY", 100);
WebServer   server(80);
bool        wasConnected = false;

// ─── WiFi connect ─────────────────────────────────────────────────────────────
void connectWifi() {
  Serial.printf("[WiFi] Connecting to '%s'", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < STA_TIMEOUT) {
    delay(300);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WiFi] FAILED — check SSID/password and that you're using 2.4 GHz");
    Serial.println("[WiFi] Retrying in 10 s...");
  }
}

// ─── Natural delay ────────────────────────────────────────────────────────────
void naturalDelay() {
  delay(DELAY_MIN + (esp_random() % (DELAY_MAX - DELAY_MIN + 1)));
}

// ─── AZERTY remapping ─────────────────────────────────────────────────────────
char azertyRemap(char c) {
  switch (c) {
    case 'a': return 'q'; case 'z': return 'w';
    case 'q': return 'a'; case 'w': return 'z'; case 'm': return ';';
    case ',': return 'm'; case ';': return ','; case ':': return '.'; case '!': return '/';
    case '&': return '1'; case '"': return '3'; case '\'': return '4';
    case '(': return '5'; case '-': return '6'; case '_': return '8'; case ')': return '-';
    default:  return c;
  }
}

void pressAndRelease(uint8_t k) { bleKeyboard.press(k); delay(KEY_HOLD); bleKeyboard.releaseAll(); }
void pressShifted(uint8_t k)    { bleKeyboard.press(KEY_LEFT_SHIFT); delay(10); bleKeyboard.press(k); delay(KEY_HOLD); bleKeyboard.releaseAll(); }

void typeCharAzerty(char c) {
  if (c >= 'a' && c <= 'z') { pressAndRelease((uint8_t)azertyRemap(c)); return; }
  if (c >= 'A' && c <= 'Z') { pressShifted((uint8_t)azertyRemap((char)(c + 32))); return; }
  if (c >= '0' && c <= '9') { pressShifted((uint8_t)c); return; }
  switch (c) {
    case '.': pressShifted(','); return; case '?': pressShifted('m'); return;
    case '/': pressShifted('.'); return; case '§': pressShifted('/'); return;
    default: break;
  }
  char r = azertyRemap(c);
  if (r != c) { pressAndRelease((uint8_t)r); return; }
  bleKeyboard.print(c);
}

// ─── Special key by name ──────────────────────────────────────────────────────
void pressSpecialKey(const String& n) {
  if      (n=="ENTER")     pressAndRelease(KEY_RETURN);
  else if (n=="TAB")       pressAndRelease(KEY_TAB);
  else if (n=="ESC")       pressAndRelease(KEY_ESC);
  else if (n=="BACKSPACE") pressAndRelease(KEY_BACKSPACE);
  else if (n=="DELETE")    pressAndRelease(KEY_DELETE);
  else if (n=="UP")        pressAndRelease(KEY_UP_ARROW);
  else if (n=="DOWN")      pressAndRelease(KEY_DOWN_ARROW);
  else if (n=="LEFT")      pressAndRelease(KEY_LEFT_ARROW);
  else if (n=="RIGHT")     pressAndRelease(KEY_RIGHT_ARROW);
  else if (n=="HOME")      pressAndRelease(KEY_HOME);
  else if (n=="END")       pressAndRelease(KEY_END);
  else if (n=="PAGEUP")    pressAndRelease(KEY_PAGE_UP);
  else if (n=="PAGEDOWN")  pressAndRelease(KEY_PAGE_DOWN);
  else if (n=="CAPS")      pressAndRelease(KEY_CAPS_LOCK);
  else if (n=="SPACE")     pressAndRelease(' ');
  else if (n=="WIN"||n=="GUI") pressAndRelease(KEY_LEFT_GUI);
  else if (n=="F1")  pressAndRelease(KEY_F1);  else if (n=="F2")  pressAndRelease(KEY_F2);
  else if (n=="F3")  pressAndRelease(KEY_F3);  else if (n=="F4")  pressAndRelease(KEY_F4);
  else if (n=="F5")  pressAndRelease(KEY_F5);  else if (n=="F6")  pressAndRelease(KEY_F6);
  else if (n=="F7")  pressAndRelease(KEY_F7);  else if (n=="F8")  pressAndRelease(KEY_F8);
  else if (n=="F9")  pressAndRelease(KEY_F9);  else if (n=="F10") pressAndRelease(KEY_F10);
  else if (n=="F11") pressAndRelease(KEY_F11); else if (n=="F12") pressAndRelease(KEY_F12);
  else if (n.length() == 1) pressAndRelease((uint8_t)n[0]);
}

// ─── Combo handler ────────────────────────────────────────────────────────────
void executeCombo(String combo) {
  const int MAX = 6; String parts[MAX]; int count = 0; String tok = "";
  for (int i = 0; i <= (int)combo.length() && count < MAX; i++) {
    char ch = (i < (int)combo.length()) ? combo[i] : '+';
    if (ch == '+') { tok.trim(); if (tok.length()) parts[count++] = tok; tok = ""; } else tok += ch;
  }
  if (!count) return;
  for (int j = 0; j < count; j++) {
    const String& p = parts[j];
    if      (p=="CTRL")          { bleKeyboard.press(KEY_LEFT_CTRL);  delay(15); }
    else if (p=="SHIFT")         { bleKeyboard.press(KEY_LEFT_SHIFT); delay(15); }
    else if (p=="ALT")           { bleKeyboard.press(KEY_LEFT_ALT);   delay(15); }
    else if (p=="WIN"||p=="GUI") { bleKeyboard.press(KEY_LEFT_GUI);   delay(15); }
  }
  for (int j = 0; j < count; j++) {
    const String& p = parts[j];
    bool mod = (p=="CTRL"||p=="SHIFT"||p=="ALT"||p=="WIN"||p=="GUI");
    if (!mod) {
      if      (p=="ENTER")     bleKeyboard.press(KEY_RETURN);
      else if (p=="TAB")       bleKeyboard.press(KEY_TAB);
      else if (p=="ESC")       bleKeyboard.press(KEY_ESC);
      else if (p=="BACKSPACE") bleKeyboard.press(KEY_BACKSPACE);
      else if (p=="DELETE")    bleKeyboard.press(KEY_DELETE);
      else if (p=="F1")  bleKeyboard.press(KEY_F1); else if (p=="F2")  bleKeyboard.press(KEY_F2);
      else if (p=="F3")  bleKeyboard.press(KEY_F3); else if (p=="F4")  bleKeyboard.press(KEY_F4);
      else if (p=="F5")  bleKeyboard.press(KEY_F5); else if (p=="F6")  bleKeyboard.press(KEY_F6);
      else if (p=="F7")  bleKeyboard.press(KEY_F7); else if (p=="F8")  bleKeyboard.press(KEY_F8);
      else if (p=="F9")  bleKeyboard.press(KEY_F9); else if (p=="F10") bleKeyboard.press(KEY_F10);
      else if (p=="F11") bleKeyboard.press(KEY_F11); else if (p=="F12") bleKeyboard.press(KEY_F12);
      else if (p.length() == 1) bleKeyboard.press((uint8_t)p[0]);
      delay(15);
    }
  }
  delay(80); bleKeyboard.releaseAll(); delay(50);
}

void executeCommand(String cmd) {
  String u = cmd; u.toUpperCase(); u.trim();
  if (u.startsWith("DELAY:")) { int ms = u.substring(6).toInt(); if (ms > 0 && ms < 30000) delay(ms); return; }
  if (u.indexOf('+') != -1)   { executeCombo(u); return; }
  pressSpecialKey(u);
}

void executeScript(const String& script) {
  for (int i = 0; i < (int)script.length(); ) {
    char c = script[i];
    if (c == '[') {
      int end = script.indexOf(']', i);
      if (end != -1) { executeCommand(script.substring(i + 1, end)); i = end + 1; }
      else           { typeCharAzerty(c); i++; }
    } else if (c == '\r') { i++;
    } else if (c == '\n') { bleKeyboard.write(KEY_RETURN); delay(30); i++;
    } else                { typeCharAzerty(c); naturalDelay(); i++; }
    if (i % 50 == 0) yield();
  }
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
void addCORS() {
  server.sendHeader("Access-Control-Allow-Origin",  "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}
void handleOptions() { addCORS(); server.send(204); }

// ─── HTTP handlers ────────────────────────────────────────────────────────────

void handleStatus() {
  addCORS();
  StaticJsonDocument<128> out;
  out["ble_connected"] = bleKeyboard.isConnected();
  out["has_queued"]    = SPIFFS.exists(QUEUE_FILE);
  out["ip"]            = WiFi.localIP().toString();
  out["ssid"]          = String(WIFI_SSID);
  String json; serializeJson(out, json);
  server.send(200, "application/json", json);
}

void handleType() {
  addCORS();
  if (!bleKeyboard.isConnected()) { server.send(503, "application/json", "{\"error\":\"BLE not connected\"}"); return; }
  StaticJsonDocument<8192> doc;
  if (deserializeJson(doc, server.arg("plain"))) { server.send(400, "application/json", "{\"error\":\"Bad JSON\"}"); return; }
  server.send(200, "application/json", "{\"ok\":true}");
  executeScript(doc["text"].as<String>());
}

void handleListScripts() {
  addCORS(); String json = "["; bool first = true;
  File root = SPIFFS.open("/"); File f = root.openNextFile();
  while (f) {
    String name = String(f.name());
    if (name.startsWith("/s_") || name.startsWith("s_")) {
      String d = name.startsWith("/") ? name.substring(3) : name.substring(2);
      d.replace("\"", "\\\"");
      if (!first) json += ","; json += "\"" + d + "\""; first = false;
    }
    f.close(); f = root.openNextFile();
  }
  root.close(); json += "]"; server.send(200, "application/json", json);
}

void handleSaveScript() {
  addCORS(); StaticJsonDocument<16384> doc;
  if (deserializeJson(doc, server.arg("plain"))) { server.send(400, "application/json", "{\"error\":\"Bad JSON\"}"); return; }
  String name = doc["name"].as<String>(), safe = "";
  for (char ch : name) safe += (isAlphaNumeric(ch) || ch == '-' || ch == '_' || ch == ' ') ? ch : '_';
  if (!safe.length()) safe = "script"; if (safe.length() > 32) safe = safe.substring(0, 32);
  File f = SPIFFS.open("/s_" + safe, "w");
  if (!f) { server.send(500, "application/json", "{\"error\":\"Write failed\"}"); return; }
  f.print(doc["content"].as<String>()); f.close();
  server.send(200, "application/json", "{\"ok\":true,\"name\":\"" + safe + "\"}");
}

void handleGetScript() {
  addCORS(); String path = "/s_" + server.arg("name");
  if (!SPIFFS.exists(path)) { server.send(404, "application/json", "{\"error\":\"Not found\"}"); return; }
  File f = SPIFFS.open(path, "r"); String content = f.readString(); f.close();
  StaticJsonDocument<16384> out; out["name"] = server.arg("name"); out["content"] = content;
  String json; serializeJson(out, json); server.send(200, "application/json", json);
}

void handleDeleteScript() {
  addCORS(); SPIFFS.remove("/s_" + server.arg("name"));
  server.send(200, "application/json", "{\"ok\":true}");
}

void handleRun() {
  addCORS();
  if (!bleKeyboard.isConnected()) { server.send(503, "application/json", "{\"error\":\"BLE not connected\"}"); return; }
  StaticJsonDocument<16384> doc;
  if (deserializeJson(doc, server.arg("plain"))) { server.send(400, "application/json", "{\"error\":\"Bad JSON\"}"); return; }
  server.send(200, "application/json", "{\"ok\":true}");
  executeScript(doc["content"].as<String>());
}

void handleQueueSet() {
  addCORS(); StaticJsonDocument<16384> doc;
  if (deserializeJson(doc, server.arg("plain"))) { server.send(400, "application/json", "{\"error\":\"Bad JSON\"}"); return; }
  File f = SPIFFS.open(QUEUE_FILE, "w");
  if (!f) { server.send(500, "application/json", "{\"error\":\"Write failed\"}"); return; }
  f.print(doc["content"].as<String>()); f.close();
  server.send(200, "application/json", "{\"ok\":true}");
}

void handleQueueClear() {
  addCORS(); if (SPIFFS.exists(QUEUE_FILE)) SPIFFS.remove(QUEUE_FILE);
  server.send(200, "application/json", "{\"ok\":true}");
}

// ─── Setup / Loop ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ESP32 BLE Keyboard (AZERTY / STA) ===");

  if (!SPIFFS.begin(true)) { Serial.println("[FATAL] SPIFFS mount failed"); while (true) delay(1000); }
  Serial.println("[OK] SPIFFS");

  bleKeyboard.begin();
  Serial.println("[OK] BLE advertising as 'ESP32 Keyboard'");

  connectWifi();

  server.on("/status",  HTTP_GET,     handleStatus);
  server.on("/status",  HTTP_OPTIONS, handleOptions);
  server.on("/type",    HTTP_POST,    handleType);
  server.on("/type",    HTTP_OPTIONS, handleOptions);
  server.on("/scripts", HTTP_GET,     handleListScripts);
  server.on("/scripts", HTTP_OPTIONS, handleOptions);
  server.on("/script",  HTTP_POST,    handleSaveScript);
  server.on("/script",  HTTP_GET,     handleGetScript);
  server.on("/script",  HTTP_DELETE,  handleDeleteScript);
  server.on("/script",  HTTP_OPTIONS, handleOptions);
  server.on("/run",     HTTP_POST,    handleRun);
  server.on("/run",     HTTP_OPTIONS, handleOptions);
  server.on("/queue",   HTTP_POST,    handleQueueSet);
  server.on("/queue",   HTTP_DELETE,  handleQueueClear);
  server.on("/queue",   HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("[OK] HTTP server on port 80 — ready");
  if (WiFi.status() == WL_CONNECTED)
    Serial.printf("     Open interface and set IP to: %s\n", WiFi.localIP().toString().c_str());
}

void loop() {
  server.handleClient();

  // WiFi watchdog — reconnect silently if dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Connection lost, reconnecting...");
    connectWifi();
  }

  bool isConn = bleKeyboard.isConnected();
  if (isConn && !wasConnected) {
    Serial.println("[BLE] Connected!");
    if (SPIFFS.exists(QUEUE_FILE)) {
      delay(1500);
      File f = SPIFFS.open(QUEUE_FILE, "r");
      if (f) {
        String s = f.readString(); f.close();
        SPIFFS.remove(QUEUE_FILE);
        Serial.printf("[BLE] Running queued script (%d chars)\n", s.length());
        executeScript(s);
        Serial.println("[BLE] Done");
      }
    }
  }
  if (!isConn && wasConnected) Serial.println("[BLE] Disconnected");
  wasConnected = isConn;
}

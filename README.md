# ESP_Keyboard

ESP_Keyboard is an Arduino-based firmware for ESP32-S2 and ESP32-S3 devices that emulates a USB HID keyboard. It supports DuckyScript-style payload execution and includes a WiFi-hosted web interface for remote script control.

## Features

- USB HID keyboard emulation (ESP32-S2 / S3 native USB required)
- DuckyScript-style scripting language
- Web-based payload editor and executor
- WiFi access point mode
- On-device script execution
- Cross-platform support (Windows, Linux, macOS)

## Requirements

### Hardware
- ESP32-S2 or ESP32-S3 development board
- USB data cable

### Software
- Arduino IDE 2.x
- ESP32 board support package (Espressif)

## Installation

### 1. Install ESP32 support in Arduino IDE

Add the following URL in:
File → Preferences → Additional Board Manager URLs


https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json


Then install:
Tools → Board Manager → "esp32 by Espressif Systems"

---

### 2. Select Board

In Arduino IDE:


Tools → Board → ESP32 Arduino → ESP32S3 Dev Module


(Or your exact ESP32-S2/S3 board)

---

### 3. Enable USB HID Mode

Set the following options:


Tools → USB CDC On Boot → Enabled
Tools → USB Mode → Hardware CDC and JTAG


---

### 4. Upload Firmware

Open `ESP_Keyboard.ino` and upload.

---

## Usage

### 1. Connect Device

Plug the ESP32 into the target machine via USB.
It will appear as a keyboard device.

---

### 2. WiFi Access Point

On boot, the device creates a WiFi network:


SSID: ESP_Keyboard
Password: password


---

### 3. Open Web Interface

Navigate to:


http://192.168.4.1


From here you can create and execute payloads.

---

## Example Payloads

### Open Notepad (Windows)

```txt
REM Open Run dialog
DELAY 500
GUI r
DELAY 200
STRING notepad
ENTER
DELAY 500
STRING Hello from ESP32
ENTER
Open Terminal (macOS)
REM Open Spotlight
GUI SPACE
DELAY 300
STRING terminal
ENTER
DELAY 500
STRING echo Hello from ESP32
ENTER
Open Terminal (Linux)
CTRL ALT t
DELAY 500
STRING echo Hello from ESP32
ENTER
DuckyScript Reference
``
Supported commands:

STRING <text>     Type text
DELAY <ms>        Wait in milliseconds
GUI               Windows/Command key
CTRL / ALT / SHIFT Modifier keys
ENTER             Press Enter
REM               Comment

Example:

REM Example script
STRING Test complete
ENTER
Project Structure
ESP_Keyboard/
├── ESP_Keyboard.ino   Main firmware
├── data/              Web interface files
├── lib/               Optional libraries
└── README.md
Web Interface Upload (Optional)

If using SPIFFS or LittleFS:

Upload filesystem:

Tools → ESP32 Sketch Data Upload
Troubleshooting
Device not detected as keyboard
Ensure ESP32-S2 or S3 is used
Verify USB mode settings in Arduino IDE
Web interface not accessible
Confirm connection to ESP_Keyboard WiFi
Try http://192.168.4.1
 manually
Payload timing issues
Increase DELAY values between commands
Notes
Execution timing is critical for reliability
Different operating systems may require adjusted delays
Some systems may restrict HID injection behavior
Disclaimer

This project is intended for educational and authorized security testing purposes only. Use only on systems you own or have explicit permission to test.

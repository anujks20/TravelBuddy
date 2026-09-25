# TravelBuddy IoT Sensor Node (ESP32 + MPU6050)

This directory contains the production firmware and instructions for the **TravelBuddy Smart IoT Wearable Node**, combining an **ESP32 DevKit**, **MPU-6050 6-Axis Inertial Measurement Unit (IMU)**, and physical siren alert buzzer for real-time motion telemetry, fall/freefall detection, and automated geo-fencing danger perimeter alerts.

---

## Physical Hardware Pinout

| Module | Module Pin | ESP32 GPIO Pin | Function |
|---|---|---|---|
| **MPU-6050** | **VCC** | **3.3V** | 3.3V Power Supply |
| **MPU-6050** | **GND** | **GND** | Ground |
| **MPU-6050** | **SDA** | **GPIO 21** | I2C Data |
| **MPU-6050** | **SCL** | **GPIO 22** | I2C Clock |
| **MPU-6050** | **INT** | **GPIO 27** | Hardware Motion Interrupt |
| **Buzzer** | **SIG / (+)** | **GPIO 25** | Audible Warning Signal |
| **Buzzer** | **GND / (-)** | **GND** | Ground |

---

## Required Libraries

All required libraries are built into the standard ESP32 Arduino Core:
- `WiFi.h` (ESP32 core)
- `HTTPClient.h` (ESP32 core)
- `Wire.h` (ESP32 core I2C)
- `math.h` (Standard C math)

*No third-party external libraries are required.*

---

## Flashing & Setup Instructions

### 1. Arduino IDE Setup
1. In Arduino IDE, open **File > Preferences** and add the ESP32 Board Manager URL:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
2. Go to **Tools > Board > Boards Manager...**, search for `esp32` by Espressif Systems and click **Install**.
3. Select Board: **ESP32 Dev Module** (or your specific DevKit variant).
4. Set Upload Speed: **921600**, Flash Frequency: **80MHz**, CPU Frequency: **240MHz**.

### 2. Configure Wi-Fi & Backend Endpoint
Open `esp32_mpu6050_geofence_node.ino` and configure:
```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://<YOUR_PC_LAN_IP>:5000/api/iot/telemetry";
const char* DEVICE_KEY    = "tb_iot_esp32_sec_2026";
```

### 3. Upload & Monitor
1. Connect ESP32 via Micro-USB / USB-C.
2. Select the matching COM Port in **Tools > Port**.
3. Click **Upload**.
4. Open **Tools > Serial Monitor** at **115200 baud** to view real-time sensor calibration and transmission logs.

---

## Automatic REAL vs SIMULATION Selection

- **REAL IoT Mode:** Activated automatically whenever the ESP32 is powered on, connected to Wi-Fi, and transmitting packets.
- **SIMULATION Mode:** The TravelBuddy backend and dashboard automatically fall back to simulated telemetry whenever the ESP32 is unpowered, out of range, or disconnected (> 12-second heartbeat timeout).

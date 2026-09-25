/*
 * ==============================================================================
 * TravelBuddy IoT Node: REAL ESP32 + MPU6050 IMU Telemetry Node
 * ==============================================================================
 *
 * Physical 4-Wire Connection:
 * ---------------------------
 * ESP32 3.3V  <--->  MPU-6050 VCC
 * ESP32 GND   <--->  MPU-6050 GND
 * ESP32 D21   <--->  MPU-6050 SDA (I2C Data)
 * ESP32 D22   <--->  MPU-6050 SCL (I2C Clock)
 *
 * Note:
 * - NO physical buzzer is required.
 * - NO MPU6050 INT pin wiring is required.
 * - Sensor sampling operates directly over I2C (GPIO 21 & GPIO 22).
 *
 * Built-in Core Libraries:
 * ------------------------
 * - WiFi.h
 * - HTTPClient.h
 * - Wire.h
 * - math.h
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <math.h>

// ==========================================
// 1. NETWORK & BACKEND CONFIGURATION
// ==========================================
// To keep your Wi-Fi credentials private, copy config.h.example to config.h
#if __has_include("config.h")
#include "config.h"
#else
// Replace with your local Wi-Fi SSID and Password:
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// TravelBuddy Backend Telemetry Ingestion Endpoint
// (Replace with your backend PC's LAN IP address, e.g. 192.168.1.15)
const char* SERVER_URL    = "http://YOUR_BACKEND_IP:5000/api/iot/telemetry";

// Device Identification & Authentication Key
const char* DEVICE_ID     = "ESP32-MPU6050-NODE-01";
const char* DEVICE_KEY    = "tb_iot_esp32_sec_2026"; // Must match backend IOT_DEVICE_KEY
const char* USER_ID       = NULL; // Optional: UUID of registered tourist
#endif

// ==========================================
// 2. HARDWARE I2C PIN DEFINITIONS (4 WIRES)
// ==========================================
#define I2C_SDA_PIN   21
#define I2C_SCL_PIN   22
#define MPU_ADDR      0x68 // I2C address (default when AD0 is GND)

// Optional hardware buzzer support (disabled by default)
#define HAS_PHYSICAL_BUZZER false
#define BUZZER_PIN          25

// ==========================================
// 3. SENSOR & TELEMETRY STATE
// ==========================================
// Raw sensor variables from MPU6050
int16_t raw_ax, raw_ay, raw_az;
int16_t raw_gx, raw_gy, raw_gz;

// Scaled Engineering Units
float ax_g, ay_g, az_g;         // Accelerometer in G (+/- 2g scale)
float gx_dps, gy_dps, gz_dps;   // Gyroscope in deg/s (+/- 250 deg/s scale)
float pitch_deg, roll_deg;      // Inclinometer angles in degrees
float total_g = 1.0;            // Total G-force magnitude
float gyro_mag = 0.0;           // Angular velocity magnitude

// Fall & Impact State Machine
bool free_fall_detected = false;
bool impact_detected    = false;
bool fall_detected      = false;
unsigned long fallTriggerTime = 0;

// Device Status
float battery_level = 94.0;
double latitude     = 30.0895; // Default: Ganga Rapids Sector
double longitude    = 78.2730;

// Periodic transmission timing
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL_MS = 2000; // Transmit every 2.0 seconds

// ==========================================
// 4. FUNCTION DECLARATIONS
// ==========================================
void initMPU6050();
void readMPU6050();
void evaluateFallLogic();
void connectWiFi();
void sendTelemetryToServer();

// ==========================================
// 5. SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==========================================");
  Serial.println("  TravelBuddy Real ESP32 + MPU6050 Node  ");
  Serial.println("==========================================");
  Serial.printf("Device ID: %s\n", DEVICE_ID);
  Serial.println("Configuration: 4-Wire I2C (3V3, GND, D21=SDA, D22=SCL)");

  if (HAS_PHYSICAL_BUZZER) {
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
  }

  // Initialize I2C Bus on GPIO 21 (SDA) and GPIO 22 (SCL)
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 400000); // 400kHz Fast I2C
  initMPU6050();

  // Connect to Local Wi-Fi Network
  connectWiFi();

  Serial.println("[IoT] Setup complete. Streaming REAL physical telemetry to TravelBuddy backend...\n");
}

// ==========================================
// 6. MAIN LOOP
// ==========================================
void loop() {
  // 1. Maintain Wi-Fi connectivity
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // 2. Read physical MPU6050 sensor over I2C
  readMPU6050();

  // 3. Evaluate fall & high-G impact metrics on real measurements
  evaluateFallLogic();

  // 4. Transmit telemetry every 2.0s OR immediately if fall occurs
  unsigned long now = millis();
  if ((now - lastSendTime >= SEND_INTERVAL_MS) || (fall_detected && (now - fallTriggerTime < 1000))) {
    sendTelemetryToServer();
    lastSendTime = now;
  }

  delay(40); // 25 Hz sampling rate
}

// ==========================================
// 7. MPU-6050 I2C SENSOR ROUTINES
// ==========================================
void initMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0x00); // Wake up MPU6050
  byte error = Wire.endTransmission();

  if (error == 0) {
    Serial.println("[MPU6050] Connected successfully at I2C address 0x68.");

    // Accelerometer +/- 2g range (16384 LSB/g)
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x1C);
    Wire.write(0x00);
    Wire.endTransmission();

    // Gyroscope +/- 250 deg/s range (131 LSB/deg/s)
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x1B);
    Wire.write(0x00);
    Wire.endTransmission();
  } else {
    Serial.printf("[MPU6050] ERROR: Sensor not found (I2C code %d). Check wires: SDA=21, SCL=22.\n", error);
  }
}

void readMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Starting register: ACCEL_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU_ADDR, (size_t)14, true);

  if (Wire.available() >= 14) {
    raw_ax = Wire.read() << 8 | Wire.read();
    raw_ay = Wire.read() << 8 | Wire.read();
    raw_az = Wire.read() << 8 | Wire.read();
    int16_t raw_temp = Wire.read() << 8 | Wire.read();
    (void)raw_temp;
    raw_gx = Wire.read() << 8 | Wire.read();
    raw_gy = Wire.read() << 8 | Wire.read();
    raw_gz = Wire.read() << 8 | Wire.read();

    // Accelerometer scaled to G (+/- 2g -> 16384 LSB/g)
    ax_g = raw_ax / 16384.0f;
    ay_g = raw_ay / 16384.0f;
    az_g = raw_az / 16384.0f;

    // Gyroscope scaled to deg/s (+/- 250 deg/s -> 131 LSB/deg/s)
    gx_dps = raw_gx / 131.0f;
    gy_dps = raw_gy / 131.0f;
    gz_dps = raw_gz / 131.0f;

    // G-Force magnitude
    total_g = sqrt(ax_g * ax_g + ay_g * ay_g + az_g * az_g);

    // Angular velocity magnitude
    gyro_mag = sqrt(gx_dps * gx_dps + gy_dps * gy_dps + gz_dps * gz_dps);

    // Orientation angles (pitch & roll)
    pitch_deg = atan2(ay_g, sqrt(ax_g * ax_g + az_g * az_g)) * 180.0f / M_PI;
    roll_deg  = atan2(-ax_g, az_g) * 180.0f / M_PI;
  }
}

void evaluateFallLogic() {
  // Free-fall: near 0 G (< 0.35 G)
  free_fall_detected = (total_g < 0.35f);

  // High-G impact: sudden shock (> 2.80 G)
  impact_detected = (total_g > 2.80f);

  if ((free_fall_detected || impact_detected) && (gyro_mag > 120.0f || impact_detected)) {
    if (!fall_detected) {
      fall_detected = true;
      fallTriggerTime = millis();
      Serial.printf("[FALL ALERT] Physical impact / fall detected! G-Force: %.2f G, Gyro: %.1f deg/s\n",
                    total_g, gyro_mag);
    }
  } else {
    // Auto-clear fall alert after 3 seconds of stable upright rest
    if (fall_detected && (millis() - fallTriggerTime > 3000) && (total_g >= 0.85f && total_g <= 1.25f)) {
      fall_detected = false;
      Serial.println("[FALL ALERT] Posture stabilized. Fall cleared.");
    }
  }
}

// ==========================================
// 8. WI-FI & TELEMETRY TRANSMISSION
// ==========================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.printf("[WiFi] ESP32 IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] Connection timeout. Retrying in background...");
  }
}

void sendTelemetryToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  // Security Authentication Header
  http.addHeader("X-IoT-Device-Key", DEVICE_KEY);

  // Construct JSON Payload matching TravelBuddy schema
  String json = "{";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  if (USER_ID != NULL) {
    json += "\"user_id\":\"" + String(USER_ID) + "\",";
  }
  json += "\"ax\":" + String(ax_g, 4) + ",";
  json += "\"ay\":" + String(ay_g, 4) + ",";
  json += "\"az\":" + String(az_g, 4) + ",";
  json += "\"gx\":" + String(gx_dps, 2) + ",";
  json += "\"gy\":" + String(gy_dps, 2) + ",";
  json += "\"gz\":" + String(gz_dps, 2) + ",";
  json += "\"pitch\":" + String(pitch_deg, 2) + ",";
  json += "\"roll\":" + String(roll_deg, 2) + ",";
  json += "\"fall_detected\":" + String(fall_detected ? "true" : "false") + ",";
  json += "\"latitude\":" + String(latitude, 6) + ",";
  json += "\"longitude\":" + String(longitude, 6) + ",";
  json += "\"battery_level\":" + String(battery_level, 1);
  json += "}";

  int httpCode = http.POST(json);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP %d] Telemetry sent (G=%.2f): %s\n", httpCode, total_g, response.c_str());
  } else {
    Serial.printf("[HTTP ERROR] POST failed: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

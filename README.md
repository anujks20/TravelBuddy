# TravelBuddy: Smart Tourism, Safety & IoT Ecosystem

TravelBuddy is a smart tourism and tourist safety platform. It integrates AI-powered travel planning, multi-stop route optimization, real-time geofenced danger zone alerts with audible sirens, wearable IoT fall and impact detection, and synchronized emergency dispatch between tourists, local police authorities, and hotel partners.

---

## Ecosystem Components

The repository contains 6 interconnected subsystems:

1. **Central Backend (`backend/`)**
   - REST API built with Node.js & Express.
   - Relational database management with PostgreSQL (UUID primary keys, JSONB payloads).
   - JWT authentication, rate limiting, and role-based access for tourists, police dispatchers, and hotel managers.
   - Push notification dispatch via Firebase Admin SDK (FCM).
   - Real-time IoT sensor telemetry ingestion with automated fall detection.

2. **Tourist Web Portal (`web/`)**
   - Interactive AI travel planner and day-by-day itinerary generator powered by Groq LLMs.
   - Traveling Salesperson Problem (TSP) route cost & distance optimizer with OSRM and Leaflet mapping.
   - Real-time WanderGuide city explorer and culinary discovery.
   - WhatsApp Cloud webhook bot integration.

3. **Police Emergency Command Dashboard (`police-dashboard/`)**
   - Real-time incident response web console built with React 19 and Vite.
   - Live interactive map displaying active SOS distress calls, tourist locations, and sensor telemetry.
   - Restricted geofence danger perimeter manager (create, view, and toggle danger zones).
   - One-click incident resolution, siren dispatch, and audit trail logs.

4. **Hotel Partner Portal (`hotel-portal/`)**
   - React 19 + Vite dashboard for accommodation providers.
   - Tourist check-in and check-out management via verified tourist UID.
   - Real-time active stay verification and emergency contact records.

5. **Flutter Mobile Application (`mobile/`)**
   - Cross-platform Android & iOS client built with Flutter.
   - One-tap SOS distress triggering (manual button or hardware trigger).
   - Background location tracking and distance calculation against active geofenced danger zones.
   - Native alarm/siren player on perimeter breaches.
   - Real-time push notification receiver for safety warnings.

6. **IoT Wearable Sensor Node (`iot/`)**
   - Physical wearable node firmware (`esp32_mpu6050_geofence_node.ino`) for ESP32 + MPU-6050 6-axis accelerometer & gyroscope.
   - Real-time telemetry transmission over Wi-Fi (acceleration vectors, freefall detection, high-G impact shocks).
   - Software simulation engine (`demo_iot_simulator.py`) for live demonstrations without physical hardware.

---

## Prerequisites & Software Requirements

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **PostgreSQL**: v14.0 or later
- **Python**: v3.9 or later (for IoT simulator & trigger scripts)
- **Flutter SDK**: v3.22 or later (for mobile development)
- **Java / Android Studio**: JDK 17+ (for Android APK builds)
- **Arduino IDE / PlatformIO**: (optional, for ESP32 hardware flashing)

---

## Local Environment & Secret Configuration

To safeguard credentials, all real secrets and environment files (`.env`, `config.h`, service account JSONs) are strictly excluded by `.gitignore`.

Template files (`.env.example`) are provided across all applications:

| Subsystem | Configuration File | Template |
|---|---|---|
| Backend | `backend/.env` | `backend/.env.example` |
| Web Portal | `web/.env` | `web/.env.example` |
| Police Dashboard | `police-dashboard/.env.local` | `police-dashboard/.env.example` |
| Hotel Portal | `hotel-portal/.env.local` | `hotel-portal/.env.example` |
| IoT Node Firmware | `iot/config.h` | `iot/config.h.example` |
| Mobile (Firebase) | `mobile/android/app/google-services.json` | `mobile/android/app/google-services.json.example` |

### Setting Up Secrets Locally

1. **Backend**:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Fill in your PostgreSQL credentials (`DB_PASSWORD` or `DATABASE_URL`), `JWT_SECRET`, `GROQ_API_KEY`, and `GEOAPIFY_API_KEY`.
   Place your Firebase Admin service account JSON file at `backend/secrets/firebase-service-account.json`.

2. **Web Portal**:
   ```bash
   cp web/.env.example web/.env
   ```
   Configure `PORT=3000`, `GROQ_API_KEY`, and optional `PEXELS_API_KEY` / `WHATSAPP_TOKEN`.

3. **IoT Firmware (Physical Hardware)**:
   ```bash
   cp iot/config.h.example iot/config.h
   ```
   Add your local Wi-Fi SSID, password, and backend LAN IP.

4. **Mobile (Android Client)**:
   Obtain `google-services.json` from your Firebase project console and place it at `mobile/android/app/google-services.json`.

---

## Running the Applications Locally

### 1. Database Initialization
Ensure PostgreSQL is running locally and create the database:
```sql
CREATE DATABASE travelbuddy;
```
Run the schema initialization:
```bash
cd backend
npm install
node src/config/initDb.js
```

### 2. Central Backend Server
```bash
cd backend
npm install
npm run dev
# Server listens on http://localhost:5000
```
*Health check endpoint:* `http://localhost:5000/api/health`

### 3. Tourist Web Portal
```bash
cd web
npm install
npm start
# Web client opens on http://localhost:3000
```

### 4. Police Emergency Dashboard
```bash
cd police-dashboard
npm install
npm run dev
# Dashboard opens on http://localhost:5173
```
*Demo police credentials:* `police@travelbuddy.com` / `police123`

### 5. Hotel Partner Portal
```bash
cd hotel-portal
npm install
npm run dev
# Portal opens on http://localhost:5174
```
*Demo hotel credentials:* `hotel@travelbuddy.com` / `hotel123`

### 6. IoT Simulation Engine (No Hardware Required)
To run simulated tourist telemetry with fall detection and geofence events:
```bash
cd iot
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install requests
python demo_iot_simulator.py
```
To trigger a high-G impact fall test event:
```bash
python trigger_event.py fall
```

### 7. Flutter Mobile App
```bash
cd mobile
flutter pub get

# Run on connected Android emulator or physical device:
flutter run
```
*Note for Mobile API routing:* When testing on the Android emulator, `http://10.0.2.2:5000/api` is used by default in `mobile/lib/core/constants/api_constants.dart`. For a physical device on the same local network, set `baseUrl` to `http://YOUR_PC_LAN_IP:5000/api`.

---

## Online Deployment Readiness & Checklist

When preparing TravelBuddy for online cloud hosting:

1. **Database**: Provide a managed PostgreSQL connection URI (e.g. Neon, Supabase, Render PostgreSQL, Railway) via `DATABASE_URL` in `backend/.env`. Set `DATABASE_SSL=true` if required by the cloud host.
2. **CORS Configuration**: In production, configure `CORS_ORIGINS` in `backend/.env` with your frontend domain names (e.g. `https://travelbuddy.yourdomain.com,https://police.yourdomain.com,https://hotel.yourdomain.com`).
3. **Frontend API URL**: In `police-dashboard` and `hotel-portal`, set `VITE_API_BASE_URL=https://api.yourdomain.com/api` in your production deployment environment variables.
4. **Mobile API URL**: In `mobile/lib/core/constants/api_constants.dart`, update `baseUrl` to your deployed production backend URL (`https://api.yourdomain.com/api`).
5. **Firebase Admin Credentials**: For cloud hosts (Docker, Kubernetes, Render, Railway), provide the service account JSON path via `GOOGLE_APPLICATION_CREDENTIALS` or supply the JSON string directly via `FIREBASE_SERVICE_ACCOUNT`.
6. **HTTPS**: Ensure SSL/TLS certificates are active on your production reverse proxy (Nginx, Cloudflare, or cloud provider ingress).

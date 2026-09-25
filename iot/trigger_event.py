#!/usr/bin/env python3
"""
TravelBuddy Demo IoT Event Trigger Utility
==========================================
Use this script from any terminal to trigger events on the running IoT simulator,
or send a one-shot demo event directly to the backend.

Usage:
    python iot/trigger_event.py fall     # Triggers a simulated fall event (high-G impact)
    python iot/trigger_event.py breach   # Triggers entering the Ganga Rapids danger zone
    python iot/trigger_event.py safe     # Exits back into the safe tourist sector
"""

import sys
import os
import json
import urllib.request
import urllib.error

TRIGGER_FILE = os.path.join(os.path.dirname(__file__), ".demo_trigger")
DEFAULT_URL = os.environ.get("IOT_SERVER_URL", "http://localhost:5000/api/iot/telemetry")
DEFAULT_DEVICE_ID = os.environ.get("IOT_DEVICE_ID", "ESP32-MPU6050-NODE-01")
DEFAULT_DEVICE_KEY = os.environ.get("IOT_DEVICE_KEY", "tb_iot_esp32_sec_2026")

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python iot/trigger_event.py fall     -> Trigger high-G impact / fall")
        print("  python iot/trigger_event.py breach   -> Move into Ganga Rapids danger zone")
        print("  python iot/trigger_event.py safe     -> Move into verified safe tourist sector")
        return

    action = sys.argv[1].strip().lower()

    # 1. Notify running simulator via IPC trigger file
    try:
        with open(TRIGGER_FILE, "w") as f:
            f.write(action)
        print(f"[TRIGGER SENT] Notified running demo simulator: '{action.upper()}'")
    except Exception as e:
        print(f"[WARN] Could not write trigger file: {e}")

    # 2. Also send an immediate one-shot packet to the backend to guarantee instantaneous response
    lat = 30.0895 if action in ("breach", "danger") else 30.1260
    lng = 78.2730 if action in ("breach", "danger") else 78.3180
    is_fall = (action in ("fall", "impact"))

    payload = {
        "device_id": DEFAULT_DEVICE_ID,
        "source": "DEMO",
        "ax": 0.45 if is_fall else 0.02,
        "ay": 1.25 if is_fall else -0.01,
        "az": 2.85 if is_fall else 0.98,
        "gx": 185.0 if is_fall else 0.5,
        "gy": 220.0 if is_fall else -0.2,
        "gz": 95.0 if is_fall else 0.1,
        "pitch": 24.5 if is_fall else -0.6,
        "roll": -9.8 if is_fall else -1.2,
        "fall_detected": is_fall,
        "latitude": lat,
        "longitude": lng,
        "battery_level": 94.0
    }

    try:
        req = urllib.request.Request(
            DEFAULT_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-IoT-Device-Key": DEFAULT_DEVICE_KEY,
                "X-Telemetry-Source": "DEMO"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[BACKEND CONFIRMED] HTTP {resp.status} - Source: {data.get('source')} | Online: {data.get('online')}")
            if is_fall:
                print("🚨 Fall Impact Alert active! Backend emitted siren alert.")
            elif action == "breach":
                print("⛔ Restricted Zone Breach active! Police Dashboard counter = 1.")
            elif action == "safe":
                print("✓ Safe Sector active! Police Dashboard counter = 0.")
    except Exception as e:
        print(f"[BACKEND NOTICE] {e}")

if __name__ == "__main__":
    main()

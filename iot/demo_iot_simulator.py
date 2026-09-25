#!/usr/bin/env python3
"""
TravelBuddy DEMO IoT Simulator (ESP32 + MPU6050 Telemetry Source)
==================================================================
This simulator generates realistic MPU6050 6-axis IMU motion telemetry and GPS coordinates,
transmitting them periodically to the TravelBuddy backend IoT ingestion endpoint.

CRITICAL DISTINCTION:
- Source is explicitly flagged as "DEMO".
- Backend and Dashboards display: 🟢 DEMO IoT ONLINE
- Does NOT impersonate real hardware (never labeled "REAL IoT").
- Does NOT break or overwrite real ESP32 telemetry logic.

Usage:
    python iot/demo_iot_simulator.py                  # Normal safe telemetry (0 breaches)
    python iot/demo_iot_simulator.py --breach         # Start directly inside Ganga Rapids danger zone (1 breach)
    python iot/demo_iot_simulator.py --fall           # Trigger simulated fall immediately
    python iot/demo_iot_simulator.py --interval 2.0   # Transmit interval (default 2s)

Interactive Commands (Works instantly while running in PowerShell):
    Press 'f'          -> Trigger high-G impact / fall event (auto-clears in ~3s)
    Press 'b'          -> Toggle Danger Zone Breach on/off (Ganga Rapids Restricted Area)
    Press 'q'          -> Quit simulator
    Press Ctrl + C     -> Stop simulator

You can also trigger events from a separate terminal:
    python iot/trigger_event.py fall
    python iot/trigger_event.py breach
    python iot/trigger_event.py safe
"""

import sys
import os
import time
import math
import random
import json
import argparse
import threading
import urllib.request
import urllib.error

# Windows console direct keypress support
try:
    import msvcrt
except ImportError:
    msvcrt = None

# Force unbuffered/line-buffered stdout for real-time terminal output
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass

# Default Configuration
DEFAULT_URL = os.environ.get("IOT_SERVER_URL", "http://localhost:5000/api/iot/telemetry")
DEFAULT_DEVICE_ID = os.environ.get("IOT_DEVICE_ID", "ESP32-MPU6050-NODE-01")
DEFAULT_DEVICE_KEY = os.environ.get("IOT_DEVICE_KEY", "tb_iot_esp32_sec_2026")
DEFAULT_INTERVAL = 2.0

# Geographic Zones
SAFE_LAT = 30.1260      # Rishikesh Tapovan Tourist Safe Sector
SAFE_LNG = 78.3180
DANGER_LAT = 30.0895    # Ganga High-Current Rapids Restricted Danger Zone
DANGER_LNG = 78.2730

TRIGGER_FILE = os.path.join(os.path.dirname(__file__), ".demo_trigger")


class DemoIotSimulator:
    def __init__(self, url, device_id, device_key, interval=2.0, trigger_fall_now=False, fall_after=None, start_in_danger=False):
        self.url = url
        self.device_id = device_id
        self.device_key = device_key
        self.interval = max(0.5, float(interval))
        self.fall_after = fall_after
        self.running = False

        # Geofence state
        self.in_danger_zone = start_in_danger
        self.latitude = DANGER_LAT if start_in_danger else SAFE_LAT
        self.longitude = DANGER_LNG if start_in_danger else SAFE_LNG

        # Baseline physical state (Standing upright position: Z ~ 1.0G)
        self.packet_count = 0
        self.battery_level = 94.0

        # Fall simulation state machine
        self.fall_trigger_requested = trigger_fall_now
        self.fall_in_progress = 0  # countdown packets for fall event
        self.start_time = time.time()

    def toggle_danger_zone(self):
        """Toggle tourist between safe sector and restricted danger zone."""
        self.in_danger_zone = not self.in_danger_zone
        if self.in_danger_zone:
            self.latitude = DANGER_LAT
            self.longitude = DANGER_LNG
            print("\n" + "=" * 65)
            print("⛔ [DEMO GEOFENCE BREACH TRIGGERED] Entered Ganga Rapids Danger Zone!")
            print("=" * 65 + "\n")
        else:
            self.latitude = SAFE_LAT
            self.longitude = SAFE_LNG
            print("\n" + "=" * 65)
            print("✓ [SAFE SECTOR RESTORED] Exited danger zone back into verified safe perimeter.")
            print("=" * 65 + "\n")

    def request_fall(self):
        """Trigger fall event from keyboard or external trigger."""
        self.fall_trigger_requested = True

    def check_inputs(self):
        """Checks Windows console non-blocking keys and IPC trigger file."""
        # 1. Direct Windows keypress via msvcrt (instant, no Enter required!)
        if msvcrt:
            while msvcrt.kbhit():
                try:
                    ch = msvcrt.getch()
                    char = ch.decode("utf-8", errors="ignore").lower()
                    if char in ("f",):
                        self.request_fall()
                    elif char in ("b",):
                        self.toggle_danger_zone()
                    elif char in ("q",):
                        self.running = False
                except Exception:
                    pass

        # 2. File-based IPC trigger (from separate terminal)
        if os.path.exists(TRIGGER_FILE):
            try:
                with open(TRIGGER_FILE, "r") as f:
                    action = f.read().strip().lower()
                os.remove(TRIGGER_FILE)
                if action == "fall":
                    self.request_fall()
                elif action in ("breach", "danger"):
                    self.in_danger_zone = False
                    self.toggle_danger_zone()
                elif action == "safe":
                    self.in_danger_zone = True
                    self.toggle_danger_zone()
            except Exception:
                pass

    def generate_telemetry_packet(self):
        """Generates realistic MPU6050 6-DOF motion data with natural human jitter."""
        self.packet_count += 1
        elapsed = time.time() - self.start_time

        # Check if scheduled fall is due
        if self.fall_after is not None and elapsed >= self.fall_after and not self.fall_trigger_requested and self.fall_in_progress == 0:
            self.fall_trigger_requested = True
            self.fall_after = None

        # -------------------------------------------------------------
        # FALL / IMPACT EVENT SIMULATION
        # -------------------------------------------------------------
        if self.fall_trigger_requested:
            self.fall_trigger_requested = False
            self.fall_in_progress = 2  # 2 packets (~4s) of fall/impact anomaly
            print("\n" + "=" * 65)
            print("🚨 [DEMO FALL EVENT TRIGGERED] High-G Impact Spike & Sudden Inversion!")
            print("=" * 65 + "\n")

        if self.fall_in_progress > 0:
            self.fall_in_progress -= 1
            if self.fall_in_progress == 1:
                # Stage 1: Dynamic shock impact spike (> 2.8G + violent rotation)
                ax = round(0.45 + (random.random() - 0.5) * 0.1, 4)
                ay = round(1.25 + (random.random() - 0.5) * 0.2, 4)
                az = round(2.85 + (random.random() - 0.5) * 0.3, 4)
                gx = round(185.0 + (random.random() - 0.5) * 20.0, 2)
                gy = round(220.0 + (random.random() - 0.5) * 25.0, 2)
                gz = round(95.0 + (random.random() - 0.5) * 15.0, 2)
                fall_detected = True
            else:
                # Stage 2: Tilted resting position post-fall on the ground
                ax = round(0.85 + (random.random() - 0.5) * 0.05, 4)
                ay = round(0.35 + (random.random() - 0.5) * 0.05, 4)
                az = round(0.20 + (random.random() - 0.5) * 0.05, 4)
                gx = round((random.random() - 0.5) * 2.0, 2)
                gy = round((random.random() - 0.5) * 2.0, 2)
                gz = round((random.random() - 0.5) * 1.5, 2)
                fall_detected = True
        else:
            # ---------------------------------------------------------
            # NORMAL MOTION SIMULATION (Upright human standing/walking)
            # ---------------------------------------------------------
            t = elapsed * 0.8
            sway_x = math.sin(t) * 0.02
            sway_y = math.cos(t * 0.9) * 0.02
            noise_x = (random.random() - 0.5) * 0.03
            noise_y = (random.random() - 0.5) * 0.03
            noise_z = (random.random() - 0.5) * 0.04

            ax = round(0.02 + sway_x + noise_x, 4)
            ay = round(-0.01 + sway_y + noise_y, 4)
            az = round(0.98 + noise_z, 4)

            gx = round(((random.random() - 0.5) * 2.0), 2)
            gy = round(((random.random() - 0.5) * 2.0), 2)
            gz = round(((random.random() - 0.5) * 1.0), 2)
            fall_detected = False

        # Calculate vector magnitude (Total G-Force)
        total_g = round(math.sqrt(ax * ax + ay * ay + az * az), 2)

        # Inclinometer calculation: Pitch and Roll angles in degrees
        pitch = round(math.atan2(ay, math.sqrt(ax * ax + az * az)) * (180.0 / math.pi), 2)
        roll = round(math.atan2(-ax, az) * (180.0 / math.pi), 2)

        # Realistic slow battery drain (0.01% every few packets)
        if self.packet_count % 15 == 0 and self.battery_level > 5.0:
            self.battery_level = round(self.battery_level - 0.1, 1)

        # Subtle GPS micro-wander
        drift_lat = round(self.latitude + (random.random() - 0.5) * 0.00004, 6)
        drift_lng = round(self.longitude + (random.random() - 0.5) * 0.00004, 6)

        # Telemetry packet schema matching TravelBuddy /api/iot/telemetry
        payload = {
            "device_id": self.device_id,
            "source": "DEMO",  # Explicit software simulator identification
            "ax": ax,
            "ay": ay,
            "az": az,
            "gx": gx,
            "gy": gy,
            "gz": gz,
            "pitch": pitch,
            "roll": roll,
            "fall_detected": fall_detected,
            "latitude": drift_lat,
            "longitude": drift_lng,
            "battery_level": self.battery_level
        }

        return payload, total_g

    def send_packet(self, payload, total_g):
        """Transmits JSON payload over HTTP POST with device authentication."""
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.url,
            data=data_bytes,
            headers={
                "Content-Type": "application/json",
                "X-IoT-Device-Key": self.device_key,
                "X-Telemetry-Source": "DEMO",
                "User-Agent": "TravelBuddy-Demo-IoT-Simulator/1.0"
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                resp_body = resp.read().decode("utf-8")
                resp_json = json.loads(resp_body) if resp_body else {}
                return True, resp.status, resp_json
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else ""
            return False, e.code, err_body
        except urllib.error.URLError as e:
            return False, 0, str(e.reason)
        except Exception as e:
            return False, 0, str(e)

    def run(self):
        """Main periodic transmission loop."""
        self.running = True
        zone_label = "⛔ Ganga Rapids (Restricted Danger Zone)" if self.in_danger_zone else "✓ Rishikesh Tapovan (Verified Safe Sector)"
        print("\n" + "=" * 65)
        print("  🟢 TravelBuddy DEMO IoT Simulator (ESP32 + MPU6050)")
        print("=" * 65)
        print(f"Target URL:        {self.url}")
        print(f"Node Device ID:    {self.device_id}")
        print(f"Auth Key:          {self.device_key[:6]}***{self.device_key[-4:]}")
        print(f"Source Flag:       DEMO (Explicit Software Simulator)")
        print(f"Interval:          {self.interval}s")
        print(f"Initial Perimeter: {zone_label}")
        print(f"Stale Timeout:     12.0s (Backend fallback to SIMULATION when stopped)")
        print("-" * 65)
        print("  Interactive Key Controls (press directly in this terminal):")
        print("    [f] -> Trigger simulated High-G Fall / Impact")
        print("    [b] -> Toggle Danger Zone Breach ON / OFF")
        print("    [q] -> Quit / Stop simulator")
        print("-" * 65 + "\n")

        while self.running:
            payload, total_g = self.generate_telemetry_packet()
            success, code, resp = self.send_packet(payload, total_g)

            timestamp = time.strftime("%H:%M:%S")
            is_fall = payload["fall_detected"]
            is_breach = resp.get("geofence_breach", False) if isinstance(resp, dict) else False

            zone_str = "⛔ IN DANGER ZONE" if is_breach else "✓ Safe Sector"
            fall_str = "🚨 IMPACT / FALL!" if is_fall else "✓ Steady"

            if success:
                print(
                    f"[{timestamp}] Pkt #{self.packet_count:03d} | "
                    f"HTTP {code} | "
                    f"G={total_g:4.2f}g | "
                    f"Acc=({payload['ax']:+5.2f}, {payload['ay']:+5.2f}, {payload['az']:+5.2f}) | "
                    f"Bat={payload['battery_level']:.0f}% | "
                    f"{zone_str} | {fall_str}"
                )
            else:
                print(f"[{timestamp}] Pkt #{self.packet_count:03d} | ❌ TRANSMISSION ERROR: HTTP {code} - {resp}")

            # Sleep in short slices checking keyboard and trigger file
            sleep_slices = max(1, int(self.interval / 0.1))
            for _ in range(sleep_slices):
                if not self.running:
                    break
                self.check_inputs()
                try:
                    time.sleep(0.1)
                except KeyboardInterrupt:
                    self.running = False
                    break

        print("\n[STOPPED] Demo IoT Simulator stopped.")
        print("Notice: Telemetry transmission ceased.")
        print("After 12 seconds, backend will automatically transition device to:")
        print("🟡 SIMULATION / DEVICE OFFLINE\n")


def listen_keyboard_stdin(sim):
    """Fallback stdin reader for environments without msvcrt."""
    if msvcrt is not None:
        return  # msvcrt handles it in check_inputs()
    while sim.running:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            cmd = line.strip().lower()
            if cmd in ("f", "fall"):
                sim.request_fall()
            elif cmd in ("b", "breach"):
                sim.toggle_danger_zone()
            elif cmd in ("q", "quit"):
                sim.running = False
                break
        except Exception:
            break


def main():
    parser = argparse.ArgumentParser(description="TravelBuddy DEMO IoT Telemetry Simulator")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"Backend telemetry URL (default: {DEFAULT_URL})")
    parser.add_argument("--device-id", default=DEFAULT_DEVICE_ID, help=f"Device ID (default: {DEFAULT_DEVICE_ID})")
    parser.add_argument("--key", default=DEFAULT_DEVICE_KEY, help="IoT authentication key")
    parser.add_argument("--interval", type=float, default=DEFAULT_INTERVAL, help="Transmission interval in seconds")
    parser.add_argument("--fall", action="store_true", help="Simulate a fall impact immediately on startup")
    parser.add_argument("--fall-after", type=float, default=None, help="Trigger a fall impact after N seconds")
    parser.add_argument("--breach", action="store_true", help="Start directly inside the Ganga Rapids danger zone")

    args = parser.parse_args()

    sim = DemoIotSimulator(
        url=args.url,
        device_id=args.device_id,
        device_key=args.key,
        interval=args.interval,
        trigger_fall_now=args.fall,
        fall_after=args.fall_after,
        start_in_danger=args.breach
    )

    # Start fallback stdin thread for non-Windows environments
    if msvcrt is None:
        input_thread = threading.Thread(target=listen_keyboard_stdin, args=(sim,), daemon=True)
        input_thread.start()

    try:
        sim.run()
    except KeyboardInterrupt:
        sim.running = False
        print("\n[STOPPED] Demo IoT Simulator stopped.")


if __name__ == "__main__":
    main()

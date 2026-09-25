import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../models/user_model.dart';
import '../../services/siren_service.dart';

class IotSensorScreen extends StatefulWidget {
  final UserModel? user;

  const IotSensorScreen({
    super.key,
    this.user,
  });

  @override
  State<IotSensorScreen> createState() => _IotSensorScreenState();
}

class _IotSensorScreenState extends State<IotSensorScreen> {
  final TextEditingController _deviceIdController =
      TextEditingController(text: 'ESP32-MPU6050-NODE-01');

  bool _isAutoPolling = true;
  bool _isLoading = false;
  bool _isHardwareConnected = false;
  String _telemetrySource = 'SIMULATION'; // 'REAL' or 'SIMULATION'
  Timer? _pollingTimer;

  // Real-time telemetry data points (initialized with realistic static values)
  double _ax = 0.04;
  double _ay = -0.02;
  double _az = 0.98;
  double _gx = 1.2;
  double _gy = -0.8;
  double _gz = 0.4;
  double _pitch = -1.1;
  double _roll = -2.3;
  double _gForce = 0.98;
  double _batteryLevel = 92.0;
  bool _fallDetected = false;
  bool _geofenceBreach = false;
  String _zoneWarning = 'Normal Safe Zone';
  DateTime _lastSyncTime = DateTime.now();

  @override
  void initState() {
    super.initState();
    _fetchLatestTelemetry();
    _startPolling();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _deviceIdController.dispose();
    super.dispose();
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      if (_isAutoPolling) {
        _fetchLatestTelemetry(silent: true);
      }
    });
  }

  Future<void> _fetchLatestTelemetry({bool silent = false}) async {
    if (!silent) {
      setState(() => _isLoading = true);
    }

    final deviceId = _deviceIdController.text.trim();
    if (deviceId.isEmpty) return;

    try {
      final response = await ApiClient.dio.get('/iot/telemetry/latest/$deviceId');

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['telemetry'] ?? response.data;
        final rawSource = response.data['source'] ?? data['source'] ?? 'SIMULATION';
        final upperSource = rawSource.toString().toUpperCase();
        final isOnline = (response.data['online'] == true || data['online'] == true);
        final String sourceStr;
        if (upperSource == 'REAL') {
          sourceStr = 'REAL';
        } else if (upperSource == 'DEMO') {
          sourceStr = 'DEMO';
        } else {
          sourceStr = 'SIMULATION';
        }

        if (mounted) {
          setState(() {
            _telemetrySource = sourceStr;
            _isHardwareConnected = isOnline && (sourceStr == 'REAL' || sourceStr == 'DEMO');
            _ax = double.tryParse(data['ax']?.toString() ?? '') ?? _ax;
            _ay = double.tryParse(data['ay']?.toString() ?? '') ?? _ay;
            _az = double.tryParse(data['az']?.toString() ?? '') ?? _az;
            _gx = double.tryParse(data['gx']?.toString() ?? '') ?? _gx;
            _gy = double.tryParse(data['gy']?.toString() ?? '') ?? _gy;
            _gz = double.tryParse(data['gz']?.toString() ?? '') ?? _gz;
            _pitch = double.tryParse(data['pitch']?.toString() ?? '') ?? _pitch;
            _roll = double.tryParse(data['roll']?.toString() ?? '') ?? _roll;
            _batteryLevel = double.tryParse(data['battery_level']?.toString() ?? '') ?? _batteryLevel;
            _fallDetected = data['fall_detected'] == true;
            _gForce = double.tryParse(data['gForce']?.toString() ?? '') ?? sqrt(_ax * _ax + _ay * _ay + _az * _az);
            _lastSyncTime = DateTime.now();
            _isLoading = false;
          });
        }
        return;
      }
    } catch (_) {
      // If hardware endpoint is not yet actively sending data, keep fallback simulation active
      if (mounted) {
        setState(() {
          _telemetrySource = 'SIMULATION';
          _isHardwareConnected = false;
          _isLoading = false;
        });
      }
    }
  }

  // Simulation test helper to demonstrate reactive UI before connecting physical ESP32
  void _applySimulatedPreset({
    required double ax,
    required double ay,
    required double az,
    required double gx,
    required double gy,
    required double gz,
    required bool fall,
    required bool breach,
    required String statusText,
  }) {
    setState(() {
      _telemetrySource = 'SIMULATION';
      _isHardwareConnected = false;
      _ax = ax;
      _ay = ay;
      _az = az;
      _gx = gx;
      _gy = gy;
      _gz = gz;
      _pitch = atan2(ay, sqrt(ax * ax + az * az)) * 180.0 / pi;
      _roll = atan2(-ax, az) * 180.0 / pi;
      _gForce = sqrt(ax * ax + ay * ay + az * az);
      _fallDetected = fall;
      _geofenceBreach = breach;
      _zoneWarning = statusText;
      _lastSyncTime = DateTime.now();
    });

    if (fall || breach) {
      SirenService.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'IoT Wearable Sensor',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: _isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.refresh),
            onPressed: () => _fetchLatestTelemetry(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Device Pairing & Status Card
            _buildDeviceHeaderCard(theme),

            const SizedBox(height: 16),

            // 2. High-Priority Threat / Fall Indicator Banner
            _buildThreatStatusBanner(),

            const SizedBox(height: 18),

            // 3. Accelerometer & Gyroscope 6-DOF Metrics
            _buildMotionMetricsSection(theme),

            const SizedBox(height: 18),

            // 4. Inclinometer (Pitch & Roll Angles)
            _buildOrientationSection(theme),

            const SizedBox(height: 20),

            // 5. Hardware Simulator & Live Testing Controls
            _buildHardwareSimulatorCard(theme),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildDeviceHeaderCard(ThemeData theme) {
    final isReal = _telemetrySource == 'REAL' && _isHardwareConnected;
    final isDemo = _telemetrySource == 'DEMO' && _isHardwareConnected;

    final String statusBadgeTitle;
    final String statusBadgeSub;
    final Color badgeBg;
    final Color badgeBorder;
    final Color badgeTextColor;
    final Color badgeSubColor;
    final String nodeTypeLabel;

    if (isReal) {
      statusBadgeTitle = '🟢 REAL IoT ONLINE';
      statusBadgeSub = '● Hardware Connected';
      badgeBg = const Color(0xFF16A34A).withOpacity(0.18);
      badgeBorder = const Color(0xFF22C55E);
      badgeTextColor = const Color(0xFF4ADE80);
      badgeSubColor = const Color(0xFF86EFAC);
      nodeTypeLabel = 'Live Physical Sensor (ESP32)';
    } else if (isDemo) {
      statusBadgeTitle = '🟢 DEMO IoT ONLINE';
      statusBadgeSub = '● Simulator Streaming';
      badgeBg = const Color(0xFF059669).withOpacity(0.20);
      badgeBorder = const Color(0xFF10B981);
      badgeTextColor = const Color(0xFF34D399);
      badgeSubColor = const Color(0xFFA7F3D0);
      nodeTypeLabel = 'Software Telemetry Simulator (DEMO)';
    } else {
      statusBadgeTitle = '🟡 SIMULATION / DEVICE OFFLINE';
      statusBadgeSub = '● Fallback Active';
      badgeBg = const Color(0xFFD97706).withOpacity(0.18);
      badgeBorder = const Color(0xFFFBBF24);
      badgeTextColor = const Color(0xFFFDE047);
      badgeSubColor = const Color(0xFFFDE68A);
      nodeTypeLabel = 'Synthetic Fallback';
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Clear Source & Connection Indicator at the TOP of the IoT Section
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: badgeBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: badgeBorder,
                width: 1.2,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  statusBadgeTitle,
                  style: TextStyle(
                    color: badgeTextColor,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    letterSpacing: 0.4,
                  ),
                ),
                Text(
                  statusBadgeSub,
                  style: TextStyle(
                    color: badgeSubColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0EA5E9).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.developer_board, color: Color(0xFF38BDF8), size: 24),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'ESP32 + MPU6050',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        nodeTypeLabel,
                        style: const TextStyle(
                          color: Colors.white60,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              // Battery Indicator
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.battery_charging_full, color: Color(0xFF4ADE80), size: 16),
                    const SizedBox(width: 4),
                    Text(
                      '${_batteryLevel.toStringAsFixed(0)}%',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(color: Colors.white12, height: 1),
          const SizedBox(height: 14),

          // Device ID input
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _deviceIdController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    isDense: true,
                    labelText: 'Target Node ID',
                    labelStyle: const TextStyle(color: Colors.white60, fontSize: 12),
                    filled: true,
                    fillColor: Colors.black.withOpacity(0.2),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              IconButton.filledTonal(
                icon: const Icon(Icons.sync, size: 20),
                onPressed: () => _fetchLatestTelemetry(),
              ),
            ],
          ),

          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Auto-Sync: ${_isAutoPolling ? 'Active (2s)' : 'Paused'}',
                style: const TextStyle(color: Colors.white54, fontSize: 11),
              ),
              Text(
                'Last Sync: ${_lastSyncTime.hour.toString().padLeft(2, '0')}:${_lastSyncTime.minute.toString().padLeft(2, '0')}:${_lastSyncTime.second.toString().padLeft(2, '0')}',
                style: const TextStyle(color: Colors.white54, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildThreatStatusBanner() {
    final hasThreat = _fallDetected || _geofenceBreach;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: hasThreat ? const Color(0xFFFEE2E2) : const Color(0xFFDCFCE7),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: hasThreat ? const Color(0xFFEF4444) : const Color(0xFF22C55E),
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Icon(
            hasThreat ? Icons.warning_rounded : Icons.check_circle_rounded,
            color: hasThreat ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  hasThreat
                      ? (_fallDetected ? '⚠️ IMPACT / FREE-FALL DETECTED' : '⛔ GEOFENCE PERIMETER BREACH')
                      : '✓ Motion Normal & Safe Perimeter',
                  style: TextStyle(
                    color: hasThreat ? const Color(0xFF991B1B) : const Color(0xFF15803D),
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _zoneWarning,
                  style: TextStyle(
                    color: hasThreat ? const Color(0xFFB91C1C) : const Color(0xFF166534),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          if (hasThreat)
            TextButton(
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFFDC2626),
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              onPressed: () => SirenService.stop(),
              child: const Text('SILENCE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
            ),
        ],
      ),
    );
  }

  Widget _buildMotionMetricsSection(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Live MPU6050 Accelerometer',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF0284C7).withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Total: ${_gForce.toStringAsFixed(2)} G',
                style: const TextStyle(
                  color: Color(0xFF0284C7),
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // 3-Axis Accelerometer Cards
        Row(
          children: [
            Expanded(child: _buildAxisCard('X-Axis', _ax, 'g', const Color(0xFF3B82F6))),
            const SizedBox(width: 8),
            Expanded(child: _buildAxisCard('Y-Axis', _ay, 'g', const Color(0xFF10B981))),
            const SizedBox(width: 8),
            Expanded(child: _buildAxisCard('Z-Axis', _az, 'g', const Color(0xFF8B5CF6))),
          ],
        ),

        const SizedBox(height: 14),

        // 3-Axis Gyroscope Cards
        const Text(
          'Gyroscope (Angular Velocity)',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(child: _buildAxisCard('ω-X', _gx, '°/s', const Color(0xFFF59E0B))),
            const SizedBox(width: 8),
            Expanded(child: _buildAxisCard('ω-Y', _gy, '°/s', const Color(0xFFEC4899))),
            const SizedBox(width: 8),
            Expanded(child: _buildAxisCard('ω-Z', _gz, '°/s', const Color(0xFF6366F1))),
          ],
        ),
      ],
    );
  }

  Widget _buildAxisCard(String title, double value, String unit, Color color) {
    // Normalization for visual indicator (0.0 to 1.0)
    final clamped = (value.abs() / (unit == 'g' ? 2.0 : 250.0)).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
          const SizedBox(height: 4),
          Text(
            '${value >= 0 ? '+' : ''}${value.toStringAsFixed(2)} $unit',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color),
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: clamped,
              minHeight: 4,
              backgroundColor: color.withOpacity(0.15),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrientationSection(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Inclinometer & Tilt Orientation',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.screen_rotation, color: Color(0xFF0284C7), size: 28),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Pitch Angle (θ)', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        Text('${_pitch.toStringAsFixed(1)}°', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.stay_current_portrait, color: Color(0xFF8B5CF6), size: 28),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Roll Angle (φ)', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        Text('${_roll.toStringAsFixed(1)}°', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHardwareSimulatorCard(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFCBD5E1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.tune, size: 20, color: Color(0xFF475569)),
              const SizedBox(width: 8),
              const Text(
                'Hardware Simulation & Testing Modes',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Test real-time sensor metrics and siren triggers before connecting the physical ESP32 node:',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 12),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ActionChip(
                avatar: const Icon(Icons.accessibility_new, size: 16),
                label: const Text('Normal Standing'),
                onPressed: () => _applySimulatedPreset(
                  ax: 0.02,
                  ay: -0.01,
                  az: 0.99,
                  gx: 0.2,
                  gy: 0.1,
                  gz: 0.0,
                  fall: false,
                  breach: false,
                  statusText: 'Standing upright in safe sector',
                ),
              ),
              ActionChip(
                avatar: const Icon(Icons.directions_walk, size: 16),
                label: const Text('Active Walking'),
                onPressed: () => _applySimulatedPreset(
                  ax: 0.24,
                  ay: 0.15,
                  az: 1.12,
                  gx: 18.5,
                  gy: 24.0,
                  gz: -12.4,
                  fall: false,
                  breach: false,
                  statusText: 'Walking movement in safe sector',
                ),
              ),
              ActionChip(
                backgroundColor: const Color(0xFFFEE2E2),
                avatar: const Icon(Icons.south, size: 16, color: Color(0xFFDC2626)),
                label: const Text('Simulate Free-Fall (0.15 G)', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.bold)),
                onPressed: () => _applySimulatedPreset(
                  ax: 0.05,
                  ay: 0.08,
                  az: 0.12,
                  gx: 180.0,
                  gy: 220.0,
                  gz: 95.0,
                  fall: true,
                  breach: false,
                  statusText: 'Free-fall anomaly detected! Emergency siren sounding.',
                ),
              ),
              ActionChip(
                backgroundColor: const Color(0xFFFEE2E2),
                avatar: const Icon(Icons.dangerous, size: 16, color: Color(0xFFDC2626)),
                label: const Text('Simulate Danger Zone Breach', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.bold)),
                onPressed: () => _applySimulatedPreset(
                  ax: 0.08,
                  ay: -0.04,
                  az: 0.97,
                  gx: 2.1,
                  gy: -1.4,
                  gz: 0.8,
                  fall: false,
                  breach: true,
                  statusText: 'Breached Ganga Rapids Restricted Perimeter (Radius: 350m)',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

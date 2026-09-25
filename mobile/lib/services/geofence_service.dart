import 'dart:math';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../core/network/api_client.dart';
import '../models/restricted_zone_model.dart';
import 'siren_service.dart';

class GeofenceService {
  GeofenceService._();

  static List<RestrictedZoneModel> _cachedZones = [];
  static bool _isAlertShowing = false;

  static List<RestrictedZoneModel> get cachedZones => _cachedZones;

  /// Fetches active restricted danger zones from backend
  static Future<List<RestrictedZoneModel>> fetchRestrictedZones() async {
    try {
      final response = await ApiClient.dio.get('/geofence/zones');
      final data = response.data;

      if (data is Map && data['zones'] is List) {
        _cachedZones = (data['zones'] as List)
            .map((item) => RestrictedZoneModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }

      return _cachedZones;
    } on DioException catch (error) {
      debugPrint('Error fetching restricted zones: $error');
      return _cachedZones;
    }
  }

  /// Calculates Haversine distance in meters between two coordinates
  static double calculateDistanceMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const double earthRadius = 6371000; // meters
    final double dLat = _degreesToRadians(lat2 - lat1);
    final double dLon = _degreesToRadians(lon2 - lon1);

    final double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degreesToRadians(lat1)) *
            cos(_degreesToRadians(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);

    final double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadius * c;
  }

  static double _degreesToRadians(double degrees) {
    return degrees * (pi / 180.0);
  }

  /// Checks if given coordinates breach any restricted zones
  static RestrictedZoneModel? checkBreach(
    double latitude,
    double longitude, {
    List<RestrictedZoneModel>? zones,
  }) {
    final list = zones ?? _cachedZones;

    for (final zone in list) {
      if (!zone.active) continue;

      final distance = calculateDistanceMeters(
        latitude,
        longitude,
        zone.latitude,
        zone.longitude,
      );

      if (distance <= zone.radiusMeters) {
        return zone;
      }
    }

    return null;
  }

  /// Triggers audible siren and displays full-screen warning modal
  static void triggerBreachAlert(
    BuildContext context,
    RestrictedZoneModel zone,
  ) {
    if (_isAlertShowing) return;

    _isAlertShowing = true;

    // Start audible siren loop
    SirenService.start();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return PopScope(
          canPop: false,
          child: AlertDialog(
            backgroundColor: const Color(0xFF1E1B1B),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Color(0xFFEF4444), width: 2),
            ),
            title: const Row(
              children: [
                Icon(
                  Icons.warning_rounded,
                  color: Color(0xFFEF4444),
                  size: 32,
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'RESTRICTED ZONE BREACH',
                    style: TextStyle(
                      color: Color(0xFFEF4444),
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3F1D1D),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFB91C1C)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '⛔ ${zone.name}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        zone.description,
                        style: const TextStyle(
                          color: Color(0xFFFCA5A5),
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Danger: ${zone.dangerLevel}',
                            style: const TextStyle(
                              color: Color(0xFFEF4444),
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            'Radius: ${zone.radiusMeters}m',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  '⚠️ WARNING: You have entered a restricted danger zone. An emergency warning siren is sounding and your live location has been transmitted to Police Command.\n\nPlease turn back immediately to safety.',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
            ),
            actions: [
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                icon: const Icon(Icons.volume_off),
                label: const Text(
                  'DISMISS & SILENCE SIREN',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                onPressed: () {
                  SirenService.stop();
                  _isAlertShowing = false;
                  Navigator.of(ctx).pop();
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

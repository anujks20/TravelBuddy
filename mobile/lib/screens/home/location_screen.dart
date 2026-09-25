import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../../services/location_service.dart';
import '../../services/geofence_service.dart';
import '../../models/restricted_zone_model.dart';

class LocationScreen extends StatefulWidget {
  const LocationScreen({super.key});

  @override
  State<LocationScreen> createState() => _LocationScreenState();
}

class _LocationScreenState extends State<LocationScreen> {
  final MapController _mapController = MapController();

  Position? _position;
  List<RestrictedZoneModel> _restrictedZones = [];

  bool _isLoading = false;
  bool _sharingEnabled = false;

  Timer? _sharingTimer;

  String _status = 'Getting your current location...';

  @override
  void initState() {
    super.initState();
    _loadLocation();
  }

  Future<void> _loadLocation() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      _status = 'Getting your current location...';
    });

    try {
      final position =
          await LocationService.getCurrentPosition();

      final zones = await GeofenceService.fetchRestrictedZones();

      if (!mounted) return;

      setState(() {
        _position = position;
        _restrictedZones = zones;
        _isLoading = false;
        _status = 'Location updated successfully.';
      });

      _mapController.move(
        LatLng(
          position.latitude,
          position.longitude,
        ),
        15,
      );
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _status = error
            .toString()
            .replaceFirst('Exception: ', '');
      });
    }
  }

  void _startLocationSharing() {
    _sharingTimer?.cancel();

    _sendSharedLocation();

    _sharingTimer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _sendSharedLocation(),
    );
  }

  void _stopLocationSharing() {
    _sharingTimer?.cancel();
    _sharingTimer = null;
  }

  Future<void> _sendSharedLocation() async {
    if (!_sharingEnabled) {
      return;
    }

    try {
      final position =
          await LocationService.getCurrentPosition();

      await LocationService.updateLocation(
        position,
      );

      if (!mounted) return;

      setState(() {
        _position = position;
        _status = 'Location shared successfully.';
      });

      _mapController.move(
        LatLng(
          position.latitude,
          position.longitude,
        ),
        15,
      );
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _status = error
            .toString()
            .replaceFirst(
              'Exception: ',
              '',
            );
      });
    }
  }

  Future<void> _openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  Future<void> _openAppSettings() async {
    await Geolocator.openAppSettings();
  }

  String _formatCoordinate(double? value) {
    if (value == null) {
      return '--';
    }

    return value.toStringAsFixed(6);
  }

  @override
  void dispose() {
    _stopLocationSharing();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final position = _position;

    final mapCenter = position == null
        ? const LatLng(28.6139, 77.2090)
        : LatLng(
            position.latitude,
            position.longitude,
          );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Location'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadLocation,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text(
              'Your Location',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              'TravelBuddy uses your location to support safety features and emergency assistance.',
              style: TextStyle(
                color: Colors.grey.shade700,
                height: 1.4,
              ),
            ),

            const SizedBox(height: 20),

            // Interactive map
            ClipRRect(
              borderRadius:
                  BorderRadius.circular(18),
              child: SizedBox(
                height: 280,
                child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: mapCenter,
                    initialZoom:
                        position == null ? 5 : 15,
                    minZoom: 3,
                    maxZoom: 19,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName:
                          'com.example.mobile',
                    ),

                    // Red Circle Danger Overlays for Restricted Zones
                    if (_restrictedZones.isNotEmpty)
                      CircleLayer(
                        circles: _restrictedZones.map((zone) {
                          return CircleMarker(
                            point: LatLng(zone.latitude, zone.longitude),
                            radius: zone.radiusMeters.toDouble(),
                            useRadiusInMeter: true,
                            color: const Color(0xFFEF4444).withValues(alpha: 0.25),
                            borderColor: const Color(0xFFDC2626),
                            borderStrokeWidth: 2,
                          );
                        }).toList(),
                      ),

                    // Danger Zone Center Icons & Tourist Location Marker
                    MarkerLayer(
                      markers: [
                        ..._restrictedZones.map((zone) => Marker(
                              point: LatLng(zone.latitude, zone.longitude),
                              width: 38,
                              height: 38,
                              child: Tooltip(
                                message: '${zone.name} (${zone.radiusMeters}m)',
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF991B1B),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 1.5),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.3),
                                        blurRadius: 4,
                                      ),
                                    ],
                                  ),
                                  child: const Center(
                                    child: Text(
                                      '⛔',
                                      style: TextStyle(fontSize: 18),
                                    ),
                                  ),
                                ),
                              ),
                            )),
                        if (position != null)
                          Marker(
                            point: LatLng(
                              position.latitude,
                              position.longitude,
                            ),
                            width: 60,
                            height: 60,
                            child: Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
                              ),
                              child: Center(
                                child: Icon(
                                  Icons.my_location,
                                  color: Theme.of(context).colorScheme.primary,
                                  size: 34,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Map Legend & Zone Status Info
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (position != null)
                  Row(
                    children: [
                      Icon(
                        Icons.my_location,
                        size: 16,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 5),
                      const Text(
                        'Your location',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                if (_restrictedZones.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Row(
                      children: [
                        const Text('⛔', style: TextStyle(fontSize: 11)),
                        const SizedBox(width: 4),
                        Text(
                          '${_restrictedZones.length} Restricted Danger Zones',
                          style: const TextStyle(
                            color: Color(0xFF991B1B),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 18),

            Container(
              padding:
                  const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius:
                    BorderRadius.circular(18),
                color: Theme.of(context)
                    .colorScheme
                    .primary
                    .withValues(alpha: 0.08),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.location_on,
                    size: 54,
                    color: Theme.of(context)
                        .colorScheme
                        .primary,
                  ),

                  const SizedBox(height: 16),

                  Text(
                    position == null
                        ? 'Location unavailable'
                        : 'Location available',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight:
                          FontWeight.bold,
                    ),
                  ),

                  const SizedBox(height: 8),

                  Text(
                    _status,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color:
                          Colors.grey.shade700,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            _LocationDataCard(
              icon: Icons.public,
              title: 'Latitude',
              value: _formatCoordinate(
                position?.latitude,
              ),
            ),

            const SizedBox(height: 12),

            _LocationDataCard(
              icon: Icons.public,
              title: 'Longitude',
              value: _formatCoordinate(
                position?.longitude,
              ),
            ),

            const SizedBox(height: 12),

            _LocationDataCard(
              icon: Icons.gps_fixed,
              title: 'Accuracy',
              value: position == null
                  ? '--'
                  : '${position.accuracy.toStringAsFixed(1)} m',
            ),

            const SizedBox(height: 24),

            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed:
                    _isLoading
                        ? null
                        : _loadLocation,
                icon: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child:
                            CircularProgressIndicator(
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(
                        Icons.my_location,
                      ),
                label: Text(
                  _isLoading
                      ? 'Getting Location...'
                      : 'Refresh Location',
                ),
              ),
            ),

            const SizedBox(height: 16),

            Card(
              child: SwitchListTile(
                value: _sharingEnabled,
                onChanged: (value) {
                  setState(() {
                    _sharingEnabled = value;
                  });

                  if (value) {
                    _startLocationSharing();
                  } else {
                    _stopLocationSharing();

                    setState(() {
                      _status =
                          'Location sharing is turned off.';
                    });
                  }
                },
                secondary: Icon(
                  _sharingEnabled
                      ? Icons.location_on
                      : Icons.location_off,
                ),
                title: const Text(
                  'Location Sharing',
                  style: TextStyle(
                    fontWeight:
                        FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  _sharingEnabled
                      ? 'Sharing your latest location every 15 seconds.'
                      : 'Location sharing is currently off.',
                ),
              ),
            ),

            const SizedBox(height: 12),

            OutlinedButton.icon(
              onPressed:
                  _openLocationSettings,
              icon: const Icon(
                Icons.gps_fixed,
              ),
              label: const Text(
                'Open GPS Settings',
              ),
            ),

            const SizedBox(height: 8),

            OutlinedButton.icon(
              onPressed: _openAppSettings,
              icon: const Icon(
                Icons.settings,
              ),
              label: const Text(
                'Open App Permissions',
              ),
            ),

            const SizedBox(height: 24),

            Container(
              padding:
                  const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius:
                    BorderRadius.circular(12),
                color: Colors.grey.shade100,
              ),
              child: const Row(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 20,
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Location is requested only when TravelBuddy needs it. During an SOS, your current location is attached to the emergency alert.',
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocationDataCard
    extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _LocationDataCard({
    required this.icon,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 15,
      ),
      decoration: BoxDecoration(
        border: Border.all(
          color: Colors.grey.shade300,
        ),
        borderRadius:
            BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(icon),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontWeight:
                    FontWeight.w600,
              ),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontWeight:
                  FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
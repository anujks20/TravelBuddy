import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../../services/location_service.dart';
import '../../services/siren_service.dart';

class EmergencyFriendTrackingScreen extends StatefulWidget {
  final String? sosReference;
  final String? incidentId;
  final String? touristName;
  final double? initialLatitude;
  final double? initialLongitude;
  final double? accuracy;
  final String? emergencyType;
  final String? timestamp;

  const EmergencyFriendTrackingScreen({
    super.key,
    this.sosReference,
    this.incidentId,
    this.touristName,
    this.initialLatitude,
    this.initialLongitude,
    this.accuracy,
    this.emergencyType,
    this.timestamp,
  });

  @override
  State<EmergencyFriendTrackingScreen> createState() =>
      _EmergencyFriendTrackingScreenState();
}

class _EmergencyFriendTrackingScreenState
    extends State<EmergencyFriendTrackingScreen> {
  final MapController _mapController = MapController();

  late double? _touristLat;
  late double? _touristLng;
  late double? _accuracy;
  late String _touristName;
  late String _sosRef;
  late String _emergencyType;
  String _status = 'ACTIVE';
  String? _touristPhone;

  Position? _friendPosition;
  double? _distanceMeters;
  bool _isRefreshing = false;
  bool _sirenActive = SirenService.isPlaying;

  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _touristLat = widget.initialLatitude;
    _touristLng = widget.initialLongitude;
    _accuracy = widget.accuracy;
    _touristName = widget.touristName ?? 'Tourist in Danger';
    _sosRef = widget.sosReference ?? 'SOS-EMERGENCY';
    _emergencyType = widget.emergencyType ?? 'GENERAL';

    _initFriendLocation();
    _fetchAuthoritativeSos();

    // Auto-refresh coordinates every 10 seconds while active
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted && _status == 'ACTIVE') {
        _fetchAuthoritativeSos(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _initFriendLocation() async {
    try {
      final pos = await LocationService.getCurrentPosition();
      if (!mounted) return;
      setState(() {
        _friendPosition = pos;
        _calculateDistance();
      });
    } catch (_) {
      // Optional friend position
    }
  }

  void _calculateDistance() {
    if (_friendPosition != null &&
        _touristLat != null &&
        _touristLng != null) {
      const distance = Distance();
      final meters = distance.as(
        LengthUnit.Meter,
        LatLng(_friendPosition!.latitude, _friendPosition!.longitude),
        LatLng(_touristLat!, _touristLng!),
      );
      setState(() {
        _distanceMeters = meters;
      });
    }
  }

  Future<void> _fetchAuthoritativeSos({bool silent = false}) async {
    final identifier = widget.sosReference ?? widget.incidentId;
    if (identifier == null || identifier.isEmpty) return;

    if (!silent) {
      setState(() => _isRefreshing = true);
    }

    try {
      final endpoint = ApiConstants.sosDetailsEndpoint(identifier);
      final response = await ApiClient.dio.get(endpoint);
      final data = Map<String, dynamic>.from(response.data as Map);

      if (data['success'] == true && data['sos'] != null) {
        final sos = Map<String, dynamic>.from(data['sos'] as Map);
        final tourist = data['tourist'] is Map
            ? Map<String, dynamic>.from(data['tourist'] as Map)
            : null;

        final newLat = double.tryParse(sos['latitude']?.toString() ?? '');
        final newLng = double.tryParse(sos['longitude']?.toString() ?? '');
        final newAcc = double.tryParse(sos['location_accuracy']?.toString() ?? '');

        if (!mounted) return;
        setState(() {
          if (newLat != null) _touristLat = newLat;
          if (newLng != null) _touristLng = newLng;
          if (newAcc != null) _accuracy = newAcc;
          _status = sos['status']?.toString() ?? _status;
          if (tourist != null) {
            _touristName = tourist['full_name']?.toString() ?? _touristName;
            _touristPhone = tourist['phone']?.toString();
          }
          _calculateDistance();
        });

        // Recenter map if tourist position changed
        if (_touristLat != null && _touristLng != null) {
          _mapController.move(LatLng(_touristLat!, _touristLng!), 15);
        }
      }
    } catch (_) {
      // Keep existing payload data on failure
    } finally {
      if (mounted && !silent) {
        setState(() => _isRefreshing = false);
      }
    }
  }

  Future<void> _silenceSiren() async {
    await SirenService.stop();
    if (!mounted) return;
    setState(() {
      _sirenActive = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Siren silenced on your phone. SOS remains active on server.'),
        backgroundColor: Colors.blueGrey,
        duration: Duration(seconds: 3),
      ),
    );
  }

  Future<void> _callTourist() async {
    if (_touristPhone == null || _touristPhone!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Phone number not available for this tourist.')),
      );
      return;
    }
    final uri = Uri.parse('tel:$_touristPhone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _openDirections() async {
    if (_touristLat == null || _touristLng == null) return;
    final url =
        'https://www.google.com/maps/dir/?api=1&destination=$_touristLat,$_touristLng';
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasCoords = _touristLat != null && _touristLng != null;
    final touristLatLng =
        hasCoords ? LatLng(_touristLat!, _touristLng!) : const LatLng(20.5937, 78.9629);

    final isResolved = _status == 'RESOLVED';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '🚨 EMERGENCY SOS TRACKER',
              style: TextStyle(
                color: Color(0xFFEF4444),
                fontSize: 14,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
              ),
            ),
            Text(
              _sosRef,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 12,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: _isRefreshing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.refresh, color: Colors.white),
            tooltip: 'Refresh Location',
            onPressed: () => _fetchAuthoritativeSos(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Emergency Header Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isResolved
                  ? const Color(0xFF14532D)
                  : const Color(0xFF7F1D1D),
              border: Border(
                bottom: BorderSide(
                  color: isResolved ? Colors.green : Colors.red,
                  width: 2,
                ),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  isResolved ? Icons.check_circle : Icons.warning_amber_rounded,
                  color: Colors.white,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isResolved
                            ? 'EMERGENCY RESOLVED'
                            : 'CRITICAL ALERT: $_touristName needs help!',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Status: $_status • Type: $_emergencyType',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_sirenActive)
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFFDC2626),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    ),
                    icon: const Icon(Icons.volume_off, size: 16),
                    label: const Text(
                      'Silence',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                    onPressed: _silenceSiren,
                  ),
              ],
            ),
          ),

          // Distance and Telemetry Strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF1E293B),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.near_me, color: Color(0xFF38BDF8), size: 16),
                    const SizedBox(width: 6),
                    Text(
                      _distanceMeters != null
                          ? _distanceMeters! > 1000
                              ? '${(_distanceMeters! / 1000).toStringAsFixed(2)} km away'
                              : '${_distanceMeters!.toStringAsFixed(0)} m away'
                          : 'Calculating distance...',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                if (_accuracy != null)
                  Text(
                    'GPS Accuracy: ±${_accuracy!.toStringAsFixed(1)}m',
                    style: const TextStyle(
                      color: Colors.white54,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),

          // Interactive Map Area
          Expanded(
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: touristLatLng,
                    initialZoom: 15,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.example.mobile',
                    ),
                    MarkerLayer(
                      markers: [
                        // Tourist Marker
                        if (hasCoords)
                          Marker(
                            point: touristLatLng,
                            width: 80,
                            height: 80,
                            child: Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFDC2626),
                                    borderRadius: BorderRadius.circular(4),
                                    boxShadow: const [
                                      BoxShadow(color: Colors.black38, blurRadius: 4),
                                    ],
                                  ),
                                  child: Text(
                                    _touristName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                const Icon(
                                  Icons.location_on,
                                  color: Color(0xFFDC2626),
                                  size: 40,
                                ),
                              ],
                            ),
                          ),

                        // Friend's Location Marker
                        if (_friendPosition != null)
                          Marker(
                            point: LatLng(
                              _friendPosition!.latitude,
                              _friendPosition!.longitude,
                            ),
                            width: 60,
                            height: 60,
                            child: const Column(
                              children: [
                                Icon(
                                  Icons.my_location,
                                  color: Color(0xFF0284C7),
                                  size: 32,
                                ),
                                Text(
                                  'You',
                                  style: TextStyle(
                                    color: Color(0xFF0284C7),
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),

                // Map control buttons
                Positioned(
                  right: 16,
                  bottom: 16,
                  child: Column(
                    children: [
                      FloatingActionButton.small(
                        heroTag: 'recenterTourist',
                        backgroundColor: const Color(0xFFDC2626),
                        onPressed: () {
                          if (hasCoords) {
                            _mapController.move(touristLatLng, 15);
                          }
                        },
                        child: const Icon(Icons.person_pin_circle, color: Colors.white),
                      ),
                      const SizedBox(height: 8),
                      if (_friendPosition != null)
                        FloatingActionButton.small(
                          heroTag: 'recenterFriend',
                          backgroundColor: const Color(0xFF0284C7),
                          onPressed: () {
                            _mapController.move(
                              LatLng(
                                _friendPosition!.latitude,
                                _friendPosition!.longitude,
                              ),
                              15,
                            );
                          },
                          child: const Icon(Icons.my_location, color: Colors.white),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Bottom Action Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B),
              border: Border(
                top: BorderSide(color: Color(0xFF334155), width: 1),
              ),
            ),
            child: Row(
              children: [
                if (_touristPhone != null) ...[
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.call),
                      label: const Text('Call Tourist'),
                      onPressed: _callTourist,
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    icon: const Icon(Icons.directions),
                    label: const Text('Directions'),
                    onPressed: _openDirections,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

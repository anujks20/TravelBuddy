import 'dart:async';
import 'package:flutter/material.dart';

import 'package:url_launcher/url_launcher.dart';

import '../../core/constants/api_constants.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../services/location_service.dart';
import '../../services/siren_service.dart';
import '../../services/sos_service.dart';
import '../../services/geofence_service.dart';
import '../../models/restricted_zone_model.dart';
import 'emergency_contacts_screen.dart';
import 'voice_translator_screen.dart';
import 'location_screen.dart';
import 'trips_screen.dart';
import 'hotel_stay_screen.dart';
import 'profile_screen.dart';
import 'iot_sensor_screen.dart';

class HomeScreen extends StatefulWidget {
  final UserModel user;

  const HomeScreen({
    super.key,
    required this.user,
  });

  @override
  State<HomeScreen> createState() =>
      _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late UserModel _currentUser;
  bool _sendingSos = false;
  Timer? _geofenceTimer;

  @override
  void initState() {
    super.initState();
    _currentUser = widget.user;
    _initGeofenceMonitoring();
  }

  @override
  void dispose() {
    _geofenceTimer?.cancel();
    super.dispose();
  }

  Future<void> _initGeofenceMonitoring() async {
    try {
      final zones = await GeofenceService.fetchRestrictedZones();
      debugPrint('Loaded ${zones.length} active restricted zones.');

      // Check current location once on startup
      _checkCurrentLocationForDanger();

      // Periodically check location against danger zones every 30 seconds
      _geofenceTimer = Timer.periodic(const Duration(seconds: 30), (_) {
        _checkCurrentLocationForDanger();
      });
    } catch (e) {
      debugPrint('Geofence init error: $e');
    }
  }

  Future<void> _checkCurrentLocationForDanger() async {
    try {
      final position = await LocationService.getCurrentPosition();
      final result = await LocationService.updateLocation(position);

      final breachedZone = GeofenceService.checkBreach(
        position.latitude,
        position.longitude,
      );

      if (breachedZone != null && mounted) {
        GeofenceService.triggerBreachAlert(context, breachedZone);
      }
    } catch (e) {
      debugPrint('Location ping check notice: $e');
    }
  }

  Future<void> _openProfile() async {
    final updated = await Navigator.of(context).push<UserModel>(
      MaterialPageRoute(
        builder: (_) => ProfileScreen(user: _currentUser),
      ),
    );

    if (updated != null && mounted) {
      setState(() {
        _currentUser = updated;
      });
    }
  }

  Future<void> _confirmSos() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Row(
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: Color(0xFFD32F2F),
              ),
              SizedBox(width: 10),
              Text('Emergency SOS'),
            ],
          ),
          content: const Text(
            'Are you sure you want to send an emergency alert? Your current location will be shared with TravelBuddy emergency services.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(false);
              },
              child: const Text('CANCEL'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor:
                    Color(0xFFD32F2F),
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                Navigator.of(context).pop(true);
              },
              child: const Text('SEND SOS'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      await _sendSos();
    }
  }

  Future<void> _sendSos() async {
    if (_sendingSos) {
      return;
    }

    setState(() {
      _sendingSos = true;
    });

    try {
      final position =
          await LocationService.getCurrentPosition();

      final result = await SosService.createSos(
        latitude: position.latitude,
        longitude: position.longitude,
      );

      // Start the tourist's emergency siren only
      // after the backend confirms the SOS.
      await SirenService.start();

      if (!mounted) {
        return;
      }

      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => SosActiveScreen(
            result: result,
          ),
        ),
      );
    } catch (error) {
      await SirenService.stop();

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor:
              const Color(0xFFD32F2F),
          content: Text(
            error
                .toString()
                .replaceFirst(
                  'Exception: ',
                  '',
                ),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _sendingSos = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final firstName =
        _currentUser.fullName.split(' ').first;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'TravelBuddy',
          style: TextStyle(
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'My Profile',
            icon: const Icon(
              Icons.account_circle_outlined,
            ),
            onPressed: _openProfile,
          ),
          IconButton(
            tooltip: 'Logout',
            onPressed: () async {
              await SirenService.stop();
              await AuthService.logout();

              if (!context.mounted) {
                return;
              }

              Navigator.of(context)
                  .pushNamedAndRemoveUntil(
                '/',
                (route) => false,
              );
            },
            icon: const Icon(
              Icons.logout,
            ),
          ),
        ],
      ),
      body: SafeArea(
  child: ScrollConfiguration(
    behavior: ScrollConfiguration.of(
      context,
    ).copyWith(
      overscroll: false,
    ),
    child: SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        20,
        8,
        20,
        28,
      ),
          child: Column(
            crossAxisAlignment:
                CrossAxisAlignment.start,
            children: [
              Text(
                'Hello, $firstName!',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF102A43),
                ),
              ),

              const SizedBox(height: 6),

              const Text(
                'Your safe travel companion.',
                style: TextStyle(
                  color: Color(0xFF6B7C93),
                  fontSize: 15,
                ),
              ),

              const SizedBox(height: 24),

              InkWell(
                onTap: _openProfile,
                borderRadius:
                    BorderRadius.circular(20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF176B87),
                    borderRadius:
                        BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment:
                            MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Your Tourist UID',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius:
                                  BorderRadius.circular(10),
                            ),
                            child: const Row(
                              children: [
                                Icon(
                                  Icons.edit_note,
                                  color: Colors.white,
                                  size: 14,
                                ),
                                SizedBox(width: 4),
                                Text(
                                  'Profile',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight:
                                        FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      Text(
                        _currentUser.touristUid,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight:
                              FontWeight.w800,
                          letterSpacing: 1,
                        ),
                      ),

                      const SizedBox(height: 8),

                      const Text(
                        'Use this UID when interacting with TravelBuddy safety services. Tap to manage profile.',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              const Text(
                'Safety',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF102A43),
                ),
              ),

              const SizedBox(height: 12),

              _FeatureCard(
                icon: Icons.sos,
                title: 'Emergency SOS',
                subtitle:
                    'Send an emergency alert with your location.',
                danger: true,
                loading: _sendingSos,
                onTap: _confirmSos,
              ),

              const SizedBox(height: 12),

              _FeatureCard(
                icon: Icons.location_on_outlined,
                title: 'Location',
                subtitle:
                    'Manage your location sharing.',
                onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const LocationScreen(),
            ),
          );
        },
      ),

              const SizedBox(height: 12),

              _FeatureCard(
                icon: Icons.contacts_outlined,
                title: 'Emergency Contacts',
                subtitle:
                    'Manage people who should be alerted.',
                onTap: () {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            const EmergencyContactsScreen(),
      ),
    );
  },
),

              const SizedBox(height: 12),

              _FeatureCard(
                icon: Icons.sensors_rounded,
                title: 'IoT Wearable Sensor (ESP32)',
                subtitle:
                    'Live MPU6050 accelerometer, gyro & danger telemetry.',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => IotSensorScreen(
                        user: _currentUser,
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 12),

              _FeatureCard(
                icon: Icons.translate_outlined,
                title: 'Voice Translator',
                subtitle:
                    'Translate conversations between languages.',
                onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const VoiceTranslatorScreen(),
            ),
          );
        },
      ),

              const SizedBox(height: 20),

              const Text(
                'Travel',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF102A43),
                ),
              ),

              const SizedBox(height: 12),

              _FeatureCard(
                icon: Icons.map_outlined,
                title: 'My Trips',
                subtitle:
                    'View and manage your trips.',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const TripsScreen(),
                    ),
                  );
                },
              ),

              const SizedBox(height: 12),

              _FeatureCard(
                icon: Icons.hotel_outlined,
                title: 'Hotel Stay',
                subtitle:
                    'View your linked hotel information.',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => HotelStayScreen(
                        user: _currentUser,
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 12),

              _FeatureCard(
                icon: Icons.travel_explore_rounded,
                title: 'Plan Travel on Web',
                subtitle:
                    'Open AI trip planner with interactive maps & optimizer.',
                onTap: () async {
                  final uri = Uri.parse(ApiConstants.webPlannerUrl);
                  try {
                    final launched = await launchUrl(
                      uri,
                      mode: LaunchMode.externalApplication,
                    );
                    if (!launched && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Could not open web trip planner.'),
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Error launching web planner: $e'),
                        ),
                      );
                    }
                  }
                },
              ),

              const SizedBox(height: 20),

              const Text(
                'Account & Security',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF102A43),
                ),
              ),

              const SizedBox(height: 12),

              _FeatureCard(
                icon: Icons.person_outline_rounded,
                title: 'Tourist Profile & Settings',
                subtitle:
                    'Manage personal details, view identity & change password.',
                onTap: _openProfile,
              ),
            ],
          ),
        ),
      ),
      ),
    );
  }
}

class SosActiveScreen extends StatefulWidget {
  final SosResult result;

  const SosActiveScreen({
    super.key,
    required this.result,
  });

  @override
  State<SosActiveScreen> createState() =>
      _SosActiveScreenState();
}

class _SosActiveScreenState
    extends State<SosActiveScreen> {
  Timer? _statusTimer;

  late SosResult _currentResult;

  bool _checkingStatus = false;

  @override
  void initState() {
    super.initState();

    _currentResult = widget.result;

    _startStatusPolling();
  }

  void _startStatusPolling() {
    _statusTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _checkSosStatus(),
    );
  }

  Future<void> _checkSosStatus() async {
    if (_checkingStatus) {
      return;
    }

    _checkingStatus = true;

    try {
      final updated =
          await SosService.getSosStatus(
        _currentResult.sosReference,
      );

      if (!mounted || updated == null) {
        return;
      }

      if (updated.status !=
          _currentResult.status) {
        setState(() {
          _currentResult = updated;
        });

        if (updated.status == 'RESOLVED') {
          await SirenService.stop();

          if (!mounted) {
            return;
          }

          ScaffoldMessenger.of(context)
              .showSnackBar(
            const SnackBar(
              backgroundColor:
                  Color(0xFF2E7D32),
              content: Text(
                'Emergency SOS has been resolved by police.',
              ),
            ),
          );
        }

        if (updated.status ==
            'ACKNOWLEDGED') {
          if (!mounted) {
            return;
          }

          ScaffoldMessenger.of(context)
              .showSnackBar(
            const SnackBar(
              content: Text(
                'Police have acknowledged your SOS.',
              ),
            ),
          );
        }
      }
    } finally {
      _checkingStatus = false;
    }
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    SirenService.stop();
    super.dispose();
  }

  Future<void> _stopSiren() async {
    await SirenService.stop();

    if (!mounted) {
      return;
    }

    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final sirenPlaying =
        SirenService.isPlaying;

    final isResolved =
        _currentResult.status == 'RESOLVED';

    final isAcknowledged =
        _currentResult.status ==
        'ACKNOWLEDGED';

    return PopScope(
      canPop: isResolved,
      child: Scaffold(
        backgroundColor:
            isResolved
                ? const Color(0xFFF1F8F3)
                : const Color(0xFFFFF5F5),
        appBar: AppBar(
          automaticallyImplyLeading: false,
          backgroundColor:
              isResolved
                  ? const Color(0xFFF1F8F3)
                  : const Color(0xFFFFF5F5),
          title: Text(
            isResolved
                ? 'Emergency Resolved'
                : 'Emergency Active',
            style: TextStyle(
              color: isResolved
                  ? const Color(0xFF1B5E20)
                  : const Color(0xFF7F1D1D),
              fontWeight:
                  FontWeight.w800,
            ),
          ),
        ),
        body: SafeArea(
          child: Padding(
            padding:
                const EdgeInsets.all(24),
            child: Column(
              children: [
                const Spacer(),

                Container(
                  width: 110,
                  height: 110,
                  decoration: BoxDecoration(
                    color: isResolved
                        ? const Color(0xFF2E7D32)
                        : const Color(0xFFD32F2F),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isResolved
                        ? Icons.check
                        : Icons.sos,
                    color: Colors.white,
                    size: 58,
                  ),
                ),

                const SizedBox(height: 24),

                Text(
                  isResolved
                      ? 'SOS RESOLVED'
                      : isAcknowledged
                          ? 'SOS ACKNOWLEDGED'
                          : 'SOS SENT',
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight:
                        FontWeight.w900,
                    color: isResolved
                        ? const Color(0xFF1B5E20)
                        : const Color(0xFF7F1D1D),
                    letterSpacing: 1,
                  ),
                ),

                const SizedBox(height: 10),

                Text(
                  isResolved
                      ? 'Police have resolved your emergency alert.'
                      : isAcknowledged
                          ? 'Police have received and acknowledged your emergency alert.'
                          : sirenPlaying
                              ? 'Emergency siren is active.'
                              : 'Your emergency alert has been sent to TravelBuddy.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 16,
                    color:
                        Color(0xFF6B4F4F),
                  ),
                ),

                const SizedBox(height: 28),

                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius:
                        BorderRadius.circular(
                      18,
                    ),
                    border: Border.all(
                      color: isResolved
                          ? const Color(
                              0xFFC8E6C9,
                            )
                          : const Color(
                              0xFFFFCDD2,
                            ),
                    ),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        'SOS Reference',
                        style: TextStyle(
                          color:
                              Color(0xFF7B8794),
                          fontSize: 13,
                        ),
                      ),

                      const SizedBox(height: 6),

                      Text(
                        _currentResult
                            .sosReference,
                        style:
                            const TextStyle(
                          fontSize: 22,
                          fontWeight:
                              FontWeight.w800,
                          color:
                              Color(0xFF102A43),
                        ),
                      ),

                      const SizedBox(height: 14),

                      Row(
                        mainAxisAlignment:
                            MainAxisAlignment
                                .center,
                        children: [
                          const Icon(
                            Icons.location_on,
                            color:
                                Color(0xFFD32F2F),
                            size: 20,
                          ),
                          const SizedBox(
                            width: 6,
                          ),
                          Text(
                            '${_currentResult.latitude?.toStringAsFixed(5)}, ${_currentResult.longitude?.toStringAsFixed(5)}',
                            style:
                                const TextStyle(
                              fontSize: 14,
                              color:
                                  Color(0xFF52606D),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),

                      Container(
                        padding:
                            const EdgeInsets
                                .symmetric(
                          horizontal: 14,
                          vertical: 7,
                        ),
                        decoration:
                            BoxDecoration(
                          color: isResolved
                              ? const Color(
                                  0xFFE8F5E9,
                                )
                              : isAcknowledged
                                  ? const Color(
                                      0xFFFFF3E0,
                                    )
                                  : const Color(
                                      0xFFFFEBEE,
                                    ),
                          borderRadius:
                              BorderRadius
                                  .circular(20),
                        ),
                        child: Text(
                          _currentResult
                              .status,
                          style:
                              TextStyle(
                            color: isResolved
                                ? const Color(
                                    0xFF2E7D32,
                                  )
                                : isAcknowledged
                                    ? const Color(
                                        0xFFE65100,
                                      )
                                    : const Color(
                                        0xFFD32F2F,
                                      ),
                            fontWeight:
                                FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                if (sirenPlaying &&
                    !isResolved)
                  SizedBox(
                    width: double.infinity,
                    child:
                        ElevatedButton.icon(
                      onPressed:
                          _stopSiren,
                      style: ElevatedButton
                          .styleFrom(
                        backgroundColor:
                            const Color(
                          0xFFD32F2F,
                        ),
                        foregroundColor:
                            Colors.white,
                        minimumSize:
                            const Size
                                .fromHeight(
                          52,
                        ),
                        shape:
                            RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius
                                  .circular(
                            14,
                          ),
                        ),
                      ),
                      icon: const Icon(
                        Icons.volume_off,
                      ),
                      label: const Text(
                        'STOP SIREN',
                        style: TextStyle(
                          fontWeight:
                              FontWeight.w800,
                        ),
                      ),
                    ),
                  ),

                if (sirenPlaying &&
                    !isResolved)
                  const SizedBox(height: 10),

                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () async {
                      await SirenService.stop();

                      if (!context.mounted) {
                        return;
                      }

                      Navigator.of(context)
                          .pop();
                    },
                    style: OutlinedButton
                        .styleFrom(
                      minimumSize:
                          const Size
                              .fromHeight(52),
                      foregroundColor:
                          const Color(
                        0xFF52606D,
                      ),
                      side:
                          const BorderSide(
                        color: Color(
                          0xFFD9E2EC,
                        ),
                      ),
                      shape:
                          RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(
                          14,
                        ),
                      ),
                    ),
                    child: Text(
                      isResolved
                          ? 'Return to TravelBuddy'
                          : 'Return to TravelBuddy',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool danger;
  final bool loading;

  const _FeatureCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.danger = false,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: loading ? null : onTap,
      borderRadius:
          BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius:
              BorderRadius.circular(16),
          border: Border.all(
            color: danger
                ? const Color(0xFFFFCDD2)
                : const Color(0xFFE0E7EF),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding:
                  const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: danger
                    ? const Color(0xFFFFEBEE)
                    : const Color(0xFFE8F3F6),
                borderRadius:
                    BorderRadius.circular(12),
              ),
              child: loading
                  ? const SizedBox(
                      width: 25,
                      height: 25,
                      child:
                          CircularProgressIndicator(
                        strokeWidth: 2.5,
                      ),
                    )
                  : Icon(
                      icon,
                      color: danger
                          ? const Color(0xFFD32F2F)
                          : const Color(0xFF176B87),
                      size: 25,
                    ),
            ),

            const SizedBox(width: 14),

            Expanded(
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight:
                          FontWeight.w700,
                      fontSize: 16,
                      color: danger
                          ? const Color(0xFF7F1D1D)
                          : const Color(0xFF102A43),
                    ),
                  ),

                  const SizedBox(height: 3),

                  Text(
                    loading
                        ? 'Sending emergency alert...'
                        : subtitle,
                    style: const TextStyle(
                      color: Color(0xFF7B8794),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            if (!loading)
              Icon(
                Icons.chevron_right,
                color: danger
                    ? const Color(0xFFD32F2F)
                    : const Color(0xFF9AA5B1),
              ),
          ],
        ),
      ),
    );
  }
}



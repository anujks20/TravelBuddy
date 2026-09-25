import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../app.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../screens/home/emergency_friend_tracking_screen.dart';
import 'siren_service.dart';

const AndroidNotificationChannel _emergencyChannel = AndroidNotificationChannel(
  'emergency_sos_channel',
  'Emergency SOS',
  description: 'Critical high-priority emergency notifications for tourist SOS incidents',
  importance: Importance.max,
  playSound: true,
  enableVibration: true,
);

final FlutterLocalNotificationsPlugin _localNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

/// Top-level background message handler required by FirebaseMessaging.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {}

  // If this is an emergency alert, start the siren immediately and show local notification
  if (message.data['type'] == 'SOS_ALERT') {
    try {
      await SirenService.start();
    } catch (_) {}

    await _showLocalEmergencyNotification(message);
  }
}

Future<void> _showLocalEmergencyNotification(RemoteMessage message) async {
  final touristName = message.data['touristName'] ?? 'A tourist';
  final sosRef = message.data['sosReference'] ?? 'EMERGENCY';

  final androidDetails = AndroidNotificationDetails(
    _emergencyChannel.id,
    _emergencyChannel.name,
    channelDescription: _emergencyChannel.description,
    importance: Importance.max,
    priority: Priority.high,
    fullScreenIntent: true,
    category: AndroidNotificationCategory.alarm,
    visibility: NotificationVisibility.public,
    color: const Color(0xFFDC2626),
    styleInformation: BigTextStyleInformation(
      '$touristName has activated an emergency SOS ($sosRef) and needs immediate assistance! Tap to track live location.',
      contentTitle: '🚨 EMERGENCY: $touristName needs help!',
    ),
  );

  const iosDetails = DarwinNotificationDetails(
    presentAlert: true,
    presentBadge: true,
    presentSound: true,
    interruptionLevel: InterruptionLevel.critical,
  );

  final notificationDetails = NotificationDetails(
    android: androidDetails,
    iOS: iosDetails,
  );

  await _localNotificationsPlugin.show(
    id: sosRef.hashCode,
    title: '🚨 EMERGENCY: $touristName needs help!',
    body: 'SOS Reference: $sosRef. Tap to open live tracking map.',
    notificationDetails: notificationDetails,
    payload: jsonEncode(message.data),
  );
}

class PushNotificationService {
  PushNotificationService._();

  static final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  static bool _initialized = false;
  static String? _currentToken;

  static String? get currentToken => _currentToken;

  /// Initialize Firebase Messaging and Local Notification channels
  static Future<void> initialize() async {
    if (_initialized) return;

    try {
      // 1. Request notification permissions (required on Android 13+ and iOS)
      final settings = await _fcm.requestPermission(
        alert: true,
        announcement: true,
        badge: true,
        carPlay: false,
        criticalAlert: true,
        provisional: false,
        sound: true,
      );

      debugPrint('FCM Notification permission status: ${settings.authorizationStatus}');

      // 2. Setup Android notification channel with high priority
      const androidInitSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const darwinInitSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidInitSettings,
        iOS: darwinInitSettings,
      );

      await _localNotificationsPlugin.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (response) {
          if (response.payload != null) {
            _handlePayloadNavigation(response.payload!);
          }
        },
      );

      final androidImplementation = _localNotificationsPlugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();

      if (androidImplementation != null) {
        await androidImplementation.createNotificationChannel(_emergencyChannel);
      }

      // 3. Foreground message listener
      FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
        debugPrint('FCM Foreground message received: ${message.data}');

        if (message.data['type'] == 'SOS_ALERT') {
          // Play siren alert on device
          await SirenService.start();
          await _showLocalEmergencyNotification(message);

          // If app is currently on screen, offer emergency alert banner/dialog
          final context = TravelBuddyApp.navigatorKey.currentContext;
          if (context != null && context.mounted) {
            _showForegroundEmergencyBanner(context, message.data);
          }
        }
      });

      // 4. Background message tapped when app was in background
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('FCM onMessageOpenedApp tapped: ${message.data}');
        if (message.data['type'] == 'SOS_ALERT') {
          _openTrackingScreenFromData(message.data);
        }
      });

      // 5. App launched from terminated state via notification click
      final initialMessage = await _fcm.getInitialMessage();
      if (initialMessage != null && initialMessage.data['type'] == 'SOS_ALERT') {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _openTrackingScreenFromData(initialMessage.data);
        });
      }

      // 6. Listen for token refreshes
      _fcm.onTokenRefresh.listen((newToken) {
        _currentToken = newToken;
        registerTokenWithBackend(newToken);
      });

      _initialized = true;
    } catch (e) {
      debugPrint('PushNotificationService initialization error: $e');
    }
  }

  /// Fetch FCM device token and register it with the TravelBuddy backend
  static Future<void> syncTokenWithBackend() async {
    try {
      final token = await _fcm.getToken();
      if (token != null && token.isNotEmpty) {
        _currentToken = token;
        await registerTokenWithBackend(token);
      }
    } catch (e) {
      debugPrint('Error getting or syncing FCM token: $e');
    }
  }

  /// Send device token to POST /api/users/device-token
  static Future<void> registerTokenWithBackend(String token) async {
    try {
      final platform = Platform.isAndroid ? 'ANDROID' : (Platform.isIOS ? 'IOS' : 'OTHER');
      await ApiClient.dio.post(
        ApiConstants.deviceTokenEndpoint,
        data: {
          'fcmToken': token,
          'platform': platform,
        },
      );
      debugPrint('Device token successfully registered with backend: ${token.substring(0, 10)}...');
    } catch (e) {
      debugPrint('Failed to register device token with backend: $e');
    }
  }

  /// Remove device token on logout
  static Future<void> unregisterTokenFromBackend() async {
    if (_currentToken == null) return;
    try {
      await ApiClient.dio.delete(
        ApiConstants.deviceTokenEndpoint,
        data: {
          'fcmToken': _currentToken,
        },
      );
      debugPrint('Device token successfully unregistered from backend.');
    } catch (e) {
      debugPrint('Failed to unregister device token: $e');
    }
  }

  static void _handlePayloadNavigation(String payloadString) {
    try {
      final data = jsonDecode(payloadString);
      if (data is Map<String, dynamic> && data['type'] == 'SOS_ALERT') {
        _openTrackingScreenFromData(data);
      }
    } catch (e) {
      debugPrint('Error parsing notification payload: $e');
    }
  }

  static void _openTrackingScreenFromData(Map<String, dynamic> data) {
    final nav = TravelBuddyApp.navigatorKey.currentState;
    if (nav == null) return;

    final lat = double.tryParse(data['latitude']?.toString() ?? '');
    final lng = double.tryParse(data['longitude']?.toString() ?? '');
    final acc = double.tryParse(data['accuracy']?.toString() ?? '');

    nav.push(
      MaterialPageRoute(
        builder: (_) => EmergencyFriendTrackingScreen(
          sosReference: data['sosReference']?.toString(),
          incidentId: data['incidentId']?.toString(),
          touristName: data['touristName']?.toString(),
          initialLatitude: lat,
          initialLongitude: lng,
          accuracy: acc,
          emergencyType: data['emergencyType']?.toString(),
          timestamp: data['timestamp']?.toString(),
        ),
      ),
    );
  }

  static void _showForegroundEmergencyBanner(
      BuildContext context, Map<String, dynamic> data) {
    final touristName = data['touristName'] ?? 'A tourist';
    final sosRef = data['sosReference'] ?? 'EMERGENCY';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF7F1D1D),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.white, size: 28),
            SizedBox(width: 8),
            Text(
              '🚨 CRITICAL SOS ALERT',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ],
        ),
        content: Text(
          '$touristName has activated an emergency SOS ($sosRef)!\n\nYour emergency siren is sounding.',
          style: const TextStyle(color: Colors.white, fontSize: 14),
        ),
        actions: [
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.white70),
            onPressed: () {
              SirenService.stop();
              Navigator.of(ctx).pop();
            },
            child: const Text('Silence Siren'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFFDC2626),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              _openTrackingScreenFromData(data);
            },
            child: const Text(
              'View Location',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}

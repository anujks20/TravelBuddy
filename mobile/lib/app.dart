import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'screens/auth/auth_gate.dart';

class TravelBuddyApp extends StatelessWidget {
  const TravelBuddyApp({super.key});

  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'TravelBuddy',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      themeMode: ThemeMode.light,
      home: const AuthGate(),
    );
  }
}

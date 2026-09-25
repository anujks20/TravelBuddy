import 'package:flutter/material.dart';

import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../home/home_screen.dart';
import 'login_screen.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() =>
      _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late Future<UserModel?> _sessionFuture;

  @override
  void initState() {
    super.initState();

    _sessionFuture =
        AuthService.restoreSession();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserModel?>(
      future: _sessionFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState !=
            ConnectionState.done) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        final user = snapshot.data;

        if (user != null) {
          return HomeScreen(user: user);
        }

        return const LoginScreen();
      },
    );
  }
}

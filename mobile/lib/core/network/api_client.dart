import 'package:dio/dio.dart';

import '../constants/api_constants.dart';
import '../storage/token_storage.dart';

class ApiClient {
  ApiClient._();

  static final Dio dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) {
      return;
    }

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token =
              await TokenStorage.getToken();

          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] =
                'Bearer $token';
          }

          handler.next(options);
        },
      ),
    );

    _initialized = true;
  }
}

import 'dart:async';

import 'package:dio/dio.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../core/storage/token_storage.dart';
import '../models/user_model.dart';
import 'push_notification_service.dart';

class AuthService {
  AuthService._();

  static Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await ApiClient.dio.post(
        ApiConstants.loginEndpoint,
        data: {
          'email': email.trim(),
          'password': password,
        },
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      final token = data['token']?.toString();

      if (token == null || token.isEmpty) {
        throw Exception(
          'Authentication token was not received.',
        );
      }

      await TokenStorage.saveToken(token);
      unawaited(PushNotificationService.syncTokenWithBackend());

      return UserModel.fromJson(
        Map<String, dynamic>.from(
          data['user'] as Map,
        ),
      );
    } on DioException catch (error) {
      throw Exception(
        _extractErrorMessage(error),
      );
    }
  }

  static Future<UserModel> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
    required String language,
    required String nationalityCode,
    required String identityType,
    required String identityNumber,
  }) async {
    try {
      final response = await ApiClient.dio.post(
        ApiConstants.registerEndpoint,
        data: {
          'fullName': fullName.trim(),
          'email': email.trim(),
          'phone': phone.trim(),
          'password': password,
          'language': language,
          'nationalityCode':
              nationalityCode.trim().toUpperCase(),
          'identityType':
              identityType.trim().toUpperCase(),
          'identityNumber': identityNumber.trim(),
        },
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      final token = data['token']?.toString();

      if (token == null || token.isEmpty) {
        throw Exception(
          'Authentication token was not received.',
        );
      }

      await TokenStorage.saveToken(token);
      unawaited(PushNotificationService.syncTokenWithBackend());

      return UserModel.fromJson(
        Map<String, dynamic>.from(
          data['user'] as Map,
        ),
      );
    } on DioException catch (error) {
      throw Exception(
        _extractErrorMessage(error),
      );
    }
  }

  static Future<UserModel?> restoreSession() async {
    final token =
        await TokenStorage.getToken();

    if (token == null || token.isEmpty) {
      return null;
    }

    try {
      final response = await ApiClient.dio.get(
        ApiConstants.meEndpoint,
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      final user = UserModel.fromJson(
        Map<String, dynamic>.from(
          data['user'] as Map,
        ),
      );
      unawaited(PushNotificationService.syncTokenWithBackend());
      return user;
    } catch (_) {
      await TokenStorage.clearToken();
      return null;
    }
  }

  static Future<UserModel> updateProfile({
    required String fullName,
    String? phone,
    String? language,
  }) async {
    try {
      final response = await ApiClient.dio.patch(
        ApiConstants.profileEndpoint,
        data: {
          'fullName': fullName.trim(),
          if (phone != null) 'phone': phone.trim(),
          if (language != null) 'language': language.trim(),
        },
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      return UserModel.fromJson(
        Map<String, dynamic>.from(
          data['user'] as Map,
        ),
      );
    } on DioException catch (error) {
      throw Exception(
        _extractErrorMessage(error),
      );
    }
  }

  static Future<String> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await ApiClient.dio.post(
        ApiConstants.changePasswordEndpoint,
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      return data['message']?.toString() ??
          'Password changed successfully.';
    } on DioException catch (error) {
      throw Exception(
        _extractErrorMessage(error),
      );
    }
  }

  static Future<void> logout() async {
    try {
      await PushNotificationService.unregisterTokenFromBackend();
    } catch (_) {}

    try {
      await ApiClient.dio.post(
        ApiConstants.logoutEndpoint,
      );
    } catch (_) {
      // Local logout still happens.
    }

    await TokenStorage.clearToken();
  }

  static String _extractErrorMessage(
    DioException error,
  ) {
    final responseData = error.response?.data;

    if (responseData is Map &&
        responseData['message'] != null) {
      return responseData['message'].toString();
    }

    if (error.type ==
            DioExceptionType.connectionError ||
        error.type ==
            DioExceptionType.connectionTimeout) {
      return 'Unable to connect to TravelBuddy server.';
    }

    return 'Something went wrong. Please try again.';
  }
}

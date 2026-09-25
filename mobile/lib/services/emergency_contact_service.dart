import 'package:dio/dio.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/emergency_contact_model.dart';

class EmergencyContactService {
  EmergencyContactService._();

  static Future<List<EmergencyContactModel>>
      getContacts() async {
    try {
      final response =
          await ApiClient.dio.get(
        ApiConstants.emergencyContactsEndpoint,
      );

      final data =
          Map<String, dynamic>.from(
        response.data as Map,
      );

      final contacts =
          (data['contacts'] as List? ?? [])
              .map(
                (item) =>
                    EmergencyContactModel
                        .fromJson(
                  Map<String, dynamic>.from(
                    item as Map,
                  ),
                ),
              )
              .toList();

      return contacts;
    } on DioException catch (error) {
      throw Exception(
        _getErrorMessage(
          error,
          'Unable to fetch emergency contacts.',
        ),
      );
    }
  }

  static Future<EmergencyContactModel>
      addContact({
    required String name,
    required String phone,
    String? relationship,
    required int priority,
  }) async {
    try {
      final response =
          await ApiClient.dio.post(
        ApiConstants.emergencyContactsEndpoint,
        data: {
          'name': name.trim(),
          'phone': phone.trim(),
          'relationship':
              relationship?.trim(),
          'priority': priority,
        },
      );

      final data =
          Map<String, dynamic>.from(
        response.data as Map,
      );

      return EmergencyContactModel.fromJson(
        Map<String, dynamic>.from(
          data['contact'] as Map,
        ),
      );
    } on DioException catch (error) {
      throw Exception(
        _getErrorMessage(
          error,
          'Unable to add emergency contact.',
        ),
      );
    }
  }

  static String _getErrorMessage(
    DioException error,
    String fallback,
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

    return fallback;
  }
}
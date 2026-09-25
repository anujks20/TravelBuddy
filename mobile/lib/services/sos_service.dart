import 'package:dio/dio.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';

class SosResult {
  final String id;
  final String sosReference;
  final String status;
  final double? latitude;
  final double? longitude;

  const SosResult({
    required this.id,
    required this.sosReference,
    required this.status,
    this.latitude,
    this.longitude,
  });

  factory SosResult.fromJson(
    Map<String, dynamic> json,
  ) {
    return SosResult(
      id: json['id']?.toString() ?? '',
      sosReference:
          json['sos_reference']?.toString() ?? '',
      status:
          json['status']?.toString() ?? '',
      latitude: _toDouble(json['latitude']),
      longitude: _toDouble(json['longitude']),
    );
  }

  static double? _toDouble(dynamic value) {
    if (value == null) {
      return null;
    }

    if (value is num) {
      return value.toDouble();
    }

    return double.tryParse(value.toString());
  }
}

class SosService {
  SosService._();

  static Future<SosResult> createSos({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await ApiClient.dio.post(
        ApiConstants.sosEndpoint,
        data: {
          'type': 'GENERAL',
          'latitude': latitude,
          'longitude': longitude,
          'triggerSource': 'MOBILE_APP',
        },
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      final sosData = Map<String, dynamic>.from(
        data['sos'] as Map,
      );

      return SosResult.fromJson(sosData);
    } on DioException catch (error) {
      final responseData = error.response?.data;

      if (responseData is Map &&
          responseData['message'] != null) {
        throw Exception(
          responseData['message'].toString(),
        );
      }

      if (error.type ==
              DioExceptionType.connectionError ||
          error.type ==
              DioExceptionType.connectionTimeout) {
        throw Exception(
          'Unable to connect to TravelBuddy server.',
        );
      }

      throw Exception(
        'Unable to send emergency alert.',
      );
    }
  }

  static Future<SosResult?> getSosStatus(
    String sosReference,
  ) async {
    try {
      final response =
          await ApiClient.dio.get(
        ApiConstants.sosEndpoint,
      );

      final data =
          Map<String, dynamic>.from(
        response.data as Map,
      );

      final incidents =
          data['sosIncidents'];

      if (incidents is! List) {
        return null;
      }

      for (final item in incidents) {
        if (item is! Map) {
          continue;
        }

        final incident =
            SosResult.fromJson(
          Map<String, dynamic>.from(item),
        );

        if (incident.sosReference ==
            sosReference) {
          return incident;
        }
      }

      return null;
    } on DioException {
      // Status polling should never crash
      // the active SOS screen.
      return null;
    }
  }
}
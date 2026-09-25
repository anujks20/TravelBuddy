import 'package:dio/dio.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';

class RouteService {
  RouteService._();

  static Future<Map<String, dynamic>> optimizeRoutes({
    required String origin,
    required String destination,
    required int travelers,
    required double budget,
    required int days,
    String preference = 'balanced',
    DateTime? startDate,
    DateTime? endDate,
    bool includeGeometry = false,
  }) async {
    try {
      final response = await ApiClient.dio.post(
        ApiConstants.routesOptimizeEndpoint,
        data: {
          'origin': origin,
          'destination': destination,
          'travelers': travelers,
          'budget': budget,
          'days': days,
          'preference': preference,
          if (startDate != null)
            'startDate': _formatDate(startDate),
          if (endDate != null)
            'endDate': _formatDate(endDate),
          'includeGeometry': includeGeometry,
        },
      );

      final responseData =
          Map<String, dynamic>.from(
        response.data as Map,
      );

      if (responseData['data'] is Map) {
        return Map<String, dynamic>.from(
          responseData['data'] as Map,
        );
      }

      return responseData;
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
        'Unable to optimize routes.',
      );
    }
  }

  static String _formatDate(
    DateTime date,
  ) {
    final year =
        date.year.toString().padLeft(4, '0');

    final month =
        date.month.toString().padLeft(2, '0');

    final day =
        date.day.toString().padLeft(2, '0');

    return '$year-$month-$day';
  }
}

import 'package:dio/dio.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';

class AiService {
  AiService._();

  static Future<Map<String, dynamic>> generateItinerary({
    required Map<String, dynamic> trip,
    required int days,
    List<Map<String, dynamic>>? routes,
  }) async {
    try {
      final response = await ApiClient.dio.post(
        ApiConstants.aiItineraryEndpoint,
        data: {
          'trip': trip,
          'days': days,
          'routes': ?routes,
        },
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      if (data['result'] is Map) {
        return Map<String, dynamic>.from(
          data['result'] as Map,
        );
      }

      return data;
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
        'Unable to generate itinerary.',
      );
    }
  }
}


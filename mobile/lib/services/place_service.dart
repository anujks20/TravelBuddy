import 'package:dio/dio.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';

class PlaceService {
  PlaceService._();

  static Future<Map<String, dynamic>> getCityPlaces({
    required String cityName,
    int limit = 20,
    String mode = 'explore',
  }) async {
    try {
      final normalizedMode =
          mode == 'explore' ? 'explore' : 'eat';

      final response = await ApiClient.dio.post(
        ApiConstants.placesCityEndpoint,
        data: {
          'cityName': cityName,
          'limit': limit,
          'mode': normalizedMode,
        },
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

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
        'Unable to discover places.',
      );
    }
  }
}

import 'package:dio/dio.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/hotel_stay_model.dart';

class HotelStayService {
  HotelStayService._();

  static Future<List<HotelStayModel>> getMyHotelStays() async {
    try {
      final response = await ApiClient.dio.get(
        ApiConstants.hotelStaysEndpoint,
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      final staysData = data['hotelStays'] ?? data['stays'];

      if (staysData is! List) {
        return [];
      }

      return staysData
          .map(
            (stay) => HotelStayModel.fromJson(
              Map<String, dynamic>.from(
                stay as Map,
              ),
            ),
          )
          .toList();
    } on DioException catch (error) {
      throw _handleError(
        error,
        'Unable to fetch your hotel stays.',
      );
    }
  }

  static Future<HotelStayModel> linkHotelStay({
    required String hotelId,
    String? bookingReference,
    required DateTime checkIn,
    DateTime? checkOut,
    String? tripId,
  }) async {
    try {
      final payload = {
        'hotelId': hotelId,
        'checkIn': checkIn.toIso8601String(),
        if (bookingReference != null && bookingReference.trim().isNotEmpty)
          'bookingReference': bookingReference.trim(),
        if (checkOut != null) 'checkOut': checkOut.toIso8601String(),
        if (tripId != null && tripId.isNotEmpty) 'tripId': tripId,
      };

      final response = await ApiClient.dio.post(
        ApiConstants.hotelStaysEndpoint,
        data: payload,
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      final stayObj = data['hotelStay'] ?? data['stay'] ?? data;

      return HotelStayModel.fromJson(
        Map<String, dynamic>.from(
          stayObj as Map,
        ),
      );
    } on DioException catch (error) {
      throw _handleError(
        error,
        'Unable to link hotel stay.',
      );
    }
  }

  static Exception _handleError(
    DioException error,
    String fallbackMessage,
  ) {
    final responseData = error.response?.data;

    if (responseData is Map && responseData['message'] != null) {
      return Exception(
        responseData['message'].toString(),
      );
    }

    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      return Exception(
        'Unable to connect to TravelBuddy server.',
      );
    }

    return Exception(fallbackMessage);
  }
}

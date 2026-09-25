import 'package:dio/dio.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/trip_model.dart';

class TripService {
  TripService._();

  static Future<List<TripModel>> getMyTrips() async {
    try {
      final response = await ApiClient.dio.get(
        ApiConstants.tripsEndpoint,
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      final tripsData = data['trips'];

      if (tripsData is! List) {
        return [];
      }

      return tripsData
          .map(
            (trip) => TripModel.fromJson(
              Map<String, dynamic>.from(
                trip as Map,
              ),
            ),
          )
          .toList();
    } on DioException catch (error) {
      throw _handleError(
        error,
        'Unable to fetch your trips.',
      );
    }
  }

  static Future<TripModel> createTrip({
    required String title,
    String? destination,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      final response = await ApiClient.dio.post(
        ApiConstants.tripsEndpoint,
        data: {
          'title': title,
          'destination': destination,
          'startDate': _formatDate(startDate),
          'endDate': _formatDate(endDate),
        },
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      return TripModel.fromJson(
        Map<String, dynamic>.from(
          data['trip'] as Map,
        ),
      );
    } on DioException catch (error) {
      throw _handleError(
        error,
        'Unable to create trip.',
      );
    }
  }

  static Future<TripModel> getTripById(
    String tripId,
  ) async {
    try {
      final response = await ApiClient.dio.get(
        '${ApiConstants.tripsEndpoint}/$tripId',
      );

      final data = Map<String, dynamic>.from(
        response.data as Map,
      );

      return TripModel.fromJson(
        Map<String, dynamic>.from(
          data['trip'] as Map,
        ),
      );
    } on DioException catch (error) {
      throw _handleError(
        error,
        'Unable to fetch trip.',
      );
    }
  }

  static Future<TripModel> updateTrip({
    required String tripId,
    String? title,
    String? destination,
    DateTime? startDate,
    DateTime? endDate,
    String? status,
    bool? isSaved,
    Map<String, dynamic>? plannerMetadata,
    List<dynamic>? itinerary,
  }) async {
    try {
      final data = <String, dynamic>{};

      if (title != null) {
        data['title'] = title;
      }

      if (destination != null) {
        data['destination'] = destination;
      }

      if (startDate != null) {
        data['startDate'] = _formatDate(startDate);
      }

      if (endDate != null) {
        data['endDate'] = _formatDate(endDate);
      }

      if (status != null) {
        data['status'] = status;
      }

      if (isSaved != null) {
        data['is_saved'] = isSaved;
        data['isSaved'] = isSaved;
      }

      if (plannerMetadata != null) {
        data['plannerMetadata'] = plannerMetadata;
      }

      if (itinerary != null) {
        data['itinerary'] = itinerary;
      }

      final response = await ApiClient.dio.patch(
        '${ApiConstants.tripsEndpoint}/$tripId',
        data: data,
      );

      final responseData =
          Map<String, dynamic>.from(
        response.data as Map,
      );

      return TripModel.fromJson(
        Map<String, dynamic>.from(
          responseData['trip'] as Map,
        ),
      );
    } on DioException catch (error) {
      throw _handleError(
        error,
        'Unable to update trip.',
      );
    }
  }

  static Future<void> deleteTrip(
    String tripId,
  ) async {
    try {
      await ApiClient.dio.delete(
        '${ApiConstants.tripsEndpoint}/$tripId',
      );
    } on DioException catch (error) {
      throw _handleError(
        error,
        'Unable to delete trip.',
      );
    }
  }

  static Exception _handleError(
    DioException error,
    String fallbackMessage,
  ) {
    final responseData = error.response?.data;

    if (responseData is Map &&
        responseData['message'] != null) {
      return Exception(
        responseData['message'].toString(),
      );
    }

    if (error.type ==
            DioExceptionType.connectionError ||
        error.type ==
            DioExceptionType.connectionTimeout) {
      return Exception(
        'Unable to connect to TravelBuddy server.',
      );
    }

    return Exception(fallbackMessage);
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

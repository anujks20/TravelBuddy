import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';

import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';

class LocationService {
  LocationService._();

  static Future<Position> getCurrentPosition() async {
    final serviceEnabled =
        await Geolocator.isLocationServiceEnabled();

    if (!serviceEnabled) {
      throw Exception(
        'Location services are disabled. Please enable GPS.',
      );
    }

    var permission =
        await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission =
          await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      throw Exception(
        'Location permission was denied.',
      );
    }

    if (permission ==
        LocationPermission.deniedForever) {
      throw Exception(
        'Location permission is permanently denied. Please enable it from app settings.',
      );
    }

    return Geolocator.getCurrentPosition(
      locationSettings:
          const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );
  }

  static Future<Map<String, dynamic>?> updateLocation(
    Position position,
  ) async {
    try {
      final response = await ApiClient.dio.post(
        ApiConstants.locationsEndpoint,
        data: {
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'speed': position.speed,
          'heading': position.heading,
          'source': 'PHONE_GPS',
        },
      );

      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } on DioException catch (error) {
      final responseData = error.response?.data;

      if (responseData is Map &&
          responseData['message'] != null) {
        throw Exception(
          responseData['message'].toString(),
        );
      }

      throw Exception(
        'Unable to update your location.',
      );
    }
  }
}
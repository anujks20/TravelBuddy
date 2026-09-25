class ApiConstants {
  ApiConstants._();

  // Change this single value when moving between environments.
  // Android emulator -> http://10.0.2.2:5000/api
  // Physical device on same network -> http://YOUR_PC_IP:5000/api
  // Production -> https://YOUR_PUBLIC_DOMAIN/api
  static const String baseUrl =
      'http://10.0.2.2:5000/api';

  // Core
  static const String healthEndpoint =
      '$baseUrl/health';

  // Authentication
  static const String registerEndpoint =
      '$baseUrl/auth/register';

  static const String loginEndpoint =
      '$baseUrl/auth/login';

  static const String meEndpoint =
      '$baseUrl/auth/me';

  static const String logoutEndpoint =
      '$baseUrl/auth/logout';

  // Profile & Password
  static const String profileEndpoint =
      '$baseUrl/profile';

  static const String changePasswordEndpoint =
      '$baseUrl/auth/change-password';

  // Trips
  static const String tripsEndpoint =
      '$baseUrl/trips';

  // AI
  static const String aiTestEndpoint =
      '$baseUrl/ai/test';

  static const String aiItineraryEndpoint =
      '$baseUrl/ai/itinerary';

  // Routes & Budget
  static const String routesOptimizeEndpoint =
      '$baseUrl/routes/optimize';

  // Real-place / City Explorer / Where to Eat
  static const String placesCityEndpoint =
      '$baseUrl/places/city';

  // Hotel
  static const String hotelStaysEndpoint =
      '$baseUrl/hotel-stays';

  // Emergency Contacts
  static const String emergencyContactsEndpoint =
      '$baseUrl/emergency-contacts';

  // SOS
  static const String sosEndpoint =
      '$baseUrl/sos';

  // Location
  static const String locationsEndpoint =
      '$baseUrl/locations';

  // Users & Device Tokens
  static const String deviceTokenEndpoint =
      '$baseUrl/users/device-token';

  static String sosDetailsEndpoint(String id) =>
      '$baseUrl/sos/$id';

  // Web Portal / Planner
  static const String webPlannerUrl =
      'http://10.0.2.2:3000/planner.html';
}

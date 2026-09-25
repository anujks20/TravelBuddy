import 'dart:convert';

class TripModel {
  final String id;
  final String title;
  final String? destination;
  final DateTime startDate;
  final DateTime endDate;
  final String status;
  final bool isSaved;
  final Map<String, dynamic>? plannerMetadata;
  final List<dynamic>? itinerary;

  const TripModel({
    required this.id,
    required this.title,
    this.destination,
    required this.startDate,
    required this.endDate,
    required this.status,
    this.isSaved = false,
    this.plannerMetadata,
    this.itinerary,
  });

  factory TripModel.fromJson(
    Map<String, dynamic> json,
  ) {
    dynamic plannerData =
        json['planner_metadata'] ??
        json['plannerMetadata'] ??
        json['metadata'];

    if (plannerData is String) {
      try {
        plannerData = jsonDecode(plannerData);
      } catch (_) {}
    }

    final bool parsedIsSaved = json['is_saved'] == true ||
        json['isSaved'] == true ||
        json['is_saved'] == 'true' ||
        (plannerData is Map &&
            (plannerData['is_saved'] == true ||
                plannerData['is_saved'] == 'true' ||
                plannerData['isSaved'] == true ||
                plannerData['isSaved'] == 'true'));

    dynamic itineraryData = json['itinerary'];
    while (itineraryData is String) {
      try {
        final decoded = jsonDecode(itineraryData);
        if (decoded == itineraryData) break;
        itineraryData = decoded;
      } catch (_) {
        break;
      }
    }

    List<dynamic>? parsedItinerary;
    if (itineraryData is List) {
      parsedItinerary = List<dynamic>.from(itineraryData);
    } else if (itineraryData is Map) {
      if (itineraryData['itinerary'] is List) {
        parsedItinerary = List<dynamic>.from(itineraryData['itinerary']);
      } else if (itineraryData['days'] is List) {
        parsedItinerary = List<dynamic>.from(itineraryData['days']);
      }
    }

    if ((parsedItinerary == null || parsedItinerary.isEmpty) &&
        plannerData is Map &&
        plannerData['itinerary'] is List) {
      parsedItinerary = List<dynamic>.from(plannerData['itinerary']);
    }

    DateTime parsedStart;
    try {
      parsedStart = DateTime.parse(
        (json['start_date'] ?? json['startDate']).toString(),
      );
    } catch (_) {
      parsedStart = DateTime.now();
    }

    DateTime parsedEnd;
    try {
      parsedEnd = DateTime.parse(
        (json['end_date'] ?? json['endDate']).toString(),
      );
    } catch (_) {
      parsedEnd = parsedStart;
    }

    return TripModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      destination: json['destination']?.toString(),
      startDate: parsedStart,
      endDate: parsedEnd,
      status: json['status']?.toString() ?? 'PLANNED',
      isSaved: parsedIsSaved,
      plannerMetadata: plannerData is Map
          ? Map<String, dynamic>.from(plannerData)
          : null,
      itinerary: parsedItinerary,
    );
  }
}

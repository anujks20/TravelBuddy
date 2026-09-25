class HotelStayModel {
  final String id;
  final String userId;
  final String hotelId;
  final String? tripId;
  final String? bookingReference;
  final DateTime checkIn;
  final DateTime? checkOut;
  final String status;
  final String source;
  final DateTime? createdAt;
  final String hotelName;
  final String? hotelAddress;
  final String? hotelCity;
  final String? hotelState;
  final String? hotelCountry;
  final String? hotelPhone;
  final bool partnerStatus;

  const HotelStayModel({
    required this.id,
    required this.userId,
    required this.hotelId,
    this.tripId,
    this.bookingReference,
    required this.checkIn,
    this.checkOut,
    required this.status,
    required this.source,
    this.createdAt,
    required this.hotelName,
    this.hotelAddress,
    this.hotelCity,
    this.hotelState,
    this.hotelCountry,
    this.hotelPhone,
    this.partnerStatus = false,
  });

  factory HotelStayModel.fromJson(Map<String, dynamic> json) {
    DateTime parsedCheckIn;
    try {
      parsedCheckIn = DateTime.parse(
        (json['check_in'] ?? json['checkIn']).toString(),
      );
    } catch (_) {
      parsedCheckIn = DateTime.now();
    }

    DateTime? parsedCheckOut;
    if (json['check_out'] != null || json['checkOut'] != null) {
      try {
        parsedCheckOut = DateTime.parse(
          (json['check_out'] ?? json['checkOut']).toString(),
        );
      } catch (_) {}
    }

    DateTime? parsedCreatedAt;
    if (json['created_at'] != null || json['createdAt'] != null) {
      try {
        parsedCreatedAt = DateTime.parse(
          (json['created_at'] ?? json['createdAt']).toString(),
        );
      } catch (_) {}
    }

    final partnerVal = json['partner_status'] ?? json['partnerStatus'];
    final bool isPartner = partnerVal == true || partnerVal == 1 || partnerVal == 'true';

    return HotelStayModel(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? json['userId']?.toString() ?? '',
      hotelId: json['hotel_id']?.toString() ?? json['hotelId']?.toString() ?? '',
      tripId: json['trip_id']?.toString() ?? json['tripId']?.toString(),
      bookingReference: json['booking_reference']?.toString() ?? json['bookingReference']?.toString(),
      checkIn: parsedCheckIn,
      checkOut: parsedCheckOut,
      status: json['status']?.toString() ?? 'ACTIVE',
      source: json['source']?.toString() ?? 'HOTEL_PORTAL',
      createdAt: parsedCreatedAt,
      hotelName: json['hotel_name']?.toString() ?? json['hotelName']?.toString() ?? 'Partner Hotel',
      hotelAddress: json['hotel_address']?.toString() ?? json['hotelAddress']?.toString(),
      hotelCity: json['hotel_city']?.toString() ?? json['hotelCity']?.toString(),
      hotelState: json['hotel_state']?.toString() ?? json['hotelState']?.toString(),
      hotelCountry: json['hotel_country']?.toString() ?? json['hotelCountry']?.toString() ?? 'India',
      hotelPhone: json['hotel_phone']?.toString() ?? json['hotelPhone']?.toString(),
      partnerStatus: isPartner,
    );
  }
}

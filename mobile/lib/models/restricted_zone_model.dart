class RestrictedZoneModel {
  final String id;
  final String name;
  final String description;
  final double latitude;
  final double longitude;
  final int radiusMeters;
  final String dangerLevel;
  final bool active;

  RestrictedZoneModel({
    required this.id,
    required this.name,
    required this.description,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
    required this.dangerLevel,
    required this.active,
  });

  factory RestrictedZoneModel.fromJson(Map<String, dynamic> json) {
    return RestrictedZoneModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Restricted Danger Area',
      description: json['description']?.toString() ?? '',
      latitude: double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0,
      longitude: double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0,
      radiusMeters: int.tryParse(json['radius_meters']?.toString() ?? '300') ?? 300,
      dangerLevel: json['danger_level']?.toString() ?? 'HIGH',
      active: json['active'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'latitude': latitude,
      'longitude': longitude,
      'radius_meters': radiusMeters,
      'danger_level': dangerLevel,
      'active': active,
    };
  }
}

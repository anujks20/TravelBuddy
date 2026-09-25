class EmergencyContactModel {
  final String id;
  final String name;
  final String phone;
  final String? relationship;
  final int priority;

  const EmergencyContactModel({
    required this.id,
    required this.name,
    required this.phone,
    this.relationship,
    required this.priority,
  });

  factory EmergencyContactModel.fromJson(
    Map<String, dynamic> json,
  ) {
    return EmergencyContactModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      relationship:
          json['relationship']?.toString(),
      priority:
          int.tryParse(
                json['priority']?.toString() ?? '',
              ) ??
              1,
    );
  }
}
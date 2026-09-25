class UserModel {
  final String id;
  final String touristUid;
  final String fullName;
  final String email;
  final String? phone;
  final String? language;
  final String? nationalityCode;
  final String? profilePhotoUrl;
  final String? identityType;
  final bool identityVerified;
  final String role;

  const UserModel({
    required this.id,
    required this.touristUid,
    required this.fullName,
    required this.email,
    this.phone,
    this.language,
    this.nationalityCode,
    this.profilePhotoUrl,
    this.identityType,
    required this.identityVerified,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      touristUid: json['tourist_uid']?.toString() ?? '',
      fullName: json['full_name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString(),
      language: json['language']?.toString(),
      nationalityCode: json['nationality_code']?.toString(),
      profilePhotoUrl: json['profile_photo_url']?.toString(),
      identityType: json['identity_type']?.toString(),
      identityVerified: json['identity_verified'] == true,
      role: json['role']?.toString() ?? 'TOURIST',
    );
  }
}

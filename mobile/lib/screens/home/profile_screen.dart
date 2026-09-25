import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/user_model.dart';
import '../../services/auth_service.dart';

class ProfileScreen extends StatefulWidget {
  final UserModel user;

  const ProfileScreen({
    super.key,
    required this.user,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late UserModel _currentUser;

  // Profile Form
  final _profileFormKey = GlobalKey<FormState>();
  late final TextEditingController _fullNameController;
  late final TextEditingController _phoneController;
  String _selectedLanguage = 'English';
  bool _savingProfile = false;

  // Password Form
  final _passwordFormKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _showCurrentPassword = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;
  bool _savingPassword = false;

  final List<String> _languages = [
    'English',
    'Hindi',
    'Spanish',
    'French',
    'German',
    'Japanese',
    'Mandarin',
    'Arabic',
    'Russian',
  ];

  @override
  void initState() {
    super.initState();
    _currentUser = widget.user;
    _fullNameController =
        TextEditingController(text: _currentUser.fullName);
    _phoneController =
        TextEditingController(text: _currentUser.phone ?? '');

    if (_currentUser.language != null &&
        _languages.contains(_currentUser.language)) {
      _selectedLanguage = _currentUser.language!;
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_profileFormKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _savingProfile = true;
    });

    try {
      final updated = await AuthService.updateProfile(
        fullName: _fullNameController.text.trim(),
        phone: _phoneController.text.trim(),
        language: _selectedLanguage,
      );

      setState(() {
        _currentUser = updated;
      });

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF166534),
          content: Text('Profile details updated successfully!'),
        ),
      );
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFD32F2F),
          content: Text(
            error.toString().replaceFirst('Exception: ', ''),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _savingProfile = false;
        });
      }
    }
  }

  Future<void> _changePassword() async {
    if (!_passwordFormKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _savingPassword = true;
    });

    try {
      final message = await AuthService.changePassword(
        currentPassword: _currentPasswordController.text,
        newPassword: _newPasswordController.text,
      );

      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF166534),
          content: Text(message),
        ),
      );
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFFD32F2F),
          content: Text(
            error.toString().replaceFirst('Exception: ', ''),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _savingPassword = false;
        });
      }
    }
  }

  void _copyTouristUid() {
    Clipboard.setData(
      ClipboardData(text: _currentUser.touristUid),
    );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        duration: Duration(seconds: 2),
        backgroundColor: Color(0xFF176B87),
        content: Text('Tourist UID copied to clipboard!'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final avatarChar = (_currentUser.fullName.isNotEmpty)
        ? _currentUser.fullName[0].toUpperCase()
        : 'T';

    return WillPopScope(
      onWillPop: () async {
        Navigator.of(context).pop(_currentUser);
        return false;
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text(
            'Tourist Profile',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () =>
                Navigator.of(context).pop(_currentUser),
          ),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF176B87), Color(0xFF0F3A4F)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF176B87)
                            .withOpacity(0.25),
                        blurRadius: 15,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 36,
                        backgroundColor: Colors.white,
                        child: Text(
                          avatarChar,
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF176B87),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _currentUser.fullName,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _currentUser.email,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 14),
                      // Copyable UID chip
                      InkWell(
                        onTap: _copyTouristUid,
                        borderRadius: BorderRadius.circular(24),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius:
                                BorderRadius.circular(24),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.3),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.badge_outlined,
                                size: 16,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                _currentUser.touristUid,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(
                                Icons.copy_rounded,
                                size: 14,
                                color: Colors.white70,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Card 1: Read-Only Identity & Government Verification
                _buildSectionHeader(
                  title: 'Identity & Records',
                  subtitle: 'Fixed security & official verification details',
                  icon: Icons.lock_outline_rounded,
                ),

                const SizedBox(height: 12),

                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFFE2E8F0),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      _buildReadOnlyRow(
                        label: 'Official Tourist UID',
                        value: _currentUser.touristUid,
                        icon: Icons.qr_code_2_rounded,
                        isMono: true,
                      ),
                      const Divider(height: 20),
                      _buildReadOnlyRow(
                        label: 'Registered Email',
                        value: _currentUser.email,
                        icon: Icons.email_outlined,
                      ),
                      const Divider(height: 20),
                      _buildReadOnlyRow(
                        label: 'Nationality Code',
                        value: _currentUser.nationalityCode ?? 'IND',
                        icon: Icons.public_rounded,
                      ),
                      const Divider(height: 20),
                      _buildReadOnlyRow(
                        label: 'Identity Document Type',
                        value: _currentUser.identityType ?? 'PASSPORT',
                        icon: Icons.credit_card_rounded,
                      ),
                      const Divider(height: 20),
                      _buildReadOnlyRow(
                        label: 'Verification Status',
                        value: _currentUser.identityVerified
                            ? 'Verified Official Identity'
                            : 'Standard Tourist Account',
                        icon: Icons.verified_user_outlined,
                        badgeColor: _currentUser.identityVerified
                            ? const Color(0xFFDCFCE7)
                            : const Color(0xFFFEF3C7),
                        badgeTextColor: _currentUser.identityVerified
                            ? const Color(0xFF166534)
                            : const Color(0xFF92400E),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 28),

                // Card 2: Editable Personal Details
                _buildSectionHeader(
                  title: 'Edit Personal Details',
                  subtitle: 'Update your name, contact phone & preferred language',
                  icon: Icons.edit_note_rounded,
                ),

                const SizedBox(height: 12),

                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFFE2E8F0),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Form(
                    key: _profileFormKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextFormField(
                          controller: _fullNameController,
                          decoration: const InputDecoration(
                            labelText: 'Full Name *',
                            prefixIcon: Icon(Icons.person_outline),
                            border: OutlineInputBorder(),
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) {
                              return 'Full name is required';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Phone Number',
                            hintText: '+91 98765 43210',
                            prefixIcon: Icon(Icons.phone_outlined),
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          value: _selectedLanguage,
                          decoration: const InputDecoration(
                            labelText: 'Preferred Language',
                            prefixIcon:
                                Icon(Icons.language_rounded),
                            border: OutlineInputBorder(),
                          ),
                          items: _languages.map((lang) {
                            return DropdownMenuItem(
                              value: lang,
                              child: Text(lang),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setState(() {
                                _selectedLanguage = val;
                              });
                            }
                          },
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed:
                                _savingProfile ? null : _saveProfile,
                            style: ElevatedButton.styleFrom(
                              backgroundColor:
                                  const Color(0xFF176B87),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(12),
                              ),
                            ),
                            child: _savingProfile
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child:
                                        CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text(
                                    'Save Profile Changes',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight:
                                          FontWeight.w700,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 28),

                // Card 3: Change Account Password
                _buildSectionHeader(
                  title: 'Security & Password',
                  subtitle: 'Update your account access password',
                  icon: Icons.shield_outlined,
                ),

                const SizedBox(height: 12),

                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFFE2E8F0),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Form(
                    key: _passwordFormKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextFormField(
                          controller: _currentPasswordController,
                          obscureText: !_showCurrentPassword,
                          decoration: InputDecoration(
                            labelText: 'Current Password *',
                            prefixIcon:
                                const Icon(Icons.lock_outline),
                            border: const OutlineInputBorder(),
                            suffixIcon: IconButton(
                              icon: Icon(_showCurrentPassword
                                  ? Icons.visibility_off
                                  : Icons.visibility),
                              onPressed: () {
                                setState(() {
                                  _showCurrentPassword =
                                      !_showCurrentPassword;
                                });
                              },
                            ),
                          ),
                          validator: (val) {
                            if (val == null || val.isEmpty) {
                              return 'Current password is required';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _newPasswordController,
                          obscureText: !_showNewPassword,
                          decoration: InputDecoration(
                            labelText:
                                'New Password * (min 6 chars)',
                            prefixIcon:
                                const Icon(Icons.key_rounded),
                            border: const OutlineInputBorder(),
                            suffixIcon: IconButton(
                              icon: Icon(_showNewPassword
                                  ? Icons.visibility_off
                                  : Icons.visibility),
                              onPressed: () {
                                setState(() {
                                  _showNewPassword =
                                      !_showNewPassword;
                                });
                              },
                            ),
                          ),
                          validator: (val) {
                            if (val == null || val.isEmpty) {
                              return 'New password is required';
                            }
                            if (val.length < 6) {
                              return 'Password must be at least 6 characters';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _confirmPasswordController,
                          obscureText: !_showConfirmPassword,
                          decoration: InputDecoration(
                            labelText: 'Confirm New Password *',
                            prefixIcon:
                                const Icon(Icons.check_rounded),
                            border: const OutlineInputBorder(),
                            suffixIcon: IconButton(
                              icon: Icon(_showConfirmPassword
                                  ? Icons.visibility_off
                                  : Icons.visibility),
                              onPressed: () {
                                setState(() {
                                  _showConfirmPassword =
                                      !_showConfirmPassword;
                                });
                              },
                            ),
                          ),
                          validator: (val) {
                            if (val !=
                                _newPasswordController.text) {
                              return 'Passwords do not match';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _savingPassword
                                ? null
                                : _changePassword,
                            style: ElevatedButton.styleFrom(
                              backgroundColor:
                                  const Color(0xFF176B87),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius:
                                    BorderRadius.circular(12),
                              ),
                            ),
                            child: _savingPassword
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child:
                                        CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text(
                                    'Update Password',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight:
                                          FontWeight.w700,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader({
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFF176B87).withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            size: 20,
            color: const Color(0xFF176B87),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF102A43),
                ),
              ),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6B7C93),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildReadOnlyRow({
    required String label,
    required String value,
    required IconData icon,
    bool isMono = false,
    Color? badgeColor,
    Color? badgeTextColor,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF64748B)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 2),
              if (badgeColor != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: badgeColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    value,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: badgeTextColor ?? Colors.black,
                    ),
                  ),
                )
              else
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    fontFamily: isMono ? 'monospace' : null,
                    color: const Color(0xFF1E293B),
                  ),
                ),
            ],
          ),
        ),
        const Icon(
          Icons.lock_rounded,
          size: 14,
          color: Color(0xFF94A3B8),
        ),
      ],
    );
  }
}

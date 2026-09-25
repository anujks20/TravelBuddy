import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../home/home_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() =>
      _RegisterScreenState();
}

class _RegisterScreenState
    extends State<RegisterScreen> {
  final _formKey =
      GlobalKey<FormState>();

  final _nameController =
      TextEditingController();

  final _emailController =
      TextEditingController();

  final _phoneController =
      TextEditingController();

  final _passwordController =
      TextEditingController();

  final _identityController =
      TextEditingController();

  String _language = 'English';
  final String _nationality = 'IND';
  String _identityType = 'AADHAAR';

  bool _loading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _identityController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _loading = true;
    });

    try {
      final user = await AuthService.register(
        fullName: _nameController.text,
        email: _emailController.text,
        phone: _phoneController.text,
        password: _passwordController.text,
        language: _language,
        nationalityCode: _nationality,
        identityType: _identityType,
        identityNumber:
            _identityController.text,
      );

      if (!mounted) {
        return;
      }

      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => HomeScreen(user: user),
        ),
        (route) => false,
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error
                .toString()
                .replaceFirst('Exception: ', ''),
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create account'),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding:
                const EdgeInsets.fromLTRB(
              24,
              8,
              24,
              32,
            ),
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  'Join TravelBuddy',
                  style: TextStyle(
                    fontSize: 29,
                    fontWeight: FontWeight.w800,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),

                const SizedBox(height: 8),

                Text(
                  'Create your tourist profile and get your unique TravelBuddy UID.',
                  style: TextStyle(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.7),
                    height: 1.4,
                  ),
                ),

                const SizedBox(height: 26),

                TextFormField(
                  controller:
                      _nameController,
                  textCapitalization:
                      TextCapitalization.words,
                  decoration:
                      const InputDecoration(
                    labelText: 'Full name',
                    prefixIcon:
                        Icon(Icons.person_outline),
                  ),
                  validator: (value) {
                    if (value == null ||
                        value.trim().isEmpty) {
                      return 'Enter your full name.';
                    }

                    return null;
                  },
                ),

                const SizedBox(height: 14),

                TextFormField(
                  controller:
                      _emailController,
                  keyboardType:
                      TextInputType.emailAddress,
                  decoration:
                      const InputDecoration(
                    labelText: 'Email',
                    prefixIcon:
                        Icon(Icons.email_outlined),
                  ),
                  validator: (value) {
                    if (value == null ||
                        value.trim().isEmpty) {
                      return 'Enter your email.';
                    }

                    if (!value.contains('@')) {
                      return 'Enter a valid email.';
                    }

                    return null;
                  },
                ),

                const SizedBox(height: 14),

                TextFormField(
                  controller:
                      _phoneController,
                  keyboardType:
                      TextInputType.phone,
                  decoration:
                      const InputDecoration(
                    labelText: 'Mobile number',
                    prefixIcon:
                        Icon(Icons.phone_outlined),
                  ),
                  validator: (value) {
                    if (value == null ||
                        value.trim().isEmpty) {
                      return 'Enter your mobile number.';
                    }

                    return null;
                  },
                ),

                const SizedBox(height: 14),

                TextFormField(
                  controller:
                      _passwordController,
                  obscureText:
                      _obscurePassword,
                  decoration:
                      InputDecoration(
                    labelText: 'Password',
                    prefixIcon:
                        const Icon(
                      Icons.lock_outline,
                    ),
                    suffixIcon:
                        IconButton(
                      onPressed: () {
                        setState(() {
                          _obscurePassword =
                              !_obscurePassword;
                        });
                      },
                      icon: Icon(
                        _obscurePassword
                            ? Icons
                                .visibility_outlined
                            : Icons
                                .visibility_off_outlined,
                      ),
                    ),
                  ),
                  validator: (value) {
                    if (value == null ||
                        value.length < 8) {
                      return 'Password must be at least 8 characters.';
                    }

                    return null;
                  },
                ),

                const SizedBox(height: 20),

                DropdownButtonFormField<String>(
                  initialValue: _language,
                  decoration:
                      const InputDecoration(
                    labelText: 'Preferred language',
                    prefixIcon:
                        Icon(Icons.language),
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'English',
                      child: Text('English'),
                    ),
                    DropdownMenuItem(
                      value: 'Hindi',
                      child: Text('Hindi'),
                    ),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _language = value;
                      });
                    }
                  },
                ),

                const SizedBox(height: 14),

                TextFormField(
                  initialValue: _nationality,
                  readOnly: true,
                  decoration:
                      const InputDecoration(
                    labelText: 'Nationality code',
                    prefixIcon:
                        Icon(Icons.flag_outlined),
                  ),
                ),

                const SizedBox(height: 14),

                DropdownButtonFormField<String>(
                  initialValue: _identityType,
                  decoration:
                      const InputDecoration(
                    labelText: 'Identity document',
                    prefixIcon:
                        Icon(Icons.badge_outlined),
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'AADHAAR',
                      child: Text('Aadhaar'),
                    ),
                    DropdownMenuItem(
                      value: 'PASSPORT',
                      child: Text('Passport'),
                    ),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _identityType = value;
                      });
                    }
                  },
                ),

                const SizedBox(height: 14),

                TextFormField(
                  controller:
                      _identityController,
                  decoration:
                      InputDecoration(
                    labelText:
                        '$_identityType number',
                    prefixIcon:
                        const Icon(
                      Icons.credit_card_outlined,
                    ),
                  ),
                  validator: (value) {
                    if (value == null ||
                        value.trim().isEmpty) {
                      return 'Enter your $_identityType number.';
                    }

                    return null;
                  },
                ),

                const SizedBox(height: 26),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed:
                        _loading
                            ? null
                            : _register,
                    child: _loading
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child:
                                CircularProgressIndicator(
                              strokeWidth: 2,
                              color:
                                  Colors.white,
                            ),
                          )
                        : const Text(
                            'Create Account',
                            style: TextStyle(
                              fontWeight:
                                  FontWeight.w700,
                            ),
                          ),
                  ),
                ),

                const SizedBox(height: 12),

                const Text(
                  'Your identity number is used only to create your TravelBuddy identity and is not stored as plain text.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color:
                        Color(0xFF7B8794),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

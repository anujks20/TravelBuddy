import 'package:flutter/material.dart';

import '../../models/emergency_contact_model.dart';
import '../../services/emergency_contact_service.dart';

class EmergencyContactsScreen
    extends StatefulWidget {
  const EmergencyContactsScreen({
    super.key,
  });

  @override
  State<EmergencyContactsScreen> createState() =>
      _EmergencyContactsScreenState();
}

class _EmergencyContactsScreenState
    extends State<EmergencyContactsScreen> {
  List<EmergencyContactModel> _contacts = [];

  bool _loading = true;
  bool _adding = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  Future<void> _loadContacts() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final contacts =
          await EmergencyContactService
              .getContacts();

      if (!mounted) {
        return;
      }

      setState(() {
        _contacts = contacts;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _loading = false;
        _error = error
            .toString()
            .replaceFirst(
              'Exception: ',
              '',
            );
      });
    }
  }

  Future<void> _showAddContactDialog() async {
    final nameController =
        TextEditingController();

    final phoneController =
        TextEditingController();

    final relationshipController =
        TextEditingController();

    var priority = 1;

    final formKey =
        GlobalKey<FormState>();

    final added = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (
            context,
            setDialogState,
          ) {
            return AlertDialog(
              title: const Text(
                'Add Emergency Contact',
              ),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize:
                        MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller:
                            nameController,
                        textCapitalization:
                            TextCapitalization.words,
                        decoration:
                            const InputDecoration(
                          labelText: 'Full Name',
                          prefixIcon:
                              Icon(
                            Icons.person_outline,
                          ),
                        ),
                        validator: (value) {
                          if (value == null ||
                              value.trim().isEmpty) {
                            return 'Enter a name.';
                          }

                          return null;
                        },
                      ),

                      const SizedBox(height: 14),

                      TextFormField(
                        controller:
                            phoneController,
                        keyboardType:
                            TextInputType.phone,
                        decoration:
                            const InputDecoration(
                          labelText: 'Phone Number',
                          prefixIcon:
                              Icon(
                            Icons.phone_outlined,
                          ),
                        ),
                        validator: (value) {
                          if (value == null ||
                              value.trim().isEmpty) {
                            return 'Enter a phone number.';
                          }

                          if (value.trim().length <
                              7) {
                            return 'Enter a valid phone number.';
                          }

                          return null;
                        },
                      ),

                      const SizedBox(height: 14),

                      TextFormField(
                        controller:
                            relationshipController,
                        textCapitalization:
                            TextCapitalization.words,
                        decoration:
                            const InputDecoration(
                          labelText:
                              'Relationship',
                          hintText:
                              'Brother, Mother, Friend...',
                          prefixIcon:
                              Icon(
                            Icons.people_outline,
                          ),
                        ),
                      ),

                      const SizedBox(height: 14),

                      DropdownButtonFormField<int>(
                        initialValue: priority,
                        decoration:
                            const InputDecoration(
                          labelText: 'Priority',
                          prefixIcon:
                              Icon(
                            Icons.priority_high,
                          ),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: 1,
                            child: Text(
                              'Priority 1',
                            ),
                          ),
                          DropdownMenuItem(
                            value: 2,
                            child: Text(
                              'Priority 2',
                            ),
                          ),
                          DropdownMenuItem(
                            value: 3,
                            child: Text(
                              'Priority 3',
                            ),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            setDialogState(() {
                              priority = value;
                            });
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.of(
                      dialogContext,
                    ).pop(false);
                  },
                  child: const Text(
                    'CANCEL',
                  ),
                ),
                FilledButton(
                  onPressed: _adding
                      ? null
                      : () async {
                          if (!formKey
                              .currentState!
                              .validate()) {
                            return;
                          }

                          setDialogState(() {
                            _adding = true;
                          });

                          try {
                            await EmergencyContactService
                                .addContact(
                              name:
                                  nameController.text,
                              phone:
                                  phoneController.text,
                              relationship:
                                  relationshipController
                                      .text
                                      .trim()
                                      .isEmpty
                                  ? null
                                  : relationshipController
                                      .text,
                              priority: priority,
                            );

                            if (!dialogContext
                                .mounted) {
                              return;
                            }

                            Navigator.of(
                              dialogContext,
                            ).pop(true);
                          } catch (error) {
                            if (!dialogContext
                                .mounted) {
                              return;
                            }

                            ScaffoldMessenger
                                .of(
                              dialogContext,
                            ).showSnackBar(
                              SnackBar(
                                backgroundColor:
                                    const Color(
                                  0xFFD32F2F,
                                ),
                                content: Text(
                                  error
                                      .toString()
                                      .replaceFirst(
                                        'Exception: ',
                                        '',
                                      ),
                                ),
                              ),
                            );

                            setDialogState(() {
                              _adding = false;
                            });
                          }
                        },
                  child: _adding
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
                          'SAVE',
                        ),
                ),
              ],
            );
          },
        );
      },
    );

    nameController.dispose();
    phoneController.dispose();
    relationshipController.dispose();

    if (added == true && mounted) {
      await _loadContacts();

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context)
          .showSnackBar(
        const SnackBar(
          content: Text(
            'Emergency contact added successfully.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Emergency Contacts',
          style: TextStyle(
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      floatingActionButton:
          FloatingActionButton.extended(
        onPressed: _showAddContactDialog,
        backgroundColor:
            const Color(0xFF176B87),
        foregroundColor: Colors.white,
        icon: const Icon(
          Icons.person_add_alt_1,
        ),
        label: const Text(
          'Add Contact',
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadContacts,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return ListView(
        physics:
            const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 120),
          const Icon(
            Icons.error_outline,
            size: 54,
            color: Color(0xFFD32F2F),
          ),
          const SizedBox(height: 14),
          const Text(
            'Unable to load contacts',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF6B7C93),
            ),
          ),
          const SizedBox(height: 18),
          Center(
            child: OutlinedButton(
              onPressed: _loadContacts,
              child: const Text(
                'TRY AGAIN',
              ),
            ),
          ),
        ],
      );
    }

    if (_contacts.isEmpty) {
      return ListView(
        physics:
            const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 100),
          Container(
            width: 76,
            height: 76,
            margin:
                const EdgeInsets.symmetric(
              horizontal: 120,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F3F6),
              borderRadius:
                  BorderRadius.circular(22),
            ),
            child: const Icon(
              Icons.contacts_outlined,
              size: 38,
              color: Color(0xFF176B87),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'No Emergency Contacts',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Color(0xFF102A43),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Add trusted people who should be alerted when you activate an emergency SOS.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xFF6B7C93),
              fontSize: 14,
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      physics:
          const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        20,
        20,
        20,
        100,
      ),
      itemCount: _contacts.length,
      separatorBuilder: (_, _) =>
          const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final contact = _contacts[index];

        return _ContactCard(
          contact: contact,
        );
      },
    );
  }
}

class _ContactCard extends StatelessWidget {
  final EmergencyContactModel contact;

  const _ContactCard({
    required this.contact,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius:
            BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFE0E7EF),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFFE8F3F6),
              borderRadius:
                  BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.person_outline,
              color: Color(0xFF176B87),
            ),
          ),

          const SizedBox(width: 14),

          Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  contact.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight:
                        FontWeight.w700,
                    color:
                        Color(0xFF102A43),
                  ),
                ),

                const SizedBox(height: 4),

                Text(
                  contact.phone,
                  style: const TextStyle(
                    color: Color(0xFF52606D),
                    fontSize: 14,
                  ),
                ),

                if (contact.relationship !=
                        null &&
                    contact.relationship!
                        .isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    contact.relationship!,
                    style: const TextStyle(
                      color:
                          Color(0xFF7B8794),
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),

          Container(
            padding:
                const EdgeInsets.symmetric(
              horizontal: 9,
              vertical: 6,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFFF0F4F8),
              borderRadius:
                  BorderRadius.circular(10),
            ),
            child: Text(
              '#${contact.priority}',
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: Color(0xFF52606D),
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
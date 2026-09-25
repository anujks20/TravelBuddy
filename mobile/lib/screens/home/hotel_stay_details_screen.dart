import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';
import '../../models/hotel_stay_model.dart';
import '../../models/user_model.dart';

class HotelStayDetailsScreen extends StatelessWidget {
  final HotelStayModel stay;
  final UserModel? user;

  const HotelStayDetailsScreen({
    super.key,
    required this.stay,
    this.user,
  });

  String _formatDateTime(DateTime dt) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final month = months[dt.month - 1];
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return '${dt.day} $month ${dt.year}, $hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    final bool isActive = stay.status.toUpperCase() == 'ACTIVE';
    final bool isCompleted = stay.status.toUpperCase() == 'COMPLETED';

    Color statusBg = const Color(0xFFF1F5F9);
    Color statusFg = const Color(0xFF475569);
    String statusLabel = stay.status;

    if (isActive) {
      statusBg = const Color(0xFFECFDF5);
      statusFg = const Color(0xFF059669);
      statusLabel = 'CURRENT STAY';
    } else if (isCompleted) {
      statusBg = const Color(0xFFEFF6FF);
      statusFg = const Color(0xFF2563EB);
      statusLabel = 'COMPLETED';
    } else if (stay.status.toUpperCase() == 'CANCELLED') {
      statusBg = const Color(0xFFFEF2F2);
      statusFg = const Color(0xFFDC2626);
      statusLabel = 'CANCELLED';
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FA),
      appBar: AppBar(
        title: const Text(
          'Stay Details',
          style: TextStyle(
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
        children: [
          // Hotel Header Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isActive ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0),
                width: isActive ? 1.5 : 1.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F3F6),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.hotel_rounded,
                        color: AppTheme.primary,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            stay.hotelName,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF102A43),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: statusBg,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              statusLabel,
                              style: TextStyle(
                                color: statusFg,
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (stay.partnerStatus) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: const Color(0xFFBBF7D0),
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.verified,
                          size: 14,
                          color: Color(0xFF16A34A),
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Official Verified Partner Station',
                          style: TextStyle(
                            color: Color(0xFF16A34A),
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                if (stay.hotelAddress != null || stay.hotelCity != null) ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 18,
                        color: Color(0xFF64748B),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          [stay.hotelAddress, stay.hotelCity, stay.hotelState, stay.hotelCountry]
                              .where((e) => e != null && e.trim().isNotEmpty)
                              .join(', '),
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF475569),
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Stay Schedule
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: const Color(0xFFE2E8F0),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Stay Schedule',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF102A43),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0F9FF),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFFBAE6FD),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(
                                  Icons.login_rounded,
                                  size: 16,
                                  color: Color(0xFF0284C7),
                                ),
                                SizedBox(width: 6),
                                Text(
                                  'Check-In',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0284C7),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _formatDateTime(stay.checkIn),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF7ED),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFFFED7AA),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(
                                  Icons.logout_rounded,
                                  size: 16,
                                  color: Color(0xFFEA580C),
                                ),
                                SizedBox(width: 6),
                                Text(
                                  'Check-Out',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFFEA580C),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              stay.checkOut != null
                                  ? _formatDateTime(stay.checkOut!)
                                  : (isActive ? 'Active Stay' : 'Not recorded'),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Booking Details Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: const Color(0xFFE2E8F0),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Booking Information',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF102A43),
                  ),
                ),
                const SizedBox(height: 14),
                if (stay.bookingReference != null &&
                    stay.bookingReference!.trim().isNotEmpty) ...[
                  _DetailRow(
                    label: 'Room Number',
                    value: stay.bookingReference!,
                    isCopyable: true,
                    onCopy: () {
                      Clipboard.setData(ClipboardData(text: stay.bookingReference!));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Room number copied!'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                  ),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                ],
                _DetailRow(
                  label: 'Registration Source',
                  value: stay.source == 'HOTEL_PORTAL'
                      ? 'Hotel Partner Desk Portal'
                      : stay.source,
                ),
                if (stay.createdAt != null) ...[
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _DetailRow(
                    label: 'Recorded On',
                    value: _formatDateTime(stay.createdAt!),
                  ),
                ],
                if (user != null && user!.touristUid.isNotEmpty) ...[
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _DetailRow(
                    label: 'Linked Tourist UID',
                    value: user!.touristUid,
                    isCopyable: true,
                    onCopy: () {
                      Clipboard.setData(ClipboardData(text: user!.touristUid));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Tourist UID copied!'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Front Desk Contact Card
          if (stay.hotelPhone != null && stay.hotelPhone!.trim().isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: const Color(0xFFE2E8F0),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Front Desk Assistance',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF102A43),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.phone_in_talk_rounded,
                          color: Color(0xFF059669),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Hotel Reception Desk',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              stay.hotelPhone!,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      InkWell(
                        onTap: () {
                          Clipboard.setData(ClipboardData(text: stay.hotelPhone!));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Phone number copied!'),
                              duration: Duration(seconds: 2),
                            ),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'COPY',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF475569),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Safety Grid Note
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFFBFDBFE),
              ),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.shield_outlined,
                  color: Color(0xFF2563EB),
                  size: 20,
                ),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'This stay is verified and registered with TravelBuddy Safety Grid. In the event of an SOS emergency, responders can access your hotel verification details.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF1E40AF),
                      height: 1.4,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isCopyable;
  final VoidCallback? onCopy;

  const _DetailRow({
    required this.label,
    required this.value,
    this.isCopyable = false,
    this.onCopy,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w500,
          ),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1E293B),
              ),
            ),
            if (isCopyable && onCopy != null) ...[
              const SizedBox(width: 6),
              InkWell(
                onTap: onCopy,
                child: const Icon(
                  Icons.copy_rounded,
                  size: 14,
                  color: Color(0xFF0284C7),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

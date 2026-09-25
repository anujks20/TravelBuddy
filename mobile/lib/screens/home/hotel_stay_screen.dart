import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';
import '../../models/hotel_stay_model.dart';
import '../../models/user_model.dart';
import '../../services/hotel_stay_service.dart';
import 'hotel_stay_details_screen.dart';

class HotelStayScreen extends StatefulWidget {
  final UserModel? user;

  const HotelStayScreen({
    super.key,
    this.user,
  });

  @override
  State<HotelStayScreen> createState() => _HotelStayScreenState();
}

class _HotelStayScreenState extends State<HotelStayScreen> {
  late Future<List<HotelStayModel>> _staysFuture;

  @override
  void initState() {
    super.initState();
    _loadStays();
  }

  void _loadStays() {
    _staysFuture = HotelStayService.getMyHotelStays();
  }

  Future<void> _refreshStays() async {
    setState(() {
      _loadStays();
    });
    await _staysFuture;
  }

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
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FA),
      appBar: AppBar(
        title: const Text(
          'Hotel Stays',
          style: TextStyle(
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _refreshStays,
          ),
        ],
      ),
      body: FutureBuilder<List<HotelStayModel>>(
        future: _staysFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError) {
            return _HotelStayErrorView(
              message: snapshot.error
                  .toString()
                  .replaceFirst('Exception: ', ''),
              onRetry: () {
                setState(() {
                  _loadStays();
                });
              },
            );
          }

          final stays = snapshot.data ?? [];

          return RefreshIndicator(
            onRefresh: _refreshStays,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 32),
              children: [
                // Tourist UID Card for Hotel Check-in
                if (widget.user != null && widget.user!.touristUid.isNotEmpty) ...[
                  _TouristUidBanner(touristUid: widget.user!.touristUid),
                  const SizedBox(height: 18),
                ],

                if (stays.isEmpty) ...[
                  _EmptyStaysView(touristUid: widget.user?.touristUid),
                ] else ...[
                  Text(
                    'Linked Stays (${stays.length})',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF102A43),
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...stays.map((stay) => Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _StayCard(
                          stay: stay,
                          formatDateTime: _formatDateTime,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => HotelStayDetailsScreen(
                                  stay: stay,
                                  user: widget.user,
                                ),
                              ),
                            );
                          },
                        ),
                      )),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TouristUidBanner extends StatelessWidget {
  final String touristUid;

  const _TouristUidBanner({required this.touristUid});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF176B87), Color(0xFF0F4C5C)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF176B87).withValues(alpha: 0.25),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.badge_outlined,
                  color: Colors.white,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Hotel Check-In UID',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF34D399),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  'ACTIVE',
                  style: TextStyle(
                    color: Color(0xFF064E3B),
                    fontWeight: FontWeight.w800,
                    fontSize: 10,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Present this UID at partner hotel desks for instant verified check-in:',
            style: TextStyle(
              color: Color(0xFFE2E8F0),
              fontSize: 12,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.25),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    touristUid,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: touristUid));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Tourist UID copied to clipboard!'),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.copy_rounded,
                          size: 13,
                          color: Color(0xFF0F4C5C),
                        ),
                        SizedBox(width: 4),
                        Text(
                          'COPY',
                          style: TextStyle(
                            color: Color(0xFF0F4C5C),
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                          ),
                        ),
                      ],
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

class _StayCard extends StatelessWidget {
  final HotelStayModel stay;
  final String Function(DateTime) formatDateTime;
  final VoidCallback onTap;

  const _StayCard({
    required this.stay,
    required this.formatDateTime,
    required this.onTap,
  });

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

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isActive ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0),
              width: isActive ? 1.5 : 1.0,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F3F6),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.hotel_rounded,
                            color: AppTheme.primary,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                stay.hotelName,
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF102A43),
                                ),
                              ),
                              if (stay.hotelCity != null || stay.hotelAddress != null) ...[
                                const SizedBox(height: 3),
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.location_on_outlined,
                                      size: 14,
                                      color: Color(0xFF64748B),
                                    ),
                                    const SizedBox(width: 3),
                                    Expanded(
                                      child: Text(
                                        [stay.hotelAddress, stay.hotelCity, stay.hotelState]
                                            .where((e) => e != null && e.trim().isNotEmpty)
                                            .join(', '),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Color(0xFF64748B),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
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
                                  fontSize: 10,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Icon(
                              Icons.chevron_right_rounded,
                              color: Color(0xFF94A3B8),
                              size: 20,
                            ),
                          ],
                        ),
                      ],
                    ),
                    if (stay.partnerStatus) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: const Color(0xFFBBF7D0),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.verified,
                              size: 12,
                              color: Color(0xFF16A34A),
                            ),
                            SizedBox(width: 4),
                            Text(
                              'Verified Partner Hotel',
                              style: TextStyle(
                                color: Color(0xFF16A34A),
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const Divider(height: 1, color: Color(0xFFF1F5F9)),

              // Timing and details
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _StayMetaItem(
                            icon: Icons.login_rounded,
                            label: 'Check-In',
                            value: formatDateTime(stay.checkIn),
                            color: const Color(0xFF0284C7),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StayMetaItem(
                            icon: Icons.logout_rounded,
                            label: 'Check-Out',
                            value: stay.checkOut != null
                                ? formatDateTime(stay.checkOut!)
                                : (isActive ? 'Active Stay' : 'Not recorded'),
                            color: const Color(0xFFEA580C),
                          ),
                        ),
                      ],
                    ),

                    if (stay.bookingReference != null &&
                        stay.bookingReference!.trim().isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.meeting_room_outlined,
                              size: 15,
                              color: Color(0xFF64748B),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'Room No: ',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            Text(
                              stay.bookingReference!,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    if (stay.hotelPhone != null && stay.hotelPhone!.trim().isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(
                            Icons.phone_outlined,
                            size: 14,
                            color: Color(0xFF64748B),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Front Desk: ${stay.hotelPhone}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF475569),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StayMetaItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StayMetaItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E293B),
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _EmptyStaysView extends StatelessWidget {
  final String? touristUid;

  const _EmptyStaysView({this.touristUid});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: const Color(0xFFE8F3F6),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.hotel_outlined,
              size: 36,
              color: AppTheme.primary,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'No Hotel Stays Linked Yet',
            style: TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w800,
              color: Color(0xFF102A43),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            'When you check in at any TravelBuddy partner hotel, staff will record your stay via the Hotel Portal and it will appear here in real time.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFE2E8F0),
              ),
            ),
            child: const Row(
              children: [
                Icon(
                  Icons.info_outline_rounded,
                  size: 18,
                  color: Color(0xFF0284C7),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Partner stations automatically sync stay dates and hotel contacts directly to your safe journey itinerary.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF334155),
                      height: 1.35,
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

class _HotelStayErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _HotelStayErrorView({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 52,
              color: Color(0xFF94A3B8),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Color(0xFF334155),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../models/trip_model.dart';
import '../../services/trip_service.dart';

class TripDetailsScreen extends StatefulWidget {
  final TripModel trip;

  const TripDetailsScreen({
    super.key,
    required this.trip,
  });

  @override
  State<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends State<TripDetailsScreen> {
  late TripModel _currentTrip;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _currentTrip = widget.trip;
    // If current trip is missing detailed itinerary or metadata, fetch it from backend
    if (_currentTrip.itinerary == null || _currentTrip.itinerary!.isEmpty) {
      _fetchFullTrip();
    }
  }

  Future<void> _fetchFullTrip() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final fetchedTrip = await TripService.getTripById(_currentTrip.id);
      if (mounted) {
        setState(() {
          _currentTrip = fetchedTrip;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          // If we already have the basic trip from list, keep displaying it
          _isLoading = false;
          // Only show error message if we have nothing
          if (_currentTrip.itinerary == null || _currentTrip.itinerary!.isEmpty) {
            _errorMessage = e.toString().replaceFirst('Exception: ', '');
          }
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = _currentTrip;
    final metadata = trip.plannerMetadata ?? {};
    final daysCount = trip.endDate.difference(trip.startDate).inDays + 1;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text(
          'Trip Details',
          style: TextStyle(
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(
              trip.isSaved ? Icons.bookmark_rounded : Icons.bookmark_add_outlined,
              color: trip.isSaved ? const Color(0xFF0F766E) : null,
            ),
            tooltip: trip.isSaved ? 'Saved Trip' : 'Save Trip',
            onPressed: () async {
              final newStatus = !trip.isSaved;
              try {
                final updated = await TripService.updateTrip(
                  tripId: trip.id,
                  isSaved: newStatus,
                );
                if (mounted) {
                  setState(() {
                    _currentTrip = updated;
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        newStatus
                            ? 'Trip added to Saved Trips'
                            : 'Trip moved to Explored Trips',
                      ),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed to update trip: $e')),
                  );
                }
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Trip Details',
            onPressed: _fetchFullTrip,
          ),
        ],
      ),
      body: _isLoading && (trip.itinerary == null || trip.itinerary!.isEmpty)
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchFullTrip,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                children: [
                  _buildHeaderCard(trip),
                  const SizedBox(height: 16),
                  _buildTripInfoSection(trip, metadata, daysCount),
                  const SizedBox(height: 24),
                  _buildItinerarySection(trip),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  Widget _buildHeaderCard(TripModel trip) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFE0E7EF),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 10,
            offset: Offset(0, 4),
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
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F3F6),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.map_outlined,
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
                      trip.title,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF102A43),
                      ),
                    ),
                    if (trip.destination != null &&
                        trip.destination!.trim().isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(
                            Icons.location_on_outlined,
                            size: 16,
                            color: Color(0xFF7B8794),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              trip.destination!,
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF52606D),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              _buildStatusChip(trip),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0xFFE0E7EF)),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(
                Icons.calendar_today_outlined,
                size: 16,
                color: AppTheme.primary,
              ),
              const SizedBox(width: 8),
              Text(
                '${_formatDate(trip.startDate)} - ${_formatDate(trip.endDate)}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF334E68),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(TripModel trip) {
    if (trip.isSaved) {
      return Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 10,
          vertical: 5,
        ),
        decoration: BoxDecoration(
          color: const Color(0xFFCCFBF1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: const Color(0xFF5EEAD4),
            width: 0.8,
          ),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_rounded, size: 12, color: Color(0xFF0F766E)),
            SizedBox(width: 4),
            Text(
              'SAVED',
              style: TextStyle(
                color: Color(0xFF0F766E),
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      );
    }

    Color bg = const Color(0xFFF1F5F9);
    Color fg = const Color(0xFF475569);

    final upper = trip.status.toUpperCase();
    if (upper == 'ONGOING') {
      bg = const Color(0xFFE3F2FD);
      fg = const Color(0xFF1976D2);
    } else if (upper == 'COMPLETED') {
      bg = const Color(0xFFE8F5E9);
      fg = const Color(0xFF2E7D32);
    } else if (upper == 'CANCELLED') {
      bg = const Color(0xFFFFEBEE);
      fg = const Color(0xFFC62828);
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 5,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        'EXPLORED',
        style: TextStyle(
          color: fg,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _buildTripInfoSection(
    TripModel trip,
    Map<String, dynamic> metadata,
    int daysCount,
  ) {
    final travelers = metadata['travelers'] ??
        metadata['travelerCount'] ??
        metadata['numTravelers'] ??
        metadata['traveler_count'] ??
        '1 person';

    final budget = metadata['budget'] ??
        metadata['totalBudget'] ??
        metadata['budget_limit'] ??
        metadata['budgetAmount'];

    final currency = metadata['currency']?.toString() ?? 'INR';

    final travelMode = metadata['travelMode'] ??
        metadata['travel_mode'] ??
        metadata['mode'] ??
        metadata['transportation'] ??
        'Not specified';

    final pace = metadata['pace'] ??
        metadata['travelPace'] ??
        metadata['pace_level'] ??
        'Moderate';

    final interests = metadata['interests'] ??
        metadata['preferences'] ??
        metadata['activities'];

    final foodPreferences = metadata['foodPreferences'] ??
        metadata['dietaryPreferences'] ??
        metadata['diet'] ??
        metadata['food_preferences'];

    final specialReqs = metadata['specialRequirements'] ??
        metadata['notes'] ??
        metadata['special_requirements'];

    final routeInfo = metadata['route'] ??
        metadata['routeInfo'] ??
        metadata['source'] ??
        metadata['origin'];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFE0E7EF),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Trip Information',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: Color(0xFF102A43),
            ),
          ),
          const SizedBox(height: 16),
          _buildInfoGrid([
            _InfoItem(
              icon: Icons.calendar_month_outlined,
              label: 'Duration',
              value: '$daysCount ${daysCount == 1 ? "day" : "days"}',
            ),
            _InfoItem(
              icon: Icons.people_outline,
              label: 'Travelers',
              value: travelers.toString(),
            ),
            if (budget != null)
              _InfoItem(
                icon: Icons.account_balance_wallet_outlined,
                label: 'Budget',
                value: '$budget $currency',
              ),
            _InfoItem(
              icon: Icons.directions_car_outlined,
              label: 'Travel Mode',
              value: travelMode.toString(),
            ),
            _InfoItem(
              icon: Icons.speed_outlined,
              label: 'Pace',
              value: pace.toString(),
            ),
            if (routeInfo != null && routeInfo.toString().trim().isNotEmpty)
              _InfoItem(
                icon: Icons.alt_route_outlined,
                label: 'Route / Origin',
                value: routeInfo.toString(),
              ),
          ]),
          if (interests != null && interests.toString().trim().isNotEmpty) ...[
            const SizedBox(height: 14),
            _buildDetailRow(
              icon: Icons.favorite_outline,
              label: 'Interests',
              value: interests is List ? interests.join(', ') : interests.toString(),
            ),
          ],
          if (foodPreferences != null &&
              foodPreferences.toString().trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildDetailRow(
              icon: Icons.restaurant_outlined,
              label: 'Food Preferences',
              value: foodPreferences is List
                  ? foodPreferences.join(', ')
                  : foodPreferences.toString(),
            ),
          ],
          if (specialReqs != null &&
              specialReqs.toString().trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildDetailRow(
              icon: Icons.info_outline,
              label: 'Special Requirements',
              value: specialReqs is List
                  ? specialReqs.join(', ')
                  : specialReqs.toString(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoGrid(List<_InfoItem> items) {
    return Wrap(
      spacing: 16,
      runSpacing: 14,
      children: items.map((item) {
        return SizedBox(
          width: (MediaQuery.of(context).size.width - 32 - 40 - 16) / 2,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(item.icon, size: 18, color: const Color(0xFF7B8794)),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.label,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF7B8794),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.value,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF243B53),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: const Color(0xFF7B8794)),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 13, color: Color(0xFF334E68)),
              children: [
                TextSpan(
                  text: '$label: ',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                TextSpan(text: value),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildItinerarySection(TripModel trip) {
    final rawItinerary = trip.itinerary;

    if (rawItinerary == null || rawItinerary.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE0E7EF)),
        ),
        child: Column(
          children: [
            const Icon(
              Icons.event_note_outlined,
              size: 48,
              color: Color(0xFF9AA5B1),
            ),
            const SizedBox(height: 12),
            const Text(
              'No itinerary available for this trip.',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF102A43),
              ),
              textAlign: TextAlign.center,
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                _errorMessage!,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFFD32F2F),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4),
          child: Text(
            'ITINERARY',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
              color: Color(0xFF627D98),
            ),
          ),
        ),
        const SizedBox(height: 12),
        ...rawItinerary.asMap().entries.map((entry) {
          final index = entry.key;
          final dayData = entry.value;
          return _buildDayCard(dayData, index + 1);
        }),
      ],
    );
  }

  Widget _buildDayCard(dynamic dayData, int fallbackDayNumber) {
    if (dayData is! Map) {
      return const SizedBox.shrink();
    }

    final dayMap = Map<String, dynamic>.from(dayData);
    final dayNum = dayMap['day'] ?? fallbackDayNumber;
    final dayTitle = dayMap['title']?.toString() ?? 'Day $dayNum';
    final dayDate = dayMap['date']?.toString();
    final rawActivities = dayMap['activities'] ?? dayMap['items'] ?? dayMap['places'];
    final List<dynamic> activities =
        rawActivities is List ? rawActivities : [];

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFE0E7EF),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x05000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Day Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: const BoxDecoration(
              color: Color(0xFFF0F4F8),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'DAY $dayNum',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dayTitle,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF102A43),
                        ),
                      ),
                      if (dayDate != null && dayDate.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          dayDate,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF627D98),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Activities List
          if (activities.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No activities planned for this day.',
                style: TextStyle(
                  color: Color(0xFF7B8794),
                  fontSize: 13,
                  fontStyle: FontStyle.italic,
                ),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: activities.length,
                separatorBuilder: (_, _) => const Divider(
                  height: 20,
                  color: Color(0xFFF0F4F8),
                ),
                itemBuilder: (context, actIndex) {
                  return _buildActivityItem(activities[actIndex]);
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildActivityItem(dynamic activityData) {
    if (activityData is! Map) {
      return Text(activityData.toString());
    }

    final actMap = Map<String, dynamic>.from(activityData);

    // Canonical fields support with fallbacks:
    final activityName = actMap['activity'] ??
        actMap['title'] ??
        actMap['name'] ??
        'Activity';

    final description = actMap['description'] ??
        actMap['desc'] ??
        actMap['details'] ??
        '';

    final location = actMap['location'] ??
        actMap['place'] ??
        actMap['area']?.toString();

    final time = actMap['time']?.toString() ??
        actMap['timeSlot']?.toString() ??
        actMap['time_slot']?.toString();

    final cost = actMap['cost'];
    final durationMinutes = actMap['durationMinutes'] ??
        actMap['duration_minutes'] ??
        actMap['duration'];

    final notes = actMap['notes']?.toString();
    final isLocked = actMap['locked'] == true;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (time != null && time.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F3F6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  time,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.primary,
                  ),
                ),
              ),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Text(
                activityName.toString(),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF102A43),
                ),
              ),
            ),
            if (isLocked)
              const Padding(
                padding: EdgeInsets.only(left: 6),
                child: Icon(
                  Icons.lock_outline,
                  size: 16,
                  color: Color(0xFF627D98),
                ),
              ),
          ],
        ),

        if (description.toString().trim().isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            description.toString(),
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF486581),
              height: 1.35,
            ),
          ),
        ],

        const SizedBox(height: 8),

        // Metadata badges (Location, Cost, Duration)
        Wrap(
          spacing: 12,
          runSpacing: 6,
          children: [
            if (location != null && location.toString().trim().isNotEmpty)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.place_outlined,
                    size: 14,
                    color: Color(0xFF7B8794),
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      location.toString(),
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF627D98),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            if (cost != null && cost.toString() != '0')
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.payments_outlined,
                    size: 14,
                    color: Color(0xFF2E7D32),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '₹$cost',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF2E7D32),
                    ),
                  ),
                ],
              ),
            if (durationMinutes != null && durationMinutes.toString().isNotEmpty)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.schedule_outlined,
                    size: 14,
                    color: Color(0xFF7B8794),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    durationMinutes.toString().contains('min')
                        ? durationMinutes.toString()
                        : '$durationMinutes mins',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF627D98),
                    ),
                  ),
                ],
              ),
          ],
        ),

        if (notes != null && notes.trim().isNotEmpty) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8E7),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: const Color(0xFFFFECC8),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.lightbulb_outline,
                  size: 14,
                  color: Color(0xFFB7791F),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    notes,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF8D5B00),
                      height: 1.25,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  static String _formatDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year.toString();
    return '$day/$month/$year';
  }
}

class _InfoItem {
  final IconData icon;
  final String label;
  final String value;

  _InfoItem({
    required this.icon,
    required this.label,
    required this.value,
  });
}

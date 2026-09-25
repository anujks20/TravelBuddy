import 'package:flutter/material.dart';

import '../../models/trip_model.dart';
import '../../services/trip_service.dart';
import 'trip_details_screen.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  late Future<List<TripModel>> _tripsFuture;
  int _selectedSection = 0; // 0 = Saved Trips, 1 = Explored Trips

  @override
  void initState() {
    super.initState();
    _loadTrips();
  }

  void _loadTrips() {
    _tripsFuture = TripService.getMyTrips();
  }

  Future<void> _refreshTrips() async {
    setState(() {
      _loadTrips();
    });

    await _tripsFuture;
  }

  Future<void> _toggleSaveTrip(TripModel trip) async {
    final newSavedStatus = !trip.isSaved;
    try {
      await TripService.updateTrip(
        tripId: trip.id,
        isSaved: newSavedStatus,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              newSavedStatus
                  ? 'Trip added to Saved Trips'
                  : 'Trip removed from Saved Trips',
            ),
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      await _refreshTrips();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update trip: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'My Trips',
          style: TextStyle(
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: FutureBuilder<List<TripModel>>(
        future: _tripsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError) {
            return _TripsMessage(
              icon: Icons.cloud_off_outlined,
              message: snapshot.error
                  .toString()
                  .replaceFirst('Exception: ', ''),
              actionLabel: 'Retry',
              onAction: () {
                setState(() {
                  _loadTrips();
                });
              },
            );
          }

          final allTrips = snapshot.data ?? [];
          final savedTrips = allTrips.where((t) => t.isSaved).toList();
          final exploredTrips = allTrips.where((t) => !t.isSaved).toList();

          return Column(
            children: [
              _buildSectionSwitcher(savedTrips.length, exploredTrips.length),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _refreshTrips,
                  child: _selectedSection == 0
                      ? _buildSavedSection(savedTrips, exploredTrips.length)
                      : _buildExploredSection(exploredTrips),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSectionSwitcher(int savedCount, int exploredCount) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFEEF2F6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: _SectionTabItem(
              title: 'Saved Trips',
              count: savedCount,
              icon: Icons.bookmark_rounded,
              isSelected: _selectedSection == 0,
              activeColor: const Color(0xFF0F766E),
              activeBadgeColor: const Color(0xFFCCFBF1),
              onTap: () => setState(() => _selectedSection = 0),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: _SectionTabItem(
              title: 'Explored',
              count: exploredCount,
              icon: Icons.explore_rounded,
              isSelected: _selectedSection == 1,
              activeColor: const Color(0xFF1E293B),
              activeBadgeColor: const Color(0xFFE2E8F0),
              onTap: () => setState(() => _selectedSection = 1),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSavedSection(List<TripModel> savedTrips, int exploredCount) {
    if (savedTrips.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 60),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: Color(0xFFF0FDF4),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.bookmark_border_rounded,
              size: 56,
              color: Color(0xFF0F766E),
            ),
          ),
          const SizedBox(height: 20),
          const Center(
            child: Text(
              'No Saved Trips Yet',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'Trips you search or plan appear in Explored. When you click "Save Trip" on the web planner, your trip will appear right here.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ),
          ),
          if (exploredCount > 0) ...[
            const SizedBox(height: 24),
            Center(
              child: OutlinedButton.icon(
                onPressed: () => setState(() => _selectedSection = 1),
                icon: const Icon(Icons.explore_outlined, size: 18),
                label: Text('View Explored Trips ($exploredCount)'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF0F766E),
                  side: const BorderSide(color: Color(0xFF0F766E)),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: savedTrips.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        return _TripCard(
          trip: savedTrips[index],
          onToggleSave: () => _toggleSaveTrip(savedTrips[index]),
          onDetailsReturned: _loadTrips,
        );
      },
    );
  }

  Widget _buildExploredSection(List<TripModel> exploredTrips) {
    if (exploredTrips.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: const [
          SizedBox(height: 60),
          Icon(
            Icons.explore_outlined,
            size: 64,
            color: Color(0xFF94A3B8),
          ),
          SizedBox(height: 20),
          Center(
            child: Text(
              'No Explored Trips',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
          ),
          SizedBox(height: 8),
          Center(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'When you search or generate trip itineraries on the web planner, they will appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: exploredTrips.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        return _TripCard(
          trip: exploredTrips[index],
          onToggleSave: () => _toggleSaveTrip(exploredTrips[index]),
          onDetailsReturned: _loadTrips,
        );
      },
    );
  }
}

class _SectionTabItem extends StatelessWidget {
  final String title;
  final int count;
  final IconData icon;
  final bool isSelected;
  final Color activeColor;
  final Color activeBadgeColor;
  final VoidCallback onTap;

  const _SectionTabItem({
    required this.title,
    required this.count,
    required this.icon,
    required this.isSelected,
    required this.activeColor,
    required this.activeBadgeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected ? Colors.white : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      elevation: isSelected ? 1 : 0,
      shadowColor: const Color(0x1A000000),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: isSelected ? activeColor : const Color(0xFF64748B),
              ),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? activeColor : const Color(0xFF64748B),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: isSelected ? activeBadgeColor : const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  count.toString(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? activeColor : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  final TripModel trip;
  final VoidCallback? onToggleSave;
  final VoidCallback? onDetailsReturned;

  const _TripCard({
    required this.trip,
    this.onToggleSave,
    this.onDetailsReturned,
  });

  @override
  Widget build(BuildContext context) {
    final isSaved = trip.isSaved;

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      elevation: 0,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => TripDetailsScreen(trip: trip),
            ),
          );
          onDetailsReturned?.call();
        },
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSaved
                  ? const Color(0xFF99F6E4).withOpacity(0.8)
                  : const Color(0xFFE2E8F0),
              width: isSaved ? 1.5 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: isSaved
                    ? const Color(0x0D0F766E)
                    : const Color(0x05000000),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isSaved
                          ? const Color(0xFFCCFBF1)
                          : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      isSaved
                          ? Icons.bookmark_rounded
                          : Icons.explore_outlined,
                      color: isSaved
                          ? const Color(0xFF0F766E)
                          : const Color(0xFF475569),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      trip.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _StatusChip(
                    status: isSaved ? 'SAVED' : 'EXPLORED',
                    isSaved: isSaved,
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.chevron_right,
                    color: Color(0xFF94A3B8),
                    size: 20,
                  ),
                ],
              ),
              if (trip.destination != null &&
                  trip.destination!.trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 16,
                      color: Color(0xFF64748B),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        trip.destination!,
                        style: const TextStyle(
                          color: Color(0xFF475569),
                          fontSize: 13,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.calendar_today_outlined,
                        size: 15,
                        color: Color(0xFF64748B),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${_formatDate(trip.startDate)} - ${_formatDate(trip.endDate)}',
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  if (onToggleSave != null)
                    InkWell(
                      onTap: onToggleSave,
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isSaved
                                  ? Icons.bookmark_remove_outlined
                                  : Icons.bookmark_add_outlined,
                              size: 15,
                              color: isSaved
                                  ? const Color(0xFFEF4444)
                                  : const Color(0xFF0F766E),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              isSaved ? 'Unsave' : 'Save Trip',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isSaved
                                    ? const Color(0xFFEF4444)
                                    : const Color(0xFF0F766E),
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
      ),
    );
  }

  static String _formatDate(DateTime date) {
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year.toString();

    return '$day/$month/$year';
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  final bool isSaved;

  const _StatusChip({
    required this.status,
    required this.isSaved,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: isSaved ? const Color(0xFFCCFBF1) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isSaved ? const Color(0xFF5EEAD4) : const Color(0xFFCBD5E1),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isSaved) ...[
            const Icon(
              Icons.check_rounded,
              size: 12,
              color: Color(0xFF0F766E),
            ),
            const SizedBox(width: 3),
          ],
          Text(
            status,
            style: TextStyle(
              color: isSaved
                  ? const Color(0xFF0F766E)
                  : const Color(0xFF475569),
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _TripsMessage extends StatelessWidget {
  final IconData icon;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  const _TripsMessage({
    required this.icon,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 56,
              color: const Color(0xFF94A3B8),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF475569),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onAction,
              child: Text(actionLabel),
            ),
          ],
        ),
      ),
    );
  }
}

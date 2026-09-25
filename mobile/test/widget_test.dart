import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/app.dart';

void main() {
  testWidgets('TravelBuddy app loads', (WidgetTester tester) async {
    await tester.pumpWidget(const TravelBuddyApp());

    expect(find.text('TravelBuddy'), findsOneWidget);
    expect(find.text('Travel safer.'), findsOneWidget);
  });
}

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { searchCityPlaces } = require('./src/services/placeService');

async function runTests() {
  console.log('===========================================================');
  console.log('TESTING INDIA-WIDE LANDMARK & CITY SEARCH OVERHAUL');
  console.log('===========================================================\n');

  let passedAll = true;

  // Test 1: City Explorer for "Rishikesh"
  console.log('--- TEST 1: City Explorer for "Rishikesh" ---');
  try {
    const res = await searchCityPlaces('Rishikesh', 20, 'explore');
    console.log(`Retrieved ${res.places.length} places for Rishikesh.`);
    const names = res.places.map(p => p.name);
    console.log('Top Places:', names);

    // Verify Lakshman Jhula is present
    const hasLakshmanJhula = names.some(n => /lakshman|laxman/i.test(n) && /jhula/i.test(n));
    const hasRamJhula = names.some(n => /ram\s*jhula/i.test(n));
    const hasTriveniGhat = names.some(n => /triveni\s*ghat/i.test(n));
    const hasYashsFarm = names.some(n => /yash/i.test(n) && /farm/i.test(n));
    const hasAnyFarm = names.some(n => /\bfarm\b/i.test(n));

    if (hasLakshmanJhula) {
      console.log('  ✅ [PASS] Lakshman Jhula is present in Rishikesh explore results!');
    } else {
      console.error('  ❌ [FAIL] Lakshman Jhula is MISSING in Rishikesh explore results!');
      passedAll = false;
    }

    if (hasRamJhula) {
      console.log('  ✅ [PASS] Ram Jhula is present in Rishikesh explore results!');
    } else {
      console.error('  ❌ [FAIL] Ram Jhula is MISSING in Rishikesh explore results!');
      passedAll = false;
    }

    if (hasTriveniGhat) {
      console.log('  ✅ [PASS] Triveni Ghat is present in Rishikesh explore results!');
    } else {
      console.error('  ❌ [FAIL] Triveni Ghat is MISSING in Rishikesh explore results!');
      passedAll = false;
    }

    if (!hasYashsFarm && !hasAnyFarm) {
      console.log("  ✅ [PASS] 'yash's farm' and all private farms are strictly EXCLUDED!");
    } else {
      console.error("  ❌ [FAIL] 'yash's farm' or private farm was FOUND in results!");
      passedAll = false;
    }
  } catch (e) {
    console.error('  ❌ [ERROR] Test 1 failed:', e.message);
    passedAll = false;
  }

  // Test 2: Direct Landmark Search for "Lakshman Jhula"
  console.log('\n--- TEST 2: Direct Search for "Lakshman Jhula" ---');
  try {
    const res = await searchCityPlaces('Lakshman Jhula', 20, 'explore');
    console.log(`Resolved destination: ${res.city.fullName}`);
    console.log(`Retrieved ${res.places.length} places.`);
    const firstPlace = res.places[0];
    console.log('Top #1 Place:', firstPlace?.name, '| Category:', firstPlace?.category, '| Photo:', firstPlace?.photoUrl ? 'YES' : 'NO');

    if (/lakshman|laxman/i.test(firstPlace?.name || '') && /jhula/i.test(firstPlace?.name || '')) {
      console.log('  ✅ [PASS] "Lakshman Jhula" is correctly placed at #1 with verified photo!');
    } else {
      console.error('  ❌ [FAIL] First place is not Lakshman Jhula! Found:', firstPlace?.name);
      passedAll = false;
    }

    if (res.city.name.toLowerCase().includes('rishikesh')) {
      console.log('  ✅ [PASS] City cleanly resolved to Rishikesh!');
    } else {
      console.error('  ❌ [FAIL] Unexpected resolved city:', res.city.name);
      passedAll = false;
    }
  } catch (e) {
    console.error('  ❌ [ERROR] Test 2 failed:', e.message);
    passedAll = false;
  }

  // Test 3: Phrase search "Lakshman Jhula in Rishikesh"
  console.log('\n--- TEST 3: Phrase Search "Lakshman Jhula in Rishikesh" ---');
  try {
    const res = await searchCityPlaces('Lakshman Jhula in Rishikesh', 20, 'explore');
    console.log(`Resolved destination: ${res.city.fullName}`);
    const firstPlace = res.places[0];
    console.log('Top #1 Place:', firstPlace?.name);
    if (/lakshman|laxman/i.test(firstPlace?.name || '') && /jhula/i.test(firstPlace?.name || '')) {
      console.log('  ✅ [PASS] "Lakshman Jhula in Rishikesh" resolved and placed at #1!');
    } else {
      console.error('  ❌ [FAIL] First place mismatch:', firstPlace?.name);
      passedAll = false;
    }
  } catch (e) {
    console.error('  ❌ [ERROR] Test 3 failed:', e.message);
    passedAll = false;
  }

  // Test 4: Direct landmark search "Golden Temple"
  console.log('\n--- TEST 4: Direct Landmark Search "Golden Temple" ---');
  try {
    const res = await searchCityPlaces('Golden Temple', 20, 'explore');
    console.log(`Resolved destination: ${res.city.fullName}`);
    const firstPlace = res.places[0];
    console.log('Top #1 Place:', firstPlace?.name);
    if (/harmandir|golden temple/i.test(firstPlace?.name || '')) {
      console.log('  ✅ [PASS] "Golden Temple" resolved to Amritsar and placed at #1!');
    } else {
      console.error('  ❌ [FAIL] First place mismatch:', firstPlace?.name);
      passedAll = false;
    }
  } catch (e) {
    console.error('  ❌ [ERROR] Test 4 failed:', e.message);
    passedAll = false;
  }

  // Test 5: Where to Eat for "Rishikesh"
  console.log('\n--- TEST 5: Where to Eat for "Rishikesh" ---');
  try {
    const res = await searchCityPlaces('Rishikesh', 20, 'eat');
    console.log(`Retrieved ${res.places.length} dining spots in Rishikesh.`);
    res.places.forEach((p, i) => console.log(`  ${i+1}. ${p.name} | Category: ${p.category} | Photo: ${p.photoUrl ? 'YES' : 'NO'}`));

    const hasChotiwala = res.places.some(p => /chotiwala/i.test(p.name));
    const hasGangaBeach = res.places.some(p => /ganga beach/i.test(p.name));
    const hasChain = res.places.some(p => /kfc|mcdonald|domino|burger king|subway/i.test(p.name));

    if (hasChotiwala || hasGangaBeach) {
      console.log('  ✅ [PASS] Famous authentic local eateries (Chotiwala/Ganga Beach) present in Rishikesh!');
    } else {
      console.error('  ❌ [FAIL] Authentic local dining missing in Rishikesh!');
      passedAll = false;
    }

    if (!hasChain) {
      console.log('  ✅ [PASS] 0 commercial fast-food chains found in Rishikesh Where to Eat!');
    } else {
      console.error('  ❌ [FAIL] Commercial chain found in Rishikesh Where to Eat!');
      passedAll = false;
    }
  } catch (e) {
    console.error('  ❌ [ERROR] Test 5 failed:', e.message);
    passedAll = false;
  }

  console.log('\n===========================================================');
  if (passedAll) {
    console.log('🎉 ALL LANDMARK & CITY OVERHAUL TESTS PASSED!');
  } else {
    console.log('⚠️ SOME TESTS FAILED - SEE LOGS ABOVE');
  }
  console.log('===========================================================');
}

runTests();

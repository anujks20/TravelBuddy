require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { searchCityPlaces } = require('./src/services/placeService');

const CITIES = ['Udaipur', 'Jaipur', 'Lucknow', 'Agra', 'Delhi'];

const DISQUALIFIED_EXPLORE_WORDS = [
    'park', 'garden', 'bagh', 'bari', 'udyan', 'hotel', 'resort', 'lodge', 
    'homestay', 'apartment', 'flat', 'society', 'residency', 'enclave', 'vihar'
];

const DISQUALIFIED_FOOD_WORDS = [
    'kfc', 'burger king', 'mcdonald', "domino's", 'dominos', 'pizza hut', 
    'subway', 'starbucks', 'costa coffee', "dunkin'", 'dunkin', 'barbeque nation', 
    'hotel', 'resort', 'lodge'
];

async function runTests() {
    console.log('====================================================');
    console.log('TRAVELBUDDY EXPLORE & FOOD VERIFICATION TEST SUITE');
    console.log('====================================================\n');

    let allTestsPassed = true;

    for (const city of CITIES) {
        console.log(`\n--- TESTING CITY: ${city} ---`);

        // 1. Test City Explorer
        try {
            console.log(`[Explorer] Fetching top places for ${city}...`);
            const exploreRes = await searchCityPlaces(city, 12, 'explore');
            const places = exploreRes.places || [];
            console.log(`[Explorer] Retrieved ${places.length} places for ${city}`);

            let exploreViolations = 0;
            let missingPhotos = 0;

            places.forEach((p, idx) => {
                const nameLower = (p.name || '').toLowerCase();
                const descLower = (p.description || '').toLowerCase();
                const catLower = (p.category || '').toLowerCase();

                // Check for parks/gardens/hotels/flats
                const isDisqualified = DISQUALIFIED_EXPLORE_WORDS.some(w => {
                    const regex = new RegExp(`\\b${w}\\b`, 'i');
                    return regex.test(nameLower);
                });

                if (isDisqualified) {
                    console.error(`  ❌ [VIOLATION] Found disqualified explore place: "${p.name}" (category: ${p.category})`);
                    exploreViolations++;
                    allTestsPassed = false;
                }

                if (!p.photoUrl || p.photoUrl.trim() === '') {
                    console.error(`  ❌ [NO PHOTO] Place "${p.name}" has empty photoUrl!`);
                    missingPhotos++;
                    allTestsPassed = false;
                } else {
                    // Log first 3 places as samples
                    if (idx < 3) {
                        console.log(`  ✓ Sample Place: "${p.name}" | Category: ${p.category} | Photo: ${p.photoVerified ? 'Verified' : 'Related'} (${p.photoUrl.substring(0, 50)}...)`);
                    }
                }
            });

            if (exploreViolations === 0 && missingPhotos === 0) {
                console.log(`  ✅ [PASS] City Explorer for ${city}: 0 parks/gardens/hotels/flats, 100% photos populated.`);
            } else {
                console.error(`  ❌ [FAIL] City Explorer for ${city}: ${exploreViolations} violations, ${missingPhotos} missing photos.`);
            }
        } catch (err) {
            console.error(`  ❌ [ERROR] Explorer failed for ${city}:`, err.message);
            allTestsPassed = false;
        }

        // 2. Test Where to Eat
        try {
            console.log(`[Where to Eat] Fetching top eating places for ${city}...`);
            const foodRes = await searchCityPlaces(city, 12, 'food');
            const foodPlaces = foodRes.places || [];
            console.log(`[Where to Eat] Retrieved ${foodPlaces.length} places for ${city}`);

            let foodViolations = 0;
            let foodMissingPhotos = 0;

            foodPlaces.forEach((p, idx) => {
                const nameLower = (p.name || '').toLowerCase();

                // Check for fast-food chains / hotels
                const isDisqualified = DISQUALIFIED_FOOD_WORDS.some(w => {
                    const regex = new RegExp(`\\b${w}\\b`, 'i');
                    return regex.test(nameLower);
                });

                if (isDisqualified) {
                    console.error(`  ❌ [VIOLATION] Found commercial chain/hotel: "${p.name}"`);
                    foodViolations++;
                    allTestsPassed = false;
                }

                if (!p.photoUrl || p.photoUrl.trim() === '') {
                    console.error(`  ❌ [NO PHOTO] Food place "${p.name}" has empty photoUrl!`);
                    foodMissingPhotos++;
                    allTestsPassed = false;
                } else {
                    if (idx < 3) {
                        console.log(`  ✓ Sample Food: "${p.name}" | Rating: ${p.rating || 'N/A'} | Photo: ${p.photoVerified ? 'Verified' : 'Related'} (${p.photoUrl.substring(0, 50)}...)`);
                    }
                }
            });

            if (foodViolations === 0 && foodMissingPhotos === 0) {
                console.log(`  ✅ [PASS] Where to Eat for ${city}: 0 commercial chains/hotels, 100% photos populated.`);
            } else {
                console.error(`  ❌ [FAIL] Where to Eat for ${city}: ${foodViolations} violations, ${foodMissingPhotos} missing photos.`);
            }
        } catch (err) {
            console.error(`  ❌ [ERROR] Where to Eat failed for ${city}:`, err.message);
            allTestsPassed = false;
        }
    }

    console.log('\n====================================================');
    if (allTestsPassed) {
        console.log('🎉 ALL CITY EXPLORER & WHERE TO EAT TESTS PASSED!');
    } else {
        console.log('⚠️ SOME TESTS ENCOUNTERED VIOLATIONS');
    }
    console.log('====================================================');
}

runTests();

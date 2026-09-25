const { searchCityPlaces } = require('./src/services/placeService');

const CITIES = ['Delhi', 'New Delhi', 'Udaipur', 'Prayagraj', 'Greater Noida', 'Mumbai'];

async function run() {
  for (const city of CITIES) {
    console.log(`\n=================== ${city.toUpperCase()} (EXPLORE) ===================`);
    try {
      const exp = await searchCityPlaces(city, 20, 'explore');
      console.log(`Explore Places (${exp.places.length}):`);
      exp.places.slice(0, 6).forEach((p, i) => {
        console.log(`  ${i+1}. ${p.name} | Cat: ${p.category} | Tag: ${p.tag} | Score: ${p.prominenceScore} | Dist: ${p.distanceKm}km | Photo: ${p.photoUrl ? 'YES' : 'NO'}`);
      });
    } catch (e) {
      console.error(`Explore error for ${city}:`, e.message);
    }

    console.log(`\n=================== ${city.toUpperCase()} (EAT) ===================`);
    try {
      const eat = await searchCityPlaces(city, 20, 'eat');
      console.log(`Eat Places (${eat.places.length}):`);
      eat.places.slice(0, 6).forEach((p, i) => {
        console.log(`  ${i+1}. ${p.name} | Cat: ${p.category} | Tags: ${p.tags?.join(', ')} | Score: ${p.evidenceScore} | Dist: ${p.distanceKm}km | Photo: ${p.photoUrl ? 'YES' : 'NO'}`);
      });
    } catch (e) {
      console.error(`Eat error for ${city}:`, e.message);
    }
  }
}

run();

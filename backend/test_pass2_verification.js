const { searchCityPlaces } = require("./src/services/placeService");

const CITIES = ["Delhi", "New Delhi", "Udaipur", "Prayagraj", "Greater Noida", "Mumbai"];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log("================================================================================");
  console.log("       TRAVELBUDDY SECOND QUALITY PASS COMPREHENSIVE VERIFICATION REPORT        ");
  console.log("================================================================================\n");

  const summaryReport = [];

  for (const city of CITIES) {
    console.log(`\n================================================================================`);
    console.log(`>>> DESTINATION: ${city.toUpperCase()}`);
    console.log(`================================================================================`);

    const citySummary = { city, explore: {}, eat: {} };

    // 1. CITY EXPLORER
    console.log(`\n--- [MODE: CITY EXPLORER] ---`);
    try {
      const expRes = await searchCityPlaces(city, 20, "explore");
      const places = expRes.places || [];
      console.log(`Raw Candidate Count:       ${expRes.rawCandidateCount || 0}`);
      console.log(`Rejected Candidate Count:  ${expRes.rejectedCandidateCount || 0}`);
      console.log(`Surviving Candidate Count: ${expRes.survivingCandidateCount || places.length}`);
      console.log(`Final Returned Count:      ${places.length}`);
      console.log("\nTop Recommendations:");
      places.slice(0, 6).forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.name}`);
        console.log(`     Category / Type:      ${p.category} | ${p.tag}`);
        console.log(`     Scores:               Deterministic: ${p.detScore ?? "N/A"} | Groq: ${p.groqScore ?? "N/A"} | Final: ${p.prominenceScore}`);
        console.log(`     Distance:             ${p.distanceKm} km`);
        console.log(`     Verified Photo:       ${p.photoUrl ? "YES (" + (p.photoNote || "Verified") + ")" : "NULL (No Photo)"}`);
        console.log(`     Factual Description:  ${p.desc}`);
      });
      citySummary.explore = {
        raw: expRes.rawCandidateCount,
        rejected: expRes.rejectedCandidateCount,
        surviving: expRes.survivingCandidateCount,
        places: places.slice(0, 6)
      };
    } catch (err) {
      console.error(`  ERROR exploring ${city}:`, err.message);
    }

    await sleep(4000); // Token rate limit protection

    // 2. WHERE TO EAT
    console.log(`\n--- [MODE: WHERE TO EAT] ---`);
    try {
      const eatRes = await searchCityPlaces(city, 20, "eat");
      const places = eatRes.places || [];
      console.log(`Raw Candidate Count:       ${eatRes.rawCandidateCount || 0}`);
      console.log(`Rejected Candidate Count:  ${eatRes.rejectedCandidateCount || 0}`);
      console.log(`Surviving Candidate Count: ${eatRes.survivingCandidateCount || places.length}`);
      console.log(`Final Returned Count:      ${places.length}`);
      console.log("\nTop Recommendations:");
      places.slice(0, 6).forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.name}`);
        console.log(`     Cuisine / Category:   ${p.category} | Tags: ${p.tags?.join(", ")}`);
        console.log(`     Classification:       Style: ${p.diningStyle || "casual"} | Type: ${p.isChain ? "FAST_FOOD_CHAIN" : "AUTHENTIC_LOCAL_EATERY"}`);
        console.log(`     Scores:               Deterministic: ${p.detScore ?? "N/A"} | Groq: ${p.groqScore ?? "N/A"} | Final: ${p.evidenceScore}`);
        console.log(`     Distance:             ${p.distanceKm} km`);
        console.log(`     Verified Photo:       ${p.photoUrl ? "YES (" + (p.photoNote || "Verified") + ")" : "NULL (No Photo)"}`);
        console.log(`     Editorial:            ${p.editorial}`);
      });
      citySummary.eat = {
        raw: eatRes.rawCandidateCount,
        rejected: eatRes.rejectedCandidateCount,
        surviving: eatRes.survivingCandidateCount,
        places: places.slice(0, 6)
      };
    } catch (err) {
      console.error(`  ERROR eating in ${city}:`, err.message);
    }

    summaryReport.push(citySummary);
    await sleep(4000);
  }

  console.log("\n================================================================================");
  console.log("                      VERIFICATION COMPLETE                                     ");
  console.log("================================================================================\n");
}

runVerification().catch(console.error);

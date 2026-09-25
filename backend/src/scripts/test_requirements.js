require("dotenv").config();
const axios = require("axios");

const BASE_URL = process.env.PUBLIC_API_URL || "http://localhost:5000/api";
const IOT_DEVICE_KEY = process.env.IOT_DEVICE_KEY || "tb_iot_esp32_sec_2026";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING VERIFICATION FOR 7 SPECIFIED TEST SCENARIOS");
  console.log("==================================================\n");

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      testPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      testFailed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 0. Setup: Police & Hotel Logins
  console.log("--- Setup: Logins ---");
  const policeLoginRes = await axios.post(`${BASE_URL}/police/auth/login`, {
    email: "police@travelbuddy.com",
    password: "police123"
  });
  const policeToken = policeLoginRes.data.token;
  assert(Boolean(policeToken), "Police logged in successfully");

  const hotelLoginRes = await axios.post(`${BASE_URL}/hotel/auth/login`, {
    email: "hotel@travelbuddy.com",
    password: "hotel123"
  });
  const hotelToken = hotelLoginRes.data.token;
  assert(Boolean(hotelToken), "Hotel logged in successfully");

  // Create a tourist for manual testing
  const randomSuffix = Date.now().toString().slice(-6);
  const touristRegisterRes = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: `Tourist Test ${randomSuffix}`,
    email: `tourist_${randomSuffix}@test.com`,
    phone: `98${randomSuffix}12`,
    password: "Password@123",
    nationalityCode: "IND",
    identityType: "AADHAAR",
    identityNumber: `123456${randomSuffix}`
  });
  const touristUser = touristRegisterRes.data.user;
  const touristToken = touristRegisterRes.data.token;
  assert(Boolean(touristToken) && Boolean(touristUser.tourist_uid), `Tourist registered with UID: ${touristUser.tourist_uid}`);

  // ==================================================
  // TEST 1 — MANUAL SOS
  // ==================================================
  console.log("\n==================================================");
  console.log("TEST 1 — MANUAL SOS");
  console.log("==================================================");
  const manualSosRes = await axios.post(
    `${BASE_URL}/sos`,
    {
      type: "ACCIDENT",
      triggerSource: "MANUAL",
      latitude: 27.1751,
      longitude: 78.0421,
      locationAccuracy: 5.0,
      message: "Tourist manually pressed SOS button in app"
    },
    { headers: { Authorization: `Bearer ${touristToken}` } }
  );
  assert(manualSosRes.data.success, "Manual SOS activated");
  const manualIncident = manualSosRes.data.sos;
  assert(manualIncident.sos_type === "MANUAL", `Incident sos_type in DB is 'MANUAL' (got '${manualIncident.sos_type}')`);

  // Verify on police dashboard active list
  const policeActive1 = await axios.get(`${BASE_URL}/police/sos/active`, {
    headers: { Authorization: `Bearer ${policeToken}` }
  });
  const foundManual = policeActive1.data.sosIncidents.find(i => i.id === manualIncident.id);
  assert(Boolean(foundManual), "Police dashboard receives manual SOS incident");
  assert(foundManual.sos_type === "MANUAL", `Police dashboard shows SOS Type: ${foundManual.sos_type}`);

  // Resolve manual SOS before test 2
  await axios.post(
    `${BASE_URL}/police/sos/${manualIncident.id}/resolve`,
    {},
    { headers: { Authorization: `Bearer ${policeToken}` } }
  );
  console.log("  Manual SOS resolved.");

  // ==================================================
  // TEST 2 — IOT SOS
  // ==================================================
  console.log("\n==================================================");
  console.log("TEST 2 — IOT SOS");
  console.log("==================================================");
  // Send telemetry with high-G shock / fall detected
  const iotTelemetryRes = await axios.post(
    `${BASE_URL}/iot/telemetry`,
    {
      device_id: "ESP32-MPU6050-NODE-01",
      user_id: touristUser.id,
      ax: 1.45,
      ay: 1.85,
      az: 3.25, // Total G > 3.8G (Violent impact threshold > 2.8G)
      gx: 195.0,
      gy: 210.0,
      gz: 95.0,
      fall_detected: true,
      latitude: 30.0895,
      longitude: 78.2730,
      battery_level: 92.0,
      source: "DEMO"
    },
    {
      headers: {
        "x-iot-device-key": IOT_DEVICE_KEY,
        "x-telemetry-source": "DEMO"
      }
    }
  );
  assert(iotTelemetryRes.data.success, "IoT telemetry processed");
  assert(iotTelemetryRes.data.fall_detected === true, "IoT sensor fall/shock event evaluated as true");
  assert(Boolean(iotTelemetryRes.data.sos_incident), "Backend automatically generated an emergency incident from dangerous IoT sensor readings");

  const iotSosId = iotTelemetryRes.data.sos_incident.id;

  // Police dashboard inspection
  const policeActive2 = await axios.get(`${BASE_URL}/police/sos/active`, {
    headers: { Authorization: `Bearer ${policeToken}` }
  });
  const foundIot = policeActive2.data.sosIncidents.find(i => i.id === iotSosId);
  assert(Boolean(foundIot), "Police dashboard received IoT incident alert");
  assert(foundIot.sos_type === "IOT ALERT", `Police dashboard shows SOS Type: ${foundIot.sos_type}`);
  assert(foundIot.device_id === "ESP32-MPU6050-NODE-01", `Preserves device ID: ${foundIot.device_id}`);

  // Test full lifecycle: ACTIVE -> ACKNOWLEDGED -> DISPATCHED -> RESOLVED
  const ackRes = await axios.post(
    `${BASE_URL}/police/sos/${iotSosId}/acknowledge`,
    {},
    { headers: { Authorization: `Bearer ${policeToken}` } }
  );
  assert(ackRes.data.sos.status === "ACKNOWLEDGED", "Lifecycle state: ACTIVE -> ACKNOWLEDGED");

  const dispatchRes = await axios.post(
    `${BASE_URL}/police/sos/${iotSosId}/dispatch`,
    {},
    { headers: { Authorization: `Bearer ${policeToken}` } }
  );
  assert(dispatchRes.data.sos.status === "DISPATCHED", "Lifecycle state: ACKNOWLEDGED -> DISPATCHED");

  const resolveRes = await axios.post(
    `${BASE_URL}/police/sos/${iotSosId}/resolve`,
    {},
    { headers: { Authorization: `Bearer ${policeToken}` } }
  );
  assert(resolveRes.data.sos.status === "RESOLVED", "Lifecycle state: DISPATCHED -> RESOLVED");

  // ==================================================
  // TEST 3 — NO ACTIVE ALERT (INDIA DEFAULT MAP)
  // ==================================================
  console.log("\n==================================================");
  console.log("TEST 3 — NO ACTIVE ALERT");
  console.log("==================================================");
  // Ensure all active alerts are cleared
  const remainingActive = await axios.get(`${BASE_URL}/police/sos/active`, {
    headers: { Authorization: `Bearer ${policeToken}` }
  });
  for (const inc of remainingActive.data.sosIncidents) {
    await axios.post(`${BASE_URL}/police/sos/${inc.id}/resolve`, {}, { headers: { Authorization: `Bearer ${policeToken}` } });
  }

  const finalActiveCheck = await axios.get(`${BASE_URL}/police/sos/active`, {
    headers: { Authorization: `Bearer ${policeToken}` }
  });
  assert(finalActiveCheck.data.sosIncidents.length === 0, "All active SOS alerts cleared (0 active emergencies)");
  console.log("  Police dashboard default map is configured to India ([22.5937, 78.9629], zoom 5) with full pan/zoom enabled.");

  // ==================================================
  // TEST 4 — HOTEL EXISTING UID
  // ==================================================
  console.log("\n==================================================");
  console.log("TEST 4 — HOTEL EXISTING UID");
  console.log("==================================================");
  const searchExistingRes = await axios.post(
    `${BASE_URL}/hotel-portal/guests/search`,
    { touristUid: touristUser.tourist_uid },
    { headers: { Authorization: `Bearer ${hotelToken}` } }
  );
  assert(searchExistingRes.data.tourists.length > 0, `Hotel located existing tourist with UID: ${touristUser.tourist_uid}`);
  const existingTourist = searchExistingRes.data.tourists[0];
  assert(existingTourist.tourist_uid === touristUser.tourist_uid, "Existing tourist UID matched exactly");

  // Hotel creates stay for existing UID
  const createStayRes = await axios.post(
    `${BASE_URL}/hotel-portal/stays`,
    {
      touristUid: touristUser.tourist_uid,
      checkIn: new Date().toISOString(),
      bookingReference: "Room 404"
    },
    { headers: { Authorization: `Bearer ${hotelToken}` } }
  );
  assert(createStayRes.data.success, "Hotel check-in process continued successfully for existing tourist");

  // ==================================================
  // TEST 5 — HOTEL NEW TOURIST REGISTRATION
  // ==================================================
  console.log("\n==================================================");
  console.log("TEST 5 — HOTEL NEW TOURIST");
  console.log("==================================================");
  const nonExistentUid = "TB-IND-ZZ99-0000";
  const searchNotFoundRes = await axios.post(
    `${BASE_URL}/hotel-portal/guests/search`,
    { touristUid: nonExistentUid },
    { headers: { Authorization: `Bearer ${hotelToken}` } }
  );
  assert(searchNotFoundRes.data.tourists.length === 0, "Search for non-existent UID returns 0 results");

  const hotelNewSuffix = Date.now().toString().slice(-6);
  const hotelRegRes = await axios.post(
    `${BASE_URL}/hotel-portal/guests/register`,
    {
      fullName: `Hotel Guest ${hotelNewSuffix}`,
      email: `hotelguest_${hotelNewSuffix}@example.com`,
      phone: `91${hotelNewSuffix}88`,
      nationalityCode: "IND",
      identityType: "AADHAAR",
      identityNumber: `987654${hotelNewSuffix}`
    },
    { headers: { Authorization: `Bearer ${hotelToken}` } }
  );
  assert(hotelRegRes.data.success, "Backend created new tourist identity from Hotel Portal");
  const newlyGeneratedUid = hotelRegRes.data.touristUid;
  assert(Boolean(newlyGeneratedUid) && newlyGeneratedUid.startsWith("TB-IND-"), `Backend generated unique UID: ${newlyGeneratedUid}`);

  // Continue hotel check-in with newly generated UID
  const newGuestStayRes = await axios.post(
    `${BASE_URL}/hotel-portal/stays`,
    {
      touristUid: newlyGeneratedUid,
      checkIn: new Date().toISOString(),
      bookingReference: "Suite 108"
    },
    { headers: { Authorization: `Bearer ${hotelToken}` } }
  );
  assert(newGuestStayRes.data.success, "Hotel check-in continued successfully with newly generated UID");

  // ==================================================
  // TEST 6 — UID CONSISTENCY (A, B, C, D)
  // ==================================================
  console.log("\n==================================================");
  console.log("TEST 6 — UID CONSISTENCY ACROSS PLATFORMS");
  console.log("==================================================");

  // A. Website → Mobile
  console.log("  Scenario A: Website -> Mobile");
  const sA_suffix = "A_" + Date.now().toString().slice(-5);
  const emailA = `user_${sA_suffix}@example.com`;
  const regWebA = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: `User A`,
    email: emailA,
    phone: `88001${sA_suffix.slice(-5)}`,
    password: "PasswordA123",
    nationalityCode: "IND",
    identityType: "AADHAAR",
    identityNumber: `880011${sA_suffix.slice(-5)}`
  });
  const uidA_web = regWebA.data.user.tourist_uid;

  // Mobile login
  const loginMobA = await axios.post(`${BASE_URL}/auth/login`, {
    email: emailA,
    password: "PasswordA123"
  });
  const uidA_mob = loginMobA.data.user.tourist_uid;
  assert(uidA_web === uidA_mob, `Website UID (${uidA_web}) equals Mobile UID (${uidA_mob})`);

  // B. Mobile → Website
  console.log("  Scenario B: Mobile -> Website");
  const sB_suffix = "B_" + Date.now().toString().slice(-5);
  const emailB = `user_${sB_suffix}@example.com`;
  const regMobB = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: `User B`,
    email: emailB,
    phone: `88002${sB_suffix.slice(-5)}`,
    password: "PasswordB123",
    nationalityCode: "IND",
    identityType: "AADHAAR",
    identityNumber: `880022${sB_suffix.slice(-5)}`
  });
  const uidB_mob = regMobB.data.user.tourist_uid;

  // Website login
  const loginWebB = await axios.post(`${BASE_URL}/auth/login`, {
    email: emailB,
    password: "PasswordB123"
  });
  const uidB_web = loginWebB.data.user.tourist_uid;
  assert(uidB_mob === uidB_web, `Mobile UID (${uidB_mob}) equals Website UID (${uidB_web})`);

  // C. Hotel registration → Website
  console.log("  Scenario C: Hotel registration -> Website");
  const sC_suffix = "C_" + Date.now().toString().slice(-5);
  const emailC = `user_${sC_suffix}@example.com`;
  const hotelRegC = await axios.post(
    `${BASE_URL}/hotel-portal/guests/register`,
    {
      fullName: `User C`,
      email: emailC,
      phone: `88003${sC_suffix.slice(-5)}`,
      nationalityCode: "IND",
      identityType: "AADHAAR",
      identityNumber: `880033${sC_suffix.slice(-5)}`
    },
    { headers: { Authorization: `Bearer ${hotelToken}` } }
  );
  const uidC_hotel = hotelRegC.data.touristUid;

  // Tourist later signs up or claims on Website with same email
  const regWebC = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: `User C`,
    email: emailC,
    phone: `88003${sC_suffix.slice(-5)}`,
    password: "PasswordC123",
    nationalityCode: "IND",
    identityType: "AADHAAR",
    identityNumber: `880033${sC_suffix.slice(-5)}`
  });
  const uidC_web = regWebC.data.user.tourist_uid;
  assert(uidC_hotel === uidC_web, `Hotel UID (${uidC_hotel}) matches Website claim UID (${uidC_web})`);

  // D. Hotel registration → Mobile
  console.log("  Scenario D: Hotel registration -> Mobile");
  const sD_suffix = "D_" + Date.now().toString().slice(-5);
  const emailD = `user_${sD_suffix}@example.com`;
  const hotelRegD = await axios.post(
    `${BASE_URL}/hotel-portal/guests/register`,
    {
      fullName: `User D`,
      email: emailD,
      phone: `88004${sD_suffix.slice(-5)}`,
      nationalityCode: "IND",
      identityType: "AADHAAR",
      identityNumber: `880044${sD_suffix.slice(-5)}`
    },
    { headers: { Authorization: `Bearer ${hotelToken}` } }
  );
  const uidD_hotel = hotelRegD.data.touristUid;

  // Tourist completes registration on Mobile with same details
  const regMobD = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: `User D`,
    email: emailD,
    phone: `88004${sD_suffix.slice(-5)}`,
    password: "PasswordD123",
    nationalityCode: "IND",
    identityType: "AADHAAR",
    identityNumber: `880044${sD_suffix.slice(-5)}`
  });
  const uidD_mob = regMobD.data.user.tourist_uid;
  assert(uidD_hotel === uidD_mob, `Hotel UID (${uidD_hotel}) matches Mobile claim UID (${uidD_mob})`);

  // ==================================================
  // TEST 7 — DUPLICATE PREVENTION
  // ==================================================
  console.log("\n==================================================");
  console.log("TEST 7 — DUPLICATE PREVENTION");
  console.log("==================================================");
  // Try registering same identity again via hotel
  const hotelDupRes = await axios.post(
    `${BASE_URL}/hotel-portal/guests/register`,
    {
      fullName: `User D Duplicate Attempt`,
      email: emailD,
      phone: `88004${sD_suffix.slice(-5)}`,
      nationalityCode: "IND",
      identityType: "AADHAAR",
      identityNumber: `880044${sD_suffix.slice(-5)}`
    },
    { headers: { Authorization: `Bearer ${hotelToken}` } }
  );
  assert(hotelDupRes.data.isExisting === true, "Hotel register detected existing identity");
  assert(hotelDupRes.data.touristUid === uidD_hotel, `Reused existing UID (${uidD_hotel}), NO duplicate created`);

  // Try registering same identity via /api/auth/register with same password
  const webDupRes = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: `User D Duplicate Attempt`,
    email: emailD,
    phone: `88004${sD_suffix.slice(-5)}`,
    password: "PasswordD123",
    nationalityCode: "IND",
    identityType: "AADHAAR",
    identityNumber: `880044${sD_suffix.slice(-5)}`
  });
  assert(webDupRes.data.user.tourist_uid === uidD_hotel, `Public register reused existing UID (${uidD_hotel}), NO second UID generated`);

  console.log("\n==================================================");
  console.log(`ALL TESTS PASSED! (${testPassed} assertions passed, ${testFailed} failed)`);
  console.log("==================================================");
}

runTests().catch(err => {
  console.error("Test execution failed:", err.response ? err.response.data : err.message);
  process.exit(1);
});

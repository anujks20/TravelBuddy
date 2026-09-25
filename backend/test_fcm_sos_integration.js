const pool = require('./src/config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production';

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING EMERGENCY PUSH & TOKEN RESOLUTION TESTS');
  console.log('====================================================\n');

  let touristId, friendId, strangerId;
  const testPhoneTourist = '9998881111';
  const testPhoneFriend = '9998882222';
  const testPhoneStranger = '9998883333';

  try {
    // 1. Create or ensure test users
    console.log('Step 1: Setting up test users (Tourist A, Friend B, Stranger C)...');
    
    // Tourist A
    let res = await pool.query(
      `INSERT INTO users (tourist_uid, full_name, email, password_hash, phone, role)
       VALUES ('UID-TOURIST-A', 'Tourist Alpha', 'tourist_a_test@test.com', 'hash123', $1, 'TOURIST')
       ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id;`,
      [testPhoneTourist]
    );
    touristId = res.rows[0].id;

    // Friend B
    res = await pool.query(
      `INSERT INTO users (tourist_uid, full_name, email, password_hash, phone, role)
       VALUES ('UID-FRIEND-B', 'Friend Beta', 'friend_b_test@test.com', 'hash123', $1, 'TOURIST')
       ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id;`,
      [testPhoneFriend]
    );
    friendId = res.rows[0].id;

    // Stranger C
    res = await pool.query(
      `INSERT INTO users (tourist_uid, full_name, email, password_hash, phone, role)
       VALUES ('UID-STRANGER-C', 'Stranger Charlie', 'stranger_c_test@test.com', 'hash123', $1, 'TOURIST')
       ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id;`,
      [testPhoneStranger]
    );
    strangerId = res.rows[0].id;

    console.log(`✓ Test Users: Tourist A ID=${touristId}, Friend B ID=${friendId}, Stranger C ID=${strangerId}`);

    // 2. Add Friend B as Tourist A's emergency contact (with formatted phone "+91 9998882222")
    console.log('\nStep 2: Adding Friend B to Tourist A emergency_contacts with formatted phone (+91 9998882222)...');
    await pool.query(`DELETE FROM emergency_contacts WHERE user_id = $1`, [touristId]);
    await pool.query(
      `INSERT INTO emergency_contacts (user_id, name, phone, relationship)
       VALUES ($1, 'Friend Beta', '+91 9998882222', 'FRIEND')`,
      [touristId]
    );
    console.log('✓ Emergency contact configured with country-code prefix.');

    // 3. Register device tokens for both users
    console.log('\nStep 3: Registering FCM device tokens for Tourist A and Friend B...');
    const touristToken = 'fcm_token_tourist_device_alpha_12345';
    const friendToken = 'fcm_token_friend_device_beta_67890';

    await pool.query(
      `INSERT INTO user_device_tokens (user_id, fcm_token, platform)
       VALUES ($1, $2, 'ANDROID')
       ON CONFLICT (fcm_token) DO UPDATE SET updated_at = NOW()`,
      [touristId, touristToken]
    );

    await pool.query(
      `INSERT INTO user_device_tokens (user_id, fcm_token, platform)
       VALUES ($1, $2, 'ANDROID')
       ON CONFLICT (fcm_token) DO UPDATE SET updated_at = NOW()`,
      [friendId, friendToken]
    );
    console.log('✓ Tokens stored in user_device_tokens table.');

    // 4. Test phone normalization and recipient resolution query
    console.log('\nStep 4: Executing emergency contact resolution query (Excluding Tourist A)...');
    const contactTokensQuery = `
      SELECT DISTINCT udt.fcm_token, udt.platform, u.id as contact_user_id, u.full_name as contact_name
      FROM emergency_contacts ec
      JOIN users u ON RIGHT(REGEXP_REPLACE(u.phone, '\\D', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(ec.phone, '\\D', '', 'g'), 10)
      JOIN user_device_tokens udt ON udt.user_id = u.id
      WHERE ec.user_id = $1 AND u.id != $1
    `;
    const tokensResult = await pool.query(contactTokensQuery, [touristId]);

    console.log(`Resolution matched ${tokensResult.rows.length} recipient tokens:`, tokensResult.rows);

    const receivedTokens = tokensResult.rows.map(r => r.fcm_token);
    if (!receivedTokens.includes(friendToken)) {
      throw new Error('FAIL: Friend B token was NOT resolved!');
    }
    if (receivedTokens.includes(touristToken)) {
      throw new Error('CRITICAL FAIL: Tourist A own device token was included in emergency recipients!');
    }
    console.log('✓ PASS: Friend B token resolved successfully. Tourist A token strictly excluded!');

    // 5. Test SOS Incident creation and Authorization
    console.log('\nStep 5: Testing SOS Incident retrieval and authorization endpoint logic...');
    const sosRes = await pool.query(
      `INSERT INTO sos_incidents (user_id, status, type, latitude, longitude, location_accuracy, sos_reference, trigger_source)
       VALUES ($1, 'ACTIVE', 'MEDICAL', 28.6139, 77.2090, 8.5, 'SOS-TEST-999', 'APP_BUTTON')
       RETURNING id, sos_reference`,
      [touristId]
    );
    const incidentId = sosRes.rows[0].id;
    const sosRef = sosRes.rows[0].sos_reference;
    console.log(`Created test SOS incident ID=${incidentId}, Ref=${sosRef}`);

    // Test authorization check for Tourist A
    const touristAuthQuery = `
      SELECT id FROM sos_incidents WHERE id = $1 AND user_id = $2
    `;
    const isOwner = (await pool.query(touristAuthQuery, [incidentId, touristId])).rows.length > 0;
    console.log(`Tourist A (Owner) authorized: ${isOwner}`);
    if (!isOwner) throw new Error('FAIL: Tourist A should be authorized to view own SOS');

    // Test authorization check for Friend B (Contact)
    const contactAuthQuery = `
      SELECT ec.id
      FROM emergency_contacts ec
      JOIN sos_incidents s ON s.user_id = ec.user_id
      JOIN users u ON RIGHT(REGEXP_REPLACE(u.phone, '\\D', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(ec.phone, '\\D', '', 'g'), 10)
      WHERE s.id = $1 AND u.id = $2
    `;
    const isContactAuthorized = (await pool.query(contactAuthQuery, [incidentId, friendId])).rows.length > 0;
    console.log(`Friend B (Emergency Contact) authorized: ${isContactAuthorized}`);
    if (!isContactAuthorized) throw new Error('FAIL: Friend B should be authorized to view SOS');

    // Test authorization check for Stranger C
    const isStrangerAuthorized = (await pool.query(contactAuthQuery, [incidentId, strangerId])).rows.length > 0;
    console.log(`Stranger C authorized: ${isStrangerAuthorized}`);
    if (isStrangerAuthorized) throw new Error('CRITICAL FAIL: Stranger C should NOT be authorized to view SOS!');
    console.log('✓ PASS: Secure authorization strictly prevents unauthorized third-party tracking.');

    // 6. Test Firebase Admin Service Mock / Safe fallback
    console.log('\nStep 6: Testing Firebase Admin Push Dispatch Service...');
    const firebaseAdminService = require('./src/services/firebaseAdminService');
    const pushResult = await firebaseAdminService.sendEmergencyPushToContacts({
      tokens: [friendToken],
      touristName: 'Tourist Alpha',
      sosReference: sosRef,
      incidentId: incidentId,
      touristId: touristId,
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 8.5,
      emergencyType: 'MEDICAL'
    });
    console.log('Push dispatch result:', pushResult);
    if (!pushResult.success && pushResult.status !== 'CREDENTIALS_REQUIRED') {
      throw new Error(`Unexpected push failure: ${JSON.stringify(pushResult)}`);
    }
    console.log('✓ PASS: Firebase Admin service handled dispatch gracefully (Status: ' + (pushResult.status || 'DELIVERED') + ')');

    console.log('\n====================================================');
    console.log('ALL PHASE 3, 4, 6, 7, 12, 16 TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('Test Failed:', err);
    process.exitCode = 1;
  } finally {
    // Cleanup test records
    console.log('\nCleaning up test artifacts...');
    try {
      if (touristId) {
        await pool.query(`DELETE FROM user_device_tokens WHERE user_id IN ($1, $2, $3)`, [touristId, friendId, strangerId]);
        await pool.query(`DELETE FROM sos_events WHERE sos_incident_id IN (SELECT id FROM sos_incidents WHERE user_id = $1)`, [touristId]);
        await pool.query(`DELETE FROM sos_incidents WHERE user_id = $1`, [touristId]);
        await pool.query(`DELETE FROM emergency_contacts WHERE user_id = $1`, [touristId]);
        await pool.query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [touristId, friendId, strangerId]);
      }
      console.log('✓ Cleanup complete.');
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
    await pool.end();
  }
}

runTests();

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { getMessaging } = require("firebase-admin/messaging");
const pool = require("../config/db");

let isInitialized = false;
let initError = null;

/**
 * Resolves credential path from absolute or relative locations
 */
function resolveCredentialPath(rawPath) {
  if (!rawPath) return null;
  if (path.isAbsolute(rawPath)) {
    return fs.existsSync(rawPath) ? rawPath : null;
  }
  // Try relative to process.cwd()
  const cwdCandidate = path.resolve(process.cwd(), rawPath);
  if (fs.existsSync(cwdCandidate)) {
    return cwdCandidate;
  }
  // Try relative to backend root (2 levels up from src/services)
  const backendRootCandidate = path.resolve(__dirname, "../../", rawPath);
  if (fs.existsSync(backendRootCandidate)) {
    return backendRootCandidate;
  }
  return null;
}

/**
 * Creates Firebase Admin cert credential supporting modern and legacy SDK formats
 */
function createCertCredential(target) {
  if (typeof admin.cert === "function") {
    return admin.cert(target);
  }
  if (admin.credential && typeof admin.credential.cert === "function") {
    return admin.credential.cert(target);
  }
  const { cert } = require("firebase-admin/app");
  return cert(target);
}

/**
 * Returns Firebase Messaging client supporting both modern and legacy SDK exports
 */
function getMessagingClient() {
  if (typeof admin.messaging === "function") {
    return admin.messaging();
  }
  return getMessaging();
}

function initializeFirebaseAdmin() {
  if (isInitialized) {
    return true;
  }

  const existingApps = typeof admin.getApps === "function" ? admin.getApps() : (admin.apps || []);
  if (existingApps && existingApps.length > 0) {
    isInitialized = true;
    return true;
  }

  try {
    // 1. Check for GOOGLE_APPLICATION_CREDENTIALS path
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = resolveCredentialPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (credPath) {
        admin.initializeApp({
          credential: createCertCredential(credPath)
        });
        isInitialized = true;
        console.log("Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS.");
        return true;
      }
    }

    // 2. Check for FIREBASE_SERVICE_ACCOUNT_PATH
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const credPath = resolveCredentialPath(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (credPath) {
        admin.initializeApp({
          credential: createCertCredential(credPath)
        });
        isInitialized = true;
        console.log("Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_PATH.");
        return true;
      }
    }

    // 3. Check for FIREBASE_SERVICE_ACCOUNT JSON string in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: createCertCredential(serviceAccount)
      });
      isInitialized = true;
      console.log("Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT JSON env.");
      return true;
    }

    // 4. Default fallback: backend/secrets/firebase-service-account.json
    const defaultSecretPath = path.resolve(__dirname, "../../secrets/firebase-service-account.json");
    if (fs.existsSync(defaultSecretPath)) {
      admin.initializeApp({
        credential: createCertCredential(defaultSecretPath)
      });
      isInitialized = true;
      console.log("Firebase Admin initialized via backend/secrets/firebase-service-account.json.");
      return true;
    }

    initError = "Firebase Admin credentials not configured (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT).";
    return false;
  } catch (error) {
    initError = error.message;
    console.error("Firebase Admin initialization error:", error.message);
    return false;
  }
}

// Attempt initialization on startup
initializeFirebaseAdmin();

/**
 * Remove stale or invalid tokens from user_device_tokens table
 */
async function removeInvalidTokens(tokens) {
  if (!tokens || tokens.length === 0) return;
  try {
    await pool.query(
      `DELETE FROM user_device_tokens WHERE fcm_token = ANY($1::text[])`,
      [tokens]
    );
    console.log(`Cleaned up ${tokens.length} invalid/stale FCM token(s).`);
  } catch (err) {
    console.error("Error cleaning up invalid tokens:", err.message);
  }
}

/**
 * Send high-priority emergency push notification to emergency contact device tokens
 */
async function sendEmergencyPushToContacts({
  tokens,
  touristName,
  sosReference,
  incidentId,
  touristId,
  latitude,
  longitude,
  accuracy,
  type = "GENERAL"
}) {
  if (!tokens || tokens.length === 0) {
    return {
      success: false,
      status: "NO_TOKENS",
      message: "No registered device tokens for emergency contacts."
    };
  }

  const configured = initializeFirebaseAdmin();
  if (!configured) {
    console.warn("[Firebase Admin Notice]: Push dispatch skipped. " + initError);
    return {
      success: false,
      status: "CREDENTIALS_REQUIRED",
      message: initError,
      recipientCount: tokens.length
    };
  }

  const title = "🚨 EMERGENCY: Tourist SOS Activated!";
  const body = `${touristName || "A tourist"} has activated an SOS emergency! Tap immediately to view location and assist.`;

  const messagePayload = {
    tokens,
    notification: {
      title,
      body
    },
    data: {
      type: "SOS_ALERT",
      sosReference: String(sosReference || ""),
      incidentId: String(incidentId || ""),
      touristId: String(touristId || ""),
      touristName: String(touristName || ""),
      latitude: latitude !== null && latitude !== undefined ? String(latitude) : "",
      longitude: longitude !== null && longitude !== undefined ? String(longitude) : "",
      accuracy: accuracy !== null && accuracy !== undefined ? String(accuracy) : "",
      emergencyType: String(type || "GENERAL"),
      timestamp: new Date().toISOString()
    },
    android: {
      priority: "high",
      notification: {
        channelId: "emergency_sos_channel",
        priority: "max",
        defaultSound: true,
        defaultVibrateTimings: true,
        visibility: "public"
      }
    }
  };

  try {
    const messagingClient = getMessagingClient();
    const response = await messagingClient.sendEachForMulticast(messagePayload);
    const staleTokens = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const code = resp.error.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          staleTokens.push(tokens[idx]);
        }
      }
    });

    if (staleTokens.length > 0) {
      await removeInvalidTokens(staleTokens);
    }

    return {
      success: response.successCount > 0,
      status: response.successCount > 0 ? "DELIVERED" : "FAILED",
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalTokens: tokens.length
    };
  } catch (error) {
    console.error("Firebase Admin sendEachForMulticast error:", error.message);
    return {
      success: false,
      status: "ERROR",
      message: error.message
    };
  }
}

module.exports = {
  initializeFirebaseAdmin,
  isConfigured: () => isInitialized,
  getInitError: () => initError,
  sendEmergencyPushToContacts
};

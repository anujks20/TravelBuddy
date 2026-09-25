const pool = require("../config/db");
const {
  parseTripIntent,
  generateItinerary
} = require("../services/aiService");

async function processWhatsAppTrip(req, res) {
  try {
    const {
      phoneNumber,
      messageId,
      message
    } = req.body;

    if (
      !phoneNumber ||
      typeof phoneNumber !== "string" ||
      !messageId ||
      typeof messageId !== "string" ||
      !message ||
      typeof message !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "phoneNumber, messageId and message are required."
      });
    }

    const normalizedPhone =
      phoneNumber.replace(/\\D/g, "");

    /*
     * Duplicate protection.
     *
     * PostgreSQL primary-key protection makes this safe even
     * when WhatsApp sends the same webhook more than once.
     */
    const duplicateCheck = await pool.query(
      `SELECT message_id
       FROM processed_messages
       WHERE message_id = $1
       LIMIT 1`,
      [messageId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.json({
        success: true,
        duplicate: true,
        message: "Message already processed."
      });
    }

    /*
     * Find the existing TravelBuddy account.
     *
     * WhatsApp numbers are compared using digits so that
     * formats such as +91XXXXXXXXXX and 91XXXXXXXXXX
     * can still match.
     */
    const userResult = await pool.query(
      `SELECT id, phone
       FROM users
       WHERE regexp_replace(phone, '[^0-9]', '', 'g') = $1
       LIMIT 1`,
      [normalizedPhone]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No TravelBuddy account is linked to this WhatsApp number."
      });
    }

    const user = userResult.rows[0];

    /*
     * Mark the message before the expensive AI operation.
     * This prevents concurrent duplicate webhook deliveries
     * from generating multiple trips.
     */
    await pool.query(
      `INSERT INTO processed_messages
        (message_id)
       VALUES ($1)
       ON CONFLICT (message_id) DO NOTHING`,
      [messageId]
    );

    const parsedIntent =
      await parseTripIntent(message);

    if (!parsedIntent) {
      return res.json({
        success: true,
        tripCreated: false,
        message:
          "I couldn't understand that as a trip-planning request."
      });
    }

    const startDate =
      new Date().toISOString().split("T")[0];

    const endDate =
      new Date(
        Date.now() +
        (parsedIntent.days - 1) *
          24 *
          60 *
          60 *
          1000
      )
        .toISOString()
        .split("T")[0];

    const trip = {
      origin: "Delhi",
      destination: parsedIntent.destination,
      startDate,
      endDate,
      travelers: 2,
      pace: "balanced",
      budget: parsedIntent.budget,
      currency: parsedIntent.currency,
      interests: []
    };

    const aiResult =
      await generateItinerary({
        trip,
        days: parsedIntent.days,
        routes: []
      });

    const itinerary =
      Array.isArray(aiResult?.itinerary)
        ? aiResult.itinerary
        : [];

    let activityId = 1;

    const normalizedItinerary =
      itinerary.map((day) => ({
        ...day,
        activities:
          Array.isArray(day.activities)
            ? day.activities.map((activity) => ({
                ...activity,
                id: activityId++,
                locked: false
              }))
            : []
      }));

    const plannerMetadata = {
      ...trip,
      source: "WHATSAPP"
    };

    const tripResult = await pool.query(
      `INSERT INTO trips
        (
          user_id,
          title,
          destination,
          start_date,
          end_date,
          status,
          planner_metadata,
          itinerary
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        user.id,
        `${parsedIntent.destination} Trip`,
        parsedIntent.destination,
        startDate,
        endDate,
        "PLANNED",
        JSON.stringify(plannerMetadata),
        JSON.stringify(normalizedItinerary)
      ]
    );

    return res.status(201).json({
      success: true,
      tripCreated: true,
      tripId: tripResult.rows[0].id,
      destination: parsedIntent.destination,
      days: parsedIntent.days,
      trip: tripResult.rows[0]
    });
  } catch (error) {
    console.error(
      "WhatsApp trip processing error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to process WhatsApp trip request."
    });
  }
}

module.exports = {
  processWhatsAppTrip
};

const {
  generateJson,
  generateItinerary,
  generateWanderPlaces
} = require("../services/aiService");

async function testAi(req, res) {
  try {
    const result = await generateJson({
      systemPrompt:
        "You are a TravelBuddy test assistant. Return valid JSON only.",

      prompt:
        'Return a JSON object containing {"status":"AI_OK","message":"TravelBuddy AI is working."}',

      maxTokens: 200
    });

    return res.json({
      success: true,
      ai: result
    });
  } catch (error) {
    console.error("AI test error:", error);

    return res.status(502).json({
      success: false,
      message:
        error.message ||
        "AI service unavailable."
    });
  }
}

async function generateGenericAi(req, res) {
  try {
    const {
      systemPrompt,
      prompt,
      maxTokens
    } = req.body;

    if (
      !prompt ||
      typeof prompt !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "AI prompt is required."
      });
    }

    const result = await generateJson({
      systemPrompt:
        typeof systemPrompt === "string"
          ? systemPrompt
          : "You are a TravelBuddy AI assistant. Return valid JSON only.",
      prompt,
      maxTokens:
        Number.isInteger(maxTokens) &&
        maxTokens > 0 &&
        maxTokens <= 4000
          ? maxTokens
          : 1200
    });

    return res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error(
      "Generic AI error:",
      error
    );

    return res.status(502).json({
      success: false,
      message:
        error.message ||
        "AI service unavailable."
    });
  }
}

async function generateTripItinerary(req, res) {
  try {
    const {
      trip,
      days,
      routes
    } = req.body;

    if (
      !trip ||
      typeof trip !== "object" ||
      Array.isArray(trip)
    ) {
      return res.status(400).json({
        success: false,
        message: "Trip data is required."
      });
    }

    if (
      !Number.isInteger(days) ||
      days < 1 ||
      days > 30
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Days must be an integer between 1 and 30."
      });
    }

    if (
      routes !== undefined &&
      !Array.isArray(routes)
    ) {
      return res.status(400).json({
        success: false,
        message: "Routes must be an array."
      });
    }

    const result = await generateItinerary({
      trip,
      days,
      routes: routes || []
    });

    return res.json({
      success: true,
      days,
      result
    });
  } catch (error) {
    console.error(
      "Trip itinerary AI error:",
      error
    );

    return res.status(502).json({
      success: false,
      message:
        error.message ||
        "Unable to generate itinerary."
    });
  }
}

async function generateWanderGuidePlaces(req, res) {
  try {
    const {
      cityName,
      cityLat,
      cityLon
    } = req.body;

    if (
      !cityName ||
      typeof cityName !== "string" ||
      cityName.trim().length < 2
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid city name is required."
      });
    }

    const lat =
      Number.isFinite(Number(cityLat))
        ? Number(cityLat)
        : 28.6139;

    const lon =
      Number.isFinite(Number(cityLon))
        ? Number(cityLon)
        : 77.2090;

    const result = await generateWanderPlaces({
      cityName: cityName.trim(),
      cityLat: lat,
      cityLon: lon
    });

    return res.json({
      success: true,
      cityName: cityName.trim(),
      result
    });
  } catch (error) {
    console.error(
      "WanderGuide AI error:",
      error
    );

    return res.status(502).json({
      success: false,
      message:
        error.message ||
        "Unable to generate local places."
    });
  }
}

module.exports = {
  testAi,
  generateGenericAi,
  generateTripItinerary,
  generateWanderGuidePlaces
};


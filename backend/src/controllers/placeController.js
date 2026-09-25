const {
  searchCityPlaces,
  autocompleteCities,
  clearAllPlacesCache
} = require("../services/placeService");

async function getCityPlaces(req, res) {
  try {
    const {
      cityName,
      limit,
      mode
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

    const parsedLimit =
      Number.isInteger(Number(limit))
        ? Math.min(Math.max(Number(limit), 5), 50)
        : 20;

    const normalizedMode =
      mode === "explore"
        ? "explore"
        : "eat";

    const result =
      await searchCityPlaces(
        cityName.trim(),
        parsedLimit,
        normalizedMode
      );

    return res.json({
      success: true,
      mode: normalizedMode,
      ...result
    });
  } catch (error) {
    console.error(
      "City places error:",
      error
    );

    const isClientError = Boolean(
      error.message && (
        error.message.includes("outside India") ||
        error.message.includes("valid city name") ||
        error.message.includes("check the spelling") ||
        error.message.includes("could not be verified")
      )
    );

    return res.status(isClientError ? 400 : 502).json({
      success: false,
      message:
        error.message ||
        "Unable to discover real places."
    });
  }
}

async function getCityAutocomplete(req, res) {
  try {
    const q = req.query.q || req.query.query || "";
    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const suggestions = await autocompleteCities(q.trim());
    return res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error("City autocomplete error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch autocomplete suggestions."
    });
  }
}

async function clearPlacesCache(req, res) {
  try {
    const result = clearAllPlacesCache();
    return res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getCityPlaces,
  getCityAutocomplete,
  clearPlacesCache
};

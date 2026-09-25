const https = require("https");

const NOMINATIM_URL =
  process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";

const USER_AGENT =
  process.env.OSM_USER_AGENT || "TravelBuddy/1.0 (SIH 2026)";

function fetchJson(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      },
      (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            return reject(
              new Error(`Geocoding request failed with HTTP ${response.statusCode}`)
            );
          }

          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Invalid JSON received from geocoding service."));
          }
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("Geocoding request timed out."));
    });

    request.on("error", reject);
  });
}

async function geocodeLocation(location) {
  if (!location || typeof location !== "string") {
    throw new Error("A valid location is required.");
  }

  const query = encodeURIComponent(location.trim());

  const url =
    `${NOMINATIM_URL}/search` +
    `?format=jsonv2` +
    `&q=${query}` +
    `&limit=1` +
    `&addressdetails=1`;

  const results = await fetchJson(url);

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`Could not find location: ${location}`);
  }

  const result = results[0];

  const latitude = Number(result.lat);
  const longitude = Number(result.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Invalid coordinates returned for: ${location}`);
  }

  return {
    name: result.display_name || location,
    latitude,
    longitude,
    boundingBox: result.boundingbox || null,
    address: result.address || {},
  };
}

module.exports = {
  geocodeLocation,
};

const https = require("https");

const OSRM_BASE_URL =
  process.env.OSRM_BASE_URL || "https://router.project-osrm.org";

function fetchJson(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent":
            process.env.OSM_USER_AGENT || "TravelBuddy/1.0 (SIH 2026)",
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
              new Error(`Routing request failed with HTTP ${response.statusCode}`)
            );
          }

          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Invalid JSON received from routing service."));
          }
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("Routing request timed out."));
    });

    request.on("error", reject);
  });
}

function buildOsrmUrl(profile, origin, destination, options = {}) {
  const coordinates =
    `${origin.longitude},${origin.latitude};` +
    `${destination.longitude},${destination.latitude}`;

  const params = new URLSearchParams({
    alternatives: String(options.alternatives !== false),
    steps: "false",
    overview: options.includeGeometry ? "simplified" : "false",
  });

  return `${OSRM_BASE_URL}/route/v1/${profile}/${coordinates}?${params}`;
}

function normalizeRoute(route, profile, origin, destination, includeGeometry) {
  const distanceKm = Number(route.distance) / 1000;
  const durationMinutes = Number(route.duration) / 60;

  const normalized = {
    provider: "OSRM",
    profile,
    distanceKm: Number(distanceKm.toFixed(2)),
    durationMinutes: Math.round(durationMinutes),
  };

  if (includeGeometry && route.geometry) {
    normalized.geometry = route.geometry;
  }

  if (Array.isArray(route.legs)) {
    normalized.legs = route.legs.map((leg) => ({
      distanceKm: Number((Number(leg.distance) / 1000).toFixed(2)),
      durationMinutes: Math.round(Number(leg.duration) / 60),
    }));
  }

  return normalized;
}

async function getRouteAlternatives(
  origin,
  destination,
  options = {}
) {
  if (!origin || !destination) {
    throw new Error("Origin and destination coordinates are required.");
  }

  const profile = options.profile || "driving";
  const includeGeometry = options.includeGeometry === true;

  const url = buildOsrmUrl(
    profile,
    origin,
    destination,
    {
      alternatives: true,
      includeGeometry,
    }
  );

  const data = await fetchJson(url);

  if (!data || data.code !== "Ok" || !Array.isArray(data.routes)) {
    throw new Error(
      data?.message || "No route could be calculated."
    );
  }

  return data.routes.map((route) =>
    normalizeRoute(
      route,
      profile,
      origin,
      destination,
      includeGeometry
    )
  );
}

async function getDrivingRoutes(origin, destination, options = {}) {
  return getRouteAlternatives(origin, destination, {
    ...options,
    profile: "driving",
  });
}

module.exports = {
  getRouteAlternatives,
  getDrivingRoutes,
};

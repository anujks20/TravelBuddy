const { geocodeLocation } = require("../services/geocodingService");
const {
  getDrivingRoutes,
} = require("../services/routingService");
const {
  fetchDestinationActivities,
} = require("../services/activityService");
const {
  calculateRouteCost,
} = require("../services/routeCostService");
const {
  calculateFeasibility,
} = require("../services/routeOptimizationService");

const SUPPORTED_MODES = [
  "car",
  "bus",
  "train",
  "bike",
  "flight",
];

function normalizeString(value) {
  return String(value || "").trim();
}

function validateDate(value, fieldName) {
  if (!value) {
    return;

  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }
}

function calculateModeDuration(
  drivingDurationMinutes,
  mode,
  distanceKm
) {
  const driving =
    Number(drivingDurationMinutes) || 0;

  const distance =
    Number(distanceKm) || 0;

  switch (mode) {
    case "bike":
      return Math.round(
        distance / 45 * 60
      );

    case "bus":
      return Math.round(
        distance / 45 * 60 + 30
      );

    case "train":
      return Math.round(
        distance / 65 * 60 + 60
      );

    case "flight":
      return Math.round(
        distance / 700 * 60 + 150
      );

    case "car":
    default:
      return Math.round(driving);
  }
}

function buildModeRoutes(drivingRoutes, destinationActivities, options) {
  const {
    travelers,
    days,
    includeGeometry,
  } = options;

  const routes = [];

  for (const drivingRoute of drivingRoutes) {
    for (const mode of SUPPORTED_MODES) {
      const route = {
        id: `${mode}-${routes.length + 1}`,
        mode,
        provider: drivingRoute.provider,
        distanceKm: drivingRoute.distanceKm,
        durationMinutes: calculateModeDuration(
          drivingRoute.durationMinutes,
          mode,
          drivingRoute.distanceKm
        ),
        cost: null,
      };

      if (includeGeometry && drivingRoute.geometry) {
        route.geometry = drivingRoute.geometry;
      }

      if (drivingRoute.legs) {
        route.legs = drivingRoute.legs;
      }

      route.cost = calculateRouteCost({
        route,
        mode,
        travelers,
        destinationActivities,
        days,
      });

      routes.push(route);
    }
  }

  return routes;
}

async function optimizeRoutes(req, res) {
  try {
    const {
      origin,
      destination,
      travelers = 1,
      budget,
      days = 1,
      preference = "balanced",
      startDate,
      endDate,
      includeGeometry = false,
    } = req.body || {};

    const normalizedOrigin =
      normalizeString(origin);

    const normalizedDestination =
      normalizeString(destination);

    if (!normalizedOrigin) {
      return res.status(400).json({
        success: false,
        message: "Origin is required.",
      });
    }

    if (!normalizedDestination) {
      return res.status(400).json({
        success: false,
        message: "Destination is required.",
      });
    }

    if (
      normalizedOrigin.toLowerCase() ===
      normalizedDestination.toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Origin and destination must be different.",
      });
    }

    const travelerCount =
      Number(travelers);

    if (
      !Number.isInteger(travelerCount) ||
      travelerCount < 1 ||
      travelerCount > 50
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Travelers must be an integer between 1 and 50.",
      });
    }

    const tripDays =
      Number(days);

    if (
      !Number.isInteger(tripDays) ||
      tripDays < 1 ||
      tripDays > 30
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Days must be an integer between 1 and 30.",
      });
    }

    validateDate(startDate, "startDate");
    validateDate(endDate, "endDate");

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        return res.status(400).json({
          success: false,
          message:
            "endDate cannot be before startDate.",
        });
      }
    }

    const numericBudget =
      Number(budget);

    if (
      !Number.isFinite(numericBudget) ||
      numericBudget < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Budget must be a valid non-negative number.",
      });
    }

    const allowedPreferences = [
      "budget",
      "balanced",
      "comfort",
    ];

    if (
      !allowedPreferences.includes(
        String(preference).toLowerCase()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Preference must be budget, balanced, or comfort.",
      });
    }

    const normalizedPreference =
      String(preference).toLowerCase();

    const [originLocation, destinationLocation] =
      await Promise.all([
        geocodeLocation(normalizedOrigin),
        geocodeLocation(normalizedDestination),
      ]);

    const drivingRoutes =
      await getDrivingRoutes(
        originLocation,
        destinationLocation,
        {
          includeGeometry:
            includeGeometry === true,
        }
      );

    if (
      !Array.isArray(drivingRoutes) ||
      drivingRoutes.length === 0
    ) {
      return res.status(422).json({
        success: false,
        message:
          "No viable routes were found.",
      });
    }

    const destinationActivities =
      await fetchDestinationActivities(
        normalizedDestination
      );

    const routes = buildModeRoutes(
      drivingRoutes,
      destinationActivities,
      {
        travelers: travelerCount,
        days: tripDays,
        includeGeometry:
          includeGeometry === true,
      }
    );

    const feasibility =
      calculateFeasibility({
        routes,
        budget: numericBudget,
        preference: normalizedPreference,
      });

    return res.status(200).json({
      success: true,

      data: {
        request: {
          origin: normalizedOrigin,
          destination: normalizedDestination,
          travelers: travelerCount,
          budget: numericBudget,
          days: tripDays,
          preference: normalizedPreference,
          startDate: startDate || null,
          endDate: endDate || null,
        },

        locations: {
          origin: originLocation,
          destination: destinationLocation,
        },

        activities: destinationActivities,

        routes,

        feasibility,

        metadata: {
          currency: "INR",
          roundTrip: true,
          estimates: true,
          routeProvider: "OSRM",
          activityProvider:
            destinationActivities.length > 0
              ? "TravelBuddy/Wikipedia"
              : "TravelBuddy",
        },
      },
    });
  } catch (error) {
    console.error(
      "Route optimization error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to optimize routes.",
    });
  }
}

module.exports = {
  optimizeRoutes,
};

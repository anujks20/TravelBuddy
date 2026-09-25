function numberEnv(name, fallback) {
  const value = Number(process.env[name]);

  return Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

const DEFAULT_ASSUMPTIONS = {
  car: {
    fuelEfficiencyKmPerLitre: 15,
    fuelPricePerLitre: 100,
    tollPerKm: 0.5,
  },

  bike: {
    fuelEfficiencyKmPerLitre: 40,
    fuelPricePerLitre: 100,
  },

  bus: {
    farePerKmPerPerson: 1.5,
  },

  train: {
    farePerKmPerPerson: 1.25,
  },

  flight: {
    baseFarePerPerson: 2500,
    farePerKmPerPerson: 4,
  },

  stay: {
    perPersonPerDay: 500,
  },

  food: {
    perPersonPerDay: 400,
  },
};

function getCostAssumptions() {
  return {
    car: {
      fuelEfficiencyKmPerLitre: numberEnv(
        "CAR_FUEL_EFFICIENCY_KMPL",
        DEFAULT_ASSUMPTIONS.car.fuelEfficiencyKmPerLitre
      ),
      fuelPricePerLitre: numberEnv(
        "FUEL_PRICE_INR_PER_LITRE",
        DEFAULT_ASSUMPTIONS.car.fuelPricePerLitre
      ),
      tollPerKm: numberEnv(
        "CAR_TOLL_ESTIMATE_PER_KM",
        DEFAULT_ASSUMPTIONS.car.tollPerKm
      ),
    },

    bike: {
      fuelEfficiencyKmPerLitre: numberEnv(
        "BIKE_FUEL_EFFICIENCY_KMPL",
        DEFAULT_ASSUMPTIONS.bike.fuelEfficiencyKmPerLitre
      ),
      fuelPricePerLitre: numberEnv(
        "FUEL_PRICE_INR_PER_LITRE",
        DEFAULT_ASSUMPTIONS.bike.fuelPricePerLitre
      ),
    },

    bus: {
      farePerKmPerPerson: numberEnv(
        "BUS_FARE_INR_PER_KM_PERSON",
        DEFAULT_ASSUMPTIONS.bus.farePerKmPerPerson
      ),
    },

    train: {
      farePerKmPerPerson: numberEnv(
        "TRAIN_FARE_INR_PER_KM_PERSON",
        DEFAULT_ASSUMPTIONS.train.farePerKmPerPerson
      ),
    },

    flight: {
      baseFarePerPerson: numberEnv(
        "FLIGHT_BASE_FARE_INR",
        DEFAULT_ASSUMPTIONS.flight.baseFarePerPerson
      ),
      farePerKmPerPerson: numberEnv(
        "FLIGHT_FARE_INR_PER_KM_PERSON",
        DEFAULT_ASSUMPTIONS.flight.farePerKmPerPerson
      ),
    },

    stay: {
      perPersonPerDay: numberEnv(
        "STAY_ESTIMATE_INR_PER_PERSON_DAY",
        DEFAULT_ASSUMPTIONS.stay.perPersonPerDay
      ),
    },

    food: {
      perPersonPerDay: numberEnv(
        "FOOD_ESTIMATE_INR_PER_PERSON_DAY",
        DEFAULT_ASSUMPTIONS.food.perPersonPerDay
      ),
    },
  };
}

function round(value) {
  return Math.round(Number(value) || 0);
}

function positiveNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : fallback;
}

function normalizeMode(mode) {
  return String(mode || "")
    .trim()
    .toLowerCase();
}

function calculateTransportCost(route, mode, travelers = 1) {
  if (!route) {
    throw new Error("Route is required.");
  }

  const distanceKm = positiveNumber(route.distanceKm);
  const people = Math.max(1, Math.floor(Number(travelers) || 1));
  const assumptions = getCostAssumptions();

  if (distanceKm <= 0) {
    throw new Error("Route distance must be greater than zero.");
  }

  switch (normalizeMode(mode)) {
    case "car": {
      const {
        fuelEfficiencyKmPerLitre,
        fuelPricePerLitre,
        tollPerKm,
      } = assumptions.car;

      const fuelCost =
        (distanceKm / fuelEfficiencyKmPerLitre) *
        fuelPricePerLitre;

      const tollEstimate =
        distanceKm * tollPerKm;

      return {
        transportCost: round((fuelCost + tollEstimate) * 2),
        breakdown: {
          fuelCostRoundTrip: round(fuelCost * 2),
          tollEstimateRoundTrip: round(tollEstimate * 2),
        },
        estimate: true,
      };
    }

    case "bike": {
      const {
        fuelEfficiencyKmPerLitre,
        fuelPricePerLitre,
      } = assumptions.bike;

      const fuelCost =
        (distanceKm / fuelEfficiencyKmPerLitre) *
        fuelPricePerLitre;

      return {
        transportCost: round(fuelCost * 2),
        breakdown: {
          fuelCostRoundTrip: round(fuelCost * 2),
        },
        estimate: true,
      };
    }

    case "bus": {
      const fare =
        distanceKm *
        assumptions.bus.farePerKmPerPerson *
        people;

      return {
        transportCost: round(fare * 2),
        breakdown: {
          estimatedFareRoundTrip: round(fare * 2),
        },
        estimate: true,
      };
    }

    case "train": {
      const fare =
        distanceKm *
        assumptions.train.farePerKmPerPerson *
        people;

      return {
        transportCost: round(fare * 2),
        breakdown: {
          estimatedFareRoundTrip: round(fare * 2),
        },
        estimate: true,
      };
    }

    case "flight": {
      const oneWayFare =
        assumptions.flight.baseFarePerPerson +
        distanceKm *
          assumptions.flight.farePerKmPerPerson;

      const total =
        oneWayFare *
        people *
        2;

      return {
        transportCost: round(total),
        breakdown: {
          estimatedFarePerPersonRoundTrip:
            round(oneWayFare * 2),
          travelers: people,
        },
        estimate: true,
      };
    }

    default:
      throw new Error(`Unsupported travel mode: ${mode}`);
  }
}

function calculateActivityCost(activities = []) {
  if (!Array.isArray(activities)) {
    return 0;
  }

  return round(
    activities.reduce(
      (total, activity) =>
        total + positiveNumber(activity?.cost),
      0
    )
  );
}

function calculateRouteCost({
  route,
  mode,
  travelers = 1,
  destinationActivities = [],
  days = 1,
}) {
  if (!route) {
    throw new Error("Route is required.");
  }

  const people = Math.max(1, Math.floor(Number(travelers) || 1));
  const tripDays = Math.max(1, Math.floor(Number(days) || 1));

  const transport = calculateTransportCost(
    route,
    mode,
    people
  );

  const activityCost =
    calculateActivityCost(destinationActivities);

  const stayAllowance =
    tripDays *
    people *
    getCostAssumptions().stay.perPersonPerDay;

  const foodAllowance =
    tripDays *
    people *
    getCostAssumptions().food.perPersonPerDay;

  const total =
    transport.transportCost +
    activityCost +
    stayAllowance +
    foodAllowance;

  return {
    transportCost: round(transport.transportCost),
    activityCost: round(activityCost),
    stayAllowance: round(stayAllowance),
    foodAllowance: round(foodAllowance),

    total: round(total),

    currency: "INR",

    estimate: true,

    breakdown: {
      transport: transport.breakdown,
      activities: round(activityCost),
      stay: round(stayAllowance),
      food: round(foodAllowance),
    },

    assumptions: {
      ...getCostAssumptions(),
      roundTrip: true,
    },
  };
}

module.exports = {
  getCostAssumptions,
  calculateTransportCost,
  calculateActivityCost,
  calculateRouteCost,
};

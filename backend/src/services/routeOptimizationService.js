function validateBudget(budget) {
  const value = Number(budget);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Budget must be a valid non-negative number.");
  }

  return value;
}

function filterFeasibleRoutes(routes, budget) {
  const numericBudget = validateBudget(budget);

  if (!Array.isArray(routes)) {
    return [];
  }

  return routes.filter((route) => {
    const total = Number(route?.cost?.total);

    return Number.isFinite(total) && total <= numericBudget;
  });
}

function selectMinimumBudgetRoute(routes) {
  if (!Array.isArray(routes) || routes.length === 0) {
    return null;
  }

  return [...routes].sort((a, b) => {
    const costA = Number(a?.cost?.total ?? Infinity);
    const costB = Number(b?.cost?.total ?? Infinity);

    return costA - costB;
  })[0];
}

function calculateRouteScore(
  route,
  budget,
  preference = "balanced"
) {
  const total = Number(route?.cost?.total);
  const duration = Number(route?.durationMinutes);

  if (!Number.isFinite(total) || !Number.isFinite(duration)) {
    return Infinity;
  }

  const numericBudget = Math.max(
    1,
    Number(budget) || 1
  );

  const budgetScore = Math.min(
    total / numericBudget,
    2
  );

  const durationScore = Math.min(
    duration / 1440,
    2
  );

  const mode = String(
    route?.mode || ""
  ).toLowerCase();

  let comfortScore;

  switch (mode) {
    case "flight":
      comfortScore = 0.2;
      break;

    case "train":
      comfortScore = 0.4;
      break;

    case "car":
      comfortScore = 0.5;
      break;

    case "bus":
      comfortScore = 0.6;
      break;

    case "bike":
      comfortScore = 0.8;
      break;

    default:
      comfortScore = 0.7;
  }

  let budgetWeight = 0.45;
  let durationWeight = 0.35;
  let comfortWeight = 0.20;

  if (preference === "budget") {
    budgetWeight = 0.70;
    durationWeight = 0.20;
    comfortWeight = 0.10;
  } else if (preference === "comfort") {
    budgetWeight = 0.20;
    durationWeight = 0.25;
    comfortWeight = 0.55;
  }

  return (
    budgetScore * budgetWeight +
    durationScore * durationWeight +
    comfortScore * comfortWeight
  );
}

function selectBestOverallRoute(
  routes,
  budget,
  preference = "balanced"
) {
  if (!Array.isArray(routes) || routes.length === 0) {
    return null;
  }

  return routes
    .map((route) => ({
      ...route,
      score: calculateRouteScore(
        route,
        budget,
        preference
      )
    }))
    .sort((a, b) => a.score - b.score)[0];
}

function checkBudgetFeasibility(routes, budget) {
  const numericBudget = validateBudget(budget);

  const minimumBudgetRoute =
    selectMinimumBudgetRoute(routes);

  const minimumCost =
    minimumBudgetRoute &&
    Number.isFinite(
      Number(minimumBudgetRoute?.cost?.total)
    )
      ? Number(minimumBudgetRoute.cost.total)
      : null;

  return {
    feasible:
      minimumCost !== null &&
      minimumCost <= numericBudget,

    minimumCost,

    budget: numericBudget,

    shortfall:
      minimumCost !== null &&
      minimumCost > numericBudget
        ? Math.round(
            minimumCost - numericBudget
          )
        : 0,

    routes: Array.isArray(routes)
      ? routes
      : []
  };
}

function calculateFeasibility({
  routes,
  budget,
  preference = "balanced"
}) {
  const numericBudget =
    validateBudget(budget);

  const minimumBudgetRoute =
    selectMinimumBudgetRoute(routes);

  const bestOverallRoute =
    selectBestOverallRoute(
      routes,
      numericBudget,
      preference
    );

  const feasibleRoutes =
    filterFeasibleRoutes(
      routes,
      numericBudget
    );

  const minimumCost =
    minimumBudgetRoute
      ? Number(
          minimumBudgetRoute?.cost?.total
        )
      : null;

  return {
    budget: numericBudget,

    feasible:
      minimumCost !== null &&
      minimumCost <= numericBudget,

    minimumCost,

    shortfall:
      minimumCost !== null &&
      minimumCost > numericBudget
        ? Math.round(
            minimumCost - numericBudget
          )
        : 0,

    feasibleRoutes,

    minimumBudgetRoute,

    bestOverallRoute,

    preference
  };
}

module.exports = {
  validateBudget,
  checkBudgetFeasibility,
  filterFeasibleRoutes,
  selectMinimumBudgetRoute,
  selectBestOverallRoute,
  calculateRouteScore,
  calculateFeasibility
};

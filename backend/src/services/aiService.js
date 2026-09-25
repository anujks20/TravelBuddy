const axios = require("axios");

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_API_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2
].filter(Boolean);

const GROQ_MODEL =
  process.env.GROQ_MODEL ||
  "qwen/qwen3.8-27b";

function extractJson(content) {
  if (!content || typeof content !== "string") {
    throw new Error("AI returned empty content.");
  }

  let cleaned = content.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("AI did not return valid JSON.");
    }

    return JSON.parse(
      cleaned.slice(firstBrace, lastBrace + 1)
    );
  }
}

async function generateJson({
  systemPrompt,
  prompt,
  maxTokens = 1500,
  temperature = 0.5,
  timeoutMs = 60000
}) {
  const safeTokens = Math.min(4000, Math.max(100, maxTokens || 1500));
  if (GROQ_API_KEYS.length === 0) {
    throw new Error(
      "No GROQ API keys are configured on the backend."
    );
  }

  let lastError = null;

  for (let keyIndex = 0; keyIndex < GROQ_API_KEYS.length; keyIndex++) {
    const apiKey = GROQ_API_KEYS[keyIndex];

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await axios.post(
        GROQ_API_URL,
        {
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature,
          max_tokens: safeTokens,
          response_format: {
            type: "json_object"
          }
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          timeout: timeoutMs
        }
      );

      const content =
        response.data?.choices?.[0]?.message?.content;

      return extractJson(content);
    } catch (error) {
      if (
        error.name === "CanceledError" ||
        error.code === "ERR_CANCELED"
      ) {
        lastError = new Error("AI request timed out.");
      } else {
        const apiMessage =
          error.response?.data?.error?.message;

        lastError = new Error(
          apiMessage ||
          error.message ||
          "AI service request failed."
        );
      }

      const status = error.response?.status;
      const errorCode = error.response?.data?.error?.code;

      const shouldTryNextKey =
        keyIndex < GROQ_API_KEYS.length - 1 &&
        (
          status === 429 ||
          errorCode === "rate_limit_exceeded"
        );

      if (!shouldTryNextKey) {
        throw lastError;
      }

      console.warn(
        `Groq key ${keyIndex + 1} was rate-limited. Trying the next configured key.`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ||
    new Error("AI service request failed.");
}
function validateItinerary(result, requestedDays) {
  if (!result || typeof result !== "object") {
    return {
      valid: false,
      message: "AI returned an invalid itinerary object."
    };
  }

  if (!Array.isArray(result.itinerary)) {
    return {
      valid: false,
      message: "AI response does not contain an itinerary array."
    };
  }

  if (result.itinerary.length !== requestedDays) {
    return {
      valid: false,
      message:
        `Expected ${requestedDays} days but received ${result.itinerary.length}.`
    };
  }

  for (let i = 0; i < result.itinerary.length; i++) {
    const day = result.itinerary[i];

    if (!day || typeof day !== "object") {
      return {
        valid: false,
        message: `Day ${i + 1} is invalid.`
      };
    }

    if (
      typeof day.day !== "number" ||
      day.day !== i + 1
    ) {
      return {
        valid: false,
        message:
          `Day ${i + 1} must have day=${i + 1}.`
      };
    }

    if (
      typeof day.date !== "string" ||
      !day.date.trim()
    ) {
      return {
        valid: false,
        message:
          `Day ${i + 1} must contain a valid date.`
      };
    }

    if (
      typeof day.title !== "string" ||
      !day.title.trim()
    ) {
      return {
        valid: false,
        message:
          `Day ${i + 1} must contain a title.`
      };
    }

    if (
      !Array.isArray(day.activities) ||
      day.activities.length === 0
    ) {
      return {
        valid: false,
        message:
          `Day ${i + 1} does not contain activities.`
      };
    }

    for (let j = 0; j < day.activities.length; j++) {
      const activity = day.activities[j];

      if (
        !activity ||
        typeof activity !== "object"
      ) {
        return {
          valid: false,
          message:
            `Day ${i + 1}, activity ${j + 1} is invalid.`
        };
      }

      if (
        typeof activity.id !== "number"
      ) {
        return {
          valid: false,
          message:
            `Day ${i + 1}, activity ${j + 1} must have a numeric id.`
        };
      }

      if (
        typeof activity.time !== "string" ||
        !activity.time.trim()
      ) {
        return {
          valid: false,
          message:
            `Day ${i + 1}, activity ${j + 1} must contain time.`
        };
      }

      if (
        typeof activity.activity !== "string" ||
        !activity.activity.trim()
      ) {
        return {
          valid: false,
          message:
            `Day ${i + 1}, activity ${j + 1} must contain activity.`
        };
      }

      if (
        typeof activity.description !== "string" ||
        !activity.description.trim()
      ) {
        return {
          valid: false,
          message:
            `Day ${i + 1}, activity ${j + 1} must contain description.`
        };
      }

      if (
        activity.location !== undefined &&
        activity.location !== null &&
        typeof activity.location !== "string"
      ) {
        return {
          valid: false,
          message:
            `Day ${i + 1}, activity ${j + 1} has an invalid location.`
        };
      }

      if (
        typeof activity.cost !== "number" ||
        !Number.isFinite(activity.cost) ||
        activity.cost < 0
      ) {
        return {
          valid: false,
          message:
            `Day ${i + 1}, activity ${j + 1} must contain a valid cost.`
        };
      }

      if (
        activity.durationMinutes !== undefined &&
        activity.durationMinutes !== null &&
        (
          typeof activity.durationMinutes !== "number" ||
          !Number.isFinite(activity.durationMinutes) ||
          activity.durationMinutes < 0
        )
      ) {
        return {
          valid: false,
          message:
            `Day ${i + 1}, activity ${j + 1} has an invalid durationMinutes.`
        };
      }

      if (
        activity.notes !== undefined &&
        activity.notes !== null &&
        typeof activity.notes !== "string"
      ) {
        return {
          valid: false,
          message:
            `Day ${i + 1}, activity ${j + 1} has invalid notes.`
        };
      }

      if (
        typeof activity.locked !== "boolean"
      ) {
        return {
          valid: false,
          message:
            `Day ${i + 1}, activity ${j + 1} must contain locked.`
        };
      }

      const forbiddenFields = [
        "cost_inr",
        "cost_estimate",
        "cost_estimate_inr",
        "details"
      ];

      for (const field of forbiddenFields) {
        if (Object.prototype.hasOwnProperty.call(activity, field)) {
          return {
            valid: false,
            message:
              `Day ${i + 1}, activity ${j + 1} uses unsupported field "${field}". Use the canonical field names.`
          };
        }
      }
    }
  }

  return {
    valid: true,
    message: "Itinerary is valid."
  };
}

function buildFallbackItinerary(trip, days, routes) {
  const dest = trip.destination || 'Destination';
  const startDateStr = trip.startDate || new Date().toISOString().split('T')[0];
  const startDate = new Date(startDateStr);
  const route = (routes && routes[0]) || null;
  const interests = (trip.interests && trip.interests.length) ? trip.interests : ['Sightseeing', 'Culture', 'Food'];

  const itinerary = [];

  for (let d = 1; d <= days; d++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + (d - 1));
    const dateStr = dayDate.toISOString().split('T')[0];

    const isFirstDay = d === 1;
    const isLastDay = d === days;

    let dayTitle = `Exploring ${dest} - Day ${d}`;
    if (isFirstDay) dayTitle = `Arrival & Exploring ${dest}`;
    else if (isLastDay) dayTitle = `Final Highlights & Departure from ${dest}`;

    const activities = [];

    if (isFirstDay) {
      activities.push({
        id: 1,
        time: "08:30",
        activity: `Journey to ${dest}`,
        description: route ? `Scenic drive via ${route.highway} (${route.oneWayDistance} km, approx ${route.durationDisplay}).` : `Travel from ${trip.origin || 'Delhi'} to ${dest}.`,
        location: route ? route.highway : trip.origin || 'Delhi',
        cost: route ? Math.round(route.oneWayCost) : 500,
        durationMinutes: 180,
        notes: "Keep tolls and water handy.",
        locked: false
      });
      activities.push({
        id: 2,
        time: "13:00",
        activity: "Hotel Check-in & Traditional Lunch",
        description: `Check-in at accommodation, freshen up, and enjoy authentic ${trip.foodPref || 'local'} delicacies.`,
        location: `${dest} Central Area`,
        cost: 350,
        durationMinutes: 90,
        notes: "Relax and acclimatize.",
        locked: false
      });
      activities.push({
        id: 3,
        time: "16:00",
        activity: `Iconic Landmark Sightseeing in ${dest}`,
        description: `Visit renowned cultural attractions and heritage sights showcasing the architecture and history of ${dest}.`,
        location: `${dest} Heritage Quarter`,
        cost: 200,
        durationMinutes: 120,
        notes: "Great photo opportunities.",
        locked: false
      });
      activities.push({
        id: 4,
        time: "19:30",
        activity: `Evening Market Walk & Dinner`,
        description: `Stroll through the vibrant evening bazaars of ${dest}, discovering local handicrafts and regional dinner options.`,
        location: `${dest} Main Bazaar`,
        cost: 400,
        durationMinutes: 90,
        notes: "Try the street food specialties.",
        locked: false
      });
    } else if (isLastDay) {
      activities.push({
        id: 1,
        time: "09:00",
        activity: `Morning Scenic Viewpoint & Nature Walk`,
        description: `Take a peaceful morning walk and enjoy panoramic views around ${dest}.`,
        location: `${dest} Viewpoint`,
        cost: 100,
        durationMinutes: 90,
        notes: "Fresh morning breeze.",
        locked: false
      });
      activities.push({
        id: 2,
        time: "11:30",
        activity: `Souvenir Shopping & Local Delights`,
        description: `Pick up authentic regional souvenirs, teas, and artisanal items before concluding the stay.`,
        location: `${dest} Craft Market`,
        cost: 300,
        durationMinutes: 75,
        notes: "Support local artisans.",
        locked: false
      });
      activities.push({
        id: 3,
        time: "13:30",
        activity: "Farewell Lunch & Check-out",
        description: `Savor a memorable farewell meal at a top-rated local dining spot before checkout.`,
        location: `${dest}`,
        cost: 450,
        durationMinutes: 75,
        notes: "Pack belongings.",
        locked: false
      });
      activities.push({
        id: 4,
        time: "15:30",
        activity: `Return Journey to ${trip.origin || 'Delhi'}`,
        description: route ? `Return travel along ${route.highway} towards ${trip.origin || 'Delhi'}.` : `Departure from ${dest}.`,
        location: route ? route.highway : `${dest} Departure`,
        cost: route ? Math.round(route.oneWayCost) : 500,
        durationMinutes: 180,
        notes: "Safe travels home.",
        locked: false
      });
    } else {
      activities.push({
        id: 1,
        time: "09:00",
        activity: `Immersion Experience: ${interests[d % interests.length]} & Highlights`,
        description: `Deep dive into the prominent attractions of ${dest} focused on ${interests[d % interests.length]}.`,
        location: `${dest} Sightseeing Zone`,
        cost: 250,
        durationMinutes: 150,
        notes: "Wear comfortable walking shoes.",
        locked: false
      });
      activities.push({
        id: 2,
        time: "13:00",
        activity: `Curated Local Lunch Experience`,
        description: `Authentic midday dining savoring regional specialties and seasonal dishes.`,
        location: `${dest} Culinary Hub`,
        cost: 350,
        durationMinutes: 75,
        notes: "Popular with travelers.",
        locked: false
      });
      activities.push({
        id: 3,
        time: "15:30",
        activity: `Adventure & Cultural Exploration`,
        description: `Engaging outdoor or cultural activity exploring the scenic landscapes or historical monuments of ${dest}.`,
        location: `${dest} Activities Hub`,
        cost: 400,
        durationMinutes: 120,
        notes: "Book tickets if required.",
        locked: false
      });
      activities.push({
        id: 4,
        time: "19:30",
        activity: `Sunset Vista & Evening Dining`,
        description: `Watch the sunset over ${dest} followed by an ambient dinner at a celebrated venue.`,
        location: `${dest} Sunset Point`,
        cost: 500,
        durationMinutes: 90,
        notes: "Relaxing evening atmosphere.",
        locked: false
      });
    }

    itinerary.push({
      day: d,
      date: dateStr,
      title: dayTitle,
      activities
    });
  }

  return { itinerary };
}

async function generateItinerary({
  trip,
  days,
  routes = []
}) {
  const cleanTrip = {
    origin: trip.origin,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    travelers: trip.travelers,
    pace: trip.pace,
    travelMode: trip.travelMode,
    interests: trip.interests,
    foodPref: trip.foodPref,
    budget: trip.budget,
    currency: trip.currency,
    notes: trip.notes
  };

  const cleanRoutes = (routes || []).map(r => ({
    name: r.name,
    highway: r.highway,
    oneWayDistance: r.oneWayDistance,
    durationDisplay: r.durationDisplay,
    oneWayCost: r.oneWayCost,
    roundTripCost: r.roundTripCost
  }));

  const systemPrompt = `
You are TravelBuddy's expert travel itinerary planner.
Return ONLY valid JSON.
Create practical, realistic, day-by-day travel plans for ${days} days.
Keep activity descriptions concise (1-2 sentences) so the complete itinerary fits within the response.
Respect the supplied trip details, budget, preferences, travelers, and route information.

MANDATORY OUTPUT SCHEMA:
{
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Day title",
      "activities": [
        {
          "id": 1,
          "time": "09:00",
          "activity": "Activity name",
          "description": "Short description of the place or activity",
          "location": "Place or area",
          "cost": 500,
          "durationMinutes": 60,
          "notes": "Optional practical note",
          "locked": false
        }
      ]
    }
  ]
}

STRICT FIELD RULES:
- Every day MUST contain: day, date, title, activities.
- Each day should have 3 to 4 activities.
- Every activity MUST contain: id, time, activity, description, cost, locked.
- Return JSON only. No markdown.
`;

  const prompt = `
Create a complete ${days}-day itinerary for ${cleanTrip.destination || 'the destination'}.
Trip Details:
${JSON.stringify(cleanTrip)}

Route Info:
${JSON.stringify(cleanRoutes)}

Return exactly ${days} days (from Day 1 to Day ${days}). Each day must have 3-4 activities with concise descriptions.
`;

  const maxTokens = 950;

  const maxAttempts = 2;
  let lastValidationError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const attemptPrompt =
        attempt === 1
          ? prompt
          : `
The previous itinerary was incomplete.
Generate the ${days}-day itinerary again.
${prompt}
`;

      const result = await generateJson({
        systemPrompt,
        prompt: attemptPrompt,
        maxTokens,
        temperature: attempt === 1 ? 0.6 : 0.4,
        timeoutMs: 60000
      });

      const validation =
        validateItinerary(result, days);

      if (validation.valid) {
        return result;
      }

      lastValidationError = validation.message;
      console.warn(
        `AI itinerary validation notice (attempt ${attempt}/${maxAttempts}):`,
        validation.message
      );
    } catch (apiError) {
      console.warn(
        `AI generation attempt ${attempt} encountered error:`,
        apiError.message
      );
      if (attempt === maxAttempts) {
        console.info(
          "Using robust fallback itinerary synthesizer for",
          cleanTrip.destination
        );
        return buildFallbackItinerary(cleanTrip, days, cleanRoutes);
      }
    }
  }

  // Graceful fallback if validation failed
  return buildFallbackItinerary(cleanTrip, days, cleanRoutes);
}

/*
 * WanderGuide / Local Explorer
 *
 * Generates place recommendations while keeping
 * the Groq API key completely server-side.
 */
async function generateWanderPlaces({
  cityName,
  cityLat,
  cityLon
}) {
  if (!cityName || typeof cityName !== "string") {
    throw new Error("City name is required.");
  }

  const prompt = `
Provide 5 top real places to eat and explore in "${cityName}".

Return strictly JSON in exactly this structure:

{
  "places": [
    {
      "name": "Real Place Name",
      "category": "restaurant",
      "tags": ["Tag1", "Tag2"],
      "rating_google": 4.5,
      "reviews_google": "8.5k",
      "rating_tripadvisor": 4.6,
      "reviews_tripadvisor": "920",
      "editorial": "Short 1-2 sentence description of signature dishes or vibe.",
      "review_quote": "A realistic diner review quote.",
      "reviewer": "Firstname L.",
      "address": "Street address in ${cityName}",
      "phone": "+91 ...",
      "lat_offset": 0.008,
      "lon_offset": -0.006
    }
  ]
}

Rules:
- Return exactly 5 places.
- Prefer genuinely known places.
- Use realistic names and categories.
- Categories must be one of:
  restaurant, cafe, finedining, dhaba, bar, hotel, attraction.
- Keep editorial descriptions short.
- Do not add markdown.
- Return JSON only.

City coordinates:
latitude: ${cityLat}
longitude: ${cityLon}
`;

  const result = await generateJson({
    systemPrompt: `
You are TravelBuddy's WanderGuide local discovery assistant.

Your job is to recommend real-world places.
Return valid JSON only.
Never include markdown or explanatory text.
`,
    prompt,
    maxTokens: 1800,
    temperature: 0.4,
    timeoutMs: 90000
  });

  if (
    !result ||
    !Array.isArray(result.places) ||
    result.places.length === 0
  ) {
    throw new Error(
      "AI returned no WanderGuide places."
    );
  }

  return {
    places: result.places.slice(0, 5)
  };
}


async function parseTripIntent(text) {
  if (!text || typeof text !== "string") {
    throw new Error("WhatsApp message text is required.");
  }

  const result = await generateJson({
    systemPrompt: `
You are TravelBuddy's WhatsApp trip-intent parser.

Return ONLY valid JSON.

If the message is a trip-planning request, return:
{
  "isTripRequest": true,
  "destination": "string",
  "days": integer,
  "budget": integer or null,
  "currency": "INR"
}

If it is not a trip-planning request, return:
{
  "isTripRequest": false
}
`,

    prompt: `
Extract the trip-planning intent from this WhatsApp message:

"${text}"

Rules:
- destination must be a city or travel destination.
- days must be a positive integer.
- If no budget is given, use null.
- If currency is not specified, use INR.
- Do not invent missing destination information.
- Return JSON only.
`,

    maxTokens: 500,
    temperature: 0.2,
    timeoutMs: 30000
  });

  if (!result || result.isTripRequest !== true) {
    return null;
  }

  if (
    typeof result.destination !== "string" ||
    !result.destination.trim()
  ) {
    return null;
  }

  const days = Number(result.days);

  if (!Number.isInteger(days) || days < 1 || days > 30) {
    return null;
  }

  const budget =
    result.budget === null ||
    result.budget === undefined ||
    result.budget === ""
      ? null
      : Number(result.budget);

  if (
    budget !== null &&
    (!Number.isFinite(budget) || budget < 0)
  ) {
    return null;
  }

  return {
    destination: result.destination.trim(),
    days,
    budget: budget === null ? null : Math.round(budget),
    currency:
      typeof result.currency === "string" &&
      result.currency.trim()
        ? result.currency.trim().toUpperCase()
        : "INR"
  };
}

/**
 * Ranks, classifies, and enriches REAL candidate places from Geoapify/OSM.
 * Groq NEVER invents places, coordinates, addresses, or phone numbers.
 * Groq only scores tourist relevance and provides structured classification.
 */
async function rankExplorePlacesWithGroq({ cityName, candidates }) {
  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  // Create clean mapped IDs (e.g. c_0, c_1) so the LLM easily handles them
  const idMap = new Map();
  const candidateMetadata = candidates.map((c, idx) => {
    const cleanId = `c_${idx}`;
    idMap.set(cleanId, c.id);
    return {
      id: cleanId,
      name: c.name,
      categories: c.categories || [],
      heritage: c.heritage || null,
      wikipedia: c.wikipedia || null,
      wikidata: c.wikidata || null,
      tourism: c.tourism || null,
      historic: c.historic || null,
      distanceKm: c.distanceKm
    };
  });

  const systemPrompt = `You are a strict travel destination analyst for India.
You must rank and classify REAL candidate places supplied from OpenStreetMap/Geoapify for "${cityName}".
CRITICAL INTEGRITY RULES:
1. ONLY classify and score candidate places listed by their exact "id" (e.g. "c_0", "c_1").
2. DO NOT INVENT ANY PLACE. DO NOT return any id that was not provided.
3. DO NOT fabricate coordinates, addresses, opening hours, prices, or ratings.
4. Score "touristRelevance" from 40 to 98 based strictly on real prominence:
   - 90-98: Iconic world-famous landmarks, UNESCO World Heritage monuments, royal palaces, historic major forts.
   - 75-89: Prominent city attractions, major museums, notable lakes, scenic nature reserves.
   - 55-74: Secondary local sights, historic temples with verified significance, scenic viewpoints.
   - 40-54: Minor local spots or marginal sights.
   DO NOT give all candidates identical scores. Differentiate based on genuine historical/cultural stature.
   NEVER include or promote parks, neighborhood gardens, hotels, or flats/apartments.
5. "category" must be one of: "Attraction", "Culture", "Nature".
6. "tag" must be a concise, accurate label (e.g. "UNESCO World Heritage", "Historic Fort", "Royal Palace", "Scenic Lake", "Heritage Museum", "Sacred Temple", "Historic Citadel").
7. "shortDescription" must be a concise (10-18 words) factual description stating the site's authentic architectural or natural identity based on supplied facts. NEVER use generic boilerplate like "X is a notable landmark in Y".
8. Output JSON only matching the schema:
{
  "ranked": [
    {
      "id": "c_0",
      "touristRelevance": 92,
      "category": "Attraction",
      "tag": "Mughal Imperial Fortress",
      "shortDescription": "Factual concise description based on real metadata."
    }
  ]
}`;

  const prompt = `Classify and rank these ${candidateMetadata.length} real candidate places for "${cityName}":
${JSON.stringify(candidateMetadata, null, 2)}
Return strictly valid JSON only.`;

  try {
    const response = await generateJson({
      systemPrompt,
      prompt,
      maxTokens: 380,
      temperature: 0.1,
      timeoutMs: 25000
    });

    const list = Array.isArray(response?.ranked) ? response.ranked : [];
    // Map clean IDs back to original Geoapify IDs
    return list.map(item => ({
      ...item,
      id: idMap.get(item.id) || item.id
    }));
  } catch (err) {
    console.warn("Groq explore ranking warning (falling back to deterministic scoring):", err.message);
    return [];
  }
}

/**
 * Classifies and enriches REAL catering establishments from Geoapify/OSM.
 * Groq NEVER invents restaurants, coordinates, ratings, reviews, opening hours, or prices.
 */
async function classifyFoodPlacesWithGroq({ cityName, candidates }) {
  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const idMap = new Map();
  const candidateMetadata = candidates.map((c, idx) => {
    const cleanId = `f_${idx}`;
    idMap.set(cleanId, c.id);
    return {
      id: cleanId,
      name: c.name,
      categories: c.categories || [],
      cuisine: c.cuisine || null,
      brand: c.brand || null,
      isChain: c.isChain || false,
      opening_hours: c.opening_hours || null,
      website: c.website || null,
      distanceKm: c.distanceKm
    };
  });

  const systemPrompt = `You are an expert Indian culinary classifier.
You must classify REAL dining establishments supplied from OpenStreetMap/Geoapify for "${cityName}".
CRITICAL INTEGRITY RULES:
1. ONLY classify supplied candidates by their exact "id" (e.g. "f_0", "f_1").
2. NEVER INVENT ANY RESTAURANT, DISH, RATING, REVIEW COUNT, OPENING HOURS, OR ADDRESS.
3. NEVER FABRICATE COORDINATES OR RATINGS.
4. "foodCategory" must be one of: "restaurant", "cafe", "dhaba", "finedining", "street_food", "bakery".
5. "diningStyle" must be one of: "local_specialty", "regional_restaurant", "casual_dining", "fine_dining", "cafe_bakery".
6. "tags" must be 2-3 genuine cuisine/feature tags based on the place name, cuisine tag, or established identity (e.g., ["Rajasthani Thali", "Pure Vegetarian"], ["Mughlai", "Biryani"], ["Filter Coffee", "South Indian"], ["Artisan Bakery", "Cafe"], ["North Indian Dhaba", "Tandoori"]).
7. "editorial" must be a concise (10-18 words) factual description based on the establishment's cuisine, setting, or specialty. NEVER write generic boilerplate like "X is an established dining spot in Y". DO NOT invent false quotes, ratings, or awards.
8. "culinaryScore": 60-96 reflecting authentic local renown and culinary specialty. Iconic local specialties, heritage dhabas, famous sweet shops, and regional thali restaurants score 85-96.
9. Output JSON only matching the schema:
{
  "classified": [
    {
      "id": "f_0",
      "foodCategory": "restaurant",
      "diningStyle": "local_specialty",
      "tags": ["Tag1", "Tag2"],
      "editorial": "Factual description of cuisine and setting.",
      "culinaryScore": 88
    }
  ]
}`;

  const prompt = `Classify these ${candidateMetadata.length} real food establishments in "${cityName}":
${JSON.stringify(candidateMetadata, null, 2)}
Return strictly valid JSON only.`;

  try {
    const response = await generateJson({
      systemPrompt,
      prompt,
      maxTokens: 380,
      temperature: 0.1,
      timeoutMs: 25000
    });

    const list = Array.isArray(response?.classified) ? response.classified : [];
    // Map clean IDs back to original Geoapify IDs
    return list.map(item => ({
      ...item,
      id: idMap.get(item.id) || item.id
    }));
  } catch (err) {
    console.warn("Groq food classification warning (falling back to deterministic metadata):", err.message);
    return [];
  }
}

module.exports = {
  generateJson,
  generateItinerary,
  generateWanderPlaces,
  parseTripIntent,
  extractJson,
  validateItinerary,
  rankExplorePlacesWithGroq,
  classifyFoodPlacesWithGroq
};



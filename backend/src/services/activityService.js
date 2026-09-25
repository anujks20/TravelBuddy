const https = require("https");

const WIKIPEDIA_API =
  process.env.WIKIPEDIA_API_URL ||
  "https://en.wikipedia.org/w/api.php";

const KNOWN_ACTIVITIES = {
  udaipur: [
    { name: "City Palace", cost: 300, category: "Sightseeing" },
    { name: "Lake Pichola Boat Ride", cost: 500, category: "Experience" },
    { name: "Jagdish Temple", cost: 0, category: "Culture" },
    { name: "Saheliyon Ki Bari", cost: 50, category: "Sightseeing" }
  ],

  delhi: [
    { name: "India Gate", cost: 0, category: "Sightseeing" },
    { name: "Red Fort", cost: 80, category: "History" },
    { name: "Qutub Minar", cost: 40, category: "History" },
    { name: "Lotus Temple", cost: 0, category: "Culture" }
  ],

  rishikesh: [
    { name: "Triveni Ghat", cost: 0, category: "Culture" },
    { name: "Laxman Jhula Area", cost: 0, category: "Sightseeing" },
    { name: "River Rafting", cost: 800, category: "Adventure" },
    { name: "Neer Garh Waterfall", cost: 30, category: "Nature" }
  ],

  jaipur: [
    { name: "Amber Fort", cost: 100, category: "History" },
    { name: "City Palace", cost: 200, category: "History" },
    { name: "Hawa Mahal", cost: 50, category: "Sightseeing" },
    { name: "Jantar Mantar", cost: 50, category: "Science" }
  ],

  agra: [
    { name: "Taj Mahal", cost: 50, category: "History" },
    { name: "Agra Fort", cost: 50, category: "History" },
    { name: "Mehtab Bagh", cost: 30, category: "Sightseeing" }
  ],

  mumbai: [
    { name: "Gateway of India", cost: 0, category: "Sightseeing" },
    { name: "Marine Drive", cost: 0, category: "Sightseeing" },
    { name: "Elephanta Caves", cost: 40, category: "History" },
    {
      name: "Chhatrapati Shivaji Maharaj Terminus",
      cost: 0,
      category: "Architecture"
    }
  ],

  goa: [
    { name: "Baga Beach", cost: 0, category: "Beach" },
    { name: "Fort Aguada", cost: 20, category: "History" },
    { name: "Basilica of Bom Jesus", cost: 0, category: "Culture" },
    { name: "Dudhsagar Falls", cost: 500, category: "Nature" }
  ],

  bengaluru: [
    { name: "Lalbagh Botanical Garden", cost: 30, category: "Nature" },
    { name: "Bangalore Palace", cost: 500, category: "History" },
    { name: "Cubbon Park", cost: 0, category: "Nature" },
    { name: "Vidhana Soudha", cost: 0, category: "Architecture" }
  ]
};

function fetchJson(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent":
            process.env.OSM_USER_AGENT ||
            "TravelBuddy/1.0 (SIH 2026)",
          Accept: "application/json"
        }
      },
      (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (
            response.statusCode < 200 ||
            response.statusCode >= 300
          ) {
            return reject(
              new Error(
                `Activity request failed with HTTP ${response.statusCode}`
              )
            );
          }

          try {
            resolve(JSON.parse(data));
          } catch {
            reject(
              new Error(
                "Invalid JSON received from activity service."
              )
            );
          }
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(
        new Error("Activity request timed out.")
      );
    });

    request.on("error", reject);
  });
}

function normalizeDestination(destination) {
  return String(destination || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function genericActivities(destination) {
  return [
    {
      name: `${destination} City Exploration`,
      cost: 0,
      category: "Sightseeing"
    },
    {
      name: `${destination} Local Market`,
      cost: 0,
      category: "Shopping"
    },
    {
      name: `${destination} Cultural Experience`,
      cost: 0,
      category: "Culture"
    }
  ];
}

async function fetchDestinationActivities(
  destination,
  options = {}
) {
  const key = normalizeDestination(destination);

  if (KNOWN_ACTIVITIES[key]) {
    return KNOWN_ACTIVITIES[key].map((activity) => ({
      ...activity
    }));
  }

  if (options.allowWikipedia !== false) {
    try {
      const cleanDest = String(destination || "").trim();
      const params = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: `"${cleanDest}" tourist OR attraction OR sights OR places to visit`,
        format: "json",
        srlimit: "12",
        utf8: "1"
      });

      const result = await fetchJson(
        `${WIKIPEDIA_API}?${params}`
      );

      const pages = result?.query?.search;

      const INVALID_PATTERNS = [
        /express/i, /shatabdi/i, /rajdhani/i, /mail/i, /superfast/i, /vande bharat/i,
        /intercity/i, /passenger/i, /special/i, /railway station/i, /junction/i,
        /demographics/i, /economy of/i, /geography of/i, /outline of/i, /list of/i,
        /history of/i, /politics of/i, /government of/i, /transport in/i, /crime in/i,
        /census/i, /district court/i, /constituency/i, /vidhan sabha/i, /lok sabha/i
      ];

      if (Array.isArray(pages) && pages.length > 0) {
        const filtered = pages.filter((page) => {
          const title = page.title || "";
          return !INVALID_PATTERNS.some((pat) => pat.test(title));
        }).slice(0, 5);

        if (filtered.length > 0) {
          return filtered.map((page) => ({
            name: page.title,
            cost: 0,
            category: "Sightseeing"
          }));
        }
      }
    } catch (error) {
      console.warn(
        `Wikipedia activity lookup failed for ${destination}: ${error.message}`
      );
    }
  }

  return genericActivities(destination);
}

module.exports = {
  fetchDestinationActivities,
  KNOWN_ACTIVITIES
};

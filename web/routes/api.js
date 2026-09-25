const express = require("express");
const router = express.Router();
const axios = require("axios");

const BACKEND_URL = process.env.TRAVELBUDDY_BACKEND_URL || "http://localhost:5000";

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function getAuthToken(req) {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
        return null;
    }

    return authHeader.substring(7);
}

function backendHeaders(req) {
    const token = getAuthToken(req);

    return token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        }
        : {
            "Content-Type": "application/json"
        };
}

function getDaysDiff(start, end) {
    const d1 = new Date(start);
    const d2 = new Date(end);

    return Math.ceil(
        (d2 - d1) / (1000 * 60 * 60 * 24)
    ) + 1;
}

// ---------------------------------------------------------
// Authentication proxy
// ---------------------------------------------------------

router.post("/auth/login", async (req, res) => {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/auth/login`,
            req.body,
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        return res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json(error.response.data);
        }

        console.error("Website login proxy error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to connect to TravelBuddy backend."
        });
    }
});

router.post("/auth/register", async (req, res) => {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/auth/register`,
            req.body,
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        return res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json(error.response.data);
        }

        console.error("Website registration proxy error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to connect to TravelBuddy backend."
        });
    }
});

router.get("/auth/me", async (req, res) => {
    try {
        const response = await axios.get(
            `${BACKEND_URL}/api/auth/me`,
            {
                headers: backendHeaders(req)
            }
        );

        return res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json(error.response.data);
        }

        console.error("Website auth/me proxy error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to connect to TravelBuddy backend."
        });
    }
});

router.patch("/auth/profile", async (req, res) => {
    try {
        const response = await axios.patch(
            `${BACKEND_URL}/api/auth/profile`,
            req.body,
            {
                headers: backendHeaders(req)
            }
        );

        return res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json(error.response.data);
        }

        console.error("Website auth/profile proxy error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to connect to TravelBuddy backend."
        });
    }
});

router.post("/auth/change-password", async (req, res) => {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/auth/change-password`,
            req.body,
            {
                headers: backendHeaders(req)
            }
        );

        return res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json(error.response.data);
        }

        console.error("Website auth/change-password proxy error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to connect to TravelBuddy backend."
        });
    }
});

// ---------------------------------------------------------
// POST /generate-trip
// ---------------------------------------------------------

router.post("/generate-trip", async (req, res) => {
    try {
        const tripData = req.body;
        const token = getAuthToken(req);

        if (!token) {
            return res.status(401).json({
                error: "Please login to generate and save a trip."
            });
        }

        if (
            !tripData.destination ||
            !tripData.startDate ||
            !tripData.endDate
        ) {
            return res.status(400).json({
                error:
                    "Destination, start date and end date are required."
            });
        }

        const days = getDaysDiff(
            tripData.startDate,
            tripData.endDate
        );

        const aiResponse = await axios.post(
            `${BACKEND_URL}/api/ai/itinerary`,
            {
                trip: tripData,
                days,
                routes: tripData.selectedRoute
                    ? [tripData.selectedRoute]
                    : []
            },
            {
                headers: backendHeaders(req),
                timeout: 120000
            }
        );

        const itinerary =
            aiResponse.data?.result?.itinerary;

        if (!Array.isArray(itinerary)) {
            throw new Error(
                "Backend AI did not return a valid itinerary."
            );
        }

        const backendResponse = await axios.post(
            `${BACKEND_URL}/api/trips`,
            {
                title: `${tripData.destination} Trip`,
                destination: tripData.destination,
                startDate: tripData.startDate,
                endDate: tripData.endDate,
                status: "PLANNED",
                plannerMetadata: {
                    ...tripData,
                    is_saved: tripData.is_saved ?? tripData.isSaved ?? false
                },
                is_saved: tripData.is_saved ?? tripData.isSaved ?? false,
                isSaved: tripData.is_saved ?? tripData.isSaved ?? false,
                itinerary
            },
            {
                headers: backendHeaders(req)
            }
        );

        const savedTrip =
            backendResponse.data.trip;

        return res.status(201).json({
            tripId: savedTrip.id,
            metadata:
                savedTrip.planner_metadata ||
                tripData,
            itinerary:
                savedTrip.itinerary ||
                itinerary
        });
    } catch (error) {
        console.error(
            "Error generating trip:",
            error
        );

        if (error.response) {
            return res.status(
                error.response.status
            ).json({
                error:
                    error.response.data?.message ||
                    error.response.data?.error ||
                    "Failed to save trip."
            });
        }

        return res.status(500).json({
            error:
                error.message ||
                "An error occurred."
        });
    }
});

// ---------------------------------------------------------
// GET /trips/:tripId
// ---------------------------------------------------------

router.get("/trips/:tripId", async (req, res) => {
    try {
        const token = getAuthToken(req);

        if (!token) {
            return res.status(401).json({
                error: "Authentication required."
            });
        }

        const response = await axios.get(
            `${BACKEND_URL}/api/trips/${req.params.tripId}`,
            {
                headers: backendHeaders(req)
            }
        );

        const trip = response.data.trip;

        return res.json({
            tripId: trip.id,
            metadata:
                trip.planner_metadata || {},
            itinerary:
                trip.itinerary || []
        });
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json({
                    error:
                        error.response.data?.message ||
                        "Trip not found."
                });
        }

        console.error(
            "Website trip GET proxy error:",
            error
        );

        return res.status(500).json({
            error: "Failed to load trip."
        });
    }
});

// ---------------------------------------------------------
// PATCH /trips/:tripId
// ---------------------------------------------------------

router.patch("/trips/:tripId", async (req, res) => {
    try {
        const token = getAuthToken(req);

        if (!token) {
            return res.status(401).json({
                error: "Authentication required."
            });
        }

        const body = req.body || {};
        const isSaved = body.is_saved !== undefined
            ? body.is_saved
            : (body.isSaved !== undefined ? body.isSaved : true);

        const response = await axios.patch(
            `${BACKEND_URL}/api/trips/${req.params.tripId}`,
            {
                plannerMetadata:
                    body.plannerMetadata ??
                    body.metadata,
                itinerary:
                    body.itinerary,
                is_saved: isSaved,
                isSaved: isSaved
            },
            {
                headers: backendHeaders(req)
            }
        );

        return res.json({
            success: true,
            tripId:
                response.data.trip.id
        });
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json({
                    error:
                        error.response.data?.message ||
                        "Failed to update trip."
                });
        }

        console.error(
            "Website trip PATCH proxy error:",
            error
        );

        return res.status(500).json({
            error: "Failed to update trip."
        });
    }
});

// ---------------------------------------------------------
// GET /pexels
// ---------------------------------------------------------

router.get("/pexels", async (req, res) => {
    const query = req.query.query;

    if (!query) {
        return res.status(400).json({
            error: "Query parameter is required"
        });
    }

    const PEXELS_API_KEY =
        process.env.PEXELS_API_KEY;

    if (!PEXELS_API_KEY) {
        return res.status(500).json({
            error:
                "PEXELS_API_KEY is missing on server."
        });
    }

    try {
        const response = await axios.get(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(
                query
            )}&per_page=1`,
            {
                headers: {
                    Authorization:
                        PEXELS_API_KEY
                }
            }
        );

        if (
            response.data &&
            response.data.photos &&
            response.data.photos.length > 0
        ) {
            return res.json({
                url:
                    response.data.photos[0]
                        .src.medium
            });
        }

        return res.status(404).json({
            error: "No image found"
        });
    } catch (error) {
        console.error(
            "Pexels error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to fetch image from Pexels"
        });
    }
});

// ---------------------------------------------------------
// POST /ai/json (Copilot & AI proxy)
// ---------------------------------------------------------

router.post("/ai/json", async (req, res) => {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/ai/json`,
            req.body,
            {
                headers: backendHeaders(req),
                timeout: 60000
            }
        );

        return res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json(error.response.data);
        }

        console.error("Website AI JSON proxy error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Unable to connect to AI backend."
        });
    }
});

// ---------------------------------------------------------
// POST /places/city (City Explorer & WanderGuide proxy)
// ---------------------------------------------------------

router.post("/places/city", async (req, res) => {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/places/city`,
            req.body,
            {
                headers: backendHeaders(req),
                timeout: 30000
            }
        );

        return res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json(error.response.data);
        }

        console.error("Website places proxy error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Unable to connect to TravelBuddy place discovery backend."
        });
    }
});

// ---------------------------------------------------------
// GET /places/autocomplete (Dynamic city autocomplete proxy)
// ---------------------------------------------------------

router.get("/places/autocomplete", async (req, res) => {
    try {
        const response = await axios.get(
            `${BACKEND_URL}/api/places/autocomplete`,
            {
                params: req.query,
                headers: backendHeaders(req),
                timeout: 10000
            }
        );

        return res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json(error.response.data);
        }

        console.error("Website places autocomplete proxy error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Unable to connect to TravelBuddy place autocomplete."
        });
    }
});

// ---------------------------------------------------------
// ALL /places/clear-cache
// ---------------------------------------------------------
router.all("/places/clear-cache", async (req, res) => {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/places/clear-cache`,
            {},
            {
                headers: backendHeaders(req),
                timeout: 5000
            }
        );
        return res.status(response.status).json(response.data);
    } catch (error) {
        return res.json({ success: true, message: "Cache cleared." });
    }
});

// ---------------------------------------------------------
// GET /geofence/zones (Safety / Danger Zones proxy)
// ---------------------------------------------------------
router.get("/geofence/zones", async (req, res) => {
    try {
        const response = await axios.get(
            `${BACKEND_URL}/api/geofence/zones`,
            {
                headers: backendHeaders(req),
                timeout: 10000
            }
        );

        return res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            return res
                .status(error.response.status)
                .json(error.response.data);
        }

        console.error("Website geofence zones proxy error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load geofence zones."
        });
    }
});

module.exports = router;


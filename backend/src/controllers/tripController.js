const pool = require("../config/db");

const ALLOWED_STATUSES = [
  "PLANNED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED"
];

function normalizeJsonValue(value, fallback = null) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  let parsed = value;

  for (let i = 0; i < 3; i++) {
    if (typeof parsed !== "string") {
      return parsed;
    }

    try {
      parsed = JSON.parse(parsed);
    } catch (error) {
      return value;
    }
  }

  return parsed;
}

function normalizeItineraryData(itinerary) {
  const parsed = normalizeJsonValue(itinerary, null);
  if (!Array.isArray(parsed)) return parsed;
  return parsed.map((day, dIdx) => {
    if (!day || typeof day !== "object") return day;
    const activities = Array.isArray(day.activities)
      ? day.activities.map((act, aIdx) => {
          if (!act || typeof act !== "object") return act;
          const title =
            act.title || act.activity || act.name || "Activity";
          const desc =
            act.desc || act.description || act.details || "";
          return {
            ...act,
            id: act.id !== undefined ? act.id : aIdx + 1,
            title,
            activity: act.activity || title,
            desc,
            description: act.description || desc,
            cost:
              typeof act.cost === "number" && !isNaN(act.cost)
                ? act.cost
                : parseInt(act.cost, 10) || 0
          };
        })
      : [];
    return {
      ...day,
      day: day.day || dIdx + 1,
      title: day.title || `Day ${day.day || dIdx + 1}`,
      activities
    };
  });
}

function formatTripRow(row) {
  if (!row) return row;
  const itinerary = normalizeItineraryData(row.itinerary);
  const plannerMetadata = normalizeJsonValue(row.planner_metadata, {});
  let isSaved = false;
  if (row.is_saved !== null && row.is_saved !== undefined) {
    isSaved = Boolean(row.is_saved === true || row.is_saved === "true");
  } else if (plannerMetadata && typeof plannerMetadata === "object") {
    isSaved = Boolean(
      plannerMetadata.is_saved === true ||
      plannerMetadata.is_saved === "true" ||
      plannerMetadata.isSaved === true ||
      plannerMetadata.isSaved === "true"
    );
  }
  return {
    ...row,
    is_saved: isSaved,
    isSaved: isSaved,
    itinerary,
    planner_metadata: {
      ...plannerMetadata,
      is_saved: isSaved,
      isSaved: isSaved
    }
  };
}

function isValidDate(value) {
  if (!value || typeof value !== "string") {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function validateDateRange(startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return "Start date and end date must be valid dates.";
  }

  if (new Date(endDate) < new Date(startDate)) {
    return "End date cannot be before start date.";
  }

  return null;
}

function validateStatus(status) {
  if (
    status !== undefined &&
    status !== null &&
    !ALLOWED_STATUSES.includes(String(status).toUpperCase())
  ) {
    return `Invalid trip status. Allowed values: ${ALLOWED_STATUSES.join(", ")}.`;
  }

  return null;
}

function validateJsonObject(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value !== "object" &&
    !Array.isArray(value)
  ) {
    return `${fieldName} must be a valid JSON object or array.`;
  }

  return null;
}

async function createTrip(req, res) {
  try {
    const {
      title,
      destination,
      startDate,
      endDate,
      status,
      plannerMetadata,
      metadata,
      itinerary,
      is_saved,
      isSaved
    } = req.body;

    if (
      !title ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title is required."
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required."
      });
    }

    const dateError = validateDateRange(
      startDate,
      endDate
    );

    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError
      });
    }

    const statusError = validateStatus(status);

    if (statusError) {
      return res.status(400).json({
        success: false,
        message: statusError
      });
    }

    const finalPlannerMetadata =
      normalizeJsonValue(
        plannerMetadata !== undefined
          ? plannerMetadata
          : metadata,
        null
      );

    const finalItinerary =
      normalizeJsonValue(itinerary, null);

    const plannerError = validateJsonObject(
      finalPlannerMetadata,
      "Planner metadata"
    );

    if (plannerError) {
      return res.status(400).json({
        success: false,
        message: plannerError
      });
    }

    const itineraryError = validateJsonObject(
      finalItinerary,
      "Itinerary"
    );

    if (itineraryError) {
      return res.status(400).json({
        success: false,
        message: itineraryError
      });
    }

    const finalStatus =
      status
        ? String(status).toUpperCase()
        : "PLANNED";

    const tripIsSaved = Boolean(
      is_saved === true ||
      is_saved === "true" ||
      isSaved === true ||
      isSaved === "true" ||
      (finalPlannerMetadata &&
        (finalPlannerMetadata.is_saved === true ||
          finalPlannerMetadata.isSaved === true))
    );

    if (finalPlannerMetadata && typeof finalPlannerMetadata === "object") {
      finalPlannerMetadata.is_saved = tripIsSaved;
      finalPlannerMetadata.isSaved = tripIsSaved;
    }

    const result = await pool.query(
      `INSERT INTO trips
        (
          user_id,
          title,
          destination,
          start_date,
          end_date,
          status,
          is_saved,
          planner_metadata,
          itinerary
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.id,
        title.trim(),
        destination
          ? String(destination).trim()
          : null,
        startDate,
        endDate,
        finalStatus,
        tripIsSaved,
        JSON.stringify(finalPlannerMetadata),
        JSON.stringify(finalItinerary)
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Trip created successfully.",
      trip: formatTripRow(result.rows[0])
    });
  } catch (error) {
    console.error("Create trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create trip."
    });
  }
}

async function getMyTrips(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM trips
       WHERE user_id = $1
       ORDER BY start_date DESC, created_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      trips: result.rows.map(formatTripRow)
    });
  } catch (error) {
    console.error("Get trips error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch trips."
    });
  }
}

async function getTripById(req, res) {
  try {
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID."
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM trips
       WHERE id = $1
         AND user_id = $2
       LIMIT 1`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found."
      });
    }

    return res.json({
      success: true,
      trip: formatTripRow(result.rows[0])
    });
  } catch (error) {
    console.error("Get trip by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch trip."
    });
  }
}

async function updateTrip(req, res) {
  try {
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID."
      });
    }

    const {
      title,
      destination,
      startDate,
      endDate,
      status,
      plannerMetadata,
      metadata,
      itinerary,
      is_saved,
      isSaved
    } = req.body;

    if (
      title !== undefined &&
      (
        typeof title !== "string" ||
        !title.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Title must be a non-empty string."
      });
    }

    const dateError =
      startDate !== undefined ||
      endDate !== undefined
        ? validateDateRange(
            startDate !== undefined
              ? startDate
              : new Date().toISOString(),
            endDate !== undefined
              ? endDate
              : new Date().toISOString()
          )
        : null;

    if (
      dateError &&
      (
        startDate !== undefined ||
        endDate !== undefined
      )
    ) {
      return res.status(400).json({
        success: false,
        message: dateError
      });
    }

    const statusError = validateStatus(status);

    if (statusError) {
      return res.status(400).json({
        success: false,
        message: statusError
      });
    }

    const finalPlannerMetadata =
      plannerMetadata !== undefined
        ? normalizeJsonValue(
            plannerMetadata,
            null
          )
        : metadata !== undefined
          ? normalizeJsonValue(
              metadata,
              null
            )
          : undefined;

    const finalItinerary =
      itinerary !== undefined
        ? normalizeJsonValue(
            itinerary,
            null
          )
        : undefined;

    const plannerError = validateJsonObject(
      finalPlannerMetadata,
      "Planner metadata"
    );

    if (plannerError) {
      return res.status(400).json({
        success: false,
        message: plannerError
      });
    }

    const itineraryError = validateJsonObject(
      finalItinerary,
      "Itinerary"
    );

    if (itineraryError) {
      return res.status(400).json({
        success: false,
        message: itineraryError
      });
    }

    const existingResult = await pool.query(
      `SELECT * FROM trips WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found."
      });
    }

    const existingTrip = existingResult.rows[0];

    let targetIsSaved = existingTrip.is_saved === true;
    if (is_saved !== undefined) {
      targetIsSaved = Boolean(is_saved === true || is_saved === "true");
    } else if (isSaved !== undefined) {
      targetIsSaved = Boolean(isSaved === true || isSaved === "true");
    } else if (
      finalPlannerMetadata &&
      (finalPlannerMetadata.is_saved !== undefined ||
        finalPlannerMetadata.isSaved !== undefined)
    ) {
      targetIsSaved = Boolean(
        finalPlannerMetadata.is_saved === true ||
          finalPlannerMetadata.isSaved === true
      );
    }

    let existingMeta = normalizeJsonValue(existingTrip.planner_metadata, {}) || {};
    let resolvedPlannerMetadata =
      finalPlannerMetadata !== undefined ? finalPlannerMetadata : existingMeta;

    if (resolvedPlannerMetadata && typeof resolvedPlannerMetadata === "object") {
      resolvedPlannerMetadata.is_saved = targetIsSaved;
      resolvedPlannerMetadata.isSaved = targetIsSaved;
    }

    const finalTitle = title !== undefined ? title.trim() : existingTrip.title;
    const finalDest = destination !== undefined ? (destination ? String(destination).trim() : null) : existingTrip.destination;
    const finalStart = startDate || existingTrip.start_date;
    const finalEnd = endDate || existingTrip.end_date;
    const finalStatus = status ? String(status).toUpperCase() : existingTrip.status;
    const resolvedItinerary = finalItinerary !== undefined ? finalItinerary : normalizeJsonValue(existingTrip.itinerary, []);

    const result = await pool.query(
      `UPDATE trips
       SET
         title = $1,
         destination = $2,
         start_date = $3,
         end_date = $4,
         status = $5,
         planner_metadata = $6,
         itinerary = $7,
         is_saved = $8,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
         AND user_id = $10
       RETURNING *`,
      [
        finalTitle,
        finalDest,
        finalStart,
        finalEnd,
        finalStatus,
        JSON.stringify(resolvedPlannerMetadata),
        JSON.stringify(resolvedItinerary),
        targetIsSaved,
        id,
        req.user.id
      ]
    );

    return res.json({
      success: true,
      message: "Trip updated successfully.",
      trip: formatTripRow(result.rows[0])
    });
  } catch (error) {
    console.error("Update trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update trip."
    });
  }
}

async function deleteTrip(req, res) {
  try {
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip ID."
      });
    }

    const result = await pool.query(
      `DELETE FROM trips
       WHERE id = $1
         AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found."
      });
    }

    return res.json({
      success: true,
      message: "Trip deleted successfully.",
      tripId: result.rows[0].id
    });
  } catch (error) {
    console.error("Delete trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete trip."
    });
  }
}

module.exports = {
  createTrip,
  getMyTrips,
  getTripById,
  updateTrip,
  deleteTrip
};


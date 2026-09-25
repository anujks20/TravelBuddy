const pool = require("../config/db");

async function addEmergencyContact(req, res) {
  try {
    const {
      name,
      phone,
      relationship,
      priority
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO emergency_contacts
        (
          user_id,
          name,
          phone,
          relationship,
          priority
        )
       VALUES
        ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.id,
        name.trim(),
        phone.trim(),
        relationship ? relationship.trim() : null,
        priority || 1
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Emergency contact added successfully.",
      contact: result.rows[0]
    });
  } catch (error) {
    console.error("Add emergency contact error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add emergency contact."
    });
  }
}

async function getEmergencyContacts(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM emergency_contacts
       WHERE user_id = $1
       ORDER BY priority ASC, created_at ASC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      contacts: result.rows
    });
  } catch (error) {
    console.error("Get emergency contacts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch emergency contacts."
    });
  }
}

module.exports = {
  addEmergencyContact,
  getEmergencyContacts
};
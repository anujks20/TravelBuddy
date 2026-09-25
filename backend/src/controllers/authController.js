const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { generateTouristUid } = require("../services/uidService");

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
}

async function register(req, res) {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      language,
      nationalityCode,
      identityType,
      identityNumber
    } = req.body;

    if (
      !fullName ||
      !email ||
      !password ||
      !nationalityCode ||
      !identityType ||
      !identityNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Full name, email, password, nationality, identity type and identity number are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedNationality = nationalityCode.trim().toUpperCase();
    const normalizedIdentityType = identityType.trim().toUpperCase();
    const normalizedIdentityNumber = identityNumber.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalizedNationality)) {
      return res.status(400).json({
        success: false,
        message: "Nationality code must be exactly 3 letters."
      });
    }

    if (!["AADHAAR", "PASSPORT"].includes(normalizedIdentityType)) {
      return res.status(400).json({
        success: false,
        message: "Identity type must be AADHAAR or PASSPORT."
      });
    }

    if (normalizedIdentityNumber.length < 4) {
      return res.status(400).json({
        success: false,
        message: "Invalid identity number."
      });
    }

    const cleanPhone = phone ? phone.trim().replace(/\D/g, "") : null;

    const existingUserRes = await pool.query(
      `SELECT * FROM users 
       WHERE LOWER(email) = $1 
          OR ($2::text IS NOT NULL AND $2 <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = $2)
       LIMIT 1`,
      [normalizedEmail, cleanPhone]
    );

    if (existingUserRes.rows.length > 0) {
      const existingUser = existingUserRes.rows[0];
      const passwordHash = await bcrypt.hash(password, 10);

      // Case A: Tourist was registered by hotel front desk -> link credentials to permanent UID
      if (existingUser.registered_source === "HOTEL_PORTAL") {
        const updateRes = await pool.query(
          `UPDATE users
           SET
             password_hash = $1,
             full_name = COALESCE($2, full_name),
             phone = COALESCE($3, phone),
             language = COALESCE($4, language),
             nationality_code = COALESCE($5, nationality_code),
             identity_type = COALESCE($6, identity_type),
             registered_source = 'SELF',
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $7
           RETURNING
             id,
             tourist_uid,
             full_name,
             email,
             phone,
             language,
             nationality_code,
             identity_verified,
             role,
             registered_source,
             created_at`,
          [
            passwordHash,
            fullName.trim(),
            phone ? phone.trim() : null,
            language || "English",
            normalizedNationality,
            normalizedIdentityType,
            existingUser.id
          ]
        );

        const linkedUser = updateRes.rows[0];
        const token = createToken(linkedUser);

        return res.status(200).json({
          success: true,
          message: "Existing tourist identity located! Linked to your permanent UID.",
          token,
          user: linkedUser
        });
      }

      // Case B: Tourist already registered on Web or Mobile -> check password to prevent duplicate
      const isPasswordMatch = await bcrypt.compare(password, existingUser.password_hash);
      if (isPasswordMatch) {
        delete existingUser.password_hash;
        const token = createToken(existingUser);

        return res.status(200).json({
          success: true,
          message: "Welcome back! Retrieved your existing TravelBuddy identity.",
          token,
          user: existingUser
        });
      }

      return res.status(409).json({
        success: false,
        message: "An account with this email/phone already exists. Please log in to access your UID.",
        existingUid: existingUser.tourist_uid
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    /*
     * PostgreSQL generates the UUID first.
     * We then derive the Tourist UID from:
     *
     * TB-NATIONALITY-IDENTITY4-RANDOM4
     */
    const userIdResult = await pool.query(
      "SELECT uuid_generate_v4() AS id"
    );

    const userId = userIdResult.rows[0].id;

    let touristUid;
    let uidExists = true;

    while (uidExists) {
      touristUid = generateTouristUid(
        normalizedNationality,
        normalizedIdentityNumber
      );

      const uidResult = await pool.query(
        "SELECT id FROM users WHERE tourist_uid = $1",
        [touristUid]
      );

      uidExists = uidResult.rows.length > 0;
    }

    const result = await pool.query(
      `INSERT INTO users
        (
          id,
          tourist_uid,
          full_name,
          email,
          phone,
          password_hash,
          language,
          nationality_code,
          identity_type,
          identity_verified,
          role
        )
       VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          FALSE,
          'TOURIST'
        )
       RETURNING
        id,
        tourist_uid,
        full_name,
        email,
        phone,
        language,
        nationality_code,
        identity_verified,
        role,
        created_at`,
      [
        userId,
        touristUid,
        fullName.trim(),
        normalizedEmail,
        phone || null,
        passwordHash,
        language || "English",
        normalizedNationality,
        normalizedIdentityType
      ]
    );

    const user = result.rows[0];
    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "TravelBuddy account created successfully.",
      token,
      user
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account."
    });
  }
}

async function login(req, res) {
  try {
    const { email, phone, password } = req.body;
    const identifier = (email || phone || req.body.username || "").trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/Phone and password are required."
      });
    }

    const normalizedEmail = identifier.toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, "");

    const result = await pool.query(
      `SELECT * FROM users 
       WHERE LOWER(email) = $1 
          OR ($2 <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = $2)
          OR UPPER(tourist_uid) = UPPER($3)
       LIMIT 1`,
      [normalizedEmail, cleanPhone, identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials."
      });
    }

    const user = result.rows[0];

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const token = createToken(user);

    delete user.password_hash;

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login."
    });
  }
}

async function me(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        id,
        tourist_uid,
        full_name,
        email,
        phone,
        language,
        nationality_code,
        profile_photo_url,
        identity_type,
        identity_verified,
        role,
        created_at,
        updated_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    return res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Me error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch user profile."
    });
  }
}

async function updateProfile(req, res) {
  try {
    const { fullName, phone, language } = req.body;

    // Fixed / Read-only fields cannot be altered (email, tourist_uid, nationality_code, identity_type, identity_verified, role)
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (fullName !== undefined && fullName.trim() !== "") {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName.trim());
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone.trim() === "" ? null : phone.trim());
    }

    if (language !== undefined && language.trim() !== "") {
      updates.push(`language = $${paramIndex++}`);
      values.push(language.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid profile fields provided for update."
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.id);

    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        tourist_uid,
        full_name,
        email,
        phone,
        language,
        nationality_code,
        profile_photo_url,
        identity_type,
        identity_verified,
        role,
        created_at,
        updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Phone number is already associated with another account."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update profile."
    });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long."
      });
    }

    // Retrieve user with password_hash
    const userResult = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect."
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newHash, req.user.id]
    );

    return res.json({
      success: true,
      message: "Password changed successfully."
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password."
    });
  }
}

function logout(req, res) {
  return res.json({
    success: true,
    message: "Logout successful. Remove the stored token from the client."
  });
}

module.exports = {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  logout
};
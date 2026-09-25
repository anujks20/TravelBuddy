const crypto = require("crypto");

function normalizeNationality(code) {
  return code.trim().toUpperCase().slice(0, 3);
}

function deriveIdentityPart(identityNumber) {
  const normalized = identityNumber.trim().toUpperCase();

  const hash = crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex")
    .toUpperCase();

  return hash.slice(0, 4);
}

function generateRandomPart() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(4);

  let result = "";

  for (let i = 0; i < 4; i++) {
    result += characters[bytes[i] % characters.length];
  }

  return result;
}

function generateTouristUid(nationalityCode, identityNumber) {
  const nationality = normalizeNationality(nationalityCode);
  const identityPart = deriveIdentityPart(identityNumber);
  const randomPart = generateRandomPart();

  return `TB-${nationality}-${identityPart}-${randomPart}`;
}

module.exports = {
  generateTouristUid
};

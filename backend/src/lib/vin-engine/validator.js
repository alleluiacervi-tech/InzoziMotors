// ─────────────────────────────────────────────────────────────────────────────
// vin-engine/validator.js
// Enterprise VIN validation, normalization, safe masking, and check digit math.
// ─────────────────────────────────────────────────────────────────────────────

// ISO 3779 / 49 CFR Part 565 Transliteration Value Map
const TRANSLITERATION = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
};

// Position weights for 17-digit check digit calculation (Position 9 has weight 0)
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

// ISO 3779 format: Exactly 17 characters, excluding confusing letters I, O, and Q
const ISO_VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

// Japanese Domestic Market (JDM) Chassis format:
// Model code prefix (e.g. NZE141, ACA31, ZSU60) followed by 6 to 8 numeric serial digits
const JDM_CHASSIS_REGEX = /^([A-Z]{1,4}[0-9]{1,4}|[A-Z]{1,3}-[A-Z0-9]{2,5})[- ]?[0-9]{6,8}$/;

/**
 * Normalizes any VIN or chassis input into uppercase alphanumeric characters.
 * Removes spaces, hyphens, slashes, and other punctuation.
 */
function normalizeVin(raw) {
  const cleaned = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned || null;
}

/**
 * Creates a safe, masked string representation for public viewing.
 * NEVER leaks the full VIN.
 * Examples:
 *   - "JTDBZ293401234567" -> "JTDBZ293***234567" or "JTDBZ293***1234"
 *   - "NZE141-5028491"     -> "NZE141-***8491"
 *   - Invalid or empty     -> "VIN Hidden"
 */
function maskVin(raw, options = {}) {
  const key = normalizeVin(raw);
  if (!key) return 'VIN Hidden';
  
  if (options.labelOnly) {
    return 'VIN Verified';
  }

  if (key.length >= 17) {
    // Show first 8 chars (WMI + model prefix), mask middle, show last 4 chars (serial)
    return `${key.slice(0, 8)}***${key.slice(-4)}`;
  }

  if (key.length >= 8) {
    const prefixLen = Math.min(6, Math.floor(key.length / 2));
    return `${key.slice(0, prefixLen)}***${key.slice(-3)}`;
  }

  return 'VIN Verified';
}

/**
 * Calculates and validates the ISO Modulo 11 check digit (Position 9).
 * Standardized for North American and Chinese VINs, and used by many global manufacturers.
 * Note: Some European manufacturers do not enforce check-digit for non-US exports,
 * so failure flags an anomaly rather than rejecting the vehicle outright.
 */
function validateCheckDigit(vin17) {
  if (!vin17 || vin17.length !== 17) {
    return { valid: false, calculated: null, recorded: null, reason: 'Length must be exactly 17 characters' };
  }

  const recorded = vin17[8]; // 9th character (0-indexed 8)
  let sum = 0;

  for (let i = 0; i < 17; i++) {
    const char = vin17[i];
    const val = TRANSLITERATION[char];
    if (val === undefined) {
      return { valid: false, calculated: null, recorded, reason: `Invalid character '${char}' at index ${i}` };
    }
    sum += val * WEIGHTS[i];
  }

  const remainder = sum % 11;
  const calculated = remainder === 10 ? 'X' : String(remainder);
  const valid = recorded === calculated;

  return {
    valid,
    calculated,
    recorded,
    reason: valid ? 'Check digit verified' : `Check digit mismatch: expected ${calculated}, got ${recorded}`,
  };
}

/**
 * Validates and analyzes any vehicle identifier string.
 */
function validateVehicleIdentifier(raw) {
  const normalized = normalizeVin(raw);
  if (!normalized) {
    return {
      raw,
      normalized: null,
      type: 'empty',
      valid: false,
      masked: 'VIN Hidden',
      summary: 'No VIN or chassis number provided',
    };
  }

  // 1. Standard ISO 17-character VIN
  if (ISO_VIN_REGEX.test(normalized)) {
    const checkDigit = validateCheckDigit(normalized);
    return {
      raw,
      normalized,
      type: 'iso',
      valid: true,
      wmi: normalized.slice(0, 3),
      vds: normalized.slice(3, 9),
      vis: normalized.slice(9, 17),
      checkDigit,
      masked: maskVin(normalized),
      summary: 'Standard 17-character ISO VIN',
    };
  }

  // 2. Japanese Chassis Number
  const isJdmCandidate = JDM_CHASSIS_REGEX.test(String(raw || '').trim().toUpperCase());

  if (isJdmCandidate) {
    const parts = String(raw || '').trim().toUpperCase().split(/[- ]+/);
    const prefix = parts.length > 1 ? parts[0] : normalized.slice(0, 6);
    const serial = parts.length > 1 ? parts.slice(1).join('') : normalized.slice(6);
    return {
      raw,
      normalized,
      type: 'chassis',
      valid: true,
      chassisPrefix: prefix,
      chassisSerial: serial,
      masked: maskVin(normalized),
      summary: 'Japanese Domestic Market (JDM) chassis number',
    };
  }

  // 3. Short or non-standard format
  return {
    raw,
    normalized,
    type: normalized.length < 8 ? 'short' : 'non_standard',
    valid: false,
    masked: 'VIN Hidden',
    summary: `Unrecognized identifier shape (${normalized.length} characters)`,
  };
}

module.exports = {
  normalizeVin,
  maskVin,
  validateCheckDigit,
  validateVehicleIdentifier,
  ISO_VIN_REGEX,
  JDM_CHASSIS_REGEX,
};

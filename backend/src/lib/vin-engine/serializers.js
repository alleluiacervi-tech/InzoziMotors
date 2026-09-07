// ─────────────────────────────────────────────────────────────────────────────
// vin-engine/serializers.js
// Strict public / internal data serialization boundary.
// GUARANTEES that raw VIN, PII, and sensitive metadata NEVER leak publicly.
// ─────────────────────────────────────────────────────────────────────────────

const { maskVin } = require('./validator');

const PUBLIC_COVERAGE_STATEMENT =
  'Vehicle history records are aggregated from verified inspection stations, customs filings, and manufacturer open databases. ' +
  'No relevant records were found in currently available data sources for accidents or open safety recalls. ' +
  'We do not claim this represents all events in the vehicle’s lifetime.';

/**
 * Serializes a canonical vehicle for public consumption.
 * STRICT ZERO LEAK POLICY:
 *   - No raw VIN
 *   - No internal provider metadata
 *   - Masked representation only ("VIN Verified" or "JTDBZ29***1234")
 */
function serializePublicVehicle(vehicle, events = [], signals = []) {
  if (!vehicle) return null;

  const publicEvents = events
    .filter((e) => e.is_public !== false)
    .map((e) => ({
      id: e.id,
      eventType: e.event_type,
      eventDate: e.event_date,
      title: e.title,
      summary: e.public_summary,
      odometerKm: e.odometer_km || null,
      odometerVerified: Boolean(e.odometer_verified),
      hasAnomaly: Boolean(e.has_anomaly),
    }));

  const publicSignals = signals
    .filter((s) => !s.resolved)
    .map((s) => ({
      signalType: s.signal_type,
      severity: s.severity,
      title: s.title,
      message: s.public_message,
    }));

  return {
    id: vehicle.id,
    vinDisplay: vehicle.vin_masked || maskVin(vehicle.vin_raw),
    vinVerified: vehicle.verification_status !== 'unverified',
    verificationStatus: vehicle.verification_status,
    confidenceScore: vehicle.confidence_score,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    trim: vehicle.trim || null,
    bodyType: vehicle.body_type || null,
    engineCc: vehicle.engine_displacement_cc || null,
    engineDescription: vehicle.engine_description || null,
    fuelType: vehicle.fuel_type || null,
    transmission: vehicle.transmission || null,
    drivetrain: vehicle.drivetrain || null,
    plantCountry: vehicle.plant_country || null,
    historyTimeline: publicEvents,
    odometerProgression: publicEvents
      .filter((e) => e.odometerKm)
      .map((e) => ({ date: e.eventDate, km: e.odometerKm, verified: e.odometerVerified })),
    dataQualitySignals: publicSignals,
    coverageStatement: PUBLIC_COVERAGE_STATEMENT,
  };
}

/**
 * Serializes a canonical vehicle for authorized administrators.
 * Retains full VIN, raw provider metadata, and internal audit evidence.
 */
function serializeAdminVehicle(vehicle, events = [], signals = [], auditLogs = []) {
  if (!vehicle) return null;

  return {
    id: vehicle.id,
    vinRaw: vehicle.vin_raw,
    vinNormalized: vehicle.vin_normalized,
    vinMasked: vehicle.vin_masked,
    vinType: vehicle.vin_type,
    wmi: vehicle.wmi,
    vds: vehicle.vds,
    vis: vehicle.vis,
    checkDigit: vehicle.check_digit,
    checkDigitValid: vehicle.check_digit_valid,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    trim: vehicle.trim,
    bodyType: vehicle.body_type,
    engineDisplacementCc: vehicle.engine_displacement_cc,
    engineCylinders: vehicle.engine_cylinders,
    engineDescription: vehicle.engine_description,
    fuelType: vehicle.fuel_type,
    transmission: vehicle.transmission,
    drivetrain: vehicle.drivetrain,
    plantCountry: vehicle.plant_country,
    plantCity: vehicle.plant_city,
    verificationStatus: vehicle.verification_status,
    confidenceScore: vehicle.confidence_score,
    historyEvents: events,
    dataQualitySignals: signals,
    auditLogs: auditLogs,
    createdAt: vehicle.created_at,
    updatedAt: vehicle.updated_at,
  };
}

module.exports = {
  serializePublicVehicle,
  serializeAdminVehicle,
  PUBLIC_COVERAGE_STATEMENT,
};

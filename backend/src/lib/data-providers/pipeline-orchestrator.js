// ─────────────────────────────────────────────────────────────────────────────
// data-providers/pipeline-orchestrator.js
// Multi-provider ingestion coordinator, normalization, entity resolution & storage.
// ─────────────────────────────────────────────────────────────────────────────

const { validateVehicleIdentifier, maskVin } = require('../vin-engine/validator');
const { analyzeVehicleDataQuality } = require('../vin-engine/anomaly-detector');
const LocalDecoderProvider = require('./local-decoder-provider');
const NhtsaVpicProvider = require('./nhtsa-vpic-provider');
const SawaInspectionProvider = require('./sawa-inspection-provider');
const CommercialProviderAdapter = require('./commercial-adapter');
// Text from outside sources (NHTSA alone describes an SUV in 54 characters) is
// cut to the column it lands in, so a long label can never fail the whole save.
// Widths match the schema (migration 0055 for the four spec columns).
const clip = (value, max) => (value == null ? null : String(value).slice(0, max));

let pool = null;
try {
  pool = require('../../db');
} catch (_) {
  // Offline or unit test environment without local pg driver
}

class VehiclePipelineOrchestrator {
  constructor() {
    this.providers = [
      new LocalDecoderProvider(),
      new NhtsaVpicProvider(),
      new SawaInspectionProvider(),
      new CommercialProviderAdapter({ id: 'carfax', name: 'Carfax Partner Feed' }),
    ];
  }

  /**
   * Runs the complete ingestion and intelligence pipeline for a raw VIN / Chassis string.
   */
  async processVin(rawVin, options = {}) {
    const vinContext = validateVehicleIdentifier(rawVin);
    if (!vinContext.valid) {
      return {
        success: false,
        error: vinContext.summary,
        vinContext,
        specs: {},
        events: [],
        signals: [],
      };
    }

    // 1. Run all data providers in parallel with timeout isolation. A
    // commercial feed with no contract configured is not queried at all and is
    // listed as not configured: it used to report success while returning
    // nothing, and its "standby" note was saved against every vehicle.
    const configured = this.providers.filter((p) => typeof p.isConfigured !== 'function' || p.isConfigured());
    const unconfigured = this.providers.filter((p) => !configured.includes(p));
    const providerResults = await Promise.all(
      configured.map((provider) => provider.safeFetch(vinContext, options.timeoutMs || 4000))
    );

    // 2. Normalization & Specification Merging
    // Priority order: Sawa Inspection Station -> NHTSA Gov API -> Local ISO/JDM Decoder
    const mergedSpecs = {};
    const allEvents = [];
    const allFlags = [];
    const activeProviders = [];

    for (const res of providerResults) {
      if (!res.success && !res.data) continue;
      activeProviders.push({
        id: res.providerId,
        name: res.providerName,
        success: res.success,
        error: res.error || null,
      });

      const { specs = {}, events = [], qualityFlags = [] } = res.data;

      // Merge specs with precedence to non-empty fields
      for (const [k, v] of Object.entries(specs)) {
        if (v && (!mergedSpecs[k] || res.providerId === 'sawa_inspection' || res.providerId === 'nhtsa_vpic')) {
          mergedSpecs[k] = v;
        }
      }

      // Collect events with provider attribution
      for (const ev of events) {
        allEvents.push({
          ...ev,
          providerId: ev.providerId || res.providerId,
          sourceType: ev.sourceType || 'automated_feed',
        });
      }

      for (const flag of qualityFlags) {
        allFlags.push({ ...flag, providerId: res.providerId });
      }
    }
    for (const provider of unconfigured) {
      activeProviders.push({ id: provider.id, name: provider.name, success: false, error: 'Not configured' });
    }

    // Default required fields if missing
    mergedSpecs.make = mergedSpecs.make || 'Unknown';
    mergedSpecs.model = mergedSpecs.model || 'Unknown';
    mergedSpecs.year = mergedSpecs.year || new Date().getFullYear();

    // 3. Chronological sorting and event deduplication
    const sortedEvents = allEvents.sort((a, b) => {
      const timeA = new Date(a.eventDate || a.eventTimestamp || 0).getTime();
      const timeB = new Date(b.eventDate || b.eventTimestamp || 0).getTime();
      return timeA - timeB;
    });

    // 4. Data Quality & Anomaly Analysis
    const qualityAnalysis = analyzeVehicleDataQuality({
      specs: mergedSpecs,
      events: sortedEvents,
      qualityFlags: allFlags,
    });

    const intelligencePayload = {
      success: true,
      vinContext,
      vehicleIdentity: {
        vinRaw: vinContext.normalized,
        vinNormalized: vinContext.normalized,
        vinMasked: maskVin(vinContext.normalized),
        vinType: vinContext.type,
        wmi: vinContext.wmi || null,
        vds: vinContext.vds || null,
        vis: vinContext.vis || null,
        checkDigit: vinContext.checkDigit ? vinContext.checkDigit.recorded : null,
        checkDigitValid: vinContext.checkDigit ? vinContext.checkDigit.valid : null,
      },
      specs: mergedSpecs,
      events: sortedEvents,
      signals: qualityAnalysis.signals,
      verificationStatus: qualityAnalysis.verificationStatus,
      confidenceScore: qualityAnalysis.confidenceScore,
      hasAnomalies: qualityAnalysis.hasAnomalies,
      activeProviders,
    };

    // 5. If persistent storage requested, persist canonical vehicle and history
    if (options.persist) {
      const persistedVehicle = await this._persistToDatabase(intelligencePayload);
      intelligencePayload.vehicleId = persistedVehicle.id;
    }

    return intelligencePayload;
  }

  /**
   * Persists canonical vehicle entity and history events into PostgreSQL.
   */
  async _persistToDatabase(payload) {
    const { vehicleIdentity, specs, events, signals, verificationStatus, confidenceScore } = payload;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert into vehicles table
      const upsertSql = `
        INSERT INTO vehicles (
          vin_raw, vin_normalized, vin_masked, vin_type,
          wmi, vds, vis, check_digit, check_digit_valid,
          make, model, year, trim, body_type,
          engine_displacement_cc, engine_cylinders, engine_description,
          fuel_type, transmission, drivetrain, plant_country, plant_city,
          verification_status, confidence_score, data_quality_flags,
          updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19, $20, $21, $22,
          $23, $24, $25,
          NOW()
        )
        ON CONFLICT (vin_normalized) DO UPDATE SET
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          year = EXCLUDED.year,
          trim = COALESCE(EXCLUDED.trim, vehicles.trim),
          body_type = COALESCE(EXCLUDED.body_type, vehicles.body_type),
          engine_displacement_cc = COALESCE(EXCLUDED.engine_displacement_cc, vehicles.engine_displacement_cc),
          fuel_type = COALESCE(EXCLUDED.fuel_type, vehicles.fuel_type),
          transmission = COALESCE(EXCLUDED.transmission, vehicles.transmission),
          drivetrain = COALESCE(EXCLUDED.drivetrain, vehicles.drivetrain),
          verification_status = EXCLUDED.verification_status,
          confidence_score = EXCLUDED.confidence_score,
          data_quality_flags = EXCLUDED.data_quality_flags,
          updated_at = NOW()
        RETURNING *;
      `;

      const vehicleRes = await client.query(upsertSql, [
        vehicleIdentity.vinRaw,
        vehicleIdentity.vinNormalized,
        vehicleIdentity.vinMasked,
        vehicleIdentity.vinType,
        vehicleIdentity.wmi,
        vehicleIdentity.vds,
        vehicleIdentity.vis,
        vehicleIdentity.checkDigit,
        vehicleIdentity.checkDigitValid,
        clip(specs.make, 100),
        clip(specs.model, 100),
        specs.year,
        clip(specs.trim || null, 100),
        clip(specs.bodyType || null, 120),
        specs.engineCc || null,
        specs.cylinders || null,
        clip(specs.engineDescription || null, 100),
        clip(specs.fuelType || null, 120),
        clip(specs.transmission || null, 120),
        clip(specs.drivetrain || null, 120),
        clip(specs.plantCountry || null, 100),
        clip(specs.plantCity || null, 100),
        verificationStatus,
        confidenceScore,
        JSON.stringify(signals),
      ]);

      const vehicle = vehicleRes.rows[0];

      // Insert events (idempotent upsert or ignore duplicates)
      for (const ev of events) {
        if (!ev.eventDate) continue;
        await client.query(
          `INSERT INTO vehicle_history_events (
             vehicle_id, event_type, event_date, event_timestamp,
             odometer_km, odometer_verified, provider_id, source_type,
             source_reference, confidence_score, title, public_summary,
             internal_details, is_public, has_anomaly, anomaly_description
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT DO NOTHING`,
          [
            vehicle.id,
            clip(ev.eventType, 50),
            ev.eventDate,
            ev.eventTimestamp || null,
            ev.odometerKm || null,
            Boolean(ev.odometerVerified),
            clip(ev.providerId || 'pipeline', 50),
            clip(ev.sourceType || 'automated_feed', 50),
            clip(ev.sourceReference || null, 150),
            ev.confidence || 1.0,
            clip(ev.title || 'Historical Event', 200),
            ev.publicSummary || '',
            JSON.stringify(ev.internalDetails || {}),
            ev.isPublic !== false,
            Boolean(ev.hasAnomaly),
            clip(ev.anomalyDescription || null, 255),
          ]
        );
      }

      // Insert signals
      for (const sig of signals) {
        await client.query(
          `INSERT INTO vehicle_data_quality_signals (
             vehicle_id, signal_type, severity, title, public_message, internal_evidence
           ) VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          // Providers report { message, evidence } (base-provider.js); the
          // anomaly detector reports { publicMessage, internalEvidence }. Both
          // are accepted: reading only the second made every provider note a
          // NOT NULL violation, and so every VIN lookup a 500.
          [
            vehicle.id,
            clip(sig.signalType, 60),
            clip(sig.severity || 'info', 20),
            clip(sig.title || sig.signalType, 150),
            sig.publicMessage || sig.message || sig.title || sig.signalType,
            JSON.stringify(sig.internalEvidence || sig.evidence || {}),
          ]
        );
      }

      await client.query('COMMIT');
      return vehicle;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

const orchestrator = new VehiclePipelineOrchestrator();

module.exports = {
  VehiclePipelineOrchestrator,
  orchestrator,
};

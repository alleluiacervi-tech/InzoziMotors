// ─────────────────────────────────────────────────────────────────────────────
// routes/public-vehicles.js
// Publicly accessible vehicle history and verification endpoints.
// STRICT ZERO-LEAK POLICY: Raw VINs and PII are never returned to public callers.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { serializePublicVehicle, PUBLIC_COVERAGE_STATEMENT } = require('../lib/vin-engine/serializers');
const { validateVehicleIdentifier } = require('../lib/vin-engine/validator');
const { orchestrator } = require('../lib/data-providers/pipeline-orchestrator');
const pool = require('../db');

const router = express.Router();

/**
 * GET /vehicles/public/:id
 * Retrieves sanitized vehicle specs and public history events by vehicle UUID.
 */
router.get('/public/:id', async (req, res) => {
  try {
    const vehicleRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (!vehicleRes.rows.length) {
      return res.status(404).json({
        error: 'No vehicle record found',
        message: 'No relevant records were found in the data sources currently available to us.',
        coverageStatement: PUBLIC_COVERAGE_STATEMENT,
      });
    }

    const vehicle = vehicleRes.rows[0];

    const [eventsRes, signalsRes] = await Promise.all([
      pool.query(
        'SELECT * FROM vehicle_history_events WHERE vehicle_id = $1 AND is_public = TRUE ORDER BY event_date ASC',
        [vehicle.id]
      ),
      pool.query('SELECT * FROM vehicle_data_quality_signals WHERE vehicle_id = $1', [vehicle.id]),
    ]);

    const sanitized = serializePublicVehicle(vehicle, eventsRes.rows, signalsRes.rows);
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: 'Could not load vehicle history', message: err.message });
  }
});

/**
 * GET /vehicles/lookup?vin=...
 * Public VIN / Chassis search tool.
 * Evaluates the query, retrieves verified records if known or decodes specs,
 * and returns a strictly sanitized public vehicle report.
 */
router.get('/lookup', async (req, res) => {
  const query = req.query.vin || req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'VIN or Chassis number is required to perform a search' });
  }

  const vinContext = validateVehicleIdentifier(query);
  if (!vinContext.valid) {
    return res.status(400).json({
      error: 'Invalid vehicle identifier',
      message: 'Please provide a valid 17-character VIN or Japanese chassis code.',
    });
  }

  try {
    // 1. Check if vehicle already exists in our database
    const dbRes = await pool.query('SELECT * FROM vehicles WHERE vin_normalized = $1', [vinContext.normalized]);

    if (dbRes.rows.length) {
      const vehicle = dbRes.rows[0];
      const [eventsRes, signalsRes] = await Promise.all([
        pool.query(
          'SELECT * FROM vehicle_history_events WHERE vehicle_id = $1 AND is_public = TRUE ORDER BY event_date ASC',
          [vehicle.id]
        ),
        pool.query('SELECT * FROM vehicle_data_quality_signals WHERE vehicle_id = $1', [vehicle.id]),
      ]);
      return res.json(serializePublicVehicle(vehicle, eventsRes.rows, signalsRes.rows));
    }

    // 2. If not yet in database, run through pipeline to decode specs without publishing private flags
    const pipelineResult = await orchestrator.processVin(query, { persist: false });
    if (!pipelineResult.success) {
      return res.status(404).json({
        error: 'No records found',
        message: 'No relevant records were found in the data sources currently available to us.',
        coverageStatement: PUBLIC_COVERAGE_STATEMENT,
      });
    }

    // Create ephemeral sanitized object for public view
    const ephemeralVehicle = {
      id: null,
      vin_masked: pipelineResult.vehicleIdentity.vinMasked,
      verification_status: pipelineResult.verificationStatus,
      confidence_score: pipelineResult.confidenceScore,
      make: pipelineResult.specs.make,
      model: pipelineResult.specs.model,
      year: pipelineResult.specs.year,
      trim: pipelineResult.specs.trim,
      body_type: pipelineResult.specs.bodyType,
      engine_displacement_cc: pipelineResult.specs.engineCc,
      engine_description: pipelineResult.specs.engineDescription,
      fuel_type: pipelineResult.specs.fuelType,
      transmission: pipelineResult.specs.transmission,
      drivetrain: pipelineResult.specs.drivetrain,
      plant_country: pipelineResult.specs.plantCountry,
    };

    const sanitized = serializePublicVehicle(
      ephemeralVehicle,
      pipelineResult.events.map((e, idx) => ({ ...e, id: `ev-${idx}`, is_public: true })),
      pipelineResult.signals
    );

    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search vehicle history', message: err.message });
  }
});

module.exports = router;

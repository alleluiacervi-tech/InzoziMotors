// ─────────────────────────────────────────────────────────────────────────────
// routes/vehicle-intelligence.js
// Admin endpoints for VIN intelligence, decoding, anomaly resolution,
// and discrepancy diffing. Mounted at /admin/vehicles.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { orchestrator } = require('../lib/data-providers/pipeline-orchestrator');
const { compareListingAgainstVerified } = require('../lib/vin-engine/anomaly-detector');
const { serializeAdminVehicle } = require('../lib/vin-engine/serializers');
const { logVinAction } = require('../lib/vin-engine/audit-logger');
const pool = require('../db');

const router = express.Router();

// ── All routes in this file require administrator authentication ─────────────
router.use(requireAdmin);

/**
 * POST /admin/vehicles/decode-and-retrieve
 * Core admin workflow: Enter VIN -> Validate -> Multi-Provider Ingestion -> Populate Data.
 */
router.post('/decode-and-retrieve', async (req, res) => {
  const { vin } = req.body;
  if (!vin) {
    return res.status(400).json({ error: 'VIN or Chassis number is required', code: 'VIN_REQUIRED' });
  }

  try {
    const result = await orchestrator.processVin(vin, { persist: true });

    // Record audit log
    await logVinAction({
      userId: req.user.id,
      action: 'vin.decode',
      targetVehicleId: result.vehicleId || null,
      rawVin: vin,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        success: result.success,
        providersQueried: result.activeProviders ? result.activeProviders.length : 0,
        hasAnomalies: result.hasAnomalies,
      },
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error, code: 'INVALID_VEHICLE_IDENTIFIER' });
    }

    res.json(result);
  } catch (err) {
    console.error('Error in decode-and-retrieve:', err);
    res.status(500).json({ error: 'Failed to process vehicle identifier', message: err.message });
  }
});

/**
 * POST /admin/vehicles/compare-discrepancies
 * Compares administrator-entered listing fields against verified VIN data.
 */
router.post('/compare-discrepancies', (req, res) => {
  const { listingInputs, verifiedSpecs } = req.body;
  if (!listingInputs || !verifiedSpecs) {
    return res.status(400).json({ error: 'listingInputs and verifiedSpecs are required' });
  }

  const discrepancies = compareListingAgainstVerified(listingInputs, verifiedSpecs);
  res.json({
    hasDiscrepancies: discrepancies.length > 0,
    count: discrepancies.length,
    discrepancies,
  });
});

/**
 * GET /admin/vehicles/intelligence/:id
 * Deep Vehicle Intelligence panel for authorized administrators.
 */
router.get('/intelligence/:id', async (req, res) => {
  try {
    const vehicleRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (!vehicleRes.rows.length) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    const vehicle = vehicleRes.rows[0];

    const [eventsRes, signalsRes, auditRes] = await Promise.all([
      pool.query('SELECT * FROM vehicle_history_events WHERE vehicle_id = $1 ORDER BY event_date ASC', [vehicle.id]),
      pool.query('SELECT * FROM vehicle_data_quality_signals WHERE vehicle_id = $1 ORDER BY created_at DESC', [vehicle.id]),
      pool.query('SELECT * FROM vin_audit_logs WHERE target_vehicle_id = $1 ORDER BY created_at DESC LIMIT 50', [vehicle.id]),
    ]);

    await logVinAction({
      userId: req.user.id,
      action: 'vin.search',
      targetVehicleId: vehicle.id,
      rawVin: vehicle.vin_raw,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { accessLevel: 'admin_full' },
    });

    res.json(serializeAdminVehicle(vehicle, eventsRes.rows, signalsRes.rows, auditRes.rows));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load vehicle intelligence', message: err.message });
  }
});

/**
 * POST /admin/vehicles/signals/:id/resolve
 * Resolves an anomaly flag with administrator review note.
 */
router.post('/signals/:id/resolve', async (req, res) => {
  const { note } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE vehicle_data_quality_signals
          SET resolved = TRUE, resolved_by = $1, resolved_at = NOW(), resolution_note = $2
        WHERE id = $3
        RETURNING *`,
      [req.user.id, note || 'Resolved by administrator', req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    await logVinAction({
      userId: req.user.id,
      action: 'verification.update',
      targetVehicleId: rows[0].vehicle_id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { signalId: req.params.id, resolutionNote: note },
    });

    res.json({ success: true, resolvedSignal: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve signal', message: err.message });
  }
});

module.exports = router;

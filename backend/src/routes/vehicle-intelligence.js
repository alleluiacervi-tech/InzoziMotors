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

/**
 * GET /admin/vehicles/signals
 * Lists data quality signals across all vehicles.
 * Optional query param: ?resolved=false (default: false)
 */
router.get('/signals', async (req, res) => {
  const resolved = req.query.resolved === 'true';
  try {
    const { rows } = await pool.query(
      `SELECT s.*, v.vin_masked, v.make, v.model, v.year, v.verification_status,
              u.name AS resolver_name
         FROM vehicle_data_quality_signals s
         JOIN vehicles v ON v.id = s.vehicle_id
         LEFT JOIN users u ON u.id = s.resolved_by
        WHERE s.resolved = $1
        ORDER BY 
          CASE s.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END ASC,
          s.created_at DESC
        LIMIT 100`,
      [resolved]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch anomaly signals', message: err.message });
  }
});

/**
 * POST /admin/vehicles/:id/events
 * Appends a verified real-world provenance event to vehicle history.
 */
router.post('/:id/events', async (req, res) => {
  const {
    event_type,
    event_date,
    odometer_km,
    odometer_verified = false,
    provider_id = 'sawa_admin_manual',
    source_type = 'inspection_station',
    source_reference,
    title,
    public_summary,
    internal_details,
    is_public = true,
  } = req.body;

  if (!event_type || !event_date || !title || !public_summary) {
    return res.status(400).json({
      error: 'event_type, event_date, title, and public_summary are required',
      code: 'MISSING_EVENT_FIELDS',
    });
  }

  try {
    const vehicleRes = await pool.query('SELECT id, vin_raw FROM vehicles WHERE id = $1', [req.params.id]);
    if (!vehicleRes.rows.length) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const { rows } = await pool.query(
      `INSERT INTO vehicle_history_events (
        vehicle_id, event_type, event_date, odometer_km, odometer_verified,
        provider_id, source_type, source_reference, confidence_score,
        title, public_summary, internal_details, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1.000, $9, $10, $11, $12)
      RETURNING *`,
      [
        req.params.id,
        event_type,
        event_date,
        odometer_km ? Number(odometer_km) : null,
        Boolean(odometer_verified),
        provider_id,
        source_type,
        source_reference || null,
        title.trim(),
        public_summary.trim(),
        internal_details ? JSON.stringify(internal_details) : null,
        Boolean(is_public),
      ]
    );

    await logVinAction({
      userId: req.user.id,
      action: 'vehicle.event_added',
      targetVehicleId: req.params.id,
      rawVin: vehicleRes.rows[0].vin_raw,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { eventId: rows[0].id, eventType: event_type, title },
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record vehicle event', message: err.message });
  }
});

/**
 * PATCH /admin/vehicles/:id/specs
 * Overrides or updates canonical vehicle specifications with administrative audit justification.
 */
router.patch('/:id/specs', async (req, res) => {
  const { reason, specs } = req.body;
  if (!reason || !reason.trim() || !specs || typeof specs !== 'object') {
    return res.status(400).json({
      error: 'reason and specs object are required',
      code: 'MISSING_SPECS_OR_REASON',
    });
  }

  const ALLOWED_FIELDS = [
    'make', 'model', 'year', 'trim', 'body_type',
    'engine_displacement_cc', 'engine_cylinders', 'engine_description',
    'fuel_type', 'transmission', 'drivetrain', 'plant_country', 'plant_city',
    'verification_status'
  ];

  const updates = [];
  const params = [req.params.id];

  for (const field of ALLOWED_FIELDS) {
    if (specs[field] !== undefined) {
      params.push(specs[field]);
      updates.push(`${field} = $${params.length}`);
    }
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No valid spec fields provided for update' });
  }

  try {
    const beforeRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (!beforeRes.rows.length) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    const before = beforeRes.rows[0];

    updates.push('updated_at = NOW()');
    const { rows } = await pool.query(
      `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    await logVinAction({
      userId: req.user.id,
      action: 'vehicle.override_spec',
      targetVehicleId: req.params.id,
      rawVin: before.vin_raw,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        reason: reason.trim(),
        changedFields: Object.keys(specs).filter(k => ALLOWED_FIELDS.includes(k)),
        previous: before,
      },
    });

    res.json({ success: true, vehicle: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update vehicle specifications', message: err.message });
  }
});

/**
 * GET /admin/vehicles/registry
 * Paginated browser of canonical vehicles in the registry.
 */
router.get('/registry', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const q = String(req.query.q || '').trim();

  try {
    let where = '';
    const params = [limit, offset];

    if (q) {
      params.push(`%${q.toUpperCase()}%`);
      where = `WHERE v.vin_normalized LIKE $3 OR UPPER(v.make) LIKE $3 OR UPPER(v.model) LIKE $3`;
    }

    const countRes = await pool.query(
      q
        ? `SELECT COUNT(*) FROM vehicles v WHERE v.vin_normalized LIKE $1 OR UPPER(v.make) LIKE $1 OR UPPER(v.model) LIKE $1`
        : 'SELECT COUNT(*) FROM vehicles v',
      q ? [`%${q.toUpperCase()}%`] : []
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const { rows } = await pool.query(
      `SELECT v.id, v.vin_masked, v.vin_type, v.make, v.model, v.year, v.trim,
              v.body_type, v.fuel_type, v.transmission, v.drivetrain,
              v.verification_status, v.confidence_score, v.created_at,
              (SELECT COUNT(*) FROM vehicle_history_events WHERE vehicle_id = v.id) AS event_count,
              (SELECT COUNT(*) FROM vehicle_data_quality_signals WHERE vehicle_id = v.id AND resolved = FALSE) AS active_signals_count,
              (SELECT COUNT(*) FROM cars WHERE vehicle_id = v.id) AS listing_count
         FROM vehicles v
         ${where}
        ORDER BY v.created_at DESC
        LIMIT $1 OFFSET $2`,
      params
    );

    res.json({ items: rows, total, limit, offset });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load vehicles registry', message: err.message });
  }
});

module.exports = router;

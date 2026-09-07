// ─────────────────────────────────────────────────────────────────────────────
// data-providers/sawa-inspection-provider.js
// Internal Sawa Certified Inspection and Odometer Verification Provider.
// ─────────────────────────────────────────────────────────────────────────────

const BaseDataProvider = require('./base-provider');
let pool = null;
try {
  pool = require('../../db');
} catch (_) {
  // Offline or unit test environment without local pg driver
}

class SawaInspectionProvider extends BaseDataProvider {
  constructor() {
    super({
      id: 'sawa_inspection',
      name: 'Sawa Certified 150-Point Inspection Station',
      reliabilityScore: 1.0,
      capabilities: ['inspections', 'odometer', 'history'],
    });
  }

  async fetchByVin(vinContext) {
    const specs = {};
    const events = [];
    const qualityFlags = [];

    if (!vinContext || !vinContext.normalized || !pool) {
      return { specs, events, qualityFlags };
    }

    try {
      const { rows } = await pool.query(
        `SELECT i.id, i.kind, i.status, i.score, i.passed, i.critical_failures,
                i.center, i.scheduled_on, i.started_at, i.completed_at,
                i.vehicle_make, i.vehicle_model, i.vehicle_year, i.vehicle_mileage,
                inspector.name AS inspector_name,
                COALESCE(s.make, i.vehicle_make) AS make,
                COALESCE(s.model, i.vehicle_model) AS model,
                COALESCE(s.year, i.vehicle_year) AS year,
                COALESCE(s.mileage, i.vehicle_mileage) AS mileage
           FROM inspections i
           LEFT JOIN submissions s ON s.id = i.submission_id
           LEFT JOIN users inspector ON inspector.id = i.inspector_id
          WHERE (i.vehicle_vin_key = $1 OR upper(regexp_replace(i.vehicle_vin, '[^A-Z0-9]', '', 'g')) = $1)
            AND i.status = 'complete'
          ORDER BY COALESCE(i.completed_at, i.scheduled_on::timestamptz) ASC`,
        [vinContext.normalized]
      );

      for (const row of rows) {
        if (row.make && !specs.make) specs.make = row.make;
        if (row.model && !specs.model) specs.model = row.model;
        if (row.year && !specs.year) specs.year = parseInt(row.year, 10);

        const odo = parseInt(row.mileage || row.vehicle_mileage, 10);
        const compDate = row.completed_at
          ? new Date(row.completed_at).toISOString().split('T')[0]
          : (row.scheduled_on ? String(row.scheduled_on).slice(0, 10) : new Date().toISOString().split('T')[0]);

        events.push({
          eventType: 'inspection',
          eventDate: compDate,
          eventTimestamp: row.completed_at || null,
          odometerKm: isNaN(odo) ? null : odo,
          odometerVerified: !isNaN(odo) && odo > 0,
          sourceReference: `INSP-${row.id.slice(0, 8)}`,
          title: `150-Point Certified Inspection (${row.score || 0}/100)`,
          publicSummary: `Inspected at Sawa Center (${row.center || 'Kigali'}). Overall score: ${row.score}/100. ${row.passed ? 'Vehicle passed certification standards.' : 'Inspection completed with advisory notes.'}`,
          internalDetails: {
            inspectionId: row.id,
            inspectorName: row.inspector_name,
            criticalFailures: row.critical_failures,
            score: row.score,
          },
          confidence: 1.0,
        });
      }
    } catch (_err) {
      // Database read error or running in standalone test environment without DB
    }

    return { specs, events, qualityFlags };
  }
}

module.exports = SawaInspectionProvider;

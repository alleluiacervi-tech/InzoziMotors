// ─────────────────────────────────────────────────────────────────────────────
// vin-engine/anomaly-detector.js
// Enterprise automotive data quality, odometer rollback & discrepancy detection.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes vehicle timeline events and specifications to detect anomalies.
 * Uses defensible, non-accusatory language ("Potential inconsistency detected"
 * instead of defamatory claims of fraud).
 */
function analyzeVehicleDataQuality({ specs = {}, events = [], qualityFlags = [] }) {
  const detectedSignals = [...qualityFlags];

  // 1. Odometer Sequence & Rollback Analysis
  const odometerEvents = events
    .filter((e) => typeof e.odometerKm === 'number' && e.odometerKm > 0 && e.eventDate)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  for (let i = 1; i < odometerEvents.length; i++) {
    const prev = odometerEvents[i - 1];
    const curr = odometerEvents[i];

    // If a later date has a lower odometer reading
    if (new Date(curr.eventDate) > new Date(prev.eventDate) && curr.odometerKm < prev.odometerKm) {
      const drop = prev.odometerKm - curr.odometerKm;
      detectedSignals.push({
        signalType: 'potential_odometer_rollback',
        severity: 'warning',
        title: 'Potential Mileage Inconsistency Detected',
        publicMessage: `A reading of ${curr.odometerKm.toLocaleString()} km was recorded on ${curr.eventDate} following a prior reading of ${prev.odometerKm.toLocaleString()} km on ${prev.eventDate} (decrease of ${drop.toLocaleString()} km).`,
        internalEvidence: {
          priorEvent: { date: prev.eventDate, km: prev.odometerKm, title: prev.title },
          currentEvent: { date: curr.eventDate, km: curr.odometerKm, title: curr.title },
          decreaseKm: drop,
        },
      });
      curr.hasAnomaly = true;
      curr.anomalyDescription = 'Odometer reading lower than prior recorded checkpoint';
    }
  }

  // 2. Chronological Sequence Validation
  const now = new Date();
  const currentYear = now.getFullYear();

  for (const event of events) {
    if (!event.eventDate) continue;
    const eventYear = new Date(event.eventDate).getFullYear();

    // Event in future
    if (new Date(event.eventDate) > new Date(now.getTime() + 86400000 * 2)) {
      detectedSignals.push({
        signalType: 'future_event_date',
        severity: 'warning',
        title: 'Future Event Date Detected',
        publicMessage: `Event recorded with future date ${event.eventDate}.`,
        internalEvidence: { eventTitle: event.title, date: event.eventDate },
      });
    }

    // Event dated prior to vehicle manufacturing year
    if (specs.year && eventYear < specs.year && event.eventType !== 'manufacturing') {
      detectedSignals.push({
        signalType: 'chronological_discrepancy',
        severity: 'warning',
        title: 'Chronological Discrepancy Detected',
        publicMessage: `Event on ${event.eventDate} predates the vehicle's model year (${specs.year}).`,
        internalEvidence: { eventTitle: event.title, eventYear, modelYear: specs.year },
      });
    }
  }

  // 3. Compute Verification & Confidence Score
  let confidenceScore = 1.0;
  let verificationStatus = 'unverified';

  if (specs.make && specs.model && specs.year) {
    verificationStatus = 'partially_verified';
    confidenceScore = 0.85;
  }

  const hasInspection = events.some((e) => e.eventType === 'inspection' && e.confidence === 1.0);
  if (hasInspection) {
    verificationStatus = 'fully_verified';
    confidenceScore = Math.min(1.0, confidenceScore + 0.15);
  }

  // Deduct for unresolved critical or warning signals
  const warningCount = detectedSignals.filter((s) => s.severity === 'warning').length;
  if (warningCount > 0) {
    confidenceScore = Math.max(0.4, confidenceScore - warningCount * 0.15);
    if (verificationStatus === 'fully_verified') {
      verificationStatus = 'partially_verified';
    }
  }

  return {
    signals: detectedSignals,
    verificationStatus,
    confidenceScore: Number(confidenceScore.toFixed(3)),
    hasAnomalies: detectedSignals.some((s) => s.severity === 'warning' || s.severity === 'critical'),
  };
}

/**
 * Compares administrator entered listing attributes against verified VIN specs.
 * Returns an array of side-by-side discrepancies without overwriting legitimate changes.
 */
function compareListingAgainstVerified(listingInputs = {}, verifiedSpecs = {}) {
  const discrepancies = [];

  const fields = [
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'year', label: 'Year', numeric: true },
    { key: 'fuel_type', label: 'Fuel Type', specKey: 'fuelType' },
    { key: 'transmission', label: 'Transmission' },
    { key: 'body_type', label: 'Body Type', specKey: 'bodyType' },
  ];

  for (const f of fields) {
    const enteredVal = listingInputs[f.key];
    const verifiedVal = verifiedSpecs[f.specKey || f.key];

    if (!enteredVal || !verifiedVal) continue;

    const normalize = (v) => String(v).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const enteredNorm = normalize(enteredVal);
    const verifiedNorm = normalize(verifiedVal);

    if (enteredNorm !== verifiedNorm) {
      // Allow partial match (e.g. "RAV4" inside "RAV4 Limited" or "Corolla" inside "Corolla Fielder")
      const isSubMatch = enteredNorm.includes(verifiedNorm) || verifiedNorm.includes(enteredNorm);
      if (!isSubMatch) {
        discrepancies.push({
          field: f.key,
          label: f.label,
          entered: enteredVal,
          verified: verifiedVal,
          severity: f.key === 'make' || f.key === 'year' ? 'high' : 'medium',
          message: `${f.label} mismatch: entered "${enteredVal}", verified VIN data indicates "${verifiedVal}".`,
        });
      }
    }
  }

  return discrepancies;
}

module.exports = {
  analyzeVehicleDataQuality,
  compareListingAgainstVerified,
};

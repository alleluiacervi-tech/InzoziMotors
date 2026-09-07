// ─────────────────────────────────────────────────────────────────────────────
// data-providers/base-provider.js
// Standard interface for all vehicle data providers.
// ─────────────────────────────────────────────────────────────────────────────

class BaseDataProvider {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique provider identifier
   * @param {string} options.name - Human-readable provider name
   * @param {number} options.reliabilityScore - Default confidence (0.0 to 1.0)
   * @param {string[]} options.capabilities - ['specs', 'history', 'recalls', 'inspections']
   */
  constructor({ id, name, reliabilityScore = 0.8, capabilities = [] }) {
    if (!id || !name) {
      throw new Error('DataProvider must declare id and name');
    }
    this.id = id;
    this.name = name;
    this.reliabilityScore = reliabilityScore;
    this.capabilities = capabilities;
  }

  /**
   * Fetches vehicle data for a given validated identifier.
   * Must return a standardized result object:
   * {
   *   specs: { make, model, year, trim, bodyType, engineCc, cylinders, fuelType, transmission, drivetrain, plantCountry },
   *   events: Array<{ eventType, eventDate, odometerKm, title, publicSummary, internalDetails, confidence }>,
   *   qualityFlags: Array<{ signalType, severity, message, evidence }>
   * }
   *
   * @param {Object} vinContext - Output of validateVehicleIdentifier()
   * @returns {Promise<Object>}
   */
  async fetchByVin(_vinContext) {
    throw new Error(`fetchByVin not implemented on ${this.constructor.name}`);
  }

  /**
   * Safe execution wrapper with timeout and fallback.
   */
  async safeFetch(vinContext, timeoutMs = 4000) {
    try {
      const fetchPromise = this.fetchByVin(vinContext);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${this.name} request timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const result = await Promise.race([fetchPromise, timeoutPromise]);
      return {
        providerId: this.id,
        providerName: this.name,
        success: true,
        data: result || { specs: {}, events: [], qualityFlags: [] },
      };
    } catch (err) {
      return {
        providerId: this.id,
        providerName: this.name,
        success: false,
        error: err.message,
        data: { specs: {}, events: [], qualityFlags: [] },
      };
    }
  }
}

module.exports = BaseDataProvider;

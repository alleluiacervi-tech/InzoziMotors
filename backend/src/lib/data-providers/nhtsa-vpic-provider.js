// ─────────────────────────────────────────────────────────────────────────────
// data-providers/nhtsa-vpic-provider.js
// Official US Government Open Data (NHTSA vPIC) Vehicle Decoding Provider.
// ─────────────────────────────────────────────────────────────────────────────

const https = require('https');
const BaseDataProvider = require('./base-provider');

class NhtsaVpicProvider extends BaseDataProvider {
  constructor() {
    super({
      id: 'nhtsa_vpic',
      name: 'NHTSA vPIC (US Open Vehicle Dataset)',
      reliabilityScore: 0.9,
      capabilities: ['specs', 'recalls'],
    });
  }

  async fetchByVin(vinContext) {
    const specs = {};
    const events = [];
    const qualityFlags = [];

    // NHTSA vPIC only applies to 17-character ISO VINs
    if (!vinContext || vinContext.type !== 'iso') {
      return { specs, events, qualityFlags };
    }

    const vin = vinContext.normalized;
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`;

    try {
      const responseData = await this._httpGet(url, 3000);
      const json = JSON.parse(responseData);
      const row = json.Results && json.Results[0];

      if (!row) {
        return { specs, events, qualityFlags };
      }

      // Check for error code in NHTSA response
      if (row.ErrorCode && row.ErrorCode !== '0' && row.ErrorCode !== '1') {
        qualityFlags.push({
          signalType: 'nhtsa_decoder_warning',
          severity: 'info',
          title: 'NHTSA Data Advisory',
          message: row.ErrorText || 'Partial decode returned by government database',
          evidence: { errorCode: row.ErrorCode, text: row.ErrorText },
        });
      }

      // Map specs
      if (row.Make) specs.make = this._capitalize(row.Make);
      if (row.Model) specs.model = row.Model;
      if (row.ModelYear && /^\d{4}$/.test(row.ModelYear)) specs.year = parseInt(row.ModelYear, 10);
      if (row.Trim) specs.trim = row.Trim;
      if (row.BodyClass) specs.bodyType = row.BodyClass;
      if (row.DisplacementCC) specs.engineCc = parseInt(row.DisplacementCC, 10);
      if (row.EngineCylinders) specs.cylinders = parseInt(row.EngineCylinders, 10);
      if (row.FuelTypePrimary) specs.fuelType = row.FuelTypePrimary;
      if (row.TransmissionStyle) specs.transmission = row.TransmissionStyle;
      if (row.DriveType) specs.drivetrain = row.DriveType;
      if (row.PlantCountry) specs.plantCountry = row.PlantCountry;
      if (row.PlantCity) specs.plantCity = row.PlantCity;

      if (row.EngineModel || row.DisplacementL) {
        specs.engineDescription = `${row.DisplacementL ? `${row.DisplacementL}L ` : ''}${row.EngineModel || ''}`.trim();
      }

      // If year and make found, add factory registration/build event
      if (specs.year && specs.make) {
        events.push({
          eventType: 'manufacturing',
          eventDate: `${specs.year}-01-01`,
          title: 'Factory Specifications Confirmed',
          publicSummary: `Manufacturer specifications registered with NHTSA database: ${specs.year} ${specs.make} ${specs.model || ''}.`,
          internalDetails: { source: 'NHTSA vPIC', row },
          confidence: 0.9,
          odometerKm: 0,
        });
      }
    } catch (_err) {
      // Network failure, timeout, or proxy restriction: fallback gracefully
      qualityFlags.push({
        signalType: 'provider_offline',
        severity: 'info',
        title: 'External Open Data Source Unavailable',
        message: 'Could not connect to external NHTSA open database; used internal local decoding instead.',
        evidence: { provider: this.id },
      });
    }

    return { specs, events, qualityFlags };
  }

  _capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  _httpGet(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: timeoutMs }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('NHTSA request timed out'));
      });

      req.on('error', (err) => reject(err));
    });
  }
}

module.exports = NhtsaVpicProvider;

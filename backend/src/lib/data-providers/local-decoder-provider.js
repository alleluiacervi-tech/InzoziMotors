// ─────────────────────────────────────────────────────────────────────────────
// data-providers/local-decoder-provider.js
// Offline ISO 3779 & JDM algorithmic decoding provider.
// ─────────────────────────────────────────────────────────────────────────────

const BaseDataProvider = require('./base-provider');
const { resolveWmi } = require('../vin-engine/wmi-db');
const { resolveModelYear } = require('../vin-engine/year-codes');
const { decodeJdmChassis } = require('../vin-engine/jdm-chassis');

class LocalDecoderProvider extends BaseDataProvider {
  constructor() {
    super({
      id: 'local_decoder',
      name: 'Local ISO & JDM Decoding Engine',
      reliabilityScore: 0.95,
      capabilities: ['specs', 'manufacturing'],
    });
  }

  async fetchByVin(vinContext) {
    const specs = {};
    const events = [];
    const qualityFlags = [];

    if (!vinContext || !vinContext.valid) {
      return { specs, events, qualityFlags };
    }

    // 1. Handle ISO 17-character VIN
    if (vinContext.type === 'iso') {
      const wmiInfo = resolveWmi(vinContext.wmi);
      if (wmiInfo) {
        if (wmiInfo.make && wmiInfo.make !== 'Unknown') specs.make = wmiInfo.make;
        specs.plantCountry = wmiInfo.country;
        specs.bodyType = wmiInfo.type;
      }

      const year = resolveModelYear(vinContext.normalized[9], vinContext.normalized);
      if (year) {
        specs.year = year;
      }

      // Check digit consistency flag
      if (vinContext.checkDigit && !vinContext.checkDigit.valid) {
        qualityFlags.push({
          signalType: 'check_digit_mismatch',
          severity: 'info',
          title: 'Non-standard check digit',
          message: vinContext.checkDigit.reason,
          evidence: vinContext.checkDigit,
        });
      }

      // Add verified manufacturing event if year & country known
      if (specs.year && specs.plantCountry) {
        events.push({
          eventType: 'manufacturing',
          eventDate: `${specs.year}-01-01`,
          title: 'Vehicle Manufactured',
          publicSummary: `Built by ${specs.make || 'manufacturer'} in ${specs.plantCountry} (Model Year ${specs.year}).`,
          internalDetails: { wmi: vinContext.wmi, checkDigit: vinContext.checkDigit },
          confidence: 0.95,
          odometerKm: 0,
          odometerVerified: true,
        });
      }
    }

    // 2. Handle Japanese Chassis Number
    if (vinContext.type === 'chassis') {
      const jdmInfo = decodeJdmChassis(vinContext.raw);
      if (jdmInfo) {
        if (jdmInfo.make) specs.make = jdmInfo.make;
        if (jdmInfo.model) specs.model = jdmInfo.model;
        if (jdmInfo.engineCc) specs.engineCc = jdmInfo.engineCc;
        if (jdmInfo.fuel) specs.fuelType = jdmInfo.fuel;
        if (jdmInfo.body) specs.bodyType = jdmInfo.body;
        if (jdmInfo.drivetrain) specs.drivetrain = jdmInfo.drivetrain;
        if (jdmInfo.transmission) specs.transmission = jdmInfo.transmission;
        specs.plantCountry = jdmInfo.plantCountry || 'Japan';

        events.push({
          eventType: 'manufacturing',
          eventDate: '2015-01-01', // General timeline marker for JDM chassis
          title: 'Japanese Domestic Market Production',
          publicSummary: `Manufactured in Japan under model chassis designation ${jdmInfo.chassisPrefix}.`,
          internalDetails: { chassisPrefix: jdmInfo.chassisPrefix },
          confidence: 0.9,
          odometerKm: 0,
        });
      }
    }

    return { specs, events, qualityFlags };
  }
}

module.exports = LocalDecoderProvider;

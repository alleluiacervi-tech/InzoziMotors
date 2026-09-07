// ─────────────────────────────────────────────────────────────────────────────
// data-providers/commercial-adapter.js
// Enterprise commercial automotive data provider adapter interface.
// ─────────────────────────────────────────────────────────────────────────────

const BaseDataProvider = require('./base-provider');

class CommercialProviderAdapter extends BaseDataProvider {
  /**
   * @param {Object} options
   * @param {string} options.id - e.g. 'carfax', 'autocheck', 'epicvin', 'rra_customs'
   * @param {string} options.name - Commercial Provider Name
   * @param {string} [options.apiKey] - Licensed API Key from provider
   * @param {string} [options.endpoint] - Licensed REST endpoint
   * @param {number} [options.quotaPerDay] - Daily call cap to prevent billing surprises
   */
  constructor(options = {}) {
    super({
      id: options.id || 'commercial_provider',
      name: options.name || 'Commercial Vehicle Data Partner',
      reliabilityScore: 0.95,
      capabilities: ['specs', 'history', 'recalls', 'accidents', 'title_salvage'],
    });

    this.apiKey = options.apiKey || process.env[`COMMERCIAL_API_KEY_${(options.id || '').toUpperCase()}`] || null;
    this.endpoint = options.endpoint || null;
    this.quotaPerDay = options.quotaPerDay || 1000;
  }

  /**
   * Evaluates whether commercial credentials and endpoints are configured.
   */
  isConfigured() {
    return Boolean(this.apiKey && this.endpoint);
  }

  async fetchByVin(vinContext) {
    const specs = {};
    const events = [];
    const qualityFlags = [];

    // If no commercial contract / API key configured, report status gracefully
    if (!this.isConfigured()) {
      qualityFlags.push({
        signalType: 'commercial_adapter_standby',
        severity: 'info',
        title: `${this.name} in Standby`,
        message: `${this.name} connector is ready. Configure API credentials in environment to activate commercial feed.`,
        evidence: { adapterId: this.id, configured: false },
      });
      return { specs, events, qualityFlags };
    }

    // In a live commercial integration, execute authenticated HTTP request here:
    // const res = await fetch(`${this.endpoint}?vin=${vinContext.normalized}`, {
    //   headers: { Authorization: `Bearer ${this.apiKey}` }
    // });
    return { specs, events, qualityFlags };
  }
}

module.exports = CommercialProviderAdapter;

/** The origins the backend accepts for an import enquiry (routes/imports.js
 *  ORIGINS), in the order the form offers them. */
export const IMPORT_ORIGINS = ['Japan', 'South Korea', 'China', 'United Arab Emirates', 'Europe', 'Other'] as const
export type ImportOrigin = (typeof IMPORT_ORIGINS)[number]

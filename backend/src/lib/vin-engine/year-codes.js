// ─────────────────────────────────────────────────────────────────────────────
// vin-engine/year-codes.js
// ISO 3779 10th character Model Year resolution (1980 - 2039).
// ─────────────────────────────────────────────────────────────────────────────

const YEAR_CYCLE = [
  { code: 'A', year1: 1980, year2: 2010 },
  { code: 'B', year1: 1981, year2: 2011 },
  { code: 'C', year1: 1982, year2: 2012 },
  { code: 'D', year1: 1983, year2: 2013 },
  { code: 'E', year1: 1984, year2: 2014 },
  { code: 'F', year1: 1985, year2: 2015 },
  { code: 'G', year1: 1986, year2: 2016 },
  { code: 'H', year1: 1987, year2: 2017 },
  { code: 'J', year1: 1988, year2: 2018 },
  { code: 'K', year1: 1989, year2: 2019 },
  { code: 'L', year1: 1990, year2: 2020 },
  { code: 'M', year1: 1991, year2: 2021 },
  { code: 'N', year1: 1992, year2: 2022 },
  { code: 'P', year1: 1993, year2: 2023 },
  { code: 'R', year1: 1994, year2: 2024 },
  { code: 'S', year1: 1995, year2: 2025 },
  { code: 'T', year1: 1996, year2: 2026 },
  { code: 'V', year1: 1997, year2: 2027 },
  { code: 'W', year1: 1998, year2: 2028 },
  { code: 'X', year1: 1999, year2: 2029 },
  { code: 'Y', year1: 2000, year2: 2030 },
  { code: '1', year1: 2001, year2: 2031 },
  { code: '2', year1: 2002, year2: 2032 },
  { code: '3', year1: 2003, year2: 2033 },
  { code: '4', year1: 2004, year2: 2034 },
  { code: '5', year1: 2005, year2: 2035 },
  { code: '6', year1: 2006, year2: 2036 },
  { code: '7', year1: 2007, year2: 2037 },
  { code: '8', year1: 2008, year2: 2038 },
  { code: '9', year1: 2009, year2: 2039 },
];

const CODE_MAP = new Map(YEAR_CYCLE.map((entry) => [entry.code, entry]));

/**
 * Resolves the 10th character into a model year.
 * When vin17 is provided, position 7 is evaluated:
 * In modern vehicles (2010+), position 7 is usually alphabetic.
 * In older vehicles (1980-2009), position 7 is usually numeric.
 */
function resolveModelYear(char10, vin17 = null) {
  if (!char10) return null;
  const upper = String(char10).toUpperCase();
  const entry = CODE_MAP.get(upper);
  if (!entry) return null;

  if (vin17 && vin17.length === 17) {
    const char7 = vin17[6];
    const isChar7Numeric = /[0-9]/.test(char7);
    // If char 7 is numeric, it is typically in cycle 1 (1980-2009)
    // If char 7 is alphabetic, it is in cycle 2 (2010-2039)
    if (isChar7Numeric && entry.year1 >= 1980 && entry.year1 <= 2009) {
      return entry.year1;
    }
  }

  // By default, modern platforms assume modern year (year2: 2010+)
  return entry.year2;
}

module.exports = {
  resolveModelYear,
  YEAR_CYCLE,
};

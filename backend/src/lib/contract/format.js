// Formatting for the contract. Every function here is deterministic and
// locale-pinned: a contract regenerated from its own snapshot must produce
// byte-identical output, so nothing may depend on server locale or timezone.

const CURRENCIES = {
  // RWF has no subunit in practice — the franc is not divided in circulation,
  // so minor units are whole francs and there are no decimals to print.
  RWF: { minorPerMajor: 1, symbol: 'RWF', majorWord: 'Rwandan franc', majorWordPlural: 'Rwandan francs', minorWord: null },
  USD: { minorPerMajor: 100, symbol: 'USD', majorWord: 'US dollar', majorWordPlural: 'US dollars', minorWord: 'cent' },
};

function currencyInfo(code) {
  const c = CURRENCIES[code];
  if (!c) throw new Error(`Unsupported contract currency: ${code}`);
  return c;
}

/** 24500000 RWF -> "RWF 24,500,000"; 2450050 USD -> "USD 24,500.50" */
function formatMoney(minor, code) {
  const c = currencyInfo(code);
  const n = Number(minor);
  if (!Number.isFinite(n)) return '—';
  if (c.minorPerMajor === 1) {
    return `${c.symbol} ${Math.round(n).toLocaleString('en-US')}`;
  }
  const major = Math.floor(n / c.minorPerMajor);
  const rest = Math.round(n % c.minorPerMajor);
  return `${c.symbol} ${major.toLocaleString('en-US')}.${String(rest).padStart(2, '0')}`;
}

// ─── numbers in words ────────────────────────────────────────────────────────
// A sale agreement states the price in words as well as figures: it is the
// long-standing guard against a digit being altered after signing.

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];

function underThousand(n) {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10), r = n % 10;
    return TENS[t] + (r ? `-${ONES[r]}` : '');
  }
  const h = Math.floor(n / 100), r = n % 100;
  return `${ONES[h]} hundred${r ? ` and ${underThousand(r)}` : ''}`;
}

function integerToWords(n) {
  n = Math.floor(Math.abs(Number(n)));
  if (!Number.isFinite(n)) return '';
  if (n === 0) return 'zero';
  if (n >= 1e15) return String(n); // beyond any plausible vehicle price
  const parts = [];
  let rest = n;
  for (const [value, name] of SCALES) {
    if (rest >= value) {
      const count = Math.floor(rest / value);
      parts.push(`${integerToWords(count)} ${name}`);
      rest %= value;
    }
  }
  if (rest > 0) {
    // "and" joins only a final group below one hundred — "one thousand and five",
    // but "twenty-four thousand five hundred". Getting this wrong is the classic
    // amount-in-words tell.
    const needsAnd = parts.length > 0 && rest < 100;
    parts.push(needsAnd ? `and ${underThousand(rest)}` : underThousand(rest));
  }
  return parts.join(' ');
}

function capitalise(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

/** 24500000 RWF -> "Twenty-four million five hundred thousand Rwandan francs only" */
function moneyInWords(minor, code) {
  const c = currencyInfo(code);
  const n = Number(minor);
  if (!Number.isFinite(n)) return '—';
  const major = Math.floor(n / c.minorPerMajor);
  const rest = Math.round(n % c.minorPerMajor);
  const unit = major === 1 ? c.majorWord : c.majorWordPlural;
  let out = `${integerToWords(major)} ${unit}`;
  if (rest > 0 && c.minorWord) {
    out += ` and ${integerToWords(rest)} ${rest === 1 ? c.minorWord : `${c.minorWord}s`}`;
  }
  return `${capitalise(out)} only`;
}

// ─── dates ───────────────────────────────────────────────────────────────────
// Formatted from the date parts in UTC so the printed day can never shift with
// server timezone — a contract date that moves is a contract dispute.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** '2026-08-12' -> '12 August 2026' */
function formatLongDate(value) {
  if (!value) return '—';
  const s = String(value).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return String(value);
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1];
  if (!month) return s;
  return `${Number(d)} ${month} ${y}`;
}

/** A Date or ISO timestamp -> 'YYYY-MM-DD' in UTC. */
function toDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

module.exports = {
  formatMoney, moneyInWords, integerToWords, formatLongDate, toDateOnly, currencyInfo, CURRENCIES,
};

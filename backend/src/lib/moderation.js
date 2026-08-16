// Conservative first-line screening for the two public UGC surfaces. This is
// intentionally small: ambiguous language is sent to the existing report and
// moderator workflow rather than silently censored.
const HIGH_RISK_PATTERNS = [
  /\b(?:child\s*(?:porn|sexual|sex)|sexual(?:ly)?\s*exploit(?:ation|ing)\s*(?:of\s*)?(?:a\s*)?(?:child|minor))\b/i,
  /\b(?:i(?:'m| am) going to kill you|i(?:'ll| will) kill you|threaten(?:ing)? to kill)\b/i,
];

function screenUserText(value, maxLength) {
  const text = String(value ?? '').trim();
  if (!text) return { ok: false, error: 'Text is required.' };
  if (text.length > maxLength) {
    return { ok: false, error: `Text must be ${maxLength} characters or fewer.` };
  }
  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      ok: false,
      error: 'This content cannot be posted. Please contact support if you think this is an error.',
      code: 'CONTENT_REJECTED',
    };
  }
  return { ok: true, text };
}

module.exports = { screenUserText };

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import { formatPrice } from '../data/cars';
import { formatUsdApprox, usdFromRwf } from '../data/marketData';

// ─────────────────────────────────────────────────────────────────────────────
// The ONE place a price becomes two currencies in the app.
//
// Mirrors web/src/components/Price.tsx deliberately, down to the rounding and
// the "≈": a buyer who sees one dollar figure here and a different one on the
// website for the same car stops believing both.
//
// The franc figure is the PRICE — what the seller asked for, what the database
// stores. The dollar figure is a courtesy for the diaspora and for importers,
// marked approximate every single time, because Sawa is not a party to any
// sale and nobody should read the second line as an amount a seller agreed to.
//
// It reads the rate from context, NOT from marketData's RWF_RATE binding. That
// is the whole point: a module variable cannot re-render a screen, so the rate
// was being fetched and cached for months while no price in the app followed
// it. Reading it from context means a refreshed rate repaints every price.
// ─────────────────────────────────────────────────────────────────────────────

export default function Price({ amountRwf, size = 'card', align = 'left', style }) {
  const { fx, t } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const usd = usdFromRwf(amountRwf, fx?.rate);
  const formattedUsd = usd != null ? formatUsdApprox(usd) : '';
  const approxLabel = t ? t('price.approxUsdLabel', { usd: formattedUsd }) : `approximately ${formattedUsd} at today's exchange rate`;
  const staleLabel = t ? t('price.rateMayBeOutOfDate') : '  rate may be out of date';

  return (
    <View style={[align === 'right' && styles.right, style]}>
      <Text style={size === 'detail' ? styles.priceDetail : styles.price}>
        {formatPrice(amountRwf)}
      </Text>
      {usd == null ? null : (
        <Text
          style={size === 'detail' ? styles.usdDetail : styles.usd}
          // Says the quiet part out loud for a screen reader: this is an
          // approximation at today's rate, not a second price.
          accessibilityLabel={approxLabel}
        >
          {`≈ ${formattedUsd}`}
          {fx?.stale ? <Text style={styles.staleMark}>{staleLabel}</Text> : null}
        </Text>
      )}
    </View>
  );
}

/**
 * Where the dollar figures come from, in one line.
 *
 * A converted number without its provenance is exactly how the old hardcoded
 * 1300 drifted twelve percent from reality with nobody noticing. If the app is
 * going to print dollars, it has to be able to say which rate and when.
 */
export function RateNote({ style }) {
  const { fx, t } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!fx?.rate) return null;

  const stamp = fx.fetched_at
    ? new Date(fx.fetched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'unknown';

  const intro = t ? t('price.rateNoteIntro') : 'Dollar figures are approximate, at';
  const updatedText = t ? t('price.rateNoteUpdated', { stamp }) : `(updated ${stamp})`;
  const staleText = t ? t('price.rateNoteStale', { stamp }) : `(last confirmed ${stamp}; the rate service is unreachable)`;
  const agreedInRwf = t ? t('price.rateNoteAgreedInRwf') : '. Prices are set and agreed in Rwandan francs.';

  return (
    <Text style={[styles.note, style]}>
      {`${intro} 1 USD = ${Math.round(fx.rate).toLocaleString('en-RW')} RWF `}
      {fx.stale
        ? <Text style={styles.staleMark}>{staleText}</Text>
        : updatedText}
      {agreedInRwf}
    </Text>
  );
}

// A function of the live theme, not a module-level constant: StyleSheet.create
// would otherwise bake in whichever palette was active the first time this
// module loaded, and every price in the app would stay that colour forever.
function makeStyles(colors) {
  return StyleSheet.create({
    right: { alignItems: 'flex-end' },
    price: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: colors.primary,
      fontFamily: fonts?.bold,
      fontVariant: ['tabular-nums'],
    },
    priceDetail: {
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: colors.primary,
      fontFamily: fonts?.bold,
      fontVariant: ['tabular-nums'],
    },
    usd: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    usdDetail: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    staleMark: { color: colors.amberText },
    note: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
  });
}

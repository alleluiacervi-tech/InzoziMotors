import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';
import { RWF_RATE, formatRWF, calcRwandaDuty } from '../data/marketData';
import { transformCloudinaryUrl } from '../utils/photo';
import BrandMark from './BrandMark';
import { useApp } from '../context/AppContext';
import Touchable from './Touchable';

// One import-catalogue model, as a compact row.
//
// This was a full-width card with a 180pt picture area — and most models have
// no photograph, so it was mostly an empty grey box with a small logo and
// "Photos on request", about 330pt tall per model. A row says the same things
// (the marque, the model, what kind of car, where it ships from, the price
// when there is one) in about 88pt, so a list of them can actually be scanned.

const COUNTRY_FLAGS = {
  'South Korea': '🇰🇷',
  'China': '🇨🇳',
  'United Arab Emirates': '🇦🇪',
  'Japan': '🇯🇵',
};

function ImportCarCard({ item, onPress }) {
  const { brandLogo, t } = useApp();
  const flag = COUNTRY_FLAGS[item.originCountry] || '🌐';

  // A landed cost only when there is a price to land — never an invented
  // $15,000 run through the duty maths (see ImportVehicleDetailScreen).
  const fobUsd = Number(item.typicalFobUsd) > 0 ? Number(item.typicalFobUsd) : null;
  const freightUsd = Number(item.typicalFreightUsd) > 0 ? Number(item.typicalFreightUsd) : null;
  const landed = fobUsd && freightUsd && item.engineCc ? (() => {
    const vehicleValueRwf = fobUsd * RWF_RATE;
    const duty = calcRwandaDuty(vehicleValueRwf, item.engineCc, 0); // brand new: no age band
    return (duty ? duty.grandTotal : vehicleValueRwf) + freightUsd * RWF_RATE;
  })() : null;

  // The operator's own photograph of the unit, then the resolved studio
  // render, then the marque — a picture of a different car would be a claim
  // about what the buyer is getting.
  const mainImage = (Array.isArray(item.images) && item.images[0]) || item.renderUrl || null;
  const thumb = mainImage ? transformCloudinaryUrl(mainImage, { width: 320 }) : null;

  const specs = [
    item.bodyType,
    item.engineCc ? `${(item.engineCc / 1000).toFixed(1)}L` : null,
    ...(item.fuelTypes || []).slice(0, 2),
  ].filter(Boolean).join(' · ');

  return (
    <Touchable
      scaleTo={0.985}
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.make} ${item.model}, ${item.originCountry}`}
    >
      <View style={styles.thumb}>
        {thumb ? (
          // Contained on white: official cut-outs and studio images are shot
          // on white, and cropping one to a square cuts the car's ends off.
          <ExpoImage source={{ uri: thumb }} style={styles.thumbImage} contentFit="contain" transition={150} />
        ) : (
          <BrandMark name={item.make} logoUrl={brandLogo(item.make)} size={40} />
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{item.make} {item.model}</Text>
        {specs || item.trim ? (
          <Text style={styles.meta} numberOfLines={1}>{item.trim ? `${item.trim} · ${specs}` : specs}</Text>
        ) : null}
        {/* "Brand new" is the scope's premise and is said once above the
            list; each row only needs where it ships from. */}
        <Text style={styles.origin} numberOfLines={1}>{flag} {item.originCountry}</Text>
      </View>

      <View style={styles.end}>
        <View style={styles.priceCol}>
          {landed ? (
            <>
              <Text style={styles.priceLabel}>{t('browse.estLanded')}</Text>
              <Text style={styles.price} numberOfLines={1}>{formatRWF(landed)}</Text>
            </>
          ) : (
            <Text style={styles.onRequest} numberOfLines={2}>{t('browse.onRequest')}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Touchable>
  );
}

export default memo(ImportCarCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 10,
    marginBottom: 10,
  },
  thumb: {
    width: 84,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.textPrimary, letterSpacing: -0.2 },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  origin: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  end: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceCol: { alignItems: 'flex-end', gap: 1, maxWidth: 96 },
  priceLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted },
  price: { fontFamily: fonts.extraBold, fontSize: 13.5, color: colors.primary, fontVariant: ['tabular-nums'] },
  onRequest: { fontFamily: fonts.semiBold, fontSize: 11.5, lineHeight: 15, color: colors.textMuted, textAlign: 'right', maxWidth: 72 },
});

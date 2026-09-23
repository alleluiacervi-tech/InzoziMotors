import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, fonts } from '../theme';
import { RWF_RATE, formatRWF, calcRwandaDuty } from '../data/marketData';
import { transformCloudinaryUrl } from '../utils/photo';
import BrandMark from './BrandMark';
import { useApp } from '../context/AppContext';
import Touchable from './Touchable';

const COUNTRY_FLAGS = {
  'South Korea': '🇰🇷',
  'China': '🇨🇳',
  'United Arab Emirates': '🇦🇪',
  'Japan': '🇯🇵',
};

export default function ImportCarCard({ item, onPress }) {
  const { brandLogo } = useApp();
  const flag = COUNTRY_FLAGS[item.originCountry] || '🌐';

  // A landed cost only when there is a price to land.
  //
  // This read `(item.typicalFobUsd || 15000)`, so a model with no price was
  // given an invented $15,000, run through the RRA duty calculation, and
  // captioned "Est. Landed in Kigali (Taxes Included)" — the most confident
  // possible presentation of a number nobody had quoted.
  const fobUsd = Number(item.typicalFobUsd) > 0 ? Number(item.typicalFobUsd) : null;
  const freightUsd = Number(item.typicalFreightUsd) > 0 ? Number(item.typicalFreightUsd) : null;
  const landed = fobUsd && freightUsd && item.engineCc ? (() => {
    const vehicleValueRwf = fobUsd * RWF_RATE;
    const duty = calcRwandaDuty(vehicleValueRwf, item.engineCc, 0); // brand new: no age band
    const rwf = (duty ? duty.grandTotal : vehicleValueRwf) + freightUsd * RWF_RATE;
    return { rwf, usd: Math.round(rwf / RWF_RATE) };
  })() : null;

  // An operator's own photograph of the actual unit first — it is the better
  // picture and somebody went to the trouble of taking it. Then the resolved
  // studio render. Then nothing: a picture of a different car is a claim about
  // what the buyer is getting, so BrandMark draws the marque instead.
  const mainImage = (Array.isArray(item.images) && item.images[0]) || item.renderUrl || null;
  const optimizedImage = mainImage ? transformCloudinaryUrl(mainImage, { width: 640 }) : null;

  return (
    <Touchable
      scaleTo={0.985}
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Import ${item.make} ${item.model}`}
    >
      {/* Image container */}
      <View style={styles.imageContainer}>
        {optimizedImage ? (
          <ExpoImage
            source={{ uri: optimizedImage }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.imageFallback}>
            <BrandMark name={item.make} logoUrl={brandLogo(item.make)} size={48} />
            <Text style={styles.imageFallbackText}>Photos on request</Text>
          </View>
        )}
        {/* Origin Hub Badge */}
        <View style={styles.originBadge}>
          <Text style={styles.originBadgeText}>
            {flag} {item.originCountry}
          </Text>
        </View>

        {/* Brand new, which is the whole proposition — not a guarantee claim. */}
        <View style={styles.conditionBadge}>
          <Ionicons name="sparkles-outline" size={11} color={colors.greenText} />
          <Text style={styles.conditionBadgeText}>Brand new · 0 km</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {item.make} {item.model}
            </Text>
            {item.trim ? (
              <Text style={styles.trim} numberOfLines={1}>
                {item.trim}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Specs Pill Row */}
        <View style={styles.specsRow}>
          {item.bodyType ? (
            <View style={styles.specPill}>
              <Text style={styles.specText}>{item.bodyType}</Text>
            </View>
          ) : null}
          {item.engineCc ? (
            <View style={styles.specPill}>
              <Text style={styles.specText}>{`${(item.engineCc / 1000).toFixed(1)}L`}</Text>
            </View>
          ) : null}
          {(item.fuelTypes || []).map((fuel) => (
            <View key={fuel} style={styles.specPill}>
              <Text style={styles.specText}>{fuel}</Text>
            </View>
          ))}
        </View>

        {/* Price & Transit Breakdown */}
        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.priceLabel}>
              {landed ? 'Est. landed in Kigali (taxes included)' : 'Price'}
            </Text>
            <View style={styles.priceRow}>
              {landed ? (
                <>
                  <Text style={styles.priceRwf}>{formatRWF(landed.rwf)}</Text>
                  <Text style={styles.priceUsd}>~${landed.usd.toLocaleString('en-US')}</Text>
                </>
              ) : (
                <Text style={styles.priceOnRequest}>On request</Text>
              )}
            </View>
          </View>

          <View style={styles.transitBadge}>
            <Ionicons name="boat-outline" size={13} color={colors.infoText} />
            <Text style={styles.transitText}>{item.estimatedTransitDays || 35}d transit</Text>
          </View>
        </View>

        {/* Action button */}
        <View style={styles.actionRow}>
          <Text style={styles.actionText}>{landed ? 'View cost breakdown' : 'Request details'}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surfaceAlt },
  imageFallbackText: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },
  priceOnRequest: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary, letterSpacing: -0.3 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 16,
    ...shadows.card,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  originBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(23, 18, 15, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  originBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  conditionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.greenTint,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  conditionBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: colors.greenText,
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  trim: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  specPill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  specText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  priceContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 3,
  },
  priceRwf: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.primary,
  },
  priceUsd: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  transitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.blueTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  transitText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.infoText,
  },
  actionRow: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primary,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, fonts } from '../theme';
import { RWF_RATE, formatRWF, calcRwandaDuty } from '../data/marketData';
import { transformCloudinaryUrl } from '../utils/photo';

const COUNTRY_FLAGS = {
  'South Korea': '🇰🇷',
  'China': '🇨🇳',
  'United Arab Emirates': '🇦🇪',
  'Japan': '🇯🇵',
};

export default function ImportCarCard({ item, onPress }) {
  const flag = COUNTRY_FLAGS[item.originCountry] || '🌐';
  
  // Calculate estimated landed cost
  const vehicleValueRwf = (item.typicalFobUsd || 15000) * RWF_RATE;
  const freightRwf = (item.typicalFreightUsd || 2800) * RWF_RATE;
  const ageYears = Math.max(0, new Date().getFullYear() - (item.yearEnd || 2022));
  const duty = calcRwandaDuty(vehicleValueRwf, item.engineCc || 2000, ageYears);
  const estimatedLandedRwf = (duty ? duty.grandTotal : vehicleValueRwf) + freightRwf;
  const estimatedLandedUsd = Math.round(estimatedLandedRwf / RWF_RATE);

  const mainImage = (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80';
  const optimizedImage = transformCloudinaryUrl(mainImage, { width: 640 });

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Import ${item.make} ${item.model}`}
    >
      {/* Image container */}
      <View style={styles.imageContainer}>
        <ExpoImage
          source={{ uri: optimizedImage }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        {/* Origin Hub Badge */}
        <View style={styles.originBadge}>
          <Text style={styles.originBadgeText}>
            {flag} {item.originCountry}
          </Text>
        </View>

        {/* Escrow Tag */}
        <View style={styles.escrowBadge}>
          <Ionicons name="shield-checkmark" size={11} color="#166534" />
          <Text style={styles.escrowBadgeText}>Bank Escrow</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {item.yearStart && item.yearEnd ? `${item.yearStart}–${item.yearEnd} ` : ''}{item.make} {item.model}
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
          <View style={styles.specPill}>
            <Text style={styles.specText}>{item.engineCc ? `${(item.engineCc / 1000).toFixed(1)}L` : 'EV'}</Text>
          </View>
          <View style={styles.specPill}>
            <Text style={styles.specText}>{item.fuelType}</Text>
          </View>
          <View style={styles.specPill}>
            <Text style={styles.specText}>{item.transmission}</Text>
          </View>
          <View style={styles.specPill}>
            <Text style={styles.specText}>{item.driveSide || 'LHD'}</Text>
          </View>
        </View>

        {/* Price & Transit Breakdown */}
        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.priceLabel}>Est. Landed in Kigali (Taxes Included)</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceRwf}>{formatRWF(estimatedLandedRwf)}</Text>
              <Text style={styles.priceUsd}>~${estimatedLandedUsd.toLocaleString('en-US')}</Text>
            </View>
          </View>

          <View style={styles.transitBadge}>
            <Ionicons name="boat-outline" size={13} color="#1D4ED8" />
            <Text style={styles.transitText}>{item.estimatedTransitDays || 35}d transit</Text>
          </View>
        </View>

        {/* Action button */}
        <View style={styles.actionRow}>
          <Text style={styles.actionText}>View Cost Breakdown & Sourcing Quote</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  escrowBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  escrowBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: '#166534',
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
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  transitText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#1D4ED8',
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

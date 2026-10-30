import React, { useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, shadows, spacing, typography, iconSize } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import Badge from './Badge';
import Svg, { Circle } from 'react-native-svg';
import { formatPrice } from '../data/cars';
import Price from './Price';
import { PHOTO } from '../utils/photo';
import Photo from './Photo';
import Touchable from './Touchable';
import AppText from './AppText';
import BrandMark from './BrandMark';

const getSawaMileage = (car) => `${(car.mileage ?? 0).toLocaleString('en-US')} km`;

const getSawaLocation = (car) => {
  const loc = car.location || '';
  if (loc.includes('Nyarutarama')) return 'Nyarutarama';
  if (loc.includes('Kiyovu')) return 'Kiyovu';
  if (loc.includes('Kanombe')) return 'Kanombe';
  if (loc.includes('Kimihurura')) return 'Kimihurura';
  if (loc.includes('Remera')) return 'Remera';
  return 'Kigali';
};

const getSawaPrice = (car) => formatPrice(car.price ?? car.currentBid ?? 0);

export default function CarCard({ car, onPress, hideOverlay = false, rank = null }) {
  const { isCarSaved, toggleSaveCar, brandLogo, t } = useApp();
  const [photoFailed, setPhotoFailed] = useState(false);
  const hasPhoto = Boolean(car.image) && !photoFailed;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const saved = isCarSaved(car.id);
  const isContract = car.type === 'auction';
  const isRental = car.listingType === 'rental';
  // One trust signal per card: the inspection score, on the photo. Sale cars
  // only; a rental's evidence is the Rental Check, never a "certified" badge.
  const score = !isRental && car.inspectionScore ? Number(car.inspectionScore) : null;
  // Future-dated and unparsed-safe: a bad or past value must never render.
  // Informational only — the provider set this, it never hides the car or
  // blocks an inquiry. See backend migration 0037.
  const unavailableDate = isRental && car.unavailableUntil ? new Date(car.unavailableUntil) : null;
  const unavailableUntil =
    unavailableDate && !Number.isNaN(unavailableDate.getTime()) && unavailableDate.getTime() > Date.now()
      ? unavailableDate
      : null;

  return (
    <Touchable
      scaleTo={0.985}
      style={({ pressed }) => [styles.card, shadows.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${car.title}, ${getSawaPrice(car)}`}
    >
      <View style={styles.imageWrap}>
        {hasPhoto ? (
          <Photo uri={car.image} width={PHOTO.CARD} style={styles.image} resizeMode="cover" onError={() => setPhotoFailed(true)} />
        ) : (
          // No photo yet: the make's mark and a plain word, never a blank box.
          <View style={styles.noPhoto}>
            <BrandMark name={car.make} logoUrl={brandLogo(car.make)} size={36} />
            <Text style={styles.noPhotoText}>{t('home.photosComing')}</Text>
          </View>
        )}

        {!hideOverlay && (
          <>
            {score ? (
              <View style={styles.scorePill} accessibilityLabel={t('home.inspected', { score })}>
                <ScoreDial score={score} colors={colors} />
                <AppText style={styles.scorePillText} maxFontSizeMultiplier={1.2}>{score}/150</AppText>
              </View>
            ) : isContract ? (
              <Badge variant="contract" label="In Contract" style={styles.topLeft} />
            ) : null}

            <Touchable
              scaleTo={0.88}
              haptic="selection"
              style={({ pressed }) => [styles.heart, pressed && styles.heartPressed]}
              onPress={() => toggleSaveCar(car.id)}
              hitSlop={10}
              accessibilityRole="button"
              // Names the car, because a list of hearts is otherwise a list of
              // identical unlabelled buttons.
              accessibilityLabel={t(saved ? 'home.removeSaved' : 'home.saveCar', { title: car.title })}
              accessibilityState={{ selected: saved }}
            >
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={iconSize.md}
                color={saved ? colors.primary : colors.textSecondary}
              />
            </Touchable>
          </>
        )}

        {rank !== null && (
          <View style={styles.rankBadge}>
            <AppText style={styles.rankText} maxFontSizeMultiplier={1.2}>{rank}</AppText>
          </View>
        )}

        {unavailableUntil && (
          <View style={styles.unavailableBadge}>
            <Ionicons name="time-outline" size={11} color={colors.white} />
            <AppText style={styles.unavailableBadgeText} maxFontSizeMultiplier={1.2} numberOfLines={1}>
              {t('home.unavailableUntil', { date: unavailableUntil.toLocaleDateString() })}
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{car.title}</Text>
        {isRental ? (
          <>
            <Text style={styles.meta} numberOfLines={1}>
              {car.seats} {t('home.seats')} · {car.transmission}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>{getSawaLocation(car)}</Text>
            <View style={styles.rentalPriceRow}>
              <Text style={styles.price}>{formatPrice(car.dailyRate || 0)}</Text>
              <Text style={styles.perDay}>{t('home.perDay')}</Text>
            </View>
          </>
        ) : (
          <>
            {/* The year is in the title, so the meta line starts with what the
                title does not say. The score lives on the photo. */}
            <Text style={styles.meta} numberOfLines={1}>
              {[getSawaMileage(car), getSawaLocation(car), car.fuel].filter(Boolean).join(' · ')}
            </Text>
            <Price amountRwf={car.price ?? car.currentBid ?? 0} />
          </>
        )}
      </View>
    </Touchable>
  );
}

/** A small ring filled to the share of 150 points the car scored. */
function ScoreDial({ score, colors }) {
  const r = 6.5;
  const c = 2 * Math.PI * r;
  const share = Math.max(0, Math.min(1, score / 150));
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Circle cx={8} cy={8} r={r} stroke={colors.border} strokeWidth={2.5} fill="none" />
      <Circle
        cx={8} cy={8} r={r} stroke={colors.green} strokeWidth={2.5} fill="none"
        strokeDasharray={`${c * share} ${c}`} strokeLinecap="round" transform="rotate(-90 8 8)"
      />
    </Svg>
  );
}

// A function of the live theme — see the same note in Price.js.
function makeStyles(colors) {
    return StyleSheet.create({
    card: {
      flex: 1,
      margin: spacing.xs + 2,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    // Scale now comes from Touchable's spring.
    cardPressed: { opacity: 0.94 },
    imageWrap: {
      aspectRatio: 4 / 3,
      backgroundColor: colors.surfaceAlt,
      position: 'relative',
    },
    image: { width: '100%', height: '100%' },

    // Every overlay sits on the same inset. These were 6, 7 and 6 — one pixel
    // apart, which reads as misalignment rather than as a decision.
    topLeft: { position: 'absolute', top: spacing.sm, left: spacing.sm, paddingHorizontal: 6, paddingVertical: 2 },
    scorePill: {
      position: 'absolute', top: spacing.sm, left: spacing.sm,
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.95)',
      paddingLeft: 5, paddingRight: 9, paddingVertical: 4,
      borderRadius: radius.pill,
    },
    scorePillText: { ...typography.badge, fontVariant: ['tabular-nums'], color: '#14110F' },
    noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    noPhotoText: { ...typography.cardMeta, color: colors.textMuted },
    heart: {
      position: 'absolute', top: spacing.sm, right: spacing.sm,
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: 'center', justifyContent: 'center',
      zIndex: 10,
    },
    // Scale now comes from Touchable's spring.
    heartPressed: { opacity: 0.76 },
    rankBadge: {
      position: 'absolute', bottom: 0, left: 0,
      backgroundColor: colors.scrimStrong,
      width: 28, height: 28,
      alignItems: 'center', justifyContent: 'center',
    },
    rankText: { ...typography.badge, color: colors.white },
    unavailableBadge: {
      position: 'absolute', bottom: spacing.sm, right: spacing.sm, maxWidth: '70%',
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.scrim,
      paddingHorizontal: spacing.sm, paddingVertical: 3,
      borderRadius: radius.sm,
    },
    // Was 9.5px. Nothing in this product should render under 11.
    unavailableBadgeText: { ...typography.badge, color: colors.white },

    body: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flex: 1, gap: 3 },
    title: { ...typography.cardTitle, minHeight: 38, color: colors.textPrimary },
    meta: { ...typography.cardMeta, color: colors.textMuted },
    price: { ...typography.cardPrice, color: colors.accentText, marginTop: spacing.xs },
    rentalPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
    perDay: { ...typography.cardMeta, color: colors.textMuted, marginLeft: 3 },
    });
}

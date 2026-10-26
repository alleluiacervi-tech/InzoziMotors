import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// expo-image's ImageBackground, for the same disk cache the cards use.
import { ImageBackground } from 'expo-image';
import { colors, fonts } from '../theme';
import { photoSource, PHOTO } from '../utils/photo';
import { formatPrice, formatMiles } from '../data/cars';

/**
 * One placement from GET /cars/featured, used by the home rail and the
 * "See all" list so the two can never disagree.
 *
 * What the card says, and why each part is there:
 *   - the label comes from the server's `label`, never from `kind`. "Sponsored"
 *     is a disclosure and is always shown. "Hot deal" is only sent when the
 *     price really fell, and "Featured" needs no badge.
 *   - the inspection score is the one thing no other marketplace can put on a
 *     paid slot, so it sits on the photo, in neutral colours.
 *   - a struck-through old price appears only when the server sends
 *     `previous_price`, which it does only for a real, recent drop.
 */
export default function FeaturedCard({ slide, width, height = 196, reducedMotion, onPress, t }) {
  const image = slide.images?.[0] || slide.image;
  const heading = slide.headline || slide.title;
  const label = slide.label === 'Sponsored' || slide.sponsored ? t('home.sponsoredLabel')
    : slide.label === 'Hot deal' ? t('home.hotDealLabel') : null;
  const hotDeal = slide.label === 'Hot deal';
  const score = Number(slide.inspection_score) || null;
  const previous = Number(slide.previous_price) > Number(slide.price) ? Number(slide.previous_price) : null;
  const facts = [
    slide.year ? String(slide.year) : null,
    slide.mileage != null ? formatMiles(slide.mileage) : null,
  ].filter(Boolean).join('  ·  ');

  const spoken = [
    heading,
    formatPrice(slide.price),
    previous ? t('home.wasPrice', { price: formatPrice(previous) }) : null,
    score ? t('home.inspected', { score }) : null,
    label,
  ].filter(Boolean).join('. ');

  return (
    <Pressable
      style={[styles.card, { width, height }]}
      accessibilityRole="button"
      accessibilityLabel={`${spoken}.`}
      onPress={onPress}
    >
      <ImageBackground
        source={photoSource(image, PHOTO.WIDE)}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        // A short fade instead of the photo popping in. Nothing else on the
        // card moves.
        transition={reducedMotion ? 0 : 200}
      />
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.74)']} style={styles.scrim} />

      <View style={styles.topRow} pointerEvents="none">
        {label ? (
          <View style={[styles.pill, hotDeal ? styles.pillDark : styles.pillLight]}>
            <Text style={[styles.pillText, hotDeal ? styles.pillTextDark : styles.pillTextLight]}>{label}</Text>
          </View>
        ) : <View />}
        {score ? (
          <View style={[styles.pill, styles.pillLight, styles.score]}>
            <Ionicons name="shield-checkmark" size={11} color="#3D3733" />
            <Text style={styles.scoreText}>{score}/150</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>{heading}</Text>
        <View style={styles.priceLine}>
          <Text style={styles.price}>{formatPrice(slide.price)}</Text>
          {previous ? <Text style={styles.was} numberOfLines={1}>{formatPrice(previous)}</Text> : null}
          {facts ? <Text style={styles.facts} numberOfLines={1}>{facts}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  topRow: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillLight: { backgroundColor: 'rgba(255,255,255,0.94)' },
  pillDark: { backgroundColor: 'rgba(17,17,17,0.72)' },
  pillText: { fontSize: 10.5, fontFamily: fonts.semiBold, },
  pillTextLight: { color: '#6E6660' },
  pillTextDark: { color: '#FFFFFF' },
  score: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreText: { fontSize: 11, fontFamily: fonts.semiBold, color: '#3D3733' },
  text: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  name: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2 },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, gap: 8 },
  price: { color: '#FFFFFF', fontFamily: fonts.extraBold, fontSize: 15 },
  was: {
    color: 'rgba(255,255,255,0.7)', fontFamily: fonts.regular, fontSize: 12,
    textDecorationLine: 'line-through',
  },
  facts: { flex: 1, color: 'rgba(255,255,255,0.78)', fontFamily: fonts.regular, fontSize: 12 },
});

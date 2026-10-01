import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { colors, radius, fonts } from '../theme';
import { formatUsdApprox } from '../data/marketData';
import { useApp } from '../context/AppContext';
import Touchable from './Touchable';

export const formatWon = (krw) => `₩${Math.round(Number(krw) || 0).toLocaleString('en-US')}`;

// One Korean car, as a row. The photo comes straight from the photo host and is
// cached on disk by expo-image, so scrolling back never fetches it twice.
function KoreaCarCard({ car, onPress }) {
  const { t } = useApp();
  const title = `${car.year} ${car.make} ${car.model}`;
  const specs = [
    car.badge,
    car.mileage_km != null ? t('korea.km', { km: Number(car.mileage_km).toLocaleString('en-US') }) : null,
    car.fuel,
  ].filter(Boolean).join(' · ');

  return (
    <Touchable scaleTo={0.985} style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}, ${formatWon(car.price_krw)}`}>
      <View style={styles.thumb}>
        {car.cover ? (
          <ExpoImage source={{ uri: car.cover }} style={styles.image} contentFit="cover" cachePolicy="disk" recyclingKey={car.id} transition={120} />
        ) : (
          <Text style={styles.noPhoto}>{car.make}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {specs ? <Text style={styles.meta} numberOfLines={1}>{specs}</Text> : null}
        <Text style={styles.price}>{formatWon(car.price_krw)}</Text>
        {car.price_usd != null ? <Text style={styles.usd}>{t('korea.approxUsd', { usd: formatUsdApprox(car.price_usd) })}</Text> : null}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSoft, overflow: 'hidden', marginBottom: 10,
  },
  thumb: { width: 128, minHeight: 104, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  noPhoto: { fontFamily: fonts.bold, color: colors.textMuted, fontSize: 14 },
  body: { flex: 1, padding: 12, justifyContent: 'center', gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  meta: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textSecondary, textTransform: 'capitalize' },
  price: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.primary, marginTop: 4 },
  usd: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
});

export default memo(KoreaCarCard);

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Badge from '../components/Badge';
import { colors, radius, fonts } from '../theme';
import { formatPrice } from '../data/cars';
import { getCertTier } from '../data/certification';
import Photo from '../components/Photo';
import { PHOTO } from '../utils/photo';
import { useApp } from '../context/AppContext';

export default function ShowroomScreen({ navigation, route }) {
  const { t } = useApp();
  const { title, subtitle, cars = [] } = route.params || {};
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);

  const car = cars[idx];
  const tier = car ? getCertTier(car) : null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{title || t('showroom.title')}</Text>
          {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
        </View>
        <Text style={styles.headerCount}>{idx + 1} / {cars.length}</Text>
      </View>

      {/* The glass — one car per page */}
      <FlatList
        data={cars}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c.id}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <Pressable
              style={styles.window}
              onPress={() => navigation.navigate(
                item.listingType === 'rental' ? 'RentalDetail' : 'VehicleDetail',
                { car: item }
              )}
            >
              <Photo uri={item.image} width={PHOTO.CARD} style={styles.photo} resizeMode="contain" />
            </Pressable>
          </View>
        )}
      />

      {/* Caption — quiet, beneath the glass */}
      {car && (
        <View style={[styles.caption, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.captionTitle} numberOfLines={1}>{car.title}</Text>
          <View style={styles.captionRow}>
            {tier && <Badge variant={tier.variant} label={tier.short} />}
            <Text style={styles.captionPrice}>
              {car.listingType === 'rental' ? `${formatPrice(car.dailyRate || 0)}${t('home.perDay')}` : formatPrice(car.type === 'auction' ? car.currentBid : car.price)}
            </Text>
          </View>
          <Pressable
            style={styles.viewBtn}
            onPress={() => navigation.navigate(
              car.listingType === 'rental' ? 'RentalDetail' : 'VehicleDetail',
              { car }
            )}
          >
            <Text style={styles.viewBtnText}>{t('showroom.viewThisCar')}</Text>
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </Pressable>

          {/* Window dots */}
          <View style={styles.dots}>
            {cars.map((_, i) => (
              <View key={i} style={[styles.dot, i === idx && styles.dotOn]} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111010' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  headerCount: { fontSize: 13, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.6)' },

  page: { justifyContent: 'center' },
  window: {
    marginHorizontal: 20,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: '#1C1A1A',
  },
  photo: { width: '100%', aspectRatio: 16 / 10 },

  caption: { paddingHorizontal: 24, paddingTop: 8 },
  captionTitle: { fontSize: 20, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -0.4 },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  captionPrice: { fontVariant: ['tabular-nums'], fontSize: 17, fontFamily: fonts.black, color: '#fff' },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.primary,
    borderRadius: radius.xl, paddingVertical: 14, marginTop: 18,
  },
  viewBtnText: { fontSize: 15, fontFamily: fonts.extraBold, color: '#fff' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotOn: { width: 18, backgroundColor: '#fff' },
});

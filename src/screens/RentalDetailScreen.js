import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Share, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Button from '../components/Button';
import PhotoViewer from '../components/PhotoViewer';
import { LoadingState, ErrorState } from '../components/StateViews';
import { colors, radius, shadows, fonts } from '../theme';
import { formatRWF } from '../data/marketData';
import { useApp } from '../context/AppContext';
import Photo from '../components/Photo';
import { PHOTO } from '../utils/photo';

const SPEC_ITEMS = [
  { icon: 'people-outline', label: 'Seats', key: 'seats' },
  { icon: 'cog-outline', label: 'Gearbox', key: 'transmission' },
  { icon: 'flash-outline', label: 'Fuel', key: 'fuel' },
  { icon: 'calendar-outline', label: 'Year', key: 'year' },
];

export default function RentalDetailScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  // A deep link (sawa://rentals/<id>) carries only an id — resolve it against
  // the rental catalogue instead of reading fields off an absent car object,
  // which used to crash every link-opened rental.
  const paramCar = route.params?.car;
  const rentalId = route.params?.rentalId || paramCar?.id;
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewerIdx, setViewerIdx] = useState(null);
  const { recordCarView, rentalCars } = useApp();
  const car =
    paramCar ||
    (rentalCars || []).find((c) => String(c.id) === String(rentalId)) ||
    null;
  React.useEffect(() => { if (car?.id) recordCarView(car.id); }, [car?.id]);

  if (!car) {
    // Catalogue still loading → spinner; loaded but id unknown → honest miss.
    const notFound = (rentalCars || []).length > 0 || !rentalId;
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        {notFound ? (
          <ErrorState
            icon="key-outline"
            title="This rental isn't available"
            sub="It may have been paused or removed from the fleet."
            actionLabel="Go back"
            onAction={() => navigation.goBack()}
          />
        ) : (
          <LoadingState label="Loading this rental…" />
        )}
      </View>
    );
  }

  const imageList = car.images && car.images.length > 0 ? car.images : [car.image];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 184 }}>

        {/* Gallery */}
        <View style={styles.gallery}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / width);
              if (slide !== activeIdx) setActiveIdx(slide);
            }}
            scrollEventThrottle={16}
          >
            {imageList.map((img, index) => (
              <Pressable key={index} onPress={() => setViewerIdx(index)}>
                <Photo uri={img} width={PHOTO.WIDE} style={[styles.heroImage, { width }]} resizeMode="contain" />
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.galleryBar, { top: insets.top + 8 }]}>
            <Pressable style={styles.circleBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              style={styles.circleBtn}
              onPress={() => Share.share({ message: `${car.title} — ${formatRWF(car.dailyRate)}/day on Sawa Cars` }).catch(() => {})} accessibilityRole="button" accessibilityLabel="Share"
            >
              <Ionicons name="share-outline" size={19} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.heroBadges}>
            <View style={styles.rentPill}>
              <Ionicons name="key" size={11} color="#fff" />
              <Text style={styles.rentPillText}>For Rent</Text>
            </View>
            <View style={styles.certPill}>
              <Ionicons name="shield-checkmark" size={11} color="#fff" />
              <Text style={styles.rentPillText}>Certified {car.inspectionScore}/150</Text>
            </View>
            {car.safariReady && (
              <View style={styles.safariPill}>
                <Ionicons name="trail-sign" size={11} color="#fff" />
                <Text style={styles.rentPillText}>Safari-Ready</Text>
              </View>
            )}
          </View>

          {imageList.length > 1 && (
            <View style={styles.indicator}>
              <Text style={styles.indicatorText}>{activeIdx + 1} / {imageList.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Title */}
          <Text style={styles.title}>{car.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color={colors.amber} />
            <Text style={styles.metaText}>{car.rating} · {car.trips} trips</Text>
            <Text style={styles.metaDot}>·</Text>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{car.location}</Text>
          </View>

          {/* Specs */}
          <View style={styles.specs}>
            {SPEC_ITEMS.map((s) => (
              <View key={s.key} style={styles.specCard}>
                <Ionicons name={s.icon} size={19} color={colors.textSecondary} />
                <Text style={styles.specValue}>{String(car[s.key])}</Text>
                <Text style={styles.specLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Availability is confirmed by the independent provider. */}
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.availabilityNote}><Ionicons name="calendar-outline" size={21} color={colors.primary} /><View style={{ flex: 1 }}><Text style={styles.availabilityTitle}>Request your dates</Text><Text style={styles.availabilityText}>The verified provider will confirm the vehicle, price and pickup arrangements. Sending an inquiry does not hold or book the car.</Text></View></View>

          {/* Pricing */}
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Daily rate</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.priceValue}>{formatRWF(car.dailyRate)}/day</Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Weekly rate</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.priceValue}>{formatRWF(car.weeklyRate)}/week</Text>
                <Text style={styles.priceSave}>
                  Save {formatRWF(car.dailyRate * 7 - car.weeklyRate)} vs daily
                </Text>
              </View>
            </View>
            <View style={[styles.priceRow, styles.priceRowLast]}>
              <View>
                <Text style={styles.priceLabel}>Security deposit</Text>
                <Text style={styles.priceSub}>Provider-stated amount · confirm written terms</Text>
              </View>
              <Text style={styles.priceValue}>{formatRWF(car.deposit)}</Text>
            </View>
            {car.minDays > 1 && (
              <View style={styles.minDaysNote}>
                <Ionicons name="information-circle-outline" size={14} color={colors.amber} />
                <Text style={styles.minDaysText}>Minimum rental: {car.minDays} days</Text>
              </View>
            )}
          </View>

          {/* What's included */}
          <Text style={styles.sectionTitle}>Confirm these terms with the provider</Text>
          <View style={styles.includesGrid}>
            {[
              { icon: 'shield-checkmark-outline', label: 'Insurance coverage' },
              { icon: 'construct-outline', label: 'Roadside assistance' },
              { icon: 'speedometer-outline', label: 'Kilometre limits' },
              { icon: 'cash-outline', label: 'Deposit & refund terms' },
            ].map((item) => (
              <View key={item.label} style={styles.includeCard}>
                <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
                <Text style={styles.includeLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.promiseLink} onPress={() => navigation.navigate('SawaPromise')}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
            <Text style={styles.promiseLinkText}>Marketplace safety & responsibilities</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </Pressable>

          {/* Inspection trust row */}
          <Pressable
            style={styles.inspectionRow}
            onPress={() => navigation.navigate('InspectionReport', { car, score: car.inspectionScore })}
          >
            <View style={styles.inspectionIcon}>
              <Ionicons name="shield-checkmark" size={20} color={colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inspectionTitle}>150-Point Inspection Report</Text>
              <Text style={styles.inspectionSub}>Scored {car.inspectionScore}/150 · View full report</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {/* How it works */}
          <Text style={styles.sectionTitle}>How renting works</Text>
          {[
            { n: '1', t: 'Send an inquiry', d: 'Share your dates and preferred contact channel.' },
            { n: '2', t: 'Agree directly', d: 'The provider confirms availability, price, insurance, deposit and written rental terms.' },
            { n: '3', t: 'Manage the rental', d: 'Pickup, payment, vehicle condition and return are handled directly between you and the provider.' },
          ].map((step) => (
            <View key={step.n} style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{step.n}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.t}</Text>
                <Text style={styles.stepDesc}>{step.d}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <View style={styles.ctaInner}>
          <View style={styles.ctaMetaRow}>
            <View style={styles.ctaPrice}>
              <Text style={styles.ctaPriceLabel}>Daily rental</Text>
              <View style={styles.ctaPriceLine}>
                <Text style={styles.ctaPriceValue} numberOfLines={1} adjustsFontSizeToFit>
                  {formatRWF(car.dailyRate)}
                </Text>
                <Text style={styles.ctaPerDay}>/ day</Text>
              </View>
              <Text style={styles.ctaDeposit}>Provider-stated rate · confirm directly</Text>
            </View>
            <View style={styles.ctaAssurance}>
              <Ionicons name="shield-checkmark" size={14} color={colors.greenText} />
              <Text style={styles.ctaAssuranceText}>Inquiry only</Text>
            </View>
          </View>

          <View style={styles.ctaActions}>
            <Button
              title="Request availability"
              icon="calendar-outline"
              style={styles.bookButton}
              textStyle={styles.bookButtonText}
              onPress={() => navigation.navigate('RentalInquiry', { car })}
            />
          </View>
        </View>
      </View>

      <PhotoViewer
        visible={viewerIdx !== null}
        images={imageList}
        initialIndex={viewerIdx || 0}
        onClose={() => setViewerIdx(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  gallery: { height: 300, backgroundColor: colors.border },
  heroImage: { height: 300 },
  galleryBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  circleBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBadges: { position: 'absolute', bottom: 40, left: 16, flexDirection: 'row', gap: 8 },
  rentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.amber,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
  },
  certPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
  },
  safariPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#B45309',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
  },
  rentPillText: { color: '#fff', fontSize: 11, fontFamily: fonts.extraBold },
  indicator: {
    position: 'absolute', bottom: 40, right: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md,
  },
  indicatorText: { color: '#fff', fontSize: 11, fontFamily: fonts.extraBold },
  body: {
    backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, paddingHorizontal: 20, paddingTop: 22,
  },
  title: { fontSize: 22, fontFamily: fonts.extraBold, letterSpacing: -0.5, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary },
  metaDot: { fontSize: 12, color: colors.textMuted },
  specs: { flexDirection: 'row', gap: 10, marginTop: 18 },
  specCard: {
    flex: 1, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.lg, paddingVertical: 13,
    alignItems: 'center', gap: 5,
  },
  specValue: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.textPrimary },
  specLabel: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted },
  sectionTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 24, marginBottom: 12, letterSpacing: -0.3 },
  availabilityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 15 },
  availabilityTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  availabilityText: { marginTop: 4, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  priceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, paddingHorizontal: 16,
    ...shadows.card,
  },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  priceRowLast: { borderBottomWidth: 0 },
  priceLabel: { fontVariant: ['tabular-nums'], fontSize: 14, fontFamily: fonts.medium, color: colors.textSecondary },
  priceValue: { fontVariant: ['tabular-nums'], fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  priceSave: { fontVariant: ['tabular-nums'], fontSize: 11, fontFamily: fonts.semiBold, color: colors.greenText, marginTop: 2 },
  priceRwf: { fontVariant: ['tabular-nums'], fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 2 },
  priceSub: { fontVariant: ['tabular-nums'], fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  minDaysNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.amberTint,
    marginBottom: 12, paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: radius.md,
  },
  minDaysText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.amberText },
  includesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  includeCard: {
    width: '47.8%',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.greenTint,
    borderRadius: radius.md, padding: 12,
  },
  includeLabel: { flex: 1, fontSize: 11, fontFamily: fonts.semiBold, color: colors.textPrimary, lineHeight: 15 },
  promiseLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16 },
  promiseLinkText: { fontSize: 12, fontFamily: fonts.extraBold, color: colors.primary },
  inspectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, marginTop: 12,
  },
  inspectionIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center',
  },
  inspectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  inspectionSub: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.greenText, marginTop: 2 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  stepNumText: { fontSize: 12, fontFamily: fonts.extraBold, color: colors.primary },
  stepTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  stepDesc: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft,
    paddingHorizontal: 16, paddingTop: 12, ...shadows.floating,
  },
  ctaInner: {
    width: '100%', maxWidth: 720, alignSelf: 'center', gap: 12,
  },
  ctaMetaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  ctaPrice: { flex: 1, minWidth: 0 },
  ctaPriceLabel: {
    fontSize: 10, lineHeight: 13, fontFamily: fonts.extraBold, color: colors.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1,
  },
  ctaPriceLine: { flexDirection: 'row', alignItems: 'baseline', minWidth: 0 },
  ctaPriceValue: {
    flexShrink: 1, fontVariant: ['tabular-nums'], fontSize: 22, lineHeight: 27,
    fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.5,
  },
  ctaPerDay: {
    flexShrink: 0, fontSize: 12, fontFamily: fonts.semiBold, color: colors.textMuted, marginLeft: 4,
  },
  ctaDeposit: {
    fontSize: 11, lineHeight: 15, fontFamily: fonts.medium, color: colors.textSecondary, marginTop: 1,
  },
  ctaAssurance: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.greenTint, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  ctaAssuranceText: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.greenText,
  },
  ctaActions: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  bookButton: {
    flex: 1, width: 'auto', minWidth: 0, minHeight: 54,
    paddingVertical: 14, borderRadius: radius.lg,
  },
  bookButtonText: { fontSize: 15, letterSpacing: 0 },
});

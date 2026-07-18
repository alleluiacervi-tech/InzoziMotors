import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import { formatPrice } from '../data/cars';

const STEPS = [
  {
    key: 'reserved',
    icon: 'lock-closed-outline',
    doneIcon: 'lock-closed',
    title: 'Car Reserved for You',
    sub: 'Removed from the marketplace. No one else can book it.',
  },
  {
    key: 'booked',
    icon: 'calendar-outline',
    doneIcon: 'calendar',
    title: 'Handover Slot Booked',
    sub: 'You, the seller, and our team meet at the Inzozi center.',
  },
  {
    key: 'handover',
    icon: 'people-outline',
    doneIcon: 'people',
    title: 'At the Inzozi Center',
    sub: 'Payment verified. Ownership documents processed by our team.',
  },
  {
    key: 'complete',
    icon: 'ribbon-outline',
    doneIcon: 'ribbon',
    title: 'Done — Car is Yours',
    sub: 'Your 7-day Inzozi return guarantee is now active.',
  },
];

const STATUS_ORDER = ['reserved', 'booked', 'handover', 'complete'];

function StepRow({ step, state, isLast }) {
  const isDone = state === 'done';
  const isActive = state === 'active';
  const isPending = state === 'pending';

  const circleColor = isDone ? colors.green : isActive ? colors.amber : colors.border;
  const circleBg = isDone ? colors.greenTint : isActive ? colors.amberTint : colors.surfaceAlt;

  return (
    <View style={styles.stepRow}>
      {/* Left column: circle + connector line */}
      <View style={styles.stepLeft}>
        <View style={[styles.stepCircle, { borderColor: circleColor, backgroundColor: circleBg }]}>
          {isDone ? (
            <Ionicons name={step.doneIcon} size={16} color={colors.green} />
          ) : isActive ? (
            <View style={styles.activePulse} />
          ) : (
            <View style={[styles.pendingDot, { backgroundColor: colors.border }]} />
          )}
        </View>
        {!isLast && <View style={[styles.connector, { backgroundColor: isDone ? colors.green : colors.border }]} />}
      </View>

      {/* Right column: content */}
      <View style={[styles.stepContent, !isLast && { paddingBottom: 28 }]}>
        <View style={styles.stepTop}>
          <Text style={[
            styles.stepTitle,
            isDone && styles.stepTitleDone,
            isActive && styles.stepTitleActive,
            isPending && styles.stepTitlePending,
          ]}>
            {step.title}
          </Text>
          {isActive && (
            <View style={styles.waitingChip}>
              <Text style={styles.waitingChipText}>In progress</Text>
            </View>
          )}
        </View>
        <Text style={[styles.stepSub, isPending && styles.stepSubPending]}>{step.sub}</Text>
        {isDone && (
          <View style={styles.stepBadge}>
            <Ionicons name="checkmark" size={10} color={colors.green} />
            <Text style={styles.stepBadgeText}>Completed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function OrderTrackingScreen({ navigation, route }) {
  const { orderId, car: routeCar } = route.params || {};
  const { purchaseRequests, cancelHandover } = useApp();

  const request = purchaseRequests.find((r) => r.id === orderId);
  const car = request?.car || routeCar;
  const currentStatus = request?.status || 'reserved';
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  const getStepState = (step, idx) => {
    if (idx < currentIdx) return 'done';
    if (idx === currentIdx) return currentIdx === STATUS_ORDER.length - 1 ? 'done' : 'active';
    return 'pending';
  };

  const price = car ? (car.type === 'auction' ? car.currentBid : car.price) : 0;

  const handleCancel = () => {
    Alert.alert(
      'Cancel Request?',
      "The seller will be notified. You can always send a new request if you change your mind.",
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: () => {
            if (orderId) cancelHandover(orderId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Order Tracking" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Order ID + status hero */}
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Order ID</Text>
              <Text style={styles.heroOrderId}>{orderId || 'ORD-DEMO'}</Text>
            </View>
            <View style={[
              styles.statusChip,
              currentStatus === 'booked' && styles.statusChipConfirmed,
              currentStatus === 'complete' && styles.statusChipComplete,
            ]}>
              <View style={[styles.statusDot, { backgroundColor: currentStatus === 'complete' ? colors.green : colors.amber }]} />
              <Text style={styles.statusChipText}>
                {currentStatus === 'reserved' ? 'Car reserved'
                  : currentStatus === 'booked' ? 'Slot booked'
                  : currentStatus === 'handover' ? 'At the center'
                  : 'Complete'}
              </Text>
            </View>
          </View>
          {currentStatus === 'reserved' && (
            <View style={styles.confirmAlert}>
              <Ionicons name="lock-closed" size={16} color={colors.greenLight} />
              <Text style={styles.confirmAlertText}>
                Car is reserved — message the seller to confirm they know the date and center.
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Car summary */}
        {car && (
          <View style={styles.carCard}>
            <Image source={{ uri: car.image }} style={styles.carThumb} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.carTitle} numberOfLines={2}>{car.title}</Text>
              <Text style={styles.carSeller}>{car.seller}</Text>
              <Text style={styles.carPrice}>{formatPrice(price)}</Text>
            </View>
            <Pressable
              style={styles.viewBtn}
              onPress={() => navigation.navigate('VehicleDetail', { car })}
            >
              <Text style={styles.viewBtnText}>View</Text>
            </Pressable>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Transaction Progress</Text>
          <View style={styles.timeline}>
            {STEPS.map((step, idx) => (
              <StepRow
                key={step.key}
                step={step}
                state={getStepState(step, idx)}
                isLast={idx === STEPS.length - 1}
                sentTime={request?.sentTime}
                confirmedTime={request?.confirmedTime}
              />
            ))}
          </View>
        </View>

        {/* What's next */}
        {currentStatus === 'reserved' && (
          <View style={styles.nextStepsCard}>
            <Text style={styles.nextTitle}>What happens next</Text>
            {[
              { icon: 'chatbubble-outline', text: 'Message the seller — make sure they know your booked date, time, and center.' },
              { icon: 'document-text-outline', text: 'Re-read the 150-point inspection report. Bring any questions to the center.' },
              { icon: 'people-outline', text: 'Come to the Inzozi center on the day. Our team verifies payment and transfers ownership.' },
              { icon: 'shield-checkmark-outline', text: 'Once Inzozi confirms, your 7-day return guarantee starts immediately.' },
            ].map((item, i) => (
              <View key={i} style={styles.nextRow}>
                <View style={styles.nextIcon}>
                  <Ionicons name={item.icon} size={15} color={colors.primary} />
                </View>
                <Text style={styles.nextText}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Inzozi guarantee */}
        <View style={styles.guaranteeCard}>
          <Ionicons name="shield-checkmark" size={18} color={colors.green} />
          <Text style={styles.guaranteeText}>
            7-day return guarantee · 150-point certified · Inzozi-witnessed handover
          </Text>
        </View>

        {/* Cancel */}
        {currentStatus === 'sent' && (
          <Pressable style={styles.cancelLink} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel this request</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Sticky CTAs */}
      <View style={styles.cta}>
        <Button
          title="Message Seller"
          icon="chatbubble-outline"
          onPress={() => navigation.navigate('Chat', { name: car?.seller || 'Seller', car })}
        />
        {currentStatus !== 'sent' && (
          <Button
            title="View Inspection Report"
            variant="secondary"
            icon="shield-checkmark-outline"
            onPress={() => navigation.navigate('InspectionReport', { car })}
            style={{ marginTop: 10 }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { margin: 16, marginBottom: 8, borderRadius: radius.xxl, padding: 18, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroOrderId: { fontSize: 18, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: 0.5, marginTop: 3 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.amberTint + 'DD',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
  },
  statusChipConfirmed: { backgroundColor: colors.greenTint + 'DD' },
  statusChipComplete: { backgroundColor: colors.greenTint + 'DD' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusChipText: { fontSize: 12, fontFamily: fonts.bold, color: colors.textPrimary },
  confirmAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.lg, padding: 12,
  },
  confirmAlertText: { flex: 1, fontSize: 13, color: colors.greenLight, lineHeight: 18 },
  carCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 12,
    ...shadows.card,
  },
  carThumb: { width: 80, height: 60, borderRadius: radius.lg, backgroundColor: colors.border },
  carTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary, lineHeight: 18 },
  carSeller: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  carPrice: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.primary, marginTop: 4 },
  viewBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
  },
  viewBtnText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primary },
  timelineCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 18,
    ...shadows.card,
  },
  timelineTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 20 },
  timeline: { gap: 0 },
  stepRow: { flexDirection: 'row', gap: 14 },
  stepLeft: { alignItems: 'center', width: 36 },
  stepCircle: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  connector: { width: 2, flex: 1, minHeight: 20, marginTop: 4 },
  activePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amber },
  pendingDot: { width: 8, height: 8, borderRadius: 4 },
  stepContent: { flex: 1, paddingTop: 6 },
  stepTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  stepTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary, flex: 1 },
  stepTitleDone: { color: colors.green },
  stepTitleActive: { color: colors.amber },
  stepTitlePending: { color: colors.textMuted },
  stepTimestamp: { fontSize: 11, color: colors.textMuted },
  waitingChip: {
    backgroundColor: colors.amberTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  waitingChipText: { fontSize: 10, fontFamily: fonts.bold, color: colors.amber },
  stepSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  stepSubPending: { color: colors.textMuted },
  stepBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: colors.greenTint,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  stepBadgeText: { fontSize: 10, fontFamily: fonts.bold, color: colors.green },
  nextStepsCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 16, gap: 12,
  },
  nextTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.primary },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nextIcon: {
    width: 28, height: 28, borderRadius: radius.sm,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  nextText: { flex: 1, fontSize: 12, color: colors.navyMid, lineHeight: 18 },
  guaranteeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
  },
  guaranteeText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  cancelLink: { alignItems: 'center', paddingVertical: 16 },
  cancelText: { fontSize: 13, color: colors.statusRejected, fontFamily: fonts.semiBold },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 28,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    ...shadows.floating,
  },
});

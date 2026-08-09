import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import StickyFooter from '../components/StickyFooter';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';
import { EmptyState } from '../components/StateViews';
import { useApp } from '../context/AppContext';
import { formatPrice } from '../data/cars';
import reviewsApi from '../api/reviews';

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
    sub: 'You, the seller, and our team meet at the Sawa center.',
  },
  {
    key: 'handover',
    icon: 'people-outline',
    doneIcon: 'people',
    title: 'At the Sawa Center',
    sub: 'Payment verified. Ownership documents processed by our team.',
  },
  {
    key: 'complete',
    icon: 'ribbon-outline',
    doneIcon: 'ribbon',
    title: 'Done — Car is Yours',
    sub: 'Your 7-day Sawa return guarantee is now active.',
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
  // Deep links (sawa://orders/:bookingId, see navigation/linking.js) send
  // `bookingId`; in-app navigation sends `orderId`. Accept both — the mismatch
  // used to make every order deep link land on an empty $0 "reserved" screen.
  const { orderId: orderIdParam, bookingId, car: routeCar } = route.params || {};
  const orderId = orderIdParam || bookingId;
  const { purchaseRequests, cancelHandover, demoMode } = useApp();
  // orderId may be the UUID (API) or a local/display ref — match either
  const found = purchaseRequests.find((r) => r.id === orderId || r.bookingRef === orderId);
  const cancelId = found?.id || orderId;
  const displayRef = found?.bookingRef || orderId;

  const request = found;
  const car = request?.car || routeCar;
  const currentStatus = request?.status || 'reserved';
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  const getStepState = (step, idx) => {
    if (idx < currentIdx) return 'done';
    if (idx === currentIdx) return currentIdx === STATUS_ORDER.length - 1 ? 'done' : 'active';
    return 'pending';
  };

  const price = car ? (car.type === 'auction' ? car.currentBid : car.price) : 0;

  // ── Buyer review (after complete handover) ──
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  // Nothing to track: reachable from a handover push that carries no booking
  // id, or a stale deep link after the order was cancelled. Say so. The old
  // fallback invented an "ORD-DEMO" order at $0 here — the one screen a store
  // reviewer must never meet. (Kept below the hooks: `purchaseRequests` loads
  // asynchronously, so this branch can flip between renders.)
  if (!request && !routeCar) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title="Order Tracking" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="receipt-outline"
          title="We couldn't find this order"
          sub="It may have completed or been cancelled, or the link is out of date. Your requests are in your profile."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const handleSubmitReview = async () => {
    if (reviewRating === 0 || reviewSubmitting) return;
    // API handovers have UUID ids; local demo bookings look like 'HB123456'
    const isApiHandover = typeof cancelId === 'string' && cancelId.includes('-');
    if (!isApiHandover) {
      setReviewDone(true);
      showToast('Thanks — your review helps other buyers', 'success');
      return;
    }
    setReviewSubmitting(true);
    try {
      await reviewsApi.postReview({
        handover_id: cancelId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewDone(true);
      showToast('Thanks — your review helps other buyers', 'success');
    } catch (err) {
      if ((err?.message || '').toLowerCase().includes('already reviewed')) {
        setReviewDone(true);
        showToast('You already reviewed this purchase', 'info');
      } else if (demoMode) {
        // Demo bookings have no backend to save to — pretend locally only in dev
        setReviewDone(true);
        showToast('Thanks — your review helps other buyers', 'success');
      } else {
        // The review was NOT saved — thanking the user here would be a lie.
        showToast("Your review didn't send. Check your connection and try again.", 'error');
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleCancel = () => {
    showConfirm({
      title: 'Cancel this request?',
      message: 'The seller will be notified. You can always send a new request if you change your mind.',
      confirmLabel: 'Cancel Request', cancelLabel: 'Keep Request', destructive: true,
    }).then((ok) => {
      if (!ok) return;
      if (cancelId) cancelHandover(cancelId);
      showToast('Request cancelled.', 'info');
      navigation.goBack();
    });
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
              <Text style={styles.heroOrderId}>{displayRef || '—'}</Text>
            </View>
            <View style={[
              styles.statusChip,
              currentStatus === 'booked' && styles.statusChipConfirmed,
              currentStatus === 'complete' && styles.statusChipComplete,
            ]}>
              <View style={[styles.statusDot, {
                backgroundColor: currentStatus === 'complete' ? colors.statusLive
                  : currentStatus === 'booked' ? colors.statusScheduled
                  : colors.amber,
              }]} />
              <Text style={[
                styles.statusChipText,
                currentStatus === 'booked' && { color: colors.statusScheduled },
                currentStatus === 'complete' && { color: colors.statusLive },
              ]}>
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
            <Image source={{ uri: car.image }} style={styles.carThumb} resizeMode="contain" />
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

        {/* Rate your experience — after completed handover */}
        {currentStatus === 'complete' && !reviewDone && (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>Rate your experience</Text>
            <Text style={styles.reviewSub}>
              How was the seller and the handover? Your review helps other buyers.
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable key={i} onPress={() => setReviewRating(i)} hitSlop={6}>
                  <Ionicons
                    name={i <= reviewRating ? 'star' : 'star-outline'}
                    size={30}
                    color={i <= reviewRating ? colors.amber : colors.textDisabled}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share a few words (optional)"
              placeholderTextColor={colors.textMuted}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
            />
            <Button
              title={reviewSubmitting ? 'Submitting…' : 'Submit Review'}
              icon="star-outline"
              disabled={reviewRating === 0 || reviewSubmitting}
              onPress={handleSubmitReview}
            />
          </View>
        )}

        {/* What's next */}
        {currentStatus === 'reserved' && (
          <View style={styles.nextStepsCard}>
            <Text style={styles.nextTitle}>What happens next</Text>
            {[
              { icon: 'chatbubble-outline', text: 'Message the seller — make sure they know your booked date, time, and center.' },
              { icon: 'document-text-outline', text: 'Re-read the 150-point inspection report. Bring any questions to the center.' },
              { icon: 'people-outline', text: 'Come to the Sawa center on the day. Our team verifies payment and transfers ownership.' },
              { icon: 'shield-checkmark-outline', text: 'Once Sawa Cars confirms, your 7-day return guarantee starts immediately.' },
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

        {/* Sawa guarantee */}
        <View style={styles.guaranteeCard}>
          <Ionicons name="shield-checkmark" size={18} color={colors.green} />
          <Text style={styles.guaranteeText}>
            7-day return guarantee · 150-point certified · Sawa-witnessed handover
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
      <StickyFooter style={styles.cta}>
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
      </StickyFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { margin: 16, marginBottom: 8, borderRadius: radius.xxl, padding: 18, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroOrderId: { fontSize: 18, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: 0.5, marginTop: 3 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.amberTint + 'DD',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
  },
  statusChipConfirmed: { backgroundColor: colors.statusScheduledBg },
  statusChipComplete: { backgroundColor: colors.statusLiveBg },
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
  carPrice: { fontVariant: ['tabular-nums'], fontSize: 15, fontFamily: fonts.extraBold, color: colors.primary, marginTop: 4 },
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
  stepTitleDone: { color: colors.greenText },
  stepTitleActive: { color: colors.amberText },
  stepTitlePending: { color: colors.textMuted },
  stepTimestamp: { fontSize: 11, color: colors.textMuted },
  waitingChip: {
    backgroundColor: colors.amberTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  waitingChipText: { fontSize: 11, fontFamily: fonts.bold, color: colors.amberText },
  stepSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  stepSubPending: { color: colors.textMuted },
  stepBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: colors.greenTint,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  stepBadgeText: { fontSize: 11, fontFamily: fonts.bold, color: colors.greenText },
  reviewCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, gap: 12,
    ...shadows.card,
  },
  reviewTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  reviewSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: -6 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 4 },
  reviewInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    padding: 12, minHeight: 72, textAlignVertical: 'top',
    fontSize: 13, fontFamily: fonts.medium, color: colors.textPrimary,
  },
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
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    ...shadows.floating,
  },
});

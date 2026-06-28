import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows } from '../theme';
import { formatPrice } from '../data/cars';
import { useApp } from '../context/AppContext';

const STEPS = [
  {
    icon: 'paper-plane-outline',
    title: 'Request sent to seller',
    sub: 'The seller is notified instantly via chat.',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'Seller confirms within 24h',
    sub: "They'll accept via chat to open the conversation.",
  },
  {
    icon: 'location-outline',
    title: 'Arrange a viewing in Kigali',
    sub: 'Coordinate a test drive time and meeting point with the seller.',
  },
  {
    icon: 'swap-horizontal-outline',
    title: 'Agree terms & handover',
    sub: "Finalise terms with the seller directly. Inzozi witnesses the handover.",
  },
];

function ReviewState({ car, price, onSend, sending }) {
  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 120 }}>
        {/* Car summary */}
        <View style={styles.carCard}>
          <Image source={{ uri: car.image }} style={styles.carThumb} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.carTitle}>{car.title}</Text>
            <Text style={styles.carSeller}>{car.seller}</Text>
            <Text style={styles.carPrice}>{formatPrice(price)}</Text>
          </View>
        </View>

        {/* Inspection badge */}
        {car.inspected && (
          <View style={styles.inspBadge}>
            <Ionicons name="shield-checkmark" size={15} color={colors.green} />
            <Text style={styles.inspBadgeText}>150-point Inzozi Certified · 7-day return guarantee</Text>
          </View>
        )}

        {/* No payment notice */}
        <View style={styles.noPayCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.statusScheduled} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noPayTitle}>No payment through Inzozi</Text>
            <Text style={styles.noPaySub}>
              We connect you with the seller. All payment and financial terms are agreed directly between you and the seller, offline.
            </Text>
          </View>
        </View>

        {/* What happens next */}
        <Text style={styles.sectionTitle}>What happens next</Text>
        <View style={styles.stepsCard}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={[styles.step, i < STEPS.length - 1 && styles.stepBorder]}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <View style={styles.stepIcon}>
                <Ionicons name={s.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepSub}>{s.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Seller info */}
        <View style={styles.sellerCard}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerInitial}>{car.seller[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellerName}>{car.seller}</Text>
            <View style={styles.sellerMeta}>
              <Ionicons name="star" size={12} color={colors.amber} />
              <Text style={styles.sellerMetaText}>{car.rating} · Verified seller</Text>
            </View>
          </View>
          <View style={styles.sellerBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.green} />
            <Text style={styles.sellerBadgeText}>ID Verified</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Asking price</Text>
          <Text style={styles.footerValue}>{formatPrice(price)}</Text>
        </View>
        <Button
          title={sending ? 'Sending…' : 'Send Purchase Request'}
          style={{ flex: 1 }}
          onPress={onSend}
        />
      </View>
    </>
  );
}

function SentState({ car, orderId, onTrack, onMessage }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Success hero */}
      <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.successHero}>
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark-circle" size={44} color={colors.greenLight} />
        </View>
        <Text style={styles.successTitle}>Request Sent!</Text>
        <Text style={styles.successSub}>
          {car.seller} has been notified and will respond within 24 hours.
        </Text>
        <View style={styles.orderIdChip}>
          <Text style={styles.orderIdLabel}>Order ID</Text>
          <Text style={styles.orderIdValue}>{orderId}</Text>
        </View>
      </LinearGradient>

      {/* Car summary */}
      <View style={styles.carCard}>
        <Image source={{ uri: car.image }} style={styles.carThumb} resizeMode="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.carTitle}>{car.title}</Text>
          <Text style={styles.carSeller}>{car.seller}</Text>
        </View>
        <View style={styles.pendingChip}>
          <View style={styles.pendingDot} />
          <Text style={styles.pendingChipText}>Awaiting seller</Text>
        </View>
      </View>

      {/* Status hint */}
      <View style={styles.hintCard}>
        <Ionicons name="notifications-outline" size={16} color={colors.primary} />
        <Text style={styles.hintText}>
          You'll receive a notification when {car.seller} confirms. Check back in Order Tracking for live status updates.
        </Text>
      </View>

      {/* Next steps */}
      <View style={[styles.stepsCard, { margin: 16 }]}>
        <Text style={styles.sectionTitle}>While you wait</Text>
        {[
          { icon: 'document-text-outline', text: 'Review the full 150-point inspection report for this car.' },
          { icon: 'earth-outline', text: 'Check the Vehicle History — import origin, RRA duty, and accident records.' },
          { icon: 'chatbubble-outline', text: 'Open the chat now if you have questions for the seller.' },
        ].map((item, i) => (
          <View key={i} style={[styles.hintRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 12, marginTop: 12 }]}>
            <View style={styles.hintIcon}>
              <Ionicons name={item.icon} size={16} color={colors.primary} />
            </View>
            <Text style={styles.hintRowText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function CheckoutScreen({ navigation, route }) {
  const car = route.params?.car;
  const price = car.type === 'auction' ? car.currentBid : car.price;
  const { addPurchaseRequest } = useApp();

  const [phase, setPhase] = useState('review'); // 'review' | 'sent'
  const [orderId, setOrderId] = useState(null);
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    setSending(true);
    // Small delay for UX feel
    setTimeout(() => {
      const id = addPurchaseRequest(car);
      setOrderId(id);
      setPhase('sent');
      setSending(false);
    }, 600);
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title={phase === 'review' ? 'Request to Buy' : 'Request Sent'}
        onBack={() => {
          if (phase === 'sent') {
            navigation.navigate('Main');
          } else {
            navigation.goBack();
          }
        }}
      />

      {phase === 'review' ? (
        <ReviewState car={car} price={price} onSend={handleSend} sending={sending} />
      ) : (
        <>
          <SentState
            car={car}
            orderId={orderId}
            onTrack={() => navigation.navigate('OrderTracking', { orderId, car })}
            onMessage={() => navigation.navigate('Chat', { name: car.seller, car })}
          />
          {/* Sticky CTAs */}
          <View style={styles.footer}>
            <Button
              title="Track Order"
              icon="navigate-outline"
              onPress={() => navigation.navigate('OrderTracking', { orderId, car })}
            />
            <Button
              title="Message Seller"
              variant="secondary"
              icon="chatbubble-outline"
              onPress={() => navigation.navigate('Chat', { name: car.seller, car })}
              style={{ marginTop: 10 }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  carCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 12,
    ...shadows.card,
  },
  carThumb: { width: 80, height: 60, borderRadius: radius.lg, backgroundColor: colors.border },
  carTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, lineHeight: 19 },
  carSeller: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  carPrice: { fontSize: 16, fontWeight: '800', color: colors.primary, marginTop: 4 },
  inspBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.primary + '33',
    borderRadius: radius.lg, padding: 12, marginBottom: 10,
  },
  inspBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary, flex: 1 },
  noPayCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.lg, padding: 14, marginBottom: 16,
  },
  noPayTitle: { fontSize: 13, fontWeight: '700', color: colors.statusScheduled },
  noPaySub: { fontSize: 12, color: colors.statusScheduled, lineHeight: 17, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  stepsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, overflow: 'hidden', marginBottom: 14,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  stepNumText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  stepIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  stepSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  sellerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, marginBottom: 8,
  },
  sellerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.navyMid,
    alignItems: 'center', justifyContent: 'center',
  },
  sellerInitial: { color: '#fff', fontWeight: '800', fontSize: 16 },
  sellerName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  sellerMetaText: { fontSize: 12, color: colors.textSecondary },
  sellerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.greenTint,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill,
  },
  sellerBadgeText: { fontSize: 11, fontWeight: '700', color: colors.green },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface,
    ...shadows.floating,
  },
  footerLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  footerValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  // Sent state
  successHero: { margin: 16, marginBottom: 8, borderRadius: radius.xxl, padding: 24, alignItems: 'center', gap: 10 },
  successIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  successSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  orderIdChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8,
    alignItems: 'center', gap: 2,
  },
  orderIdLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderIdValue: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  pendingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.amberTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
  },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.amber },
  pendingChipText: { fontSize: 10, fontWeight: '700', color: colors.amber },
  hintCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.primary + '33',
    borderRadius: radius.xl, padding: 14,
  },
  hintText: { flex: 1, fontSize: 12, color: colors.primary, lineHeight: 18 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  hintIcon: {
    width: 30, height: 30, borderRadius: radius.sm,
    backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  hintRowText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TextInput, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import StickyFooter from '../components/StickyFooter';
import { ErrorState } from '../components/StateViews';
import { colors, radius, shadows, fonts } from '../theme';
import { formatPrice } from '../data/cars';
import { contactSellerOnWhatsApp } from '../utils/whatsapp';
import { showToast } from '../components/Feedback';
import { useApp } from '../context/AppContext';

const HOW_IT_WORKS = [
  { icon: 'paper-plane-outline', title: 'Send your request', sub: 'One tap — no payment, no commitment yet.' },
  { icon: 'lock-closed-outline', title: 'We reserve the car', sub: 'Held for you while we confirm with the seller.' },
  { icon: 'call-outline', title: 'We arrange the handover', sub: 'Sawa contacts you on WhatsApp to set a time that suits you.' },
  { icon: 'shield-checkmark-outline', title: 'Meet at the Sawa center', sub: 'Payment, documents, transfer — then drive it for 7 days before the sale is final.' },
];

// ─── Request phase ───────────────────────────────────────────────────────────
function RequestState({ car, price, phone, setPhone, onSend, sending, navigation }) {
  const askAvailability = () => contactSellerOnWhatsApp(car, formatPrice(price));
  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.carCard}>
          <Image source={{ uri: car.image }} style={styles.carThumb} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.carTitle}>{car.title}</Text>
            <Text style={styles.carSeller}>{car.seller}</Text>
            <Text style={styles.carPrice}>{formatPrice(price)}</Text>
          </View>
        </View>

        {car.inspected && (
          <View style={styles.certBadge}>
            <Ionicons name="shield-checkmark" size={15} color={colors.green} />
            <Text style={styles.certBadgeText}>Sawa Certified · 150-point inspection passed</Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>No payment in the app</Text>
            <Text style={styles.infoSub}>
              Payment, documents and ownership transfer all happen at the Sawa center — where we protect both you and the seller.
            </Text>
          </View>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <Pressable onPress={() => navigation.navigate('BuyingGuide')} hitSlop={8}>
            <Text style={styles.guideLink}>Full guide</Text>
          </Pressable>
        </View>
        <View style={styles.stepsCard}>
          {HOW_IT_WORKS.map((s, i) => (
            <View key={s.title} style={[styles.step, i < HOW_IT_WORKS.length - 1 && styles.stepBorder]}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <View style={styles.stepIcon}>
                <Ionicons name={s.icon} size={18} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepSub}>{s.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Where can we reach you?</Text>
        <View style={styles.phoneRow}>
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixText}>+250</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="7XX XXX XXX"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={12}
          />
        </View>
        <Text style={styles.phoneHint}>We'll confirm availability and arrange the handover on WhatsApp.</Text>

        <View style={styles.sellerCard}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerInitial}>{car.seller?.[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellerName}>{car.seller}</Text>
            <View style={styles.sellerMeta}>
              <Ionicons name="star" size={12} color={colors.amber} />
              <Text style={styles.sellerMetaText}>{car.rating} · Verified seller</Text>
            </View>
          </View>
          <View style={styles.sellerVerified}>
            <Ionicons name="checkmark-circle" size={14} color={colors.green} />
            <Text style={styles.sellerVerifiedText}>ID Verified</Text>
          </View>
          <Pressable style={styles.waSmallBtn} onPress={askAvailability} accessibilityRole="button" accessibilityLabel="Contact on WhatsApp">
            <Ionicons name="logo-whatsapp" size={19} color="#25D366" />
          </Pressable>
        </View>
      </ScrollView>

      <StickyFooter style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Asking price</Text>
          <Text style={styles.footerValue}>{formatPrice(price)}</Text>
        </View>
        <Pressable style={styles.waBtn} onPress={askAvailability} accessibilityRole="button" accessibilityLabel="Contact on WhatsApp">
          <Ionicons name="logo-whatsapp" size={24} color="#fff" />
        </Pressable>
        <Button
          title={sending ? 'Sending…' : 'Request This Car'}
          icon="paper-plane-outline"
          onPress={onSend}
          disabled={sending}
          style={{ flex: 1 }}
        />
      </StickyFooter>
    </>
  );
}

// ─── Confirmed phase ─────────────────────────────────────────────────────────
function ConfirmedState({ car, bookingId, phone, onTrack, onMessage }) {
  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.successHero}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={44} color={colors.greenLight} />
          </View>
          <Text style={styles.successTitle}>Request Sent!</Text>
          <Text style={styles.successSub}>
            The {car.title} is reserved for you while we confirm. We'll contact you shortly to arrange the handover.
          </Text>
        </LinearGradient>

        <View style={styles.bookingCard}>
          <Text style={styles.bookingCardTitle}>Your request</Text>
          {[
            { icon: 'bookmark-outline', label: 'Request ID', value: bookingId },
            { icon: 'car-outline', label: 'Vehicle', value: car.title },
            { icon: 'call-outline', label: 'Contact', value: phone ? `+250 ${phone}` : 'Via your account' },
            { icon: 'time-outline', label: 'Next step', value: 'Sawa confirms within 24h' },
          ].map((row) => (
            <View key={row.label} style={styles.bookingRow}>
              <Ionicons name={row.icon} size={15} color={colors.textMuted} />
              <Text style={styles.bookingRowLabel}>{row.label}</Text>
              <Text style={styles.bookingRowValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.guaranteeCard}>
          <Ionicons name="shield-checkmark" size={16} color={colors.green} />
          <Text style={styles.guaranteeText}>
            Drive it for 7 days — the guarantee starts when handover completes at the Sawa center.
          </Text>
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>While you wait</Text>
          {[
            { icon: 'chatbubble-outline', text: 'Message the seller with any questions about the car.' },
            { icon: 'document-text-outline', text: 'Re-read the 150-point inspection report for this car.' },
            { icon: 'earth-outline', text: 'Check the Vehicle History for import origin and RRA duty records.' },
          ].map((item, i) => (
            <View key={i} style={styles.nextRow}>
              <View style={styles.nextIcon}><Ionicons name={item.icon} size={14} color={colors.primary} /></View>
              <Text style={styles.nextText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <StickyFooter style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Button title="Track Request" icon="navigate-outline" onPress={onTrack} />
          <Button
            title="Message Seller"
            variant="secondary"
            icon="chatbubble-outline"
            onPress={onMessage}
            style={{ marginTop: 10 }}
          />
        </View>
      </StickyFooter>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CheckoutScreen({ navigation, route }) {
  const car = route.params?.car;
  const price = car ? (car.type === 'auction' ? car.currentBid : car.price) : 0;
  const { bookHandover } = useApp();

  const [phase, setPhase] = useState('request');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  // Entered without a car (restored nav state, a push tap) — there is nothing
  // to request, and reading car.type below would crash the purchase flow.
  if (!car) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title="Request This Car" onBack={() => navigation.goBack()} />
        <ErrorState
          icon="car-outline"
          title="This listing isn't available"
          sub="Pick a car from the marketplace to send a purchase request."
        />
      </Screen>
    );
  }

  const handleSend = async () => {
    if (sending) return;
    // Rwanda mobile numbers: 9 digits starting with 7 (e.g. 788 123 456)
    const digits = phone.replace(/\D/g, '');
    if (digits && !/^7\d{8}$/.test(digits)) {
      showToast('Enter a valid phone — 9 digits starting with 7, e.g. 788 123 456.', 'error');
      return;
    }
    setSending(true);
    try {
      const id = await bookHandover(car, {
        contactPhone: digits ? `+250${digits}` : null,
      });
      setBookingId(id);
      setPhase('confirmed');
    } catch (err) {
      // Real backend rejection (bad input, car taken) — tell the buyer the truth
      showToast(err.message || 'Request failed — please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const titles = { request: 'Request This Car', confirmed: 'Request Sent' };

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title={titles[phase]}
        onBack={() => {
          if (phase === 'confirmed') navigation.navigate('Main');
          else navigation.goBack();
        }}
      />
      {phase === 'request' && (
        <RequestState
          car={car}
          navigation={navigation}
          price={price}
          phone={phone}
          setPhone={setPhone}
          onSend={handleSend}
          sending={sending}
        />
      )}
      {phase === 'confirmed' && (
        <ConfirmedState
          car={car}
          bookingId={bookingId}
          phone={phone}
          onTrack={() => navigation.navigate('OrderTracking', { orderId: bookingId, car })}
          onMessage={() => navigation.navigate('Chat', { name: car.seller, car })}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 8, paddingBottom: 120 },

  // Car summary
  carCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 12, marginBottom: 10, ...shadows.card,
  },
  carThumb: { width: 80, height: 60, borderRadius: radius.lg, backgroundColor: colors.border },
  carTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary, lineHeight: 19 },
  carSeller: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2 },
  carPrice: { fontVariant: ['tabular-nums'], fontSize: 16, fontFamily: fonts.extraBold, color: colors.primary, marginTop: 4 },

  certBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.greenTint, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 12, marginBottom: 10,
  },
  certBadgeText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textPrimary, flex: 1 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.greenTint, borderRadius: radius.lg, padding: 14, marginBottom: 16,
  },
  infoTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  infoSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 17, marginTop: 3 },

  sectionTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guideLink: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.primary, marginBottom: 10 },

  stepsCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, overflow: 'hidden', marginBottom: 16,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  stepNum: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.navyDeep,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  stepNumText: { fontSize: 11, fontFamily: fonts.extraBold, color: '#fff' },
  stepIcon: {
    width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  stepSub: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },

  // Phone
  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  phonePrefix: {
    paddingHorizontal: 14, justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
  },
  phonePrefixText: { fontSize: 15, fontFamily: fonts.bold, color: colors.textSecondary },
  phoneInput: {
    flex: 1, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: fonts.medium, color: colors.textPrimary,
  },
  phoneHint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: 16 },

  sellerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
  },
  sellerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navyMid,
    alignItems: 'center', justifyContent: 'center',
  },
  sellerInitial: { color: '#fff', fontFamily: fonts.extraBold, fontSize: 16 },
  sellerName: { fontSize: 14, fontFamily: fonts.bold, color: colors.textPrimary },
  sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  sellerMetaText: { fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary },
  sellerVerified: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.greenTint, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill,
  },
  sellerVerifiedText: { fontSize: 11, fontFamily: fonts.bold, color: colors.greenText },

  // Confirmed phase
  successHero: { margin: 16, marginBottom: 10, borderRadius: radius.xxl, padding: 28, alignItems: 'center', gap: 10 },
  successIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: 24, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -0.5 },
  successSub: { fontSize: 14, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },

  bookingCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, gap: 12, ...shadows.card,
  },
  bookingCardTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 4 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookingRowLabel: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted, width: 80 },
  bookingRowValue: { flex: 1, fontSize: 13, fontFamily: fonts.semiBold, color: colors.textPrimary },

  guaranteeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.greenTint, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14,
  },
  guaranteeText: { flex: 1, fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary, lineHeight: 18 },

  nextCard: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, gap: 12, ...shadows.card,
  },
  nextTitle: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.textPrimary },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nextIcon: {
    width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  nextText: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 18 },

  waBtn: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center',
  },
  waSmallBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: '#E9F9EF', alignItems: 'center', justifyContent: 'center',
  },
  // Shared footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface, ...shadows.floating,
  },
  footerLabel: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary, marginBottom: 2 },
  footerValue: { fontSize: 20, fontFamily: fonts.extraBold, color: colors.textPrimary },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius } from '../theme';
import { formatPrice } from '../data/cars';

const NEXT_STEPS = [
  { icon: 'send-outline', title: 'Request sent to seller', sub: 'The seller is notified of your interest instantly.' },
  { icon: 'chatbubble-ellipses-outline', title: 'Seller confirms within 24h', sub: "They'll reach out via chat to confirm details." },
  { icon: 'swap-horizontal-outline', title: 'Arrange handover', sub: 'Coordinate inspection, test drive, and transfer in Kigali.' },
];

export default function CheckoutScreen({ navigation, route }) {
  const car = route.params?.car;
  const price = car.type === 'auction' ? car.currentBid : car.price;

  const handleSendRequest = () => {
    Alert.alert(
      'Request Sent!',
      'The seller has been notified. They will contact you via chat within 24 hours.',
      [{ text: 'Go to Messages', onPress: () => navigation.navigate('Messages') }]
    );
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Request to Buy" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
        {/* Car summary */}
        <View style={styles.summary}>
          <Image source={{ uri: car.image }} style={styles.thumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.carTitle}>{car.title}</Text>
            <Text style={styles.carMeta}>{car.seller}</Text>
            <Text style={styles.carPrice}>{formatPrice(price)}</Text>
          </View>
        </View>

        {/* Delivery */}
        <Text style={styles.section}>Delivery</Text>
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Ionicons name="home-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Home delivery</Text>
            <Text style={styles.rowSub}>KN 3 Rd, Kiyovu, Kigali · 1–2 days</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.green} />
        </View>

        {/* What happens next */}
        <Text style={styles.section}>What happens next</Text>
        <View style={styles.stepsCard}>
          {NEXT_STEPS.map((s, i) => (
            <View key={s.title} style={[styles.step, i < NEXT_STEPS.length - 1 && styles.stepBorder]}>
              <View style={styles.stepIcon}>
                <Ionicons name={s.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepSub}>{s.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Trust note */}
        <View style={styles.trustNote}>
          <Ionicons name="shield-checkmark" size={18} color={colors.green} />
          <Text style={styles.trustText}>
            150-point certified · 7-day return guarantee · No hidden fees
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Listing price</Text>
          <Text style={styles.footerValue}>{formatPrice(price)}</Text>
        </View>
        <Button
          title="Send Purchase Request"
          style={{ flex: 1 }}
          onPress={handleSendRequest}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 12,
  },
  thumb: { width: 84, height: 64, borderRadius: 12, backgroundColor: colors.border },
  carTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  carMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  carPrice: { fontSize: 16, fontWeight: '800', color: colors.primary, marginTop: 6 },
  section: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 22,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  stepsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  stepSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  trustNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.greenTint,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 16,
  },
  trustText: { flex: 1, fontSize: 12, color: colors.slate700, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  footerLabel: { fontSize: 12, color: colors.textSecondary },
  footerValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
});

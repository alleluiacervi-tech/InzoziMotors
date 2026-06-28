import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { colors, radius } from '../theme';
import { formatPrice } from '../data/cars';

const PAY = [
  { id: 'card', icon: 'card-outline', label: 'Visa •••• 4242' },
  { id: 'finance', icon: 'cash-outline', label: 'Finance · from $389/mo' },
];

export default function CheckoutScreen({ navigation, route }) {
  const car = route.params?.car;
  const [pay, setPay] = useState('card');
  const price = car.type === 'auction' ? car.currentBid : car.price;
  const fees = 499;
  const total = price + fees;

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Checkout" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
        {/* Car summary */}
        <View style={styles.summary}>
          <Image source={{ uri: car.image }} style={styles.thumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.carTitle}>{car.title}</Text>
            <Text style={styles.carMeta}>{car.seller}</Text>
            <Badge variant="success" label="Escrow protected" style={{ marginTop: 6 }} />
          </View>
        </View>

        {/* Delivery */}
        <Text style={styles.section}>Delivery</Text>
        <View style={styles.row}>
          <View style={styles.rowIcon}><Ionicons name="home-outline" size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Home delivery</Text>
            <Text style={styles.rowSub}>KN 3 Rd, Kiyovu, Kigali · 1-2 days</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.green} />
        </View>

        {/* Payment */}
        <Text style={styles.section}>Payment method</Text>
        {PAY.map((p) => (
          <Pressable key={p.id} style={[styles.row, pay === p.id && styles.rowOn]} onPress={() => setPay(p.id)}>
            <View style={styles.rowIcon}><Ionicons name={p.icon} size={20} color={colors.primary} /></View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>{p.label}</Text>
            <View style={[styles.radio, pay === p.id && styles.radioOn]}>
              {pay === p.id ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        ))}

        {/* Order summary */}
        <Text style={styles.section}>Order summary</Text>
        <View style={styles.orderCard}>
          <SummaryRow label="Vehicle price" value={formatPrice(price)} />
          <SummaryRow label="Inzozi service fee" value={formatPrice(fees)} />
          <SummaryRow label="Delivery" value="Free" valueColor={colors.green} />
          <View style={styles.divider} />
          <SummaryRow label="Total" value={formatPrice(total)} bold />
        </View>

        <View style={styles.guarantee}>
          <Ionicons name="shield-checkmark" size={18} color={colors.green} />
          <Text style={styles.guaranteeText}>7-day money-back guarantee. Funds held in escrow until you confirm.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerValue}>{formatPrice(total)}</Text>
        </View>
        <Button
          title="Confirm & Pay"
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('Main')}
        />
      </View>
    </Screen>
  );
}

function SummaryRow({ label, value, bold, valueColor }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryBold, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 12 },
  thumb: { width: 84, height: 64, borderRadius: 12, backgroundColor: colors.border },
  carTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  carMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  section: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginTop: 22, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.blueTint },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  orderCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  summaryBold: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 8 },
  guarantee: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.greenTint, borderRadius: radius.lg, padding: 14, marginTop: 16 },
  guaranteeText: { flex: 1, fontSize: 12, color: colors.slate700, lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: colors.borderSoft, backgroundColor: colors.surface },
  footerLabel: { fontSize: 12, color: colors.textSecondary },
  footerValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
});

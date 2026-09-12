import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';
import { ESCROW_GUARANTEE_INFO } from '../data/importCatalog';

export default function EscrowGuaranteeCard({ compact = false }) {
  const info = ESCROW_GUARANTEE_INFO;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.partnerBadge}>
            <Text style={styles.partnerBadgeText}>Regulated Partner Bank Escrow</Text>
          </View>
          <Text style={styles.title}>100% Escrow Protection Guarantee</Text>
          <Text style={styles.bankName}>{info.partnerBank}</Text>
        </View>
      </View>

      {/* Explainer */}
      <Text style={styles.body}>
        Your money is protected by law. The 50% initial commitment is deposited directly into our regulated
        escrow account and is only released after overseas pre-shipment inspection and container dispatch.
      </Text>

      {/* Milestones */}
      <View style={styles.milestones}>
        <View style={styles.milestoneItem}>
          <View style={styles.milestoneBadge}>
            <Text style={styles.milestonePercent}>50%</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.milestoneTitle}>Initial Sourcing Deposit</Text>
            <Text style={styles.milestoneSub}>Secured in Bank Escrow · Vehicle Sourced & Inspected</Text>
          </View>
        </View>

        <View style={styles.milestoneLine} />

        <View style={styles.milestoneItem}>
          <View style={[styles.milestoneBadge, styles.milestoneBadgeFinal]}>
            <Text style={[styles.milestonePercent, styles.milestonePercentFinal]}>50%</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.milestoneTitle}>Final Handover Settlement</Text>
            <Text style={styles.milestoneSub}>
              Due ONLY after arrival in Kigali & passing your physical 150-point inspection
            </Text>
          </View>
        </View>
      </View>

      {!compact && (
        <View style={styles.bullets}>
          {info.protectionPoints.map((point, index) => (
            <View key={index} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.greenText} style={{ marginTop: 2 }} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer reassurance */}
      <View style={styles.footer}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.greenText} />
        <Text style={styles.footerText}>Zero uncollateralized risk · Official Rwandan Commercial Contract</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0FDF4',
    borderRadius: radius.xl,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    marginVertical: 12,
  },
  cardCompact: {
    padding: 14,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 3,
  },
  partnerBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: colors.greenText,
    letterSpacing: 0.2,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: '#14532D',
  },
  bankName: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#166534',
    marginTop: 1,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#15803D',
    marginTop: 10,
  },
  milestones: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  milestoneLine: {
    height: 16,
    width: 2,
    backgroundColor: '#86EFAC',
    marginLeft: 17,
    marginVertical: 3,
  },
  milestoneBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestonePercent: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
    color: colors.greenText,
  },
  milestoneBadgeFinal: {
    backgroundColor: '#EFF6FF',
  },
  milestonePercentFinal: {
    color: '#1D4ED8',
  },
  milestoneTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  milestoneSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  bullets: {
    marginTop: 14,
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: '#166534',
  },
  footer: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.greenText,
  },
});

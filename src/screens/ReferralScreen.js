import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { useApp } from '../context/AppContext';
import referralsApi from '../api/referrals';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';

const HOW_IT_WORKS = [
  { icon: 'share-outline', step: '1', title: 'Share your code', desc: 'Send your unique referral code to friends who want to sell their car on Sawa.' },
  { icon: 'car-outline', step: '2', title: 'Friend submits a car', desc: 'When they submit their first car using your code, the referral is counted.' },
  { icon: 'pricetag-outline', step: '3', title: 'You save on fees', desc: 'You receive a 10% discount on your next listing fee, automatically applied.' },
];

const WHATSAPP_FEATURES = [
  { icon: 'checkmark-circle', text: 'Inspection appointment reminders (24h + 1h before)' },
  { icon: 'checkmark-circle', text: 'Listing live notification with a share link' },
  { icon: 'checkmark-circle', text: 'Buyer inquiry alerts — never miss a message' },
  { icon: 'checkmark-circle', text: 'Price drop alerts for saved cars' },
  { icon: 'checkmark-circle', text: 'Order status updates (confirmed, arranged, complete)' },
];

export default function ReferralScreen({ navigation }) {
  const { currentUser, isLoggedIn } = useApp();
  const [referral, setReferral] = useState(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  // The code is minted and owned by the server — a locally invented one would
  // not match anything when a friend tried to redeem it.
  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;
    referralsApi.getMine()
      .then((data) => { if (alive) setReferral(data); })
      .catch((err) => console.warn('Referral code unreachable:', err.message));
    return () => { alive = false; };
  }, [isLoggedIn]);

  const referralCode = referral?.code || '—';
  const referred = referral?.redemptions ?? 0;
  const hasCode = !!referral?.code;

  const handleShare = async () => {
    if (!hasCode) {
      showToast('Sign in so we can issue your referral code.', 'info');
      return;
    }
    try {
      await Share.share({
        message: `I use Sawa to sell cars in Kigali — certified, inspected, trusted. Sign up with my code ${referralCode} when you submit your car and we both save on fees. https://sawacars.com/ref/${referralCode}`,
        title: 'Join Sawa',
      });
    } catch (e) {
      showToast(`Referral code ${referralCode} — share it with friends!`, 'success');
    }
  };

  const handleRedeem = async () => {
    const code = redeemCode.trim().toUpperCase();
    if (!code) {
      showToast("Enter the code your friend shared with you.", 'error');
      return;
    }
    setRedeeming(true);
    try {
      await referralsApi.redeem(code);
      setRedeemCode('');
      showToast('Code applied — your discount lands on your next sale commission.', 'success');
    } catch (err) {
      showToast(err.message || 'That code could not be applied.', 'error');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Referral Program" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero */}
        <LinearGradient colors={[colors.navyMid, colors.navyDeep]} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="gift-outline" size={36} color={colors.greenLight} />
          </View>
          <Text style={styles.heroTitle}>Refer a seller,{'\n'}save on fees</Text>
          <Text style={styles.heroSub}>
            Every friend you refer who submits a car earns you a 10% discount on your next listing fee.
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Your referral code</Text>
            <Text style={styles.code}>{referralCode}</Text>
          </View>
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.shareBtnText}>Share via WhatsApp, SMS or link</Text>
          </Pressable>
        </LinearGradient>

        {/* Tracker */}
        <View style={styles.tracker}>
          <View style={styles.trackerItem}>
            <Text style={styles.trackerValue}>{referred}</Text>
            <Text style={styles.trackerLabel}>Friends referred</Text>
          </View>
          <View style={styles.trackerDivider} />
          <View style={styles.trackerItem}>
            <Text style={[styles.trackerValue, { color: colors.greenText }]}>{referral?.uses ?? 0}</Text>
            <Text style={styles.trackerLabel}>Times used</Text>
          </View>
          <View style={styles.trackerDivider} />
          <View style={styles.trackerItem}>
            <Text style={[styles.trackerValue, { color: colors.amberText }]}>{referred > 0 ? '10%' : '—'}</Text>
            <Text style={styles.trackerLabel}>Next discount</Text>
          </View>
        </View>

        {referred === 0 && (
          <View style={styles.emptyTracker}>
            <Text style={styles.emptyTrackerText}>No referrals yet — share your code to get started!</Text>
          </View>
        )}

        {/* Redeem someone else's code */}
        <Text style={styles.sectionTitle}>Got a code from a friend?</Text>
        <View style={styles.redeemCard}>
          <TextInput
            style={styles.redeemInput}
            placeholder="INZABC123"
            placeholderTextColor={colors.textMuted}
            value={redeemCode}
            onChangeText={setRedeemCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.redeemBtn, (!redeemCode.trim() || redeeming) && { opacity: 0.5 }]}
            onPress={handleRedeem}
            disabled={!redeemCode.trim() || redeeming}
          >
            <Text style={styles.redeemBtnText}>{redeeming ? 'Applying…' : 'Apply'}</Text>
          </Pressable>
        </View>
        <Text style={styles.redeemHint}>
          The discount applies to the commission on your next completed sale.
        </Text>

        {/* How it works */}
        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.stepsCard}>
          {HOW_IT_WORKS.map((item, i) => (
            <View key={i} style={[styles.step, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSoft }]}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{item.step}</Text>
              </View>
              <View style={styles.stepIcon}>
                <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{item.title}</Text>
                <Text style={styles.stepDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Reward details */}
        <View style={styles.rewardCard}>
          <View style={styles.rewardHeader}>
            <Ionicons name="trophy-outline" size={20} color={colors.amber} />
            <Text style={styles.rewardTitle}>Your reward</Text>
          </View>
          <Text style={styles.rewardValue}>10% off your next listing fee</Text>
          <Text style={styles.rewardSub}>
            Discount is automatically applied when your referee's car is accepted for inspection. No minimum — applies to your very next submission.
          </Text>
          <View style={styles.rewardNote}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
            <Text style={styles.rewardNoteText}>Referrals are only counted when the submitted car completes inspection. Self-referrals are not eligible.</Text>
          </View>
        </View>

        {/* WhatsApp Notifications concept */}
        <View style={styles.whatsappSection}>
          <View style={styles.whatsappHeader}>
            <View style={styles.whatsappIcon}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </View>
            <View>
              <Text style={styles.whatsappTitle}>Stay updated via WhatsApp</Text>
              <Text style={styles.whatsappSub}>Coming soon · Opt in from Settings</Text>
            </View>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Soon</Text>
            </View>
          </View>
          <View style={styles.whatsappFeatures}>
            {WHATSAPP_FEATURES.map((f, i) => (
              <View key={i} style={styles.whatsappFeature}>
                <Ionicons name={f.icon} size={14} color="#25D366" />
                <Text style={styles.whatsappFeatureText}>{f.text}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={styles.whatsappOptIn}
            onPress={() => showToast("WhatsApp alerts are coming soon — we'll notify you at launch.", 'info')}
          >
            <Ionicons name="notifications-outline" size={16} color="#25D366" />
            <Text style={styles.whatsappOptInText}>Notify me when WhatsApp alerts launch</Text>
          </Pressable>
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { margin: 16, borderRadius: radius.xxl, padding: 24, alignItems: 'center', gap: 10 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 26, fontFamily: fonts.black, color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  codeBox: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: radius.xl,
    padding: 14, alignItems: 'center', alignSelf: 'stretch',
  },
  codeLabel: { fontSize: 11, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 },
  code: { fontSize: 24, fontFamily: fonts.black, color: '#fff', letterSpacing: 2, marginTop: 4 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: radius.xl,
    paddingHorizontal: 20, paddingVertical: 12, alignSelf: 'stretch', justifyContent: 'center',
  },
  shareBtnText: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.primary },
  redeemCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16,
  },
  redeemInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: fonts.bold, letterSpacing: 1,
    color: colors.textPrimary,
  },
  redeemBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 20, paddingVertical: 13,
  },
  redeemBtnText: { fontSize: 14, fontFamily: fonts.bold, color: '#fff' },
  redeemHint: {
    fontSize: 11.5, color: colors.textMuted, lineHeight: 17,
    marginHorizontal: 16, marginTop: 8,
  },
  tracker: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, marginHorizontal: 16, marginBottom: 4, paddingVertical: 18,
    ...shadows.card,
  },
  trackerItem: { flex: 1, alignItems: 'center' },
  trackerValue: { fontSize: 28, fontFamily: fonts.black, color: colors.textPrimary },
  trackerLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  trackerDivider: { width: 1, backgroundColor: colors.borderSoft },
  emptyTracker: { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  emptyTrackerText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  sectionTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 16, marginTop: 16, marginBottom: 10 },
  stepsCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, marginHorizontal: 16, overflow: 'hidden', ...shadows.card,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumText: { fontSize: 12, fontFamily: fonts.extraBold, color: '#fff' },
  stepIcon: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.greenTint,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  stepDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
  rewardCard: {
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: colors.amber + '55',
    borderRadius: radius.xl, margin: 16, padding: 16,
  },
  rewardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rewardTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: '#92400E' },
  rewardValue: { fontSize: 20, fontFamily: fonts.black, color: '#92400E', marginBottom: 6 },
  rewardSub: { fontSize: 13, color: '#92400E', lineHeight: 19 },
  rewardNote: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 10 },
  rewardNoteText: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  whatsappSection: {
    backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#BBF7D0',
    borderRadius: radius.xl, margin: 16, padding: 16,
  },
  whatsappHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  whatsappIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#DCF8C6', alignItems: 'center', justifyContent: 'center',
  },
  whatsappTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: '#065F46' },
  whatsappSub: { fontSize: 11, color: '#059669', marginTop: 1 },
  comingSoonBadge: {
    marginLeft: 'auto', backgroundColor: '#059669',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  comingSoonText: { fontSize: 11, fontFamily: fonts.bold, color: '#fff' },
  whatsappFeatures: { gap: 8, marginBottom: 14 },
  whatsappFeature: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whatsappFeatureText: { fontSize: 13, color: '#065F46' },
  whatsappOptIn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#BBF7D0', borderRadius: radius.xl, padding: 12,
  },
  whatsappOptInText: { fontSize: 13, fontFamily: fonts.bold, color: '#059669' },
});

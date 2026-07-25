import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast } from '../components/Feedback';
import disputesApi from '../api/disputes';
import { useApp } from '../context/AppContext';

const STATUS_CONFIG = {
  open:     { label: 'Under review', color: colors.statusPending,  bg: colors.statusPendingBg,  icon: 'time-outline' },
  resolved: { label: 'Resolved',     color: colors.statusLive,     bg: colors.statusLiveBg,     icon: 'checkmark-circle-outline' },
  rejected: { label: 'Not upheld',   color: colors.statusRejected, bg: colors.statusRejectedBg, icon: 'close-circle-outline' },
};

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Mirrors the server's rule so the app only offers the option when it can
// actually succeed — the server is still the one that decides.
function daysLeftInWindow(completedAt) {
  if (!completedAt) return 0;
  const elapsed = Date.now() - new Date(completedAt).getTime();
  const left = Math.ceil((RETURN_WINDOW_MS - elapsed) / 86400000);
  return left > 0 ? left : 0;
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[styles.pillText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

export default function DisputesScreen({ navigation, route }) {
  const { purchaseRequests, isLoggedIn } = useApp();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pre-selected when the buyer arrives from a specific order
  const [selectedId, setSelectedId] = useState(route?.params?.handoverId || null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!isLoggedIn) { setLoading(false); return; }
    try {
      setDisputes(await disputesApi.getMine());
    } catch (err) {
      console.warn('Disputes unreachable:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { load(); }, [load]);

  // Only completed handovers still inside the 7-day window can be disputed,
  // and never one that already has an open case.
  const openHandoverIds = new Set(
    disputes.filter((d) => d.status === 'open').map((d) => d.handover_id)
  );
  const eligible = purchaseRequests.filter(
    (r) => r.status === 'complete' &&
      daysLeftInWindow(r.completedAt) > 0 &&
      !openHandoverIds.has(r.id)
  );

  const selected = eligible.find((r) => r.id === selectedId);

  const handleSubmit = async () => {
    if (!selected || !reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      await disputesApi.raise(selected.id, reason.trim());
      setReason('');
      setSelectedId(null);
      showToast('Dispute submitted — our team responds within 24 hours.', 'success');
      load();
    } catch (err) {
      showToast(err.message || 'Could not submit your dispute. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title="Disputes" onBack={() => navigation.goBack()} />
        <View style={styles.empty}>
          <Ionicons name="shield-half-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>Sign in to raise a dispute</Text>
          <Text style={styles.emptySub}>
            Disputes are tied to a completed handover, so we need to know which purchase you mean.
          </Text>
          <Button title="Sign In" onPress={() => navigation.navigate('SignIn')} style={{ marginTop: 20 }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Disputes" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.guaranteeCard}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={styles.guaranteeText}>
            Every car handed over at an Inzozi center carries a 7-day drive-it guarantee. If something
            is wrong, raise it here and our team mediates directly.
          </Text>
        </View>

        {/* Raise a new dispute */}
        {eligible.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Raise a dispute</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Which purchase?</Text>
              <View style={styles.handoverList}>
                {eligible.map((r) => {
                  const on = r.id === selectedId;
                  const left = daysLeftInWindow(r.completedAt);
                  return (
                    <Pressable
                      key={r.id}
                      style={[styles.handoverRow, on && styles.handoverRowOn]}
                      onPress={() => setSelectedId(on ? null : r.id)}
                    >
                      <Ionicons
                        name={on ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={on ? colors.primary : colors.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.handoverTitle}>{r.car?.title || 'Purchase'}</Text>
                        <Text style={styles.handoverMeta}>
                          {r.bookingRef ? `${r.bookingRef} · ` : ''}
                          {left} day{left === 1 ? '' : 's'} left in your window
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {selected && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>What went wrong?</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Describe the problem — what you found, when you noticed it, and what you'd like done."
                    placeholderTextColor={colors.textMuted}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    textAlignVertical="top"
                  />
                  <Button
                    title={submitting ? 'Submitting…' : 'Submit Dispute'}
                    icon="send-outline"
                    onPress={handleSubmit}
                    disabled={!reason.trim() || submitting}
                    style={{ marginTop: 14 }}
                  />
                </>
              )}
            </View>
          </>
        )}

        {/* History */}
        <Text style={styles.sectionTitle}>Your disputes</Text>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 24 }} />
        ) : disputes.length === 0 ? (
          <View style={styles.noneCard}>
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.green} />
            <Text style={styles.noneText}>
              {eligible.length > 0
                ? 'No disputes raised. Use the form above if something is wrong.'
                : 'No disputes — and nothing currently inside a return window.'}
            </Text>
          </View>
        ) : (
          disputes.map((d) => (
            <View key={d.id} style={styles.disputeCard}>
              <View style={styles.disputeHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.disputeCar}>{d.car_title}</Text>
                  <Text style={styles.disputeRef}>
                    {d.booking_id} · raised {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <StatusPill status={d.status} />
              </View>
              <Text style={styles.disputeReason}>{d.reason}</Text>
              {d.resolution ? (
                <View style={styles.resolutionBox}>
                  <Text style={styles.resolutionLabel}>Inzozi's response</Text>
                  <Text style={styles.resolutionText}>{d.resolution}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  guaranteeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 11,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14, marginTop: 4,
    ...shadows.card,
  },
  guaranteeText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, lineHeight: 19 },
  sectionTitle: {
    fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary,
    marginTop: 24, marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16,
    ...shadows.card,
  },
  fieldLabel: {
    fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  handoverList: { gap: 8 },
  handoverRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg, padding: 12,
  },
  handoverRowOn: { borderColor: colors.primary, backgroundColor: colors.blueTint },
  handoverTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.textPrimary },
  handoverMeta: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  textArea: {
    height: 110,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.textPrimary, lineHeight: 20,
  },
  noneCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16,
  },
  noneText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  disputeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, marginBottom: 10,
    ...shadows.card,
  },
  disputeHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  disputeCar: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  disputeRef: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  disputeReason: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 10 },
  resolutionBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg, padding: 12, marginTop: 12,
  },
  resolutionLabel: {
    fontSize: 10.5, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  resolutionText: { fontSize: 13, color: colors.textPrimary, lineHeight: 19, marginTop: 5 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill,
  },
  pillText: { fontSize: 10.5, fontFamily: fonts.bold },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  emptyTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 13.5, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 8 },
});

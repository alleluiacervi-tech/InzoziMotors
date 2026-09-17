import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Linking } from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import importsApi from '../api/imports';
import { captureImage } from '../utils/media';
import { showToast } from '../components/Feedback';
import { formatRWF } from '../data/marketData';
import { colors, radius, fonts } from '../theme';
import { useApp } from '../context/AppContext';

const SITE_URL = (Constants.expoConfig?.extra?.siteUrl || 'https://sawacars.com').replace(/\/+$/, '');

const GENERATED_DOCUMENT_LABELS = {
  import_quotation: 'Quotation',
  import_agreement: 'Service agreement',
  import_deposit_invoice: '50% deposit invoice',
};
const GENERATED_DOCUMENT_ORDER = ['import_quotation', 'import_agreement', 'import_deposit_invoice'];

export default function ImportOrderDetailScreen({ navigation, route }) {
  const { t } = useApp();
  const [id] = useState(route.params.id);
  const [order, setOrder] = useState(null);
  // Per-payment reference text, not one shared field — a single `ref` state
  // meant typing a reference for one milestone silently filled it in on every
  // other due milestone too. See docs/IMPORTS-AUDIT.md, P2.
  const [refs, setRefs] = useState({});
  const [busy, setBusy] = useState(false);

  const getStatusLabel = (status) => {
    const key = `importOrders.status_${status}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return status?.replaceAll('_', ' ') || '';
  };

  const load = useCallback(async () => {
    try {
      setOrder(await importsApi.get(id));
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function accept() {
    setBusy(true);
    try {
      await importsApi.acceptAgreement(id);
      showToast(t('importOrderDetail.agreementAccepted'), 'success');
      await load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function proof(payment) {
    const reference = (refs[payment.id] || '').trim();
    if (!reference) {
      showToast(t('importOrderDetail.enterRef'), 'error');
      return;
    }
    const image = await captureImage({ preset: 'document', title: t('importOrderDetail.paymentsTitle') });
    if (!image) return;
    setBusy(true);
    try {
      await importsApi.submitPaymentProof(id, payment.id, reference, image);
      showToast(t('importOrderDetail.proofSubmitted'), 'success');
      setRefs((prev) => ({ ...prev, [payment.id]: '' }));
      await load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return (
      <Screen>
        <BackHeader title={t('importOrderDetail.title')} onBack={() => navigation.goBack()} />
        <Text style={styles.loading}>{t('importOrderDetail.loading')}</Text>
      </Screen>
    );
  }

  const agreement = order.agreements?.[0];
  const generatedByKind = new Map((order.generated_documents || []).map((d) => [d.kind, d]));
  const anyGenerated = GENERATED_DOCUMENT_ORDER.some((kind) => generatedByKind.has(kind)) || (order.documents || []).length > 0;

  return (
    <Screen>
      <BackHeader title={order.order_ref} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>{getStatusLabel(order.status)}</Text>
        <Text style={styles.title}>{order.year || ''} {order.make} {order.model}</Text>
        <Text style={styles.meta}>{t('importOrderDetail.fromCountry', { country: order.origin_country })}</Text>
        {order.quoted_total_rwf ? (
          <Text style={styles.amount}>{formatRWF(Number(order.quoted_total_rwf))}</Text>
        ) : null}

        {agreement && !agreement.accepted_at ? (
          <View style={styles.card}>
            <Text style={styles.heading}>{t('importOrderDetail.agreementTitle')}</Text>
            <Text style={styles.body}>{agreement.terms_snapshot.terms}</Text>
            <Text style={styles.body}>
              {t('importOrderDetail.first50', { amount: formatRWF(Number(agreement.terms_snapshot.initial_payment_rwf)) })}{'\n'}
              {t('importOrderDetail.final50', { amount: formatRWF(Number(agreement.terms_snapshot.final_payment_rwf)) })}
            </Text>
            <Pressable disabled={busy} style={styles.primary} onPress={accept}>
              <Text style={styles.primaryText}>{t('importOrderDetail.acceptAgreement')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.heading}>{t('importOrderDetail.paymentsTitle')}</Text>
          {order.payments.map((p) => {
            const awaitingProof = ['due', 'rejected'].includes(p.status) && order.agreement_accepted_at;
            return (
              <View key={p.id} style={styles.payment}>
                <View>
                  <Text style={styles.paymentName}>{p.milestone.replaceAll('_', ' ')}</Text>
                  <Text style={styles.meta}>{p.status}</Text>
                </View>
                <Text style={styles.paymentAmount}>{formatRWF(Number(p.amount_rwf))}</Text>
                {p.status === 'rejected' && p.rejection_reason ? (
                  <Text style={styles.rejection}>{p.rejection_reason}</Text>
                ) : null}
                {/* The "pay now" card — closes the gap where a buyer accepted
                    the agreement and was told to pay "using the corporate
                    bank instructions displayed on your official order" while
                    no client ever displayed any. See docs/IMPORTS-AUDIT.md,
                    P0. */}
                {awaitingProof && p.payment_instructions ? (
                  <View style={styles.payNowCard}>
                    <Text style={styles.payNowTitle}>{t('importOrderDetail.payNow')}</Text>
                    <View style={styles.payNowRow}>
                      <Text style={styles.payNowLabel}>{t('importOrderDetail.bankName')}</Text>
                      <Text style={styles.payNowValue}>{p.payment_instructions.name}</Text>
                    </View>
                    {p.payment_instructions.account_name && p.payment_instructions.account_number ? (
                      <>
                        <View style={styles.payNowRow}>
                          <Text style={styles.payNowLabel}>{t('importOrderDetail.accountName')}</Text>
                          <Text style={styles.payNowValue}>{p.payment_instructions.account_name}</Text>
                        </View>
                        <View style={styles.payNowRow}>
                          <Text style={styles.payNowLabel}>{t('importOrderDetail.accountNumber')}</Text>
                          <Text style={styles.payNowValueMono}>{p.payment_instructions.account_number}</Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.payNowPending}>{t('importOrderDetail.bankDetailsPending')}</Text>
                    )}
                    <View style={styles.payNowRow}>
                      <Text style={styles.payNowLabel}>{t('importOrderDetail.paymentReference')}</Text>
                      <Text style={styles.payNowValueMono}>{p.reference}</Text>
                    </View>
                    <Text style={styles.payNowWarning}>{t('importOrderDetail.payNowWarning')}</Text>
                  </View>
                ) : null}
                {awaitingProof ? (
                  <View style={styles.proof}>
                    <TextInput
                      value={refs[p.id] || ''}
                      onChangeText={(value) => setRefs((prev) => ({ ...prev, [p.id]: value }))}
                      placeholder={t('importOrderDetail.bankTransferRef')}
                      style={styles.input}
                    />
                    <Pressable disabled={busy} style={styles.secondary} onPress={() => proof(p)}>
                      <Text style={styles.secondaryText}>{t('importOrderDetail.addProofPhoto')}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* No in-app PDF viewer exists on mobile today (see
            docs/IMPORTS-AUDIT.md) — the website already renders the same
            quotation, agreement and receipts securely, so this bridges to
            that rather than leaving generated documents invisible here. */}
        {anyGenerated ? (
          <View style={styles.card}>
            <Text style={styles.heading}>{t('importOrderDetail.documentsTitle')}</Text>
            {GENERATED_DOCUMENT_ORDER.map((kind) => {
              const doc = generatedByKind.get(kind);
              return (
                <View key={kind} style={styles.documentRow}>
                  <Text style={styles.paymentName}>{GENERATED_DOCUMENT_LABELS[kind]}</Text>
                  <Text style={styles.meta}>{doc ? `${doc.document_number} · v${doc.version}` : t('importOrderDetail.documentNotIssued')}</Text>
                </View>
              );
            })}
            <Pressable
              style={styles.linkButton}
              onPress={() => Linking.openURL(`${SITE_URL}/dashboard/imports/${id}`).catch(() => showToast(t('importOrderDetail.viewDocumentsOnWeb'), 'info'))}
            >
              <Text style={styles.linkButtonText}>{t('importOrderDetail.viewDocumentsOnWeb')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.heading}>{t('importOrderDetail.timelineTitle')}</Text>
          {order.events.map((e) => (
            <View key={e.id} style={styles.event}>
              <Text style={styles.paymentName}>{e.summary}</Text>
              <Text style={styles.meta}>{new Date(e.created_at).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 48 },
  loading: { padding: 30, fontFamily: fonts.medium, color: colors.textMuted },
  eyebrow: { fontFamily: fonts.extraBold, fontSize: 11, textTransform: 'uppercase', color: colors.primary },
  title: { marginTop: 7, fontFamily: fonts.extraBold, fontSize: 24, color: colors.textPrimary },
  meta: { marginTop: 3, fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  amount: { marginTop: 14, fontFamily: fonts.extraBold, fontSize: 24, color: colors.textPrimary },
  card: { marginTop: 16, padding: 16, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, backgroundColor: colors.surface },
  heading: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.textPrimary },
  body: { marginTop: 10, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  primary: { marginTop: 16, backgroundColor: colors.primary, borderRadius: radius.lg, padding: 13, alignItems: 'center' },
  primaryText: { fontFamily: fonts.bold, color: '#fff' },
  payment: { borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 13, marginTop: 13 },
  paymentName: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  paymentAmount: { position: 'absolute', right: 0, top: 13, fontFamily: fonts.extraBold, fontSize: 14, color: colors.textPrimary },
  rejection: { marginTop: 10, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.primary },
  payNowCard: { marginTop: 12, padding: 13, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.statusScheduledBg },
  payNowTitle: { fontFamily: fonts.extraBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.primary },
  payNowRow: { marginTop: 7, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  payNowLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  payNowValue: { fontFamily: fonts.bold, fontSize: 12, color: colors.textPrimary },
  payNowValueMono: { fontFamily: fonts.bold, fontSize: 12, color: colors.textPrimary },
  payNowPending: { marginTop: 7, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  payNowWarning: { marginTop: 10, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  proof: { marginTop: 12, gap: 8 },
  input: { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 12, fontFamily: fonts.regular },
  secondary: { height: 42, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: fonts.bold, color: colors.primary },
  documentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.borderSoft, marginTop: 9 },
  linkButton: { marginTop: 14, alignItems: 'center' },
  linkButtonText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  event: { borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 12, marginTop: 14 },
});

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import importsApi from '../api/imports';
import { captureImage } from '../utils/media';
import { showToast } from '../components/Feedback';
import { formatRWF } from '../data/marketData';
import { colors, radius, fonts } from '../theme';
import { useApp } from '../context/AppContext';

export default function ImportOrderDetailScreen({ navigation, route }) {
  const { t } = useApp();
  const [id] = useState(route.params.id);
  const [order, setOrder] = useState(null);
  const [ref, setRef] = useState('');
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
    if (!ref.trim()) {
      showToast(t('importOrderDetail.enterRef'), 'error');
      return;
    }
    const image = await captureImage({ preset: 'document', title: t('importOrderDetail.paymentsTitle') });
    if (!image) return;
    setBusy(true);
    try {
      await importsApi.submitPaymentProof(id, payment.id, ref.trim(), image);
      showToast(t('importOrderDetail.proofSubmitted'), 'success');
      setRef('');
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
          {order.payments.map((p) => (
            <View key={p.id} style={styles.payment}>
              <View>
                <Text style={styles.paymentName}>{p.milestone.replaceAll('_', ' ')}</Text>
                <Text style={styles.meta}>{p.status}</Text>
              </View>
              <Text style={styles.paymentAmount}>{formatRWF(Number(p.amount_rwf))}</Text>
              {['due', 'rejected'].includes(p.status) && order.agreement_accepted_at ? (
                <View style={styles.proof}>
                  <TextInput
                    value={ref}
                    onChangeText={setRef}
                    placeholder={t('importOrderDetail.bankTransferRef')}
                    style={styles.input}
                  />
                  <Pressable disabled={busy} style={styles.secondary} onPress={() => proof(p)}>
                    <Text style={styles.secondaryText}>{t('importOrderDetail.addProofPhoto')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>

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
  proof: { marginTop: 12, gap: 8 },
  input: { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 12, fontFamily: fonts.regular },
  secondary: { height: 42, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: fonts.bold, color: colors.primary },
  event: { borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: 12, marginTop: 14 },
});

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { ErrorState } from '../components/StateViews';
import { formatWon } from '../components/KoreaCarCard';
import { showToast } from '../components/Feedback';
import koreaApi from '../api/koreaImports';
import importsApi from '../api/imports';
import { formatRWF, formatUsdApprox } from '../data/marketData';
import { colors, radius, fonts } from '../theme';
import { useApp } from '../context/AppContext';

// One car for sale in South Korea.
//
// The card the buyer tapped is passed in, so the title, price and cover photo
// are on screen on the first frame; the full detail (every photo, the estimate)
// follows, and the Korean inspection report and accident record load last, so
// the provider can never delay the photos or the price.

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function Row({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Reports({ id, t }) {
  const [reports, setReports] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    koreaApi.reports(id).then((r) => { if (live) setReports(r); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [id]);

  const yn = (v) => (v ? t('korea.yes') : t('korea.no'));
  const part = (p) => (p?.status === 'ok' ? p.data : null);
  const note = (p) => (p?.status === 'none' ? t('korea.reportNone') : t('korea.reportUnavailable'));
  const ins = reports ? part(reports.inspection) : null;
  const rec = reports ? part(reports.record) : null;
  const money = (v) => (v ? ` (${formatWon(v)})` : '');

  return (
    <View style={styles.card}>
      <Text style={styles.h2}>{t('korea.reportsTitle')}</Text>
      <Text style={styles.small}>{t('korea.reportsLede')}</Text>
      {failed ? <Text style={styles.small}>{t('korea.reportUnavailable')}</Text> : !reports ? (
        <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />
      ) : (
        <>
          <Text style={styles.h3}>{t('korea.inspection')}</Text>
          {ins ? (
            <>
              {ins.accident !== undefined ? <Row label={t('korea.accidentFlag')} value={yn(ins.accident)} /> : null}
              {ins.simple_repair !== undefined ? <Row label={t('korea.simpleRepair')} value={yn(ins.simple_repair)} /> : null}
              <Row label={t('korea.inspectedOnLabel')} value={ins.inspected_on} />
            </>
          ) : <Text style={styles.small}>{note(reports.inspection)}</Text>}
          <Text style={styles.h3}>{t('korea.record')}</Text>
          {rec ? (
            <>
              <Row label={t('korea.recordAccidents')} value={rec.accident_count} />
              <Row label={t('korea.recordOwnDamage')} value={rec.own_damage_count !== undefined ? `${rec.own_damage_count}${money(rec.own_damage_cost_krw)}` : null} />
              <Row label={t('korea.recordOtherDamage')} value={rec.other_damage_count !== undefined ? `${rec.other_damage_count}${money(rec.other_damage_cost_krw)}` : null} />
              <Row label={t('korea.recordOwners')} value={rec.owner_change_count} />
              <Row label={t('korea.recordTotalLoss')} value={rec.total_loss_count} />
              <Row label={t('korea.recordFlood')} value={rec.flood_total_loss_count !== undefined || rec.flood_partial_loss_count !== undefined ? (rec.flood_total_loss_count || 0) + (rec.flood_partial_loss_count || 0) : null} />
              <Row label={t('korea.recordTheft')} value={rec.theft_count} />
              <Row label={t('korea.recordCommercial')} value={rec.commercial !== undefined ? yn(rec.commercial) : null} />
              <Row label={t('korea.recordFirst')} value={rec.first_registered} />
            </>
          ) : <Text style={styles.small}>{note(reports.record)}</Text>}
        </>
      )}
    </View>
  );
}

export default function KoreaCarDetailScreen({ navigation, route }) {
  const { t, user } = useApp();
  const { id } = route.params;
  const [car, setCar] = useState(route.params.car || null);
  const [detail, setDetail] = useState(null);
  const [state, setState] = useState(route.params.car ? 'idle' : 'loading'); // loading | idle | gone | error
  const [photoIndex, setPhotoIndex] = useState(0);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await koreaApi.get(id);
      if (d.available === false) { setState('gone'); return; }
      setDetail(d); setCar(d); setState('idle');
    } catch (e) {
      if (e.status === 404) setState('gone');
      else if (!route.params.car) setState('error');
    }
  }, [id, route.params.car]);
  useEffect(() => { load(); }, [load]);

  async function request() {
    if (!user) {
      Alert.alert(t('korea.signInTitle'), t('korea.signInBody'), [
        { text: t('korea.cancel'), style: 'cancel' },
        { text: t('korea.signIn'), onPress: () => navigation.navigate('SignIn') },
      ]);
      return;
    }
    setRequesting(true);
    try {
      const order = await importsApi.create({ encar_listing_id: id });
      showToast(t('korea.requested'), 'success');
      navigation.navigate('ImportOrderDetail', { id: order.id });
    } catch (e) {
      if (e.code === 'ALREADY_REQUESTED' && e.data?.order_id) {
        navigation.navigate('ImportOrderDetail', { id: e.data.order_id });
      } else if (e.code === 'LISTING_GONE') {
        setState('gone');
      } else {
        Alert.alert(t('korea.requestFailedTitle'), e.message || t('korea.requestFailed'));
      }
    } finally {
      setRequesting(false);
    }
  }

  if (state === 'gone') {
    return (
      <Screen>
        <BackHeader title={t('korea.title')} onBack={() => navigation.goBack()} />
        <ErrorState icon="car-outline" title={t('korea.goneTitle')} sub={t('korea.goneBody')} actionLabel={t('korea.backToList')} onAction={() => navigation.navigate('KoreaCars')} />
      </Screen>
    );
  }
  if (!car) {
    return (
      <Screen>
        <BackHeader title={t('korea.title')} onBack={() => navigation.goBack()} />
        {state === 'error'
          ? <ErrorState title={t('korea.loadError')} actionLabel={t('korea.retry')} onAction={() => { setState('loading'); load(); }} />
          : <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />}
      </Screen>
    );
  }

  const title = `${car.year} ${car.make} ${car.model}`;
  // The cover from the list shows at once; the full set replaces it when the detail lands.
  const photos = detail?.photos?.length ? detail.photos : (car.cover ? [car.cover] : []);
  const est = detail?.estimate || null;

  return (
    <Screen>
      <BackHeader title={title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.gallery}>
          <FlatList
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            data={photos} keyExtractor={(p) => p}
            initialNumToRender={1} windowSize={3}
            onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
            renderItem={({ item }) => (
              <ExpoImage source={{ uri: item }} style={styles.photo} contentFit="contain" cachePolicy="disk" transition={120} />
            )}
          />
          {photos.length > 1 ? <Text style={styles.counter}>{photoIndex + 1} / {photos.length}</Text> : null}
        </View>

        <View style={styles.pad}>
          <Text style={styles.title}>{title}</Text>
          {car.badge ? <Text style={styles.badge}>{car.badge}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.small}>{t('korea.koreanPriceTitle')}</Text>
            <Text style={styles.price}>{formatWon(car.price_krw)}</Text>
            {car.price_usd != null ? <Text style={styles.small}>{t('korea.approxUsd', { usd: formatUsdApprox(car.price_usd) })}</Text> : null}
            <Text style={[styles.small, { marginTop: 8 }]}>{t('korea.priceNote')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>{t('korea.estimateTitle')}</Text>
            {est ? (
              <>
                <Text style={styles.estimate}>{t('korea.estimateRange', { low: formatRWF(est.total_rwf.low), high: formatRWF(est.total_rwf.high) })}</Text>
                <Text style={styles.small}>{t('korea.estimateIncludes')}</Text>
                {est.engine_cc == null ? <Text style={styles.small}>{t('korea.estimateDuty')}</Text> : null}
              </>
            ) : <Text style={styles.small}>{t('korea.estimateNone')}</Text>}
          </View>

          <Pressable style={[styles.cta, requesting && { opacity: 0.6 }]} disabled={requesting} onPress={request} accessibilityRole="button">
            <Text style={styles.ctaText}>{requesting ? t('korea.requesting') : t('korea.requestCta')}</Text>
          </Pressable>
          <Text style={[styles.small, { marginTop: 8 }]}>{t('korea.requestBody')}</Text>

          <View style={styles.card}>
            <Row label={t('korea.year')} value={car.month ? `${car.year}/${String(car.month).padStart(2, '0')}` : String(car.year)} />
            <Row label={t('korea.mileage')} value={car.mileage_km != null ? t('korea.km', { km: Number(car.mileage_km).toLocaleString('en-US') }) : null} />
            <Row label={t('korea.fuel')} value={car.fuel} />
            <Row label={t('korea.transmission')} value={car.transmission} />
            <Row label={t('korea.color')} value={car.color} />
            <Row label={t('korea.power')} value={detail?.power_ps ? t('korea.powerValue', { ps: detail.power_ps }) : null} />
            <Row label={t('korea.seats')} value={detail?.seats} />
          </View>

          <Reports id={id} t={t} />
          <Text style={styles.disclaimer}>{t('korea.disclaimer')}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 48 },
  gallery: { backgroundColor: colors.surfaceAlt },
  photo: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75 },
  counter: { position: 'absolute', right: 12, bottom: 10, backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', fontFamily: fonts.bold, fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  pad: { padding: 16 },
  title: { fontFamily: fonts.extraBold, fontSize: 22, color: colors.textPrimary },
  badge: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, padding: 16, marginTop: 14 },
  price: { fontFamily: fonts.black, fontSize: 28, color: colors.primary, marginTop: 2 },
  estimate: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.textPrimary, marginTop: 6, marginBottom: 6 },
  h2: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.textPrimary },
  h3: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary, marginTop: 14, marginBottom: 2 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowLabel: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, color: colors.textSecondary },
  rowValue: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.textPrimary, textTransform: 'capitalize', textAlign: 'right' },
  cta: { marginTop: 16, backgroundColor: colors.primary, borderRadius: radius.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.extraBold, fontSize: 16, color: '#fff' },
  disclaimer: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 20 },
});

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import BrandMark from '../components/BrandMark';
import { ErrorState } from '../components/StateViews';
import { showToast } from '../components/Feedback';
import koreaApi from '../api/koreaImports';
import importsApi from '../api/imports';
import { colors, radius, fonts, shadows } from '../theme';
import { useApp } from '../context/AppContext';

// ─────────────────────────────────────────────────────────────────────────────
// The Korea market guide, one screen at three depths:
//   { }               every make for sale in Korea today, with its count
//   { make }          that make's model lines
//   { make, model }   count, price spread and recent listings, and a quote
//
// The same data as sawacars.com/imports/korea/market (backend
// lib/encar/market.js): the provider's free plan, which has counts and asking
// prices but no photos, cached a day or two on the server. Korean asking
// prices, before shipping and duty, and said so. Sawa is not the seller.
// ─────────────────────────────────────────────────────────────────────────────

const won = (man) => `₩${Math.round(man * 10000).toLocaleString('en-US')}`;
const wonCompact = (man) => `₩${(man / 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
const usd = (n) => (n == null ? null : `≈ $${(Math.round(n / (n >= 1000 ? 100 : 10)) * (n >= 1000 ? 100 : 10)).toLocaleString('en-US')}`);
// The name a brand badge should draw: "Chevrolet (GM Daewoo)" → "Chevrolet".
const markName = (label) => String(label || '').replace(/\s*\(.*\)\s*/g, '').split(' / ')[0].trim() || label;
const dateLabel = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function KoreaMarketScreen({ navigation, route }) {
  const { t, user, brandLogo } = useApp();
  const make = route.params?.make || null;
  const model = route.params?.model || null;
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = model ? await koreaApi.marketModel(make, model) : make ? await koreaApi.marketMake(make) : await koreaApi.market();
      setData(res);
      setState(res?.available === false ? 'off' : 'idle');
    } catch (err) {
      setState(err?.status === 404 ? 'missing' : 'error');
    }
  }, [make, model]);

  useEffect(() => { load(); }, [load]);

  const open = (params) => navigation.push('KoreaMarket', params);

  const requestQuote = () => {
    if (!user) {
      Alert.alert(t('importCatalog.signInTitle'), t('importCatalog.signInBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('importCatalog.signIn'), onPress: () => navigation.navigate('SignIn', { returnTo: 'KoreaMarket', returnParams: route?.params }) },
      ]);
      return;
    }
    const makeLabel = data.make_label || make;
    const modelLabel = data.model_label || model;
    Alert.alert(t('korea.market.ctaTitle', { make: makeLabel, model: modelLabel }), t('korea.market.ctaBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('korea.market.ctaConfirm'),
        onPress: async () => {
          setRequesting(true);
          try {
            const created = await importsApi.create({
              origin_country: 'South Korea',
              make: makeLabel,
              model: modelLabel,
              customer_notes: t('korea.market.ctaNote', {
                make: makeLabel,
                model: modelLabel,
                count: (data.total || 0).toLocaleString('en-US'),
                price: data.price_man ? wonCompact(data.price_man.median) : '—',
              }),
            });
            showToast(t('importCatalog.submitted'), 'success');
            navigation.navigate('ImportOrderDetail', { id: created.id });
          } catch (err) {
            Alert.alert(t('importCatalog.requestFailedTitle'), err.message || t('importCatalog.requestFailedBody'));
          } finally {
            setRequesting(false);
          }
        },
      },
    ]);
  };

  const title = model
    ? t('korea.market.modelTitle', { make: data?.make_label || make, model: data?.model_label || model })
    : make
      ? t('korea.market.modelsTitle', { make: data?.label || make })
      : t('korea.market.title');

  const footer = data && !data.pending ? (
    <View style={styles.footnote}>
      {data.fetched_at ? (
        <Text style={styles.footnoteText}>
          {data.stale ? t('korea.market.stale', { date: dateLabel(data.fetched_at) }) : t('korea.market.updated', { date: dateLabel(data.fetched_at) })}
        </Text>
      ) : null}
      <Text style={styles.footnoteText}>{t('korea.market.source')}</Text>
    </View>
  ) : null;

  let body;
  if (state === 'loading') {
    body = <ActivityIndicator style={styles.spinner} color={colors.primary} />;
  } else if (state === 'error') {
    body = <ErrorState title={t('korea.market.loadError')} actionLabel={t('korea.retry')} onAction={load} />;
  } else if (state === 'off' || state === 'missing') {
    body = <ErrorState icon="car-outline" title={t('korea.market.unavailable')} actionLabel={t('korea.backToList')} onAction={() => navigation.goBack()} />;
  } else if (data.pending) {
    body = <Text style={styles.pending}>{t('korea.market.pending')}</Text>;
  } else if (!make) {
    // Every make, with its count.
    body = (
      <FlatList
        data={data.makes || []}
        keyExtractor={(m) => m.make}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View style={styles.head}>
            <Text style={styles.eyebrow}>{t('korea.market.eyebrow')}</Text>
            <Text style={styles.lede}>{t('korea.market.lede')}</Text>
            <Text style={styles.total}>{t('korea.market.total', { count: (data.total || 0).toLocaleString('en-US') })}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.makeTile, pressed && styles.pressed]}
            onPress={() => open({ make: item.make })}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}, ${t('korea.market.cars', { count: item.count })}`}
          >
            <BrandMark name={markName(item.label)} logoUrl={brandLogo?.(markName(item.label))} size={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.tileName} numberOfLines={2}>{item.label}</Text>
              <Text style={styles.tileCount}>{t('korea.market.cars', { count: item.count.toLocaleString('en-US') })}</Text>
            </View>
          </Pressable>
        )}
        ListFooterComponent={footer}
      />
    );
  } else if (!model) {
    // One make's model lines.
    body = (
      <FlatList
        data={data.models || []}
        keyExtractor={(m) => m.model}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View style={[styles.head, styles.makeHead]}>
            <BrandMark name={markName(data.label || make)} logoUrl={brandLogo?.(markName(data.label || make))} size={48} />
            <Text style={styles.total}>{t('korea.market.total', { count: (data.total || 0).toLocaleString('en-US') })}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => open({ make: data.make || make, model: item.model })}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}, ${t('korea.market.cars', { count: item.count })}`}
          >
            <Text style={styles.rowName} numberOfLines={1}>{item.label}</Text>
            <Text style={styles.rowCount}>{t('korea.market.cars', { count: item.count.toLocaleString('en-US') })}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        )}
        ListFooterComponent={footer}
      />
    );
  } else {
    // One model: count, price spread, the quote, recent listings.
    const spread = data.price_man;
    const fuel = (f) => (f ? t(`korea.market.fuels.${f}`) : null);
    body = (
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.lede}>{t('korea.market.modelLede', { count: (data.total || 0).toLocaleString('en-US'), year: data.min_year || '' })}</Text>
        {spread ? (
          <>
            <View style={styles.stats}>
              {[
                [t('korea.market.low'), spread.min, data.price_usd?.min],
                [t('korea.market.typical'), spread.median, data.price_usd?.median],
                [t('korea.market.high'), spread.max, data.price_usd?.max],
              ].map(([label, man, dollars]) => (
                <View key={label} style={styles.stat}>
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={styles.statValue}>{wonCompact(man)}</Text>
                  {usd(dollars) ? <Text style={styles.statSub}>{usd(dollars)}</Text> : null}
                </View>
              ))}
            </View>
            <Text style={styles.note}>{t('korea.market.spreadNote', { count: data.sample || (data.listings || []).length })}</Text>
          </>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.pressed, requesting && styles.ctaBusy]}
          onPress={requestQuote}
          disabled={requesting}
          accessibilityRole="button"
        >
          {requesting ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.ctaText}>{t('korea.market.cta', { model: data.model_label || model })}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </Pressable>
        <Text style={styles.note}>{t('korea.market.ctaHint')}</Text>

        {(data.listings || []).length ? (
          <>
            <Text style={styles.section}>{t('korea.market.listingsTitle')}</Text>
            <View style={styles.card}>
              {data.listings.map((l, i) => (
                <View key={i} style={[styles.listing, i > 0 && styles.listingBorder]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.listingTitle} numberOfLines={1}>{l.year} {l.model}</Text>
                    <Text style={styles.listingMeta} numberOfLines={1}>
                      {[l.badge, l.mileage_km != null ? `${l.mileage_km.toLocaleString('en-US')} km` : null, fuel(l.fuel)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={styles.listingPrice}>
                    <Text style={styles.listingWon}>{won(l.price_man)}</Text>
                    {usd(l.price_usd) ? <Text style={styles.listingUsd}>{usd(l.price_usd)}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
        {footer}
      </ScrollView>
    );
  }

  return (
    <Screen>
      <BackHeader title={title} onBack={() => navigation.goBack()} />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 48 },
  spinner: { marginTop: 48 },
  head: { marginBottom: 14 },
  makeHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  lede: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  total: { marginTop: 10, fontFamily: fonts.extraBold, fontSize: 22, letterSpacing: -0.4, color: colors.textPrimary },
  pending: { margin: 16, padding: 16, borderRadius: radius.xl, backgroundColor: colors.surfaceAlt, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  gridRow: { gap: 10, marginBottom: 10 },
  makeTile: {
    flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  tileName: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  tileCount: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  sep: { height: 1, backgroundColor: colors.borderSoft },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowName: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  rowCount: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, padding: 12, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  statLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted },
  statValue: { marginTop: 4, fontFamily: fonts.extraBold, fontSize: 17, letterSpacing: -0.3, color: colors.textPrimary },
  statSub: { marginTop: 1, fontFamily: fonts.regular, fontSize: 11.5, color: colors.textMuted },
  note: { marginTop: 8, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  cta: {
    marginTop: 18, minHeight: 52, borderRadius: radius.lg, backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, ...shadows.card,
  },
  ctaBusy: { opacity: 0.7 },
  ctaText: { fontFamily: fonts.bold, fontSize: 15, color: '#fff' },
  section: { marginTop: 26, marginBottom: 10, fontFamily: fonts.extraBold, fontSize: 18, letterSpacing: -0.3, color: colors.textPrimary },
  card: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, paddingHorizontal: 14 },
  listing: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  listingBorder: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  listingTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  listingMeta: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  listingPrice: { alignItems: 'flex-end' },
  listingWon: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.textPrimary },
  listingUsd: { marginTop: 1, fontFamily: fonts.regular, fontSize: 11.5, color: colors.textMuted },
  footnote: { marginTop: 24, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.borderSoft, gap: 6 },
  footnoteText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted },
});

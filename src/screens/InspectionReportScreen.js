import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import CarZoneMap from '../components/CarZoneMap';
import ScoreRing from '../components/ScoreRing';
import { LoadingState, ErrorState } from '../components/StateViews';
import { colors, radius, shadows, fonts } from '../theme';
import { MOCK_INSPECTION_RESULT, buildReportFromApi } from '../data/inspectionData';
import inspectionsApi from '../api/inspections';
import { useApp } from '../context/AppContext';
import useReducedMotion from '../hooks/useReducedMotion';

const CATEGORY_ICONS = {
  engine:        'cog-outline',
  brakes:        'disc-outline',
  body:          'car-outline',
  interior:      'car-sport-outline',
  electronics:   'flash-outline',
  tyres:         'radio-button-on-outline',
  documentation: 'document-text-outline',
};

function ScoreCircle({ score, maxScore }) {
  const pct = score / maxScore;
  const certified = pct >= 0.88;
  return (
    <View style={styles.scoreCircleWrap}>
      <ScoreRing
        score={score}
        maxScore={maxScore}
        color={certified ? colors.green : colors.amber}
        trackColor="rgba(255,255,255,0.14)"
      />
      <Text style={styles.scorePct}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

// Bars fill in on mount, each a beat behind the last — the same read-order a
// person's eye takes down the list, rather than seven bars appearing at once.
const CATEGORY_STAGGER_MS = 70;

function CategoryRow({ cat, index, defaultExpanded, t }) {
  const [open, setOpen] = useState(defaultExpanded);
  const pct = cat.maxPts > 0 ? cat.earned / cat.maxPts : 0;
  const status = pct >= 1 ? 'pass' : pct >= 0.85 ? 'minor' : 'warn';
  const statusColor = status === 'pass' ? colors.green : status === 'minor' ? colors.amber : colors.statusRejected;
  const reducedMotion = useReducedMotion();
  const barProgress = useSharedValue(0);

  useEffect(() => {
    barProgress.value = reducedMotion
      ? 1
      : withDelay(index * CATEGORY_STAGGER_MS, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
  }, [reducedMotion, barProgress, index]);

  const barStyle = useAnimatedStyle(() => ({ width: `${barProgress.value * pct * 100}%` }));

  return (
    <Pressable style={styles.catRow} onPress={() => setOpen(!open)}>
      <View style={styles.catTop}>
        <View style={[styles.catIcon, { backgroundColor: statusColor + '18' }]}>
          <Ionicons name={CATEGORY_ICONS[cat.id] || 'checkmark-circle-outline'} size={18} color={statusColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.catName}>{cat.name}</Text>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { backgroundColor: statusColor }, barStyle]} />
          </View>
          {cat.flags.length > 0 && !open && (
            <Text style={styles.flagHint} numberOfLines={1}>
              ⚠ {cat.flags[0]}{cat.flags.length > 1 ? ` +${cat.flags.length - 1} more` : ''}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text style={[styles.catScore, { color: statusColor }]}>{cat.earned}<Text style={styles.catMax}>/{cat.maxPts}</Text></Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </View>
      </View>

      {open && cat.flags.length > 0 && (
        <View style={styles.flagsSection}>
          {cat.flags.map((flag, i) => (
            <View key={i} style={styles.flagRow}>
              <Ionicons name="alert-circle" size={14} color={colors.amber} />
              <Text style={styles.flagText}>{flag}</Text>
            </View>
          ))}
        </View>
      )}

      {open && cat.flags.length === 0 && (
        <View style={styles.allPassRow}>
          <Ionicons name="checkmark-circle" size={14} color={colors.green} />
          <Text style={styles.allPassText}>{t('inspection.passedAll')}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function InspectionReportScreen({ navigation, route }) {
  const car = route.params?.car;
  // Deep links (sawa://cars/<id>/inspection) carry carId, not a car object.
  const carId = String(route.params?.carId || car?.id || '');
  const { demoMode, t } = useApp();
  const isApiCar = carId.includes('-'); // UUID = real listing; '1'…'25' = bundled demo

  // The mock report exists for the demo catalogue in dev builds ONLY. A real
  // car whose report can't be fetched must say so — showing a fabricated
  // 143/150 "certified" result for a car nobody inspected is the one thing
  // this product can never do.
  const [data, setData] = useState(() => (!isApiCar && demoMode ? MOCK_INSPECTION_RESULT : null));
  const [failed, setFailed] = useState(false);
  const [selectedZoneRaw, setSelectedZone] = useState(null);

  useEffect(() => {
    if (!isApiCar) return;
    let alive = true;
    setFailed(false);
    const loadReport = car?.listingType === 'rental'
      ? inspectionsApi.getRentalReport(carId)
      : inspectionsApi.getReport(carId);
    loadReport
      .then((report) => {
        if (!alive) return;
        const mapped = buildReportFromApi(report);
        if (mapped) setData(mapped);
        else setFailed(true);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [carId, isApiCar, car?.listingType]);

  // No report to draw — loading spinner while the fetch is in flight, an
  // honest unavailable state on 404/outage. All hooks stay above this return.
  if (!data) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title={t('inspection.title')} onBack={() => navigation.goBack()} />
        {failed || !isApiCar ? (
          <ErrorState
            icon="document-text-outline"
            title={t('inspection.subtitle')}
            sub={t('settings.networkError')}
          />
        ) : (
          <LoadingState label={t('inspection.loadingChecklist')} />
        )}
      </Screen>
    );
  }

  const pct = data.score / data.maxScore;
  const certified = pct >= 0.88;
  const allFlags = data.categories.flatMap((c) => c.flags.map((f) => ({ cat: c.name, flag: f })));

  // Zone map: pre-select the first flagged category so the detail card
  // demonstrates itself the moment the screen opens
  const firstFlagged = data.categories.find((c) => c.flags.length > 0);
  const selectedZone = selectedZoneRaw || (firstFlagged ? firstFlagged.id : 'engine');
  const zoneCat = data.categories.find((c) => c.id === selectedZone) || data.categories[0];
  const zonePct = zoneCat.maxPts > 0 ? zoneCat.earned / zoneCat.maxPts : 0;
  const zoneStatus = zonePct >= 1 ? 'pass' : zonePct >= 0.85 ? 'minor' : 'warn';
  const zoneColor = zoneStatus === 'pass' ? colors.green : zoneStatus === 'minor' ? colors.amber : colors.statusRejected;

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('inspection.title')} onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <LinearGradient
          colors={certified ? [colors.navyMid, colors.navyDeep] : ['#7C2D12', '#3B0A07']}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <ScoreCircle score={data.score} maxScore={data.maxScore} />
            <View style={{ flex: 1, paddingLeft: 8 }}>
              <Text style={styles.heroTitle}>
                {certified ? t('inspection.statusPassed') : t('inspection.flagsPresent')}
              </Text>
              {car && <Text style={styles.heroCar}>{car.title || car.make + ' ' + car.model}</Text>}
              <Text style={styles.heroDate}>{data.inspector}</Text>
              <Text style={styles.heroDate}>{t('home.inspected', { score: data.score })}</Text>
            </View>
          </View>

          {certified ? (
            <View style={styles.certifiedBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#fff" />
              <Text style={styles.certifiedText}>{t('inspection.certifiedScoreNote')}</Text>
            </View>
          ) : (
            <View style={[styles.certifiedBadge, styles.warnBadge]}>
              <Ionicons name="alert-circle" size={16} color="#fff" />
              <Text style={styles.certifiedText}>{t('inspection.flagsPresent')}</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Interactive zone map ── */}
        <View style={styles.zoneCard}>
          <Text style={styles.zoneTitle}>{t('inspection.zoneMap')}</Text>
          <Text style={styles.zoneSub}>{t('inspection.zoneMapHint')}</Text>

          <CarZoneMap
            categories={data.categories}
            selected={selectedZone}
            onSelect={setSelectedZone}
          />

          {/* Documentation has no physical zone — dedicated row */}
          <Pressable
            style={[styles.docsRow, selectedZone === 'documentation' && styles.docsRowSelected]}
            onPress={() => setSelectedZone('documentation')}
          >
            <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.docsRowText}>{t('inspection.documentationAndRecords')}</Text>
            <View style={[styles.docsDot, {
              backgroundColor: (() => {
                const d = data.categories.find((c) => c.id === 'documentation');
                if (!d) return colors.textMuted;
                const p = d.maxPts > 0 ? d.earned / d.maxPts : 0;
                return p >= 1 ? colors.green : p >= 0.85 ? colors.amber : colors.statusRejected;
              })(),
            }]} />
          </Pressable>

          {/* Selected zone detail */}
          <View style={[styles.zoneDetail, { borderColor: zoneColor + '55' }]}>
            <View style={styles.zoneDetailHeader}>
              <Text style={styles.zoneDetailName}>{zoneCat.name}</Text>
              <Text style={[styles.zoneDetailScore, { color: zoneColor }]}>
                {zoneCat.earned}/{zoneCat.maxPts} pts
              </Text>
            </View>
            {zoneCat.flags.length > 0 ? (
              zoneCat.flags.map((flag, i) => (
                <View key={i} style={styles.zoneFlagRow}>
                  <Ionicons name="alert-circle" size={13} color={colors.amber} />
                  <Text style={styles.zoneFlagText}>{flag}</Text>
                </View>
              ))
            ) : (
              <View style={styles.zoneFlagRow}>
                <Ionicons name="checkmark-circle" size={13} color={colors.green} />
                <Text style={[styles.zoneFlagText, { color: colors.greenText }]}>
                  {t('inspection.passedAll')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick summary chips */}
        <View style={styles.chips}>
          <View style={styles.chip}>
            <Ionicons name="checkmark-circle" size={14} color={colors.green} />
            <Text style={styles.chipText}>{data.categories.filter((c) => c.flags.length === 0).length} {t('common.verified').toLowerCase()}</Text>
          </View>
          <View style={[styles.chip, allFlags.length > 0 && styles.chipAmber]}>
            <Ionicons name="alert" size={14} color={allFlags.length > 0 ? colors.amber : colors.green} />
            <Text style={[styles.chipText, allFlags.length > 0 && { color: colors.amberText }]}>
              {allFlags.length} {t('inspection.statusAttention').toLowerCase()}
            </Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="shield-checkmark" size={14} color={colors.green} />
            <Text style={styles.chipText}>{t('inspection.ptsChecked')}</Text>
          </View>
        </View>

        {/* Flagged items summary (if any) */}
        {allFlags.length > 0 && (
          <View style={styles.flagSummary}>
            <View style={styles.flagSummaryHeader}>
              <Ionicons name="alert-circle" size={16} color={colors.amber} />
              <Text style={styles.flagSummaryTitle}>{t('inspection.flagsPresent')} ({allFlags.length})</Text>
            </View>
            {allFlags.map((item, i) => (
              <View key={i} style={styles.flagSummaryRow}>
                <View style={styles.flagSummaryCat}>
                  <Text style={styles.flagSummaryCatText}>{item.cat}</Text>
                </View>
                <Text style={styles.flagSummaryFlag} numberOfLines={2}>{item.flag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Category breakdown */}
        <Text style={styles.sectionTitle}>{t('inspection.categoryBreakdown')}</Text>
        <View style={styles.categories}>
          {data.categories.map((cat, index) => (
            <CategoryRow key={cat.id} cat={cat} index={index} t={t} defaultExpanded={cat.flags.length > 0} />
          ))}
        </View>

        {/* What this means */}
        <View style={styles.explainer}>
          <Text style={styles.explainerTitle}>{t('inspection.whatMeansTitle')}</Text>
          <View style={styles.explainerRow}>
            <View style={[styles.explainerDot, { backgroundColor: colors.green }]} />
            <Text style={styles.explainerText}>{t('inspection.whatMeansDesc')}</Text>
          </View>
          <View style={styles.explainerRow}>
            <View style={[styles.explainerDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.explainerText}>{t('inspection.subtitle')}</Text>
          </View>
        </View>

        {/* Certification footer */}
        <View style={[styles.footer, certified && styles.footerCertified]}>
          <Ionicons
            name={certified ? 'shield-checkmark' : 'shield-outline'}
            size={20}
            color={certified ? colors.green : colors.textMuted}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.footerTitle, certified && styles.footerTitleCertified]}>
              {certified ? t('inspection.scoreGrade') : t('inspection.title')}
            </Text>
            <Text style={styles.footerSub}>
              {certified
                ? t('inspection.certifiedScoreNote')
                : t('inspection.flagsPresent')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { margin: 16, borderRadius: radius.xxl, padding: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  scoreCircleWrap: { alignItems: 'center', gap: 4 },
  scorePct: { fontSize: 12, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.7)' },
  heroTitle: { fontSize: 18, fontFamily: fonts.extraBold, color: '#fff', letterSpacing: -0.3 },
  heroCar: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  heroDate: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  certifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.green, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  warnBadge: { backgroundColor: colors.amber },
  certifiedText: { color: '#fff', fontSize: 13, fontFamily: fonts.bold },
  zoneCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16,
    ...shadows.card,
  },
  zoneTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  zoneSub: { fontSize: 12, color: colors.textMuted, marginTop: 3, marginBottom: 10 },
  docsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 12,
  },
  docsRowSelected: { borderColor: colors.primary, backgroundColor: colors.greenTint },
  docsRowText: { flex: 1, fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  docsDot: { width: 10, height: 10, borderRadius: 5 },
  zoneDetail: {
    marginTop: 12,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: 12, gap: 8,
  },
  zoneDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  zoneDetailName: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  zoneDetailScore: { fontSize: 14, fontFamily: fonts.extraBold },
  zoneFlagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  zoneFlagText: { flex: 1, fontSize: 12, color: colors.amberText, lineHeight: 17 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  chip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, paddingVertical: 10,
  },
  chipAmber: { backgroundColor: colors.amberTint, borderColor: colors.amber + '55' },
  chipText: { fontSize: 11, fontFamily: fonts.bold, color: colors.textSecondary },
  flagSummary: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.amberTint,
    borderWidth: 1, borderColor: colors.amber + '55',
    borderRadius: radius.xl, padding: 14, gap: 10,
  },
  flagSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flagSummaryTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.amberText },
  flagSummaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flagSummaryCat: {
    backgroundColor: colors.amber + '30', borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0,
  },
  flagSummaryCatText: { fontSize: 11, fontFamily: fonts.bold, color: colors.amberText },
  flagSummaryFlag: { flex: 1, fontSize: 12, color: colors.amberText, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary, paddingHorizontal: 16, marginBottom: 10 },
  categories: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  catRow: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 14,
    ...shadows.card,
  },
  catTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 6 },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: colors.border },
  barFill: { height: 4, borderRadius: 2 },
  flagHint: { fontSize: 11, color: colors.amberText, marginTop: 4 },
  catScore: { fontSize: 15, fontFamily: fonts.extraBold },
  catMax: { fontSize: 11, color: colors.textMuted, fontFamily: fonts.semiBold },
  flagsSection: { marginTop: 12, gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  flagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flagText: { flex: 1, fontSize: 12, color: colors.amberText, lineHeight: 18 },
  allPassRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  allPassText: { fontSize: 12, color: colors.greenText, fontFamily: fonts.semiBold },
  explainer: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, gap: 10,
  },
  explainerTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 4 },
  explainerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  explainerDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  explainerText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  footer: {
    marginHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16,
  },
  footerCertified: { borderColor: colors.green + '55', backgroundColor: colors.greenTint },
  footerTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary },
  footerTitleCertified: { color: colors.greenText },
  footerSub: { fontSize: 11, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle history: what was checked, what Sawa witnessed, and what NHTSA says
// about the model — each labelled for exactly what it is.
//
// Every fact comes from the API (GET /cars/:id/history and /model-safety). The
// screen used to present document checks made at the inspection center as
// "official RRA records", show an "Interpol & Police Database Check" with "no
// theft or police flags reported", and a "Previous owners: Pending" card. Sawa
// has no RRA, Interpol, police or registry feed, so none of that was true; it
// now says what was actually checked, and where we have no data, says so.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { LoadingState, ErrorState } from '../components/StateViews';
import { colors, radius, shadows, fonts } from '../theme';
import inspectionsApi from '../api/inspections';
import { formatPrice } from '../data/cars';
import { useApp } from '../context/AppContext';

const RECALLS_SHOWN = 4;

// NHTSA writes components in capitals ("ELECTRICAL SYSTEM:12V/24V/48V BATTERY").
// Sentence case reads as information rather than alarm.
const humanize = (component) => {
  const text = String(component || '').toLowerCase().replace(/\s*:\s*/g, ' · ').replace(/\b(\d+)v\b/g, '$1V');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const km = (value) => (value == null ? '—' : `${Math.round(Number(value)).toLocaleString('en-US')} km`);
const date = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const TONES = {
  pass: { icon: 'checkmark-circle', color: colors.greenText, labelKey: 'vehicleHistory.verified' },
  flag: { icon: 'alert-circle', color: colors.amberText, labelKey: 'vehicleHistory.needsAttention' },
  fail: { icon: 'close-circle', color: colors.statusRejected, labelKey: 'vehicleHistory.failed' },
  unknown: { icon: 'remove-circle-outline', color: colors.textMuted, labelKey: 'vehicleHistory.notVerified' },
};
const toneOf = (verdict) => (verdict === 'pass' || verdict === 'flag' || verdict === 'fail' ? verdict : 'unknown');

function CheckRow({ label, verdict, valueWhenPassed, value, t, last }) {
  const tone = TONES[toneOf(verdict)];
  const text = value || (toneOf(verdict) === 'pass' && valueWhenPassed ? valueWhenPassed : t(tone.labelKey));
  return (
    <View style={[styles.checkRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.checkLabel}>{label}</Text>
      <View style={styles.checkValueWrap}>
        <Ionicons name={tone.icon} size={16} color={tone.color} />
        <Text style={[styles.checkValue, { color: tone.color }]}>{text}</Text>
      </View>
    </View>
  );
}

function eventText(event, t) {
  const reading = event.km != null ? t('vehicleHistory.kmRead', { km: km(event.km) }) : null;
  switch (event.type) {
    case 'submitted': return { title: t('vehicleHistory.submitted'), detail: null };
    case 'inspected': return { title: t('vehicleHistory.inspected'), detail: reading };
    case 'earlier_inspection': return { title: t('vehicleHistory.earlierInspection'), detail: reading };
    case 'listed': return { title: t('vehicleHistory.listed'), detail: null };
    case 'price_changed':
      return {
        title: t('vehicleHistory.priceChanged', { price: formatPrice(event.price) }),
        detail: event.previous_price != null ? t('vehicleHistory.priceWas', { price: formatPrice(event.previous_price) }) : null,
      };
    default: return { title: String(event.type), detail: null };
  }
}

function SawaRecord({ record, t }) {
  const { odometer, events } = record;
  if (!events.length && !odometer.readings.length) return null;
  const thisListing = [...odometer.readings].reverse().find((r) => r.this_listing);
  const mismatch = thisListing && odometer.declared_km != null
    && Math.abs(odometer.declared_km - thisListing.km) > Math.max(1000, Math.round(thisListing.km * 0.05));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('vehicleHistory.recordTitle')}</Text>
      <View style={styles.card}>
        <Text style={styles.cardIntro}>{t('vehicleHistory.recordSub')}</Text>

        {odometer.consistent === false && odometer.drops.length ? (
          <View style={styles.dropBox} accessibilityRole="alert">
            <View style={styles.inlineRow}>
              <Ionicons name="alert-circle" size={17} color={colors.amberText} />
              <Text style={styles.dropTitle}>{t('vehicleHistory.dropTitle')}</Text>
            </View>
            {odometer.drops.map((drop) => (
              <Text key={`${drop.earlier_on}-${drop.later_on}`} style={styles.dropText}>
                {t('vehicleHistory.drop', {
                  earlier: km(drop.earlier_km), earlierDate: date(drop.earlier_on),
                  later: km(drop.later_km), laterDate: date(drop.later_on),
                })}
              </Text>
            ))}
            <Text style={styles.dropAsk}>{t('vehicleHistory.dropAsk')}</Text>
          </View>
        ) : odometer.consistent === true ? (
          <View style={[styles.inlineRow, styles.statusLine]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.greenText} />
            <Text style={[styles.statusText, { color: colors.greenText }]}>
              {t('vehicleHistory.consistent', { count: odometer.readings.length })}
            </Text>
          </View>
        ) : odometer.readings.length === 1 ? (
          <View style={[styles.inlineRow, styles.statusLine]}>
            <Ionicons name="speedometer-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.statusText}>
              {t('vehicleHistory.oneReading', { km: km(odometer.readings[0].km), date: date(odometer.readings[0].on) })}
            </Text>
          </View>
        ) : null}

        {mismatch ? (
          <View style={[styles.inlineRow, styles.statusLine]}>
            <Ionicons name="alert-circle" size={16} color={colors.amberText} />
            <Text style={[styles.statusText, { color: colors.amberText }]}>
              {t('vehicleHistory.declared', { declared: km(odometer.declared_km), read: km(thisListing.km) })}
            </Text>
          </View>
        ) : null}

        {events.length ? (
          <View style={styles.timeline}>
            {events.map((event, index) => {
              const { title, detail } = eventText(event, t);
              const last = index === events.length - 1;
              const earlier = event.type === 'earlier_inspection';
              return (
                <View key={`${event.type}-${event.on}-${index}`} style={styles.eventRow}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, earlier && styles.dotHollow]} />
                    {!last ? <View style={styles.railLine} /> : null}
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{title}</Text>
                    <Text style={styles.eventMeta}>{date(event.on)}{detail ? ` · ${detail}` : ''}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ModelSafety({ data, t }) {
  const [open, setOpen] = useState(null);
  if (!data || data.status !== 'covered') return null;
  const recallsKnown = data.recalls_known !== false && data.recall_count != null;
  const { complaints, rating } = data;
  if (!recallsKnown && !complaints && !rating) return null;
  const recalls = data.recalls || [];
  const { vehicle } = data;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('vehicleHistory.safetyEyebrow')}</Text>
      <View style={styles.card}>
        <Text style={styles.safetyTitle}>
          {t('vehicleHistory.safetyTitle', { year: vehicle.year, make: vehicle.make, model: vehicle.model })}
        </Text>
        <View style={styles.statRow}>
          {recallsKnown ? (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t('vehicleHistory.recalls')}</Text>
              <Text style={styles.statValue}>{data.recall_count ? data.recall_count : t('vehicleHistory.none')}</Text>
            </View>
          ) : null}
          {complaints ? (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t('vehicleHistory.complaints')}</Text>
              <Text style={styles.statValue}>{complaints.total.toLocaleString('en-US')}</Text>
            </View>
          ) : null}
          {rating ? (
            <View style={styles.stat} accessibilityLabel={`${t('vehicleHistory.rating')}: ${rating.max} / 5`}>
              <Text style={styles.statLabel}>{t('vehicleHistory.rating')}</Text>
              <View style={styles.inlineRow}>
                <Text style={styles.statValue}>{rating.min === rating.max ? rating.max : `${rating.min}–${rating.max}`}</Text>
                <Ionicons name="star" size={15} color={colors.textPrimary} style={{ marginLeft: 3, marginTop: 2 }} />
              </View>
            </View>
          ) : null}
        </View>

        {recallsKnown && recalls.length ? (
          <View style={styles.subBlock}>
            <Text style={styles.subTitle}>{t('vehicleHistory.recallsTitle')}</Text>
            {recalls.slice(0, RECALLS_SHOWN).map((recall) => {
              const expanded = open === recall.campaign;
              return (
                <Pressable
                  key={recall.campaign}
                  onPress={() => setOpen(expanded ? null : recall.campaign)}
                  style={styles.recall}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                >
                  <View style={styles.recallHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recallComponent}>{humanize(recall.component)}</Text>
                      <Text style={styles.eventMeta}>
                        {recall.reported_on ? `${date(recall.reported_on)} · ` : ''}{recall.campaign}
                      </Text>
                    </View>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                  </View>
                  {expanded ? (
                    <View style={{ marginTop: 8, gap: 6 }}>
                      <Text style={styles.recallText}>{recall.summary}</Text>
                      {recall.remedy ? (
                        <Text style={styles.recallText}>
                          <Text style={{ fontFamily: fonts.bold, color: colors.textPrimary }}>{t('vehicleHistory.remedy')}: </Text>
                          {recall.remedy}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
            {(data.recall_count ?? recalls.length) > RECALLS_SHOWN ? (
              <Text style={styles.eventMeta}>
                {t('vehicleHistory.moreRecalls', { count: (data.recall_count ?? recalls.length) - RECALLS_SHOWN })}
              </Text>
            ) : null}
          </View>
        ) : null}

        {complaints && complaints.top_components.length ? (
          <View style={styles.subBlock}>
            <Text style={styles.subTitle}>{t('vehicleHistory.complaintAreas')}</Text>
            <View style={styles.chips}>
              {complaints.top_components.map((item) => (
                <View key={item.component} style={styles.chip}>
                  <Text style={styles.chipText}>{humanize(item.component)}</Text>
                  <Text style={styles.chipCount}>{item.count}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.inlineRow, styles.safetyNote]}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} style={{ marginTop: 1 }} />
          <Text style={styles.noteText}>{t('vehicleHistory.safetyDisclaimer')}</Text>
        </View>
      </View>
    </View>
  );
}

export default function VehicleHistoryScreen({ navigation, route }) {
  const car = route.params?.car;
  const { t } = useApp();
  const isApiCar = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(car?.id || '');
  const [history, setHistory] = useState(null);
  const [safety, setSafety] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isApiCar) return undefined;
    let alive = true;
    setFailed(false);
    inspectionsApi.getVehicleHistory(car.id)
      .then((h) => { if (alive) setHistory(h); })
      .catch(() => { if (alive) setFailed(true); });
    // Separate and optional: a slow or failed NHTSA lookup only hides its card.
    inspectionsApi.getModelSafety(car.id)
      .then((s) => { if (alive) setSafety(s); })
      .catch(() => {});
    return () => { alive = false; };
  }, [car?.id, isApiCar, attempt]);

  if (!history) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title={t('vehicleHistory.title')} onBack={() => navigation.goBack()} />
        {failed || !isApiCar ? (
          <ErrorState
            icon="document-text-outline"
            title={t('vehicleHistory.title')}
            sub={t('settings.networkError')}
            actionLabel={isApiCar ? t('common.retry') : undefined}
            onAction={isApiCar ? () => setAttempt((n) => n + 1) : undefined}
          />
        ) : (
          <LoadingState label={t('common.loading')} />
        )}
      </Screen>
    );
  }

  const chassis = history.vin_masked || history.vin;
  const checks = [
    { key: 'duty', label: t('vehicleHistory.importDuty'), verdict: history.rra_duty_paid, valueWhenPassed: t('vehicleHistory.dutySeen') },
    { key: 'reg', label: t('vehicleHistory.registration'), verdict: history.registration },
    { key: 'service', label: t('vehicleHistory.serviceHistory'), verdict: history.service_history },
    { key: 'ins', label: t('vehicleHistory.insurance'), verdict: history.insurance_valid, valueWhenPassed: t('vehicleHistory.validAtInspection') },
    {
      key: 'odo',
      label: t('vehicleHistory.odometer'),
      verdict: history.mileage_verified ? 'pass' : 'unknown',
      value: history.mileage_verified
        ? t('vehicleHistory.odoChecked', { km: km(history.mileage) })
        : t('vehicleHistory.odoNotVerified', { km: km(history.mileage) }),
    },
    { key: 'acc', label: t('vehicleHistory.accidents'), verdict: 'unknown', value: t('vehicleHistory.noAccidentData') },
  ];

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('vehicleHistory.title')} onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>{car?.title || [history.year, history.make, history.model].join(' ')}</Text>
          {chassis ? (
            <View style={styles.inlineRow}>
              <Ionicons name="id-card-outline" size={13} color={colors.textMuted} />
              <Text style={styles.headerMetaText}>{chassis}</Text>
            </View>
          ) : null}
          <View style={styles.inlineRow}>
            <Ionicons
              name={history.vin_verified ? 'checkmark-circle' : 'remove-circle-outline'}
              size={14}
              color={history.vin_verified ? colors.greenText : colors.textMuted}
            />
            <Text style={[styles.headerMetaText, { color: history.vin_verified ? colors.greenText : colors.textMuted }]}>
              {history.vin_verified ? t('vehicleHistory.chassisMatches') : t('vehicleHistory.chassisNotVerified')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('vehicleHistory.paperwork')}</Text>
          <View style={[styles.card, { paddingVertical: 4 }]}>
            <Text style={[styles.cardIntro, { marginTop: 10 }]}>{t('vehicleHistory.paperworkSub')}</Text>
            {checks.map((check, index) => (
              <CheckRow key={check.key} {...check} t={t} last={index === checks.length - 1} />
            ))}
          </View>
        </View>

        {history.sawa_record ? <SawaRecord record={history.sawa_record} t={t} /> : null}

        <ModelSafety data={safety} t={t} />

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.disclaimerText}>{t('vehicleHistory.coverage')}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    margin: 16, marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16, gap: 8,
    ...shadows.card,
  },
  headerTitle: { fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary },
  headerMetaText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 10, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 16,
    ...shadows.card,
  },
  cardIntro: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary, lineHeight: 18 },
  checkRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft,
    gap: 4,
  },
  checkLabel: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textMuted },
  checkValueWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  checkValue: { flex: 1, fontSize: 14, fontFamily: fonts.semiBold, lineHeight: 19 },
  statusLine: { marginTop: 12, alignItems: 'flex-start' },
  statusText: { flex: 1, fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary, lineHeight: 18 },
  dropBox: {
    marginTop: 12, padding: 12, borderRadius: radius.lg,
    backgroundColor: colors.amberTint, borderWidth: 1, borderColor: colors.amber + '40', gap: 6,
  },
  dropTitle: { flex: 1, fontSize: 13, fontFamily: fonts.extraBold, color: colors.amberText },
  dropText: { fontSize: 13, fontFamily: fonts.medium, color: colors.textPrimary, lineHeight: 19 },
  dropAsk: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary, lineHeight: 18 },
  timeline: { marginTop: 16 },
  eventRow: { flexDirection: 'row', gap: 12 },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.textPrimary, marginTop: 4 },
  dotHollow: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.textMuted },
  railLine: { flex: 1, width: 1, backgroundColor: colors.border, marginTop: 2 },
  eventBody: { flex: 1, paddingBottom: 14 },
  eventTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  eventMeta: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 2 },
  safetyTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 10 },
  statLabel: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted },
  statValue: { fontSize: 18, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 2 },
  subBlock: { marginTop: 16, gap: 8 },
  subTitle: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.textPrimary },
  recall: {
    borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.lg,
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 48,
  },
  recallHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  recallComponent: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  recallText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  chipText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textSecondary },
  chipCount: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted },
  safetyNote: { marginTop: 14, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, lineHeight: 16 },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg, padding: 14,
  },
  disclaimerText: { flex: 1, fontSize: 11, fontFamily: fonts.medium, color: colors.textSecondary, lineHeight: 17 },
});

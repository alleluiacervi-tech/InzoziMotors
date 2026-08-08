import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius, shadows, fonts } from '../theme';
import { VEHICLE_HISTORY } from '../data/inspectionData';
import inspectionsApi from '../api/inspections';
import { useApp } from '../context/AppContext';

function HistoryCard({ icon, iconBg, iconColor, title, value, sub, verified, warn }) {
  return (
    <View style={[styles.card, warn && styles.cardWarn, verified && styles.cardVerified]}>
      <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={[styles.cardValue, warn && { color: colors.amber }, verified && { color: colors.green }]}>
          {value}
        </Text>
        {sub ? <Text style={styles.cardSub}>{sub}</Text> : null}
      </View>
      {verified !== undefined && (
        <View style={[styles.verifyBadge, warn ? styles.verifyBadgeWarn : styles.verifyBadgeOk]}>
          <Ionicons
            name={verified && !warn ? 'checkmark-circle' : warn ? 'alert-circle' : 'close-circle'}
            size={18}
            color={verified && !warn ? colors.green : warn ? colors.amber : colors.statusRejected}
          />
        </View>
      )}
    </View>
  );
}

function RRAStamp({ paid, note }) {
  return (
    <LinearGradient
      colors={paid ? [colors.navyMid, colors.navyDeep] : ['#3B0A07', '#7C2D12']}
      style={styles.rraCard}
    >
      <View style={styles.rraLeft}>
        <View style={styles.rraIconWrap}>
          <Ionicons name="ribbon" size={28} color={paid ? colors.greenLight : '#F87171'} />
        </View>
        <View>
          <Text style={styles.rraLabel}>Rwanda Revenue Authority</Text>
          <Text style={styles.rraTitle}>{paid ? 'Import Duty — PAID' : 'Import Duty — NOT VERIFIED'}</Text>
          <Text style={styles.rraSub}>{note || (paid ? 'Duty proof checked at inspection' : 'Duty status could not be verified')}</Text>
        </View>
      </View>
      <View style={[styles.rraStamp, !paid && styles.rraStampWarn]}>
        <Text style={styles.rraStampText}>{paid ? '✓ PAID' : '? UNVERIFIED'}</Text>
      </View>
    </LinearGradient>
  );
}

export default function VehicleHistoryScreen({ navigation, route }) {
  const car = route.params?.car;
  const carId = car?.id || 'default';
  const { demoMode } = useApp();
  const isApiCar = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(car?.id || '');

  // API cars (UUID ids) get the real history from the backend, mapped onto the
  // screen's shape from API facts ONLY — never padded with the bundled demo
  // record, whose invented RRA stamp / insurance / chassis number used to be
  // spread over every response. Fields the backend doesn't know are rendered
  // as unknown, not faked. The bundled records serve the demo catalogue in
  // dev builds only.
  const [apiHistory, setApiHistory] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!isApiCar) return;
    let alive = true;
    inspectionsApi.getVehicleHistory(car.id)
      .then((h) => {
        if (!alive) return;
        setApiHistory({
          owners: null, // not in any Rwandan registry we can query yet
          ownerLabel: 'Not on record yet',
          accidents: null,
          accidentLabel: h.accident_history || 'No insurance-partner data yet',
          mileageVerified: !!h.mileage_verified,
          mileageNote: h.mileage_verified
            ? 'Odometer verified at the 150-pt inspection'
            : 'Not yet verified — inspection pending',
          importOrigin: h.import_origin || 'Unknown',
          importYear: h.year,
          importNote: h.drive_side ? `${h.drive_side} drive` : '',
          rraDutyPaid: h.rra_duty_paid === 'pass',
          rraDutyNote: `RRA duty check at inspection: ${h.rra_duty_paid || 'unknown'}`,
          insuranceActive: h.insurance_valid === 'pass',
          insuranceNote: `Insurance check at inspection: ${h.insurance_valid || 'unknown'}`,
          chassisNumber: h.vin || 'Not on record',
          vinVerified: !!h.vin_verified,
          serviceHistory: h.service_history === 'pass',
          lastService: h.service_history === 'pass' ? 'Records checked at inspection' : 'Not on record',
        });
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [car?.id, isApiCar]);

  const demoHistory = demoMode ? (VEHICLE_HISTORY[carId] || VEHICLE_HISTORY.default) : null;
  const history = apiHistory || (isApiCar ? null : demoHistory);

  if (!history) {
    return (
      <Screen background={colors.bg}>
        <BackHeader title="Vehicle History" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
          {failed || !isApiCar ? (
            <>
              <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
              <Text style={{ fontSize: 16, fontFamily: fonts.extraBold, color: colors.textPrimary }}>
                History not available
              </Text>
              <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center' }}>
                We couldn&apos;t load the history report for this car. Check your connection and try again.
              </Text>
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary }}>
                Loading vehicle history…
              </Text>
            </>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Vehicle History" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Car header */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>{car?.title || 'Vehicle History Report'}</Text>
          <View style={styles.headerMeta}>
            <Ionicons name="id-card-outline" size={13} color={colors.textMuted} />
            <Text style={styles.headerMetaText}>Chassis: {history.chassisNumber}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Ionicons name="shield-checkmark" size={13} color={history.vinVerified ? colors.green : colors.amber} />
            <Text style={[styles.headerMetaText, { color: history.vinVerified ? colors.green : colors.amber }]}>
              {history.vinVerified ? 'VIN verified against all documents' : 'VIN not yet verified'}
            </Text>
          </View>
        </View>

        {/* RRA Duty Stamp */}
        <View style={styles.section}>
          <RRAStamp paid={history.rraDutyPaid} note={history.rraDutyNote} />
        </View>

        {/* History cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ownership & Condition</Text>
          <View style={styles.cards}>
            <HistoryCard
              icon="people-outline"
              iconBg={colors.greenTint}
              iconColor={colors.primary}
              title="Previous Owners"
              value={history.ownerLabel}
              sub={history.owners == null
                ? 'Ownership records are not yet queryable in Rwanda'
                : history.owners === 1 ? 'No ownership changes since new' : `${history.owners} registered owners in history`}
              verified={history.owners == null ? undefined : history.owners <= 1}
              warn={history.owners != null && history.owners > 2}
            />
            <HistoryCard
              icon="alert-circle-outline"
              iconBg={history.accidents === 0 ? colors.greenTint : colors.amberTint}
              iconColor={history.accidents === 0 ? colors.primary : colors.amber}
              title="Accident History"
              value={history.accidentLabel}
              sub={history.accidents == null
                ? 'Insurance-partner data is not yet connected'
                : history.accidents === 0
                  ? 'No insurance claims found in Rwanda database'
                  : 'Sourced from Rwandan insurance partners'}
              verified={history.accidents == null ? undefined : history.accidents === 0}
              warn={history.accidents != null && history.accidents > 0}
            />
            <HistoryCard
              icon="speedometer-outline"
              iconBg={colors.greenTint}
              iconColor={colors.primary}
              title="Mileage Verification"
              value={history.mileageVerified ? 'Odometer Verified' : 'Mileage Discrepancy'}
              sub={history.mileageNote}
              verified={history.mileageVerified}
              warn={!history.mileageVerified}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import & Registration</Text>
          <View style={styles.cards}>
            <HistoryCard
              icon="earth-outline"
              iconBg={colors.greenTint}
              iconColor={colors.primary}
              title="Import Origin"
              value={`Imported from ${history.importOrigin}`}
              sub={history.importNote}
            />
            <HistoryCard
              icon="document-text-outline"
              iconBg={history.serviceHistory ? colors.greenTint : colors.amberTint}
              iconColor={history.serviceHistory ? colors.primary : colors.amber}
              title="Service History"
              value={history.serviceHistory ? 'Records Present' : 'Incomplete Records'}
              sub={`Last serviced: ${history.lastService}`}
              verified={history.serviceHistory}
              warn={!history.serviceHistory}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insurance Status</Text>
          <View style={styles.cards}>
            <HistoryCard
              icon="shield-checkmark-outline"
              iconBg={history.insuranceActive ? colors.greenTint : colors.statusRejectedBg}
              iconColor={history.insuranceActive ? colors.primary : colors.statusRejected}
              title="Insurance Certificate"
              value={history.insuranceActive ? 'Active & Valid' : 'Expired or Not Found'}
              sub={history.insuranceNote}
              verified={history.insuranceActive}
              warn={!history.insuranceActive}
            />
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.disclaimerText}>
            Accident history is sourced from Rwandan insurance partner data. Incidents not claimed via insurance may not appear. Import duty status is verified directly with Rwanda Revenue Authority (RRA).
          </Text>
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
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerMetaText: { fontSize: 12, color: colors.textSecondary },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 10, marginTop: 4 },
  cards: { gap: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl, padding: 14,
    ...shadows.card,
  },
  cardWarn: { borderColor: colors.amber + '55', backgroundColor: colors.amberTint },
  cardVerified: { borderColor: colors.green + '44' },
  cardIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  cardValue: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary, marginTop: 2 },
  cardSub: { fontSize: 11, color: colors.textSecondary, marginTop: 3, lineHeight: 16 },
  verifyBadge: { padding: 2 },
  verifyBadgeOk: {},
  verifyBadgeWarn: {},
  rraCard: { borderRadius: radius.xl, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  rraLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rraIconWrap: {
    width: 52, height: 52, borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rraLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: fonts.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  rraTitle: { fontSize: 15, fontFamily: fonts.extraBold, color: '#fff', marginTop: 2 },
  rraSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  rraStamp: {
    width: 62, height: 62, borderRadius: 31,
    borderWidth: 2.5, borderColor: colors.greenLight,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  rraStampWarn: { borderColor: '#F87171' },
  rraStampText: { fontSize: 10, fontFamily: fonts.black, color: '#fff', textAlign: 'center', letterSpacing: 0.3 },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginTop: 4,
    backgroundColor: colors.greenTint,
    borderRadius: radius.lg, padding: 14,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: colors.primary, lineHeight: 17 },
});

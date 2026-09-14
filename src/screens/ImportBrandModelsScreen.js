// ─────────────────────────────────────────────────────────────────────────────
// Every model a marque builds, brand new.
//
// The point of this screen is completeness: someone who taps Hyundai is asking
// what Hyundai makes, and a partial answer is the bug being fixed. So the whole
// range is listed, grouped by body style so twenty-two models stay readable,
// and nothing is hidden behind a "show more".
//
// No prices appear here, and that is deliberate rather than unfinished. Import
// pricing is set per order by the exporter and the week; the catalogue this
// replaced printed hand-typed figures nobody stood behind. A model shows what
// is true about it and offers to get the rest.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import BrandMark from '../components/BrandMark';
import { colors, radius, fonts, spacing, typography, shadows } from '../theme';
import { importCatalogModelsForMake } from '../data/importCatalog';

// Small to large, then the commercial shapes. A buyer scanning a marque reads
// down a size gradient; alphabetical would interleave a pickup with a hatchback.
const BODY_ORDER = ['Hatchback', 'Sedan', 'SUV', 'MPV', 'Van', 'Pickup', 'Truck', 'Bus'];

const FUEL_ICON = {
  Electric: 'flash-outline',
  Hybrid: 'leaf-outline',
  Diesel: 'water-outline',
  Petrol: 'speedometer-outline',
};

function ModelRow({ item, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.make} ${item.model}, ${item.bodyType}, ${item.fuelTypes.join(' or ')}`}
    >
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{item.model}</Text>
        <View style={styles.fuelRow}>
          {item.fuelTypes.map((fuel) => (
            <View key={fuel} style={styles.fuelChip}>
              <Ionicons
                name={FUEL_ICON[fuel] || 'ellipse-outline'}
                size={11}
                color={colors.textSecondary}
              />
              <Text style={styles.fuelText}>{fuel}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.rowEnd}>
        <Text style={styles.newBadge}>0 km</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function ImportBrandModelsScreen({ route, navigation }) {
  const make = route?.params?.make;
  const models = useMemo(() => importCatalogModelsForMake(make), [make]);

  const sections = useMemo(() => {
    const byBody = new Map();
    for (const m of models) {
      if (!byBody.has(m.bodyType)) byBody.set(m.bodyType, []);
      byBody.get(m.bodyType).push(m);
    }
    // A body style the data uses but BODY_ORDER does not know about must still
    // appear — sorting it to the end beats dropping the models silently.
    return [...byBody.entries()]
      .sort((a, b) => {
        const ai = BODY_ORDER.indexOf(a[0]);
        const bi = BODY_ORDER.indexOf(b[0]);
        return (ai === -1 ? BODY_ORDER.length : ai) - (bi === -1 ? BODY_ORDER.length : bi);
      })
      .map(([title, data]) => ({ title, data }));
  }, [models]);

  const origin = models[0]?.originCountry;

  return (
    <Screen>
      <BackHeader title={make || 'Brand'} onBack={() => navigation.goBack()} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <BrandMark name={make} size={52} />
            <View style={styles.headerText}>
              <Text style={styles.headerCount}>
                {models.length} {models.length === 1 ? 'model' : 'models'}
              </Text>
              {origin ? <Text style={styles.headerOrigin}>Sourced from {origin}</Text> : null}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <ModelRow
            item={item}
            onPress={() => navigation.navigate('ImportVehicleDetail', { item })}
          />
        )}
        ListFooterComponent={
          <Text style={styles.footerNote}>
            All vehicles are brand new and unregistered. Price depends on the
            trim, the exporter and the shipping week, so we quote each order
            individually — open a model to request yours.
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerText: { flex: 1 },
  headerCount: { ...typography.h4, color: colors.textPrimary },
  headerOrigin: { ...typography.cardMeta, color: colors.textSecondary, marginTop: 2 },
  sectionHeader: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: { opacity: 0.7 },
  rowBody: { flex: 1 },
  rowName: { ...typography.bodyStrong, color: colors.textPrimary },
  fuelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  fuelChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fuelText: { ...typography.micro, color: colors.textSecondary },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  newBadge: { ...typography.micro, color: colors.green, letterSpacing: 0.3 },
  footerNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xl, lineHeight: 18 },
});

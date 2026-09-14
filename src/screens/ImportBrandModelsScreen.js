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
import Photo from '../components/Photo';
import { PHOTO } from '../utils/photo';
import { colors, radius, fonts, spacing, typography, shadows } from '../theme';
import useImportCatalog from '../hooks/useImportCatalog';
import { useApp } from '../context/AppContext';

// Small to large, then the commercial shapes. A buyer scanning a marque reads
// down a size gradient; alphabetical would interleave a pickup with a hatchback.
const BODY_ORDER = ['Hatchback', 'Sedan', 'SUV', 'MPV', 'Van', 'Pickup', 'Truck', 'Bus'];

const FUEL_ICON = {
  Electric: 'flash-outline',
  Hybrid: 'leaf-outline',
  Diesel: 'water-outline',
  Petrol: 'speedometer-outline',
};

// Two layouts, because the content genuinely differs.
//
// With studio renders resolved, the car is the thing being shopped for and it
// deserves the space: a two-up grid where the vehicle fills the card. At the
// 76x52 a row affords, a render is an illegible smudge — which is worse than no
// picture, because it looks like the app tried.
//
// With no renders — the state until a render licence exists — a grid would be
// twenty-two identical lettermarks, an expanse of repeated logo carrying no
// information. A compact row is the right shape for a list of names, so that is
// what a brand without pictures gets.
function ModelCard({ item, onPress }) {
  const picture = (Array.isArray(item.images) && item.images[0]) || item.renderUrl;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.make} ${item.model}, ${item.bodyType}, ${item.fuelTypes.join(' or ')}`}
    >
      {/* White, not the warm surface: every render is cut out on white, so any
          other ground draws a visible rectangle around the car. */}
      <View style={styles.cardImage}>
        <Photo
          uri={picture}
          width={PHOTO.CARD}
          style={styles.cardImageInner}
          contentFit="contain"
          recyclingKey={item.id}
        />
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>0 km</Text>
        </View>
      </View>
      {/* Fixed height: fuel chips wrap to one line or two depending on the model,
          and without this the cards in a row end up different heights. */}
      <View style={styles.cardBody}>
        <Text style={styles.rowName} numberOfLines={1}>{item.model}</Text>
        <View style={styles.fuelRow}>
          {item.fuelTypes.slice(0, 3).map((fuel) => (
            <View key={fuel} style={styles.fuelChip}>
              <Text style={styles.fuelText}>{fuel}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function ModelRow({ item, logoUrl, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
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
  const { brandLogo } = useApp();
  const make = route?.params?.make;
  const models = useImportCatalog(make);

  // One picture in the marque is enough to switch: a half-illustrated grid still
  // reads as a showroom, whereas a half-illustrated row list reads as broken.
  const illustrated = useMemo(
    () => models.some((m) => m.renderUrl || (Array.isArray(m.images) && m.images.length)),
    [models],
  );

  const sections = useMemo(() => {
    const byBody = new Map();
    for (const m of models) {
      if (!byBody.has(m.bodyType)) byBody.set(m.bodyType, []);
      byBody.get(m.bodyType).push(m);
    }
    // A body style the data uses but BODY_ORDER does not know about must still
    // appear — sorting it to the end beats dropping the models silently.
    const ordered = [...byBody.entries()].sort((a, b) => {
      const ai = BODY_ORDER.indexOf(a[0]);
      const bi = BODY_ORDER.indexOf(b[0]);
      return (ai === -1 ? BODY_ORDER.length : ai) - (bi === -1 ? BODY_ORDER.length : bi);
    });

    return ordered.map(([title, models_]) => {
      if (!illustrated) return { title, count: models_.length, data: models_ };
      const pairs = [];
      for (let i = 0; i < models_.length; i += 2) pairs.push(models_.slice(i, i + 2));
      return { title, count: models_.length, data: pairs };
    });
  }, [models, illustrated]);

  const origin = models[0]?.originCountry;

  return (
    <Screen>
      <BackHeader title={make || 'Brand'} onBack={() => navigation.goBack()} />

      <SectionList
        sections={sections}
        keyExtractor={(item, i) => (illustrated ? `pair-${i}-${item[0]?.id}` : item.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <BrandMark name={make} logoUrl={brandLogo(make)} size={52} />
            <View style={styles.headerText}>
              <Text style={styles.headerCount}>
                {models.length} {models.length === 1 ? 'model' : 'models'}
              </Text>
              {origin ? <Text style={styles.headerOrigin}>Sourced from {origin}</Text> : null}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.count}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const open = () => navigation.navigate('ImportVehicleDetail', { item });
          if (!illustrated) {
            return <ModelRow item={item} logoUrl={brandLogo(item.make)} onPress={open} />;
          }
          // A one-per-row FlatList rendering pairs, rather than numColumns: a
          // section list cannot change column count per section, and the pairs
          // keep the body-style grouping intact.
          return (
            <View style={styles.pairRow}>
              {item.map((model) => (
                <ModelCard key={model.id} item={model} onPress={() => navigation.navigate('ImportVehicleDetail', { item: model })} />
              ))}
              {item.length === 1 ? <View style={styles.cardSpacer} /> : null}
            </View>
          );
        }}
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionCount: {
    ...typography.micro,
    color: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  sectionHeader: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  pairRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardSpacer: { flex: 1 },
  cardImage: {
    aspectRatio: 16 / 10,
    width: '100%',
    // White, matching the render's own cut-out ground, so no rectangle appears
    // around the car. The warm surface tint is for empty boxes, not full ones.
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageInner: { width: '100%', height: '100%' },
  cardBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.greenTint,
  },
  cardBadgeText: { ...typography.micro, color: colors.green, letterSpacing: 0.3 },
  // Fixed, so two cards in a row match whether their fuel chips wrap or not.
  cardBody: { height: 62, paddingHorizontal: 11, paddingTop: 9 },
  rowBody: { flex: 1 },
  rowName: { ...typography.bodyStrong, color: colors.textPrimary },
  fuelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  fuelChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fuelText: { ...typography.micro, color: colors.textSecondary },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  newBadge: { ...typography.micro, color: colors.green, letterSpacing: 0.3 },
  footerNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xl, lineHeight: 18 },
});

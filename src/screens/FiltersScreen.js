import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Button from '../components/Button';
import StickyFooter from '../components/StickyFooter';
import { useApp } from '../context/AppContext';
import BrandMark from '../components/BrandMark';
import { colors, radius, fonts } from '../theme';

// The filter options are DERIVED from the cars actually on the marketplace, not
// hardcoded. The old lists named Tesla and Ford — neither of which Sawa has ever
// listed — while omitting Suzuki and Isuzu, which are everywhere on Kigali
// roads. A filter list that does not match the inventory fails twice over: it
// offers brands that return nothing, and it hides brands that are really there,
// so a genuine Peugeot listing becomes unreachable by filtering.
//
// Deriving them also means the sellers' new freedom to type any make (see
// components/ChipSelect) can never leave a car unfilterable.
const distinct = (cars, pick) => [...new Set(
  (cars || []).map(pick).filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim())
)].sort((a, b) => a.localeCompare(b));
const PRICE_PRESETS = [
  { labelKey: 'anyPrice', value: null },
  { labelKey: 'under10m', value: 10000000 },
  { labelKey: 'under20m', value: 20000000 },
  { labelKey: 'under35m', value: 35000000 },
  { labelKey: 'under50m', value: 50000000 },
];

// A ceiling with no floor is half a price filter. "Under RWF 10M" was the
// tightest band available in a market where most of the inventory sits below
// it, so the commonest search — "I have eight to twelve million" — could not be
// expressed at all.
const MIN_PRICE_PRESETS = [
  { labelKey: 'noMinimum', value: null },
  { labelKey: 'min5m', value: 5000000 },
  { labelKey: 'min10m', value: 10000000 },
  { labelKey: 'min20m', value: 20000000 },
  { labelKey: 'min35m', value: 35000000 },
];

// Year and mileage are the two questions every used-car buyer asks before
// price, and neither was on this screen — while the API has accepted min_year
// and max_year the whole time.
const YEAR_PRESETS = [
  { labelKey: 'anyYear', value: null },
  { labelKey: 'newer', value: 2020 },
  { labelKey: 'newer', value: 2015 },
  { labelKey: 'newer', value: 2010 },
];

const MILEAGE_PRESETS = [
  { labelKey: 'anyMileage', value: null },
  { labelKey: 'underMileage', value: 50000 },
  { labelKey: 'underMileage', value: 100000 },
  { labelKey: 'underMileage', value: 150000 },
];

// The one filter no competitor in this market can offer. It turns the 150-point
// inspection from a badge a buyer looks at into a tool a buyer operates.
const SCORE_PRESETS = [
  { labelKey: 'anyScore', value: null },
  { labelKey: 'scorePlus', value: 140 },
  { labelKey: 'scorePlus', value: 130 },
  { labelKey: 'scorePlus', value: 120 },
];

const EMPTY = {
  make: null, body: null, fuel: null, transmission: null, location: null,
  maxPrice: null, minPrice: null, minYear: null, maxMileage: null, minScore: null,
};

function Chip({ label, active, onPress, mark }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipOn]} onPress={onPress}>
      {mark}
      <Text style={[styles.chipText, { color: active ? '#fff' : colors.slate600 }]}>{label}</Text>
    </Pressable>
  );
}

export default function FiltersScreen({ navigation, route }) {
  const { cars, makes, t } = useApp();
  const [selected, setSelected] = useState(
    route.params?.filters || EMPTY
  );

  const MAKES = useMemo(() => distinct(cars, (c) => c.make), [cars]);
  const BODY = useMemo(() => distinct(cars, (c) => c.category), [cars]);
  const FUEL = useMemo(() => distinct(cars, (c) => c.fuel), [cars]);
  const TRANSMISSION = useMemo(() => distinct(cars, (c) => c.transmission), [cars]);
  // What the Map screen was reaching for, done in the one place buyers already
  // narrow things down. That screen listed six hardcoded Kigali neighbourhoods
  // and counted cars into them from a demo lookup keyed by '1'…'25', so every
  // real listing landed in none of them and every pin read zero. These chips
  // come from the locations sellers actually typed, so they always match stock.
  const LOCATIONS = useMemo(() => distinct(cars, (c) => c.location), [cars]);

  // Brand -> logo, for the make chips. A Map because the makes list is served
  // and the chips come from the catalogue, so the two are matched by name at
  // render time rather than being the same array.
  const markFor = useMemo(() => {
    const byName = new Map(makes.map((m) => [String(m.name).toLowerCase(), m]));
    const byAlias = new Map();
    for (const m of makes) {
      for (const alias of m.aliases || []) byAlias.set(String(alias).toLowerCase(), m);
    }
    return (name) => {
      const key = String(name || '').toLowerCase();
      return byName.get(key) || byAlias.get(key) || null;
    };
  }, [makes]);

  const toggle = (group, val) =>
    setSelected((s) => ({ ...s, [group]: s[group] === val ? null : val }));

  const getMatchingCount = () => {
    let list = cars;
    // Lower-cased through a helper because any of these can be missing on a
    // record — a car with no fuel type recorded used to crash this screen on
    // `undefined.toLowerCase()` the moment anyone tapped a fuel chip.
    const same = (value, want) => String(value || '').toLowerCase() === String(want).toLowerCase();
    if (selected.make) list = list.filter((c) => same(c.make, selected.make));
    if (selected.body) list = list.filter((c) => same(c.category, selected.body));
    if (selected.fuel) list = list.filter((c) => same(c.fuel, selected.fuel));
    if (selected.transmission) list = list.filter((c) => same(c.transmission, selected.transmission));
    // `includes`, matching the server's ILIKE: "Kicukiro" has to find
    // "Kicukiro, Kigali" or the count here disagrees with the results screen.
    if (selected.location) {
      list = list.filter((c) => String(c.location || '').toLowerCase()
        .includes(String(selected.location).toLowerCase()));
    }
    const priceOf = (c) => (c.type === 'auction' ? c.currentBid : c.price);
    if (selected.maxPrice) list = list.filter((c) => priceOf(c) <= selected.maxPrice);
    if (selected.minPrice) list = list.filter((c) => priceOf(c) >= selected.minPrice);
    if (selected.minYear) list = list.filter((c) => Number(c.year) >= selected.minYear);
    if (selected.maxMileage) list = list.filter((c) => Number(c.mileage ?? Infinity) <= selected.maxMileage);
    if (selected.minScore) list = list.filter((c) => Number(c.inspectionScore || 0) >= selected.minScore);
    return list.length;
  };

  return (
    <Screen background={colors.surface}>
      <View style={styles.head}>
        <Text style={styles.h1}>{t('filters.filters')}</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Ionicons name="close" size={26} color={colors.slate700} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={styles.label}>{t('filters.price')}</Text>
        <View style={styles.chips}>
          {PRICE_PRESETS.map((p) => (
            <Chip
              key={p.labelKey + p.value}
              label={p.labelKey === 'under10m' ? t('filters.underPrice', { amount: '10M' }) : p.labelKey === 'under20m' ? t('filters.underPrice', { amount: '20M' }) : p.labelKey === 'under35m' ? t('filters.underPrice', { amount: '35M' }) : p.labelKey === 'under50m' ? t('filters.underPrice', { amount: '50M' }) : t(`filters.${p.labelKey}`)}
              active={selected.maxPrice === p.value}
              onPress={() => setSelected((s) => ({ ...s, maxPrice: p.value }))}
            />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 22 }]}>{t('filters.minimumPrice')}</Text>
        <View style={styles.chips}>
          {MIN_PRICE_PRESETS.map((p) => (
              <Chip key={p.labelKey + p.value} label={p.labelKey === 'noMinimum' ? t('filters.noMinimum') : t('filters.minPrice', { amount: String(p.value / 1000000) })} active={selected.minPrice === p.value}
                  onPress={() => setSelected((s) => ({ ...s, minPrice: p.value }))} />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 22 }]}>{t('filters.year')}</Text>
        <View style={styles.chips}>
          {YEAR_PRESETS.map((p) => (
            <Chip key={p.labelKey + p.value} label={p.value == null ? t('filters.anyYear') : t('filters.newer', { year: p.value })} active={selected.minYear === p.value}
                  onPress={() => setSelected((s) => ({ ...s, minYear: p.value }))} />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 22 }]}>{t('filters.mileage')}</Text>
        <View style={styles.chips}>
          {MILEAGE_PRESETS.map((p) => (
            <Chip key={p.labelKey + p.value} label={p.value == null ? t('filters.anyMileage') : t('filters.underMileage', { mileage: p.value.toLocaleString() })} active={selected.maxMileage === p.value}
                  onPress={() => setSelected((s) => ({ ...s, maxMileage: p.value }))} />
          ))}
        </View>

        {/* Nobody else in this market can offer this one. */}
        <Text style={[styles.label, { marginTop: 22 }]}>{t('filters.inspectionScore')}</Text>
        <View style={styles.chips}>
          {SCORE_PRESETS.map((p) => (
            <Chip key={p.labelKey + p.value} label={p.value == null ? t('filters.anyScore') : t('filters.scorePlus', { score: p.value })} active={selected.minScore === p.value}
                  onPress={() => setSelected((s) => ({ ...s, minScore: p.value }))} />
          ))}
        </View>

        {/* Each section is hidden when the marketplace holds nothing to put in
            it. A heading above an empty row reads as a loading failure. */}
        {MAKES.length ? (
          <>
            <Text style={[styles.label, { marginTop: 24 }]}>{t('filters.make')}</Text>
            <View style={styles.chips}>
              {MAKES.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  active={selected.make === m}
                  onPress={() => toggle('make', m)}
                  mark={<BrandMark name={m} logoUrl={markFor(m)?.logo_url} size={18} />}
                />
              ))}
            </View>
          </>
        ) : null}

        {LOCATIONS.length ? (
          <>
            <Text style={[styles.label, { marginTop: 22 }]}>{t('filters.location')}</Text>
            <View style={styles.chips}>
              {LOCATIONS.map((l) => <Chip key={l} label={l} active={selected.location === l} onPress={() => toggle('location', l)} />)}
            </View>
          </>
        ) : null}

        {BODY.length ? (
          <>
            <Text style={[styles.label, { marginTop: 22 }]}>{t('filters.bodyType')}</Text>
            <View style={styles.chips}>
              {BODY.map((b) => <Chip key={b} label={b} active={selected.body === b} onPress={() => toggle('body', b)} />)}
            </View>
          </>
        ) : null}

        {FUEL.length ? (
          <>
            <Text style={[styles.label, { marginTop: 22 }]}>{t('filters.fuelType')}</Text>
            <View style={styles.chips}>
              {FUEL.map((f) => <Chip key={f} label={f} active={selected.fuel === f} onPress={() => toggle('fuel', f)} />)}
            </View>
          </>
        ) : null}

        {TRANSMISSION.length ? (
          <>
            <Text style={[styles.label, { marginTop: 22 }]}>{t('filters.transmission')}</Text>
            <View style={styles.chips}>
              {TRANSMISSION.map((t) => (
                <Chip key={t} label={t} active={selected.transmission === t}
                      onPress={() => toggle('transmission', t)} />
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.standardNote}><Ionicons name="shield-checkmark-outline" size={19} color={colors.primary} /><Text style={styles.standardText}>{t('filters.standardNote')}</Text></View>
      </ScrollView>

      <StickyFooter style={styles.footer}>
        <Pressable style={styles.reset} onPress={() => setSelected(EMPTY)}>
          <Text style={styles.resetText}>{t('filters.reset')}</Text>
        </Pressable>
        <Button
          title={t('filters.viewCount', { count: getMatchingCount() })}
          fullWidth={false}
          style={{ flex: 1 }}
          onPress={() => {
            navigation.navigate('SearchResults', { filters: selected });
          }}
        />
      </StickyFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  h1: { fontSize: 24, fontFamily: fonts.extraBold, letterSpacing: -0.5, color: colors.textPrimary },
  label: { fontSize: 15, fontFamily: fonts.extraBold, color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: fonts.semiBold },
  standardNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 24, borderRadius: radius.xl, backgroundColor: colors.blueTint, padding: 14 },
  standardText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  reset: { paddingHorizontal: 22, paddingVertical: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  resetText: { fontSize: 15, fontFamily: fonts.bold, color: colors.slate700 },
});

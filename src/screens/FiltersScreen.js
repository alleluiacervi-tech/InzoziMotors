import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Button from '../components/Button';
import StickyFooter from '../components/StickyFooter';
import { useApp } from '../context/AppContext';
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
  { label: 'Any price', value: null },
  { label: 'Under RWF 10M', value: 10000000 },
  { label: 'Under RWF 20M', value: 20000000 },
  { label: 'Under RWF 35M', value: 35000000 },
  { label: 'Under RWF 50M', value: 50000000 },
];

function Chip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, { color: active ? '#fff' : colors.slate600 }]}>{label}</Text>
    </Pressable>
  );
}

export default function FiltersScreen({ navigation, route }) {
  const { cars } = useApp();
  const [selected, setSelected] = useState(
    route.params?.filters || { make: null, body: null, fuel: null, maxPrice: null }
  );

  const MAKES = useMemo(() => distinct(cars, (c) => c.make), [cars]);
  const BODY = useMemo(() => distinct(cars, (c) => c.category), [cars]);
  const FUEL = useMemo(() => distinct(cars, (c) => c.fuel), [cars]);

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
    if (selected.maxPrice) {
      list = list.filter(c => {
        const price = c.type === 'auction' ? c.currentBid : c.price;
        return price <= selected.maxPrice;
      });
    }
    return list.length;
  };

  return (
    <Screen background={colors.surface}>
      <View style={styles.head}>
        <Text style={styles.h1}>Filters</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.slate700} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={styles.label}>Price</Text>
        <View style={styles.chips}>
          {PRICE_PRESETS.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              active={selected.maxPrice === p.value}
              onPress={() => setSelected((s) => ({ ...s, maxPrice: p.value }))}
            />
          ))}
        </View>

        {/* Each section is hidden when the marketplace holds nothing to put in
            it. A heading above an empty row reads as a loading failure. */}
        {MAKES.length ? (
          <>
            <Text style={[styles.label, { marginTop: 24 }]}>Make</Text>
            <View style={styles.chips}>
              {MAKES.map((m) => <Chip key={m} label={m} active={selected.make === m} onPress={() => toggle('make', m)} />)}
            </View>
          </>
        ) : null}

        {BODY.length ? (
          <>
            <Text style={[styles.label, { marginTop: 22 }]}>Body type</Text>
            <View style={styles.chips}>
              {BODY.map((b) => <Chip key={b} label={b} active={selected.body === b} onPress={() => toggle('body', b)} />)}
            </View>
          </>
        ) : null}

        {FUEL.length ? (
          <>
            <Text style={[styles.label, { marginTop: 22 }]}>Fuel type</Text>
            <View style={styles.chips}>
              {FUEL.map((f) => <Chip key={f} label={f} active={selected.fuel === f} onPress={() => toggle('fuel', f)} />)}
            </View>
          </>
        ) : null}

        <View style={styles.standardNote}><Ionicons name="shield-checkmark-outline" size={19} color={colors.primary} /><Text style={styles.standardText}>Public listings pass the configured seller, inspection and image publication checks. Inspection evidence is not a transaction warranty.</Text></View>
      </ScrollView>

      <StickyFooter style={styles.footer}>
        <Pressable style={styles.reset} onPress={() => setSelected({ make: null, body: null, fuel: null, maxPrice: null })}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
        <Button
          title={`View ${getMatchingCount()} cars`}
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
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: fonts.semiBold },
  standardNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 24, borderRadius: radius.xl, backgroundColor: colors.blueTint, padding: 14 },
  standardText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  reset: { paddingHorizontal: 22, paddingVertical: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  resetText: { fontSize: 15, fontFamily: fonts.bold, color: colors.slate700 },
});

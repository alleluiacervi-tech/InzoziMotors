import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { useApp } from '../context/AppContext';
import { colors, radius } from '../theme';

const MAKES = ['Tesla', 'Toyota', 'BMW', 'Ford', 'Honda', 'Mercedes', 'Hyundai'];
const BODY = ['SUV', 'Sedan', 'Truck', 'EV', 'Coupe', 'Van'];
const FUEL = ['Gasoline', 'Hybrid', 'Electric', 'Diesel'];

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
    route.params?.filters || { make: null, body: null, fuel: null, maxPrice: 45000 }
  );

  const toggle = (group, val) =>
    setSelected((s) => ({ ...s, [group]: s[group] === val ? null : val }));

  const getMatchingCount = () => {
    let list = cars;
    if (selected.make) list = list.filter(c => c.make.toLowerCase() === selected.make.toLowerCase());
    if (selected.body) list = list.filter(c => c.category.toLowerCase() === selected.body.toLowerCase());
    if (selected.fuel) list = list.filter(c => c.fuel.toLowerCase() === selected.fuel.toLowerCase());
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
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={26} color={colors.slate700} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 20 }}>
        <Text style={styles.label}>Price range</Text>
        <View style={styles.priceRow}>
          <View style={styles.priceBox}><Text style={styles.priceText}>$10,000</Text></View>
          <Text style={styles.dash}>—</Text>
          <View style={styles.priceBox}><Text style={styles.priceText}>$45,000</Text></View>
        </View>
        <View style={styles.track}>
          <View style={styles.trackFill} />
          <View style={[styles.knob, { left: '12%' }]} />
          <View style={[styles.knob, { left: '74%' }]} />
        </View>

        <Text style={[styles.label, { marginTop: 24 }]}>Make</Text>
        <View style={styles.chips}>
          {MAKES.map((m) => <Chip key={m} label={m} active={selected.make === m} onPress={() => toggle('make', m)} />)}
        </View>

        <Text style={[styles.label, { marginTop: 22 }]}>Body type</Text>
        <View style={styles.chips}>
          {BODY.map((b) => <Chip key={b} label={b} active={selected.body === b} onPress={() => toggle('body', b)} />)}
        </View>

        <Text style={[styles.label, { marginTop: 22 }]}>Fuel type</Text>
        <View style={styles.chips}>
          {FUEL.map((f) => <Chip key={f} label={f} active={selected.fuel === f} onPress={() => toggle('fuel', f)} />)}
        </View>

        <Text style={[styles.label, { marginTop: 22 }]}>Inzozi guarantees</Text>
        {['150-point inspected only', '7-day returns'].map((g) => (
          <View key={g} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{g}</Text>
            <View style={styles.switchOn}><View style={styles.switchKnob} /></View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.reset} onPress={() => setSelected({ make: null, body: null, fuel: null, maxPrice: 45000 })}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
        <Button
          title={`Show ${getMatchingCount()} results`}
          style={{ flex: 1 }}
          onPress={() => {
            navigation.navigate('SearchResults', { filters: selected });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: colors.textPrimary },
  label: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  priceBox: { flex: 1, height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  priceText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  dash: { color: colors.textMuted },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 18, marginHorizontal: 12 },
  trackFill: { position: 'absolute', left: '12%', right: '26%', top: 0, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  knob: { position: 'absolute', top: -8, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', borderWidth: 3, borderColor: colors.primary, marginLeft: -11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  switchOn: { width: 46, height: 28, borderRadius: 14, backgroundColor: colors.primary, padding: 3, alignItems: 'flex-end', justifyContent: 'center' },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  reset: { paddingHorizontal: 22, paddingVertical: 16, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  resetText: { fontSize: 15, fontWeight: '700', color: colors.slate700 },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius } from '../theme';

const GROUPS = [
  {
    title: 'Account',
    items: [
      { icon: 'person-outline', label: 'Edit profile' },
      { icon: 'shield-checkmark-outline', label: 'Verification & trust', value: 'Verified' },
      { icon: 'notifications-outline', label: 'Saved searches' },
      { icon: 'location-outline', label: 'Addresses' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: 'notifications-outline', label: 'Push notifications', toggle: true },
      { icon: 'mail-outline', label: 'Email alerts', toggle: true },
      { icon: 'moon-outline', label: 'Dark mode', toggle: false },
      { icon: 'globe-outline', label: 'Language', value: 'English' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: 'help-circle-outline', label: 'Help center' },
      { icon: 'document-text-outline', label: 'Terms & privacy' },
      { icon: 'star-outline', label: 'Rate Inzozi Motors' },
    ],
  },
];

function Toggle({ on }) {
  return (
    <View style={[styles.switch, on ? styles.switchOn : styles.switchOff]}>
      <View style={[styles.switchKnob, on ? styles.knobOn : styles.knobOff]} />
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const [toggles, setToggles] = useState({ 'Push notifications': true, 'Email alerts': true, 'Dark mode': false });

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 30 }}>
        {GROUPS.map((g) => (
          <View key={g.title} style={{ marginBottom: 22 }}>
            <Text style={styles.groupTitle}>{g.title}</Text>
            <View style={styles.group}>
              {g.items.map((item, i) => {
                const isToggle = 'toggle' in item;
                const on = toggles[item.label];
                return (
                  <Pressable
                    key={item.label}
                    style={[styles.item, i < g.items.length - 1 && styles.itemBorder]}
                    onPress={() => isToggle && setToggles((t) => ({ ...t, [item.label]: !t[item.label] }))}
                  >
                    <View style={styles.itemIcon}>
                      <Ionicons name={item.icon} size={20} color={colors.slate700} />
                    </View>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    {isToggle ? (
                      <Toggle on={on} />
                    ) : item.value ? (
                      <View style={styles.itemRight}>
                        <Text style={styles.itemValue}>{item.value}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.version}>Inzozi Motors v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.3, marginBottom: 10, marginLeft: 4, textTransform: 'uppercase' },
  group: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  itemIcon: { width: 36, alignItems: 'center' },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemValue: { fontSize: 14, color: colors.textSecondary },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: colors.primary, alignItems: 'flex-end' },
  switchOff: { backgroundColor: colors.border, alignItems: 'flex-start' },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: {},
  knobOff: {},
  version: { textAlign: 'center', fontSize: 13, color: colors.textMuted, marginTop: 6 },
});

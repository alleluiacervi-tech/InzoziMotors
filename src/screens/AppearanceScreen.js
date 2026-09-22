import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { fonts, radius, iconSize } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import Touchable from '../components/Touchable';

// Mirrors LanguageScreen.js's exact pattern — a titled group of radio rows,
// the selected one filled, the rest outlined — because it is already the
// established shape for "pick one of a short list, applies immediately" in
// this app, and a second, differently-built picker screen for the same kind
// of choice would be its own small inconsistency.
//
// Colours come from useTheme(), not the static `colors` import every other
// screen still uses — this screen's whole job is choosing the theme, so it
// would be a strange first screen to leave un-migrated. It is the first
// screen in the app built this way; see ThemeContext.js for why every other
// screen can keep working unmigrated in the meantime.
const OPTIONS = [
  { value: 'system', icon: 'phone-portrait-outline' },
  { value: 'light', icon: 'sunny-outline' },
  { value: 'dark', icon: 'moon-outline' },
];

export default function AppearanceScreen({ navigation }) {
  const { colors, mode, setMode, isDark } = useTheme();
  const { t } = useApp();

  return (
    // Screen's own default StatusBar assumes light content (see Screen.js);
    // this is the one screen so far whose background genuinely goes dark, so
    // it is also the one screen so far that has to say so explicitly.
    <Screen background={colors.bg} barStyle={isDark ? 'light-content' : 'dark-content'}>
      <BackHeader title={t('appearance.title')} onBack={() => navigation.goBack()} palette={colors} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('appearance.subtitle')}</Text>

        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
          {OPTIONS.map((item, index) => {
            const selected = item.value === mode;
            return (
              <Touchable
                key={item.value}
                scaleTo={0.98}
                haptic="selection"
                style={({ pressed }) => [
                  styles.option,
                  index < OPTIONS.length - 1 && [styles.optionBorder, { borderBottomColor: colors.borderSoft }],
                  pressed && { backgroundColor: colors.surfaceAlt },
                ]}
                onPress={() => setMode(item.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t(`appearance.${item.value}`)}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },
                    selected && { backgroundColor: colors.primaryTint, borderColor: colors.primary },
                  ]}
                >
                  <Ionicons name={item.icon} size={iconSize.md} color={selected ? colors.primary : colors.textMuted} />
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>{t(`appearance.${item.value}`)}</Text>
                  {item.value === 'system' ? (
                    <Text style={[styles.hint, { color: colors.textMuted }]}>{t('appearance.systemHint')}</Text>
                  ) : null}
                </View>
                {selected ? (
                  <View style={[styles.check, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={17} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.radio, { borderColor: colors.border }]} />
                )}
              </Touchable>
            );
          })}
        </View>

        <View style={[styles.note, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="information-circle-outline" size={iconSize.sm} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>{t('appearance.applyHint')}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, paddingBottom: 34 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginBottom: 18 },
  group: { borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  option: {
    minHeight: 74, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 13,
  },
  optionBorder: { borderBottomWidth: 1 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  copy: { flex: 1 },
  label: { fontFamily: fonts.semiBold, fontSize: 15 },
  hint: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 18, padding: 14, borderRadius: radius.lg },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});

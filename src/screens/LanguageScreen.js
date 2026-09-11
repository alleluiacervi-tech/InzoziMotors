import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, fonts, radius } from '../theme';
import { useApp } from '../context/AppContext';

export default function LanguageScreen({ navigation }) {
  const { language, languages, setLanguage, t } = useApp();

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('language.title')} onBack={() => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.subtitle}>{t('language.subtitle')}</Text>

        <View style={styles.group}>
          {languages.map((item, index) => {
            const selected = item.code === language;
            return (
              <Pressable
                key={item.code}
                style={({ pressed }) => [
                  styles.option,
                  index < languages.length - 1 && styles.optionBorder,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => setLanguage(item.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.nativeLabel}, ${item.label}`}
              >
                <View style={[styles.flag, selected && styles.flagSelected]}>
                  {/* iOS renders the flag emoji; Android has no flag glyphs, so
                      it falls back to the language code. */}
                  {Platform.OS === 'ios' && item.flag ? (
                    <Text style={styles.flagEmoji}>{item.flag}</Text>
                  ) : (
                    <Text style={[styles.code, selected && styles.codeSelected]}>
                      {item.code.toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.copy}>
                  <Text style={styles.nativeLabel}>{item.nativeLabel}</Text>
                  {item.nativeLabel !== item.label && (
                    <Text style={styles.englishLabel}>{item.label}</Text>
                  )}
                </View>
                {selected ? (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={17} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.radio} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.noteText}>{t('language.restartHint')}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, paddingBottom: 34 },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginBottom: 18,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  option: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 13,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  optionPressed: { backgroundColor: colors.surfaceAlt },
  flag: {
    width: 42,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  flagSelected: { backgroundColor: colors.greenTint, borderColor: colors.primary },
  flagEmoji: { fontSize: 22, lineHeight: 28 },
  code: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.4 },
  codeSelected: { color: colors.primary },
  copy: { flex: 1 },
  nativeLabel: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.textPrimary },
  englishLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 18,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.greenTint,
  },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
});

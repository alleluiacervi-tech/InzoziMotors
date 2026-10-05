// The phone number field from sign-up — a country code picker beside the
// number — shared with CompleteProfile so both ways into an account ask for a
// phone the same way.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';

export const COUNTRY_CODES = [
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+257', flag: '🇧🇮', name: 'Burundi' },
  { code: '+243', flag: '🇨🇩', name: 'DR Congo' },
  { code: '+211', flag: '🇸🇸', name: 'South Sudan' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
];

/** E.164 from the picker and what was typed ("0788 123 456" → +250788123456). */
export function toE164(countryCode, phone) {
  const raw = String(phone || '').replace(/[\s-]/g, '');
  return raw.startsWith('+') ? raw : `${countryCode}${raw.replace(/^0+/, '')}`;
}

export const isValidE164 = (value) => /^\+[1-9]\d{7,14}$/.test(value);

export default function PhoneInput({ countryCode, onCountryCode, phone, onPhone, error, autoFocus }) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  return (
    <>
      <View style={styles.phoneRow}>
        <Pressable
          style={styles.countryBtn}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Select country code"
        >
          <Text style={styles.countryFlag}>{selected.flag}</Text>
          <Text style={styles.countryCodeText}>{countryCode}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
        <TextInput
          style={[styles.phoneInput, error && styles.inputError]}
          placeholder="0788 123 456"
          value={phone}
          onChangeText={onPhone}
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoFocus={autoFocus}
        />
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.countryItem, item.code === countryCode && styles.countryItemActive]}
                  onPress={() => { onCountryCode(item.code); setOpen(false); }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemCode}>{item.code}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerTint },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 52,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryFlag: { fontSize: 18 },
  countryCodeText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    maxHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  countryItemActive: {
    backgroundColor: colors.primaryTint || '#FFF5F5',
  },
  countryItemFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  countryItemName: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  countryItemCode: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
});

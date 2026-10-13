import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { showToast } from '../components/Feedback';
import { useApp } from '../context/AppContext';
import rentalsApi from '../api/rentals';
import { colors, fonts, radius } from '../theme';

// A rental provider adds a car from their phone. No inspection is needed
// first: adding it asks Sawa for the 10-point Rental Check, and photos are
// added on the next screen. The car is listed only once the check passes and
// Sawa's team publishes it (POST /rentals/propose can only make pending_review).

const FIELDS = [
  ['make', 'rentalFleet.make', 'default'],
  ['model', 'rentalFleet.model', 'default'],
  ['year', 'rentalFleet.year', 'number-pad'],
  ['daily_rate', 'rentalFleet.dailyRate', 'number-pad'],
  ['weekly_rate', 'rentalFleet.weeklyRate', 'number-pad'],
  ['deposit', 'rentalFleet.deposit', 'number-pad'],
  ['min_days', 'rentalFleet.minDays', 'number-pad'],
  ['seats', 'rentalFleet.seats', 'number-pad'],
  ['location', 'rentalFleet.location', 'default'],
];

export default function RentalAddCarScreen({ navigation }) {
  const { t } = useApp();
  const [form, setForm] = useState({ make: '', model: '', year: '', daily_rate: '', weekly_rate: '', deposit: '0', min_days: '1', seats: '5', location: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const number = (value) => (String(value).trim() === '' ? undefined : Number(String(value).replace(/[^\d]/g, '')));

  const submit = async () => {
    const year = number(form.year);
    const daily = number(form.daily_rate);
    if (!form.make.trim() || !form.model.trim() || !year || year < 1980 || year > 2100) return setError(t('rentalFleet.vehicleInvalid'));
    if (!daily) return setError(t('rentalFleet.rateInvalid'));
    setSaving(true); setError('');
    try {
      const created = await rentalsApi.proposeCar({
        title: `${year} ${form.make.trim()} ${form.model.trim()}`,
        make: form.make.trim(), model: form.model.trim(), year,
        daily_rate: daily, weekly_rate: number(form.weekly_rate), deposit: number(form.deposit) ?? 0,
        min_days: number(form.min_days) || 1, seats: number(form.seats) || 5,
        location: form.location.trim() || undefined,
      });
      showToast(t('rentalFleet.added'), 'success');
      navigation.replace('RentalFleetCar', { carId: created.id });
    } catch (err) {
      setError(err?.message || t('rentalFleet.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title={t('rentalFleet.addCar')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.info}>
          <Ionicons name="shield-checkmark-outline" size={21} color={colors.primary} />
          <Text style={styles.infoText}>{t('rentalFleet.addIntro')}</Text>
        </View>
        {FIELDS.map(([key, label, keyboard]) => (
          <View key={key} style={{ marginTop: 12 }}>
            <Text style={styles.label}>{t(label)}</Text>
            <TextInput value={form[key]} onChangeText={(value) => setForm((old) => ({ ...old, [key]: value }))}
              keyboardType={keyboard} autoCapitalize={keyboard === 'default' ? 'words' : 'none'} style={styles.input} />
          </View>
        ))}
        {!!error && (
          <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View>
        )}
        <Button title={t('rentalFleet.addSubmit')} icon="arrow-forward-outline" loading={saving} onPress={submit} style={{ marginTop: 18 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, paddingBottom: 48 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.blueTint, borderRadius: radius.xl, padding: 14 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  label: { marginBottom: 6, fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  input: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: 13, fontSize: 15, color: colors.textPrimary },
  error: { flexDirection: 'row', gap: 8, marginTop: 14, padding: 12, borderRadius: radius.lg, backgroundColor: colors.danger + '10' },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.danger },
});

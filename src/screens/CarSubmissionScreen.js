import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows } from '../theme';
import { useApp } from '../context/AppContext';

const MAKES = ['Toyota', 'Honda', 'Nissan', 'Subaru', 'Mercedes', 'BMW', 'Mazda', 'Hyundai', 'Kia', 'Volkswagen'];

const BASE_PRICES = { Toyota: 22000, Honda: 18000, Nissan: 16000, Subaru: 20000, Mercedes: 48000, BMW: 44000, Mazda: 17000, Hyundai: 15000, Kia: 14000, Volkswagen: 19000 };
function aiSuggestPrice(make, year, mileage) {
  const base = BASE_PRICES[make] || 20000;
  const yearFactor = Math.max(0.5, Math.min(1.0, 0.5 + (Number(year) - 2015) * 0.035));
  const mileageFactor = Math.max(0.6, 1 - (Number(mileage) / 180000) * 0.35);
  const mid = Math.round(base * yearFactor * mileageFactor / 500) * 500;
  return { low: Math.round(mid * 0.92 / 500) * 500, high: Math.round(mid * 1.08 / 500) * 500 };
}
function aiComparablesCount(make) {
  return 5 + ((make.charCodeAt(0) || 84) % 8);
}
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS = ['Automatic', 'Manual'];
const BODY_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Coupe', 'Van'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs Work'];
const SERVICE_HISTORY = ['Full history', 'Partial history', 'Unknown'];
const YEARS = Array.from({ length: 16 }, (_, i) => String(2025 - i));
const PHOTO_SLOTS = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Rear' },
  { key: 'left', label: 'Left side' },
  { key: 'right', label: 'Right side' },
  { key: 'interior', label: 'Interior' },
  { key: 'engine', label: 'Engine bay' },
];

const STEP_LABELS = ['Vehicle', 'Condition', 'Photos', 'Submit'];

function ChipGroup({ options, selected, onSelect, multi = false }) {
  return (
    <View style={styles.chipGroup}>
      {options.map((opt) => {
        const active = multi ? (Array.isArray(selected) && selected.includes(opt)) : selected === opt;
        return (
          <Pressable
            key={opt}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({ label, children, hint }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function StepBar({ current, total }) {
  return (
    <View style={styles.stepBar}>
      {STEP_LABELS.map((label, idx) => (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, idx <= current && styles.stepDotActive]}>
              {idx < current ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={[styles.stepDotText, idx <= current && { color: '#fff' }]}>{idx + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, idx === current && styles.stepLabelActive]}>{label}</Text>
          </View>
          {idx < total - 1 && <View style={[styles.stepLine, idx < current && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function CarSubmissionScreen({ navigation }) {
  const { addSubmission } = useApp();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    make: '', model: '', year: '', mileage: '', fuelType: '', transmission: '', bodyType: '', color: '',
    condition: '', accidents: false, serviceHistory: '', notes: '',
    askingPrice: '', sellerNotes: '',
  });
  const [photos, setPhotos] = useState({});

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const priceSuggestion = (form.make && form.year && form.mileage)
    ? aiSuggestPrice(form.make, form.year, form.mileage)
    : null;
  const comparablesCount = form.make ? aiComparablesCount(form.make) : 8;
  const priceInRange = priceSuggestion && form.askingPrice
    ? Number(form.askingPrice) >= priceSuggestion.low && Number(form.askingPrice) <= priceSuggestion.high
    : false;

  const canAdvanceStep0 = form.make && form.model && form.year && form.mileage && form.fuelType && form.transmission;
  const canAdvanceStep1 = form.condition && form.serviceHistory;
  const canAdvanceStep2 = Object.keys(photos).length >= 4;

  const handleSubmit = () => {
    const submission = {
      carTitle: `${form.year} ${form.make} ${form.model}`,
      make: form.make,
      model: form.model,
      year: Number(form.year),
      mileage: Number(form.mileage),
      askingPrice: Number(form.askingPrice) || 0,
      image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&q=80',
    };
    addSubmission(submission);
    Alert.alert(
      'Submission Received!',
      `Your ${form.year} ${form.make} ${form.model} has been submitted for review. Our team will reach out within 24 hours to discuss next steps.`,
      [{ text: 'View My Submissions', onPress: () => navigation.navigate('SellerDashboard') }]
    );
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Submit Your Car" onBack={() => { step > 0 ? setStep(step - 1) : navigation.goBack(); }} />
      <StepBar current={step} total={4} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} key={step}>

          {/* STEP 0: Vehicle Details */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Tell us about your car</Text>
              <Text style={styles.stepSub}>Basic details help us prepare the listing and inspection.</Text>

              <Field label="Make">
                <ChipGroup options={MAKES} selected={form.make} onSelect={(v) => set('make', v)} />
              </Field>
              <Field label="Model">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. RAV4, Civic, Hilux..."
                  placeholderTextColor={colors.textMuted}
                  value={form.model}
                  onChangeText={(v) => set('model', v)}
                />
              </Field>
              <Field label="Year">
                <ChipGroup options={YEARS.slice(0, 8)} selected={form.year} onSelect={(v) => set('year', v)} />
              </Field>
              <Field label="Mileage (km)">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 45000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={form.mileage}
                  onChangeText={(v) => set('mileage', v)}
                />
              </Field>
              <Field label="Fuel Type">
                <ChipGroup options={FUEL_TYPES} selected={form.fuelType} onSelect={(v) => set('fuelType', v)} />
              </Field>
              <Field label="Transmission">
                <ChipGroup options={TRANSMISSIONS} selected={form.transmission} onSelect={(v) => set('transmission', v)} />
              </Field>
              <Field label="Body Type">
                <ChipGroup options={BODY_TYPES} selected={form.bodyType} onSelect={(v) => set('bodyType', v)} />
              </Field>
              <Field label="Exterior Color">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Pearl White, Midnight Black..."
                  placeholderTextColor={colors.textMuted}
                  value={form.color}
                  onChangeText={(v) => set('color', v)}
                />
              </Field>
              <Button
                title="Continue — Condition"
                onPress={() => setStep(1)}
                style={{ marginTop: 8, opacity: canAdvanceStep0 ? 1 : 0.4 }}
              />
            </View>
          )}

          {/* STEP 1: Condition */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Condition & History</Text>
              <Text style={styles.stepSub}>Honest assessment helps us set the right expectations with buyers.</Text>

              <Field label="Overall Condition">
                <ChipGroup options={CONDITIONS} selected={form.condition} onSelect={(v) => set('condition', v)} />
              </Field>

              <Field label="Accident History">
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Has the car been in any accidents?</Text>
                  <Pressable
                    style={[styles.toggle, form.accidents && styles.toggleOn]}
                    onPress={() => set('accidents', !form.accidents)}
                  >
                    <View style={[styles.toggleKnob, form.accidents && styles.toggleKnobOn]} />
                  </Pressable>
                </View>
                {form.accidents && (
                  <TextInput
                    style={[styles.input, styles.inputMulti, { marginTop: 10 }]}
                    placeholder="Briefly describe the accident(s)..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={form.notes}
                    onChangeText={(v) => set('notes', v)}
                  />
                )}
              </Field>

              <Field label="Service History">
                <ChipGroup options={SERVICE_HISTORY} selected={form.serviceHistory} onSelect={(v) => set('serviceHistory', v)} />
              </Field>

              <Field label="Additional Notes for Our Team" hint="Modifications, known defects, anything we should know before inspection.">
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Any modifications, known issues, or context for our inspectors..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={form.notes}
                  onChangeText={(v) => set('notes', v)}
                />
              </Field>

              <Button
                title="Continue — Photos"
                onPress={() => setStep(2)}
                style={{ marginTop: 8, opacity: canAdvanceStep1 ? 1 : 0.4 }}
              />
            </View>
          )}

          {/* STEP 2: Reference Photos */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Reference Photos</Text>
              <Text style={styles.stepSub}>
                Upload your own photos for our team's reference only. Our photographer will take official listing photos at inspection.
              </Text>

              <View style={styles.photoGrid}>
                {PHOTO_SLOTS.map((slot) => {
                  const uploaded = !!photos[slot.key];
                  return (
                    <Pressable
                      key={slot.key}
                      style={[styles.photoSlot, uploaded && styles.photoSlotDone]}
                      onPress={() => setPhotos((p) => ({ ...p, [slot.key]: true }))}
                    >
                      <Ionicons
                        name={uploaded ? 'checkmark-circle' : 'camera-outline'}
                        size={28}
                        color={uploaded ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.photoSlotLabel, uploaded && { color: colors.primary }]}>{slot.label}</Text>
                      {uploaded && <Text style={styles.photoSlotDoneText}>Added</Text>}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.photoNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.photoNoteText}>
                  Upload at least 4 photos to proceed. Min 4, max 6. Tap each slot to add.
                </Text>
              </View>

              <Button
                title="Continue — Price & Submit"
                onPress={() => setStep(3)}
                style={{ marginTop: 8, opacity: canAdvanceStep2 ? 1 : 0.4 }}
              />
            </View>
          )}

          {/* STEP 3: Price & Submit */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Almost there</Text>
              <Text style={styles.stepSub}>Your asking price is a reference — our team will suggest a competitive market price after inspection.</Text>

              <Field label="Your Asking Price (USD)" hint="This is a reference. We'll provide a certified market price after inspection.">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 24000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={form.askingPrice}
                  onChangeText={(v) => set('askingPrice', v)}
                />
              </Field>

              {/* AI Price Suggestion */}
              {priceSuggestion && (
                <View style={styles.aiSuggestCard}>
                  <View style={styles.aiSuggestHeader}>
                    <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                    <Text style={styles.aiSuggestTitle}>AI Price Suggestion</Text>
                    <View style={styles.aiSuggestBeta}>
                      <Text style={styles.aiSuggestBetaText}>Beta</Text>
                    </View>
                  </View>
                  <Text style={styles.aiSuggestRange}>
                    ${priceSuggestion.low.toLocaleString()} – ${priceSuggestion.high.toLocaleString()}
                  </Text>
                  <Text style={styles.aiSuggestSub}>
                    Based on {comparablesCount} similar {form.make} {form.model ? form.model + ' ' : ''}sales in Kigali
                  </Text>
                  {form.askingPrice > 0 && (
                    <View style={[styles.aiSuggestCheck, { backgroundColor: priceInRange ? colors.greenTint : '#FEF3C7' }]}>
                      <Ionicons name={priceInRange ? 'checkmark-circle' : 'warning-outline'} size={13} color={priceInRange ? colors.primary : colors.amber} />
                      <Text style={[styles.aiSuggestCheckText, { color: priceInRange ? colors.primary : colors.amber }]}>
                        {priceInRange ? 'Your price is within the suggested range — great!' : 'Your price is outside the suggested range'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Field label="Message to Our Team (optional)">
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Anything else you'd like us to know? Urgency, location preference, availability for inspection..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={form.sellerNotes}
                  onChangeText={(v) => set('sellerNotes', v)}
                />
              </Field>

              {/* Summary card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Submission Summary</Text>
                <View style={styles.summaryRows}>
                  <SummaryRow label="Vehicle" value={`${form.year} ${form.make} ${form.model}`} />
                  <SummaryRow label="Mileage" value={`${Number(form.mileage || 0).toLocaleString()} km`} />
                  <SummaryRow label="Fuel / Trans" value={`${form.fuelType} · ${form.transmission}`} />
                  <SummaryRow label="Condition" value={form.condition} />
                  <SummaryRow label="Service records" value={form.serviceHistory} />
                  <SummaryRow label="Photos uploaded" value={`${Object.keys(photos).length} / 6`} />
                  {form.askingPrice ? <SummaryRow label="Asking price" value={`$${Number(form.askingPrice).toLocaleString()}`} /> : null}
                </View>
              </View>

              {/* What happens next */}
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>What happens next</Text>
                {[
                  { icon: 'time-outline', text: 'Our team reviews your submission within 24 hours' },
                  { icon: 'calendar-outline', text: 'We schedule a professional inspection at your convenience' },
                  { icon: 'camera-outline', text: 'Our photographer takes 36-angle listing photos' },
                  { icon: 'storefront-outline', text: 'Your car goes live on the marketplace' },
                ].map((item, i) => (
                  <View key={i} style={styles.timelineRow}>
                    <View style={styles.timelineDot}>
                      <Ionicons name={item.icon} size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.timelineText}>{item.text}</Text>
                  </View>
                ))}
              </View>

              <Button title="Submit for Review" icon="send-outline" onPress={handleSubmit} style={{ marginTop: 8 }} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SummaryRow({ label, value }) {
  if (!value || value === 'undefined undefined') return null;
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryRowLabel}>{label}</Text>
      <Text style={styles.summaryRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 50 },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  stepLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  stepLabelActive: { color: colors.primary },
  stepLine: { flex: 1, height: 1.5, backgroundColor: colors.borderSoft, marginBottom: 14 },
  stepLineActive: { backgroundColor: colors.primary },
  stepContent: { padding: 20, gap: 0 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 6 },
  stepSub: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 24 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 17 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary,
  },
  inputMulti: { height: 96, paddingTop: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  toggle: {
    width: 46, height: 28, borderRadius: 14,
    backgroundColor: colors.border,
    padding: 3, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.primary, alignItems: 'flex-end' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleKnobOn: {},
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  photoSlot: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    gap: 6,
  },
  photoSlotDone: { borderColor: colors.primary, backgroundColor: colors.blueTint, borderStyle: 'solid' },
  photoSlotLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  photoSlotDoneText: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  photoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.blueTint, borderRadius: radius.lg, padding: 12, marginBottom: 8,
  },
  photoNoteText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 18,
    marginBottom: 14,
    ...shadows.card,
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
  summaryRows: { gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryRowLabel: { fontSize: 13, color: colors.textMuted },
  summaryRowValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  timelineCard: {
    backgroundColor: colors.blueTint,
    borderWidth: 1, borderColor: colors.primary + '30',
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -2,
  },
  timelineText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  aiSuggestCard: {
    backgroundColor: colors.greenTint,
    borderWidth: 1, borderColor: colors.primary + '44',
    borderRadius: radius.xl, padding: 14, marginBottom: 16,
  },
  aiSuggestHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiSuggestTitle: { fontSize: 13, fontWeight: '800', color: colors.primary },
  aiSuggestBeta: { marginLeft: 'auto', backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  aiSuggestBetaText: { fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  aiSuggestRange: { fontSize: 22, fontWeight: '900', color: colors.primary, letterSpacing: -0.5, marginBottom: 2 },
  aiSuggestSub: { fontSize: 12, color: colors.textSecondary },
  aiSuggestCheck: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.lg, padding: 8, marginTop: 10 },
  aiSuggestCheckText: { fontSize: 12, fontWeight: '700', flex: 1 },
});

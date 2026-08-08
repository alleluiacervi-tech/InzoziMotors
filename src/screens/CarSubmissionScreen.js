import React, { useState } from 'react';
import { STUDIO } from '../data/carImageAssets';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { colors, radius, shadows, fonts } from '../theme';
import { showToast, showConfirm } from '../components/Feedback';
import { captureImage } from '../utils/media';
import { useApp } from '../context/AppContext';
import { estimateValuation } from '../data/finance';

const MAKES = ['Toyota', 'Honda', 'Nissan', 'Subaru', 'Mercedes', 'BMW', 'Mazda', 'Hyundai', 'Kia', 'Volkswagen'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS = ['Automatic', 'Manual'];
const BODY_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Coupe', 'Van'];
const YEARS = Array.from({ length: 16 }, (_, i) => String(2026 - i));
// Two optional reference shots — the 150-pt inspection and 36-angle shoot capture everything else
const PHOTO_SLOTS = [
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
];

const STEP_LABELS = ['Vehicle', 'Price & Submit'];

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

export default function CarSubmissionScreen({ navigation, route }) {
  const { addSubmission, cars } = useApp();

  // Prefill from the valuation tool — no duplicate typing
  const prefill = route.params?.prefill || {};

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    make: prefill.make || '',
    model: prefill.model || '',
    year: prefill.year ? String(prefill.year) : '',
    mileage: prefill.mileage ? String(prefill.mileage) : '',
    fuelType: '', transmission: '', bodyType: '', color: '',
    askingPrice: '', sellerNotes: '',
  });
  const [photos, setPhotos] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Same estimator as the valuation tool — one price engine everywhere
  const priceSuggestion = (form.make && form.year && form.mileage)
    ? estimateValuation({ make: form.make, year: Number(form.year), mileage: Number(form.mileage) }, cars)
    : null;
  const comparablesCount = priceSuggestion?.comparables >= 2 ? priceSuggestion.comparables : null;
  const priceInRange = priceSuggestion && form.askingPrice
    ? Number(form.askingPrice) >= priceSuggestion.low && Number(form.askingPrice) <= priceSuggestion.high
    : false;

  const canAdvanceStep0 = form.make && form.model && form.year && form.mileage && form.fuelType && form.transmission;

  const handlePhotoPress = async (slot) => {
    if (photos[slot.key]) {
      const ok = await showConfirm({
        title: `Remove the ${slot.label.toLowerCase()} photo?`,
        confirmLabel: 'Remove',
        destructive: true,
      });
      if (ok) {
        setPhotos((p) => {
          const next = { ...p };
          delete next[slot.key];
          return next;
        });
      }
      return;
    }
    const asset = await captureImage({
      preset: 'listing',
      title: `${slot.label} photo`,
      message: 'A quick reference shot — our photographer takes the official set at inspection.',
    });
    if (asset) setPhotos((p) => ({ ...p, [slot.key]: asset }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const carTitle = `${form.year} ${form.make} ${form.model}`;
    try {
      const submissionId = await addSubmission({
        carTitle,
        make: form.make,
        model: form.model,
        year: Number(form.year),
        mileage: Number(form.mileage),
        askingPrice: Number(form.askingPrice) || 0,
        fuelType: form.fuelType,
        transmission: form.transmission,
        bodyType: form.bodyType,
        color: form.color,
        sellerNotes: form.sellerNotes,
        photos,
        image: STUDIO.paintWhite,
      });
      showConfirm({
        title: 'Submission received',
        message: `Your ${carTitle} is in. Pick an inspection slot now — it takes 30 seconds.`,
        confirmLabel: 'Book Inspection Slot',
        cancelLabel: 'Later',
      }).then((ok) => {
        if (ok) navigation.replace('InspectionScheduling', { carName: carTitle, submissionId });
        else navigation.navigate('SellerDashboard');
      });
    } catch (err) {
      // The server rejects unverified sellers — send them to verification
      // rather than leaving them staring at a failed submit button.
      if (err.code === 'ID_VERIFICATION_REQUIRED') {
        showToast(err.message || 'Verify your identity before submitting a car.', 'error');
        navigation.replace('IDVerification', { returnTo: 'CarSubmission' });
        return;
      }
      showToast(err.message || 'Your submission could not be saved. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen background={colors.bg}>
      <BackHeader title="Submit Your Car" onBack={() => { step > 0 ? setStep(step - 1) : navigation.goBack(); }} />
      <StepBar current={step} total={2} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} key={step}>

          {/* STEP 0: Vehicle Details */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Tell us about your car</Text>
              <Text style={styles.stepSub}>
                Just the basics — our 150-point inspection covers condition, history and everything else.
              </Text>

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
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <ChipGroup options={YEARS} selected={form.year} onSelect={(v) => set('year', v)} />
                </ScrollView>
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
                title={canAdvanceStep0 ? 'Continue — Price & Submit' : 'Fill in the required fields'}
                onPress={() => setStep(1)}
                disabled={!canAdvanceStep0}
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          {/* STEP 1: Price & Submit */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Almost there</Text>
              <Text style={styles.stepSub}>Your asking price is a reference — our team will suggest a certified market price after inspection.</Text>

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
                    {comparablesCount
                      ? `Based on ${comparablesCount} similar ${form.make} cars on Sawa`
                      : 'Based on current Kigali market data'}
                  </Text>
                  {form.askingPrice > 0 && (
                    <View style={[styles.aiSuggestCheck, { backgroundColor: priceInRange ? colors.greenTint : '#FEF3C7' }]}>
                      <Ionicons name={priceInRange ? 'checkmark-circle' : 'warning-outline'} size={13} color={priceInRange ? colors.green : colors.amber} />
                      <Text style={[styles.aiSuggestCheckText, { color: priceInRange ? colors.green : colors.amber }]}>
                        {priceInRange ? 'Your price is within the suggested range — great!' : 'Your price is outside the suggested range'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Optional reference photos — 2 shots max */}
              <Field label="Reference Photos (optional)" hint="Helps our team prepare. Official 36-angle listing photos are taken by our photographer at inspection.">
                <View style={styles.photoGrid}>
                  {PHOTO_SLOTS.map((slot) => {
                    const asset = photos[slot.key];
                    return (
                      <Pressable
                        key={slot.key}
                        style={[styles.photoSlot, asset && styles.photoSlotDone]}
                        onPress={() => handlePhotoPress(slot)}
                      >
                        {asset ? (
                          <>
                            <Image source={{ uri: asset.uri }} style={styles.photoSlotImage} />
                            <View style={styles.photoSlotBadge}>
                              <Ionicons name="checkmark" size={12} color="#fff" />
                            </View>
                          </>
                        ) : (
                          <>
                            <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
                            <Text style={styles.photoSlotLabel}>{slot.label}</Text>
                          </>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label="Anything we should know? (optional)">
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Known issues, modifications, urgency, availability..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
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
                  {form.askingPrice ? <SummaryRow label="Asking price" value={`$${Number(form.askingPrice).toLocaleString()}`} /> : null}
                </View>
              </View>

              {/* What happens next */}
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>What happens next</Text>
                {[
                  { icon: 'calendar-outline', text: 'Book your inspection slot right after submitting' },
                  { icon: 'shield-checkmark-outline', text: 'Bring the car and your ID — we inspect, verify and photograph everything at the center' },
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

              <Button
                title={submitting ? 'Submitting…' : 'Submit & Book Inspection'}
                icon="send-outline"
                onPress={handleSubmit}
                disabled={submitting}
                style={{ marginTop: 8 }}
              />
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
  stepDotText: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  stepLabel: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted },
  stepLabelActive: { color: colors.primary },
  stepLine: { flex: 1, height: 1.5, backgroundColor: colors.borderSoft, marginBottom: 14 },
  stepLineActive: { backgroundColor: colors.primary },
  stepContent: { padding: 20, gap: 0 },
  stepTitle: { fontSize: 22, fontFamily: fonts.extraBold, color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 6 },
  stepSub: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 24 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 8 },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 17 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: fonts.medium, color: colors.textPrimary,
  },
  inputMulti: { height: 84, paddingTop: 12 },
  photoGrid: { flexDirection: 'row', gap: 10 },
  photoSlot: {
    flex: 1,
    aspectRatio: 1.6,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.xl,
    borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    gap: 6,
  },
  photoSlotDone: {
    borderColor: colors.green, borderStyle: 'solid',
    overflow: 'hidden', gap: 0,
  },
  photoSlotImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  photoSlotBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  photoSlotLabel: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textMuted },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: 18,
    marginBottom: 14,
    ...shadows.card,
  },
  summaryTitle: { fontSize: 14, fontFamily: fonts.extraBold, color: colors.textPrimary, marginBottom: 12 },
  summaryRows: { gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryRowLabel: { fontSize: 13, color: colors.textMuted },
  summaryRowValue: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary },
  timelineCard: {
    backgroundColor: colors.blueTint,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  timelineTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 2 },
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
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 14, marginBottom: 16,
  },
  aiSuggestHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiSuggestTitle: { fontSize: 13, fontFamily: fonts.extraBold, color: colors.textPrimary },
  aiSuggestBeta: { marginLeft: 'auto', backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  aiSuggestBetaText: { fontSize: 10, fontFamily: fonts.bold, color: '#fff', textTransform: 'uppercase' },
  aiSuggestRange: { fontSize: 22, fontFamily: fonts.black, color: colors.primary, letterSpacing: -0.5, marginBottom: 2 },
  aiSuggestSub: { fontSize: 12, color: colors.textSecondary },
  aiSuggestCheck: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.lg, padding: 8, marginTop: 10 },
  aiSuggestCheckText: { fontSize: 12, fontFamily: fonts.bold, flex: 1 },
});
